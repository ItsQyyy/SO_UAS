// ============================================================
// LEVEL 8 - Runa A & Runa B   (tema: Katakombe)
// Ruang atas (kunci, Runa B) dan ruang bawah (awal, Runa A, prisma, pintu).
//   Gerbang X (3,4)    : terbuka jika Runa A ON dan Runa B OFF
//   Gerbang Y (11,4)   : terbuka jika Runa B ON dan api r1 MATI
//   Gerbang pintu(7,8) : terbuka jika Runa B ON dan api r1 NYALA
// Jebakan: jika api r1 sudah menyala saat menekan Runa B -> terkunci (DEADLOCK).
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'crypt',
  name: 'Runa A & Runa B',
  desc: 'Dua ruang, tiga gerbang saling kunci.',
  hint: 'Urutan runa menentukan. Salah langkah = DEADLOCK!',
  footer: 'Urai saling-kunci energi runa & gerbang!',
  action: 'Putar Prisma / Aktifkan Runa',
  labels: { mirror: 'Putar Patung Prisma' },
  deadlockMsg: 'DEADLOCK DETECTED! Alihkan Energi Runa / Buka Gerbang Saling-Kunci (tekan R)',
  map: [
    "################",
    "#............K.#",
    "#..............#",
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
    { x: 14, y: 7, dir: 'left',  color: 'blue'   }
  ],
  mirrors:   [{ x: 12, y: 7, type: '/' }],
  receivers: [{ id: 'r1', x: 12, y: 5, color: 'blue' }],
  switches: [
    { id: 'A', x: 2,  y: 7, latch: false, kind: 'rune', label: 'Runa', color: '#c77dff' },
    { id: 'B', x: 13, y: 3, latch: true,  kind: 'rune', label: 'Runa', color: '#4ac8ff' }
  ],
  gates: [
    { x: 3,  y: 4, need: [{ sw: 'A', on: true }, { sw: 'B', on: false }] },
    { x: 11, y: 4, need: [{ sw: 'B', on: true }, { rc: 'r1', on: false }] },
    { x: 7,  y: 8, need: [{ sw: 'B', on: true }, { rc: 'r1' }] }
  ]
});
