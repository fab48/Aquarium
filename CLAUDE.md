# Aquarium Vivant

Écosystème aquatique scrollable, contemplatif et comique. Le design complet est
dans `aquarium_vivant_game_design.docx` (chaîne alimentaire, scroll bi-axial,
cycle de vie, nourriture favorite). Le roster en compte aujourd'hui **27**, le
GDD en décrivait 24.

## Stack

HTML5 pur : Canvas 2D, zéro dépendance, zéro build. Scripts classiques (pas de
modules ES). `js/boot.js` charge tous les fichiers avec `?v=<timestamp>` :
**c'est l'anti-cache** — ajouter un nouveau fichier js implique de l'ajouter à
la liste de `boot.js`, pas à `index.html`.

Lancer avec `python dev_server.py 8642` (config `.claude/launch.json`) — un
`http.server` multi-thread qui envoie `Cache-Control: no-store`, et qui expose en
plus deux routes d'écriture dans `Assets/` pour l'atelier des créatures
(cf. [SPRITES.md](SPRITES.md) §2).

## Contrôles

Molette = zoom (centré curseur) · clic molette/droit = déplacer la vue · souris
au bord de l'écran = défilement · clic gauche = nourrir/bulles (jamais de
déplacement) · **double-clic sur une créature = la caméra la suit** (cerceau doré ;
double-clic dans le vide ou déplacement manuel pour la relâcher) · bouton 🔍 =
fiches d'identité au survol · bouton ❔ = légende.

**Tactile** (`Input.touchDown/touchMove/touchUp/tap`) : tap = nourrir · glissé
1 doigt = déplacer la vue · pincement = zoom · double-tap = suivre · avec la
loupe, tap sur une créature = fiche **épinglée** (pas de survol au doigt). Le
défilement par les bords est coupé en mode tactile. Pièges vérifiés dans
[PERFORMANCE.md](PERFORMANCE.md) §4 : `touch-action` ne s'hérite pas (posé sur
`#game`), `setPointerCapture` peut jeter, et un doigt perdu sans `pointerup` se
purge sur `lostpointercapture` — sinon pincement fantôme.

Avec la loupe active, la créature **suivie garde sa fiche affichée** en
permanence (liseré doré + 🎯, comme son cerceau) et le survol en ajoute une
seconde, décalée pour ne pas la recouvrir (`IdCard.draw(ctx, e, eviter,
epinglee)` renvoie son propre rectangle). Le rayon de survol a un **minimum en
pixels écran** (`Input.RAYON_SURVOL`, 34 px) et une **hystérésis** : la créature
déjà survolée est conservée dans un rayon 1,7× plus large. Sans ces deux règles
une crevette (7 px de monde) se visait au pixel près et sa fiche clignotait dès
qu'elle bougeait.

## Architecture (js/)

- `config.js` — constantes monde, zones écologiques, types de nourriture. 1 m = 40 px, surface à y=300.
- `utils.js` — helpers math/couleur (`U`).
- `species.js` — **espèces 100 % data-driven**. Chaque fiche a un `name` rigolo **contenant la vraie espèce** ("Baleine Gros Dodo", "Poisson Confetti") et un `realName` affiché en sous-titre de la fiche d'identité. Ajouter une espèce = ajouter une entrée `SPECIES` (mouvement, bande de profondeur, proies, nourriture favorite, silhouette). **Roster complet : 30 espèces + anémones-refuges.** Chaque fiche porte aussi une **`phrase`** et un **faux nom `latin`**, affichés uniquement dans la fiche d'identité (bloc `FICHES` en fin de fichier, séparé pour que les données de simulation restent lisibles). Flags génériques documentés en tête du fichier (`refuge`, `anchorToRefuge`, `ambush`, `lure`, `ink`, `aerial`, `jumps`, `stealthy`, `trickster`, `nocturnal`, `sizeVar`, `spanRatio`, `offshore`, `piquant`, `gonflable`, `snatch`, `shock`, `pouch`, `gag(e,dt,t)`).
- `world.js` — triangle de profondeur en grille "profondeur max par colonne" (reco GDD §14), zones, fond sableux.
- `camera.js` — scroll bi-axial borné par le triangle (impossible d'atteindre les abysses près de la plage).
- `particles.js` — socle feedback réutilisable : splash, nuage de sable, bulles, sillage, **bulles d'action comiques** (`Particles.comic/hearts/stars`).
- `food.js` — graines (4 types dont favoris), arêtes des morts (charogne) et **cacas** (`Food.poops`). Le caca ressemble assez à une grosse graine pour qu'un poisson affamé s'y trompe — et il le paye (`Entity.malaise`).
- `fishbody.js` — rendu cartoon procédural. **Système yeux/SOURCILS/bouche commun** partagé par toutes les silhouettes.

### Émotions

`FishBody.EMOTIONS` est une table de paramètres (ouverture d'œil, pupille, regard, paupière, **angle et hauteur du sourcil**, bouche, rougeur) : idle, happy, love, eating, sleeping, dizzy, scared, blush, angry, proud, ashamed. Ajouter une émotion = ajouter une ligne.

**[EMOTIONS.md](EMOTIONS.md) est la table de référence** : catalogue des expressions, correspondance action → émotion, budget de bulles, idées de gags à brancher. Le mettre à jour en même temps que `FishBody.EMOTIONS` et `js/legend.js`.

**Toute silhouette doit passer par le système commun.** `FishBody.face()` pour
un visage groupé, `FishBody.oeil(ctx, x, y, r, e, t)` pour un œil isolé (crabe
sur tiges, coquillage entre ses valves), `FishBody.bouche(ctx, mx, my, …)` pour
une bouche posée ailleurs qu'à sa place par défaut — c'est ce dont un sprite
dessiné à la main a besoin, son ancre de bouche n'étant pas là où le visage
commun l'attend. Le crabe et le coquillage dessinaient
les leurs à la main : ils restaient **grands ouverts en toutes circonstances**,
y compris endormis en pleine nuit — et ce sont les créatures les plus nombreuses
du fond, donc l'anomalie sautait aux yeux. Contrôle non visuel : rendre la
silhouette hors écran et compter les pixels de blanc d'œil (crabe 450 éveillé
→ 0 endormi ; coquillage 220 → 0). Le coquillage reste d'ailleurs **entrouvert**
en dormant, sinon ses yeux clos ne se verraient pas du tout.

Le sourcil porte l'essentiel de la lecture — c'est lui qu'il faut pousser en premier si une émotion ne se voit pas. **Privilégier toujours le visage** (yeux, joues, bouche, sourcils) plutôt qu'une bulle : c'est pour ça que ce socle existe.

Au repos, la **pupille suit le curseur** (`Entity.updateEyeLook` → `e._eyeLook`), avec une intensité qui décroît avec la distance et qui s'efface dès qu'une émotion prend le dessus.

Une émotion se **joue dans la durée** : `entity.emote(expr, durée)` déclenche l'expression *et* son VFX ; `entity.emoteK()` renvoie une enveloppe 0→1 (montée rapide, léger dépassement, retombée douce) avec laquelle `drawFace` interpole depuis le visage neutre. Une silhouette doit appeler `FishBody.face(ctx, taille, e, t)` (jamais `drawFace` directement) pour en bénéficier.

Une prise se lit en trois temps : impact (`Particles.chomp`), **pause de mastication** (`pred._chew`, ~0,55 s pendant laquelle il s'arrête net) avec la **queue de la proie qui dépasse de sa gueule** (`FishBody.drawMouthful`, appelé pour toutes les silhouettes), puis les témoins qui détalent.

### Les gags sont des ANIMATIONS, pas des bulles

Une bulle de BD ne raconte rien toute seule. Un gag lisible se construit avec :
- des **phases** (le dauphin : approche discrète → jaillissement « BOUH ! » → il se tord de rire), stockées dans un `_xxxPh` et pilotées depuis `def.gag` ;
- un **arrêt de la nage** des protagonistes (`e._freeze`), sinon la mimique défile hors champ ;
- une **orientation forcée** (`e._faceAt`) quand un poisson doit en regarder un autre — à l'arrêt, la vitesse ne dit plus où il regarde ;
- une **expression dédiée** (`laughing`, `kiss`) plutôt qu'un symbole ;
- **une seule bulle**, au moment clé.

Pièges de mise en scène déjà rencontrés :
- Une créature **fixe** ne doit jamais s'incliner (`_tilt = 0`) : son décor est dessiné dans son repère, et le rocher de la murène partait de travers.
- **Inclinaison et miroir.** `_tilt` est calculé sur `Math.abs(dirX)` : c'est déjà l'angle « non miroité », il s'applique donc **tel quel** dans les deux sens (`scale(-1,1)` puis `rotate(+tilt)`). L'inverser fait pencher à l'envers tout poisson tourné à gauche. En revanche une rotation calculée dans le repère MONDE (la pente du fond pour le rocher de la murène) doit, elle, être inversée après un miroir.
- Quand un poisson doit **viser** un autre (`_faceAt`), l'inclinaison est prise **exacte** (`atan2(dirY, |dirX|)`, bornée à 1,4 rad) : l'amortissement `+40` et la bride à 0,75 rad utilisés pour la nage normale l'empêchaient de piquer vers sa cible, d'où un bisou de travers.
- Secouer une victime en `vy` la met la tête en bas : préférer un frisson **horizontal** et brider son inclinaison.
- Un gag qui modifie une émotion doit passer `vfx: false` s'il a déjà son propre effet, sinon les deux se cumulent.

Garde-fou : le total de bulles était monté à ~930/min et saturait l'écran. Cible : **~250/min** pour tout l'aquarium.

**État au 4 septembre 2026 : ~508/min, soit le double de la cible.** Le roster
est passé de 10 gags sur 27 espèces à 29 sur 30, donc une hausse était
inévitable ; le double ne l'est pas. Trois coupables ont déjà été bridés
(1284 → 508) et la méthode pour trouver les suivants est de compter par
**ligne d'appel** : envelopper `Particles.comic/shout/stars/…` et lire
`new Error().stack` pour attribuer chaque bulle à son émetteur réel — compter
par espèce ne suffit pas, l'essentiel part de `emoteVFX`, pas des gags.

Deux règles en sont sorties, toutes deux générales :
- **`dizzy` est devenu une réaction de GROUPE** (au même titre que `scared` et
  `eating`) depuis l'Anguille : une décharge assomme cinq poissons d'un coup.
- **Une scène qui touche tout un banc ne doit émettre que sur une poignée.**
  La figure des Confettis faisait rougir ses 40 membres d'un coup, soit
  125 gouttes de sueur par minute à elle seule. Ne jamais émettre une bulle à chaque frame d'une scène (`Math.random() < dt * k`) — l'émettre une fois au démarrage (`if (e._xxxT < dt * 2)`).

Les VFX sont throttlés par individu (`_vfxCd`) et les réactions de groupe (peur, régal) ne s'affichent que sur ~25 % des individus : sans ça un banc entier affiche vingt bulles d'un coup.
- `entity.js` — créature : boids contraints par type de liberté, faim, chasse avec ratés comiques (`missChance`), fuite, sommeil, cycle œuf→alevin→adulte→arête. **Reproduction (`tryMate`)** : deux adultes de la même espèce, tous deux `wellFed >= 1`, qui se croisent forment un couple (`_matingWith`) — ils **s'arrêtent, se font face et s'embrassent** (~1,6 s) avant que 1 à 3 œufs apparaissent selon leur forme. Seul celui dont l'`id` est le plus petit pond, sinon la portée est doublée. Manger ne pond jamais tout seul.
- `gags.js` — **toutes les mises en scène comiques**, une fonction par espèce, appelées via `def.gag`. Séparées de `species.js` pour que les fiches restent des données lisibles.
- `legend.js` — panneau HTML (bouton ❔) expliquant chaque bulle de BD et chaque expression. **À tenir à jour** quand on ajoute un gag ou une émotion.
- `idcard.js` — fiche d'identité au survol (régime, prédateurs, jauge de faim). « Mangé par » est **déduit** des tables `prey`, donc rien à ressaisir en ajoutant une espèce.
- `ecosystem.js` — spawn par groupes, prédation, ponte, **grille spatiale** (`neighbors()` — à utiliser pour toute recherche de voisinage, jamais une boucle sur `entities`), plafonds de population (`popCap`), report de prédation (`refugeFloor`), immigration.

## Équilibre de l'écosystème

Six mécanismes le rendent stable **sans réglage espèce par espèce**. Les toucher demande de revérifier une simulation longue.

**Audit du 4 septembre 2026** — avant correction, l'aquarium s'effondrait par le haut : Orque **éteinte**, Requin à 1, Thon 22→2, Perroquet 19→2, Méduse 35→4 en 18 min, et **11 des 22 liens trophiques déclarés n'avaient jamais servi une seule fois**. Après les correctifs 1, 2 et 3 : **zéro espèce éteinte**, 20 liens sur 23 actifs, et **plus aucune mort de faim** en dehors du Fou Moustachu. La méthode : instrumenter `Entity.prototype.die` (cause de mort) et `Ecosystem.eat` (qui mange qui), puis faire tourner `Ecosystem.update` sans rendu — en appelant **aussi** `Food.update` et `Particles.update`, sinon arêtes et sable s'accumulent (artefact de mesure, pas un bug du jeu).

1. **Plancton ambiant** (`World.planktonAt`) — broutent le niveau 1 de la chaîne : toute espèce sans `prey`, **et tout prédateur qui n'a qu'UNE seule espèce à son menu** (il n'a aucune marge si elle se raréfie — le Thon passait de 20 à 2 en 18 min). Le broutage plafonne la faim (jamais de mort de faim) mais ne rassasie pas complètement : nourrir reste utile, et la natalité naturelle est lente (GDD §9).
2. **Report de prédation** (`Ecosystem.refugeFloor`) — une espèce tombée sous **~35 %** de son plafond n'est plus chassée, le temps qu'elle remonte. C'est ce qui empêche les extinctions en cascade.

   Cette proportion fixe l'effectif **d'équilibre** d'une espèce chassée, pas seulement son seuil de secours : dès que la prédation est efficace, la proie descend jusqu'à son plancher et s'y stabilise. À 22 % le banc de Confetti tombait à 21 pour un plafond de 96 — le banc le plus visible du jeu disparaissait.

   Le plancher est en outre **borné sous le plafond**. La chasse exige `counts > refugeFloor` : une espèce dont le plafond vaut son plancher était protégée **en permanence**. C'était le cas du Calamar Géant (plafond 4, plancher 4), proie principale du Cachalot — zéro prise possible, jamais.

2 bis. **Disette** (`Ecosystem.disette`) — le pendant du report, côté prédateur. Quand **toutes** ses proies sont passées sous leur plancher, un carnivore n'a plus rien à chasser : il se rabat sur le plancton à moitié rendement, assez pour ne pas mourir, jamais assez pour se reproduire. Sans lui, le mécanisme censé éviter les extinctions en cascade en provoquait une **par le haut** : mesuré sur 18 min, l'Orque éteinte et le Requin tombé à 1, avec 10 000 recherches de proie infructueuses.
3. **Recherche de partenaire** (`Entity.tryMate` + état `court`) — sans elle, les espèces rares ne se croisent jamais dans un monde de 8000 px. Les espèces qui **ne migrent pas** (`Ecosystem.migre` : les fixes, mais aussi les trop lentes) pondent **en diffusion** faute de voisin — sans ça la Méduse, qui dérive à 12 px/s, ne pondait que 2 fois en 18 min et passait de 35 individus à 4.
4. **Immigration** (`Ecosystem.immigration`) — filet de sécurité : une espèce localement éteinte revient du large. Le joueur ne peut pas perdre une espèce définitivement.
5. **Boom provoqué par le joueur** (`Ecosystem.boom` / `feedBoost`) — nourrir une espèce fait monter son plafond jusqu'au double. Les prédateurs se reportent alors sur elle (`nearestPreyFor` pondère par l'abondance), ce qui ramène tout à l'équilibre sans jamais punir le joueur (GDD §9). Le boom décroît vite : il faut nourrir **en continu** pour le maintenir.

### Trois mécaniques de défense et de chasse (2026-09-04)

- **`piquant: {range}`** — « tous ceux qui pic-pic rendent malade ». Au contact,
  la victime prend un `malaise()` (jamais mortel, GDD §9) et détale. Un cooldown
  **par victime** (`o._piqueCd`), sinon un poisson coincé contre un oursin repart
  en malaise à chaque frame. `gonflable: true` y ajoute l'avertissement : l'animal
  se **gonfle** à l'approche (réutilise `_gonfle`, déjà dessiné et déjà
  tremblotant), pour que la piqûre ne sorte pas de nulle part.
- **`snatch: true`** — le Pélican ne vise QUE les proies en phase aérienne
  (`jumpState === 'air'`) et ne descend jamais sous la surface. Trois points :
  filtre dans `nearestPreyFor`, abandon dès que la cible retombe à l'eau, et
  seuil « trop profond » ramené à la surface. Ça donne enfin une raison d'être
  aux sauts des exocets, que **personne n'attendait en l'air**.
- **`shock: {range, cooldown}`** — l'Anguille électrocute **tout** son voisinage
  d'un coup : les touchés sont `assomme()` (vrille + étoiles, qui existait déjà),
  les œufs et alevins meurent. C'est la **première mécanique qui tue sans
  manger** : elle échappe donc au report de prédation et aux plafonds, qui ne
  comptent que la prédation. D'où le cooldown franc, et la décharge qui ne part
  que si quelqu'un est assez près pour la justifier.

Piège trouvé en les branchant : **un oiseau ne peut pas brouter**. `planktonAt`
renvoie 0 au-dessus de la ligne d'eau, or un aérien y passe sa vie — le Pélican
mourait de faim malgré son `grazes` (3 morts en 6 min). Les aériens broutent
donc la **surface**, pas leur propre position.

### Trop-plein : caca, malaise, explosion

Ce qui rentre ressort. Manger met un **caca** en file (`Entity.digestion`, un
repas sur deux, 5–13 s de délai) qui part par la queue au terme d'une petite
scène. Manger fait aussi **grossir** : `growth` n'est plus plafonné à 1 pour un
adulte, et à `TAILLE_EXPLOSION` (5×) l'animal **explose** (`Entity.explose`).

Quatre garde-fous, tous mesurés :

- le surpoids **se résorbe** (−0,045/s), donc la prédation ordinaire ne fait
  exploser personne — **0 explosion en 16 min** sans joueur. Il faut ~40 s de
  clics soutenus sur le même poisson ;
- le caca est **rare et temporaire** (30 s de vie) : **9 au sol maximum** sur
  16 min sans joueur ;
- le **décor vivant est exclu** (`refuge`, `movement: 'fixed'`, via
  `Entity.peutGonfler`) : une anémone gonflée n'est qu'un triangle difforme, et
  la faire exploser détruirait les frayères du récif ;
- `Entity.malaise()` (caca avalé, prout respiré) borne la faim à 0,9 : le
  dégoût fait perdre de l'état mais ne **tue** jamais.

Au-delà de 2,5× l'animal tremble (`_gonfle`, appliqué dans `draw`) et passe de
`surprise` à `scared` : l'explosion s'annonce, elle ne tombe pas du ciel.

### Taille : croissance, âge et gabarit

`e.size` n'est plus `def.size * growth`. Quatre facteurs se multiplient, et il
faut garder leurs rôles séparés :

- `growth` (0,25 → 1) = la **maturité**, et **au-delà de 1 le gras du gavage**.
  C'est la seule chose que nourrir fait bouger, et la seule que lit l'explosion.
- `gabarit` = tirage individuel `1 ± def.sizeVar` (défaut 0,13), **fixé une fois
  à la construction**. Fort chez les bariolés (Confetti 0,26), faible chez les
  colosses, où la moindre irrégularité se remarquerait.
- l'**âge** : de 0,90 à 1,12 sur la vie entière. Les poissons grandissent toute
  leur vie ; un vieux est visiblement plus gros qu'un jeune adulte, sans avoir
  été gavé.

La croissance de l'alevin est **calée sur la longévité de l'espèce**
(`enfance = maxAge * 0,2`, avec un ralentissement en approchant de la taille
adulte : durée réelle ≈ `0,24 × maxAge`). Un taux fixe donnait la même enfance
à un confetti et à un baleineau.

Enfin, un adulte **créé directement** (peuplement du monde, immigration) reçoit
un âge aléatoire jusqu'à 60 % de sa longévité. Sans ça toute la population de
départ a le même âge, donc la même taille, et une classe d'âge entière meurt de
vieillesse d'un coup.

Conséquence à ne pas oublier : `def.size` reste la valeur de référence pour les
**seuils** (colosse ≥ 70, tirant d'eau, spawn) ; `e.size` est ce qui est
**dessiné et testé en contact**. Ne pas intervertir les deux.

### Frayères et anti-entassement

Chaque espèce a une `nursery` : `'reef'` (anémones), `'shallow'` (haut-fond près du rivage), `'deep'` (sources chaudes). Prête à se reproduire, une créature **migre** vers sa frayère (état `migrate`, contrainte de profondeur assouplie) — d'où du mouvement à l'écran, et des partenaires qui se trouvent.

Quatre règles évitent les tas de poissons, apprises à la dure :
- Les espèces **lentes** (`speed < 45`, ou drift/anchored/crawl/fixed) ne migrent pas : une méduse à 12 px/s n'atteindrait jamais une frayère lointaine et cesserait de se reproduire.
- La frayère d'un individu est **stable et répartie par identifiant** (`list[e.id % list.length]`), jamais « la moins peuplée du moment » — sinon tout le monde converge au même endroit.
- L'ancrage utilise un **rayon de confort** (`tether`) : le rappel ne s'exerce qu'au-delà du rayon, jamais vers un point unique.
- Seules les espèces de récif confient leurs œufs à une anémone, et **chaque œuf reçoit sa place** autour d'elle.

Les groupes d'espèces de fond sont répartis **régulièrement** sur leur bande valide (un tirage au sort les agglutine).

### Créatures de fond : la bande de sable

Le modelé du sable dessine des bandes qui suivent le contour du fond. Les
créatures de fond (crabe, étoile, coquillage, ver, anémone) se répartissent sur
les **deux premières** (`SABLE_BANDE = 82 px`, décalage stable réparti par
identifiant, cf. `sableOffset`) au lieu d'être alignées sur une seule ligne de
contour. Un décalage seul se lit comme un défaut de placement : le rendu ajoute
donc une **perspective pauvre** — plus la créature est loin dans la bande, plus
elle est petite. Le crabe dérive lentement en travers de sa bande.

La murène en est **exclue** : son rocher est calé sur la ligne de contour.

Trois règles apprises en corrigeant l'alignement :
- **Quinconce, pas un rang.** Trois rangées dans la bande, décalées d'une
  demi-case en x. Un rang unique alignait tout le monde sur la même diagonale.
- **Le tri de rendu doit suivre la bande** (`clef = size + _sable * 3`, décroissant) :
  sans ce critère, une créature « loin » se dessinait par-dessus une « proche »
  et le décalage se lisait comme un bug d'empilement.
- **Ne jamais recadrer plusieurs individus par un simple `clamp`** : tous ceux
  qui dépassaient la borne atterrissaient exactement au même x et s'empilaient.
  Chacun rentre à sa propre distance du bord (empilements exacts : 12 → 6).

### Ponte des espèces à habitat

Hippocampe (herbiers) et étoile (rochers) pondaient **sur place** : les larves
s'entassaient de génération en génération, exactement comme les murènes.
`Ecosystem.habitatLibre` envoie l'œuf « au loin dans le courant », sur le site
d'accueil le moins peuplé, avec une pénalité pour les sites à moins de 600 px du
parent. Résultat sur 16 min : étoile **17 sur 1 site → 10 sur 7 sites** (max 2),
hippocampe **12 sur 6 sites** (max 3).

Piège : l'éloignement doit rester une **préférence**. Une première version
refusait la ponte quand le score total dépassait un seuil — quand tous les
herbiers étaient à portée du parent, la pénalité suffisait à tout bloquer et
les hippocampes tombaient à 2 individus. Le refus ne porte que sur
l'**occupation** du meilleur site.

### Les grands fonds

Les abysses n'avaient que le Poisson-lanterne et un embusqué immobile : un décor
noir et vide. Ils portent maintenant leur propre chaîne complète —
**Crevette Guirlande** (broute la neige marine) → **Calamar Fusée** →
**Calamar Géant Timide**, avec le **Cachalot** qui descend chercher tout le
monde, le **Poulpe Ninja** qui descend maintenant jusqu'au sable
(`depthBand` [400, 3400]) et le **Poisson-Tapis** qui rampe dessus.

Trois mécaniques génériques sont nées de là, toutes utilisables ailleurs :

- **`lure: {range, missChance}`** — la pêche à la lampe du Poisson-lanterne. Le
  gros de la scène se joue **chez la proie** : `_lureT` la fait nager droit sur
  la lumière (`Entity.move`), et le lanterne se contente de briller et de rester
  planté. Il **remplace la chasse**, pas le reste : il continue de brouter
  (`grazes: true` explicite, sinon avoir des proies le prive du plancton et il
  meurt de faim) et de se reproduire. Deux garde-fous mesurés : un `_snapCd` de
  3,5–6,5 s entre deux coups de mâchoire (sans lui, le test de raté est rejoué à
  **chaque frame** et l'essaim y passe en deux secondes), et une émotion émise
  **uniquement à l'entrée dans le halo** — le balayage tourne 4 fois par seconde,
  émettre à chaque passage fait exploser le budget de bulles.
- **`ink: true`** — le rideau d'encre. L'important n'est pas le nuage : c'est que
  le poursuivant **perde sa cible**. Placé avant tout le reste dans `think`,
  parce que le Poulpe est un charognard et que le moteur ne le fait donc jamais
  « fuir » : il n'avait aucune porte de sortie.
- **`spanRatio`** (cf. colosses).

Deux pièges d'équilibre vérifiés en simulation :

- **La base de la chaîne abyssale doit vivre longtemps.** Le plancton du fond
  (0,72) remplit la jauge de ponte deux fois moins vite qu'en eau claire. Avec
  une longévité de petit poisson ([160, 260]), chaque crevette n'avait le temps
  que d'**une** portée — soit une demi-descendance par individu, les couples se
  partageant la ponte — et l'espèce passait de 70 à **2 en huit minutes**, en
  entraînant le Calamar (10 morts de faim) avec elle. Portée à [420, 640], elle
  tient. Même raison, même remède que pour le Poisson-lanterne.
- **Un colosse ne peut pas manger un colosse** tant que l'anti-chevauchement les
  tient à 187 px alors que la prise se joue à 178 : le Cachalot ne pouvait
  matériellement jamais attraper le Calamar Géant. La séparation est donc
  suspendue le temps de la charge, dans les deux sens.

### Espèces territoriales (`territory: <px>`)

La murène applique « un rocher = une murène » (GDD §12). Trois pièges rencontrés, dans l'ordre :
1. **La ponte est le vrai facteur d'entassement.** Espacer au spawn ne sert à rien si les larves naissent sur place : `Ecosystem.layEgg` fait donc **essaimer** l'œuf vers un territoire libre (`freeTerritory`), et renonce à la ponte s'il n'y en a plus.
2. Un placement « point le plus éloigné » les tasse toutes à une extrémité de la bande, hors de portée de leurs proies. Il faut viser une **répartition régulière** puis chercher en spirale une place libre.
3. Les contraintes doivent rester **atteignables** : `territory × effectif` ne peut pas dépasser le littoral disponible dans la bande, et exiger en plus une distance vis-à-vis de tout le décor vivant éteignait l'espèce. La distance au décor ne s'applique qu'à la génération du monde, pas à la ponte.

Pièges vérifiés (ne pas réintroduire) :
- Une proie hors de la bande de profondeur du prédateur est **inatteignable** : il la poursuit, sa contrainte verticale le rappelle, et il meurt de faim sans jamais manger. `nearestPreyFor` filtre donc par bande, et le rappel vertical est assoupli en chasse.
- Vitesse de chasse (`sprintSpeed || speed*1.8`) doit dépasser la fuite de la proie (`speed*2`).
- Concentrer plusieurs prédateurs sur une seule proie la fait s'effondrer, et tout ce qui en dépend avec elle.
- Le contrôle de colonne d'eau au spawn doit porter sur la position **finale**
  d'un individu, pas sur le point du groupe : les ±90 px du groupe plus les
  ±80 px de l'individu ramenaient les bancs sur le haut-fond, où ils se
  faisaient éjecter sur la plage (colonne minimale au spawn : 3 px → 119 px).
- **La barrière de rivage calculée sur la taille ne protège pas les petits.**
  `limiteLarge()` cherche le x où la colonne d'eau atteint `size * 2,2` : pour
  une sardine de 13 px, ça tombe dans **40 px d'eau**, c'est-à-dire le ressac.
  Poursuivies par le Fou Moustachu, la Sardine Bulle-fofolle et le Poisson
  Volant y finissaient plaquées dès les premières secondes de jeu. D'où
  **`offshore: <px>`** : une colonne d'eau minimale déclarée par l'espèce, lue
  par `limiteLarge()`, par le spawn (colonnes valides **et** position finale) et
  par la frayère `shallow` — sinon la migration de ponte les renvoie de l'autre
  côté de leur propre barrière. Barrière portée de x=1070 à x=2510.
- **La phase aérienne d'un sauteur (`jumps`) court-circuite TOUTES les
  contraintes horizontales** : elle sort de `move()` avant les barrières. Un
  poisson volant lancé par une fuite retombait donc littéralement sur le sable —
  le seul cas où une créature traverse la plage. Deux garde-fous : le saut n'est
  jamais **orienté** vers la côte quand on en est près, et la barrière de rivage
  est réappliquée **en vol**. Mesuré : **0 relevé sur le sable sec sur 53 730**
  (dont 2 239 en phase aérienne) sur 8,5 min.
- `sleeps: true` = **siestes à toute heure**, pas « dort ». C'est un gag réservé
  à la Baleine Gros Dodo et au Poisson-lune Zen. Le Dauphin Farceur et l'Orque
  Blagueuse l'avaient par erreur : des farceurs qui font la sieste en plein
  jour. Vérification en plein jour (`dayT` entre 0,10 et 0,40) : seules ces deux
  espèces dorment.
- Un `groupSize` de `[1,1]` condamne l'espèce : il faut au moins deux individus pour se reproduire.
- Un prédateur embusqué (`ambush`) doit avoir un **vrai cooldown** après son coup et n'attaquer que ce qui **passe** (`speedNow > 18`) : sinon une proie immobile à côté de lui le fait jaillir en boucle (la murène « ping-pong »).
- **`ambush.range` est la distance de JAILLISSEMENT, pas celle de détection.**
  Un embusqué mobile doit repérer bien plus loin que son coup de mâchoire, sinon
  il ne sait pas vers quoi ramper : `nearestPreyFor` lit donc `senseRange` en
  priorité. Le Poisson-Tapis, immobile (`fixed`) au fond des abysses, **ne
  mangeait jamais** et mourait de faim ; passé en `crawl` avec `senseRange: 950`,
  il se traîne vers sa proie (`_traque`) puis l'embusque — 16 prises en 12 min.
- **La reptation court-circuite le steering des boids.** Un rampant en parade
  (`court`) partait donc en amour… sans se déplacer d'un pixel vers l'autre :
  deux crabes ou deux Poisson-Tapis ne se rencontraient qu'au hasard des 195 px
  du voisinage, et les deux espèces s'éteignaient doucement. La branche `crawl`
  doit traiter explicitement `seekFood`, `_traque`/`hunt` **et** `court`.
- Un rampant doit rester sur la portion de fond correspondant à **sa** bande de
  profondeur (`Entity.bornesReptation`) : sinon le Poisson-Tapis, qui suit le
  sable, remonte tranquillement jusqu'au récif.
- Le **nuage de sable d'un raté** ne se justifie que près du fond : en pleine eau
  il apparaissait tout en bas de la colonne, sans rapport avec la scène (flagrant
  dans les abysses, où un calamar rate à 1500 px au-dessus du sable).

Audit rapide en console (`FF` = avance rapide sans rendu) — voir l'historique : instrumenter `Entity.prototype.die` révèle `wellFed: 0` sur un prédateur qui n'a jamais réussi à manger.
### La peur : qui voit venir qui

Audit fait en instrumentant `Ecosystem.eat` pour relever **l'état de la proie au
moment de la prise**. Verdict de départ : **14 %** des captures visaient une
proie qui n'avait rien vu. Quatre trous distincts, tous corrigés :

1. **Le jaillissement d'un embusqué n'était pas une menace.** `nearestPredatorOf`
   ne regardait que l'état `hunt` ; la murène et le Poisson-Tapis attaquent en
   `strike`. Leurs victimes se faisaient cueillir sans broncher.
2. **Un dormeur ne se réveillait jamais.** La branche `sleep` sort de `think`
   avant le test de fuite : requin et dauphin cueillaient des perroquets
   endormis. Il y a maintenant un **réveil en sursaut** (`scared`, puis fuite).
3. **Les charognards étaient exemptés** (`def.trophic !== 'scavenger'`). Le
   Poulpe Ninja, proie du Cachalot ET du Calamar Géant, ne prenait donc jamais
   peur — il n'échappait à quoi que ce soit que par son encre. L'exemption était
   de toute façon redondante : `nearestPredatorOf` ne renvoie une menace que si
   elle a vraiment l'espèce à son menu, donc le crabe n'a jamais rien à craindre.
4. **La distance d'alerte était fixe à 180 px.** Une orque de 70 px qui charge à
   340 px/s avalait cet écart en une demi-seconde, et un Cachalot lancé sur un
   Calamar Géant entrait en contact (178 px, les deux corps réunis) **avant** le
   seuil d'alerte : la proie ne *pouvait pas* avoir peur. `Ecosystem.alerteDe()`
   la calcule maintenant sur le gabarit et l'allure du chasseur.

Deux conséquences structurelles :

- La recherche passe par **`Ecosystem.chasseurs`**, liste plate des prédateurs en
  action reconstruite chaque frame — même raison que `colosses` : la grille ne
  porte qu'à ~195 px, très en deçà des distances d'alerte voulues.
- Un **embusqué garde sa surprise** (`alerteDe` lui rend `40 + size * 2,2`) : la
  victime sursaute et détale, mais tard. Comme deux modes d'échec se cumulaient
  alors — la proie esquive *et* `missChance` — la murène est morte de faim. Son
  `missChance` a été abaissé en compensation (0,35 → 0,22 ; Poisson-Tapis
  0,45 → 0,30) : le raté se raconte mieux ainsi, c'est la victime qui l'esquive
  plutôt que la murène qui vise mal.

Résultat mesuré sur 8 min : **2,9 % de proies prises sans avoir eu peur** (contre
14 %), et les rares cas restants sont des collisions d'ordonnancement — le
prédateur passe en chasse dans la frame même où il atteint sa cible.

Le seul cas *volontaire* de proie sereine est le halo du Poisson-lanterne : une
crevette hypnotisée est censée nager droit dans la gueule. Il est donc exclu du
décompte.

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

Piège rencontré : **un nuage se dessine en UN SEUL tracé.** Rempli bulle par
bulle, chaque recouvrement cumulait l'alpha et le nuage se lisait comme une
grappe de ronds soudés — flagrant en plein ciel.

### Sprites vectoriels (`js/sprites.js`)

Les silhouettes procédurales peuvent être remplacées par les dessins de
l'éditeur SVG. Une espèce déclare `sprite: '<nom>'` et le jeu charge
`Assets/<nom>.json`. Format consommé : `points` (ancres `center`, `nose`, `eye`,
`mouth`, `tail`), `shapes[]` (`points`, `fill`, `smooth`, `pivot`, `amp`) et
`tailBlend` (le x en deçà duquel les points appartiennent à la queue).

Quatre règles :

- **Le visage commun reste dessiné par-dessus.** C'est la règle du projet : la DA
  peut changer entièrement, les émotions restent celles de tout l'aquarium. La
  taille du visage est déduite de l'écart œil↔bouche voulu par l'auteur du
  sprite (`drawFace` place l'œil en 0,55 et la bouche en 0,82 fois sa taille,
  soit 0,404 entre les deux), puis **bornée** : un vrai requin a un œil
  minuscule, mais ici c'est le visage qui raconte.
- **Le dessin est mis à la largeur que la simulation lui suppose**
  (`size * 2 * spanRatio`), pas à une constante. Mis à `size * 2`, le requin
  sortait 22 % plus petit que la silhouette qu'il remplaçait (77 px mesurés
  contre 99) et paraissait rabougri à côté des autres.
- **Un calque écarté décale les indices.** `Sprites.preparer` filtre les formes
  trop pauvres pour être tracées ; sans table de correspondance, un appendice
  qui visait la forme 5 animait la 4. Même raison côté atelier :
  `decalerCalques()` répercute toute renumérotation sur ce qui vise les calques
  (appendices **et** `queueCalques`), au lieu des trois corrections à la main
  qui ne portaient que sur `layerIndex`.
- **Le chargement est asynchrone et ne bloque aucune frame** : tant que le
  fichier n'est pas là (ou s'il est illisible), la silhouette procédurale
  continue d'être dessinée.
- **La queue ondule, les nageoires pivotent.** Les points en deçà de `tailBlend`
  sont déviés en `u²` (le battement part du pédoncule caudal, pas du milieu du
  corps), et une forme qui porte un `pivot` tourne autour au lieu d'onduler.
  L'amplitude suit **l'effort** et pas seulement la fréquence : à l'amplitude
  nue de l'éditeur, le bout de la queue ne parcourait que 5,5 px sur une
  silhouette de 48.
- **Toute créature n'a pas une queue de poisson.** Trois ajouts génériques, nés
  du crabe et de la murène, tous réglables dans l'atelier :
  `sansQueue` (un crabe, une étoile, un coquillage n'ont rien à faire onduler —
  la valeur par défaut de `tailBlend` faisait tortiller un tiers du crabe) ;
  `tailOndes`, qui fait **courir** l'onde vers le bout au lieu de battre d'un
  seul tenant (murène, anguille : le corps entier est un tentacule) ;
  `queueCalques`, qui laisse une carapace **rigide** pendant que le reste ondule.
- **Un appendice n'est pas forcément une nageoire.** `fins[].type` vaut
  `nageoire` (rotation autour de l'ancre, pondérée par la distance) ou
  `tentacule` (**onde progressive** le long d'un axe : base fixe, bout qui
  parcourt toute l'amplitude). Une patte de crabe ou un bras de poulpe animés
  par une rotation sont raides, articulés sur une seule charnière.
  Chaque appendice a son `phase` et sa `vitesse` : sans eux les huit pattes d'un
  crabe battent **toutes ensemble**, ce qui se lit comme un tressaillement et
  pas comme une marche. Et `fins[].calques` en vise **plusieurs** — une patte
  dessinée en trois pièces bat alors d'un seul geste, sans déchirure au raccord.
  C'est ce que l'atelier appelle « aplatir » : les calques ne sont pas fondus
  (un corps et sa rayure n'ont pas la même couleur), ils forment un **bloc
  animé** qui se déplace, tourne et bat d'un seul tenant.
- **La fréquence de battement est bridée, et calée sur le gabarit.** Deux
  brides, toutes deux mesurées. Le relevé de départ sur 12 espèces montait à
  **13,4 rad/s** (période 0,47 s) et, pire, ne dépendait pas du tout de la
  taille : la Baleine Gros Dodo (190) battait à 12,6 rad/s de moyenne, autant
  qu'un thon lancé. La fréquence décroît maintenant en `(30 / size)^0,45` et
  passe par un plafond dur à 8,5 rad/s — `speedNow` est relevé **avant**
  écrêtage dans `Entity.move`, le rapport à la vitesse nominale montait à 4,5 et
  l'allure saturait en permanence. Mesuré après : gros_dodo 2,2 rad/s au
  maximum (période 2,9 s), cachalot 4,8, petits poissons 8,5 (0,74 s).

Contrôle non visuel : rendre la silhouette hors écran et mesurer l'emprise de
l'encre (`FishBody.draw` sur un canvas détaché), avec et sans `sprite`.

### Les colosses entre eux

Ils ignorent les collisions avec les petits poissons, **mais pas entre eux** :
deux baleines qui se traversent, ça se voit. Elles se repoussent, se cognent
(regard surpris + gerbe de bulles) et s'écartent **aussi en position**.

La vraie cause du chevauchement était ailleurs : `Ecosystem.neighbors` s'appuie
sur une grille de **130 px** dont il ne balaie que 3×3, soit ~195 px de portée,
alors que deux baleines doivent rester à **323 px**. Elles ne se voyaient donc
jamais. D'où `Ecosystem.colosses`, une **liste plate dédiée** (une dizaine
d'individus) balayée intégralement. La séparation est ensuite une contrainte
**dure** résolue en une frame (chacun s'écarte de la moitié du recouvrement,
et la vitesse d'approche est annulée) : amortie, elle ne tenait pas — la
migration vers la frayère les ramenait l'un sur l'autre plus vite qu'ils ne se
séparaient.

Enfin, il ne faut **pas annuler la vitesse d'approche** : une première version
le faisait, et deux colosses se retrouvaient bloqués nez à nez, chacun poussant
sans pouvoir contourner l'autre. La vitesse **glisse** le long du contact et
chacun s'écarte par un côté opposé (départagés par l'`id`), comme deux navires
qui se croisent.

Chevauchement visible des silhouettes : **0 sur 9088 relevés** sur 16 min,
contre 75 % de recouvrement au plus fort avant.

La contrainte suppose que le **rayon dessiné vaut à peu près `size`**. Une
silhouette qui déborde doit le déclarer (`spanRatio`, demi-emprise en multiples
de `size`) : le Calamar Géant, manteau d'un côté et tentacules de l'autre, tenait
la distance exacte (164 px pour 164 requis) tout en paraissant **superposé** à
son voisin. Le corriger, c'est **compacter la silhouette** *et* déclarer
`spanRatio` — pas seulement l'un des deux.

Contre l'échouage, le rappel par accélération ne suffisait pas non plus : un
colosse lancé passait au travers. Il a une **barrière dure** (`limiteLarge()` :
le x où la colonne d'eau atteint enfin son tirant) et une **garde au sol**
d'une demi-longueur. Mesuré : 0 franchissement sur 4402 relevés, collage au
sable 12 % → 4,3 %.

- `sprites.js` — chargement des dessins de l'éditeur SVG (`Assets/*.json`), consommés par `FishBody.drawSprite`. Une espèce qui déclare `sprite:` remplace sa silhouette procédurale, **jamais son visage**.
- `svgexport.js` / `svgimport.js` — les deux sens du pont : rejouer une silhouette procédurale dans un faux contexte 2D qui enregistre au lieu de peindre pour la sortir en SVG, et échantillonner un dessin vectoriel pour le faire entrer.
- `ANCHOR_TOOL.md` — spécification du « poseur d'ancrages », l'outil construit à part (Artifact autonome, hors dépôt) dont l'atelier reprend les capacités.
- `atelier.html` — **l'outil unique** (page à part, servie par le même serveur de dev) : importer, poser les ancres et les nageoires, calibrer le visage, prévisualiser avec le VRAI rendu du jeu, et **enregistrer directement dans `Assets/`**. Une espèce s'active par le manifeste `Assets/sprites.json`, sans toucher au code. **[SPRITES.md](SPRITES.md) est le contrat complet.**
- `background.js` — dégradé d'eau par profondeur, god rays, crêtes d'arrière-plan, rochers, végétation, cheminées volcaniques, plancton, jour/nuit.

### Décor posé au sol

Rochers, végétation et cheminées suivent le relief. Deux règles à respecter pour tout nouvel élément de décor :

- **Lire la hauteur à la position réellement affichée**, pas à la position d'origine : avec un décalage parallax, `px = x - Camera.x * layer` puis `World.floorY(px + Camera.x)`. Utiliser `World.floorY(x)` directement fait flotter l'élément au-dessus du sol.
- **S'incliner selon la pente** via `ctx.rotate(Math.atan(World.slopeAt(wx)))`, sinon l'élément paraît penché sur les fortes pentes.

Ordre de rendu : les **rochers avant le sable** (celui-ci recouvre leur base et les enfonce naturellement), la **végétation et les cheminées après** (elles poussent dessus).

Les **créatures** posées au sol suivent la même règle : `GROUND_RENDERS` (worm, crab, shell, star, anemone, eel) pivote avec `World.slopeAt`. Les espèces `flatGround` (ver-tapis) apparaissent en plus sur une **terrasse** — `World.init` aplanit des groupes de colonnes exprès, sinon une créature horizontale paraît posée de travers.

Les espèces peuvent réclamer un **habitat** (`habitat: 'rock' | 'weed'`) : elles apparaissent alors sur les positions de décor correspondantes (`Background.habitatSpots`) — étoiles sur les rochers, hippocampes dans les herbiers. Le décor est donc initialisé **avant** l'écosystème dans `Main.init`.

### Le retournement (`Entity.orientation`)

Un poisson qui change de sens **pivote** : `ctx.scale(flipX, 1)` avec `flipX`
animé de −1 à +1 (adouci en sinus, jamais exactement 0 — une matrice d'échelle
nulle est dégénérée). Le miroir instantané se lisait comme un défaut d'affichage.

**Attention, c'est ici que se rejoue « la baleine qui clignote ».** L'hystérésis
sur le seuil ne suffit pas : le `vx` d'un colosse traîne autour de zéro,
`_facing` rebascule avant la fin du demi-tour, et au lieu d'un clignotement à
peine visible on obtient une baleine qui **tourne sur place en continu**, coincée
de profil. Trois verrous, tous nécessaires :

1. seuil relevé pour les gros (`speed * 0,5` au-delà de `size` 45) ;
2. **un demi-tour commencé s'achève** — aucun nouveau sens tant que `_flipX`
   n'a pas rejoint `_facing` ;
3. le nouveau sens doit être **tenu** avant d'être validé, d'autant plus
   longtemps que l'animal est gros (`0,2 + size/90` s). `_faceAt` (viser
   quelqu'un : bisou, farce) court-circuite cette patience — c'est une
   intention, pas une dérive de vitesse.

Mesuré sur 45 s : baleine, cachalot, orque et calamar géant à **0 demi-tour/min**
(contre 0,4 à 2,7 avec le seuil nu), et moins de 1 % du temps de profil pour les
petites espèces.

Hors champ `draw` n'est pas appelé : au retour, la créature se **pose** dans son
sens courant plutôt que de faire un demi-tour fantôme.

### Les colosses (taille ≥ 70)

Baleine, cachalot, orque demandent des règles à part, apprises en corrigeant leurs bugs :
- Le sens de nage utilise une **hystérésis** (`_facing`, seuil `speed * 0.25`) et l'inclinaison est **bornée** (`maxTilt`) puis lissée : sinon la baleine clignote et part sur la tête.
- Ils **ignorent l'anti-chevauchement** dans les deux sens : se faire bousculer par des dizaines de petits poissons les faisait tourner sur eux-mêmes, et un `filterFeeder` doit pouvoir chevaucher le banc qu'il avale.
- Un **tirant d'eau** (`size * 2.2`) les repousse vers le large là où la colonne d'eau est trop basse : les baleines venaient s'échouer sur le haut-fond, attirées par leur frayère. Leur `depthBand` commence aussi sous l'eau claire (≥ 450) — un colosse en eau claire écrase toute la faune du récif.
- `breathes: true` (baleine, cachalot, dauphin, orque) : ce sont des mammifères. `Entity.breathe` gère l'apnée, la remontée (via `_diveTargetY`, prioritaire sur les autres cibles verticales) et le **panache** `Particles.blow`. La contrainte de profondeur s'assouplit pendant la remontée.
- La **Baleine Gros Dodo n'est pas un prédateur** : `grazes: true` sans `prey`. Elle filtre le plancton, elle ne mange personne.

## Performance (mesurée, pas supposée)

**[PERFORMANCE.md](PERFORMANCE.md) est l'audit complet** : méthode et ses
limites, chiffres par poste, cible mobile, le **chantier d'optimisation** (§5)
et son **bilan réalisé** (§7). Le chantier a été fait (sauf 5.14) : en
rastérisation logicielle à 2560×1440, le décor est passé de **18,9 à 9,2 ms**
(dégradés plein écran pré-rendus dans une bande 1 px étirée, contour du fond
échantillonné une fois) et la frame complète de 23 à 15 ms. Deux pièges à ne
pas réintroduire, mesurés : un **drawImage étiré avec alpha** coûte plus cher
que le dégradé qu'il remplace (15 ms — god rays et modelé restent en dégradés),
et une bande hors écran redessinée chaque frame doit être créée avec
**`willReadFrequently: true`**, sinon chaque drawImage force une relecture
GPU→CPU sur les machines en rendu logiciel. `Main.adaptResolution` baisse en
plus le dpr par paliers si la frame moyenne dépasse 40 ms (vieux PC, mobiles).

Deux corrections aux chiffres qui figuraient ici : le décor coûte **trois fois**
les créatures (trois `fillRect` plein écran en dégradé — un dégradé coûte 16 fois
un aplat), et l'ancienne mesure « décor 0,6 ms » ne comptait que l'émission des
commandes canvas, pas leur rastérisation.

Le rendu procédural n'est donc **pas** le goulot — passer à des sprites optimiserait la partie déjà la moins chère. Le coût est dans les recherches de voisinage. Utiliser systématiquement `Ecosystem.neighbors()` (grille spatiale) et `Ecosystem.bySpecies[id]` plutôt que de balayer `entities`.
- `input.js` — molette (vertical) / shift+molette + drag (bi-axial), clic = nourrir + splash/sable, clic maintenu = bulles, souris rapide = remous + fuite des petits.
- `main.js` — boucle, cycle jour/nuit (`Main.nightAmount()`), HUD (jauge de profondeur, zone, heure).

## Reste à faire (extension du GDD)

**[IDEES.md](IDEES.md)** rassemble tout ce qui n'est pas encore implémenté, en
sept sections : la **liste des 25 poissons manquants** (§1, la référence — les
idées des enfants, la liste de souhaits et les trous de la chaîne alimentaire y
sont fusionnés et dédoublonnés), les gags dans l'esprit **parc à thème** (§2),
les corrections sur l'existant (§3), la canne à pêche (§4), la couche
**économique** — acheter des poissons, être payé aux naissances, sanctionné aux
extinctions et aux espèces envahissantes (§5), le **roster des 27 espèces
codées** avec sa répartition par zone et par niveau trophique (§6), et les
contraintes à respecter en ajoutant une espèce (§7).

**[FICHES.md](FICHES.md)** en est le pendant espèce par espèce : une fiche par
créature (phrase, faux nom latin, action rigolote, nourriture, frayère, qui la
mange), ce qui est codé et ce qui ne l'est pas. Trois décisions générales y
sont arrêtées : la **phrase n'apparaît que dans la fiche d'identité** (jamais
en bulle), les **oiseaux frayent sur la plage** (frayère `beach`, la première
hors de l'eau), et **tous les piquants rendent malade** (`piquant: true` →
`Entity.malaise`), aux côtés du caca et du prout déjà codés.

- Migration verticale au crépuscule, événements aléatoires (§11 : bloom, mutant, hoquet, poisson malade)
- DA : l'utilisateur générera des sprites ; garder le système yeux/bouche commun (`FishBody.drawFace`) par-dessus
- Audio, mobile/touch à peaufiner, perf (spatial hashing — ~260 entités actuellement, boucles O(n²) dans les gags/boids)
- Piège dev connu : `requestAnimationFrame` est en pause quand l'onglet est caché (la sim se fige, `Main.time` n'avance pas)
- L'**écume appartient à l'eau** : elle court le long de `CONFIG.SURFACE_Y` en ondulant comme les vagues. Calée sur `World.floorY`, elle grimpait sur le sable sec.
- Attention en simulation accélérée : le helper `FF` de debug n'appelle que `Ecosystem.update`, donc `Food.update` ne tourne pas et les arêtes s'accumulent sans se dissoudre. C'est un artefact de mesure, pas un bug du jeu.
- La plage n'est pas un décor à part : c'est le fond sableux dont la profondeur devient négative près de x=0 (`world.js`), donc il émerge au-dessus de la ligne d'eau. Le relief vient de `CONFIG.PROFILE`, une liste de **points de contrôle** `[x, profondeur]` : plage douce jusqu'au rivage, puis **descente franche**. Un fond trop plat sous l'eau écrase toutes les espèces contre le sable — les poissons de strate moyenne n'avaient plus de hauteur d'eau où nager. `World.shoreX` (le x où le sable croise l'eau) est **déduit du profil** — s'en servir plutôt que d'une constante.
- Les terrasses (`World.init`) doivent rester **étroites** : lissées sur 3 colonnes de 400 px elles créaient des plateaux de 1200 px qui annulaient le profil.
- Le modelé du sable **suit le contour du fond** (traits épais superposés). Dessiné colonne par colonne, il laissait des rayures verticales.
