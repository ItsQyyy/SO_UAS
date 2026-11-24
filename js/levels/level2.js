// ============================================================
// LEVEL 2 - Laser Merah
// Laser merah mematikan! Lewati dengan DASH, putar cermin untuk
// memindahkan jalur laser, lalu nyalakan Switch A untuk membuka gerbang.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  name: 'Laser Merah',
  desc: 'Hindari laser merah, manfaatkan DASH.',
  hint: 'Laser merah mematikan! Gunakan [SPACE] Dash untuk melewati garis laser.',
  map: [
    "################",
    "#.P............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#............K.#",
    "#..............#",
    "#######.########",   // (7,8) = gerbang
    "#..............#",
    "#######D########"
  ],
  emitters:  [{ x: 1, y: 4, dir: 'right', color: 'red' }],
  mirrors:   [{ x: 8, y: 4, type: '/' }],
  receivers: [],
  switches:  [{ id: 'A', x: 3, y: 6, latch: false, color: '#3b82f6' }],
  gates:     [{ x: 7, y: 8, need: [{ sw: 'A', on: true }] }]
});
