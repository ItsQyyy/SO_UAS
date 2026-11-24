// ============================================================
// MESIN GAME: gerak, laser, cermin, switch, gerbang, deadlock, render
// ============================================================
const Game = (function () {
  const T = 48, COLS = 16, ROWS = 11, DASH_CD = 0.9, MOVE_CD = 0.13;
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYMAP = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };
  const COL = { blue: '#4ac8ff', red: '#ff4a4a', gold: '#ffb347', steam: '#eef3f7', purple: '#c77dff' };
  const DEADLY = ['red', 'steam', 'purple'];
  const steam = () => L.theme === 'steam';
  const crypt = () => L.theme === 'crypt';
  const matrix = () => L.theme === 'matrix';
  let cv, ctx, L = null, S = null, spr = null, idx = 0, running = false, raf = 0, lastT = 0, cb = {};
  let held = [];
  const key = (x, y) => x + ',' + y;

  // ---------- Mulai / reset ----------
  function start(i, char, callbacks) {
    cv = document.getElementById('game'); ctx = cv.getContext('2d');
    cb = callbacks || {}; idx = i; L = LEVELS[i]; held = [];
    spr = document.createElement('canvas'); draw(spr, char, 3);
    running = true; init();
    lastT = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function init() {
    S = {
      walls: new Set(), px: 0, py: 0, face: 'down', hasKey: false, keyPos: null, door: null,
      mirrors: L.mirrors.map(o => ({ ...o })), logics: (L.logics || []).map(o => ({ ...o, or: false })), sw: {}, gates: L.gates.map(g => ({ ...g, open: false })),
      beams: [], red: new Set(), hits: new Set(),
      moveCd: 0, dashCd: 0, dead: 0, deadlock: false, won: false, paused: false, flash: 0, t: 0
    };
    L.map.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === '#') S.walls.add(key(x, y));
      if (c === 'P') { S.px = x; S.py = y; }
      if (c === 'K') S.keyPos = { x, y };
      if (c === 'D') S.door = { x, y };
    }));
    L.switches.forEach(s => { S.sw[s.id] = { ...s, on: false }; });
    world();
    msg(L.hint, 'info', 7000);
    cb.onLevel && cb.onLevel(L.name, L);
  }
  const msg = (t, k, ms) => cb.onMsg && cb.onMsg(t, k, ms);

  // ---------- Fisika dunia: laser <-> gerbang ----------
  function world() {
    for (let i = 0; i < 5; i++) { trace(); if (!updateGates()) break; }
    checkDeadlock();
  }
  function evalCond(c) {
    if (c.logic) { const m = S.logics.find(l => l.id === c.logic).or, a = evalCond(c.a), b = evalCond(c.b); return m ? (a || b) : (a && b); }
    return c.rc ? S.hits.has(c.rc) === (c.on !== false) : S.sw[c.sw].on === c.on;
  }
  function updateGates() {
    let changed = false;
    S.gates.forEach(g => {
      const open = g.need.every(evalCond);
      if (open !== g.open) { g.open = open; changed = true; }
    });
    return changed;
  }
  const inB = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const gateAt = (x, y) => S.gates.find(g => g.x === x && g.y === y);
  const isDoor = (x, y) => S.door && S.door.x === x && S.door.y === y;
  const solidBeam = (x, y) => !inB(x, y) || S.walls.has(key(x, y)) || (gateAt(x, y) && !gateAt(x, y).open) ||
    L.emitters.some(e => e.x === x && e.y === y) || L.receivers.some(r => r.x === x && r.y === y) || S.logics.some(l => l.x === x && l.y === y) || isDoor(x, y);
  const solidMove = (x, y) => solidBeam(x, y) || S.mirrors.some(m => m.x === x && m.y === y);

  function trace() {
    S.beams = []; S.red = new Set(); S.hits = new Set();
    L.emitters.forEach(e => {
      let [dx, dy] = DIR[e.dir], x = e.x, y = e.y;
      const pts = [{ x: x + .5, y: y + .5 }];
      for (let n = 0; n < 300; n++) {
        x += dx; y += dy;
        if (solidBeam(x, y)) {
          const r = L.receivers.find(r => r.x === x && r.y === y);
          if (r) { if (r.color === e.color) S.hits.add(r.id); pts.push({ x: x + .5, y: y + .5 }); }
          else pts.push({ x: x - dx * .5 + .5, y: y - dy * .5 + .5 });
          break;
        }
        const m = S.mirrors.find(m => m.x === x && m.y === y);
        if (m) { pts.push({ x: x + .5, y: y + .5 }); [dx, dy] = m.type === '/' ? [-dy, -dx] : [dy, dx]; continue; }
        if (DEADLY.includes(e.color)) S.red.add(key(x, y));
      }
      S.beams.push({ pts, color: e.color });
    });
  }

  // ---------- Deteksi DEADLOCK (eksak) ----------
  // Mencari (BFS) apakah dari kondisi sekarang pintu masih bisa dicapai membawa kunci.
  // Jika tidak ada jalan sama sekali -> DEADLOCK. Model pencarian sengaja lebih longgar
  // dari game nyata (arah hadap & cooldown dash diabaikan), jadi tidak pernah salah vonis.
  function checkDeadlock() {
    if (S.deadlock || S.won) return;
    if (!solvable()) { S.deadlock = true; msg(L.deadlockMsg || 'DEADLOCK DETECTED! Ganti urutan Switch / Alihkan Laser (tekan R)', 'danger', 0); }
  }
  function solvable() {
    const sws = Object.values(S.sw), n1 = sws.length, n2 = S.mirrors.length, n3 = S.logics.length;
    const getCfg = () => { let v = 0; sws.forEach((o, i) => { if (o.on) v |= 1 << i; }); S.mirrors.forEach((m, i) => { if (m.type === '/') v |= 1 << (n1 + i); }); S.logics.forEach((l, i) => { if (l.or) v |= 1 << (n1 + n2 + i); }); return v; };
    const getGb = () => { let v = 0; S.gates.forEach((g, i) => { if (g.open) v |= 1 << i; }); return v; };
    const apply = (cfg, gb) => {
      sws.forEach((o, i) => { o.on = !!(cfg & (1 << i)); });
      S.mirrors.forEach((m, i) => { m.type = (cfg & (1 << (n1 + i))) ? '/' : '\\'; });
      S.logics.forEach((l, i) => { l.or = !!(cfg & (1 << (n1 + n2 + i))); });
      S.gates.forEach((g, i) => { g.open = !!(gb & (1 << i)); });
    };
    const cfg0 = getCfg(), gb0 = getGb(), cache = new Map();
    const settle = (cfg, gb) => {
      const k = cfg + ',' + gb; if (cache.has(k)) return cache.get(k);
      apply(cfg, gb); for (let i = 0; i < 5; i++) { trace(); if (!updateGates()) break; }
      const r = { gb: getGb(), red: S.red }; cache.set(k, r); return r;
    };
    const kk = (x, y) => y * COLS + x;
    const start = [S.px, S.py, S.hasKey ? 1 : 0, cfg0, gb0];
    const seen = new Set([start.join()]), q = [start]; let result = false;
    const push = (x, y, kv, cfg, gb) => { const k = [x, y, kv, cfg, gb].join(); if (!seen.has(k)) { seen.add(k); q.push([x, y, kv, cfg, gb]); } };
    const kp = (x, y, kv) => (S.keyPos && x === S.keyPos.x && y === S.keyPos.y) ? 1 : kv;
    while (q.length) {
      if (seen.size > 150000) { result = true; break; }
      const [x, y, kv, cfg, gb] = q.shift(), sn = settle(cfg, gb);
      apply(cfg, sn.gb); S.red = sn.red;
      let won = false;
      for (const [dx, dy] of Object.values(DIR)) {
        const nx = x + dx, ny = y + dy;
        if (isDoor(nx, ny)) { if (kv) { won = true; break; } continue; }
        if (!solidMove(nx, ny) && !sn.red.has(key(nx, ny))) push(nx, ny, kp(nx, ny, kv), cfg, sn.gb);
        if (solidMove(nx, ny)) continue;
        const x2 = nx + dx, y2 = ny + dy;
        const far = !isDoor(x2, y2) && !solidMove(x2, y2);
        const lx = far ? x2 : nx, ly = far ? y2 : ny;
        if (!sn.red.has(key(lx, ly))) push(lx, ly, kp(lx, ly, kv), cfg, sn.gb);
      }
      if (won) { result = true; break; }
      // interaksi: switch (di tile sendiri), cermin & gerbang logic (bersebelahan)
      const tryCfg = (ncfg) => {
        const s2 = settle(ncfg, sn.gb); apply(cfg, sn.gb); S.red = sn.red;
        if (!s2.red.has(key(x, y))) push(x, y, kv, ncfg, s2.gb);
      };
      sws.forEach((o, i) => { if (o.x === x && o.y === y && !(o.latch && (cfg & (1 << i)))) tryCfg(cfg ^ (1 << i)); });
      for (const [dx, dy] of Object.values(DIR)) {
        const nx = x + dx, ny = y + dy;
        S.mirrors.forEach((m, i) => { if (m.x === nx && m.y === ny) tryCfg(cfg ^ (1 << (n1 + i))); });
        S.logics.forEach((l, i) => { if (l.x === nx && l.y === ny) tryCfg(cfg ^ (1 << (n1 + n2 + i))); });
      }
      apply(cfg, sn.gb); S.red = sn.red;
    }
    apply(cfg0, gb0); trace();   // pulihkan kondisi game nyata
    return result;
  }

  // ---------- Aksi pemain ----------
  function step(dir) {
    S.face = dir;
    const [dx, dy] = DIR[dir], nx = S.px + dx, ny = S.py + dy;
    if (isDoor(nx, ny)) {
      if (S.hasKey) { S.px = nx; S.py = ny; S.won = true; cb.onWin && cb.onWin(idx); }
      else msg('Pintu terkunci. Butuh kunci!', 'warn', 1800);
      return;
    }
    if (solidMove(nx, ny)) return;
    if (S.red.has(key(nx, ny))) { msg('Berbahaya! Tekan SPACE (Dash) untuk menyeberang.', 'warn', 1500); return; }
    S.px = nx; S.py = ny; afterMove();
  }
  function afterMove() {
    if (S.keyPos && !S.hasKey && S.px === S.keyPos.x && S.py === S.keyPos.y) {
      S.hasKey = true; msg('Kunci didapat! Cari jalan ke pintu.', 'info', 2500); checkDeadlock();
    }
    checkRed();
  }
  function checkRed() {
    if (S.dead <= 0 && S.red.has(key(S.px, S.py))) { S.dead = 0.8; msg('Terkena laser merah! Mengulang level...', 'warn', 1500); }
  }
  function dash() {
    if (S.dashCd > 0) return;
    const [dx, dy] = DIR[S.face], x1 = S.px + dx, y1 = S.py + dy, x2 = x1 + dx, y2 = y1 + dy;
    if (solidMove(x1, y1)) return;
    if (!solidMove(x2, y2)) { S.px = x2; S.py = y2; } else { S.px = x1; S.py = y1; }
    S.dashCd = DASH_CD; afterMove();
  }
  // Cari objek yang bisa diinteraksi: tile depan -> tile sendiri -> sekitar
  function target() {
    const [dx, dy] = DIR[S.face];
    const cand = [[S.px + dx, S.py + dy], [S.px, S.py], [S.px, S.py - 1], [S.px, S.py + 1], [S.px - 1, S.py], [S.px + 1, S.py]];
    for (const [x, y] of cand) {
      const m = S.mirrors.find(m => m.x === x && m.y === y); if (m) return { kind: 'mirror', o: m };
      const g = S.logics.find(l => l.x === x && l.y === y); if (g) return { kind: 'logic', o: g };
      const s = Object.values(S.sw).find(s => s.x === x && s.y === y); if (s) return { kind: 'switch', o: s };
    }
    return null;
  }
  function interact() {
    const t = target(); if (!t) return;
    if (t.kind === 'mirror') { t.o.type = t.o.type === '/' ? '\\' : '/'; S.flash = .2; }
    else if (t.kind === 'logic') { t.o.or = !t.o.or; S.flash = .2; msg('Gerbang Logic: mode ' + (t.o.or ? 'OR' : 'AND'), 'info', 1800); }
    else {
      if (t.o.latch && t.o.on) { msg('Switch ' + t.o.id + ' sudah terkunci permanen.', 'warn', 1800); return; }
      t.o.on = !t.o.on; msg('Switch ' + t.o.id + (t.o.on ? ' AKTIF' : ' MATI'), 'info', 1500);
    }
    world(); checkRed();
  }
  function act(a) {
    if (!running || !S) return;
    if (a === 'reset') { init(); return; }
    if (a === 'pause') { if (S.won) return; S.paused = !S.paused; cb.onPause && cb.onPause(S.paused); return; }
    if (S.paused || S.won || S.dead > 0) return;
    if (DIR[a]) step(a); else if (a === 'dash') dash(); else if (a === 'interact') interact();
  }

  // ---------- Input keyboard ----------
  addEventListener('keydown', e => {
    if (!running) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
    if (KEYMAP[k]) {
      if (!held.includes(KEYMAP[k])) held.push(KEYMAP[k]);
      if (!e.repeat && S.moveCd <= 0 && !S.paused && !S.won && S.dead <= 0) { step(KEYMAP[k]); S.moveCd = MOVE_CD; }
    }
    else if (k === ' ') act('dash');
    else if (k === 'e') act('interact');
    else if (k === 'r') act('reset');
    else if (k === 'escape') act('pause');
  });
  addEventListener('keyup', e => { const d = KEYMAP[e.key.toLowerCase()]; if (d) held = held.filter(x => x !== d); });

  // ---------- Loop ----------
  function loop(t) {
    if (!running) return;
    const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
    update(dt); render(); raf = requestAnimationFrame(loop);
  }
  function update(dt) {
    if (S.paused || S.won) return;
    S.t += dt; S.dashCd = Math.max(0, S.dashCd - dt); S.moveCd = Math.max(0, S.moveCd - dt); S.flash = Math.max(0, S.flash - dt);
    cb.onDash && cb.onDash(S.dashCd);
    if (S.dead > 0) { S.dead -= dt; if (S.dead <= 0) init(); return; }
    if (held.length && S.moveCd <= 0) { step(held[held.length - 1]); S.moveCd = MOVE_CD; }
  }

  // ---------- Render ----------
  function render() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (S.walls.has(key(x, y))) continue;
      ctx.fillStyle = crypt() ? ((x + y) % 2 ? '#2d3036' : '#32353c') : steam() ? ((x + y) % 2 ? '#3a3127' : '#40362b') : ((x + y) % 2 ? '#1b2638' : '#1f2b3f'); ctx.fillRect(x * T, y * T, T, T);
      ctx.strokeStyle = crypt() ? '#202328' : steam() ? '#2a231b' : '#101a29'; ctx.strokeRect(x * T + .5, y * T + .5, T - 1, T - 1);
    }
    if (crypt()) floorDeco();
    S.walls.forEach(k => { const [x, y] = k.split(',').map(Number); wall(x, y); });
    beams();
    if (S.door) doorTile();
    if (S.keyPos && !S.hasKey) keyTile();
    Object.values(S.sw).forEach(swTile);
    S.gates.forEach(gateTile);
    L.receivers.forEach(recvTile);
    L.emitters.forEach(emitTile);
    S.mirrors.forEach(mirrorTile);
    S.logics.forEach(logicTile);
    player(); labels();
    if (crypt()) vignette();
    if (S.dead > 0) { ctx.fillStyle = 'rgba(255,40,40,' + (.35 * S.dead) + ')'; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (S.deadlock) { ctx.strokeStyle = 'rgba(255,74,74,' + (.5 + .5 * Math.sin(S.t * 6)) + ')'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, cv.width - 6, cv.height - 6); ctx.lineWidth = 1; }
  }
  function wall(x, y) {
    if (matrix()) {
      const qx = x * T, qy = y * T, h = ctx.createLinearGradient(qx, qy, qx, qy + T);
      h.addColorStop(0, '#2f3f58'); h.addColorStop(1, '#18212f');
      ctx.fillStyle = h; ctx.fillRect(qx, qy, T, T);
      ctx.strokeStyle = '#0e141d'; ctx.lineWidth = 2; ctx.strokeRect(qx + 1, qy + 1, T - 2, T - 2); ctx.lineWidth = 1;
      if ((x * 3 + y * 5) % 3 === 0) {
        ctx.fillStyle = '#10151e'; ctx.fillRect(qx + 6, qy + 6, T - 12, T - 12);
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#1d2736'; ctx.fillRect(qx + 9, qy + 9 + i * 10, T - 18, 7);
          ctx.fillStyle = (Math.floor(S.t * 2) + x + y + i) % 3 ? '#22d3ee' : '#4ade80'; ctx.fillRect(qx + T - 17, qy + 11 + i * 10, 4, 3);
        }
      } else { ctx.fillStyle = '#3f5272'; ctx.fillRect(qx + 3, qy + 3, T - 6, 3); }
      return;
    }
    if (crypt()) {
      const qx = x * T, qy = y * T, h = ctx.createLinearGradient(qx, qy, qx, qy + T);
      h.addColorStop(0, '#3a3e46'); h.addColorStop(1, '#1d2025');
      ctx.fillStyle = h; ctx.fillRect(qx, qy, T, T);
      ctx.strokeStyle = '#15171b'; ctx.lineWidth = 2; ctx.strokeRect(qx + 1, qy + 1, T - 2, T - 2);
      ctx.beginPath(); ctx.moveTo(qx, qy + T / 2); ctx.lineTo(qx + T, qy + T / 2);
      ctx.moveTo(qx + (y % 2 ? 16 : 32), qy); ctx.lineTo(qx + (y % 2 ? 16 : 32), qy + T / 2);
      ctx.moveTo(qx + (y % 2 ? 32 : 16), qy + T / 2); ctx.lineTo(qx + (y % 2 ? 32 : 16), qy + T); ctx.stroke(); ctx.lineWidth = 1;
      if ((x * 3 + y * 5) % 5 === 0) { ctx.fillStyle = '#3f5a3a'; ctx.fillRect(qx + 4, qy + T - 9, 14, 5); }
      const cx = qx + T / 2;
      if ((y === 0 && [1, 3, 5, 10, 12, 14].includes(x)) || ((x === 0 || x === COLS - 1) && [2, 8].includes(y))) {
        ctx.fillStyle = '#5a5f6b'; ctx.fillRect(cx - 5, qy + 22, 10, 12);
        flame(cx, qy + 22, '#6aa8ff', 7);
      }
      if (y === 0 && (x === 4 || x === 11)) {
        ctx.fillStyle = '#d8d8cf'; ctx.beginPath(); ctx.arc(cx, qy + 22, 9, 0, 7); ctx.fill(); ctx.fillRect(cx - 6, qy + 26, 12, 8);
        ctx.fillStyle = '#15171b'; ctx.fillRect(cx - 5, qy + 19, 4, 5); ctx.fillRect(cx + 1, qy + 19, 4, 5);
      }
      if (y === 0 && (x === 7 || x === 8)) {
        ctx.fillStyle = '#0d0f12'; ctx.fillRect(qx, qy + 6, T, T - 6);
        ctx.fillStyle = '#5c616b'; for (let i = 0; i < 3; i++) ctx.fillRect(qx + 6 + i * 14, qy + 6, 4, T - 6);
        ctx.fillRect(qx, qy + 20, T, 4);
      }
      return;
    }
    if (steam()) {
      const qx = x * T, qy = y * T, h = ctx.createLinearGradient(qx, qy, qx, qy + T);
      h.addColorStop(0, '#7a6544'); h.addColorStop(1, '#43362a');
      ctx.fillStyle = h; ctx.fillRect(qx, qy, T, T);
      ctx.strokeStyle = '#241a10'; ctx.lineWidth = 2; ctx.strokeRect(qx + 1, qy + 1, T - 2, T - 2); ctx.lineWidth = 1;
      ctx.fillStyle = '#c8962e';
      [[7, 7], [T - 7, 7], [7, T - 7], [T - 7, T - 7]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(qx + a, qy + b, 2.5, 0, 7); ctx.fill(); });
      if ((x * 3 + y * 5) % 4 === 0) { ctx.fillStyle = '#ffb347'; ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 8; ctx.fillRect(qx + 12, qy + 20, 24, 5); ctx.shadowBlur = 0; }
      return;
    }
    const px = x * T, py = y * T, g = ctx.createLinearGradient(px, py, px, py + T);
    g.addColorStop(0, '#4a566a'); g.addColorStop(1, '#2b3544');
    ctx.fillStyle = g; ctx.fillRect(px, py, T, T);
    ctx.strokeStyle = '#1a2230'; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2); ctx.lineWidth = 1;
    ctx.fillStyle = '#5d6b82'; ctx.fillRect(px + 3, py + 3, T - 6, 3);
    if ((x * 3 + y * 5) % 4 === 0) { ctx.fillStyle = '#3fd0ff'; ctx.shadowColor = '#3fd0ff'; ctx.shadowBlur = 8; ctx.fillRect(px + 12, py + 20, 24, 5); ctx.shadowBlur = 0; }
  }
  function beams() {
    S.beams.forEach(b => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); b.pts.forEach((p, i) => i ? ctx.lineTo(p.x * T, p.y * T) : ctx.moveTo(p.x * T, p.y * T));
      if (crypt()) { zapBeam(b); return; }
      if (b.color === 'steam') {
        ctx.strokeStyle = 'rgba(235,242,248,.4)'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.lineWidth = 11; ctx.stroke();
        ctx.shadowBlur = 0; ctx.lineWidth = 1; puffs(b.pts); return;
      }
      ctx.strokeStyle = COL[b.color]; ctx.shadowColor = COL[b.color]; ctx.shadowBlur = 14; ctx.lineWidth = 5; ctx.stroke();
      ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1;
    });
  }
  function doorTile() {
    if (crypt()) return doorCrypt();
    const px = S.door.x * T, py = S.door.y * T;
    ctx.fillStyle = '#505b6e'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    ctx.fillStyle = S.hasKey ? '#12301f' : '#2d3646'; ctx.fillRect(px + 8, py + 8, T - 16, T - 8);
    if (!S.hasKey) {
      ctx.fillStyle = '#f2b632'; ctx.fillRect(px + 17, py + 22, 14, 12);
      ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 24, py + 22, 6, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 1;
      plate('Butuh Kunci', px + T / 2, py - 8);
    } else { ctx.fillStyle = '#4cff9a'; ctx.shadowColor = '#4cff9a'; ctx.shadowBlur = 10; ctx.fillRect(px + 14, py + 14, 20, 4); ctx.shadowBlur = 0; }
  }
  function keyTile() {
    const px = S.keyPos.x * T + T / 2, py = S.keyPos.y * T + T / 2 + Math.sin(S.t * 3) * 3;
    ctx.fillStyle = '#ffd23f'; ctx.shadowColor = '#ffb800'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(px, py - 8, 7, 0, 7); ctx.fill(); ctx.fillRect(px - 2, py - 3, 4, 18); ctx.fillRect(px, py + 8, 7, 3); ctx.fillRect(px, py + 3, 5, 3);
    ctx.shadowBlur = 0; ctx.fillStyle = '#7a5a10'; ctx.beginPath(); ctx.arc(px, py - 8, 3, 0, 7); ctx.fill();
  }
  function swLab(s) {
    const px = s.x * T + 9, py = s.y * T + 9;
    ctx.fillStyle = '#0d1522'; ctx.fillRect(px - 2, py - 2, 34, 34);
    ctx.fillStyle = s.color; ctx.globalAlpha = s.on ? 1 : .45;
    if (s.on) { ctx.shadowColor = s.color; ctx.shadowBlur = 16; }
    ctx.fillRect(px, py, 30, 30); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff'; ctx.font = '700 ' + (s.id.length > 1 ? 10 : 16) + 'px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.id, px + 15, py + 20);
    if (s.latch) { ctx.strokeStyle = '#ffd23f'; ctx.strokeRect(px - 3, py - 3, 36, 36); }
  }
  function gateLab(g) {
    const px = g.x * T, py = g.y * T;
    if (g.open) { ctx.strokeStyle = 'rgba(76,255,154,.5)'; ctx.setLineDash([4, 4]); ctx.strokeRect(px + 3, py + 3, T - 6, T - 6); ctx.setLineDash([]); return; }
    ctx.fillStyle = '#3a1218'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    ctx.fillStyle = '#ff5a5a'; ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 10;
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 5, py + 8 + i * 13, T - 10, 6);
    ctx.shadowBlur = 0;
  }
  function recvLab(r) {
    const cx = r.x * T + T / 2, cy = r.y * T + T / 2, hit = S.hits.has(r.id);
    ctx.fillStyle = '#0d1522'; ctx.fillRect(r.x * T + 4, r.y * T + 4, T - 8, T - 8);
    ctx.strokeStyle = COL[r.color]; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = hit ? '#fff' : '#223'; if (hit) { ctx.shadowColor = COL[r.color]; ctx.shadowBlur = 18; }
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function emitLab(e) {
    const cx = e.x * T + T / 2, cy = e.y * T + T / 2, c = COL[e.color], [dx, dy] = DIR[e.dir];
    ctx.fillStyle = '#0d1522'; ctx.fillRect(e.x * T + 4, e.y * T + 4, T - 8, T - 8);
    ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill();
    ctx.fillRect(cx + dx * 14 - 3, cy + dy * 14 - 3, 6, 6); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
  }
  function mirrorLab(m) {
    const px = m.x * T, py = m.y * T;
    ctx.fillStyle = S.flash > 0 ? '#3c566e' : '#2a3648'; ctx.fillRect(px + 4, py + 4, T - 8, T - 8);
    ctx.strokeStyle = '#6a7d94'; ctx.strokeRect(px + 4.5, py + 4.5, T - 9, T - 9);
    ctx.lineCap = 'round'; ctx.beginPath();
    if (m.type === '/') { ctx.moveTo(px + 11, py + T - 11); ctx.lineTo(px + T - 11, py + 11); }
    else { ctx.moveTo(px + 11, py + 11); ctx.lineTo(px + T - 11, py + T - 11); }
    ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  }

  function swTile(s) { steam() ? swSteam(s) : crypt() ? swCrypt(s) : swLab(s); }
  function gateTile(g) { steam() ? gateSteam(g) : crypt() ? gateCrypt(g) : matrix() ? gateMatrix(g) : gateLab(g); }
  function recvTile(r) { steam() ? recvSteam(r) : crypt() ? recvCrypt(r) : recvLab(r); }
  function emitTile(e) { steam() ? emitSteam(e) : crypt() ? emitCrypt(e) : emitLab(e); }
  function mirrorTile(m) { steam() ? mirrorSteam(m) : crypt() ? mirrorCrypt(m) : mirrorLab(m); }

  // ---------- Skin Steampunk ----------
  function puffs(pts) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) * T / 16);
      for (let k = 0; k < n; k++) {
        const f = k / n, r = 6 + 3 * Math.sin(S.t * 5 + k + i);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath();
        ctx.arc((a.x + (b.x - a.x) * f) * T, (a.y + (b.y - a.y) * f) * T, r, 0, 7); ctx.fill();
      }
    }
  }
  function gearShape(cx, cy, r, rot, col) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.fillStyle = col;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -r - 4, 8, 9); }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2a12'; ctx.beginPath(); ctx.arc(0, 0, r * .45, 0, 7); ctx.fill(); ctx.restore();
  }
  function mirrorSteam(m) {
    const tgt = m.type === '/' ? -45 : 45;
    if (m.vis === undefined) m.vis = tgt; m.vis += (tgt - m.vis) * .3;
    const cx = m.x * T + T / 2, cy = m.y * T + T / 2, a = m.vis * Math.PI / 180;
    ctx.fillStyle = '#2a2118'; ctx.fillRect(m.x * T + 3, m.y * T + 3, T - 6, T - 6);
    gearShape(cx, cy, 13, a * 1.5, '#b8862f');
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(17, 0); ctx.stroke();
    ctx.fillStyle = '#7a5a10'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 1;
  }
  function emitSteam(e) {
    const cx = e.x * T + T / 2, cy = e.y * T + T / 2, [dx, dy] = DIR[e.dir], c = e.color === 'steam' ? '#d63a2e' : '#e0a82e';
    ctx.fillStyle = '#2a2118'; ctx.fillRect(e.x * T + 4, e.y * T + 4, T - 8, T - 8);
    ctx.fillStyle = '#8a929b'; ctx.fillRect(cx - 5 + dx * 10, cy - 5 + dy * 10, 10, 10);
    ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 11, 0, 7); ctx.moveTo(cx - 11, cy); ctx.lineTo(cx + 11, cy); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy + 11); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1;
  }
  function recvSteam(r) {
    const cx = r.x * T + T / 2, cy = r.y * T + T / 2, hit = S.hits.has(r.id);
    ctx.fillStyle = '#2a2118'; ctx.fillRect(r.x * T + 4, r.y * T + 4, T - 8, T - 8);
    ctx.strokeStyle = '#c8962e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 7); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = hit ? '#ffd23f' : '#3a2a12'; if (hit) { ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 18; }
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  }
  function swSteam(s) {
    const px = s.x * T, py = s.y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#2a2118'; ctx.fillRect(px + 7, py + 7, T - 14, T - 14);
    ctx.strokeStyle = s.latch ? '#ffd23f' : '#7a5a28'; ctx.strokeRect(px + 7.5, py + 7.5, T - 15, T - 15);
    if (s.kind === 'lever') {
      ctx.save(); ctx.translate(cx, cy + 8); ctx.rotate((s.on ? 35 : -35) * Math.PI / 180);
      ctx.strokeStyle = '#cfd5dc'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -19); ctx.stroke();
      ctx.fillStyle = s.on ? '#4cff9a' : '#e5484d'; ctx.beginPath(); ctx.arc(0, -20, 5, 0, 7); ctx.fill(); ctx.restore(); ctx.lineWidth = 1;
    } else {
      ctx.fillStyle = s.color; ctx.globalAlpha = s.on ? 1 : .45; if (s.on) { ctx.shadowColor = s.color; ctx.shadowBlur = 14; }
      ctx.fillRect(px + 12, py + 12, T - 24, T - 24); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#fff'; ctx.font = '700 11px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.id, cx, py + T - 9);
  }
  function gateSteam(g) {
    const px = g.x * T, py = g.y * T;
    if (g.open) { ctx.strokeStyle = 'rgba(255,179,71,.5)'; ctx.setLineDash([4, 4]); ctx.strokeRect(px + 3, py + 3, T - 6, T - 6); ctx.setLineDash([]); return; }
    ctx.fillStyle = '#2a2118'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#8a929b'; ctx.fillRect(px + 3, py + 7 + i * 13, T - 6, 8);
      ctx.fillStyle = '#c5ccd3'; ctx.fillRect(px + 3, py + 7 + i * 13, T - 6, 3);
    }
    ctx.strokeStyle = '#ff5a3a'; ctx.shadowColor = '#ff3a20'; ctx.shadowBlur = 8; ctx.strokeRect(px + 2.5, py + 2.5, T - 5, T - 5); ctx.shadowBlur = 0;
  }

  // ---------- Skin Katakombe ----------
  function flame(cx, cy, c, size) {
    ctx.save(); ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 18;
    const w = Math.sin(S.t * 8 + cx) * 2;
    ctx.beginPath(); ctx.moveTo(cx - size, cy); ctx.quadraticCurveTo(cx - size * .6 + w, cy - size * 1.3, cx + w, cy - size * 1.9);
    ctx.quadraticCurveTo(cx + size * .6 + w, cy - size * 1.3, cx + size, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(cx, cy - size * .5, size * .3, size * .6, 0, 0, 7); ctx.fill(); ctx.restore();
  }
  function bowl(cx, cy) {
    ctx.fillStyle = '#4a4e57'; ctx.beginPath(); ctx.moveTo(cx - 15, cy - 2); ctx.lineTo(cx + 15, cy - 2); ctx.lineTo(cx + 9, cy + 14); ctx.lineTo(cx - 9, cy + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a6f7a'; ctx.fillRect(cx - 15, cy - 4, 30, 4);
  }
  function emitCrypt(e) {
    const cx = e.x * T + T / 2, cy = e.y * T + T / 2 + 4, c = COL[e.color], [dx, dy] = DIR[e.dir];
    ctx.fillStyle = '#1a1c21'; ctx.fillRect(e.x * T + 4, e.y * T + 4, T - 8, T - 8);
    const gl = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46); gl.addColorStop(0, c + '55'); gl.addColorStop(1, c + '00');
    ctx.fillStyle = gl; ctx.fillRect(cx - 46, cy - 46, 92, 92);
    bowl(cx, cy); flame(cx, cy - 2, c, 10);
    ctx.fillStyle = c; ctx.fillRect(cx + dx * 18 - 3, cy - 8 + dy * 18 - 3, 6, 6);
  }
  function recvCrypt(r) {
    const cx = r.x * T + T / 2, cy = r.y * T + T / 2 + 4, hit = S.hits.has(r.id);
    ctx.fillStyle = '#1a1c21'; ctx.fillRect(r.x * T + 4, r.y * T + 4, T - 8, T - 8);
    bowl(cx, cy);
    if (hit) flame(cx, cy - 2, COL[r.color], 10);
    else { ctx.strokeStyle = COL[r.color]; ctx.globalAlpha = .5; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy - 8, 8, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1; }
  }
  function mirrorCrypt(m) {
    const tgt = m.type === '/' ? -45 : 45;
    if (m.vis === undefined) m.vis = tgt; m.vis += (tgt - m.vis) * .3;
    const px = m.x * T, py = m.y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#1a1c21'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.fillStyle = '#2b2e35'; ctx.beginPath(); ctx.moveTo(px + 6, py + 12); ctx.lineTo(px + 15, py + 32); ctx.lineTo(px + 7, py + 36); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + T - 6, py + 12); ctx.lineTo(px + T - 15, py + 32); ctx.lineTo(px + T - 7, py + T - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#50545d'; ctx.fillRect(px + 8, py + T - 14, T - 16, 8);
    ctx.save(); ctx.translate(cx, cy - 2); ctx.rotate(m.vis * Math.PI / 180);
    ctx.fillStyle = S.flash > 0 ? 'rgba(230,250,255,.95)' : 'rgba(170,220,255,.85)';
    ctx.shadowColor = '#9fe0ff'; ctx.shadowBlur = 10; ctx.fillRect(-18, -5, 36, 10);
    ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(-18, -5, 36, 10); ctx.restore(); ctx.lineWidth = 1;
  }
  function swCrypt(s) {
    const px = s.x * T, py = s.y * T, cx = px + T / 2, cy = py + T / 2;
    ctx.fillStyle = '#1a1c21'; ctx.fillRect(px + 5, py + 5, T - 10, T - 10);
    ctx.fillStyle = '#3b3f48'; ctx.fillRect(px + 8, py + 8, T - 16, T - 16);
    ctx.strokeStyle = s.latch ? '#ffd23f' : '#5a5f6b'; ctx.strokeRect(px + 8.5, py + 8.5, T - 17, T - 17);
    ctx.save(); ctx.globalAlpha = s.on ? 1 : .4; ctx.fillStyle = s.color; if (s.on) { ctx.shadowColor = s.color; ctx.shadowBlur = 16; }
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 10, cy); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx - 10, cy); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px Rajdhani, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s.id, cx, py + T - 9);
  }
  function gateCrypt(g) {
    const px = g.x * T, py = g.y * T;
    if (g.open) { ctx.strokeStyle = 'rgba(160,200,255,.45)'; ctx.setLineDash([4, 4]); ctx.strokeRect(px + 3, py + 3, T - 6, T - 6); ctx.setLineDash([]); return; }
    ctx.fillStyle = '#15171b'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    ctx.fillStyle = '#6b7079';
    for (let i = 0; i < 5; i++) ctx.fillRect(px + 6 + i * 9, py + 3, 4, T - 6);
    ctx.fillStyle = '#8a909a'; ctx.fillRect(px + 3, py + 8, T - 6, 4); ctx.fillRect(px + 3, py + T - 12, T - 6, 4);
    ctx.strokeStyle = '#c77dff'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8; ctx.strokeRect(px + 2.5, py + 2.5, T - 5, T - 5); ctx.shadowBlur = 0;
  }

  // ---------- Dekorasi tambahan tema Katakombe ----------
  function floorDeco() {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (S.walls.has(key(x, y))) continue;
      const h = (x * 7 + y * 13 + x * y * 3) % 17, px = x * T, py = y * T;
      if (h === 0 || h === 5) { ctx.strokeStyle = '#1b1d22'; ctx.beginPath(); ctx.moveTo(px + 8, py + 10); ctx.lineTo(px + 22, py + 22); ctx.lineTo(px + 20, py + 38); ctx.stroke(); }
      if (h === 3) { ctx.fillStyle = '#1b1d22'; ctx.fillRect(px + 10, py + 10, 28, 28); ctx.fillStyle = '#3a3e46'; for (let i = 0; i < 4; i++) ctx.fillRect(px + 13 + i * 7, py + 10, 3, 28); }
      if (h === 8) { ctx.fillStyle = 'rgba(70,100,60,.45)'; ctx.beginPath(); ctx.ellipse(px + 14, py + 36, 12, 5, 0, 0, 7); ctx.fill(); }
    }
  }
  function vignette() {
    const g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * .35, cv.width / 2, cv.height / 2, cv.height * .85);
    g.addColorStop(0, 'rgba(5,6,10,0)'); g.addColorStop(1, 'rgba(5,6,10,.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  function doorCrypt() {
    const px = S.door.x * T, py = S.door.y * T;
    ctx.fillStyle = '#3a3e46'; ctx.fillRect(px, py, T, T);
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(px + 5, py + 5, T - 10, T - 5);
    ctx.strokeStyle = '#3d2a14'; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(px + 5 + i * 9.5, py + 5); ctx.lineTo(px + 5 + i * 9.5, py + T); ctx.stroke(); }
    ctx.fillStyle = '#23252a'; ctx.fillRect(px + 5, py + 14, T - 10, 4); ctx.fillRect(px + 5, py + 34, T - 10, 4);
    if (!S.hasKey) {
      ctx.fillStyle = '#f2b632'; ctx.fillRect(px + 17, py + 21, 14, 12);
      ctx.strokeStyle = '#f2b632'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px + 24, py + 21, 6, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 1;
      plate('Butuh Kunci', px + T / 2, py - 8);
    } else { ctx.fillStyle = 'rgba(76,255,154,.55)'; ctx.shadowColor = '#4cff9a'; ctx.shadowBlur = 12; ctx.fillRect(px + 8, py + 8, T - 16, T - 8); ctx.shadowBlur = 0; }
  }
  function zapBeam(b) {
    const col = COL[b.color], P = [];
    for (let i = 1; i < b.pts.length; i++) {
      const a = b.pts[i - 1], c = b.pts[i], len = Math.hypot(c.x - a.x, c.y - a.y) * T, n = Math.max(1, Math.floor(len / 12));
      const nx = -(c.y - a.y) / (len / T || 1), ny = (c.x - a.x) / (len / T || 1);
      for (let k = (i === 1 ? 0 : 1); k <= n; k++) {
        const f = k / n, edge = (i === 1 && k === 0) || (i === b.pts.length - 1 && k === n);
        const j = edge ? 0 : Math.sin(S.t * 28 + k * 1.9 + i * 2.3) * 2.6;
        P.push([(a.x + (c.x - a.x) * f + nx * j / T) * T, (a.y + (c.y - a.y) * f + ny * j / T) * T]);
      }
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineWidth = 6; ctx.globalAlpha = .75; ctx.stroke();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.lineWidth = 1;
  }

  // ---------- Skin Server Matrix + Gerbang Logic ----------
  function gateMatrix(g) {
    const px = g.x * T, py = g.y * T;
    if (g.open) { ctx.strokeStyle = 'rgba(34,211,238,.55)'; ctx.setLineDash([4, 4]); ctx.strokeRect(px + 3, py + 3, T - 6, T - 6); ctx.setLineDash([]); return; }
    ctx.fillStyle = '#2a0f14'; ctx.fillRect(px + 2, py + 2, T - 4, T - 4);
    ctx.strokeStyle = '#ff4a4a'; ctx.shadowColor = '#ff3030'; ctx.shadowBlur = 8;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(px + 4 + i * 10, py + 3); ctx.lineTo(px + 4 + i * 10, py + T - 3); ctx.moveTo(px + 3, py + 4 + i * 10); ctx.lineTo(px + T - 3, py + 4 + i * 10); ctx.stroke(); }
    ctx.shadowBlur = 0;
  }
  function logicTile(l) {
    const px = l.x * T, py = l.y * T, c = l.or ? '#4ade80' : '#22d3ee';
    ctx.fillStyle = '#0d1522'; ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
    ctx.fillStyle = S.flash > 0 ? '#27425e' : '#16273a'; ctx.fillRect(px + 7, py + 9, T - 14, T - 18);
    ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.strokeRect(px + 7, py + 9, T - 14, T - 18);
    ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.fillStyle = c; ctx.font = '700 13px Rajdhani, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(l.or ? 'OR' : 'AND', px + T / 2, py + T / 2 + 5);
    ctx.fillRect(px + 3, py + 17, 6, 3); ctx.fillRect(px + 3, py + 29, 6, 3); ctx.fillRect(px + T - 9, py + 23, 6, 3);
  }

  function player() {
    const x = S.px * T + (T - spr.width) / 2, y = S.py * T + T - spr.height - 3;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(S.px * T + T / 2, S.py * T + T - 4, 14, 5, 0, 0, 7); ctx.fill();
    if (crypt()) { const gx = S.px * T + T / 2, gy = S.py * T + T / 2, g = ctx.createRadialGradient(gx, gy, 4, gx, gy, 70);
      g.addColorStop(0, 'rgba(255,200,110,.28)'); g.addColorStop(1, 'rgba(255,200,110,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 70, gy - 70, 140, 140); }
    if (S.dead > 0 && Math.floor(S.t * 20) % 2) ctx.globalAlpha = .3;
    ctx.drawImage(spr, x, y); ctx.globalAlpha = 1;
  }
  function labels() {
    const t = target(); if (!t) return;
    const text = t.kind === 'mirror' ? '[E] ' + ((L.labels && L.labels.mirror) || 'Putar Cermin') : t.kind === 'logic' ? '[E] Alihkan Gerbang Logic' : '[E] Aktifkan ' + (t.o.label || 'Switch') + ' ' + t.o.id;
    plate(text, S.px * T + T / 2, S.py * T - 14);
  }
  function plate(text, cx, cy) {
    ctx.font = '700 12px Rajdhani, sans-serif'; ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 14, x = Math.max(2, Math.min(cv.width - w - 2, cx - w / 2)), y = Math.max(2, cy - 10);
    ctx.fillStyle = 'rgba(11,22,38,.92)'; ctx.fillRect(x, y, w, 20);
    ctx.strokeStyle = '#3a6a8a'; ctx.strokeRect(x + .5, y + .5, w - 1, 19);
    ctx.fillStyle = '#e6f6ff'; ctx.fillText(text, x + w / 2, y + 14);
  }

  return { start, stop, act, _state: () => S, _render: () => render() };
})();
