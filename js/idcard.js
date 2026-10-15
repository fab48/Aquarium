// Fiche d'identité d'une créature, affichée quand le bouton 🔍 est actif.
// Reprend les champs des fiches du GDD §12 : zone, liberté, niveau trophique,
// nourriture favorite, régime, plus l'état vivant de l'individu (faim, stade).
//
// LA FICHE EST UN PANNEAU DU HUD, SUR LE CÔTÉ — comme les barres de zone et de
// profondeur — et non plus une bulle posée près de la créature. Posée près de
// l'animal elle le masquait, se décalait pour éviter sa voisine, devait être
// agrandie à la main au doigt, et clignotait dès que le poisson bougeait. Un
// panneau HTML ancré à un bord n'a aucun de ces problèmes : le navigateur
// replie le texte, la mise en page ne dépend pas de la créature, et rien n'est
// redessiné tant que rien ne change (cf. `update`).
//
// DE QUI PARLE-T-ELLE ? Une seule fiche à la fois :
//   1. la créature survolée (souris, avec l'hystérésis de `Input.pickAt`) ou
//      ÉPINGLÉE par un tap (au doigt `Input.hovered` EST l'épingle) ;
//   2. à défaut, la créature SUIVIE par la caméra (double-clic, cerceau doré).
// La survolée passe devant la suivie, qui revient d'elle-même dès que le curseur
// la quitte : on n'a pas à lâcher sa créature pour en lire une autre.
// Le sujet est signalé sur le canvas par un cerceau fin (`dessinerCerceau`) —
// doré pour la suivie (c'est le cerceau de la caméra), blanc pour la survolée.

const IdCard = {
  MOVEMENT_LABEL: {
    fixed: 'Fixe (ancré)', anchored: 'Restreint (territoire)', strata: 'Restreint à une strate',
    wideband: 'Libre en largeur', free: 'Libre partout', crawl: 'Rampe sur le fond',
    drift: 'Dérive passive',
  },

  // Rangées, dans l'ordre d'affichage. Les libellés sont fixes : le panneau
  // construit ses <dt> une fois et ne remplace plus que les valeurs.
  ROWS: ['Ici', 'Vit', 'Déplacement', 'Niveau', 'Mange', 'Favori ⭐', 'Mangé par', 'État'],

  // Une fiche garde l'écran HOLD secondes après la perte du sujet (le curseur
  // qui glisse d'un poisson à l'autre ne doit pas la faire clignoter), puis
  // s'efface en fondu (CSS). Les valeurs changeantes — position, état, faim —
  // sont relues à REFRESH secondes d'intervalle, pas à chaque frame.
  HOLD: 0.4,
  REFRESH: 0.25,

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

  // OÙ VIT L'ESPÈCE, dans les deux sens. La seule profondeur ne suffit pas à
  // situer une créature : la Dorade Dorée et le Poisson Confetti partagent
  // l'eau claire et ne se croisent pourtant jamais, l'une au grand large,
  // l'autre au récif. C'est cette ligne qui les sépare à la lecture.
  habitatOf(e) {
    const def = e.def;
    if (def.aerial) return 'Le ciel · au-dessus de l’eau';
    const [x0, x1] = e.bandeX();
    const m = d => Math.round(d / CONFIG.PX_PER_METER);
    return `${World.labelBande(x0, x1)} · ${m(def.depthBand[0])}–${m(def.depthBand[1])} m`;
  },

  dietOf(def) {
    const parts = [];
    if (def.prey) parts.push(def.prey.map(p => SPECIES[p].name).join(', '));
    if (def.eatsBones) parts.push('arêtes (charogne)');
    // `grazes` explicite : une espèce qui a des proies ET broute (le
    // Poisson-lanterne) ne doit pas passer pour un pur prédateur.
    if (def.grazes || (def.eatsFood && !def.prey)) parts.push('graines / plancton');
    return parts.length ? parts.join(' · ') : '—';
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

  // --- Les CHAMPS, indépendants de l'affichage --------------------------------
  // Tout ce qui ne dépend que de l'ESPÈCE est calculé une fois et mémoïsé :
  // « Mangé par » balaie toute la table SPECIES, « Vit » parcourt le relief.
  _statique: {},

  statique(e) {
    const memo = this._statique[e.speciesId];
    if (memo) return memo;
    const def = e.def;
    return (this._statique[e.speciesId] = {
      nom: def.name,
      // Vraie espèce, en sous-titre — suivie du faux nom latin, qui glisse la
      // vraie information sous la blague (« Scarus petomanus »).
      reel: def.realName || '',
      latin: def.latin || '',
      // La phrase n'apparaît QUE ici : jamais en bulle — l'aquarium raconte par
      // le visage, et le budget de bulles est déjà tenu à ~250/min.
      phrase: def.phrase || '',
      vit: this.habitatOf(e),
      deplacement: this.MOVEMENT_LABEL[def.movement] ?? def.movement,
      niveau: this.trophicLabel(def),
      mange: this.dietOf(def),
      favori: def.favoriteFood ? FOOD_TYPES[def.favoriteFood].label : '—',
      mangePar: this.predatorsOf(e.speciesId).join(', ') || 'personne',
    });
  },

  // Les champs d'une créature, dans l'ordre de `ROWS`. Seuls « Ici », « État »,
  // le stade et la faim dépendent de l'individu.
  champs(e) {
    const s = this.statique(e);
    return {
      nom: s.nom,
      stade: e.stage === 'fry' ? '(alevin)' : (e.stage === 'egg' ? '(œuf)' : ''),
      reel: s.reel, latin: s.latin ? '· ' + s.latin : '',
      phrase: s.phrase,
      faim: e.hunger,
      rows: [
        World.labelZoneX(e.x) + ' · ' + World.zoneAt(e.y).label
          + ` · ${Math.round((e.y - CONFIG.SURFACE_Y) / CONFIG.PX_PER_METER)} m`,
        s.vit, s.deplacement, s.niveau, s.mange, s.favori, s.mangePar,
        this.stateLabel(e),
      ],
    };
  },

  // --- Le PANNEAU --------------------------------------------------------------
  panel: null, _e: null, _on: false, _perdu: 0, _t: 0, _suivie: null, _cote: null,

  init() {
    const p = this.panel = document.getElementById('idcard');
    if (!p) return;
    const $ = s => p.querySelector(s);
    this.el = {
      nom: $('.ic-nom'), stade: $('.ic-stade'), reel: $('.ic-reel'), latin: $('.ic-latin'),
      rows: $('.ic-rows'), faim: $('.ic-faim-v'), phrase: $('.ic-phrase'),
    };
    this.dd = [];
    for (const k of this.ROWS) {
      const dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = k;
      this.el.rows.append(dt, dd);
      this.dd.push(dd);
    }
  },

  // Le sujet de cette frame, ou null (cf. l'en-tête : survolée/épinglée d'abord,
  // suivie à défaut). Rien ne s'affiche sans la loupe.
  sujet() {
    if (!Input.hoverInfo) return null;
    const h = Input.hovered;
    if (h && !h.dead) return h;
    const f = Camera.follow;
    return f && !f.dead ? f : null;
  },

  // N'écrit dans le DOM que ce qui a CHANGÉ : un `textContent` identique
  // relancerait quand même la mise en page.
  _poser(el, txt) {
    if (el._txt === txt) return;
    el._txt = txt; el.textContent = txt;
  },

  rendre(e) {
    const c = this.champs(e), el = this.el;
    this._poser(el.nom, c.nom);
    this._poser(el.stade, c.stade);
    this._poser(el.reel, c.reel);
    this._poser(el.latin, c.latin);
    this._poser(el.phrase, c.phrase);
    el.phrase.hidden = !c.phrase;
    for (let i = 0; i < c.rows.length; i++) this._poser(this.dd[i], c.rows[i]);
    // Jauge de faim (0 = repu à gauche, 1 = affamé à droite) : pleine quand il
    // est repu. Largeur par `transform`, qui ne déclenche aucune mise en page.
    el.faim.style.transform = `scaleX(${Math.max(0, 1 - c.faim).toFixed(3)})`;
    const couleur = c.faim > 0.7 ? '#ff7a6b' : (c.faim > 0.4 ? '#ffc75e' : '#7fe08a');
    if (el.faim._c !== couleur) { el.faim._c = couleur; el.faim.style.background = couleur; }
  },

  // Appelé une fois par frame, AVANT le dessin du monde (le cerceau en dépend).
  update(dt) {
    const p = this.panel;
    if (!p) return;
    const e = this.sujet();
    if (e) {
      this._perdu = 0;
      const change = e !== this._e;
      this._e = e;
      this._t += dt;
      if (change || this._t >= this.REFRESH) { this._t = 0; this.rendre(e); }
      // Doré = c'est la créature que la caméra suit (même teinte que son cerceau)
      const suivie = e === Camera.follow;
      if (suivie !== this._suivie) { this._suivie = suivie; p.classList.toggle('suivie', suivie); }
      if (!this._on) {
        this._on = true;
        p.classList.add('on'); p.setAttribute('aria-hidden', 'false');
      }
    } else if (this._on) {
      this._perdu += dt;
      if (this._perdu >= this.HOLD) {
        this._on = false;
        p.classList.remove('on'); p.setAttribute('aria-hidden', 'true');
      }
    }
    // La légende est ouverte : la fiche se range à côté d'elle (CSS)
    const cote = !!(typeof Legend !== 'undefined' && Legend.visible);
    if (cote !== this._cote) { this._cote = cote; p.classList.toggle('a-cote', cote); }
  },

  // Cerceau fin autour de la créature dont parle la fiche. À appeler dans le
  // repère MONDE. Pas pour la suivie : son cerceau doré, pointillé, est déjà
  // dessiné par la boucle principale. Il s'estompe avec la fiche qui s'éteint.
  dessinerCerceau(ctx) {
    const e = this._e;
    if (!this._on || !e || e.dead || e === Camera.follow) return;
    const [x, y] = Camera.toScreen(e.x, e.y);
    // Au moins 15 px ÉCRAN : une crevette de 7 px de monde aurait un cerceau
    // invisible, comme sa zone de survol l'était avant `RAYON_SURVOL`.
    const r = Math.max(e.size * (e.def.spanRatio || 1.05) * 1.35, 15 / Camera.zoom);
    ctx.globalAlpha = this._perdu > 0 ? Math.max(0, 1 - this._perdu / this.HOLD) : 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.75 / Camera.zoom;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  },
};
