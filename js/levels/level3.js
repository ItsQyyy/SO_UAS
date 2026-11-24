// ============================================================
// LEVEL 3 - Saling Kunci (DEADLOCK)
// Ada dua switch dan dua gerbang yang saling mengunci.
// Switch B bersifat permanen (latch). Salah urutan = terkunci (DEADLOCK)!
//   Gerbang X (9,2): terbuka jika A ON dan B OFF
//   Gerbang Y (9,6): terbuka jika B ON dan penerima r1 aktif
//   Gerbang pintu (7,8): terbuka jika B ON dan penerima r1 aktif
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  name: 'Saling Kunci',
  desc: 'Urutan switch menentukan. Awas DEADLOCK!',
  hint: 'Urutan switch menentukan. Hati-hati, salah langkah = DEADLOCK!',
  map: [
    "################",
    "#........#.....#",
    "#.P..........K.#",   // (9,2) = gerbang X
    "#........#.....#",
    "#........#.....#",
    "#........#.....#",
    "#..............#",   // (9,6) = gerbang Y
    "#........#.....#",
    "#######.########",   // (7,8) = gerbang pintu
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 1, y: 4, dir: 'right', color: 'blue' },
    { x: 5, y: 1, dir: 'down',  color: 'red'  }
  ],
  mirrors:   [{ x: 6, y: 4, type: '\\' }],
  receivers: [{ id: 'r1', x: 6, y: 1, color: 'blue' }],
  switches: [
    { id: 'A', x: 2,  y: 6, latch: false, color: '#3b82f6' },
    { id: 'B', x: 13, y: 6, latch: true,  color: '#e5484d' }
  ],
  gates: [
    { x: 9, y: 2, need: [{ sw: 'A', on: true }, { sw: 'B', on: false }] },
    { x: 9, y: 6, need: [{ sw: 'B', on: true }, { rc: 'r1' }] },
    { x: 7, y: 8, need: [{ sw: 'B', on: true }, { rc: 'r1' }] }
  ]
});
