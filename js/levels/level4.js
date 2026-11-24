// ============================================================
// LEVEL 4 - Roda Gigi Pertama   (tema: Steampunk)
// Uap putih = MEMATIKAN. Semburan emas = aman & menggerakkan piston.
// Putar dua roda gigi agar semburan emas mengenai piston (penerima).
// Tips: berdiri di sebelah uap, tekan arah ke uap (karakter hanya menghadap),
// lalu tekan SPACE (Dash) untuk menyeberang.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'steam',
  name: 'Roda Gigi Pertama',
  desc: 'Putar dua roda gigi, hindari uap panas.',
  hint: 'Uap putih mematikan! Putar roda gigi [E] agar semburan emas mengenai piston.',
  footer: 'Pecahkan saling-kunci roda gigi & uap!',
  action: 'Putar Roda Gigi / Aktifkan Lever',
  labels: { mirror: 'Putar Roda Gigi' },
  deadlockMsg: 'DEADLOCK DETECTED! Putar Roda Gigi / Seimbangkan Tekanan (tekan R)',
  map: [
    "################",
    "#..............#",
    "#.P..........K.#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######.########",   // (7,8) = gerbang pipa
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 1,  y: 6, dir: 'right', color: 'gold'  },   // katup emas
    { x: 14, y: 5, dir: 'left',  color: 'steam' }    // semburan uap (mematikan)
  ],
  mirrors: [                                           // roda gigi
    { x: 5, y: 6, type: '\\' },
    { x: 5, y: 3, type: '\\' }
  ],
  receivers: [{ id: 'r1', x: 11, y: 3, color: 'gold' }],
  switches:  [],
  gates:     [{ x: 7, y: 8, need: [{ rc: 'r1' }] }]
});
