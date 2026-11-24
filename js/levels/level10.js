// ============================================================
// LEVEL 10 - Quantum Server Matrix   (LEVEL TERAKHIR, tema: Server)
// Mekanik baru: GERBANG LOGIC (AND / OR) dan GERBANG YANG MENAHAN DIRINYA SENDIRI.
//
//   Gerbang G2 (8,4) = LOGIC( api r1 , Switch RED )
//       r1 hanya menyala jika sinyal biru LEWAT G2 -> G2 dan r1 saling menunggu
//       (circular wait = DEADLOCK). Dalam mode AND gerbang tidak akan pernah terbuka.
//       Dalam mode OR, Switch RED "menyalakan" sinyal pertama, lalu r1 menahan G2
//       tetap terbuka walau RED dimatikan.
//   Switch RED menyalakan dua dinding laser merah (kolom 5 dan 6) yang tidak
//   bisa di-Dash. Jadi RED WAJIB dimatikan sebelum menyeberang.
//   Switch CYAN (permanen) membuka pintu, tetapi menutup gerbang G3 sehingga
//   sinyal biru terputus -> r1 mati -> G2 menutup lagi.
//   Urutan yang benar harus ditemukan. Salah urutan = DEADLOCK sungguhan.
// ============================================================
(window.LEVELS = window.LEVELS || []).push({
  theme: 'matrix',
  name: 'Quantum Server Matrix',
  desc: 'Level terakhir: gerbang logic AND/OR dan sinyal saling menunggu.',
  hint: 'Level terakhir! Urutkan sinyal & gerbang logika. Salah urutan = DEADLOCK sungguhan.',
  footer: 'Pecahkan saling-kunci gerbang logika!',
  action: 'Alihkan Sinyal / Gerbang',
  labels: { mirror: 'Alihkan Sinyal' },
  deadlockMsg: 'DEADLOCK DETECTED! Urutkan Sinyal & Gerbang Logika (tekan R)',
  map: [
    "################",
    "#.......#....K.#",
    "#.P.....#......#",
    "#.......#......#",
    "#..............#",   // (8,4) = gerbang G2 (logic)
    "#.......#......#",
    "#.......#......#",
    "#.......#......#",
    "#######.########",   // (7,8) = gerbang pintu
    "#..............#",
    "#######D########"
  ],
  emitters: [
    { x: 5,  y: 1, dir: 'down', color: 'red'  },   // dinding laser (aktif jika RED ON)
    { x: 6,  y: 1, dir: 'down', color: 'red'  },
    { x: 10, y: 1, dir: 'down', color: 'red'  },   // laser permanen di ruang kanan
    { x: 14, y: 4, dir: 'left', color: 'blue' }    // sumber sinyal
  ],
  mirrors:   [{ x: 4, y: 4, type: '/' }],           // alihkan sinyal ke r1 ('\')
  receivers: [{ id: 'r1', x: 4, y: 2, color: 'blue' }],
  logics:    [{ id: 'L', x: 2, y: 4 }],             // mode AND (awal) / OR
  switches: [
    { id: 'RED',  x: 2, y: 6, latch: false, label: 'Switch', color: '#e5484d' },
    { id: 'CYAN', x: 7, y: 6, latch: true,  label: 'Switch', color: '#22d3ee' }
  ],
  gates: [
    { x: 5,  y: 2, need: [{ sw: 'RED', on: true }] },
    { x: 6,  y: 2, need: [{ sw: 'RED', on: true }] },
    { x: 8,  y: 4, need: [{ logic: 'L', a: { rc: 'r1' }, b: { sw: 'RED', on: true } }] },
    { x: 13, y: 4, need: [{ sw: 'CYAN', on: false }] },
    { x: 7,  y: 8, need: [{ sw: 'CYAN', on: true }] }
  ]
});
