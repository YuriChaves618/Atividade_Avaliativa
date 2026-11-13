// Sessão "stateless": todos os dados ficam em um cookie criptografado (AES-256-GCM)
// e autenticado. Não precisa de disco nem de banco de dados, então funciona na
// Vercel (serverless), onde cada requisição pode cair em uma instância diferente.
//
// Uso:  req.session.user = {...}   -> grava no cookie
//       req.session = null         -> apaga a sessão (logout)
const crypto = require('node:crypto');

const MAX_COOKIE_BYTES = 3800;
const RENEW_EVERY_MS = 24 * 60 * 60 * 1000; // renova o prazo no máximo 1x por dia

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function cookieSession({ name, secret, maxAgeMs, secure, sameSite = 'Lax' }) {
  const key = Buffer.from(crypto.hkdfSync('sha256', secret, 'super-celso-bros', 'session-cookie', 32));
  const aad = Buffer.from(name);

  function seal(data, exp) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad);
    const body = Buffer.concat([cipher.update(JSON.stringify({ d: data, exp }), 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
  }

  function unseal(value) {
    try {
      const raw = Buffer.from(value, 'base64url');
      if (raw.length < 29) return null;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
      decipher.setAAD(aad);
      decipher.setAuthTag(raw.subarray(12, 28));
      const text = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) return null;
      if (!parsed.d || typeof parsed.d !== 'object') return null;
      return parsed;
    } catch {
      return null; // adulterado, antigo ou de outro segredo
    }
  }

  function cookieString(value, maxAge) {
    const attrs = [`${name}=${value}`, 'Path=/', 'HttpOnly', `SameSite=${sameSite}`, `Max-Age=${Math.floor(maxAge / 1000)}`];
    if (maxAge <= 0) attrs.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    else attrs.push(`Expires=${new Date(Date.now() + maxAge).toUTCString()}`);
    if (secure) attrs.push('Secure');
    return attrs.join('; ');
  }

  return function sessionMiddleware(req, res, next) {
    const existing = parseCookies(req.headers.cookie)[name];
    const loaded = existing ? unseal(existing) : null;
    req.session = loaded ? loaded.d : {};
    const before = JSON.stringify(req.session);
    const oldExp = loaded ? loaded.exp : 0;

    const originalWriteHead = res.writeHead;
    let committed = false;
    res.writeHead = function patchedWriteHead(...args) {
      if (!committed) {
        committed = true;
        try {
          const s = req.session;
          const empty = !s || typeof s !== 'object' || Object.keys(s).length === 0;
          let header = null;
          if (empty) {
            if (existing) header = cookieString('', 0); // logout / sessão inválida: apaga o cookie
          } else {
            const after = JSON.stringify(s);
            const needsRenew = oldExp - Date.now() < maxAgeMs - RENEW_EVERY_MS;
            if (after !== before || needsRenew) {
              const value = seal(s, Date.now() + maxAgeMs);
              if (Buffer.byteLength(value) > MAX_COOKIE_BYTES) throw new Error('Sessão grande demais para um cookie.');
              header = cookieString(value, maxAgeMs);
            }
          }
          if (header) {
            const prev = res.getHeader('Set-Cookie');
            res.setHeader('Set-Cookie', prev ? [].concat(prev, header) : header);
          }
        } catch (error) {
          console.error('Erro ao gravar a sessão:', error.message);
        }
      }
      return originalWriteHead.apply(this, args);
    };
    next();
  };
}

module.exports = cookieSession;
