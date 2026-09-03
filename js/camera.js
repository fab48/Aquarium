// Caméra scrollable bi-axiale + zoom, bornée par le triangle de profondeur (GDD §4).
// Le zoom (molette) remplace la plongée : on dézoome pour voir large, on
// zoome pour le détail ; le drag déplace la vue.
const Camera = {
  x: 100, y: 0,           // coin haut-gauche en coordonnées monde
  tx: 100, ty: 0,         // cible (lissage)
  vw: 0, vh: 0,           // taille écran (px CSS)
  w: 0, h: 0,             // taille de la vue en unités monde (= écran / zoom)
  zoom: 1,
  ZOOM_MIN: 0.35, ZOOM_MAX: 1.6,

  resize(w, h) { this.vw = w; this.vh = h; this.updateSize(); },
  updateSize() { this.w = this.vw / this.zoom; this.h = this.vh / this.zoom; },

  move(dx, dy) { this.tx += dx; this.ty += dy; this.clampTarget(); },

  // Zoom centré sur un point écran : le point monde sous le curseur reste fixe
  zoomAt(sx, sy, factor) {
    const wx = this.x + sx / this.zoom, wy = this.y + sy / this.zoom;
    this.zoom = U.clamp(this.zoom * factor, this.ZOOM_MIN, this.ZOOM_MAX);
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
  // Écran CSS -> monde
  toWorld(sx, sy) { return [sx / this.zoom + this.x, sy / this.zoom + this.y]; },
  isVisible(wx, wy, margin = 100) {
    return wx > this.x - margin && wx < this.x + this.w + margin &&
           wy > this.y - margin && wy < this.y + this.h + margin;
  },
};
