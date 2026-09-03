// Décor : ciel, plage, colonne d'eau dégradée par profondeur, fond sableux,
// layers parallax (roches), god rays, plancton, cycle jour/nuit (GDD §2, §10).

const Background = {
  rocks: [],      // décor moyen-plan parallax
  plankton: [],

  flora: [],

  init() {
    // Rochers ANGULEUX : un polygone irrégulier par rocher (rayon bruité autour
    // du centre), bien plus minéral que des galets arrondis.
    for (let i = 0; i < 260; i++) {
      const x = U.rand(World.shoreX, CONFIG.WORLD_WIDTH);
      // Éventail large : des cailloux jusqu'à de vrais blocs qui structurent le
      // fond. Un rocher sur cinq est un gros massif.
      const gros = Math.random() < 0.2;
      const w = gros ? U.rand(190, 420) : U.rand(30, 160);
      const h = gros ? U.rand(90, 210) : U.rand(20, 75);
      const n = U.randInt(5, 8);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = Math.PI + (k / (n - 1)) * Math.PI;      // demi-tour : partie émergée
        const r = U.rand(0.62, 1);
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * U.rand(0.75, 1.15) });
      }
      this.rocks.push({
        x, bury: U.rand(0.15, 0.4),      // fraction enfoncée dans le sable
        w, h, pts,
        layer: U.pick([0.88, 0.94, 1, 1]),
        tint: U.rand(-0.1, 0.1),
      });
    }

    // Végétation : touffes d'algues et grandes laminaires, posées sur le fond
    for (let i = 0; i < 150; i++) {
      const x = U.rand(World.shoreX + 100, CONFIG.WORLD_WIDTH);
      const deep = World.depthAt(x) > 1700;
      // Les abysses restent nus : quelques bouquets de vers tubicoles autour des
      // sources chaudes, pas une prairie.
      if (deep && Math.random() > 0.4) continue;
      const kelp = !deep && Math.random() < 0.3;
      this.flora.push({
        x,
        kind: deep ? 'tube' : (kelp ? 'kelp' : 'weed'),
        h: deep ? U.rand(20, 42) : (kelp ? U.rand(90, 200) : U.rand(26, 65)),
        blades: deep ? U.randInt(2, 4) : U.randInt(3, 6),
        hue: U.rand(-18, 18),
        ph: Math.random() * 10,
        layer: U.pick([0.94, 1]),
      });
    }
    for (let i = 0; i < 160; i++) {
      this.plankton.push({
        x: U.rand(0, CONFIG.WORLD_WIDTH), y: U.rand(CONFIG.SURFACE_Y, CONFIG.SURFACE_Y + CONFIG.DEPTH_MAX),
        r: U.rand(0.8, 2.2), ph: Math.random() * 10,
      });
    }
  },

  // Positions x des éléments de décor, pour que les espèces s'y installent :
  // les étoiles sur les rochers, les hippocampes dans les herbiers (GDD §12).
  habitatSpots(kind) {
    if (kind === 'rock') return this.rocks.filter(r => r.layer === 1 && r.w > 60).map(r => r.x);
    if (kind === 'weed') return this.flora.filter(f => f.kind !== 'tube').map(f => f.x);
    return [];
  },

  // Couleur de l'eau selon profondeur (px sous la surface) et nuit
  waterColor(depth, night) {
    let c;
    if (depth < 120) c = U.mixColor('#8fd8f5', '#5db8e8', depth / 120);
    else if (depth < 700) c = U.mixColor('#5db8e8', '#2a6b9e', (depth - 120) / 580);
    else if (depth < 1700) c = U.mixColor('#2a6b9e', '#123452', (depth - 700) / 1000);
    else c = U.mixColor('#123452', '#040a14', Math.min(1, (depth - 1700) / 900));
    if (night > 0) c = U.mixColor(c.startsWith('rgb') ? this.rgbToHex(c) : c, '#020812', night * 0.7);
    return c;
  },

  rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('');
  },

  draw(ctx, t) {
    const night = Main.nightAmount();
    const W = Camera.w, H = Camera.h;

    // --- Colonne d'eau : dégradé vertical selon la profondeur visible ---
    const dTop = Camera.y - CONFIG.SURFACE_Y;
    const dBot = Camera.y + H - CONFIG.SURFACE_Y;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 4; i++) {
      const d = U.lerp(dTop, dBot, i / 4);
      grad.addColorStop(i / 4, d < 0 ? this.skyColor(night) : this.waterColor(d, night));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // --- Ciel et ligne de surface ---
    const [, surfSy] = Camera.toScreen(0, CONFIG.SURFACE_Y);
    if (surfSy > 0) {
      const sky = ctx.createLinearGradient(0, 0, 0, surfSy);
      sky.addColorStop(0, this.skyColor(night, true));
      sky.addColorStop(1, this.skyColor(night));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, Math.min(surfSy, H));
      // soleil / lune
      const sunT = Main.dayT();
      const sunX = W * (0.15 + 0.7 * sunT);
      const sunY = surfSy - 60 - Math.sin(sunT * Math.PI) * 120;
      ctx.fillStyle = night > 0.5 ? '#e8ecf5' : '#ffd75e';
      ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, Math.PI * 2); ctx.fill();
      // vagues
      ctx.strokeStyle = `rgba(255,255,255,${0.5 - night * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let sx = 0; sx <= W; sx += 8) {
        const wx = sx + Camera.x;
        const y = surfSy + Math.sin(wx / 60 + t * 1.8) * 4 + Math.sin(wx / 23 - t * 2.6) * 2;
        sx === 0 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
      }
      ctx.stroke();
    }

    // --- God rays (atténués avec la profondeur, GDD §2) ---
    const rayStrength = U.clamp(1 - dTop / 800, 0, 1) * (1 - night * 0.85);
    if (rayStrength > 0.02 && surfSy < H) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const rx = ((i * 337 + t * 12) % (W + 400)) - 200;
        const g = ctx.createLinearGradient(rx, Math.max(0, surfSy), rx + 180, H);
        g.addColorStop(0, `rgba(255,250,220,${0.07 * rayStrength})`);
        g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(rx, Math.max(0, surfSy));
        ctx.lineTo(rx + 70, Math.max(0, surfSy));
        ctx.lineTo(rx + 260, H); ctx.lineTo(rx + 60, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // --- Crêtes rocheuses d'arrière-plan (parallax lent, brumeuses) ---
    // Deux rubans qui suivent la forme du fond, échantillonnés à une position
    // parallax-décalée : elles glissent moins vite que le décor → profondeur.
    for (const ridge of [{ p: 0.35, up: 300, a: 0.16 }, { p: 0.6, up: 150, a: 0.26 }]) {
      ctx.beginPath();
      let began = false;
      for (let sx = -30; sx <= W + 30; sx += 40) {
        const wq = Camera.x * ridge.p + sx + ridge.p * 4000; // décalage pour varier le relief
        const fy = CONFIG.SURFACE_Y + World.depthAt(U.clamp(wq, 0, CONFIG.WORLD_WIDTH))
                 - ridge.up + Math.sin(wq / 190) * 45 + Math.sin(wq / 67) * 18;
        const py = fy - Camera.y;
        if (!began) { ctx.moveTo(sx, py); began = true; } else ctx.lineTo(sx, py);
      }
      ctx.lineTo(W + 30, H + 30); ctx.lineTo(-30, H + 30); ctx.closePath();
      // couleur : roche noyée dans la couleur d'eau locale (effet de brume)
      const midDepth = Camera.y + H * 0.7 - CONFIG.SURFACE_Y;
      const water = this.waterColor(Math.max(0, midDepth), night);
      const waterHex = water.startsWith('rgb') ? this.rgbToHex(water) : water;
      ctx.fillStyle = U.mixColor(waterHex, '#26303e', ridge.a * 0.55);
      ctx.fill();
    }

    // --- Rochers posés sur le fond ---
    // Dessinés AVANT le sable : celui-ci recouvre ensuite leur base, ce qui les
    // enfonce naturellement dans le sol. Deux points essentiels : la hauteur est
    // lue à la position RÉELLEMENT AFFICHÉE (sinon le décalage parallax les fait
    // flotter), et chaque rocher s'incline selon la pente locale.
    for (const r of this.rocks) {
      const px = r.x - Camera.x * r.layer;
      if (px < -250 || px > W + 250) continue;
      const wx = px + Camera.x;                       // x monde effectivement montré
      const floorWY = World.floorY(wx);
      const [, py] = Camera.toScreen(0, floorWY + r.h * r.bury);
      if (py < -200 || py > H + 200) continue;
      const depth = floorWY - CONFIG.SURFACE_Y;
      const light = U.clamp(1 - depth / 2600, 0.2, 1) * (1 - night * 0.55);
      const wash = (1 - r.layer) * 3;                 // les plus lointains se noient dans l'eau
      const water = this.waterColor(Math.max(0, depth - 120), night);
      const waterHex = water.startsWith('rgb') ? this.rgbToHex(water) : water;
      const base = U.mixColor('#7d8b9c', '#414b59', U.clamp(1 - light + r.tint, 0, 1));
      const rockCol = U.mixColor(base.startsWith('rgb') ? this.rgbToHex(base) : base, waterHex, U.clamp(wash, 0, 0.6));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan(World.slopeAt(wx)));       // couché dans le sens de la pente
      // silhouette anguleuse
      ctx.fillStyle = rockCol;
      ctx.beginPath();
      ctx.moveTo(r.pts[0].x * r.w, r.pts[0].y * r.h);
      for (let k = 1; k < r.pts.length; k++) ctx.lineTo(r.pts[k].x * r.w, r.pts[k].y * r.h);
      ctx.lineTo(r.w * 0.9, r.h * 0.5);
      ctx.lineTo(-r.w * 0.9, r.h * 0.5);
      ctx.closePath();
      ctx.fill();
      // facette éclairée : la moitié gauche du polygone, plus claire (arête nette)
      if (light > 0.22) {
        ctx.fillStyle = `rgba(220,236,252,${0.14 * light})`;
        ctx.beginPath();
        const half = Math.ceil(r.pts.length / 2);
        ctx.moveTo(r.pts[0].x * r.w, r.pts[0].y * r.h);
        for (let k = 1; k <= half; k++) ctx.lineTo(r.pts[k].x * r.w, r.pts[k].y * r.h);
        ctx.lineTo(r.pts[0].x * r.w * 0.35, r.h * 0.4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // --- Fond sableux (dégradé selon la profondeur : clair en haut, sombre au fond) ---
    const sandGrad = ctx.createLinearGradient(0, 0, 0, H);
    for (let i = 0; i <= 4; i++) {
      const d = U.lerp(dTop, dBot, i / 4);
      sandGrad.addColorStop(i / 4, U.mixColor('#e0cb98', '#3a3428',
        U.clamp(Math.max(0, d) / 3000 + night * 0.35, 0, 0.9)));
    }
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    let started = false;
    for (let sx = -20; sx <= W + 20; sx += 25) {
      const wx = sx + Camera.x;
      const [, fy] = Camera.toScreen(0, World.floorY(wx));
      if (!started) { ctx.moveTo(sx, fy); started = true; } else ctx.lineTo(sx, fy);
    }
    ctx.lineTo(W + 20, H + 20); ctx.lineTo(-20, H + 20);
    ctx.closePath();
    ctx.fill();

    // Modelé du sable : une bande sombre au contact de l'eau (ombre portée du
    // relief) puis un éclaircissement vers le bas. Sans ça le sable est un
    // aplat mort qui écrase la lecture de la profondeur.
    ctx.save();
    ctx.clip();
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    // Le modelé SUIT le contour du fond (traits épais superposés) : des bandes
    // verticales colonne par colonne laissaient des rayures visibles.
    const contour = (offset) => {
      ctx.beginPath();
      for (let sx = -30; sx <= W + 30; sx += 24) {
        const wx = sx + Camera.x;
        const [, fy] = Camera.toScreen(0, World.floorY(wx));
        sx === -30 ? ctx.moveTo(sx, fy + offset) : ctx.lineTo(sx, fy + offset);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(38,50,64,0.06)'; ctx.lineWidth = 300; contour(150);
    ctx.strokeStyle = 'rgba(38,50,64,0.09)'; ctx.lineWidth = 90;  contour(45);
    ctx.strokeStyle = 'rgba(38,50,64,0.13)'; ctx.lineWidth = 26;  contour(13);
    // ondulations de sable, très discrètes
    ctx.strokeStyle = 'rgba(120,100,66,0.09)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      for (let sx = -30; sx <= W + 30; sx += 30) {
        const wx = sx + Camera.x;
        const [, fy] = Camera.toScreen(0, World.floorY(wx));
        const yy = fy + 70 + k * 95 + Math.sin(wx / 130 + k) * 16;
        sx === -30 ? ctx.moveTo(sx, yy) : ctx.lineTo(sx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // --- Écume au rivage : là où le sable croise la ligne d'eau ---
    if (Camera.x < World.shoreX + 400) {
      const shoreWX = World.shoreX;
      {
        // L'écume appartient à L'EAU : elle court le long de la ligne de
        // flottaison depuis le rivage vers le large, en ondulant comme les
        // vagues. (Elle suivait le sable, donc elle grimpait sur la plage.)
        const wash = Math.sin(t * 0.9) * 34;
        const x0 = shoreWX + wash;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = `rgba(255,255,255,${(pass ? 0.35 : 0.8) - night * 0.4})`;
          ctx.lineWidth = pass ? 3 : 5.5;
          ctx.beginPath();
          for (let k = 0; k <= 14; k++) {
            const wx = x0 + k * 26 + pass * 40;
            const wy = CONFIG.SURFACE_Y
              + Math.sin(wx / 60 + t * 1.8) * 4 + Math.sin(wx / 23 - t * 2.6) * 2
              + Math.sin(t * 2.2 + k * 0.6) * 1.5;
            const [ex, ey] = Camera.toScreen(wx, wy);
            k === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
          }
          ctx.stroke();
        }
      }
    }

    // --- Végétation (après le sable : elle pousse dessus, pas dedans) ---
    for (const f of this.flora) {
      const px = f.x - Camera.x * f.layer;
      if (px < -120 || px > W + 120) continue;
      const wx = px + Camera.x;
      const floorWY = World.floorY(wx);
      const [, py] = Camera.toScreen(0, floorWY - 2);
      if (py < -260 || py > H + 60) continue;
      const depth = floorWY - CONFIG.SURFACE_Y;
      const light = U.clamp(1 - depth / 2400, 0.22, 1) * (1 - night * 0.6);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan(World.slopeAt(wx)));   // pousse perpendiculairement au sol

      if (f.kind === 'tube') {
        // Vers tubicoles des sources chaudes : tiges pâles à pointe rouge
        for (let b = 0; b < f.blades; b++) {
          const bx = (b - (f.blades - 1) / 2) * 7;
          const h = f.h * (0.65 + 0.35 * Math.sin(b * 2.1 + f.ph));
          const sway = Math.sin(t * 0.8 + f.ph + b) * 3;
          ctx.strokeStyle = `rgba(226,222,214,${0.5 + light * 0.4})`;
          ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx, 0);
          ctx.quadraticCurveTo(bx + sway * 0.5, -h * 0.6, bx + sway, -h); ctx.stroke();
          ctx.strokeStyle = `rgba(214,74,84,${0.6 + light * 0.3})`;
          ctx.lineWidth = 4.5;
          ctx.beginPath(); ctx.moveTo(bx + sway * 0.86, -h * 0.86); ctx.lineTo(bx + sway, -h); ctx.stroke();
        }
      } else {
        const g = f.kind === 'kelp' ? 118 : 150;
        ctx.strokeStyle = `rgba(${52 + f.hue},${(g + light * 45) | 0},${72 + f.hue},${0.45 + light * 0.45})`;
        ctx.lineCap = 'round';
        for (let b = 0; b < f.blades; b++) {
          const bx = (b - (f.blades - 1) / 2) * (f.kind === 'kelp' ? 11 : 6);
          const h = f.h * (0.6 + 0.4 * Math.abs(Math.sin(b * 1.7 + f.ph)));
          const sway = Math.sin(t * 1.1 + f.ph + b * 0.7) * (f.kind === 'kelp' ? 22 : 8);
          ctx.lineWidth = f.kind === 'kelp' ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.bezierCurveTo(bx + sway * 0.2, -h * 0.4, bx + sway * 0.7, -h * 0.7, bx + sway, -h);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // --- Cheminées volcaniques des grands fonds ---
    for (let i = 0; i < 9; i++) {
      const wx = 4600 + i * 380;
      const floorWY = World.floorY(wx);
      if (floorWY - CONFIG.SURFACE_Y < 1700) continue;
      const [sx, sy] = Camera.toScreen(wx, floorWY);
      if (sx < -140 || sx > W + 140) continue;
      const hgt = 70 + ((i * 37) % 60);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan(World.slopeAt(wx)));
      // cône irrégulier, base large, empilement de roche sombre
      ctx.fillStyle = '#241d28';
      ctx.beginPath();
      ctx.moveTo(-34, 6);
      ctx.quadraticCurveTo(-20, -hgt * 0.55, -11, -hgt);
      ctx.lineTo(11, -hgt);
      ctx.quadraticCurveTo(22, -hgt * 0.5, 36, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2f3c';
      ctx.beginPath();
      ctx.ellipse(0, -hgt, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      // lueur de la bouche
      ctx.fillStyle = `rgba(255,138,74,${0.45 + Math.sin(t * 2 + i) * 0.12})`;
      ctx.beginPath(); ctx.ellipse(0, -hgt, 7, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.05) Particles.bubble(wx, floorWY - hgt - 6, U.rand(2, 5));
    }

    // --- Plancton / particules en suspension ---
    ctx.fillStyle = `rgba(255,255,240,${0.25 - night * 0.1})`;
    for (const p of this.plankton) {
      if (!Camera.isVisible(p.x, p.y, 20)) continue;
      const [sx, sy] = Camera.toScreen(p.x, p.y + Math.sin(t * 0.5 + p.ph) * 8);
      ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
    }
  },

  skyColor(night, top = false) {
    const day = top ? '#7ec8f0' : '#b8e4f7';
    const nightC = top ? '#0a1230' : '#1a2545';
    return U.mixColor(day, nightC, night);
  },
};
