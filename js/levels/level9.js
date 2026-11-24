// ============================================================
// LEVEL 9 - Katakombe Terakhir   (tema: Katakombe)  -- level tersulit
// Dua prisma berantai menyalakan api r1:
//   obor biru -> prisma (12,7) -> prisma (12,5) -> api r1 (14,5)
//   Gerbang X (3,4)    : terbuka jika Runa A ON dan Runa B OFF
//   Gerbang Y (11,4)   : terbuka jika Runa B ON dan api r1 MATI
//   Gerbang pintu(7,8) : terbuka jika Runa B ON, api r1 NYALA, Runa A OFF
// Ada tiang energi ungu di ruang atas (kolom 7) dan garis ungu di ruang bawah.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'crypt',
  name: 'Katakombe Terakhir',
  desc: 'Dua prisma berantai, energi ungu, saling-kunci total.',
  hint: 'Level tersulit: urutan runa dan prisma menentukan. Awas DEADLOCK!',
  footer: 'Urai saling-kunci energi runa & gerbang!',
  action: 'Putar Prisma / Aktifkan Runa',
  labels: { mirror: 'Putar Patung Prisma' },
  deadlockMsg: 'DEADLOCK DETECTED! Alihkan Energi Runa / Buka Gerbang Saling-Kunci (tekan R)',
  map: [
    "################",
    "#............K.#",
    "#....#....#....#",
    "#..............#",
    "###.#######.####",   // (3,4) = gerbang X, (11,4) = gerbang Y
    "#.P............#",
    "#..............#",
    "#..............#",
    "#######.########",   // (7,8) = gerbang pintu
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 1,  y: 6, dir: 'right', color: 'purple' },
    { x: 7,  y: 1, dir: 'down',  color: 'purple' },
    { x: 14, y: 7, dir: 'left',  color: 'blue'   }
  ],
  mirrors: [
    { x: 12, y: 7, type: '/'  },
    { x: 12, y: 5, type: '\\' }
  ],
  receivers: [{ id: 'r1', x: 14, y: 5, color: 'blue' }],
  switches: [
    { id: 'A', x: 2,  y: 7, latch: false, kind: 'rune', label: 'Runa', color: '#c77dff' },
    { id: 'B', x: 13, y: 3, latch: true,  kind: 'rune', label: 'Runa', color: '#4ac8ff' }
  ],
  gates: [
    { x: 3,  y: 4, need: [{ sw: 'A', on: true }, { sw: 'B', on: false }] },
    { x: 11, y: 4, need: [{ sw: 'B', on: true }, { rc: 'r1', on: false }] },
    { x: 7,  y: 8, need: [{ sw: 'B', on: true }, { rc: 'r1' }, { sw: 'A', on: false }] }
  ]
});
