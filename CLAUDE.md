# Aquarium Vivant

Écosystème aquatique scrollable, contemplatif et comique. Le design complet est
dans `aquarium_vivant_game_design.docx` (24 espèces, chaîne alimentaire, scroll
bi-axial, cycle de vie, nourriture favorite).

## Stack

HTML5 pur : Canvas 2D, zéro dépendance, zéro build. Scripts classiques (pas de
modules ES). `js/boot.js` charge tous les fichiers avec `?v=<timestamp>` :
**c'est l'anti-cache** — ajouter un nouveau fichier js implique de l'ajouter à
la liste de `boot.js`, pas à `index.html`.

Lancer avec `python dev_server.py 8642` (config `.claude/launch.json`) — un
`http.server` qui envoie `Cache-Control: no-store`.

## Contrôles

Molette = zoom (centré curseur) · clic molette/droit = déplacer la vue · souris
au bord de l'écran = défilement · clic gauche = nourrir/bulles (jamais de
déplacement) · **double-clic sur une créature = la caméra la suit** (cerceau doré ;
double-clic dans le vide ou déplacement manuel pour la relâcher) · bouton 🔍 =
fiches d'identité au survol · bouton ❔ = légende.

## Architecture (js/)

- `config.js` — constantes monde, zones écologiques, types de nourriture. 1 m = 40 px, surface à y=300.
- `utils.js` — helpers math/couleur (`U`).
- `species.js` — **espèces 100 % data-driven**. Chaque fiche a un `name` rigolo **contenant la vraie espèce** ("Baleine Gros Dodo", "Poisson Confetti") et un `realName` affiché en sous-titre de la fiche d'identité. Ajouter une espèce = ajouter une entrée `SPECIES` (mouvement, bande de profondeur, proies, nourriture favorite, silhouette). **Roster complet : 24 espèces + anémones-refuges.** Flags génériques documentés en tête du fichier (`refuge`, `anchorToRefuge`, `ambush`, `aerial`, `jumps`, `stealthy`, `trickster`, `nocturnal`, `gag(e,dt,t)`).
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
sur tiges, coquillage entre ses valves). Le crabe et le coquillage dessinaient
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

Garde-fou : le total de bulles était monté à ~930/min et saturait l'écran. Cible tenue : **~250/min** pour tout l'aquarium. Ne jamais émettre une bulle à chaque frame d'une scène (`Math.random() < dt * k`) — l'émettre une fois au démarrage (`if (e._xxxT < dt * 2)`).

Les VFX sont throttlés par individu (`_vfxCd`) et les réactions de groupe (peur, régal) ne s'affichent que sur ~25 % des individus : sans ça un banc entier affiche vingt bulles d'un coup.
- `entity.js` — créature : boids contraints par type de liberté, faim, chasse avec ratés comiques (`missChance`), fuite, sommeil, cycle œuf→alevin→adulte→arête. **Reproduction (`tryMate`)** : deux adultes de la même espèce, tous deux `wellFed >= 1`, qui se croisent forment un couple (`_matingWith`) — ils **s'arrêtent, se font face et s'embrassent** (~1,6 s) avant que 1 à 3 œufs apparaissent selon leur forme. Seul celui dont l'`id` est le plus petit pond, sinon la portée est doublée. Manger ne pond jamais tout seul.
- `gags.js` — **toutes les mises en scène comiques**, une fonction par espèce, appelées via `def.gag`. Séparées de `species.js` pour que les fiches restent des données lisibles.
- `legend.js` — panneau HTML (bouton ❔) expliquant chaque bulle de BD et chaque expression. **À tenir à jour** quand on ajoute un gag ou une émotion.
- `idcard.js` — fiche d'identité au survol (régime, prédateurs, jauge de faim). « Mangé par » est **déduit** des tables `prey`, donc rien à ressaisir en ajoutant une espèce.
- `ecosystem.js` — spawn par groupes, prédation, ponte, **grille spatiale** (`neighbors()` — à utiliser pour toute recherche de voisinage, jamais une boucle sur `entities`), plafonds de population (`popCap`), report de prédation (`refugeFloor`), immigration.

## Équilibre de l'écosystème

Quatre mécanismes le rendent stable **sans réglage espèce par espèce**. Les toucher demande de revérifier une simulation longue.

1. **Plancton ambiant** (`World.planktonAt`) — toute espèce sans `prey` broute le niveau 1 de la chaîne. Le broutage plafonne la faim (jamais de mort de faim) mais ne rassasie pas complètement : nourrir reste utile, et la natalité naturelle est lente (GDD §9).
2. **Report de prédation** (`Ecosystem.refugeFloor`) — une espèce tombée sous ~22 % de son plafond n'est plus chassée, le temps qu'elle remonte. C'est ce qui empêche les extinctions en cascade.
3. **Recherche de partenaire** (`Entity.tryMate` + état `court`) — sans elle, les espèces rares ne se croisent jamais dans un monde de 8000 px. Les espèces `fixed` pondent en diffusion faute de voisin.
4. **Immigration** (`Ecosystem.immigration`) — filet de sécurité : une espèce localement éteinte revient du large. Le joueur ne peut pas perdre une espèce définitivement.
5. **Boom provoqué par le joueur** (`Ecosystem.boom` / `feedBoost`) — nourrir une espèce fait monter son plafond jusqu'au double. Les prédateurs se reportent alors sur elle (`nearestPreyFor` pondère par l'abondance), ce qui ramène tout à l'équilibre sans jamais punir le joueur (GDD §9). Le boom décroît vite : il faut nourrir **en continu** pour le maintenir.

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
- `sleeps: true` = **siestes à toute heure**, pas « dort ». C'est un gag réservé
  à la Baleine Gros Dodo et au Poisson-lune Zen. Le Dauphin Farceur et l'Orque
  Blagueuse l'avaient par erreur : des farceurs qui font la sieste en plein
  jour. Vérification en plein jour (`dayT` entre 0,10 et 0,40) : seules ces deux
  espèces dorment.
- Un `groupSize` de `[1,1]` condamne l'espèce : il faut au moins deux individus pour se reproduire.
- Un prédateur embusqué (`ambush`) doit avoir un **vrai cooldown** après son coup et n'attaquer que ce qui **passe** (`speedNow > 18`) : sinon une proie immobile à côté de lui le fait jaillir en boucle (la murène « ping-pong »).

Audit rapide en console (`FF` = avance rapide sans rendu) — voir l'historique : instrumenter `Entity.prototype.die` révèle `wellFed: 0` sur un prédateur qui n'a jamais réussi à manger.
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

Contre l'échouage, le rappel par accélération ne suffisait pas non plus : un
colosse lancé passait au travers. Il a une **barrière dure** (`limiteLarge()` :
le x où la colonne d'eau atteint enfin son tirant) et une **garde au sol**
d'une demi-longueur. Mesuré : 0 franchissement sur 4402 relevés, collage au
sable 12 % → 4,3 %.

- `background.js` — dégradé d'eau par profondeur, god rays, crêtes d'arrière-plan, rochers, végétation, cheminées volcaniques, plancton, jour/nuit.

### Décor posé au sol

Rochers, végétation et cheminées suivent le relief. Deux règles à respecter pour tout nouvel élément de décor :

- **Lire la hauteur à la position réellement affichée**, pas à la position d'origine : avec un décalage parallax, `px = x - Camera.x * layer` puis `World.floorY(px + Camera.x)`. Utiliser `World.floorY(x)` directement fait flotter l'élément au-dessus du sol.
- **S'incliner selon la pente** via `ctx.rotate(Math.atan(World.slopeAt(wx)))`, sinon l'élément paraît penché sur les fortes pentes.

Ordre de rendu : les **rochers avant le sable** (celui-ci recouvre leur base et les enfonce naturellement), la **végétation et les cheminées après** (elles poussent dessus).

Les **créatures** posées au sol suivent la même règle : `GROUND_RENDERS` (worm, crab, shell, star, anemone, eel) pivote avec `World.slopeAt`. Les espèces `flatGround` (ver-tapis) apparaissent en plus sur une **terrasse** — `World.init` aplanit des groupes de colonnes exprès, sinon une créature horizontale paraît posée de travers.

Les espèces peuvent réclamer un **habitat** (`habitat: 'rock' | 'weed'`) : elles apparaissent alors sur les positions de décor correspondantes (`Background.habitatSpots`) — étoiles sur les rochers, hippocampes dans les herbiers. Le décor est donc initialisé **avant** l'écosystème dans `Main.init`.

### Les colosses (taille ≥ 70)

Baleine, cachalot, orque demandent des règles à part, apprises en corrigeant leurs bugs :
- Le sens de nage utilise une **hystérésis** (`_facing`, seuil `speed * 0.25`) et l'inclinaison est **bornée** (`maxTilt`) puis lissée : sinon la baleine clignote et part sur la tête.
- Ils **ignorent l'anti-chevauchement** dans les deux sens : se faire bousculer par des dizaines de petits poissons les faisait tourner sur eux-mêmes, et un `filterFeeder` doit pouvoir chevaucher le banc qu'il avale.
- Un **tirant d'eau** (`size * 2.2`) les repousse vers le large là où la colonne d'eau est trop basse : les baleines venaient s'échouer sur le haut-fond, attirées par leur frayère. Leur `depthBand` commence aussi sous l'eau claire (≥ 450) — un colosse en eau claire écrase toute la faune du récif.
- `breathes: true` (baleine, cachalot, dauphin, orque) : ce sont des mammifères. `Entity.breathe` gère l'apnée, la remontée (via `_diveTargetY`, prioritaire sur les autres cibles verticales) et le **panache** `Particles.blow`. La contrainte de profondeur s'assouplit pendant la remontée.
- La **Baleine Gros Dodo n'est pas un prédateur** : `grazes: true` sans `prey`. Elle filtre le plancton, elle ne mange personne.

## Performance (mesurée, pas supposée)

À ~380 créatures : **dessin des créatures 0,7–1 ms, décor 0,6 ms, simulation 3,6 ms** par frame (budget 60 fps = 16,7 ms).

Le rendu procédural n'est donc **pas** le goulot — passer à des sprites optimiserait la partie déjà la moins chère. Le coût est dans les recherches de voisinage. Utiliser systématiquement `Ecosystem.neighbors()` (grille spatiale) et `Ecosystem.bySpecies[id]` plutôt que de balayer `entities`.
- `input.js` — molette (vertical) / shift+molette + drag (bi-axial), clic = nourrir + splash/sable, clic maintenu = bulles, souris rapide = remous + fuite des petits.
- `main.js` — boucle, cycle jour/nuit (`Main.nightAmount()`), HUD (jauge de profondeur, zone, heure).

## Reste à faire (extension du GDD)

- Migration verticale au crépuscule, événements aléatoires (§11 : bloom, mutant, hoquet, poisson malade)
- DA : l'utilisateur générera des sprites ; garder le système yeux/bouche commun (`FishBody.drawFace`) par-dessus
- Audio, mobile/touch à peaufiner, perf (spatial hashing — ~260 entités actuellement, boucles O(n²) dans les gags/boids)
- Piège dev connu : `requestAnimationFrame` est en pause quand l'onglet est caché (la sim se fige, `Main.time` n'avance pas)
- L'**écume appartient à l'eau** : elle court le long de `CONFIG.SURFACE_Y` en ondulant comme les vagues. Calée sur `World.floorY`, elle grimpait sur le sable sec.
- Attention en simulation accélérée : le helper `FF` de debug n'appelle que `Ecosystem.update`, donc `Food.update` ne tourne pas et les arêtes s'accumulent sans se dissoudre. C'est un artefact de mesure, pas un bug du jeu.
- La plage n'est pas un décor à part : c'est le fond sableux dont la profondeur devient négative près de x=0 (`world.js`), donc il émerge au-dessus de la ligne d'eau. Le relief vient de `CONFIG.PROFILE`, une liste de **points de contrôle** `[x, profondeur]` : plage douce jusqu'au rivage, puis **descente franche**. Un fond trop plat sous l'eau écrase toutes les espèces contre le sable — les poissons de strate moyenne n'avaient plus de hauteur d'eau où nager. `World.shoreX` (le x où le sable croise l'eau) est **déduit du profil** — s'en servir plutôt que d'une constante.
- Les terrasses (`World.init`) doivent rester **étroites** : lissées sur 3 colonnes de 400 px elles créaient des plateaux de 1200 px qui annulaient le profil.
- Le modelé du sable **suit le contour du fond** (traits épais superposés). Dessiné colonne par colonne, il laissait des rayures verticales.
