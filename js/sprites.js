// Sprites vectoriels produits par l'éditeur SVG (Assets/*.json).
//
// Le format de l'éditeur, tel qu'il est consommé ici :
//   naturalW/H  — dimensions du dessin d'origine
//   points      — ANCRES : center (origine de la créature), nose, eye, mouth, tail
//   base        — { primaire, secondaire } : les deux couleurs du dessin. La
//                 secondaire donne son défaut à l'encre du visage (donc au
//                 sourcil et au trait de la bouche).
//   visage      — PALETTE du visage commun : encre, pupille, gorge, langue,
//                 lèvres, bec, joue, plus `trait` — le POIDS du trait, en
//                 multiples de l'épaisseur d'origine. Surcharge partielle de
//                 `FishBody.VISAGE`.
//   bec         — { haut, bas, angle, ecart, long } : les deux mandibules se
//                 règlent SÉPARÉMENT (un pélican a une mandibule inférieure
//                 énorme, un goéland l'inverse), avec l'orientation du bec et le
//                 jour qui reste entre elles bec fermé.
//   boucheStyle — forme de la bouche : standard, grande, petite, gueule (à
//                 dents), bec, ventouse. Ce que la bouche EXPRIME reste piloté
//                 par les émotions, identiques pour tout l'aquarium.
//   shapes[]    — { points: [[x,y]…], fill, smooth, pivot, amp, groupe,
//                   stroke/lineWidth (contour), alpha, lueur, degrade, couleur }
//                 `degrade` : { type: 'lineaire'|'radial', ang, de, vers,
//                               debut, fin } — la transition a un DÉBUT et une
//                             FIN : confondus, frontière franche ; écartés,
//                             fondu large, et on choisit où.
//                 `reflet`  : { x, y, largeur, epaisseur, angle, courbe, force,
//                               couleur, dessus } — la bande de lumière.
//                             `courbe` (-1..1) la tord d'un côté ou de l'autre
//                             (un dos n'est pas plat) ; `dessus` la reporte
//                             par-dessus TOUS les calques, une lumière étant
//                             posée par l'éclairage et non par l'ordre
//                             d'empilement.
//                             — la bande de lumière sur le dos, DÉCOUPÉE dans le
//                             contour déformé, donc elle ondule avec la nage.
//                 `couleur` : { mode: 'espece'|'especeSombre'|'palette'|'teinte',
//                               couleurs[], amplitude } — la teinte devient
//                             PROPRE À L'INDIVIDU, comme `Entity.color` le fait
//                             déjà pour les silhouettes procédurales.
//                 `lueur`   : bioluminescence (halo), bridée à la nuit quand
//                             l'espèce déclare `glowAtNight`.
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
//   tailAxe     — SENS de l'ondulation, en degrés : 90 = vertical (défaut,
//                 baleine), 0 = horizontal (requin). Une baleine bat une caudale
//                 horizontale de haut en bas ; un poisson balaie une caudale
//                 verticale de gauche à droite. Vu de côté, ce n'est pas le
//                 même geste.
//   tailOndes   — nombre d'ondes le long de la queue. 0 = battement d'un seul
//                 tenant (un poisson) ; 1 ou 2 = onde qui COURT vers le bout
//                 (une murène, une anguille — le corps entier est un tentacule).
//   queueCalques— restreint l'ondulation à certains calques (défaut : tous)
//   vitesse     — multiplicateur de cadence du dessin entier (défaut 1)
//   vitesseQueue— multiplicateur propre à l'ondulation du corps (défaut 1)
//   masques     — calques éteints. Réglage de TRAVAIL de l'atelier (voir sous
//                 une pièce sans la supprimer), retiré à l'enregistrement.
//   fins[]      — APPENDICES posés par l'éditeur. Deux types :
//                 `nageoire`  (défaut) — rotation autour de l'ancre, pondérée
//                             par la distance : plein effet au centre, nul au
//                             bord du rayon `r`.
//                 `tentacule` — onde progressive le long d'un axe : base à
//                             l'ancre, direction `ang`, longueur `r`. C'est ce
//                             qu'il faut pour une patte, une antenne, un bras
//                             de poulpe — une rotation en bloc les rend raides.
//                 `aile`      — l'angle CROÎT le long de l'envergure (l'épaule
//                             tient, le bout décrit tout l'arc) et il est
//                             RETARDÉ (`ondes` = la souplesse), donc l'aile se
//                             courbe. Battement asymétrique : descente vive sur
//                             35 % du cycle, remontée lente sur 65 %. Un sinus
//                             bat autant vers le haut que vers le bas.
//                             `flip` (0..1, défaut 0,55) ÉCRASE la corde selon
//                             la position dans la course : l'aile se présente de
//                             face aux extrêmes et sur la tranche au passage du
//                             milieu, puis montre son autre face. Sans lui,
//                             c'est un éventail rigide qui monte et descend.
//                 `pince`     — une CHARNIÈRE et deux mâchoires : seule celle
//                             d'un côté de l'axe `ang` pivote. Elle reste
//                             fermée 55 % du cycle, s'ouvre en douceur, puis
//                             claque. Un sinus ne sait pas dire « clac » : il
//                             referme aussi lentement qu'il ouvre.
//                 Communs : `calques` (les formes entraînées), `miroir`,
//                 `amp`, `phase`, `vitesse`, et `source` — ce QUI pilote
//                 l'appendice. Par défaut la nage ; `'coquille'` le branche sur
//                 l'ouverture d'un coquillage, qui suit l'ÉTAT de la créature
//                 (entrouverte en dormant, qui glousse en mangeant, grande
//                 ouverte sur une perle) et non le battement du corps. C'est ce
//                 qui rend à un coquillage DESSINÉ l'animation de sa silhouette.
//
// Le fichier est écrit par `atelier.html`. `Assets/sprites.json` dit quelle
// espèce utilise quel dessin (voir `init`).
//
// Chargement asynchrone : tant que le fichier n'est pas là, la silhouette
// procédurale continue d'être dessinée. Aucune frame n'attend un sprite.
const Sprites = {
  cache: {},              // nom -> objet préparé | null (en cours) | false (échec)

  // LA BIBLIOTHÈQUE DE CLIPS PARTAGÉE (`Assets/clips.json`, décision
  // d'auteur) : des timelines de poses clés utilisables par TOUTES les
  // espèces. La chorégraphie est commune, mais les clés référencent des POSES
  // — que chaque animal redéfinit dans son dessin : le poulpe joue le même
  // clip que le thon avec son propre corps. Un clip local au dessin
  // (`doc.clips`) l'emporte sur celui de la bibliothèque du même nom, et les
  // vieilles `animes` du dessin comptent comme des clips locaux.
  clips: {},
  clipDe(sp, nom) {
    return (sp && sp.clips && sp.clips[nom])
        || (sp && sp.animes && sp.animes[nom])
        || this.clips[nom] || null;
  },

  // Le manifeste `Assets/sprites.json` associe une espèce à son dessin :
  //     { "requin": "SharkSVG", "murene": null }
  // C'est lui qui permet d'ACTIVER un sprite depuis l'atelier sans toucher au
  // code : une page web ne peut pas modifier `species.js`, et lui faire réécrire
  // du source serait de toute façon une très mauvaise idée. `null` désactive
  // explicitement une espèce, ce qui la ramène à sa silhouette procédurale même
  // si sa fiche déclare un `sprite:` — c'est ainsi qu'on garde celles qui
  // marchent bien telles quelles.
  init() {
    // DESSINS EMBARQUÉS (`build.py --inline`). `fetch` est bloqué par CORS sur
    // `file://` : un fichier unique qu'on ouvre d'un double-clic perdrait donc
    // TOUS ses sprites et rendrait des silhouettes procédurales, en silence.
    // Quand la page les a embarqués, il n'y a rien à aller chercher.
    const pre = this.PRECHARGE;
    if (pre) for (const nom in pre.dessins) this.cache[nom] = this.preparer(pre.dessins[nom]);
    // La bibliothèque de clips embarquée doit se charger AVANT le retour
    // anticipé du mode embarqué, comme les dessins.
    if (pre && pre.clips) this.clips = pre.clips;

    for (const id in SPECIES) if (SPECIES[id].sprite) this.charger(SPECIES[id].sprite);
    if (pre) { this.appliquerManifeste(pre.manifeste); return; }

    fetch('Assets/sprites.json')
      .then(r => (r.ok ? r.json() : null))
      .then(m => { if (m) this.appliquerManifeste(m); })
      .catch(() => {});     // pas de manifeste = rien à faire, cas normal

    // La bibliothèque de clips partagée. Asynchrone comme le reste : tant
    // qu'elle n'est pas là, seuls les clips locaux des dessins jouent.
    // (En mode embarqué, `PRECHARGE.clips` la fournit — cf. plus haut.)
    fetch('Assets/clips.json')
      .then(r => (r.ok ? r.json() : null))
      .then(c => { if (c) this.clips = c; })
      .catch(() => {});     // pas de bibliothèque = cas normal
  },

  appliquerManifeste(m) {
    this.manifeste = m;
    for (const id in m) {
      if (!SPECIES[id]) continue;
      if (m[id]) { SPECIES[id].sprite = m[id]; this.charger(m[id]); }
      else delete SPECIES[id].sprite;
    }
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
      // Sens de l'ondulation, en degrés. 90 = vertical (défaut, et le cas d'une
      // baleine, qui bat une caudale horizontale) ; 0 = horizontal (un requin,
      // qui balaie une caudale verticale vers le spectateur et loin de lui).
      tailAxe: d.tailAxe,
      // VITESSES D'ANIMATION, réglées dans l'atelier. `vitesse` multiplie la
      // cadence de tout le dessin (elle est déduite de l'allure et du gabarit,
      // ce qui est juste en moyenne et faux sur une créature en particulier) ;
      // `vitesseQueue` ne touche que l'ondulation du corps, chaque appendice
      // gardant en plus la sienne (`fins[].vitesse`).
      vitesse: d.vitesse || 1,
      vitesseQueue: d.vitesseQueue || 1,
      // POSES DE SCÈNE dessinées dans l'atelier (éditeur de colonne) : par nom
      // (`cabre`, `crash`…), chacune = les cinq poignées de la colonne
      // vertébrale {dy, sy, sx}. Lues par FishBody.rendreScene, qui a des
      // poses par défaut pour les dessins qui n'en déclarent pas.
      poses: d.poses || null,
      // ANIMATIONS PAR ÉVÉNEMENT (timeline de poses clés, dessinées dans
      // l'atelier) : `{ mange: { boucle, cles: [{ t, pose, visage }] } }`.
      // Jouées par `Entity.jouerAnime` quand l'événement du même nom survient ;
      // sans animation déclarée, le comportement générique reste la règle.
      animes: d.animes || null,
      // CLIPS locaux au dessin (une variante propre à l'animal l'emporte sur
      // la bibliothèque partagée du même nom, cf. `Sprites.clipDe`).
      clips: d.clips || null,
      // SCÈNES : `[{ si: 'collision', avec: 'sol', conditions via le champ
      // homonyme `si` de la règle (vitesseMin…), jouer, cooldown }]` —
      // « SI événement ALORS play clip ». Le bus `Entity.evenement` les
      // filtre. Vocabulaire fermé, purement visuel. (`regles` est l'ancien
      // nom du même format, toujours lu ; son champ type s'appelait `quand`.)
      scenes: d.scenes || d.regles || null,
      queueCalques: vises(d.queueCalques),
      // CALQUES MASQUÉS. Réglage de travail de l'atelier — on éteint une pièce
      // le temps de voir ce qu'il y a dessous — jamais enregistré dans le
      // fichier. Il passe par `vises()` comme les autres listes d'indices :
      // une forme écartée par le filtre ci-dessus décale toutes les suivantes.
      masques: vises(d.masques),
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
                y: d.points.eye.y,
                // TAILLE PROPRE AU SECOND ŒIL (`eye.r2`). Sur une tête vue de
                // trois quarts, l'œil du fond est plus petit que celui de
                // devant : les faire égaux aplatit le visage. Absente, elle
                // suit le premier — les dessins déjà calés ne bougent pas.
                r: d.points.eye.r2 != null ? d.points.eye.r2 : d.points.eye.r }
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
      // PALETTE DU VISAGE et STYLE DE BOUCHE, réglés dans l'atelier. Le visage
      // commun reste dessiné par-dessus le dessin — c'est la règle du projet —
      // mais il n'a plus à être le même trait d'encre pour tout le monde : un
      // bec orange, une pupille dorée, une gueule à dents sont des réglages du
      // dessin, pas un rendu de plus à écrire.
      // COULEURS DE BASE du dessin. La secondaire donne son DÉFAUT à l'encre du
      // visage — donc au trait de la bouche et au sourcil, qui la suivent — pour
      // qu'un liseré de forme et un sourcil ne jurent pas l'un à côté de l'autre.
      // Une couleur déclarée à la main dans `visage` l'emporte toujours.
      bec: d.bec || null,
      visage: (d.base && d.base.secondaire)
        ? Object.assign({ encre: d.base.secondaire, sourcil: d.base.secondaire }, d.visage || {})
        : (d.visage || null),
      boucheStyle: d.boucheStyle || null,
      shapes,
      // Boîte de chaque forme, en unités du dessin : c'est le repère dans lequel
      // se construisent les dégradés et se centrent les halos de luminescence.
      // Relevée une fois ici plutôt qu'à chaque frame pour chaque individu.
      boites: shapes.map(sh => {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of sh.points) {
          if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
          if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
        }
        return isFinite(x0) ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 1, y1: 1 };
      }),
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
