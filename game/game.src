// Super Celso Bros — motor do jogo (entregue pelo servidor só para quem está logado).
// Uso: const game = await createGame(canvas, { onHud, onWin, onLose });

// ---------- Constantes do mundo ----------
const VIEW_W = 960;
const VIEW_H = 540;
const GROUND_Y = 424;        // linha dos pés do Celso (dentro da faixa de grama)
const T = 48;                // tamanho de um bloco
const LEVEL_W = 5000;        // largura da fase
const FLAG_X = 4700;         // posição do mastro da bandeira
const POLE_H = 320;

// ---------- Sprites do Celso ----------
const CELL_W = 168;
const CELL_H = 206;
const ANCHOR_X = 103;        // x da cabeça dentro do quadro (centro do corpo)
const SPR = 0.5;             // escala do sprite no jogo
const RUN_FRAMES = 9;         // ciclo de corrida em loop (novas sprites)
const JUMP_FRAMES = 8;

// ---------- Física ----------
const P_W = 34;
const P_H = 94;
const MAX_SPEED = 270;
const ACCEL = 1900;
const FRICTION = 2300;
const GRAVITY = 2100;
const JUMP_V = 720;
const MAX_FALL = 1000;
const START_LIVES = 3;
const BLOCK_REWARD = 100;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar ${src}`));
    img.src = src;
  });
}

// ---------- Pixel art desenhada por código (blocos, obstáculos, cédula) ----------
function makeSprite(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  draw((px, py, pw, ph, color) => { x.fillStyle = color; x.fillRect(px, py, pw, ph); });
  return c;
}

function makeQuestionBlock(used) {
  return makeSprite(16, 16, (r) => {
    const base = used ? '#7d8bb0' : '#f6a21e';
    const hi = used ? '#a9b6d6' : '#ffd966';
    const lo = used ? '#56628a' : '#c4680f';
    const ln = used ? '#2b3358' : '#5b2a0a';
    r(0, 0, 16, 16, ln);
    r(1, 1, 14, 14, base);
    r(1, 1, 14, 1, hi); r(1, 1, 1, 14, hi);
    r(1, 14, 14, 1, lo); r(14, 1, 1, 14, lo);
    [[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => r(x, y, 1, 1, ln));
    if (!used) {
      const glyph = ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.....', '..X..'];
      glyph.forEach((row, gy) => [...row].forEach((ch, gx) => {
        if (ch === 'X') { r(5 + gx + 1, 4 + gy + 1, 1, 1, ln); }
      }));
      glyph.forEach((row, gy) => [...row].forEach((ch, gx) => {
        if (ch === 'X') { r(5 + gx, 4 + gy, 1, 1, '#fff3c4'); }
      }));
    }
  });
}

function makeBrick() {
  return makeSprite(16, 16, (r) => {
    r(0, 0, 16, 16, '#5b2410');
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      const segs = row % 2 === 0 ? [[0, 6], [8, 14]] : [[0, 2], [4, 10], [12, 15]];
      segs.forEach(([a, b]) => {
        r(a, y, b - a + 1, 3, '#d2691e');
        r(a, y, b - a + 1, 1, '#ee9244');
      });
    }
  });
}

function makeBug() {
  return makeSprite(16, 16, (r) => {
    const dark = '#1a1a2e';
    const inside = (x, y) => {
      const dx = (x + 0.5 - 8) / 7.2;
      const dy = (y + 0.5 - 13.5) / 9;
      return y <= 13 && dx * dx + dy * dy <= 1;
    };
    [[2, 13], [3, 14], [5, 14], [10, 14], [12, 14], [13, 13], [1, 12], [14, 12]].forEach(([x, y]) => r(x, y, 1, 1, dark));
    r(5, 2, 1, 2, dark); r(10, 2, 1, 2, dark); r(4, 1, 1, 1, dark); r(11, 1, 1, 1, dark);
    for (let y = 3; y <= 14; y++) {
      for (let x = 0; x < 16; x++) {
        if (!inside(x, y)) continue;
        const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
        if (edge) { r(x, y, 1, 1, '#4a0a12'); continue; }
        const hl = x < 7 && y < 8;
        r(x, y, 1, 1, hl ? '#ff7a6e' : '#e8353a');
      }
    }
    r(7, 9, 2, 5, '#4a0a12');
    [[4, 10], [11, 10], [5, 12], [10, 12]].forEach(([x, y]) => r(x, y, 1, 1, dark));
    r(5, 5, 2, 2, '#ffffff'); r(9, 5, 2, 2, '#ffffff');
    r(6, 6, 1, 1, '#111'); r(9, 6, 1, 1, '#111');
    r(4, 4, 3, 1, dark); r(9, 4, 3, 1, dark);
  });
}

function makeVirus() {
  return makeSprite(16, 16, (r) => {
    const dark = '#0f5a37';
    const tip = '#b7ffd6';
    r(7, 0, 2, 3, dark); r(7, 13, 2, 3, dark); r(0, 7, 3, 2, dark); r(13, 7, 3, 2, dark);
    [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([x, y]) => { r(x, y, 2, 2, dark); });
    [[3, 3], [11, 3], [3, 11], [11, 11]].forEach(([x, y]) => { r(x, y, 2, 2, dark); });
    r(7, 0, 2, 1, tip); r(7, 15, 2, 1, tip); r(0, 7, 1, 2, tip); r(15, 7, 1, 2, tip);
    for (let y = 3; y < 13; y++) {
      for (let x = 3; x < 13; x++) {
        const dx = x + 0.5 - 8; const dy = y + 0.5 - 8;
        const d = dx * dx + dy * dy;
        if (d > 25) continue;
        r(x, y, 1, 1, d > 19 ? dark : (dx < -1 && dy < -1 ? '#7dffb0' : '#3ddc84'));
      }
    }
    r(5, 6, 2, 2, '#ffffff'); r(9, 6, 2, 2, '#ffffff');
    r(6, 7, 1, 1, '#111'); r(9, 7, 1, 1, '#111');
    r(5, 5, 3, 1, dark); r(8, 5, 3, 1, dark);
    r(6, 10, 4, 1, dark); r(5, 11, 1, 1, dark); r(10, 11, 1, 1, dark);
  });
}

function makeBill() {
  return makeSprite(16, 9, (r) => {
    r(0, 0, 16, 9, '#14532d');
    r(1, 1, 14, 7, '#34d27b');
    r(1, 1, 14, 1, '#6bf0a4');
    r(2, 2, 12, 5, '#26a560');
    r(6, 3, 4, 3, '#d9ffe8'); r(7, 2, 2, 5, '#d9ffe8');
    r(7, 3, 2, 3, '#14532d');
    r(2, 3, 1, 3, '#14532d'); r(13, 3, 1, 3, '#14532d');
  });
}

// ---------- Fase ----------
function buildLevel() {
  const blocks = [];
  const obstacles = [];
  const HIGH = GROUND_Y - 168; // topo da fileira alta de blocos

  const block = (x, y, type) => blocks.push({ x, y, w: T, h: T, type, used: false, bump: 0 });
  const q = (x) => block(x, HIGH, 'q');
  const brick = (x) => block(x, HIGH, 'brick');
  const stack = (x, n) => { for (let i = 0; i < n; i++) block(x, GROUND_Y - T * (i + 1), 'brick'); };
  const bug = (x) => obstacles.push({ kind: 'bug', x, y: GROUND_Y - T, w: T, h: T });
  const virus = (x) => obstacles.push({ kind: 'virus', x, y: GROUND_Y - T, w: T, h: T });

  bug(520);

  brick(800); q(848); brick(896); q(944); brick(992);

  virus(1280);

  stack(1500, 1); stack(1548, 2); q(1620);
  q(1760);

  bug(2000); bug(2170);

  q(2420); q(2468); q(2516);

  virus(2780);

  stack(3000, 2); stack(3048, 2); stack(3096, 2);

  bug(3300);

  q(3500); brick(3548); q(3596); brick(3644); q(3692);

  virus(3980); bug(4120);

  stack(4300, 1); stack(4348, 2); stack(4396, 3);

  return { blocks, obstacles };
}

// ---------- Jogo ----------
export async function createGame(canvas, hooks = {}) {
  const [bgImg, runImg, jumpImg, idleImg] = await Promise.all([
    loadImage('/assets/cenario.png'),
    loadImage('/assets/celso-run.png'),
    loadImage('/assets/celso-jump.png'),
    loadImage('/assets/celso-idle.png')
  ]);

  const ctx = canvas.getContext('2d');
  const quality = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * quality;
  canvas.height = VIEW_H * quality;

  // Cenário espelhado: permite repetir sem emenda visível.
  const mirror = document.createElement('canvas');
  mirror.width = VIEW_W * 2;
  mirror.height = VIEW_H;
  const mctx = mirror.getContext('2d');
  mctx.drawImage(bgImg, 0, 0, VIEW_W, VIEW_H);
  mctx.save();
  mctx.translate(VIEW_W * 2, 0);
  mctx.scale(-1, 1);
  mctx.drawImage(bgImg, 0, 0, VIEW_W, VIEW_H);
  mctx.restore();

  const art = {
    q: makeQuestionBlock(false),
    qUsed: makeQuestionBlock(true),
    brick: makeBrick(),
    bug: makeBug(),
    virus: makeVirus(),
    bill: makeBill()
  };

  // ---- Estado ----
  const keys = { left: false, right: false, jump: false };
  let level;
  let p;
  let cam;
  let state;           // ready | playing | flag | dead | won | over
  let money;
  let lives;
  let time;
  let invuln;
  let stun;
  let jumpBuffer;
  let coyote;
  let animClock;
  let runClock;
  let flagY;
  let endTimer;
  let fx;
  let lastHud = '';
  let muted = false;
  let rafId = 0;
  let destroyed = false;

  function reset() {
    level = buildLevel();
    p = { x: 140, y: GROUND_Y, vx: 0, vy: 0, face: 1, onGround: true, spin: 0 };
    cam = 0;
    money = 0;
    lives = START_LIVES;
    time = 0;
    invuln = 0;
    stun = 0;
    jumpBuffer = 0;
    coyote = 0;
    animClock = 0;
    runClock = 0;
    flagY = GROUND_Y - POLE_H + 6;
    endTimer = 0;
    fx = [];
    emitHud(true);
  }

  // ---- Sons (WebAudio, sem arquivos) ----
  let audio = null;
  function tone(f1, f2, dur, type = 'square', vol = 0.05, delay = 0) {
    if (muted) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t0 = audio.currentTime + delay;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f1, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch { /* som é opcional */ }
  }
  const sfx = {
    jump: () => tone(330, 700, 0.16),
    coin: () => { tone(988, 988, 0.08); tone(1319, 1319, 0.22, 'square', 0.05, 0.08); },
    hurt: () => tone(380, 70, 0.35, 'sawtooth', 0.06),
    bump: () => tone(140, 90, 0.08, 'triangle', 0.08),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'square', 0.05, i * 0.13)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.95, 0.22, 'triangle', 0.07, i * 0.2))
  };

  // ---- HUD ----
  function emitHud(force) {
    const data = {
      money,
      lives,
      progress: clamp(p.x / FLAG_X, 0, 1),
      time: Math.floor(time)
    };
    const key = `${data.money}|${data.lives}|${Math.round(data.progress * 100)}|${data.time}`;
    if (!force && key === lastHud) return;
    lastHud = key;
    if (hooks.onHud) hooks.onHud(data);
  }

  // ---- Entrada ----
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump'
  };

  function setKey(name, down) {
    if (!(name in keys)) return;
    if (name === 'jump' && down && !keys.jump) jumpBuffer = 0.13;
    keys[name] = down;
  }

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (state === 'playing' || state === 'ready') e.preventDefault();
    if (e.repeat) return;
    setKey(name, true);
  }
  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) setKey(name, false);
  }
  function releaseKeys() { keys.left = keys.right = keys.jump = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', releaseKeys);

  // ---- Colisão ----
  const playerRect = () => ({ l: p.x - P_W / 2, r: p.x + P_W / 2, t: p.y - P_H, b: p.y });
  const blockRect = (s) => ({ l: s.x, r: s.x + s.w, t: s.y, b: s.y + s.h });

  function moveX(dt) {
    p.x = clamp(p.x + p.vx * dt, P_W / 2, LEVEL_W - P_W / 2);
    const pr = playerRect();
    for (const s of level.blocks) {
      if (!overlap(pr, blockRect(s))) continue;
      if (p.vx > 0) p.x = s.x - P_W / 2;
      else if (p.vx < 0) p.x = s.x + s.w + P_W / 2;
      p.vx = 0;
      pr.l = p.x - P_W / 2;
      pr.r = p.x + P_W / 2;
    }
  }

  function moveY(dt) {
    const prevBottom = p.y;
    const prevTop = p.y - P_H;
    p.y += p.vy * dt;
    p.onGround = false;

    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.onGround = true;
    }

    const pr = playerRect();
    let bumped = null;
    let bestOverlap = 0;
    for (const s of level.blocks) {
      if (!overlap(pr, blockRect(s))) continue;
      if (p.vy > 0 && prevBottom <= s.y + 1) {
        p.y = s.y;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0 && prevTop >= s.y + s.h - 1) {
        const o = Math.min(pr.r, s.x + s.w) - Math.max(pr.l, s.x);
        if (o > bestOverlap) { bestOverlap = o; bumped = s; }
        p.y = s.y + s.h + P_H;
        p.vy = 0;
      }
      pr.t = p.y - P_H;
      pr.b = p.y;
    }
    if (bumped) bumpBlock(bumped);
  }

  function bumpBlock(s) {
    s.bump = 0.16;
    if (s.type === 'q' && !s.used) {
      s.used = true;
      money += BLOCK_REWARD;
      fx.push({ kind: 'bill', x: s.x + s.w / 2, y: s.y - 8, vy: -460, age: 0 });
      fx.push({ kind: 'text', x: s.x + s.w / 2, y: s.y - 30, text: `+R$${BLOCK_REWARD}`, age: 0 });
      sfx.coin();
    } else {
      sfx.bump();
    }
  }

  function hurt(from) {
    if (invuln > 0 || state !== 'playing') return;
    lives -= 1;
    sfx.hurt();
    if (lives <= 0) {
      state = 'dead';
      p.vy = -560;
      p.vx = 0;
      endTimer = 0;
      emitHud(true);
      return;
    }
    invuln = 1.7;
    stun = 0.3;
    const away = p.x < from.x + from.w / 2 ? -1 : 1;
    p.vx = away * 250;
    p.vy = -430;
    p.onGround = false;
    emitHud(true);
  }

  // ---- Atualização ----
  function stepPlaying(dt) {
    time += dt;
    invuln = Math.max(0, invuln - dt);
    stun = Math.max(0, stun - dt);
    jumpBuffer -= dt;

    const dir = stun > 0 ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) {
      const turning = Math.sign(p.vx) === -dir ? 1.8 : 1;
      p.vx += dir * ACCEL * turning * dt;
      p.face = dir;
    } else if (stun <= 0) {
      const f = FRICTION * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }
    if (stun <= 0) p.vx = clamp(p.vx, -MAX_SPEED, MAX_SPEED);

    coyote = p.onGround ? 0.1 : coyote - dt;
    if (jumpBuffer > 0 && coyote > 0 && stun <= 0) {
      p.vy = -JUMP_V;
      p.onGround = false;
      coyote = 0;
      jumpBuffer = 0;
      sfx.jump();
    }
    if (!keys.jump && p.vy < -280 && stun <= 0) p.vy = -280; // pulo curto ao soltar a tecla

    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
    moveX(dt);
    moveY(dt);

    // obstáculos
    const pr = playerRect();
    const hitbox = { l: pr.l + 4, r: pr.r - 4, t: pr.t + 10, b: pr.b };
    for (const o of level.obstacles) {
      const orect = { l: o.x + 9, r: o.x + o.w - 9, t: o.y + 12, b: o.y + o.h };
      if (overlap(hitbox, orect)) { hurt(o); break; }
    }

    // bandeira
    const pole = { l: FLAG_X, r: FLAG_X + 8, t: GROUND_Y - POLE_H, b: GROUND_Y };
    if (overlap(pr, pole)) {
      state = 'flag';
      p.x = FLAG_X - P_W / 2 - 2;
      p.vx = 0;
      p.vy = 0;
      p.face = 1;
      endTimer = 0;
      sfx.win();
    }

    animClock += dt;
    if (p.onGround && Math.abs(p.vx) > 10) runClock += dt * (6 + Math.abs(p.vx) * 0.055);  // cadência proporcional à velocidade (~21 quadros/s na velocidade máxima)
  }

  function stepFlag(dt) {
    endTimer += dt;
    const floor = GROUND_Y;
    if (p.y < floor) p.y = Math.min(floor, p.y + 170 * dt);
    flagY = Math.min(GROUND_Y - 70, flagY + 170 * dt);
    if (p.y >= floor && flagY >= GROUND_Y - 70 && endTimer > 1.3) {
      state = 'won';
      emitHud(true);
      if (hooks.onWin) hooks.onWin({ money, lives, time });
    }
  }

  function stepDead(dt) {
    endTimer += dt;
    p.vy = Math.min(p.vy + GRAVITY * dt, MAX_FALL);
    p.y += p.vy * dt;
    p.spin += dt * 9;
    if (endTimer > 1.1 && state === 'dead') {
      state = 'over';
      sfx.lose();
      if (hooks.onLose) hooks.onLose({ money, lives: 0, time });
    }
  }

  function stepFx(dt) {
    for (const s of level.blocks) if (s.bump > 0) s.bump = Math.max(0, s.bump - dt);
    for (const f of fx) {
      f.age += dt;
      if (f.kind === 'bill') {
        f.vy += 1500 * dt;
        f.y += f.vy * dt;
      } else if (f.kind === 'text') {
        f.y -= 40 * dt;
      }
    }
    fx = fx.filter((f) => (f.kind === 'bill' ? f.age < 0.62 : f.age < 1.1));
  }

  function update(dt) {
    if (state === 'playing') stepPlaying(dt);
    else if (state === 'flag') stepFlag(dt);
    else if (state === 'dead' || state === 'over') stepDead(dt);
    stepFx(dt);

    const target = clamp(p.x - 340, 0, LEVEL_W - VIEW_W);
    cam += (target - cam) * Math.min(1, dt * 8);
    if (state === 'playing' || state === 'flag') emitHud(false);
  }

  // ---- Desenho ----
  function drawLayer(destY0, destY1, factor) {
    const period = VIEW_W * 2;
    let sx = Math.floor((cam * factor) % period);
    let dx = 0;
    const h = destY1 - destY0;
    while (dx < VIEW_W) {
      const w = Math.min(period - sx, VIEW_W - dx);
      ctx.drawImage(mirror, sx, destY0, w, h, dx, destY0, w, h);
      dx += w;
      sx = 0;
    }
  }

  function drawSprite(img, frame) {
    ctx.drawImage(img, frame * CELL_W, 0, CELL_W, CELL_H, -ANCHOR_X * SPR, -CELL_H * SPR, CELL_W * SPR, CELL_H * SPR);
  }

  function floorUnderPlayer() {
    let floor = GROUND_Y;
    for (const s of level.blocks) {
      if (p.x + P_W / 2 > s.x && p.x - P_W / 2 < s.x + s.w && s.y >= p.y - 2) floor = Math.min(floor, s.y);
    }
    return floor;
  }

  function drawPlayer() {
    if (invuln > 0 && state === 'playing' && Math.floor(invuln * 14) % 2 === 0) return;

    // sombra
    if (state !== 'dead' && state !== 'over') {
      const floor = floorUnderPlayer();
      const height = clamp((floor - p.y) / -200, 0, 1);
      const shadowScale = 1 - Math.min(0.5, Math.abs(floor - p.y) / 260);
      ctx.fillStyle = `rgba(0,0,0,${0.28 * shadowScale})`;
      ctx.beginPath();
      ctx.ellipse(p.x - cam, floor + 2 + height, 24 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(Math.round(p.x - cam), Math.round(p.y));
    if (state === 'dead' || state === 'over') ctx.rotate(p.spin);
    ctx.scale(p.face, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const airborne = !p.onGround || state === 'dead' || state === 'over';
    if (airborne) {
      const t = clamp((p.vy + JUMP_V) / (2 * JUMP_V), 0, 0.999);
      drawSprite(jumpImg, Math.floor(t * JUMP_FRAMES));
    } else if (state === 'flag') {
      drawSprite(jumpImg, 1);
    } else if (Math.abs(p.vx) > 10) {
      drawSprite(runImg, Math.floor(runClock) % RUN_FRAMES);
    } else {
      drawSprite(idleImg, 0);
    }
    ctx.restore();
  }

  function drawBlocks() {
    ctx.imageSmoothingEnabled = false;
    for (const s of level.blocks) {
      const sx = s.x - cam;
      if (sx > VIEW_W || sx + s.w < 0) continue;
      const offset = s.bump > 0 ? -Math.sin((s.bump / 0.16) * Math.PI) * 9 : 0;
      const sprite = s.type === 'q' ? (s.used ? art.qUsed : art.q) : art.brick;
      ctx.drawImage(sprite, Math.round(sx), Math.round(s.y + offset), s.w, s.h);
    }
  }

  function drawObstacles() {
    ctx.imageSmoothingEnabled = false;
    for (const o of level.obstacles) {
      const sx = o.x - cam;
      if (sx > VIEW_W || sx + o.w < 0) continue;
      const bob = Math.sin(animClock * 5 + o.x) * (o.kind === 'virus' ? 2 : 1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(sx + o.w / 2, o.y + o.h + 1, 20, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(art[o.kind], Math.round(sx), Math.round(o.y + bob), o.w, o.h);
    }
  }

  function drawFlag() {
    const sx = FLAG_X - cam;
    if (sx > VIEW_W + 80 || sx < -120) return;
    const top = GROUND_Y - POLE_H;

    // pedestal
    ctx.fillStyle = '#0b2a8a';
    ctx.fillRect(sx - 12, GROUND_Y - 10, 32, 14);
    ctx.fillStyle = '#20e3ff';
    ctx.fillRect(sx - 12, GROUND_Y - 10, 32, 3);

    // mastro
    ctx.fillStyle = '#9fb4d6';
    ctx.fillRect(sx, top, 8, POLE_H);
    ctx.fillStyle = '#eef5ff';
    ctx.fillRect(sx, top, 3, POLE_H);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(sx + 4, top - 4, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3a8';
    ctx.fillRect(sx + 1, top - 8, 4, 4);

    // bandeira (tremula)
    const wave = Math.sin(animClock * 6) * 3;
    ctx.fillStyle = '#0b5d4a';
    ctx.beginPath();
    ctx.moveTo(sx, flagY - 2);
    ctx.lineTo(sx - 62 + wave, flagY + 19);
    ctx.lineTo(sx, flagY + 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2ee6a6';
    ctx.beginPath();
    ctx.moveTo(sx - 2, flagY + 3);
    ctx.lineTo(sx - 54 + wave, flagY + 19);
    ctx.lineTo(sx - 2, flagY + 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#06322a';
    ctx.font = 'bold 11px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('</>', sx - 26 + wave / 2, flagY + 24);
  }

  function drawFx() {
    for (const f of fx) {
      const sx = f.x - cam;
      if (f.kind === 'bill') {
        const w = Math.max(4, Math.abs(Math.cos(f.age * 16)) * 40);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(art.bill, Math.round(sx - w / 2), Math.round(f.y), Math.round(w), 22);
      } else {
        ctx.save();
        ctx.globalAlpha = clamp(1.1 - f.age, 0, 1);
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#06143f';
        ctx.fillText(f.text, sx + 2, f.y + 2);
        ctx.fillStyle = '#ffe14d';
        ctx.fillText(f.text, sx, f.y);
        ctx.restore();
      }
    }
  }

  function render() {
    ctx.setTransform(quality, 0, 0, quality, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    drawLayer(0, 414, 0.3);       // céu e prédios (parallax)
    drawLayer(414, VIEW_H, 1);    // grama e terra
    drawFlag();
    drawBlocks();
    drawObstacles();
    drawFx();
    drawPlayer();
  }

  // ---- Loop ----
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function frame(now) {
    if (destroyed) return;
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    render();
    rafId = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden) releaseKeys();
    last = performance.now();
  }
  document.addEventListener('visibilitychange', onVisibility);

  reset();
  state = 'ready';
  rafId = requestAnimationFrame(frame);

  return {
    start() {
      if (state === 'ready') { state = 'playing'; emitHud(true); }
    },
    restart() {
      reset();
      state = 'playing';
    },
    setKey,
    setMuted(value) { muted = Boolean(value); },
    isMuted: () => muted,
    getState: () => state,
    getInfo: () => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, onGround: p.onGround, money, lives, state, level }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseKeys);
      document.removeEventListener('visibilitychange', onVisibility);
      if (audio) audio.close().catch(() => {});
    }
  };
}
