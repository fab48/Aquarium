// Gags et mises en scène comiques, un par espèce (GDD §8, §11, §12).
// Séparés de species.js pour que les fiches restent des DONNÉES lisibles.
//
// Chaque entrée est appelée à chaque frame depuis Entity.think via `def.gag`.
// Voir EMOTIONS.md pour la table action → émotion, et le mode d'emploi d'une
// scène (phases, `_freeze`, `_faceAt`, une seule bulle).
const GAGS = {
  // Elle porte son nom : chapelet de bulles permanent, et gros glouglou joyeux
  bulle_fofolle(e, dt, t) {
    // 3,5 bulles/seconde et par sardine, c'était 5 550 particules/min pour la
    // seule Sardine : les DEUX TIERS de toutes les bulles du jeu, pour dix
    // individus. Le chapelet permanent reste (c'est son nom), il est juste
    // devenu un chapelet et non un jet.
    if (Math.random() < dt * 0.9) Particles.bubble(e.x + e.size * 0.7, e.y, U.rand(2, 5));
    e._blubCd = (e._blubCd ?? U.rand(4, 10)) - dt;
    if (e._blubCd <= 0) {
      e._blubCd = Ecosystem.cadence(e, 4);
      for (let i = 0; i < 8; i++) Particles.bubble(e.x + e.size * 0.8, e.y + U.rand(-6, 6), U.rand(3, 8));
      e.emote('happy', 1.8);
    }
  },

  // Sa boule disco : il plante ses pinces, s'arrête net et DANSE sur place.
  crabe(e, dt, t) {
    e._discoCd = (e._discoCd ?? Ecosystem.cadence(e, 4)) - dt;
    if (e._discoCd <= 0 && !e._dancing) {
        e._dancing = U.rand(2.5, 4.5);
        e.emote('happy', 3, false);      // pas d'étincelles : ce sont des NOTES
        Particles.notes(e.x, e.y - e.size * 1.5, 3);
      }
    if (!e._dancing) return;
    e._dancing -= dt;
    e._freeze = 0.25;                         // il ne rampe plus, il danse
    e._disco = true;                          // couleurs qui défilent (drawCrab)
    e._danceT = (e._danceT ?? 0) + dt;
    if (Math.random() < dt * 0.9) Particles.sparkles(e.x, e.y - e.size * 1.4, 2);
    if (e._dancing <= 0) { e._dancing = 0; e._disco = false; e._discoCd = Ecosystem.cadence(e, 4); }
  },

  // cœur, gros cooldown, sinon on ne comprend pas d'où viennent les cœurs.
  etoile(e, dt, t) {
    e._hugCd = Math.max(0, (e._hugCd ?? 0) - dt);
    if (e._hugCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      // Uniquement ceux qui PASSENT : pas les voisins fixes du récif, sinon
      // les cœurs partent en boucle sans qu'on comprenne pourquoi.
      if (o === e || o.dead || o.stage === 'egg') continue;
      if (SPECIES[o.speciesId].movement === 'fixed' || o.speedNow < 12) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) < (e.size + o.size * 0.5) ** 2) {
        e.setExpression('happy', 2);           // les bras se replient (anim 'happy' de drawStar)
        o.setExpression('blush', 1.5);          // le câliné rougit : on voit QUI est câliné
        e._hugCd = 30;   // le calin se lit a l'anim des bras, pas besoin de bulle
        break;
      }
    }
  },

  // pas la bulle.
  clown(e, dt, t) {
    // Il dort DANS son anémone : on ne sort pas chatouiller la nuit.
    if (e.state === 'sleep') { e._tickleTarget = null; e._faceAt = null; return; }
    e._kissCd = (e._kissCd ?? Ecosystem.cadence(e, 7)) - dt;

    const c = e._tickleTarget;
    if (c && (c.dead || U.dist2(e.x, e.y, c.x, c.y) > 520 * 520)) { e._tickleTarget = null; e._faceAt = null; }

    if (!e._tickleTarget) {
      if (e._kissCd > 0) return;
      let best = null, bestSize = 24;
      for (const o of Ecosystem.neighbors(e.x, e.y)) {
        if (o === e || o.dead || o.stage === 'egg') continue;
        if (SPECIES[o.speciesId].refuge || o.speciesId === 'clown') continue;
        if (SPECIES[o.speciesId].movement === 'fixed') continue;   // pas les murènes dans leur trou
        // QUELQU'UN QUI PASSE, comme pour le câlin de l'Étoile. Le clown vit
        // dans son anémone et en sort pour le guili ; se coller au premier
        // voisin immobile, ce n'est pas la même scène — et ça l'emmenait loin
        // de chez lui pour rien.
        if (o.speedNow < 14) continue;
        if (o.size > bestSize) { bestSize = o.size; best = o; }
      }
      if (!best) return;
      e._tickleTarget = best; e._kissT = 0;
      return;
    }

    const o = e._tickleTarget;
    // Point de bisou : tangent au flanc, du côté d'où il arrive
    // Va-et-vient COLLÉ au flanc : on vise le bord réel de l'ellipse du corps,
    // sinon le clown bécote le vide à quelques pixels de sa victime.
    const cote = Math.sign(e.y - o.y) || 1;
    const dx = 0.35;                                     // position le long du corps
    const demiHauteur = o.size * (SPECIES[o.speciesId].bodyRatio || 0.6)
                      * Math.sqrt(1 - dx * dx);
    const pique = 0.5 + 0.5 * Math.sin(t * 8);           // 0 = collé, 1 = reculé
    e._kissX = o.x + o.size * dx;
    e._kissY = o.y + cote * (demiHauteur + e.size * (0.15 + pique * 0.35));

    if (U.dist2(e.x, e.y, e._kissX, e._kissY) > (e.size * 1.6) ** 2) return;  // encore en approche

    // Contact : la scène se joue, les deux immobiles
    e._kissT += dt;
    e._freeze = 0.25; o._freeze = 0.25;
    e._faceAt = { x: o.x, y: o.y };          // il regarde le CENTRE de sa victime
    e.emote('kiss', 1.2, false);
    o.emote('laughing', 1.4, false);
    o.vx *= 0.9; o.vy += Math.sin(t * 24) * 20 * dt * 60;    // il se tortille de rire
    if (e._kissT < dt * 2) Particles.comic(o.x + o.size * 0.4, o.y - o.size * 0.8, 'ha');

    if (e._kissT > 2.6) {
      o.emote('blush', 2);
      e._tickleTarget = null; e._faceAt = null;
      e._kissCd = Ecosystem.cadence(e, 7);
    }
  },

  // Rougit si le curseur reste proche
  hippocampe(e, dt, t) {
    const [mx, my] = Camera.toWorld(Input.mx, Input.my);
    if (U.dist2(e.x, e.y, mx, my) < 80 * 80) e.setExpression('blush', 0.6);
  },

  // « BERK ! » avec une tête dégoûtée.
  perroquet(e, dt, t) {
    e._fartCd = (e._fartCd ?? U.rand(60, 130)) - dt;
    if (e._fartCd > 0 && !e._farting) return;

    if (!e._farting) {                       // 1. anticipation : il se fige, gêné
      e._farting = 0.9;
      e.emote('ashamed', 1.4);
      return;
    }

    // 2. il se tortille sur place, de plus en plus fort
    e._farting -= dt;
    e._freeze = 0.25;
    e.vy += Math.sin(t * 26) * 30 * dt * 60;
    if (e._farting > 0) return;

    // 3. la détonation, à la QUEUE (côté opposé à sa tête)
    const dir = (e._facing < 0 ? 1 : -1);      // la queue est derrière lui
    const qx = e.x + dir * e.size * 1.15, qy = e.y + e.size * 0.15;
    Particles.shout(qx + dir * e.size * 1.1, qy, 'PROUT !', '#8fbf6a', e.size);
    Particles.fart(qx, qy);
    e.emote('blush', 2.6);
    e.vx -= dir * 90;                          // la propulsion !

    // 4. les voisins sont écœurés
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.stage === 'egg') continue;
      if (SPECIES[o.speciesId].refuge) continue;
      if (U.dist2(qx, qy, o.x, o.y) > 150 * 150) continue;
      // le teint vert dit tout, pas besoin de bulle — et respirer ça coûte :
      // le voisin perd de l'état (même effet qu'avaler un caca, en plus doux)
      o.malaise(0.55, qx, qy);
    }
    e._farting = 0;
    e._fartCd = U.rand(70, 150);
  },

  // 3. il se plie de rire sur place, en tournant sur lui-même
  dauphin(e, dt, t) {
    e._farceCd = (e._farceCd ?? Ecosystem.cadence(e, 5)) - dt;
    const ph = e._farcePh;

    if (!ph) {
      if (e._farceCd > 0 || e.state === 'hunt' || e.state === 'flee') return;
      // Il cherche une victime, et un DORMEUR vaut dix fois mieux qu'un banc
      // éveillé : réveiller quelqu'un en sursaut, c'est tout le sel de la farce.
      // (Le pondérer plutôt que l'exiger évite qu'il reste planté les nuits
      // où personne ne dort à portée.)
      let best = null, bestScore = -1;
      for (const o of Ecosystem.entities) {
        if (o === e || o.dead || o.stage === 'egg') continue;
        if (o.def.refuge || o.def.movement === 'fixed') continue;   // pas le décor
        const d2 = U.dist2(e.x, e.y, o.x, o.y);
        if (d2 > 700 * 700) continue;
        const dort = o.state === 'sleep';
        if (!dort && !SPECIES[o.speciesId].schooling) continue;
        const score = (dort ? 10 : 1) / (1 + Math.sqrt(d2) / 200);
        if (score > bestScore) { bestScore = score; best = o; }
      }
      if (!best) return;
      e._farcePh = 'approche'; e._farceCible = best; e._farceT = 0;
      return;
    }

    const c = e._farceCible;
    if (!c || c.dead) { e._farcePh = null; e._farceCd = Ecosystem.cadence(e, 5); return; }
    e._farceT += dt;

    if (ph === 'approche') {
      // en douce, par en dessous : il vise un point sous le banc
      e._farceX = c.x - 60; e._farceY = c.y + 90;
      e.emote('smug', 1, false);               // l'air de rien, sourire en coin
      if (Math.random() < dt * 2) Particles.bubble(e.x, e.y, U.rand(1.5, 3));
      if (U.dist2(e.x, e.y, e._farceX, e._farceY) < 130 * 130 || e._farceT > 7) {
        e._farcePh = 'bouh'; e._farceT = 0;
      }
      return;
    }

    if (ph === 'bouh') {
      // JAILLISSEMENT : il fonce dans le banc, gueule ouverte
      e._farceX = c.x; e._farceY = c.y;
      if (e._farceT < dt * 2) {
        Particles.shout(e.x + e.size * 0.5, e.y - e.size * 0.7, 'BOUH !', '#fff', e.size);
        Particles.burst(e.x, e.y, '#cfe9ff', 14);
        e.emote('surprise', 1, false);         // gueule grande ouverte : BOUH !
        // le banc explose en tous sens
        for (const o of Ecosystem.entities) {
          if (o === e || o.dead || o.stage === 'egg') continue;
          if (U.dist2(e.x, e.y, o.x, o.y) > 260 * 260) continue;
          const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy) || 1;
          // Un dormeur se fait réveiller en sursaut : il détale plus fort, et
          // il faut RELÂCHER son expression maintenue, sinon il fuit en gardant
          // les yeux fermés.
          const dormait = o.state === 'sleep';
          if (dormait) { o.release(); o._freeze = 0; }
          const k = dormait ? 1.8 : 1;
          o.vx += dx / d * 320 * k; o.vy += dy / d * 320 * k;
          o.emote('surprise', dormait ? 2.2 : 1.4);
          o.state = 'flee'; o.target = e; o.stateTimer = dormait ? 2.4 : 1.6;
        }
      }
      if (e._farceT > 0.7) { e._farcePh = 'rigole'; e._farceT = 0; }
      return;
    }

    // ph === 'rigole' : il s'arrête net et se tord de rire
    e._farceX = null; e._farceY = null;
    e._freeze = 0.25;
    e.emote('laughing', 1.2, false);
    e._farceRoll = (e._farceRoll ?? 0) + dt * 7;      // il roule sur lui-même
    if (e._farceT < dt * 2) Particles.comic(e.x, e.y - e.size, 'ha');
    if (e._farceT > 2.4) {
      e._farcePh = null; e._farceCible = null; e._farceRoll = 0;
      e._farceCd = Ecosystem.cadence(e, 5);
    }
  },

  // et mastication — sans ça on ne la voyait jamais manger.
  raie(e, dt, t) {
    const [mx, my] = Camera.toWorld(Input.mx, Input.my);
    if (U.dist2(e.x, e.y, mx, my) < 100 * 100 && Input.mouseSpeed < 80 && Math.random() < dt * 1.5) {
      Particles.comic(e.x, e.y - e.size, '♪');       // ronronnement
    }
    const fy = World.floorY(e.x);
    // Treize raies × un fouissement toutes les 6 à 14 s, ça faisait 78 nuages
    // de sable par minute : le fond était en permanence en train de creuser.
    e._digCd = (e._digCd ?? Ecosystem.cadence(e, 6)) - dt;
    if (e._digCd <= 0) {
      e._digCd = Ecosystem.cadence(e, 6);
      e._digT = 3.5;                                     // durée de la descente
      Particles.sandCloud(e.x, fy - 4, true);
      Particles.burst(e.x, fy - 10, '#d9c092', 5);
      e.emote('eating', 2.4);
      e.hunger = Math.max(0, e.hunger - 0.25);           // les vers de sable la nourrissent
      e.wellFed += 0.18;
    }
    // La descente au sable est TENUE par sa propre durée. Elle l'était par
    // `_digCd < 11`, c'est-à-dire par le cooldown lui-même : la cible était
    // posée puis effacée à la frame suivante (le cooldown redémarrait à 6–14),
    // et elle aurait cloué la raie au fond une fois la cadence allongée.
    if (e._digT > 0) { e._digT -= dt; e._diveTargetY = fy - e.size * 0.5; }
    else e._diveTargetY = null;
  },

  // émet un sonar (cercles) quand il chasse dans le noir.
  // LE CACHALOT PLONGE. C'est toute sa vie : un aller-retour entre l'air qu'il
  // doit respirer et les céphalopodes qu'il va chercher tout en bas. Il passe
  // donc l'essentiel de son temps EN BAS (deux fois plus longtemps qu'en haut),
  // et il descend vraiment au fond — pas à mi-hauteur comme avant, où il ne
  // croisait ni calamar ni poulpe abyssal.
  cachalot(e, dt, t) {
    if (e._diveT === undefined) { e._diveT = U.rand(0, 30); e._divePhase = 'down'; }
    e._diveT -= dt;
    if (e._diveT <= 0) {
      e._divePhase = e._divePhase === 'up' ? 'down' : 'up';
      e._diveT = e._divePhase === 'down' ? U.rand(45, 70) : U.rand(14, 22);
      if (e._divePhase === 'up') Particles.splash(e.x);
    }
    if (e._surfacing) return;   // la respiration est prioritaire
    // En descente il vise le sable de la colonne où il se trouve, pas une
    // profondeur fixe : au large c'est l'abysse, plus près c'est moins profond.
    const fond = World.floorY(e.x) - e.size * 2;
    e._diveTargetY = e._divePhase === 'up'
      ? CONFIG.SURFACE_Y + 300
      : Math.max(CONFIG.SURFACE_Y + 1900, fond);
    if (e._divePhase === 'up' && Math.random() < dt * 2) Particles.bubble(e.x, e.y - e.size * 0.5, 6);
    if (e.state === 'hunt' && Math.random() < dt * 1.2) Particles.wake(e.x + e.size, e.y);
  },

  // LE CALAMAR GÉANT EST TIMIDE (GDD §12). Le monstre des abysses, oui — mais
  // qu'on approche d'un peu trop près et il se ratatine : il rentre ses bras,
  // rougit, et se laisse couler en espérant qu'on ne l'ait pas vu. La scène est
  // jouée en trois temps (repli → gêne → il se détend), sans bulle : c'est un
  // géant qui fait le tout petit, ça se lit sur son corps.
  calamar_geant(e, dt, t) {
    e._timideCd = (e._timideCd ?? U.rand(0, 8)) - dt;
    if (e._timide > 0) {
      e._timide -= dt;
      e._freeze = 0.2;                       // il n'ose plus bouger
      if (e._timide <= 0) { e._repli = 0; e._timideCd = U.rand(14, 26); }
      // `_repli` (0 → 1) est lu par drawSquid : les bras se referment en fuseau
      e._repli = Math.min(1, (e._repli ?? 0) + dt * 3);
      return;
    }
    e._repli = Math.max(0, (e._repli ?? 0) - dt * 1.5);
    if (e._timideCd > 0 || e.state === 'hunt') return;

    // Ce qui le gêne : le curseur du joueur, ou un colosse qui le frôle.
    let vu = false;
    if (Input.inWindow) {
      const [mx, my] = Camera.toWorld(Input.mx, Input.my);
      vu = U.dist2(e.x, e.y, mx, my) < (e.size * 2.4) ** 2;
    }
    if (!vu) {
      for (const o of (Ecosystem.colosses || [])) {
        if (o === e || o.dead) continue;
        if (U.dist2(e.x, e.y, o.x, o.y) < (e.size * 3.5) ** 2) { vu = true; break; }
      }
    }
    if (!vu) return;
    e._timide = U.rand(2.2, 3.4);
    e.emote('blush', 3);                     // le géant tout gêné
    e._timideCd = 999;                       // repris à la fin du repli
  },


  // LE FUGU SE GONFLE. Tout est déjà fait par `Entity.piquer` (gonflement
  // amorti, piqûre au contact) : le gag n'ajoute que le SOUFFLE — il se remplit
  // en avalant de l'eau, donc des bulles partent de sa bouche pendant qu'il
  // enfle. Sans ça il grossit sans qu'on comprenne comment.
  fugu(e, dt, t) {
    const g = e._piquantGonfle ?? 0;
    if (g > 0.25 && Math.random() < dt * g * 1.6) {
      Particles.bubble(e.x + e.size * 0.7, e.y - e.size * 0.1, U.rand(2, 4.5));
    }
    // Une fois dégonflé, il souffle un grand coup, soulagé.
    if (e._etaitGonfle && g < 0.12) {
      e._etaitGonfle = false;
      e.emote('happy', 1.4);
      Particles.bubble(e.x + e.size * 0.7, e.y, 6);
    }
    if (g > 0.6) e._etaitGonfle = true;
  },

  // LE PÉLICAN RATE, ET ÇA SE VOIT DANS SA POCHE. Le succès se raconte tout
  // seul (il l'avale) ; c'est le raté qui vaut la scène : il referme le bec, la
  // poche se remplit… et le poisson en ressort par le haut.
  // `_poche` (0→1) est lu par `FishBody.drawBird`.
  pelican(e, dt, t) {
    if (e._poche > 0) {
      e._poche = Math.max(0, e._poche - dt * 1.6);
      if (e._poche <= 0) e.emote('ashamed', 1.8);       // « bon. » — pas de bulle
    }
    // Il plane bras écartés quand il a repéré quelqu'un en l'air : c'est
    // l'anticipation, sans elle la capture sort de nulle part.
    if (e.state === 'hunt' && e.target && e.exprTimer <= 0) e.emote('angry', 1.2, false);
  },

  // L'ANGUILLE PRÉVIENT AVANT DE FRAPPER. La décharge elle-même est dans
  // `Entity.decharge` ; ici c'est la CHARGE : à l'approche du déclenchement,
  // de petites étincelles courent le long d'elle. Un éclair qui part sans
  // préavis se lit comme un bug d'affichage.
  anguille(e, dt, t) {
    const cd = e._shockCd ?? 99;
    // 9 étincelles/s par anguille, c'était 632 gerbes/min : le deuxième poste
    // de particules du jeu, pour un préavis d'une seconde. Trois suffisent à
    // annoncer la décharge.
    if (cd < 1.2 && Math.random() < dt * (1.2 - cd) * 2.5) {
      Particles.burst(e.x + U.rand(-1, 1) * e.size * 0.8,
                      e.y + U.rand(-1, 1) * e.size * 0.3, '#bfe4ff', 2);
    }
  },

  // LE THON EST PRESSÉ. Un bruit de moteur quand il passe à fond — c'est le
  // seul cas où du texte est justifié : c'est un BRUIT, pas une réplique.
  // Émis une seule fois par accélération (`_vroum`), jamais par frame.
  thon(e, dt, t) {
    e._vroumCd = (e._vroumCd ?? 0) - dt;
    const vite = e.speedNow > e.def.speed * 1.6;
    if (vite && !e._vroum && e._vroumCd <= 0) {
      e._vroum = true; e._vroumCd = U.rand(18, 40);
      Particles.shout(e.x, e.y - e.size * 1.2, 'VROUUUM', '#8fd8f5', e.size * 1.4);
      Particles.wake(e.x - e.size, e.y);
    }
    if (!vite) e._vroum = false;
  },

  // LE COQUILLAGE FABRIQUE UNE PERLE. Il s'ouvre en grand, la perle brille, il
  // se referme d'un coup dès qu'on la regarde de trop près.
  coquillage(e, dt, t) {
    e._perleCd = (e._perleCd ?? Ecosystem.cadence(e, 4)) - dt;
    if (e._perleCd > 0) { if (e._perle > 0) e._perle = Math.max(0, e._perle - dt * 0.7); return; }
    if (!e._perle) {
      e._perle = 1;
      e.emote('proud', 3);
      Particles.sparkles(e.x, e.y - e.size * 0.8, 6);
    }
    e._perleCd = Ecosystem.cadence(e, 4);
  },

  // LA BALEINE RONFLE SI FORT QUE ÇA SOUFFLE LES PETITS. Le ronflement existait
  // (`snores`) sans rien faire à personne : maintenant chaque expiration pousse
  // ce qui est devant elle.
  gros_dodo(e, dt, t) {
    if (e.state !== 'sleep') return;
    e._ronfle = (e._ronfle ?? 0) + dt;
    if (e._ronfle < 2.6) return;
    e._ronfle = 0;
    Particles.zzz(e.x, e.y - e.size * 0.6);
    const devant = e._facing >= 0 ? 1 : -1;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.size >= 70) continue;
      const dx = o.x - e.x;
      if (dx * devant < 0 || Math.abs(dx) > e.size * 2.4) continue;
      if (Math.abs(o.y - e.y) > e.size * 0.9) continue;
      o.vx += devant * 190; o.vy += U.rand(-40, 40);
      if (Math.random() < 0.25) o.emote('surprise', 1.2);
    }
  },

  // LA MÉDUSE PART EN LOOPING. Elle n'a pas de tête : le courant la retourne,
  // et elle en ressort avec les yeux qui tournent.
  meduse(e, dt, t) {
    e._loopCd = (e._loopCd ?? U.rand(10, 30)) - dt;
    if (e._loopCd > 0) return;
    e._loopCd = U.rand(55, 120);
    e.emote('dizzy', 2.6, Math.random() < 0.2);
    e.vy -= 60; e.vx += U.rand(-1, 1) * 50;
  },

  // LE POISSON-LUNE S'ENDORT EN PLEINE NAGE ET COULE. C'est littéralement ce
  // que « Bada-boum » raconte : il descend tout doucement, touche le fond, et
  // se réveille en sursaut.
  // Deux corrections après mesure (0 chute en 18 min) : il ne coulait pas assez
  // vite pour franchir la hauteur d'eau pendant une sieste de dix secondes, et
  // sa bande de profondeur ([200, 1900]) le retenait bien au-dessus du sable.
  // `_coule` lève le rappel de bande vers le bas, comme `_surfacing` le fait
  // vers le haut pour les cétacés, et la descente est franche.
  poisson_lune(e, dt, t) {
    if (e.state !== 'sleep') { e._coule = false; return; }
    e._coule = true;
    const sol = World.floorY(e.x) - e.size * 0.6;
    e._diveTargetY = sol;                       // il vise le sable, pas le vide
    e.vy += 55 * dt;
    if (e.y < sol) return;
    e.y = sol;
    e._coule = false; e._diveTargetY = null;
    e.state = 'wander'; e.stateTimer = 6;
    e.emote('surprise', 2.4);
    Particles.sandCloud(e.x, sol + e.size * 0.4, true);
    Particles.comic(e.x, e.y - e.size, '❗');
  },

  // L'ORQUE LANCE SES ÉCHOS LA NUIT, ET ÇA RÉVEILLE LES PROFONDEURS.
  // Enfin une raison au nom « Echo ».
  orque(e, dt, t) {
    if (Main.nightAmount() < 0.5) return;
    e._echoCd = (e._echoCd ?? U.rand(6, 18)) - dt;
    if (e._echoCd > 0) return;
    e._echoCd = U.rand(14, 30);
    Particles.spin(e.x, e.y, e.size * 2.2);
    Particles.comic(e.x, e.y - e.size * 1.2, '♪');
    let reveilles = 0;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.state !== 'sleep') continue;
      o.state = 'wander'; o.stateTimer = 4;
      if (reveilles++ < 3) o.emote('surprise', 1.6);   // pas vingt bulles d'un coup
    }
  },

  // LA BAUDROIE DISPARAÎT DANS LE NOIR : la nuit, on ne voit plus que sa
  // lanterne. Elle réapparaît quand elle mange. `_fondu` est lu par le rendu.
  lanterne(e, dt, t) {
    const nuit = Main.nightAmount();
    const visible = e._chew > 0 ? 1 : 0;
    const cible = U.lerp(1, visible, nuit * 0.9);
    e._fondu = U.lerp(e._fondu ?? 1, cible, Math.min(1, dt * 2.5));
  },

  // LA CREVETTE CLIGNOTE EN RYTHME AVEC TOUT L'ESSAIM — et il y en a toujours
  // une à contretemps. Le décalage vient de l'identifiant, donc c'est TOUJOURS
  // la même qui est à côté de la plaque.
  crevette(e, dt, t) {
    const contretemps = (e.id % 7) === 0;
    e._clignote = 0.5 + 0.5 * Math.sin(t * 3 + (contretemps ? 2.1 : 0));
  },

  // LE CALMAR DÉCOLLE : 3, 2, 1… et il file en marche arrière, trop fort.
  calamar(e, dt, t) {
    if (e._fusee > 0) {
      e._fusee -= dt;
      if (e._fusee <= 0) {
        const dir = e._facing >= 0 ? -1 : 1;      // il part À RECULONS
        e.vx += dir * 260; e.vy -= 90;
        Particles.bubble(e.x - dir * e.size, e.y, 6);
        Particles.burst(e.x - dir * e.size, e.y, '#cfd8ff', 7);
        e.emote('surprise', 1.6);
      }
      return;
    }
    e._fuseeCd = (e._fuseeCd ?? U.rand(14, 40)) - dt;
    if (e._fuseeCd > 0) return;
    e._fuseeCd = U.rand(60, 140);
    e._fusee = 0.9;                               // le décompte
    e._freeze = 0.9;
    if (Math.random() < 0.4) Particles.comic(e.x, e.y - e.size * 1.2, '3');
  },

  // LA MURÈNE BÂILLE. Un jaillissement pour rien, qui fait détaler tout le
  // récif — c'est le seul moment où on la voit en entier.
  murene(e, dt, t) {
    e._bailleCd = (e._bailleCd ?? U.rand(12, 35)) - dt;
    if (e._bailleCd > 0) return;
    e._bailleCd = U.rand(30, 70);
    e.emote('eating', 2.2, false);                // la gueule grande ouverte
    let fuyards = 0;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.size > 40) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) > 220 * 220) continue;
      o.state = 'flee'; o.target = e; o.stateTimer = 1.4;
      if (fuyards++ < 3) o.emote('scared', 1.4);
    }
  },

  // LE FOU MOUSTACHU REMONTE AVEC UNE ALGUE. Le raté existait déjà (il ressort
  // trempé) : on lui ajoute le trophée ridicule.
  moustachu(e, dt, t) {
    if (e.wet > 2.4 && !e._algue) {
      e._algue = 2.6;
      Particles.comic(e.x, e.y - e.size * 1.3, '🌿');
    }
    if (e._algue > 0) e._algue -= dt;
  },

  // LE POISSON VOLANT RATE SON SAUT et fait comme si c'était voulu.
  volant(e, dt, t) {
    if (e.jumpState === 'air' && !e._frime) {
      e._frime = true;
      if (Math.random() < 0.25) e.emote('proud', 1.8);
    }
    if (e.jumpState !== 'air') e._frime = false;
  },

  // LE BANC DE CONFETTIS DESSINE UNE FORME, puis se disperse, gêné d'avoir été
  // vu. La forme est portée par le GROUPE : chaque poisson reçoit sa place sur
  // le contour, et y va. Trois figures — cœur, rond, carré.
  confetti(e, dt, t) {
    if (e.groupId == null) return;
    const membres = Ecosystem.byGroup[e.groupId];
    if (!membres || membres.length < 8) return;
    // Un seul individu du banc pilote la scène : celui d'identifiant le plus
    // petit. Sans ce chef, chacun démarrait sa propre figure.
    const chef = membres[0];
    if (e !== chef) {
      // Le chef a pu mourir ou changer de banc en pleine figure. Sans ce
      // ménage, l'ancien chef garde sa phase pour toujours et ses membres
      // restent cloués à une place qui n'est plus pilotée par personne.
      if (e._figPh) { e._figPh = null; e._figX = null; e._figSpeed = null; e._enFigure = false; }
      return;
    }

    // LA FIGURE NE SE FORMAIT JAMAIS. Mesuré : les trois formes sont bien
    // tirées (cœur, rond, carré à parts égales), mais la forme n'était lisible
    // que **0,39 s par figure**, et à cet instant chaque poisson se trouvait
    // encore à **337 px en moyenne de sa place** — pour une figure de 150 px de
    // rayon. Ils étaient deux fois plus loin de leur place que la figure
    // n'était grande. On ne voyait donc pas un cœur : on voyait un nuage se
    // resserrer vaguement et se rouvrir.
    //
    // Trois causes, toutes corrigées ici :
    //   1. l'amplitude suivait un TRIANGLE (0 → 1 → 0 en 2,6 s) : la forme
    //      pleine n'existait qu'à un instant, jamais tenue ;
    //   2. la place assignée était multipliée par cette amplitude, donc elle
    //      FUYAIT le poisson qui courait après, et elle était accrochée au chef,
    //      qui bougeait lui aussi ;
    //   3. le steering de figure plafonne à 1,6× la vitesse — 112 px/s pour un
    //      Confetti, soit 3 s pour parcourir 337 px, quand la scène en durait 2,6.
    //
    // Elle se joue donc en trois temps, comme toute mise en scène du projet :
    // ils COURENT à leur place, ils TIENNENT la pose, puis ils se dispersent.
    if (e._figPh) {
      e._figT -= dt;
      const R = 90 + membres.length * 1.6;
      const pose = e._figPh === 'pose';
      // L'ancre est FIGÉE au démarrage. Accrochée au chef, la cible se déplaçait
      // pendant que le banc courait après elle.
      membres.forEach((m, i) => {
        const p = GAGS._figure(e._figure, i / membres.length, R);
        m._figX = e._figCX + p.x; m._figY = e._figCY + p.y;
        // Il faut pouvoir Y ALLER : plein régime pour rejoindre sa place, puis
        // de quoi la tenir sans repartir en vadrouille.
        m._figSpeed = m.def.speed * (pose ? 3.2 : 1.4);
        m._enFigure = true;                 // ses boids le tiraient vers le banc
      });
      if (e._figT > 0) return;
      if (pose) { e._figPh = 'tenue'; e._figT = 2.8; return; }
      // Dispersion : la gêne se lit sur le visage de TOUS, mais la goutte ne
      // sort que sur quelques-uns — un banc de 40 en faisait 40 d'un coup.
      e._figPh = null;
      e._figCd = Ecosystem.cadenceBanc(e, membres, 4);
      for (const m of membres) {
        m._figX = null; m._figY = null; m._figSpeed = null; m._enFigure = false;
        m.emote('blush', 1.6, Math.random() < 0.12);
      }
      return;
    }
    e._figCd = (e._figCd ?? Ecosystem.cadenceBanc(e, membres, 4)) - dt;
    if (e._figCd > 0) return;
    // ON NE PREND PAS LA POSE EN DORMANT. Depuis que le sommeil est une
    // décision de banc, la figure pouvait se déclencher sur un banc entièrement
    // endormi : personne ne rejoignait sa place et on voyait un tas de dormeurs
    // avec des ZzZ. C'est une scène de jour.
    const h = Ecosystem.humeurDe(e);
    if ((h && h.dort) || e.state === 'sleep') { e._figCd = U.rand(8, 16); return; }
    e._figPh = 'pose'; e._figT = 2.2;
    e._figCX = e.x; e._figCY = e.y;
    e._figure = U.pick(['coeur', 'rond', 'carre']);
  },

  // Le contour d'une figure, paramétré de 0 à 1.
  _figure(quoi, u, R) {
    if (quoi === 'rond') {
      const a = u * Math.PI * 2;
      return { x: Math.cos(a) * R, y: Math.sin(a) * R };
    }
    if (quoi === 'carre') {
      const c = u * 4, k = c % 1, cote = Math.floor(c);
      const s = R * 0.9, v = -s + k * 2 * s;
      return [{ x: v, y: -s }, { x: s, y: v }, { x: -v, y: s }, { x: -s, y: -v }][cote];
    }
    // cœur
    const a = u * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(a), 3);
    const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return { x: x * R / 17, y: y * R / 17 };
  },

  // L'ÉTOILE SE COLLE À UN PASSANT et se fait transporter en rigolant. Au bout
  // d'un moment elle se décroche. (Son ancien câlin est passé à l'Anémone.)
  etoile_ventouse(e, dt, t) {
    if (e._monte && !e._monte.dead) {
      e._ventouseT -= dt;
      // L'ANCRE SUIT, pas seulement la position : l'étoile est `fixed`, et
      // `move()` la recolle à son ancre juste après — sans ça elle ne bougeait
      // pas d'un pixel pendant tout le « transport ».
      e.x = e._monte.x; e.y = e._monte.y - e._monte.size * 0.7;
      e.anchorX = e.x; e.anchorY = e.y;
      if (Math.random() < dt * 0.5) e.emote('happy', 1.5, false);
      if (e._ventouseT <= 0) {
        e._monte = null;
        // Elle se repose sur une PLACE LIBRE. Reposée là où elle se trouve,
        // elle atterrissait sur ses congénères — et une étoile posée ne peut
        // plus jamais s'en écarter. C'était la dernière source d'empilement.
        const marge = Math.max(64, e.def.size * 3.4);
        const spot = Ecosystem.placeLibreAuFond(e.speciesId, e.x, marge);
        e.x = spot !== null ? spot : e.x;
        e.y = World.floorY(e.x) - e.def.size * 0.4 + (e._sable || 0);
        e.anchorX = e.x; e.anchorY = e.y;
        e.emote('surprise', 1.5);
      }
      return;
    }
    e._monte = null;
    e._ventouseCd = (e._ventouseCd ?? Ecosystem.cadence(e, 3)) - dt;
    if (e._ventouseCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.movement === 'fixed' || o.def.size < 16) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) > 90 * 90) continue;
      e._monte = o; e._ventouseT = U.rand(6, 14);
      e._ventouseCd = Ecosystem.cadence(e, 3);
      e.emote('happy', 2);
      o.emote('surprise', 1.6);
      Particles.comic(e.x, e.y - 18, '🎢');
      return;
    }
    e._ventouseCd = 4;
  },

  // L'ANÉMONE BALANCE SES BRAS EN MUSIQUE, et fait le câlin dont l'étoile a
  // hérité jusqu'ici. Deux gestes, un seul cooldown pour ne pas saturer.
  anemone(e, dt, t) {
    e._danse = 0.5 + 0.5 * Math.sin(t * 1.6 + e.phase);
    if (Math.random() < dt * 0.012) Particles.notes(e.x, e.y - e.size);
    e._calinCd = (e._calinCd ?? Ecosystem.cadence(e, 4)) - dt;
    if (e._calinCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.movement === 'fixed') continue;
      if (o.speedNow < 12) continue;                  // ceux qui PASSENT
      if (U.dist2(e.x, e.y, o.x, o.y) > 80 * 80) continue;
      e._calinCd = Ecosystem.cadence(e, 4);
      e.emote('happy', 2.2);
      o.emote('blush', 1.8);
      return;
    }
    e._calinCd = 3;
  },

  // LE REQUIN PERD SES DENTS EN MANGEANT, ET IL VA VOIR LE DENTISTE.
  //
  // C'est la seule scène du jeu qui ait un début, un problème et une résolution,
  // et elle ne s'est JAMAIS jouée : mesuré sur 18 minutes, 249 soins par les
  // Dentistes, 9 pertes de dent chez les Requins, et zéro intersection. Cinq
  // conditions indépendantes devaient tomber ensemble — une prise (rare), un
  // tirage à 55 %, 17 s d'édentement, deux bandes de profondeur qui ne se
  // recouvrent qu'à moitié (500–1700 contre 150–1100) et 200 px entre les deux.
  //
  // Il ne manquait pas un réglage, il manquait une INTENTION : le requin va
  // chercher son dentiste, comme on migre vers une frayère. Trois changements,
  // tous nécessaires ensemble — une dent tombe à CHAQUE prise (il s'appelle
  // Dents-Molles), l'édentement dure assez pour faire le trajet, et le trajet
  // existe. Le garde-fou d'origine tient toujours : la repousse reste
  // automatique et bornée, il ne peut pas rester édenté indéfiniment si aucun
  // dentiste n'est joignable.
  requin(e, dt, t) {
    if (e._edente > 0) {
      e._edente -= dt;
      e.hold('sad');                          // TENUE : on doit comprendre qu'il boude
      // Il met le cap sur le dentiste le plus proche. `_figX` prime sur le
      // steering de chasse dans `move`, donc il y va vraiment.
      const soigneurs = Ecosystem.bySpecies.dentiste || [];
      let best = null, bestD = 1e18;
      for (const d of soigneurs) {
        if (d.dead || d._client) continue;
        const d2 = U.dist2(e.x, e.y, d.x, d.y);
        if (d2 < bestD) { bestD = d2; best = d; }
      }
      if (e._soigneur && (e._soigneur.dead || e._soigneur._client !== e)) e._soigneur = null;
      if (best && !e._soigneur) { e._figX = best.x; e._figY = best.y; e._figSpeed = e.def.speed * 1.2; }
      else { e._figX = null; e._figY = null; e._figSpeed = null; }
      if (e._edente <= 0) {
        e.release();
        e._figX = null; e._figY = null; e._figSpeed = null;
        e.emote('happy', 2);                  // elles ont repoussé toutes seules
        Particles.sparkles(e.x + e.size * 0.6, e.y, 4);
      }
      return;
    }
    e._figX = null; e._figY = null; e._figSpeed = null;
    // Il vient de croquer : une dent se décroche et tombe. À chaque fois.
    if (e._chew > 0 && !e._dentTombee) {
      e._dentTombee = true;
      e._edente = U.rand(26, 40);             // le temps d'aller jusqu'au récif
      Particles.comic(e.x + e.size * 0.5, e.y, '🦷');
      e.emote('surprise', 2);
    }
    if (e._chew <= 0) e._dentTombee = false;
  },

  // LE POULPE NINJA, EN QUATRE TEMPS. Son « ninja » ne se voyait pas : il avait
  // un flag `ink` et une furtivité passive, mais aucune scène. Une disparition
  // qui n'est pas mise en scène se lit comme un bug d'affichage — d'où les
  // phases, chacune visible :
  //   1. `guet`    — il se fige et regarde autour de lui, l'air de rien ;
  //   2. `poof`    — nuage d'encre, il devient invisible ;
  //   3. `ailleurs`— il ressort à 250-450 px de là, toujours invisible ;
  //   4. `retour`  — il réapparaît en fondu, très fier de lui.
  // Une seule bulle sur toute la scène, au moment du poof.
  poulpe(e, dt, t) {
    // Le rot d'encre : quand l'encre part (Entity.encre), il l'annonce. Une
    // inspiration, puis LE ROT — c'est ce qui manquait pour que le nuage soit
    // drôle au lieu d'être discret.
    if (e._inkCd > 12.5 && !e._rot) {
      e._rot = true;
      e.emote('surprise', 1.2);
      Particles.shout(e.x, e.y - e.size * 1.3, 'BUUURP', '#b8a0e8', e.size * 1.3);
      Particles.bubble(e.x + e.size * 0.5, e.y, 7);
    }
    if ((e._inkCd ?? 0) < 1) e._rot = false;

    if (e._ninjaPh) {
      e._ninjaT -= dt;

      if (e._ninjaPh === 'guet') {
        e._freeze = 0.3;
        if (e._ninjaT <= 0) {
          e._ninjaPh = 'poof'; e._ninjaT = 0.45;
          Particles.ink(e.x, e.y, e.size * 1.2);
          Particles.comic(e.x, e.y - e.size, '💨');
        }
        return;
      }

      if (e._ninjaPh === 'poof') {
        e._invisible = Math.min(1, (e._invisible ?? 0) + dt * 4);
        e._freeze = 0.3;
        if (e._ninjaT <= 0) {
          // Il ressort ailleurs — mais toujours dans son eau : la bande de
          // profondeur et la barrière de rivage valent aussi pour un ninja.
          const d = U.rand(250, 450) * (Math.random() < 0.5 ? -1 : 1);
          const nx = U.clamp(e.x + d, e.limiteLarge(), CONFIG.WORLD_WIDTH - 120);
          const ny = U.clamp(e.y + U.rand(-120, 120),
                             CONFIG.SURFACE_Y + e.def.depthBand[0],
                             Math.min(CONFIG.SURFACE_Y + e.def.depthBand[1],
                                      World.floorY(nx) - e.size));
          e.x = nx; e.y = ny; e.vx = 0; e.vy = 0;
          e._ninjaPh = 'retour'; e._ninjaT = 0.9;
        }
        return;
      }

      if (e._ninjaPh === 'retour') {
        e._invisible = Math.max(0, (e._invisible ?? 1) - dt * 1.4);
        if (e._ninjaT <= 0) {
          e._ninjaPh = null;
          e._invisible = 0;
          e.emote('smug', 2.2);              // « vous ne m'avez jamais vu »
        }
        return;
      }
    }

    // Déclenchement : rarement, et jamais en fuite ni en chasse — un ninja
    // choisit son moment.
    e._ninjaCd = (e._ninjaCd ?? U.rand(20, 50)) - dt;
    if (e._ninjaCd > 0 || e.state === 'flee' || e.state === 'hunt') return;
    e._ninjaCd = U.rand(35, 80);
    e._ninjaPh = 'guet'; e._ninjaT = 1.1;
    e.emote('surprise', 1.1, false);          // il vérifie que personne ne regarde
  },

  // LE POISSON-TAPIS OUVRE UNE ÉNORME BOUCHE. Il ne fait rien d'autre de la
  // journée : il attend, confondu avec le sable. Le gag, c'est le contraste —
  // rien, rien, rien, et d'un coup une gueule plus large que lui.
  // `_gueule` (0 → 1) est lu par le rendu.
  poisson_tapis(e, dt, t) {
    const cible = (e.state === 'strike' || e._chew > 0) ? 1
                : (e._traque && !e._traque.dead ? 0.35 : 0);
    e._gueule = U.lerp(e._gueule ?? 0, cible, Math.min(1, dt * (cible > 0.5 ? 14 : 3)));
    if (cible > 0.5 && !e._gueuleOuverte) {
      e._gueuleOuverte = true;
      e.emote('eating', 1.6, false);
    }
    if (cible < 0.2) e._gueuleOuverte = false;
  },

  // LA STATION DE NETTOYAGE. Un gros arrive, s'arrête, ouvre grand la bouche ;
  // le dentiste travaille dedans ; les deux repartent. Et surtout : c'est lui
  // qui fait REPOUSSER les dents du Requin Dents-Molles — le gag du requin ne
  // se referme que grâce à lui.
  dentiste(e, dt, t) {
    if (e._client && !e._client.dead) {
      e._soinT -= dt;
      e._freeze = 0.3; e._faceAt = e._client;
      e._client._freeze = 0.3; e._client._faceAt = e;
      e._client.hold('eating');                 // il ouvre grand
      if (Math.random() < dt * 1) Particles.sparkles(e._client.x + e._client.size * 0.6, e._client.y, 2);
      if (e._soinT <= 0) {
        const c = e._client;
        c.release();
        if (c._edente > 0) { c._edente = 0; c.emote('happy', 2.5); }   // dents refaites !
        else c.emote('happy', 1.8);
        e.emote('proud', 2);
        c._soigneur = null;
        e._client = null; e._faceAt = null; e._soinCd = Ecosystem.cadence(e, 5);
      }
      return;
    }
    if (e._client) { e._client._soigneur = null; e._client = null; }
    e._soinCd = (e._soinCd ?? Ecosystem.cadence(e, 5)) - dt;
    if (e._soinCd > 0) return;
    // Priorité au requin édenté : c'est son patient le plus urgent.
    let best = null, bestScore = 1e9;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.size < 18) continue;
      if (o._soigneur && o._soigneur !== e && !o._soigneur.dead && o._soigneur._client === o) continue;
      const d2 = U.dist2(e.x, e.y, o.x, o.y);
      if (d2 > 200 * 200) continue;
      const score = d2 / (o._edente > 0 ? 40 : 1);
      if (score < bestScore) { bestScore = score; best = o; }
    }
    // UN ÉDENTÉ SE REPÈRE DE BEAUCOUP PLUS LOIN. `neighbors` ne porte qu'à
    // ~195 px : un requin de 70 px qui arrive n'était vu qu'une fois collé au
    // dentiste, alors qu'il fait le trajet exprès. Même raison que la liste
    // dédiée des colosses — la grille ne va pas aussi loin qu'il le faudrait.
    if (!best) {
      for (const o of Ecosystem.bySpecies.requin || []) {
        if (o.dead || !(o._edente > 0)) continue;
        if (o._soigneur && !o._soigneur.dead && o._soigneur._client === o) continue;
        if (U.dist2(e.x, e.y, o.x, o.y) < 420 * 420) { best = o; break; }
      }
    }
    if (!best) { e._soinCd = 3; return; }
    e._client = best; best._soigneur = e; e._soinT = U.rand(2.4, 3.6);
    if (Math.random() < 0.4) Particles.comic(e.x, e.y - e.size * 1.6, '🪥');
  },

  // LE POISSON POLICE GRONDE. Il repère un pétomane, un caca frais ou un
  // farceur, fonce dessus et le sermonne — le fautif file, tout honteux.
  police(e, dt, t) {
    if (e._fautif && !e._fautif.dead) {
      e._grondeT -= dt;
      e._faceAt = e._fautif;
      if (U.dist2(e.x, e.y, e._fautif.x, e._fautif.y) < (e.size + e._fautif.size + 30) ** 2) {
        e._freeze = 0.3; e._fautif._freeze = 0.3;
        e.hold('angry');
        e._fautif.emote('ashamed', 2);
      }
      if (e._grondeT <= 0) { e.release(); e._fautif = null; e._faceAt = null; e._grondeCd = U.rand(14, 32); }
      return;
    }
    e._fautif = null;
    e._grondeCd = (e._grondeCd ?? U.rand(6, 18)) - dt;
    if (e._grondeCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.speciesId === e.speciesId) continue;
      // Les fautifs : celui qui pète, celui qui vient de faire un caca, le farceur
      const coupable = o._farting || o._poopPh > 0 || o._farcePh === 'bouh' || o._tickleTarget;
      if (!coupable) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) > 420 * 420) continue;
      e._fautif = o; e._grondeT = U.rand(2.5, 4);
      e.state = 'hunt'; e.target = o; e.stateTimer = 5;   // il fonce dessus
      if (Math.random() < 0.5) Particles.comic(e.x, e.y - e.size * 1.4, '🚨');
      return;
    }
    e._grondeCd = 2.5;
  },

  // LE MÉROU ASPIRE au lieu de mordre : il ouvre une bouche énorme et la proie
  // est happée. Le « patatras », c'est qu'il se cogne partout en fonçant.
  merou(e, dt, t) {
    e._aspire = U.lerp(e._aspire ?? 0, e.state === 'strike' ? 1 : 0, Math.min(1, dt * 10));
    if (e.state === 'strike' && !e._slurp) {
      e._slurp = true;
      e.emote('eating', 1.4, false);
      Particles.bubble(e.x + e.size * 0.8, e.y, 5);
    }
    if (e.state !== 'strike') e._slurp = false;
  },

  // LES PAPILLONS VONT PAR DEUX. Chacun se choisit un compagnon et le suit
  // côte à côte ; séparés, ils se cherchent et se retrouvent avec des cœurs.
  papillon(e, dt, t) {
    if (e._duo && (e._duo.dead || e._duo.speciesId !== e.speciesId)) e._duo = null;
    if (!e._duo) {
      e._duoCd = (e._duoCd ?? 0) - dt;
      if (e._duoCd > 0) return;
      e._duoCd = 3;
      for (const o of Ecosystem.neighbors(e.x, e.y)) {
        if (o === e || o.dead || o.speciesId !== e.speciesId || o._duo) continue;
        e._duo = o; o._duo = e;
        e.emote('love', 1.8, false); o.emote('love', 1.8, false);
        Particles.hearts((e.x + o.x) / 2, (e.y + o.y) / 2);
        return;
      }
      return;
    }
    // Il nage COLLÉ à son compagnon, un peu en retrait
    const d2 = U.dist2(e.x, e.y, e._duo.x, e._duo.y);
    if (d2 > 60 * 60 && e.state === 'wander') {
      e._figX = e._duo.x - 26; e._figY = e._duo.y + 10;   // réutilise le steering de figure
    } else { e._figX = null; e._figY = null; }
  },

  // LE POISSON COFFRE NAGE MAL. Il avance par à-coups en tournant sur lui-même,
  // et il a l'air très content de lui malgré tout.
  coffre(e, dt, t) {
    e._tangue = Math.sin(t * 4.5 + e.phase) * 0.22;
    if (Math.random() < dt * 0.12) {
      e.vx += U.rand(-1, 1) * 40; e.vy += U.rand(-1, 1) * 25;
      if (Math.random() < 0.15) e.emote('proud', 1.6, false);
    }
  },

  // LE NUDIBRANCHE CHANGE DE COULEUR en broutant. Il est déjà fluo ; là il
  // pulse, comme s'il digérait quelque chose de très sucré.
  nudibranche(e, dt, t) {
    e._fluo = 0.5 + 0.5 * Math.sin(t * 1.1 + e.phase * 2);
    if (Math.random() < dt * 0.03) e.emote('happy', 1.6, false);
  },

  // LA TORTUE MONTE PONDRE SUR LA PLAGE. C'est le seul animal du jeu qui sort
  // de l'eau volontairement, et c'est toute sa scène — en quatre temps :
  //   0. `approche` — elle NAGE jusqu'au rivage. Sans cette phase elle jouait
  //                   toute la scène en pleine eau, à 1700 px de la plage :
  //                   ramper à 22 px/s ne franchit pas 1700 px ;
  //   1. `montee`  — elle rampe hors de l'eau, de plus en plus lentement ;
  //   2. `creuse`  — elle s'arrête et pousse le sable derrière elle ;
  //   3. `ponte`   — les œufs, et un soupir ;
  //   4. `retour`  — elle redescend à la mer, et repart TRÈS au large.
  // Le reste du temps elle nage au loin (`offshore`), on ne la voit près de la
  // côte QUE pour ça.
  tortue(e, dt, t) {
    if (e._plage) {
      e._plageT -= dt;
      const sol = World.floorY(e.x) - e.size * 0.5;

      if (e._plagePh === 'approche') {
        // Elle met le cap sur la plage. On passe par la cible de steering
        // (`_figX/_figY`, la priorité la plus haute de `move`) et non par `vx`
        // en dur : l'intégration l'aurait écrasée.
        e._figX = World.shoreX + 40;
        e._figY = CONFIG.SURFACE_Y + 40;
        // Elle bascule en reptation quand elle a VRAIMENT pied. Le repli sur
        // `_plageT` est un filet, pas un chemin normal : sans le test de
        // profondeur elle se mettait à ramper en pleine eau.
        if (World.depthAt(e.x) < 110 || e.x < World.shoreX + 80) {
          e._figX = null; e._figY = null;
          e._plagePh = 'montee'; e._plageT = 12;
        } else if (e._plageT <= 0) {
          e._figX = null; e._figY = null;
          e._plage = false; e._plagePh = null; e._ponteCd = 40;   // elle renonce
        }
        return;
      }
      if (e._plagePh === 'montee') {
        // Elle rampe vers le haut de la plage, à contre-pente et à bout de forces
        e.vx = -22; e.vy = 0; e.y = sol;
        if (Math.random() < dt * 2) Particles.sandCloud(e.x + e.size * 0.6, sol + e.size * 0.3);
        if (e._plageT <= 0 || World.depthAt(e.x) < -70) {
          e._plagePh = 'creuse'; e._plageT = 3.2;
          e.emote('angry', 2, false);              // l'effort
        }
        return;
      }
      if (e._plagePh === 'creuse') {
        e.vx = 0; e.vy = 0; e.y = sol;
        if (Math.random() < dt * 6) Particles.sandCloud(e.x - e.size * 0.9, sol + e.size * 0.2, true);
        if (e._plageT <= 0) {
          e._plagePh = 'ponte'; e._plageT = 2.6;
          for (let k = 0; k < U.randInt(2, 4); k++) {
            Ecosystem.layEgg(e, e.x - e.size * 0.8 + U.rand(-14, 14), sol + U.rand(0, 10));
          }
          e.wellFed = 0; e._mateCd = 90;
          e.emote('love', 2.6);
          Particles.hearts(e.x, e.y - e.size);
        }
        return;
      }
      if (e._plagePh === 'ponte') {
        e.vx = 0; e.vy = 0; e.y = sol;
        if (e._plageT <= 0) { e._plagePh = 'retour'; e._plageT = 26; e.emote('happy', 2.2); }
        return;
      }
      // Retour à la mer : elle redescend la pente jusqu'à être vraiment à l'eau
      e.vx = 46; e.vy = 20;
      if (!World.isUnderwater(e.x, e.y)) e.y = sol;
      if (e._plageT <= 0 || World.depthAt(e.x) > 120) {
        e._plage = false; e._plagePh = null;
        e._ponteCd = U.rand(120, 260);            // elle ne remonte pas de sitôt
        e.state = 'wander'; e.stateTimer = 8;
      }
      return;
    }

    // Déclenchement : prête à pondre, et pas trop loin du rivage.
    e._ponteCd = (e._ponteCd ?? U.rand(40, 140)) - dt;
    if (e._ponteCd > 0 || e.stage !== 'adult' || e.wellFed < 1) return;
    e._plage = true; e._plagePh = 'approche'; e._plageT = 70;
    e.state = 'wander'; e.target = null;
    Particles.comic(e.x, e.y - e.size * 1.4, '🥚');
  },

  // L'ESPADON FAIT SON GRAND RUN. C'est le poisson le plus rapide du jeu —
  // 460 px/s de sprint, presque quatre fois sa vitesse de croisière — et on ne
  // le voyait jamais s'en servir : il ne sprintait qu'en chasse, sur quelques
  // dizaines de pixels, et le sifflement partait sans qu'on comprenne d'où.
  // Le run est une scène à part entière, en trois temps :
  //   1. `montee` — il met le cap au large et remonte JUSTE sous la surface ;
  //   2. `run`    — ligne droite plein gaz, sillage continu, un seul « FIOUUU » ;
  //   3. `fin`    — il ralentit, très content de lui.
  // Il se joue AU GRAND LARGE exprès : c'est une raison d'aller y voir, et la
  // pleine eau est le seul endroit où deux mille pixels de ligne droite
  // tiennent sans qu'il percute quoi que ce soit.
  espadon(e, dt, t) {
    const SURF = CONFIG.SURFACE_Y + 80;               // juste sous la ligne d'eau
    if (e._runPh) {
      e._runT -= dt;

      if (e._runPh === 'montee') {
        e._figX = e.x + e._runDir * 900; e._figY = SURF;
        e._figSpeed = e.def.speed * 1.4;
        e._diveTargetY = SURF;                      // le rappel vertical générique
        const enPlace = Math.abs(e.y - SURF) < 60 && e.x > World.zonesX.hauteMer;
        if (enPlace || e._runT <= 0) {
          e._runPh = 'run'; e._runT = 4.6;
          Particles.shout(e.x, e.y - e.size, 'FIOUUU', '#cfe4f5', e.size * 1.5);
          e.emote('angry', 1.6, false);               // le regard de la charge
        }
        return;
      }

      if (e._runPh === 'run') {
        // Il vise TRÈS loin devant : la cible ne doit jamais être atteinte, ou
        // il freinerait au milieu de son propre run.
        // La cible de steering est presque horizontale sur 2 400 px : elle ne
        // suffit pas à le TENIR à ras de l'eau (mesuré à 196 px sous la surface
        // au lieu de 80). `_diveTargetY` s'en charge, c'est sa raison d'être.
        e._figX = e.x + e._runDir * 2400; e._figY = SURF;
        e._diveTargetY = SURF;
        e._figSpeed = e.def.sprintSpeed;
        if (Math.random() < dt * 9) Particles.wake(e.x - e._runDir * e.size, e.y);
        if (Math.random() < dt * 3) Particles.bubble(e.x - e._runDir * e.size, e.y, U.rand(2, 4));
        // Le rivage et le bord du monde arrêtent le run : mieux vaut le finir
        // tôt que le finir dans le sable.
        const mur = e.x < e.limiteLarge() + 300 || e.x > CONFIG.WORLD_WIDTH - 300;
        if (e._runT <= 0 || mur) { e._runPh = 'fin'; e._runT = 1.8; }
        return;
      }

      // `fin` : il lève le pied, et il se sait beau
      e._figSpeed = e.def.speed;
      if (e._runT <= 0) {
        e._runPh = null; e._figX = null; e._figY = null; e._figSpeed = null;
        e._diveTargetY = null;
        e.emote('proud', 2.2);
        e._runCd = Ecosystem.cadence(e, 2);
      }
      return;
    }

    e._runCd = (e._runCd ?? Ecosystem.cadence(e, 2)) - dt;
    if (e._runCd > 0 || e.state === 'hunt' || e.state === 'flee') return;
    e._runPh = 'montee'; e._runT = 11;
    // Toujours vers le large quand il en est loin, sinon dans son sens de nage.
    e._runDir = e.x < World.zonesX.hauteMer ? 1 : (e._facing >= 0 ? 1 : -1);
  },

  // LE GOÉLAND VOLE LA PRISE DES AUTRES. Il ne chasse rien lui-même : il guette
  // un oiseau qui vient d'attraper quelque chose, fond dessus, et repart avec.
  goeland(e, dt, t) {
    if (e._vol > 0) { e._vol -= dt; return; }
    e._volCd = (e._volCd ?? U.rand(5, 15)) - dt;
    if (e._volCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || !o.def.aerial) continue;
      if (o._chew <= 0 && !(o._poche > 0)) continue;      // il n'a rien à voler
      if (U.dist2(e.x, e.y, o.x, o.y) > 320 * 320) continue;
      // Le hold-up
      e._volCd = U.rand(25, 55); e._vol = 1.4;
      e.x = o.x + U.rand(-30, 30); e.y = o.y - 30;
      o._chew = 0; o._chewPrey = null; o._poche = 0;
      o.emote('angry', 2.2);
      e.emote('smug', 2.2);
      e.hunger = Math.max(0, e.hunger - 0.25);
      Particles.comic(e.x, e.y - e.size, '😈');
      Particles.burst(o.x, o.y, '#ffe08a', 6);
      return;
    }
    e._volCd = 2;
  },

  // LE CORMORAN PLONGE VRAIMENT : il descend bien plus bas que le Fou, et
  // ressort en secouant ses plumes.
  cormoran(e, dt, t) {
    if (e.y > CONFIG.SURFACE_Y + 40) {
      e._sousLeau = true;
      if (Math.random() < dt * 4) Particles.bubble(e.x, e.y, U.rand(1.5, 3));
    } else if (e._sousLeau) {
      e._sousLeau = false;
      e.wet = 2.4;
      Particles.splash(e.x);
      e.emote('surprise', 1.4, false);
    }
  },

  // LES ANGUILLES-JARDINIÈRES RENTRENT TOUTES D'UN COUP. Elles ondulent hors du
  // sable, et à la moindre menace la colonie entière disparaît en une seconde.
  // `_rentre` (0 → 1) est lu par le rendu.
  jardiniere(e, dt, t) {
    let menace = false;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.speciesId === e.speciesId) continue;
      if (o.def.size < 20 && o.state !== 'hunt') continue;
      if (U.dist2(e.x, e.y, o.x, o.y) < 190 * 190) { menace = true; break; }
    }
    const cible = menace ? 1 : 0;
    e._rentre = U.lerp(e._rentre ?? 0, cible, Math.min(1, dt * (menace ? 9 : 1.2)));
    if (menace && !e._planque) {
      e._planque = true;
      if (Math.random() < 0.15) e.emote('scared', 1.4, false);
    }
    if (!menace) e._planque = false;
  },

  // LE BERNARD-L'ERMITE DÉMÉNAGE. De temps en temps il trouve sa coquille trop
  // petite, en cherche une autre — et va lorgner celle du Coquillage Rieur, qui
  // n'apprécie pas du tout.
  bernard(e, dt, t) {
    e._demeCd = (e._demeCd ?? U.rand(25, 60)) - dt;
    if (e._demeCd > 0) return;
    e._demeCd = U.rand(50, 110);
    e.emote('surprise', 2);
    Particles.comic(e.x, e.y - e.size * 1.5, '🐚');
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o.dead || o.speciesId !== 'coquillage') continue;
      if (U.dist2(e.x, e.y, o.x, o.y) > 140 * 140) continue;
      o.emote('angry', 2.4);            // « pas touche ! »
      e.emote('ashamed', 2);
      return;
    }
  },

  // LE CONCOMBRE ASPIRE LE SABLE et râle. Il laisse un sillon propre derrière
  // lui : c'est le seul animal du jeu qui NETTOIE.
  // Un nuage toutes les deux secondes et par concombre, ça ne racontait rien :
  // ça faisait du sable (385 scènes/h/individu, le record du roster). Il laisse
  // maintenant un sillon, pas un chantier.
  concombre(e, dt, t) {
    if (Math.random() < dt * 0.12) Particles.sandCloud(e.x - e.size, e.y + e.size * 0.3);
    if (Math.random() < dt * 0.008) e.emote('disgust', 1.8, false);
  },

  // LA RASCASSE NE BOUGE PAS. Elle est déjà `fixed` et `piquant` : le gag,
  // c'est qu'elle se fait passer pour un caillou — jusqu'au jaillissement.
  rascasse(e, dt, t) {
    e._camoufle = e.state === 'strike' ? 0 : U.lerp(e._camoufle ?? 1, 1, Math.min(1, dt * 2));
    if (e.state === 'strike' && !e._surprise) {
      e._surprise = true;
      e.emote('angry', 1.6, false);
      Particles.burst(e.x, e.y, '#ffb0b0', 6);
    }
    if (e.state !== 'strike') e._surprise = false;
  },

  // LE BARRACUDA FAIT EXPLOSER LES BALLONS. Il fonce droit sur un Fugu gonflé —
  // et le fugu éclate. C'est le seul à pouvoir le manger sans se piquer.
  barracuda(e, dt, t) {
    if (e.state !== 'hunt' || !e.target || e.target.speciesId !== 'fugu') return;
    const p = e.target;
    if (U.dist2(e.x, e.y, p.x, p.y) > (e.size + p.size) ** 2) return;
    if (p.dead) return;
    // BOUM : le ballon crève. Le barracuda ne prend pas le malaise (perceBallon).
    Particles.boom(p.x, p.y, p.size * 2);
    Particles.burst(p.x, p.y, '#ffe08a', 12);
    e.emote('smug', 2);
    p.dead = true;
    e._chew = 0.55; e._chewPrey = p.def;
    e.hunger = Math.max(0, e.hunger - 0.45);
    e.wellFed = Math.min(1.6, e.wellFed + 0.55);
    e.target = null; e.state = 'wander';
  },
};
