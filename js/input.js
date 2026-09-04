// Entrées. Séparation stricte des rôles pour ne pas mélanger nourrir et explorer :
//   clic GAUCHE      = nourrir / bulles (jamais de déplacement de caméra)
//   clic MOLETTE     = déplacer la vue (drag)
//   souris aux BORDS = défilement automatique de la vue
//   molette          = zoom · shift+molette = pan vertical
const Input = {
  mx: 0, my: 0,
  mouseSpeed: 0,
  holding: false,
  holdTimer: 0,
  dragging: false,
  lastX: 0, lastY: 0,
  moved: false,
  hoverInfo: false,        // bouton "fiche d'identité" actif
  hovered: null,           // créature sous le curseur

  EDGE: 60,                // largeur de la bande de défilement au bord
  EDGE_SPEED: 700,         // px monde / s au bord

  // --- Tactile (PERFORMANCE.md §4) ---------------------------------------
  // Conventions mobiles : tap = nourrir · glissé 1 doigt = déplacer la vue ·
  // pincement 2 doigts = zoom (centré entre les doigts) · double-tap sur une
  // créature = la suivre · tap sur une créature avec la loupe = fiche ÉPINGLÉE
  // (le « survol » n'existe pas au doigt). Le défilement par les bords est
  // désactivé en mode tactile : le doigt levé laisse mx/my au bord, la caméra
  // partirait toute seule.
  touchMode: false,        // vrai dès le premier contact tactile
  pointers: new Map(),     // pointerId -> {x, y} des doigts posés
  pinch: null,             // {d, mx, my} : écart et centre du pincement en cours
  touchPan: false,         // le doigt a bougé : c'est un déplacement, pas un tap
  // Rayon MINIMUM de survol, en pixels ÉCRAN (donc constant quel que soit le
  // zoom). Une crevette fait 7 px de monde : à 18 px il fallait la viser au
  // pixel près, et sa fiche clignotait dès qu'elle bougeait d'un souffle.
  RAYON_SURVOL: 34,

  init(canvas) {
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      // Molette = zoom centré sur le curseur ; shift+molette = pan vertical.
      if (e.shiftKey) Camera.move(0, e.deltaY * 1.8 / Camera.zoom);
      else Camera.zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.88 : 1.14);
    }, { passive: false });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerenter', () => { this.inWindow = true; });
    // Au doigt, pointerleave suit chaque lever de doigt : il ne doit pas
    // faire tomber la fiche épinglée par un tap.
    canvas.addEventListener('pointerleave', () => { this.inWindow = false; if (!this.touchMode) this.hovered = null; });

    canvas.addEventListener('pointerdown', e => {
      // setPointerCapture peut jeter (doigt déjà relâché, évènement
      // synthétique) : ça ne doit jamais avaler le geste lui-même.
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      if (e.pointerType === 'touch') { this.touchDown(e); e.preventDefault(); return; }
      if (e.button === 1 || e.button === 2) {
        // Molette (ou clic droit) enfoncée : on déplace la vue, ce qui relâche
        // le suivi en cours
        Camera.lacher(); this.suivi = null;
        this.dragging = true;
        this.lastX = e.clientX; this.lastY = e.clientY;
        e.preventDefault();
      } else if (e.button === 0) {
        // Clic gauche : uniquement nourrir / faire des bulles
        this.holding = true; this.holdTimer = 0; this.moved = false;
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (this.pointers.has(e.pointerId)) { this.touchMove(e); return; }
      const dx = e.clientX - this.mx, dy = e.clientY - this.my;
      this.mouseSpeed = Math.hypot(dx, dy) * 60;   // approximation px/s
      this.mx = e.clientX; this.my = e.clientY;

      if (this.dragging) {
        const mdx = e.clientX - this.lastX, mdy = e.clientY - this.lastY;
        Camera.move(-mdx / Camera.zoom, -mdy / Camera.zoom);
        this.lastX = e.clientX; this.lastY = e.clientY;
      }

      // Remous / sillage sous l'eau au mouvement rapide (GDD §3)
      if (this.mouseSpeed > 1100) {
        const [wx, wy] = Camera.toWorld(this.mx, this.my);
        if (World.isUnderwater(wx, wy) && Math.random() < 0.4) Particles.wake(wx, wy);
      }
    });

    canvas.addEventListener('pointerup', e => {
      if (this.pointers.has(e.pointerId)) { this.touchUp(e, true); return; }
      if (e.button === 0 && this.holding && this.holdTimer < 0.35) this.click(e.clientX, e.clientY);
      this.holding = false; this.dragging = false;
    });

    // Double-clic sur une créature : la caméra la suit. Double-clic dans le
    // vide (ou clic molette) : on la relâche.
    canvas.addEventListener('dblclick', e => {
      const cible = this.pickAt(e.clientX, e.clientY);
      if (cible) { Camera.suivre(cible); this.suivi = cible; }
      else { Camera.lacher(); this.suivi = null; }
    });
    canvas.addEventListener('pointercancel', e => {
      if (this.pointers.has(e.pointerId)) { this.touchUp(e, false); return; }
      this.holding = false; this.dragging = false;
    });
    // Filet : si la capture est perdue sans pointerup ni pointercancel (geste
    // système, appel entrant), le doigt fantôme resterait dans la Map et le
    // prochain contact partirait en pincement avec lui.
    canvas.addEventListener('lostpointercapture', e => {
      if (this.pointers.has(e.pointerId)) this.touchUp(e, false);
    });

    // Sélecteur de nourriture
    document.querySelectorAll('.food-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.food-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Food.selected = btn.dataset.food;
      });
    });

    // Bouton fiche d'identité : au survol, affiche la carte de l'espèce
    const infoBtn = document.getElementById('info-btn');
    infoBtn.addEventListener('click', () => {
      this.hoverInfo = !this.hoverInfo;
      infoBtn.classList.toggle('active', this.hoverInfo);
      if (!this.hoverInfo) this.hovered = null;
    });
  },

  // --- Gestes tactiles --------------------------------------------------------
  touchDown(e) {
    this.touchMode = true;
    this.inWindow = true;                      // pointerenter n'est pas fiable au doigt
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.mx = e.clientX; this.my = e.clientY;
    if (this.pointers.size === 2) {
      // Deuxième doigt : on bascule en pincement, le tap/pan en cours est annulé
      this.holding = false; this.touchPan = false;
      Camera.lacher(); this.suivi = null;
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: Math.hypot(b.x - a.x, b.y - a.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    } else if (this.pointers.size === 1) {
      this.pinch = null; this.touchPan = false;
      this.holding = true; this.holdTimer = 0;   // tap court = nourrir, maintenu = bulles
      this._downX = e.clientX; this._downY = e.clientY;
    }
  },

  touchMove(e) {
    const p = this.pointers.get(e.pointerId);
    p.x = e.clientX; p.y = e.clientY;
    if (this.pinch && this.pointers.size >= 2) {
      // Pincement : zoom centré entre les doigts, ET déplacement par le centre
      // (on peut zoomer et se déplacer dans le même geste, comme partout).
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (this.pinch.d > 8 && d > 8) Camera.zoomAt(mx, my, d / this.pinch.d);
      Camera.move((this.pinch.mx - mx) / Camera.zoom, (this.pinch.my - my) / Camera.zoom);
      this.pinch = { d, mx, my };
      return;
    }
    if (this.pointers.size !== 1) return;
    this.mx = e.clientX; this.my = e.clientY;
    // Un tap qui dérive de plus de 14 px devient un déplacement de la vue
    if (!this.touchPan && Math.hypot(e.clientX - this._downX, e.clientY - this._downY) > 14) {
      this.touchPan = true; this.holding = false;
      Camera.lacher(); this.suivi = null;
      this.lastX = e.clientX; this.lastY = e.clientY;
    }
    if (this.touchPan) {
      Camera.move(-(e.clientX - this.lastX) / Camera.zoom, -(e.clientY - this.lastY) / Camera.zoom);
      this.lastX = e.clientX; this.lastY = e.clientY;
    }
  },

  touchUp(e, valide) {
    this.pointers.delete(e.pointerId);
    this.pinch = null;
    if (this.pointers.size === 1) {
      // Il reste un doigt : il reprend la main comme déplacement, jamais comme
      // tap (sinon lever un pincement nourrit par accident).
      const p = [...this.pointers.values()][0];
      this.touchPan = true; this.holding = false;
      this.lastX = p.x; this.lastY = p.y;
      return;
    }
    if (this.pointers.size > 0) return;
    const tap = valide && this.holding && !this.touchPan && this.holdTimer < 0.35;
    this.holding = false; this.touchPan = false;
    this.inWindow = false;                     // plus de doigt : plus de « curseur »
    if (tap) this.tap(e.clientX, e.clientY);
  },

  tap(sx, sy) {
    // Double-tap = suivre la créature (équivalent du double-clic caméra)
    const now = performance.now();
    const double = now - (this._lastTap ?? -1e9) < 350
      && Math.hypot(sx - this._lastTapX, sy - this._lastTapY) < 50;
    this._lastTap = now; this._lastTapX = sx; this._lastTapY = sy;
    if (double) {
      const cible = this.pickAt(sx, sy);
      if (cible) { Camera.suivre(cible); this.suivi = cible; }
      else { Camera.lacher(); this.suivi = null; }
      return;
    }
    // Loupe active : le tap ÉPINGLE la fiche de la créature touchée (l'équivalent
    // tactile du survol) ; un tap dans le vide la relâche et nourrit.
    if (this.hoverInfo) {
      const cible = this.pickAt(sx, sy);
      if (cible) { this.hovered = cible; return; }
      this.hovered = null;
    }
    this.click(sx, sy);
  },

  // Créature sous le curseur (la plus proche dans son rayon).
  // `dejaVu` : celle qu'on survolait à la frame précédente. Elle est CONSERVÉE
  // tant que le curseur reste dans un rayon élargi — sans cette hystérésis, un
  // poisson qui nage sous le curseur perd sa fiche à la moindre oscillation, et
  // c'est intenable sur un banc de crevettes.
  pickAt(sx, sy, dejaVu = null) {
    const [wx, wy] = Camera.toWorld(sx, sy);
    const rayon = e => Math.max(e.size * 1.7, this.RAYON_SURVOL / Camera.zoom);
    if (dejaVu && !dejaVu.dead && dejaVu.stage !== 'egg') {
      const r = rayon(dejaVu) * 1.7;
      if (U.dist2(wx, wy, dejaVu.x, dejaVu.y) < r * r) return dejaVu;
    }
    let best = null, bestD = Infinity;
    for (const e of Ecosystem.entities) {
      if (e.dead || e.stage === 'egg') continue;
      const r = rayon(e);
      const d = U.dist2(wx, wy, e.x, e.y);
      if (d < r * r && d < bestD) { bestD = d; best = e; }
    }
    return best;
  },

  click(sx, sy) {
    const [wx, wy] = Camera.toWorld(sx, sy);
    const nearSurface = Math.abs(wy - CONFIG.SURFACE_Y) < 120 || wy < CONFIG.SURFACE_Y;
    const nearFloor = World.floorY(wx) - wy < 80;

    if (nearSurface) {
      Particles.splash(wx);                       // splash + nourriture (GDD §8)
      Food.drop(wx, CONFIG.SURFACE_Y + 10);
    } else if (nearFloor) {
      Particles.sandCloud(wx, World.floorY(wx) - 5);
      Food.drop(wx, wy);
    } else if (World.isUnderwater(wx, wy)) {
      Particles.wake(wx, wy);
      Food.drop(wx, wy);
    }
  },

  update(dt) {
    this.mouseSpeed *= 0.9;

    // Défilement quand la souris touche un bord de l'écran (accélère vers le
    // bord). Jamais en mode tactile : mx/my restent figés là où le doigt s'est
    // levé, la caméra dériverait toute seule dès qu'un tap tombe près d'un bord.
    if (!this.dragging && this.inWindow && !Camera.follow && !this.touchMode) {
      const E = this.EDGE, S = this.EDGE_SPEED * dt / Camera.zoom;
      let ex = 0, ey = 0;
      if (this.mx < E) ex = -(1 - this.mx / E);
      else if (this.mx > Camera.vw - E) ex = 1 - (Camera.vw - this.mx) / E;
      if (this.my < E) ey = -(1 - this.my / E);
      else if (this.my > Camera.vh - E) ey = 1 - (Camera.vh - this.my) / E;
      if (ex || ey) Camera.move(ex * S, ey * S);
    }

    // Fiche d'identité : au survol à la souris (avec l'hystérésis de pickAt) ;
    // au doigt, elle est ÉPINGLÉE par un tap (cf. Input.tap) et tient jusqu'au
    // tap suivant — recalculer depuis mx/my la ferait clignoter puis disparaître
    // dès que la créature s'éloigne du dernier point touché.
    if (!this.hoverInfo) this.hovered = null;
    else if (this.touchMode) { if (this.hovered && this.hovered.dead) this.hovered = null; }
    else this.hovered = this.pickAt(this.mx, this.my, this.hovered);

    if (this.holding && !this.touchPan && !this.pinch) {
      this.holdTimer += dt;
      // Clic (ou doigt) maintenu → bulles continues (GDD §8)
      if (this.holdTimer > 0.35) {
        const [wx, wy] = Camera.toWorld(this.mx, this.my);
        if (World.isUnderwater(wx, wy) && Math.random() < 0.7) Particles.bubble(wx, wy);
      }
    }
  },
};
