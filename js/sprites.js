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
// Chargement asynchrone : tant que le fichier n'est pas là, la silhouette
// procédurale continue d'être dessinée. Aucune frame n'attend un sprite.
const Sprites = {
  cache: {},              // nom -> objet préparé | null (en cours) | false (échec)

  init() {
    for (const id in SPECIES) if (SPECIES[id].sprite) this.charger(SPECIES[id].sprite);
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
    const shapes = (d.shapes || []).filter(sh => sh.points && sh.points.length > 2);
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
      // Calibration du visage commun, telle que l'éditeur l'exporte (panneau
      // « Calibration visage »). Absente des premiers exports : on retombe alors
      // sur `def.spriteFace`, puis sur le défaut mesuré.
      faceK: d.faceK, faceTx: d.faceTx, faceTy: d.faceTy,
      shapes,
    };
  },
};
