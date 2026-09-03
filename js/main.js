// Boucle principale : temps, cycle jour/nuit, update/draw, HUD.
const Main = {
  canvas: null, ctx: null,
  time: 0,          // temps de jeu en secondes
  lastFrame: 0,

  // t du cycle jour : 0 = aube, 0.5 = crépuscule, ... sur DAY_LENGTH secondes
  dayT() { return (this.time % CONFIG.DAY_LENGTH) / CONFIG.DAY_LENGTH; },

  // 0 = plein jour, 1 = pleine nuit (avec transitions douces)
  nightAmount() {
    const t = this.dayT();
    if (t < 0.45) return 0;
    if (t < 0.55) return (t - 0.45) / 0.1;          // crépuscule
    if (t < 0.9) return 1;                          // nuit
    return 1 - (t - 0.9) / 0.1;                     // aube
  },

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    World.init();
    Sprites.init();      // chargement asynchrone : ne bloque aucune frame
    // Vue de départ : sur le rivage, un peu de plage à gauche et l'eau devant
    Camera.x = Camera.tx = Math.max(0, World.shoreX - Camera.w * 0.25);
    Camera.y = Camera.ty = -Camera.h * 0.15;
    Background.init();
    Ecosystem.init();
    Input.init(this.canvas);
    Legend.init();

    document.getElementById('info').innerHTML =
      'Molette : zoom · Clic molette (ou bords de l\'écran) : explorer<br>' +
      'Clic gauche : nourrir · maintenu : bulles · 🔍 : fiches d\'identité';

    this.lastFrame = performance.now();
    requestAnimationFrame(ts => this.frame(ts));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    Camera.resize(window.innerWidth, window.innerHeight);
  },

  frame(ts) {
    // Borné des DEUX côtés : le timestamp de la première frame peut précéder le
    // performance.now() de l'init (et les reprises d'onglet font des sauts), ce
    // qui donnait un dt négatif — les particules vieillissaient à l'envers et
    // finissaient avec des rayons négatifs.
    const dt = U.clamp((ts - this.lastFrame) / 1000, 0, 0.05);
    this.lastFrame = ts;
    this.time += dt;
    const t = this.time;

    Input.update(dt);
    Camera.update(dt);
    Food.update(dt);
    Ecosystem.update(dt, t);
    Particles.update(dt);

    const ctx = this.ctx;
    const s = this.dpr * Camera.zoom;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    Background.draw(ctx, t);
    Food.drawDecor(ctx);        // arêtes et cacas : ils appartiennent au fond
    Ecosystem.draw(ctx, t);
    // Les graines PAR-DESSUS tout le reste : c'est le seul objet que le joueur
    // pose lui-même, il doit toujours voir où son clic est tombé — cachée
    // derrière un banc ou un rocher, on croit que le clic n'a rien fait.
    Food.drawGraines(ctx);
    Particles.draw(ctx);

    // Cerceau autour de la créature suivie, pour savoir qui la caméra piste
    if (Camera.follow && !Camera.follow.dead) {
      const f = Camera.follow;
      const [fx, fy] = Camera.toScreen(f.x, f.y);
      const r = f.size * 1.9 + Math.sin(t * 3) * f.size * 0.12;
      ctx.strokeStyle = 'rgba(255,215,94,0.85)'; ctx.lineWidth = 2.5 / Camera.zoom;
      ctx.setLineDash([r * 0.35, r * 0.28]);
      ctx.beginPath(); ctx.arc(fx, fy, r, t * 1.2, t * 1.2 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Overlay HUD : en pixels écran (non zoomé)
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // La fiche de la créature SUIVIE (double-clic) reste affichée tant que la
    // loupe est active : on l'a choisie pour la regarder vivre, la perdre dès
    // que le curseur glisse ailleurs n'avait aucun sens. Le survol en ajoute
    // une seconde, décalée pour ne pas la recouvrir.
    if (Input.hoverInfo) {
      let zone = null;
      const suivie = Camera.follow;
      if (suivie && !suivie.dead) zone = IdCard.draw(ctx, suivie, null, true);
      if (Input.hovered && Input.hovered !== suivie) IdCard.draw(ctx, Input.hovered, zone);
    }

    this.updateHUD();
    requestAnimationFrame(ts2 => this.frame(ts2));
  },

  updateHUD() {
    // Jauge de profondeur (GDD §4)
    const centerY = Camera.y + Camera.h / 2;
    const depth = Math.max(0, centerY - CONFIG.SURFACE_Y);
    const frac = U.clamp(depth / CONFIG.DEPTH_MAX, 0, 1);
    document.getElementById('depth-marker').style.top = `calc(${(frac * 100).toFixed(1)}% - 7px)`;

    const night = this.nightAmount();
    const zone = World.zoneAt(centerY);
    const clock = document.getElementById('clock');
    const icon = night > 0.5 ? '🌙' : (night > 0 ? '🌅' : '☀️');
    clock.textContent = `${icon} ${zone.label} · ${Math.round(depth / CONFIG.PX_PER_METER)}m`;
    clock.style.color = 'rgba(255,255,255,.85)';
    clock.style.fontSize = '16px';
  },
};

// Les scripts sont injectés par boot.js : DOMContentLoaded peut déjà être passé.
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => Main.init());
} else {
  Main.init();
}
