# Aquarium Vivant

Écosystème aquatique scrollable, contemplatif et comique. Le design complet est
dans `aquarium_vivant_game_design.docx` (chaîne alimentaire, scroll bi-axial,
cycle de vie, nourriture favorite). Le roster en compte aujourd'hui **51**, le
GDD en décrivait 24 et la planche de design **30** (`Assets/Concepts/Design
Final.png`, découpée en repères par `decoupe_planche.py`).

## Stack

HTML5 pur : Canvas 2D, zéro dépendance, zéro build. Scripts classiques (pas de
modules ES). `js/boot.js` charge tous les fichiers **dans l'ordre de sa liste**
— ajouter un fichier js implique de l'ajouter là, pas à `index.html`. C'est la
seule source de vérité de cette liste : `build.py` la lit plutôt que de la
recopier.

`?v=<timestamp>` est **l'anti-cache, et seulement en local** : il garantit qu'un
F5 après modification recharge vraiment le code. En ligne, ce même timestamp
change à chaque visite — 546 ko de JS retéléchargés à chaque fois, jamais rien
en cache. Hors localhost, `boot.js` charge donc l'URL nue et laisse l'ETag du
serveur faire son travail.

Piège de lecture au passage : `s.async = false` ne sérialise que
l'**exécution**. Les 20 fichiers se téléchargent en parallèle — le coût en ligne
n'est pas 20 allers-retours, mais un seul de plus (le navigateur ne découvre la
liste qu'après avoir exécuté `boot.js`). Ce n'est pas ce qui justifierait un
bundler dans le flux de dev.

## Déploiement

Le jeu est une **page statique** : aucun backend, aucun appel réseau sortant,
aucune dépendance. Le socle exigé par le code est ES2020 (`??`), Pointer Events,
`fetch`, `localStorage` et Canvas 2D — soit **Chrome/Edge 80+, Firefox 74+,
Safari 13.1+**. Deux choses dégradent proprement : `willReadFrequently` (ignoré
s'il est inconnu) et le `ctx.filter` du Crabe Disco. `roundRect` est
réimplémenté en `arcTo`, donc il n'impose rien.

`python build.py` prépare `dist/`, à téléverser tel quel sur n'importe quel
hébergeur statique. Trois choses qu'il règle, et qu'il ne faut pas défaire :

- **Le cache.** Les 20 scripts deviennent un `aquarium.<empreinte>.js`
  (546 ko, 175 ko gzippés) que l'hébergeur peut servir en `immutable`. L'empreinte
  est un hash du contenu : une nouvelle version change de nom et s'impose d'elle-
  même, il n'y a **aucun numéro de version à penser à incrémenter**. C'est
  précisément le piège qu'on évite en ne mettant pas une constante `VERSION`
  dans `boot.js`.
- **Ce qu'on publie.** Le dépôt pèse 23 Mo, le jeu 623 ko. Planches de concept,
  repères de découpe, atelier, serveur de dev et documentation sont de
  l'**outillage** et restent à terre. Les dessins expédiés sont ceux que
  `Sprites.init` lit vraiment — le manifeste **plus** les `sprite:` déclarés dans
  les fiches d'espèce, jamais tout `Assets/*.json` (les autres sont des dessins
  en cours).
- **La concaténation est sûre**, et il faut qu'elle le reste : aucun fichier
  n'est emballé dans une IIFE, tous partagent déjà la même portée globale et
  aucun identifiant top-level n'est en double. Les envelopper cacherait `Main`,
  `Camera` & Cie, dont la console de debug et `atelier.html` se servent.

Le mode normal produit aussi la **PWA** : `manifest.json`, trois icônes
générées par `build.py` lui-même (PNG écrit en pur stdlib — zéro dépendance,
même pour ça) et un service worker de pré-cache. Le jeu s'installe sur l'écran
d'accueil, tourne en plein écran et hors ligne. La motivation première est
**iOS, qui efface le localStorage des sites non visités depuis 7 jours** : une
PWA installée en est exemptée, et c'est toute la sauvegarde du joueur qui en
dépend. Le service worker n'existe **qu'au déploiement** — en dev il serait un
anti-cache inversé, servant du vieux code avec entêtement. À savoir : le
panneau d'aperçu intégré ne sait pas enregistrer un service worker (« unknown
error fetching the script ») — le vérifier dans un vrai navigateur, pas là.

`python build.py --inline` produit à la place **un seul fichier**
`dist/index.html` (623 ko, 215 ko gzippés) qui s'ouvre d'un double-clic. Les
dessins y sont **embarqués** (`Sprites.PRECHARGE`, lu par `Sprites.init` avant
tout `fetch`) : sans ça, `file://` bloque `fetch` par CORS et le fichier perdrait
tous ses sprites **en silence**, en rendant des silhouettes procédurales.
Vérifié : un seul GET, zéro requête vers `Assets/`.

Rien de tout cela n'entre dans le flux de dev — `build.py` ne sert qu'au
déploiement, et `index.html`, `boot.js` et l'atelier fonctionnent comme avant.

Lancer avec `python dev_server.py 8642` (config `.claude/launch.json`) — un
`http.server` multi-thread qui envoie `Cache-Control: no-store`, et qui expose en
plus deux routes d'écriture dans `Assets/` pour l'atelier des créatures
(cf. [SPRITES.md](SPRITES.md) §2). Le port peut venir de la variable `PORT`
(plusieurs sessions sur le même dépôt : à port fixe, la seconde ne démarre pas),
et `--accueil atelier.html` met l'atelier à la racine — **un panneau d'aperçu ne
sait ouvrir qu'une origine, jamais un chemin**, donc c'est la seule façon qu'il
affiche autre chose que le jeu.

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
- `species.js` — **espèces 100 % data-driven**. Chaque fiche a un `name` rigolo **contenant la vraie espèce** ("Baleine Gros Dodo", "Poisson Confetti") et un `realName` affiché en sous-titre de la fiche d'identité. Ajouter une espèce = ajouter une entrée `SPECIES` (mouvement, bande de profondeur, proies, nourriture favorite, silhouette). **Roster complet : 51 espèces** — la liste et le détail de chacune sont dans
**[FICHES.md](FICHES.md)**, qui fait autorité. Chaque fiche porte aussi une **`phrase`** et un **faux nom `latin`**, affichés uniquement dans la fiche d'identité (bloc `FICHES` en fin de fichier, séparé pour que les données de simulation restent lisibles). Flags génériques documentés en tête du fichier (`refuge`, `anchorToRefuge`, `ambush`, `lure`, `ink`, `aerial`, `jumps`, `stealthy`, `trickster`, `nocturnal`, `sizeVar`, `spanRatio`, `offshore`, `piquant`, `gonflable`, `snatch`, `shock`, `pouch`, `intouchable`, `perceBallon`, `plongeur`, `eatsPoop`, `gag(e,dt,t)`).
- `world.js` — triangle de profondeur en grille "profondeur max par colonne" (reco GDD §14), zones, fond sableux.
- `camera.js` — scroll bi-axial borné par le triangle (impossible d'atteindre les abysses près de la plage).
- `particles.js` — socle feedback réutilisable : splash, nuage de sable, bulles, sillage, **bulles d'action comiques** (`Particles.comic/hearts/stars`).
- `food.js` — graines (4 types dont favoris), arêtes des morts (charogne) et **cacas** (`Food.poops`). Le caca ressemble assez à une grosse graine pour qu'un poisson affamé s'y trompe — et il le paye (`Entity.malaise`).
- `fishbody.js` — rendu cartoon procédural. **Système yeux/SOURCILS/bouche commun** partagé par toutes les silhouettes.

### Émotions

`FishBody.EMOTIONS` est une table de paramètres (ouverture d'œil, pupille, regard, paupière, **angle et hauteur du sourcil**, bouche, rougeur) : idle, happy, love, eating, sleeping, dizzy, scared, blush, angry, proud, ashamed. Ajouter une émotion = ajouter une ligne.

**Ce que la bouche EXPRIME est séparé de ce à quoi elle RESSEMBLE.** Les
émotions restent communes à tout l'aquarium ; la forme de la bouche est un
réglage d'espèce ou de dessin (`boucheStyle` : `standard`, `grande`, `petite`,
`gueule` à dents, `bec`, `ventouse`, table `FishBody.BOUCHES`). Tout le monde
avait la même petite bouche de dessin animé, becs d'oiseau et gueules de requin
compris. Le partage tient grâce à `FishBody.GESTE`, qui réduit chacune des
quatorze bouches du catalogue à **deux nombres** — combien elle est ouverte, si
elle sourit ou boude : c'est avec ça qu'un bec joue les dix-huit émotions sans
qu'on le redessine dix-huit fois.

De même, ce que le visage **peint** passait par trois couleurs en dur (encre
`#1c2733`, gorge, langue). `FishBody.VISAGE` est une palette **surchargeable
partiellement** — trait, sourcil, pupille, blanc de l'œil, gorge, langue, lèvres,
dents, bec, joue — déclarée sur la fiche d'espèce (`def.visage`) ou sur le
dessin (`visage`, réglé dans l'atelier), le dessin l'emportant. Le visage étant
dessiné **par-dessus** le corps, repeindre le corps ne changeait rien : c'était
la seule prise possible sur une pupille dorée ou un bec orange.

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

### La fréquence d'un gag, c'est son cooldown DIVISÉ PAR L'EFFECTIF

Aucun cooldown du roster n'avait été réglé sur le nombre d'individus de
l'espèce, et l'écart mesuré entre le gag le plus fréquent et le plus rare
atteignait **cent fois** : le Fugu se gonflait toutes les 6,5 s (3 individus),
le Dauphin faisait « BOUH ! » toutes les 3,4 s quelque part dans l'aquarium
(9 individus), pendant que le Requin perdait une dent toutes les 11 minutes.

`Ecosystem.cadence(e, parMinute)` déclare la fréquence voulue **pour tout
l'aquarium** et en déduit le cooldown d'un individu, avec sa dispersion (sans
elle, un groupe né ensemble joue sa scène en chœur). C'est ce qu'il faut
utiliser pour tout nouveau gag périodique, plutôt qu'un `U.rand(a, b)` en dur.

### Une réaction ne se déclenche que sur quelqu'un qui PASSE

`Entity.passe(o)` — ni décor (`refuge`, `movement: 'fixed'`), ni immobile
(`speedNow > 12`). **Un voisin qui ne peut pas partir est un voisin permanent**,
donc toute réaction déclenchée par sa seule présence tourne en boucle sur la
même victime, indéfiniment. Mesuré avant : la Rascasse piquait le Corail
29 fois/min et l'Anémone 24 fois/min — le récif était vert de dégoût en
permanence — et l'Anguille assommait **112 créatures de fond par minute**
(coquillages, oursins, étoiles, concombres), toutes sonnées 4 à 7 % du temps.
Après : ces piqûres ont disparu et le fond est sonné **0 à 2 %** du temps.

L'Anémone et le Clown appliquaient déjà la règle pour choisir qui câliner ;
elle vaut pour `piquer()`, `decharge()` et tout ce qui viendra. Le cooldown par
victime est passé de 4 à 12 s dans la foulée, et le gonflement d'un piquant ne
répond qu'à quelque chose d'**au moins 1,6 fois sa taille** : c'est un
avertissement adressé à une menace, pas une respiration (2 % du temps gonflé
contre un gonflement toutes les 6,5 s).

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

**Ce ne sont PAS les bulles de BD qui coûtent, ce sont les particules.**
Audit du 5 septembre 2026, 18 min de simulation instrumentée : les bulles au
sens strict tenaient déjà la cible (~285/min pour `comic` + `shout`), mais le
jeu créait **35 700 particules par minute**. Trois postes en faisaient les deux
tiers, aucun n'était un gag :

| Poste | Avant | Après | Ce que c'était |
|---|---|---|---|
| `Entity.breathe` | 4 357/min | ~1 300 | trois cadences de bulles pour 15 cétacés |
| `GAGS.bulle_fofolle` | 5 550/min | ~1 400 | 3,5 bulles/s **par sardine** |
| branche `sleep` (ZzZ) | 3 864/min | 402 | un « z » par dormeur, et l'aquarium dort à 46 % |
| sable au contact du fond | 953/min | ~190 | émis à **chaque frame** passée contre le sable |
| sillage de chasse | 1 179/min | ~450 | idem, sans garde |
| `GAGS.anguille` (étincelles) | 632/min | ~180 | 9 étincelles/s pour un préavis d'une seconde |
| `tryMate` (le baiser) | 390/min | ~40 | `Math.random() < dt*3` **à chaque frame** |
| `emoteVFX('love')` | 237/min | ~50 | la parade est un événement de GROUPE |

Total vérifié après correction, sur 10 min de simulation :
**15 456 particules créées par minute contre 35 736, soit −57 %** — bulles
8 075 → 2 866 (−64 %), gerbes 2 164 → 898 (−59 %), ZzZ −90 %, cœurs −72 %,
étincelles −68 %, nuages de sable −72 %.

Le nombre de **bulles de BD**, lui, n'a presque pas bougé (534 → 514/min) — et
c'est le vrai enseignement : **il était déjà à peu près à la cible.** Ce qui
saturait la machine n'était pas ce qui parle, c'était ce qui scintille.

Quatre règles générales en sont sorties, à respecter pour tout nouvel effet :

- **La méthode d'audit reste la même** : compter par **ligne d'appel**, en
  enveloppant `Particles.*` et en lisant `new Error().stack`. Compter par espèce
  ne suffit pas — 63 % des bulles partaient du moteur, pas des gags.
- **`Entity.VFX_GROUPE`** remplace le test en dur de `emoteVFX` : une table
  `expression → part des individus qui montrent l'effet` (`scared`, `eating`,
  `dizzy`, `love` à 10–22 %). Ajouter une ligne là plutôt qu'un `Math.random()`
  chez l'appelant — c'est le seul endroit où l'on voit le budget d'un coup.
  L'**expression n'est jamais filtrée** : c'est le visage qui raconte.
- **Ne jamais émettre à chaque frame d'une scène** (`Math.random() < dt * k`) :
  une fois au démarrage (`if (e._xxxT < dt * 2)`). Le baiser de `tryMate`
  enfreignait la règle que le projet s'était donnée.
- **Un effet infligé à une foule se borne en nombre.** Une décharge d'Anguille
  lâchée dans un essaim de krill en assommait vingt d'un coup ; elle est bornée
  aux **huit plus proches** et la gerbe de `assomme` suit le drapeau `vfx`.

Les VFX restent throttlés par individu (`_vfxCd`).
- `entity.js` — créature : boids contraints par type de liberté, faim, chasse avec ratés comiques (`missChance`), fuite, sommeil, cycle œuf→alevin→adulte→arête. **Reproduction (`tryMate`)** : deux adultes de la même espèce, tous deux `wellFed >= 1`, qui se croisent forment un couple (`_matingWith`) — ils **s'arrêtent, se font face et s'embrassent** (~1,6 s) avant que 1 à 3 œufs apparaissent selon leur forme. Seul celui dont l'`id` est le plus petit pond, sinon la portée est doublée. Manger ne pond jamais tout seul.
- `gags.js` — **toutes les mises en scène comiques**, une fonction par espèce, appelées via `def.gag`. Séparées de `species.js` pour que les fiches restent des données lisibles.
  Quatre scènes ne se déclenchaient **jamais** avant l'audit du 5 septembre 2026,
  et leur correction dit chaque fois la même chose — il ne manquait pas un
  réglage, il manquait une **intention** :
  - **Requin Dents-Molles ↔ Poisson Dentiste** : 249 soins et 9 pertes de dent
    en 18 min, zéro intersection. Le requin **va maintenant chercher** son
    dentiste (`_figX` vers le plus proche, comme on migre vers une frayère), le
    dentiste repère un édenté à 420 px au lieu de 200 (`neighbors` ne porte qu'à
    ~195 px, même limite que pour les colosses), une dent tombe à **chaque**
    prise et l'édentement dure assez pour faire le trajet. Le patient porte une
    marque (`_soigneur`) pour que deux dentistes ne se le disputent pas.
  - **Poisson-lune Bada-boum** : il ne coulait pas assez vite, et sa bande de
    profondeur le retenait au-dessus du sable. `_coule` lève le rappel de bande
    vers le bas, exactement comme `_surfacing` le lève vers le haut.
  - **Pélican et Fou Moustachu** : ils dormaient 53 % et 45 % du temps alors que
    leur gag ne se joue que sur une chasse. Les **aériens ne suivent plus le
    sommeil de nuit** des poissons.
  - **Espadon Voilier** : il avait 460 px/s de sprint et ne s'en servait que sur
    trente pixels de chasse. Son **grand run** est une scène en trois temps
    (montée au large → ligne droite plein gaz à ras de la surface → il lève le
    pied, très fier). Deux mécanismes génériques ont servi : `_figSpeed`, pour
    qu'une scène demande SA vitesse plutôt que le plafond de 1,6× des figures de
    banc, et `_diveTargetY` pour le tenir à ras de l'eau — la cible de steering
    est presque horizontale sur 2 400 px et ne suffit pas (mesuré : 196 px sous
    la surface sans elle, 91 avec, pour 80 visés).
- `legend.js` — panneau HTML (bouton ❔) expliquant chaque bulle de BD et chaque expression. **À tenir à jour** quand on ajoute un gag ou une émotion.
- `idcard.js` — fiche d'identité au survol (régime, prédateurs, jauge de faim). « Mangé par » est **déduit** des tables `prey`, donc rien à ressaisir en ajoutant une espèce.
- `ecosystem.js` — spawn par groupes, prédation, ponte, **grille spatiale** (`neighbors()` — à utiliser pour toute recherche de voisinage, jamais une boucle sur `entities`), plafonds de population (`popCap`), report de prédation (`refugeFloor`), immigration.

## Équilibre de l'écosystème

Six mécanismes le rendent stable **sans réglage espèce par espèce**. Les toucher demande de revérifier une simulation longue.

**Audit du 4 septembre 2026** — avant correction, l'aquarium s'effondrait par le haut : Orque **éteinte**, Requin à 1, Thon 22→2, Perroquet 19→2, Méduse 35→4 en 18 min, et **11 des 22 liens trophiques déclarés n'avaient jamais servi une seule fois**. Après les correctifs 1, 2 et 3 : **zéro espèce éteinte**, 20 liens sur 23 actifs, et **plus aucune mort de faim** en dehors du Fou Moustachu. La méthode : instrumenter `Entity.prototype.die` (cause de mort) et `Ecosystem.eat` (qui mange qui), puis faire tourner `Ecosystem.update` sans rendu — en appelant **aussi** `Food.update` et `Particles.update`, sinon arêtes et sable s'accumulent (artefact de mesure, pas un bug du jeu).

1. **Plancton ambiant** (`World.planktonAt`) — broutent le niveau 1 de la chaîne : toute espèce sans `prey`, **tout prédateur qui n'a qu'UNE seule espèce à son menu** (il n'a aucune marge si elle se raréfie — le Thon passait de 20 à 2 en 18 min), **et tout EMBUSQUÉ IMMOBILE** : il ne peut pas aller chercher son repas, il dépend entièrement de ce qui veut bien passer devant son caillou. La Rascasse Épineuse (`fixed`, deux proies pourtant) mourait de faim à **5 exemplaires sur 6 en 10 min**. Le broutage plafonne la faim (jamais de mort de faim) mais ne rassasie pas complètement : nourrir reste utile, et la natalité naturelle est lente (GDD §9).
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

### La prédation se règle par le NOMBRE, pas par la difficulté

Le banc de Confetti se faisait massacrer — 34 prises par les seuls thons en
3 min. Trois leviers essayés, dans l'ordre d'efficacité réelle :

1. **Le peuplement initial**, de loin le plus gros. `spawnGroups(id, n)` crée
   `n × groupSize` individus **sans regarder `popCap`** : on démarrait à 23 thons
   pour un plafond de 12, soit trois minutes de massacre avant que la population
   redescende — et c'est précisément ce que le joueur voit en arrivant.
2. **Le plafond du prédateur** (20 → 12 pour le Thon).
3. **Le `missChance`**, le plus faible des trois : passer de 0 à 0,35 n'a retiré
   que 14 % des prises.

Deux mécaniques génériques en sont sorties :

- **La traversée** — après une prise, le chasseur poursuit sur sa lancée et
  ressort de l'autre côté du banc avant de rechasser (`_traverse`, 4 à 9 s).
  C'est ce que fait un vrai prédateur de banc, et ça empêche de rester planté
  dedans à enchaîner les bouchées.
- **On ne mange que ses proies déclarées.** L'état `hunt` sert aussi à FONCER
  sur quelqu'un sans vouloir le manger : le Poisson Police se ruait sur les
  pétomanes pour les gronder… et les avalait (6 poissons-clowns en 3 min).

### Les deux barres du HUD sont la MÊME barre

Le HUD le disait déjà en mots — « Grand large · Eau claire · 34 m », la position
se lit dans les deux sens — mais il ne le montrait pas : à gauche quatre
segments nommés, à droite un simple filet gris avec une pastille. Impossible de
savoir qu'on était dans la *zone trouble* sans lire le texte.

Les deux barres partagent donc **leur constructeur, leur mise à jour et leur
CSS** (`Main.construireBarre` / `Main.majBarre`, classe `.hud-bar` et son
modificateur `.vertical`) : la seule différence est l'axe. Deux barres écrites
séparément divergent au premier réglage.

- **Chacune a sa source de vérité dans `world.js`** : `bandesX()` pour les zones
  horizontales, `bandesY()` pour les bandes de profondeur, même forme. Rien
  n'est écrit en dur — si `CONFIG.PROFILE` ou `CONFIG.ZONES` change, les barres
  suivent.
- **L'air y figure**, au même titre que la plage horizontalement : c'est la part
  du monde qui n'est pas de l'eau, et le centre de la vue peut y monter. La
  dernière zone de `CONFIG.ZONES` est déclarée à 99999 (c'est un test
  d'appartenance, pas une borne d'affichage) : `bandesY()` la ramène à
  `DEPTH_MAX`, sinon les grands fonds écrasent toute la barre.
- **Le texte tourne avec la barre** (`writing-mode: vertical-rl`) : à 22 px de
  large, « Zone trouble » ne tient pas à l'horizontale, et élargir la barre
  mangerait l'aquarium.
- **Le curseur se place dans le segment RÉEL**, jamais à la proportion
  théorique. Les segments trop petits pour leur libellé sont élargis par la CSS
  (`min-width` / `min-height: max-content`) — le Rivage ne fait que 7 % du monde,
  la Surface 3,5 % de la profondeur — et un curseur calculé sur la taille du
  monde se retrouverait à côté.

Piège de vérification : **un panneau d'aperçu masqué gèle les transitions CSS**
en même temps que `requestAnimationFrame`. Un test qui mesure la position du
curseur juste après l'avoir posée le trouve immobile et conclut à tort que rien
ne bouge. Mesurer avec `transition: none`, ou après avoir remis l'onglet au
premier plan.

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

### `speedNow` est un EFFORT, pas une vitesse

`Entity.move` relève `speedNow` **avant** l'écrêtage par `maxSpeed` : il monte
jusqu'à 4,5 fois la vitesse nominale. S'en servir pour cadencer une animation
fait battre tout le monde à fond en permanence — l'Anguille se tortillait
frénétiquement alors qu'elle avance à 34 px/s, et c'est ce qui la faisait
paraître « beaucoup trop rapide » alors que son déplacement était correct.

Deux helpers pour ça, à utiliser partout : **`FishBody.allure(e)`** (0 arrêté,
1 vitesse de croisière, 2 sprint), qui lit la vitesse VRAIE, et
**`FishBody.battement(e)`**, qui en tire une fréquence bornée et pondérée par le
gabarit — un gros animal bat lentement, c'est la première chose qu'on lit dans
une nage.

### Une fréquence variable s'INTÈGRE — jamais `sin(t * f)`

C'est la vraie cause du tortillement de l'Anguille, et elle survivait à la
correction de sa fréquence. **`f` dépend de la vitesse, donc elle change à chaque
frame** ; or dans `t · f`, une variation Δf déplace la phase de `t · Δf`. Après
dix minutes de jeu (t = 600), un frémissement de vitesse fait sauter l'animation
de plusieurs tours **entre deux frames**. Ça ne se lit pas comme une fréquence,
ça se lit comme du bruit.

Mesuré sur l'Anguille, en avance de phase par seconde :

| | à t = 30 s | à t = 600 s |
|---|---:|---:|
| `sin(t * f)` | 3,2 tours/s | **79,8 tours/s** |
| phase intégrée | 0,67 tours/s | 0,57 tours/s |

D'où **`FishBody.phaseNage(e, f, t)`**, qui accumule `f · dt` et rend un angle.
Les rapports de fréquence CONSTANTS (une nageoire qui bat à 0,7 fois la queue)
peuvent la multiplier sans danger — c'est la variation de `f` qui casse, pas son
échelle. Trois appelants : le ruban de l'Anguille, la queue des sprites vectoriels
et le battement des nageoires.

Corollaire à retenir : **plus la partie dure, plus l'artefact est violent**. Il
est invisible en test court et flagrant après dix minutes, donc il faut le
chercher en avançant l'horloge, pas en regardant une seconde de jeu.

### LA CADENCE DE L'AQUARIUM : peu de gags, et rares

Relevé du 6 septembre 2026 : **160 déclenchements de scène par minute** pour
tout l'aquarium, soit près de trois par seconde. Le joueur ne contemplait plus
rien, il assistait à un feu d'artifice — BOUH, prout, vroum, éclair, poof, sans
interruption.

**La référence est Theme Park** : le public y exprime des émotions en
permanence — des visages, des petites réactions — mais les ÉVÉNEMENTS y sont
rares. D'où la règle : **ce qui foisonne doit être SILENCIEUX** (le visage, les
sourcils, le regard qui suit le curseur, le tangage, le clignotement, le
gonflement d'avertissement) ; **ce qui claque doit être RARE**, pour qu'on ait
le plaisir de le surprendre.

`GAGS.CADENCE` (en tête de `gags.js`) est la table unique des fréquences, en
déclenchements par minute **pour tout l'aquarium** — `Ecosystem.cadence` fait la
division par l'effectif. Trois régimes :

| Régime | Cible | Ce que c'est |
|---|---|---|
| **bruyant** | 0,3 – 0,5 /min | il y a un cri, une détonation, un éclair. Une fois toutes les deux à trois minutes quelque part. |
| **scène** | 0,8 – 1,2 /min | visible mais silencieux : une pose, une danse, une disparition, un câlin. |
| **vivant** | 2 – 4 /min | vie de fond discrète : une perle qui brille, un duo qui se reforme. |

Mesuré après : **160 → 27 déclenchements/min**. Le « BOUH ! » du Dauphin passe
de un toutes les 3,4 secondes à un toutes les trois minutes.

Deux mécaniques ne sont pas des gags et se règlent ailleurs, mais suivent la
même règle :

- **La décharge de l'Anguille** partait 25 fois par minute — l'événement le plus
  bruyant du jeu, devenu un bruit de fond. Son cooldown se calcule maintenant
  sur l'effectif (`Ecosystem.cadence`), `shock.cooldown` n'étant plus qu'un
  plancher.
- **Le gonflement du Fugu** est un AVERTISSEMENT : répété toutes les quinze
  secondes, il n'en est plus un. Un délai (`_gonfleCd`) l'empêche de re-gonfler
  aussitôt.

Ce qui est piloté par la simulation — embuscades, sauts, mastication, poursuite
— n'a pas sa place dans la table : le régler reviendrait à régler l'écosystème.

### Le ballon et les épines

« Le pic-pic doit piquer, surtout les ballons. » Trois défauts se cumulaient :

1. **L'Oursin vivait là où personne ne va.** Sa bande `[80, 2600]` répartissait
   ses quatre groupes sur 5 400 px de fond valide, et ils se retrouvaient TOUS
   entre 1 500 et 2 600 px de profondeur, à x > 2 900. Mesuré : le Fugu ne s'en
   approchait **jamais** à moins de 1 200 px. Sa frayère disait déjà `reef` ; sa
   bande la contredisait. Ramené à `[80, 1000]`, il est dans le récif — 91 px du
   Fugu le plus proche.
2. **Sa portée de 55 px** ne piquait que par accident, en le frôlant.
3. **Le Fugu ne gonflait que devant du GROS et du MOBILE**, donc jamais devant
   un Oursin — et un ballon dégonflé n'éclate pas. Or des épines, c'est
   exactement ce qui doit lui faire peur. Le piquant le prévient maintenant
   (`_alarmePiquant`, canal d'une frame) : **il gonfle à cause des piquants, et
   c'est ça qui le fait éclater.**

La règle est générique — tout `piquant` crève tout `gonflable` gonflé, donc la
Rascasse le fait aussi. Le Fugu n'en meurt pas (seul le Barracuda le mange) : il
se dégonfle d'un coup, part en vrille comme un ballon qu'on lâche, et repart
sonné. Mesuré : **0,4 éclatement par minute**, pile dans le régime bruyant.

L'Oursin **hérisse** en plus ses piquants à l'approche, en réutilisant le
`_piquantGonfle` qui gonfle le Fugu : c'était le seul piquant du jeu qui ne
prévenait pas.

### Une figure de banc doit être ATTEINTE, pas approchée

La figure des Confettis — cœur, rond, carré — existait depuis longtemps et
**ne s'était jamais formée une seule fois**. Mesuré : les trois formes étaient
bien tirées à parts égales, mais la forme n'était lisible que **0,39 s par
figure**, et à cet instant chaque poisson se trouvait encore à **337 px en
moyenne de sa place** — pour une figure de 150 px de rayon. Ils étaient deux
fois plus loin de leur place que la figure n'était grande. On ne voyait pas un
cœur : on voyait un nuage se resserrer vaguement et se rouvrir.

Quatre causes, et c'est le genre de cumul qui rend un gag invisible sans que
rien n'ait l'air cassé :

1. **L'amplitude suivait un triangle** (0 → 1 → 0 en 2,6 s) : la forme pleine
   n'existait qu'à un instant, jamais tenue.
2. **La place assignée était multipliée par cette amplitude**, donc elle
   *fuyait* le poisson qui courait après — et elle était accrochée au chef, qui
   se déplaçait lui aussi.
3. **Le steering de figure plafonne à 1,6× la vitesse** (112 px/s pour un
   Confetti) : 3 s pour parcourir 337 px, quand la scène en durait 2,6.
4. **Cohésion et alignement des boids tiraient vers le centre du banc**, contre
   la place assignée.

Elle se joue donc en trois temps, comme toute mise en scène du projet : ils
**courent** à leur place (ancre figée, vitesse ×3,2), ils **tiennent** la pose
(2,8 s), puis ils se dispersent. Pendant la figure, `_enFigure` coupe cohésion
et alignement — la séparation reste, elle empêche deux poissons de se
superposer sur le tracé. Mesuré après : **écart médian 26 px, pose tenue 2,8 s,
1,35 figure/min** au lieu de 0,9.

Deux pièges rencontrés en le corrigeant, tous deux génériques :

- **`Ecosystem.cadence` compte les INDIVIDUS.** Appliquée à une scène de banc,
  où un seul chef joue pour tout le groupe, elle donnait 500 s de cooldown à
  l'unique chef — soit une figure toutes les huit minutes. D'où
  **`Ecosystem.cadenceBanc`**, qui compte les bancs.
- **Le chef peut mourir ou changer de banc en pleine scène.** Sans ménage, il
  garde sa phase pour toujours et ses membres restent cloués à une place que
  plus personne ne pilote.

Et depuis que le sommeil est collectif : **on ne prend pas la pose en dormant.**
La figure pouvait se déclencher sur un banc entièrement endormi — personne ne
rejoignait sa place et on voyait un tas de dormeurs avec des ZzZ.

### L'humeur du banc : le banc décide, l'individu interprète

Chaque poisson décidait seul de dormir (`Math.random() < dt * 0.06` par frame)
et se réveillait sur son propre minuteur de 12 à 30 s. Un banc de trente ne
converge donc **jamais**. Mesuré : la nuit, **un banc était coupé en deux 81 %
du temps**, et il n'était **jamais** entièrement endormi — 0 %. On voyait en
permanence une moitié qui erre entre les dormeurs.

**Ce n'est PAS une optimisation, et il faut le savoir avant de s'y mettre.** La
détection de menace coûte 0,09 ms, soit 2 % de la simulation (`chasseurs` est
une liste plate d'une poignée d'individus) : mutualiser ne fait rien gagner. Le
gain est entièrement visuel.

`Ecosystem.humeurBancs` calcule une humeur par groupe, une fois par frame, avant
que les membres pensent. Deux décisions y passent, et deux seulement :

- **le sommeil** — le banc se couche et se lève ensemble, par cycles (30–70 s
  endormi, 8–20 s éveillé) ; rester endormi toute la nuit d'un bloc figerait un
  tiers de l'aquarium pendant des minutes ;
- **la peur** — le premier membre qui voit une menace prévient tout le monde
  (`alerterBanc`), ce qui remplace la contagion bricolée des boids
  (« assez de voisins affolés »).

La parade et la ponte **restent individuelles** : c'est un couple, pas un banc.

**Le piège à ne pas y tomber : ne jamais partager l'ÉMOTION elle-même.**
Quarante poissons au même visage au même instant, c'est perdre exactement ce que
le projet construit avec soin — cinq couleurs, ±26 % de dispersion, et une
phrase qui dit « On est nombreux, mais on est PAS pareils ! ». D'où
`Ecosystem.vague()` : la consigne se propage **depuis un initiateur**, avec un
délai proportionnel à la distance, et **un poisson sur six est à contretemps**
(même règle que la Crevette Guirlande, dont il y en a toujours une qui clignote
de travers).

Mesuré après : accord dans le banc **77 % → 91 %**, banc entièrement endormi la
nuit **0 % → 36 %**, coupé en deux la nuit **81 % → 43 %** — et sur ce reste,
**95 % des éveillés ont une raison de l'être** (en parade, en migration, en
fuite, en train de manger, ou la vague ne les a pas encore atteints). Ce n'est
plus du désordre, c'est de la vie.

Deux garde-fous à ne pas retirer :

- **Un minuteur de secours** sur le dormeur de banc (90–150 s). `regroupeBancs`
  remanie les bancs toutes les 6 s et un banc décimé disparaît : sans lui, un
  poisson qui perd son groupe en dormant n'a plus personne pour le réveiller.
- **`humeurs` est purgé** des groupes disparus toutes les 20 s : il survit aux
  frames, `byGroup` non.

### Une peur se JOUE, elle ne se maintient pas

`emote()` repousse `exprTimer` à chaque appel. Appelé à chaque frame de la
fuite, il bloquait l'enveloppe de `emoteK()` près de son sommet : le visage ne
retombait jamais, et le banc *maintenait* sa peur au lieu de la jouer. Mesuré
sur le Confetti : **1 085 appels par minute pour 63 vraies frayeurs**, soit
dix-sept appels par frayeur, dont 622 venaient de la contagion des boids et 355
de la fuite elle-même.

L'émotion ne part plus qu'à **l'entrée** dans l'état (`if (this.state !==
'flee')`). Mesuré après : **1,2 appel par frayeur**. La règle vaut pour tout
état durable — vérifier `state` avant d'émettre, jamais émettre dans la branche
qui s'exécute chaque frame.

### Un banc poursuivi s'ÉPARPILLE, il ne se resserre pas

Tant que le banc erre, la cohésion des boids en fait une masse qui ondule d'un
seul tenant — c'est ce qu'on veut. Mais **en fuite elle devient
catastrophique** : tout le monde part dans la même direction ET converge vers le
même centre, si bien que le banc se compacte en une **colonne de poissons
superposés** pendant que le prédateur le traverse. C'est ce qu'on voyait à
l'écran, et de loin ça ressemblait à des poissons endormis empilés.

Trois règles, toutes appliquées quand `state === 'flee'` :

- **plus de cohésion** — c'est elle qui les rassemble alors qu'ils devraient
  exploser ;
- **séparation doublée, sur un rayon doublé** (40 → 80 px) ;
- **fuite en éventail** : « à l'opposé exact » envoyait tous les voisins dans la
  même direction et étirait le banc en ligne. Chacun a son propre écart d'angle
  (jusqu'à ±40°), fixé par sa phase — stable dans le temps, donc il ne zigzague
  pas.

Piège voisin, découvert en corrigeant le sommeil : **un dormeur doit encore se
faire pousser.** Mettre `maxSpeed = 0` coupait aussi l'anti-chevauchement, et un
banc qui s'endormait s'empilait en colonne pour la nuit. Il garde juste de quoi
s'écarter d'un voisin, pas de quoi partir en balade.

### Une bande de profondeur trop étroite entasse une espèce contre la plage

L'Étoile de Mer avait `depthBand: [0, 1000]`. Or le fond dépasse 1000 px de
profondeur dès x = 2600 : les 15 étoiles se retrouvaient donc **toutes dans les
1 600 px qui suivent le rivage**, alors qu'il y a 89 rochers répartis sur les
8 000 px du monde. Même chose pour le coquillage, l'oursin, le nudibranche,
l'anguille-jardinière et le bernard-l'ermite.

La borne haute d'une espèce de fond doit couvrir **tout le fond où elle est
censée vivre**, pas la seule zone claire. Le corail et l'anémone font exception,
et à juste titre : ils ont besoin de lumière. Mesuré après : l'étoile s'étale
sur 3 268 px au lieu de 1 467.

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

### La plage : l'effet d'entonnoir (corrigé le 5 septembre 2026)

Tout finissait par s'entasser contre le rivage. La cause : `limiteLarge()`
calculait la barrière sur la seule **taille**. Un Confetti de 11 px pouvait donc
descendre jusqu'à **46 px d'eau**, une Méduse et un Clown aussi, un Thon jusqu'à
112 — c'est-à-dire le ressac. En simulation à vide personne n'y va, ce qui masque
complètement le problème ; dès qu'un prédateur ou le **curseur du joueur** les
pousse vers la côte, tout le monde s'y écrase et ne peut plus repartir.

Trois planchers génériques, tous mesurés :

- **Aucun nageur** ne va là où il y a moins de **150 px d'eau** — barrière du
  Confetti portée de 46 à 180 px d'eau, et 0 échoué après 15 s de souris
  balayée le long du rivage (contre un entassement systématique avant).
- **Un colosse en exige 900** : la Baleine tenait dans 548 px d'eau, ce qui la
  ramenait beaucoup trop près de la plage. Sa barrière passe de x=1790 à 2420.
- **Les créatures de fond** aussi : coquillage, étoile, oursin et crabe ont une
  bande qui commence à 0, ils se posaient donc jusqu'au rivage exact et on en
  trouvait sur le **sable sec**. Il leur faut désormais `size * 3 + 40` px d'eau,
  au spawn (`spawnGroups`) **et** en reptation (`bornesReptation`).
- **Et les SITES D'HABITAT** (`Ecosystem.sitesHabitat`, mutualisé entre le spawn,
  la répartition des groupes et la ponte). Ils étaient filtrés sur la seule bande
  de profondeur : une étoile a `depthBand[0] = 0`, donc un rocher posé pile sur
  la ligne d'eau passait le test — et comme le tirage ajoute ensuite ±40 à ±90 px
  de dispersion, on retrouvait des étoiles sur le sable sec, **à deux exemplaires
  au pixel près**. Mesuré après : 0 créature hors de l'eau.

### Vivre DANS son refuge (`anchorToRefuge`)

Le Poisson-clown Chatouille était ancré à une **copie des coordonnées** de
l'anémone la plus proche au moment du spawn. Deux conséquences : un clown né
d'une ponte ou arrivé par immigration restait ancré à un point d'eau vide, et
personne ne rejoignait jamais une anémone. Il garde maintenant une **vraie
référence** (`_hote`), revue quand elle disparaît (recherche rare, elle balaie
toutes les entités).

Et le rayon de confort **se referme la nuit** : dedans pour dormir, autour le
reste du temps. Sinon il passe la nuit à 120 px de son anémone, en pleine eau,
c'est-à-dire loin de la seule chose qui le protège. Mesuré au cœur de la nuit,
distance à l'hôte : **médiane 103 px et jusqu'à 377 → médiane 26 px**, tous
endormis.

Le guili suit la même logique : il ne se déclenche que sur **quelqu'un qui
passe** (`speedNow > 14`, comme le câlin de l'Étoile) et jamais pendant le
sommeil. Se coller au premier voisin immobile, ce n'est pas la même scène — et
ça l'emmenait loin de chez lui pour rien.

### Un dormeur ne bouge plus

`maxSpeed = speed * 0,05` laissait une dérive lente, et l'errance continuait de
pousser : un crabe endormi traversait sa bande de sable pendant la nuit. Le
sommeil coupe maintenant la vitesse **et** l'accélération accumulée. Attention,
il faut le faire **deux fois** : la branche `crawl` court-circuite le steering,
un rampant continuait sa marche toute la nuit. Mesuré : **0 dormeur de fond en
mouvement** sur 226 dormeurs.

### Frai éclair (`fraiRapide`)

La reproduction demande normalement de **rencontrer** un partenaire. Le bas de la
chaîne y échappe : crevettes, krill, méduses, calmars, sardines, confettis,
maquereaux, dorades. Les nourrir fait des œufs **immédiatement**. C'est le geste
le plus naturel du jeu — « ils se font tous manger, je vais les aider » — et il
n'avait aucun effet visible avant la minute suivante. Borné par `popCap`, donc
sans risque de débordement.

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

### Le zoom, et un piège qui a coûté cher

`Camera.zoom` et la taille de vue (`w = vw / zoom`) sont **liés** : poser `zoom`
à la main laisse `w`/`h` au facteur précédent, et tout ce qui les lit travaille
alors en dimensions fausses — le décor étant un dégradé étiré aux dimensions de
la VUE, l'écran se retrouve à moitié peint. C'est exactement ce qui arrivait au
chargement d'une sauvegarde faite à un zoom ≠ 1, et il fallait un coup de
molette (le seul chemin qui appelait `updateSize`) pour que tout se remette
d'aplomb. **Passer par `Camera.setZoom()`, jamais par `Camera.zoom = …`.**

Les deux bornes ne se règlent pas de la même façon :

- **`ZOOM_MAX` est un choix de mise en scène** : 3,2 (au lieu de 1,6), parce que
  tout le travail du projet est sur les visages et qu'à 1,6 on ne voyait pas
  vraiment une créature de près.
- **Le dézoom est une question de PERF.** Il n'ajoute aucune entité à la
  simulation, mais multiplie ce qu'il faut dessiner : à 0,35 la vue couvre trois
  fois plus de monde qu'à 1. Le plancher est donc adaptatif
  (`Camera.zoomMinPerf`), remonté par `Main.adaptResolution` **après** la
  résolution — c'est le levier le moins visible qui passe en premier — et jamais
  redescendu tout seul, le pompage du cadrage se voyant bien plus qu'une frame
  lente.

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
- **Un dessin doit savoir faire ce que la silhouette savait déjà.** Les
  silhouettes procédurales font varier chaque individu (`Entity.color` tire dans
  `def.colors` — c'est ce qui fait chatoyer le banc de confettis), la méduse est
  translucide, le lanterne s'allume la nuit (`glowAtNight`). Un dessin fait main
  n'avait rien de tout ça : quarante confettis dessinés sortaient du même moule.
  D'où quatre champs par forme, tous réglés dans l'atelier —
  **`couleur`** (cinq modes : fixe, la couleur de l'individu, sa version foncée,
  un tirage dans une palette, une teinte décalée au hasard — tous
  **déterministes**, tirés de l'identifiant et mis en cache comme `Entity.color`),
  **`degrade`** (dont le premier arrêt est la couleur *résolue* : un dégradé à
  couleurs fixes annulerait la variation individuelle),
  **`alpha`**, **`lueur`** et **`reflet`**. Le halo de `lueur` passe par
  `FishBody.halo` (image en cache) et non par un `shadowBlur`, qui travaille en
  pixels **écran** et grossirait donc sur un petit poisson vu de loin.
- **Un reflet est DÉCOUPÉ dans le contour, pas peint par-dessus.** La bande de
  lumière sur le dos se dessinait à la main dans un calque : figée, elle ne
  suivait pas l'ondulation du corps. `FishBody.reflet` la découpe dans le tracé
  **déformé** (`ctx.clip()` sur le chemin courant), donc elle ondule avec la nage
  et ne déborde jamais — et elle s'éteint à ses pointes, sans quoi un aplat aux
  bouts francs se lit comme un trait de peinture. Elle est peinte **en dernier** :
  son `beginPath()` détruirait le tracé dont le contour a encore besoin, alors
  que le découpage, lui, survit au `save`/`restore`.
- **La transition d'un dégradé a un début ET une fin.** Avec une seule longueur,
  un fondu court était forcément collé à un bord ; il faut deux arrêts pour poser
  une frontière franche au *milieu* d'un corps.
- **Une baleine ne bat pas comme un requin.** Un cétacé porte une caudale
  HORIZONTALE qu'il bat de haut en bas — vu de côté, un vrai mouvement vertical ;
  un poisson balaie une caudale VERTICALE de gauche à droite, ce qui se lit comme
  un balancement horizontal, la queue qui coulisse d'avant en arrière. `tailAxe`
  (degrés, 90 par défaut) donne son axe à l'ondulation. L'axe **tourne** le
  déplacement sans en changer la norme (mesuré : 34,54 px quel que soit l'angle),
  et 90° reproduit le comportement d'avant au pixel près.
- **Un éditeur à l'arrêt doit rendre la POSE DE REPOS, pas la dernière frame.**
  Figer sur la phase courante laisse le dessin déformé, donc décalé de ses
  propres poignées. `e._repos` (posé par l'atelier seul) court-circuite toute
  déformation dans `drawSprite`. Remettre la phase à zéro ne suffit pas : une
  queue à ondes et un tentacule gardent un `− u · ondes` dans leur sinus et
  restent courbés à phase nulle. Mesuré : écart au repos **0,000000 px** sur les
  20 formes du Confetti, contre 10,06 px en animation.
- **Un aperçu qui recrée son entité à chaque frame FIGE toute l'animation.**
  `FishBody.phaseNage` intègre la fréquence (`phase += f · dt`) sur l'entité ;
  un poisson neuf a toujours `dt = 0`, donc une phase clouée. L'atelier faisait
  exactement ça : queue et appendices immobiles, visage animé — ce qui se lit
  comme « un minuscule tremblement », pas comme un bug. Mesuré sur le Confetti :
  course du bout de la caudale **0,00 px** avec un acteur neuf, **36,6 px** avec
  un acteur réutilisé. Tout aperçu hors jeu doit garder ses entités.
  Corollaire : il doit aussi leur donner une **vitesse** (`vx`), car
  `FishBody.allure` la lit sur `vx/vy` et non sur `speedNow` — sinon on juge les
  amplitudes sur un poisson qui fait la planche, à un tiers de sa cadence.
- **Un réglage d'animation qui ne se voit pas doit se MESURER dans l'outil.**
  L'amplitude d'un appendice était annoncée en degrés mais convertie par `/360`
  (donc divisée par deux), et sa pondération vaut 1 sur l'ancre — là où le bras
  de levier est nul — et 0 au bord du rayon : le déplacement plafonne vers
  0,25·r. Relevé sur le Confetti, « 20° » déplaçait **1,4 px** sur un dessin de
  150, soit 0,26 px à l'échelle du jeu. Corrigé (`/180`, plus le facteur
  d'effort `vigueur` déjà appliqué à la queue), mais la vraie leçon est que
  l'atelier affiche maintenant le **débattement obtenu en pixels**, en rouge
  sous 1 % : un curseur dont on ne peut pas lire l'effet se règle à l'aveugle.
- **Un accessoire de gag enfermé dans une silhouette disparaît avec elle.** La
  danse du Crabe Disco a déjà été hissée dans `FishBody.choregraphie()`,
  appliquée AUTOUR du corps quel qu'il soit. Restent la **poche du Pélican**, la
  **lampe du Poisson-lanterne** et le **rocher de la Murène** : activer un dessin
  sur l'une de ces trois espèces sans faire la même opération supprimerait son
  gag.
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
- **La cadence se règle, mais APRÈS la bride.** `vitesse` (tout le dessin) et
  `vitesseQueue` (l'ondulation du corps seule) multiplient la fréquence une fois
  le plafond appliqué — posés avant, ils n'auraient aucun effet sur les petits
  poissons, qui saturent déjà ce plafond et sont précisément ceux qu'on veut
  ralentir. Chaque appendice garde en plus la sienne (`fins[].vitesse`), et
  l'atelier réunit les trois au même endroit : c'est le **rapport** entre ces
  rythmes qui fait une nage, pas leur valeur absolue.
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
- `atelier.html` — **l'outil unique** (page à part, servie par le même serveur de dev) : importer, poser les ancres et les nageoires, calibrer le visage, peindre les calques, prévisualiser avec le VRAI rendu du jeu, et **enregistrer directement dans `Assets/`**. Une espèce s'active par le manifeste `Assets/sprites.json`, sans toucher au code. **[SPRITES.md](SPRITES.md) est le contrat complet.**
  Cinq règles d'interface, apprises en le rangeant : le haut du panneau
  appartient à l'**outil sélectionné** et l'annonce (le reste est en sections
  repliables dont l'état est retenu **hors du DOM** — le panneau est reconstruit
  à chaque geste) ; ce qui vaut pour le **dessin entier** (animer, recadrer,
  comparer, enregistrer) n'a rien à faire dans ce panneau et vit dans **deux
  barres** en haut — un champ de saisie n'y survivait de toute façon pas, il
  perdait le focus au premier re-rendu ; l'**aide est un calque** (bouton 💡),
  elle occupait les deux tiers de la colonne ; un calque s'**éteint**
  provisoirement (👁 / Isoler), réglage de travail jamais enregistré, mais qui
  doit passer par `decalerCalques()` comme toute autre liste d'indices ; et le
  rail range les 51 espèces **par état** d'avancement, pas dans l'ordre de
  `SPECIES`, avec un filtre — la rubrique « sans dessin de référence » est la
  liste, tenue à jour toute seule, de ce qu'il reste à dessiner.
- `decoupe_planche.py` — découpe `Assets/Concepts/Design Final.png` (les 30
  créatures dessinées) en **un repère par espèce** dans `Assets/Reperes/`.
  L'atelier les pose tout seuls en calque de repérage. Les 17 vignettes qui
  regardent à gauche sont **retournées à la découpe** : le jeu dessine tout
  vers la droite, une planche à l'envers est un patron à l'envers.
- `background.js` — dégradé d'eau par profondeur, god rays, crêtes d'arrière-plan, rochers, végétation, cheminées volcaniques, plancton, jour/nuit.

### Décor posé au sol

Rochers, végétation et cheminées suivent le relief. Deux règles à respecter pour tout nouvel élément de décor :

- **Lire la hauteur à la position réellement affichée**, pas à la position d'origine : avec un décalage parallax, `px = x - Camera.x * layer` puis `World.floorY(px + Camera.x)`. Utiliser `World.floorY(x)` directement fait flotter l'élément au-dessus du sol.
- **S'incliner selon la pente** via `ctx.rotate(Math.atan(World.slopeAt(wx)))`, sinon l'élément paraît penché sur les fortes pentes.

Ordre de rendu : les **rochers avant le sable** (celui-ci recouvre leur base et les enfonce naturellement), la **végétation et les cheminées après** (elles poussent dessus).

Les **créatures** posées au sol suivent la même règle : `GROUND_RENDERS` (worm, crab, shell, star, anemone, eel) pivote avec `World.slopeAt`. Les espèces `flatGround` (ver-tapis) apparaissent en plus sur une **terrasse** — `World.init` aplanit des groupes de colonnes exprès, sinon une créature horizontale paraît posée de travers.

Les espèces peuvent réclamer un **habitat** (`habitat: 'rock' | 'weed'`) : elles apparaissent alors sur les positions de décor correspondantes (`Background.habitatSpots`) — étoiles sur les rochers, hippocampes dans les herbiers. Le décor est donc initialisé **avant** l'écosystème dans `Main.init`.

### Un poisson TOURNE, il ne recule pas

Mesuré avant correction : un gros poisson passait **21 % de son temps à nager à
reculons**, jusqu'à 3,8 fois sa vitesse de croisière. La cause n'est pas la
nage, c'est l'hystérésis d'orientation ci-dessous : elle est là pour empêcher la
baleine de clignoter, mais elle laissait le corps filer dans un sens pendant que
la tête regardait encore dans l'autre — pendant près d'une seconde pour un gros
gabarit.

**La patience protège de l'hésitation, pas de la décision.** Elle cède donc
d'autant plus vite que l'intention est franche (`Entity.PATIENCE_REMISE`,
pondérée par `|dirX| / seuil`) : un `vx` qui traîne autour de zéro garde toute
sa patience, un poisson qui repart franchement dans l'autre sens n'en garde
presque rien. Mesuré : **2,5 % → 1,2 % pour un moyen, 1,7 % → 0,8 % pour un
petit.**

Deux enseignements, tous deux contre-intuitifs et tous deux mesurés :

- **Les colosses en sont EXCLUS** (`size >= 70`). Leur remettre la patience
  doublait leurs demi-tours — 1,6 à 3,2 par minute pour la Baleine Gros Dodo —
  pour un gain quasi nul sur la marche arrière (3,3 % → 2,8 %). La patience a
  été écrite pour eux ; on ne la leur retire pas.
- **Une brise sur la vitesse arrière a été essayée puis RETIRÉE.** Elle semblait
  la réponse évidente (« un gros poisson ne peut pas reculer ») ; elle mesurait
  moins bien que la patience seule (gros : 4,7 % sans elle, 7,9 % avec). Elle
  se mordait la queue — en effaçant la vitesse arrière, elle réduisait la
  franchise perçue, donc rallongeait la patience, donc prolongeait l'état
  qu'elle prétendait corriger. Ne pas la réintroduire sans mesurer.

### Le demi-tour est une FEUILLE QUI S'ENROULE

L'ancien demi-tour écrasait la silhouette jusqu'à **5 % de sa largeur** : le
poisson devenait un trait, disparaissait une frame ou deux et réapparaissait
miroité. C'est ça qu'on lisait comme un « flip brutal » — pas la vitesse du
demi-tour, mais le passage par le néant.

Une feuille qui s'enroule ne disparaît jamais : elle se met de trois quarts, et
c'est la **courbure** qui raconte la rotation. Quatre réglages, tous dans
`orientation()` et `draw()` :

- **largeur minimale 0,34** au lieu de 0,05 — c'est le changement qui fait tout ;
- **l'arc** (`_vir`, cisaillement en y le long du corps) : la queue traîne
  derrière la tête et le corps se creuse en C ;
- **le volume** : ce que le corps perd en largeur, il le reprend en hauteur ;
- **le roulis** (`_virSens`) : il s'incline dans son virage.

`_vir` suit un `smoothstep` du sinus, pas le pivotement linéaire : la
déformation s'installe et se retire en douceur. Contrôle : rendre la même
silhouette à neuf valeurs de `_flipX` de −1 à +1 et regarder la planche — avant,
la case du milieu est un trait.

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

**Squash & stretch.** Comprimer la silhouette en x et rien d'autre, c'est une
feuille de papier qu'on tourne sur la tranche : elle s'amincit jusqu'à
disparaître. Un vrai virage conserve le volume — ce que le corps perd en largeur,
il le reprend en hauteur — et la queue traîne derrière la tête avant de fouetter
dans le nouveau sens. Deux déformations, posées **après la rotation**, donc dans
le repère du CORPS (sinon le cisaillement décale le bas du poisson par rapport au
haut au lieu de la queue par rapport à la tête) :

```js
const vir = 1 - Math.abs(flipX);      // 0 en ligne droite, 1 au plus fort du virage
ctx.transform(1, vir * 0.5, 0, 1, 0, 0);   // la queue traîne
ctx.scale(1, 1 + vir * 0.3);               // le volume se reporte en hauteur
```

Le signe du cisaillement s'inverse tout seul avec le miroir, au moment précis où
la silhouette est sur la tranche : c'est ce qui fait lire un coup de queue
continu et non un à-coup. Contrôle non visuel (rendu hors écran, emprise de
l'encre) sur un thon : largeur 59 → 7 px pendant que la hauteur passe de 25 à
**41**.

**L'inclinaison est bridée CONTINÛMENT, pas par paliers.** Deux brides, toutes
deux fonction du gabarit : `maxTilt` pour la nage
(`clamp(0,95 − size × 0,0095)`, de 0,75 rad pour un confetti à 0,26 pour un
colosse) et **`visee` pour `_faceAt`** (`clamp(1,7 − size × 0,045)`). C'est cette
seconde qui manquait : viser quelqu'un autorisait 1,4 rad — **80°, c'est-à-dire
debout sur la queue**. Le coupable n'était pas le requin mais le Thon arrêté à la
station de nettoyage du Poisson Dentiste, qui pointait vers le petit nettoyeur
flottant au-dessus de lui. Mesuré sur 40 s, toutes espèces de plus de 20 :
**479 frames au-delà de 0,9 rad → 0**, pointe maximale 0,80 rad (le Perroquet,
qui est petit et a le droit d'être expressif).

Un piège de paliers en passant : le Thon fait 26, il tombait donc du bon côté
d'un seuil « ≥ 30 » et gardait la bride des petits poissons. Les seuils en
paliers laissent toujours quelqu'un juste en dessous.

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

**[PERFORMANCE.md](PERFORMANCE.md) est l'audit complet** — son dernier point
(5 septembre 2026) donne l'état courant : **frame 22,7 ms**, dont 18,3 de dessin
et 4,3 de simulation, après le **culling de simulation** (une entité hors champ
ne pense qu'une frame sur trois : −5,55 → 2,85 ms, sans bouger l'écosystème).

Et un piège de mesure à connaître avant de profiler le rendu : **le premier
poste dessiné porte le chapeau de tous les autres.** Canvas 2D empile les
commandes sans les exécuter ; le premier appel qui force le pipeline à se vider
absorbe le temps de ce qui précède. Le Coquillage semblait coûter 534 µs ; mesuré
isolément il en coûte **3**. Toujours mesurer par différence, jamais en
enveloppant l'appel.

L'audit détaillé : méthode et ses
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

**À 51 espèces et ~690 entités : simulation 6,0 ms** (contre 4,8 à 490 entités — la montée est super-linéaire). Les espèces d'AMBIANCE, celles qu'on regarde en masse sans les suivre (krill, maquereau, dorade, crevette de récif), sont donc dimensionnées à la moitié de ce qu'on croirait : elles remplissent l'eau aussi bien à 30 qu'à 60, et chaque individu coûte.

Le rendu procédural n'est donc **pas** le goulot — passer à des sprites optimiserait la partie déjà la moins chère. Le coût est dans les recherches de voisinage. Utiliser systématiquement `Ecosystem.neighbors()` (grille spatiale) et `Ecosystem.bySpecies[id]` plutôt que de balayer `entities`.
- `input.js` — molette (vertical) / shift+molette + drag (bi-axial), clic = nourrir + splash/sable, clic maintenu = bulles, souris rapide = remous + fuite des petits.
- `main.js` — boucle, cycle jour/nuit (`Main.nightAmount()`), HUD (les deux barres de position, heure).
- `save.js` — sauvegarde/restauration (voir la section **Sauvegarde**). À ajouter à `js/boot.js`, comme tout nouveau fichier.

## Sauvegarde (`js/save.js`)

L'aquarium se retrouve tel qu'on l'a laissé, sur le web comme sur mobile.
`localStorage`, clé `aquarium.sauvegarde`, **9 à 10 ko pour ~550 créatures**.

Ce qu'on enregistre : la **graine du monde**, l'heure qu'il était, la caméra, et
par créature son espèce, sa position (entière), son stade et son banc. Pas
d'âge, pas de faim, pas de vélocité, pas de particules. Cinq points qui ne se
devinent pas :

- **La graine d'abord.** `Background.init(graine)` construit 260 rochers, les
  herbiers et les cheminées **au hasard** ; sans graine, `habitatSpots` change
  d'une session à l'autre et une étoile de mer restaurée sur son rocher se
  réveille sur du sable nu. `U.semer` / `U.alea` / `U.oublier` : le mode semé ne
  vaut QUE pour la génération du décor — la simulation doit garder du vrai
  hasard, sinon toutes les parties se déroulent à l'identique. Le décor est donc
  reconstruit **avant** qu'on y replace les créatures.
- **Les bancs sont renumérotés.** `groupId` est un compteur global qui n'a aucun
  sens d'une session à l'autre. Sans lui, un banc de confettis se rouvre en
  quarante poissons solitaires — et sa figure en cœur, qui exige un chef de
  banc, ne se joue plus jamais.
- **Ne pas retenir l'âge est un choix, pas un oubli.** Le constructeur donne
  déjà un âge aléatoire aux adultes créés directement, précisément pour qu'une
  classe d'âge entière ne meure pas d'un coup.
- **Le monde ne vit pas pendant l'absence, et il n'y a rien à coder pour ça** :
  `requestAnimationFrame` est en pause dès que l'onglet est caché (le « piège
  dev connu » plus bas est ici une fonctionnalité). On ne rejoue rien au retour.
- **`visibilitychange` fait foi, pas `beforeunload`** : sur mobile, une
  application passée en arrière-plan peut être tuée sans jamais le déclencher.
  Il y a en plus une sauvegarde périodique (20 s de jeu) et `pagehide`.

Toutes les entrées de secours sont vérifiées : JSON tronqué, illisible, vide,
mauvaise version, graine absente, `pop` vide, espèce disparue du code, positions
`NaN`, `localStorage` qui lève (mode privé, quota) — chacune donne un monde neuf
ou une restauration partielle, **jamais une exception ni une page blanche**. Une
espèce inconnue est sautée, l'immigration la ramènera si elle existe encore ; un
quota dépassé désactive la sauvegarde au lieu de relancer une exception toutes
les vingt secondes.

Cas vécu (2026-09-06) : un `NaN` de position devient **`null` dans le JSON**
(`JSON.stringify` ne connaît pas NaN) — une session de debug qui appelait
`Ecosystem.update()` **sans dt** avait mis tous les nageurs libres en NaN, la
sauvegarde suivante a écrit des null, la restauration jetait les 7 espèces d'un
coup et l'autosave gravait la perte à chaque rechargement : une extinction
silencieuse en cascade, alors que seules les espèces fixes/rampantes
survivaient. Depuis, une espèce dont **toutes** les entrées sont illisibles est
**repeuplée immédiatement** (`spawnGroups`, comme l'immigration mais sans
attendre) ; s'il reste des congénères valides, on ne fait rien. Le moteur
lui-même ne produit pas de NaN en marche normale (vérifié sur 5 min de
simulation au dt réel) — c'est bien la donnée sauvée qu'il faut savoir réparer.

Deux boutons discrets sous ↻ : **💾 emporter** (télécharge la sauvegarde en
fichier) et **📂 rapporter** (la recharge, avec confirmation — un fichier
illisible est refusé AVANT de toucher au stockage, l'aquarium courant ne
risque rien). La raison d'être est iOS, qui efface le localStorage des sites
non visités depuis 7 jours : le fichier est la seule persistance sûre, et il
sert aussi à déménager un aquarium d'un appareil à l'autre. `FileReader` et
pas `Blob.text()` : ce dernier n'existe qu'à partir de Safari 14, or le socle
du jeu est Safari 13.1.

Le bouton **↻** (en haut à gauche, avec confirmation) efface et recharge. Il est
volontairement **hors de la barre d'action** : c'est la seule commande qui
détruise quelque chose, elle n'a rien à faire à côté de « nourrir » — et la
barre est calibrée au pixel pour tenir dans les 375 px d'un petit téléphone, un
septième bouton la ferait déborder.

## Reste à faire (extension du GDD)

**[IDEES.md](IDEES.md)** rassemble tout ce qui n'est pas encore implémenté, en
sept sections : la **liste des 25 poissons manquants** (§1, la référence — les
idées des enfants, la liste de souhaits et les trous de la chaîne alimentaire y
sont fusionnés et dédoublonnés), les gags dans l'esprit **parc à thème** (§2),
les corrections sur l'existant (§3), la canne à pêche (§4), la couche
**économique** — acheter des poissons, être payé aux naissances, sanctionné aux
extinctions et aux espèces envahissantes (§5), le **roster** (§6, tableau des 27 espèces
d'origine) avec sa répartition par zone et par niveau trophique, et les
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
