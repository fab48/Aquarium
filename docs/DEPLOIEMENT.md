# Stack et déploiement

La pile technique, les deux versions publiables (`build.py` et `build.py --inline`), la PWA, GitHub Pages, les releases et le serveur de dev.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

## Stack

HTML5 pur : Canvas 2D, zéro dépendance, zéro build. Scripts classiques (pas de
modules ES). `js/boot.js` charge tous les fichiers **dans l'ordre de sa liste**
— ajouter un fichier js implique de l'ajouter là, pas à `index.html`. C'est la
seule source de vérité de cette liste : `build.py` la lit plutôt que de la
recopier.

`?v=<timestamp>` est **l'anti-cache, et seulement en local** : il garantit qu'un
F5 après modification recharge vraiment le code. En ligne, ce même timestamp
change à chaque visite — 820 ko de JS retéléchargés à chaque fois, jamais rien
en cache. Hors localhost, `boot.js` charge donc l'URL nue et laisse l'ETag du
serveur faire son travail.

Piège de lecture au passage : `s.async = false` ne sérialise que
l'**exécution**. Les 23 fichiers se téléchargent en parallèle — le coût en ligne
n'est pas 23 allers-retours, mais un seul de plus (le navigateur ne découvre la
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

- **Le cache.** Les 23 scripts deviennent un `aquarium.<empreinte>.js`
  (820 ko, 267 ko gzippés — mesuré le 20 octobre 2026) que l'hébergeur peut servir en `immutable`. L'empreinte
  est un hash du contenu : une nouvelle version change de nom et s'impose d'elle-
  même, il n'y a **aucun numéro de version à penser à incrémenter**. C'est
  précisément le piège qu'on évite en ne mettant pas une constante `VERSION`
  dans `boot.js`.
- **Ce qu'on publie.** Le dépôt pèse 13 Mo hors historique git, le jeu 1,36 Mo dont
  500 ko de dessins. Planches de concept,
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
`dist/index.html` (1,34 Mo, 423 ko gzippés) qui s'ouvre d'un double-clic. Les
dessins y sont **embarqués** (`Sprites.PRECHARGE`, lu par `Sprites.init` avant
tout `fetch`) : sans ça, `file://` bloque `fetch` par CORS et le fichier perdrait
tous ses sprites **en silence**, en rendant des silhouettes procédurales.
Vérifié : un seul GET, zéro requête vers `Assets/`.

C'est ce fichier que publient les **releases GitHub** :
`.github/workflows/release.yml` construit en `--inline` et joint
`Aquarium-Vivant.html` à la release, avec le texte de
`.github/release-notes.md`. On le lance depuis l'onglet Actions (« Run
workflow », avec le numéro de version) ou en poussant une étiquette `v*`
(`git tag v1.1.0 && git push origin v1.1.0`) ; une release déjà créée à la
main reçoit simplement le fichier.

La version **en ligne** est le `dist/` du mode normal, PWA comprise, publié sur
**GitHub Pages** (https://fab48.github.io/Aquarium/) par
`.github/workflows/pages.yml` à chaque push sur master. Tous ses chemins sont
relatifs, il tourne donc tel quel sous le sous-dossier `/Aquarium/` — vérifié
servi sous ce chemin : 53 dessins sur 53, service worker à la bonne portée,
rechargement hors ligne complet. Toute URL absolue (`/Assets/…`) ajoutée un
jour casserait la version en ligne seulement. C'est la seule façon de jouer sans serveur : le
`index.html` du dépôt, ouvert d'un double-clic depuis un ZIP téléchargé, n'a
**aucun** dessin (0 sur 53 mesuré, contre 53 sur 53 pour le fichier unique).

Rien de tout cela n'entre dans le flux de dev — `build.py` ne sert qu'au
déploiement, et `index.html`, `boot.js` et l'atelier fonctionnent comme avant.

Lancer avec `python dev_server.py 8642` (config `.claude/launch.json`) — un
`http.server` multi-thread qui envoie `Cache-Control: no-store`, et qui expose en
plus deux routes d'écriture dans `Assets/` pour l'atelier des créatures
(cf. [SPRITES.md](../SPRITES.md) §2). Le port peut venir de la variable `PORT`
(plusieurs sessions sur le même dépôt : à port fixe, la seconde ne démarre pas),
et `--accueil atelier.html` met l'atelier à la racine — **un panneau d'aperçu ne
sait ouvrir qu'une origine, jamais un chemin**, donc c'est la seule façon qu'il
affiche autre chose que le jeu.
