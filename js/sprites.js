// Sprites vectoriels produits par l'éditeur SVG (Assets/*.json).
//
// Le format de l'éditeur, tel qu'il est consommé ici :
//   naturalW/H  — dimensions du dessin d'origine
//   points      — ANCRES : center (origine de la créature), nose, eye, mouth, tail
//   shapes[]    — { points: [[x,y]…], fill, smooth, pivot, amp }
//                 `smooth`  : contour lissé plutôt qu'en ligne brisée
//                 `pivot`   : point d'attache — la forme PIVOTE autour (nageoire)
//                 `amp`     : amplitude d'animation de la forme
//   tailBlend   — x en deçà duquel les points appartiennent à la QUEUE et ondulent
//   fins[]      — marqueurs de nageoires (x, y, r, layerIndex) posés par l'éditeur
//
// Le fichier est écrit par `atelier.html`. `Assets/sprites.json` dit quelle
// espèce utilise quel dessin (voir `init`).
//
// Chargement asynchrone : tant que le fichier n'est pas là, la silhouette
// procédurale continue d'être dessinée. Aucune frame n'attend un sprite.
const Sprites = {
  cache: {},              // nom -> objet préparé | null (en cours) | false (échec)

  // Le manifeste `Assets/sprites.json` associe une espèce à son dessin :
  //     { "requin": "SharkSVG", "murene": null }
  // C'est lui qui permet d'ACTIVER un sprite depuis l'atelier sans toucher au
  // code : une page web ne peut pas modifier `species.js`, et lui faire réécrire
  // du source serait de toute façon une très mauvaise idée. `null` désactive
  // explicitement une espèce, ce qui la ramène à sa silhouette procédurale même
  // si sa fiche déclare un `sprite:` — c'est ainsi qu'on garde celles qui
  // marchent bien telles quelles.
  init() {
    for (const id in SPECIES) if (SPECIES[id].sprite) this.charger(SPECIES[id].sprite);
    fetch('Assets/sprites.json')
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (!m) return;
        this.manifeste = m;
        for (const id in m) {
          if (!SPECIES[id]) continue;
          if (m[id]) { SPECIES[id].sprite = m[id]; this.charger(m[id]); }
          else delete SPECIES[id].sprite;
        }
      })
      .catch(() => {});     // pas de manifeste = rien à faire, cas normal
  },

  charger(nom) {
    if (nom in this.cache) return;
    this.cache[nom] = null;
    fetch(`Assets/${nom}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { this.cache[nom] = this.preparer(d); })
      .catch(err => {
        // On ne casse rien : l'espèce garde sa silhouette procédurale.
        console.warn(`[sprites] ${nom} illisible (${err}) — silhouette procédurale conservée`);
        this.cache[nom] = false;
      });
  },

  get(nom) { return this.cache[nom] || null; },

  preparer(d) {
    // 2 points suffisent pour un trait ouvert (un segment de tentacule) ; il en
    // faut 3 pour un contour rempli.
    const shapes = (d.shapes || []).filter(sh => sh.points
      && sh.points.length >= (sh.fill == null && sh.stroke ? 2 : 3));
    let minX = Infinity, maxX = -Infinity;
    for (const sh of shapes) for (const p of sh.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
    }
    const c = (d.points && d.points.center) || { x: (minX + maxX) / 2, y: d.naturalH / 2 };
    return {
      w: Math.max(1, maxX - minX),        // largeur RÉELLE du dessin, pas celle du viewBox
      cx: c.x, cy: c.y,
      minX,
      // Sans `tailBlend`, rien n'ondule : mieux vaut un poisson raide qu'un
      // poisson dont le corps entier se tortille.
      tailBlend: d.tailBlend != null ? d.tailBlend : minX,
      oeil: d.points && d.points.eye,
      bouche: d.points && d.points.mouth,
      // CALIBRATION DU VISAGE, par ordre de préséance.
      // 1. `points.eye.r` — le rayon de l'œil DANS LES UNITÉS DU DESSIN. C'est
      //    la forme à préférer : l'artiste le règle en tirant sur un cercle
      //    posé sur son propre dessin, sans rien savoir du `size` interne de
      //    l'espèce. `drawFace` dessine l'œil à 0,22 fois la taille du visage,
      //    d'où la conversion.
      // 2. `faceK`/`faceTx`/`faceTy` — la forme en multiples de `size`, plus
      //    abstraite mais utile pour un rattrapage grossier.
      echelle: d.echelle, tailleJeu: d.tailleJeu, spriteScale: d.spriteScale,
      faceR: d.points && d.points.eye && d.points.eye.r,
      faceK: d.faceK, faceTx: d.faceTx, faceTy: d.faceTy,
      shapes,
      // Le JSON d'origine, gardé tel quel : l'atelier le réenregistre enrichi
      // des ancres et des réglages de visage.
      source: d,
      // Ancrages de nageoire, RANGÉS PAR CALQUE : chacun porte un rayon
      // d'influence `r` qui pondère la rotation des points alentour
      // (cf. `tracerForme`). L'éditeur en autorise plusieurs sur un même calque.
      finsPar: (d.fins || []).reduce((acc, f) => {
        const i = f.layerIndex;
        if (i == null || !shapes[i]) return acc;
        (acc[i] || (acc[i] = [])).push(f);
        return acc;
      }, {}),
    };
  },
};
