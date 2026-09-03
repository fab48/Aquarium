# Sprites dessinés à la main — note de recherche

Comment brancher un poisson dessiné à la main (via l'outil "Poseur d'ancrages")
sur le rendu du jeu, sans jamais charger d'image. Rien n'est câblé pour
l'instant — ce document fixe la décision d'architecture avant de coder, pour
ne pas la re-découvrir plus tard.

---

## 1. Pas d'image : `Path2D`

Premier réflexe (mauvais) : traiter un poisson dessiné comme un sprite —
charger un PNG/SVG en `Image`, `ctx.drawImage()`. Ça marche, mais ça
introduit du chargement asynchrone et une brique qui n'existe nulle part
ailleurs dans le moteur.

`CanvasRenderingContext2D` a un jumeau vectoriel natif, **`Path2D`**, qui
accepte soit une chaîne de syntaxe SVG (`new Path2D("M ... C ... Z")`), soit
les mêmes méthodes que `ctx` (`.moveTo()`, `.bezierCurveTo()`,
`.closePath()`). Donc :

- **Aucune image, aucun préchargement d'asset visuel.** Un poisson dessiné
  est juste de la donnée (points + couleur), au même titre qu'une entrée
  `SPECIES` — cohérent avec le principe déjà en place ("espèces 100 %
  data-driven").
- **Le code de rendu existe déjà.** Le `redraw()` de l'outil (mode Dessiner)
  construit ces formes via `ctx.moveTo`/`ctx.bezierCurveTo`/`ctx.lineTo` pour
  son propre aperçu — même API que `Path2D`. Le calque animé (queue/nageoire)
  de l'outil utilise déjà `bentShapePoints()` (poids par distance à un pivot,
  `smooth01`, `rotate`) : c'est directement la fonction à rejouer chaque
  frame côté jeu, avec `t` et `e.speedNow` du poisson réel au lieu du temps
  de l'aperçu.

**Coût de rendu** : un calque **statique** construit son `Path2D` une seule
fois (au chargement des données, pas par frame) puis `ctx.fill(path)` —
moins cher que les silhouettes procédurales actuelles qui refont leur
`beginPath()` à chaque image. Un calque **animé** reconstruit un `Path2D`
frais chaque frame à partir des points déformés — même ordre de grandeur que
la nageoire pectorale que `drawFishBody()` recalcule déjà pour toutes les
espèces existantes.

---

## 2. Nomenclature : le fichier = la clé de l'espèce

`species.js` a déjà un id interne par espèce (`sardine`, `maquereau`...),
clé de l'objet `SPECIES`. Un fichier de sprite = une espèce, nommé pareil :

```
assets/sprites/sardine.json
assets/sprites/maquereau.json
```

Et côté `species.js`, un seul champ fait le lien :

```js
sardine: {
  ...
  render: 'sprite', spriteId: 'sardine',   // -> assets/sprites/sardine.json
}
```

Grep-able, sans ambiguïté. Rien n'empêche plus tard deux espèces de pointer
vers le même `spriteId` (recolorisation) si le besoin se présente.

---

## 3. Schéma JSON pressenti

Calqué sur ce que l'outil sait déjà produire par calque, coordonnées en
**fractions de `size`** (jamais de pixels bruts — c'est la même convention
que `FishBody.drawFace`, où l'œil est à `size * 0.55`) :

```json
{
  "faceK": 0.93, "faceTx": 0.25, "faceTy": -0.05,
  "layers": [
    { "points": [[x, y], ...], "fill": "#3a5f7d", "smooth": true },
    { "points": [[x, y], ...], "fill": "#294a63", "smooth": true,
      "pivot": [-0.9, 0.1], "amp": 12 }
  ]
}
```

- `faceK` / `faceTx` / `faceTy` : calibration `FishBody.drawFace`, copiée
  telle quelle depuis le panneau "Calibration visage" de l'outil.
- `layers[].pivot` + `amp` : présents seulement sur les calques animés
  (queue, nageoire, tentacule) — absents sur un calque statique (corps).
- `smooth` : si vrai, le calque se dessine en courbes (Catmull-Rom →
  Bézier) plutôt qu'en segments droits, comme dans l'outil.

---

## 4. Chargement : JS statique vs vrai JSON async

Le projet a une règle explicite (`CLAUDE.md`) : *zéro dépendance, zéro
build*. `boot.js` charge tous les scripts en balises `<script>` classiques,
avec anti-cache — tout est synchrone dès que `boot.js` a fini.

**Option A — fichiers `.js`** (`sardine.js` définissant
`Sprites.sardine = {...}`), ajoutés à la liste de `boot.js` comme n'importe
quel autre script. Zéro `fetch`, zéro asynchrone, colle exactement au
fonctionnement actuel.

**Option B — vrais `.json`**, chargés par un petit préchargement
(`Promise.all` de `fetch` + `JSON.parse`) **avant** `Main.init()`. Avantage :
format natif de sortie de l'outil, pas de conversion manuelle à chaque
poisson — l'outil écrit le fichier tel quel via son export existant.
Inconvénient : introduit une étape asynchrone qui n'existe nulle part
ailleurs dans le moteur (mais limitée à un seul `Promise.all`, pas un vrai
"build").

**Retenu : option B.** Le gain (zéro conversion manuelle, un poisson de plus
= un fichier de plus à déposer) l'emporte sur le coût (un seul point d'attente
asynchrone, isolé, avant le lancement de la simulation).

---

## 5. Ce qu'il reste à faire

Rien n'est implémenté. Dans l'ordre :

1. **Outil** (`anchor_tool.html`) : un export "par calque" (au lieu du SVG
   aplati actuel de "Utiliser pour les repères") produisant directement le
   JSON du §3. Le seul fichier que personne d'autre ne touche — sans risque
   à faire dès maintenant.
2. **Nouveau module** `js/sprites.js` : le `Promise.all` de chargement +
   `bentShapePoints()` réutilisée (portée depuis l'outil) + construction/
   cache des `Path2D`. Fichier neuf, sans risque.
3. **Câblage partagé** — à faire seulement une fois l'autre session de
   développement stabilisée (elle réécrit `main.js`, `species.js` et
   `background.js` en ce moment même, cf. état git au 2026-09-03) :
   - `species.js` : ajouter `render: 'sprite'` + `spriteId` sur les
     premières espèces converties ;
   - `main.js` : attendre le préchargement des sprites avant `Main.init()` ;
   - `fishbody.js` : nouveau cas `'sprite'` dans le `switch` de
     `FishBody.draw()`, réutilisant le bloc `ctx.scale/translate` +
     `FishBody.drawFace` déjà généré par l'outil.
