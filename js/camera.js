// Caméra scrollable bi-axiale + zoom, bornée par le triangle de profondeur (GDD §4).
// Le zoom (molette) remplace la plongée : on dézoome pour voir large, on
// zoome pour le détail ; le drag déplace la vue.
const Camera = {
  x: 100, y: 0,           // coin haut-gauche en coordonnées monde
  tx: 100, ty: 0,         // cible (lissage)
  vw: 0, vh: 0,           // taille écran (px CSS)
  w: 0, h: 0,             // taille de la vue en unités monde (= écran / zoom)
  zoom: 1,
  // ZOOM_MAX : jusqu'où on peut s'approcher. À 1,6 on ne voyait pas vraiment
  // une créature de près — or tout le travail du projet est sur les visages,
  // les sourcils et les bouches. À 3,2 une crevette de 7 px en fait 45 à
  // l'écran, et on peut enfin la regarder.
  ZOOM_MAX: 3.2,

  // ZOOM_MIN : jusqu'où on peut s'éloigner — et c'est une question de PERF, pas
  // de cadrage. Dézoomer n'ajoute aucune entité à la simulation (elle tourne
  // toujours en entier) mais multiplie ce qu'il faut DESSINER : à 0,35 la vue
  // couvre trois fois plus de monde qu'à 1, donc trois fois plus de créatures
  // à l'écran et un décor étiré sur la même surface de pixels.
  //
  // Le plancher est donc adaptatif, comme la résolution : `Main.adaptResolution`
  // le remonte quand les frames s'allongent et ne le redescend jamais tout seul
  // (le pompage serait pire que le ralentissement). Sur une machine confortable
  // il ne bouge pas.
  ZOOM_MIN_DUR: 0.35,
  zoomMinPerf: 0.35,
  zoomMin() { return Math.max(this.ZOOM_MIN_DUR, this.zoomMinPerf); },

  resize(w, h) { this.vw = w; this.vh = h; this.updateSize(); },
  updateSize() { this.w = this.vw / this.zoom; this.h = this.vh / this.zoom; },

  // LE SEUL POINT D'ENTRÉE POUR CHANGER LE ZOOM. `zoom` et `w`/`h` sont liés
  // (`w = vw / zoom`) : poser `zoom` à la main laisse la taille de vue au
  // facteur précédent, et tout ce qui la lit travaille alors en dimensions
  // fausses — le décor est un dégradé étiré aux dimensions de la VUE, donc
  // l'écran se retrouve à moitié peint.
  //
  // C'est exactement ce qui arrivait au chargement d'une sauvegarde faite à un
  // zoom ≠ 1 : `Save.restaurer` posait `Camera.zoom` directement, et il fallait
  // un coup de molette (le seul chemin qui appelle `updateSize`) pour que
  // l'affichage se remette d'aplomb.
  setZoom(z) {
    this.zoom = U.clamp(z, this.zoomMin(), this.ZOOM_MAX);
    this.updateSize();
  },

  move(dx, dy) { this.tx += dx; this.ty += dy; this.clampTarget(); },

  // Zoom centré sur un point écran : le point monde sous le curseur reste fixe
  zoomAt(sx, sy, factor) {
    const wx = this.x + sx / this.zoom, wy = this.y + sy / this.zoom;
    this.zoom = U.clamp(this.zoom * factor, this.zoomMin(), this.ZOOM_MAX);
    this.updateSize();
    this.x = wx - sx / this.zoom; this.y = wy - sy / this.zoom;
    this.tx = this.x; this.ty = this.y;
    this.clampTarget();
    this.x = this.tx; this.y = this.ty;
  },

  clampTarget() {
    this.tx = U.clamp(this.tx, 0, Math.max(0, CONFIG.WORLD_WIDTH - this.w));
    // Limite dure : on peut descendre jusqu'à voir confortablement le fond de
    // la colonne la plus profonde visible à l'écran (large marge sous le sable).
    let maxFloor = 0;
    for (let sx = 0; sx <= this.w; sx += CONFIG.DEPTH_COLUMN_WIDTH / 2) {
      maxFloor = Math.max(maxFloor, World.floorY(this.tx + sx));
    }
    const maxY = Math.max(0, maxFloor + 300 - this.h);
    this.ty = U.clamp(this.ty, -this.h * 0.35, maxY); // peut monter un peu dans le ciel
  },

  // Suivi d'une créature (double-clic). Elle reste au centre jusqu'à ce qu'on
  // relâche ou qu'elle meure.
  follow: null,
  suivre(e) { this.follow = e; },
  lacher() { this.follow = null; },

  update(dt) {
    if (this.follow) {
      if (this.follow.dead) this.follow = null;
      else { this.tx = this.follow.x - this.w / 2; this.ty = this.follow.y - this.h / 2; }
    }
    this.clampTarget();
    const k = 1 - Math.exp(-CONFIG.CAMERA_SMOOTH * dt);
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
  },

  // Monde -> "écran monde" (le contexte est déjà scalé par zoom au rendu)
  toScreen(wx, wy) { return [wx - this.x, wy - this.y]; },
  // Accesseurs scalaires pour les boucles chaudes : toScreen alloue un tableau
  // à chaque appel (739 par frame mesurés), ceux-ci n'allouent rien.
  sx(wx) { return wx - this.x; },
  sy(wy) { return wy - this.y; },
  // Écran CSS -> monde
  toWorld(sx, sy) { return [sx / this.zoom + this.x, sy / this.zoom + this.y]; },
  isVisible(wx, wy, margin = 100) {
    return wx > this.x - margin && wx < this.x + this.w + margin &&
           wy > this.y - margin && wy < this.y + this.h + margin;
  },
};
