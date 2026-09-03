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
  face(ctx, size, e, t) {
    this.drawFace(ctx, size, e.expression, t + (e.phase || 0),
                  e.emoteK ? e.emoteK() : 1, e._eyeLook);
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

  // `eyeLook` : {x, y} en unités d'œil (-1..1). Quand le poisson est tranquille,
  // sa pupille suit le curseur — c'est ce qui donne l'impression qu'il vous voit.
  // ŒIL UNIQUE, piloté par la table des émotions. Les silhouettes dont les yeux
  // ne forment pas un visage groupé (crabe sur tiges, coquillage entre ses
  // valves) dessinaient les leurs à la main : ils restaient donc GRANDS OUVERTS
  // en toutes circonstances, y compris endormis. Elles passent par ici.
  oeil(ctx, x, y, r, e, t) {
    const base = this.EMOTIONS.idle;
    const em = this.EMOTIONS[e.expression] || base;
    const k = U.clamp(e.emoteK ? e.emoteK() : 1, 0, 1);
    const lid = U.lerp(base.lid, em.lid, k);
    const INK = '#1c2733';
    const clignote = Math.sin(t * 0.7 + x) > 0.975;

    if (lid > 0.85 || clignote) {                    // œil fermé
      const joyeux = e.expression === 'laughing' || e.expression === 'kiss';
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.42);
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
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // la pupille suit le curseur au repos, comme pour les visages groupés
    const suivi = e._eyeLook ? (1 - k) : 0;
    const pr = r * pu;
    const px = r * U.lerp(look, e._eyeLook ? e._eyeLook.x : look, suivi);
    const py = r * U.lerp(0.05, e._eyeLook ? e._eyeLook.y : 0.05, suivi);
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.beginPath(); ctx.arc(px - pr * 0.32, py - pr * 0.38, Math.max(0.5, pr * 0.34), 0, Math.PI * 2); ctx.fill();
    if (lid > 0.05) {                                 // paupière tombante
      ctx.fillStyle = INK;
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
  bouche(ctx, mx, my, size, mouth, t) {
    const INK = '#1c2733';
    const lw = Math.max(1.4, size * 0.055);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = lw;
    ctx.beginPath();
  if (mouth === 'gloutonne') {
    const o = (Math.sin(t * 16) * 0.5 + 0.5) * size * 0.3 + size * 0.08;
    ctx.fillStyle = '#5a2d3d';
    ctx.ellipse(mx, my, size * 0.15, o, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fa3';   // petite langue
    ctx.beginPath(); ctx.ellipse(mx, my + o * 0.45, size * 0.08, o * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'sourire') {
    ctx.lineWidth = lw * 1.2;
    ctx.arc(mx - size * 0.1, my - size * 0.06, size * 0.2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'timide') {
    ctx.arc(mx - size * 0.06, my - size * 0.02, size * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (mouth === 'cri') {
    ctx.fillStyle = '#5a2d3d';
    ctx.ellipse(mx, my + size * 0.04, size * 0.11, size * 0.17, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'grogne') {
    ctx.lineWidth = lw * 1.2;
    ctx.moveTo(mx - size * 0.16, my + size * 0.08);
    ctx.quadraticCurveTo(mx - size * 0.02, my - size * 0.06, mx + size * 0.12, my + size * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#fff';    // canine
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
    ctx.fillStyle = '#5a2d3d';
    ctx.beginPath(); ctx.ellipse(mx - size * 0.04, my + size * 0.05, size * 0.19, o, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath(); ctx.ellipse(mx - size * 0.04, my + o * 0.55, size * 0.1, o * 0.34, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'bisou') {
    // lèvres pincées projetées en avant
    ctx.fillStyle = '#e8607f';
    ctx.beginPath();
    ctx.ellipse(mx + size * 0.14, my, size * 0.13, size * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a83a55';
    ctx.beginPath();
    ctx.ellipse(mx + size * 0.2, my, size * 0.05, size * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  } else if (mouth === 'berk') {
    // GRAND sourire inversé (arc franc vers le bas), et la langue qui pend
    ctx.lineWidth = lw * 1.5;
    ctx.arc(mx - size * 0.06, my + size * 0.26, size * 0.24, 1.12 * Math.PI, 1.88 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#e8879b';
    ctx.beginPath();
    ctx.ellipse(mx - size * 0.06, my + size * 0.14, size * 0.08, size * 0.14, 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (mouth === 'o') {
    ctx.fillStyle = '#5a2d3d';
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
    ctx.fillStyle = '#5a2d3d';
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

  drawFace(ctx, size, expression, t, k = 1, eyeLook = null, sansBouche = false) {
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

    const INK = '#1c2733';
    const ex = size * 0.55, ey = -size * 0.18;
    const er = Math.max(2.5, size * 0.22);
    const lw = Math.max(1.4, size * 0.055);
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
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
      const pr = er * P.pu;
      // Le regard vers le curseur ne s'applique qu'au repos : une émotion forte
      // impose sa propre direction de regard.
      const suivi = eyeLook ? (1 - k) : 0;
      const px = er * U.lerp(P.look, eyeLook ? eyeLook.x : P.look, suivi);
      const py = er * U.lerp(0.05, eyeLook ? eyeLook.y : 0.05, suivi);
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
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
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.6, size * 0.075);
    ctx.save();
    ctx.translate(ex, ey - er * (1.05 + P.bl));
    ctx.rotate(P.ba);
    ctx.beginPath();
    ctx.moveTo(-er * 0.95, er * 0.12);
    ctx.quadraticCurveTo(0, -er * 0.3, er * 0.95, er * 0.02);
    ctx.stroke();
    ctx.restore();

    // --- Bouche (extraite : un sprite la pose sur SON ancre, cf. `bouche()`) ---
    if (!sansBouche) this.bouche(ctx, size * 0.82, size * 0.12, size, mouth, t);
    // --- Joues (rougeur, ou teint verdâtre quand il est écœuré) ---
    if (P.blush > 0.05) {
      const teinte = em.cheek || '255,110,135';
      ctx.fillStyle = `rgba(${teinte},${0.6 * P.blush})`;
      ctx.beginPath(); ctx.ellipse(size * 0.42, size * 0.12, size * 0.19, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    }
  },

  // --- Sprites vectoriels (éditeur SVG) ---------------------------------------
  // Une espèce qui déclare `sprite:` remplace sa silhouette procédurale par le
  // dessin de l'éditeur — MAIS elle garde le système commun yeux / sourcils /
  // bouche par-dessus. C'est la règle du projet : la direction artistique peut
  // changer entièrement, les émotions restent celles de tout l'aquarium.
  drawSprite(ctx, e, t) {
    const sp = Sprites.get(e.def.sprite);
    if (!sp) { this.drawFish(ctx, e, t); return; }   // pas encore chargé : on ne saute pas de frame

    const s = e.size;
    // ÉCHELLE. Référence mesurée : une silhouette procédurale occupe environ
    // 2,5 fois `size` en longueur (99 px relevés sur un requin de 40). Un sprite
    // doit remplir la même place, sinon il paraît rabougri au milieu des autres —
    // c'était le cas à `size * 2` (77 px) comme à `size * 2 * spanRatio` (84 px).
    // `spriteScale` rattrape ensuite un dessin plus serré ou plus large que la
    // moyenne, sans toucher à l'emprise physique (`spanRatio`, cf. les colosses).
    const k = (s * 2.5 * (e.def.spriteScale || 1)) / sp.w;

    // Battement de queue : la fréquence suit l'allure RÉELLE, pas une constante.
    // Un requin qui charge doit visiblement forcer.
    const allure = U.clamp(e.speedNow / Math.max(1, e.def.speed), 0, 2.5);
    const f = 2.2 + allure * 4.5;
    // L'amplitude suit l'effort, pas seulement la fréquence : un requin lancé
    // doit visiblement FORCER. Mesuré à l'amplitude nue de l'éditeur (`amp`), le
    // bout de la queue ne parcourait que 5,5 px sur une silhouette de 48.
    const onde = Math.sin(t * f + e.phase) * (0.7 + allure * 0.6);

    ctx.save();
    ctx.scale(k, k);
    ctx.translate(-sp.cx, -sp.cy);          // l'ancre `center` devient l'origine

    // Battement de nageoire : plus lent que celui de la queue, et déphasé.
    const battement = Math.sin(t * f * 0.7 + e.phase + 1);
    sp.shapes.forEach((forme, i) => {
      const fins = sp.finsPar && sp.finsPar[i];
      ctx.save();
      // Repli : un calque qui porte un `pivot` mais qu'aucun ancrage de nageoire
      // ne vise tourne en bloc, comme avant.
      if (forme.pivot && !fins) {
        ctx.translate(forme.pivot[0], forme.pivot[1]);
        ctx.rotate(battement * (forme.amp || 15) * 0.007);
        ctx.translate(-forme.pivot[0], -forme.pivot[1]);
      }
      ctx.fillStyle = forme.fill || '#888';
      this.tracerForme(ctx, forme, sp, onde, fins, battement);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    // --- Visage commun, calé sur les ANCRES du dessin ---
    // L'œil et la bouche sont posés SÉPARÉMENT, chacun sur son ancre. Caler le
    // seul œil et laisser la bouche à sa place par défaut ne marche pas : le
    // visage commun met la bouche en avant et à peine plus bas que l'œil, alors
    // que le requin de l'éditeur l'a presque à la verticale — elle atterrissait
    // 4 px trop en avant, sur le museau. Deux ancres, deux placements.
    const oe = sp.oeil;
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
      ctx.save();
      ctx.translate((oe.x - sp.cx) * k - fs * 0.55 + dx, (oe.y - sp.cy) * k + fs * 0.18 + dy);
      // `sansBouche` : elle est dessinée juste après, sur sa propre ancre.
      this.drawFace(ctx, fs, e.expression, t + (e.phase || 0),
                    e.emoteK ? e.emoteK() : 1, e._eyeLook, !!bo);
      ctx.restore();
      if (bo) {
        const expr = e.expression, k2 = e.emoteK ? e.emoteK() : 1;
        const em = this.EMOTIONS[expr] || this.EMOTIONS.idle;
        ctx.save();
        this.bouche(ctx, (bo.x - sp.cx) * k + dx, (bo.y - sp.cy) * k + dy, fs,
                    k2 > 0.35 ? em.mouth : this.EMOTIONS.idle.mouth, t + (e.phase || 0));
        ctx.restore();
      }
    }
  },

  // Contour d'une forme, avec l'ondulation de queue appliquée aux points situés
  // en deçà de `tailBlend` (u² : le battement part du pédoncule caudal, pas du
  // milieu du corps — sinon le poisson entier se tortille comme une chenille).
  // `fins` : les ancrages de nageoire qui visent ce calque. Ce n'est PAS une
  // rotation rigide — l'éditeur fait tourner CHAQUE POINT autour de l'ancre,
  // pondéré par sa distance : plein effet sur l'ancre, nul au-delà du rayon
  // `r`, avec un lissage en S entre les deux. C'est ce qui évite la couture
  // visible au raccord avec le corps, et c'est surtout ce que l'artiste voit
  // dans l'outil : faire tourner le calque en bloc montrait autre chose.
  tracerForme(ctx, forme, sp, onde, fins, battement) {
    const pts = forme.points, n = pts.length;
    const etendue = Math.max(1, sp.tailBlend - sp.minX);
    const amp = forme.amp || 15;
    const lissage = (v) => { const c = U.clamp(v, 0, 1); return c * c * (3 - 2 * c); };
    const P = new Array(n);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const u = U.clamp((sp.tailBlend - p[0]) / etendue, 0, 1);
      let x = p[0], y = p[1] + u * u * onde * amp;
      if (fins) {
        for (const f of fins) {
          const r = f.r || 1;
          const poids = lissage(1 - Math.hypot(x - f.x, y - f.y) / r);
          if (poids <= 0) continue;
          // `amp` est lu en degrés — c'est l'unité du curseur de l'outil.
          const a = battement * poids * amp * Math.PI / 360;
          const cos = Math.cos(a), sin = Math.sin(a);
          const dx = x - f.x, dy = y - f.y;
          x = f.x + dx * cos - dy * sin;
          y = f.y + dx * sin + dy * cos;
        }
      }
      P[i] = [x, y];
    }
    ctx.beginPath();
    if (forme.smooth && n > 2) {
      // Contour fermé lissé : on passe par les MILIEUX des segments, les sommets
      // servant de points de contrôle. Relier les sommets en droites donnait des
      // poissons taillés à la serpe.
      const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const d = mid(P[n - 1], P[0]);
      ctx.moveTo(d[0], d[1]);
      for (let i = 0; i < n; i++) {
        const m = mid(P[i], P[(i + 1) % n]);
        ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]);
      }
    } else {
      ctx.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(P[i][0], P[i][1]);
    }
    ctx.closePath();
  },

  // --- Silhouettes ------------------------------------------------------------

  // Corps de poisson générique (queue + corps + ventre + ailerons), SANS visage.
  // Facteur commun à drawFish / drawClown pour éviter la duplication.
  drawFishBody(ctx, e, t) {
    const s = e.size, def = e.def;
    const wag = Math.sin(t * (6 + e.speedNow / 40) + e.phase) * 0.35;

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
    const open = Math.max(eating ? (Math.sin(t * 8 + e.phase) * 0.5 + 0.5) * 0.6 + 0.4 : 0, jaillit);
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
    this.drawFace(ctx, s, eating ? 'idle' : e.expression, t + e.phase, e.emoteK());
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

    // Visage commun
    this.drawFace(ctx, s, expr, t + e.phase, e.emoteK());

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

    // Lampe
    ctx.save();
    if (lit) {
      ctx.shadowColor = '#ffe9a3';
      ctx.shadowBlur = 22 * eclat;
      ctx.fillStyle = '#fff6c9';
    } else {
      ctx.fillStyle = e.colorDark;
    }
    ctx.beginPath(); ctx.arc(lx, ly, s * 0.3, 0, Math.PI * 2); ctx.fill();
    if (lit) {
      ctx.shadowBlur = 0;
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

    this.drawSpots(ctx, e);
    this.face(ctx, s, e, t);
  },

  // CALAMAR (et Calamar Géant) : manteau en cône pointé vers l'arrière, deux
  // ailerons triangulaires en bout de manteau, une couronne de bras déployés
  // vers l'avant. Même convention que le Poulpe (tête devant, appendices
  // derrière la tête) : dans un aquarium, on lit d'abord le sens de nage.
  //
  // `def.giantSquid` ajoute les deux longs tentacules de chasse à massue, et
  // `e._repli` (0 → 1, piloté par le gag de la timidité) referme les bras en
  // fuseau : c'est le géant qui se fait tout petit.
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
    if (glow > 0.1) { ctx.shadowColor = e.color; ctx.shadowBlur = 20 * glow; }
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
    ctx.shadowBlur = 0;

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

    if (glow > 0.1) { ctx.shadowColor = e.color; ctx.shadowBlur = 14 * glow; }

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
    ctx.shadowBlur = 0;

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
    if (glow > 0.1) {
      ctx.shadowColor = e.color; ctx.shadowBlur = 25 * glow;
    }
    ctx.fillStyle = e.colorAlpha(0.75 + glow * 0.25);
    // cloche
    ctx.beginPath();
    ctx.arc(0, 0, s * pulse, Math.PI, 0);
    ctx.quadraticCurveTo(s * pulse * 0.6, s * 0.35, 0, s * 0.3);
    ctx.quadraticCurveTo(-s * pulse * 0.6, s * 0.35, -s * pulse, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
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
    const disco = e._disco || (e.def.disco && e.expression === 'eating');
    const col = disco ? `hsl(${(t * 300) % 360}, 85%, 62%)` : e.color;
    // Chorégraphie : il rebondit et se déhanche pendant son jeu de couleurs
    if (e._disco) {
      const d = e._danceT || 0;
      ctx.translate(Math.sin(d * 9) * s * 0.35, -Math.abs(Math.sin(d * 12)) * s * 0.55);
      ctx.rotate(Math.sin(d * 9) * 0.3);
    }
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

  drawShell(ctx, e, t) {
    const s = e.size;
    // ouverture rythmique ; "glousse" quand il mange
    // Endormi, il reste ENTROUVERT : referme, on ne verrait pas ses yeux clos
    // et le sommeil ne se lirait pas du tout sur lui.
    const dort = e.expression === 'sleeping' && (e.emoteK ? e.emoteK() : 1) > 0.5;
    const open = e.expression === 'eating'
      ? Math.abs(Math.sin(t * 10)) * 0.7 + 0.2
      : (dort ? 0.32 + Math.sin(t * 1.5 + e.phase) * 0.05
              : Math.max(0, Math.sin(t * 1.2 + e.phase)) * 0.35);
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

  draw(ctx, e, t) {
    // Un sprite déclaré prime sur la silhouette procédurale ; s'il n'est pas
    // encore chargé, `drawSprite` retombe tout seul sur le rendu par défaut.
    if (e.def.sprite) { this.drawSprite(ctx, e, t); if (e._chew > 0) this.drawMouthful(ctx, e, t); return; }
    switch (e.def.render) {
      case 'jelly': this.drawJelly(ctx, e, t); break;
      case 'crab': this.drawCrab(ctx, e, t); break;
      case 'shell': this.drawShell(ctx, e, t); break;
      case 'ray': this.drawRay(ctx, e, t); break;
      case 'octopus': this.drawOctopus(ctx, e, t); break;
      case 'seahorse': this.drawSeahorse(ctx, e, t); break;
      case 'eel': this.drawEel(ctx, e, t); break;
      case 'star': this.drawStar(ctx, e, t); break;
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
  },
};
