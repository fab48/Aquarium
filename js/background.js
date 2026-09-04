// Décor : ciel, plage, colonne d'eau dégradée par profondeur, fond sableux,
// layers parallax (roches), god rays, plancton, cycle jour/nuit (GDD §2, §10).

// Les trois houles de la surface, du LOIN vers le PRÈS. `dy` les décale
// verticalement (la plus lointaine est un peu plus haute), `A`/`L` donnent
// l'amplitude et la longueur d'onde, `v` la vitesse, `a` l'opacité.
const HOULES = [
  { dy: -5, A1: 5.5, L1: 95, v1: 0.9, A2: 2.2, L2: 38, v2: 1.5, ph: 1.7, a: 0.22, w: 2 },
  { dy: -2, A1: 4.5, L1: 60, v1: 1.4, A2: 2.0, L2: 27, v2: 2.1, ph: 0.6, a: 0.34, w: 2.2 },
  { dy: 0,  A1: 4.0, L1: 60, v1: 1.8, A2: 2.0, L2: 23, v2: 2.6, ph: 0,   a: 0.5,  w: 2.5 },
];

const Background = {
  rocks: [],      // décor moyen-plan parallax
  plankton: [],

  flora: [],
  etoiles: [],
  nuages: [],
  filantes: [],

  // Largeur de la bande de ciel qui se reboucle (étoiles, nuages)
  CIEL_LARGEUR: 3200,

  init() {
    // Rochers ANGULEUX : un polygone irrégulier par rocher (rayon bruité autour
    // du centre), bien plus minéral que des galets arrondis.
    for (let i = 0; i < 260; i++) {
      const x = U.rand(World.shoreX, CONFIG.WORLD_WIDTH);
      // Éventail large : des cailloux jusqu'à de vrais blocs qui structurent le
      // fond. Un rocher sur cinq est un gros massif.
      const gros = Math.random() < 0.2;
      const w = gros ? U.rand(190, 420) : U.rand(30, 160);
      const h = gros ? U.rand(90, 210) : U.rand(20, 75);
      const n = U.randInt(5, 8);
      const pts = [];
      for (let k = 0; k < n; k++) {
        const a = Math.PI + (k / (n - 1)) * Math.PI;      // demi-tour : partie émergée
        const r = U.rand(0.62, 1);
        pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * U.rand(0.75, 1.15) });
      }
      this.rocks.push({
        x, bury: U.rand(0.15, 0.4),      // fraction enfoncée dans le sable
        w, h, pts,
        layer: U.pick([0.88, 0.94, 1, 1]),
        tint: U.rand(-0.1, 0.1),
      });
    }

    // Végétation : touffes d'algues et grandes laminaires, posées sur le fond
    for (let i = 0; i < 150; i++) {
      const x = U.rand(World.shoreX + 100, CONFIG.WORLD_WIDTH);
      const deep = World.depthAt(x) > 1700;
      // Les abysses restent nus : quelques bouquets de vers tubicoles autour des
      // sources chaudes, pas une prairie.
      if (deep && Math.random() > 0.4) continue;
      const kelp = !deep && Math.random() < 0.3;
      this.flora.push({
        x,
        kind: deep ? 'tube' : (kelp ? 'kelp' : 'weed'),
        h: deep ? U.rand(20, 42) : (kelp ? U.rand(90, 200) : U.rand(26, 65)),
        blades: deep ? U.randInt(2, 4) : U.randInt(3, 6),
        hue: U.rand(-18, 18),
        ph: Math.random() * 10,
        layer: U.pick([0.94, 1]),
      });
    }
    // Champ d'étoiles, réparti sur une bande de ciel qui se REBOUCLE (le monde
    // fait 8000 px, le ciel est à l'infini : on ne va pas semer des étoiles sur
    // 8000 px pour n'en voir qu'un écran).
    for (let i = 0; i < 220; i++) {
      this.etoiles.push({
        u: Math.random() * this.CIEL_LARGEUR,
        h: U.rand(40, 1000),                 // hauteur au-dessus de la ligne d'eau
        r: U.rand(0.7, 2.1),
        ph: Math.random() * 10,
        vive: Math.random() < 0.12,          // quelques-unes franchement brillantes
      });
    }
    for (let i = 0; i < 11; i++) {
      this.nuages.push({
        u: Math.random() * this.CIEL_LARGEUR,
        h: U.rand(330, 820),                 // ils occupent le HAUT du ciel
        w: U.rand(90, 230),
        bulles: U.randInt(3, 5),
        v: U.rand(2, 8),                     // dérive propre, px/s
        ph: Math.random() * 10,
        opacite: U.rand(0.3, 0.7),
      });
    }

    for (let i = 0; i < 160; i++) {
      this.plankton.push({
        x: U.rand(0, CONFIG.WORLD_WIDTH), y: U.rand(CONFIG.SURFACE_Y, CONFIG.SURFACE_Y + CONFIG.DEPTH_MAX),
        r: U.rand(0.8, 2.2), ph: Math.random() * 10,
      });
    }
  },

  // Positions x des éléments de décor, pour que les espèces s'y installent :
  // les étoiles sur les rochers, les hippocampes dans les herbiers (GDD §12).
  habitatSpots(kind) {
    if (kind === 'rock') return this.rocks.filter(r => r.layer === 1 && r.w > 60).map(r => r.x);
    if (kind === 'weed') return this.flora.filter(f => f.kind !== 'tube').map(f => f.x);
    return [];
  },

  // Hauteur de l'herbier le plus proche d'un x, en px au-dessus du sable.
  // L'hippocampe s'accroche AU BOUT des herbes : sans cette hauteur il
  // s'ancrait n'importe où dans la colonne d'eau (relevé : de 6 à 316 px
  // au-dessus du sol pour une herbe qui n'en fait que 27 à 192).
  hauteurHerbier(x) {
    let best = null, bestD = Infinity;
    for (const f of this.flora) {
      if (f.kind === 'tube') continue;
      const d = Math.abs(f.x - x);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best ? best.h : 90;
  },

  // Couleur de l'eau selon profondeur (px sous la surface) et nuit.
  // MÉMOÏSÉE en quantifiant profondeur (pas de 16 px) et nuit (1/40) : la
  // fonction faisait jusqu'à quatre mixColor par appel, pour des couleurs qui
  // ne dépendent que de la tranche d'eau et de l'heure. Les pas sont invisibles.
  _waterCache: new Map(),
  waterColor(depth, night) {
    const d = Math.max(0, Math.round(depth / 16) * 16);
    const ni = Math.round(night * 40);
    const key = d * 64 + ni;
    const hit = this._waterCache.get(key);
    if (hit) return hit;
    const nq = ni / 40;
    let c;
    if (d < 120) c = U.mixColor('#8fd8f5', '#5db8e8', d / 120);
    else if (d < 700) c = U.mixColor('#5db8e8', '#2a6b9e', (d - 120) / 580);
    else if (d < 1700) c = U.mixColor('#2a6b9e', '#123452', (d - 700) / 1000);
    else c = U.mixColor('#123452', '#040a14', Math.min(1, (d - 1700) / 900));
    if (nq > 0) c = U.mixColor(c.startsWith('rgb') ? this.rgbToHex(c) : c, '#020812', nq * 0.7);
    this._waterCache.set(key, c);
    return c;
  },

  rgbToHex(rgb) {
    const m = rgb.match(/\d+/g);
    return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('');
  },

  // ===========================================================================
  // LE CIEL : astres, étoiles, nuages, reflet sur l'eau.
  // ===========================================================================
  // Le ciel se résumait à un dégradé deux couleurs et à un disque de 24 px qui
  // changeait de teinte à minuit — le même objet servait de soleil ET de lune.
  // Ici ce sont deux astres distincts qui se relaient : le soleil parcourt la
  // première moitié du cycle, la lune la seconde.
  ciel(ctx, t, surfSy, cielH, W, H, night) {
    const jour = Main.dayT();
    const haut = surfSy - cielH;              // sommet du ciel à l'écran

    // --- Étoiles (elles se lèvent au crépuscule) ---
    if (night > 0.02) {
      const L = this.CIEL_LARGEUR;
      // Parallax très lent : le ciel est loin, mais pas peint sur la vitre.
      const decal = ((Camera.x * 0.05) % L + L) % L;
      for (const e of this.etoiles) {
        let sx = e.u - decal;
        if (sx < -60) sx += L;
        if (sx > W + 60) continue;
        const sy = surfSy - e.h * (cielH / 900);
        if (sy < haut - 40 || sy > surfSy) continue;
        // Scintillement : chacune a son rythme, sinon tout le ciel clignote ensemble
        const scint = 0.55 + 0.45 * Math.sin(t * (1.4 + e.ph * 0.3) + e.ph * 6);
        ctx.fillStyle = `rgba(255,252,235,${night * scint * (e.vive ? 0.95 : 0.6)})`;
        ctx.beginPath(); ctx.arc(sx, sy, e.r * (e.vive ? 1.4 : 1), 0, Math.PI * 2); ctx.fill();
        if (e.vive && scint > 0.9) {          // une croix de lumière sur les plus brillantes
          ctx.strokeStyle = `rgba(255,252,235,${night * 0.5})`;
          ctx.lineWidth = 0.8;
          const b = e.r * 4;
          ctx.beginPath();
          ctx.moveTo(sx - b, sy); ctx.lineTo(sx + b, sy);
          ctx.moveTo(sx, sy - b); ctx.lineTo(sx, sy + b);
          ctx.stroke();
        }
      }
      this.filante(ctx, t, surfSy, cielH, W, night);
    }

    // --- Les deux astres. `u` va de 0 (lever, à gauche) à 1 (coucher, à droite) ;
    // hors de [0,1] l'astre est sous l'horizon et n'est pas dessiné.
    const uSoleil = jour / 0.52;
    const uLune = (jour - 0.5) / 0.5;
    if (uSoleil >= -0.04 && uSoleil <= 1.04) this.astre(ctx, t, uSoleil, surfSy, cielH, W, true, night);
    if (uLune >= -0.04 && uLune <= 1.04) this.astre(ctx, t, uLune, surfSy, cielH, W, false, night);

    // --- Nuages, DEVANT les astres : c'est ce passage devant qui donne la
    // profondeur. Teintés par la couleur du bas du ciel.
    const teinte = this.skyColor();
    const L = this.CIEL_LARGEUR;
    for (const n of this.nuages) {
      const decal = ((Camera.x * 0.13 + t * n.v) % L + L) % L;
      let sx = n.u - decal;
      if (sx < -n.w * 2) sx += L;
      if (sx > W + n.w * 2 || sx < -n.w * 2) continue;
      const sy = surfSy - n.h * (cielH / 900);
      if (sy > surfSy + 20) continue;
      // Blancs le jour, gris-bleu la nuit, et toujours un peu de la couleur du ciel
      ctx.fillStyle = this.melange('#ffffff', teinte, 0.26 + night * 0.5);
      ctx.globalAlpha = n.opacite * (0.8 - night * 0.5);
      // UN SEUL TRACÉ pour tout le nuage. Rempli bulle par bulle, chaque
      // recouvrement cumulait l'alpha et le nuage se lisait comme une grappe de
      // ronds soudés — le défaut sautait aux yeux en plein ciel.
      ctx.beginPath();
      for (let i = 0; i < n.bulles; i++) {
        const f = i / (n.bulles - 1) - 0.5;
        const r = n.w * 0.3 * (1 - Math.abs(f) * 0.8) + n.w * 0.1;
        const cy = sy + Math.sin(f * 3 + n.ph) * n.w * 0.05 + Math.abs(f) * n.w * 0.05;
        ctx.moveTo(sx + f * n.w + r, cy);
        ctx.ellipse(sx + f * n.w, cy, r, r * 0.6, 0, 0, Math.PI * 2);
      }
      // Base plate : un nuage repose sur une ligne, il ne flotte pas en grappe
      ctx.moveTo(sx - n.w * 0.5, sy);
      ctx.ellipse(sx, sy + n.w * 0.02, n.w * 0.52, n.w * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  },

  // Un astre : disque, halo, et sa traînée scintillante sur l'eau.
  astre(ctx, t, u, surfSy, cielH, W, soleil, night) {
    // Arc de course. Il RASE l'horizon au lever et au coucher : c'est ça qui
    // rend le crépuscule lisible, plus encore que la couleur du ciel.
    const sx = W * (0.08 + 0.84 * u);
    const uc = U.clamp(u, 0, 1);
    const sy = surfSy - 26 - Math.sin(uc * Math.PI) * (cielH * 0.74);
    const bas = 1 - Math.sin(uc * Math.PI);      // 1 = à l'horizon
    const r = soleil ? 26 : 21;

    // Un soleil rasant vire à l'orange, une lune rasante au miel.
    const coeur = soleil ? this.melange('#fff6c0', '#ff8a4a', bas * 0.85)
                         : this.melange('#f4f2ff', '#ffd9a0', bas * 0.6);
    const halo = soleil ? this.melange('#ffd75e', '#ff6a3a', bas * 0.8) : '#bcd0ff';
    const eclat = soleil ? 1 : Math.max(0.35, night);

    // Halo radial : un aplat pur fait autocollant, c'est le halo qui fait l'astre.
    const rh = r * (soleil ? 6 : 4.2);
    const g = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, rh);
    g.addColorStop(0, this.rgba(halo, 0.5 * eclat));
    g.addColorStop(0.35, this.rgba(halo, 0.15 * eclat));
    g.addColorStop(1, this.rgba(halo, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(sx, sy, rh, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = coeur;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();

    if (soleil) {
      // Cœur plus clair, qui respire doucement
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(sx, sy, r * (0.55 + Math.sin(t * 0.9) * 0.04), 0, Math.PI * 2); ctx.fill();
    } else {
      // Cratères (toujours les mêmes : la lune ne se remaquille pas)
      ctx.fillStyle = 'rgba(150,158,190,0.45)';
      for (const c of [[-0.32, -0.22, 0.24], [0.24, 0.14, 0.19], [-0.1, 0.38, 0.14], [0.38, -0.34, 0.11]]) {
        ctx.beginPath(); ctx.arc(sx + c[0] * r, sy + c[1] * r, c[2] * r, 0, Math.PI * 2); ctx.fill();
      }
      // PHASES : une nouvelle chaque nuit, en huit temps. C'est le seul élément
      // du décor qui change d'un jour à l'autre — les enfants le remarquent.
      const phase = Math.floor(Main.time / CONFIG.DAY_LENGTH) % 8;
      if (phase !== 4) {                       // 4 = pleine lune, rien à masquer
        const k = (phase - 4) / 4;             // -1 → +1 (nouvelle lune aux extrêmes)
        ctx.save();
        ctx.beginPath(); ctx.arc(sx, sy, r + 0.5, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = this.rgba(this.skyColor(), 0.92);
        ctx.beginPath();
        ctx.arc(sx + k * r * 1.5, sy, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- Reflet sur l'eau : une colonne scintillante sous l'astre. C'est elle
    // qui raccroche le ciel à la mer ; sans elle l'astre flotte dans son coin.
    if (surfSy > -40 && surfSy < 4000 && u > 0.02 && u < 0.98) {
      const lueur = soleil ? '#fff0bc' : '#dfe9ff';
      // Plus l'astre est BAS, plus sa traînée est longue et lumineuse : c'est la
      // règle qui donne son heure au reflet. À intensité fixe il ne se voyait
      // pas du tout sur l'eau sombre de la nuit.
      const longueur = 80 + bas * 210;
      const force = eclat * (0.55 + bas * 0.45);
      for (let i = 0; i < 22; i++) {
        const d = i / 21;
        const y = surfSy + 2 + d * longueur;
        // Traits irréguliers : une colonne régulière fait rampe de lancement.
        const scint = 0.45 + 0.55 * Math.sin(t * 2.6 + i * 1.9) * Math.sin(t * 1.1 + i * 0.7);
        const largeur = r * (0.35 + d * 2.6) * (0.45 + 0.75 * Math.abs(scint));
        const a = (1 - d * 0.85) * 0.5 * force * (0.55 + 0.45 * Math.abs(scint));
        ctx.fillStyle = this.rgba(lueur, U.clamp(a, 0, 1));
        ctx.fillRect(sx - largeur / 2 + Math.sin(t * 1.5 + i * 2.3) * 9, y, largeur, longueur / 20);
      }
    }
  },

  // Étoile filante : rare, brève, jamais deux à la fois. Elle ne sert à rien —
  // c'est exactement pour ça qu'on la regarde.
  filante(ctx, t, surfSy, cielH, W, night) {
    if (!this._filante && Math.random() < 0.0018 * night) {
      this._filante = { x: U.rand(0.1, 0.9) * W, y: U.rand(0.15, 0.55), vie: 0,
                        dx: U.rand(0.5, 1) * (Math.random() < 0.5 ? -1 : 1) };
    }
    const f = this._filante;
    if (!f) return;
    f.vie += 0.02;
    if (f.vie > 1) { this._filante = null; return; }
    const sy = surfSy - cielH * (0.95 - f.y) + f.vie * cielH * 0.42;
    const sx = f.x + f.dx * f.vie * W * 0.3;
    const a = Math.sin(f.vie * Math.PI);
    ctx.strokeStyle = `rgba(255,255,240,${a * 0.9})`;
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - f.dx * 60, sy - 26);
    ctx.stroke();
  },

  rgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  },

  // Mélange deux couleurs hex et REND DU HEX (U.mixColor rend du `rgb(...)`,
  // qu'on ne peut pas remélanger ensuite).
  melange(a, b, k) { return this.rgbToHex(U.mixColor(a, b, U.clamp(k, 0, 1))); },

  // --- Le ciel ---------------------------------------------------------------
  // Une palette par MOMENT DE LA JOURNÉE, pas un simple fondu jour → nuit :
  // `Main.nightAmount()` ne distingue pas l'aube du crépuscule, et les deux
  // passaient donc par exactement le même bleu délavé. Ce sont pourtant les
  // deux plus beaux moments du cycle.
  CIEL: [
    { t: 0.00, haut: '#3a3f78', bas: '#f3a463' },   // aube : violet profond → orange
    { t: 0.10, haut: '#6ab6ea', bas: '#d8eefb' },   // matin clair
    { t: 0.30, haut: '#4fa8e8', bas: '#c2e8fb' },   // plein jour
    { t: 0.44, haut: '#4a90d4', bas: '#ffd9a3' },   // fin d'après-midi, lumière chaude
    { t: 0.52, haut: '#38306e', bas: '#f0784f' },   // crépuscule : le grand orange
    { t: 0.62, haut: '#0a1230', bas: '#1e2a4e' },   // nuit
    { t: 0.90, haut: '#0a1230', bas: '#2b3563' },   // nuit finissante
    { t: 1.00, haut: '#3a3f78', bas: '#f3a463' },   // boucle sur l'aube
  ],

  // Mémoïsé PAR FRAME : appelée une dizaine de fois par frame (dégradés,
  // nuages, phases de lune) pour un résultat qui ne dépend que de l'heure.
  skyColor(top = false) {
    if (this._skyMemoT !== Main.time) { this._skyMemoT = Main.time; this._skyHaut = null; this._skyBas = null; }
    if (top && this._skyHaut) return this._skyHaut;
    if (!top && this._skyBas) return this._skyBas;
    const P = this.CIEL, tt = Main.dayT();
    let i = 0;
    while (i < P.length - 2 && tt > P[i + 1].t) i++;
    const k = U.clamp((tt - P[i].t) / (P[i + 1].t - P[i].t), 0, 1);
    const cle = top ? 'haut' : 'bas';
    const c = this.melange(P[i][cle], P[i + 1][cle], k);
    if (top) this._skyHaut = c; else this._skyBas = c;
    return c;
  },

  // --- Dégradés plein écran PRÉ-RENDUS (PERFORMANCE.md §5.7) -----------------
  // Rasteriser un dégradé plein écran coûte 16 fois un aplat (8 ms mesurés en
  // rendu logiciel pour la seule colonne d'eau). Le dégradé est donc peint dans
  // une bande hors écran de 1 px de large puis ÉTIRÉ au drawImage : un
  // étirement de texture est un remplissage plat. La bande est refaite à
  // chaque frame (512 px, gratuit), donc aucun retard sur l'heure ni la
  // profondeur visible.
  _strips: {},
  stripFill(ctx, id, stops, x, y, w, h) {
    let s = this._strips[id];
    if (!s) {
      s = this._strips[id] = document.createElement('canvas');
      s.width = 1; s.height = 512;
      // willReadFrequently : la bande vit CÔTÉ CPU. Sans ça elle est
      // accélérée GPU, et sur une machine dont le canvas PRINCIPAL est en
      // rendu logiciel chaque drawImage force une relecture GPU→CPU de la
      // bande (mesuré : décor à 29 ms au lieu de 9). Sur une machine
      // accélérée, l'envoi CPU→GPU d'une bande de 1×512 est négligeable.
      // (Le garde-fou de PERFORMANCE.md — jamais willReadFrequently sur le
      // canvas principal — reste vrai : ici c'est un canvas hors écran.)
      s._ctx = s.getContext('2d', { willReadFrequently: true });
    }
    const g = s._ctx.createLinearGradient(0, 0, 0, 512);
    for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    s._ctx.fillStyle = g;
    s._ctx.fillRect(0, 0, 1, 512);
    ctx.drawImage(s, x, y, w, h);
  },

  draw(ctx, t) {
    const night = Main.nightAmount();
    const W = Camera.w, H = Camera.h;

    // --- Colonne d'eau : dégradé vertical selon la profondeur visible,
    // pré-rendu dans une bande étroite puis étiré (§5.7) ---
    const dTop = Camera.y - CONFIG.SURFACE_Y;
    const dBot = Camera.y + H - CONFIG.SURFACE_Y;
    const stops = [];
    for (let i = 0; i <= 4; i++) {
      const d = U.lerp(dTop, dBot, i / 4);
      stops.push([i / 4, d < 0 ? this.skyColor() : this.waterColor(d, night)]);
    }
    this.stripFill(ctx, 'eau', stops, 0, 0, W, H);

    // --- Ciel et ligne de surface ---
    const surfSy = Camera.sy(CONFIG.SURFACE_Y);
    if (surfSy > 0) {
      // Le ciel occupe TOUTE la hauteur visible au-dessus de l'eau, mais son
      // dégradé est calé sur une hauteur de ciel de référence : sinon, dès
      // qu'on remonte la caméra, le dégradé s'étire et le bas du ciel devient
      // uniformément pâle.
      const cielH = Math.max(240, Math.min(surfSy, H));
      const y0 = surfSy - cielH;
      // au-dessus du dégradé (caméra très haut) : la couleur du sommet du ciel
      if (y0 > 0) { ctx.fillStyle = this.skyColor(true); ctx.fillRect(0, 0, W, y0); }
      // hauteur pleine : le canvas rogne ce qui dépasse sous l'écran — réduire
      // la hauteur COMPRIMERAIT le dégradé au lieu de le rogner
      this.stripFill(ctx, 'ciel', [[0, this.skyColor(true)], [1, this.skyColor()]],
        0, y0, W, cielH);
      this.ciel(ctx, t, surfSy, cielH, W, H, night);
      // VAGUES EN TROIS COUCHES. Une seule ligne d'écume donnait une surface
      // plate, comme une vitre. Trois houles de longueurs, de vitesses et de
      // PROFONDEURS différentes suffisent à donner du relief : celle du fond
      // est plus haute, plus lente et plus pâle (elle est loin), celle du
      // devant plus basse, plus vive et plus contrastée.
      //
      // Le coût est trivial — trois polylignes de ~90 points contre une — et
      // c'est ce qui manquait le plus à la lecture de la surface.
      for (let c = 0; c < HOULES.length; c++) {
        const h = HOULES[c];
        ctx.strokeStyle = `rgba(255,255,255,${(h.a - night * h.a * 0.6).toFixed(3)})`;
        ctx.lineWidth = h.w;
        ctx.beginPath();
        for (let sx = 0; sx <= W; sx += 8) {
          const wx = sx + Camera.x;
          const y = surfSy + h.dy
                  + Math.sin(wx / h.L1 + t * h.v1 + h.ph) * h.A1
                  + Math.sin(wx / h.L2 - t * h.v2) * h.A2;
          sx === 0 ? ctx.moveTo(sx, y) : ctx.lineTo(sx, y);
        }
        ctx.stroke();
      }
    }

    // --- God rays (atténués avec la profondeur, GDD §2) ---
    // NB (§5.11, tenté puis ABANDONNÉ) : un rayon pré-rendu posé au drawImage
    // coûte 15 ms en rendu logiciel — un drawImage étiré n'est un remplissage
    // plat que s'il est OPAQUE ; avec de l'alpha (et en 'lighter'), Chrome
    // repasse par un blend par pixel bien plus cher que le dégradé d'origine
    // (1 ms). On garde donc les dégradés.
    const rayStrength = U.clamp(1 - dTop / 800, 0, 1) * (1 - night * 0.85);
    if (rayStrength > 0.02 && surfSy < H) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const rx = ((i * 337 + t * 12) % (W + 400)) - 200;
        const g = ctx.createLinearGradient(rx, Math.max(0, surfSy), rx + 180, H);
        g.addColorStop(0, `rgba(255,250,220,${0.07 * rayStrength})`);
        g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(rx, Math.max(0, surfSy));
        ctx.lineTo(rx + 70, Math.max(0, surfSy));
        ctx.lineTo(rx + 260, H); ctx.lineTo(rx + 60, H);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // --- Crêtes rocheuses d'arrière-plan (parallax lent, brumeuses) ---
    // Deux rubans qui suivent la forme du fond, échantillonnés à une position
    // parallax-décalée : elles glissent moins vite que le décor → profondeur.
    for (const ridge of [{ p: 0.35, up: 300, a: 0.16 }, { p: 0.6, up: 150, a: 0.26 }]) {
      ctx.beginPath();
      let began = false;
      for (let sx = -30; sx <= W + 30; sx += 40) {
        const wq = Camera.x * ridge.p + sx + ridge.p * 4000; // décalage pour varier le relief
        const fy = CONFIG.SURFACE_Y + World.depthAt(U.clamp(wq, 0, CONFIG.WORLD_WIDTH))
                 - ridge.up + Math.sin(wq / 190) * 45 + Math.sin(wq / 67) * 18;
        const py = fy - Camera.y;
        if (!began) { ctx.moveTo(sx, py); began = true; } else ctx.lineTo(sx, py);
      }
      ctx.lineTo(W + 30, H + 30); ctx.lineTo(-30, H + 30); ctx.closePath();
      // couleur : roche noyée dans la couleur d'eau locale (effet de brume)
      const midDepth = Camera.y + H * 0.7 - CONFIG.SURFACE_Y;
      const water = this.waterColor(Math.max(0, midDepth), night);
      const waterHex = water.startsWith('rgb') ? this.rgbToHex(water) : water;
      ctx.fillStyle = U.mixColor(waterHex, '#26303e', ridge.a * 0.55);
      ctx.fill();
    }

    // --- Rochers posés sur le fond ---
    // Dessinés AVANT le sable : celui-ci recouvre ensuite leur base, ce qui les
    // enfonce naturellement dans le sol. Deux points essentiels : la hauteur est
    // lue à la position RÉELLEMENT AFFICHÉE (sinon le décalage parallax les fait
    // flotter), et chaque rocher s'incline selon la pente locale.
    for (const r of this.rocks) {
      const px = r.x - Camera.x * r.layer;
      if (px < -250 || px > W + 250) continue;
      const wx = px + Camera.x;                       // x monde effectivement montré
      const floorWY = World.floorY(wx);
      const py = Camera.sy(floorWY + r.h * r.bury);
      if (py < -200 || py > H + 200) continue;
      const depth = floorWY - CONFIG.SURFACE_Y;
      const light = U.clamp(1 - depth / 2600, 0.2, 1) * (1 - night * 0.55);
      const wash = (1 - r.layer) * 3;                 // les plus lointains se noient dans l'eau
      const water = this.waterColor(Math.max(0, depth - 120), night);
      const waterHex = water.startsWith('rgb') ? this.rgbToHex(water) : water;
      const base = U.mixColor('#7d8b9c', '#414b59', U.clamp(1 - light + r.tint, 0, 1));
      const rockCol = U.mixColor(base.startsWith('rgb') ? this.rgbToHex(base) : base, waterHex, U.clamp(wash, 0, 0.6));

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan(World.slopeAt(wx)));       // couché dans le sens de la pente
      // silhouette anguleuse
      ctx.fillStyle = rockCol;
      ctx.beginPath();
      ctx.moveTo(r.pts[0].x * r.w, r.pts[0].y * r.h);
      for (let k = 1; k < r.pts.length; k++) ctx.lineTo(r.pts[k].x * r.w, r.pts[k].y * r.h);
      ctx.lineTo(r.w * 0.9, r.h * 0.5);
      ctx.lineTo(-r.w * 0.9, r.h * 0.5);
      ctx.closePath();
      ctx.fill();
      // facette éclairée : la moitié gauche du polygone, plus claire (arête nette)
      if (light > 0.22) {
        ctx.fillStyle = `rgba(220,236,252,${0.14 * light})`;
        ctx.beginPath();
        const half = Math.ceil(r.pts.length / 2);
        ctx.moveTo(r.pts[0].x * r.w, r.pts[0].y * r.h);
        for (let k = 1; k <= half; k++) ctx.lineTo(r.pts[k].x * r.w, r.pts[k].y * r.h);
        ctx.lineTo(r.pts[0].x * r.w * 0.35, r.h * 0.4);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    // --- Fond sableux (dégradé selon la profondeur : clair en haut, sombre au fond) ---
    // Le CONTOUR du fond est échantillonné UNE seule fois par frame (§5.8) :
    // le remplissage, les trois passes de modelé et les cinq rides le
    // reparcouraient neuf fois (1 121 lineTo, autant de floorY + toScreen).
    const PAS = 24;
    const nC = Math.floor((W + 60) / PAS) + 1;
    let cfy = this._contourY;
    if (!cfy || cfy.length < nC) cfy = this._contourY = new Float32Array(nC + 8);
    for (let i = 0; i < nC; i++) cfy[i] = World.floorY(-30 + i * PAS + Camera.x) - Camera.y;

    ctx.beginPath();
    ctx.moveTo(-30, cfy[0]);
    for (let i = 1; i < nC; i++) ctx.lineTo(-30 + i * PAS, cfy[i]);
    ctx.lineTo(W + 30, H + 20); ctx.lineTo(-30, H + 20);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    // Dégradé de sable pré-rendu et étiré, comme la colonne d'eau (§5.7) —
    // le clip le limite à la zone de sable.
    const sandStops = [];
    for (let i = 0; i <= 4; i++) {
      const d = U.lerp(dTop, dBot, i / 4);
      sandStops.push([i / 4, U.mixColor('#e0cb98', '#3a3428',
        U.clamp(Math.max(0, d) / 3000 + night * 0.35, 0, 0.9))]);
    }
    this.stripFill(ctx, 'sable', sandStops, 0, 0, W, H);

    // Modelé du sable : une bande sombre au contact de l'eau (ombre portée du
    // relief) puis un éclaircissement vers le bas. Sans ça le sable est un
    // aplat mort qui écrase la lecture de la profondeur.
    // Le modelé SUIT le contour du fond (traits épais superposés) : des bandes
    // verticales colonne par colonne laissaient des rayures visibles.
    // NB (§5.10, tenté puis ABANDONNÉ) : les peindre au quart de résolution
    // dans un canvas hors écran coûtait 15 ms — le drawImage d'upscale AVEC
    // alpha repasse par un blend par pixel en rendu logiciel, plus cher que
    // les trois traits eux-mêmes. Ils restent donc dessinés en direct, mais
    // sur le contour partagé (§5.8).
    ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
    const contour = (offset) => {
      ctx.beginPath();
      ctx.moveTo(-30, cfy[0] + offset);
      for (let i = 1; i < nC; i++) ctx.lineTo(-30 + i * PAS, cfy[i] + offset);
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(38,50,64,0.06)'; ctx.lineWidth = 300; contour(150);
    ctx.strokeStyle = 'rgba(38,50,64,0.09)'; ctx.lineWidth = 90;  contour(45);
    ctx.strokeStyle = 'rgba(38,50,64,0.13)'; ctx.lineWidth = 26;  contour(13);
    // ondulations de sable, très discrètes (fines : elles restent en pleine
    // résolution, leur coût est négligeable)
    ctx.strokeStyle = 'rgba(120,100,66,0.09)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      for (let i = 0; i < nC; i++) {
        const sx = -30 + i * PAS;
        const yy = cfy[i] + 70 + k * 95 + Math.sin((sx + Camera.x) / 130 + k) * 16;
        i === 0 ? ctx.moveTo(sx, yy) : ctx.lineTo(sx, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    // --- Écume au rivage : là où le sable croise la ligne d'eau ---
    if (Camera.x < World.shoreX + 400) {
      const shoreWX = World.shoreX;
      {
        // L'écume appartient à L'EAU : elle court le long de la ligne de
        // flottaison depuis le rivage vers le large, en ondulant comme les
        // vagues. (Elle suivait le sable, donc elle grimpait sur la plage.)
        const wash = Math.sin(t * 0.9) * 34;
        const x0 = shoreWX + wash;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = `rgba(255,255,255,${(pass ? 0.35 : 0.8) - night * 0.4})`;
          ctx.lineWidth = pass ? 3 : 5.5;
          ctx.beginPath();
          for (let k = 0; k <= 14; k++) {
            const wx = x0 + k * 26 + pass * 40;
            const wy = CONFIG.SURFACE_Y
              + Math.sin(wx / 60 + t * 1.8) * 4 + Math.sin(wx / 23 - t * 2.6) * 2
              + Math.sin(t * 2.2 + k * 0.6) * 1.5;
            const ex = Camera.sx(wx), ey = Camera.sy(wy);
            k === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
          }
          ctx.stroke();
        }

        // LE RESSAC. Trois langues d'eau qui montent sur le sable et
        // redescendent, décalées dans le temps. C'est le seul endroit du jeu
        // où l'eau BOUGE par rapport à la terre, et sans lui la plage est une
        // découpe nette qui ne respire pas.
        //
        // Chaque langue suit le SABLE (pas la ligne d'eau) : elle glisse sur
        // la pente, s'amincit en montant, et laisse une frange d'écume à sa
        // crête. La phase de chacune est décalée d'un tiers de cycle, sinon
        // les trois montent et descendent ensemble comme un seul bloc.
        for (let l = 0; l < 3; l++) {
          const ph = t * 0.55 + l * (Math.PI * 2 / 3);
          const monte = (Math.sin(ph) + 1) / 2;          // 0 = retirée, 1 = au plus haut
          const portee = 90 + l * 55;
          const haut = shoreWX - portee * monte;         // le sable est à GAUCHE du rivage
          const bas = shoreWX + 120;
          // Nappe d'eau translucide entre la crête et la mer
          ctx.fillStyle = `rgba(180,225,245,${(0.3 * monte * (1 - night * 0.5)).toFixed(3)})`;
          ctx.beginPath();
          for (let k = 0; k <= 10; k++) {
            const wx = U.lerp(haut, bas, k / 10);
            const wy = World.floorY(wx) - 2;
            const ex = Camera.sx(wx), ey = Camera.sy(wy);
            k === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
          }
          for (let k = 10; k >= 0; k--) {
            const wx = U.lerp(haut, bas, k / 10);
            ctx.lineTo(Camera.sx(wx), Camera.sy(World.floorY(wx) + 3 + k * 1.4));
          }
          ctx.closePath(); ctx.fill();
          // Frange d'écume à la crête : c'est elle qui se voit vraiment
          ctx.strokeStyle = `rgba(255,255,255,${(0.7 * monte * (1 - night * 0.45)).toFixed(3)})`;
          ctx.lineWidth = 2 + monte * 2;
          ctx.beginPath();
          for (let k = 0; k <= 7; k++) {
            const wx = haut + k * 9 + Math.sin(t * 3 + k + l) * 3;
            const wy = World.floorY(wx) - 2 + Math.sin(t * 4 + k * 1.3) * 1.6;
            const ex = Camera.sx(wx), ey = Camera.sy(wy);
            k === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey);
          }
          ctx.stroke();
        }
      }
    }

    // --- Végétation (après le sable : elle pousse dessus, pas dedans) ---
    for (const f of this.flora) {
      const px = f.x - Camera.x * f.layer;
      if (px < -120 || px > W + 120) continue;
      const wx = px + Camera.x;
      const floorWY = World.floorY(wx);
      const py = Camera.sy(floorWY - 2);
      if (py < -260 || py > H + 60) continue;
      const depth = floorWY - CONFIG.SURFACE_Y;
      const light = U.clamp(1 - depth / 2400, 0.22, 1) * (1 - night * 0.6);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(Math.atan(World.slopeAt(wx)));   // pousse perpendiculairement au sol

      if (f.kind === 'tube') {
        // Vers tubicoles des sources chaudes : tiges pâles à pointe rouge
        for (let b = 0; b < f.blades; b++) {
          const bx = (b - (f.blades - 1) / 2) * 7;
          const h = f.h * (0.65 + 0.35 * Math.sin(b * 2.1 + f.ph));
          const sway = Math.sin(t * 0.8 + f.ph + b) * 3;
          ctx.strokeStyle = `rgba(226,222,214,${0.5 + light * 0.4})`;
          ctx.lineWidth = 4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(bx, 0);
          ctx.quadraticCurveTo(bx + sway * 0.5, -h * 0.6, bx + sway, -h); ctx.stroke();
          ctx.strokeStyle = `rgba(214,74,84,${0.6 + light * 0.3})`;
          ctx.lineWidth = 4.5;
          ctx.beginPath(); ctx.moveTo(bx + sway * 0.86, -h * 0.86); ctx.lineTo(bx + sway, -h); ctx.stroke();
        }
      } else {
        const g = f.kind === 'kelp' ? 118 : 150;
        ctx.strokeStyle = `rgba(${52 + f.hue},${(g + light * 45) | 0},${72 + f.hue},${0.45 + light * 0.45})`;
        ctx.lineCap = 'round';
        for (let b = 0; b < f.blades; b++) {
          const bx = (b - (f.blades - 1) / 2) * (f.kind === 'kelp' ? 11 : 6);
          const h = f.h * (0.6 + 0.4 * Math.abs(Math.sin(b * 1.7 + f.ph)));
          const sway = Math.sin(t * 1.1 + f.ph + b * 0.7) * (f.kind === 'kelp' ? 22 : 8);
          ctx.lineWidth = f.kind === 'kelp' ? 5 : 3;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.bezierCurveTo(bx + sway * 0.2, -h * 0.4, bx + sway * 0.7, -h * 0.7, bx + sway, -h);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // --- Cheminées volcaniques des grands fonds ---
    for (let i = 0; i < 9; i++) {
      const wx = 4600 + i * 380;
      const floorWY = World.floorY(wx);
      if (floorWY - CONFIG.SURFACE_Y < 1700) continue;
      const sx = Camera.sx(wx), sy = Camera.sy(floorWY);
      if (sx < -140 || sx > W + 140) continue;
      const hgt = 70 + ((i * 37) % 60);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan(World.slopeAt(wx)));
      // cône irrégulier, base large, empilement de roche sombre
      ctx.fillStyle = '#241d28';
      ctx.beginPath();
      ctx.moveTo(-34, 6);
      ctx.quadraticCurveTo(-20, -hgt * 0.55, -11, -hgt);
      ctx.lineTo(11, -hgt);
      ctx.quadraticCurveTo(22, -hgt * 0.5, 36, 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2f3c';
      ctx.beginPath();
      ctx.ellipse(0, -hgt, 12, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      // lueur de la bouche
      ctx.fillStyle = `rgba(255,138,74,${0.45 + Math.sin(t * 2 + i) * 0.12})`;
      ctx.beginPath(); ctx.ellipse(0, -hgt, 7, 2.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      if (Math.random() < 0.05) Particles.bubble(wx, floorWY - hgt - 6, U.rand(2, 5));
    }

    // --- Plancton / particules en suspension ---
    ctx.fillStyle = `rgba(255,255,240,${0.25 - night * 0.1})`;
    for (const p of this.plankton) {
      if (!Camera.isVisible(p.x, p.y, 20)) continue;
      const sx = Camera.sx(p.x), sy = Camera.sy(p.y + Math.sin(t * 0.5 + p.ph) * 8);
      ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
    }
  },

};
