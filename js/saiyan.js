// LE REQUIN SUPER SAÏYEN — le régulateur du surnombre (idée de l'auteur).
//
// Nourrir fait proliférer : chaque espèce peut doubler son plafond (boom), et
// rien ne plafonnait l'aquarium ENTIER. Mesuré en nourrissant sans arrêt les
// espèces de bas de chaîne : 576 → 1 223 créatures, et la simulation seule de
// 11 à 55 ms par frame — le petit PC était au bout du rouleau. Faire proliférer
// est drôle et doit rester permis (GDD §9 : on ne punit jamais le joueur) ;
// c'est le RETOUR à l'équilibre qui devient une scène.
//
// Quand une espèce dépasse franchement son plafond normal, ou que l'aquarium
// entier déborde, un Requin se transforme : il se ramasse comme un ressort,
// s'entoure d'une aura dorée, hurle « SUPER ! », puis il PEUT TOUT FAIRE —
// toutes les profondeurs, toutes les zones, tous les menus. Il gobe ce qui est
// en trop, et SEULEMENT ce qui est en trop : une espèce ne descend jamais sous
// son plafond normal à cause de lui. Puis il s'épuise et redevient un requin.
//
// Deux niveaux, parce que le gag ne suffit pas à protéger la machine : le
// requin peut être lent à traverser 8 000 px pendant que le joueur continue de
// nourrir. `Ecosystem.BUDGET` refuse donc toute ponte au-delà d'un total dur
// (cf. `layEgg`) — le filet de sécurité, invisible ; le Saïyen est la scène.
//
// Comme la saisie (saisie.js), la créature sort de la simulation le temps de la
// scène : `Entity.update` appelle `Saiyan.pilote` et rend la main.

const Saiyan = {
  // Seuils, en multiples du plafond NORMAL de l'espèce (`baseCap`, sans boom).
  DECLENCHE: 1.5,       // une espèce à 1,5× son plafond : il se transforme
  SURPLUS: 1.0,         // il mange tant qu'elle est au-dessus de son plafond normal
  FIN: 1.12,            // il s'arrête quand plus aucune n'est au-dessus de 1,12×
  // L'aquarium entier : la population normale tourne autour de 580 à 670.
  TOTAL_DECLENCHE: 760,
  TOTAL_FIN: 700,
  VITESSE: 620,         // px/s — il traverse le monde en une douzaine de secondes
  DUREE_MAX: 100,       // s de chasse, puis il s'épuise quoi qu'il arrive
  REPOS: 40,            // s entre deux transformations
  T_TRANSFO: 2.2,
  T_FIN: 2.6,
  OR: '#ffd84a',

  actif: null,          // le requin transformé (un seul à la fois)
  _cd: 0,
  _tic: 0,

  // Appelé à chaque frame par `Ecosystem.update`.
  update(dt) {
    if (this.actif && (this.actif.dead || !this.actif._saiyan)) this.actif = null;
    if (this.actif) return;
    if (this._cd > 0) { this._cd -= dt; return; }
    this._tic -= dt;
    if (this._tic > 0) return;
    this._tic = 1;                               // une fois par seconde suffit
    const cible = this.especeEnTrop(this.DECLENCHE);
    if (!cible && Ecosystem.total < this.TOTAL_DECLENCHE) return;
    this.transformer(cible || this.especeEnTrop(this.SURPLUS));
  },

  // L'espèce la plus en surnombre au-dessus de `seuil` × son plafond normal.
  especeEnTrop(seuil) {
    let best = null, bestR = seuil;
    for (const id in Ecosystem.counts) {
      if (id === 'requin') continue;
      const r = Ecosystem.counts[id] / Math.max(1, Ecosystem.baseCap(SPECIES[id]));
      if (r > bestR) { bestR = r; best = id; }
    }
    return best;
  },

  enTrop(id) {
    return id !== 'requin'
      && (Ecosystem.counts[id] || 0) > Ecosystem.baseCap(SPECIES[id]) * this.SURPLUS;
  },

  // Le requin le plus proche du surnombre. S'il n'y en a plus un seul, il en
  // arrive un du large — le surnombre ne doit pas dépendre du hasard des morts.
  transformer(id) {
    let lieu = null;
    if (id) {
      const l = Ecosystem.bySpecies[id] || [];
      if (l.length) lieu = l[(l.length / 2) | 0];
    }
    let requins = (Ecosystem.bySpecies.requin || []).filter(e => !e.dead && e.stage === 'adult');
    if (!requins.length) { Ecosystem.spawnGroups('requin', 1); return; }   // il sera là au prochain tic
    let r = requins[0];
    if (lieu) {
      let d = Infinity;
      for (const e of requins) {
        const dd = U.dist2(e.x, e.y, lieu.x, lieu.y);
        if (dd < d) { d = dd; r = e; }
      }
    }
    // On le reprend à tout ce qu'il faisait : galipette, crash, saisie, chasse.
    if (r._saisi || r._lache) return;
    r.state = 'wander'; r.target = null; r._attendRepas = null; r._faceAt = null;
    r._crispe = 0; r._etire = 0; r._smear = 0;
    r._saiyan = { ph: 'transfo', t: 0, mange: 0, k: 0, cible: null, vise: 0 };
    this.actif = r;
  },

  // Pilote le requin transformé. Renvoie true : `Entity.update` n'a plus rien à faire.
  pilote(e, dt, t) {
    dt = Math.min(dt, 0.05);
    const S = e._saiyan, s = e.size;
    S.t += dt;
    e.hunger = 0;                                // il a TOUJOURS faim, et toujours de quoi
    if (e._chew > 0) e._chew -= dt;
    if (e.exprTimer > 0) { e.exprTimer -= dt; if (e.exprTimer <= 0) e.expression = 'idle'; }

    if (S.ph === 'transfo') {
      // Le ressort qui se comprime, et l'aura qui monte avec lui.
      const u = Math.min(1, S.t / this.T_TRANSFO);
      e.vx *= 1 - Math.min(1, dt * 6); e.vy *= 1 - Math.min(1, dt * 6);
      e._crispe = u < 0.75 ? Math.min(0.9, u / 0.75) : 0;
      S.k = Math.min(1, u * 1.4);
      e.hold('angry');
      if (u >= 0.75 && !S.cri) {
        S.cri = true;
        e._crispe = 0;
        Particles.shout(e.x, e.y - s * 1.3, 'SUPER !', this.OR, 34);
        Particles.burst(e.x, e.y, this.OR, 14);
        // L'onde de choc : tout ce qui est petit autour détale.
        for (const o of Ecosystem.neighbors(e.x, e.y)) {
          if (o === e || o.dead || o.stage === 'egg' || o.def.size >= 70) continue;
          o.state = 'flee'; o.target = e; o.stateTimer = 1.6;
        }
      }
      if (u >= 1) { S.ph = 'chasse'; S.t = 0; }
      this.bouger(e, dt);
      return true;
    }

    if (S.ph === 'chasse') {
      S.k = 1;
      e.hold('angry');
      // Cible : la créature d'une espèce en trop la plus proche. Revue quatre
      // fois par seconde, ou dès que la sienne n'existe plus.
      S.vise -= dt;
      if (!S.cible || S.cible.dead || S.vise <= 0 || !this.enTrop(S.cible.speciesId)) {
        S.cible = this.plusProche(e); S.vise = 0.25;
      }
      const fini = !this.especeEnTrop(this.FIN) && Ecosystem.total < this.TOTAL_FIN;
      if (!S.cible || fini || S.t > this.DUREE_MAX) {
        S.ph = 'fin'; S.t = 0; e._smear = 0; e._faceAt = null;
        this.bouger(e, dt);
        return true;
      }
      const c = S.cible;
      const dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy) || 1;
      // Il ralentit en arrivant, sinon il dépasse et tourne autour comme une mouche.
      const v = this.VITESSE * Math.min(1, 0.35 + d / 260);
      const k = Math.min(1, dt * 7);
      e.vx += (dx / d * v - e.vx) * k;
      e.vy += (dy / d * v - e.vy) * k;
      e._faceAt = c;                             // vise sans la patience des colosses
      e._smear = Math.hypot(e.vx, e.vy) > 300 ? 0.6 : 0;
      if (d < s * 0.9 + c.size) this.gober(e, c);
      this.bouger(e, dt);
      return true;
    }

    // FIN : l'aura retombe, il est vidé.
    const u = Math.min(1, S.t / this.T_FIN);
    S.k = 1 - u;
    e.vx *= 1 - Math.min(1, dt * 2.5); e.vy *= 1 - Math.min(1, dt * 2.5);
    if (!S.souffle) {
      S.souffle = true;
      e.release(); e.emote('dizzy', this.T_FIN + 0.5);
      if (S.mange > 0) Particles.comic(e.x, e.y - s * 1.2, '💨');
    }
    this.bouger(e, dt);
    if (u >= 1) this.finir(e);
    return true;
  },

  plusProche(e) {
    let best = null, bd = Infinity;
    for (const id in Ecosystem.bySpecies) {
      if (!this.enTrop(id)) continue;
      for (const o of Ecosystem.bySpecies[id]) {
        if (o.dead || o._saisi || o._lache || o._agonie != null) continue;
        const d = U.dist2(e.x, e.y, o.x, o.y);
        if (d < bd) { bd = d; best = o; }
      }
    }
    // `bySpecies` n'indexe pas les œufs : ils comptent pourtant dans
    // l'effectif. Un banc gavé, c'est d'abord une ponte — il les gobe aussi.
    for (const o of Ecosystem.entities) {
      if (o.stage !== 'egg' || o.dead || !this.enTrop(o.speciesId)) continue;
      const d = U.dist2(e.x, e.y, o.x, o.y);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  },

  // Il GOBE : pas d'agonie, pas de mastication de 0,55 s, pas de gras. Passer
  // par `Ecosystem.eat` le ferait grossir à chaque bouchée et exploser au
  // trentième poisson (`TAILLE_EXPLOSION`) — très drôle, une fois.
  gober(e, c) {
    const S = e._saiyan;
    S.mange++;
    // Le compte suit la bouchée : `counts` n'est reconstruit qu'à la frame
    // suivante, et il dévorerait sinon un banc entier en une frame.
    if (Ecosystem.counts[c.speciesId]) Ecosystem.counts[c.speciesId]--;
    Ecosystem.total--;
    c.dead = true;
    // Dans un banc gavé il gobe jusqu'à neuf poissons par seconde : un éclat
    // par bouchée en empilait une colonne. Un tous les 0,4 s suffit à dire
    // « il mange », c'est le banc qui fond qui raconte le reste.
    if (Main.time - (S.dernierChomp ?? -1) > 0.4) {
      S.dernierChomp = Main.time;
      Particles.chomp(c.x, c.y, c.size, c.color);
    }
    e._chew = 0.15;
    e._chewPrey = { color: c.color, size: c.size, tail: c.def.tail || 'fan' };
    e.emote('eating', 0.3, false);
    S.cible = null;
  },

  // N'importe où dans l'EAU : il peut tout faire, sauf s'envoler.
  bouger(e, dt) {
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.speedNow = Math.hypot(e.vx, e.vy);
    const W = CONFIG.WORLD_WIDTH;
    e.x = U.clamp(e.x, World.shoreX + 120, W - 60);
    const haut = CONFIG.SURFACE_Y + e.size * 0.6;
    const bas = Math.max(haut, World.floorY(e.x) - e.size * 0.6);
    if (e.y < haut) { e.y = haut; e.vy = Math.max(0, e.vy); }
    if (e.y > bas) { e.y = bas; e.vy = Math.min(0, e.vy); }
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) {   // jamais de NaN en sauvegarde
      e.x = World.shoreX + 2000; e.y = CONFIG.SURFACE_Y + 600; e.vx = e.vy = 0;
    }
  },

  finir(e) {
    e._saiyan = null; e._crispe = 0; e._etire = 0; e._smear = 0; e._faceAt = null;
    e.state = 'wander'; e.target = null;
    this.actif = null;
    this._cd = this.REPOS;
  },

  // --- Rendu, dans le repère du CORPS (après miroir et inclinaison) --------

  // L'aura, DERRIÈRE le corps : un halo doré qui pulse et des flammes qui
  // montent. Elle suit le corps, donc l'inclinaison ; les flammes visent le
  // haut du dessin, pas le haut de l'écran — à 0,32 rad d'inclinaison au plus,
  // la différence ne se lit pas.
  aura(ctx, e, t) {
    const S = e._saiyan, k = S ? S.k : 0;
    if (k <= 0.01) return;
    const s = e.size * (e.def.spanRatio || 1);
    FishBody.halo(ctx, 0, 0, s * 1.9 * (1 + 0.07 * Math.sin(t * 13)), this.OR, 0.6 * k);
    ctx.save();
    ctx.globalAlpha *= 0.55 * k;
    const N = 9;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1) * 2 - 1;                       // -1 queue … +1 museau
      const bx = u * s * 1.05, by = -Math.sqrt(Math.max(0, 1 - u * u)) * s * 0.42;
      const flamme = s * (0.55 + 0.35 * Math.sin(t * 17 + i * 2.3)) * (1 - 0.35 * Math.abs(u));
      ctx.fillStyle = i % 2 ? '#ffe680' : this.OR;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.16, by + s * 0.1);
      ctx.quadraticCurveTo(bx - s * 0.05, by - flamme * 0.6, bx + Math.sin(t * 9 + i) * s * 0.08, by - flamme);
      ctx.quadraticCurveTo(bx + s * 0.05, by - flamme * 0.6, bx + s * 0.16, by + s * 0.1);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // La crête : les cheveux dressés, dorés, sur le crâne. C'est le signe qu'on
  // reconnaît du premier coup d'œil, avant même l'aura.
  crete(ctx, e, t) {
    const S = e._saiyan, k = S ? S.k : 0;
    if (k <= 0.01) return;
    // Posée sur le CRÂNE : juste derrière l'œil du dessin quand il en a un.
    // Centrée sur le corps, elle se lisait comme une couronne posée sur le dos.
    let hx = e.size * 0.45, hy = -e.size * 0.3;
    const sp = e.def.sprite && Sprites.get(e.def.sprite);
    if (sp && sp.oeil) {
      const ks = FishBody.echelleSprite(sp, e);
      hx = (sp.oeil.x - sp.cx) * ks - e.size * 0.12;
      hy = (sp.oeil.y - sp.cy) * ks - e.size * 0.16;
    }
    const s = e.size * 0.55;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, k * 1.5);
    ctx.translate(hx, hy);
    ctx.fillStyle = this.OR; ctx.strokeStyle = '#a8740f'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.lineJoin = 'round';
    // Des mèches couchées vers l'ARRIÈRE : c'est l'inclinaison qui dit « coiffé
    // par la vitesse », un éventail droit faisait diadème.
    ctx.beginPath();
    const pics = [[-0.95, -0.55], [-0.6, -0.85], [-0.22, -0.8], [0.12, -0.6]];
    ctx.moveTo(-s * 0.9, s * 0.08);
    for (const [px, py] of pics) {
      const vib = Math.sin(t * 21 + px * 9) * s * 0.03;
      ctx.lineTo(px * s + s * 0.18, py * s * 0.4 + vib);
      ctx.lineTo(px * s + vib, py * s);
    }
    ctx.lineTo(s * 0.35, s * 0.05);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  },
};
