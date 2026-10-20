// Attraper un poisson à la main (IDEES.md §4). Le joueur saisit une créature,
// la promène dans l'aquarium et la relâche.
//
// LE GESTE. Un clic bref NOURRIT, toujours — c'est le geste le plus fréquent du
// jeu et il ne doit jamais changer. On attrape par un APPUI MAINTENU sans bouger
// sur une créature : un anneau se remplit pour annoncer le geste, puis elle est
// à vous. Au doigt, c'est le même geste (appui long d'un doigt posé SUR une
// créature) ; le glissé 1 doigt dans le vide déplace toujours la vue et le
// pincement zoome toujours. Un appui maintenu dans le vide fait des bulles,
// comme avant.
//
// LA SAISIE SORT LA CRÉATURE DE LA SIMULATION. Tenue (`_saisi`) ou en train de
// retomber (`_lache`), elle n'a plus de faim, de pensée, de gag ni de prédateur :
// `Entity.update` la confie à `Saisie.pilote` AVANT la faim, et c'est elle qui la
// rend à `think`/`move` — sur une position VALIDE, jamais en la téléportant.
//
// LE RELÂCHÉ NE LAISSE JAMAIS ÉCHOUÉ. Au-dessus de l'eau, la créature retombe
// (gravité, éclaboussure à la surface, ventre à plat via `Entity.choc`) ; sur la
// plage elle frétille en bonds jusqu'à la mer ; un rampant coule jusqu'au sable
// puis rejoint sa bande à pied. Dans l'eau, le rappel souple de `move` fait le
// reste — le seul pas que la saisie fait elle-même est de ne pas laisser le mur
// dur du rivage la TÉLÉPORTER (elle le rejoint en nageant).
const Saisie = {
  DELAI: 0.4,            // s d'appui sur la créature avant qu'elle soit saisie
  ANNEAU_DEBUT: 0.18,    // l'anneau n'apparaît qu'après : un clic dure moins
  TOLERANCE: 12,         // px écran de bougé toléré avant d'abandonner la saisie
  DUREE_MAX: 20,         // s : au-delà elle se dégage toute seule
  REPOS: 1.5,            // s avant de pouvoir en ressaisir une
  POIDS_MAX: 70,         // def.size à partir duquel c'est trop lourd (colosses)
  VITESSE_MAX: 2600,     // px/s : plafond du ressort qui suit le curseur
  ELAN_MAX: 700,         // px/s : élan conservé au relâché
  LACHE_MAX: 14,         // s : filet de sécurité de la retombée
  G: 800,                // px/s² en l'air

  tenu: null,            // la créature dans la main
  arme: null,            // celle que vise un appui en cours (anneau)
  _t: 0,                 // temps d'appui sur `arme`
  _cd: 0,
  _tenueT: 0,
  _annule: false,        // l'appui en cours ne saisira plus rien
  _lourd: false,         // cet appui a déjà secoué un colosse
  _appuiPrec: false,
  _ox: 0, _oy: 0,
  _suiviPause: null,

  // --- Requêtes ---------------------------------------------------------------
  tient() { return this.tenu !== null; },

  // Vrai tant que l'appui en cours « appartient » à la saisie : Input ne fait
  // alors pas de bulles (elles ne devaient pas gêner, ni être gênées par, l'anneau).
  occupe() { return this.tenu !== null || this.arme !== null || this._lourd; },

  saisissable(e) {
    return !e.dead && e.stage !== 'egg' && !e.def.refuge && e.def.movement !== 'fixed'
      && e._agonie == null && !e._saisi;
  },

  rayon(e) {
    const mini = (Input.RAYON_SURVOL || 34) / Camera.zoom;
    return Math.max(e.size * (e.def.size >= this.POIDS_MAX ? 1.15 : 1.7), mini);
  },

  // La créature visée sous (sx, sy) : dans son rayon de survol, la plus proche
  // du curseur, avec une préférence pour les petites — la crevette posée contre
  // la baleine doit pouvoir être attrapée. `dejaVu` est conservée dans un rayon
  // élargi (hystérésis, comme `Input.pickAt`) : un poisson qui bouge d'un souffle
  // ne doit pas faire repartir l'anneau de zéro.
  viser(sx, sy, dejaVu = null) {
    const [wx, wy] = Camera.toWorld(sx, sy);
    if (dejaVu && this.saisissable(dejaVu)) {
      const r = this.rayon(dejaVu) * 1.7;
      if (U.dist2(wx, wy, dejaVu.x, dejaVu.y) < r * r) return dejaVu;
    }
    let best = null, bestS = Infinity;
    for (const e of Ecosystem.entities) {
      if (!this.saisissable(e)) continue;
      const r = this.rayon(e);
      const d2 = U.dist2(wx, wy, e.x, e.y);
      if (d2 >= r * r) continue;
      const score = Math.sqrt(d2) + e.size * 0.5;
      if (score < bestS) { bestS = score; best = e; }
    }
    return best;
  },

  // --- Boucle -----------------------------------------------------------------
  // Appelée chaque frame par Main, APRÈS Input.update et le calcul de la
  // position monde du curseur, AVANT l'écosystème.
  update(dt) {
    if (this._cd > 0) this._cd -= dt;
    const appui = Input.holding && !Input.dragging && !Input.touchPan
      && !Input.pinch && Input.pointers.size <= 1;
    if (!appui) { this._annule = false; this._lourd = false; }
    if (appui && !this._appuiPrec) { this._ox = Input.mx; this._oy = Input.my; }
    this._appuiPrec = appui;

    if (this.tenu) {
      const e = this.tenu;
      if (e.dead) { this.relacher('mort'); return; }
      if (!appui) { this.relacher('main'); return; }
      this._tenueT += dt;
      if (this._tenueT > this.DUREE_MAX) { this.relacher('lasse'); return; }
      this._porter(e, dt);
      return;
    }

    if (!appui || this._annule || this._cd > 0) { this.arme = null; this._t = 0; return; }
    // « Sans bouger » : au doigt c'est le seuil de glissé d'Input (14 px) qui
    // coupe tout seul ; à la souris on le mesure ici.
    if (!Input.touchMode && Math.hypot(Input.mx - this._ox, Input.my - this._oy) > this.TOLERANCE) {
      this._annule = true; this.arme = null; this._t = 0;
      return;
    }
    const c = this.viser(Input.mx, Input.my, this.arme);
    if (c !== this.arme) { this.arme = c; this._t = 0; }
    if (!c) return;
    this._t += dt;
    if (this._t < this.DELAI) return;
    if (c.def.size >= this.POIDS_MAX) {
      this.secouer(c);
      this._lourd = true; this._annule = true; this.arme = null; this._t = 0;
    } else {
      this.saisir(c);
    }
  },

  // L'anneau de visée : il se remplit pendant l'appui, c'est lui qui annonce le
  // geste. Dessiné dans le repère monde (même transform que Particles.draw).
  draw(ctx, t) {
    const e = this.arme;
    if (!e || this.tenu || this._t < this.ANNEAU_DEBUT) return;
    const p = U.clamp((this._t - this.ANNEAU_DEBUT) / (this.DELAI - this.ANNEAU_DEBUT), 0, 1);
    const x = Camera.sx(e.x), y = Camera.sy(e.y);
    const r = Math.max(e.size * 1.3, 24 / Camera.zoom);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.4 / Camera.zoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  // --- Le colosse : trop lourd ------------------------------------------------
  secouer(e) {
    e._secousseFin = Main.time + 0.9;
    e.emote('surprise', 1.1, false);
    e.choc(0.3, 'x');
    Particles.shout(e.x, e.y - e.size * 1.1, 'TROP LOURD !', '#ffffff', 30);
  },

  // --- Saisir -----------------------------------------------------------------
  saisir(e) {
    this.tenu = e; this.arme = null; this._t = 0; this._tenueT = 0;
    e._saisi = true; e._lache = null;
    // Suivi par la caméra : on le suspend le temps de la saisie. Caméra et
    // curseur se disputeraient la créature (la vue la recentre, donc le point
    // monde sous le curseur dérive, donc elle suit, donc la vue la recentre…).
    if (Camera.follow === e) { this._suiviPause = e; Camera.lacher(); }
    else this._suiviPause = null;
    this._nettoyer(e);
    // Le visage dédié : œil énorme, bouche en cri — et une seule marque, posée
    // à la main (le filtre de groupe d'`emoteVFX` la ferait manquer une fois sur
    // dix, or c'est LE retour du geste). Les oiseaux protestent, ils ne paniquent pas.
    const oiseau = !!e.def.aerial;
    e._vfxCd = 3;
    e.hold(oiseau ? 'angry' : 'scared');
    Particles.son('pop', e.x, e.y, e.size);
    if (oiseau) Particles.shout(e.x, e.y - e.size * 1.3, 'HÉ !', '#ffffff', 26);
    else Particles.comic(e.x, e.y - e.size * 1.2, '!');
    Particles.burst(e.x, e.y, '#ffffff', 6);
    e.choc(0.35, 'x');                      // le petit écrasement de la pince
    e.vx *= 0.5; e.vy *= 0.5;
    e._sx = e.x; e._sy = e.y;
    if (Input.touchMode && navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  },

  // Il quitte proprement ce qu'il faisait, et ceux qui le visaient lâchent prise :
  // un prédateur n'a pas à poursuivre ce qui n'est plus dans l'eau. La paire en
  // parade se défait SANS pénalité (`endMating` ferait perdre la jauge de ponte).
  _nettoyer(e) {
    const p = e._matingWith;
    if (p) { p._matingWith = null; p._faceAt = null; }
    e._matingWith = null;
    for (const o of Ecosystem.entities) {
      if (o === e || o.dead) continue;
      if (o.target === e) {
        if (o.state === 'strike') { o.state = 'retract'; o.stateTimer = 0.6; }
        else if (o.state === 'hunt' || o.state === 'court' || o.state === 'seekFood') o.state = 'wander';
        o.target = null;
      }
      if (o._attendRepas && o._attendRepas.proie === e) { o._attendRepas = null; o._faceAt = null; }
      if (o._traque === e) o._traque = null;
      if (o._tickleTarget === e) { o._tickleTarget = null; o._faceAt = null; }
    }
    e.state = 'wander'; e.target = null; e.stateTimer = 0;
    e._faceAt = null; e._freeze = 0; e._chew = 0; e._chewPrey = null;
    e._surfacing = false; e._replonge = false; e._diveTargetY = null;
    e._surfaceT = 0; e._surfaceHold = null; e._coule = false;
    e._plage = false;
    e.jumpState = 'water'; e._airborne = false;
    e._ecraseT = 0; e._crispe = 0; e._etire = 0; e._smear = 0; e._chocT = null;
    e._anime = null; e._animeFace = null; e._animeVisage = false; e._animeFaceV = false;
    e._lureT = 0; e._tickleTarget = null; e._traque = null;
    e._figX = null; e._figY = null; e._figSpeed = null; e._enFigure = false;
    e._farceCible = null; e._farceRoll = 0;
    // Les phases de scène (`_chargePh`, `_runPh`, `_echoPh`…) : une scène
    // interrompue par la main ne reprend pas là où elle s'était arrêtée.
    for (const k of Object.keys(e)) {
      if (k.length > 3 && k.endsWith('Ph') && k[0] === '_' && e[k]) e[k] = null;
    }
  },

  // Le ressort qui suit le curseur : une créature ne se téléporte pas dans la
  // main, elle y est TIRÉE (légère avance du doigt, léger dépassement au
  // freinage), et c'est sa vitesse de ressort qui devient l'élan du relâché.
  _porter(e, dt) {
    let tx = Input.wmx, ty = Input.wmy;
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return;
    // Au doigt, la créature se tient un peu AU-DESSUS : on la voit, le doigt ne
    // la cache pas.
    if (Input.touchMode) ty -= 38 / Camera.zoom;
    const d = Math.min(dt, 0.05);
    const w = 12, z = 0.82;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = e._sx ?? tx; e.y = e._sy ?? ty; e.vx = e.vy = 0; }
    e.vx += (w * w * (tx - e.x) - 2 * z * w * e.vx) * d;
    e.vy += (w * w * (ty - e.y) - 2 * z * w * e.vy) * d;
    const v = Math.hypot(e.vx, e.vy);
    if (v > this.VITESSE_MAX) { e.vx *= this.VITESSE_MAX / v; e.vy *= this.VITESSE_MAX / v; }
    e.x += e.vx * d; e.y += e.vy * d;
    // Bornes : le monde, et au-dessus du sable (la main ne l'enfonce pas).
    if (e.x < 10) { e.x = 10; e.vx = Math.max(e.vx, 0); }
    else if (e.x > CONFIG.WORLD_WIDTH - 10) { e.x = CONFIG.WORLD_WIDTH - 10; e.vx = Math.min(e.vx, 0); }
    const bas = World.floorY(e.x) - e.size * 0.5;
    if (e.y > bas) { e.y = bas; e.vy = Math.min(e.vy, 0); }
    if (e.y < -700) { e.y = -700; e.vy = Math.max(e.vy, 0); }
    e._sx = e.x; e._sy = e.y;
    // Au doigt le défilement par les bords est coupé (Input.update) : pour
    // transporter une créature loin, la vue suit le doigt qui s'approche du bord.
    if (Input.touchMode) {
      const E = 70, S = 620 * d / Camera.zoom;
      let ex = 0, ey = 0;
      if (Input.mx < E) ex = -(1 - Input.mx / E);
      else if (Input.mx > Camera.vw - E) ex = 1 - (Camera.vw - Input.mx) / E;
      if (Input.my < E) ey = -(1 - Input.my / E);
      else if (Input.my > Camera.vh - E) ey = 1 - (Camera.vh - Input.my) / E;
      if (ex || ey) Camera.move(ex * S, ey * S);
    }
  },

  // --- Relâcher ---------------------------------------------------------------
  relacher(raison = 'main') {
    const e = this.tenu;
    if (!e) return;
    this.tenu = null;
    this._cd = this.REPOS;
    this._annule = true;                    // il faut lever le doigt pour ressaisir
    e._saisi = false;
    this.arme = null; this._t = 0;
    // Jamais de NaN dans la simulation : on repart de la dernière position saine.
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = e._sx ?? World.shoreX + 800; e.y = e._sy ?? CONFIG.SURFACE_Y + 300; }
    if (!Number.isFinite(e.vx)) e.vx = 0;
    if (!Number.isFinite(e.vy)) e.vy = 0;
    const v = Math.hypot(e.vx, e.vy);
    if (v > this.ELAN_MAX) { e.vx *= this.ELAN_MAX / v; e.vy *= this.ELAN_MAX / v; }
    e.state = 'wander'; e.stateTimer = 0; e.target = null; e._faceAt = null; e._freeze = 0;
    e.release();
    // Suivi caméra : rendu, sauf si le joueur l'a défait entre-temps (double-clic
    // dans le vide, déplacement manuel — qui remettent `Input.suivi` à null).
    if (this._suiviPause === e && !e.dead && Camera.follow == null && Input.suivi === e) Camera.suivre(e);
    this._suiviPause = null;
    if (e.dead) return;

    if (raison === 'lasse') Particles.comic(e.x, e.y - e.size * 1.1, '💦');   // il s'est dégagé
    if (e.def.aerial) {
      // L'oiseau reprend l'air : sa propre physique (rappel de bande, plafond)
      // s'en occupe, et le garde-fou de rivage est souple pour lui.
      e.emote('angry', 2, false);
      return;
    }
    e._lache = { t: 0, hops: 0, entre: false };
    e.emote('surprise', 1.2, false);
  },

  // Position qu'on peut ÉCRIRE dans la sauvegarde pour une créature tenue ou en
  // chute : sinon elle serait restaurée dans l'air ou sur la plage, et le
  // plafond de surface / le mur de rivage la téléporterait au premier tick.
  positionSure(e) {
    let x = e.x, y = e.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) { x = e._sx; y = e._sy; }
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [World.shoreX + 800, CONFIG.SURFACE_Y + 300];
    const s = e.size, def = e.def;
    if (def.aerial) return [U.clamp(x, World.shoreX * 0.4, CONFIG.WORLD_WIDTH - 50), y];
    if (def.movement === 'crawl') {
      const [xMin, xMax] = e.bornesReptation();
      x = U.clamp(x, xMin, xMax);
      return [x, World.floorY(x) - s * 0.6];
    }
    x = U.clamp(Math.max(x, e.limiteLarge() + (e.id % 7) * 26), 0, CONFIG.WORLD_WIDTH - 100);
    y = U.clamp(y, CONFIG.SURFACE_Y + s * 0.7, World.floorY(x) - s * 0.5);
    return [x, y];
  },

  // --- Le pilote : tout ce que fait une créature saisie ou qui retombe ---------
  // Appelé par `Entity.update` ; renvoie vrai quand il a la main (l'update
  // normal ne tourne pas). Les minuteurs que l'update aurait fait avancer et
  // dont dépend le RENDU (visage, gelée du choc) sont tenus ici.
  pilote(e, dt, t) {
    dt = Math.min(dt, 0.05);
    if (e._vfxCd > 0) e._vfxCd -= dt;
    if (e._peps > 0) e._peps -= dt;
    if (e.wet > 0) e.wet = Math.max(0, e.wet - dt);
    if (e._chocT != null) { e._chocT += dt; if (e._chocT > 0.9) e._chocT = null; }
    if (e.exprTimer > 0) { e.exprTimer -= dt; if (e.exprTimer <= 0) e.expression = 'idle'; }

    if (e._saisi) {
      // Tenu : le visage de la saisie est RE-posé (une piqûre, une décharge
      // reçue en chemin l'auraient changé) ; la position est suivie par
      // `_porter`, à chaque frame, pas ici (une créature « loin » ne passe
      // qu'une frame sur trois dans update).
      e.hold(e.def.aerial ? 'angry' : 'scared');
      e.speedNow = 0;
      return true;
    }
    this._chute(e, dt);
    return true;
  },

  // La retombée. Trois milieux — l'air, le sable sec, l'eau — et un seul but :
  // rendre la créature à la simulation sur une position où `move` n'a plus rien
  // à claquer.
  _chute(e, dt) {
    const L = e._lache;
    if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { e.x = e._sx ?? World.shoreX + 800; e.y = e._sy ?? CONFIG.SURFACE_Y + 300; e.vx = e.vy = 0; }
    if (!Number.isFinite(e.vx) || !Number.isFinite(e.vy)) { e.vx = 0; e.vy = 0; }
    L.t += dt;
    const def = e.def, s = e.size, surf = CONFIG.SURFACE_Y;
    const rampant = def.movement === 'crawl';
    const W = CONFIG.WORLD_WIDTH;
    const sable = rampant ? sableOffset(e) : 0;

    if (L.t > this.LACHE_MAX) { this._finir(e, true); return; }

    if (e.y < surf) {
      // --- L'AIR ----------------------------------------------------------------
      e.hold('scared');
      e.vy += this.G * dt;
      e.vx *= 1 - Math.min(1, 0.25 * dt);
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = U.clamp(e.x, 10, W - 10);
      e.angle = Math.atan2(e.vy, e.vx || 1) * 0.6;
      const fy = World.floorY(e.x);
      const sol = fy - s * (rampant ? 0.6 : 0.5);
      if (e.y >= sol) {
        // Le sable (la plage, ou un haut-fond qui affleure) : il s'écrase à plat
        // ventre — c'est le seul moment où la saisie fait de la poussière.
        const vi = e.vy;
        e.y = sol;
        if (vi > 80) {
          e.choc(U.clamp(vi / 520, 0.35, 1), 'y');
          Particles.sandCloud(e.x, fy - 3, s > 24);
          Particles.son('flop', e.x, e.y, s);
        }
        L.hops++;
        if (L.hops === 1) e.emote('dizzy', 1.4, false);
        if (rampant) { e.vy = 0; e.vx = Math.max(60, def.speed * 2); }
        else {
          // Il frétille vers la mer (le large est à droite) : un poisson
          // échoué ne reste pas échoué.
          e.vy = -(220 + Math.random() * 90);
          e.vx = 150 + Math.random() * 70;
        }
      } else if (e.y >= surf && e.vy > 0) {
        // La surface, de haut en bas : l'éclaboussure, et le ventre à plat
        // d'autant plus fort qu'il tombe vite.
        Particles.splash(e.x);
        e.choc(U.clamp(e.vy / 520, 0.35, 1), 'y');
        e.evenement('collision', { avec: 'surface', vitesse: e.vy });
        e.release();
        e.emote(Math.random() < 0.34 ? 'dizzy' : 'surprise', 1.4, false);
        e.vy *= 0.55; e.vx *= 0.7;
        L.entre = true;
      }
      e.speedNow = Math.hypot(e.vx, e.vy);
      return;
    }

    // --- L'EAU (ou le sable à fleur d'eau) ---------------------------------------
    const k = Math.exp(-2.4 * dt);
    e.vx *= k; e.vy *= k;
    const fy = World.floorY(e.x);
    if (rampant) {
      // Un crabe ne nage pas : il COULE, à la vitesse d'un caillou, puis marche
      // jusqu'à sa bande de fond.
      const [xMin, xMax] = e.bornesReptation();
      const yF = fy - s * 0.6 + sable;
      if (e.y < yF - 1) {
        e.vy += (420 - e.vy) * Math.min(1, dt * 3);   // ~230 px/s une fois la traînée équilibrée
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.y > yF) e.y = yF;
      } else {
        const sens = e.x < xMin ? 1 : (e.x > xMax ? -1 : 0);
        e.vy = 0;
        e.vx = sens * Math.max(60, def.speed * 2);
        e.x = U.clamp(e.x + e.vx * dt, 10, W - 10);
        e.y = World.floorY(e.x) - s * 0.6 + sable;
        if (!sens) { this._finir(e, false); return; }
      }
    } else {
      const plafond = surf + s * 0.7;
      const bord = e.limiteLarge() + (e.id % 7) * 26;
      if (e.y < plafond) e.vy = Math.max(e.vy, 60);        // il finit de s'enfoncer
      if (e.x < bord) e.vx += 520 * dt;                    // il REJOINT le large en nageant
      e.x = U.clamp(e.x + e.vx * dt, 10, W - 10);
      e.y += e.vy * dt;
      const yF = World.floorY(e.x) - s * 0.5;
      if (e.y > yF) { e.y = yF; if (e.vy > 0) e.vy = 0; }
      const v = Math.hypot(e.vx, e.vy);
      if (e.y >= plafond - 1 && e.x >= bord && v < def.speed * 1.5 + 25) { this._finir(e, false); return; }
    }
    e.speedNow = Math.hypot(e.vx, e.vy);
  },

  // Rend la créature à `think`/`move`. `force` : le filet de sécurité a joué, on
  // la pose d'autorité sur la position valide la plus proche (jamais vu en
  // pratique : c'est un garde-fou contre le poisson échoué à vie).
  _finir(e, force) {
    if (force) {
      const [x, y] = this.positionSure(e);
      if (e.y < CONFIG.SURFACE_Y || y !== e.y) Particles.splash(x);
      e.x = x; e.y = y; e.vx = 0; e.vy = 0;
    }
    e._lache = null;
    e._sec = 0;
    e.state = 'wander'; e.stateTimer = 0;
    e.release();
    e.speedNow = Math.hypot(e.vx || 0, e.vy || 0);
  },

  // --- Rendu ------------------------------------------------------------------
  // Appelé par `Entity.draw` juste après la translation au centre de la
  // créature. Tenue : un halo (on voit qui on a en main) et un gigotement
  // HORIZONTAL — jamais vertical, c'est ce qui met un poisson la tête en bas
  // (cf. CLAUDE.md). Colosse : il secoue seulement la tête.
  deformer(ctx, e, t) {
    const s = e.size;
    if (e._saisi) {
      const R = s * 1.9 + 8;
      const g = ctx.createRadialGradient(0, 0, R * 0.25, 0, 0, R);
      g.addColorStop(0, 'rgba(215,242,255,0.30)');
      g.addColorStop(1, 'rgba(215,242,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      const k = Math.min(1, this._tenueT * 6);             // le gigotement monte en 0,17 s
      const amp = Math.max(0.8, s * 0.06) * (e.def.aerial ? 1.5 : 1) * k;
      ctx.translate(Math.sin(t * 38 + e.phase) * amp, 0);
      ctx.rotate(Math.sin(t * 19 + e.phase * 1.7) * 0.11 * k);
    } else {
      const k = U.clamp((e._secousseFin - t) / 0.9, 0, 1);
      ctx.translate(Math.sin(t * 30) * s * 0.025 * k, 0);
    }
  },
};
