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

  init(canvas) {
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      // Molette = zoom centré sur le curseur ; shift+molette = pan vertical.
      if (e.shiftKey) Camera.move(0, e.deltaY * 1.8 / Camera.zoom);
      else Camera.zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 0.88 : 1.14);
    }, { passive: false });

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerenter', () => { this.inWindow = true; });
    canvas.addEventListener('pointerleave', () => { this.inWindow = false; this.hovered = null; });

    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
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
    canvas.addEventListener('pointercancel', () => { this.holding = false; this.dragging = false; });

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

  // Créature sous le curseur (la plus proche dans son rayon)
  pickAt(sx, sy) {
    const [wx, wy] = Camera.toWorld(sx, sy);
    let best = null, bestD = Infinity;
    for (const e of Ecosystem.entities) {
      if (e.dead || e.stage === 'egg') continue;
      const r = Math.max(e.size * 1.6, 18 / Camera.zoom);
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

    // Défilement quand la souris touche un bord de l'écran (accélère vers le bord)
    if (!this.dragging && this.inWindow && !Camera.follow) {
      const E = this.EDGE, S = this.EDGE_SPEED * dt / Camera.zoom;
      let ex = 0, ey = 0;
      if (this.mx < E) ex = -(1 - this.mx / E);
      else if (this.mx > Camera.vw - E) ex = 1 - (Camera.vw - this.mx) / E;
      if (this.my < E) ey = -(1 - this.my / E);
      else if (this.my > Camera.vh - E) ey = 1 - (Camera.vh - this.my) / E;
      if (ex || ey) Camera.move(ex * S, ey * S);
    }

    // Fiche d'identité au survol
    this.hovered = this.hoverInfo ? this.pickAt(this.mx, this.my) : null;

    if (this.holding) {
      this.holdTimer += dt;
      // Clic maintenu → bulles continues (GDD §8)
      if (this.holdTimer > 0.35) {
        const [wx, wy] = Camera.toWorld(this.mx, this.my);
        if (World.isUnderwater(wx, wy) && Math.random() < 0.7) Particles.bubble(wx, wy);
      }
    }
  },
};
