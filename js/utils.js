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
  // ROTATION DE TEINTE d'une couleur hex. Sert à donner à chaque individu sa
  // nuance sans dupliquer le dessin : le banc de confettis chatoie parce que
  // `Entity.color` tire dans `def.colors`, un dessin fait main n'a lui qu'une
  // seule couleur par forme. Mise en cache : la couleur d'un individu ne change
  // jamais, mais la fonction serait appelée à chaque frame sans ça.
  _teintes: {},
  tourneTeinte(hex, deg, sat = 1, lum = 1) {
    if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex;
    const cle = hex + '|' + Math.round(deg) + '|' + sat + '|' + lum;
    let v = U._teintes[cle];
    if (v) return v;
    const [r0, g0, b0] = U.hexRGB(hex);
    const r = r0 / 255, g = g0 / 255, b = b0 / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    const l = (mx + mn) / 2;
    let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    h = (h + deg) % 360; if (h < 0) h += 360;
    s = U.clamp(s * sat, 0, 1);
    const L = U.clamp(l * lum, 0, 1);
    const c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = L - c / 2;
    const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
            : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    v = `rgb(${Math.round((t[0] + m) * 255)},${Math.round((t[1] + m) * 255)},${Math.round((t[2] + m) * 255)})`;
    return (U._teintes[cle] = v);
  },
  mixColor(c1, c2, t) {
    const a = U.hexRGB(c1), b2 = U.hexRGB(c2);
    const r = Math.round(a[0] + (b2[0] - a[0]) * t),
          g = Math.round(a[1] + (b2[1] - a[1]) * t),
          b = Math.round(a[2] + (b2[2] - a[2]) * t);
    return `rgb(${r},${g},${b})`;
  },
};
