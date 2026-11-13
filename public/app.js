const $ = (selector) => document.querySelector(selector);

const els = {
  topbar: $('#topbar'),
  loginScreen: $('#login-screen'),
  gameScreen: $('#game-screen'),
  status: $('#status'),
  googleButton: $('#google-button'),
  avatar: $('#avatar'),
  name: $('#name'),
  email: $('#email'),
  logout: $('#logout'),
  mute: $('#mute'),
  canvas: $('#game'),
  hud: $('#hud'),
  hudMoney: $('#hud-money'),
  hudLives: $('#hud-lives'),
  hudBar: $('#hud-bar'),
  hudTime: $('#hud-time'),
  overlays: {
    loading: $('#overlay-loading'),
    start: $('#overlay-start'),
    win: $('#overlay-win'),
    lose: $('#overlay-lose')
  }
};

let csrfToken = '';
let googleConfig = null;
let gisLoaded = false;
let game = null;
let gameLoading = false;
let expiredRetries = 0;

// ---------- Utilidades ----------
async function getJson(url, options) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Ocorreu um erro.');
  return data;
}

const formatMoney = (value) => `R$ ${value}`;
const formatTime = (seconds) => {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

// Coração em pixel art (SVG)
const HEART_ROWS = [
  '.XX..XX.',
  'XXXXXXXX',
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..XXXX..',
  '...XX...'
];
function heartSvg(lost) {
  const rects = [];
  HEART_ROWS.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== 'X') return;
    const shine = (x === 1 && y === 1) || (x === 2 && y === 1) || (x === 1 && y === 2);
    rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${shine ? '#ff9aa8' : '#ff3b4f'}"/>`);
  }));
  return `<svg class="heart${lost ? ' lost' : ''}" viewBox="0 0 8 7" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

function renderLives(lives) {
  els.hudLives.setAttribute('aria-label', `${lives} vidas`);
  els.hudLives.innerHTML = [0, 1, 2].map((i) => heartSvg(i >= lives)).join('');
}

// ---------- Telas ----------
function showOverlay(name) {
  for (const [key, el] of Object.entries(els.overlays)) el.hidden = key !== name;
}

function showLogin(message) {
  document.body.dataset.view = 'login';
  els.topbar.hidden = true;
  els.gameScreen.hidden = true;
  els.loginScreen.hidden = false;
  if (message) els.status.textContent = message;
}

function showGameScreen(user) {
  document.body.dataset.view = 'game';
  els.loginScreen.hidden = true;
  els.topbar.hidden = false;
  els.gameScreen.hidden = false;

  els.name.textContent = user.name;
  els.email.textContent = user.email || '';
  els.email.hidden = !user.email;
  if (user.picture) {
    els.avatar.src = user.picture;
    els.avatar.hidden = false;
  } else {
    els.avatar.hidden = true;
  }
}

// ---------- Jogo ----------
function setLoadingMessage(text, { busy = false, retry = false } = {}) {
  const panelText = els.overlays.loading.querySelector('.panel-text');
  panelText.textContent = text;
  panelText.classList.toggle('blink', busy);
  $('#btn-reload').hidden = !retry;
}

async function loadGame() {
  if (game || gameLoading) return;
  gameLoading = true;
  showOverlay('loading');
  setLoadingMessage('CARREGANDO…', { busy: true });
  els.hud.hidden = true;
  try {
    // O servidor só entrega game.js para quem está logado. Conferimos o status antes
    // de importar para mostrar uma mensagem clara (o import() sozinho só diz "falhou").
    const check = await fetch('/game/game.js', { credentials: 'same-origin', cache: 'no-store' });
    if (check.status === 401) {
      if (expiredRetries++ >= 1) throw new Error('o servidor não reconheceu o seu login (401)');
      gameLoading = false;
      await refreshSession('Sua sessão expirou. Entre novamente.');
      return;
    }
    expiredRetries = 0;
    if (!check.ok) throw new Error(`o servidor respondeu ${check.status} para /game/game.js`);

    // "?v=" evita que o navegador reaproveite uma versão antiga ou uma falha anterior.
    const module = await import(`/game/game.js?v=${Date.now()}`);
    game = await module.createGame(els.canvas, {
      onHud(data) {
        els.hudMoney.textContent = formatMoney(data.money);
        els.hudTime.textContent = formatTime(data.time);
        els.hudBar.style.width = `${Math.round(data.progress * 100)}%`;
        renderLives(data.lives);
      },
      onWin(stats) {
        $('#win-money').textContent = formatMoney(stats.money);
        $('#win-time').textContent = formatTime(stats.time);
        $('#win-lives').textContent = String(stats.lives);
        showOverlay('win');
      },
      onLose(stats) {
        $('#lose-money').textContent = formatMoney(stats.money);
        $('#lose-time').textContent = formatTime(stats.time);
        showOverlay('lose');
      }
    });
    game.setMuted(els.mute.getAttribute('aria-pressed') === 'true');
    renderLives(3);
    els.hud.hidden = false;
    showOverlay('start');
    $('#btn-start').focus({ preventScroll: true });
  } catch (error) {
    game = null;
    console.error('Erro ao carregar o jogo:', error);
    setLoadingMessage(`Erro ao carregar o jogo: ${error.message}`, { retry: true });
  } finally {
    gameLoading = false;
  }
}

function startGame() {
  if (!game) return;
  showOverlay(null);
  document.activeElement?.blur();
  game.start();
}

function restartGame() {
  if (!game) return;
  showOverlay(null);
  document.activeElement?.blur();
  game.restart();
}

$('#btn-start').addEventListener('click', startGame);
$('#btn-again').addEventListener('click', restartGame);
$('#btn-retry').addEventListener('click', restartGame);
$('#btn-reload').addEventListener('click', () => window.location.reload());

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || els.gameScreen.hidden) return;
  if (!els.overlays.start.hidden) startGame();
  else if (!els.overlays.win.hidden || !els.overlays.lose.hidden) restartGame();
});

// Botões de toque
document.querySelectorAll('.touch-btn').forEach((button) => {
  const key = button.dataset.key;
  const press = (down) => (event) => {
    event.preventDefault();
    button.classList.toggle('pressed', down);
    if (game) game.setKey(key, down);
  };
  button.addEventListener('pointerdown', press(true));
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => button.addEventListener(type, press(false)));
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

// Toque na tela para iniciar (celular)
els.canvas.addEventListener('pointerdown', () => {
  if (!els.overlays.start.hidden) startGame();
});

els.mute.addEventListener('click', () => {
  const muted = els.mute.getAttribute('aria-pressed') !== 'true';
  els.mute.setAttribute('aria-pressed', String(muted));
  els.mute.textContent = muted ? 'SOM: DESLIGADO' : 'SOM: LIGADO';
  if (game) game.setMuted(muted);
});

// ---------- Login com Google ----------
async function onGoogleCredential(response) {
  els.status.textContent = 'Validando seu login…';
  try {
    const result = await getJson('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ credential: response.credential })
    });
    csrfToken = result.csrfToken;
    els.status.textContent = '';
    showGameScreen(result.user);
    await loadGame();
  } catch (error) {
    els.status.textContent = error.message;
  }
}

function loadGoogleButton() {
  if (!googleConfig?.clientId || googleConfig.clientId.startsWith('SEU_CLIENT_ID')) {
    els.status.textContent = 'Configure GOOGLE_CLIENT_ID no arquivo .env para habilitar o login.';
    return;
  }

  const render = () => {
    google.accounts.id.initialize({ client_id: googleConfig.clientId, callback: onGoogleCredential });
    els.googleButton.replaceChildren();
    google.accounts.id.renderButton(els.googleButton, {
      theme: 'filled_blue',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      logo_alignment: 'left'
    });
    els.status.textContent = 'Clique no botão acima para entrar.';
  };

  if (gisLoaded) return render();

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => { gisLoaded = true; render(); };
  script.onerror = () => { els.status.textContent = 'Não foi possível carregar o login do Google.'; };
  document.head.append(script);
}

async function refreshSession(message) {
  try {
    const [config, csrf, session] = await Promise.all([
      getJson('/api/config'), getJson('/api/csrf'), getJson('/api/session')
    ]);
    googleConfig = config;
    csrfToken = csrf.csrfToken;

    // Já está logado: vai direto para o jogo e continua conectado até encerrar a sessão.
    if (session.user) {
      showGameScreen(session.user);
      await loadGame();
      return;
    }

    showLogin(message || '');
    loadGoogleButton();
  } catch (error) {
    showLogin(error.message);
  }
}

els.logout.addEventListener('click', async () => {
  els.logout.disabled = true;
  try {
    await getJson('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    if (game) { game.destroy(); game = null; }
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    await refreshSession('Sessão encerrada. Volte sempre!');
  } catch (error) {
    alert(error.message);
  } finally {
    els.logout.disabled = false;
  }
});

showLogin('Carregando…');
refreshSession();
