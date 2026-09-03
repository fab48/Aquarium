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

};
