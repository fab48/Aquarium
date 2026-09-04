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

Reste dimensionné pour le bureau : la fiche d'identité elle-même (lisible mais
petite) et l'atelier (`atelier.html`, outil de dev, hors sujet mobile).

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
