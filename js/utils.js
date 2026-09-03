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
  // Interpolation de couleurs hex "#rrggbb"
  mixColor(c1, c2, t) {
    const p = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const [r1, g1, b1] = p(c1), [r2, g2, b2] = p(c2);
    const r = Math.round(U.lerp(r1, r2, t)), g = Math.round(U.lerp(g1, g2, t)), b = Math.round(U.lerp(b1, b2, t));
    return `rgb(${r},${g},${b})`;
  },
};
