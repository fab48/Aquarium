// LE SON — synthèse Web Audio PROCÉDURALE : zéro fichier, zéro dépendance,
// comme les silhouettes. Chaque son est une recette de quelques oscillateurs
// et d'un bruit filtré, jouée au moment où la scène la demande. La liste et
// les règles sont dans SONS.md ; ce fichier les applique.
//
// Les règles qui comptent plus que les recettes :
//   1. CE QUI FOISONNE RESTE MUET. Un son par bulle de BD, jamais un par
//      particule : bulles, sable, ZzZ, cœurs, peurs (« ! ») sont silencieux.
//   2. HORS CHAMP = SILENCE. Une source hors de la vue ne joue pas ; dans la
//      vue, elle est panoramiquée et atténuée vers les bords et au dézoom.
//   3. LE GABARIT DONNE LA HAUTEUR : le même son, plus grave pour un gros.
//   4. JAMAIS DEUX FOIS PAREIL : ±8 % de hauteur et de durée.
//   5. BUDGET : huit voix au plus, et un délai par TYPE de son.
//   6. SOUS L'EAU, C'EST ÉTOUFFÉ : un passe-bas suit la profondeur de la vue ;
//      ce qui se passe en l'air (oiseaux, surface) reste net.
//   7. 🔇 dans le HUD, et rien avant le premier geste (règle des navigateurs).
//
// Socle navigateur du jeu, Safari 13.1 : `webkitAudioContext`, pas de
// `StereoPannerNode` (repli sur un `PannerNode` à puissance constante), et
// jamais de rampe exponentielle vers 0 (elle lève une exception).
//
// Le compteur `Son.compte` avance même sans contexte audio : c'est ce que lit
// le banc d'essai pour tenir le budget de sons, sans haut-parleur.

const Son = {
  ctx: null,
  actif: true,              // réglage du joueur (🔇), retenu dans localStorage
  VOIX_MAX: 8,
  _voix: [],                // instants de fin des voix en cours
  _dernier: {},             // dernier déclenchement, par type
  compte: {},               // déclenchements par type (lu par le banc)
  _tAmb: 0,
  CLE: 'aquarium.son',

  // --- Mise en route ----------------------------------------------------------
  init() {
    try { this.actif = localStorage.getItem(this.CLE) !== '0'; } catch (e) { /* mode privé */ }
    const btn = this.btn = document.getElementById('son-btn');
    if (btn) {
      btn.addEventListener('click', (ev) => { ev.stopPropagation(); this.basculer(); });
      btn.addEventListener('pointerdown', ev => ev.stopPropagation());
      this.majBouton();
    }
    // Rien ne joue avant un geste : le premier, quel qu'il soit, débloque.
    const go = () => { this.debloquer(); };
    for (const t of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(t, go, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else if (this.actif) this.ctx.resume().catch(() => {});
    });
  },

  debloquer() {
    if (this.ctx) { if (this.actif && this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let c;
    try { c = this.ctx = new AC(); } catch (e) { return; }
    // La chaîne : voix → (eau | air) → général → limiteur → sortie. Le
    // limiteur évite qu'une explosion par-dessus une charge sature.
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -14; lim.knee.value = 10; lim.ratio.value = 8;
    lim.attack.value = 0.003; lim.release.value = 0.2;
    lim.connect(c.destination);
    this.general = c.createGain(); this.general.gain.value = this.actif ? 0.8 : 0;
    this.general.connect(lim);
    this.eau = c.createBiquadFilter(); this.eau.type = 'lowpass'; this.eau.frequency.value = 2400; this.eau.Q.value = 0.5;
    this.eau.connect(this.general);
    this.air = c.createGain(); this.air.connect(this.general);
    this.amb = c.createGain(); this.amb.gain.value = 0; this.amb.connect(this.general);
    this.bruits();
    // iOS ne débloque qu'un son DÉMARRÉ pendant le geste : un silence suffit.
    const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);
    if (c.state === 'suspended' && this.actif) c.resume().catch(() => {});
    this.ambiance();
  },

  // Deux bruits partagés, générés une fois : chaque son en lit un morceau à un
  // décalage aléatoire, plutôt que d'en fabriquer un à chaque fois. Appelé
  // aussi par sons.html, sur son propre contexte (rendu hors ligne compris).
  // Le bruit brun est une marche aléatoire : sa crête dépend du tirage (de 1 à
  // plus de 3 avant normalisation), et un BOUM tiré au mauvais moment saturait.
  // Il est ramené à une crête fixe.
  bruits() {
    this._blanc = this.tampon(2, () => Math.random() * 2 - 1);
    let v = 0;
    this._brun = this.tampon(6, () => (v = (v + (Math.random() * 2 - 1) * 0.02) * 0.998));
    const d = this._brun.getChannelData(0);
    let m = 1e-6;
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    for (let i = 0; i < d.length; i++) d[i] *= 0.95 / m;
  },

  tampon(sec, f) {
    const c = this.ctx, n = Math.ceil(c.sampleRate * sec);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = f(i);
    return b;
  },

  basculer() {
    this.actif = !this.actif;
    try { localStorage.setItem(this.CLE, this.actif ? '1' : '0'); } catch (e) { /* quota, mode privé */ }
    this.debloquer();
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.general.gain.cancelScheduledValues(t);
      this.general.gain.setTargetAtTime(this.actif ? 0.8 : 0, t, 0.05);
      if (this.actif) this.ctx.resume().catch(() => {});
    }
    this.majBouton();
  },

  majBouton() {
    if (!this.btn) return;
    this.btn.textContent = this.actif ? '🔊' : '🔇';
    this.btn.title = this.actif ? 'Couper le son' : 'Remettre le son';
  },

  // --- Jouer -------------------------------------------------------------------
  // `nom` : une recette de `R`. (x, y) : la source, en coordonnées monde.
  // `taille` : celle de l'émetteur, qui donne la hauteur (règle 3).
  jouer(nom, x, y, taille = 30, o = {}) {
    const r = this.R[nom];
    if (!r) return;
    // Hors champ = silence (règle 2). `Camera.isVisible` : le banc le force à
    // vrai pour compter la borne haute.
    if (x != null && !Camera.isVisible(x, y, 40)) return;
    if (r.zoomMin && Camera.zoom < r.zoomMin) return;
    const now = Main.time;
    if (now - (this._dernier[nom] ?? -1e9) < (r.cd ?? 0.12)) return;
    this._dernier[nom] = now;
    if (r.etouffe) this._dernier[r.etouffe] = now;
    this.compte[nom] = (this.compte[nom] || 0) + 1;
    const c = this.ctx;
    if (!c || !this.actif || c.state !== 'running') return;
    const t0 = c.currentTime + 0.01;
    this._voix = this._voix.filter(f => f > t0);
    if (this._voix.length >= this.VOIX_MAX) return;
    // Hauteur : le gabarit, puis ±8 % (règle 4). Durée : ±8 % aussi.
    const h = U.clamp(Math.pow(30 / Math.max(4, taille), 0.4), 0.45, 1.9) * U.rand(0.92, 1.08) * (o.h || 1);
    const d = U.rand(0.92, 1.08) * (o.d || 1);
    // Panoramique et atténuation selon la place dans la vue.
    let pan = 0, g = r.vol ?? 0.5;
    if (x != null) {
      const sx = (x - Camera.x) / Math.max(1, Camera.w), sy = (y - Camera.y) / Math.max(1, Camera.h);
      pan = U.clamp(sx * 2 - 1, -1, 1) * 0.75;
      const ecart = Math.min(1, Math.hypot(sx - 0.5, sy - 0.5) * 2);
      g *= (1 - 0.35 * ecart) * (0.55 + 0.45 * Math.min(1, Camera.zoom));
    }
    const sortie = c.createGain(); sortie.gain.value = g * (o.vol || 1);
    const enAir = r.air || (y != null && y < CONFIG.SURFACE_Y + 12);
    this.panner(sortie, pan).connect(enAir ? this.air : this.eau);
    const duree = r.f(this, sortie, t0, { h, d, k: o.k ?? 1 }) || 1;
    this._voix.push(t0 + duree);
  },

  panner(src, pan) {
    const c = this.ctx;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; src.connect(p); return p; }
    const p = c.createPanner(); p.panningModel = 'equalpower';
    p.setPosition(pan, 0, 1 - Math.abs(pan));
    src.connect(p); return p;
  },

  // Les BULLES DE BD : le son EST la bulle (SONS.md, P2). Appelé par
  // `Particles.shout` et `Particles.comic` ; tout ce qui n'est pas dans la
  // table reste muet — c'est la règle 1.
  BULLES: {
    'PROUT !': 'prout', 'BOUH !': 'bouh', 'ha': 'rire', 'VROUUUM': 'vroum', 'FIOUUU': 'fiou',
    'ECHOOO': 'echo', '3': 'bip3', '2': 'bip2', '1': 'bip1', 'PTUI !': 'ptui', 'TOC !': 'toc',
    'PSCHIII': 'pschiii', 'BOUM !': 'boum', 'BUUURP': 'burp', 'SUPER !': 'super',
    'WOUHOU !': 'wouhou', 'BONK !': 'bonk', 'HÉ !': 'he', 'TROP LOURD !': 'lourd',
    '💦': 'whiff', '🦷': 'tink', '🪥': 'brosse', '🚨': 'sirene', '😈': 'goeland',
    '🐚': 'coquille', '🎢': 'ventouse', '♪': 'harpe', '○': 'glouglou', '🌿': 'hmpf',
  },
  bulle(texte, x, y, taille) {
    const nom = this.BULLES[texte];
    if (nom) this.jouer(nom, x, y, taille);
  },

  // --- Briques des recettes ----------------------------------------------------
  env(t0, a, tenue, chute, crete) {
    const g = this.ctx.createGain(), p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.exponentialRampToValueAtTime(Math.max(0.0002, crete), t0 + a);
    p.setValueAtTime(Math.max(0.0002, crete), t0 + a + tenue);
    p.exponentialRampToValueAtTime(0.0001, t0 + a + tenue + chute);
    return g;
  },
  // Un oscillateur qui glisse de f0 à f1 sur `d`, enveloppé.
  osc(out, t0, type, f0, f1, d, crete, a = 0.005, tenue = 0) {
    const c = this.ctx, o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    const e = this.env(t0, a, tenue, Math.max(0.01, d - a - tenue), crete);
    o.connect(e).connect(out);
    o.start(t0); o.stop(t0 + d + 0.05);
    return o;
  },
  // Un bruit filtré, dont la fréquence du filtre glisse de f0 à f1.
  bruit(out, t0, d, type, f0, f1, q, crete, a = 0.004, tenue = 0, brun = false) {
    const c = this.ctx, b = brun ? this._brun : this._blanc;
    const s = c.createBufferSource(); s.buffer = b; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    const e = this.env(t0, a, tenue, Math.max(0.01, d - a - tenue), crete);
    s.connect(f).connect(e).connect(out);
    s.start(t0, Math.random() * (b.duration - 0.1)); s.stop(t0 + d + 0.05);
    return f;
  },
  // Une voix : une dent de scie passée dans des FORMANTS (les voyelles).
  voix(out, t0, f0, f1, d, formants, crete, vib = 0) {
    const c = this.ctx, o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    let l;
    if (vib) {
      l = c.createOscillator(); l.frequency.value = 5.5;
      const lg = c.createGain(); lg.gain.value = vib; l.connect(lg).connect(o.frequency);
      l.start(t0); l.stop(t0 + d + 0.05);
    }
    const e = this.env(t0, Math.min(0.06, d * 0.2), d * 0.4, d * 0.4, crete);
    for (const [ff, q, g, ff1] of formants) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      bp.frequency.setValueAtTime(ff, t0);
      if (ff1) bp.frequency.linearRampToValueAtTime(ff1, t0 + d);
      const gg = c.createGain(); gg.gain.value = g;
      o.connect(bp).connect(gg).connect(e);
    }
    e.connect(out);
    o.start(t0); o.stop(t0 + d + 0.05);
  },

  // --- Les recettes ------------------------------------------------------------
  // f(S, sortie, t0, { h: hauteur, d: durée, k }) → durée totale (budget de voix).
  // cd : délai minimal entre deux sons du même type (règle 5) ; vol : niveau.
  R: {
    // P1 — LE JOUEUR. Courts, doux : ce sont les plus fréquents.
    plic: { cd: 0.06, vol: 0.45, etouffe: 'plouf', f(S, o, t, p) {
      // Une goutte. L'attaque à 6 ms évite le clic d'un sinus qui démarre sec.
      S.osc(o, t, 'sine', 900 * p.h, 1600 * p.h, 0.09, 0.6, 0.006);
      return 0.12;
    } },
    carillon: { cd: 0.3, vol: 0.35, f(S, o, t, p) {
      // La graine FAVORITE : deux notes qui montent, timbre de cloche.
      for (const [i, f] of [[0, 1320], [1, 1760]]) {
        S.osc(o, t + i * 0.09, 'sine', f * p.h, f * p.h, 0.55, 0.5, 0.004);
        S.osc(o, t + i * 0.09, 'sine', f * 2.76 * p.h, f * 2.76 * p.h, 0.25, 0.12, 0.003);
      }
      return 0.7;
    } },
    bloup: { cd: 0.07, vol: 0.18, f(S, o, t, p) {
      const f = U.rand(300, 700) * p.h;
      S.osc(o, t, 'sine', f, f * 1.8, 0.07, 0.5, 0.004);
      return 0.09;
    } },
    remous: { cd: 0.5, vol: 0.22, f(S, o, t, p) {
      S.bruit(o, t, 0.35 * p.d, 'bandpass', 400, 1300, 1.2, 1.6, 0.04);
      return 0.4;
    } },
    pop: { cd: 0.2, vol: 0.45, f(S, o, t, p) {
      // La prise en main : un « pop » de ventouse.
      S.osc(o, t, 'sine', 520 * p.h, 150 * p.h, 0.07, 0.8, 0.002);
      S.bruit(o, t, 0.02, 'highpass', 2500, 2500, 0.7, 0.3, 0.001);
      return 0.1;
    } },
    he: { cd: 0.4, vol: 0.4, air: true, f(S, o, t, p) {
      S.voix(o, t, 900 * p.h, 1300 * p.h, 0.16, [[1800, 4, 2], [2600, 6, 1]], 0.7);
      return 0.2;
    } },
    lourd: { cd: 0.8, vol: 0.45, f(S, o, t, p) {
      // « Hnnngh » : un effort grave qui tremble, et qui renonce.
      S.voix(o, t, 120 * p.h, 85 * p.h, 0.55 * p.d, [[420, 5, 2.4], [900, 6, 0.8]], 0.8, 9);
      return 0.6;
    } },
    // Les sauteurs éclaboussent sans arrêt : un plouf toutes les 2,5 s au plus.
    plouf: { cd: 2.5, vol: 0.28, f(S, o, t, p) {
      S.bruit(o, t, 0.28 * p.d, 'bandpass', 1400 * p.h, 300 * p.h, 1.4, 0.7, 0.003);
      S.osc(o, t, 'sine', 190 * p.h, 60 * p.h, 0.16, 0.6, 0.004);
      return 0.32;
    } },

    // P2 — LES BRUYANTES. Rares par construction : elles ont du caractère.
    prout: { cd: 1, vol: 0.6, f(S, o, t, p) {
      const c = S.ctx, D = 0.75 * p.d, h = p.h;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
      lp.frequency.setValueAtTime(420, t); lp.frequency.linearRampToValueAtTime(220, t + D);
      const saw = c.createOscillator(); saw.type = 'sawtooth';
      saw.frequency.setValueAtTime(95 * h, t);
      saw.frequency.linearRampToValueAtTime(80 * h, t + D * 0.7);
      saw.frequency.exponentialRampToValueAtTime(48 * h, t + D);      // le glissando final
      const am = c.createGain(); am.gain.value = 0.55;
      const lfo = c.createOscillator();
      lfo.frequency.setValueAtTime(26, t); lfo.frequency.linearRampToValueAtTime(14, t + D);  // les « brrr » s'espacent
      const lg = c.createGain(); lg.gain.value = 0.45; lfo.connect(lg).connect(am.gain);
      const e = S.env(t, 0.02, D * 0.6, D * 0.4, 0.9);
      saw.connect(am).connect(lp).connect(e).connect(o);
      S.bruit(am, t, D, 'lowpass', 600, 300, 0.5, 0.35);
      for (const n of [saw, lfo]) { n.start(t); n.stop(t + D + 0.1); }
      return D + 0.1;
    } },
    bouh: { cd: 1, vol: 0.6, f(S, o, t, p) {
      // Une voix grave, formant « O », qui monte puis retombe.
      S.voix(o, t, 150 * p.h, 105 * p.h, 0.6 * p.d, [[450, 6, 3], [800, 7, 1.5], [2600, 10, 0.25]], 1, 4 * p.h);
      return 0.65;
    } },
    rire: { cd: 1.2, vol: 0.4, f(S, o, t, p) {
      // « ha ha ha » : quatre « a » brefs qui descendent.
      for (let i = 0; i < 4; i++) {
        const f = (330 - i * 22) * p.h;
        S.voix(o, t + i * 0.12, f, f * 0.85, 0.08, [[800, 5, 2.2], [1250, 6, 1.4]], 0.8);
      }
      return 0.55;
    } },
    vroum: { cd: 1.2, vol: 0.5, f(S, o, t, p) {
      // Un moteur qui monte en régime, vibrato compris.
      const c = S.ctx, D = 1.2 * p.d;
      const s = c.createOscillator(); s.type = 'sawtooth';
      s.frequency.setValueAtTime(60 * p.h, t); s.frequency.exponentialRampToValueAtTime(190 * p.h, t + D * 0.75);
      const v = c.createOscillator(); v.frequency.value = 7; const vg = c.createGain(); vg.gain.value = 9 * p.h;
      v.connect(vg).connect(s.frequency);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const e = S.env(t, 0.08, D * 0.5, D * 0.4, 0.7);
      s.connect(lp).connect(e).connect(o);
      for (const n of [s, v]) { n.start(t); n.stop(t + D + 0.05); }
      return D;
    } },
    fiou: { cd: 1.2, vol: 0.45, f(S, o, t, p) {
      // Un sifflement qui descend : la flèche passe.
      S.bruit(o, t, 0.9 * p.d, 'bandpass', 3200, 600, 8, 0.9, 0.03);
      S.osc(o, t, 'sine', 1900 * p.h, 700 * p.h, 0.85 * p.d, 0.25, 0.03);
      return 0.95;
    } },
    whoosh: { cd: 0.8, vol: 0.4, f(S, o, t, p) {
      // La torpille du Barracuda : un whoosh seul, plus sec que le thon.
      S.bruit(o, t, 0.4 * p.d, 'bandpass', 1500, 380, 2, 1.6, 0.02);
      return 0.45;
    } },
    echo: { cd: 2, vol: 0.5, f(S, o, t, p) {
      // L'appel, puis ses échos qui s'éloignent et s'étouffent : l'onde voyage.
      for (let i = 0; i < 4; i++) {
        const g = 0.9 * Math.pow(0.5, i), dt = i * 0.28;
        const c = S.ctx, lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.value = 3000 / (1 + i * 0.9); lp.connect(o);
        S.voix(lp, t + dt, 420 * p.h, 760 * p.h, 0.75 * p.d, [[700, 4, 2], [1100, 5, 1]], g, 6);
      }
      return 1.7;
    } },
    bip3: { cd: 0.2, vol: 0.35, f(S, o, t, p) { S.osc(o, t, 'sine', 880, 880, 0.1, 0.6, 0.004); return 0.12; } },
    bip2: { cd: 0.2, vol: 0.35, f(S, o, t, p) { S.osc(o, t, 'sine', 988, 988, 0.1, 0.6, 0.004); return 0.12; } },
    bip1: { cd: 0.2, vol: 0.35, f(S, o, t, p) { S.osc(o, t, 'sine', 1175, 1175, 0.14, 0.6, 0.004); return 0.16; } },
    fusee: { cd: 1, vol: 0.5, f(S, o, t, p) {
      // Le décollage à reculons : un souffle qui monte, et un glissando.
      S.bruit(o, t, 0.7 * p.d, 'bandpass', 400, 2600, 1.5, 0.9, 0.02);
      S.osc(o, t, 'triangle', 200 * p.h, 1200 * p.h, 0.6 * p.d, 0.35, 0.01);
      return 0.75;
    } },
    ptui: { cd: 0.6, vol: 0.5, f(S, o, t, p) {
      // « Ptt » des lèvres, puis le petit jet d'eau.
      S.bruit(o, t, 0.02, 'highpass', 2200, 2200, 0.7, 0.8, 0.001);
      S.osc(o, t, 'sine', 320 * p.h, 150 * p.h, 0.04, 0.5, 0.002);
      S.bruit(o, t + 0.03, 0.25, 'bandpass', 2600, 1800, 2, 0.35, 0.01);
      return 0.3;
    } },
    couac: { cd: 0.8, vol: 0.45, air: true, f(S, o, t, p) {
      // L'oiseau abattu : « couac ! », puis il tombe à l'eau.
      S.voix(o, t, 720 * p.h, 480 * p.h, 0.14, [[1100, 4, 2], [1900, 5, 1]], 0.8);
      S.voix(o, t + 0.17, 640 * p.h, 420 * p.h, 0.12, [[1000, 4, 2], [1800, 5, 1]], 0.6);
      return 0.35;
    } },
    toc: { cd: 0.5, vol: 0.55, f(S, o, t, p) {
      // Un bloc de bois creux, sec.
      for (const [f, g, d] of [[720, 0.9, 0.09], [1350, 0.35, 0.05]]) {
        const osc = S.osc(o, t, 'sine', f * p.h * 1.05, f * p.h, d, g, 0.001);
        osc.frequency.exponentialRampToValueAtTime(f * p.h, t + 0.02);
      }
      S.bruit(o, t, 0.02, 'bandpass', 2500 * p.h, 2500 * p.h, 1.5, 0.5, 0.0005);
      return 0.12;
    } },
    baille: { cd: 2, vol: 0.45, f(S, o, t, p) {
      // « Aaaaouh » : la voyelle glisse de A vers O.
      S.voix(o, t, 170 * p.h, 115 * p.h, 1.3 * p.d, [[850, 5, 2.4, 450], [1250, 6, 1.2, 780]], 0.9, 3);
      return 1.35;
    } },
    gresille: { cd: 2, vol: 0.3, f(S, o, t, p) {
      // Le PRÉAVIS de l'Anguille : un grésillement haché qui s'emballe.
      const c = S.ctx, pre = 1;
      const hache = c.createGain(); hache.gain.value = 0; hache.connect(o);
      const f = S.bruit(hache, t, pre, 'highpass', 2500, 2500, 0.7, 1, 0.01, pre * 0.8);
      let u = t;
      while (u < t + pre) {
        const k = (u - t) / pre, pas = 0.09 - 0.07 * k;
        hache.gain.setValueAtTime(0.05 + 0.35 * k * k * Math.random(), u);
        hache.gain.setValueAtTime(0, u + pas * 0.4);
        u += pas;
      }
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(o);
      S.osc(lp, t, 'square', 55 * p.h, 140 * p.h, pre, 0.12, pre * 0.85);
      return pre + 0.05;
    } },
    zap: { cd: 1.5, vol: 0.5, f(S, o, t, p) {
      // La décharge : un claquement large, puis une queue qui crépite.
      S.bruit(o, t, 0.45, 'bandpass', 3200, 600, 0.8, 1, 0.002, 0.03);
      S.osc(o, t, 'square', 160 * p.h, 60 * p.h, 0.25, 0.25, 0.002);
      return 0.5;
    } },
    pschiii: { cd: 1, vol: 0.5, f(S, o, t, p) {
      // Le ballon qui se dégonfle : un souffle, et un pitch qui chute en zigzag.
      const c = S.ctx, D = 1.1 * p.d;
      const f = S.bruit(o, t, D, 'bandpass', 3000, 700, 3, 0.8, 0.01, D * 0.4);
      const l = c.createOscillator(); l.frequency.value = 9;
      const lg = c.createGain(); lg.gain.value = 600; l.connect(lg).connect(f.frequency);
      l.start(t); l.stop(t + D);
      S.osc(o, t, 'square', 600 * p.h, 140 * p.h, D, 0.06, 0.01, D * 0.3);
      return D + 0.05;
    } },
    pan: { cd: 0.5, vol: 0.55, f(S, o, t, p) {
      // Le ballon qui éclate (le Barracuda crève un Fugu).
      S.bruit(o, t, 0.06, 'highpass', 900, 900, 0.5, 1, 0.0005);
      S.osc(o, t, 'sine', 160, 50, 0.12, 0.7, 0.001);
      return 0.15;
    } },
    boum: { cd: 0.8, vol: 0.7, f(S, o, t, p) {
      // Une détonation sourde, puis le « splotch » des retombées.
      S.osc(o, t, 'sine', 80 * p.h, 28 * p.h, 0.7 * p.d, 0.6, 0.003);
      S.bruit(o, t, 0.8 * p.d, 'lowpass', 900, 160, 0.7, 0.8, 0.002, 0.05, true);
      S.bruit(o, t + 0.35, 0.18, 'bandpass', 900, 400, 1.5, 0.3, 0.01);
      return 0.9;
    } },
    burp: { cd: 1, vol: 0.55, f(S, o, t, p) {
      // LE ROT : une dent de scie grave et un vibrato irrégulier.
      const c = S.ctx, D = 0.7 * p.d;
      const s = c.createOscillator(); s.type = 'sawtooth';
      s.frequency.setValueAtTime(78 * p.h, t); s.frequency.linearRampToValueAtTime(62 * p.h, t + D);
      for (const [fr, a] of [[13, 10], [5.3, 6]]) {
        const l = c.createOscillator(); l.frequency.value = fr;
        const lg = c.createGain(); lg.gain.value = a * p.h; l.connect(lg).connect(s.frequency);
        l.start(t); l.stop(t + D);
      }
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 3;
      const e = S.env(t, 0.03, D * 0.6, D * 0.35, 0.9);
      s.connect(lp).connect(e).connect(o); s.start(t); s.stop(t + D + 0.05);
      return D + 0.05;
    } },
    poof: { cd: 0.6, vol: 0.4, f(S, o, t, p) {
      // Le nuage d'encre : un « pfff » étouffé.
      S.bruit(o, t, 0.4 * p.d, 'lowpass', 1100, 280, 0.7, 0.8, 0.01);
      return 0.45;
    } },
    super: { cd: 3, vol: 0.55, f(S, o, t, p) {
      // LE SUPER SAÏYEN : un accord qui monte en puissance, puis l'éclat.
      const D = 1.6;
      for (const m of [1, 1.5, 2]) S.osc(o, t, 'sawtooth', 110 * m, 440 * m, D, 0.12, D * 0.8);
      S.bruit(o, t, D, 'bandpass', 300, 3000, 1, 0.5, D * 0.85);
      for (let i = 0; i < 5; i++) S.osc(o, t + D + i * 0.05, 'sine', 1760 + i * 220, 1760 + i * 220, 0.5, 0.15, 0.003);
      return D + 0.6;
    } },
    wouhou: { cd: 1.5, vol: 0.35, f(S, o, t, p) {
      // Le petit sifflement joyeux du dauphin en l'air.
      const c = S.ctx, ob = S.osc(o, t, 'sine', 1200, 1200, 0.55 * p.d, 0.6, 0.02, 0.2);
      ob.frequency.setValueAtTime(1200, t);
      ob.frequency.linearRampToValueAtTime(2200, t + 0.2);
      ob.frequency.linearRampToValueAtTime(1600, t + 0.5);
      const v = c.createOscillator(); v.frequency.value = 11; const vg = c.createGain(); vg.gain.value = 60;
      v.connect(vg).connect(ob.frequency); v.start(t); v.stop(t + 0.6);
      return 0.6;
    } },
    bonk: { cd: 0.8, vol: 0.5, air: true, f(S, o, t, p) {
      // Une tête creuse.
      S.osc(o, t, 'triangle', 320 * p.h, 170 * p.h, 0.14, 0.8, 0.001);
      S.osc(o, t, 'sine', 640 * p.h, 600 * p.h, 0.06, 0.3, 0.001);
      return 0.16;
    } },

    // P2 — LA PANOPLIE DU CARTOON (moteur, toutes espèces).
    krrsh: { cd: 0.8, vol: 0.5, f(S, o, t, p) {
      // L'accordéon : un bruit qui se COMPRIME (le filtre referme, l'amplitude bat).
      const c = S.ctx, am = c.createGain(); am.gain.value = 2.2; am.connect(o);
      const l = c.createOscillator(); l.frequency.setValueAtTime(18, t); l.frequency.linearRampToValueAtTime(45, t + 0.3);
      const lg = c.createGain(); lg.gain.value = 1.8; l.connect(lg).connect(am.gain);
      l.start(t); l.stop(t + 0.35);
      S.bruit(am, t, 0.32, 'bandpass', 2200 * p.h, 450 * p.h, 1.2, 1, 0.003);
      return 0.35;
    } },
    boing: { cd: 0.6, vol: 0.45, f(S, o, t, p) {
      // PLOP, le retour en forme : un sinus qui oscille en s'amortissant.
      const D = 0.55 * p.d, base = 330 * p.h;
      const ob = S.osc(o, t, 'sine', base * 0.6, base * 0.6, D, 0.7, 0.005, D * 0.2);
      for (let i = 1; i <= 40; i++) {
        const u = i / 40, osci = Math.sin(u * Math.PI * 14) * Math.exp(-u * 4.5);
        ob.frequency.linearRampToValueAtTime(base * (1 + 0.35 * osci) * (1 - 0.25 * u), t + u * D);
      }
      return D + 0.05;
    } },
    tuiii: { cd: 0.8, vol: 0.25, f(S, o, t, p) {
      // Sonné : trois petits cuicuis qui tournent.
      for (let i = 0; i < 3; i++) S.osc(o, t + i * 0.13, 'sine', 1800, 2500, 0.1, 0.5, 0.005);
      return 0.45;
    } },
    bloing: { cd: 0.6, vol: 0.35, f(S, o, t, p) {
      // La gelée qui tremblote après un choc.
      const c = S.ctx, ob = S.osc(o, t, 'sine', 210 * p.h, 160 * p.h, 0.35, 0.6, 0.003);
      const v = c.createOscillator(); v.frequency.value = 16; const vg = c.createGain();
      vg.gain.setValueAtTime(40 * p.h, t); vg.gain.exponentialRampToValueAtTime(1, t + 0.35);
      v.connect(vg).connect(ob.frequency); v.start(t); v.stop(t + 0.4);
      return 0.4;
    } },
    ressort: { cd: 1, vol: 0.35, f(S, o, t, p) {
      // L'anticipation : un ressort qui se tend, grinçant et bref.
      S.bruit(o, t, 0.35, 'bandpass', 300 * p.h, 700 * p.h, 9, 4, 0.05);
      S.osc(o, t, 'sawtooth', 220 * p.h, 380 * p.h, 0.35, 0.2, 0.05);
      return 0.4;
    } },
    chomp: { cd: 0.25, vol: 0.4, f(S, o, t, p) {
      // UNE PRISE : même son pour tous, la hauteur suit le gabarit.
      S.bruit(o, t, 0.09, 'bandpass', 1100 * p.h, 1100 * p.h, 2.5, 0.8, 0.002);
      S.osc(o, t, 'triangle', 260 * p.h, 90 * p.h, 0.12, 0.7, 0.003);
      return 0.15;
    } },
    mort: { cd: 1, vol: 0.35, f(S, o, t, p) {
      // Le trombone triste de la grande scène.
      const c = S.ctx, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.connect(o);
      const ob = S.osc(lp, t, 'sawtooth', 300 * p.h, 190 * p.h, 0.7, 0.5, 0.03, 0.3);
      const v = c.createOscillator(); v.frequency.value = 6; const vg = c.createGain(); vg.gain.value = 8 * p.h;
      v.connect(vg).connect(ob.frequency); v.start(t); v.stop(t + 0.75);
      return 0.75;
    } },
    whiff: { cd: 0.5, vol: 0.3, f(S, o, t, p) {
      // Le coup dans le vide.
      S.bruit(o, t, 0.18, 'bandpass', 1600, 550, 1.6, 0.8, 0.01);
      return 0.2;
    } },
    caca: { cd: 3, vol: 0.22, f(S, o, t, p) {
      S.osc(o, t, 'sine', 230 * p.h, 85 * p.h, 0.08, 0.7, 0.003);
      S.bruit(o, t, 0.04, 'lowpass', 700, 400, 1, 0.3, 0.002);
      return 0.1;
    } },
    beurk: { cd: 3, vol: 0.3, f(S, o, t, p) {
      // « Bleuh », nasal.
      S.voix(o, t, 210 * p.h, 150 * p.h, 0.35 * p.d, [[1000, 7, 2.5], [2300, 8, 1]], 0.8, 14);
      return 0.4;
    } },
    souffle: { cd: 1.2, vol: 0.4, air: true, f(S, o, t, p) {
      // L'évent qui crève la surface : « pschhh », grave et long pour un gros.
      const D = U.clamp(0.6 / p.h, 0.5, 1.4) * p.d;
      S.bruit(o, t, D, 'bandpass', 1800 * p.h, 900 * p.h, 0.8, 0.9, 0.03, D * 0.3);
      return D + 0.05;
    } },
    aspire: { cd: 1.5, vol: 0.35, f(S, o, t, p) {
      // Le Mérou ASPIRE : un aspirateur qui monte d'un coup.
      S.bruit(o, t, 0.5, 'bandpass', 300, 1600, 3, 2.4, 0.15, 0.1);
      return 0.55;
    } },

    // P3 — LES SCÈNES SILENCIEUSES : un son discret, toujours SOUS les bruyantes.
    tink: { cd: 1, vol: 0.3, f(S, o, t, p) { S.osc(o, t, 'sine', 2600, 2600, 0.35, 0.5, 0.002); S.osc(o, t, 'sine', 6200, 6200, 0.12, 0.15, 0.002); return 0.4; } },
    brosse: { cd: 1.5, vol: 0.18, f(S, o, t, p) {
      for (let i = 0; i < 4; i++) S.bruit(o, t + i * 0.11, 0.07, 'highpass', 3500, 5000, 1, 0.7, 0.01);
      return 0.5;
    } },
    sirene: { cd: 1.5, vol: 0.2, f(S, o, t, p) {
      for (let i = 0; i < 4; i++) { const f = i % 2 ? 1040 : 1390; S.osc(o, t + i * 0.16, 'triangle', f, f, 0.15, 0.5, 0.01); }
      return 0.7;
    } },
    goeland: { cd: 2, vol: 0.3, air: true, f(S, o, t, p) {
      // Le cri moqueur du goéland : deux « kyaa » qui retombent.
      for (let i = 0; i < 2; i++) S.voix(o, t + i * 0.22, 1300, 800, 0.18, [[1600, 4, 2], [2800, 6, 1]], 0.7);
      return 0.45;
    } },
    coquille: { cd: 2, vol: 0.25, f(S, o, t, p) {
      // Toc-toc à la porte d'une coquille, puis « pop ».
      for (let i = 0; i < 2; i++) S.osc(o, t + i * 0.12, 'triangle', 900, 700, 0.05, 0.6, 0.001);
      S.osc(o, t + 0.3, 'sine', 600, 200, 0.06, 0.6, 0.002);
      return 0.4;
    } },
    ventouse: { cd: 1.5, vol: 0.25, f(S, o, t, p) {
      S.bruit(o, t, 0.12, 'bandpass', 500, 1300, 3, 0.8, 0.01);
      S.osc(o, t + 0.05, 'sine', 300, 120, 0.06, 0.5, 0.002);
      return 0.2;
    } },
    harpe: { cd: 2, vol: 0.18, f(S, o, t, p) {
      for (const [i, f] of [[0, 784], [1, 988]]) S.osc(o, t + i * 0.18, 'triangle', f, f, 0.6, 0.5, 0.003);
      return 0.85;
    } },
    glouglou: { cd: 1.5, vol: 0.18, f(S, o, t, p) {
      for (let i = 0; i < 5; i++) { const f = U.rand(450, 800) * p.h; S.osc(o, t + i * 0.07, 'sine', f, f * 1.7, 0.06, 0.5, 0.004); }
      return 0.45;
    } },
    hmpf: { cd: 2, vol: 0.3, air: true, f(S, o, t, p) {
      S.voix(o, t, 180 * p.h, 140 * p.h, 0.22, [[500, 6, 2], [1000, 7, 0.6]], 0.6);
      return 0.25;
    } },
    smack: { cd: 3, vol: 0.2, f(S, o, t, p) {
      // Le bisou d'un couple.
      S.bruit(o, t, 0.035, 'bandpass', 2200, 1500, 2, 0.8, 0.002);
      S.osc(o, t + 0.01, 'sine', 900, 500, 0.05, 0.4, 0.002);
      return 0.08;
    } },
    gonfle: { cd: 2, vol: 0.2, f(S, o, t, p) {
      // La baudruche qui se remplit (l'avertissement du Fugu).
      S.osc(o, t, 'triangle', 280 * p.h, 720 * p.h, 0.5, 0.7, 0.05, 0.1);
      return 0.55;
    } },
    soupir: { cd: 3, vol: 0.25, f(S, o, t, p) {
      S.bruit(o, t, 0.9, 'bandpass', 900, 500, 1.2, 0.7, 0.25, 0.1);
      return 0.95;
    } },
  },

  // --- L'AMBIANCE (P4) : le liant ------------------------------------------------
  // Continue, très basse, et jamais une mélodie qui boucle. Les couches sont
  // créées une fois au déblocage ; `update` ne fait que bouger leurs réglages.
  ambiance() {
    const c = this.ctx, t = c.currentTime;
    const boucle = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(t, Math.random() * 2); return s; };
    // La rumeur : bruit brun, plus grave et plus sourd vers le fond.
    this.rumeurF = c.createBiquadFilter(); this.rumeurF.type = 'lowpass'; this.rumeurF.frequency.value = 700; this.rumeurF.Q.value = 0.4;
    this.rumeurG = c.createGain(); this.rumeurG.gain.value = 0;
    boucle(this._brun).connect(this.rumeurF).connect(this.rumeurG).connect(this.amb);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
    const lg = c.createGain(); lg.gain.value = 0.12; lfo.connect(lg).connect(this.rumeurG.gain); lfo.start(t);
    // Le ressac : un bruit rose-ish en vagues, piloté par `update`.
    this.ressacF = c.createBiquadFilter(); this.ressacF.type = 'bandpass'; this.ressacF.frequency.value = 700; this.ressacF.Q.value = 0.6;
    this.ressacG = c.createGain(); this.ressacG.gain.value = 0;
    boucle(this._blanc).connect(this.ressacF).connect(this.ressacG).connect(this.amb);
    // Les abysses : un grondement très grave.
    this.grondG = c.createGain(); this.grondG.gain.value = 0;
    const gr = c.createOscillator(); gr.type = 'sine'; gr.frequency.value = 38;
    const gr2 = c.createOscillator(); gr2.type = 'sine'; gr2.frequency.value = 41.5;
    gr.connect(this.grondG); gr2.connect(this.grondG); gr.start(t); gr2.start(t);
    this.grondG.connect(this.amb);
    this.amb.gain.setTargetAtTime(1, t, 1.5);
    this._mouette = U.rand(6, 14); this._baleine = U.rand(25, 50); this._bloupNuit = 3;
  },

  update(dt) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.actif) return;
    this._tAmb -= dt;
    if (this._tAmb > 0) return;
    const pas = this._tAmb = 0.25;
    const c = this.ctx, t = c.currentTime;
    const cx = Camera.x + Camera.w / 2, cy = Camera.y + Camera.h / 2;
    const prof = U.clamp((cy - CONFIG.SURFACE_Y) / 3000, 0, 1);
    const sousEau = cy > CONFIG.SURFACE_Y;
    const nuit = Main.nightAmount ? Main.nightAmount() : 0;
    // Le filtre de l'eau suit la profondeur de la VUE (règle 6).
    this.eau.frequency.setTargetAtTime(sousEau ? 2600 - 2100 * prof : 16000, t, 0.3);
    // Rumeur : présente partout, dominante sous l'eau, sourde dans les abysses.
    this.rumeurF.frequency.setTargetAtTime(900 - 650 * prof, t, 0.5);
    this.rumeurG.gain.setTargetAtTime((sousEau ? 0.6 : 0.22) * (1 - 0.35 * nuit), t, 0.8);
    // Ressac : près du rivage, et d'autant plus que la vue frôle la surface.
    const rivage = U.clamp(1 - (cx - World.shoreX) / 2200, 0, 1);
    const surface = U.clamp(1 - Math.abs(cy - CONFIG.SURFACE_Y) / 900, 0, 1);
    const vague = Math.pow(0.5 + 0.5 * Math.sin(Main.time * Math.PI * 2 / 7.5), 2);
    this.ressacG.gain.setTargetAtTime(0.22 * rivage * (0.35 + 0.65 * surface) * (0.25 + 0.75 * vague), t, 0.6);
    this.ressacF.frequency.setTargetAtTime(500 + 900 * vague, t, 0.6);
    // Grondement des abysses.
    this.grondG.gain.setTargetAtTime(0.25 * U.clamp((prof - 0.55) / 0.35, 0, 1), t, 1);
    // Évènements rares : mouettes de jour en surface, baleine lointaine au fond,
    // quelques « bloup » isolés la nuit. Hors bus de voix : c'est le décor.
    this._mouette -= pas; this._baleine -= pas; this._bloupNuit -= pas;
    if (this._mouette <= 0) {
      this._mouette = U.rand(8, 22);
      if (surface > 0.4 && nuit < 0.4) this.decor('goeland', U.rand(-0.8, 0.8), 0.08);
    }
    if (this._baleine <= 0) {
      this._baleine = U.rand(30, 70);
      if (prof > 0.5) this.chantLointain();
    }
    if (this._bloupNuit <= 0) {
      this._bloupNuit = U.rand(2, 6);
      if (nuit > 0.5 && sousEau) this.decor('bloup', U.rand(-0.9, 0.9), 0.1);
    }
  },

  // Un son de DÉCOR : joué sans source, à un panoramique donné, très bas.
  decor(nom, pan, vol) {
    const r = this.R[nom], c = this.ctx;
    const g = c.createGain(); g.gain.value = vol;
    this.panner(g, pan).connect(r.air ? this.air : this.eau);
    r.f(this, g, c.currentTime + 0.01, { h: U.rand(0.85, 1.15), d: 1, k: 1 });
  },

  // Un chant de cétacé très lointain : des glissandi lents, très filtrés.
  chantLointain() {
    const c = this.ctx, t = c.currentTime + 0.05;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = c.createGain(); g.gain.value = 0.06;
    this.panner(g, U.rand(-0.7, 0.7)).connect(this.amb);
    lp.connect(g);
    let u = t;
    for (let i = 0; i < 3; i++) {
      const f0 = U.rand(160, 260), d = U.rand(1.2, 2.2);
      const o = this.osc(lp, u, 'sine', f0, f0 * U.rand(0.55, 0.8), d, 0.8, d * 0.3);
      const v = c.createOscillator(); v.frequency.value = 4; const vg = c.createGain(); vg.gain.value = 5;
      v.connect(vg).connect(o.frequency); v.start(u); v.stop(u + d);
      u += d + U.rand(0.2, 0.6);
    }
  },
};
