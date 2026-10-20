# Le monde : zones, fond, ciel, décor

Le relief, les quatre zones horizontales, la nourriture et les arêtes, le ciel, le décor posé au sol, et la liste de ce qui reste à faire.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

## Architecture (js/)

- `config.js` — constantes monde, zones écologiques, types de nourriture. 1 m = 40 px, surface à y=300.
- `utils.js` — helpers math/couleur (`U`).
- `species.js` — **espèces 100 % data-driven**. Chaque fiche a un `name` rigolo **contenant la vraie espèce** ("Baleine Gros Dodo", "Poisson Confetti") et un `realName` affiché en sous-titre de la fiche d'identité. Ajouter une espèce = ajouter une entrée `SPECIES` (mouvement, bande de profondeur, proies, nourriture favorite, silhouette). **Roster complet : 53 espèces** — la liste et le détail de chacune sont dans
**[FICHES.md](../FICHES.md)**, qui fait autorité. Chaque fiche porte aussi une **`phrase`** et un **faux nom `latin`**, affichés uniquement dans la fiche d'identité (bloc `FICHES` en fin de fichier, séparé pour que les données de simulation restent lisibles). Flags génériques documentés en tête du fichier (`refuge`, `anchorToRefuge`, `ambush`, `lure`, `ink`, `aerial`, `jumps`, `stealthy`, `trickster`, `nocturnal`, `sizeVar`, `spanRatio`, `offshore`, `piquant`, `gonflable`, `snatch`, `shock`, `pouch`, `intouchable`, `perceBallon`, `plongeur`, `eatsPoop`, `gag(e,dt,t)`).
- `world.js` — triangle de profondeur en grille "profondeur max par colonne" (reco GDD §14), zones, fond sableux.
- `camera.js` — scroll bi-axial borné par le triangle (impossible d'atteindre les abysses près de la plage).
- `particles.js` — socle feedback réutilisable : splash, nuage de sable, bulles, sillage, **bulles d'action comiques** (`Particles.comic/hearts/stars`).
- `food.js` — graines (4 types dont favoris), arêtes des morts (charogne) et **cacas** (`Food.poops`). Le caca ressemble assez à une grosse graine pour qu'un poisson affamé s'y trompe — et il le paye (`Entity.malaise`).
  **Les arêtes** (`Food.addBone(x, y, taille, graine?)`) sont des **sprites pré-rendus** : `spriteArete(variante, k, R)` dessine une fois (hors écran, `willReadFrequently:false`) chacune des 12 variantes × 6 paliers de taille × la résolution écran courante (`_resolutionArete`, hystérésis, cache vidé seulement quand R change), et le jeu ne fait plus qu'un `drawImage` + une ombre par arête (60 arêtes : 7,9 → 2,5 ms mesurés par différence). Variante, sens, écart de taille (±8 %) et phase de balancement sortent **d'une graine** par `_hashArete`, comme `Entity.color` de l'identifiant — rien à stocker, stable d'une frame à l'autre. Les détails suivent le palier (vertèbres dès 1, dents/opercule dès 1,8, fêlure dès 3). Le cerne et le cœur des traits ont un **plancher en pixels monde**, sinon une arête de 0,7 n'a plus que des fils.
  Posée, elle épouse la pente du sable (`pente`, lissée par `rot`) et porte une ombre à plat ; sa ligne de sol suit sa taille (`pied`). Elle ne s'éteint pas d'un coup : sur ses 12 dernières secondes elle **s'enfonce dans le sable en rapetissant** (smoothstep, alpha 0 pile à 45 s — pas de claquement).

### Les quatre zones, de gauche à droite

Le monde ne se lisait que **verticalement** (les bandes de profondeur).
Horizontalement, tout le monde pouvait aller partout — et comme le rivage est le
seul endroit que TOUTES les bandes traversent, il devenait un goulot où l'on
s'entassait.

`World.zonesX` découpe donc l'écran en quatre, **déduits du relief** et jamais
figés (si `CONFIG.PROFILE` change, ils suivent) :

| Zone | Bornes | |
|---|---|---|
| **plage** | 0 → `shoreX` | le sable émergé |
| **rivage** | jusqu'à 350 px d'eau | le haut-fond |
| **mer** | jusqu'à 1400 px | la pleine eau |
| **haute mer** | au-delà | le grand large et les abysses |

Le HUD les affiche : une **barre horizontale** (`Main.initZoneBar`, pendant de la
jauge de profondeur) dont les segments sont construits à partir de
`World.bandesX()` — largeurs proportionnelles au monde réel, donc le grand large
occupe bien les deux tiers. L'heure se lit désormais dans les deux sens :
« Grand large · Eau claire · 34 m ». La fiche d'identité aussi, avec une ligne
**Vit** (`IdCard.habitatOf`) : la seule profondeur ne situe pas une espèce — la
Dorade Dorée et le Poisson Confetti partagent l'eau claire et ne se croisent
jamais, l'une au large, l'autre au récif.

Chaque espèce a une **bande horizontale** (`Entity.bandeX`) : la portion du monde
où sa bande de profondeur existe vraiment, plus une marge de confort. Le
rappel y est **souple** — une accélération proportionnelle au dépassement, très
assouplie en chasse et en fuite (×0,25) pour qu'un prédateur ne lâche pas sa
proie à la frontière.

Trois corrections d'espèce en sont sorties, toutes du même type — **une bande de
profondeur mal placée met une espèce dans la mauvaise zone horizontale**, puisque
l'une découle de l'autre :

- La **Murène du Récif** commençait à 350 px de profondeur, donc son rocher
  tombait vers x = 1600 — la frontière du haut-fond, là où il y a déjà foule.
  Elle commence à 650 (x ≈ 1980, en pleine mer). Sa borne basse, en revanche, ne
  peut pas descendre bien plus : `nearestPreyFor` filtre par bande, et une murène
  posée à 2000 px n'aurait plus **aucune** proie à portée.
- Conséquence : le **Confetti sort de son menu** (les deux bandes ne se
  recouvrent plus que sur 100 px, le lien était déclaré mais ne pouvait presque
  jamais servir). Le **Poisson Coffre** le remplace — 350 px de recouvrement, il
  nage atrocement mal, et il n'avait **aucun prédateur**.
- Audit à refaire après toute modification de bande : pour chaque paire
  prédateur/proie, mesurer le recouvrement en x **et** en y. En dessous de 300 px
  en x ou 120 px en y, le lien est décoratif.

**Souple, et pas un mur, c'est le point important** : un mur dur aligne tous ceux
qui s'y pressent sur le même pixel, ce qui est exactement le défaut qu'on
corrige. Mesuré après : 27 créatures au rivage sur 569, contre un entassement
systématique avant.

Trois règles apprises en corrigeant le **« mur invisible »** que le joueur voyait
en pleine mer — un banc de sardines aplati contre une vitre, au milieu de l'eau :

- **La bande ne commence JAMAIS avant la barrière de rivage de l'espèce**
  (`limiteLarge`). Sinon les deux contraintes se battent : le rappel souple tire
  vers la côte pendant que le mur dur interdit d'y aller, et tout le banc reste
  collé au mur. Mesuré avant : **67 % des Sardines Bulle-fofolle et 79 % des
  Poissons Volants** tenaient à moins de 40 px de leur barrière ; après : **0 %**.
- **La barrière dure elle-même donne à chacun sa distance** (`+ (id % 7) * 26`).
  Un `clamp` commun pose tous ceux qui le touchent sur le même x — c'est la même
  leçon que pour les créatures de fond, et elle vaut partout.
- **La marge de confort suit la VITESSE** (`400 + speed * 6`). À marge constante,
  une sardine à 90 px/s se retrouvait dans un couloir de 900 px qu'elle
  traversait en dix secondes : doux ou non, ça se lit comme une cage.

Corollaire d'équilibre : un `offshore` réglé avant le plancher générique de
150 px d'eau est probablement trop grand aujourd'hui. La Sardine et le Poisson
Volant sont passés de 950 à 260 — ils ont de nouveau droit au rivage, comme le
Confetti, et le plancher générique suffit à les tenir hors du ressac.

Mesuré sur l'ensemble : **rivage 17 · mer 122 · grand large 264** sur
403 adultes, et **zéro nageur sur le sable sec**.

### Le ciel

Il valait un dégradé deux couleurs et un disque de 24 px qui changeait de teinte
à minuit — le même objet servait de soleil ET de lune. Cinq règles depuis :

- **Une palette par moment de la journée** (`Background.CIEL`), interpolée sur
  `Main.dayT()`. `Main.nightAmount()` ne distingue pas l'aube du crépuscule : les
  deux plus beaux moments du cycle passaient donc par exactement le même bleu.
- **Deux astres qui se relaient** : le soleil parcourt la première moitié du
  cycle, la lune la seconde, et ils se croisent au crépuscule. Chacun **rase
  l'horizon** à son lever et à son coucher — c'est ça qui rend l'heure lisible,
  plus encore que la couleur du ciel — et vire à l'orange en le rasant.
- **La lune a des phases**, une par nuit, en huit temps. C'est le seul élément du
  décor qui change d'un jour à l'autre.
- **Étoiles et nuages se rebouclent** sur une bande de 3 200 px
  (`CIEL_LARGEUR`) avec un parallax très lent : le ciel est loin, mais pas peint
  sur la vitre. Semer des étoiles sur les 8 000 px du monde pour n'en voir qu'un
  écran serait du gâchis.
- **Le reflet sur l'eau** raccroche le ciel à la mer ; sans lui l'astre flotte
  dans son coin. Plus l'astre est bas, plus la traînée est **longue et vive** :
  à intensité fixe elle était invisible sur l'eau sombre de la nuit (mesuré en
  lisant les pixels : 273 sous la lune contre 161 de part et d'autre).

Sixième règle : **les trois houles ne défilent pas à la même vitesse.** Elles
suivaient toutes exactement la caméra, donc restaient rigoureusement solidaires
— ce qui annulait le relief qu'on avait cherché à donner en variant leur hauteur
et leur pâleur. Chaque houle a maintenant sa parallaxe (`p` : 0,86 / 0,94 / 1) ;
les écarts restent petits, plus francs le décalage se lirait comme un défaut
d'alignement. **La houle du devant garde `p: 1`** — c'est sur elle qu'est calée
l'écume du rivage, qui a sa propre formule.

Piège rencontré : **un nuage se dessine en UN SEUL tracé.** Rempli bulle par
bulle, chaque recouvrement cumulait l'alpha et le nuage se lisait comme une
grappe de ronds soudés — flagrant en plein ciel.

- `background.js` — dégradé d'eau par profondeur, god rays, crêtes d'arrière-plan, rochers, végétation, cheminées volcaniques, plancton, jour/nuit.

### Décor posé au sol

Rochers, végétation et cheminées suivent le relief. Deux règles à respecter pour tout nouvel élément de décor :

- **Lire la hauteur à la position réellement affichée**, pas à la position d'origine : avec un décalage parallax, `px = x - Camera.x * layer` puis `World.floorY(px + Camera.x)`. Utiliser `World.floorY(x)` directement fait flotter l'élément au-dessus du sol.
- **S'incliner selon la pente** via `ctx.rotate(Math.atan(World.slopeAt(wx)))`, sinon l'élément paraît penché sur les fortes pentes.

Ordre de rendu : les **rochers avant le sable** (celui-ci recouvre leur base et les enfonce naturellement), la **végétation et les cheminées après** (elles poussent dessus).

Les **créatures** posées au sol suivent la même règle : `GROUND_RENDERS` (worm, crab, shell, star, anemone, eel) pivote avec `World.slopeAt`. Les espèces `flatGround` (ver-tapis) apparaissent en plus sur une **terrasse** — `World.init` aplanit des groupes de colonnes exprès, sinon une créature horizontale paraît posée de travers.

Les espèces peuvent réclamer un **habitat** (`habitat: 'rock' | 'weed'`) : elles apparaissent alors sur les positions de décor correspondantes (`Background.habitatSpots`) — étoiles sur les rochers, hippocampes dans les herbiers. Le décor est donc initialisé **avant** l'écosystème dans `Main.init`.

## Reste à faire (extension du GDD)

**[IDEES.md](../IDEES.md)** rassemble tout ce qui n'est pas encore implémenté, en
sept sections : la **liste des 25 poissons manquants** (§1, la référence — les
idées des enfants, la liste de souhaits et les trous de la chaîne alimentaire y
sont fusionnés et dédoublonnés), les gags dans l'esprit **parc à thème** (§2),
les corrections sur l'existant (§3), la canne à pêche (§4), la couche
**économique** — acheter des poissons, être payé aux naissances, sanctionné aux
extinctions et aux espèces envahissantes (§5), le **roster** (§6, tableau des 27 espèces
d'origine) avec sa répartition par zone et par niveau trophique, et les
contraintes à respecter en ajoutant une espèce (§7).

**[FICHES.md](../FICHES.md)** en est le pendant espèce par espèce : une fiche par
créature (phrase, faux nom latin, action rigolote, nourriture, frayère, qui la
mange), ce qui est codé et ce qui ne l'est pas. Trois décisions générales y
sont arrêtées : la **phrase n'apparaît que dans la fiche d'identité** (jamais
en bulle), les **oiseaux frayent sur la plage** (frayère `beach`, la première
hors de l'eau), et **tous les piquants rendent malade** (`piquant: true` →
`Entity.malaise`), aux côtés du caca et du prout déjà codés.

- Migration verticale au crépuscule, événements aléatoires (§11 : bloom, mutant, hoquet, poisson malade)
- DA : l'utilisateur générera des sprites ; garder le système yeux/bouche commun (`FishBody.drawFace`) par-dessus
- Audio, mobile/touch à peaufiner, perf (la grille spatiale existe — `Ecosystem.neighbors` ; ~550 à 700 entités en jeu normal, plafonnées à 800 par `Ecosystem.BUDGET`)
- Piège dev connu : `requestAnimationFrame` est en pause quand l'onglet est caché (la sim se fige, `Main.time` n'avance pas)
- L'**écume appartient à l'eau** : elle court le long de `CONFIG.SURFACE_Y` en ondulant comme les vagues. Calée sur `World.floorY`, elle grimpait sur le sable sec.
- Attention en simulation accélérée : le helper `FF` de debug n'appelle que `Ecosystem.update`, donc `Food.update` ne tourne pas et les arêtes s'accumulent sans se dissoudre. C'est un artefact de mesure, pas un bug du jeu.
- La plage n'est pas un décor à part : c'est le fond sableux dont la profondeur devient négative près de x=0 (`world.js`), donc il émerge au-dessus de la ligne d'eau. Le relief vient de `CONFIG.PROFILE`, une liste de **points de contrôle** `[x, profondeur]` : plage douce jusqu'au rivage, puis **descente franche**. Un fond trop plat sous l'eau écrase toutes les espèces contre le sable — les poissons de strate moyenne n'avaient plus de hauteur d'eau où nager. `World.shoreX` (le x où le sable croise l'eau) est **déduit du profil** — s'en servir plutôt que d'une constante.
- Les terrasses (`World.init`) doivent rester **étroites** : lissées sur 3 colonnes de 400 px elles créaient des plateaux de 1200 px qui annulaient le profil.
- Le modelé du sable **suit le contour du fond** (traits épais superposés). Dessiné colonne par colonne, il laissait des rayures verticales.
