// Sprites vectoriels produits par l'éditeur SVG (Assets/*.json).
//
// Le format de l'éditeur, tel qu'il est consommé ici :
//   naturalW/H  — dimensions du dessin d'origine
//   points      — ANCRES : center (origine de la créature), nose, eye, mouth, tail
//   shapes[]    — { points: [[x,y]…], fill, smooth, pivot, amp, groupe }
//                 `smooth`  : contour lissé plutôt qu'en ligne brisée
//                 `pivot`   : point d'attache — la forme PIVOTE autour (nageoire)
//                 `amp`     : amplitude d'animation de la forme
//                 `groupe`  : nom libre — plusieurs calques « aplatis » en un
//                             seul bloc animé (le corps et ses rayures, les
//                             trois pièces d'une patte…)
//   tailBlend   — x en deçà duquel les points appartiennent à la QUEUE et ondulent
//   sansQueue   — TOUTE créature n'a pas de queue : un crabe, une étoile, un
//                 coquillage n'ont rien à faire onduler. Sans ce drapeau, la
//                 valeur par défaut de `tailBlend` faisait tortiller un tiers
//                 du crabe.
//   tailOndes   — nombre d'ondes le long de la queue. 0 = battement d'un seul
//                 tenant (un poisson) ; 1 ou 2 = onde qui COURT vers le bout
//                 (une murène, une anguille — le corps entier est un tentacule).
//   queueCalques— restreint l'ondulation à certains calques (défaut : tous)
//   fins[]      — APPENDICES posés par l'éditeur. Deux types :
//                 `nageoire`  (défaut) — rotation autour de l'ancre, pondérée
//                             par la distance : plein effet au centre, nul au
//                             bord du rayon `r`.
//                 `tentacule` — onde progressive le long d'un axe : base à
//                             l'ancre, direction `ang`, longueur `r`. C'est ce
//                             qu'il faut pour une patte, une antenne, un bras
//                             de poulpe — une rotation en bloc les rend raides.
//                 Communs : `calques` (les formes entraînées), `miroir`,
//                 `amp`, `phase`, `vitesse`.
//
// Le fichier est écrit par `atelier.html`. `Assets/sprites.json` dit quelle
// espèce utilise quel dessin (voir `init`).
//
// Chargement asynchrone : tant que le fichier n'est pas là, la silhouette
// procédurale continue d'être dessinée. Aucune frame n'attend un sprite.
const Sprites = {
  cache: {},              // nom -> objet préparé | null (en cours) | false (échec)

  // Le manifeste `Assets/sprites.json` associe une espèce à son dessin :
  //     { "requin": "SharkSVG", "murene": null }
  // C'est lui qui permet d'ACTIVER un sprite depuis l'atelier sans toucher au
  // code : une page web ne peut pas modifier `species.js`, et lui faire réécrire
  // du source serait de toute façon une très mauvaise idée. `null` désactive
  // explicitement une espèce, ce qui la ramène à sa silhouette procédurale même
  // si sa fiche déclare un `sprite:` — c'est ainsi qu'on garde celles qui
  // marchent bien telles quelles.
  init() {
    for (const id in SPECIES) if (SPECIES[id].sprite) this.charger(SPECIES[id].sprite);
    fetch('Assets/sprites.json')
      .then(r => (r.ok ? r.json() : null))
      .then(m => {
        if (!m) return;
        this.manifeste = m;
        for (const id in m) {
          if (!SPECIES[id]) continue;
          if (m[id]) { SPECIES[id].sprite = m[id]; this.charger(m[id]); }
          else delete SPECIES[id].sprite;
        }
      })
      .catch(() => {});     // pas de manifeste = rien à faire, cas normal
  },

  charger(nom) {
    if (nom in this.cache) return;
    this.cache[nom] = null;
    fetch(`Assets/${nom}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { this.cache[nom] = this.preparer(d); })
      .catch(err => {
        // On ne casse rien : l'espèce garde sa silhouette procédurale.
        console.warn(`[sprites] ${nom} illisible (${err}) — silhouette procédurale conservée`);
        this.cache[nom] = false;
      });
  },

  get(nom) { return this.cache[nom] || null; },

  preparer(d) {
    // 2 points suffisent pour un trait ouvert (un segment de tentacule) ; il en
    // faut 3 pour un contour rempli.
    // Les calques écartés DÉCALENT les indices : un appendice qui visait la
    // forme 5 aurait animé la 4. On garde donc la correspondance ancien -> neuf.
    const shapes = [], reindex = {};
    (d.shapes || []).forEach((sh, i) => {
      if (!sh.points || sh.points.length < (sh.fill == null && sh.stroke ? 2 : 3)) return;
      reindex[i] = shapes.length;
      shapes.push(sh);
    });
    // Les calques visés par un appendice ou par la queue, exprimés dans les
    // indices d'origine, ramenés aux indices retenus.
    const vises = (liste) => {
      if (!liste || !liste.length) return null;
      const s = new Set();
      for (const i of liste) if (reindex[i] != null) s.add(reindex[i]);
      return s.size ? s : null;
    };
    let minX = Infinity, maxX = -Infinity;
    for (const sh of shapes) for (const p of sh.points) {
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
    }
    // Document encore vide (on vient de le créer dans l'atelier) : sans ce
    // repli, toutes les mesures qui suivent partent à NaN et le rendu disparaît.
    if (!isFinite(minX)) { minX = 0; maxX = d.naturalW || 1; }
    const c = (d.points && d.points.center) || { x: (minX + maxX) / 2, y: d.naturalH / 2 };
    return {
      w: Math.max(1, maxX - minX),        // largeur RÉELLE du dessin, pas celle du viewBox
      cx: c.x, cy: c.y,
      minX,
      // Sans `tailBlend`, rien n'ondule : mieux vaut un poisson raide qu'un
      // poisson dont le corps entier se tortille. `sansQueue` le dit
      // explicitement — un crabe n'a pas de nageoire caudale à faire battre.
      tailBlend: d.sansQueue ? null : (d.tailBlend != null ? d.tailBlend : minX),
      tailOndes: d.tailOndes || 0,
      queueCalques: vises(d.queueCalques),
      oeil: d.points && d.points.eye,
      // DEUXIÈME ŒIL, optionnel. Le visage commun est de PROFIL — un seul œil,
      // ce qui convient à un poisson vu de côté. Tout ce qui se voit de face ou
      // de dessus (crabe, raie, coquillage, poulpe) en veut deux. Il n'y a rien
      // de neuf à dessiner pour ça : on repose le même visage à un second
      // endroit, mouche comprise, clignement compris — les deux yeux battent
      // ensemble parce que le clignement ne dépend que de la taille et du temps.
      // Deux façons de le poser, et l'écartement est la bonne dans la plupart
      // des cas : sur une tête vue de face les deux yeux sont symétriques, une
      // seule ancre à placer suffit donc, avec un nombre pour les séparer.
      // `eye2` reste lu pour un dessin asymétrique ou une tête tournée.
      oeil2: (d.points && d.points.eye2)
        || (d.points && d.points.eye && d.points.eye.ecart
            ? { x: d.points.eye.x - d.points.eye.ecart,
                y: d.points.eye.y, r: d.points.eye.r }
            : null),
      bouche: d.points && d.points.mouth,
      // CALIBRATION DU VISAGE, par ordre de préséance.
      // 1. `points.eye.r` — le rayon de l'œil DANS LES UNITÉS DU DESSIN. C'est
      //    la forme à préférer : l'artiste le règle en tirant sur un cercle
      //    posé sur son propre dessin, sans rien savoir du `size` interne de
      //    l'espèce. `drawFace` dessine l'œil à 0,22 fois la taille du visage,
      //    d'où la conversion.
      // 2. `faceK`/`faceTx`/`faceTy` — la forme en multiples de `size`, plus
      //    abstraite mais utile pour un rattrapage grossier.
      echelle: d.echelle, tailleJeu: d.tailleJeu, spriteScale: d.spriteScale,
      faceR: d.points && d.points.eye && d.points.eye.r,
      // Taille de la BOUCHE, indépendante de celle de l'œil. Elle en était
      // déduite, ce qui va sur un visage de dessin animé standard mais pas sur
      // une gueule de requin ou un bec d'oiseau. `drawFace` dessine la bouche à
      // ~0,2 fois la taille du visage, d'où la conversion.
      boucheR: d.points && d.points.mouth && d.points.mouth.r,
      faceK: d.faceK, faceTx: d.faceTx, faceTy: d.faceTy,
      shapes,
      // Le JSON d'origine, gardé tel quel : l'atelier le réenregistre enrichi
      // des ancres et des réglages de visage.
      source: d,
      // Ancrages de nageoire, RANGÉS PAR CALQUE : chacun porte un rayon
      // d'influence `r` qui pondère la rotation des points alentour
      // (cf. `tracerForme`). L'éditeur en autorise plusieurs sur un même calque.
      // Un appendice peut entraîner PLUSIEURS calques (`calques`). C'est ce qui
      // permet d'« aplatir » une patte dessinée en trois pièces, ou un poisson
      // dont la nageoire porte un liseré : sans ça il fallait poser un ancrage
      // par pièce, tous à régler à l'identique, et le moindre écart se voyait
      // comme une déchirure. `layerIndex` reste lu — les dessins déjà calés ne
      // bougent pas.
      appPar: (d.fins || []).reduce((acc, f) => {
        const brut = (f.calques && f.calques.length)
          ? f.calques
          : (f.layerIndex != null ? [f.layerIndex] : []);
        for (const i of brut) {
          const j = reindex[i];
          if (j == null) continue;
          (acc[j] || (acc[j] = [])).push(f);
        }
        return acc;
      }, {}),
    };
  },
};
