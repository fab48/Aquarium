// Rendu cartoon procédural — SOCLE COMMUN yeux/bouche partagé par toutes les
// espèces (demande design : design cartoon, yeux/bouche communs pour l'animation).
// Chaque espèce = silhouette (corps/queue) + le même système d'expression.
//
// expression: 'idle' | 'happy' | 'eating' | 'sleeping' | 'dizzy' | 'scared' | 'blush'

const FishBody = {

  // --- Yeux, SOURCILS et bouche communs ---------------------------------------
  // Socle partagé par toutes les espèces (yeux/bouche communs, cf. design).
  // Chaque émotion est un jeu de paramètres, amplifié par `k` (0→1) pour que
  // l'expression se JOUE dans la durée au lieu de claquer d'un coup.
  //
  // Raccourci depuis une silhouette : FishBody.face(ctx, taille, entité, t)
  // NIVEAU DE DÉTAIL. `drawFace` trace une vingtaine de chemins — œil, blanc,
  // pupille, reflet, paupière, sourcil, bouche, lèvres, dents, langue, joues.
  // C'est ce qui fait tout le charme de l'aquarium… tant qu'on le voit. Sur un
  // Confetti de 14 px vu à un zoom de 0,8, l'œil entier fait 2,5 px de rayon et
  // le sourcil est sous-pixel : on paye vingt chemins pour trois pixels.
  //
  // Sous le seuil, on ne garde donc que ce qui reste LISIBLE à cette taille :
  // l'œil, et le fait qu'il soit ouvert ou fermé. C'est invisible par
  // construction — on ne supprime que ce qui ne se voyait déjà pas — et ça
  // dépend du zoom, donc s'approcher rend le détail immédiatement.
  //
  // Le seuil porte sur l'œil, pas sur le corps : c'est lui la plus petite
  // pièce qui compte.
  face(ctx, size, e, t) {
    const v = this.visageDe(e);
    if (size * Camera.zoom < 10) { this.faceMinimale(ctx, size, e, t, v.pal); return; }
    this.drawFace(ctx, size, e.expression, t + (e.phase || 0),
                  e.emoteK ? e.emoteK() : 1, e._eyeLook, false, v.pal, v.style);
  },

  faceMinimale(ctx, size, e, t, pal) {
    const V = pal || this.VISAGE;
    const em = this.EMOTIONS[e.expression] || this.EMOTIONS.idle;
    const x = size * 0.55, y = -size * 0.18, r = Math.max(1.6, size * 0.22);
    // Yeux clos : un trait. C'est la seule information du visage qui survive à
    // cette taille, et c'est celle qui compte — un aquarium endormi doit se
    // lire de loin.
    if (em.lid > 0.85) {
      ctx.strokeStyle = V.encre;
      ctx.lineWidth = Math.max(1, size * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.9, y); ctx.lineTo(x + r * 0.9, y);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = V.blanc;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = V.pupille;
    ctx.beginPath(); ctx.arc(x + r * 0.18, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  },

  // Table des émotions. tout est relatif à la taille du visage.
  EMOTIONS: {
    //            œilX œilY pupille regard paupière | sourcilAngle lift | bouche  rougeur
    idle:      { sx: 1,    sy: 1,   pu: .5,  look: .3, lid: 0,  ba: -.05, bl: .28, mouth: 'neutre', blush: 0 },
    happy:     { sx: 1.05, sy: .95, pu: .58, look: .35, lid: 0, ba: -.42, bl: .62, mouth: 'sourire', blush: .3 },
    love:      { sx: 1.15, sy: 1.1, pu: .66, look: .3, lid: 0,  ba: -.5,  bl: .66, mouth: 'sourire', blush: .75 },
    eating:    { sx: .95,  sy: .9,  pu: .55, look: .4, lid: .2, ba: -.3,  bl: .4,  mouth: 'gloutonne', blush: .1 },
    sleeping:  { sx: 1,    sy: 1,   pu: .5,  look: 0,  lid: 1,  ba: .05,  bl: .18, mouth: 'ronfle', blush: 0 },
    dizzy:     { sx: 1.15, sy: 1.15, pu: .5, look: 0,  lid: 0,  ba: -.55, bl: .7,  mouth: 'ondulee', blush: .15 },
    scared:    { sx: 1.45, sy: 1.5, pu: .26, look: .15, lid: 0, ba: -.75, bl: .8,  mouth: 'cri', blush: 0 },
    blush:     { sx: .95,  sy: .8,  pu: .5,  look: -.4, lid: .3, ba: -.55, bl: .6, mouth: 'timide', blush: 1 },
    angry:     { sx: 1.1,  sy: .78, pu: .42, look: .5, lid: .15, ba: .8,  bl: .12, mouth: 'grogne', blush: 0 },
    proud:     { sx: 1,    sy: .7,  pu: .5,  look: .45, lid: .35, ba: -.2, bl: .5, mouth: 'sourire', blush: 0 },
    ashamed:   { sx: .9,   sy: .75, pu: .45, look: -.5, lid: .4, ba: .35, bl: .22, mouth: 'timide', blush: 1 },
    // Fou rire : yeux plissés fermés, bouche grande ouverte, sourcils qui gigotent
    laughing:  { sx: 1.1,  sy: .95, pu: .5,  look: .3, lid: 1,  ba: -.5,  bl: .75, mouth: 'rire', blush: .45, wiggle: 1 },
    // Bisou : yeux fermés, lèvres en avant
    kiss:      { sx: .95,  sy: .8,  pu: .5,  look: .3, lid: 1,  ba: -.45, bl: .6, mouth: 'bisou', blush: .8 },
    // Écœuré : le smiley malade — joues VERTES, grand sourire à l'envers,
    // sourcils très froncés. C'est le visage qui dit « berk », pas une bulle.
    disgust:   { sx: .8,   sy: .55, pu: .38, look: -.5, lid: .5, ba: .95, bl: .1,
                 mouth: 'berk', blush: 1, cheek: '110,175,90', vert: 1 },
    // Surprise : œil énorme tout rond, sourcils au plafond
    surprise:  { sx: 1.5,  sy: 1.5, pu: .32, look: .25, lid: 0, ba: -.15, bl: .95, mouth: 'o', blush: 0 },
    // Clin d'œil complice
    wink:      { sx: 1,    sy: .9,  pu: .55, look: .35, lid: 1, ba: -.4,  bl: .6, mouth: 'sourire', blush: .3 },
    // Tristesse : sourcils en accent circonflexe inversé, bouche tombante
    sad:       { sx: 1.05, sy: 1.1, pu: .6,  look: -.2, lid: .15, ba: -.75, bl: .35, mouth: 'triste', blush: 0 },
    // Air malin (l'orque qui feinte)
    smug:      { sx: .95,  sy: .62, pu: .45, look: .5, lid: .42, ba: .3,  bl: .45, mouth: 'malin', blush: 0 },
  },

  // --- PALETTE DU VISAGE ------------------------------------------------------
  // Tout ce que le visage commun peint passait par des couleurs EN DUR : l'encre
  // `#1c2733` du trait, la gorge `#5a2d3d`, la langue rose. Une direction
  // artistique qui veut un trait sépia, une pupille dorée ou un bec orange
  // n'avait aucune prise dessus — et repeindre la silhouette ne change rien,
  // puisque le visage est dessiné PAR-DESSUS.
  //
  // La table se surcharge PARTIELLEMENT : un dessin qui ne déclare que la
  // pupille garde le reste. Deux provenances, dans cet ordre — le document
  // (`visage:` du dessin, réglé dans l'atelier), puis la fiche d'espèce
  // (`def.visage`), pour une silhouette procédurale qui n'a pas de dessin.
  VISAGE: {
    encre:   '#1c2733',          // le trait : contour de bouche, œil fermé
    sourcil: '#1c2733',          // laisser vide dans une surcharge = suivre l'encre
    pupille: '#1c2733',
    blanc:   '#ffffff',          // blanc de l'œil
    eclat:   'rgba(255,255,255,.92)',
    gorge:   '#5a2d3d',          // l'intérieur, quand la bouche est ouverte
    langue:  '#ff8fa3',
    levres:  '#e8607f',          // bisou, ventouse
    dent:    '#ffffff',
    bec:     '#f0a83c',
    joue:    '255,110,135',      // en r,g,b : la rougeur est peinte en alpha
    // ÉPAISSEUR DU TRAIT, en multiples de l'épaisseur d'origine. La couleur du
    // trait se réglait déjà, pas son poids : un dessin au trait fin se
    // retrouvait avec un visage au gros feutre, et l'inverse sur un dessin
    // épais. Tous les traits du visage la suivent — bouche, sourcil, œil fermé,
    // contour du bec.
    trait:   1,
  },
  _palCache: new WeakMap(),
  // Palette effective. Mise en cache sur l'objet source : `drawFace` tourne
  // pour chaque créature de chaque frame, il n'a pas à refaire un Object.assign.
  palette(v) {
    if (!v) return this.VISAGE;
    let p = this._palCache.get(v);
    if (!p) {
      p = Object.assign({}, this.VISAGE, v);
      if (!p.sourcil) p.sourcil = p.encre;
      if (!p.pupille) p.pupille = p.encre;
      this._palCache.set(v, p);
    }
    return p;
  },
  // Palette + style de bouche d'une créature, dessin ou silhouette. Le dessin
  // prime : c'est lui qu'on vient de régler dans l'atelier.
  // Objet de travail réutilisé : `visageDe` est appelée pour chaque créature de
  // chaque frame (~690 à 51 espèces), et son résultat est consommé sur place.
  _vis: { pal: null, style: 'standard' },
  _stylesCache: new WeakMap(),
  visageDe(e) {
    const def = e.def;
    const sp = (def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(def.sprite) : null;
    const v = (sp && sp.visage) || def.visage || null;
    this._vis.pal = this.palette(v);
    const nom = (sp && sp.boucheStyle) || def.boucheStyle || 'standard';
    // Les réglages FINS d'une bouche (les mandibules d'un bec) viennent du
    // dessin et se mélangent à son style. On renvoie donc un style RÉSOLU plutôt
    // qu'un nom : `bouche()` accepte les deux, les dessins d'avant ne bougent pas.
    const bec = (sp && sp.bec) || def.bec || null;
    if (!bec) { this._vis.style = nom; return this._vis; }
    let st = this._stylesCache.get(bec);
    if (!st || st._nom !== nom) {
      st = Object.assign({ _nom: nom }, this.BOUCHES[nom] || this.BOUCHES.standard, bec);
      this._stylesCache.set(bec, st);
    }
    this._vis.style = st;
    return this._vis;
  },

  // --- STYLES DE BOUCHE -------------------------------------------------------
  // Le catalogue des bouches (`neutre`, `sourire`, `gloutonne`…) dit ce que la
  // créature EXPRIME ; le style dit à quoi ressemble sa bouche. Un pélican, une
  // murène et une crevette jouent les mêmes 18 émotions, mais pas avec la même
  // bouche — et jusqu'ici tout l'aquarium avait la même petite bouche de dessin
  // animé, bec et gueule à dents compris.
  //
  //   w / h   — la bouche standard, étirée autour de son ancre
  //   dents   — une rangée de dents en travers, dès qu'elle s'ouvre
  //   forme   — un tracé ENTIÈREMENT différent (bec, ventouse), qui rejoue les
  //             mêmes émotions via la table `GESTE`
  BOUCHES: {
    standard: { nom: 'Standard' },
    grande:   { nom: 'Grande bouche', w: 1.45, h: 1.35 },
    petite:   { nom: 'Petite bouche', w: 0.62, h: 0.62 },
    gueule:   { nom: 'Gueule à dents', w: 1.35, h: 1.2, dents: true },
    bec:      { nom: 'Bec', forme: 'bec' },
    ventouse: { nom: 'Ventouse', forme: 'ventouse' },
  },

  // Chaque bouche du catalogue, réduite à DEUX nombres : combien elle est
  // ouverte (`o`) et si elle sourit ou boude (`c`, de -1 à 1). C'est ce qui
  // permet à un bec ou à une ventouse de jouer les 18 émotions sans avoir à
  // redessiner les dix-huit bouches une à une pour chaque style.
  GESTE: {
    neutre:    { o: .06, c: 0 },
    sourire:   { o: .12, c: 1 },
    timide:    { o: .06, c: .6 },
    gloutonne: { o: 1,   c: .2, pulse: 16 },
    cri:       { o: .8,  c: -.3 },
    grogne:    { o: .28, c: -.8 },
    ondulee:   { o: .1,  c: 0 },
    rire:      { o: 1,   c: 1, pulse: 15 },
    bisou:     { o: .2,  c: .4 },
    berk:      { o: .5,  c: -1 },
    o:         { o: .55, c: 0 },
    triste:    { o: .08, c: -1 },
    malin:     { o: .1,  c: .7 },
    ronfle:    { o: .7,  c: 0, pulse: 1.7 },
  },
  geste(mouth, t) {
    const g = this.GESTE[mouth] || this.GESTE.neutre;
    const o = g.pulse ? g.o * (0.55 + 0.45 * (Math.sin(t * g.pulse) * 0.5 + 0.5)) : g.o;
    return { o, c: g.c };
  },

  // `eyeLook` : {x, y} en unités d'œil (-1..1). Quand le poisson est tranquille,
  // sa pupille suit le curseur — c'est ce qui donne l'impression qu'il vous voit.
  // ŒIL UNIQUE, piloté par la table des émotions. Les silhouettes dont les yeux
  // ne forment pas un visage groupé (crabe sur tiges, coquillage entre ses
  // valves) dessinaient les leurs à la main : ils restaient donc GRANDS OUVERTS
  // en toutes circonstances, y compris endormis. Elles passent par ici.
  oeil(ctx, x, y, r, e, t, pal) {
    const base = this.EMOTIONS.idle;
    const em = this.EMOTIONS[e.expression] || base;
    const k = U.clamp(e.emoteK ? e.emoteK() : 1, 0, 1);
    const lid = U.lerp(base.lid, em.lid, k);
    // La palette suit la créature : un œil isolé (crabe, coquillage) doit être
    // peint comme le reste de son visage, pas en noir d'usine.
    const P = pal || this.visageDe(e).pal;
    const clignote = Math.sin(t * 0.7 + x) > 0.975;

    if (lid > 0.85 || clignote) {                    // œil fermé
      const joyeux = e.expression === 'laughing' || e.expression === 'kiss';
      ctx.strokeStyle = P.encre;
      ctx.lineWidth = Math.max(0.5, r * 0.42 * (P.trait == null ? 1 : P.trait));
      ctx.beginPath();
      if (joyeux) ctx.arc(x, y + r * 0.4, r * 0.95, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(x, y, r * 0.9, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
      return;
    }
    const sx = U.lerp(base.sx, em.sx, k), sy = U.lerp(base.sy, em.sy, k);
    const look = U.lerp(base.look, em.look, k), pu = U.lerp(base.pu, em.pu, k);
    ctx.save();
    ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.fillStyle = P.blanc;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // la pupille suit le curseur au repos, comme pour les visages groupés
    const suivi = e._eyeLook ? (1 - k) : 0;
    const pr = r * pu;
    const px = r * U.lerp(look, e._eyeLook ? e._eyeLook.x : look, suivi);
    const py = r * U.lerp(0.05, e._eyeLook ? e._eyeLook.y : 0.05, suivi);
    ctx.fillStyle = P.pupille;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.eclat;
    ctx.beginPath(); ctx.arc(px - pr * 0.32, py - pr * 0.38, Math.max(0.5, pr * 0.34), 0, Math.PI * 2); ctx.fill();
    if (lid > 0.05) {                                 // paupière tombante
      ctx.fillStyle = P.encre;
      ctx.beginPath(); ctx.ellipse(0, -r * (1 - lid * 0.9), r * 1.05, r * lid * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  // BOUCHE ISOLÉE — même rôle que `oeil()` pour l'œil.
  // Elle était clouée à (0,82 · 0,12) fois la taille du visage. Un dessin fait
  // à la main place SA bouche où il veut (ancre `mouth` de l'éditeur) : chez le
  // requin elle est presque à la VERTICALE de l'œil, alors que le visage commun
  // la met en avant et à peine plus bas — elle atterrissait sur le museau.
  // `mx`/`my` sont donc passés par l'appelant.
  //
  // `style` choisit la FORME de la bouche (cf. `BOUCHES`) ; `mouth` reste ce
  // qu'elle EXPRIME. Les deux sont indépendants : un bec sait sourire.
  bouche(ctx, mx, my, size, mouth, t, pal, style) {
    const P = pal || this.VISAGE;
    const st = (style && typeof style === 'object') ? style
             : (this.BOUCHES[style] || this.BOUCHES.standard);
    if (st.forme === 'bec') return this.boucheBec(ctx, mx, my, size, mouth, t, P, st);
    if (st.forme === 'ventouse') return this.boucheVentouse(ctx, mx, my, size, mouth, t, P, st);
    const w = st.w || 1, h = st.h || 1;
    ctx.save();
    // L'étirement se fait AUTOUR de l'ancre : la bouche reste posée là où
    // l'artiste l'a mise, elle ne dérive pas quand on l'agrandit.
    if (w !== 1 || h !== 1) { ctx.translate(mx, my); ctx.scale(w, h); ctx.translate(-mx, -my); }
    this.boucheStandard(ctx, mx, my, size, mouth, t, P);
    if (st.dents) this.dentsBouche(ctx, mx, my, size, mouth, t, P);
    ctx.restore();
  },

  boucheStandard(ctx, mx, my, size, mouth, t, P) {
    const INK = P.encre;
    // `trait` : le poids du trait du visage, réglable. Un dessin fin héritait
    // d'une bouche au gros feutre, un dessin épais d'un fil.
    const lw = Math.max(0.5, size * 0.055 * (P.trait == null ? 1 : P.trait));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath();
  if (mouth === 'gloutonne') {
    const o = (Math.sin(t * 16) * 0.5 + 0.5) * size * 0.3 + size * 0.08;
    ctx.fillStyle = P.gorge;
    ctx.ellipse(mx, my, size * 0.15, o, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.langue;   // petite langue
    ctx.beginPath(); ctx.ellipse(mx, my + o * 0.45, size * 0.08, o * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'sourire') {
    ctx.lineWidth = lw * 1.2;
    ctx.arc(mx - size * 0.1, my - size * 0.06, size * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'timide') {
    ctx.arc(mx - size * 0.06, my - size * 0.02, size * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'cri') {
    ctx.fillStyle = P.gorge;
    ctx.ellipse(mx, my + size * 0.04, size * 0.11, size * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'grogne') {
    ctx.lineWidth = lw * 1.2;
    ctx.moveTo(mx - size * 0.16, my + size * 0.08);
    ctx.quadraticCurveTo(mx - size * 0.02, my - size * 0.06, mx + size * 0.12, my + size * 0.06);
    ctx.stroke();
    ctx.fillStyle = P.dent;    // canine
    ctx.beginPath();
    ctx.moveTo(mx - size * 0.02, my + size * 0.02);
    ctx.lineTo(mx + size * 0.07, my + size * 0.02);
    ctx.lineTo(mx + size * 0.025, my + size * 0.16);
    ctx.closePath(); ctx.fill();
  } else if (mouth === 'ondulee') {
    ctx.moveTo(mx - size * 0.16, my);
    for (let i = 1; i <= 4; i++) {
      ctx.quadraticCurveTo(mx - size * 0.16 + size * 0.04 * (i - 0.5), my + (i % 2 ? -1 : 1) * size * 0.07,
                           mx - size * 0.16 + size * 0.08 * i, my);
    }
    ctx.stroke();
  } else if (mouth === 'rire') {
    // grande bouche ouverte de rire, avec la langue, qui pulse au rythme des « ha »
    const o = size * (0.26 + 0.09 * Math.sin(t * 15));
    ctx.fillStyle = P.gorge;
    ctx.beginPath(); ctx.ellipse(mx - size * 0.04, my + size * 0.05, size * 0.19, o, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.langue;
    ctx.beginPath(); ctx.ellipse(mx - size * 0.04, my + o * 0.55, size * 0.1, o * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'bisou') {
    // lèvres pincées projetées en avant
    ctx.fillStyle = P.levres;
    ctx.beginPath();
    ctx.ellipse(mx + size * 0.14, my, size * 0.13, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.sombre(P.levres, 0.35);
    ctx.beginPath();
    ctx.ellipse(mx + size * 0.2, my, size * 0.05, size * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'berk') {
    // GRAND sourire inversé (arc franc vers le bas), et la langue qui pend
    ctx.lineWidth = lw * 1.5;
    ctx.arc(mx - size * 0.06, my + size * 0.26, size * 0.24, 1.12 * Math.PI, 1.88 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = this.sombre(P.langue, 0.12);
    ctx.beginPath();
    ctx.ellipse(mx - size * 0.06, my + size * 0.14, size * 0.08, size * 0.14, 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (mouth === 'o') {
    ctx.fillStyle = P.gorge;
    ctx.beginPath(); ctx.arc(mx, my + size * 0.03, size * 0.13, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'triste') {
    ctx.lineWidth = lw * 1.1;
    ctx.arc(mx - size * 0.06, my + size * 0.2, size * 0.16, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'malin') {
    // sourire en coin, relevé d'un seul côté
    ctx.lineWidth = lw * 1.2;
    ctx.moveTo(mx - size * 0.16, my + size * 0.04);
    ctx.quadraticCurveTo(mx, my + size * 0.1, mx + size * 0.14, my - size * 0.08);
    ctx.stroke();
  } else if (mouth === 'ronfle') {
    // Ronflement cartoon : cycle lent inspire/expire. La bouche s'ouvre en
    // grand puis se pince, et une bulle de morve gonfle sur le temps faible.
    const cycle = (Math.sin(t * 1.7) + 1) / 2;          // 0 = expire, 1 = inspire
    const o = size * (0.035 + cycle * 0.15);
    ctx.fillStyle = P.gorge;
    ctx.beginPath();
    ctx.ellipse(mx - size * 0.09, my + size * 0.03, size * (0.08 + cycle * 0.035), o, 0, 0, Math.PI * 2);
    ctx.fill();
    // lèvre du bas qui vibre
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(mx - size * 0.09, my + size * 0.03 + o * 0.8,
            size * 0.1, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.stroke();
    // bulle de morve, gonflée sur l'expiration
    const morve = Math.max(0, -Math.sin(t * 1.7));
    if (morve > 0.15) {
      ctx.fillStyle = `rgba(200,232,255,${0.45 + morve * 0.3})`;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, size * 0.03);
      ctx.beginPath();
      ctx.arc(mx + size * 0.1, my - size * 0.1, size * 0.085 * morve, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.beginPath();   // ne pas laisser de tracé en cours
  } else { // neutre
    ctx.moveTo(mx - size * 0.1, my);
    ctx.quadraticCurveTo(mx, my + size * 0.06, mx + size * 0.06, my);
    ctx.stroke();
  }

  },

  // Assombrir une couleur sans se soucier de son écriture. `U.mixColor` ne sait
  // lire que du « #rrggbb » : une palette peut très bien contenir un « rgba(…) ».
  sombre(c, k) {
    return (typeof c === 'string' && c[0] === '#' && c.length === 7)
      ? U.mixColor(c, '#000000', k) : c;
  },

  // Rangée de dents en travers d'une bouche ouverte (style `gueule`). Elle ne
  // sort que quand la bouche s'ouvre vraiment : posée sur une bouche fermée,
  // elle se lit comme une rayure blanche en travers du museau.
  dentsBouche(ctx, mx, my, size, mouth, t, P) {
    const g = this.geste(mouth, t);
    if (g.o < 0.3) return;
    const L = size * 0.34, h = size * 0.09 * Math.min(1, g.o);
    const haut = my - size * 0.16 * g.o;
    ctx.fillStyle = P.dent;
    ctx.beginPath();
    ctx.moveTo(mx - L / 2, haut);
    for (let i = 0; i < 4; i++) {
      const x0 = mx - L / 2 + (L / 4) * i;
      ctx.lineTo(x0 + L / 8, haut + h);
      ctx.lineTo(x0 + L / 4, haut);
    }
    ctx.closePath(); ctx.fill();
  },

  // BEC — pélican, goéland, cormoran. Deux mandibules articulées sur une
  // charnière ARRIÈRE : c'est l'angle d'ouverture qui joue l'émotion, lu dans
  // la table `GESTE`, si bien que le bec sait faire les dix-huit expressions
  // sans qu'on redessine quoi que ce soit.
  boucheBec(ctx, mx, my, size, mouth, t, P, st) {
    const g = this.geste(mouth, t);
    // LES DEUX MANDIBULES SE RÈGLENT À PART. Un bec n'est presque jamais
    // symétrique : le pélican a une mandibule inférieure énorme et une
    // supérieure fine, le goéland l'inverse, un bec de canard est plat des deux
    // côtés. Un seul réglage de « hauteur » les forçait à se ressembler.
    //   `haut` / `bas` — l'épaisseur de chaque mandibule, séparément
    //   `angle`        — l'orientation du bec sur le visage
    //   `ecart`        — le jour qui reste entre les deux, bec fermé
    //   `w` / `long`   — la longueur
    const L = size * 0.6 * (st.long || st.w || 1);
    const H = size * 0.17 * (st.h || 1);
    const hHaut = H * (st.haut == null ? 1 : st.haut);
    const hBas = H * (st.bas == null ? 1 : st.bas);
    const ecart = size * 0.02 * (st.ecart == null ? 1 : st.ecart);
    const trait = Math.max(0.4, size * 0.035 * (P.trait == null ? 1 : P.trait));
    const a = g.o * 0.5;                       // demi-angle d'ouverture
    ctx.save();
    ctx.translate(mx - L * 0.3, my);
    // L'orientation propre du bec, puis le relèvement du sourire.
    ctx.rotate((st.angle || 0) * Math.PI / 180 - g.c * 0.14);
    // La gorge, entre les deux mandibules : sans elle, un bec grand ouvert
    // laisse voir le corps au travers.
    if (g.o > 0.12) {
      ctx.fillStyle = P.gorge;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(L * 0.96, -Math.sin(a) * L * 0.9);
      ctx.lineTo(L * 0.96, Math.sin(a) * L * 0.9); ctx.closePath(); ctx.fill();
    }
    // s = -1 : mandibule SUPÉRIEURE (vers le haut) ; +1 : inférieure.
    for (const s of [-1, 1]) {
      const ep = s < 0 ? hHaut : hBas;
      if (ep <= 0.01) continue;                // mandibule supprimée : un cure-dent
      ctx.save();
      ctx.translate(0, s * ecart);             // l'écartement au repos
      ctx.rotate(s * a);
      ctx.fillStyle = s < 0 ? P.bec : this.sombre(P.bec, 0.18);
      ctx.beginPath();
      ctx.moveTo(0, s * ep * 0.1);
      ctx.quadraticCurveTo(L * 0.55, s * ep * 1.25, L, 0);
      ctx.quadraticCurveTo(L * 0.5, s * ep * 0.25, 0, s * ep * 0.1);
      ctx.closePath(); ctx.fill();
      if (trait > 0.05) {
        ctx.strokeStyle = P.encre; ctx.lineWidth = trait;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = P.encre;                   // narine
    ctx.beginPath();
    ctx.arc(L * 0.22, -hHaut * 0.45 - ecart - a * L * 0.2,
            Math.max(0.6, size * 0.035), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // VENTOUSE — nettoyeur, brouteur de corail, poisson qui suce la vitre. Une
  // couronne de lèvres et un trou qui s'ouvre : l'anneau reste, c'est le trou
  // qui joue l'émotion.
  boucheVentouse(ctx, mx, my, size, mouth, t, P, st) {
    const g = this.geste(mouth, t);
    const R = size * 0.2 * (st.w || 1);
    const r = R * (0.25 + 0.6 * g.o);
    ctx.save();
    ctx.translate(mx, my);
    ctx.scale(1, 1 - g.c * 0.12);              // la moue pince un peu la couronne
    ctx.fillStyle = P.levres;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.gorge;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // les plis de la ventouse : c'est ce qui la distingue d'un simple rond
    ctx.strokeStyle = this.sombre(P.levres, 0.3);
    ctx.lineWidth = Math.max(0.8, size * 0.025);
    for (let i = 0; i < 8; i++) {
      const A = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(A) * r, Math.sin(A) * r);
      ctx.lineTo(Math.cos(A) * R, Math.sin(A) * R);
      ctx.stroke();
    }
    ctx.strokeStyle = P.encre;
    ctx.lineWidth = Math.max(0.4, size * 0.03 * (P.trait == null ? 1 : P.trait));
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  drawFace(ctx, size, expression, t, k = 1, eyeLook = null, sansBouche = false,
           pal = null, style = null) {
    size = Math.max(1, size || 0);   // garde : un rayon négatif ferait planter arc()
    k = U.clamp(k == null ? 1 : k, 0, 1);
    const base = this.EMOTIONS.idle;
    const em = this.EMOTIONS[expression] || base;
    // interpolation depuis le visage neutre → l'émotion "monte" puis retombe
    const P = {};
    for (const key of ['sx', 'sy', 'pu', 'look', 'lid', 'ba', 'bl', 'blush']) {
      P[key] = U.lerp(base[key], em[key], k);
    }
    // Sourcils qui gigotent (fou rire) : c'est ce qui vend l'hilarité
    if (em.wiggle) {
      P.ba += Math.sin(t * 17) * 0.32 * k * em.wiggle;
      P.bl += Math.sin(t * 21 + 1) * 0.18 * k * em.wiggle;
    }
    const mouth = k > 0.35 ? em.mouth : base.mouth;

    // Palette : le trait du visage n'est plus forcément l'encre bleu nuit.
    const V = pal || this.VISAGE;
    const INK = V.encre;
    const ex = size * 0.55, ey = -size * 0.18;
    const er = Math.max(2.5, size * 0.22);
    const lw = Math.max(0.5, size * 0.055 * (V.trait == null ? 1 : V.trait));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // --- Teint verdâtre (nausée) : DERRIÈRE le visage, sinon il masque la bouche
    if (em.vert && k > 0.2) {
      ctx.fillStyle = `rgba(120,185,95,${0.4 * k})`;
      ctx.beginPath();
      ctx.ellipse(size * 0.45, -size * 0.02, size * 0.66, size * 0.54, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Œil ---
    const blink = Math.sin(t * 0.7 + size) > 0.975;
    const closed = P.lid > 0.85 || blink;
    if (expression === 'dizzy' && k > 0.4) {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, size * 0.05);
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const r = a / (Math.PI * 4) * er * 1.05;
        const px = ex + Math.cos(a + t * 8) * r, py = ey + Math.sin(a + t * 8) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (closed) {
      // Rire et bisou : œil plissé en ^ (joyeux). Sommeil : paupière en ⌣.
      const joyeux = expression === 'laughing' || expression === 'kiss';
      ctx.strokeStyle = INK; ctx.lineWidth = lw * (joyeux ? 1.3 : 1);
      ctx.beginPath();
      if (joyeux) ctx.arc(ex, ey + er * 0.4, er * 0.95, 1.15 * Math.PI, 1.85 * Math.PI);
      else ctx.arc(ex, ey, er * 0.85, 0.12 * Math.PI, 0.88 * Math.PI);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(ex, ey); ctx.scale(P.sx, P.sy);
      ctx.fillStyle = V.blanc;
      ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
      const pr = er * P.pu;
      // Le regard vers le curseur ne s'applique qu'au repos : une émotion forte
      // impose sa propre direction de regard.
      const suivi = eyeLook ? (1 - k) : 0;
      const px = er * U.lerp(P.look, eyeLook ? eyeLook.x : P.look, suivi);
      const py = er * U.lerp(0.05, eyeLook ? eyeLook.y : 0.05, suivi);
      ctx.fillStyle = V.pupille;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = V.eclat;
      ctx.beginPath(); ctx.arc(px - pr * 0.32, py - pr * 0.38, Math.max(0.6, pr * 0.34), 0, Math.PI * 2); ctx.fill();
      // paupière tombante (fatigue, gourmandise, fierté)
      if (P.lid > 0.05) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.ellipse(0, -er * (1 - P.lid * 0.85), er * 1.02, er * P.lid * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // --- SOURCIL : c'est lui qui porte l'essentiel de l'émotion ---
    ctx.strokeStyle = V.sourcil;
    ctx.lineWidth = Math.max(0.6, size * 0.075 * (V.trait == null ? 1 : V.trait));
    ctx.save();
    ctx.translate(ex, ey - er * (1.05 + P.bl));
    ctx.rotate(P.ba);
    ctx.beginPath();
    ctx.moveTo(-er * 0.95, er * 0.12);
    ctx.quadraticCurveTo(0, -er * 0.3, er * 0.95, er * 0.02);
    ctx.stroke();
    ctx.restore();

    // --- Bouche (extraite : un sprite la pose sur SON ancre, cf. `bouche()`) ---
    if (!sansBouche) this.bouche(ctx, size * 0.82, size * 0.12, size, mouth, t, V, style);
    // --- Joues (rougeur, ou teint verdâtre quand il est écœuré) ---
    if (P.blush > 0.05) {
      const teinte = em.cheek || V.joue;
      ctx.fillStyle = `rgba(${teinte},${0.6 * P.blush})`;
      ctx.beginPath(); ctx.ellipse(size * 0.42, size * 0.12, size * 0.19, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- Sprites vectoriels (éditeur SVG) ---------------------------------------
  // Une espèce qui déclare `sprite:` remplace sa silhouette procédurale par le
  // dessin de l'éditeur — MAIS elle garde le système commun yeux / sourcils /
  // bouche par-dessus. C'est la règle du projet : la direction artistique peut
  // changer entièrement, les émotions restent celles de tout l'aquarium.
  // --- Couleur d'une forme, INDIVIDU PAR INDIVIDU ------------------------------
  // Les silhouettes procédurales tirent déjà leur teinte au hasard dans
  // `def.colors` (`Entity.color`) : c'est ce qui fait chatoyer le banc de
  // confettis, et c'est la seule raison pour laquelle quarante poissons du même
  // banc ne se lisent pas comme quarante copies. Un dessin fait main n'avait
  // rien de tel — une seule couleur par forme, donc un banc monochrome.
  //
  // Cinq modes, tous DÉTERMINISTES : l'individu garde sa couleur toute sa vie,
  // et deux frames de suite donnent la même. Le résultat est mis en cache sur
  // l'entité, exactement comme `Entity.color` l'est déjà.
  //   fixe          — la couleur du dessin (défaut)
  //   espece        — celle que l'individu a tirée dans `def.colors`
  //   especeSombre  — sa version foncée (`Entity.colorDark`)
  //   palette       — un tirage dans une liste propre à la forme
  //   teinte        — la couleur du dessin, teinte décalée de ±`amplitude`°
  couleurForme(forme, e, i) {
    const c = forme.couleur;
    const base = forme.fill || '#888';
    if (!c || !c.mode || c.mode === 'fixe' || !e) return base;
    const cache = e._couleursForme || (e._couleursForme = {});
    if (cache[i] !== undefined) return cache[i];
    let v = base;
    if (c.mode === 'espece') v = e.color;
    else if (c.mode === 'especeSombre') v = e.colorDark;
    else if (c.mode === 'palette') {
      const l = c.couleurs || [];
      if (l.length) v = l[Math.floor(this.alea(e.id || 0, i) * l.length) % l.length];
    } else if (c.mode === 'teinte') {
      v = U.tourneTeinte(base, (this.alea(e.id || 0, i) * 2 - 1) * (c.amplitude || 30));
    }
    return (cache[i] = v);
  },

  // Pseudo-aléatoire déterministe à deux entrées (individu, forme). Le même que
  // celui des taches procédurales : sans lui, une couleur tirée à chaque frame
  // ferait scintiller le poisson.
  alea(a, b) {
    const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return h - Math.floor(h);
  },

  // BIOLUMINESCENCE d'une forme. Le drapeau est celui de l'artiste (« cette
  // tache est une lampe ») ; `def.glowAtNight` de l'espèce dit seulement si la
  // lampe ne s'allume QUE la nuit — c'est déjà la règle des silhouettes
  // procédurales de la méduse, du lanterne et du calamar.
  lueurForme(forme, e) {
    if (!forme.lueur) return 0;
    const l = forme.lueur === true ? 1 : forme.lueur;
    if (!e.def.glowAtNight) return l;
    return l * (typeof Main !== 'undefined' ? Main.nightAmount() : 0);
  },

  // DÉGRADÉ d'une forme. Deux arrêts : la couleur de la forme — donc celle de
  // l'individu quand elle est tirée au sort — et une seconde, plus foncée par
  // défaut. Un dégradé à couleurs fixes annulerait la variation individuelle,
  // c'est-à-dire précisément ce qu'on vient de gagner.
  //
  // Les coordonnées sont celles du DESSIN : le dégradé est donc calculable une
  // fois pour toutes et mis en cache, la mise à l'échelle étant faite par la
  // transformation courante.
  degradeDe(ctx, forme, sp, i, couleur) {
    const d = forme.degrade;
    const cache = sp._degrades || (sp._degrades = new Map());
    const cle = i + '|' + couleur;
    const vu = cache.get(cle);
    if (vu) return vu;
    const bo = (sp.boites && sp.boites[i]) || this.boiteForme(forme);
    const cx = (bo.x0 + bo.x1) / 2, cy = (bo.y0 + bo.y1) / 2;
    const L = Math.max(1, bo.x1 - bo.x0), H = Math.max(1, bo.y1 - bo.y0);
    const de = d.de || couleur;
    const vers = d.vers || this.sombre(couleur, 0.35);
    let g;
    if (d.type === 'radial') {
      // CENTRE RÉGLABLE, en fractions de la boîte de la forme. Cloué au milieu,
      // un dégradé radial ne sait faire qu'un halo centré ; décalé, il fait un
      // reflet de sphère, un ventre éclairé par en dessous, une joue.
      const gx = bo.x0 + L * (d.cx == null ? 0.5 : d.cx);
      const gy = bo.y0 + H * (d.cy == null ? 0.5 : d.cy);
      const R = Math.max(1, Math.hypot(L, H) / 2 * (d.rayon == null ? 1 : d.rayon));
      g = ctx.createRadialGradient(gx, gy, R * 0.05, gx, gy, R);
    } else {
      const a = (d.ang == null ? 90 : d.ang) * Math.PI / 180;
      const co = Math.cos(a), si = Math.sin(a);
      // Demi-portée dans la direction voulue : le dégradé couvre exactement la
      // boîte de la forme, quel que soit l'angle.
      const R = Math.max(1, (Math.abs(co) * L + Math.abs(si) * H) / 2);
      g = ctx.createLinearGradient(cx - co * R, cy - si * R, cx + co * R, cy + si * R);
    }
    // LA TRANSITION A UN DÉBUT ET UNE FIN, pas seulement une longueur. Avec un
    // seul réglage, un fondu court était forcément collé au bord : impossible de
    // poser une ligne de flottaison nette au milieu d'un corps. `debut` et `fin`
    // confondus donnent une frontière franche, écartés un fondu large — et on
    // choisit OÙ.
    // `pos` reste lu : c'est la forme d'avant (fin de transition, début à 0).
    const fin = U.clamp(d.fin != null ? d.fin : (d.pos != null ? d.pos : 1), 0.02, 1);
    const debut = U.clamp(d.debut != null ? d.debut : 0, 0, fin - 0.005);
    if (debut > 0.01) g.addColorStop(0, de);
    g.addColorStop(debut, de);
    g.addColorStop(fin, vers);
    if (fin < 0.99) g.addColorStop(1, vers);
    cache.set(cle, g);
    return g;
  },

  // Une couleur avec son alpha, quelle que soit son écriture. Les palettes
  // mélangent `#rrggbb` (le dessin) et `rgb(…)` (une teinte tirée au sort).
  avecAlpha(c, a) {
    if (typeof c === 'string' && c[0] === '#' && c.length === 7) {
      const [r, g, b] = U.hexRGB(c);
      return `rgba(${r},${g},${b},${a})`;
    }
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
    return m ? `rgba(${m[1]},${m[2]},${m[3]},${a})` : `rgba(255,255,255,${a})`;
  },

  // --- REFLET ------------------------------------------------------------------
  // La bande de lumière qui court sur le dos d'un poisson. Elle se dessinait à la
  // main, forme par forme, dans le calque — donc figée : elle ne suivait pas
  // l'ondulation du corps, et il fallait la redessiner à chaque retouche du
  // contour.
  //
  // Deux choses la font lire comme une LUMIÈRE et pas comme une rayure peinte :
  //  1. elle est DÉCOUPÉE dans le contour déformé (`ctx.clip()` sur le tracé
  //     courant), donc elle ondule avec la nage et ne déborde jamais ;
  //  2. elle s'éteint à ses pointes. Un aplat aux bouts francs se lit comme un
  //     trait de peinture ; le dégradé le long de l'axe en fait un éclat.
  reflet(ctx, forme, sp, i, anim, apps) {
    const r = forme.reflet;
    const bo = (sp.boites && sp.boites[i]) || this.boiteForme(forme);
    const L = Math.max(1, bo.x1 - bo.x0), H = Math.max(1, bo.y1 - bo.y0);
    const cx = bo.x0 + L * (r.x == null ? 0.45 : r.x);
    const cy = bo.y0 + H * (r.y == null ? 0.24 : r.y);
    const rx = Math.max(0.5, L * (r.largeur == null ? 0.5 : r.largeur) / 2);
    const ry = Math.max(0.5, H * (r.epaisseur == null ? 0.09 : r.epaisseur) / 2);
    const force = U.clamp(r.force == null ? 0.55 : r.force, 0, 1);
    const c = r.couleur || '#ffffff';
    // LA BANDE ONDULE AVEC LE CORPS. Elle était peinte à des coordonnées fixes,
    // seulement découpée par le contour déformé : le poisson battait de la queue
    // et la lumière restait immobile, collée comme sur une vitre. Ses quatre
    // points caractéristiques passent donc par la MÊME déformation que le
    // contour — quatre points suffisent, la courbe reste lisse entre eux.
    const a0 = (r.angle || 0) * Math.PI / 180;
    const co = Math.cos(a0), si = Math.sin(a0);
    const cbe = (r.courbe || 0) * rx * 0.3;
    const D = this.prepDeform(forme, sp, i);
    // Repère local de la lentille -> coordonnées du dessin -> déformation.
    const pt = (lx, ly) => this.deformer(cx + lx * co - ly * si, cy + lx * si + ly * co,
                                         sp, anim, apps, D);
    const A = pt(-rx, 0), B = pt(rx, 0);
    const CU = pt(0, -2 * ry + 2 * cbe), CL = pt(0, 2 * ry + 2 * cbe);
    ctx.save();
    ctx.clip();                       // le contour DÉFORMÉ, pas la boîte
    // Le dégradé suit les deux pointes déformées : sinon il glisserait le long
    // de la bande dès qu'elle se déplace.
    const g = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
    g.addColorStop(0, this.avecAlpha(c, 0));
    g.addColorStop(0.22, this.avecAlpha(c, force * 0.8));
    g.addColorStop(0.5, this.avecAlpha(c, force));
    g.addColorStop(0.78, this.avecAlpha(c, force * 0.8));
    g.addColorStop(1, this.avecAlpha(c, 0));
    ctx.fillStyle = g;
    // LA BANDE EST UNE LENTILLE, PAS UNE ELLIPSE, et c'est ce qui permet de la
    // TORDRE. Deux quadratiques entre les deux pointes : décaler leurs points de
    // contrôle du même écart déplace le milieu sans bouger les bouts, donc
    // courbe la bande d'un côté ou de l'autre — un dos n'est pas plat, et une
    // lumière qui court dessus ne l'est pas non plus.
    // À courbure nulle la lentille passe par les mêmes extrêmes que l'ellipse
    // d'avant (±rx en longueur, ±ry au milieu) ; elle est seulement plus effilée
    // aux pointes, ce que le dégradé y effaçait déjà.
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.quadraticCurveTo(CU[0], CU[1], B[0], B[1]);
    ctx.quadraticCurveTo(CL[0], CL[1], A[0], A[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  boiteForme(forme) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of forme.points) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    return isFinite(x0) ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 1, y1: 1 };
  },

  // L'échelle dessin → monde, en un seul endroit (drawSprite, et l'évent des
  // cétacés qui doit retrouver l'ancre d'œil en coordonnées monde).
  echelleSprite(sp, e) {
    const ajust = sp.spriteScale || e.def.spriteScale || 1;
    return (sp.echelle && sp.tailleJeu)
      ? sp.echelle * (e.size / sp.tailleJeu) * ajust
      : (e.size * 2.5 * ajust) / sp.w;
  },

  drawSprite(ctx, e, t) {
    const sp = Sprites.get(e.def.sprite);
    if (!sp) { this.drawFish(ctx, e, t); return; }   // pas encore chargé : on ne saute pas de frame

    const s = e.size;
    // ÉCHELLE, dans l'ordre de préséance.
    // 1. Le document la DÉCLARE (`echelle` / `tailleJeu`) : c'est le cas de tout
    //    ce qui sort de `SVGExport`, et la seule façon d'être juste.
    // 2. Sinon, référence mesurée : une silhouette procédurale occupe environ
    //    2,5 fois `size` en longueur (99 px relevés sur un requin de 40). Cette
    //    règle suppose un poisson ALLONGÉ ; sur une créature verticale elle se
    //    trompe lourdement (hippocampe +83 %, poisson-lune +29 % au relevé).
    //    `spriteScale` est là pour ça.
    const k = this.echelleSprite(sp, e);

    // Battement de queue : la fréquence suit l'allure RÉELLE, pas une constante.
    // Un requin qui charge doit visiblement forcer.
    //
    // DEUX BRIDES, toutes deux mesurées, sans lesquelles le battement partait à
    // la machine à coudre (relevé sur 12 espèces : jusqu'à 13,4 rad/s, soit une
    // période de 0,47 s, et une baleine de 190 qui battait aussi vite qu'un thon
    // lancé) :
    //  1. le GABARIT. Un gros animal bat lentement — c'est la première chose
    //     qu'on lit dans une nage. La fréquence ne dépendait pas du tout de la
    //     taille : `gros_dodo` tournait à 12,6 rad/s de moyenne pour un maximum
    //     théorique de 13,4.
    //  2. un PLAFOND DUR. `speedNow` est relevé avant écrêtage dans
    //     `Entity.move` : le rapport à la vitesse nominale montait à 4,5, donc
    //     l'allure saturait en permanence.
    const allure = this.allure(e);
    const gabarit = U.clamp(Math.pow(30 / Math.max(8, e.def.size), 0.45), 0.35, 1.15);
    // RÉGLAGE D'AUTEUR (`vitesse`), posé APRÈS le plafond : appliqué avant, il
    // n'aurait aucun effet sur les petits poissons — ce sont précisément ceux
    // qui saturent déjà les 8,5 rad/s, donc ceux qu'on veut ralentir. Le
    // plafond reste ce qu'il est : une mesure du comportement par DÉFAUT, pas
    // une interdiction faite au dessinateur.
    const f = U.clamp((1.9 + allure * 3.2) * gabarit, 0.8, 8.5) * (sp.vitesse || 1);
    // L'amplitude suit l'effort, pas seulement la fréquence : un requin lancé
    // doit visiblement FORCER. Mesuré à l'amplitude nue de l'éditeur (`amp`), le
    // bout de la queue ne parcourait que 5,5 px sur une silhouette de 48.
    const vigueur = (0.7 + allure * 0.6) * this.raideur(e);

    ctx.save();
    ctx.scale(k, k);
    ctx.translate(-sp.cx, -sp.cy);          // l'ancre `center` devient l'origine

    // Tout ce dont la déformation a besoin, en un objet : chaque appendice a
    // son propre déphasage et sa propre vitesse, le calcul se fait donc au point
    // et non plus une fois pour tout le dessin.
    // La queue a sa PROPRE vitesse : une murène ondule lentement d'un corps
    // entier pendant que ses nageoires frémissent, et un seul curseur ne sait
    // pas raconter ça.
    // `ph` est la phase INTÉGRÉE (cf. `phaseNage`) : les rapports de fréquence
    // qui suivent sont des constantes, elles peuvent donc la multiplier sans
    // rejouer le bug du `t * f`.
    // POSE DE REPOS. Le dessin rendu doit alors coïncider EXACTEMENT avec ses
    // points : c'est ce dont un éditeur a besoin dès qu'il met l'animation en
    // pause, sinon on retouche un contour à un endroit et il s'affiche à un
    // autre, décalé de la déformation figée en cours. Le jeu ne s'en sert pas ;
    // seul l'atelier pose `_repos`.
    //
    // Il ne suffit pas de remettre la phase à zéro : une queue à ondes
    // (`tailOndes`) et un tentacule gardent un `- u · ondes` dans leur sinus, et
    // restent donc courbés à phase nulle. La déformation est court-circuitée.
    const repos = !!e._repos;
    const ph = repos ? 0 : this.phaseNage(e, f, t);
    // SENS DE L'ONDULATION. Une baleine et un requin ne battent pas dans le même
    // plan, et vus de côté ça ne se ressemble pas : le cétacé a une nageoire
    // caudale HORIZONTALE qu'il bat de haut en bas — c'est un vrai mouvement
    // vertical à l'écran ; le poisson a une caudale VERTICALE qu'il balaie de
    // gauche à droite, donc vers le spectateur et loin de lui, ce qui se lit
    // comme un balancement horizontal. Le déplacement suit donc un AXE, réglé
    // en degrés, et 90° (vertical) reste le défaut : c'est le comportement
    // d'avant, et la convention du dessin animé, qui va à tout le monde.
    const axe = (sp.tailAxe == null ? 90 : sp.tailAxe) * Math.PI / 180;
    const anim = { ph, rQueue: sp.vitesseQueue || 1, phase: e.phase || 0,
                   vigueur, repos,
                   qx: Math.cos(axe), qy: Math.sin(axe),
                   // Les SOURCES autres que la nage, calculées une fois par
                   // créature et par frame. Un appendice peut s'y brancher au
                   // lieu de battre au rythme du corps : c'est ce qui rend à un
                   // coquillage dessiné l'animation de sa silhouette.
                   coquille: repos ? 0 : this.ouvertureCoquille(e, t) };
    // La COLONNE d'une pose de scène (cf. `colonne`) : échantillonnée une fois
    // par frame, appliquée à chaque point dans `deformer`. `e._colonne` est
    // posé par `rendreScene` (gags) ou par l'éditeur de colonne de l'atelier.
    anim.col = (e._colonne && !repos) ? this.colonne(sp, e._colonne) : null;
    // Battement de nageoire : plus lent que celui de la queue, et déphasé.
    const battement = repos ? 0 : Math.sin(ph * 0.7 + e.phase + 1);
    // Les reflets à reporter par-dessus tous les calques (`reflet.dessus`).
    const tardifs = [];
    // LE BEC DESSINÉ. Deux calques marqués `role: 'becHaut'` / `'becBas'`
    // s'ouvrent autour de l'ancre de bouche, au rythme de l'EXPRESSION : le
    // dessinateur donne la forme, le socle commun donne le geste. Un bec tracé
    // procéduralement ne ressemblera jamais à celui qu'on a dessiné ; un bec
    // dessiné, lui, ne savait pas s'ouvrir.
    const emB = this.EMOTIONS[e.expression] || this.EMOTIONS.idle;
    const kB = e.emoteK ? e.emoteK() : 1;
    const gB = this.geste(kB > 0.35 ? emB.mouth : this.EMOTIONS.idle.mouth,
                          t + (e.phase || 0));
    const becAmp = (sp.bec && sp.bec.ouverture != null ? sp.bec.ouverture : 32) * Math.PI / 180;
    const becPiv = sp.bouche || { x: sp.cx, y: sp.cy };
    sp.shapes.forEach((forme, i) => {
      // Calque éteint dans l'atelier : rien à peindre. Il reste dans la liste,
      // donc les indices que visent les appendices et la queue ne bougent pas —
      // le retirer les décalerait tous.
      if (sp.masques && sp.masques.has(i)) return;
      const apps = sp.appPar && sp.appPar[i];
      ctx.save();
      // Repli : un calque qui porte un `pivot` mais qu'aucun ancrage de nageoire
      // ne vise tourne en bloc, comme avant.
      if (forme.pivot && !apps) {
        ctx.translate(forme.pivot[0], forme.pivot[1]);
        ctx.rotate(battement * (forme.amp || 15) * 0.007);
        ctx.translate(-forme.pivot[0], -forme.pivot[1]);
      }
      // Mandibule DESSINÉE : elle pivote autour de l'ancre de BOUCHE, chacune de
      // son côté. Au repos rien ne bouge — dans l'atelier, animation arrêtée, le
      // dessin doit coïncider avec ses points.
      if ((forme.role === 'becHaut' || forme.role === 'becBas') && !repos) {
        const sensB = forme.role === 'becHaut' ? -1 : 1;
        ctx.translate(becPiv.x, becPiv.y);
        ctx.rotate(sensB * gB.o * becAmp);
        ctx.translate(-becPiv.x, -becPiv.y);
      }
      this.tracerForme(ctx, forme, sp, anim, apps, i);
      // Couleur de la forme POUR CET INDIVIDU : elle peut être fixe, ou tirée
      // au sort comme le fait déjà `Entity.color` sur les silhouettes.
      const couleur = this.couleurForme(forme, e, i);
      // Translucidité (une méduse) — multipliée à l'alpha courant, jamais posée
      // à sa place : le gag du Crabe Disco et le fondu des œufs en dépendent.
      const ga = ctx.globalAlpha;
      if (forme.alpha != null && forme.alpha < 1) ctx.globalAlpha = ga * forme.alpha;
      // Bioluminescence. Même mécanisme que les silhouettes procédurales
      // (`glowAtNight`) : le halo est une image en cache, pas un shadowBlur —
      // celui-ci travaille en pixels ÉCRAN et grossirait sur les petits
      // poissons de loin, en plus de coûter cher.
      const lueur = this.lueurForme(forme, e);
      if (lueur > 0) {
        const bo = sp.boites[i];
        // Le halo doit DÉBORDER de la forme : centré dessus à sa propre taille,
        // il resterait entièrement caché derrière elle. Les silhouettes
        // procédurales le tirent déjà à ~1,7 fois la taille de la créature.
        this.halo(ctx, (bo.x0 + bo.x1) / 2, (bo.y0 + bo.y1) / 2,
                  Math.hypot(bo.x1 - bo.x0, bo.y1 - bo.y0) * 0.85, couleur, 0.6 * lueur);
      }
      // Une forme peut être remplie, tracée au trait, ou les deux. Les
      // tentacules et les antennes sont des TRAITS : les traiter comme des
      // polygones les rendrait difformes, les ignorer les ferait disparaître.
      if (forme.fill !== null || !forme.stroke) {
        ctx.fillStyle = forme.degrade ? this.degradeDe(ctx, forme, sp, i, couleur) : couleur;
        ctx.fill();
      }
      // CONTOUR. Le même champ sert au trait seul (un tentacule, une antenne)
      // et au liseré d'une forme pleine : la première est tracée sans `fill`,
      // la seconde par-dessus le sien.
      if (forme.stroke) {
        ctx.strokeStyle = forme.stroke;
        ctx.lineWidth = forme.lineWidth || 1;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.stroke();
      }
      // EN DERNIER, et ce n'est pas un détail : le reflet a besoin d'un
      // `beginPath()` pour sa lentille, ce qui détruirait le tracé de la forme —
      // dont le contour a encore besoin. Le découpage, lui, appartient à l'état
      // sauvegardé : il survit au save/restore, le tracé non.
      //
      // `reflet.dessus` le REPORTE après tous les calques. Une lumière est posée
      // par l'éclairage, pas par l'ordre d'empilement : celle du dos passait
      // sous la nageoire dorsale et sous les rayures dessinées par-dessus, alors
      // qu'elle devrait glisser dessus. Le report coûte un second tracé de la
      // forme (le premier a été détruit), pour les seules formes concernées.
      if (forme.reflet) {
        if (forme.reflet.dessus) tardifs.push(i);
        else this.reflet(ctx, forme, sp, i, anim, apps);
      }
      ctx.globalAlpha = ga;
      ctx.restore();
    });
    // Les reflets reportés, une fois tout le corps peint. Chacun retrouve son
    // propre contour déformé, donc il ne déborde toujours pas de SA forme.
    for (const i of tardifs) {
      const forme = sp.shapes[i];
      const apps = sp.appPar && sp.appPar[i];
      ctx.save();
      if (forme.alpha != null && forme.alpha < 1) ctx.globalAlpha *= forme.alpha;
      this.tracerForme(ctx, forme, sp, anim, apps, i);
      this.reflet(ctx, forme, sp, i, anim, apps);
      ctx.restore();
    }
    ctx.restore();

    // --- Visage commun, calé sur les ANCRES du dessin ---
    // L'œil et la bouche sont posés SÉPARÉMENT, chacun sur son ancre. Caler le
    // seul œil et laisser la bouche à sa place par défaut ne marche pas : le
    // visage commun met la bouche en avant et à peine plus bas que l'œil, alors
    // que le requin de l'éditeur l'a presque à la verticale — elle atterrissait
    // 4 px trop en avant, sur le museau. Deux ancres, deux placements.
    const oe = sp.oeil;
    const vis = this.visageDe(e);
    if (oe) {
      // Taille des traits du visage. Sur une silhouette procédurale elle vaut
      // `size` ; sur un dessin fait main la tête est plus fine, et à 1 l'œil
      // débordait du museau du requin. Défaut comparé à l'écran : 0,75.
      // Préséance : le rayon d'œil posé sur le dessin (`points.eye.r`, converti
      // via le 0,22 de `drawFace`), puis la calibration en multiples de `size`
      // (`faceK`), puis le réglage d'espèce, puis le défaut.
      const fs = sp.faceR ? (sp.faceR * k) / 0.22
                          : s * (sp.faceK || e.def.spriteFace || 0.75);
      const bo = sp.bouche;
      // `faceTx`/`faceTy` : le décalage fin du panneau de calibration, exprimé
      // en fractions de la taille du visage.
      const dx = (sp.faceTx || 0) * fs, dy = (sp.faceTy || 0) * fs;
      // Un œil, ou deux : le second se dessine en reposant le MÊME visage à sa
      // propre ancre. Sourcil, joue et clignement suivent donc tout seuls.
      const yeux = [[oe, fs]];
      if (sp.oeil2) {
        const fs2 = sp.oeil2.r ? (sp.oeil2.r * k) / 0.22 : fs;
        yeux.push([sp.oeil2, fs2]);
      }
      for (const [a, taille] of yeux) {
        ctx.save();
        // Le visage SUIT LA COLONNE : sur un corps plié, l'œil part avec la
        // tête et TOURNE avec elle — sans ça il flottait à l'ancienne place.
        const pa = anim.col ? this.colPoint(anim.col, a.x, a.y) : [a.x, a.y, 0];
        ctx.translate((pa[0] - sp.cx) * k, (pa[1] - sp.cy) * k);
        if (pa[2]) ctx.rotate(pa[2]);
        ctx.translate(-taille * 0.55 + dx, taille * 0.18 + dy);
        // `sansBouche` : elle est dessinée une seule fois, sur sa propre ancre.
        this.drawFace(ctx, taille, e.expression, t + (e.phase || 0),
                      e.emoteK ? e.emoteK() : 1, e._eyeLook, !!bo, vis.pal, vis.style);
        ctx.restore();
      }
      // Un bec DESSINÉ est déjà la bouche : en tracer un second par-dessus,
      // procédural, en ferait deux superposés.
      if (bo && !sp.becDessine) {
        const expr = e.expression, k2 = e.emoteK ? e.emoteK() : 1;
        const em = this.EMOTIONS[expr] || this.EMOTIONS.idle;
        // À défaut de taille propre, la bouche suit l'œil — le comportement
        // d'avant, pour que les dessins déjà calés ne bougent pas.
        const fsB = sp.boucheR ? (sp.boucheR * k) / 0.2 : fs;
        ctx.save();
        // La bouche suit la colonne comme l'œil : reportée ET tournée.
        if (anim.col) {
          const pb = this.colPoint(anim.col, bo.x, bo.y);
          ctx.translate((pb[0] - sp.cx) * k, (pb[1] - sp.cy) * k);
          ctx.rotate(pb[2]);
          ctx.translate(-(bo.x - sp.cx) * k, -(bo.y - sp.cy) * k);
        }
        const nomB = k2 > 0.35 ? em.mouth : this.EMOTIONS.idle.mouth;
        // DÉCALAGE PROPRE À UNE FORME DE BOUCHE. Le cri, le bâillement et le
        // bisou ne sortent pas du même endroit du museau : une ancre unique les
        // pose tous au même point, et l'un d'eux tombe forcément à côté. Le
        // décalage est en unités du DESSIN, donc il suit l'échelle. Absent, la
        // bouche reste à son ancre — les dessins déjà calés ne bougent pas.
        const dec = sp.bouches && sp.bouches[nomB];
        this.bouche(ctx, (bo.x + (dec ? dec[0] : 0) - sp.cx) * k + dx,
                    (bo.y + (dec ? dec[1] : 0) - sp.cy) * k + dy, fsB,
                    nomB, t + (e.phase || 0), vis.pal, vis.style);
        ctx.restore();
      }
    }
  },

  // Contour d'une forme, déformé par la queue et par les APPENDICES qui visent
  // ce calque (`apps`). Ce n'est jamais une rotation rigide : l'éditeur déplace
  // CHAQUE POINT, pondéré par sa distance à l'ancre — plein effet dessus, nul au
  // bord, lissage en S entre les deux. C'est ce qui évite la couture visible au
  // raccord avec le corps, et c'est surtout ce que l'artiste voit dans l'outil :
  // faire tourner le calque en bloc montrait autre chose.
  //
  // Un appendice peut viser PLUSIEURS calques : une patte dessinée en trois
  // pièces bat alors d'un seul geste. C'est l'« aplatissement » de l'atelier.
  // LA QUEUE, en trois cas. Pas de queue du tout (`sansQueue` : un crabe, une
  // étoile, un coquillage n'ont rien à faire onduler — la valeur par défaut de
  // `tailBlend` faisait tortiller un tiers du crabe) ; une queue qui bat d'un
  // seul tenant (un poisson) ; une onde qui COURT vers le bout (`tailOndes` :
  // une murène, dont le corps entier est un tentacule). Le déphasage en `u` est
  // ce qui distingue les deux derniers — sans lui, l'anguille se plie en deux au
  // lieu d'onduler.
  //
  // Ce dont la déformation a besoin pour UNE forme, relevé une fois. Extrait de
  // `tracerForme` parce que le reflet doit subir EXACTEMENT la même déformation
  // que le contour : peint à des coordonnées fixes, il restait immobile pendant
  // que le corps ondulait dessous — une bande de lumière collée sur la vitre.
  prepDeform(forme, sp, idx) {
    const queue = sp.tailBlend != null && (!sp.queueCalques || sp.queueCalques.has(idx));
    return {
      queue,
      etendue: queue ? Math.max(1, sp.tailBlend - sp.minX) : 1,
      ondes: (sp.tailOndes || 0) * Math.PI * 2,
      amp: forme.amp || 15,
    };
  },

  // LA PINCE QUI CLAQUE. Un crabe, une crevette, un bernard-l'ermite ne remuent
  // pas leur pince comme une nageoire : elle reste FERMÉE la plupart du temps,
  // s'ouvre lentement, puis se referme d'un coup sec. C'est ce rythme-là qui se
  // lit comme « clac », et un sinus ne sait pas le dire — il passe autant de
  // temps ouvert que fermé, et referme aussi lentement qu'il ouvre.
  //
  // `u` parcourt 0→1 sur un cycle : 55 % fermée, 30 % d'ouverture douce, 15 %
  // de fermeture accélérée.
  claquement(u) {
    if (u < 0.55) return 0;
    if (u < 0.85) { const t = (u - 0.55) / 0.3; return t * t * (3 - 2 * t); }
    const t = (u - 0.85) / 0.15;
    return 1 - t * t;
  },

  // LE BATTEMENT D'UNE AILE N'EST PAS UN SINUS. Un oiseau porte son poids : la
  // descente est vive et puissante, la remontée lente et molle. Un va-et-vient
  // symétrique bat autant vers le haut que vers le bas — c'est du carton qui
  // claque, pas quelque chose qui vole.
  //
  // `u` parcourt 0→1 sur un cycle. Renvoie −1 (aile haute) à +1 (aile basse) :
  // 35 % du cycle pour la descente, 65 % pour la remontée.
  battementAile(u) {
    if (u < 0.35) return -Math.cos(Math.PI * u / 0.35);
    return Math.cos(Math.PI * (u - 0.35) / 0.65);
  },

  // Déformation d'UN point : queue puis appendices. `d` vient de `prepDeform`.
  // LA COLONNE VERTÉBRALE — le squelette 1D d'une pose de scène. Cinq
  // poignées le long du corps, chacune {dy: écart vertical en FRACTION de la
  // longueur du dessin, sy: épaisseur, sx: compression locale}, échantillonnées
  // en 25 points ; chaque point du dessin est reporté sur la colonne, sa
  // section TOURNÉE selon la pente locale. C'est le même principe que l'onde
  // de queue et le reflet découpé : on déforme la GÉOMÉTRIE, jamais des
  // tranches de pixels — un dessin plié ainsi ne se déchire pas (le pliage
  // par tranches, essayé avant, déchirait les SVG aux coutures).
  colonne(sp, pose) {
    const n = 25, x0 = sp.minX, L = Math.max(1, sp.w);
    const k = U.clamp(pose.k ?? 1, 0, 1);
    const m = (pose.dy && pose.dy.length) || 5;
    const lit = (arr, u, neutre) => {
      if (!arr) return neutre;
      const t = u * (m - 1), i = Math.min(m - 2, Math.floor(t)), f = t - i;
      const s = f * f * (3 - 2 * f);                 // lissé entre deux poignées
      const a = arr[i] ?? neutre, b = arr[i + 1] ?? neutre;
      return a + (b - a) * s;
    };
    // Les poignées sont LIBRES en x ET en y (`dx`/`dy`) : la colonne est une
    // COURBE paramétrique, pas une fonction y(x). C'est ce qui permet le « C »
    // — le museau peut revenir en arrière — et l'accordéon n'est plus un
    // réglage à part : tirer une poignée vers le corps comprime ce qu'il y a
    // entre les deux. (La première version bloquait les poignées à la
    // verticale et forçait les tangentes vers l'avant : impossible de
    // dessiner un C, et tout semblait « tourner » au lieu de se poser.)
    const X = new Array(n), Y = new Array(n), A = new Array(n), S = new Array(n);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      X[i] = x0 + u * L + lit(pose.dx, u, 0) * L * k;
      Y[i] = sp.cy + lit(pose.dy, u, 0) * L * k;
      S[i] = 1 - (1 - lit(pose.sy, u, 1)) * k;
    }
    let prec = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const ex = X[b] - X[a], ey = Y[b] - Y[a];
      // La tangente a le droit de se RETOURNER (le C) ; seul un segment
      // dégénéré garde l'angle précédent.
      A[i] = (ex * ex + ey * ey > 1e-6) ? Math.atan2(ey, ex) : prec;
      prec = A[i];
    }
    return { n, x0, L, cy: sp.cy, X, Y, A, S };
  },

  // Où atterrit un point du dessin sur la colonne, et à quelle pente. Sert à
  // `deformer` (tous les points des calques) ET aux ancres du visage — l'œil
  // et la bouche suivent la tête, tournés avec elle.
  colPoint(c, x, y) {
    const t = U.clamp((x - c.x0) / c.L, 0, 1) * (c.n - 1);
    const i = Math.min(c.n - 2, Math.floor(t)), f = t - i;
    const X = c.X[i] + (c.X[i + 1] - c.X[i]) * f;
    const Y = c.Y[i] + (c.Y[i + 1] - c.Y[i]) * f;
    const A = c.A[i] + (c.A[i + 1] - c.A[i]) * f;
    const S = c.S[i] + (c.S[i + 1] - c.S[i]) * f;
    const dy = (y - c.cy) * S;
    return [X - Math.sin(A) * dy, Y + Math.cos(A) * dy, A];
  },

  deformer(x, y, sp, anim, apps, d) {
    if (anim.repos) return [x, y];
    const lissage = (v) => { const c = U.clamp(v, 0, 1); return c * c * (3 - 2 * c); };
    const amp = d.amp;
    if (d.queue) {
      // u² : le battement part du pédoncule caudal, pas du milieu du corps,
      // sinon le poisson entier se tortille comme une chenille.
      const u = U.clamp((sp.tailBlend - x) / d.etendue, 0, 1);
      const dep = u * u * amp * anim.vigueur
                  * Math.sin(anim.ph * anim.rQueue + anim.phase - u * d.ondes);
      x += anim.qx * dep; y += anim.qy * dep;
    }
    if (apps) {
      for (const f of apps) {
        // Chaque appendice a son propre temps. Sans déphasage ni vitesse
        // propres, les huit pattes d'un crabe battaient toutes ensemble : ça
        // se lit comme un tressaillement, pas comme une marche.
        const vit = f.vitesse || 1;
        const dph = (f.phase || 0) * Math.PI / 180;
        const bat = Math.sin(anim.ph * 0.7 * vit + anim.phase + 1 + dph);
        const A = f.amp != null ? f.amp : amp;
        // SYMÉTRIE. Un crabe, une raie, un poulpe ont des appendices des DEUX
        // côtés : un seul ancrage n'animait qu'une moitié. `miroir` en pose un
        // second, image de celui-ci par rapport à l'axe vertical du dessin, et
        // qui joue en SENS INVERSE — sans quoi les deux côtés partiraient du
        // même côté au lieu de battre comme une paire de pattes.
        const cotes = f.miroir ? [[f.x, 1], [2 * sp.cx - f.x, -1]] : [[f.x, 1]];
        for (const [fx, sens] of cotes) {
          if (f.type === 'aile') {
            // UNE AILE N'EST PAS UNE NAGEOIRE AVEC PLUS D'AMPLITUDE.
            //
            // La `nageoire` pondère à l'envers pour ce cas : plein effet SUR
            // l'ancre — où le bras de levier est nul — et zéro au bord. C'est ce
            // qui donnait 1,4 px de débattement mesurés sur le Confetti. Ici
            // l'angle CROÎT le long de l'envergure : l'épaule ne bouge pas, la
            // plume du bout décrit tout l'arc.
            //
            // Et l'angle est RETARDÉ le long de l'envergure (`ondes`, la
            // souplesse) : le bout traîne derrière le bras, donc l'aile se
            // courbe au lieu de rester une planche. C'est ce retard qui la fait
            // lire comme une aile plutôt que comme une pagaie.
            const L = Math.max(1, f.r || 1);
            const a0 = (f.ang != null ? f.ang : 180) * Math.PI / 180;
            const ax = Math.cos(a0) * sens, ay = Math.sin(a0);
            let px = x - fx, py = y - f.y;
            const u = U.clamp((px * ax + py * ay) / L, 0, 1);
            if (u <= 0) continue;                 // côté corps : l'épaule tient
            const retard = (f.ondes != null ? f.ondes : 0.35) * Math.PI * 2;
            let w = ((anim.ph * 0.7 * vit + dph - u * retard) / (Math.PI * 2)) % 1;
            if (w < 0) w += 1;
            const bat = this.battementAile(w);
            // LE RETOURNEMENT, et c'est lui qui fait voler.
            //
            // Une aile qui pivote en gardant sa largeur est un éventail rigide :
            // elle monte et descend, elle ne VOLE pas. Une vraie aile, vue de
            // côté, se présente de face aux extrêmes de la course et sur la
            // TRANCHE au passage du milieu — c'est ce rétrécissement, puis ce
            // basculement, qu'on lit comme un battement.
            //
            // On écrase donc la corde (la largeur perpendiculaire à l'envergure)
            // en suivant la position dans la course : pleine aux extrêmes, nulle
            // au passage, et NÉGATIVE au-delà — l'aile montre son autre face.
            //   flip = 0    : largeur constante, le comportement d'avant
            //   flip = 0,5  : elle s'affine jusqu'à disparaître en haut
            //   flip = 1    : elle se retourne complètement
            // Le déphasage `w` est celui du point, donc le retournement COURT le
            // long de l'aile comme le reste : la pointe bascule après le bras.
            const flip = f.flip == null ? 0.55 : f.flip;
            if (flip > 0.001) {
              const k = (1 - flip) + flip * bat;
              const le = px * ax + py * ay;          // le long de l'envergure
              const co = (-px * ay + py * ax) * k;   // la corde, écrasée
              px = le * ax - co * ay;
              py = le * ay + co * ax;
            }
            const a = sens * bat * u * anim.vigueur * A * Math.PI / 180;
            const cos = Math.cos(a), sin = Math.sin(a);
            x = fx + px * cos - py * sin;
            y = f.y + px * sin + py * cos;
          } else if (f.type === 'pince') {
            // Une PINCE a une charnière et deux mâchoires : seule celle d'un
            // côté de l'axe bouge, l'autre reste solidaire du membre. Faire
            // pivoter les deux ferait tourner la pince entière au lieu de
            // l'ouvrir.
            const L = Math.max(1, f.r || 1);
            const a0 = (f.ang != null ? f.ang : 0) * Math.PI / 180;
            const ax = Math.cos(a0) * sens, ay = Math.sin(a0);
            const px = x - fx, py = y - f.y;
            const along = px * ax + py * ay;          // le long de la pince
            // DE QUEL COTE DE L'AXE, et c'est ici que le miroir se joue. `cote`
            // est un produit vectoriel, donc il CHANGE DE SIGNE quand on
            // retourne le repere : la pince de droite ouvrait la machoire
            // opposee a celle de gauche — en haut d'un cote, en bas de l'autre.
            // Le miroir ne retourne pas le DESSIN (l'artiste a dessine ses deux
            // pinces lui-meme), il ne retourne que le repere de l'appendice :
            // multiplier par `sens` remet la meme machoire des deux cotes.
            const cote = (-px * ay + py * ax) * sens;
            if (along <= 0 || cote <= 0) continue;    // hors de la mâchoire mobile
            // Plus on s'éloigne de la charnière, plus on s'ouvre : c'est un
            // pivot, pas une translation.
            const poids = U.clamp(along / L, 0, 1);
            // `source` dit CE QUI pilote l'ouverture. Par défaut le claquement
            // libre ; « coquille » la branche sur l'état de la créature, donc
            // sur son sommeil, ses repas et ses perles.
            let ouv;
            if (f.source === 'coquille') {
              ouv = U.clamp(anim.coquille, 0, 1);
            } else {
              const u = ((anim.ph * 0.7 * vit + dph) / (Math.PI * 2)) % 1;
              ouv = this.claquement(u < 0 ? u + 1 : u);
            }
            const a = sens * ouv * poids * anim.vigueur * A * Math.PI / 180;
            const cos = Math.cos(a), sin = Math.sin(a);
            x = fx + px * cos - py * sin;
            y = f.y + px * sin + py * cos;
          } else if (f.type === 'tentacule') {
            // TENTACULE / PATTE / ANTENNE : onde progressive le long d'un axe.
            // La base ne bouge pas, le bout décrit toute l'amplitude, et l'onde
            // court du premier vers le second. La rotation de nageoire — un bloc
            // qui pivote — donne au contraire un membre raide, articulé sur une
            // seule charnière : bon pour un aileron, faux pour un bras de poulpe.
            const L = Math.max(1, f.r || 1);
            // Le miroir renverse l'axe : un bras qui part vers la gauche repart
            // vers la droite de l'autre côté.
            const a0 = (f.ang != null ? f.ang : 180) * Math.PI / 180;
            const ax = Math.cos(a0) * sens, ay = Math.sin(a0);
            const u = U.clamp(((x - fx) * ax + (y - f.y) * ay) / L, 0, 1);
            if (u <= 0) continue;
            // `amp` en POURCENTAGE de la longueur : le même réglage donne le
            // même geste sur une patte de crabe et sur un bras de calamar.
            const dep = (A / 100) * L * u * u * sens
              * Math.sin(anim.ph * 0.7 * vit + anim.phase + dph
                         - u * (f.ondes != null ? f.ondes : 1) * Math.PI * 2);
            x += -ay * dep; y += ax * dep;
          } else {
            const r = f.r || 1;
            const poids = lissage(1 - Math.hypot(x - fx, y - f.y) / r);
            if (poids <= 0) continue;
            // `amp` est lu en DEGRÉS — c'est l'unité du curseur de l'outil, et
            // c'est bien `/180` qu'il faut : le `/360` d'avant divisait en
            // silence l'amplitude par deux, si bien qu'« amplitude 20° » valait 10.
            //
            // Le battement suit aussi l'EFFORT, comme celui de la queue : une
            // nageoire doit visiblement forcer quand l'animal sprinte.
            //
            // Reste une limite de forme, pas de code : la pondération vaut 1 SUR
            // l'ancre — où le bras de levier est nul — et 0 au bord du rayon. Le
            // déplacement maximal se joue vers 0,25·r et plafonne à
            // ~0,15·r·amp(rad) : « 20° » sur un rayon de 31 ne déplaçait que
            // 1,4 px sur un dessin large de 150. L'atelier affiche donc le
            // débattement obtenu, plutôt que de laisser régler à l'aveugle.
            const a = sens * bat * poids * anim.vigueur * A * Math.PI / 180;
            const cos = Math.cos(a), sin = Math.sin(a);
            const dx = x - fx, dy = y - f.y;
            x = fx + dx * cos - dy * sin;
            y = f.y + dx * sin + dy * cos;
          }
        }
      }
    }
    // La colonne passe EN DERNIER : elle plie le corps déjà animé (onde de
    // queue et appendices compris), comme un squelette porte la chair.
    if (anim.col) {
      const p = this.colPoint(anim.col, x, y);
      x = p[0]; y = p[1];
    }
    return [x, y];
  },

  tracerForme(ctx, forme, sp, anim, apps, idx) {
    const pts = forme.points, n = pts.length;
    const D = this.prepDeform(forme, sp, idx);
    // LA QUEUE, en trois cas. Pas de queue du tout (`sansQueue` : un crabe, une
    // étoile, un coquillage n'ont rien à faire onduler — la valeur par défaut de
    // `tailBlend` faisait tortiller un tiers du crabe) ; une queue qui bat d'un
    // seul tenant (un poisson) ; une onde qui COURT vers le bout (`tailOndes` :
    // une murène, dont le corps entier est un tentacule). Le déphasage en `u`
    // est ce qui distingue les deux derniers — sans lui, l'anguille se plie en
    // deux au lieu d'onduler.
    const queue = sp.tailBlend != null && (!sp.queueCalques || sp.queueCalques.has(idx));
    const etendue = queue ? Math.max(1, sp.tailBlend - sp.minX) : 1;
    const ondes = (sp.tailOndes || 0) * Math.PI * 2;
    const P = new Array(n);
    for (let k = 0; k < n; k++) P[k] = this.deformer(pts[k][0], pts[k][1], sp, anim, apps, D);
    // Un trait ouvert (tentacule, antenne) ne se referme pas : le boucler
    // dessinerait une corde en travers de la créature.
    const ferme = forme.ferme !== false;
    ctx.beginPath();
    if (forme.smooth && n > 2) {
      // Contour lissé : on passe par les MILIEUX des segments, les sommets
      // servant de points de contrôle. Relier les sommets en droites donnait des
      // poissons taillés à la serpe.
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (ferme) {
        const d = mid(P[n - 1], P[0]);
        ctx.moveTo(d[0], d[1]);
        for (let i = 0; i < n; i++) {
          const m = mid(P[i], P[(i + 1) % n]);
          ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]);
        }
      } else {
        ctx.moveTo(P[0][0], P[0][1]);
        for (let i = 1; i < n - 1; i++) {
          const m = mid(P[i], P[i + 1]);
          ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]);
        }
        ctx.lineTo(P[n - 1][0], P[n - 1][1]);
      }
    } else {
      ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(P[i][0], P[i][1]);
    }
    if (ferme) ctx.closePath();
  },

  // --- Silhouettes ------------------------------------------------------------

  // Corps de poisson générique (queue + corps + ventre + ailerons), SANS visage.
  // Facteur commun à drawFish / drawClown pour éviter la duplication.
  drawFishBody(ctx, e, t) {
    const s = e.size, def = e.def;
    const wag = Math.sin(this.phaseNage(e, 3 + this.battement(e, 0.8, 1.6), t) + e.phase)
              * 0.35 * this.raideur(e);

    // Queue
    ctx.fillStyle = e.colorDark;
    ctx.save();
    ctx.translate(-s * 0.85, 0); ctx.rotate(wag);
    ctx.beginPath();
    if (def.tail === 'lunate' || def.tail === 'shark') {
      ctx.moveTo(0, 0); ctx.lineTo(-s * 0.55, -s * 0.45); ctx.lineTo(-s * 0.35, 0);
      ctx.lineTo(-s * 0.55, s * 0.45); ctx.closePath();
    } else if (def.tail === 'whale') {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.35, -s * 0.65, -s * 0.15);
      ctx.quadraticCurveTo(-s * 0.4, 0, -s * 0.65, s * 0.15);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.35, 0, 0);
    } else { // fan
      ctx.moveTo(0, 0); ctx.lineTo(-s * 0.5, -s * 0.35);
      ctx.quadraticCurveTo(-s * 0.6, 0, -s * 0.5, s * 0.35); ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    // Corps
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * (def.bodyRatio || 0.6), 0, 0, Math.PI * 2);
    ctx.fill();

    // Ventre clair
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(s * 0.1, s * 0.18, s * 0.7, s * (def.bodyRatio || 0.6) * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aileron dorsal (requin)
    if (def.fin) {
      ctx.fillStyle = e.colorDark;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * (def.bodyRatio || 0.5) * 0.9);
      ctx.lineTo(s * 0.15, -s * 0.85);
      ctx.lineTo(s * 0.3, -s * (def.bodyRatio || 0.5) * 0.85);
      ctx.closePath(); ctx.fill();
    }

    // Nageoire pectorale
    ctx.fillStyle = e.colorDark;
    ctx.save();
    ctx.translate(s * 0.1, s * 0.15); ctx.rotate(Math.sin(t * 5 + e.phase) * 0.3 + 0.5);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.28, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  // Taches optionnelles (def.spots). Deux formats acceptés :
  //   spots: 4                          → 4 taches pseudo-aléatoires stables
  //   spots: [[x, y, r], ...]           → positions/rayons en fractions de size
  drawSpots(ctx, e) {
    const s = e.size, spots = e.def.spots;
    if (!spots) return;
    ctx.save();
    ctx.fillStyle = e.colorDark;
    ctx.globalAlpha = 0.55;
    if (typeof spots === 'number') {
      for (let i = 0; i < spots; i++) {
        // pseudo-aléatoire déterministe (pas de scintillement d'une frame à l'autre)
        const h = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
        const h2 = Math.sin(i * 78.233 + 1.7) * 43758.5453;
        const fx = (h - Math.floor(h)) * 2 - 1, fy = (h2 - Math.floor(h2)) * 2 - 1;
        ctx.beginPath();
        ctx.arc(fx * s * 0.55, fy * s * (e.def.bodyRatio || 0.6) * 0.5,
                s * (0.1 + Math.abs(fy) * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      for (const sp of spots) {
        ctx.beginPath();
        ctx.arc(s * sp[0], s * sp[1], s * (sp[2] || 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  },

  drawFish(ctx, e, t) {
    this.drawFishBody(ctx, e, t);
    this.drawSpots(ctx, e);
    this.face(ctx, e.size, e, t);
  },

  // Poisson-clown : corps standard + bandes blanches verticales arrondies,
  // posées AVANT le visage pour ne jamais recouvrir yeux/bouche.
  drawClown(ctx, e, t) {
    const s = e.size, br = (e.def.bodyRatio || 0.6);
    this.drawFishBody(ctx, e, t);

    ctx.save();
    // clip sur l'ellipse du corps : les bandes épousent la silhouette
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * br, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const bands = [-0.5, 0.05, 0.6];
    for (let i = 0; i < bands.length; i++) {
      const bx = s * bands[i];
      const bw = s * (i === 2 ? 0.09 : 0.14);
      ctx.beginPath();
      ctx.ellipse(bx, 0, bw, s * br * 1.2, Math.sin(t * 0.5 + e.phase) * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // liserés sombres de part et d'autre de la bande centrale
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * br, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = e.colorDark; ctx.lineWidth = Math.max(1, s * 0.05);
    for (const bx of [-0.66, -0.34, -0.11, 0.21]) {
      ctx.beginPath();
      ctx.moveTo(s * bx, -s * br * 1.2); ctx.lineTo(s * bx, s * br * 1.2); ctx.stroke();
    }
    ctx.restore();

    this.face(ctx, s, e, t);
  },

  // Raie manta : losange/aile qui ondule le long de l'envergure + longue queue.
  drawRay(ctx, e, t) {
    const s = e.size;
    const flap = (u) => Math.sin(t * 2.2 + e.phase - Math.abs(u) * 1.6) * s * 0.45 * Math.abs(u);

    // Queue fine (derrière le corps)
    ctx.strokeStyle = e.colorDark;
    ctx.lineWidth = Math.max(1.2, s * 0.09); ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, 0);
    ctx.quadraticCurveTo(-s * 1.5, Math.sin(t * 2 + e.phase) * s * 0.35,
                         -s * 2.3, Math.sin(t * 2 + e.phase + 0.9) * s * 0.5);
    ctx.stroke();

    // Aile gauche / droite : contour ondulant
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(s * 0.95, 0);                                  // museau
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;                                        // 0 → 1 vers l'aile haute
      ctx.quadraticCurveTo(s * (0.9 - u * 0.5), -s * u * 1.5 + flap(u) * 0.4,
                           s * (0.8 - u * 1.5), -s * u * 1.55 + flap(u));
    }
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.5, -s * 0.75, 0);   // bord de fuite haut
    ctx.quadraticCurveTo(-s * 0.6, s * 0.5, -s * 0.7, s * 1.55 + flap(1));
    for (let i = 9; i >= 1; i--) {
      const u = i / 10;
      ctx.quadraticCurveTo(s * (0.8 - u * 1.5), s * u * 1.55 + flap(u),
                           s * (0.9 - u * 0.5), s * u * 1.5 + flap(u) * 0.4);
    }
    ctx.closePath();
    ctx.fill();

    // Dessus plus clair (vue de dessus, visage dessus)
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(s * 0.1, 0, s * 0.7, s * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Céphaliques (petites cornes cartoon)
    ctx.fillStyle = e.colorDark;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 0.95, sy * s * 0.3, s * 0.22, s * 0.09, sy * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawSpots(ctx, e);
    ctx.save(); ctx.scale(0.8, 0.8); ctx.translate(-s * 0.1, 0);
    this.face(ctx, s, e, t);
    ctx.restore();
  },

  // Poulpe : tête ronde + 6 tentacules ondulants. Semi-transparent si e.stealth > 0.
  drawOctopus(ctx, e, t) {
    const s = e.size;
    const stealth = e.stealth || 0;
    ctx.save();
    if (stealth > 0) ctx.globalAlpha = U.lerp(1, 0.2, Math.min(1, stealth));
    // TOUR DE NINJA (GAGS.poulpe) : pendant le poof il s'efface COMPLÈTEMENT,
    // pour ressortir ailleurs. La furtivité passive, elle, ne va qu'à 0,2 —
    // sans ce zéro franc, la disparition ne se lisait pas comme voulue.
    if (e._invisible > 0) {
      ctx.globalAlpha *= Math.max(0, 1 - e._invisible);
      if (ctx.globalAlpha < 0.02) { ctx.restore(); return; }
    }

    // Tentacules (derrière la tête), déployés vers l'arrière
    ctx.strokeStyle = e.colorDark;
    ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const u = (i / 5) * 2 - 1;                       // -1 → 1
      const w = Math.sin(t * 3 + e.phase + i * 1.1);
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, u * s * 0.45);
      ctx.quadraticCurveTo(-s * 1.0, u * s * 0.7 + w * s * 0.28,
                           -s * 1.7, u * s * 0.9 + w * s * 0.5);
      ctx.stroke();
    }

    // Tête ronde
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.ellipse(s * 0.05, -s * 0.05, s * 0.95, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    // petites bosses de crâne
    ctx.beginPath(); ctx.arc(-s * 0.25, -s * 0.75, s * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.72, s * 0.24, 0, Math.PI * 2); ctx.fill();

    // Ventouses suggérées
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.3, s * 0.6, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();

    this.drawSpots(ctx, e);
    ctx.save(); ctx.scale(0.85, 0.85); ctx.translate(-s * 0.05, 0);
    this.face(ctx, s, e, t);
    ctx.restore();

    ctx.restore();
  },

  // Hippocampe : corps vertical en S, museau tubulaire, dorsale vibrante,
  // queue enroulée en spirale. Le visage est tourné de -90° (tête vers le haut).
  drawSeahorse(ctx, e, t) {
    const s = e.size;
    const sway = Math.sin(t * 1.4 + e.phase) * 0.12;

    ctx.save();
    ctx.rotate(-Math.PI / 2 + sway);   // repère local : "tête vers +x" → vers le haut

    // Queue enroulée (spirale) sous le corps
    ctx.strokeStyle = e.colorDark;
    ctx.lineWidth = Math.max(1.5, s * 0.22); ctx.lineCap = 'round';
    ctx.beginPath();
    const cx = -s * 1.35, cy = s * 0.35;
    for (let i = 0; i <= 26; i++) {
      const a = i / 26 * Math.PI * 2.4 + Math.sin(t * 1.5 + e.phase) * 0.15;
      const r = s * 0.5 * (1 - i / 34);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Corps en S
    ctx.strokeStyle = e.color;
    ctx.lineWidth = s * 0.62; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 1.0, s * 0.15);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.35, -s * 0.15, -s * 0.15);
    ctx.quadraticCurveTo(0, -s * 0.5, s * 0.35, -s * 0.2);
    ctx.stroke();

    // Tête + museau tubulaire
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(s * 0.4, -s * 0.12, s * 0.55, s * 0.45, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.color; ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.75, 0);
    ctx.quadraticCurveTo(s * 1.05, s * 0.12, s * 1.25, s * 0.3);
    ctx.stroke();

    // Petite couronne (crête)
    ctx.fillStyle = e.colorDark;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(s * (0.25 - i * 0.3), -s * (0.48 + i * 0.02), s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nageoire dorsale qui vibre
    ctx.save();
    ctx.translate(-s * 0.55, s * 0.28);
    ctx.rotate(Math.sin(t * 22 + e.phase) * 0.22);
    ctx.fillStyle = e.colorAlpha(0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.4, s * 0.16, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Visage sur la tête
    ctx.save(); ctx.scale(0.62, 0.62); ctx.translate(s * 0.2, -s * 0.25);
    this.face(ctx, s, e, t);
    ctx.restore();

    ctx.restore();
  },

  // Murène : partie AVANT du corps seulement (le rocher est dessiné ailleurs).
  // e.strikeT ∈ [0,1] : 0 = rentrée dans le trou, 1 = jaillie au maximum.
  // ANGUILLE ÉLECTRIQUE : un long ruban qui ondule sur TOUTE sa longueur, sans
  // rocher — elle nage en pleine eau, contrairement à la murène qui vit dans un
  // trou. L'onde COURT vers la queue (déphasage par segment) au lieu de battre
  // d'un seul tenant : c'est ce qui distingue un corps-tentacule d'un poisson.
  // Elle se charge visiblement avant sa décharge (`_shockCd`).
  drawRibbon(ctx, e, t) {
    const s = e.size;
    const SEG = 16;
    const L = s * 3.4;
    // Charge : les liserés s'allument à mesure que la décharge approche
    const cd = e._shockCd ?? 99;
    const charge = U.clamp(1 - cd / 1.6, 0, 1);
    // Phase INTÉGRÉE : `sin(t * f)` déplaçait l'onde de plusieurs tours dès que
    // la vitesse frémissait (cf. `phaseNage`). C'était ça, le tortillement
    // frénétique — pas la fréquence, qui était déjà bonne.
    const ph = this.phaseNage(e, this.battement(e, 1.1, 2.2) * 1.23, t);

    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;                       // 0 = tête, 1 = bout de queue
      // Onde progressive : chaque segment est en retard sur le précédent.
      const onde = Math.sin(ph - u * 5.4 + e.phase);
      pts.push({ x: s * 0.9 - u * L, y: onde * s * 0.5 * (0.25 + u * 0.9) });
    }
    // Corps : un ruban dont l'épaisseur décroît vers la queue
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? e.color : e.colorDark;
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const p = pts[i];
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      }
      ctx.lineWidth = s * (pass ? 0.72 : 0.95);
      ctx.stroke();
    }
    // Nageoire ventrale continue, la signature de l'anguille électrique
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) ctx.lineTo(pts[i].x, pts[i].y + s * (0.34 - i / SEG * 0.2));
    for (let i = SEG; i >= 0; i--) ctx.lineTo(pts[i].x, pts[i].y + s * (0.62 - i / SEG * 0.42));
    ctx.closePath(); ctx.fill();

    // Liserés électriques : deux traits pointillés le long du dos, qui
    // s'allument quand la charge monte.
    if (charge > 0.02) {
      ctx.strokeStyle = `rgba(180,230,255,${0.25 + charge * 0.75})`;
      ctx.lineWidth = Math.max(1, s * 0.13);
      ctx.setLineDash([s * 0.3, s * 0.35]);
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const p = pts[i];
        i === 0 ? ctx.moveTo(p.x, p.y - s * 0.22) : ctx.lineTo(p.x, p.y - s * 0.22);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tête, à l'avant du ruban
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.ellipse(s * 0.85, pts[0].y, s * 0.62, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(s * 0.85, pts[0].y);
    this.face(ctx, s * 0.62, e, t);
    ctx.restore();
  },

  // ANGUILLE-JARDINIÈRE : un tube planté dans le sable, qui ondule doucement.
  // `_rentre` (0 → 1) la fait redescendre dans son trou — toute la colonie
  // disparaît d'un coup quand un prédateur passe, et c'est TOUT le gag.
  drawGardenEel(ctx, e, t) {
    const s = e.size;
    const rentre = U.clamp(e._rentre ?? 0, 0, 1);
    const sortie = 1 - rentre;
    if (sortie < 0.03) {
      // Rentrée : il ne reste que le trou dans le sable
      ctx.fillStyle = 'rgba(60,52,40,0.55)';
      ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.45, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      return;
    }
    const H = s * 3.2 * sortie;
    const SEG = 10;
    const pts = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;                       // 0 = pied (dans le sable), 1 = tête
      const onde = Math.sin(t * 1.4 - u * 2.2 + e.phase) * s * 0.42 * u;
      pts.push({ x: onde, y: s * 0.5 - u * H });
    }
    // Trou
    ctx.fillStyle = 'rgba(60,52,40,0.55)';
    ctx.beginPath(); ctx.ellipse(0, s * 0.55, s * 0.45, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    // Tube
    ctx.lineCap = 'round';
    ctx.strokeStyle = e.color;
    ctx.lineWidth = s * 0.44;
    ctx.beginPath();
    for (let i = 0; i <= SEG; i++) { const p = pts[i]; i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    // Mouchetures
    ctx.fillStyle = e.colorDark;
    for (let i = 2; i < SEG; i += 2) {
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, s * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    // Tête au sommet
    const tete = pts[SEG];
    ctx.save();
    ctx.translate(tete.x, tete.y);
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.34, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    this.face(ctx, s * 0.34, e, t);
    ctx.restore();
  },

  // ALLURE : 0 = arrêté, 1 = à sa vitesse de croisière, 2 = au sprint.
  // `speedNow` est l'EFFORT relevé AVANT écrêtage dans `Entity.move` — il monte
  // jusqu'à 4,5 fois la vitesse nominale. S'en servir tel quel fait battre tout
  // le monde à fond en permanence : l'Anguille se tortillait frénétiquement
  // alors qu'elle avance à 34 px/s. On prend donc la vitesse VRAIE.
  allure(e) {
    const v = Math.hypot(e.vx || 0, e.vy || 0);
    return U.clamp(v / Math.max(1, e.def.speed), 0, 2);
  },

  // LA FLÈCHE EST RAIDE. Pendant l'étirement d'un gag (`_etire`, posé par une
  // scène : le grand run de l'Espadon), la nage se FIGE : un corps lancé
  // « droit comme un i » ne bat pas, il fend l'eau. Seule la flèche d'un gag
  // glisse — la nage ordinaire, même en sprint, ne passe pas par là.
  raideur(e) { return 1 - 0.85 * U.clamp(e._etire ?? 0, 0, 1); },

  // LES DÉFORMATIONS DE SCÈNE — les canaux cartoon posés par les gags, en
  // pures transformations du contexte courant (repère du CORPS, volume
  // conservé). Factorisées ici pour que l'ATELIER (vue Scènes) applique
  // EXACTEMENT ce que `Entity.draw` applique — deux copies divergeraient au
  // premier réglage :
  //   `_crispe`  (0→1)  le CABRÉ : dressé comme un cheval qui cabre (~50° au
  //                     plus fort), corps courbé, ressort qui vibre ;
  //   `_etire`   (0→1)  la FLÈCHE : étiré, aplati (et raide, cf. `raideur`) ;
  //   `_chocT`          la GELÉE d'un impact (cosinus amorti, cf. Entity.choc) ;
  //   `_ecraseT` (>0)   l'ACCORDÉON tenu du crash du Coyote (cf. Entity.crash).
  deformationScene(ctx, e, t) {
    const crispe = U.clamp(e._crispe ?? 0, 0, 1);
    const etire = U.clamp(e._etire ?? 0, 0, 1);
    if (crispe > 0.01) {
      // Le gros du cabré (l'ARC) est plié par tranches dans `rendreScene` —
      // ici seulement ce qui reste affine : le frisson d'effort et la
      // compression du ressort, qui VIBRE (boing-boing à ~2,4 Hz).
      ctx.translate(Math.sin(t * 44 + e.phase) * crispe * e.size * 0.04, 0);
      const ressort = 1 + Math.sin(t * 15 + e.phase) * 0.06 * crispe;
      ctx.scale((1 - crispe * 0.16) / ressort, (1 + crispe * 0.1) * ressort);
    }
    if (etire > 0.01) ctx.scale(1 + etire * 0.4, 1 - etire * 0.24);
    if (e._chocT != null) {
      const k = (e._chocAmp ?? 1) * Math.exp(-5 * e._chocT) * Math.cos(11 * e._chocT);
      if (e._chocAxe === 'y') ctx.scale(1 + k * 0.35, 1 - k * 0.42);
      else ctx.scale(1 - k * 0.42, 1 + k * 0.35);
    }
    // L'accordéon du crash n'écrase plus tout le corps : `rendreScene` ne
    // froisse que la TÊTE. Ici, juste le tremblement de tension.
    if (e._ecraseT > 0) ctx.translate(Math.sin(t * 40 + e.phase) * e.size * 0.02, 0);
  },

  // LE PLIAGE PAR TRANCHES — la seule façon de courber un dessin le long d'un
  // ARC DE CERCLE : une matrice affine ne sait pas plier (le cabré-cisaillement
  // « penchait » au lieu de courber, jugé « complètement nul », à raison). Le
  // poisson est rendu une fois hors écran, puis redessiné en douze tranches
  // verticales dont chacune tourne un peu plus que la précédente — l'ANCRE est
  // au tiers arrière : la queue reste posée, le corps se dresse. `tete` (0→1)
  // froisse EN PLUS les tranches du museau en accordéon (le crash du Coyote
  // n'aplatit que la tête, pas tout le poisson). Marche pour toute silhouette,
  // procédurale ou dessinée, et ne coûte que pendant une scène (un rendu hors
  // écran sur-résolu ×2 + douze drawImage, pour un ou deux acteurs à la fois).
  plier(ctx, e, t, arc, tete) {
    const s = Math.max(8, e.size);
    const R = 2;                                   // sur-résolution (zoom, atelier)
    const W = Math.ceil(s * 4.6 * R), H = Math.ceil(s * 3.2 * R);
    let cv = this._plieCv;
    if (!cv) cv = this._plieCv = (typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(W, H) : document.createElement('canvas'));
    if (cv.width < W) cv.width = W;
    if (cv.height < H) cv.height = H;
    const oc = cv.getContext('2d');
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.clearRect(0, 0, W, H);
    oc.setTransform(R, 0, 0, R, W / 2, H / 2);
    this.draw(oc, e, t);

    const N = 12, iAncre = 4;                      // ancre au tiers arrière
    const wSrc = W / N, wMonde = wSrc / R;
    const hMonde = H / R;
    const chev = 1.6;                              // recouvrement anti-couture
    const dAng = arc / (N - iAncre);               // la courbure, par tranche
    let px = -W / (2 * R) + iAncre * wMonde, py = 0, ang = 0;
    for (let i = iAncre; i < N; i++) {
      // Le froissement de tête : les 4 tranches du museau se compriment de
      // plus en plus fort (jusqu'à 25 % de leur largeur), et regonflent un
      // peu en hauteur — l'accordéon est LOCAL, le corps derrière ne bouge pas.
      const uTete = U.clamp((i - (N - 5)) / 4, 0, 1);
      const kx = 1 - tete * uTete * 0.75;
      const ky = 1 + tete * uTete * 0.3;
      ctx.save();
      ctx.translate(px, py); ctx.rotate(ang); ctx.scale(kx, ky);
      ctx.drawImage(cv, i * wSrc, 0, wSrc + chev * R, H,
                    0, -hMonde / 2, wMonde + chev, hMonde);
      ctx.restore();
      px += Math.cos(ang) * wMonde * kx; py += Math.sin(ang) * wMonde * kx;
      ang += dAng;
    }
    // Derrière l'ancre, la queue reste droite et posée.
    px = -W / (2 * R) + iAncre * wMonde;
    for (let i = iAncre - 1; i >= 0; i--) {
      px -= wMonde;
      ctx.drawImage(cv, i * wSrc, 0, wSrc + chev * R, H,
                    px, -hMonde / 2, wMonde + chev, hMonde);
    }
  },

  // POSES PAR DÉFAUT de la colonne, en fractions de la longueur du dessin :
  // tout sprite les joue sans réglage, et un dessin peut les remplacer par les
  // siennes (`doc.poses`, dessinées dans l'éditeur de colonne de l'atelier).
  // `rot` oriente L'ENSEMBLE (radians, négatif = nez vers le haut).
  POSES: {
    // Le cabré tire le museau en ARRIÈRE et en haut : c'est le repli en C.
    cabre: { dx: [0, 0, -0.02, -0.09, -0.2], dy: [0, -0.01, -0.1, -0.27, -0.46],
             sy: [1, 1, 1.05, 1.08, 1.02], rot: -0.3, duree: 0.8 },
    // Le crash ramène le museau DANS le corps (accordéon) et le regonfle.
    crash: { dx: [0, 0, 0, -0.05, -0.16], dy: [0, 0, 0, 0, 0],
             sy: [1, 1, 1, 1.3, 1.7], rot: 0, duree: 1.9 },
  },

  // LA TIMELINE DE POSES CLÉS — l'état de la colonne à l'instant `u` d'une
  // animation (`doc.animes`). Chaque clé référence une POSE NOMMÉE (du dessin,
  // sinon des défauts, sinon le neutre) et peut poser un VISAGE ; entre deux
  // clés, les poignées sont interpolées en douceur. Le visage retenu est celui
  // de la dernière clé passée qui en déclare un — pas d'interpolation : une
  // expression se joue, elle ne se fond pas. UN SEUL lecteur, partagé par le
  // jeu (`rendreScene`) et l'aperçu de l'atelier : deux copies divergeraient.
  poseAt(sp, an, poses, u) {
    const cles = an.cles;
    const res = (nom) => (nom && ((poses && poses[nom]) || this.POSES[nom])) || null;
    let a = cles[0], b = cles[cles.length - 1];
    for (const c of cles) {
      if (c.t <= u) a = c;
      if (c.t >= u) { b = c; break; }
    }
    const f0 = res(a.pose), f1 = res(b.pose);
    const f = (a === b) ? 1 : U.clamp((u - a.t) / Math.max(1e-3, b.t - a.t), 0, 1);
    const s = f * f * (3 - 2 * f);
    const ZERO = [0, 0, 0, 0, 0], UN = [1, 1, 1, 1, 1];
    const mix = (A, B, neutre, i) => {
      const va = (A && A[i] != null) ? A[i] : neutre[i];
      const vb = (B && B[i] != null) ? B[i] : neutre[i];
      return va + (vb - va) * s;
    };
    const dx = [], dy = [], sy = [];
    for (let i = 0; i < 5; i++) {
      dx.push(mix(f0 && f0.dx, f1 && f1.dx, ZERO, i));
      dy.push(mix(f0 && f0.dy, f1 && f1.dy, ZERO, i));
      sy.push(mix(f0 && f0.sy, f1 && f1.sy, UN, i));
    }
    const r0 = (f0 && f0.rot) || 0, r1 = (f1 && f1.rot) || 0;
    let visage = null;
    for (const c of cles) if (c.t <= u && c.visage) visage = c.visage;
    return { dx, dy, sy, rot: r0 + (r1 - r0) * s, visage };
  },

  // Le corps d'une scène. Un SPRITE se plie par sa COLONNE (déformation des
  // POINTS — même chemin de code que l'onde de queue, donc même qualité,
  // aucune couture) ; une silhouette procédurale, qui n'a pas de points, garde
  // le pliage par tranches. Les gags passent par `_crispe` (→ pose `cabre`) et
  // `_ecraseT` (→ pose `crash`) ; l'atelier pose `_poseMain` directement.
  rendreScene(ctx, e, t) {
    const sp = (e.def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(e.def.sprite) : null;
    if (e._poseMain && sp) {                       // l'éditeur de l'atelier
      if (e._poseMain.rot) ctx.rotate(e._poseMain.rot * (e._poseMain.k ?? 1));
      e._colonne = e._poseMain;
      this.draw(ctx, e, t);
      e._colonne = null;
      return;
    }
    // LA PISTE VISAGE : une animation de visage seul (aucune clé de pose) se
    // combine PAR-DESSUS tout le reste — corps animé ou pas (décision
    // d'auteur : « une animation à la fois, mais combinée à des animations de
    // visage »). Si la piste CORPS pose aussi un visage sur la même frame,
    // c'est elle qui gagne (appliquée après) — cas rare et sans enjeu.
    const af = (e._animeFace && sp) ? Sprites.clipDe(sp, e._animeFace.nom) : null;
    if (af) {
      if (af.cles && af.cles.length) {
        if (e._animeFace.t0 == null) e._animeFace.t0 = t;
        let uf = t - e._animeFace.t0;
        const finF = af.cles[af.cles.length - 1].t || 0;
        if (af.boucle && finF > 0.05) uf = uf % finF;
        if (!af.boucle && uf > finF + 0.2) {
          if (e._animeFaceV) { e.release(); e._animeFaceV = false; }
          e._animeFace = null;
        } else {
          let vis = null;
          for (const c of af.cles) if (c.t <= uf && c.visage) vis = c.visage;
          if (vis) { e.hold(vis); e._animeFaceV = true; }
          else if (e._animeFaceV) { e.release(); e._animeFaceV = false; }
        }
      }
    }
    // UNE ANIMATION DU DESSIN EN COURS (timeline `doc.animes`, lancée par
    // `Entity.jouerAnime` sur un événement) : elle prime sur les poses
    // génériques de scène — c'est tout son sens : « un animal bizarre quand
    // il mange s'anime autrement que la bouche générique ».
    const anC = (e._anime && sp) ? Sprites.clipDe(sp, e._anime.nom) : null;
    if (anC) {
      const an = anC;
      if (an.cles && an.cles.length) {
        if (e._anime.t0 == null) e._anime.t0 = t;
        let u = t - e._anime.t0;
        const fin = an.cles[an.cles.length - 1].t || 0;
        if (an.boucle && fin > 0.05) u = u % fin;
        if (!an.boucle && u > fin + 0.2) {
          if (e._animeVisage) { e.release(); e._animeVisage = false; }
          e._anime = null;                         // finie : retour au générique
        } else {
          const p = this.poseAt(sp, an, sp.poses, u);
          if (p.visage) { e.hold(p.visage); e._animeVisage = true; }
          else if (e._animeVisage) { e.release(); e._animeVisage = false; }
          if (p.rot) ctx.rotate(p.rot);
          e._colonne = { dx: p.dx, dy: p.dy, sy: p.sy, k: 1 };
          this.draw(ctx, e, t);
          e._colonne = null;
          return;
        }
      }
    }
    const crispe = U.clamp(e._crispe ?? 0, 0, 1);
    const tete = U.clamp(e._poseTete ?? (e._ecraseT > 0 ? 1 : 0), 0, 1);
    if (crispe < 0.02 && tete < 0.02) { this.draw(ctx, e, t); return; }
    if (sp) {
      const nom = tete >= crispe ? 'crash' : 'cabre';
      const k = Math.max(crispe, tete);
      const pose = (sp.poses && sp.poses[nom]) || this.POSES[nom];
      if (pose.rot) ctx.rotate(pose.rot * k);
      e._colonne = { dx: pose.dx, dy: pose.dy, sy: pose.sy, k };
      this.draw(ctx, e, t);
      e._colonne = null;
      return;
    }
    this.plier(ctx, e, t, -1.05 * crispe, tete);
  },

  // LE SMEAR — des TRAÎNÉES, pas des copies : chaque écho est plus reculé,
  // plus étiré, plus aplati et plus transparent que le précédent, dessiné
  // AVANT le corps (le corps fond en stries vers l'arrière — dessin de
  // référence de l'auteur). Réservé aux scènes (`_smear`), jamais à la nage.
  smear(ctx, e, t) {
    const k = U.clamp(e._smear ?? 0, 0, 1);
    if (k <= 0.06) return;
    const ga = ctx.globalAlpha;
    for (const [recul, etirX, alpha] of [[1.5, 1.55, 0.08], [0.95, 1.3, 0.16], [0.45, 1.12, 0.3]]) {
      ctx.save();
      ctx.translate(-e.size * recul * k, 0);
      ctx.scale(1 + (etirX - 1) * k, 1 - 0.25 * k);
      ctx.globalAlpha = ga * alpha * k;
      this.draw(ctx, e, t);
      ctx.restore();
    }
    ctx.globalAlpha = ga;
  },

  // Fréquence de battement, en rad/s. Un gros animal bat lentement : c'est la
  // première chose qu'on lit dans une nage.
  battement(e, base = 1.9, gain = 3.2) {
    const gabarit = U.clamp(Math.pow(30 / Math.max(8, e.def.size), 0.45), 0.35, 1.15);
    return U.clamp((base + this.allure(e) * gain) * gabarit, 0.6, 8.5);
  },

  // PHASE DE NAGE — il faut INTÉGRER la fréquence, jamais écrire `sin(t * f)`.
  //
  // `f` dépend de la vitesse, donc elle change à chaque frame ; or dans `t * f`
  // une variation Δf déplace la phase de t·Δf. Après trois minutes de jeu
  // (t = 180), un frémissement de 0,3 rad/s décale l'animation de 54 radians —
  // huit tours et demi — ENTRE DEUX FRAMES. Ça ne se lit pas comme une
  // fréquence, ça se lit comme un frétillement à toute vitesse : c'est
  // exactement ce qui restait sur l'Anguille alors que sa fréquence, elle,
  // avait bien été ramenée à 2 rad/s.
  //
  // Corollaire : plus la partie dure, plus l'artefact est violent. Invisible en
  // test court, flagrant après dix minutes de jeu.
  phaseNage(e, f, t) {
    const dt = U.clamp(t - (e._nageT ?? t), 0, 0.1);
    e._nageT = t;
    return (e._nagePh = (e._nagePh ?? (e.phase || 0)) + f * dt);
  },

  drawEel(ctx, e, t) {
    const s = e.size;
    const strike = U.clamp(e.strikeT ?? 0, 0, 1);
    const SEG = 12;
    const amp = s * 0.5 * (0.3 + strike * 0.7);

    // SON rocher percé (un rocher = une murène, GDD §12), à position FIXE : le
    // corps coulisse hors du trou, la queue y reste toujours accrochée — sans ça
    // la murène semble s'allonger dans le vide quand elle jaillit.
    const holeX = -s * 1.1;
    // Le rocher épouse la pente du fond ; la murène, elle, reste horizontale.
    ctx.save();
    ctx.translate(holeX, 0);
    // Le repère peut être miroité (poisson tourné vers la gauche) : dans ce cas
    // la pente doit être inversée, sinon le rocher part de travers.
    ctx.rotate(Math.atan(World.slopeAt(e.x)) * (e._facing < 0 ? -1 : 1));
    // GROS bloc anguleux, dessiné en dur autour du trou : on doit voir que la
    // murène habite DANS un rocher, pas devant.
    const R = s * 3.1;
    ctx.fillStyle = '#39404c';
    ctx.beginPath();
    const N = 11;
    for (let i = 0; i <= N; i++) {
      const a = Math.PI + (i / N) * Math.PI;
      const rr = R * (0.72 + 0.28 * Math.abs(Math.sin(i * 2.7 + e.phase)));
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * 0.78 + s * 0.5;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.lineTo(R, s * 0.6); ctx.lineTo(-R, s * 0.6);
    ctx.closePath(); ctx.fill();
    // facette éclairée sur le dessus
    ctx.fillStyle = 'rgba(210,228,246,0.10)';
    ctx.beginPath();
    ctx.moveTo(-R * 0.85, s * 0.2);
    ctx.lineTo(-R * 0.3, -R * 0.62);
    ctx.lineTo(R * 0.15, -R * 0.5);
    ctx.lineTo(-R * 0.1, s * 0.2);
    ctx.closePath(); ctx.fill();
    // Le trou : bien ROND, creusé dans le bloc, avec un liseré d'ombre
    const hr = s * 0.72;
    const g = ctx.createRadialGradient(0, 0, hr * 0.2, 0, 0, hr);
    g.addColorStop(0, '#05070a');
    g.addColorStop(0.75, '#14181f');
    g.addColorStop(1, '#252b34');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(0, 0, hr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Corps serpentin : de la bouche du trou (fixe) jusqu'à la tête, qui avance
    // avec le jaillissement.
    const headX = holeX + s * (0.75 + strike * 4.2);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pt = (i) => {
      const u = i / SEG;                            // 0 = queue (dans le trou), 1 = tête
      const px = U.lerp(holeX, headX, u);
      const py = Math.sin(u * 5.2 - t * 3.4 - e.phase) * amp * (0.15 + u * 0.9);
      return [px, py];
    };
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? e.colorDark : e.color;
      ctx.lineWidth = s * (pass === 0 ? 1.05 : 0.8);
      ctx.beginPath();
      for (let i = 0; i <= SEG; i++) {
        const p = pt(i);
        i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }

    // Tête (un peu plus massive) au bout avant
    const head = pt(SEG);
    ctx.save();
    ctx.translate(head[0], head[1]);
    const prev = pt(SEG - 1);
    ctx.rotate(Math.atan2(head[1] - prev[1], head[0] - prev[0]));
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.75, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    // petites dents pointues sur la mâchoire
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const dx = s * (0.25 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(dx, s * 0.1); ctx.lineTo(dx + s * 0.09, s * 0.1); ctx.lineTo(dx + s * 0.045, s * 0.3);
      ctx.closePath(); ctx.fill();
    }
    this.face(ctx, s * 0.9, e, t);
    ctx.restore();
  },

  // Étoile de mer : 5 bras arrondis, visage au centre, bras repliés en "câlin"
  // quand elle est contente.
  // OURSIN : une boule hérissée, posée sur le sable. Les piquants ondulent très
  // lentement — c'est ce qui le distingue d'un caillou. Le visage commun passe
  // par-dessus, comme pour tout le monde.
  drawUrchin(ctx, e, t) {
    const s = e.size;
    // IL HÉRISSE SES PIQUANTS quand quelque chose approche. `_piquantGonfle`
    // est déjà calculé par `Entity.piquer` pour tous les piquants (c'est lui
    // qui gonfle le Fugu) : ici il allonge les épines et les fait frémir. Sans
    // ça, l'Oursin était le seul piquant du jeu qui ne prévenait pas — on se
    // piquait dessus sans avoir rien vu venir.
    const herisse = e._piquantGonfle ?? 0;
    const respire = 1 + Math.sin(t * 0.7 + e.phase) * 0.04 + herisse * 0.3;
    // Piquants : deux couronnes décalées, pour que la boule paraisse pleine
    ctx.strokeStyle = e.colorDark;
    ctx.lineCap = 'round';
    for (let c = 0; c < 2; c++) {
      const n = c ? 11 : 13;
      ctx.lineWidth = Math.max(1.4, s * (c ? 0.1 : 0.14));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + c * 0.28
                + Math.sin(t * (0.5 + herisse * 26) + i) * (0.03 + herisse * 0.05);
        const L = s * (c ? 1.5 : 1.85) * respire;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55);
        ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L);
        ctx.stroke();
      }
    }
    // Test (la coquille)
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.75 * respire, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.22, s * 0.4, 0, Math.PI * 2); ctx.fill();
    this.face(ctx, s * 0.62, e, t);
  },

  // TORTUE : carapace bombée à écailles, quatre nageoires qui rament en
  // alternance, une petite tête qui sort devant. Elle rame LENTEMENT — c'est
  // toute sa personnalité, et ça se voit à la fréquence, pas à la forme.
  drawTurtle(ctx, e, t) {
    const s = e.size;
    const rame = Math.sin(t * 1.5 + e.phase);

    // Nageoires arrière (petites, derrière la carapace)
    ctx.fillStyle = e.colorDark;
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(-s * 0.62, sgn * s * 0.42);
      ctx.rotate(sgn * (0.5 + rame * 0.2));
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.32, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Grandes nageoires avant : elles rament en OPPOSITION, sinon elle bat des
    // deux « bras » à l'unisson et on dirait qu'elle applaudit.
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(s * 0.3, sgn * s * 0.4);
      ctx.rotate(sgn * (0.35 + rame * sgn * 0.55));
      ctx.fillStyle = sgn < 0 ? e.colorDark : e.color;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.7, sgn * s * 0.25, s * 1.05, sgn * s * 0.12);
      ctx.quadraticCurveTo(s * 0.65, sgn * s * 0.5, 0, sgn * s * 0.22);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // Carapace
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    // Écailles : un damier grossier, qui suffit à dire « tortue »
    ctx.strokeStyle = 'rgba(40,60,40,0.35)';
    ctx.lineWidth = Math.max(1, s * 0.05);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * s * 0.42, 0, s * 0.2, s * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath(); ctx.ellipse(-s * 0.1, -s * 0.3, s * 0.55, s * 0.24, -0.2, 0, Math.PI * 2); ctx.fill();

    // Tête devant (le visage commun s'y pose)
    ctx.fillStyle = e.colorDark;
    ctx.beginPath(); ctx.ellipse(s * 1.02, s * 0.02, s * 0.34, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(s * 1.02, s * 0.02);
    this.face(ctx, s * 0.36, e, t);
    ctx.restore();
  },

  drawStar(ctx, e, t) {
    const s = e.size;
    const hug = e.expression === 'happy'
      ? 0.18 + Math.sin(t * 3 + e.phase) * 0.07
      : Math.sin(t * 1.1 + e.phase) * 0.03;

    ctx.fillStyle = e.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2 + hug * 0.4;
      const na = (i + 1) / 5 * Math.PI * 2 - Math.PI / 2 + hug * 0.4;
      const mid = (a + na) / 2;
      const R = s * (1.35 - hug);                       // bras qui se replient
      const r = s * 0.5;
      const px = Math.cos(a) * R, py = Math.sin(a) * R;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      // creux arrondi entre deux bras
      ctx.quadraticCurveTo(Math.cos(mid) * r * 1.35, Math.sin(mid) * r * 1.35,
                           Math.cos(na) * R, Math.sin(na) * R);
    }
    ctx.closePath();
    ctx.fill();

    // Disque central plus clair + picots
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.colorDark;
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2 + hug * 0.4;
      for (let k = 1; k <= 2; k++) {
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s * k * 0.42, Math.sin(a) * s * k * 0.42, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.drawSpots(ctx, e);
    ctx.save(); ctx.scale(0.72, 0.72); ctx.translate(-s * 0.55, 0);
    this.face(ctx, s, e, t);
    ctx.restore();
  },

  // Ver-tapis : bosse allongée couleur sable posée au sol, deux yeux qui
  // dépassent à peine ; grande bouche douce quand il mange.
  drawWorm(ctx, e, t) {
    const s = e.size;
    const eating = e.expression === 'eating';
    // JAILLISSEMENT : `strikeT` monte de 0 à 1 quand l'embusqué se détend. Sans
    // le brancher ici, l'attaque du Poisson-Tapis était totalement invisible —
    // la proie disparaissait sans qu'on ait vu la carpette bouger.
    const jaillit = (e.state === 'strike' || e.state === 'retract') ? (e.strikeT || 0) : 0;
    // `_gueule` (GAGS.poisson_tapis) : il entrouvre déjà quand une proie
    // approche, et ouvre EN GRAND au jaillissement. Sans cette anticipation,
    // la gueule apparaissait d'un coup et le gag ne se lisait pas.
    const open = Math.max(eating ? (Math.sin(t * 8 + e.phase) * 0.5 + 0.5) * 0.6 + 0.4 : 0,
                          jaillit, e._gueule || 0);
    const breath = Math.sin(t * 1.3 + e.phase) * s * 0.06;
    // Il se cabre : le corps se soulève et se ramasse d'avant en arrière
    ctx.save();
    ctx.translate(s * 0.5 * jaillit, -s * 0.5 * jaillit);

    // Bosse camouflée (sable), posée sur le sol : origine ≈ centre, on la plaque
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(-s * 2.2, s * 0.45);
    ctx.quadraticCurveTo(-s * 1.1, -s * (0.55 + breath / s), 0, -s * (0.62 + breath / s));
    ctx.quadraticCurveTo(s * 1.2, -s * (0.55 - breath / s), s * 2.2, s * 0.45);
    ctx.closePath();
    ctx.fill();
    // grain de sable
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 6; i++) {
      const u = (i / 5) * 2 - 1;
      ctx.beginPath();
      ctx.arc(u * s * 1.6, -s * 0.15 - Math.cos(u * 1.4) * s * 0.2, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }

    if (open > 0) {
      // Grande bouche douce (ovale sombre + lèvre claire)
      ctx.fillStyle = '#5a2d3d';
      ctx.beginPath();
      ctx.ellipse(s * 0.55, s * 0.05, s * 0.75, s * 0.7 * open, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = e.colorDark; ctx.lineWidth = Math.max(1.2, s * 0.09);
      ctx.beginPath();
      ctx.ellipse(s * 0.55, s * 0.05, s * 0.75, s * 0.7 * open, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Deux yeux qui dépassent à peine : on réutilise drawFace deux fois en le
    // décalant, mais tronqué visuellement par la bosse (clip sur la partie haute).
    ctx.save();
    ctx.beginPath();
    ctx.rect(-s * 2.4, -s * 2.4, s * 4.8, s * (2.4 - 0.05));   // ne garde que le haut
    ctx.clip();
    ctx.save();
    ctx.scale(0.6, 0.6); ctx.translate(-s * 0.2, -s * 0.55);
    const vT = this.visageDe(e);
    this.drawFace(ctx, s, eating ? 'idle' : e.expression, t + e.phase, e.emoteK(),
                  null, false, vT.pal, vT.style);
    ctx.restore();
    ctx.restore();
    ctx.restore();
  },

  // Anémone : pied + couronne de tentacules ondulants. PAS de visage (décor vivant).
  drawAnemone(ctx, e, t) {
    const s = e.size;
    const shy = e.expression === 'scared' ? 0.55 : 1;   // repli des tentacules

    // Pied
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.75, s * 1.0);
    ctx.quadraticCurveTo(-s * 0.45, s * 0.1, -s * 0.3, -s * 0.15);
    ctx.lineTo(s * 0.3, -s * 0.15);
    ctx.quadraticCurveTo(s * 0.45, s * 0.1, s * 0.75, s * 1.0);
    ctx.closePath();
    ctx.fill();

    // Couronne de tentacules
    ctx.lineCap = 'round';
    const N = 11;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const bx = U.lerp(-s * 0.62, s * 0.62, u);
      const spread = (u - 0.5) * 2;
      const w = Math.sin(t * 1.8 + e.phase + i * 0.8);
      const h = s * (1.5 - Math.abs(spread) * 0.45) * shy;
      ctx.strokeStyle = i % 2 ? e.colorAlpha(0.9) : e.colorAlpha(0.65);
      ctx.lineWidth = Math.max(2, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(bx, -s * 0.1);
      ctx.quadraticCurveTo(bx + spread * s * 0.5 + w * s * 0.12, -s * 0.1 - h * 0.6,
                           bx + spread * s * 0.95 + w * s * 0.3, -s * 0.1 - h);
      ctx.stroke();
      // pointe claire
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(bx + spread * s * 0.95 + w * s * 0.3, -s * 0.1 - h, Math.max(1.2, s * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Oiseau marin (Moustachu Volant) : corps ovale, ailes battantes, bec orange,
  // grosse moustache noire. e.wet → gouttes + air vexé.
  drawBird(ctx, e, t) {
    const s = e.size;
    const wet = !!e.wet;
    const flap = Math.sin(t * (wet ? 6 : 11) + e.phase);
    const expr = wet ? 'scared' : e.expression;

    // Aile arrière (plus sombre)
    ctx.save();
    ctx.translate(-s * 0.15, -s * 0.1);
    ctx.rotate(-flap * 0.7 - 0.2);
    ctx.fillStyle = e.colorDark;
    ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.35, s * 0.75, s * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Queue
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.5, -s * 0.3);
    ctx.lineTo(-s * 1.45, s * 0.3);
    ctx.closePath(); ctx.fill();

    // Corps ovale
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.2, s * 0.65, s * 0.32, 0, 0, Math.PI * 2); ctx.fill();

    // Bec orange
    ctx.fillStyle = '#ff9a2e';
    ctx.beginPath();
    ctx.moveTo(s * 0.85, -s * 0.05);
    ctx.lineTo(s * 1.6, s * 0.12);
    ctx.lineTo(s * 0.85, s * 0.25);
    ctx.closePath(); ctx.fill();

    // Aile avant battante
    ctx.save();
    ctx.translate(-s * 0.05, -s * 0.05);
    ctx.rotate(flap * 0.9 - 0.15);
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.3, s * 0.8, s * 0.3, -0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.45);
    ctx.lineTo(-s * 1.0, -s * 0.75);
    ctx.lineTo(-s * 0.55, -s * 0.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Visage commun. Un oiseau réclame en général le style de bouche `bec` :
    // c'est un réglage d'espèce (`def.boucheStyle`), pas un rendu à part.
    const vO = this.visageDe(e);
    this.drawFace(ctx, s, expr, t + e.phase, e.emoteK(), null, false, vO.pal, vO.style);

    // Le PÉLICAN a une poche à la place de la moustache. Elle se remplit quand
    // il vient d'attraper quelque chose (`_chew`) et quand il rate (`_poche`),
    // et le poisson s'y agite : c'est là que se joue tout son gag.
    if (e.def.pouch) {
      const bourre = Math.max(e._chew > 0 ? 1 : 0, e._poche ?? 0);
      const gonf = 1 + bourre * 1.5;
      const remue = bourre > 0 ? Math.sin(t * 26 + e.phase) * s * 0.09 * bourre : 0;
      ctx.fillStyle = '#f0a54a';
      ctx.beginPath();
      ctx.moveTo(s * 0.82, s * 0.02);
      ctx.quadraticCurveTo(s * (1.25 + bourre * 0.1), s * (0.35 * gonf) + remue,
                           s * 1.58, s * 0.14);
      ctx.quadraticCurveTo(s * 1.2, s * (0.18 * gonf), s * 0.86, s * 0.24);
      ctx.closePath(); ctx.fill();
      // La bosse du poisson dedans, quand il y en a un
      if (bourre > 0.15) {
        ctx.fillStyle = 'rgba(190,110,40,0.55)';
        ctx.beginPath();
        ctx.ellipse(s * 1.15, s * (0.2 + 0.16 * bourre) + remue,
                    s * 0.22 * bourre, s * 0.13 * bourre, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {

    // GROSSE moustache noire sous le bec
    ctx.fillStyle = '#1c2733';
    ctx.beginPath();
    ctx.moveTo(s * 0.9, s * 0.2);
    ctx.quadraticCurveTo(s * 0.4, s * 0.05, s * 0.05, s * 0.42);
    ctx.quadraticCurveTo(s * 0.45, s * 0.32, s * 0.62, s * 0.52);
    ctx.quadraticCurveTo(s * 0.8, s * 0.36, s * 0.95, s * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.9, s * 0.2);
    ctx.quadraticCurveTo(s * 1.25, s * 0.15, s * 1.35, s * 0.45);
    ctx.quadraticCurveTo(s * 1.05, s * 0.35, s * 0.92, s * 0.42);
    ctx.closePath(); ctx.fill();

    }

    if (wet) {
      // Sourcil vexé au-dessus de l'œil + gouttes qui perlent
      ctx.strokeStyle = '#1c2733'; ctx.lineWidth = Math.max(1.5, s * 0.09); ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.52); ctx.lineTo(s * 0.75, -s * 0.36);
      ctx.stroke();
      ctx.fillStyle = 'rgba(160,220,255,0.85)';
      for (let i = 0; i < 3; i++) {
        const ph = (t * 1.4 + e.phase + i * 0.6) % 1;
        const dx = -s * (0.6 - i * 0.5);
        ctx.beginPath();
        ctx.ellipse(dx, s * (0.5 + ph * 1.1), s * 0.1, s * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  // Poisson-lanterne : petit corps rond sombre + antenne à lampe. La lampe ne
  // s'allume que la nuit (Main.nightAmount() > 0.5) et clignote en faux morse.
  drawLantern(ctx, e, t) {
    const s = e.size;
    // LA NUIT, ON NE VOIT PLUS QUE SA LANTERNE. `_fondu` (piloté par
    // GAGS.lanterne) fait disparaitre le CORPS en fondu ; le fanal, lui, est
    // dessine hors de ce voile. Elle reapparait quand elle mange.
    const fondu = e._fondu != null ? e._fondu : 1;
    const night = (typeof Main !== 'undefined' && Main.nightAmount) ? Main.nightAmount() : 0;
    // faux morse : superposition de deux carrés d'onde de périodes premières
    const k = t * 2.2 + e.phase;
    const morse = (Math.sin(k) > -0.1 ? 1 : 0) * (Math.sin(k * 3.7) > -0.55 ? 1 : 0);
    // EN PÊCHE (`_lureOn`), la lampe reste allumée FIXE, de jour comme de nuit :
    // c'est l'appât, il faut la voir briller pour comprendre pourquoi les
    // crevettes viennent droit dessus. Le reste du temps elle clignote en
    // faux morse, et seulement la nuit.
    const peche = !!e._lureOn;
    const lit = peche ? 1 : (night > 0.5 ? morse : 0);
    const eclat = peche ? 1 : Math.min(1, night);

    // Le CORPS s'efface la nuit (`fondu`), pas le fanal : c'est tout le gag.
    const alphaAvant = ctx.globalAlpha;
    ctx.globalAlpha = alphaAvant * fondu;

    // Antenne (part du front, s'arque vers l'avant)
    ctx.strokeStyle = e.colorDark;
    ctx.lineWidth = Math.max(1.2, s * 0.09); ctx.lineCap = 'round';
    const lx = s * 1.15 + Math.sin(t * 1.6 + e.phase) * s * 0.12;
    const ly = -s * 1.25 + Math.cos(t * 1.9 + e.phase) * s * 0.1;
    ctx.beginPath();
    ctx.moveTo(s * 0.1, -s * 0.7);
    ctx.quadraticCurveTo(s * 0.5, -s * 1.6, lx, ly);
    ctx.stroke();

    // Corps rond sombre
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * (e.def.bodyRatio || 0.85), 0, 0, Math.PI * 2); ctx.fill();
    // queue courte
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.35, -s * 0.42);
    ctx.quadraticCurveTo(-s * 1.15, 0, -s * 1.35, s * 0.42);
    ctx.closePath(); ctx.fill();
    // dents rigolotes
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const dx = s * (0.35 + i * 0.18);
      ctx.beginPath();
      ctx.moveTo(dx, s * 0.32); ctx.lineTo(dx + s * 0.1, s * 0.32); ctx.lineTo(dx + s * 0.05, s * 0.5);
      ctx.closePath(); ctx.fill();
    }

    // Lampe — TOUJOURS pleinement visible : c'est le seul repère qui reste
    // quand le corps a disparu dans le noir.
    ctx.globalAlpha = alphaAvant;
    ctx.save();
    if (lit) {
      // aura de la lampe : halo pré-rendu (§5.9), à la place de shadowBlur
      this.halo(ctx, lx, ly, s * 0.6 + 22 * eclat, '#ffe9a3', 0.8 * eclat);
      ctx.fillStyle = '#fff6c9';
    } else {
      ctx.fillStyle = e.colorDark;
    }
    ctx.beginPath(); ctx.arc(lx, ly, s * 0.3, 0, Math.PI * 2); ctx.fill();
    if (lit) {
      // Halo pulsant pendant la pêche : la lampe APPELLE, elle ne se contente
      // pas d'éclairer. Un halo fixe se confondait avec la luminescence de nuit.
      const pulse = peche ? 1 + Math.sin(t * 4 + e.phase) * 0.25 : 1;
      ctx.fillStyle = `rgba(255,240,180,${0.25 * eclat})`;
      ctx.beginPath(); ctx.arc(lx, ly, s * 0.7 * pulse, 0, Math.PI * 2); ctx.fill();
      if (peche) {
        ctx.fillStyle = 'rgba(255,235,150,0.1)';
        ctx.beginPath(); ctx.arc(lx, ly, s * 1.8 * pulse, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    ctx.globalAlpha = alphaAvant * fondu;
    this.drawSpots(ctx, e);
    this.face(ctx, s, e, t);
    ctx.globalAlpha = alphaAvant;
  },

  // CALAMAR (et Calamar Géant) : manteau en cône pointé vers l'arrière, deux
  // ailerons triangulaires en bout de manteau, une couronne de bras déployés
  // vers l'avant. Même convention que le Poulpe (tête devant, appendices
  // derrière la tête) : dans un aquarium, on lit d'abord le sens de nage.
  //
  // `def.giantSquid` ajoute les deux longs tentacules de chasse à massue, et
  // `e._repli` (0 → 1, piloté par le gag de la timidité) referme les bras en
  // fuseau : c'est le géant qui se fait tout petit.
  // Halo lumineux PRÉ-RENDU (PERFORMANCE.md §5.9) : remplace ctx.shadowBlur,
  // l'opération la plus chère de Canvas 2D en rendu logiciel — supportable en
  // eau claire (4 appels/frame mesurés), ruineuse dans les abysses où toutes
  // les créatures luminescentes sont réunies. Un disque en dégradé radial par
  // couleur, mis en cache une fois pour toutes, posé au drawImage.
  _halos: {},
  halo(ctx, x, y, r, color, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    let c = this._halos[color];
    if (!c) {
      c = this._halos[color] = document.createElement('canvas');
      c.width = c.height = 64;
      const hc = c.getContext('2d');
      // La couleur peut arriver en « #rrggbb » (une palette) ou en « rgb(…) »
      // (une teinte tirée au sort par individu) : les deux doivent donner leur
      // vraie lueur, pas un halo blanc de repli.
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color || '');
      const rgb = m ? [+m[1], +m[2], +m[3]]
                    : U.hexRGB(color && color.startsWith('#') ? color : '#ffffff');
      const g = hc.createRadialGradient(32, 32, 2, 32, 32, 32);
      g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.85)`);
      g.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.28)`);
      g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      hc.fillStyle = g;
      hc.fillRect(0, 0, 64, 64);
    }
    const ga = ctx.globalAlpha;
    ctx.globalAlpha = ga * Math.min(1, alpha);
    ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = ga;
  },

  drawSquid(ctx, e, t) {
    const s = e.size;
    const geant = !!e.def.giantSquid;
    const glow = e.def.glowAtNight ? Main.nightAmount() : 0;
    const repli = e._repli || 0;
    const nage = Math.sin(t * 2.6 + e.phase);          // propulsion par à-coups

    // --- Bras (derrière la tête, déployés vers l'arrière comme chez le poulpe)
    ctx.strokeStyle = e.colorDark;
    ctx.lineWidth = Math.max(1.4, s * (geant ? 0.1 : 0.13));
    ctx.lineCap = 'round';
    const nBras = 8;
    for (let i = 0; i < nBras; i++) {
      const u = (i / (nBras - 1)) * 2 - 1;              // -1 → 1
      const ouvert = U.lerp(1, 0.12, repli);            // le repli les rassemble
      const w = Math.sin(t * 3.4 + e.phase + i * 0.9) * (1 - repli);
      ctx.beginPath();
      ctx.moveTo(s * 0.5, u * s * 0.22);
      ctx.quadraticCurveTo(s * 0.85, u * s * 0.42 * ouvert + w * s * 0.12,
                           s * 1.2, u * s * 0.6 * ouvert + w * s * 0.24);
      ctx.stroke();
    }
    // Les deux longs tentacules de chasse du géant, terminés par une massue
    if (geant) {
      ctx.lineWidth = Math.max(1.2, s * 0.06);
      for (const u of [-1, 1]) {
        const ouvert = U.lerp(1, 0.15, repli);
        const w = Math.sin(t * 2.1 + e.phase + u) * (1 - repli);
        const tx = s * 1.85, ty = u * s * 0.42 * ouvert + w * s * 0.32;
        ctx.beginPath();
        ctx.moveTo(s * 0.5, u * s * 0.1);
        ctx.quadraticCurveTo(s * 1.2, u * s * 0.12 + w * s * 0.16, tx, ty);
        ctx.stroke();
        ctx.fillStyle = e.colorDark;
        ctx.beginPath(); ctx.ellipse(tx, ty, s * 0.16, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- Ailerons en bout de manteau (ils ondulent en continu)
    // bioluminescence : halo pré-rendu (§5.9), à la place de shadowBlur
    if (glow > 0.1) this.halo(ctx, -s * 0.45, 0, s * 1.7 + 20 * glow, e.color, 0.55 * glow);
    ctx.fillStyle = e.colorDark;
    const fin = s * (0.48 + nage * 0.08);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.72, sgn * s * 0.1);
      ctx.quadraticCurveTo(-s * 1.3, sgn * fin, -s * 1.5, sgn * s * 0.06);
      ctx.quadraticCurveTo(-s * 1.1, 0, -s * 0.72, sgn * s * 0.1);
      ctx.closePath(); ctx.fill();
    }

    // --- Manteau : cône qui s'effile vers l'arrière, gonflé au rythme de la nage
    const gonfle = 1 + nage * 0.07;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(s * 0.6, 0);
    ctx.quadraticCurveTo(s * 0.08, -s * 0.66 * gonfle, -s * 1.45, 0);
    ctx.quadraticCurveTo(s * 0.08, s * 0.66 * gonfle, s * 0.6, 0);
    ctx.closePath(); ctx.fill();

    // Nervures du manteau : sans elles c'est une simple goutte de couleur
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = Math.max(1, s * 0.05);
    for (let i = 1; i <= 3; i++) {
      const x = -s * (0.12 + i * 0.32);
      const h = s * 0.46 * gonfle * (1 - i * 0.22);
      ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h); ctx.stroke();
    }

    // --- Tête, entre le manteau et les bras
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(s * 0.5, 0, s * 0.5, s * 0.42, 0, 0, Math.PI * 2); ctx.fill();

    this.drawSpots(ctx, e);
    // Le visage sur la tête. Les yeux du calamar sont énormes — c'est sa
    // signature, et chez le géant c'est le détail qui le rend attachant.
    ctx.save();
    ctx.translate(s * 0.42, -s * 0.02);
    ctx.scale(geant ? 0.78 : 0.66, geant ? 0.78 : 0.66);
    this.face(ctx, s, e, t);
    ctx.restore();
  },

  // CREVETTE : petit corps arqué en segments, longues antennes, éventail
  // caudal. Elle est minuscule (7 px) — tout est joué au contour, et la
  // bioluminescence lui donne sa présence dans le noir des abysses.
  drawShrimp(ctx, e, t) {
    const s = e.size;
    const glow = e.def.glowAtNight ? Main.nightAmount() : 0;
    const flex = Math.sin(t * 7 + e.phase) * 0.22;      // elle se détend d'un coup

    // bioluminescence : halo pré-rendu (§5.9), à la place de shadowBlur —
    // crucial ici : les crevettes sont l'espèce la plus nombreuse des abysses
    // Clignotement d'essaim (GAGS.crevette) : tout le monde en rythme, sauf
    // une sur sept qui est toujours a contretemps.
    const cli = e._clignote != null ? (0.45 + 0.55 * e._clignote) : 1;
    if (glow > 0.1) this.halo(ctx, 0, 0, s * (1.5 + 0.35 * cli) + 14 * glow, e.color, 0.55 * glow * cli);

    // Antennes (vers l'avant, très longues)
    ctx.strokeStyle = e.colorDark; ctx.lineWidth = Math.max(0.8, s * 0.09); ctx.lineCap = 'round';
    for (const u of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.7, u * s * 0.12);
      ctx.quadraticCurveTo(s * 1.7, u * s * (0.3 + flex), s * 2.6, u * s * (0.7 + flex * 2));
      ctx.stroke();
    }
    // Pattes
    ctx.lineWidth = Math.max(0.6, s * 0.07);
    for (let i = 0; i < 4; i++) {
      const x = s * (0.5 - i * 0.32);
      ctx.beginPath();
      ctx.moveTo(x, s * 0.3);
      ctx.lineTo(x - s * 0.12, s * 0.62 + Math.sin(t * 9 + i + e.phase) * s * 0.08);
      ctx.stroke();
    }

    // Corps arqué : la tête devant, l'abdomen qui se recourbe vers le bas
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(s * 0.85, s * 0.05);
    ctx.quadraticCurveTo(s * 0.2, -s * (0.62 + flex * 0.3), -s * 0.95, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.42, s * 0.2, s * 0.4);
    ctx.closePath(); ctx.fill();

    // Éventail caudal
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, -s * 0.08);
    ctx.lineTo(-s * 1.7, -s * (0.5 - flex));
    ctx.quadraticCurveTo(-s * 1.35, 0, -s * 1.7, s * (0.42 + flex));
    ctx.closePath(); ctx.fill();

    // Segments de la carapace
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = Math.max(0.7, s * 0.06);
    for (let i = 0; i < 3; i++) {
      const x = -s * (0.05 + i * 0.3);
      ctx.beginPath(); ctx.moveTo(x, -s * 0.42); ctx.lineTo(x - s * 0.1, s * 0.28); ctx.stroke();
    }

    ctx.save();
    ctx.translate(s * 0.42, -s * 0.06); ctx.scale(0.6, 0.6);
    this.face(ctx, s, e, t);
    ctx.restore();
  },

  // Poisson-lune : grand disque plat, deux longues nageoires verticales,
  // petite bouche. Dérive quasi verticale (léger roulis).
  drawSunfish(ctx, e, t) {
    const s = e.size;
    const roll = Math.sin(t * 0.8 + e.phase) * 0.06;

    ctx.save();
    ctx.rotate(roll);

    // Nageoires verticales (dorsale haute + anale basse), ondulation lente
    ctx.fillStyle = e.colorDark;
    for (const sy of [-1, 1]) {
      const w = Math.sin(t * 1.6 + e.phase + (sy > 0 ? 1.2 : 0)) * s * 0.25;
      ctx.beginPath();
      ctx.moveTo(-s * 0.25, sy * s * 0.75);
      ctx.quadraticCurveTo(-s * 0.55 + w * 0.4, sy * s * 1.5,
                           -s * 0.35 + w, sy * s * 1.95);
      ctx.quadraticCurveTo(s * 0.15 + w * 0.6, sy * s * 1.4, s * 0.3, sy * s * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    // Corps discoïde presque circulaire, tronqué à l'arrière (nageoire caudale
    // réduite en "gouvernail")
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.02, s * 0.98, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.colorDark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.6);
    ctx.quadraticCurveTo(-s * 1.25, 0, -s * 0.7, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.85, 0, -s * 0.7, -s * 0.6);
    ctx.closePath(); ctx.fill();

    // Ventre clair + reflet
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(s * 0.12, s * 0.28, s * 0.72, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();

    // Petite pectorale
    ctx.fillStyle = e.colorDark;
    ctx.save();
    ctx.translate(s * 0.15, s * 0.25);
    ctx.rotate(Math.sin(t * 3 + e.phase) * 0.25 + 0.4);
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.3, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    this.drawSpots(ctx, e);
    // Visage réduit : petite bouche et grand œil, décalés vers l'avant
    ctx.save(); ctx.scale(0.62, 0.62); ctx.translate(s * 0.25, -s * 0.1);
    this.face(ctx, s, e, t);
    ctx.restore();

    ctx.restore();
  },

  drawJelly(ctx, e, t) {
    const s = e.size;
    const pulse = Math.sin(t * 2.2 + e.phase) * 0.15 + 1;
    const glow = e.def.glowAtNight ? Main.nightAmount() : 0;
    // bioluminescence : halo pré-rendu (§5.9), à la place de shadowBlur
    if (glow > 0.1) this.halo(ctx, 0, -s * 0.15, s * 1.5 + 25 * glow, e.color, 0.6 * glow);
    ctx.fillStyle = e.colorAlpha(0.75 + glow * 0.25);
    // cloche
    ctx.beginPath();
    ctx.arc(0, 0, s * pulse, Math.PI, 0);
    ctx.quadraticCurveTo(s * pulse * 0.6, s * 0.35, 0, s * 0.3);
    ctx.quadraticCurveTo(-s * pulse * 0.6, s * 0.35, -s * pulse, 0);
    ctx.fill();
    // tentacules
    ctx.strokeStyle = e.colorAlpha(0.55); ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.28, s * 0.25);
      ctx.quadraticCurveTo(i * s * 0.3 + Math.sin(t * 3 + i) * 5, s * 0.9,
                           i * s * 0.32 + Math.sin(t * 2 + i * 2) * 8, s * 1.5);
      ctx.stroke();
    }
    // visage commun (petit, au centre de la cloche)
    ctx.save(); ctx.scale(0.55, 0.55); ctx.translate(-s * 0.5, 0);
    this.face(ctx, s, e, t);
    ctx.restore();
  },

  drawCrab(ctx, e, t) {
    const s = e.size;
    // Le rebond et le défilé de couleurs sont montés par `choregraphie()`, en
    // amont : ce sont des gags de l'espèce, pas des traits de la silhouette, et
    // ils doivent tenir aussi quand un dessin remplace celle-ci.
    // Reste ici la teinte du repas, qui n'a pas de danse associée.
    const col = (e.def.disco && e.expression === 'eating')
      ? `hsl(${(t * 300) % 360}, 85%, 62%)` : e.color;
    // pattes
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = Math.sin(t * 8 + i * 2 + e.phase) * 0.25;
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.2); ctx.lineTo(-s * (0.8 + i * 0.15), s * (0.55 + a * 0.3)); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.2); ctx.lineTo(s * (0.8 + i * 0.15), s * (0.55 - a * 0.3)); ctx.stroke();
    }
    // corps
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.7, 0, 0, Math.PI * 2); ctx.fill();
    // pinces
    ctx.beginPath(); ctx.arc(-s * 1.05, -s * 0.25, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 1.05, -s * 0.25, s * 0.3, 0, Math.PI * 2); ctx.fill();
    // yeux sur tiges + visage commun adapté
    ctx.strokeStyle = '#1c2733'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.5); ctx.lineTo(-s * 0.25, -s * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.25, -s * 0.5); ctx.lineTo(s * 0.25, -s * 0.85); ctx.stroke();
    for (const sx of [-s * 0.25, s * 0.25]) this.oeil(ctx, sx, -s * 0.9, s * 0.2, e, t);
    // Bouche : sourire au repos, elle s'ouvre en O quand il ronfle
    const dort = e.expression === 'sleeping' && (e.emoteK ? e.emoteK() : 1) > 0.5;
    ctx.strokeStyle = '#1c2733'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (dort) {
      const c = (Math.sin(t * 1.7 + e.phase) + 1) / 2;
      ctx.ellipse(0, -s * 0.08, s * 0.13, s * (0.05 + c * 0.14), 0, 0, Math.PI * 2);
    } else {
      ctx.arc(0, -s * 0.1, s * 0.18, 0.2 * Math.PI, 0.8 * Math.PI);
    }
    ctx.stroke();
  },

  // L'OUVERTURE D'UN COQUILLAGE, extraite pour être réutilisable.
  //
  // Elle n'est pas pilotée par la nage mais par l'ÉTAT : il glousse quand il
  // mange, reste entrouvert quand il dort — refermé, on ne verrait pas ses yeux
  // clos et le sommeil ne se lirait pas du tout sur lui — et s'ouvre en grand
  // quand il fabrique une perle. Un appendice ordinaire, cadencé sur le
  // battement de nage, ne sait rien de tout ça : c'est pour ça qu'un coquillage
  // DESSINÉ ne pouvait pas retrouver l'animation de sa silhouette.
  // `fins[].source: 'coquille'` branche un appendice là-dessus.
  ouvertureCoquille(e, t) {
    const dort = e.expression === 'sleeping' && (e.emoteK ? e.emoteK() : 1) > 0.5;
    const perle = e._perle || 0;
    return perle > 0.1 ? 0.55 + perle * 0.35 : e.expression === 'eating'
      ? Math.abs(Math.sin(t * 10)) * 0.7 + 0.2
      : (dort ? 0.32 + Math.sin(t * 1.5 + e.phase) * 0.05
              : Math.max(0, Math.sin(t * 1.2 + e.phase)) * 0.35);
  },

  drawShell(ctx, e, t) {
    const s = e.size;
    const open = this.ouvertureCoquille(e, t);
    ctx.fillStyle = e.colorDark;
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s, s * 0.45, 0, 0, Math.PI); ctx.fill();
    // valve supérieure
    ctx.save();
    ctx.translate(-s, s * 0.15); ctx.rotate(-open); ctx.translate(s, -s * 0.15);
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.ellipse(0, s * 0.15, s, s * 0.5, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * s * 0.35, s * 0.1); ctx.lineTo(i * s * 0.5, -s * 0.32); ctx.stroke();
    }
    ctx.restore();
    // petits yeux qui dépassent quand ouvert
    if (open > 0.25) {
      for (const sx of [-s * 0.3, s * 0.1]) this.oeil(ctx, sx, 0, s * 0.16, e, t);
    }
  },

  // La queue de la proie qui dépasse de la bouche pendant la mastication.
  // Dessinée dans le repère local du prédateur, à hauteur de sa bouche.
  drawMouthful(ctx, e, t) {
    const p = e._chewPrey;
    if (!p) return;
    const s = e.size;
    const ps = Math.min(p.size, s * 0.42);        // ne dépasse jamais la tête
    const wag = Math.sin(t * 26) * 0.45;          // elle gigote encore
    ctx.save();
    ctx.translate(s * 0.9, s * 0.14);
    ctx.rotate(0.35 + wag);
    ctx.fillStyle = p.color;
    // petit bout de corps
    ctx.beginPath();
    ctx.ellipse(ps * 0.35, 0, ps * 0.5, ps * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    // la nageoire caudale
    ctx.beginPath();
    if (p.tail === 'lunate' || p.tail === 'shark') {
      ctx.moveTo(ps * 0.7, 0); ctx.lineTo(ps * 1.5, -ps * 0.75);
      ctx.lineTo(ps * 1.15, 0); ctx.lineTo(ps * 1.5, ps * 0.75);
    } else {
      ctx.moveTo(ps * 0.7, 0); ctx.lineTo(ps * 1.45, -ps * 0.6);
      ctx.quadraticCurveTo(ps * 1.62, 0, ps * 1.45, ps * 0.6);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  // CHORÉGRAPHIE — ce que fait la CRÉATURE, pas ce qu'est son corps.
  // La danse du Crabe Disco et son défilé de couleurs vivaient dans `drawCrab` :
  // remplacer sa silhouette par un dessin les faisait disparaître, alors que ce
  // sont des gags de l'espèce, indépendants de la façon dont on la dessine.
  // Ils s'appliquent donc AUTOUR du corps, quel qu'il soit.
  // Renvoie true s'il faut refermer un `ctx.save()`.
  choregraphie(ctx, e, t) {
    if (!e._disco) return false;
    const s = e.size, d = e._danceT || 0;
    ctx.save();
    ctx.translate(Math.sin(d * 9) * s * 0.35, -Math.abs(Math.sin(d * 12)) * s * 0.55);
    ctx.rotate(Math.sin(d * 9) * 0.3);
    // Le défilé de couleurs : une rotation de teinte, qui marche sur un aplat
    // procédural comme sur un dessin à dix couleurs. Repeindre chaque forme
    // écraserait un dessin fait main.
    ctx.filter = `hue-rotate(${Math.round((t * 300) % 360)}deg) saturate(1.5)`;
    return true;
  },

  draw(ctx, e, t) {
    const chore = this.choregraphie(ctx, e, t);
    // Un sprite déclaré prime sur la silhouette procédurale ; s'il n'est pas
    // encore chargé, `drawSprite` retombe tout seul sur le rendu par défaut.
    if (e.def.sprite) {
      this.drawSprite(ctx, e, t);
      if (e._chew > 0) this.drawMouthful(ctx, e, t);
      if (chore) ctx.restore();
      return;
    }
    switch (e.def.render) {
      case 'jelly': this.drawJelly(ctx, e, t); break;
      case 'crab': this.drawCrab(ctx, e, t); break;
      case 'shell': this.drawShell(ctx, e, t); break;
      case 'ray': this.drawRay(ctx, e, t); break;
      case 'octopus': this.drawOctopus(ctx, e, t); break;
      case 'seahorse': this.drawSeahorse(ctx, e, t); break;
      case 'eel': this.drawEel(ctx, e, t); break;
      case 'ribbon': this.drawRibbon(ctx, e, t); break;
      case 'gardeneel': this.drawGardenEel(ctx, e, t); break;
      case 'star': this.drawStar(ctx, e, t); break;
      case 'urchin': this.drawUrchin(ctx, e, t); break;
      case 'turtle': this.drawTurtle(ctx, e, t); break;
      case 'worm': this.drawWorm(ctx, e, t); break;
      case 'anemone': this.drawAnemone(ctx, e, t); break;
      case 'bird': this.drawBird(ctx, e, t); break;
      case 'lantern': this.drawLantern(ctx, e, t); break;
      case 'squid': this.drawSquid(ctx, e, t); break;
      case 'shrimp': this.drawShrimp(ctx, e, t); break;
      case 'sunfish': this.drawSunfish(ctx, e, t); break;
      case 'clown': this.drawClown(ctx, e, t); break;
      default: this.drawFish(ctx, e, t);
    }
    if (e._chew > 0) this.drawMouthful(ctx, e, t);
    if (chore) ctx.restore();
  },
};
