# Les dessins des créatures

Comment un animal dessiné à la main entre dans le jeu, comment un animal du jeu
en ressort pour être redessiné, et où se règle tout ça. **Ce document décrit ce
qui est implémenté.**

Un seul outil : **[atelier.html](atelier.html)**, servi par le serveur de dev.

```
        ┌─────────────────── ATELIER ───────────────────┐
        │                                               │
  silhouette du jeu ──┐                                 │
  fichier .svg ───────┼──▶ ancres · nageoires · queue · points · visage
  fichier .json ──────┘                    │            │
                                           ▼            │
                       aperçu par le VRAI rendu du jeu  │
                                           │            │
        └───────────────────────────────────┼───────────┘
                                            ▼
                    Assets/<nom>.json  +  Assets/sprites.json
                                            │
                                            ▼
                                          le jeu
```

Ce qu'on voit dans l'atelier est dessiné par `FishBody.draw`, le code du jeu, pas
par une imitation. Une divergence serait un bug du jeu, pas une surprise à la
première mise en eau.

---

## 1. L'atelier

```bash
python dev_server.py 8642      # puis http://localhost:8642/atelier.html
```

**Le rail de gauche** liste les 27 espèces — il lit `SPECIES`, donc toute espèce
ajoutée au jeu y apparaît d'elle-même. Pastille verte = un dessin est actif,
orange = brouillon non enregistré, grise = silhouette procédurale. Une seconde
rubrique, **« dessins non rattachés »**, liste tout fichier présent dans
`Assets/` mais lié à aucune espèce (route `GET /api/sprites`) : sans elle, un
dessin enregistré puis désactivé devenait introuvable — il existait sur le disque
et nulle part dans l'outil. Ouvrir un tel dessin le met à l'échelle de l'espèce
dont il porte le nom, si elle existe.

**Trois entrées** :

| Bouton | Ce qu'il fait |
|---|---|
| Partir de la silhouette du jeu | rejoue la silhouette procédurale et la convertit en formes éditables — utilisable sur les 27 espèces, sans aucun outil externe |
| Importer un SVG… | n'importe quel dessin vectoriel (Illustrator, Inkscape, l'éditeur d'ancrages…) |
| Importer un JSON… | un document d'atelier déjà commencé |

**Cinq outils**, dans la barre :

- **Ancres** — `center` (le point que le jeu place à la position de la créature),
  `nose`, `tail`, et surtout `eye` / `mouth` qui portent le visage commun.
  L'ancre `eye` est un **cercle** dont on tire la poignée : son rayon donne la
  taille de l'œil. Chaque ancre a aussi ses **coordonnées en clair** : sur une
  petite tête, `center`, `nose`, `eye` et `mouth` tiennent dans quarante pixels
  et deviennent impossibles à viser à la souris. (Le clic prend d'ailleurs la
  croix la **plus proche**, pas la première de la liste, qui raflait tout.)
  Un bouton **passe à deux yeux** : le visage commun est de profil, ce qui va à un
  poisson vu de côté, mais tout ce qui se voit de face ou de dessus — crabe,
  raie, coquillage, poulpe — en veut deux. Le second est **symétrique du
  premier**, réglé par un simple **écartement** : une seule ancre à placer. Un
  bouton le libère si le dessin est asymétrique.
- **Nageoires** — clic pour en poser une. Le disque affiché est le **rayon
  d'influence** : la rotation s'y propage à plein au centre et s'éteint au bord.
  Un bouton la rend **symétrique** : un second ancrage apparaît en miroir de
  l'axe vertical du dessin (en pointillés), tournant en sens inverse. Un crabe,
  une raie, un poulpe ont des appendices des deux côtés — un seul ancrage n'en
  animait qu'une moitié.
- **Queue** — la ligne verticale `tailBlend`. Tout ce qui est à sa gauche ondule.
- **Points** — tirer les carrés retouche le contour ; clic sur le trait insère un
  point, <kbd>alt</kbd>+clic en supprime un.
- **Forme** — la forme entière : on la tire pour la déplacer, et les boutons
  l'agrandissent, la tournent, la retournent ou la dupliquent autour de son
  centre. Un miroir horizontal sert à faire la nageoire de l'autre côté :
  dupliquer, retourner, déplacer. **Les ancrages de nageoire suivent la forme**
  qu'ils visent, sinon le disque d'influence reste derrière et la nageoire se
  déforme autour du vide.

Plus, dans le panneau : un curseur d'**échelle** et un bouton **silhouette
d'origine**, qui superpose en gris la silhouette procédurale que le dessin
remplace. C'est le repère pour juger d'une taille — surtout sur un dessin importé
sans échelle déclarée, où le jeu suppose un poisson allongé.

<kbd>Ctrl</kbd>+<kbd>Z</kbd> annule, partout — **la sélection fait partie de
l'instantané**, sinon annuler une duplication laisse la forme active sur un
indice qui a changé de sens, et on croit tirer une nageoire en en déplaçant une
autre. Molette pour zoomer, glissé du fond pour déplacer la vue.

**Le bandeau du bas** montre le dessin sous sept humeurs. Une calibration juste
doit tenir sur toutes : `sleeping` (bouche du ronflement) et `angry` (sourcil
lourd) sont les deux qui débordent en premier d'une tête trop petite.

**L'enregistrement préserve les champs qu'il ne comprend pas.** L'atelier repart
du document d'origine et ne surcharge que ce qu'il connaît. Reconstruire un objet
neuf champ par champ jetait silencieusement le reste : `SharkSVG.json` a perdu
son `sourceRaw` — le SVG d'origine de l'éditeur, 2,8 ko — au premier
enregistrement. Un outil d'édition ne doit jamais supprimer ce qu'il ne
comprend pas.

**Enregistrer** écrit `Assets/<nom>.json`. **Activer dans le jeu** ajoute
l'entrée au manifeste. **Revenir au procédural** retire l'entrée **sans effacer
le fichier** : c'est ce qu'on fait pour les espèces dont la silhouette actuelle
convient déjà, comme la murène.

---

## 2. Comment l'écriture sur le disque fonctionne

Une page web ne peut pas écrire dans le dépôt. Sans ça, chaque essai de réglage
demanderait de télécharger un fichier puis de le déplacer à la main — autant dire
qu'on ne règle rien.

`dev_server.py` expose donc deux routes, volontairement minuscules :

```
POST /api/sprite/<nom>   corps = JSON   ->  Assets/<nom>.json
POST /api/manifeste      corps = JSON   ->  Assets/sprites.json
```

Garde-fous : serveur lié à **127.0.0.1** uniquement, écriture cantonnée à
`Assets/`, noms restreints à `[A-Za-z0-9_-]`, corps refusé s'il n'est pas du JSON
valide ou dépasse 4 Mo, **écriture atomique** (fichier temporaire puis
remplacement — le jeu relit ces fichiers en continu et ne doit jamais tomber sur
un JSON tronqué). C'est un outil de développement local : ne pas l'exposer.

Le serveur est aussi passé en **multi-thread**. En mono-thread, le navigateur
gardait des connexions ouvertes sur la page et mettait tout le reste en file : un
simple `curl` depuis un terminal attendait plusieurs minutes.

### Le manifeste

`Assets/sprites.json` associe une espèce à son dessin :

```json
{ "requin": "SharkSVG" }
```

C'est lui qui permet d'**activer** un dessin depuis l'atelier sans toucher au
code — une page web ne peut pas modifier `species.js`, et lui faire réécrire du
source serait de toute façon une mauvaise idée. Le champ `sprite:` d'une fiche
d'espèce reste lu : le manifeste ne fait que le compléter ou l'annuler.

---

## 3. Ce que le jeu lit dans un document

| Champ | Rôle | Si absent |
|---|---|---|
| `naturalW`, `naturalH` | dimensions du dessin | la boîte des points fait foi |
| `echelle`, `tailleJeu` | **échelle déclarée** : une unité de dessin vaut `echelle` unités de jeu, pour une créature de taille `tailleJeu` | règle du poisson allongé (ci-dessous) |
| `spriteScale` | rattrapage d'échelle du document | `def.spriteScale`, puis 1 |
| `points.center` | **origine de la créature** : le point posé à `(entity.x, entity.y)` | centre de la boîte |
| `points.eye` | ancre de l'œil (et du sourcil, de la joue) | pas de visage |
| `points.eye.ecart` | **deuxième œil**, symétrique du premier et décalé vers la queue | un seul œil |
| `points.eye2` | deuxième œil **placé librement** (tête tournée, dessin asymétrique) | dérivé de `ecart` |
| `points.eye.r` | **taille de l'œil, en unités du dessin** — la calibration à préférer | on passe à `faceK` |
| `points.mouth` | ancre de la bouche, **honorée séparément** | bouche à sa place par défaut |
| `points.nose`, `points.tail` | repères de l'atelier | ignorés par le jeu |
| `shapes[].points` | contour, `[[x,y], …]` | — |
| `shapes[].fill` | couleur pleine, ou `null` pour un tracé au trait seul | gris |
| `shapes[].stroke`, `.lineWidth` | **trait** — tentacule, antenne, patte | pas de trait |
| `shapes[].ferme` | contour refermé (`false` pour un trait ouvert) | fermé |
| `shapes[].smooth` | contour lissé plutôt qu'en ligne brisée | lignes droites |
| `shapes[].pivot` | rotation en bloc — **repli** quand aucun `fins[]` ne vise la forme | elle ondule |
| `shapes[].amp` | amplitude d'animation, en degrés pour une nageoire | 15 |
| `fins[]` | `{x, y, r, layerIndex, miroir}` : ancrage de nageoire, rayon d'influence, et **symétrie** | pas de nageoire animée |
| `tailBlend` | x en deçà duquel les points appartiennent à la queue | rien n'ondule |
| `faceK`, `faceTx`, `faceTy` | calibration en multiples de `size` (repli) | `def.spriteFace`, puis 0,75 |

### Les cinq règles du rendu

0. **Un œil ou deux, sans code de rendu supplémentaire.** Le second se dessine
   en reposant le MÊME visage à sa propre ancre : sourcil, joue et clignement
   suivent tout seuls, et les deux yeux battent ensemble parce que le clignement
   ne dépend que de la taille et du temps. Chacun peut avoir son rayon, pour une
   tête légèrement tournée.
1. **Les deux ancres du visage sont honorées séparément.** Caler le seul œil et
   laisser la bouche à sa place par défaut ne marche pas : le visage commun met
   la bouche en avant et à peine plus bas que l'œil, alors que le requin de
   l'éditeur l'a presque à la verticale. Elle atterrissait 4 px trop en avant,
   **sur le museau**. D'où `FishBody.bouche()`, extraite de `drawFace` — même
   rôle que `FishBody.oeil()` pour l'œil isolé du crabe.
2. **L'échelle vient du document quand il la déclare.** `SVGExport` écrit
   `echelle` et `tailleJeu` dans la métadonnée : le jeu sait alors exactement à
   quelle taille dessiner. À défaut — un dessin fait à la main — il retombe sur
   une règle mesurée : une silhouette procédurale occupe ~2,5 fois `size` en
   longueur (99 px relevés sur un requin de 40). **Cette règle suppose un poisson
   allongé** et se trompe lourdement sur tout ce qui est vertical : au relevé sur
   les 27 espèces, l'hippocampe ressortait **83 %** trop grand et le poisson-lune
   29 %. C'est à ça que sert `spriteScale`, qui rattrape **sans toucher à
   l'emprise physique** (`spanRatio`, que lisent l'anti-chevauchement des
   colosses et les distances de prise).
3. **La taille du visage** vient de `points.eye.r` (converti par le 0,22 de
   `drawFace`), sinon de `faceK`, sinon de `def.spriteFace`, sinon de **0,75 ×
   `size`**. À 1 — la valeur des silhouettes procédurales — l'œil débordait du
   museau du requin, dont la tête est plus fine.
4. **La queue ondule** : les points en deçà de `tailBlend` sont déviés en `u²` —
   le battement part du pédoncule caudal, pas du milieu du corps, sinon le
   poisson se tortille comme une chenille. L'amplitude suit **l'effort** et pas
   seulement la fréquence : à l'amplitude nue, le bout de la queue ne parcourait
   que 5,5 px sur une silhouette de 48.
5. **Une nageoire n'est pas un calque qu'on fait tourner en bloc.** Chaque point
   pivote autour de l'ancre, pondéré par sa distance : plein effet au centre, nul
   au-delà du rayon `r`, lissage en S entre les deux — c'est ce qui évite la
   couture au raccord avec le corps. En **symétrique** (`miroir`), un second
   ancrage agit à l'image du premier par rapport à l'axe vertical, **en sens
   inverse** : sans l'inversion les deux côtés partiraient du même côté au lieu
   de battre comme une paire de pattes. Relevé sur le crabe : un point à +55 px
   du centre se déplace de −3,04, son symétrique de +3,04.
6. **La chorégraphie d'une espèce n'appartient pas à sa silhouette.** La danse du
   Crabe Disco et son défilé de couleurs vivaient dans `drawCrab` : lui donner un
   dessin les faisait disparaître. `FishBody.choregraphie()` les applique
   maintenant AUTOUR du corps, quel qu'il soit — le défilé de couleurs par une
   rotation de teinte, qui marche sur un aplat procédural comme sur un dessin à
   dix couleurs (repeindre chaque forme écraserait un dessin fait main).
   Vérifié : rebond et changement de teinte présents dans les deux modes.

---

## 4. Sortir un animal du jeu (`js/svgexport.js`)

L'atelier s'en sert pour le bouton « partir de la silhouette », mais il reste
utilisable seul, depuis la console du jeu :

```js
SVGExport.telecharger('requin')   // un fichier requin.svg
SVGExport.tout()                  // les 27, à ~350 ms d'intervalle
```

Le module rejoue la silhouette dans un **faux contexte 2D qui enregistre au lieu
de peindre** : il implémente le sous-ensemble de Canvas2D qu'utilisent les
silhouettes et applique la matrice courante **aux points au moment où ils sont
enregistrés**. Le SVG produit n'a donc aucune transformation imbriquée : un
`<path>` par coup de pinceau, en coordonnées absolues. Les arcs sont convertis en
**cubiques** (découpe à 90°, formule exacte des tangentes) — un échantillonnage
en polyligne donnerait des contours facettés, inexploitables dans un éditeur.

**Le visage n'est pas exporté**, volontairement : le jeu le redessine par-dessus.
Ses ancres sont relevées au vol et écrites dans `<metadata>`. **Trois** points
d'entrée à intercepter, pas un : `drawFace` (visage groupé), `oeil` (yeux isolés
du crabe et du coquillage) et `bouche` (bouche sur sa propre ancre). Il en
manquait un à chaque fois qu'on croyait avoir fini.

Non exportés non plus, faute d'équivalent : les lueurs (`shadowBlur`) et les
découpes (`clip`).

## 5. Faire entrer un dessin (`js/svgimport.js`)

L'échantillonnage passe par le **navigateur** (`getPointAtLength`) plutôt que par
un analyseur de chemin maison : arcs elliptiques, courbes lisses, coordonnées
relatives, `<circle>`, `<rect>`, `<g transform>`… tout est déjà géré, et il n'y a
rien à maintenir. Les points sont ensuite réduits (**Douglas-Peucker**) : sans ça
on obtient 200 points par contour, illisibles à éditer et inutilement chers à
dessiner soixante fois par seconde.

**Les tracés au trait comptent autant que les remplissages.** Les tentacules
d'une méduse, les bras d'un poulpe, les antennes d'une crevette sont des
`stroke`. En ne gardant que les formes remplies, la méduse perdait la moitié de
sa hauteur et le poulpe un tiers de sa largeur. Un trait garde sa couleur, son
épaisseur, ses bouts ronds, et **ne se referme pas** — le boucler dessinerait une
corde en travers de la créature.

Mesuré sur un vrai dessin fait main (`Assets/clownfish.svg`, 17 ko) : **10
formes, 430 points, 255 ms**, couleurs conservées.

### Contrôle sur les 27 espèces

Reprise de la silhouette, rendu hors écran, comparaison de l'emprise de l'encre
avec la silhouette procédurale, **au même instant d'animation** (sinon on compare
deux positions de nageoires et tout paraît faux). Résultat : **19 des 27 à moins
de 12 %** d'écart. Les huit restantes le sont pour une raison connue et voulue —
le visage commun est plus grand que les petits yeux dessinés à la main du
coquillage, du crabe ou du poisson-clown. C'est le curseur de taille d'œil de
l'atelier qui tranche, espèce par espèce.

Les ancres manquantes reçoivent des valeurs de départ (le dessin regarde vers la
**droite**, comme toutes les silhouettes du jeu), et le rayon de l'œil est
**déduit** : le quart de la hauteur du corps à l'aplomb de l'ancre. Tête fine →
petit œil, grosse tête → gros œil. Sur le requin, la déduction tombe à 2 % de la
valeur calée à la main : l'artiste n'a en général rien à toucher.

---

## 6. Contrôle non visuel

Comparer l'emprise d'un sprite et de la silhouette qu'il remplace sans se fier à
l'œil ni à une capture (le compositeur du navigateur retarde souvent d'une
frame) : rendre les deux hors écran et mesurer l'encre.

```js
function mesure(e, avecSprite) {
  const c = document.createElement('canvas'); c.width = 700; c.height = 400;
  const g = c.getContext('2d'); g.translate(350, 200);
  const def = e.def, sv = def.sprite;
  if (!avecSprite) delete def.sprite;
  FishBody.draw(g, e, 1.0);
  def.sprite = sv;
  // … balayer getImageData et relever la boîte des pixels d'alpha > 20
}
```

Relevé après calibrage : requin de 45 → sprite **111 × 49**, procédural
**112 × 63**. Longueur alignée ; la hauteur reste moindre parce que le dessin est
plus fin que l'ellipse procédurale, ce qui est le but.

---

## 7. Écarts avec la note de recherche initiale

Une note antérieure proposait une architecture ; deux de ses quatre décisions ont
été tranchées autrement une fois le format réel sous les yeux.

| Note initiale | Retenu | Pourquoi |
|---|---|---|
| Pas d'image, du vectoriel | **oui** | un dessin reste de la donnée, comme une fiche `SPECIES` |
| Un fichier = une espèce | **oui**, mais par un manifeste | `sprite: '<NomDeFichier>'` plutôt que `render: 'sprite'` + `spriteId` : `render` continue de désigner la silhouette de repli |
| Coordonnées en fractions de `size` | **non** | les dessins arrivent en **pixels natifs** ; la mise à l'échelle se fait au rendu |
| Préchargement bloquant avant `Main.init()` | **non** | `fetch` en tâche de fond : le jeu démarre immédiatement et une espèce sans dessin garde sa silhouette |

`faceK` / `faceTx` / `faceTy` venaient aussi de cette note, qui les disait
exportés par un panneau de l'éditeur. Ils n'existaient nulle part. Ils sont
maintenant implémentés **en repli** de `points.eye.r`, plus direct à régler.

---

## 8. Ce qui manque encore

- **Un dessin par espèce.** Seul le requin en a un. Les 26 autres s'ouvrent dans
  l'atelier en un clic (« partir de la silhouette du jeu »), et certaines n'en
  ont sans doute pas besoin.
- **Le miroir.** Un dessin est fait tourné vers la droite ; le jeu le retourne
  par `scale(-1, 1)` avec le demi-tour animé. Un dessin asymétrique (une tache
  sur un seul flanc) se retrouvera donc de l'autre côté la moitié du temps.
- **Les créatures posées au sol** (crabe, étoile, coquillage, ver, anémone,
  murène) pivotent avec la pente du fond : leur dessin doit être fait
  **horizontal**, pas incliné.
- **Le dessin à main levée.** L'atelier retouche un contour point par point mais
  ne remplace pas un outil de tracé : pour créer une forme de zéro, dessiner
  ailleurs et importer le SVG.
