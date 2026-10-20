# Aquarium Vivant

Écosystème aquatique scrollable, contemplatif et comique. Le design complet est
dans `aquarium_vivant_game_design.docx` (chaîne alimentaire, scroll bi-axial,
cycle de vie, nourriture favorite). Le roster en compte aujourd'hui **53**, le
GDD en décrivait 24, et les **deux planches de design** en couvrent 51
(`Assets/Concepts/Design Final.png` puis `… page2.png`, découpées en repères
par `decoupe_planche.py`) — le Poisson Archer et le Requin Marteau, arrivés
après, n'ont pas de repère de planche mais ont leur dessin
(`Assets/archer.json`, `Assets/marteau.json`, activés au manifeste).

Ce fichier ne garde que **les règles et la carte**. Chaque règle a été apprise
en mesurant ; l'histoire complète (le bug, les chiffres avant/après, les
fausses pistes) est dans `docs/`, à lire **avant** de toucher au domaine.

## Où est quoi

| Document | Contenu |
|---|---|
| [docs/DEPLOIEMENT.md](docs/DEPLOIEMENT.md) | stack, `build.py`, PWA, GitHub Pages, releases, serveur de dev |
| [docs/INTERFACE.md](docs/INTERFACE.md) | contrôles souris/tactile, fiche d'identité, barres du HUD, zoom, saisie |
| [docs/ANIMATION.md](docs/ANIMATION.md) | visage commun, émotions, gags, anticipation/flèche/crash, colonne, poses, scènes et clips, budget de particules, cadence, nage, demi-tour |
| [docs/ECOSYSTEME.md](docs/ECOSYSTEME.md) | équilibre, surnombre et Super Saïyen, prédation, peur, bancs, frayères, colosses, respiration |
| [docs/MONDE.md](docs/MONDE.md) | relief, quatre zones, nourriture et arêtes, ciel, décor au sol, reste à faire |
| [docs/RENDU.md](docs/RENDU.md) | sprites vectoriels côté moteur, atelier, planches, résumé perf |
| [docs/SAUVEGARDE.md](docs/SAUVEGARDE.md) | ce qu'on sauve, entrées de secours, emporter/rapporter |
| [FICHES.md](FICHES.md) | une fiche par espèce — **fait autorité** sur le roster |
| [EMOTIONS.md](EMOTIONS.md) | table de référence des expressions et de leurs déclencheurs |
| [SPRITES.md](SPRITES.md) | le contrat complet des dessins et de l'atelier |
| [PERFORMANCE.md](PERFORMANCE.md) | l'audit de performance, méthode et chiffres |
| [SONS.md](SONS.md) | le son : règles, ce qui est branché où, ce qui reste |
| [IDEES.md](IDEES.md) | tout ce qui n'est pas encore fait (espèces, gags, économie, canne à pêche) |

## Stack

HTML5 pur : Canvas 2D, zéro dépendance, zéro build. Scripts classiques (pas de
modules ES), **tous dans la même portée globale** et jamais emballés dans une
IIFE — `Main`, `Camera` & Cie servent à la console de debug et à
`atelier.html`. Corollaire de test : un `const` de haut niveau n'est **pas**
sur `window` (`typeof Sprites !== 'undefined'`, pas `window.Sprites`).

`js/boot.js` charge les 23 fichiers **dans l'ordre de sa liste** — ajouter un
fichier js, c'est l'ajouter là, jamais à `index.html`. C'est la seule source de
vérité : `build.py` la lit. `?v=<timestamp>` n'est l'anti-cache qu'en local ;
en ligne `boot.js` charge l'URL nue.

Socle navigateur : ES2020 (`??`), Pointer Events, `fetch`, `localStorage`,
Canvas 2D — **Chrome/Edge 80+, Firefox 74+, Safari 13.1+**. Rien au-delà sans
repli (`Blob.text()`, champs `static` de classe, `StereoPannerNode` sont
au-delà de Safari 13.1).

## Lancer, tester, publier

- **Dev** : `python dev_server.py 8642` (ou `PORT=…`), `Cache-Control:
  no-store`, deux routes d'écriture dans `Assets/` pour l'atelier.
  `--accueil atelier.html` met l'atelier à la racine (un panneau d'aperçu
  n'ouvre qu'une origine).
- **Banc d'essai** : `node outils/banc.js` (`--rapide` ≈ 2 min). Simulation
  semée sans joueur puis gavée, atelier, deux builds, fichier unique en
  `file://`. Tourne sur GitHub à chaque push (`.github/workflows/banc.yml`).
  En local : `CHROMIUM=/chemin/chrome NODE_PATH=$(npm root -g)`. **Le lancer
  avant tout commit qui touche la simulation.**
- **Fiches** : `node outils/fiches.js` régénère « Mange / Mangé par », taille,
  plafond et plancher de FICHES.md depuis `species.js` (`--verifier` dans le
  banc). Ne jamais les écrire à la main.
- **Publier** : `python build.py` → `dist/` (PWA, un seul `aquarium.<hash>.js`,
  dessins expédiés = manifeste + `sprite:` des fiches). `--inline` → un seul
  `dist/index.html` qui s'ouvre d'un double-clic (dessins embarqués dans
  `Sprites.PRECHARGE`, sinon `file://` les perd en silence). Pages publie
  `dist/` à chaque push sur **master** (https://fab48.github.io/Aquarium/) ;
  une release se fait par l'onglet Actions → Release → Run workflow, ou une
  étiquette `v*`. Tous les chemins restent **relatifs** (le site vit sous
  `/Aquarium/`). Le service worker n'existe qu'au déploiement.

## Architecture (`js/`, dans l'ordre de `boot.js`)

- `config.js` — constantes monde (1 m = 40 px, surface à y = 300), zones, `FOOD_TYPES`.
- `utils.js` — `U` : maths, couleurs, hasard semé (`U.semer`/`U.alea`/`U.oublier`, pour le décor seulement).
- `gags.js` — **toutes les mises en scène**, une fonction par espèce (`def.gag`), et `GAGS.CADENCE`.
- `species.js` — **espèces 100 % data-driven** ; flags génériques documentés en tête ; bloc `FICHES` (phrase, faux latin) en fin de fichier. Le `name` rigolo contient la vraie espèce.
- `sprites.js` — chargement des dessins (`Assets/*.json`, manifeste `Assets/sprites.json`, clips partagés `Assets/clips.json`).
- `world.js` — relief (`CONFIG.PROFILE`), `shoreX`, zones (`bandesX`/`bandesY`), plancton ambiant.
- `camera.js` — scroll bi-axial borné, zoom (`setZoom`, jamais `zoom =`), suivi.
- `particles.js` — splash, sable, bulles, sillage, bulles de BD (`comic`, `shout`).
- `food.js` — graines, arêtes (sprites pré-rendus), cacas.
- `fishbody.js` — rendu cartoon : **visage commun** (yeux, sourcils, bouche), silhouettes, sprites, déformations de scène, colonne, poses, imposteur.
- `entity.js` — la créature : faim, pensée, nage, chasse, fuite, sommeil, reproduction, cycle de vie.
- `idcard.js` — fiche d'identité (panneau HUD sur le côté).
- `legend.js` — légende ❔ : **à tenir à jour** avec chaque bulle et chaque émotion.
- `ecosystem.js` — spawn, grille spatiale (`neighbors`), prédation, plafonds, report, immigration, `BUDGET`.
- `background.js` — eau, god rays, ciel, rochers, végétation, cheminées.
- `input.js` — souris et tactile.
- `saisie.js` — attraper une créature à la main.
- `saiyan.js` — le Requin Super Saïyen (surnombre).
- `svgexport.js` / `svgimport.js` — le pont SVG de l'atelier.
- `save.js` — sauvegarde `localStorage` + fichier.
- `son.js` — **le son**, synthèse Web Audio procédurale (57 recettes, ambiance) ; cf. SONS.md.
- `fps.js` — compteur de performance (touche F).
- `main.js` — boucle, jour/nuit, HUD.

Hors jeu : `atelier.html` (l'outil unique de dessin, cf. SPRITES.md),
`sons.html` (chaque recette de son, jouée et rendue en `.wav`),
`decoupe_planche.py`, `build.py`, `dev_server.py`, `outils/` (banc d'essai,
générateur des fiches).

## Les règles

### Moteur

- **Voisinage** : toujours `Ecosystem.neighbors()` ou `bySpecies[id]`, jamais
  une boucle sur `entities`. La grille ne porte qu'à ~195 px : au-delà, une
  liste plate dédiée (`Ecosystem.colosses`, `Ecosystem.chasseurs`).
- **`def.size` pour les seuils, `e.size` pour le dessin et le contact.**
  `e.size` = maturité × gabarit × âge (+ gras du gavage) — ne pas intervertir.
- **`speedNow` est un EFFORT** (relevé avant écrêtage, jusqu'à 4,5×). Pour
  animer : `FishBody.allure(e)` / `FishBody.battement(e)`.
- **Une fréquence variable s'intègre** (`FishBody.phaseNage`), jamais
  `sin(t * f)` : l'artefact grandit avec l'horloge, invisible en test court.
- **Une réaction ne vise que quelqu'un qui PASSE** (`Entity.passe`) — un voisin
  qui ne peut pas partir la fait tourner en boucle.
- **Une émotion part à l'ENTRÉE dans un état**, jamais à chaque frame de la
  branche qui le maintient. Jamais `Math.random() < dt * k` dans une scène.
- **Un effet infligé à une foule se borne en nombre** (les huit plus proches).
- **Créature saisie (`_saisi`/`_lache`) ou Super Saïyen** : sortie de la
  simulation, intouchable par `nearestPreyFor`/`eat`. Tout repas passe par
  `Ecosystem.eat` (scène de mort, caca, témoins, comptes) — un gag qui crève
  sa proie à la main (`p.dead = true`) la fait disparaître des audits.
- **`Camera.setZoom()`**, jamais `Camera.zoom = …` (la taille de vue suit).
- **Décor posé au sol** : hauteur lue à la position AFFICHÉE (parallaxe), pente
  par `World.slopeAt`. Rochers avant le sable, végétation après.
- **Les plafonds** : `popCap` par espèce (doublé au plus par le boom du
  joueur), `Ecosystem.BUDGET` (800) pour tout l'aquarium — au-delà plus aucune
  ponte, et le Super Saïyen ramène l'équilibre.

### Équilibre (docs/ECOSYSTEME.md)

Six mécanismes tiennent l'aquarium **sans réglage espèce par espèce** :
plancton ambiant, report de prédation (`refugeFloor`, 35 %), disette,
recherche de partenaire, immigration, boom du joueur. Les toucher impose une
**simulation longue** (banc complet, plusieurs graines).

- **Un lien proie/prédateur doit pouvoir servir** : recouvrement ≥ 300 px en x
  ET ≥ 120 px en y, sprint du chasseur > fuite de la proie (`speed × 2`), et
  il doit apparaître dans l'audit. Un lien jamais utilisé est décoratif.
- **Une espèce ne doit pas être immangeable par accident** ; une nouvelle
  proie reçoit **un seul** nouveau prédateur.
- **La prédation se règle par le NOMBRE** (peuplement initial, plafond du
  prédateur), pas par `missChance`.
- **Une bande de profondeur fixe aussi la zone HORIZONTALE** ; elle ne
  commence jamais avant la barrière de rivage de l'espèce ; une espèce de fond
  doit couvrir tout le fond où elle vit.
- **Rien ne s'entasse** : pas de point unique (rayon de confort), pas de
  `clamp` commun (chacun sa distance), frayère répartie par `id`, œufs placés
  un par un.
- **Ce qui sort de `move()` sort de toutes ses contraintes** : phase aérienne,
  reptation, plafond de surface — chaque court-circuit doit réappliquer les
  barrières qui comptent.
- **Les colosses (`size ≥ 70`)** : barrière de rivage dure, 900 px d'eau, pas
  d'anti-chevauchement avec les petits mais séparation dure entre eux,
  hystérésis d'orientation, inclinaison bridée.

### Mise en scène (docs/ANIMATION.md)

- **Le visage raconte d'abord.** Toute silhouette passe par le visage commun
  (`FishBody.face`, `FishBody.oeil`, `FishBody.bouche`) ; une émotion se lit
  d'abord au sourcil. Une nouvelle émotion = une ligne de
  `FishBody.EMOTIONS` + EMOTIONS.md + legend.js.
- **Un gag est une ANIMATION** : phases, arrêt de la nage (`_freeze`),
  orientation forcée (`_faceAt`), expression dédiée, **une seule bulle** au
  moment clé.
- **Les canaux `_crispe`/`_etire`/`_smear` appartiennent aux gags**, jamais à
  la locomotion, et chaque phase les remet à zéro en sortant — une scène
  interrompue (crash, `dizzy`, fuite) doit se refermer elle-même.
- **Plier un dessin, c'est déformer sa GÉOMÉTRIE** (la colonne), jamais ses
  pixels.
- **Cadence** (`GAGS.CADENCE`, par minute pour TOUT l'aquarium, via
  `Ecosystem.cadence` ou `cadenceBanc`) : bruyant 0,3–0,5, scène 0,8–1,2,
  vivant 2–4. **Ce qui foisonne doit être silencieux, ce qui claque doit être
  rare.** Une grande scène attend d'être à l'écran (`GAGS._enVue`).
- **Budget** : ~250 bulles de BD/min ; les particules coûtent plus que les
  bulles — part d'effet par expression dans `Entity.VFX_GROUPE`.
- **Le son EST la bulle** (`Son.BULLES`) : une bulle de BD sonne, une
  particule jamais. Hors champ = silence, le gabarit donne la hauteur, un
  délai par type de son. Un nouveau son = une recette de `Son.R` + une ligne
  `Particles.son(nom, x, y, taille)` à l'instant clé ; le joueur en entend
  ~20 à 40 par minute, pas plus.
- **Inclinaison et miroir** : `_tilt` se calcule sur `|dirX|` et s'applique
  tel quel après `scale(-1, 1)`. Une créature fixe ne s'incline jamais.
- **Un poisson tourne, il ne recule pas, et ne disparaît jamais** en
  demi-tour (largeur minimale 0,34, volume conservé).

### Rendu (docs/RENDU.md, SPRITES.md)

- Un dessin remplace la **silhouette**, jamais le **visage**. Il est mis à la
  largeur que la simulation suppose (`size * 2 * spanRatio`).
- Un dessin doit savoir faire ce que la silhouette savait (variation
  individuelle, translucidité, lueur) **et porter les accessoires de gag**
  (`FishBody.gagsDuCorps`) — sinon le gag disparaît sans erreur.
- **L'imposteur** (`FishBody.corpsEnCache`) garde le corps en image ; le
  visage n'est jamais en cache. `?imposteur=0` le coupe.
- Le **décor coûte plus que les créatures** ; un `drawImage` étiré avec alpha
  coûte plus que le dégradé qu'il remplace.

## Mesurer

Rien de ce projet n'est réglé à l'œil : chaque règle ci-dessus vient d'une
mesure. Pièges connus :

- **Harnais de simulation** : `Main.fpsCap = 0.0001` gèle la boucle rAF ;
  avancer `Main.time += dt` puis `Food.update(dt)`, `Ecosystem.update(dt,
  Main.time)`, `Particles.update(dt)`. **Sans `t`, la simulation dérape** (et
  une sauvegarde peut graver des `NaN`). `Camera.isVisible = () => true` donne
  la borne haute des cadences.
- **Hasard semé** (`Math.random` remplacé par `addInitScript`) pour
  reproduire ; mais deux mondes semés divergent vite : comparer A/B **par
  blocs sur le même monde**, pas d'une graine à l'autre.
- **Compter par ligne d'appel** (envelopper `Particles.*`, lire la pile), pas
  par espèce. Pour les morts : instrumenter `Entity.prototype.die` ; pour les
  repas : `Ecosystem.eat`.
- **Mesurer le rendu par différence**, jamais en enveloppant un appel : le
  premier poste qui vide le pipeline Canvas porte le chapeau des autres.
- **Panneau d'aperçu** : masqué, il gèle rAF ET les transitions CSS ; une
  capture le réveille (la scène avance) ; le fronter peut redimensionner le
  canvas, donc l'effacer ; il ne sait pas enregistrer de service worker.
- **Un artefact qui croît avec le temps** (phase, accumulation) ne se voit
  qu'en avançant l'horloge — mesurer après dix minutes, pas après une seconde.
