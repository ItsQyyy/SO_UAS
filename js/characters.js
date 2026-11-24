// Data karakter (sprite pixel) -- dipakai beranda & gameplay
const CHARS = [
  {
    id: 'astro', name: 'ASTRONAUT', label: 'Astronot', theme: 'Sci-Fi',
    pal: { W:'#eef2ff', G:'#a9b4d6', V:'#0b0b16', P:'#b84fd0', D:'#6a2a86' },
    map: [
      "....WWWW....","...WWWWWW...","..WWVVVVWW..",".WWVVVVVVWW.",
      ".WWVVVVVVWW.","..WWVVVVWW..","...WWWWWW...","..GWWPPWWG..",
      ".GGWWPPWWGG.",".WW.WPPW.WW.","....WWWW....","...PP..PP...",
      "...PP..PP...","..PPP..PPP.."
    ]
  },
  {
    id: 'adv', name: 'ADVENTURER', label: 'Petualang', theme: 'Alam',
    pal: { H:'#d9d2d8', R:'#e0707a', K:'#0b0b16', C:'#a8445a', B:'#7a5a3a', E:'#ffffff' },
    map: [
      "R..........R",".R...HH...R.","..R.HHHH.R..","...HHHHHHH..",
      "..HHKKKKHH..","..HKKEKEKH..","..HKKKKKKH..","...HHKKHH...",
      "..CCBBBBCC..",".CCCBBBBCCC.",".CC.BBBB.CC.","....BBBB....",
      "...BB..BB...","...BB..BB..."
    ]
  }
];

// Gambar sprite ke canvas dengan skala s
function draw(cv, ch, s) {
  const m = ch.map, w = m[0].length, h = m.length;
  cv.width = w * s;
  cv.height = h * s;
  const x = cv.getContext('2d');
  m.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '.') { x.fillStyle = ch.pal[c]; x.fillRect(i * s, j * s, s, s); }
  }));
}
