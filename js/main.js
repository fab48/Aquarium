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

    // SAUVEGARDE. La graine vient d'abord : le décor doit être reconstruit à
    // l'identique AVANT qu'on y replace les créatures, sinon les espèces à
    // habitat (étoile sur son rocher, hippocampe dans son herbier) atterrissent
    // sur du sable nu. Une sauvegarde absente ou illisible donne un monde neuf,
    // jamais une page blanche — c'est tout l'intérêt de la relire par `Save.lire`.
    const sauvegarde = Save.lire();
    Save.graine = sauvegarde ? sauvegarde.graine : (Math.random() * 0xffffffff) >>> 0;
    Background.init(Save.graine);
    if (!sauvegarde || !Save.restaurer(sauvegarde)) Ecosystem.init();
    Save.brancher();

    Input.init(this.canvas);
    Legend.init();
    this.initBarres();
    this.initResetBtn();

    document.getElementById('info').innerHTML =
      'Molette : zoom · Clic molette (ou bords de l\'écran) : explorer<br>' +
      'Clic gauche : nourrir · maintenu : bulles · 🔍 : fiches d\'identité';

    this.lastFrame = performance.now();
    requestAnimationFrame(ts => this.frame(ts));
  },

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap ?? 2);
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
    // Position MONDE du curseur, calculée une seule fois par frame : chaque
    // petit poisson la recalculait (en allouant un tableau) dans move(), et
    // chaque créature au repos dans updateEyeLook().
    Input.wmx = Input.mx / Camera.zoom + Camera.x;
    Input.wmy = Input.my / Camera.zoom + Camera.y;
    Food.update(dt);
    Ecosystem.update(dt, t);
    Particles.update(dt);
    Save.update(dt);          // sauvegarde périodique (cf. save.js)

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
    this.adaptResolution(ts);
    requestAnimationFrame(ts2 => this.frame(ts2));
  },

  // Résolution ADAPTATIVE pour les machines faibles (vieux PC sans accélération
  // canvas, mobiles d'entrée de gamme) : le décor coûte en PIXELS, pas en
  // objets (cf. PERFORMANCE.md §3). Si la frame moyenne dépasse ~40 ms sur
  // plusieurs secondes, on baisse le dpr par paliers de 0,25 jusqu'à 1 — on ne
  // remonte jamais tout seul, pour éviter le pompage. À dpr 1 au lieu de 2,
  // c'est 4x moins de pixels à peindre.
  _perfAcc: 0, _perfN: 0, _perfLast: 0,
  adaptResolution(ts) {
    const raw = ts - this._perfLast;
    this._perfLast = ts;
    if (raw <= 0 || raw > 250) return;      // reprise d'onglet : on ignore le saut
    this._perfAcc += raw; this._perfN++;
    if (this._perfAcc < 3000) return;       // on juge sur ~3 s, pas sur une frame
    const avg = this._perfAcc / this._perfN;
    this._perfAcc = 0; this._perfN = 0;
    if (avg > 40 && this.dpr > 1) {
      this.dprCap = Math.max(1, (this.dprCap ?? this.dpr) - 0.25);
      this.resize();
      console.info(`[perf] frame moyenne ${avg.toFixed(0)} ms : résolution abaissée (dpr ${this.dpr})`);
    }
  },

  // Le bouton « recommencer ». La confirmation n'est pas une politesse : c'est
  // la seule action du jeu qui détruise quelque chose, et elle est posée près
  // de boutons parfaitement anodins.
  initResetBtn() {
    const btn = document.getElementById('reset-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (confirm('Recommencer un aquarium tout neuf ?\nCelui-ci sera perdu.')) Save.recommencer();
    });
  },

  // LES DEUX BARRES SONT LA MÊME BARRE, tournée de 90°. C'est ce que le HUD
  // racontait déjà en mots (« Grand large · Eau claire · 34 m ») sans le montrer :
  // à gauche quatre segments nommés, à droite un simple filet et une pastille.
  // Elles partagent donc leur constructeur, leur mise à jour et leur CSS — la
  // seule différence est l'axe. Deux barres écrites séparément divergent au
  // premier réglage.
  //
  // Les segments sont proportionnels au monde RÉEL (le grand large fait les
  // deux tiers de la largeur, les grands fonds la moitié de la profondeur) et
  // rien n'est écrit en dur : si `CONFIG.PROFILE` ou `CONFIG.ZONES` change, les
  // barres suivent.
  initBarres() {
    const bx = World.bandesX(), by = World.bandesY();
    this._segsX = this.construireBarre('zone-bar', bx, b => b.x1 - b.x0);
    this._segsY = this.construireBarre('depth-bar', by, b => b.d1 - b.d0);
  },

  construireBarre(id, bandes, taille) {
    const bar = document.getElementById(id);
    if (!bar) return null;
    const total = bandes.reduce((a, b) => a + taille(b), 0) || 1;
    const segs = [];
    for (const b of bandes) {
      const d = document.createElement('div');
      d.className = 'seg';
      // `grow` proportionnel sur une base nulle : chaque segment prend sa part
      // du monde, mais jamais moins que la place de son libellé (`min-width` /
      // `min-height: max-content`). Le Rivage ne fait que 7 % du monde — à la
      // proportion exacte, il s'affichait « RIVAG ». Les segments qui ont de la
      // place cèdent la différence.
      d.style.flex = `${(taille(b) / total * 100).toFixed(2)} 1 0`;
      d.textContent = b.label;
      d.dataset.zone = b.id;
      bar.appendChild(d);
      segs.push(d);
    }
    return segs;
  },

  // Place le curseur d'une barre DANS LE SEGMENT RÉEL, pas à la proportion
  // théorique : les segments trop étroits pour leur libellé sont élargis par la
  // CSS, et un curseur calculé sur la taille du monde se retrouverait à côté.
  majBarre(segs, bandes, i, f, marqueur, axe) {
    if (!segs || i < 0) return;
    const seg = segs[i];
    const m = document.getElementById(marqueur);
    if (!m || !seg) return;
    const vertical = axe === 'y';
    const pos = (vertical ? seg.offsetTop + seg.offsetHeight * f
                          : seg.offsetLeft + seg.offsetWidth * f).toFixed(1);
    m.style[vertical ? 'top' : 'left'] = `${pos}px`;
    const cle = axe + bandes[i].id;
    if (this['_z' + axe] === cle) return;          // ne touche au DOM qu'au changement
    this['_z' + axe] = cle;
    for (const d of segs) d.classList.toggle('on', d.dataset.zone === bandes[i].id);
  },

  updateHUD() {
    // LES DEUX BARRES SE LISENT PAREIL : le curseur suit le CENTRE de la vue,
    // horizontalement pour l'une, verticalement pour l'autre.
    const centerX = Camera.x + Camera.w / 2;
    const centerY = Camera.y + Camera.h / 2;
    const depth = centerY - CONFIG.SURFACE_Y;      // négatif au-dessus de l'eau

    const bx = World.bandesX();
    const zx = World.zoneX(centerX);
    const ix = bx.findIndex(b => b.id === zx);
    if (ix >= 0) {
      const f = U.clamp((centerX - bx[ix].x0) / Math.max(1, bx[ix].x1 - bx[ix].x0), 0, 1);
      this.majBarre(this._segsX, bx, ix, f, 'zone-marker', 'x');
    }

    const by = World.bandesY();
    // La bande la plus profonde sert de repli : au-delà de `DEPTH_MAX` (le fond
    // du monde), `findIndex` ne trouverait rien et le curseur resterait figé.
    let iy = by.findIndex(b => depth >= b.d0 && depth < b.d1);
    if (iy < 0) iy = depth < by[0].d1 ? 0 : by.length - 1;
    const fy = U.clamp((depth - by[iy].d0) / Math.max(1, by[iy].d1 - by[iy].d0), 0, 1);
    this.majBarre(this._segsY, by, iy, fy, 'depth-marker', 'y');

    const night = this.nightAmount();
    const zone = World.zoneAt(centerY);
    const clock = document.getElementById('clock');
    const icon = night > 0.5 ? '🌙' : (night > 0 ? '🌅' : '☀️');
    // « Grand large · Eau claire · 34m » : la position se lit dans les DEUX
    // sens. Une espèce ne se situe pas par sa seule profondeur — la Dorade
    // Dorée et le Confetti partagent l'eau claire et ne se croisent pourtant
    // jamais, l'une au large, l'autre au récif.
    clock.textContent = `${icon} ${World.labelZoneX(centerX)} · ${zone.label}`
                      + ` · ${Math.round(Math.max(0, depth) / CONFIG.PX_PER_METER)}m`;
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
