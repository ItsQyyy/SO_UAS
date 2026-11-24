// ============================================================
// LEVEL 1 - Cermin Pertama
// Simbol peta:  # dinding | . lantai | P awal pemain | K kunci | D pintu
// Konsep: putar cermin supaya laser biru mengenai penerima -> gerbang terbuka
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  name: 'Cermin Pertama',
  desc: 'Putar cermin, arahkan laser biru ke penerima.',
  hint: 'Putar cermin [E] agar laser biru mengenai penerima, ambil kunci, lalu menuju pintu.',
  map: [
    "################",
    "#..............#",
    "#.P..........K.#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######.########",   // (7,8) = gerbang
    "#..............#",
    "#######D########"
  ],
  emitters:  [{ x: 1, y: 5, dir: 'right', color: 'blue' }],
  mirrors:   [{ x: 6, y: 5, type: '\\' }],
  receivers: [{ id: 'r1', x: 6, y: 1, color: 'blue' }],
  switches:  [],
  gates:     [{ x: 7, y: 8, need: [{ rc: 'r1' }] }]
});
