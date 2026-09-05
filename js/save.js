// Sauvegarde de l'aquarium (localStorage). Le joueur doit retrouver SON
// aquarium en revenant, sur le web comme sur mobile.
//
// CE QU'ON ENREGISTRE : des paramètres, rien d'autre — la graine du monde,
// l'heure qu'il était, où regardait la caméra, et pour chaque créature son
// espèce, sa position et son stade. Pas d'âge, pas de faim, pas de vélocité,
// pas de particules. Environ 12 ko pour 600 créatures, là où un instantané
// complet en ferait dix fois plus sans que ça se voie à l'écran.
//
// Trois conséquences assumées de ce format :
//
//  1. **La graine est indispensable.** Le décor est tiré au hasard à la
//     génération (260 rochers, herbiers, cheminées) ; sans elle, une étoile de
//     mer restaurée sur son rocher se réveillerait sur du sable nu, parce que
//     `Background.habitatSpots` aurait changé. C'est elle qui autorise une
//     sauvegarde aussi légère.
//  2. **L'âge n'est pas retenu, et c'est très bien.** Le constructeur donne
//     déjà un âge aléatoire aux adultes créés directement — c'est même une
//     règle du projet (sans elle, toute une classe d'âge meurt d'un coup).
//  3. **Le monde ne vit pas pendant l'absence.** La boucle est en pause dès que
//     l'onglet est caché (`requestAnimationFrame` s'arrête), et on ne rejoue
//     rien au retour : on reprend exactement où on s'était arrêté.
//
// L'aquarium avance de lui-même : la sauvegarde est donc PÉRIODIQUE, en plus du
// départ. Sur mobile, `beforeunload` ne se déclenche pas de façon fiable — c'est
// `visibilitychange` qui fait foi, et c'est le seul signal auquel se fier quand
// l'utilisateur bascule d'application.
const Save = {
  CLE: 'aquarium.sauvegarde',
  VERSION: 1,
  INTERVALLE: 20,          // secondes de jeu entre deux sauvegardes automatiques

  graine: null,            // graine du monde courant (posée par charger/neuf)
  _acc: 0,
  _actif: true,

  // --- Lecture ---------------------------------------------------------------
  // Tolérante par construction : une sauvegarde absente, illisible, d'une autre
  // version ou tronquée doit donner un monde neuf, jamais une page blanche.
  lire() {
    let brut = null;
    try { brut = localStorage.getItem(this.CLE); } catch (e) { return null; }   // mode privé
    if (!brut) return null;
    try {
      const d = JSON.parse(brut);
      if (!d || d.v !== this.VERSION || !d.pop) return null;
      if (!Number.isFinite(d.graine)) return null;
      return d;
    } catch (e) {
      return null;
    }
  },

  // --- Écriture --------------------------------------------------------------
  ecrire() {
    if (!this._actif || this.graine === null) return false;
    const pop = {};
    // Les groupes sont renumérotés à partir de 0 : les identifiants réels sont
    // un compteur global qui n'a aucun sens d'une session à l'autre. Sans eux,
    // un banc de confettis se rouvrirait en quarante poissons solitaires — et
    // sa figure en cœur, qui exige un chef de banc, ne se jouerait plus jamais.
    const groupes = new Map();
    for (const e of Ecosystem.entities) {
      if (e.dead || e.stage === 'egg') continue;      // les œufs sont trop éphémères
      let g = -1;
      if (e.groupId != null) {
        if (!groupes.has(e.groupId)) groupes.set(e.groupId, groupes.size);
        g = groupes.get(e.groupId);
      }
      (pop[e.speciesId] || (pop[e.speciesId] = []))
        .push([Math.round(e.x), Math.round(e.y), e.stage === 'adult' ? 1 : 0, g]);
    }
    const data = {
      v: this.VERSION,
      graine: this.graine,
      t: Math.round(Main.time * 10) / 10,             // pour retrouver l'heure du jour
      cam: [Math.round(Camera.x), Math.round(Camera.y), +Camera.zoom.toFixed(3)],
      pop,
    };
    try {
      localStorage.setItem(this.CLE, JSON.stringify(data));
      return true;
    } catch (e) {
      // Quota dépassé, mode privé, stockage refusé : on cesse d'essayer plutôt
      // que de relancer une exception toutes les vingt secondes.
      this._actif = false;
      return false;
    }
  },

  effacer() {
    try { localStorage.removeItem(this.CLE); } catch (e) { /* rien à faire */ }
  },

  // --- Restauration ----------------------------------------------------------
  // Appelée à la place de `Ecosystem.init()`. Le monde (relief, décor) a déjà
  // été construit avec la bonne graine : il ne reste qu'à replacer les vivants.
  restaurer(d) {
    for (const k in SPECIES) SPECIES[k].id = k;
    const remap = new Map();
    let posees = 0, ignorees = 0;
    for (const speciesId in d.pop) {
      // Une espèce renommée ou retirée depuis la sauvegarde est simplement
      // sautée. L'immigration la ramènera si elle existe encore.
      if (!SPECIES[speciesId]) { ignorees += d.pop[speciesId].length; continue; }
      for (const [x, y, adulte, g] of d.pop[speciesId]) {
        if (!Number.isFinite(x) || !Number.isFinite(y)) { ignorees++; continue; }
        let groupId = null;
        if (g >= 0) {
          const cle = speciesId + '#' + g;
          if (!remap.has(cle)) remap.set(cle, Ecosystem.nextGroupId++);
          groupId = remap.get(cle);
        }
        const e = new Entity(speciesId, x, y, { stage: adulte ? 'adult' : 'fry', groupId });
        Ecosystem.entities.push(e);
        Ecosystem.counts[speciesId] = (Ecosystem.counts[speciesId] || 0) + 1;
        posees++;
      }
    }
    // Une sauvegarde vide (toutes les espèces disparues du code, ou un fichier
    // corrompu qui a quand même passé la validation) ne doit pas donner un
    // aquarium mort : on repart de zéro.
    if (!posees) return false;

    Main.time = Number.isFinite(d.t) ? d.t : 0;
    if (Array.isArray(d.cam)) {
      Camera.x = Camera.tx = d.cam[0]; Camera.y = Camera.ty = d.cam[1];
      // `setZoom`, JAMAIS `Camera.zoom = …` : la taille de vue en dépend, et une
      // affectation directe laissait tout l'écran peint aux mauvaises
      // dimensions jusqu'au premier coup de molette.
      if (d.cam[2] > 0) Camera.setZoom(d.cam[2]);
    }
    console.info(`Aquarium restauré : ${posees} créatures${ignorees ? `, ${ignorees} ignorées` : ''}.`);
    return true;
  },

  // --- Cycle de vie ----------------------------------------------------------
  // Branché depuis Main.init, après que le monde existe.
  brancher() {
    // `visibilitychange` est le signal qui fait foi : sur mobile, une
    // application passée en arrière-plan peut être tuée sans jamais déclencher
    // `beforeunload`. `pagehide` couvre la fermeture d'onglet sur bureau.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.ecrire();
    });
    window.addEventListener('pagehide', () => this.ecrire());
  },

  // Appelée chaque frame depuis la boucle.
  update(dt) {
    this._acc += dt;
    if (this._acc < this.INTERVALLE) return;
    this._acc = 0;
    this.ecrire();
  },

  // Le bouton « recommencer » : on efface, on tire une graine neuve, on
  // recharge. Repasser par un rechargement plutôt que de reconstruire à chaud
  // évite d'avoir à remettre à zéro, une par une, les listes de l'écosystème,
  // du décor et des particules — et c'est instantané, tout est local.
  recommencer() {
    this.effacer();
    this._actif = false;              // que l'autosave ne réécrive pas en partant
    location.reload();
  },
};
