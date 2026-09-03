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

  addBone(x, y) { this.bones.push({ x, y, age: 0, settled: false }); },

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
    // dissolution des arêtes après un délai (GDD §7)
    this.bones = this.bones.filter(b => b.age < 45);
    this.poops = this.poops.filter(p => p.age < 30);
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
      const [sx, sy] = Camera.toScreen(f.x, f.y);
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
      const [sx, sy] = Camera.toScreen(p.x, p.y);
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
      const [sx, sy] = Camera.toScreen(b.x, b.y);
      ctx.globalAlpha = U.clamp(1 - (b.age - 35) / 10, 0, 1);
      // colonne vertébrale + arêtes
      ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 6, sy);
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(sx + i * 4 - 2, sy - 4); ctx.lineTo(sx + i * 4 - 2, sy + 4);
      }
      ctx.stroke();
      // petite queue en triangle
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy); ctx.lineTo(sx - 12, sy - 4);
      ctx.moveTo(sx - 8, sy); ctx.lineTo(sx - 12, sy + 4);
      ctx.stroke();
      // tête de squelette avec œil en croix
      ctx.fillStyle = '#e8e4d8';
      ctx.beginPath(); ctx.arc(sx + 10, sy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(sx + 9, sy - 2.5); ctx.lineTo(sx + 12.5, sy + 1);   // œil ✕
      ctx.moveTo(sx + 12.5, sy - 2.5); ctx.lineTo(sx + 9, sy + 1);
      ctx.moveTo(sx + 8.5, sy + 3); ctx.lineTo(sx + 12, sy + 3);     // petite bouche plate
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
};
