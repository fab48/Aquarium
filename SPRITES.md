# Le pont avec l'éditeur SVG

Comment un animal dessiné à la main entre dans le jeu, et comment un animal du
jeu en ressort pour être redessiné. **Ce document décrit ce qui est implémenté**
— il remplace la note de recherche qui le précédait, dont les décisions §3 et §4
ont été tranchées autrement à l'usage (voir « Écarts avec la note initiale »).

Le trajet complet :

```
silhouette procédurale ──SVGExport.telecharger()──▶ .svg ──▶ éditeur
                                                                │
      jeu ◀──sprites.js──── Assets/<Nom>.json ◀──enregistrer────┘
```

---

## 1. Sortir un animal du jeu (`js/svgexport.js`)

26 des 27 espèces n'existaient que sous forme de code. Pour les redessiner il
faut d'abord les extraire. Depuis la console du jeu :

```js
SVGExport.telecharger('requin')   // un fichier requin.svg
SVGExport.tout()                  // les 27, à ~350 ms d'intervalle
SVGExport.svg('meduse')           // la chaîne, pour inspection
```

Le module rejoue la silhouette dans un **faux contexte 2D qui enregistre au lieu
de peindre** : il implémente le sous-ensemble de Canvas2D qu'utilisent les
silhouettes (`moveTo`, `quadraticCurveTo`, `arc`, `ellipse`, `fill`, `stroke`,
la pile de transformations…) et applique la matrice courante **aux points au
moment où ils sont enregistrés**. Le SVG produit n'a donc aucune transformation
imbriquée à recomposer : un `<path>` par coup de pinceau, en coordonnées
absolues. Les arcs sont convertis en **cubiques** (découpe à 90°, formule exacte
des tangentes) — un échantillonnage en polyligne donnerait des contours facettés,
inexploitables dans un éditeur vectoriel.

**Le visage n'est pas exporté**, volontairement : le jeu le redessine par-dessus
le sprite (règle du projet, cf. CLAUDE.md). Ses ancres sont relevées au vol et
écrites dans `<metadata>`. Deux points d'entrée à intercepter — `drawFace` pour
un visage groupé et `oeil` pour les yeux isolés (crabe sur tiges, coquillage
entre ses valves) : sans le second, le crabe s'exportait avec ses yeux, l'artiste
les aurait redessinés, et le jeu en aurait remis par-dessus.

Non exportés non plus, faute d'équivalent direct : les lueurs (`shadowBlur`) et
les découpes (`clip`). La silhouette sortie est le trait nu.

Les ancres sont en **métadonnée seulement**, jamais en formes dessinées : un
éditeur les importerait comme des calques et il faudrait effacer des ronds
parasites sur chaque poisson.

```xml
<metadata>{"aquarium":1,"species":"requin","name":"Requin Dents-Molles",
 "points":{"center":{...},"nose":{...},"eye":{...},"mouth":{...},"tail":{...}},
 "tailBlend":123,"faceK":0.75}</metadata>
```

---

## 2. Faire entrer un dessin (`js/sprites.js`)

Déposer le JSON dans `Assets/`, puis ajouter un champ à la fiche d'espèce :

```js
requin: { …, sprite: 'SharkSVG' },      // -> Assets/SharkSVG.json
```

Le chargement est **asynchrone et tolérant** : tant que le fichier n'est pas là
(ou s'il est illisible), la silhouette procédurale continue d'être dessinée.
Aucune frame n'attend un sprite, aucune espèce ne disparaît sur une faute de
frappe dans un nom de fichier.

### Ce que le jeu lit dans le JSON

| Champ | Rôle | Si absent |
|---|---|---|
| `naturalW`, `naturalH` | dimensions du dessin | la boîte des points fait foi |
| `points.center` | **origine de la créature** : le point posé à `(entity.x, entity.y)` | centre de la boîte |
| `points.eye` | ancre de l'œil (et du sourcil, de la joue) | pas de visage |
| `points.eye.r` | **taille de l'œil, en unités du dessin** — la calibration à préférer (§3) | on passe à `faceK` |
| `points.mouth` | ancre de la bouche, **honorée séparément** | bouche à sa place par défaut |
| `points.nose`, `points.tail` | repères de l'éditeur | ignorés par le jeu |
| `shapes[].points` | contour, `[[x,y], …]` | — |
| `shapes[].fill` | couleur pleine | gris |
| `shapes[].smooth` | contour lissé plutôt qu'en ligne brisée | lignes droites |
| `shapes[].pivot` | rotation en bloc de la forme — **repli** quand aucun `fins[]` ne la vise | elle ondule |
| `fins[]` | `{x, y, r, layerIndex}` : ancrage de nageoire et son **rayon d'influence** | pas de nageoire animée |
| `shapes[].amp` | amplitude d'animation | 15 |
| `tailBlend` | x en deçà duquel les points appartiennent à la queue | rien n'ondule |
| `faceK`, `faceTx`, `faceTy` | calibration du visage en multiples de `size` (repli, §3) | `def.spriteFace`, puis 0,75 |

### Les quatre règles du rendu

1. **Les deux ancres sont honorées séparément.** Caler le seul œil et laisser la
   bouche à sa place par défaut ne marche pas : le visage commun met la bouche en
   avant et à peine plus bas que l'œil, alors que le requin de l'éditeur l'a
   presque à la verticale. Elle atterrissait 4 px trop en avant, **sur le
   museau**. D'où `FishBody.bouche()`, extraite de `drawFace` — même rôle que
   `FishBody.oeil()` pour l'œil isolé.
2. **Le dessin est mis à la largeur d'une silhouette procédurale**, mesurée à
   ~2,5 fois `size` (99 px relevés sur un requin de 40). À `size * 2` (77 px) puis
   à `size * 2 * spanRatio` (84 px) le requin paraissait rabougri au milieu des
   autres. `spriteScale` rattrape un dessin plus serré ou plus large, **sans
   toucher à l'emprise physique** (`spanRatio`, que lisent l'anti-chevauchement
   des colosses et les distances de prise).
3. **La taille du visage vaut 0,75 × `size` par défaut.** À 1 — la valeur des
   silhouettes procédurales — l'œil débordait du museau du requin, dont la tête
   est plus fine. Comparé à l'écran entre 1, 0,75 et 0,58. `faceK` (exporté par
   le panneau « Calibration visage » de l'éditeur) prime, puis `def.spriteFace`.
4. **La queue ondule, les nageoires se déforment.** Les points en deçà de
   `tailBlend` sont déviés en `u²` — le battement part du pédoncule caudal, pas du
   milieu du corps, sinon le poisson se tortille comme une chenille. L'amplitude
   suit **l'effort** et pas seulement la fréquence : à l'amplitude nue de
   l'éditeur, le bout de la queue ne parcourait que 5,5 px sur une silhouette
   de 48.
5. **Une nageoire n'est pas un calque qu'on fait tourner en bloc.** L'éditeur
   fait pivoter **chaque point** autour de l'ancre `fins[i]`, pondéré par sa
   distance : plein effet sur l'ancre, nul au-delà du rayon `r`, avec un lissage
   en S (`smoothstep`) entre les deux — c'est ce qui évite la couture visible au
   raccord avec le corps. La rotation rigide que faisait le jeu montrait donc
   autre chose que ce que l'artiste voyait dans l'outil. `shapes[].amp` est lu en
   **degrés**, l'unité du curseur de l'éditeur.

---

## 3. Le panneau « Calibration visage » (à ajouter dans l'éditeur)

Le jeu pose son visage commun sur le dessin : l'œil (avec son sourcil et sa
joue) sur l'ancre `eye`, la bouche sur l'ancre `mouth`. Restait à dire **à
quelle taille**. `calibrage.html` fait ce réglage en direct et sert
d'implémentation de référence : ouvrir un JSON, tirer les curseurs, copier.

### Un seul contrôle suffit : le rayon de l'œil

**`points.eye.r`** — le rayon de l'œil **dans les unités du dessin**. C'est la
forme à préférer, et de loin : dans l'éditeur, l'ancre `eye` devient un
**cercle qu'on étire** au lieu d'un simple point. L'artiste règle la taille de
l'œil sur son propre dessin, à vue, sans jamais rencontrer le `size` interne de
l'espèce.

| | |
|---|---|
| Unité | pixels du dessin (mêmes que `shapes[].points`) |
| Plage utile | ~2 % à ~25 % de la largeur du dessin |
| Conversion côté jeu | taille du visage = `r / 0.22` (`drawFace` dessine l'œil à 0,22 fois cette taille) |
| Valeur de départ à proposer | voir « déduction » ci-dessous |

**Déduction automatique**, à utiliser comme valeur initiale du cercle : mesurer
la hauteur du corps à l'aplomb de l'ancre (points situés à moins de 12 % de la
largeur du dessin, en x, de l'ancre `eye`) et prendre **le quart** de cette
hauteur. Une tête fine donne un petit œil, une grosse tête un gros œil. Vérifié
sur le requin : la déduction donne une taille de visage de **35,3**, contre
**34,5** pour la valeur calée à la main. L'artiste n'a en général rien à
toucher.

### Le repli, si le cercle n'est pas implémenté

**`faceK`**, **`faceTx`**, **`faceTy`** — la même chose exprimée en multiples du
`size` de l'espèce. Plus abstrait (ce `size` n'apparaît nulle part dans
l'éditeur), mais utile pour un rattrapage grossier.

| Champ | Rôle | Plage | Défaut |
|---|---|---|---|
| `faceK` | taille du visage, en fraction de `size` | 0,25 → 1,6 | 0,75 |
| `faceTx` | décalage horizontal de tout le visage, en fractions de sa taille | −0,6 → 0,6 | 0 |
| `faceTy` | décalage vertical, idem | −0,6 → 0,6 | 0 |

Préséance dans le jeu : `points.eye.r`, puis `faceK`, puis `def.spriteFace`
(réglage d'espèce, côté code), puis **0,75** — la valeur comparée à l'écran
entre 1, 0,75 et 0,58. À 1, la valeur des silhouettes procédurales, l'œil
débordait du museau du requin.

`faceTx`/`faceTy` deviennent inutiles dès que les deux ancres sont bien posées :
elles ne servent qu'à rattraper un visage globalement décalé.

### Prévisualiser dans l'éditeur

Le panneau n'a d'intérêt que s'il **montre le résultat**. Le code à reprendre
tient dans la fonction `dessiner()` de `calibrage.html` : charger `utils.js`,
`species.js`, `sprites.js` et `fishbody.js`, boucher `Main`/`World`/`Camera`
(quelques lignes en tête de la page), fabriquer un faux poisson, appeler
`FishBody.draw`. Aucune duplication du système d'expressions : c'est le code du
jeu qui dessine.

Prévisualiser **plusieurs humeurs**, pas seulement le repos : la bouche du
ronflement (`sleeping`) et le sourcil de la colère (`angry`) sont les deux qui
débordent en premier d'une tête trop petite.

---

## 4. Contrôle non visuel

Comparer l'emprise d'un sprite et de la silhouette qu'il remplace, sans se fier à
l'œil ni à une capture d'écran (le compositeur du navigateur retarde souvent
d'une frame) : rendre les deux hors écran et mesurer l'encre.

```js
function mesure(e, avecSprite) {
  const c = document.createElement('canvas'); c.width = 700; c.height = 400;
  const g = c.getContext('2d'); g.translate(350, 200);
  const def = e.def, sv = def.sprite;
  if (!avecSprite) delete def.sprite;
  FishBody.draw(g, e, 1.0);
  def.sprite = sv;
  // … balayer getImageData et relever la boîte des pixels d'alpha > 20
}
```

Relevé après calibrage : requin de 45 → sprite **111 × 49**, procédural
**112 × 63**. Longueur alignée ; la hauteur reste moindre parce que le dessin est
plus fin que l'ellipse procédurale, ce qui est le but.

---

## 5. Écarts avec la note initiale

La note de recherche qui occupait ce fichier proposait quatre choses ; deux ont
été retenues, deux ont été tranchées autrement une fois le format réel de
l'éditeur sous les yeux (`Assets/SharkSVG.json`).

| Note initiale | Retenu | Pourquoi |
|---|---|---|
| Pas d'image, du vectoriel | **oui** | un sprite reste de la donnée, comme une fiche `SPECIES` |
| Un fichier = une espèce | **oui** | mais la clé est `sprite: '<NomDeFichier>'`, pas `render: 'sprite'` + `spriteId` : `render` continue de désigner la silhouette de repli |
| Coordonnées en fractions de `size` | **non** | l'éditeur exporte des **pixels natifs** ; la mise à l'échelle se fait au rendu, à partir de `naturalW` et de la boîte réelle des points |
| Préchargement bloquant avant `Main.init()` | **non** | `fetch` en tâche de fond : le jeu démarre immédiatement et une espèce sans sprite garde sa silhouette. Un préchargement bloquant fait dépendre le démarrage d'un fichier manquant |

`Path2D` avec cache reste une optimisation valable si le nombre de sprites
devient important — non faite : le rendu des créatures coûte 0,7–1 ms par frame
sur ~380 individus, ce n'est pas le goulot (cf. CLAUDE.md, « Performance »).

---

## 6. Ce qui manque encore

- **Un sprite par espèce.** Seul le requin en a un. Les 26 SVG de départ
  s'obtiennent avec `SVGExport.tout()`.
- **Le cercle de l'ancre `eye` dans l'éditeur** (§3). Le jeu lit déjà
  `points.eye.r` et les trois `face*` ; `SharkSVG.json` n'en contient aucun et
  retombe sur 0,75, ce qui lui va.
- **Le miroir.** Un dessin est fait tourné vers la droite ; le jeu le retourne
  par `scale(-1, 1)` avec le demi-tour animé. Rien à faire côté éditeur, mais un
  dessin asymétrique (une tache sur un seul flanc) se retrouvera de l'autre côté
  la moitié du temps.
- **Les créatures posées au sol** (crabe, étoile, coquillage, ver, anémone,
  murène) pivotent avec la pente du fond. Leur dessin doit donc être fait
  **horizontal**, pas incliné.
