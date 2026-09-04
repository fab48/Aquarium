// IMPORT — un dessin (SVG quelconque, ou la silhouette procédurale du jeu) vers
// le format de document que l'atelier édite et que `sprites.js` consomme.
//
// Deux sources, un seul chemin de code :
//   SVGImport.depuisSVG(texte)   — un fichier .svg dessiné n'importe où
//   SVGImport.depuisEspece(id)   — la silhouette procédurale d'une des 27 espèces
//
// L'échantillonnage passe par le NAVIGATEUR (`getPointAtLength`) plutôt que par
// un analyseur de chemin maison : arcs elliptiques, courbes lisses, coordonnées
// relatives, `<circle>`, `<rect>`… tout est déjà géré, correctement, et il n'y a
// rien à maintenir. Les points sont ensuite réduits (Douglas-Peucker), sinon on
// obtient 200 points par contour — illisible à éditer, et inutilement cher à
// dessiner soixante fois par seconde.

const SVGImport = {

  // --- Échantillonnage d'un élément géométrique SVG --------------------------
  // `el` doit être dans le document : certains navigateurs renvoient 0 pour
  // `getTotalLength()` sur un élément détaché.
  echantillonner(el, pas = 5) {
    const L = el.getTotalLength();
    if (!(L > 0)) return [];
    const n = Math.max(8, Math.min(600, Math.ceil(L / pas)));
    const m = el.getCTM();                 // aplatit les <g transform="…">
    const pts = [];
    for (let i = 0; i < n; i++) {
      const p = el.getPointAtLength((i / n) * L);
      pts.push(m ? [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f] : [p.x, p.y]);
    }
    return pts;
  },

  // --- Réduction Douglas-Peucker --------------------------------------------
  // Garde les points qui portent la forme, jette ceux qui sont sur la corde.
  reduire(pts, tol) {
    if (pts.length < 4) return pts;
    const garde = new Array(pts.length).fill(false);
    garde[0] = garde[pts.length - 1] = true;
    const pile = [[0, pts.length - 1]];
    while (pile.length) {
      const [a, b] = pile.pop();
      if (b - a < 2) continue;
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const dx = bx - ax, dy = by - ay;
      const norme = Math.hypot(dx, dy) || 1;
      let pire = -1, iPire = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / norme;
        if (d > pire) { pire = d; iPire = i; }
      }
      if (pire > tol) { garde[iPire] = true; pile.push([a, iPire], [iPire, b]); }
    }
    return pts.filter((_, i) => garde[i]);
  },

  // --- Un SVG complet --------------------------------------------------------
  depuisSVG(texte, nom) {
    const doc = new DOMParser().parseFromString(texte, 'image/svg+xml');
    const racine = doc.querySelector('svg');
    if (!racine) throw new Error('pas de <svg> dans ce fichier');

    // On le pose dans la page, hors champ : indispensable pour que les mesures
    // géométriques et les styles calculés répondent.
    const hote = document.createElement('div');
    hote.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden';
    hote.appendChild(document.importNode(racine, true));
    document.body.appendChild(hote);

    try {
      const svg = hote.querySelector('svg');
      const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      const W = vb.length === 4 ? vb[2] : (parseFloat(svg.getAttribute('width')) || 400);
      const H = vb.length === 4 ? vb[3] : (parseFloat(svg.getAttribute('height')) || 200);

      const shapes = [];
      const geo = svg.querySelectorAll('path, polygon, polyline, circle, ellipse, rect, line');
      for (const el of geo) {
        const st = getComputedStyle(el);
        const remplissage = st.fill && st.fill !== 'none' ? this.enHex(st.fill) : null;
        // LES TRACÉS AU TRAIT COMPTENT AUTANT. Les tentacules d'une méduse, les
        // bras d'un poulpe, les antennes d'une crevette sont des `stroke`, pas
        // des remplissages. En les ignorant, la méduse perdait la moitié de sa
        // hauteur et le poulpe un tiers de sa largeur.
        const trait = st.stroke && st.stroke !== 'none' ? this.enHex(st.stroke) : null;
        if (!remplissage && !trait) continue;
        let pts = this.echantillonner(el);
        if (pts.length < 2) continue;
        pts = this.reduire(pts, Math.max(W, H) * 0.0018);
        if (pts.length < 2) continue;
        if (!remplissage && pts.length < 3) { /* un simple segment reste valable */ }
        else if (pts.length < 3) continue;
        // Une forme remplie est fermée ; un trait ne l'est que si le chemin
        // l'était (`getPointAtLength` boucle alors sur lui-même).
        const ferme = !!remplissage || this.boucle(pts, Math.max(W, H));
        shapes.push({
          points: pts, fill: remplissage, smooth: true, pivot: null, amp: 15,
          stroke: trait,
          lineWidth: trait ? Math.max(0.4, parseFloat(st.strokeWidth) || 1) : 0,
          ferme,
        });
      }
      if (!shapes.length) throw new Error('aucune forme trouvée');

      // Métadonnée de nos propres exports : les ancres y sont déjà.
      let meta = null;
      const balise = svg.querySelector('metadata');
      if (balise) { try { meta = JSON.parse(balise.textContent); } catch (e) { /* pas des nôtres */ } }

      return this.finaliser({ naturalW: W, naturalH: H, shapes,
                              points: (meta && meta.points) || null,
                              tailBlend: meta && meta.tailBlend,
                              echelle: meta && meta.echelle,
                              tailleJeu: meta && meta.tailleJeu, nom });
    } finally {
      hote.remove();
    }
  },

  // --- La silhouette procédurale d'une espèce --------------------------------
  // On réutilise l'enregistreur de `svgexport.js` : il sait déjà rejouer une
  // silhouette sans la peindre, en relevant au passage les ancres du visage.
  depuisEspece(id) {
    const svg = SVGExport.svg(id);
    const doc = this.depuisSVG(svg, id);
    doc.espece = id;
    return doc;
  },

  // --- Ancres manquantes, bornes, garde-fous ---------------------------------
  finaliser(doc) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sh of doc.shapes) for (const p of sh.points) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    const L = x1 - x0, Ht = y1 - y0;
    const p = Object.assign({}, doc.points);
    // Valeurs de départ raisonnables : le dessin regarde vers la DROITE, comme
    // toutes les silhouettes du jeu.
    if (!p.center) p.center = { x: x0 + L * 0.5, y: y0 + Ht * 0.5 };
    if (!p.nose) p.nose = { x: x1, y: y0 + Ht * 0.5 };
    if (!p.tail) p.tail = { x: x0, y: y0 + Ht * 0.5 };
    if (!p.eye) p.eye = { x: x0 + L * 0.78, y: y0 + Ht * 0.38 };
    if (!p.mouth) p.mouth = { x: x0 + L * 0.9, y: y0 + Ht * 0.58 };
    if (p.eye.r == null) p.eye.r = this.rayonOeil(doc.shapes, p.eye, L);

    // On PART DU DOCUMENT D'ORIGINE et on ne surcharge que ce qu'on connaît.
    // Reconstruire un objet neuf champ par champ jetait silencieusement tout le
    // reste : `SharkSVG.json` a perdu son `sourceRaw` — le SVG d'origine de
    // l'éditeur, 2,8 ko — au premier enregistrement depuis l'atelier. Un outil
    // d'édition ne doit jamais supprimer ce qu'il ne comprend pas.
    return Object.assign({}, doc, {
      version: doc.version || 1,
      naturalW: Math.round(doc.naturalW || L),
      naturalH: Math.round(doc.naturalH || Ht),
      sourceKind: doc.sourceKind || 'atelier',
      points: p,
      fins: doc.fins || [],
      tailBlend: doc.tailBlend != null ? doc.tailBlend : x0 + L * 0.28,
      // Échelle déclarée : une unité de dessin vaut `echelle` unités de jeu,
      // pour une créature de taille `tailleJeu`. Absente d'un dessin fait à la
      // main — le jeu retombe alors sur sa règle de poisson allongé, que
      // `spriteScale` rattrape.
      echelle: doc.echelle, tailleJeu: doc.tailleJeu,
      spriteScale: doc.spriteScale,
      shapes: doc.shapes,
      espece: doc.espece || null,
      nom: doc.nom || null,
    });
  },

  // Rayon d'œil déduit du dessin : le quart de la hauteur du corps à l'aplomb de
  // l'ancre. Tête fine → petit œil, grosse tête → gros œil. Vérifié sur le
  // requin, ça tombe à 2 % de la valeur calée à la main.
  rayonOeil(shapes, oeil, largeur) {
    let y0 = Infinity, y1 = -Infinity;
    for (const sh of shapes) for (const pt of sh.points) {
      if (Math.abs(pt[0] - oeil.x) > largeur * 0.12) continue;
      if (pt[1] < y0) y0 = pt[1]; if (pt[1] > y1) y1 = pt[1];
    }
    if (!isFinite(y0) || y1 - y0 < 1) return Math.max(2, largeur * 0.05);
    return Math.round((y1 - y0) * 0.25 * 10) / 10;
  },

  // Le tracé revient-il à son point de départ ?
  boucle(pts, taille) {
    const a = pts[0], b = pts[pts.length - 1];
    return Math.hypot(a[0] - b[0], a[1] - b[1]) < taille * 0.01;
  },

  enHex(c) {
    const m = String(c).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (!m) return String(c).startsWith('#') ? String(c) : '#888888';
    return '#' + m.slice(1, 4)
      .map(v => Math.round(+v).toString(16).padStart(2, '0')).join('');
  },
};
