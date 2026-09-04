// Gags et mises en scène comiques, un par espèce (GDD §8, §11, §12).
// Séparés de species.js pour que les fiches restent des DONNÉES lisibles.
//
// Chaque entrée est appelée à chaque frame depuis Entity.think via `def.gag`.
// Voir EMOTIONS.md pour la table action → émotion, et le mode d'emploi d'une
// scène (phases, `_freeze`, `_faceAt`, une seule bulle).
const GAGS = {
  // Elle porte son nom : chapelet de bulles permanent, et gros glouglou joyeux
  bulle_fofolle(e, dt, t) {
    if (Math.random() < dt * 3.5) Particles.bubble(e.x + e.size * 0.7, e.y, U.rand(2, 5));
    e._blubCd = (e._blubCd ?? U.rand(4, 10)) - dt;
    if (e._blubCd <= 0) {
      e._blubCd = U.rand(5, 12);
      for (let i = 0; i < 8; i++) Particles.bubble(e.x + e.size * 0.8, e.y + U.rand(-6, 6), U.rand(3, 8));
      e.emote('happy', 1.8);
    }
  },

  // Sa boule disco : il plante ses pinces, s'arrête net et DANSE sur place.
  crabe(e, dt, t) {
    e._discoCd = (e._discoCd ?? U.rand(6, 16)) - dt;
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
    if (Math.random() < dt * 2.5) Particles.sparkles(e.x, e.y - e.size * 1.4, 2);
    if (e._dancing <= 0) { e._dancing = 0; e._disco = false; e._discoCd = U.rand(12, 26); }
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
    e._kissCd = (e._kissCd ?? U.rand(4, 12)) - dt;

    const c = e._tickleTarget;
    if (c && (c.dead || U.dist2(e.x, e.y, c.x, c.y) > 520 * 520)) { e._tickleTarget = null; e._faceAt = null; }

    if (!e._tickleTarget) {
      if (e._kissCd > 0) return;
      let best = null, bestSize = 24;
      for (const o of Ecosystem.neighbors(e.x, e.y)) {
        if (o === e || o.dead || o.stage === 'egg') continue;
        if (SPECIES[o.speciesId].refuge || o.speciesId === 'clown') continue;
        if (SPECIES[o.speciesId].movement === 'fixed') continue;   // pas les murènes dans leur trou
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
      e._kissCd = U.rand(10, 22);
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
    e._farceCd = (e._farceCd ?? U.rand(8, 20)) - dt;
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
    if (!c || c.dead) { e._farcePh = null; e._farceCd = U.rand(8, 20); return; }
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
      e._farceCd = U.rand(14, 30);
    }
  },

  // et mastication — sans ça on ne la voyait jamais manger.
  raie(e, dt, t) {
    const [mx, my] = Camera.toWorld(Input.mx, Input.my);
    if (U.dist2(e.x, e.y, mx, my) < 100 * 100 && Input.mouseSpeed < 80 && Math.random() < dt * 1.5) {
      Particles.comic(e.x, e.y - e.size, '♪');       // ronronnement
    }
    const fy = World.floorY(e.x);
    e._digCd = (e._digCd ?? U.rand(3, 9)) - dt;
    if (e._digCd <= 0) {
      e._digCd = U.rand(6, 14);
      e._diveTargetY = fy - e.size * 0.5;                // elle descend fouiller
      Particles.sandCloud(e.x, fy - 4, true);
      Particles.burst(e.x, fy - 10, '#d9c092', 5);
      e.emote('eating', 2.4);
      e.hunger = Math.max(0, e.hunger - 0.25);           // les vers de sable la nourrissent
      e.wellFed += 0.18;
    } else if (e._digCd < 11) {
      e._diveTargetY = null;
    }
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
    if (g > 0.25 && Math.random() < dt * g * 5) {
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
    if (cd < 1.2 && Math.random() < dt * (1.2 - cd) * 9) {
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
    e._perleCd = (e._perleCd ?? U.rand(8, 40)) - dt;
    if (e._perleCd > 0) { if (e._perle > 0) e._perle = Math.max(0, e._perle - dt * 0.7); return; }
    if (!e._perle) {
      e._perle = 1;
      e.emote('proud', 3);
      Particles.sparkles(e.x, e.y - e.size * 0.8, 6);
    }
    e._perleCd = U.rand(25, 60);
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
  poisson_lune(e, dt, t) {
    if (e.state === 'sleep') {
      e.vy += 26 * dt;                          // il coule
      const sol = World.floorY(e.x) - e.size * 0.6;
      if (e.y >= sol) {
        e.y = sol;
        e.state = 'wander'; e.stateTimer = 6;
        e.emote('surprise', 2.4);
        Particles.sandCloud(e.x, sol + e.size * 0.4, true);
        Particles.comic(e.x, e.y - e.size, '❗');
      }
    }
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
    if (e !== chef) return;

    if (e._figT > 0) {
      e._figT -= dt;
      const k = 1 - Math.abs(e._figT / 2.6 - 0.5) * 2;   // 0 → 1 → 0
      const R = 120 + membres.length * 2;
      membres.forEach((m, i) => {
        const u = i / membres.length;
        const p = GAGS._figure(e._figure, u, R);
        m._figX = e.x + p.x * k; m._figY = e.y + p.y * k;
      });
      if (e._figT <= 0) {
        // La gêne se lit sur le visage de TOUS, mais la goutte de sueur ne
        // sort que sur quelques-uns : un banc de 40 confettis en faisait 40
        // d'un coup (125 gouttes/min à lui seul).
        for (const m of membres) { m._figX = null; m._figY = null; m.emote('blush', 1.6, Math.random() < 0.12); }
      }
      return;
    }
    e._figCd = (e._figCd ?? U.rand(20, 50)) - dt;
    if (e._figCd > 0) return;
    e._figCd = U.rand(45, 100);
    e._figT = 2.6;
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
      e.x = e._monte.x; e.y = e._monte.y - e._monte.size * 0.7;
      if (Math.random() < dt * 0.5) e.emote('happy', 1.5, false);
      if (e._ventouseT <= 0) {
        e._monte = null;
        e.emote('surprise', 1.5);
      }
      return;
    }
    e._monte = null;
    e._ventouseCd = (e._ventouseCd ?? U.rand(15, 45)) - dt;
    if (e._ventouseCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.movement === 'fixed' || o.def.size < 16) continue;
      if (U.dist2(e.x, e.y, o.x, o.y) > 90 * 90) continue;
      e._monte = o; e._ventouseT = U.rand(6, 14);
      e._ventouseCd = U.rand(40, 90);
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
    e._calinCd = (e._calinCd ?? U.rand(20, 50)) - dt;
    if (e._calinCd > 0) return;
    for (const o of Ecosystem.neighbors(e.x, e.y)) {
      if (o === e || o.dead || o.def.movement === 'fixed') continue;
      if (o.speedNow < 12) continue;                  // ceux qui PASSENT
      if (U.dist2(e.x, e.y, o.x, o.y) > 80 * 80) continue;
      e._calinCd = U.rand(35, 70);
      e.emote('happy', 2.2);
      o.emote('blush', 1.8);
      return;
    }
    e._calinCd = 3;
  },

  // LE REQUIN PERD SES DENTS EN MANGEANT. Édenté, il ne peut plus attraper
  // personne — il doit attendre qu'elles repoussent. GARDE-FOU : la repousse
  // est automatique et bornée dans le temps, sinon il meurt de faim, exactement
  // comme la murène quand deux modes d'échec se cumulaient.
  requin(e, dt, t) {
    if (e._edente > 0) {
      e._edente -= dt;
      if (Math.random() < dt * 0.35) e.emote('sad', 1.8, false);
      if (e._edente <= 0) {
        e.emote('happy', 2);
        Particles.sparkles(e.x + e.size * 0.6, e.y, 4);
      }
      return;
    }
    // Il vient de croquer : une dent se décroche et tombe.
    if (e._chew > 0 && !e._dentTombee) {
      e._dentTombee = true;
      if (Math.random() < 0.55) {
        e._edente = U.rand(12, 22);
        Particles.comic(e.x + e.size * 0.5, e.y, '🦷');
        e.emote('surprise', 2);
      }
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
};
