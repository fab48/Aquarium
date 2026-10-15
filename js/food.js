// Nourriture larguée par le joueur + arêtes de poissons morts (charogne).
const Food = {
  items: [],   // { x, y, type, settled }
  bones: [],   // { x, y, age, k, settled, v (variante), dir, s, ph, rot, pente, pied }
  poops: [],   // { x, y, r, age, settled } — caca : ressemble à une graine, rend malade
  selected: 'generic',

  // Un animal bien nourri se soulage. Le caca coule, se pose au fond et se
  // dissout — mais tant qu'il est là, il ressemble assez à de la nourriture
  // pour qu'un poisson affamé s'y trompe (et le regrette).
  poop(x, y, taille = 20) {
    this.poops.push({
      x, y, r: U.clamp(taille * 0.16, 2.5, 7), age: 0, settled: false,
      wob: Math.random() * 10, seed: Math.random() * 100,
    });
  },

  drop(x, y, type = this.selected) {
    const def = FOOD_TYPES[type];
    for (let i = 0; i < 5; i++) {
      this.items.push({
        x: x + U.rand(-18, 18), y: Math.max(y, CONFIG.SURFACE_Y + 4) + U.rand(-6, 6),
        type, settled: false, wob: Math.random() * 10,
      });
    }
  },

  // `taille` : l'échelle de l'arête, 1 = petit poisson. Un gros laissait
  // TROIS petites arêtes identiques à celles d'une sardine, ce qui ne disait
  // rien de ce qui venait de mourir. Une seule, mais à sa mesure.
  //
  // `graine` (facultative) : tout ce qui distingue une arête d'une autre — sa
  // variante de dessin, son sens, son léger écart de taille, sa phase de
  // tournoiement — est TIRÉ DE CETTE GRAINE (comme `Entity.color` l'est de
  // l'identifiant) : stable d'une frame à l'autre, rien à stocker de plus.
  addBone(x, y, taille = 1, graine = (Math.random() * 4294967296) >>> 0) {
    const h = this._hashArete(graine);
    const s = 0.92 + ((h >>> 12) & 255) / 255 * 0.16;          // ±8 % de gabarit
    this.bones.push({
      x, y, age: 0, settled: false, k: taille,
      v: h % this.ARETE_VARIANTES,                              // quel dessin
      dir: (h >>> 8) & 1 ? 1 : -1,                              // tête à droite ou à gauche
      s,                                                        // écart de taille
      ph: ((h >>> 20) & 255) / 255 * 6.283,                     // phase du tournoiement
      rot: 0, pente: 0,
      pied: 1 + 3.2 * taille * s,                               // du centre à la ligne du sable
    });
  },

  update(dt) {
    for (const f of this.items) {
      if (f.settled) continue;
      const def = FOOD_TYPES[f.type];
      f.y += def.sink * dt;
      f.x += Math.sin(performance.now() / 400 + f.wob) * 6 * dt;
      const fy = World.floorY(f.x) - 3;
      if (f.y >= fy) { f.y = fy; f.settled = true; }
    }
    for (const b of this.bones) {
      b.age += dt;
      if (!b.settled) {
        b.y += 22 * dt;
        // Elle coule en tournoyant doucement, puis se couche : la rotation
        // visée est le balancement tant qu'elle tombe, la pente du sable
        // ensuite (le tout lissé, donc pas de claquement à l'atterrissage).
        const fy = World.floorY(b.x) - (b.pied || 4);
        if (b.y >= fy) {
          b.y = fy; b.settled = true;
          b.pente = U.clamp(Math.atan(World.slopeAt(b.x)), -0.45, 0.45);
        }
      }
      const cible = b.settled ? b.pente : Math.sin(b.age * 1.7 + (b.ph || 0)) * 0.32;
      b.rot += (cible - b.rot) * Math.min(1, dt * 5);
    }
    for (const p of this.poops) {
      p.age += dt;
      if (!p.settled) {
        p.y += 34 * dt;
        p.x += Math.sin(performance.now() / 500 + p.wob) * 5 * dt;
        const fy = World.floorY(p.x) - p.r;
        if (p.y >= fy) { p.y = fy; p.settled = true; }
      }
      // il fume un peu en se dissolvant
      if (p.age > 22 && Math.random() < dt * 0.6) Particles.burst(p.x, p.y, '#8a6a3a', 1);
    }
    // dissolution des arêtes après un délai (GDD §7) — compactage sur place,
    // pas de tableau neuf à chaque frame
    let w = 0;
    for (let i = 0; i < this.bones.length; i++) if (this.bones[i].age < 45) this.bones[w++] = this.bones[i];
    this.bones.length = w;
    w = 0;
    for (let i = 0; i < this.poops.length; i++) if (this.poops[i].age < 30) this.poops[w++] = this.poops[i];
    this.poops.length = w;
  },

  // Nourriture la plus proche dans un rayon
  nearest(x, y, radius) {
    let best = null, bestD = radius * radius;
    for (const f of this.items) {
      const d = U.dist2(x, y, f.x, f.y);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  },

  nearestBone(x, y, radius) {
    let best = null, bestD = radius * radius;
    for (const b of this.bones) {
      const d = U.dist2(x, y, b.x, b.y);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  },

  nearestPoop(x, y, radius) {
    let best = null, bestD = radius * radius;
    for (const p of this.poops) {
      const d = U.dist2(x, y, p.x, p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  },

  removePoop(p) { const i = this.poops.indexOf(p); if (i >= 0) this.poops.splice(i, 1); },

  remove(f) { const i = this.items.indexOf(f); if (i >= 0) this.items.splice(i, 1); },
  removeBone(b) { const i = this.bones.indexOf(b); if (i >= 0) this.bones.splice(i, 1); },

  // Le rendu est coupé en DEUX : les arêtes et les cacas appartiennent au
  // décor et passent SOUS les créatures (un squelette plaqué sur un poisson
  // vivant donne l'illusion d'une radiographie) ; seules les graines du JOUEUR
  // passent au-dessus de tout, pour qu'il voie toujours où son clic est tombé.
  draw(ctx) { this.drawDecor(ctx); this.drawGraines(ctx); },

  drawGraines(ctx) {
    for (const f of this.items) {
      if (!Camera.isVisible(f.x, f.y)) continue;
      const sx = Camera.sx(f.x), sy = Camera.sy(f.y);
      const def = FOOD_TYPES[f.type];
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(sx, sy, def.size, 0, Math.PI * 2); ctx.fill();
    }
  },

  drawDecor(ctx) {
    // Caca : la petite crotte en tortillon de dessin animé. Trois boules
    // empilées qui rétrécissent, avec une pointe — assez proche d'une graine
    // de loin pour tromper un poisson affamé, reconnaissable de près.
    for (const p of this.poops) {
      if (!Camera.isVisible(p.x, p.y)) continue;
      const sx = Camera.sx(p.x), sy = Camera.sy(p.y);
      ctx.globalAlpha = U.clamp(1 - (p.age - 24) / 6, 0, 1);
      const r = p.r, tour = p.settled ? 0 : Math.sin(p.age * 2 + p.seed) * 0.35;
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(tour);
      for (let i = 0; i < 3; i++) {
        const k = 1 - i * 0.26;
        ctx.fillStyle = i === 0 ? '#6b4a2a' : (i === 1 ? '#7d5732' : '#8d6339');
        ctx.beginPath();
        ctx.ellipse(0, -i * r * 0.85, r * k, r * k * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8d6339';                       // la pointe au sommet
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 1.7); ctx.lineTo(r * 0.12, -r * 2.5); ctx.lineTo(r * 0.34, -r * 1.65);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Arêtes : UN drawImage par arête, depuis des dessins pré-rendus (voir
    // `spriteArete`). Le dessin lui-même coûte ~60 tracés ; il est payé une
    // fois par (variante, gabarit), pas par frame et par arête.
    if (!this.bones.length) return;
    const R = this._resolutionArete();
    for (const b of this.bones) {
      if (!Camera.isVisible(b.x, b.y)) continue;
      const k = (b.k || 1) * (b.s || 1);
      // DISSOLUTION (12 dernières secondes) : elle ne s'éteint pas d'un coup,
      // elle S'ENFONCE dans le sable en rapetissant, puis se fond. Un
      // smoothstep : départ doux, fin nette — pas de claquement à 45 s.
      const t = b.age > 33 ? U.clamp((b.age - 33) / 12, 0, 1) : 0;
      const fondu = t * t * (3 - 2 * t);
      const ks = k * (1 - 0.18 * fondu);                 // gabarit dessiné
      const spr = this.spriteArete(b.v | 0, k, R);
      ctx.globalAlpha = 1 - fondu;
      ctx.save();
      ctx.translate(Camera.sx(b.x), Camera.sy(b.y) + fondu * 2.2 * k);
      ctx.rotate(b.rot);                                 // balancement, puis pente du sable
      if (b.settled) {                                   // l'ombre sur le sable : à plat, sous le squelette
        ctx.fillStyle = 'rgba(18,12,6,0.26)';
        ctx.beginPath();
        ctx.ellipse(0, b.pied - 0.4, 14.5 * ks, 1.5 + 0.55 * ks, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const s = ks / spr.kb;
      ctx.scale(b.dir * s, s);
      ctx.drawImage(spr.c, -spr.ox / R, -spr.oy / R, spr.c.width / R, spr.c.height / R);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // --- L'ARÊTE ---------------------------------------------------------------
  // Dans la DA des créatures : des formes PLEINES couleur os, cernées d'encre
  // (deux passes : encre large, os par-dessus — le procédé des silhouettes
  // procédurales), un reflet, un crâne avec son orbite creuse et sa mâchoire,
  // une colonne en vertèbres, des côtes courbes qui rapetissent vers la queue,
  // une queue en éventail. Chaque arête tire dans un petit catalogue de
  // variantes (côte manquante ou cassée, mâchoire plus ou moins ouverte, dos
  // cambré, 3 à 5 rayons de queue) : une carcasse n'est jamais le tampon de la
  // précédente.
  //
  // Le dessin est coûteux (~60 tracés) et une arête n'a que quelques gabarits :
  // on le pré-rend une fois par (variante, palier de taille, résolution) dans
  // un canvas hors écran, et le jeu ne fait plus qu'un drawImage par arête.
  ARETE_VARIANTES: 12,
  ARETE_PALIERS: [0.7, 1, 1.5, 2.2, 3.2, 4.5],   // les gabarits que `entity.js` peut produire
  _arCache: {},     // `${variante}|${palier}` → { c, ox, oy, kb }, pour la résolution _arR
  _arR: 0,          // pixels de sprite par pixel monde

  _hashArete(n) {                                  // mélangeur d'entiers : la graine → des bits
    n = (n ^ 61) ^ (n >>> 16);
    n = Math.imul(n, 9); n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15;
    return n >>> 0;
  },

  // Résolution de pré-rendu : un pixel de sprite par pixel ÉCRAN, arrondi
  // vers le haut (jamais agrandi, donc jamais flou ; au plus réduit de moitié).
  // Avec une hystérésis : un zoom qui frôle une frontière ne vide pas le cache
  // à chaque cran de molette.
  _resolutionArete() {
    const ecran = (Camera.zoom || 1) * ((typeof Main !== 'undefined' && Main.dpr) || 1);
    const R = this._arR;
    if (!R || ecran / R > 1.25 || ecran / R < 0.45) {
      const neuf = U.clamp(Math.ceil(ecran - 0.05), 1, 4);
      // (le plancher R = 1 laisse `ecran / R` sous 0,45 en dézoom : sans cette
      // garde le cache serait vidé à chaque frame pour reconstruire le même)
      if (neuf !== R) { this._arR = neuf; this._arCache = {}; }
    }
    return this._arR;
  },

  // Le sprite (déjà construit ou à construire) de la variante `v` au gabarit
  // le plus proche de `k`.
  spriteArete(v, k, R) {
    let pal = this.ARETE_PALIERS[0], dm = Infinity;
    for (const p of this.ARETE_PALIERS) {
      const d = Math.abs(Math.log(p / k));
      if (d < dm) { dm = d; pal = p; }
    }
    const cle = v + '|' + pal;
    return this._arCache[cle] || (this._arCache[cle] = this._construireArete(v, pal, R));
  },

  // Tout ce qui distingue une variante, tiré de son seul numéro.
  _paramsArete(v) {
    let a = (Math.imul(v + 1, 2654435761) + 12345) >>> 0;
    const r = () => { a = (Math.imul(a, 1664525) + 1013904223) >>> 0; return a / 4294967296; };
    return {
      rayons: 3 + Math.floor(r() * 3),                         // rayons de la queue : 3 à 5
      ouvre: 0.05 + r() * 0.33,                                // ouverture de la mâchoire (rad)
      cambre: (r() - 0.5) * 2.4,                               // dos creusé ou bombé
      lean: 0.85 + r() * 0.6,                                  // à quel point les côtes se couchent
      longueur: 0.88 + r() * 0.26,                             // longueur des côtes
      manque: r() < 0.4 ? 1 + Math.floor(r() * 4) : -1,        // une côte arrachée
      cassee: r() < 0.35 ? 1 + Math.floor(r() * 4) : -1,       // une côte à demi brisée
      fourche: r() < 0.4,                                      // queue fourchue ou en éventail rond
    };
  },

  _construireArete(v, kb, R) {
    const P = this._paramsArete(v);
    const u = kb * R;                                          // 1 unité de dessin = u pixels de sprite
    const X0 = -16, X1 = 18.6, Y0 = -7.6, Y1 = 7.6, pad = Math.ceil(2.5 * R);
    const c = document.createElement('canvas');
    c.width = Math.ceil((X1 - X0) * u + pad * 2);
    c.height = Math.ceil((Y1 - Y0) * u + pad * 2);
    const g = c.getContext('2d', { willReadFrequently: false });
    const ox = -X0 * u + pad, oy = -Y0 * u + pad;
    g.setTransform(u, 0, 0, u, ox, oy);
    g.lineCap = 'round'; g.lineJoin = 'round';

    const ENC = '#2a3038', OS = '#f4eedc', OMBRE = '#d6cbad', BLANC = 'rgba(255,255,255,0.85)';
    // Largeurs EN UNITÉS : le cerne et le cœur d'un trait ont un plancher en
    // pixels monde, sinon une arête de 0,7 n'a plus que des fils invisibles ;
    // au-delà elles suivent √k comme les traits des silhouettes.
    const E = Math.max(0.7, 0.95 * Math.sqrt(kb)) / kb;       // cerne, par côté
    const cSpine = Math.max(1.7, 1.6 / kb), cCote = Math.max(0.95, 1.1 / kb), cRayon = Math.max(0.85, 1 / kb);
    const detail = kb >= 1, riche = kb >= 1.8, grand = kb >= 3;
    const ySp = x => P.cambre * (1 - ((x + 1.55) / 7.95) ** 2);   // la colonne : une courbe douce

    // Les côtes : de l'avant (près du crâne) vers la queue, de plus en plus courtes
    const N = U.clamp(Math.round(2.2 + 1.2 * kb), 3, 7);
    const cotes = [];
    for (let i = 0; i < N; i++) {
      if (i === P.manque && N > 3) continue;
      const t = N === 1 ? 0.5 : i / (N - 1);
      const x = U.lerp(4.4, -7.4, t);
      cotes.push({ x, y: ySp(x), h: 4.7 * P.longueur * (1 - 0.58 * t), casse: i === P.cassee });
    }
    const traceCotes = () => {
      g.beginPath();
      for (const r of cotes) for (const sg of [-1, 1]) {
        const h = r.h * (r.casse && sg > 0 ? 0.55 : 1);
        g.moveTo(r.x, r.y + sg * 0.4);
        g.quadraticCurveTo(r.x + 0.1 * h, r.y + sg * h * 0.66, r.x - 0.5 * P.lean * h, r.y + sg * h);
      }
    };
    const traceSpine = () => {
      g.beginPath();
      g.moveTo(6.6, ySp(6.6)); g.quadraticCurveTo(-1.55, 2 * P.cambre, -9.6, ySp(-9.6));
    };

    // La queue : des rayons en éventail, et une membrane fantôme entre eux
    const bx = -9.7, by = ySp(-9.7), n = P.rayons, bouts = [];
    for (let j = 0; j < n; j++) {
      const f = n === 1 ? 0.5 : j / (n - 1), mid = 1 - Math.abs(2 * f - 1);
      const ty = U.lerp(-5.3, 5.3, f), tx = (P.fourche ? -13.4 - 1.6 * (1 - mid) : -14.2 - 1.2 * mid);
      bouts.push([tx, by + ty]);
    }
    g.beginPath();
    g.moveTo(bx, by);
    for (const [tx, ty] of bouts) g.lineTo(tx, ty);
    g.closePath();
    g.fillStyle = 'rgba(244,238,220,0.34)'; g.fill();
    g.strokeStyle = ENC; g.lineWidth = Math.max(0.5, 0.8 / kb); g.stroke();
    g.beginPath();
    for (const [tx, ty] of bouts) {
      g.moveTo(bx, by);
      g.quadraticCurveTo((bx + tx) / 2, by + (ty - by) * 0.35, tx, ty);
    }
    g.strokeStyle = ENC; g.lineWidth = cRayon + 2 * E; g.stroke();
    g.strokeStyle = OS; g.lineWidth = cRayon; g.stroke();

    // Colonne et côtes : encre large, puis os par-dessus (le cerne unifié)
    traceCotes(); g.strokeStyle = ENC; g.lineWidth = cCote + 2 * E; g.stroke();
    traceSpine(); g.strokeStyle = ENC; g.lineWidth = cSpine + 2 * E; g.stroke();
    traceCotes(); g.strokeStyle = OS; g.lineWidth = cCote; g.stroke();
    traceSpine(); g.strokeStyle = OS; g.lineWidth = cSpine; g.stroke();
    // les vertèbres : de petits traits d'encre en travers de la colonne
    if (detail) {
      g.beginPath();
      for (let x = 5.2; x > -9.4; x -= 1.55) {
        const y = ySp(x), w = cSpine * 0.42;
        g.moveTo(x, y - w); g.lineTo(x, y + w);
      }
      g.strokeStyle = ENC; g.lineWidth = Math.max(0.3, 0.6 / kb); g.stroke();
    }
    // reflet blanc le long du dos
    g.beginPath();
    g.moveTo(5.4, ySp(5.4) - cSpine * 0.22); g.quadraticCurveTo(-1.55, 2 * P.cambre - cSpine * 0.22, -8, ySp(-8) - cSpine * 0.22);
    g.strokeStyle = BLANC; g.lineWidth = Math.max(0.3, 0.5 / kb); g.stroke();
    // le plateau d'où partent les rayons
    g.beginPath(); g.ellipse(bx + 0.4, by, 1.3, Math.max(1.8, cSpine * 1.1), 0, 0, Math.PI * 2);
    g.fillStyle = OS; g.fill(); g.strokeStyle = ENC; g.lineWidth = Math.max(0.5, 0.8 / kb); g.stroke();

    // Le crâne : mâchoire du bas d'abord (elle pivote à la commissure)
    const J = [8.5, 1.8], cr = 1;
    g.save();
    g.translate(J[0], J[1]); g.rotate(P.ouvre); g.translate(-J[0], -J[1]);
    g.beginPath();
    g.moveTo(8.0, 1.6);
    g.lineTo(17.1, 1.0);
    g.quadraticCurveTo(16.6, 3.7, 13.2, 4.1);
    g.quadraticCurveTo(10.0, 4.7, 8.0, 3.3);
    g.closePath();
    g.fillStyle = OMBRE; g.fill();
    g.strokeStyle = ENC; g.lineWidth = E * 1.15; g.stroke();
    if (riche) {                                                   // dents d'en bas, vers le haut
      g.beginPath();
      for (const x of [12.2, 13.7, 15.2]) { g.moveTo(x - 0.5, 1.15); g.lineTo(x, 0.1); g.lineTo(x + 0.5, 1.1); }
      g.fillStyle = OS; g.fill(); g.strokeStyle = ENC; g.lineWidth = E * 0.7; g.stroke();
    }
    g.restore();

    // le crâne proprement dit : arrondi derrière, museau devant, œil creux
    g.beginPath();
    g.moveTo(6.2, 0.9);
    g.bezierCurveTo(5.6, -2.2, 7.6, -5.0, 11.2, -5.0);
    g.bezierCurveTo(14.0, -5.0, 15.9, -3.2, 17.9, -1.0);
    g.lineTo(17.5, 0.5);
    g.lineTo(12.6, 1.2);
    g.lineTo(8.6, 1.7);
    g.bezierCurveTo(7.4, 1.9, 6.5, 1.6, 6.2, 0.9);
    g.closePath();
    const gr = g.createLinearGradient(0, -5, 0, 2);
    gr.addColorStop(0, '#fffaf0'); gr.addColorStop(0.55, OS); gr.addColorStop(1, OMBRE);
    g.fillStyle = gr; g.fill();
    g.strokeStyle = ENC; g.lineWidth = E * 1.15; g.stroke();
    if (riche) {                                                   // dents d'en haut, vers le bas
      g.beginPath();
      for (const x of [13.4, 14.9, 16.4]) {
        const yl = 1.2 - (x - 12.6) / 4.9 * 0.7;
        g.moveTo(x - 0.5, yl - 0.05); g.lineTo(x, yl + 1.15); g.lineTo(x + 0.5, yl - 0.1);
      }
      g.fillStyle = OS; g.fill(); g.strokeStyle = ENC; g.lineWidth = E * 0.7; g.stroke();
    }
    // l'orbite : un trou, VIDE (aucun éclat — c'est ce qui la distingue de
    // l'œil d'un poisson vivant), cernée d'un liseré d'ombre pour la creuser
    g.beginPath(); g.ellipse(11.8, -1.7, 1.75 * cr, 1.9 * cr, 0, 0, Math.PI * 2);
    g.fillStyle = ENC; g.fill();
    if (detail) {
      g.beginPath(); g.ellipse(11.8, -1.7, 2.3 * cr, 2.45 * cr, 0, 0, Math.PI * 2);
      g.strokeStyle = 'rgba(126,112,80,0.55)'; g.lineWidth = Math.max(0.35, 0.6 / kb); g.stroke();
    }
    if (riche) {                                                   // l'opercule, derrière l'orbite
      g.beginPath(); g.moveTo(8.9, -4.2); g.quadraticCurveTo(7.7, -1.2, 8.7, 1.2);
      g.strokeStyle = ENC; g.lineWidth = E * 0.7; g.stroke();
    }
    if (grand) {                                                   // une fêlure sur le crâne
      g.beginPath(); g.moveTo(10.2, -5.0); g.lineTo(10.9, -3.6); g.lineTo(10.1, -3.0); g.lineTo(10.6, -2.1);
      g.strokeStyle = ENC; g.lineWidth = E * 0.6; g.stroke();
    }
    // le reflet sur le crâne, comme sur les corps dessinés
    g.beginPath(); g.moveTo(7.4, -2.6); g.quadraticCurveTo(8.6, -4.4, 11.4, -4.3);
    g.strokeStyle = BLANC; g.lineWidth = Math.max(0.4, 0.7 / kb); g.stroke();
    return { c, ox, oy, kb };
  },

};
