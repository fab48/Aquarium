// Nourriture larguée par le joueur + arêtes de poissons morts (charogne).
const Food = {
  items: [],   // { x, y, type, settled }
  bones: [],   // { x, y, age }
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
  addBone(x, y, taille = 1) { this.bones.push({ x, y, age: 0, settled: false, k: taille }); },

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
        const fy = World.floorY(b.x) - 4;
        if (b.y >= fy) { b.y = fy; b.settled = true; }
      }
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

    for (const b of this.bones) {
      if (!Camera.isVisible(b.x, b.y)) continue;
      ctx.globalAlpha = U.clamp(1 - (b.age - 35) / 10, 0, 1);
      ctx.save();
      ctx.translate(Camera.sx(b.x), Camera.sy(b.y));
      // Posée au sol, elle épouse la pente (même règle que le décor) ; en
      // coulant elle se balance un peu. Son sens est tiré de sa position :
      // toutes les arêtes tournées du même côté se liraient comme un tampon.
      if (b.settled) ctx.rotate(Math.atan(World.slopeAt(b.x)));
      else ctx.rotate(Math.sin(b.age * 1.7 + b.x) * 0.25);
      if (Math.floor(b.x) % 2) ctx.scale(-1, 1);
      this.drawArete(ctx, b.k || 1);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  },

  // L'ARÊTE, dans la DA des créatures : des formes PLEINES couleur os cernées
  // d'encre — comme les dessins de l'atelier — et non plus des traits blancs
  // plats. Le cerne vient de deux passes (encre large, os par-dessus), le
  // procédé des silhouettes procédurales. Côtes courbes en peigne, queue en
  // éventail, crâne avec sa mâchoire et l'œil en croix du KO. `k` = 1 pour
  // un petit poisson ; un cachalot laisse une carcasse à sa mesure.
  drawArete(ctx, k) {
    const OS = '#f4eedc', OMBRE = '#d8cdb0', ENCRE = '#4f4a3e';
    const r = Math.sqrt(k);
    const cotes = Math.round(U.clamp(k * 1.6 + 1, 2, 7));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // La queue, en éventail, derrière tout le reste
    ctx.beginPath();
    ctx.moveTo(-8 * k, 0);
    ctx.quadraticCurveTo(-11 * k, -2 * k, -13.5 * k, -5 * k);
    ctx.quadraticCurveTo(-11.8 * k, 0, -13.5 * k, 5 * k);
    ctx.quadraticCurveTo(-11 * k, 2 * k, -8 * k, 0);
    ctx.closePath();
    ctx.fillStyle = OS; ctx.fill();
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.1 * r; ctx.stroke();
    // Colonne et côtes, en deux passes pour le cerne
    const os = () => {
      ctx.beginPath();
      ctx.moveTo(-9 * k, 0); ctx.quadraticCurveTo(-2 * k, -1.2 * k, 5 * k, 0);
      for (let i = 0; i < cotes; i++) {
        const u = i / (cotes - 1), x = U.lerp(-6 * k, 3 * k, u) - 0.4 * k * Math.sin(u * Math.PI);
        const h = 4.8 * k * (0.5 + 0.5 * Math.sin(u * Math.PI));   // fuselé aux deux bouts
        ctx.moveTo(x, -0.5 * k); ctx.quadraticCurveTo(x - 0.6 * k, -h * 0.7, x - 2.2 * k, -h);
        ctx.moveTo(x, 0.5 * k); ctx.quadraticCurveTo(x - 0.6 * k, h * 0.7, x - 2.2 * k, h);
      }
    };
    os(); ctx.strokeStyle = ENCRE; ctx.lineWidth = 3.2 * r; ctx.stroke();
    os(); ctx.strokeStyle = OS; ctx.lineWidth = 1.6 * r; ctx.stroke();
    // Le crâne : arrondi derrière, museau devant, la mâchoire entrouverte
    ctx.beginPath();
    ctx.moveTo(2.2 * k, -0.5 * k);
    ctx.quadraticCurveTo(2.6 * k, -4.4 * k, 6.8 * k, -4 * k);
    ctx.quadraticCurveTo(10.5 * k, -3.2 * k, 11.2 * k, -0.4 * k);
    ctx.lineTo(8.4 * k, 0.9 * k);                     // la commissure
    ctx.lineTo(10.6 * k, 2.2 * k);                    // la mâchoire du bas
    ctx.quadraticCurveTo(7.5 * k, 4.6 * k, 3.6 * k, 3.4 * k);
    ctx.quadraticCurveTo(1.6 * k, 2.4 * k, 2.2 * k, -0.5 * k);
    ctx.closePath();
    ctx.fillStyle = OS; ctx.fill();
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.1 * r; ctx.stroke();
    // l'orbite creuse, puis l'œil en croix du KO
    ctx.fillStyle = OMBRE;
    ctx.beginPath(); ctx.arc(6.3 * k, -1.5 * k, 1.9 * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 0.9 * r;
    ctx.beginPath();
    ctx.moveTo(5.3 * k, -2.5 * k); ctx.lineTo(7.3 * k, -0.5 * k);
    ctx.moveTo(7.3 * k, -2.5 * k); ctx.lineTo(5.3 * k, -0.5 * k);
    ctx.stroke();
    // un reflet sur le crâne, comme sur les corps dessinés
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.7 * r;
    ctx.beginPath(); ctx.arc(5.6 * k, -1 * k, 2.7 * k, -2.6, -1.7); ctx.stroke();
  },

};
