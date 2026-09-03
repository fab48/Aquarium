// EXPORT SVG — l'autre moitié du pont avec l'éditeur.
//
// L'import fonctionne (`sprites.js` lit les JSON de l'éditeur), mais pour
// REDESSINER un animal il faut d'abord pouvoir l'en sortir : 26 des 27 espèces
// n'existent que sous forme de code procédural. Ce module rejoue leur
// silhouette dans un faux contexte 2D qui, au lieu de peindre, enregistre les
// tracés — et les recrache en SVG, prêt à être ouvert dans l'éditeur.
//
// Usage (console du jeu) :
//   SVGExport.telecharger('requin')     // un fichier .svg
//   SVGExport.tout()                    // les 27, à la queue leu leu
//   SVGExport.svg('meduse')             // la chaîne, pour inspection
//
// Ce que le SVG NE contient PAS, volontairement :
//   - le visage (yeux, sourcils, bouche) : il reste dessiné par le jeu
//     par-dessus le sprite, c'est la règle du projet. Ses ancres sont
//     enregistrées dans <metadata> pour que l'éditeur sache où il ira ;
//   - les lueurs (`shadowBlur`) et les découpes (`clip`), que SVG rendrait
//     autrement — la silhouette exportée est le trait nu.

const SVGExport = {

  // --- Faux contexte 2D : il enregistre au lieu de peindre --------------------
  // Sous-ensemble de Canvas2D réellement utilisé par les silhouettes. La
  // transformation courante est APPLIQUÉE AUX POINTS au moment où ils sont
  // enregistrés : le SVG final n'a donc aucune matrice imbriquée à recomposer.
  Enregistreur: function () {
    this.m = [1, 0, 0, 1, 0, 0];      // a b c d e f
    this.pile = [];
    this.chemin = [];                  // tracé en cours
    this.paths = [];                   // tracés peints
    this.fillStyle = '#000'; this.strokeStyle = '#000';
    this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.globalAlpha = 1;
    this.shadowColor = ''; this.shadowBlur = 0;
    this.font = ''; this.textAlign = ''; this.textBaseline = '';
  },

  init() {
    const E = this.Enregistreur.prototype;
    const mul = (m, n) => [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];

    E.pt = function (x, y) {
      const m = this.m;
      return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    };
    // Échelle moyenne du repère courant : sert à convertir une épaisseur de trait.
    E.echelle = function () {
      const m = this.m;
      return (Math.hypot(m[0], m[1]) + Math.hypot(m[2], m[3])) / 2;
    };

    E.save = function () { this.pile.push([this.m.slice(), this.fillStyle, this.strokeStyle, this.lineWidth, this.globalAlpha]); };
    E.restore = function () {
      const s = this.pile.pop();
      if (!s) return;
      this.m = s[0]; this.fillStyle = s[1]; this.strokeStyle = s[2];
      this.lineWidth = s[3]; this.globalAlpha = s[4];
    };
    E.translate = function (x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); };
    E.scale = function (x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); };
    E.rotate = function (r) { const c = Math.cos(r), s = Math.sin(r); this.m = mul(this.m, [c, s, -s, c, 0, 0]); };
    E.transform = function (a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); };
    E.setTransform = function (a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; };

    E.beginPath = function () { this.chemin = []; };
    E.closePath = function () { this.chemin.push(['Z']); };
    E.moveTo = function (x, y) { this.chemin.push(['M', this.pt(x, y)]); };
    E.lineTo = function (x, y) { this.chemin.push(['L', this.pt(x, y)]); };
    E.quadraticCurveTo = function (cx, cy, x, y) { this.chemin.push(['Q', this.pt(cx, cy), this.pt(x, y)]); };
    E.bezierCurveTo = function (c1x, c1y, c2x, c2y, x, y) {
      this.chemin.push(['C', this.pt(c1x, c1y), this.pt(c2x, c2y), this.pt(x, y)]);
    };
    E.rect = function (x, y, w, h) {
      this.chemin.push(['M', this.pt(x, y)], ['L', this.pt(x + w, y)],
                       ['L', this.pt(x + w, y + h)], ['L', this.pt(x, y + h)], ['Z']);
    };
    // `arcTo` n'apparaît que dans le HUD : une approximation par segment suffit.
    E.arcTo = function (x1, y1, x2, y2) { this.chemin.push(['L', this.pt(x1, y1)], ['L', this.pt(x2, y2)]); };
    E.arc = function (cx, cy, r, a0, a1, ccw) { this.ellipse(cx, cy, r, r, 0, a0, a1, ccw); };

    // Arc → cubiques. Découpé en morceaux d'au plus 90°, avec la formule exacte
    // des tangentes : un échantillonnage en polyligne donnerait des contours
    // facettés, inexploitables dans un éditeur vectoriel.
    E.ellipse = function (cx, cy, rx, ry, rot, a0, a1, ccw) {
      let da = a1 - a0;
      if (!ccw) { while (da < 0) da += Math.PI * 2; while (da > Math.PI * 2) da -= Math.PI * 2; }
      else { while (da > 0) da -= Math.PI * 2; while (da < -Math.PI * 2) da += Math.PI * 2; }
      if (Math.abs(da) < 1e-6) return;
      const n = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 2)));
      const pas = da / n;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const local = (a) => {
        const x = rx * Math.cos(a), y = ry * Math.sin(a);
        return this.pt(cx + x * cosR - y * sinR, cy + x * sinR + y * cosR);
      };
      const tang = (a) => {
        const x = -rx * Math.sin(a), y = ry * Math.cos(a);
        const m = this.m;
        const dx = x * cosR - y * sinR, dy = x * sinR + y * cosR;
        return [m[0] * dx + m[2] * dy, m[1] * dx + m[3] * dy];   // vecteur : pas de translation
      };
      this.chemin.push(['M', local(a0)]);
      for (let i = 0; i < n; i++) {
        const t0 = a0 + pas * i, t1 = t0 + pas;
        const alpha = (4 / 3) * Math.tan(pas / 4);
        const p0 = local(t0), p3 = local(t1), d0 = tang(t0), d3 = tang(t1);
        this.chemin.push(['C',
          [p0[0] + alpha * d0[0], p0[1] + alpha * d0[1]],
          [p3[0] - alpha * d3[0], p3[1] - alpha * d3[1]], p3]);
      }
    };

    E.fill = function () { this.peindre(true); };
    E.stroke = function () { this.peindre(false); };
    E.peindre = function (rempli) {
      if (!this.chemin.length) return;
      const couleur = this.couleurLisible(rempli ? this.fillStyle : this.strokeStyle);
      if (!couleur) return;
      this.paths.push({
        d: this.chemin.slice(),
        fill: rempli ? couleur : 'none',
        stroke: rempli ? null : couleur,
        lineWidth: this.lineWidth * this.echelle(),
        cap: this.lineCap, join: this.lineJoin,
        alpha: this.globalAlpha,
      });
    };
    // Un dégradé (ou toute valeur non textuelle) n'a pas d'équivalent simple ici :
    // on le laisse tomber plutôt que d'inventer une couleur.
    E.couleurLisible = function (c) { return typeof c === 'string' ? c : null; };

    // Découpe et lueurs : sans équivalent direct, et absentes de la silhouette nue.
    E.clip = function () { this.chemin = []; };
    E.createLinearGradient = E.createRadialGradient = function () {
      return { addColorStop() {} };
    };
    E.fillText = E.strokeText = function () {};
    E.measureText = function () { return { width: 0 }; };
    E.drawImage = function () {};
    E.setLineDash = function () {};
    E.getImageData = function () { return { data: [] }; };
  },

  // --- Un sujet de pose : un individu adulte, immobile, sans émotion ----------
  sujet(speciesId) {
    const e = new Entity(speciesId, 4000, CONFIG.SURFACE_Y + 400);
    e.stage = 'adult';
    e.growth = 1; e.gabarit = 1;
    e.age = e.maxAge * 0.5;              // taille d'adulte moyen (cf. `vieillesse`)
    e.expression = 'idle'; e.exprTimer = 0; e._held = false;
    e.speedNow = e.def.speed; e.vx = e.def.speed; e.vy = 0;
    e._facing = 1; e._flipX = 1; e._tilt = 0;
    e.stealth = 0; e.strikeT = 0; e._chew = 0; e._sable = 0;
    e._color = e.def.colors[0];          // couleur de référence, pas un tirage
    return e;
  },

  // --- Rendu enregistré d'une espèce -----------------------------------------
  // Renvoie { paths, ancres, bbox }. Le visage n'est pas dessiné : sa position
  // est relevée au passage, pour la donner à l'éditeur.
  capturer(speciesId, options) {
    options = options || {};
    const def = SPECIES[speciesId];
    const rec = new this.Enregistreur();
    const e = this.sujet(speciesId);

    // Le sprite déjà en place masquerait la silhouette procédurale qu'on veut sortir.
    const spriteSauve = def.sprite;
    if (!options.avecSprite) delete def.sprite;

    // On intercepte le visage : il n'est pas exporté (le jeu le redessine
    // par-dessus le sprite), mais on relève OÙ il se serait posé.
    // DEUX points d'entrée à couvrir : `drawFace` pour un visage groupé, et
    // `oeil` pour les yeux isolés (crabe sur tiges, coquillage entre ses
    // valves). Sans le second, le crabe s'exportait avec ses yeux dessinés —
    // l'artiste les aurait redessinés, et le jeu en aurait remis par-dessus.
    const ancres = {};
    // TROIS points d'entrée du visage à couvrir, pas deux : `drawFace` (visage
    // groupé), `oeil` (yeux isolés du crabe et du coquillage) et `bouche`
    // (bouche posée sur sa propre ancre par un sprite). Sans le troisième, la
    // ligne de bouche se retrouvait dessinée dans le SVG réexporté.
    const vraiFace = FishBody.drawFace, vraiOeil = FishBody.oeil, vraieBouche = FishBody.bouche;
    FishBody.drawFace = function (ctx, size) {
      if (ctx === rec) {
        ancres.eye = rec.pt(size * 0.55, -size * 0.18);
        ancres.mouth = rec.pt(size * 0.82, size * 0.12);
        ancres.faceSize = size * rec.echelle();
        return;
      }
      return vraiFace.apply(FishBody, arguments);
    };
    FishBody.bouche = function (ctx, mx, my, size) {
      if (ctx === rec) { ancres.mouth = rec.pt(mx, my); return; }
      return vraieBouche.apply(FishBody, arguments);
    };
    FishBody.oeil = function (ctx, x, y, r) {
      if (ctx === rec) {
        // Le premier œil rencontré fait l'ancre ; le second (l'autre tige) est
        // son symétrique, l'éditeur n'en a pas besoin.
        if (!ancres.eye) { ancres.eye = rec.pt(x, y); ancres.faceSize = r / 0.22 * rec.echelle(); }
        return;
      }
      return vraiOeil.apply(FishBody, arguments);
    };
    try {
      FishBody.draw(rec, e, 0);
    } finally {
      FishBody.drawFace = vraiFace;
      FishBody.oeil = vraiOeil;
      FishBody.bouche = vraieBouche;
      if (spriteSauve) def.sprite = spriteSauve;
    }

    // Boîte englobante de tout ce qui a été tracé
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of rec.paths) {
      const marge = p.stroke ? p.lineWidth / 2 : 0;
      for (const cmd of p.d) for (let i = 1; i < cmd.length; i++) {
        const pt = cmd[i];
        x0 = Math.min(x0, pt[0] - marge); x1 = Math.max(x1, pt[0] + marge);
        y0 = Math.min(y0, pt[1] - marge); y1 = Math.max(y1, pt[1] + marge);
      }
    }
    if (!isFinite(x0)) { x0 = y0 = -1; x1 = y1 = 1; }
    // `center` est l'ORIGINE de la créature : c'est le point que le jeu place à
    // (entity.x, entity.y). L'éditeur doit le retrouver tel quel.
    ancres.center = [0, 0];
    ancres.nose = [x1, (y0 + y1) / 2];
    ancres.tail = [x0, (y0 + y1) / 2];
    return { paths: rec.paths, ancres, bbox: [x0, y0, x1, y1], entity: e, def };
  },

  // --- Sérialisation SVG ------------------------------------------------------
  svg(speciesId, options) {
    options = options || {};
    const cap = this.capturer(speciesId, options);
    const [x0, y0, x1, y1] = cap.bbox;
    const ECHELLE = options.echelle || 4;    // on exporte en GRAND : l'éditeur
    const MARGE = 12;                        // travaille mieux sur un dessin ample
    const W = Math.ceil((x1 - x0) * ECHELLE + MARGE * 2);
    const H = Math.ceil((y1 - y0) * ECHELLE + MARGE * 2);
    const tx = (p) => (p[0] - x0) * ECHELLE + MARGE;
    const ty = (p) => (p[1] - y0) * ECHELLE + MARGE;
    const n = (v) => (Math.round(v * 100) / 100);

    const corps = cap.paths.map(p => {
      let d = '';
      for (const c of p.d) {
        if (c[0] === 'Z') { d += 'Z '; continue; }
        d += c[0] + ' ' + c.slice(1).map(pt => `${n(tx(pt))} ${n(ty(pt))}`).join(' ') + ' ';
      }
      const att = [`d="${d.trim()}"`];
      att.push(`fill="${p.fill}"`);
      if (p.stroke) {
        att.push(`stroke="${p.stroke}"`, `stroke-width="${n(p.lineWidth * ECHELLE)}"`,
                 `stroke-linecap="${p.cap}"`, `stroke-linejoin="${p.join}"`);
      }
      if (p.alpha < 1) att.push(`opacity="${n(p.alpha)}"`);
      return '  <path ' + att.join(' ') + '/>';
    }).join('\n');

    // Ancres : dans <metadata>, jamais en formes dessinées — l'éditeur les
    // importerait comme des calques et on se retrouverait avec des ronds
    // parasites à effacer sur chaque poisson.
    const anc = {};
    for (const cle of ['center', 'nose', 'eye', 'mouth', 'tail']) {
      const a = cap.ancres[cle];
      if (a) anc[cle] = { x: n(tx(a)), y: n(ty(a)) };
    }
    const meta = {
      aquarium: 1,
      species: speciesId,
      name: cap.def.name,
      realName: cap.def.realName,
      size: cap.def.size,
      // ÉCHELLE DÉCLARÉE. Sans elle, le jeu doit deviner à quelle taille
      // dessiner un document, et sa seule règle possible — « la largeur vaut
      // 2,5 fois `size` » — est une hypothèse de poisson allongé. Elle casse sur
      // tout ce qui est vertical : l'hippocampe ressortait 83 % trop grand, le
      // poisson-lune 29 %. Ici on SAIT : une unité de dessin vaut `echelle`
      // unités de jeu, pour une créature de taille `tailleJeu`.
      echelle: 1 / ECHELLE,
      tailleJeu: +cap.entity.size.toFixed(2),
      points: anc,
      // Suggestions : l'éditeur peut les reprendre telles quelles.
      tailBlend: n(tx([x0 + (x1 - x0) * 0.28, 0])),
      faceK: cap.ancres.faceSize ? n(cap.ancres.faceSize / cap.def.size * 0.75) : 0.75,
    };

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${cap.def.name} — silhouette du jeu</title>
  <metadata>${JSON.stringify(meta)}</metadata>
${corps}
</svg>
`;
  },

  telecharger(speciesId, options) {
    const txt = this.svg(speciesId, options);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
    a.download = `${speciesId}.svg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return `${speciesId}.svg`;
  },

  // Les 27 d'affilée. Espacées : les navigateurs abandonnent les
  // téléchargements déclenchés en rafale.
  tout(options) {
    const ids = Object.keys(SPECIES);
    ids.forEach((id, i) => setTimeout(() => {
      try { this.telecharger(id, options); }
      catch (err) { console.warn('[svgexport]', id, err); }
    }, i * 350));
    return `${ids.length} fichiers, ~${Math.ceil(ids.length * 0.35)} s`;
  },
};

SVGExport.init();
