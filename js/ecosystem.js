// Gestion de la population : spawn initial, groupes/bancs, prédation,
// ponte, caps de population par zone (GDD §6, §7, §9, §14).

const Ecosystem = {
  entities: [],
  groups: {},      // groupId -> [entities]
  nextGroupId: 1,

  init() {
    // chaque fiche connaît son identifiant (évite les recherches inverses)
    for (const k in SPECIES) SPECIES[k].id = k;

    // Spawn initial : chaque espèce dans sa bande de profondeur, réparti
    // là où la colonne d'eau est assez profonde.
    // Les anémones sont semées EN PREMIER : les espèces ancrées (clown, hippocampe)
    // et la ponte (Ecosystem.layEgg) ont besoin qu'elles existent déjà.
    this.spawnGroups('anemone', 9);   // récifs répartis sur toute la zone claire

    this.spawnGroups('coquillage', 3);
    this.spawnGroups('etoile', 4);
    this.spawnGroups('crabe', 3);
    this.spawnGroups('confetti', 3);   // 2-3 GROS bancs plutot que des poignees
    this.spawnGroups('bulle_fofolle', 5);
    this.spawnGroups('volant', 5);
    this.spawnGroups('meduse', 7);
    this.spawnGroups('clown', 3);
    this.spawnGroups('hippocampe', 3);
    this.spawnGroups('perroquet', 5);
    this.spawnGroups('poisson_lune', 3);
    this.spawnGroups('lanterne', 6);
    this.spawnGroups('thon', 6);
    this.spawnGroups('raie', 3);
    this.spawnGroups('poulpe', 4);
    this.spawnGroups('murene', 3);   // groupes de 1, tres espacees : chacune son rocher
    this.spawnGroups('poisson_tapis', 3);
    // Les grands fonds : sans eux la zone abyssale n'est qu'un decor noir.
    // La crevette d'abord (base de la chaine), puis ce qui la mange.
    this.spawnGroups('crevette', 7);
    this.spawnGroups('calamar', 4);
    this.spawnGroups('calamar_geant', 2);
    this.spawnGroups('moustachu', 3);
    this.spawnGroups('dauphin', 2);
    this.spawnGroups('requin', 3);
    this.spawnGroups('orque', 1);
    // Les très gros restent rares, mais il en faut au moins deux : un individu
    // seul ne peut pas se reproduire et sa lignée s'éteint.
    this.spawnGroups('gros_dodo', 2);
    this.spawnGroups('cachalot', 2);

  },


  spawnGroups(speciesId, count) {
    const def = SPECIES[speciesId];
    for (let g = 0; g < count; g++) {
      const n = U.randInt(def.groupSize[0], def.groupSize[1]);
      const bottomDweller = ['shell', 'star', 'anemone', 'eel', 'worm', 'crab'].includes(def.render);
      let x, y;
      // Espèces ancrées à une anémone : on répartit les groupes sur des refuges
      // DIFFÉRENTS (le moins peuplé d'un tirage), sinon tout le monde s'installe
      // sur la même anémone et s'y entasse.
      const refuge = def.anchorToRefuge ? this.leastCrowdedRefuge() : null;
      if (refuge) { x = refuge.x; y = refuge.y; }
      else {
        // Trouver un x où la bande de profondeur existe. Les espèces posées au
        // fond exigent en plus que le FOND lui-même soit dans leur bande (une
        // anémone d'eau claire ne doit pas se retrouver au fond des abysses).
        if (bottomDweller) {
          // Colonnes dont le FOND est dans la bande de l'espèce, puis répartition
          // RÉGULIÈRE des groupes sur toute la plage valide : un tirage au sort
          // les regroupe par hasard et crée des grappes (récifs entassés).
          const valid = [];
          for (let cx = World.shoreX; cx < CONFIG.WORLD_WIDTH - 100; cx += 120) {
            const d = World.depthAt(cx);
            if (d >= def.depthBand[0] && d <= def.depthBand[1]) valid.push(cx);
          }
          // Les créatures à plat (ver-tapis) cherchent un replat : sur une forte
          // pente elles paraissent posées de travers.
          let pool = valid;
          if (def.flatGround) {
            const flat = valid.filter(cx => Math.abs(World.slopeAt(cx)) < 0.18);
            if (flat.length) pool = flat;
          }
          // Habitat préféré : les étoiles se posent sur les rochers, les
          // hippocampes s'accrochent dans les herbiers (GDD §12).
          if (def.habitat) {
            const spots = Background.habitatSpots(def.habitat)
              .filter(hx => { const d = World.depthAt(hx); return d >= def.depthBand[0] && d <= def.depthBand[1]; });
            if (spots.length) pool = spots;
          }
          // Espacement general du fond : on evite les colonnes deja occupees par
          // un autre habitant fixe. Sans ca les etoiles se posaient sur les
          // anemones et jusque dans le trou des murenes.
          if (!def.territory && pool.length) {
            const occupe = this.entities.filter(o => !o.dead
              && (SPECIES[o.speciesId].movement === 'fixed' || SPECIES[o.speciesId].refuge));
            const marge = 90 + def.size * 2;
            const libres = pool.filter(cx => occupe.every(o => Math.abs(o.x - cx) >= marge));
            if (libres.length) pool = libres;
          }
          if (def.territory && pool.length) {
            // Territoire exclusif (murène : un rocher = une murène, GDD §12).
            // On vise une répartition RÉGULIÈRE sur toute la bande, puis on
            // décale jusqu'à trouver une place assez loin des voisins gênants.
            // (Un placement « point le plus éloigné » les tassait toutes à
            // l'extrémité profonde, hors de portée de leurs proies.)
            // Deux distances : très large entre congénères (un rocher = une
            // murène), plus courte vis-à-vis du reste du décor vivant. Exiger
            // le grand écart pour tout le monde les bannissait vers les abysses,
            // hors de portée de leurs proies.
            const memes = this.entities.filter(o => !o.dead && o.speciesId === speciesId);
            const autres = this.entities.filter(o => !o.dead && o.speciesId !== speciesId
              && SPECIES[o.speciesId].movement === 'fixed');
            const libre = cx => memes.every(o => Math.abs(o.x - cx) >= def.territory)
                             && autres.every(o => Math.abs(o.x - cx) >= 150);
            const ideal = count > 1 ? g / (count - 1) : 0.5;
            const i0 = Math.round(ideal * (pool.length - 1));
            let trouve = null;
            for (let k = 0; k < pool.length && trouve === null; k++) {  // spirale autour de l'idéal
              const a = pool[i0 + k], b = pool[i0 - k];
              if (a !== undefined && libre(a)) trouve = a;
              else if (b !== undefined && libre(b)) trouve = b;
            }
            if (trouve === null) {
              // Littoral trop court pour loger un territoire de plus : on prend
              // au moins la place la plus éloignée des congénères.
              let bestD = -1;
              for (const cx of pool) {
                let d = Infinity;
                for (const o of memes) d = Math.min(d, Math.abs(o.x - cx));
                if (d > bestD) { bestD = d; trouve = cx; }
              }
            }
            x = trouve + U.rand(-25, 25);
          } else if (pool.length) {
            const f = count > 1 ? g / (count - 1) : 0.5;
            x = pool[U.clamp(Math.round(f * (pool.length - 1)), 0, pool.length - 1)] + U.rand(-60, 60);
          } else {
            x = U.rand(World.shoreX, CONFIG.WORLD_WIDTH - 200);
          }
        } else {
          // Répartition RÉGULIÈRE des groupes sur toute la largeur exploitable :
          // un tirage au sort laisse de grands vides en pleine mer et entasse
          // tout près du rivage.
          let valid = [];
          // `offshore` : espèce tenue au large (petits nageurs de surface que le
          // haut-fond piège contre la plage). Sans ce filtre, le premier groupe
          // de la répartition régulière atterrissait dans le ressac.
          const colonneMin = Math.max(def.depthBand[0] + 80, def.offshore ?? 0);
          for (let cx = World.shoreX + 200; cx < CONFIG.WORLD_WIDTH - 200; cx += 200) {
            if (World.depthAt(cx) >= colonneMin) valid.push(cx);
          }
          // Habitat préféré (hippocampes dans les herbiers, GDD §12)
          if (def.habitat) {
            const spots = Background.habitatSpots(def.habitat)
              .filter(hx => { const d = World.depthAt(hx); return d >= def.depthBand[0] && d <= def.depthBand[1]; });
            if (spots.length) valid = spots;
          }
          if (valid.length) {
            const f = count > 1 ? (g + U.rand(-0.25, 0.25)) / (count - 1) : Math.random();
            x = valid[U.clamp(Math.round(f * (valid.length - 1)), 0, valid.length - 1)] + U.rand(-90, 90);
          } else {
            // Assez d'eau sous la quille POUR NAGER : près du rivage la colonne
            // fait quelques dizaines de pixels, et un banc qui y apparaît se
            // retrouve coincé entre la surface et le sable — les confettis
            // finissaient projetés sur la plage dès le premier instant.
            const besoin = Math.max(def.depthBand[0] + def.size * 6, def.offshore ?? 0);
            let essai = 0;
            do {
              x = U.rand(World.shoreX + 200, CONFIG.WORLD_WIDTH - 200);
            } while (World.depthAt(x) < besoin && ++essai < 30);
          }
        }
        const yMin = CONFIG.SURFACE_Y + def.depthBand[0];
        const yMax = Math.min(CONFIG.SURFACE_Y + def.depthBand[1], World.floorY(x) - def.size);
        y = U.rand(yMin, Math.max(yMin + 1, yMax));
      }
      const groupId = this.nextGroupId++;
      for (let i = 0; i < n; i++) {
        // Espèces fixes : étalées en rang le long du fond (elles ne pourront
        // plus se repousser ensuite), les autres en nuage autour du point.
        // Les espèces territoriales s'espacent VRAIMENT (leur caverne est large)
        const ecart = def.territory ? def.territory * U.rand(1, 1.5) : def.size * U.rand(2.6, 3.6);
        // QUINCONCE : trois rangees dans la bande de sable, decalees d'une
        // demi-case en x. Un rang unique alignait tout le monde sur la meme
        // diagonale — c'est ce qui donnait ces files d'etoiles et d'hippocampes.
        const rang = i % 3;
        let sx = bottomDweller
          ? x + (i - (n - 1) / 2) * ecart + (rang % 2) * ecart * 0.5
          : x + U.rand(-80, 80);
        // Jamais sur le sable sec : la dispersion en rang peut sortir de l'eau
        if (bottomDweller || def.movement === 'crawl') sx = Math.max(sx, World.shoreX + 90);
        // Nageurs de pleine eau : contrôle sur la position FINALE. Choisir une
        // bonne colonne pour le groupe ne suffit pas — les ±90 px du groupe
        // plus les ±80 px de l'individu le ramenaient sur le haut-fond, où le
        // banc, coincé entre la surface et le sable, se faisait éjecter sur la
        // plage. On le repousse au large jusqu'à avoir de quoi nager.
        if (!bottomDweller && def.movement !== 'crawl' && !def.aerial) {
          const besoin = Math.max(def.depthBand[0] + def.size * 8, def.offshore ?? 0);
          let garde = 0;
          while (World.depthAt(sx) < besoin && sx < CONFIG.WORLD_WIDTH - 200 && garde++ < 80) sx += 100;
        }
        // Puis on l'ecarte individuellement des voisins fixes : filtrer la
        // colonne ne suffit pas, la dispersion en rang y ramene des individus.
        if (bottomDweller && !def.territory) {
          // On BORNE D'ABORD, puis on cherche une place libre à l'intérieur des
          // bornes : recadrer après le décalage ramenait tout le monde contre le
          // rivage, où les espèces se retrouvaient superposées.
          const xMin = World.shoreX + 90, xMax = CONFIG.WORLD_WIDTH - 120;
          // Recadrage EN RANG : un simple clamp collapsait tous les membres qui
          // dépassaient sur la même borne, et ils s'empilaient exactement au
          // même x. Chacun rentre à sa propre distance du bord.
          if (sx < xMin) sx = xMin + i * ecart * 0.8;
          else if (sx > xMax) sx = xMax - i * ecart * 0.8;
          const marge = 70 + def.size * 1.5;
          const occupe = this.entities.filter(o => !o.dead && o.speciesId !== speciesId
            && (SPECIES[o.speciesId].movement === 'fixed' || SPECIES[o.speciesId].refuge));
          const libre = px => px >= xMin && px <= xMax
            && occupe.every(o => Math.abs(o.x - px) >= marge)
            && World.depthAt(px) >= def.depthBand[0] && World.depthAt(px) <= def.depthBand[1];
          if (!libre(sx)) {
            let trouve = null;
            for (let d = marge * 0.5; d < 1400 && trouve === null; d += marge * 0.35) {
              if (libre(sx + d)) trouve = sx + d;
              else if (libre(sx - d)) trouve = sx - d;
            }
            // Un petit décalage final : la recherche en spirale part du même
            // pas pour tous, donc plusieurs individus atterrissaient EXACTEMENT
            // sur le même x et s'empilaient à la verticale.
            if (trouve !== null) sx = trouve + U.rand(-marge * 0.28, marge * 0.28);
          }
        }
        const e = new Entity(speciesId, sx, y + U.rand(-50, 50), { groupId });
        // Les espèces de fond se posent sur le sable dès le départ (sinon on les
        // voit flotter en pleine eau le temps qu'elles descendent).
        // Étalées sur les DEUX PREMIÈRES BANDES du modelé du sable plutôt que
        // toutes alignées sur la ligne de contour : le fond a de la largeur,
        // autant l'occuper. (La murène garde sa ligne : son rocher en dépend.)
        const bande = def.render === 'eel' ? 0
          : U.clamp((rang + U.rand(-0.28, 0.28)) / 2.6 * SABLE_BANDE, 0, SABLE_BANDE);
        e._sable = bande;
        if (['shell', 'star', 'anemone', 'eel', 'worm'].includes(def.render)) {
          e.y = World.floorY(e.x) - def.size * 0.4 + bande;
        } else if (def.movement === 'crawl') {
          e.y = World.floorY(e.x) - def.size * 0.6 + bande;
        }
        if (def.movement === 'fixed' || def.movement === 'anchored') {
          e.anchorX = e.x; e.anchorY = e.y;
        }
        this.entities.push(e);
        this.counts[speciesId] = (this.counts[speciesId] || 0) + 1;
      }
    }
  },

  // Toutes les anémones vivantes
  refuges() { return this.entities.filter(e => !e.dead && SPECIES[e.speciesId].refuge); },

  // --- Frayères (GDD §7) ------------------------------------------------------
  // Chaque espèce se reproduit dans une zone dédiée, souvent LOIN de son habitat
  // quotidien. Ça donne des migrations visibles, ça rassemble les partenaires
  // (crucial pour les espèces rares) et ça évite que tous les alevins du monde
  // s'entassent sur les mêmes anémones.
  nurseryPoint(e) {
    const def = e.def;
    // Seules les nageuses rapides et mobiles migrent. Une méduse qui dérive à
    // 12 px/s n'atteindrait jamais une frayère lointaine et cesserait de se
    // reproduire : les lentes fraient sur place.
    if (def.speed < 45 || ['drift', 'anchored', 'crawl', 'fixed'].includes(def.movement)) return null;
    const kind = def.nursery || (def.depthBand[1] > 1700 ? 'deep' : 'reef');
    if (kind === 'reef') {
      // Chaque individu a SA frayère attitrée (répartie par identifiant) : sinon
      // tout le monde converge vers la même anémone et s'y entasse.
      const list = this.refuges();
      if (!list.length) return null;
      const r = list[e.id % list.length];
      return { x: r.x, y: r.y - 40, kind };
    }
    if (kind === 'shallow') {
      // Nurseries de pleine eau : SIX sites répartis sur toute la largeur du
      // monde, dans la couche éclairée. Un site unique près du rivage attirait
      // toutes les espèces pélagiques au même endroit et vidait le large.
      const span = CONFIG.WORLD_WIDTH - World.shoreX - 900;
      // Les colosses fraient plus au large : un haut-fond où ils s'échoueraient
      // n'est pas une frayère viable pour eux.
      let start = World.shoreX + (def.size >= 70 ? 1800 : 500);
      // Idem pour une espèce tenue au large (`offshore`) : sa frayère tombait de
      // l'autre côté de sa propre barrière, et le banc migrait pour venir s'y
      // écraser — exactement l'entassement contre la plage qu'on veut éviter.
      if (def.offshore) {
        while (start < CONFIG.WORLD_WIDTH * 0.5 && World.depthAt(start) < def.offshore) start += 150;
      }
      const x = start + (e.id % 6) * (span / 6);
      const y = CONFIG.SURFACE_Y
        + U.clamp(World.depthAt(x) * 0.35, def.size * 2.2, 400);
      return { x: Math.min(x, CONFIG.WORLD_WIDTH - 400), y, kind };
    }
    // 'deep' : autour des sources chaudes
    const x = 5200 + (e.id % 6) * 380;
    return { x, y: World.floorY(x) - 120, kind };
  },

  // Refuge le moins habité : évite que tous les clowns et hippocampes
  // s'installent sur la même anémone.
  leastCrowdedRefuge() {
    const list = this.refuges();
    if (!list.length) return null;
    let best = null, bestN = Infinity;
    for (const r of list) {
      let n = 0;
      for (const e of this.entities) {
        if (e.dead || e === r) continue;
        if (U.dist2(e.x, e.y, r.x, r.y) < 200 * 200) n++;
      }
      if (n < bestN) { bestN = n; best = r; }
    }
    return best;
  },

  // Anémone la plus proche (refuge, GDD §9) — ponte, alevins, ancrage clown/hippocampe
  nearestRefuge(x, y) {
    let best = null, bestD = Infinity;
    for (const e of this.entities) {
      if (e.dead || !SPECIES[e.speciesId].refuge) continue;
      const d = U.dist2(x, y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  },

  isNearRefuge(x, y, range = 60) {
    const r = this.nearestRefuge(x, y);
    return !!r && U.dist2(x, y, r.x, r.y) < range * range;
  },

  // Camarades de banc : servi par l'index construit chaque frame, jamais par un
  // balayage de toutes les entités (les boids tournent à chaque frame).
  groupMates(e) {
    return this.byGroup[e.groupId] || [];
  },

  // Servi par l'index reconstruit à chaque buildGrid — balayer les ~490
  // entités à chaque ponte était du gâchis. Les pushes en cours de frame
  // (spawnGroups, layEgg) incrémentent counts eux-mêmes pour que les plafonds
  // de population restent exacts à l'intérieur d'une même frame.
  countSpecies(speciesId) {
    return this.counts[speciesId] || 0;
  },

  // Proie la plus proche pour un prédateur (à portée de détection).
  // Le monde fait 8000 px de large : avec une portée trop courte, les chasseurs
  // errent sans jamais croiser de proie et meurent de faim.
  nearestPreyFor(pred) {
    const def = pred.def;
    // `ambush.range` est la distance de JAILLISSEMENT, pas celle de détection.
    // Un embusqué mobile (Poisson-Tapis) doit repérer bien plus loin que son
    // coup de mâchoire, sinon il ne sait pas vers quoi ramper.
    const r = def.senseRange ?? (def.ambush ? def.ambush.range : 1600);
    // Ne viser que des proies ATTEIGNABLES : sinon le prédateur poursuit une
    // proie hors de sa bande de profondeur, se fait rappeler par sa contrainte
    // verticale, et meurt de faim sans avoir jamais rien attrapé.
    const M = 260;   // marge : il peut sortir un peu de sa bande pour foncer
    const yMin = def.aerial ? -Infinity : CONFIG.SURFACE_Y + def.depthBand[0] - M;
    const yMax = def.aerial ? Infinity : CONFIG.SURFACE_Y + def.depthBand[1] + M;
    // Espèces devenues trop rares : on les laisse tranquilles le temps qu'elles
    // remontent (report de prédation, cf. refugeFloor).
    const huntable = def.prey.filter(p => (this.counts[p] || 0) > this.refugeFloor(p));
    if (!huntable.length) return null;

    // Report sur l'espèce ABONDANTE : une proie qui prolifère (parce que le
    // joueur la nourrit, par exemple) attire les prédateurs, ce qui ramène la
    // population à l'équilibre sans intervention. C'est la boucle du GDD §9.
    const attrait = {};
    for (const p of huntable) {
      const ratio = (this.counts[p] || 0) / Math.max(1, this.baseCap(SPECIES[p]));
      attrait[p] = 0.45 + Math.min(2, ratio);
    }
    let best = null, bestScore = Infinity;
    const r2 = r * r;
    for (const p of huntable) {
      const a = attrait[p];
      for (const e of this.bySpecies[p] || []) {
        if (e.dead) continue;
        if (e.y < yMin || e.y > yMax) continue;
        const d = U.dist2(pred.x, pred.y, e.x, e.y);
        if (d > r2) continue;
        const score = d / a;           // les proies abondantes « paraissent » plus proches
        if (score < bestScore) { bestScore = score; best = e; }
      }
    }
    return best;
  },

  // Toutes les proies d'un prédateur dans un rayon donné (pas seulement la plus
  // proche) : le leurre du Poisson-lanterne hypnotise TOUT ce qui traîne autour
  // de sa lampe. Balaie les listes par espèce, jamais toutes les entités — mais
  // reste assez cher pour n'être appelé que quelques fois par seconde
  // (cf. `_lureCd` dans Entity.pecheALaLampe).
  preyWithin(pred, range) {
    const out = [];
    if (!pred.def.prey) return out;
    const r2 = range * range;
    for (const p of pred.def.prey) {
      // Espèce devenue rare : on la laisse tranquille (report de prédation).
      if ((this.counts[p] || 0) <= this.refugeFloor(p)) continue;
      for (const e of this.bySpecies[p] || []) {
        if (e.dead || e.stage === 'egg') continue;
        if (U.dist2(pred.x, pred.y, e.x, e.y) < r2) out.push(e);
      }
    }
    return out;
  },

  // Partenaire le plus proche : même espèce, adulte, lui aussi prêt (GDD §7).
  // Sans ça, les espèces rares (orque, cachalot, thon, lanterne…) ne se croisent
  // jamais dans un monde de 8000 px et s'éteignent de vieillesse.
  nearestMateFor(e) {
    let best = null, bestD = 3000 * 3000;
    for (const o of this.bySpecies[e.speciesId] || []) {
      if (o === e || o.dead) continue;
      if (o.stage !== 'adult' || o.wellFed < 1 || (o._mateCd ?? 0) > 0) continue;
      const d = U.dist2(e.x, e.y, o.x, o.y);
      if (d < bestD) { bestD = d; best = o; }
    }
    return best;
  },

  // Distance à laquelle une proie repère un prédateur LANCÉ sur elle.
  // Elle valait 180 px pour tout le monde : une orque de 70 px qui charge à
  // 340 px/s avalait cet écart en une demi-seconde, et un Cachalot lancé sur un
  // Calamar Géant entrait en contact (178 px, les deux corps réunis) AVANT même
  // le seuil d'alerte — la proie ne pouvait littéralement pas avoir peur. Elle
  // suit donc le gabarit ET l'allure du chasseur.
  // Exception : un EMBUSQUÉ est une surprise par construction. Il ne s'annonce
  // qu'une fois la gueule quasiment dessus — assez pour qu'on voie la victime
  // sursauter et détaler, pas assez pour lui retirer son repas.
  alerteDe(p) {
    if (p.def.ambush) return 40 + p.size * 2.2;
    const allure = p.def.sprintSpeed || p.def.speed * 1.8;
    return Math.max(180, 100 + p.size * 1.6 + allure * 0.25);
  },

  // Prédateur menaçant le plus proche (pour la fuite). Balaie la liste des
  // chasseurs en action, pas le voisinage : la grille plafonne à ~195 px.
  nearestPredatorOf(e) {
    for (const p of this.chasseurs) {
      if (p === e || p.dead) continue;
      if (!p.def.prey.includes(e.speciesId)) continue;
      const r = this.alerteDe(p);
      if (U.dist2(e.x, e.y, p.x, p.y) < r * r) return p;
    }
    return null;
  },

  eat(pred, prey) {
    if (pred.def.filterFeeder) {
      // Le Gros Dodo filtre : la proie est "avalée" sans violence visuelle
      pred.setExpression('eating', 2);
      Particles.bubble(pred.x + pred.size, pred.y);
    } else {
      pred.emote('eating', 2.2);
      // GROSSE lecture de la prise : nuage d'impact, écailles qui volent, éclair
      Particles.chomp(prey.x, prey.y, prey.size, prey.color);
      // Le prédateur MARQUE UN TEMPS et mâche, la queue de la proie qui dépasse
      // de sa bouche : sans cette pause, la prise passait inaperçue.
      pred._chew = 0.55;
      pred._chewPrey = { color: prey.color, size: prey.size, tail: prey.def.tail || 'fan' };
    }
    for (let i = 0; i < 5; i++) Particles.bubble(prey.x, prey.y);
    // les témoins réagissent : on comprend qu'il vient de se passer quelque chose
    for (const o of this.neighbors(prey.x, prey.y)) {
      if (o === pred || o.dead || o.stage === 'egg') continue;
      if (U.dist2(prey.x, prey.y, o.x, o.y) < 150 * 150 && o.def.trophic !== 4) {
        o.emote('scared', 1.6);
        o.state = 'flee'; o.target = pred; o.stateTimer = 1.4;
      }
    }
    pred.hunger = Math.max(0, pred.hunger - 0.45);
    pred.wellFed += 0.55;   // 2 prises suffisent : les prédateurs sont peu nombreux
    // Une proie, ça nourrit : il grossit un peu, et ça finira par ressortir.
    if (pred.peutGonfler()) pred.growth += 0.07;
    pred.digestion();
    prey.dead = true; // mangée : pas d'arête (avalée)
  },

  // Plafond de population d'une espèce (surchargeable par def.popCap)
  // Plafonds volontairement modestes : le GDD (§14) prévient du risque de
  // surcharge visuelle et de perf si le niveau 2 prolifère.
  baseCap(def) {
    if (def.popCap != null) return def.popCap;
    if (def.refuge) return 12;
    if (def.trophic === 'scavenger') return 20;
    return { 1: 22, 2: def.schooling ? 55 : 26, 3: 14, 4: 8 }[def.trophic] ?? 16;
  },

  // --- Boom démographique provoqué par le joueur (GDD §9) ---------------------
  // Nourrir une espèce fait grimper son plafond bien au-dessus de la normale :
  // on peut donc délibérément faire proliférer une espèce et déséquilibrer
  // l'aquarium. Les prédateurs se reportent alors sur elle (cf. nearestPreyFor),
  // ce qui finit par tout ramener à l'équilibre — sans jamais punir le joueur.
  boom: {},

  // Plafond du boom : au mieux le DOUBLE de la population normale. Au-delà,
  // l'écran devient illisible et les perfs souffrent (GDD §14).
  feedBoost(speciesId, amount) {
    this.boom[speciesId] = Math.min(1, (this.boom[speciesId] || 0) + amount);
  },

  popCap(def) {
    return Math.round(this.baseCap(def) * (1 + (this.boom[def.id] || 0)));
  },

  decayBoom(dt) {
    for (const k in this.boom) {
      this.boom[k] -= dt * 0.022;                    // il faut nourrir en CONTINU pour maintenir un boom
      if (this.boom[k] <= 0) delete this.boom[k];
    }
  },

  // Emplacement libre pour une espèce territoriale (assez loin des congénères
  // et du décor vivant), ou null s'il n'y en a plus.
  // Seule contrainte ici : l'écart entre CONGÉNÈRES (« un rocher = une murène »).
  // Exiger en plus de la distance vis-à-vis de tout le décor vivant ne laissait
  // plus aucune place et l'espèce s'éteignait faute de pouvoir pondre.
  freeTerritory(speciesId) {
    const def = SPECIES[speciesId];
    const memes = this.entities.filter(o => !o.dead && o.speciesId === speciesId);
    const libres = [];
    for (let cx = World.shoreX; cx < CONFIG.WORLD_WIDTH - 100; cx += 120) {
      const d = World.depthAt(cx);
      if (d < def.depthBand[0] || d > def.depthBand[1]) continue;
      if (!memes.every(o => Math.abs(o.x - cx) >= def.territory)) continue;
      libres.push(cx);
    }
    return libres.length ? U.pick(libres) + U.rand(-25, 25) : null;
  },

  // Site d'habitat le MOINS peuplé, en écartant ceux qui sont à portée du
  // parent : c'est ce qui envoie la larve « au loin dans le courant » plutôt
  // que de la laisser s'empiler sur le site des parents.
  habitatLibre(parent) {
    const def = parent.def;
    const spots = Background.habitatSpots(def.habitat)
      .filter(hx => { const d = World.depthAt(hx); return d >= def.depthBand[0] && d <= def.depthBand[1]; });
    if (!spots.length) return null;
    const memes = this.bySpecies[parent.speciesId] || [];
    let best = null, bestScore = Infinity, bestOcc = 99;
    for (const hx of spots) {
      let occupants = 0;
      for (const o of memes) if (!o.dead && Math.abs(o.x - hx) < 160) occupants++;
      // pénalise fortement la proximité du parent : l'œuf doit VOYAGER
      const proche = Math.abs(hx - parent.x) < 600 ? 2.5 : 0;
      const score = occupants * 2 + proche + Math.random() * 0.9;
      if (score < bestScore) { bestScore = score; best = hx; bestOcc = occupants; }
    }
    // On ne refuse la ponte QUE si le meilleur site est deja bonde. Un refus
    // base sur le score complet condamnait l'espece : quand tous les herbiers
    // sont a portee du parent, la penalite d'eloignement suffisait a tout
    // bloquer, et les hippocampes tombaient a 2 individus.
    return bestOcc >= 5 ? null : best;
  },

  // Pond un œuf (appelé par Entity.tryMate, une fois par œuf de la portée).
  // ox/oy : lieu de la rencontre du couple, sinon la position du parent.
  layEgg(parent, ox = parent.x, oy = parent.y) {
    // Capacité de charge par espèce (GDD §14) : la pyramide trophique impose
    // beaucoup de petits herbivores et très peu de grands prédateurs.
    if (this.countSpecies(parent.speciesId) >= this.popCap(parent.def)) return;
    const egg = new Entity(parent.speciesId, ox, oy, { stage: 'egg', groupId: parent.groupId });
    egg.stage = 'egg'; egg.growth = 0.2; egg.stateTimer = 0;

    // Espèces territoriales : la larve ESSAIME et s'installe sur un rocher libre.
    // Pondre sur place recréait exactement l'entassement que l'espacement au
    // spawn cherchait à éviter — les murènes s'empilaient de génération en
    // génération.
    if (parent.def.territory) {
      const spot = this.freeTerritory(parent.speciesId);
      if (spot === null) return;                 // plus de rocher libre : pas de ponte
      egg.x = spot;
      egg.y = World.floorY(spot) - parent.def.size * 0.4;
      egg.anchorX = egg.x; egg.anchorY = egg.y;
      this.entities.push(egg);
      this.counts[egg.speciesId] = (this.counts[egg.speciesId] || 0) + 1;
      return;
    }
    // Espèces à HABITAT (hippocampe dans les herbiers, étoile sur les rochers) :
    // pondre sur place les entassait de génération en génération, exactement
    // comme les murènes. L'œuf part DANS LE COURANT, au loin, et s'installe sur
    // un site d'accueil peu peuplé — de préférence à plus de 600 px du parent.
    if (parent.def.habitat) {
      const spot = this.habitatLibre(parent);
      if (spot === null) return;                 // tout est plein : pas de ponte
      egg.x = spot + U.rand(-40, 40);
      egg.y = World.floorY(egg.x) - parent.def.size * 0.4 + sableOffset(egg);
      egg.anchorX = egg.x; egg.anchorY = egg.y;
      // On la voit partir : quelques bulles emportées par le courant
      for (let i = 0; i < 4; i++) Particles.bubble(ox + U.rand(-12, 12), oy + U.rand(-12, 12), U.rand(1.5, 3.5));
      this.entities.push(egg);
      this.counts[egg.speciesId] = (this.counts[egg.speciesId] || 0) + 1;
      return;
    }

    // L'œuf coule vers l'anémone la plus proche (refuge, GDD §9) ; l'alevin y restera
    // ancré (Entity.move) jusqu'à l'âge adulte. Sinon, il coule au fond comme avant.
    // Seules les espèces de récif confient leurs œufs à une anémone. Les autres
    // fraient dans LEUR zone : sans ça, les alevins de tout l'aquarium
    // s'entassaient sur les mêmes anémones.
    const reef = (parent.def.nursery || 'reef') === 'reef';
    const refuge = reef ? this.nearestRefuge(ox, oy) : null;
    if (refuge && U.dist2(ox, oy, refuge.x, refuge.y) < 900 * 900) {
      // Chaque œuf reçoit SA place autour de l'anémone : sans ça, tous les
      // alevins partagent le même point d'ancrage et forment un tas.
      const a = Math.random() * Math.PI * 2, rr = U.rand(20, 75);
      egg.x = refuge.x + Math.cos(a) * rr; egg.y = refuge.y - Math.abs(Math.sin(a)) * rr * 0.6 - 6;
      egg.anchorX = egg.x; egg.anchorY = egg.y; egg._refugeAnchored = true;
    } else {
      egg.y = World.floorY(egg.x) - 8;
    }
    this.entities.push(egg);
    this.counts[egg.speciesId] = (this.counts[egg.speciesId] || 0) + 1;
  },

  // --- Grille spatiale (reconstruite chaque frame) : voisinage O(1) pour la
  // séparation anti-chevauchement et, plus tard, les boids/perf. ---
  GRID: 130,
  grid: new Map(),

  counts: {},

  bySpecies: {},
  byGroup: {},

  buildGrid() {
    this.grid.clear();
    this._nbCache.clear();
    this.counts = {};
    this.bySpecies = {};
    this.byGroup = {};
    // Les colosses sont indexes A PART : la grille fait 130 px et `neighbors`
    // n'en balaie que 3x3, soit ~195 px de portee. Deux baleines doivent rester
    // a 323 px l'une de l'autre — elles ne se VOYAIENT donc jamais et se
    // traversaient sans que l'anti-chevauchement ne se declenche. Ils sont une
    // dizaine : une liste plate suffit largement.
    this.colosses = [];
    // Chasseurs EN ACTION, liste plate dédiée. Même raison que `colosses` : la
    // grille ne porte qu'à ~195 px, très en deçà de la distance à laquelle une
    // proie doit repérer un gros prédateur lancé sur elle. Ils sont une
    // poignée, un balayage complet coûte moins qu'une recherche de voisinage.
    this.chasseurs = [];
    const cs = this.GRID;
    for (const e of this.entities) {
      if (e.dead) continue;
      this.counts[e.speciesId] = (this.counts[e.speciesId] || 0) + 1;
      if (e.stage === 'egg') continue;
      // index par espèce : les recherches de proie/partenaire n'ont plus à
      // balayer TOUTES les entités (c'était le gros du coût de simulation)
      (this.bySpecies[e.speciesId] || (this.bySpecies[e.speciesId] = [])).push(e);
      if (e.def.size >= 70 || e.def.filterFeeder) this.colosses.push(e);
      // `strike` compte autant que `hunt` : le jaillissement d'un embusqué est
      // une attaque, et personne ne réagissait à la murène qui lui saute dessus.
      if (e.def.prey && !e.def.filterFeeder && (e.state === 'hunt' || e.state === 'strike')) {
        this.chasseurs.push(e);
      }
      if (e.groupId != null) (this.byGroup[e.groupId] || (this.byGroup[e.groupId] = [])).push(e);
      const k = ((e.x / cs) | 0) * 100000 + ((e.y / cs) | 0);
      const cell = this.grid.get(k);
      if (cell) cell.push(e); else this.grid.set(k, [e]);
    }
  },

  // Population en dessous de laquelle une espèce n'est plus chassée : c'est le
  // report de prédation (les prédateurs se rabattent sur ce qui est abondant),
  // le mécanisme qui empêche les extinctions en cascade dans un vrai réseau
  // trophique — et qui évite d'avoir à régler chaque espèce à la main.
  refugeFloor(speciesId) {
    return Math.max(4, Math.round(this.popCap(SPECIES[speciesId]) * 0.22));
  },

  // Voisins dans les 9 cellules autour de (x, y).
  // MÉMOÏSÉ PAR CELLULE : le résultat ne dépend que de la cellule, or une même
  // entité l'appelle jusqu'à trois fois par frame et toutes les entités d'une
  // cellule obtiennent la même liste — 459 appels/frame pour ~60 cellules
  // distinctes. Mesuré : −36 % sur la simulation. Le cache est vidé dans
  // buildGrid. Les appelants ne font qu'ITÉRER la liste (et testent .dead) :
  // ne jamais la modifier.
  _nbCache: new Map(),
  neighbors(x, y) {
    const cs = this.GRID, cx = (x / cs) | 0, cy = (y / cs) | 0;
    const key = cx * 100000 + cy;
    const hit = this._nbCache.get(key);
    if (hit) return hit;
    const out = [];
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const cell = this.grid.get((cx + i) * 100000 + (cy + j));
      // boucle indexée : `out.push(...cell)` construisait une liste d'arguments
      // (une allocation) à chaque cellule
      if (cell) for (let k = 0; k < cell.length; k++) out.push(cell[k]);
    }
    this._nbCache.set(key, out);
    return out;
  },

  // Recomposition des bancs : au fil des morts, un gros banc se morcelle en
  // poignees eparses. Les petits groupes rejoignent le plus gros voisin, ce qui
  // maintient 2-3 masses lisibles au lieu d'une poussiere de poissons.
  _regroupTimer: 0,
  regroupeBancs(dt) {
    this._regroupTimer -= dt;
    if (this._regroupTimer > 0) return;
    this._regroupTimer = 6;
    for (const id in SPECIES) {
      if (!SPECIES[id].schooling) continue;
      const membres = this.bySpecies[id] || [];
      if (membres.length < 8) continue;
      const taille = {};
      for (const e of membres) taille[e.groupId] = (taille[e.groupId] || 0) + 1;
      const gros = Object.keys(taille).filter(g => taille[g] >= 6).map(Number);
      if (!gros.length) continue;
      // Centre de chaque banc consequent
      const centre = {};
      for (const g of gros) {
        const m = membres.filter(x => x.groupId === g);
        centre[g] = { x: m.reduce((a, b) => a + b.x, 0) / m.length,
                      y: m.reduce((a, b) => a + b.y, 0) / m.length };
      }
      const PORTEE = 800;   // on ne fusionne QUE de proche en proche
      for (const e of membres) {
        if (taille[e.groupId] >= 6) continue;
        let best = null, bestD = PORTEE * PORTEE;
        for (const g of gros) {
          const d = U.dist2(e.x, e.y, centre[g].x, centre[g].y);
          if (d < bestD) { bestD = d; best = g; }
        }
        if (best !== null) e.groupId = best;
      }
    }
  },

  _immigTimer: 0,

  // Immigration : l'aquarium est une fenêtre sur un océan plus vaste. Une espèce
  // localement éteinte finit par revenir du large (GDD §11 : les grosses espèces
  // sont « présentes en continu, simplement rares »). Filet de sécurité : le
  // joueur ne peut pas perdre définitivement une espèce.
  immigration(dt) {
    this._immigTimer -= dt;
    if (this._immigTimer > 0) return;
    this._immigTimer = 25;
    const gone = Object.keys(SPECIES).filter(id => !(this.counts[id] > 0));
    if (!gone.length) return;
    const id = U.pick(gone);
    this.spawnGroups(id, 1);
    // au moins un couple, sinon la lignée s'éteint aussitôt
    if (this.countSpecies(id) < 2) this.spawnGroups(id, 1);
  },

  update(dt, t) {
    this.buildGrid();
    for (const e of this.entities) if (!e.dead) e.update(dt, t);
    // Compactage SUR PLACE : `filter` reconstruisait un tableau de ~490 entrées
    // à chaque frame, morts ou pas (pression GC, cf. PERFORMANCE.md §2).
    const arr = this.entities;
    let w = 0;
    for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[w++] = arr[i];
    arr.length = w;
    this.regroupeBancs(dt);
    this.decayBoom(dt);
    this.immigration(dt);
  },

  _visibles: [],
  draw(ctx, t) {
    // Pseudo-ordre de profondeur : les gros derriere, ET les creatures de fond
    // triees par leur avancee dans la bande de sable. Sans ce second critere,
    // une etoile « loin » se dessinait par-dessus une etoile « proche » — le
    // decalage se lisait alors comme un bug d'empilement.
    // Tableau persistant réutilisé d'une frame à l'autre (zéro allocation).
    const visible = this._visibles;
    visible.length = 0;
    for (const e of this.entities) if (Camera.isVisible(e.x, e.y, 150)) visible.push(e);
    visible.sort((a, b) => (b.size + (b._sable || 0) * 3) - (a.size + (a._sable || 0) * 3));
    for (const e of visible) e.draw(ctx, t);
  },
};
