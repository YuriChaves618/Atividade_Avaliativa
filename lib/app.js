require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const cookieSession = require('./cookie-session');

const APP_VERSION = '2.0';

const app = express();
const rootDir = path.join(__dirname, '..');
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production'
  || ['production', 'preview'].includes(process.env.VERCEL_ENV);

// Origens autorizadas a chamar a API de login (separe várias com vírgula).
// Na Vercel, se APP_ORIGIN não for definido, usa o domínio de produção do projeto.
const allowedOrigins = (process.env.APP_ORIGIN
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : `http://localhost:${port}`))
  .split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);

// O jogador permanece logado por 30 dias, até clicar em "Encerrar sessão".
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

if (!process.env.GOOGLE_CLIENT_ID || !process.env.SESSION_SECRET) {
  throw new Error('Configure GOOGLE_CLIENT_ID e SESSION_SECRET nas variáveis de ambiente (arquivo .env local ou painel da Vercel).');
}

if (process.env.SESSION_SECRET.startsWith('troque-por') || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET inválido: gere um valor aleatório de pelo menos 32 caracteres (veja o .env.example).');
}

if (isProduction) app.set('trust proxy', 1);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json({ limit: '16kb' }));

// Respostas da API (sessão, CSRF, login) nunca devem ser guardadas em cache.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(cookieSession({
  name: 'celso.sid',
  secret: process.env.SESSION_SECRET,
  maxAgeMs: SESSION_DURATION_MS,
  secure: isProduction
}));

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Faça login com o Google para jogar.' });
  }
  next();
}

// O código do jogo só é entregue para quem está logado.
// O arquivo se chama game.src (e não .js) de propósito: na Vercel, qualquer .js empacotado
// na função pode ser convertido para CommonJS, o que quebra o módulo do navegador
// ("exports is not defined"). Aqui ele é lido como texto e entregue como JavaScript.
const GAME_FILE = path.join(rootDir, 'game', 'game.src');
app.get('/game/game.js', requireLogin, async (_req, res) => {
  try {
    const code = await fs.readFile(GAME_FILE, 'utf8');
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript').send(code);
  } catch (error) {
    console.error('Falha ao ler o jogo:', error.message);
    res.status(500).json({ error: 'Não foi possível carregar o jogo.' });
  }
});

// Evita que o navegador reutilize uma versão antiga do site (HTML, CSS, JS e imagens).
app.use(express.static(path.join(rootDir, 'public'), {
  etag: true,
  setHeaders(res) { res.set('Cache-Control', 'no-cache'); }
}));

function originIsAllowed(req, res, next) {
  if (!allowedOrigins.includes(req.get('origin'))) {
    return res.status(403).json({ error: 'Origem não permitida.' });
  }
  next();
}

function makeCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Serve para conferir qual versão do projeto está realmente rodando: http://localhost:3000/api/version
app.get('/api/version', (_req, res) => {
  res.json({ name: 'super-celso-bros', version: APP_VERSION });
});

app.get('/api/config', (_req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID });
});

app.get('/api/csrf', (req, res) => {
  req.session.csrfToken ||= makeCsrfToken();
  res.json({ csrfToken: req.session.csrfToken });
});

app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

function requireCsrf(req, res, next) {
  const suppliedToken = req.get('x-csrf-token');
  if (!req.session.csrfToken || suppliedToken !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Solicitação inválida. Atualize a página e tente novamente.' });
  }
  next();
}

app.post('/api/auth/google', originIsAllowed, requireCsrf, async (req, res) => {
  const { credential } = req.body || {};
  if (typeof credential !== 'string' || credential.length > 12000) {
    return res.status(400).json({ error: 'Credencial de login inválida.' });
  }

  try {
    // Uma nova instância serverless precisa baixar as chaves públicas do Google; se essa
    // busca falhar por instabilidade momentânea, tentamos mais uma vez antes de desistir.
    const verify = () => googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    let ticket;
    try {
      ticket = await verify();
    } catch (firstError) {
      console.error('Falha ao validar o token do Google (tentando de novo):', firstError.message);
      await new Promise((resolve) => setTimeout(resolve, 400));
      ticket = await verify();
    }
    const payload = ticket.getPayload();
    if (!payload?.sub) throw new Error('Token sem identificador de usuário.');

    // Nova sessão a cada login (evita fixação de sessão).
    req.session = {
      user: {
        id: payload.sub,
        name: payload.name || 'Usuário Google',
        email: payload.email || null,
        picture: payload.picture || null,
        emailVerified: payload.email_verified === true
      },
      csrfToken: makeCsrfToken()
    };
    res.json({ user: req.session.user, csrfToken: req.session.csrfToken });
  } catch (error) {
    console.error('Login recusado:', error.message);
    res.status(401).json({ error: 'Não foi possível validar o login com Google. Tente de novo.' });
  }
});

app.post('/api/logout', originIsAllowed, requireCsrf, (req, res) => {
  req.session = null; // o middleware apaga o cookie
  res.sendStatus(204);
});

module.exports = app;
