// ============================================================
// LEVEL 6 - Tekanan Seimbang   (tema: Steampunk)  -- level tersulit
// Dua roda gigi harus berurutan agar piston r1 aktif:
//   semburan emas -> roda gigi (4,4) -> roda gigi (4,2) -> piston (7,2)
//   Gerbang X (8,3)    : terbuka jika Lever A ON dan Switch B OFF
//   Gerbang Y (8,6)    : terbuka jika Switch B ON dan piston r1 MATI
//   Gerbang pintu(7,8) : terbuka jika Switch B ON, piston r1 AKTIF, Lever A OFF
// Tiang uap di kolom 6 memisahkan area; seberangi dengan DASH.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'steam',
  name: 'Tekanan Seimbang',
  desc: 'Dua roda gigi, tiang uap, tiga gerbang saling kunci.',
  hint: 'Level tersulit: atur tekanan dengan urutan yang benar, atau DEADLOCK!',
  footer: 'Pecahkan saling-kunci roda gigi & uap!',
  action: 'Putar Roda Gigi / Aktifkan Lever',
  labels: { mirror: 'Putar Roda Gigi' },
  deadlockMsg: 'DEADLOCK DETECTED! Putar Roda Gigi / Seimbangkan Tekanan (tekan R)',
  map: [
    "################",
    "#.......#......#",
    "#.P.....#....K.#",
    "#..............#",   // (8,3) = gerbang X
    "#.......#......#",
    "#.......#......#",
    "#..............#",   // (8,6) = gerbang Y
    "#.......#......#",
    "#######.########",   // (7,8) = gerbang pintu
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 1, y: 4, dir: 'right', color: 'gold'  },
    { x: 6, y: 1, dir: 'down',  color: 'steam' }
  ],
  mirrors: [
    { x: 4, y: 4, type: '\\' },
    { x: 4, y: 2, type: '\\' }
  ],
  receivers: [{ id: 'r1', x: 7, y: 2, color: 'gold' }],
  switches: [
    { id: 'A', x: 2,  y: 6, latch: false, kind: 'lever', label: 'Lever',  color: '#e8a33d' },
    { id: 'B', x: 13, y: 6, latch: true,  kind: 'pad',   label: 'Switch', color: '#e5484d' }
  ],
  gates: [
    { x: 8, y: 3, need: [{ sw: 'A', on: true }, { sw: 'B', on: false }] },
    { x: 8, y: 6, need: [{ sw: 'B', on: true }, { rc: 'r1', on: false }] },
    { x: 7, y: 8, need: [{ sw: 'B', on: true }, { rc: 'r1' }, { sw: 'A', on: false }] }
  ]
});
