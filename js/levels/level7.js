// ============================================================
// LEVEL 7 - Prisma Pertama   (tema: Katakombe)
// Energi UNGU = MEMATIKAN. Energi BIRU = aman & menyalakan api penerima.
// Putar patung prisma agar energi biru mengenai penerima.
// Saat berdiri di depan energi ungu, tekan arah ke sana (karakter hanya
// menghadap, tidak melangkah), lalu tekan SPACE (Dash) untuk menyeberang.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'crypt',
  name: 'Prisma Pertama',
  desc: 'Putar patung prisma, hindari energi ungu.',
  hint: 'Energi ungu mematikan! Hadapi energinya lalu tekan [SPACE] Dash untuk menyeberang.',
  footer: 'Urai saling-kunci energi runa & gerbang!',
  action: 'Putar Prisma / Aktifkan Runa',
  labels: { mirror: 'Putar Patung Prisma' },
  deadlockMsg: 'DEADLOCK DETECTED! Alihkan Energi Runa / Buka Gerbang Saling-Kunci (tekan R)',
  map: [
    "################",
    "#..............#",
    "#.P..........K.#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######.########",   // (7,8) = gerbang jeruji
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 1,  y: 5, dir: 'right', color: 'purple' },  // obor ungu (mematikan)
    { x: 14, y: 7, dir: 'left',  color: 'blue'   }   // obor biru (aman)
  ],
  mirrors:   [{ x: 9, y: 7, type: '/' }],             // patung prisma
  receivers: [{ id: 'r1', x: 9, y: 2, color: 'blue' }],
  switches:  [],
  gates:     [{ x: 7, y: 8, need: [{ rc: 'r1' }] }]
});
