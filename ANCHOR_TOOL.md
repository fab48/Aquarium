# Poseur d'Ancrages — spécification de l'outil

Note technique sur l'outil que j'ai construit dans une conversation séparée
(pas dans ce dépôt — c'est un Artifact publié, HTML/JS autonome, aucune
dépendance). Le but ici : que l'autre session sache exactement ce qui existe
côté éditeur, pour évaluer l'écart avec `js/svgexport.js` / `js/sprites.js`
et décider s'il faut faire converger les deux formats ou écrire un
convertisseur.

**Où le trouver** : publié en Artifact, pas dans ce repo. Aucun fichier
correspondant sur disque — c'est un fichier `.html` autonome (~1300 lignes,
zéro dépendance externe hors Google Fonts) que je peux repartager sur
demande.

---

## 1. Ce que l'outil fait, en deux modes

Une bascule **📍 Repères** / **✏️ Dessiner** en haut de l'interface.

### Mode Repères

On charge un SVG (ou un PNG/JPG) et on clique pour poser des repères :
**Centre**, **Museau** (définit l'axe +x local), **Œil**, **Bouche**,
**Pivot queue**, et 0-N **Nageoires** (chacune avec un rayon d'influence
réglable). Trois panneaux de sortie se mettent à jour en direct :

1. **Calibration visage** — le `ctx.scale`/`ctx.translate` à coller avant
   `FishBody.drawFace(ctx, s, e.expression, t + e.phase)`.
2. **Ancrages d'animation** — objet JS `{ tail: {...}, fins: [...] }` pour
   la queue/les nageoires.
3. **Aperçu visage** — le vrai `FishBody.drawFace` (copié tel quel depuis
   `js/fishbody.js`) rejoué sur le dessin calibré, avec les 7 expressions
   (`idle/happy/eating/sleeping/dizzy/scared/blush`) et clignement d'œil
   animé — pour valider le calage **avant** d'aller coder.

Un bouton **Prévisualiser** anime aussi la queue/les nageoires du SVG chargé
(voir §3). Les deux aperçus (visage + déformation) tournent **en même
temps**, sur des calques séparés (`<canvas>` transparent au-dessus du SVG
animé), pour voir le rendu complet avant intégration.

### Mode Dessiner

Pour construire un poisson à la main plutôt que de vectoriser un PNG généré
par IA : on clique pour poser les sommets d'un polygone, on choisit sa
couleur, **Fermer la forme** l'ajoute à une pile de calques. Par calque :

- **couleur** éditable après coup
- **lisser** (case à cocher) : contour en courbes plutôt qu'en lignes droites
- **ordre** (↑↓, contrôle l'empilement)
- **✏️ Éditer** : clic sur le contour = insère un point au bon endroit
  (au plus proche segment, pas en fin de liste) ; clic droit sur un point =
  le retire (3 points mini)
- **🧷 Pivot** + curseur **amp** : la forme peut onduler/pivoter en
  aperçu (bouton **▶ Animer les formes**), pour tester queue/nageoire/
  tentacule directement sur le dessin en cours

Tous les points (en cours de tracé ou dans une forme fermée) sont
déplaçables au clic-glisser. Une image de fond (chargée) reste visible en
transparence réglable pour servir de calque de repérage.

**Export** : SVG aplati (voir §4), copiable ou téléchargeable, et un bouton
"Utiliser pour les repères ▸" qui bascule en mode Repères avec ce dessin
chargé (permet d'enchaîner dessin → calibration visage → export final sans
sortir de l'outil).

---

## 2. Système de coordonnées — important pour toute conversion

Tout est exprimé en **fractions de `size`**, jamais en pixels bruts, pour
coller directement à la convention déjà utilisée par
`FishBody.drawFace(ctx, size, ...)` (où l'œil est à `size*0.55, -size*0.18`).

La conversion pixel → fraction se fait via **deux repères de calibration** :
**Centre** (origine locale) et **Museau** (définit la direction `+x` — vers
la tête — et l'échelle : distance Centre↔Museau = **1,0 unité**). Tout autre
point cliqué est ensuite exprimé dans ce repère tourné/mis à l'échelle. Sans
Centre+Museau posés, l'outil affiche les coordonnées en pixels bruts
(`xPx`/`yPx`) à la place, avec un commentaire explicite dans l'export.

---

## 3. Le moteur de déformation (queue / nageoires / tentacules)

**Pas de découpe.** Le tracé reste un seul chemin continu ; chaque point est
pivoté d'un angle qui dépend de sa **distance** à un pivot :

```js
function smooth01(v){ v = Math.max(0, Math.min(1, v)); return v*v*(3-2*v); } // smoothstep
function rotate(x,y,cx,cy,angleDeg){ /* rotation standard autour de (cx,cy) */ }

// queue : poids = 1 côté queue, 0 côté corps, transition sur `blend` px
const wt = smooth01((tail.x + blend - x) / (2*blend));

// nageoire : poids = 1 au pivot, 0 à distance `r`, transition smoothstep
const wf = smooth01(1 - Math.hypot(x-f.x, y-f.y) / f.r);
```

La transition étant une fonction lisse (pas un seuil), il ne peut pas y
avoir de couture visible — c'est la raison d'être de cette approche plutôt
qu'un découpage en pièces rigides avec recouvrement.

**Ciblage par calque** (mode Repères uniquement) : chaque nageoire/la queue
peut être restreinte à un `<path>` précis du SVG chargé (menu déroulant
"Calque N (couleur)") plutôt que d'agir par pure proximité géométrique sur
tous les points — évite qu'une forme voisine soit entraînée par erreur.

**Mode Dessiner** : même principe, mais le rayon d'atténuation est **déduit
automatiquement** de la diagonale de la boîte englobante de la forme
(`× 0,75`) — pas de réglage manuel de rayon, juste pivot + amplitude.

---

## 4. Formats de sortie exacts

### 4.1 Calibration visage (mode Repères)

```js
ctx.save();
ctx.scale(0.931, 0.931);
ctx.translate(s * 0.563, s * -0.453);
FishBody.drawFace(ctx, s, e.expression, t + e.phase);
ctx.restore();
```

`k` est dérivé de la distance œil↔bouche cliquée vs le gabarit interne de
`drawFace` (`ex=0.55, ey=-0.18, mx=0.82, my=0.12`) ; `tx/ty` calent l'œil
**exactement**, la bouche restant approximative si sa géométrie diffère du
gabarit (l'outil affiche l'écart en %).

### 4.2 Ancrages d'animation (mode Repères)

```js
const ANCHORS = {
  tail: { x: -0.195, y: 0.127, blend: 0.189 },  // fractions de size
  fins: [
    { x: 0.173, y: 0.526, r: 0.336 },
  ]
};
```

(Bascule en `xPx/yPx/blendPx/rPx` si Centre+Museau non posés.)

### 4.3 SVG dessiné à la main (mode Dessiner)

SVG aplaté, un `<path>` par calque, dans l'ordre d'empilement :

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="238" height="183" viewBox="0 0 238 183">
  <path d="M 71.3 72.7 C 132.1 49.6 ... Z" fill="#fc8327"/>
</svg>
```

Coordonnées en **pixels de l'image source** (pas en fractions — ce SVG est
fait pour être rechargé tel quel dans l'outil, ou ouvert dans Inkscape).
`C` seulement si "lisser" est coché (Catmull-Rom uniforme → Bézier cubique,
tension 1/6 standard), sinon `L`.

**Ce format ne contient ni pivot ni amplitude ni ancrage visage** — ces
métadonnées (`fins[].r`, `shapes[].pivot/amp`, calibration visage) vivent
**séparément**, dans les panneaux §4.1/4.2 et dans le projet JSON (§4.4). Il
n'existe **pas aujourd'hui** d'export unique combinant silhouette + pivots +
calibration en un seul objet par calque — c'est l'écart principal avec le
schéma `shapes[].pivot/amp` + `faceK/Tx/Ty` que `js/sprites.js` attend déjà
dans un seul JSON. Void possible : ajouter un mode d'export qui produit
directement ce JSON combiné plutôt que le SVG aplati + les 3 panneaux
séparés.

### 4.4 Projet complet (`.json`, bouton "💾 Sauver le projet")

Sauvegarde/restauration de **tout l'état de travail** (pas juste le rendu
final) :

```json
{
  "version": 1,
  "naturalW": 238, "naturalH": 183,
  "sourceKind": "svg",
  "sourceRaw": "<svg...>",
  "points": { "center": {"x":.., "y":..}, "nose": {...}, "eye": {...}, "mouth": {...}, "tail": {...} },
  "fins": [ { "x":.., "y":.., "r":.., "layerIndex": null } ],
  "tailBlend": 45, "tailLayerIndex": null,
  "shapes": [ { "points": [[x,y],...], "fill": "#fc8327", "smooth": false, "pivot": null, "amp": 15 } ]
}
```

`sourceKind` vaut `"svg"` ou `"raster"` ; `sourceRaw` est le texte SVG brut
ou une data-URL PNG/JPG — le fichier projet est **autonome**, il réembarque
l'image de référence, pas besoin de recharger le fichier source à part.

---

## 5. Enregistrement de fichiers — capacité `downloads`

L'Artifact déclare `capabilities: {downloads: true}`. Boutons
**💾 Enregistrer le .svg** / **💾 Sauver le projet (.json)** utilisent
`await claude.use("downloads")` → `downloads.save({filename, data})` — la
vraie boîte de dialogue d'enregistrement du navigateur, pas un `<a
download>` (bloqué par le bac à sable de l'Artifact). Si la capacité n'est
pas disponible dans l'environnement du viewer, les boutons restent masqués
et **Copier** (presse-papiers) reste le repli universel, toujours présent.

---

## 6. Écarts connus avec `js/sprites.js` (au 2026-09-04)

D'après la lecture de `SPRITES.md` mis à jour par l'autre session :

| | Cet outil | `js/sprites.js` |
|---|---|---|
| Calibration visage principale | `faceK/faceTx/faceTy` (fractions de `size`) | `points.eye.r` (rayon en pixels du dessin, converti via `r / 0.22`) — `faceK/Tx/Ty` en repli seulement |
| Bouche | dérivée du même `k` que l'œil (résiduelle) | ancre `mouth` honorée **séparément** (`FishBody.bouche()`) |
| Queue | pivot + `blend` (largeur de transition, px ou fraction) | seuil `tailBlend` (x en deçà duquel un point est "queue"), déviation en `u²` |
| Nageoire | pivot + rayon d'atténuation `r` (proximité) | pivot + `amp`, **rotation rigide** (pas d'atténuation par distance) |
| Échelle du dessin | implicite (le SVG chargé fait référence) | `spriteScale` explicite, calé sur ~2,5× `size` |
| Export combiné silhouette+pivots+visage | **non** (3 sorties séparées, §4) | **oui** (un seul JSON par espèce) |

Le point le plus utile à trancher ensemble : si `js/sprites.js` reste la
référence côté jeu, le plus simple est probablement d'ajouter à l'outil un
export qui **imite directement son schéma** (`points.eye.r`, `shapes[].pivot
+ amp`, `tailBlend` en seuil simple) plutôt que de faire converger les deux
moteurs de déformation (proximité vs seuil `u²`) — ce sont deux façons
différentes d'obtenir un résultat visuellement proche, pas une divergence à
corriger.
