# Audit de performance — mesuré le 2026-09-04

Toutes les valeurs ci-dessous sont **mesurées**, pas estimées. Elles remplacent
les chiffres de `CLAUDE.md` (« créatures 0,7–1 ms, décor 0,6 ms »), qui ne
comptaient que l'**émission des commandes** canvas et pas leur rastérisation.

La liste de travail est en **§5** : elle est classée par gain mesuré, chaque
entrée dit où intervenir et ce que ça rapporte.

---

## 1. Méthode, et ce qu'elle ne peut pas mesurer

Banc synchrone : on appelle `Ecosystem.update` / `*.draw` en boucle serrée et on
chronomètre, sans passer par `requestAnimationFrame` (l'onglet de mesure est
masqué, et rAF s'y fige — piège déjà noté dans `CLAUDE.md`).

### Les temps de simulation sont fiables

C'est du pur JavaScript, mesuré une dizaine de fois avec des résultats
reproductibles (4,4 à 4,9 ms à 500 entités). **Ces chiffres valent partout**,
c'est le socle de l'audit.

### Les temps de rendu décrivent une machine SANS accélération

Les appels de dessin de Canvas 2D sont **asynchrones** : `ctx.fill()` empile une
commande, il ne peint rien. Chronométrer autour d'eux mesure le temps de remplir
la file, pas celui de peindre — c'est exactement l'erreur des anciens chiffres.

Pour forcer la synchronisation, chaque itération se termine par un
`getImageData(0, 0, 1, 1)` : pour rendre un pixel, le navigateur doit d'abord
finir tout le travail en attente. Mais Chrome voit alors un canvas relu à chaque
frame et **bascule sa rastérisation sur le CPU** (avertissement
`willReadFrequently` en console). Les temps de rendu du §3 sont donc ceux d'un
**rendu logiciel**.

C'est utile : ça décrit fidèlement un appareil sans accélération canvas (vieil
Android, machine virtuelle, bureau distant, pilote en repli). Mais ce n'est pas
la machine de test (RTX 3080).

> **`getImageData` n'existe nulle part dans le jeu.** C'est purement un
> instrument de mesure, qui vit dans la console du navigateur et disparaît au
> rechargement. La seule occurrence dans les sources est un bouchon vide
> (`js/svgexport.js:146`, le faux contexte 2D qui enregistre au lieu de peindre).
> Il n'y a rien à désactiver. En revanche, si un jour une lecture de pixels
> devient **permanente** dans le jeu, il faudra passer
> `getContext('2d', { willReadFrequently: true })` — c'est-à-dire assumer le
> rendu logiciel. À ne pas faire sur le canvas principal.

### Ce qui n'a pas pu être mesuré

Le coût GPU réel sur machine accélérée. Sans readback, les mesures partent en
vrille (35 ms puis 51 ms pour le même dessin de créatures, avec des totaux plus
petits que leurs parties) : le processus de rendu est déprogrammé quand le
volet est masqué, et une boucle serrée sans vsync sature la file de commandes.
**À refaire dans un vrai onglet visible avec l'onglet Performance des
devtools**, si le besoin s'en fait sentir.

Piège découvert au passage, à ne pas reproduire : mesurer `Ecosystem.draw`
**sans** dessiner le décor avant fausse tout d'un facteur 10. Sans remplissage
opaque plein écran, le navigateur doit conserver le tampon précédent. Toute
mesure d'un poste de dessin doit se faire **par différence**, décor compris.

Contexte des mesures : ~490 entités, ~350 particules, ~90 créatures visibles à
1280×720, dpr 2.

---

## 2. Simulation — 4,4 à 4,9 ms par frame (500 entités)

| Poste | ms/frame | part |
|---|---:|---:|
| `Entity.move` | **2,89** | **61 %** |
| `Entity.think` | 0,64 | 13 % |
| divers (`digere`, `updateEyeLook`, `tryMate`, `breathe`) | 0,34 | 7 % |
| `Ecosystem.buildGrid` | 0,10 | 2 % |
| `Particles.update` | 0,04 | 1 % |
| reste (boucle, filtrage des morts, regroupement des bancs) | 0,75 | 16 % |
| **total** | **4,76** | |

`Entity.move` domine, et son coût est celui des **recherches de voisinage** :

- `Ecosystem.neighbors()` : **459 appels/frame**, **8 370 éléments parcourus**,
  **459 tableaux alloués** (le `out.push(...cell)` construit une liste
  d'arguments à chaque cellule) ;
- `Ecosystem.groupMates()` : 275 appels, 4 718 éléments.

Une même entité appelle `neighbors()` jusqu'à trois fois dans la même frame
(anti-chevauchement, choc contre un gros, encre) sur **exactement la même
cellule** — et toutes les entités d'une cellule obtiennent le **même résultat**.

### Pression mémoire — 78 à 134 Ko par frame

Mesuré via `performance.memory`, en ne sommant que les variations positives :
**~4,5 à 8 Mo/s alloués par la seule simulation**, soit un GC mineur toutes les
~40 frames. C'est ce qui produit les micro-saccades, et c'est le poste qui fera
le plus mal sur mobile.

Appels par frame qui allouent, mesurés : 459 tableaux de voisinage, 739
`Camera.toScreen` (chacun renvoie un `[x, y]` neuf), ~1 000 fermetures `steer` /
`tether` créées dans `move()`, 131 `U.mixColor` (découpage de chaînes + gabarit),
74 `colorAlpha`, et 5 tableaux complets reconstruits par `filter` (entités
vivantes, entités visibles, particules, arêtes, cacas).

### Montée en charge

| Entités | ms/frame |
|---:|---:|
| 484 | 4,5 |
| 803 | 8,0 |
| 1 227 | 13,1 |
| 1 802 | 23,3 |
| 2 603 | 43,8 |

**Super-linéaire** (≈ O(n^1,4)) : le monde ne grandit pas, donc la densité monte
et chaque cellule de la grille contient plus de monde. Plafond pratique sur un
bureau, rendu compris : **~1 000 entités**. À garder en tête si un mode de jeu
laisse le joueur en ajouter (cf. `IDEES.md`).

---

## 3. Rendu — le décor pèse trois fois les créatures

À 2560×1440, **rastérisation logicielle** (cf. §1) :

| Poste | ms |
|---|---:|
| **`Background.draw`** | **18,6** |
| `Ecosystem.draw` (~90 créatures) | 2,5 – 4,4 |
| `Particles.draw` (~350) | ~0 |
| `Food.draw*` | ~0 |
| **frame complète** | **~32 → 31 fps** |

Détail du décor :

| Section de `Background.draw` | ms |
|---|---:|
| Colonne d'eau (`fillRect` plein écran, dégradé 5 arrêts) | **8,3** |
| Ciel et ligne de surface (2ᵉ dégradé plein écran + astres) | **4,6** |
| Fond sableux (3ᵉ dégradé + modelé au trait de 300 px sous `clip`) | 2,7 |
| Végétation (94 touffes, courbes de Bézier) | 2,2 |
| Rochers (260) | 1,7 |
| God rays (5 dégradés en `lighter`) | 1,0 |
| Écume au rivage | 0,6 |
| Crêtes, cheminées, plancton | ~0 |

Le coût est **le remplissage, pas le nombre d'objets** : un `fillRect` plein
écran uni coûte **0,5 ms**, le même avec un dégradé linéaire à 5 arrêts coûte
**8,0 ms** — facteur 16. Et **mettre l'objet gradient en cache ne change rien**
(7,96 ms) : c'est la rastérisation du dégradé qui coûte, pas sa construction.

Confirmation par la résolution : décor à 6,2 ms sur 0,92 Mpx, 19,2 ms sur
3,7 Mpx. Le décor scale avec les **pixels**, pas avec la scène.

### Opérations canvas par frame (comptées, déterministes)

| | décor | créatures (90) | particules (350) |
|---|---:|---:|---:|
| `beginPath` | 151 | 907 | 84 |
| `fill` / `stroke` | 87 / 64 | 640 / 267 | 62 / 25 |
| `fillStyle` (changements) | 86 | 539 | 62 |
| `lineTo` | **1 121** | 275 | 10 |
| `save` / `restore` | 47 | 322 | 8 |

Deux enseignements. Les créatures coûtent en **nombre d'appels** (~21 opérations
de tracé par individu) : c'est ce qui pèsera sur une machine accélérée, où les
pixels sont gratuits. Le décor, lui, ne fait que 151 tracés mais **1 121
`lineTo`** : le contour du fond est reparcouru **neuf fois** par frame (le
remplissage du sable, trois passes de modelé, cinq rides), chaque point coûtant
un `World.floorY` et un `Camera.toScreen`.

---

## 4. Configuration nécessaire

| Cible | Verdict |
|---|---|
| Bureau à canvas accéléré (tout ce qui a un GPU depuis ~2015) | **60 fps confortable.** Seul coût certain : les 4,8 ms de simulation. |
| Bureau **sans** accélération canvas (VM, bureau distant, repli logiciel) | **~30 fps** à 1280×720 en dpr 2. Le correctif §5.7 suffit à repasser à 60. |
| Portable à GPU intégré, 1920×1080 en dpr 1 | 42 fps en rendu logiciel ; 60 fps avec accélération. |
| **Mobile** | 30 fps réaliste, voir ci-dessous. |

### Mobile

Le rendu n'est **pas** le problème : `Main.resize` plafonne déjà le dpr à 2, donc
un téléphone 390×844 rend 1,32 Mpx — un tiers du bureau testé — et un GPU mobile
à rendu par tuiles avale les dégradés sans broncher. Mesures en rendu logiciel à
cette taille : 18,0 ms en dpr 2, 15,7 ms en dpr 1.

Le vrai plafond mobile, c'est la **simulation** : 4,8 ms sur ce bureau, soit
**11 à 14 ms sur un Android milieu de gamme** (2,5 à 3× plus lent en mono-cœur),
plus la pression GC du §2. Viser **30 fps**, pas 60. Tout le bloc « simulation »
du §5 est donc prioritaire pour le mobile ; le bloc « rendu » l'est pour les
machines sans accélération.

Le **fonctionnel tactile a été fait** (2026-09-04, `Input.touchDown/touchMove/
touchUp/tap` dans `js/input.js`, plus `touch-action: none` sur `#game` et une
media query `pointer: coarse`) :

- **tap** = nourrir · **glissé 1 doigt** = déplacer la vue (seuil de 14 px pour
  les distinguer) · **pincement** = zoom centré entre les doigts, qui déplace
  aussi la vue par son centre · **double-tap** = suivre la créature ;
- la fiche d'identité (loupe) s'**épingle au tap** sur une créature — le
  « survol » n'existe pas au doigt, et la recalculer depuis le dernier point
  touché la faisait disparaître dès que l'animal s'éloignait ;
- le **défilement par les bords** est désactivé en mode tactile : le doigt levé
  laisse mx/my figés au bord, la caméra partait toute seule ;
- boutons du HUD à 48 px sous `pointer: coarse` (56 px débordaient des 375 px
  d'un petit téléphone), texte d'aide masqué (il parle de la molette).

Trois pièges rencontrés : `touch-action` **ne s'hérite pas** (le poser sur
`body` ne protège pas le canvas) ; `setPointerCapture` **peut jeter** et
avalait tout le geste (try/catch) ; un doigt perdu sans `pointerup` ni
`pointercancel` (geste système) restait dans la Map et transformait le contact
suivant en pincement fantôme — d'où le nettoyage sur `lostpointercapture`.

La fiche d'identité est un panneau HTML sur le côté (bandeau en bas sous
600 px de large, police agrandie en `pointer: coarse`) : elle n'est plus dessinée
sur le canvas, donc plus de repère réduit ni de bascule d'échelle. Reste
dimensionné pour le bureau : l'atelier
(`atelier.html`, outil de dev, hors sujet mobile).

---

## 5. Chantier d'optimisation

> **RÉALISÉ le 2026-09-04** — tout sauf 5.14 (volontairement écarté : il change
> le comportement de l'écosystème). Résultats mesurés, pièges découverts en
> route et deux abandons documentés en **§7**. Les entrées ci-dessous sont
> conservées comme trace du raisonnement d'origine.

Classé par gain mesuré. Les cinq premiers ne changent **aucun comportement de
jeu** : ce sont des économies pures, vérifiables en comparant des simulations
longues avant/après.

### Simulation (vaut sur toutes les machines, prioritaire pour le mobile)

#### 5.1 Mémoïser `neighbors()` par cellule — **−36 % de simulation, mesuré**

`neighbors(x, y)` ne dépend que de la cellule : on le calcule une fois par
cellule et par frame, on vide le cache dans `buildGrid`. Prototype testé en
direct : **4,89 → 3,11 ms**, et **−23 % d'allocations**. Aucun changement de
comportement (les appelants ne font qu'itérer, et tous testent déjà `.dead`).
Au passage, remplacer `out.push(...cell)` par une boucle supprime 459
constructions de liste d'arguments par frame.

Une dizaine de lignes dans `js/ecosystem.js:671`. **À faire en premier.**

#### 5.2 Une seule passe de voisinage dans `Entity.move`

Même avec 5.1, `move` **parcourt** trois fois la même liste pour trois tests
différents (`js/entity.js:1102`, `1119`, `1169`). Une boucle unique avec les
trois tests à l'intérieur économise deux parcours de ~18 voisins par entité et
par frame, soit ~18 000 itérations par frame.

#### 5.3 Sortir les fermetures de `Entity.move`

`steer` (`js/entity.js:1217`) et `tether` (`js/entity.js:1289`) sont des
fonctions fléchées **recréées à chaque appel de `move`** : ~1 000 fermetures par
frame, 60 000 par seconde. À passer en méthodes du prototype (elles n'ont besoin
que de `this` et d'un accumulateur d'accélération).

#### 5.4 Calculer une fois par frame ce qui est commun à tous

- `Camera.toWorld(Input.mx, Input.my)` (`js/entity.js:1260`) est recalculé —
  et alloue un tableau — pour **chaque petit poisson**, alors que c'est la même
  valeur pour tout le monde. À monter dans `Input.update`.
- `World.floorY(this.x)` est appelé 3 à 4 fois dans le même `move()` (bande de
  profondeur, tirant d'eau, garde au sol, collision finale). Une variable locale.
- `World.floorY` / `World.depthAt` totalisent ~2 500 appels par frame, dont une
  bonne part vient du décor (§5.8).

#### 5.5 Arrêter de reconstruire des tableaux entiers chaque frame

Cinq `filter` par frame reconstruisent des tableaux complets :
`js/ecosystem.js:738` (les ~490 entités vivantes), `js/ecosystem.js:749`
(les visibles, puis triées), `js/particles.js:221` et `:224`, `js/food.js:59`
et `:60`. À remplacer par un compactage sur place, et pour les entités, à ne
faire que **s'il y a eu un mort dans la frame**.

#### 5.6 Accesseurs scalaires pour la caméra

`Camera.toScreen` renvoie un `[x, y]` neuf : **739 tableaux par frame**. Ajouter
`Camera.sx(wx)` / `Camera.sy(wy)` et s'en servir dans les boucles chaudes (décor,
particules, `Entity.draw`) supprime la quasi-totalité de ces allocations.

Dans la même veine, plus petit : `U.mixColor` (131 appels/frame) redécoupe deux
chaînes hexadécimales et construit une chaîne de gabarit à chaque appel ;
`Entity.colorAlpha` (74/frame) fait pareil. Les couleurs de décor ne dépendent
que de la profondeur et de l'heure — un cache par tranche suffirait.

### Rendu (décisif sur les appareils sans accélération)

#### 5.7 Pré-rendre les trois dégradés plein écran — ~15 ms

Colonne d'eau, ciel et sable sont trois `fillRect` plein écran en dégradé
vertical, refaits à chaque frame. Les rendre une fois dans un canvas hors écran
**étroit** (quelques pixels de large × la hauteur), puis les étirer au
`drawImage` : un étirement de texture est un remplissage plat, pas un dégradé.
À ne recalculer que quand la profondeur visible ou l'heure changent notablement.

Sans effet visible sur une machine accélérée — c'est **le** correctif qui rend le
jeu jouable sur un appareil faible.

#### 5.8 Calculer le contour du fond une fois par frame

Le contour du sable est reparcouru **neuf fois** par frame : le remplissage, les
trois passes de modelé (`contour(150)`, `contour(45)`, `contour(13)`) et les cinq
rides. D'où les 1 121 `lineTo` du décor, et autant de `World.floorY` +
`Camera.toScreen`. Un tableau de coordonnées calculé une fois en début de
`Background.draw` et réutilisé par les neuf passes.

#### 5.9 Remplacer `shadowBlur` par un halo pré-rendu

`js/fishbody.js` utilise `ctx.shadowBlur` pour la bioluminescence (lignes 1109,
1180, 1232, 1343). C'est l'opération la plus chère de Canvas 2D en rendu
logiciel. Un disque en dégradé radial dessiné une fois dans un canvas hors écran,
puis `drawImage`, donne le même rendu pour presque rien. Peu d'individus
concernés à l'écran (4 appels/frame mesurés en zone claire), mais **le coût
explose dans les abysses**, là où ils sont tous.

#### 5.10 Le trait de 300 px sous `clip()`

Le modelé du sable strie le fond avec trois traits de 300, 90 et 26 px de large,
sous un `clip()` (`js/background.js:475`). C'est 2,7 ms, et c'est de l'overdraw
pur : trois passes qui repeignent la même surface. Un dégradé vertical unique
appliqué dans la zone de sable donnerait le même modelé en une passe. **Attention
au rendu** : le modelé suit le contour du fond, c'est ce qui évite les rayures
verticales (cf. `CLAUDE.md`) — le remplacement doit préserver ça.

#### 5.11 God rays pré-rendus

Cinq dégradés en `globalCompositeOperation = 'lighter'` par frame, 1,0 ms. Les
rayons ne changent que de position : un seul rayon rendu hors écran, réutilisé
cinq fois par `drawImage`.

### Petites choses gratuites

#### 5.12 `countSpecies` balaie toutes les entités

`js/ecosystem.js:342` filtre `this.entities` alors que `this.counts[id]` contient
déjà la réponse, reconstruite à chaque `buildGrid`. Zéro appel par frame
aujourd'hui, mais l'appel est fait à chaque ponte.

#### 5.13 `limiteLarge` et `bornesReptation` mémoïsés au mauvais niveau

`js/entity.js:617` et `:635` mettent leur résultat en cache **par individu**,
alors qu'il ne dépend que de l'espèce (`def.offshore`, `def.size`,
`def.depthBand`). Une mémoïsation sur la fiche d'espèce fait passer de ~490
boucles de balayage du relief à 27.

### À ne faire qu'en dernier, et sous contrôle

#### 5.14 Simulation à cadence réduite hors champ

~490 entités simulées pour ~90 visibles. Faire penser les lointaines une frame
sur trois (avec `dt × 3`) diviserait presque par deux le coût, mais **modifie
l'écosystème** : prédation, ponte et seuils de fuite sont réglés sur un pas fixe.
Ne l'envisager qu'avec une simulation longue de contrôle avant/après (populations
par espèce à 16 min), sinon on rejoue tous les réglages d'équilibre.

---

## 6. Ce qui n'est PAS un problème (vérifié)

- **Les particules.** ~350 en jeu normal, coût de dessin non mesurable.
  Attention au piège de mesure : un banc qui appelle `Ecosystem.update` sans
  `Particles.update` fait grimper le sable à **7 500 particules** — c'est
  l'artefact décrit pour le helper `FF` dans `CLAUDE.md`, pas une fuite.
- **`Ecosystem.buildGrid`** : 0,10 ms. La grille spatiale fait son travail ;
  c'est son *usage* qui coûte, pas sa construction.
- **Le nombre d'objets de décor** (260 rochers, 94 touffes, 160 planctons) : le
  culling par `Camera.isVisible` les élimine, le coût est dans les pixels.
- **Le rendu procédural des créatures** : 2,5 ms pour 90 individus en rendu
  logiciel. Passer aux sprites optimiserait la partie déjà la moins chère — la
  remarque de `CLAUDE.md` reste vraie, elle se vérifie juste contre le décor
  plutôt que contre la simulation.
- **`World.depthAt`** : 2 500 appels/frame, mais la fonction est une
  interpolation sur deux cases de tableau. Le nombre d'appels est le symptôme
  (§5.8), pas la cause.

---

## 7. Chantier réalisé — résultats mesurés (2026-09-04)

Tout le §5 a été implémenté sauf 5.14. Mesures avant/après **sur la même
machine, le même jour**, en A/B contre un worktree à HEAD (les chiffres absolus
du §2-§3 venaient d'une session plus calme et ne sont pas directement
comparables).

| Poste (rendu logiciel, 2560×1440) | avant | après |
|---|---:|---:|
| `Background.draw` | 18,9 ms | **9,2 ms** |
| Frame complète (décor + créatures + particules) | 23,2 ms | **15,0 ms** |
| Simulation (~450 entités, boucle serrée) | ~3,1 ms | **~2,8 ms** |

Soit **43 → 66 fps** en rastérisation logicielle — la cible « vieux PC sans
accélération / petit mobile » passe de « tout juste 30 fps » à confortable.
Le gain de simulation est réel mais plus modeste que le −36 % espéré en §5.1 :
sur cette machine (chargée par plusieurs sessions), la variance entre deux
mesures dépasse l'écart. Contrôle d'équilibre : 12 minutes de simulation
accélérée après le chantier, les 27 espèces sont toujours présentes,
population totale stable (~400).

### Les deux pièges découverts (à ne pas réintroduire)

- **Un drawImage étiré n'est un remplissage plat que s'il est OPAQUE.** Les
  god rays pré-rendus (§5.11) et le modelé à quart de résolution (§5.10)
  coûtaient **15 ms chacun** : un drawImage avec alpha (a fortiori en
  `lighter`) repasse par un blend par pixel plus cher que les dégradés qu'il
  remplaçait (1 et 2,7 ms). **Les deux ont été abandonnés** — le code garde
  les dégradés d'origine, avec un commentaire sur place. Le modelé profite
  quand même du contour partagé (§5.8).
- **Un canvas hors écran redessiné chaque frame doit être créé avec
  `willReadFrequently: true`** quand il est destiné à un canvas principal
  potentiellement en rendu logiciel. Sans ça la bande de dégradé (§5.7) vit
  côté GPU et chaque drawImage force une relecture GPU→CPU : décor à
  **29 ms** au lieu de 9. Le garde-fou du §1 (jamais sur le canvas principal)
  reste vrai — ici c'est l'inverse, un canvas source.

### En plus du chantier

- **5.15 — Résolution adaptative** (`Main.adaptResolution`) : si la frame
  moyenne dépasse 40 ms sur ~3 s, le dpr baisse par paliers de 0,25 jusqu'à 1
  (4× moins de pixels), sans jamais remonter tout seul (anti-pompage). C'est
  le filet de sécurité pour les machines vraiment faibles.
- Caches de couleurs : `U.mixColor` (parse hex mémoïsé), `Background.waterColor`
  (quantifiée 16 px / 1-40ᵉ de nuit), `Background.skyColor` (par frame),
  `Entity.colorAlpha` (préfixe rgb figé par individu).
- `FishBody.halo()` remplace les quatre `shadowBlur` (lanterne, calamar,
  crevette, méduse) par un disque radial pré-rendu par couleur (§5.9).

Reste au chantier : **5.14** (cadence réduite hors champ, sous contrôle d'une
simulation longue) — toujours le plus gros gain potentiel de simulation, et
toujours le plus risqué. Et côté mobile, le fonctionnel du §4 (pinch-to-zoom,
`touch-action`, équivalents tactiles) n'est pas de la performance mais reste à
faire.

---

# Point de performance du 5 septembre 2026

*51 espèces, ~530 entités, canvas 2404×1850 (dpr 2), page fraîche, JIT chaud
(400 frames de préchauffage avant chaque mesure).*

| Poste | ms/frame |
|---|---:|
| Frame complète | **22,7** |
| dont dessin | 18,3 |
| dont simulation | **4,3** |

La simulation a été **divisée par deux** (5,55 → 2,85 ms mesurée isolément) par
le culling ci-dessous. Le dessin est désormais le seul goulot, et il est
**limité par le remplissage**, pas par le nombre de créatures.

## Le culling de simulation (fait)

~530 entités simulées pour ~80 à 110 visibles. Les autres ne pensent plus
qu'**une frame sur trois**, avec un `dt` triplé : leur trajectoire est trois
fois moins finement intégrée, ce qui ne se voit pas puisqu'elles sont hors de
l'écran.

Trois garde-fous, parce que `PERFORMANCE.md §5.14` prévenait que ce mécanisme
peut fausser l'écosystème :

- la marge est **généreuse** (900 px au-delà du bord) : une créature qui entre
  dans le champ a repris son pas fin bien avant d'être visible ;
- **les colosses et les chasseurs en action** gardent le pas fin où qu'ils
  soient — ce sont leurs contraintes (anti-chevauchement dur, charge) qui
  supportent le moins un gros pas ;
- la répartition se fait **par identifiant**, donc le tiers simulé change à
  chaque frame et personne n'est jamais gelé.

Contrôle en simulation longue après coup : **zéro extinction, zéro espèce en
chute, une seule mort de faim** sur 3,9 min. L'écosystème ne bouge pas.

## Le piège de mesure qui a coûté le plus de temps

Le profilage par espèce donnait des chiffres absurdes :

| Espèce | coût mesuré *dans la scène* | coût mesuré *isolément* |
|---|---:|---:|
| Cormoran | 818 µs | 8 µs |
| Oursin | 656 µs | 8 µs |
| Coquillage | 534 µs | 3 µs |

Un facteur **cent**. L'explication n'a rien à voir avec ces silhouettes : ce
sont les **premières dessinées** dans l'ordre de tri, juste après le décor.
Canvas 2D empile les commandes sans les exécuter ; le premier appel qui force le
pipeline à se vider **absorbe le temps de tout ce qui précède**. Le chronomètre
l'attribue à la mauvaise créature.

Deux règles qui en découlent, pour toute mesure de rendu future :

1. **Un coût de dessin mesuré par appel est faux** tant qu'on n'a pas de
   barrière. Mesurer par **différence** (avec et sans le poste), jamais en
   enveloppant l'appel.
2. **Le premier poste dessiné porte le chapeau des autres.** C'est ce qui avait
   fait croire, dans l'audit précédent, que le décor coûtait 18 ms et les
   créatures 2,5 — puis l'inverse une fois le décor optimisé. Ni l'un ni l'autre
   n'était vrai : c'est le **total** qui compte, et il se répartit selon l'ordre
   de dessin.

Toutes les silhouettes, mesurées isolément sur 400 tracés chacune, coûtent entre
**3 et 30 µs** — la murène le plus, le coquillage le moins. Pour 100 créatures à
l'écran, cela fait environ **1,3 ms**. Le reste des 18 ms est du remplissage.

## Ce qu'il reste à faire, par ordre de gain

1. **Le remplissage du décor.** Le levier existe déjà (l'adaptation automatique
   du dpr quand la frame dépasse 40 ms) mais il ne se déclenche qu'en dernier
   recours. Pré-rendre les dégradés plein écran dans un canvas étroit puis les
   étirer reste le correctif de fond — un étirement de texture est un
   remplissage plat, pas un dégradé.
2. **Ne pas dessiner ce qui est plus petit qu'un pixel ou deux.** À zoom 0,35,
   une crevette de 7 px en fait 2,5 à l'écran. Attention au pop visuel : il
   faudrait un fondu, pas une disparition sèche.
3. **La marge de culling du dessin** est à 150 px. La réduire à 60 retire
   quelques créatures par frame — gain marginal, à ne faire que si le reste ne
   suffit pas.

## Ce qui n'est PAS le problème (vérifié)

- **Les silhouettes des nouvelles espèces.** Tortue, oursin, ruban électrique et
  anguille-jardinière coûtent 8 à 15 µs, dans la moyenne basse.
- **Le halo bioluminescent.** Pré-rendu et mémoïsé par couleur.
- **Le nombre d'entités simulées**, depuis le culling.
- **La grille spatiale** (0,3 ms) et les particules (0,16 ms).

---

## 8. Deuxième passe (2026-09-05) — la simulation était devenue le goulot

Toutes les mesures précédentes ont été faites en **rastérisation logicielle**,
où le décor domine. Sur une machine à canvas accéléré, le classement s'inverse
complètement — et c'est le cas de la plupart des joueurs.

Profil de départ, frames RÉELLES (pas de différence synthétique), 564 entités,
216 créatures à l'écran, zoom 0,8 :

| Poste | ms |
|---|---|
| frame complète | 13,5 |
| dessin des créatures | 6,6 |
| simulation | 5,8 |
| décor | 0,2 |

Deux corrections, chacune mesurée sur la frame réelle.

### 8.1 Le voisinage : une boîte englobante avant le test exact

`Ecosystem.update` passait **2,4 ms sur 7,2 en recherches de voisinage**. La
cause tient en une phrase : la grille fait 130 px et on en balaie 3×3, donc
chaque créature examine une vingtaine de voisins — alors que **deux confettis de
11 px se touchent à 21 px**. Neuf tests sur dix portaient sur des voisins hors de
portée, et chacun payait un appel à `U.dist2`.

Un écart en x, puis en y, avant le test exact — le filtre que fait n'importe
quelle boîte englobante. Mesuré : voisinage **2,4 → 1,23 ms**, `Ecosystem.update`
**7,17 → 3,87 ms** sur la même page (−41 % par entité).

La même grille sert une baleine de 190 px et une crevette de 7 : c'est ce
déséquilibre qui rend l'écrémage payant. Une grille par classe de taille serait
la suite logique, si le besoin revient.

### 8.2 Le visage a un niveau de détail

`drawFace` trace une vingtaine de chemins — œil, blanc, pupille, reflet,
paupière, sourcil, bouche, lèvres, dents, langue, joues. C'est tout le charme de
l'aquarium… tant qu'on le voit. Sur un Confetti de 14 px à un zoom de 0,8, l'œil
entier fait 2,5 px de rayon et le sourcil est **sous-pixel**.

`FishBody.face` est le point d'entrée unique de tous les visages : sous
`size * Camera.zoom < 10`, il bascule sur `faceMinimale` — l'œil, et le fait
qu'il soit ouvert ou fermé (un aquarium endormi doit se lire de loin). On ne
supprime que ce qui ne se voyait pas, et **s'approcher rend le détail
immédiatement**.

Mesuré : dessin des créatures **6,6 → 3,6 ms** avec *plus* de monde à l'écran
(232 contre 216), frame **13,5 → 11 ms**.

### 8.3 Rappel de méthode

Les mesures par **différence** sur le rendu sont ici inutilisables : Canvas 2D
empile les commandes, et selon l'ordre le même poste ressort à 0,9 ms ou à
6,8 ms — on obtient même des pourcentages négatifs. **Le seul chiffre fiable est
la frame réelle**, chronométrée dans la boucle et prise en médiane. Tout ce
paragraphe a été mesuré ainsi.

### 8.4 Particules

La refonte du vocabulaire des marques d'émotion (cf. `EMOTIONS.md` §3 bis) a
retiré au passage ~1 270 particules/min. Cumul depuis le relevé initial :
**35 736 → 13 728 particules créées par minute, soit −62 %.**

---

## 9. Troisième passe (2026-09-06) — la cadence, le mobile, et la persistance

Trois changements, aucun ne touche l'écosystème. Tous vérifiés en pilotant
`Main.frame` avec des timestamps synthétiques (le panneau d'aperçu gèle rAF,
on ne peut pas y mesurer une cadence réelle).

### 9.1 Plafond de cadence (`Main.fpsCap`, 60 par défaut)

rAF bat à la cadence de l'ÉCRAN : sur un téléphone à 120 Hz le jeu tournait à
120 fps — deux fois le travail pour un gain nul sur un aquarium contemplatif,
et l'étranglement thermique au bout (le téléphone chauffe, ralentit, et LÀ les
frames deviennent vraiment lentes). La frame arrivée trop tôt est **sautée,
simulation comprise** — c'est tout l'intérêt : diviser le travail, pas le
lisser. `lastFrame` n'avance que sur une frame rendue, donc le `dt` s'accumule
et le temps simulé suit le temps réel.

Vérifié : 120 Hz plafonné 60 → 120 rendues sur 240 (une sur deux) ; plafonné
30 → 60 sur 240 (une sur quatre) ; 60 Hz plafonné 60 → 120 sur 120 (le seuil
laisse 5 ms de jeu, le jitter de rAF ne fait jamais sauter de frame à la
cadence exacte). Temps simulé = temps réel dans les quatre cas.

### 9.2 `adaptResolution` : seuil RELATIF, et un palier 30 fps

Le seuil de déclenchement n'est plus une constante : c'est le **budget du
plafond de cadence plus une marge** (16 ms au tactile, 23 au bureau — ce qui
redonne exactement l'ancien seuil de 40 ms à plafond 60 sur bureau). Sans ça,
à plafond 30, une frame parfaitement saine dure déjà 33 ms et l'ancien seuil
fixe de 40 aurait continué d'adapter un jeu qui tient sa cadence — jusqu'à
brider le dézoom pour rien.

L'échelle des paliers gagne un barreau : dpr d'abord (le moins visible), puis
**cadence 30 fps** (30 stables se lisent mieux qu'un 45 qui pompe, rien ne se
déplace vite dans un aquarium), et la bride du dézoom en dernier (elle recadre
la vue, c'est le plus visible des trois).

### 9.3 dpr initial à 1,5 au tactile

Sur un OLED de 390 px de large, la différence entre dpr 1,5 et 2 est à peine
perceptible — et c'est **44 % de pixels en moins d'entrée de jeu** (mesuré :
canvas 562×1218 au lieu de 750×1624 sur un 375×812 à devicePixelRatio 2), sans
attendre que la mesure condamne dpr 2 après trois secondes de rame.
`adaptResolution` garde la main pour descendre plus bas.

### 9.4 Hors performance, même passe : la sauvegarde a une porte de sortie

iOS efface le localStorage des sites non visités depuis 7 jours (ITP) : un
joueur iPhone qui pose le jeu deux semaines perdait son aquarium. Deux parades
livrées ensemble : la **PWA** (générée par `build.py` — une PWA installée est
exemptée de la purge) et les boutons **💾/📂** d'export/import de la
sauvegarde (3-10 ko de JSON ; un fichier illisible est refusé avant de toucher
au stockage — vérifié sur trois fichiers invalides, stockage intact).

### Ce qu'il reste au chantier mobile

Le **profil de population petit écran** (réduire les plafonds des espèces
d'ambiance de ~40 % quand l'écran est petit) : le plus gros gain de simulation
restant par la courbe en n^1,4, et le seul levier qui touche l'écosystème —
donc à valider par une simulation longue de contrôle, comme le culling en son
temps. Et le fondu sous-pixel (ne pas dessiner ce qui fait moins de 2 px
écran), gain modeste mais ciblé sur le krill.

---

## 10. Quatrième passe (2026-10-19) — les 53 dessins, et leur imposteur

Les mesures précédentes datent d'AVANT les dessins vectoriels. Chaque dessin
est redessiné à chaque frame en déformant tous ses points (`drawSprite`,
`deformer`, colonne, appendices) : c'est devenu, de loin, le premier poste.

**Profil « petit PC »** : 1366×768, dpr 1, CPU ralenti ×4 (CDP
`Emulation.setCPUThrottlingRate`), Chromium headless — « Canvas: Software
only » d'après `chrome://gpu`, WebGL par SwiftShader. `Math.random` semé, boucle
rAF neutralisée, frames pilotées à la main (`Ecosystem.update(dt, t)` avec
`Main.time` qui avance), chaque poste chronométré **pipeline vidé**
(`getImageData` d'un pixel). Les chiffres sont en ms ×4 ; ÷4 ≈ la machine
d'essai sans ralenti. Pas de vrai GPU : rien ici ne mesure un canvas accéléré.

### 10.1 Le profil de départ (HEAD, dt 1/60)

| Vue | visibles | simulation | décor | créatures | frame |
|---|---:|---:|---:|---:|---:|
| départ (rivage) | 113 | 38 | 34 | 189 | 243 |
| récif, zoom 1 | 168 | 40 | 51 | 328 | 410 |
| grand large | 32 | 33 | 18 | 54 | 123 |
| dézoom 0,5 | 225 | 45 | 54 | 429 | 629 |
| dézoom 0,35 | 302 | 49 | 61 | 522 | 689 |
| surpeuplé (1 136 entités), dézoom 0,5 | 622 | 291 | 57 | 1 087 | 1 581 |

- **Les créatures font 70 à 80 % de la frame.** État figé, vue récif : 283 ms
  avec les dessins, 82 avec les silhouettes procédurales (×3,5 ; ×6 dézoomé).
- **Le coût d'un dessin ne dépend presque pas de sa taille à l'écran** : un
  krill de 4 px coûte 1,7 ms, autant qu'un thon de 22 ; la Rascasse (99 calques,
  1 225 points) 5,6 ms ; le Confetti 3 ms, dont 1,6 pour ses huit reflets (un
  `clip()` chacun). C'est le nombre d'OPÉRATIONS qui paye, pas les pixels.
- Au profileur : rastérisation au vidage 45 %, **`ctx.save()` 16 %** (un par
  calque), JavaScript (déformation, tracé, visage) 15 à 20 %.
- Le modèle « effectif × coût unitaire par espèce » retombe sur la mesure de
  scène à 1 % près (325 contre 328 ms au récif) : le Confetti y pèse 23 %.

### 10.2 Ce qui a été fait (`js/fishbody.js`)

1. **Un save/restore par calque retiré** — il ne sert qu'aux calques qui
   tournent (pivot, bec) ; les autres posent eux-mêmes couleur, trait et alpha,
   et la passe entière reste enveloppée. Teintes des reflets construites une
   fois (WeakMap, jamais dans le JSON que l'atelier réenregistre). Rendu
   **identique au bit près** : planche-contact des 53 espèces, au repos et en
   mouvement, 53/53 cases bit à bit contre HEAD.
2. **L'imposteur** (`corpsEnCache`) : chaque créature garde une image de son
   corps, peinte par le MÊME `peindreCorps`, repeinte dès que la pose réelle
   s'en écarte de plus de `CACHE_TOLERANCE` (1 px écran). L'écart est BORNÉ :
   les sensibilités de chaque dessin (par radian de nage, par unité d'effort,
   d'ouverture de coquille et de bec) sont mesurées une fois sur la vraie
   `deformer` (`infoCache`). Image sur-échantillonnée ×2 (à ×1 elle s'adoucit
   visiblement), serrée sur la pose (`boitePose`, dont les points servent
   ensuite au tracé), résolution sur l'échelle NOMINALE (sinon chaque
   demi-tour la repeint). Le visage n'y est jamais : il reste dessiné en direct.
3. **La planche d'animation**, pour les petits nageurs (< 48 px) : seize poses
   par battement de queue, par dessin × couleurs de l'individu × taille ×
   effort, peintes au fil de l'eau et partagées. Deux approximations,
   réservées à cette taille : phase arrondie au 1/16 de battement, appendices
   battant sur un multiple ENTIER de la queue (`anim.verrou` dans `deformer` ;
   hors planche l'expression d'origine est rejouée à l'identique). Passage d'un
   étage à l'autre en fondu (¼ s), avec hystérésis.

Hors jeu rien ne change : le cache ne s'applique qu'au canvas du jeu
(`FishBody.activerCache`, appelé par `Main.init`) — l'atelier, l'export SVG et
le pliage hors écran dessinent en direct. `?imposteur=0` le coupe, pour
comparer sur une vraie machine avec la touche F.

### 10.3 Résultats, A/B entrelacé dans la même page (dt 0,05 : la frame d'une machine lente)

| Vue | créatures direct → cache | frame direct → cache |
|---|---:|---:|
| départ | 170 → 99 (−42 %) | 250 → 181 |
| récif | 257 → 167 (−35 %) | 358 → 281 |
| grand large | 90 → 81 (−10 %) | 162 → 146 |
| dézoom 0,5 | 453 → 273 (−40 %) | 580 → 403 |
| dézoom 0,35 | 673 → 282 (−58 %) | 809 → 461 |
| surpeuplé, récif | 357 → 232 (−35 %) | 659 → 517 |
| surpeuplé, dézoom 0,5 | 824 → 373 (−55 %) | 1 144 → 696 |

« direct » inclut déjà le point 1. Mémoire : ~0,5 Mpx d'imposteurs et 4 à
8 Mpx de planches (budgets `CACHE_BUDGET` / `PLANCHE_BUDGET`, 24 et 32 Mo).

### 10.4 Pièges rencontrés

- **Mesurer à dt 1/60 surestime l'imposteur.** Sur une machine lente la frame
  dure 50 ms (le `dt` est bridé là) : trois fois plus de mouvement par frame,
  et la queue d'un petit poisson dépasse le pixel de tolérance à CHAQUE frame.
  À 1/60 l'imposteur seul donnait −36 % au récif ; à 0,05 il ne donne plus que
  −7 % (57 % de dessins directs) — c'est ce qui a imposé la planche.
- **Une repeinte coûte plus qu'un dessin direct** (×1,2 à ×2,4) : pixels ×4,
  effacement, recopie. Une image n'est rentable que réutilisée.
- **Le demi-tour regonfle la hauteur d'un tiers** : sur l'échelle de la
  transformation, l'image changeait de palier — repeinte à chaque virage.
- **La croisière tombait pile sur une frontière d'effort** (≈ 1,25) et changeait
  de planche sans arrêt : paliers centrés sur 0,75 / 1,25 / 1,75.
- `Entity.color` est tirée par `Math.random` au PREMIER accès : un banc de
  mesure qui sauve/restaure l'état doit la figer avant, sinon la couleur change
  entre deux rendus « identiques » (la lanterne « allumée » d'une capture).

### 10.5 Ce qui reste

- **Les visages** (dessinés en direct, une vingtaine de chemins chacun) et les
  **nageurs de plus de 48 px** (directs quand la frame est lente) sont
  désormais l'essentiel du dessin des créatures au zoom 1.
- **La simulation est super-linéaire** : 566 → 1 116 entités, 10,2 → 46,9 ms
  (×4,6 pour ×2). Au profileur, surpeuplé : `move` 29 %, **le getter
  `Entity.size` 20 %** (11 % en population normale — recalculé à chaque paire
  de voisins), `update` 18 %, `neighbors` 9 %, `tryMate` 3 %, boids 3 %.
  Les boids parcourent TOUT le banc (`groupMates`, en O(G²)) et le nourrissage
  fait grossir les bancs ; la grille rend en moyenne 42 voisins par requête.
- Non mesurable ici : un canvas accéléré (GPU). Les images sources sont créées
  `willReadFrequently: true` (§7) ; sur une machine accélérée il faut vérifier
  à la touche F, `?imposteur=0` en témoin.
