// Petites fonctions utilitaires partagées.
const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(U.rand(a, b + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  dist2: (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  angleLerp(a, b, t) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  },
  // Interpolation de couleurs hex "#rrggbb". Le découpage des chaînes hex est
  // mis en cache : les couleurs sources viennent des palettes, il y en a peu,
  // et mixColor tourne >100 fois par frame dans le décor.
  _hexRGB: {},
  hexRGB(c) {
    let v = U._hexRGB[c];
    if (!v) v = U._hexRGB[c] = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    return v;
  },
  mixColor(c1, c2, t) {
    const a = U.hexRGB(c1), b2 = U.hexRGB(c2);
    const r = Math.round(a[0] + (b2[0] - a[0]) * t),
          g = Math.round(a[1] + (b2[1] - a[1]) * t),
          b = Math.round(a[2] + (b2[2] - a[2]) * t);
    return `rgb(${r},${g},${b})`;
  },
};
