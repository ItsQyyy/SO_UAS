// ============================================================
// BERANDA + PILIH LEVEL + penghubung ke gameplay
// ============================================================
(function () {
  const $ = s => document.querySelector(s);
  const screens = { menu: $('#screen-menu'), levels: $('#screen-levels'), game: $('#screen-game') };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  let cur = 'menu', sel = store.get('ed_char', 0) % CHARS.length, mi = 0;
  let done = store.get('ed_done', []);

  function show(n) {
    cur = n;
    Object.entries(screens).forEach(([k, e]) => e.classList.toggle('hidden', k !== n));
  }

  // ----- Notifikasi -----
  function toast(t) {
    const e = $('#toast'); e.textContent = t; e.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 2200);
  }

  // ----- Sprite dekorasi & kartu karakter -----
  draw($('#c1'), CHARS[0], 8); draw($('#c2'), CHARS[1], 8);
  const cards = $('#cards');
  CHARS.forEach((c, i) => {
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<span class="r">${c.name}</span><canvas></canvas><b>${c.label}</b><small>Tema: ${c.theme}</small>`;
    draw(d.querySelector('canvas'), c, 4);
    d.onclick = () => { sel = i; store.set('ed_char', sel); render(); };
    cards.appendChild(d);
  });
  const btns = [...document.querySelectorAll('#menu button')];
  function render() {
    [...cards.children].forEach((d, i) => d.classList.toggle('sel', i === sel));
    btns.forEach((b, i) => b.classList.toggle('on', i === mi));
  }
  const step = d => { sel = (sel + d + CHARS.length) % CHARS.length; store.set('ed_char', sel); render(); };
  $('#prev').onclick = () => step(-1); $('#next').onclick = () => step(1);

  // ----- Aksi menu utama -----
  function act(a) {
    ({
      start: () => startLevel(0),
      level: () => { renderLevels(); show('levels'); },
      set:   () => toast('Pengaturan belum tersedia.'),
      exit:  () => toast('Terima kasih sudah bermain!')
    })[a]();
  }
  btns.forEach((b, i) => { b.onmouseenter = () => { mi = i; render(); }; b.onclick = () => act(b.dataset.a); });

  // ----- Pilih level -----
  function renderLevels() {
    const box = $('#level-list'); box.innerHTML = '';
    LEVELS.forEach((L, i) => {
      const b = document.createElement('button'); b.className = 'lv-card';
      b.innerHTML = `<span class="lv-n">LEVEL ${i + 1}${done.includes(i) ? ' ✔' : ''}</span><b>${L.name}</b><small>${L.desc}</small>`;
      b.onclick = () => startLevel(i); box.appendChild(b);
    });
  }
  $('#lv-back').onclick = () => show('menu');

  // ----- Banner & overlay gameplay -----
  let bt;
  function banner(text, kind, ms) {
    const b = $('#banner'); clearTimeout(bt);
    b.textContent = text; b.className = 'banner ' + kind;
    if (ms > 0) bt = setTimeout(() => { b.textContent = ''; }, ms);
  }
  function overlay(title, text, buttons) {
    $('#ov-title').textContent = title; $('#ov-text').textContent = text;
    const box = $('#ov-btns'); box.innerHTML = '';
    buttons.forEach(([label, fn]) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; box.appendChild(b); });
    $('#overlay').classList.remove('hidden');
  }
  const hideOverlay = () => $('#overlay').classList.add('hidden');
  const toLevels = () => { Game.stop(); hideOverlay(); renderLevels(); show('levels'); };
  const toHome = () => { Game.stop(); hideOverlay(); show('menu'); };

  function startLevel(i) {
    show('game'); hideOverlay(); banner('', 'info', 0);
    Game.start(i, CHARS[sel], {
      onMsg: banner,
      onLevel: (name, l) => {
        $('#gbar-text').innerHTML = (l.footer || 'Pecahkan saling-kunci gerbang!') +
          ' <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Gerak • <kbd>SPACE</kbd> Dash • <kbd>E</kbd> ' +
          (l.action || 'Putar Cermin / Aktifkan Switch') + ' • <kbd>R</kbd> Reset';
      },
      onDash: cd => { $('#dash').textContent = cd > 0 ? 'DASH ' + cd.toFixed(1) + 's' : 'DASH SIAP'; },
      onPause: p => {
        if (!p) return hideOverlay();
        overlay('PAUSE', '', [
          ['Lanjut', () => Game.act('pause')],
          ['Ulangi', () => { hideOverlay(); Game.act('reset'); }],
          ['Pilih Level', toLevels], ['Beranda', toHome]
        ]);
      },
      onWin: n => {
        if (!done.includes(n)) { done.push(n); store.set('ed_done', done); }
        const last = n === LEVELS.length - 1, bt = [];
        if (!last) bt.push(['Level Berikutnya', () => startLevel(n + 1)]);
        bt.push(['Ulangi', () => startLevel(n)], ['Pilih Level', toLevels], ['Beranda', toHome]);
        overlay(last ? 'SEMUA LEVEL SELESAI!' : 'LEVEL SELESAI!', 'Kamu berhasil keluar dari deadlock.', bt);
      }
    });
  }
  $('#btn-menu').onclick = () => Game.act('pause');

  // ----- Keyboard beranda -----
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (cur === 'menu') {
      if (k === 'a' || k === 'arrowleft') step(-1);
      else if (k === 'd' || k === 'arrowright') step(1);
      else if (k === 'arrowup' || k === 'w') { mi = (mi + 3) % 4; render(); }
      else if (k === 'arrowdown' || k === 's') { mi = (mi + 1) % 4; render(); }
      else if (k === 'enter') act(btns[mi].dataset.a);
    } else if (cur === 'levels') {
      if (k === 'escape') show('menu');
      else if (/^[1-9]$/.test(k) && LEVELS[+k - 1]) startLevel(+k - 1);
    }
  });
  render();

  // ----- Animasi bintang -----
  const cv = $('#stars'), g = cv.getContext('2d'); let S = [];
  function resizeStars() {
    cv.width = innerWidth; cv.height = innerHeight;
    S = Array.from({ length: Math.floor(innerWidth * innerHeight / 6000) }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height * .7, r: Math.random() < .15 ? 3 : 2, p: Math.random() * 6 }));
  }
  resizeStars(); addEventListener('resize', resizeStars);
  (function loop(t) {
    if (cur !== 'game') {
      g.clearRect(0, 0, cv.width, cv.height);
      S.forEach(s => { g.globalAlpha = .4 + .6 * Math.abs(Math.sin(t / 900 + s.p)); g.fillStyle = '#fff'; g.fillRect(s.x, s.y, s.r, s.r); });
    }
    requestAnimationFrame(loop);
  })(0);
})();
