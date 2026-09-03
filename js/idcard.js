// Fiche d'identité d'une créature, affichée au survol quand le bouton 🔍 est actif.
// Reprend les champs des fiches du GDD §12 : zone, liberté, niveau trophique,
// nourriture favorite, régime, plus l'état vivant de l'individu (faim, stade).

const IdCard = {
  MOVEMENT_LABEL: {
    fixed: 'Fixe (ancré)', anchored: 'Restreint (territoire)', strata: 'Restreint à une strate',
    wideband: 'Libre en largeur', free: 'Libre partout', crawl: 'Rampe sur le fond',
    drift: 'Dérive passive',
  },

  trophicLabel(def) {
    if (def.refuge) return 'Décor vivant (refuge)';
    if (def.trophic === 'scavenger') return 'Charognard';
    return { 1: '1 · Filtreur', 2: '2 · Herbivore', 3: '3 · Prédateur moyen', 4: '4 · Grand prédateur' }[def.trophic] ?? '—';
  },

  // Qui le mange ? (déduit de la table des proies : la chaîne reste cohérente
  // même quand on ajoute une espèce, rien à ressaisir à la main)
  predatorsOf(speciesId) {
    return Object.values(SPECIES)
      .filter(d => d.prey && d.prey.includes(speciesId))
      .map(d => d.name);
  },

  dietOf(def) {
    const parts = [];
    if (def.prey) parts.push(def.prey.map(p => SPECIES[p].name).join(', '));
    if (def.eatsBones) parts.push('arêtes (charogne)');
    if (def.eatsFood && !def.prey) parts.push('graines / plancton');
    return parts.length ? parts.join(' · ') : '—';
  },

  draw(ctx, e) {
    const def = e.def;
    const pad = 12, W = 264, LH = 17;

    const rows = [
      ['Zone', World.zoneAt(e.y).label + ` · ${Math.round((e.y - CONFIG.SURFACE_Y) / CONFIG.PX_PER_METER)} m`],
      ['Déplacement', this.MOVEMENT_LABEL[def.movement] ?? def.movement],
      ['Niveau', this.trophicLabel(def)],
      ['Mange', this.dietOf(def)],
      ['Favori ⭐', def.favoriteFood ? FOOD_TYPES[def.favoriteFood].label : '—'],
      ['Mangé par', this.predatorsOf(e.speciesId).join(', ') || 'personne'],
      ['État', this.stateLabel(e)],
    ];

    // Position écran de la créature (le contexte HUD est en px CSS, pas zoomé)
    const cx = (e.x - Camera.x) * Camera.zoom;
    const cy = (e.y - Camera.y) * Camera.zoom;
    const H = pad * 2 + 36 + rows.length * LH + 14;
    let bx = cx + 26, by = cy - H / 2;
    if (bx + W > Camera.vw - 8) bx = cx - W - 26;
    by = U.clamp(by, 8, Camera.vh - H - 8);

    // Trait de rattachement à la créature
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx < cx ? bx + W : bx, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();

    // Cadre
    ctx.fillStyle = 'rgba(8,26,44,0.92)';
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 1.5;
    this.roundRect(ctx, bx, by, W, H, 10);
    ctx.fill(); ctx.stroke();

    // Titre
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffd75e';
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(def.name, bx + pad, by + pad);
    if (e.stage !== 'adult') {
      ctx.fillStyle = '#8fd8f5'; ctx.font = '12px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(e.stage === 'fry' ? '(alevin)' : '(œuf)', bx + pad + ctx.measureText(def.name).width + 8, by + pad + 3);
    }
    // Vraie espèce, en sous-titre
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = 'italic 11.5px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(def.realName || '', bx + pad, by + pad + 19);

    // Lignes
    let y = by + pad + 40;
    ctx.font = '12px "Segoe UI", system-ui, sans-serif';
    for (const [k, v] of rows) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(k, bx + pad, y);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      this.fitText(ctx, v, bx + pad + 84, y, W - pad * 2 - 84);
      y += LH;
    }

    // Jauge de faim (0 = repu à gauche, 1 = affamé à droite)
    const gw = W - pad * 2, gy = y + 4;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.roundRect(ctx, bx + pad, gy, gw, 6, 3); ctx.fill();
    ctx.fillStyle = e.hunger > 0.7 ? '#ff7a6b' : (e.hunger > 0.4 ? '#ffc75e' : '#7fe08a');
    this.roundRect(ctx, bx + pad, gy, gw * (1 - e.hunger), 6, 3); ctx.fill();
  },

  stateLabel(e) {
    if (e.stage === 'egg') return 'œuf en incubation';
    const s = {
      hunt: 'en chasse 🎯', flee: 'en fuite 😱', sleep: 'endormi 💤', dizzy: 'sonné ⭐',
      seekFood: 'va manger', strike: 'à l\'affût', wander: 'tranquille',
      court: 'cherche un partenaire ❤',
      migrate: 'en route vers la frayère 🥚',
      retract: 'se rétracte dans son trou',
    }[e.state] ?? e.state;
    return e.wellFed >= 0.6 ? s + ' · prêt à se reproduire ❤' : s;
  },

  // Tronque proprement si le texte dépasse
  fitText(ctx, txt, x, y, max) {
    let t = String(txt);
    if (ctx.measureText(t).width > max) {
      while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
      t += '…';
    }
    ctx.fillText(t, x, y);
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
