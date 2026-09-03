// Socle commun de feedback visuel (GDD §3 et §8) : splash de surface, remous,
// nuages de sable, bulles, et bulles d'action comiques (BD).
const Particles = {
  list: [],
  actionBubbles: [],

  spawn(p) { this.list.push(Object.assign({ age: 0, life: 1, vx: 0, vy: 0 }, p)); },

  // --- Effets prêts à l'emploi (branchables partout : collisions, gags...) ---

  splash(x) {
    // onde circulaire à la surface + gouttelettes
    this.spawn({ type: 'ripple', x, y: CONFIG.SURFACE_Y, life: 0.9, r: 4 });
    for (let i = 0; i < 6; i++) {
      this.spawn({ type: 'drop', x: x + U.rand(-6, 6), y: CONFIG.SURFACE_Y,
        vx: U.rand(-50, 50), vy: U.rand(-160, -60), life: 0.7 });
    }
  },

  sandCloud(x, y, big = false) {
    const n = big ? 18 : 9;
    for (let i = 0; i < n; i++) {
      this.spawn({ type: 'sand', x: x + U.rand(-14, 14), y: y + U.rand(-4, 4),
        vx: U.rand(-25, 25), vy: U.rand(-45, -12), life: U.rand(1.2, 2.2),
        r: U.rand(1.5, big ? 4.5 : 3) });
    }
  },

  bubble(x, y, r = null) {
    this.spawn({ type: 'bubble', x: x + U.rand(-4, 4), y,
      vx: U.rand(-8, 8), vy: U.rand(-45, -25), life: U.rand(1.5, 3.5),
      r: r ?? U.rand(2, 5) });
  },

  wake(x, y) {
    this.spawn({ type: 'wake', x, y, life: 0.5, r: U.rand(3, 7) });
  },

  bones(x, y) {
    // arête qui coule lentement (GDD §7) — gérée comme particule persistante,
    // mais l'entité "bone" mangeable vit dans Ecosystem ; ceci est le visuel de mort
    for (let i = 0; i < 4; i++) this.bubble(x, y);
  },

  // Bulle d'action comique (GDD §8) : un symbole dans une bulle qui monte
  comic(x, y, symbol) {
    this.actionBubbles.push({ x, y, symbol, age: 0, life: 1.8 });
  },

  // Un seul coeur : en grappe, ils saturaient l'ecran au-dessus du recif
  hearts(x, y) { this.comic(x + U.rand(-8, 8), y, '❤'); },
  stars(x, y) { this.comic(x + U.rand(-10, 10), y, '★'); },

  // --- VFX d'émotion : ce qui rend une expression lisible de loin -------------

  // Éclat de petites particules colorées (surprise, régal…)
  burst(x, y, color, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(40, 110);
      this.spawn({ type: 'spark', x, y, color, r: U.rand(1.5, 3.2),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: U.rand(0.4, 0.8) });
    }
  },

  // Zzz du dormeur : texte qui monte en ondulant et grossit
  zzz(x, y, taille = 20) {
    this.spawn({ type: 'zzz', x, y, vx: U.rand(4, 14), vy: U.rand(-26, -16),
      font: U.clamp(taille * 0.9, 13, 34),
      texte: U.pick(['Z', 'Zz', 'ZzZ', 'Zzzz']), life: U.rand(1.6, 2.6) });
  },

  // Notes de musique qui s'envolent (la danse du Crabe Disco)
  notes(x, y, n = 2) {
    for (let i = 0; i < n; i++) {
      this.spawn({ type: 'note', x: x + U.rand(-18, 18), y: y + U.rand(-8, 8),
        vx: U.rand(-16, 16), vy: U.rand(-42, -22), r: U.rand(7, 12),
        note: Math.random() < 0.5 ? '♪' : '♫',
        hue: U.rand(0, 360), life: U.rand(1, 1.7) });
    }
  },

  sparkles(x, y, n = 4) {
    for (let i = 0; i < n; i++) {
      this.spawn({ type: 'sparkle', x: x + U.rand(-22, 22), y: y + U.rand(-16, 10),
        life: U.rand(0.5, 1), r: U.rand(3, 6) });
    }
  },

  // Goutte de gêne façon manga
  sweat(x, y) {
    this.spawn({ type: 'sweat', x, y, vx: U.rand(10, 30), vy: -30, life: 0.9 });
  },

  // Petite veine de colère
  anger(x, y) {
    this.spawn({ type: 'anger', x, y, life: 1, r: 9 });
  },

  // Anneau de vertige autour de la tête
  spin(x, y, s) {
    this.spawn({ type: 'spin', x, y, life: 1.4, r: Math.max(10, s * 0.9) });
  },

  // Souffle du cétacé : panache de vapeur qui jaillit de l'évent et retombe
  blow(x, y, size) {
    // Panache : une colonne serrée qui monte vite puis s'évase en retombant.
    // Le cône de départ est étroit, sinon on obtient un nuage flou au lieu du
    // jet vertical caractéristique.
    const n = Math.round(U.clamp(size * 0.55, 16, 60));
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + U.rand(-0.16, 0.16);
      const sp = U.rand(180, 420) * (0.6 + size / 190);
      this.spawn({ type: 'blow', x: x + U.rand(-4, 4), y,
        vx: Math.cos(a) * sp * 0.45, vy: Math.sin(a) * sp,
        r: U.rand(5, 15) * (0.6 + size / 260), life: U.rand(1.1, 2.2) });
    }
    for (let i = 0; i < 14; i++) {
      this.spawn({ type: 'drop', x: x + U.rand(-16, 16), y,
        vx: U.rand(-110, 110), vy: U.rand(-330, -140), life: U.rand(0.8, 1.3) });
    }
  },

  // EXPLOSION : l'animal trop nourri part en morceaux. Un flash blanc, une
  // onde de choc, des éclats de sa propre couleur et une pluie de gouttes.
  boom(x, y, size, color) {
    this.spawn({ type: 'flash', x, y, r: size * 1.6, life: 0.35 });
    this.spawn({ type: 'shock', x, y, r: size * 0.8, life: 0.7 });
    const n = Math.round(U.clamp(size * 1.1, 18, 70));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(80, 420);
      this.spawn({ type: 'chunk', x, y, color,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        r: U.rand(2, 6) * (0.6 + size / 90), spin: U.rand(-9, 9), rot: a,
        life: U.rand(0.8, 1.8) });
    }
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spawn({ type: 'drop', x, y, vx: Math.cos(a) * U.rand(60, 260),
        vy: Math.sin(a) * U.rand(60, 260) - 120, life: U.rand(0.7, 1.4) });
    }
    for (let i = 0; i < 10; i++) this.bubble(x + U.rand(-size, size), y + U.rand(-size, size));
  },

  // CRI façon BD : le mot en gros, avec des traits qui rayonnent autour.
  // `taille` : celle de l'emetteur, pour qu'un petit poisson ne crie pas plus
  // gros que lui.
  shout(x, y, text, color = '#fff', taille = 30) {
    const f = U.clamp(taille * 1.15, 18, 46);
    this.spawn({ type: 'shout', x, y, text, color, life: 1.1, r: f * 0.85, font: f });
  },

  // Petits cœurs qui montent (sans bulle blanche) : la romance sans saturer
  // le compteur de bulles de BD.
  loveBurst(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      this.spawn({ type: 'heart', x: x + U.rand(-16, 16), y: y + U.rand(-10, 10),
        vx: U.rand(-14, 14), vy: U.rand(-34, -16),
        r: U.rand(7, 13), life: U.rand(1, 1.8) });
    }
  },

  // La prise : éclair d'impact + écailles qui volent. C'est CE qu'il faut voir
  // pour comprendre qu'un poisson vient de se faire manger.
  chomp(x, y, size, color) {
    this.spawn({ type: 'chomp', x, y, r: Math.max(14, size * 2.2), life: 0.45 });
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(70, 190);
      this.spawn({ type: 'scale', x, y, color: color || '#cfe6ff',
        r: U.rand(2, 4), rot: Math.random() * 6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: U.rand(0.6, 1.1) });
    }
    this.comic(x, y - size - 8, '💥');
  },

  // Pet : nuage verdâtre + bulles qui montent (Poisson Perroquet Pétomane)
  fart(x, y) {
    this.comic(x, y - 6, '💨');
    for (let i = 0; i < 10; i++) {
      this.spawn({ type: 'stink', x: x + U.rand(-6, 6), y: y + U.rand(-5, 5),
        vx: U.rand(-26, -6), vy: U.rand(-26, -6), r: U.rand(4, 11), life: U.rand(1, 1.9) });
    }
    for (let i = 0; i < 3; i++) this.bubble(x - 4, y, U.rand(2, 4));
  },

  update(dt) {
    for (const p of this.list) {
      p.age += dt;
      if (p.type === 'drop') { p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > CONFIG.SURFACE_Y) p.age = p.life; }
      else if (p.type === 'sand') { p.vy += 30 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt;
        const fy = World.floorY(p.x); if (p.y > fy) p.y = fy; }
      else if (p.type === 'bubble') {
        p.x += p.vx * dt + Math.sin(p.age * 6 + p.y) * 12 * dt; p.y += p.vy * dt;
        if (p.y <= CONFIG.SURFACE_Y) p.age = p.life;
      }
      else if (p.type === 'spark') { p.vy += 60 * dt; p.vx *= 0.94; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.type === 'sweat') { p.vy += 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.type === 'stink') { p.vx *= 0.97; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 9 * dt; }
      else if (p.type === 'scale') { p.vy += 110 * dt; p.vx *= 0.95; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8; }
      else if (p.type === 'blow') { p.vy += 260 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += p.vy * dt; p.r += 14 * dt; }
      else if (p.type === 'heart') { p.vx *= 0.97; p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.type === 'shout') { p.y -= 16 * dt; }
      else if (p.type === 'note') { p.vx *= 0.98; p.x += p.vx * dt + Math.sin(p.age * 7) * 14 * dt; p.y += p.vy * dt; }
      else if (p.type === 'zzz') { p.x += p.vx * dt + Math.sin(p.age * 3.5) * 16 * dt; p.y += p.vy * dt; }
      else if (p.type === 'chunk') { p.vy += 150 * dt; p.vx *= 0.965; p.vy *= 0.975; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt; }
    }
    this.list = this.list.filter(p => p.age < p.life);

    for (const b of this.actionBubbles) { b.age += dt; b.y -= 22 * dt; }
    this.actionBubbles = this.actionBubbles.filter(b => b.age < b.life);
  },

  draw(ctx) {
    for (const p of this.list) {
      if (!Camera.isVisible(p.x, p.y)) continue;
      const [sx, sy] = Camera.toScreen(p.x, p.y);
      const t = p.age / p.life;
      ctx.globalAlpha = 1 - t;
      if (p.type === 'ripple') {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, p.r + t * 55, (p.r + t * 55) * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'drop') {
        ctx.fillStyle = '#bfe6ff';
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'sand') {
        ctx.fillStyle = '#d9c092';
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'bubble') {
        ctx.strokeStyle = 'rgba(220,240,255,0.85)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'wake') {
        ctx.strokeStyle = 'rgba(200,230,255,0.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, p.r + t * 18, 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color || '#fff';
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'sparkle') {
        // Vraie étoile à 4 branches effilées (losange concave). Dessinée en deux
        // traits croisés, elle ressemblait à un « + ».
        const r = p.r * (1 - t * 0.4), w = r * 0.22;
        ctx.fillStyle = '#fff6c9';
        ctx.beginPath();
        ctx.moveTo(sx, sy - r);
        ctx.quadraticCurveTo(sx + w, sy - w, sx + r, sy);
        ctx.quadraticCurveTo(sx + w, sy + w, sx, sy + r);
        ctx.quadraticCurveTo(sx - w, sy + w, sx - r, sy);
        ctx.quadraticCurveTo(sx - w, sy - w, sx, sy - r);
        ctx.fill();
      } else if (p.type === 'sweat') {
        ctx.fillStyle = 'rgba(150,215,255,0.9)';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 6);
        ctx.quadraticCurveTo(sx + 4.5, sy + 1, sx, sy + 5);
        ctx.quadraticCurveTo(sx - 4.5, sy + 1, sx, sy - 6);
        ctx.fill();
      } else if (p.type === 'anger') {
        // veine croisée façon manga
        ctx.strokeStyle = '#e0424f'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        const r = p.r * (1 + Math.sin(p.age * 22) * 0.12);
        for (const a of [0, Math.PI / 2]) {
          const c = Math.cos(a) * r, s2 = Math.sin(a) * r;
          ctx.beginPath();
          ctx.moveTo(sx - c, sy - s2); ctx.lineTo(sx + c, sy + s2);
          ctx.stroke();
        }
      } else if (p.type === 'spin') {
        ctx.strokeStyle = 'rgba(255,225,120,0.85)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sx, sy, p.r, p.r * 0.34, 0, p.age * 9, p.age * 9 + Math.PI * 1.5);
        ctx.stroke();
      } else if (p.type === 'stink') {
        ctx.fillStyle = `rgba(150,190,110,${0.35 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'chomp') {
        // éclair d'impact façon BD : étoile blanche qui se dilate
        const r = p.r * (0.4 + t * 1.5);
        ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t)})`;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2;
          const rr = r * (i % 2 ? 0.5 : 1);
          const px2 = sx + Math.cos(a) * rr, py2 = sy + Math.sin(a) * rr;
          i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
        }
        ctx.closePath(); ctx.fill();
      } else if (p.type === 'blow') {
        // Bien opaque : au-dessus de l'eau le panache se détache sur un ciel
        // clair, un blanc à 60 % y était quasi invisible.
        ctx.fillStyle = `rgba(255,255,255,${0.95 * (1 - t * 0.75)})`;
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(186,222,245,${0.55 * (1 - t)})`;
        ctx.lineWidth = 1.5; ctx.stroke();
      } else if (p.type === 'flash') {
        ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t)})`;
        ctx.beginPath(); ctx.arc(sx, sy, p.r * (0.4 + t * 1.1), 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'shock') {
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - t)})`;
        ctx.lineWidth = 4 * (1 - t) + 1;
        ctx.beginPath(); ctx.arc(sx, sy, p.r * (0.5 + t * 3.2), 0, Math.PI * 2); ctx.stroke();
      } else if (p.type === 'chunk') {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(30,45,60,0.55)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      } else if (p.type === 'zzz') {
        const g = 1 + t * 0.5;
        ctx.font = `italic bold ${Math.round(p.font * g)}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = p.font * 0.22; ctx.lineJoin = 'round';
        ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - t)})`;
        ctx.strokeText(p.texte, sx, sy);
        ctx.fillStyle = `rgba(96,132,170,${1 - t})`;
        ctx.fillText(p.texte, sx, sy);
      } else if (p.type === 'note') {
        ctx.fillStyle = `hsla(${p.hue}, 85%, 62%, ${1 - t})`;
        ctx.font = `bold ${Math.round(p.r * 2.4)}px "Segoe UI Symbol", "Segoe UI", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.note, sx, sy);
      } else if (p.type === 'heart') {
        const r = p.r * (1 + t * 0.3);
        ctx.fillStyle = `rgba(236,88,124,${0.95 * (1 - t)})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy + r * 0.85);
        ctx.bezierCurveTo(sx - r * 1.5, sy - r * 0.35, sx - r * 0.5, sy - r * 1.15, sx, sy - r * 0.35);
        ctx.bezierCurveTo(sx + r * 0.5, sy - r * 1.15, sx + r * 1.5, sy - r * 0.35, sx, sy + r * 0.85);
        ctx.fill();
      } else if (p.type === 'shout') {
        // traits de cri qui rayonnent, puis le mot par-dessus
        // pop élastique puis fondu : le cri claque, il ne s'installe pas
        const pop = Math.min(1, p.age * 11) * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, p.age * 4)));
        const R = p.r * (0.8 + t * 1.4) * pop;
        ctx.globalAlpha = 1;                       // le cri reste net jusqu'au bout
        const fade = Math.pow(1 - t, 0.6);
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * fade})`;
        ctx.lineWidth = (p.font || 34) * 0.13; ctx.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * Math.PI * 2 + p.age * 1.2;
          const l = i % 2 ? 1.75 : 1.35;           // traits inégaux, plus vivant
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(a) * R, sy + Math.sin(a) * R * 0.72);
          ctx.lineTo(sx + Math.cos(a) * R * l, sy + Math.sin(a) * R * l * 0.72);
          ctx.stroke();
        }
        ctx.font = `900 ${Math.round((p.font || 34) * pop)}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = (p.font || 34) * 0.22; ctx.strokeStyle = `rgba(255,255,255,${fade})`;
        ctx.strokeText(p.text, sx, sy);
        ctx.fillStyle = `rgba(24,40,60,${fade})`;
        ctx.fillText(p.text, sx, sy);
      } else if (p.type === 'scale') {
        ctx.save();
        ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // Bulles d'action comiques (langage BD partagé)
    for (const b of this.actionBubbles) {
      if (!Camera.isVisible(b.x, b.y)) continue;
      const [sx, sy] = Camera.toScreen(b.x, b.y);
      const t = b.age / b.life;
      // "pop" élastique : la bulle dépasse sa taille puis se stabilise
      const g = Math.min(1, b.age * 6);
      const pop = g * (1 + 0.35 * Math.sin(Math.PI * g)) * (1 - t * 0.15);
      const R = 19 * pop;
      ctx.globalAlpha = (1 - t) * 0.96;
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.strokeStyle = 'rgba(40,60,80,0.25)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // petite queue de bulle vers l'émetteur
      ctx.beginPath();
      ctx.arc(sx - R * 0.55, sy + R * 0.75, R * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e05a7a';
      ctx.font = `bold ${Math.round(21 * pop)}px "Segoe UI Emoji", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.symbol, sx, sy + 1);
      ctx.globalAlpha = 1;
    }
  },
};
