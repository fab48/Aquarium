# Audit de performance — mesuré le 2026-09-04

Toutes les valeurs ci-dessous sont **mesurées**, pas estimées. Elles remplacent
les chiffres de `CLAUDE.md` (« créatures 0,7–1 ms, décor 0,6 ms »), qui ne
comptaient que l'**émission des commandes** canvas et pas leur rastérisation.

## Méthode et sa limite

Banc synchrone dans le navigateur : on appelle `Ecosystem.update` / `*.draw` en
boucle serrée et on chronomètre, sans passer par `requestAnimationFrame`
(l'onglet de mesure était masqué, et rAF s'y fige — piège déjà noté dans
`CLAUDE.md`).

**Limite à connaître.** Pour forcer la carte à finir son travail avant de lire
l'horloge, chaque itération se termine par un `getImageData(0,0,1,1)`. Chrome en
déduit que le canvas est lu souvent et **bascule sa rastérisation sur le CPU**
(avertissement `willReadFrequently` en console). Les temps de **rendu** ci-dessous
sont donc ceux d'un **rendu logiciel** : ils décrivent un appareil sans
accélération canvas (vieil Android, machine virtuelle, bureau distant), pas la
machine de test (RTX 3080). Sur une machine accélérée, ces coûts s'effondrent.

Les temps de **simulation**, eux, sont du pur JavaScript : ils valent partout.

Population au moment des mesures : **~490 entités**, ~350 particules, **~90
créatures visibles** à 1280×720.

## 1. Simulation — 4,4 à 4,9 ms par frame (500 entités)

Répartition mesurée (moyenne sur 120 frames, 500 entités) :

| Poste | ms/frame | part |
|---|---:|---:|
| `Entity.move` | **2,89** | **61 %** |
| `Entity.think` | 0,64 | 13 % |
| divers (`digere`, `updateEyeLook`, `tryMate`, `breathe`) | 0,34 | 7 % |
| `Ecosystem.buildGrid` | 0,10 | 2 % |
| `Particles.update` | 0,04 | 1 % |
| reste (boucle, filtrage des morts, regroupement) | 0,75 | 16 % |
| **total** | **4,76** | |

`Entity.move` domine, et son coût est celui des **recherches de voisinage** :

- `Ecosystem.neighbors()` : **459 appels par frame**, **8 370 éléments
  parcourus**, et **459 tableaux alloués** (le `out.push(...cell)` construit une
  liste d'arguments à chaque cellule) ;
- `Ecosystem.groupMates()` : 275 appels, 4 718 éléments.

Une même entité appelle `neighbors()` jusqu'à trois fois dans la même frame
(anti-chevauchement, choc contre un gros, encre) sur **exactement la même
cellule**, et toutes les entités d'une cellule obtiennent le **même résultat**.

### Montée en charge (simulation seule)

| Entités | ms/frame |
|---:|---:|
| 484 | 4,5 |
| 803 | 8,0 |
| 1 227 | 13,1 |
| 1 802 | 23,3 |
| 2 603 | 43,8 |

C'est **super-linéaire** (≈ O(n^1,4)) : le monde ne grandit pas, donc la densité
monte et chaque cellule de la grille contient plus de monde. Plafond pratique sur
un bureau, rendu compris : **~1 000 entités**. À garder en tête si un mode de jeu
laisse le joueur en ajouter (cf. `IDEES.md`).

## 2. Rendu — le décor pèse trois fois les créatures

À 2560×1440 (1280×720 en dpr 2), **rastérisation logicielle** :

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
| Colonne d'eau (un `fillRect` plein écran, dégradé 5 arrêts) | **8,3** |
| Ciel et ligne de surface (2e dégradé plein écran + astres) | **4,6** |
| Fond sableux (3e dégradé + modelé au trait de 300 px sous `clip`) | 2,7 |
| Végétation (94 touffes, courbes de Bézier) | 2,2 |
| Rochers (260) | 1,7 |
| God rays (5 dégradés en `lighter`) | 1,0 |
| Écume au rivage | 0,6 |
| Crêtes, cheminées, plancton | ~0 |

Le coût est **le remplissage, pas le nombre d'objets** : un `fillRect` plein
écran uni coûte **0,5 ms**, le même avec un dégradé linéaire à 5 arrêts coûte
**8,0 ms** — un facteur 16. Et **mettre le dégradé en cache ne change rien**
(7,96 ms avec un objet gradient réutilisé) : c'est la rastérisation du dégradé
qui coûte, pas sa construction.

Confirmation par la résolution : décor à 6,2 ms sur 0,92 Mpx, 19,2 ms sur
3,7 Mpx. Le décor scale avec les **pixels**, pas avec la scène.

## 3. Configuration nécessaire

| Cible | Verdict |
|---|---|
| Bureau, canvas accéléré (tout ce qui a un GPU depuis ~2015) | **60 fps confortable.** Seul coût réel : les 4,5 ms de simulation. |
| Bureau **sans** accélération canvas (VM, bureau distant, pilote en repli logiciel) | **~30 fps** aujourd'hui à 1280×720 en dpr 2. Le correctif §4.2 suffit à repasser à 60. |
| Portable à GPU intégré, 1920×1080 en dpr 1 | 42 fps mesurés en rendu logiciel ; 60 fps avec accélération. |
| **Mobile** | Voir ci-dessous. |

### Mobile

Le rendu n'est **pas** le problème : `Main.resize` plafonne déjà le dpr à 2, donc
un téléphone 390×844 rend 1,32 Mpx — un tiers du bureau testé — et son GPU
mobile, à rendu par tuiles, avale les dégradés sans broncher. Mesures en rendu
logiciel à cette taille : 18,0 ms en dpr 2, 15,7 ms en dpr 1.

Le vrai plafond mobile, c'est la **simulation** : 4,5 ms sur ce bureau, soit
**11 à 14 ms sur un Android milieu de gamme** (2,5 à 3× plus lent en mono-cœur).
Ajouté au dessin, on vise **30 fps**, pas 60. L'optimisation §4.1 est donc la
plus utile des deux pour le mobile.

Il manque par ailleurs des choses **fonctionnelles**, pas des performances :

- pas de **pinch-to-zoom** — le zoom passe uniquement par `wheel`
  (`js/input.js:25`) ;
- pas de `touch-action: none` sur le canvas : le navigateur peut préempter le
  glissé et couper le `pointermove` en plein déplacement de vue ;
- le **défilement par les bords de l'écran** et la **fiche au survol** (loupe)
  n'ont pas d'équivalent tactile ;
- le HUD et les fiches d'identité sont dimensionnés pour une souris.

## 4. Optimisations, par rapport gain / risque

### 4.1 Mémoïser `neighbors()` par cellule — **−36 % de simulation, mesuré**

Le résultat de `neighbors(x, y)` ne dépend que de la cellule. On le calcule une
fois par cellule et par frame, on vide le cache dans `buildGrid`. Prototype
testé en direct : simulation **4,89 ms → 3,11 ms**, sans changement de
comportement (les appelants ne font qu'itérer, et tous testent déjà `.dead`).
En prime, le `push(...cell)` devient une boucle, ce qui supprime 459 constructions
de liste d'arguments par frame.

Dix lignes dans `ecosystem.js`. **À faire en premier.**

### 4.2 Pré-rendre les dégradés plein écran — ~15 ms sur appareil non accéléré

Colonne d'eau, ciel et sable sont trois `fillRect` plein écran en dégradé
vertical, refaits à chaque frame. Les rendre une fois dans un canvas hors écran
**étroit** (quelques pixels de large × la hauteur), puis les étirer au
`drawImage` : un étirement de texture est un remplissage plat, pas un dégradé.
À ne recalculer que quand la profondeur visible ou l'heure changent notablement.

Sans effet visible sur une machine accélérée — c'est le correctif qui rend le jeu
jouable sur les appareils faibles.

### 4.3 Une seule passe de voisinage dans `Entity.move`

Même après 4.1, `move` parcourt trois fois la même liste pour trois tests
différents. Une boucle unique avec les trois tests à l'intérieur économise deux
parcours de ~18 voisins par entité et par frame.

### 4.4 `Ecosystem.draw` : réutiliser le tableau

`filter` + `sort` reconstruisent un tableau de ~90 éléments à chaque frame.
Coût faible, mais gratuit à supprimer (tableau persistant, `length = 0`).

### 4.5 Remplacer `shadowBlur` par un halo pré-rendu

`fishbody.js` utilise `ctx.shadowBlur` pour la bioluminescence (lignes 1109,
1180, 1232, 1343). C'est l'opération la plus chère de Canvas 2D en rendu
logiciel. Un disque en dégradé radial dessiné une fois dans un canvas hors écran,
puis `drawImage`, donne le même rendu pour presque rien.

### 4.6 Simulation à cadence réduite hors champ — **à ne faire qu'en dernier**

~490 entités simulées pour ~90 visibles. Faire penser les lointaines une frame
sur trois (avec `dt × 3`) diviserait le coût, mais **modifie l'écosystème** :
la prédation, la ponte et les seuils de fuite sont réglés sur un pas fixe. Ne
l'envisager qu'avec une simulation longue de contrôle avant/après (populations
par espèce à 16 min), sinon on rejoue tous les réglages d'équilibre.

## 5. Ce qui n'est PAS un problème (vérifié)

- **Les particules.** ~350 en jeu normal, coût de dessin non mesurable. Attention
  au piège de mesure : un banc qui appelle `Ecosystem.update` sans
  `Particles.update` fait grimper le sable à **7 500 particules** — c'est
  l'artefact décrit pour le helper `FF` dans `CLAUDE.md`, pas un fuite.
- **`Ecosystem.buildGrid`** : 0,10 ms. La grille spatiale fait son travail.
- **Le nombre d'objets de décor** (260 rochers, 94 touffes, 160 planctons) : le
  culling par `Camera.isVisible` les élimine, le coût est dans les pixels.
- **Le rendu procédural des créatures** : 2,5 ms pour 90 individus, en rendu
  logiciel. Passer aux sprites optimiserait la partie déjà la moins chère — la
  remarque de `CLAUDE.md` reste vraie, elle se vérifie juste contre le décor
  plutôt que contre la simulation.
