# Les dessins des créatures

Comment un animal dessiné à la main entre dans le jeu, comment un animal du jeu
en ressort pour être redessiné, et où se règle tout ça. **Ce document décrit ce
qui est implémenté.**

Un seul outil : **[atelier.html](atelier.html)**, servi par le serveur de dev.

```
        ┌─────────────────── ATELIER ───────────────────┐
        │                                               │
  silhouette du jeu ──┐                                 │
  fichier .svg ───────┼──▶ ancres · appendices · queue · calques · visage
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

**Le rail de gauche** liste les 51 espèces — il lit `SPECIES`, donc toute espèce
ajoutée au jeu y apparaît d'elle-même. Un 🎨 signale les 30 qui ont leur dessin
dans la planche de design (§1 bis). Pastille verte = un dessin est actif,
orange = brouillon non enregistré, grise = silhouette procédurale.

Il ne les liste plus dans l'ordre de `SPECIES`, qui ne dit rien de
l'avancement : elles sont **rangées par état**, en cinq rubriques comptées —
*dessin actif*, *brouillons*, *planche du design disponible*, **sans dessin de
référence**, et *dessins non rattachés*. La quatrième est la plus utile : c'est
la liste, tenue à jour toute seule, des espèces qui n'ont encore rien. On la
cherchait jusqu'ici à l'œil, une espèce après l'autre.

Un **filtre** coupe la liste dès qu'on sait ce qu'on cherche (nom rigolo, nom
latin ou identifiant) : à 51 espèces réparties en cinq rubriques, taper
« murène » coûte moins cher que de la repérer.

La rubrique **« dessins non rattachés »** liste tout fichier présent dans
`Assets/` mais lié à aucune espèce (route `GET /api/sprites`) : sans elle, un
dessin enregistré puis désactivé devenait introuvable — il existait sur le disque
et nulle part dans l'outil. Ouvrir un tel dessin le met à l'échelle de l'espèce
dont il porte le nom, si elle existe.

**Quatre entrées** :

| Bouton | Ce qu'il fait |
|---|---|
| Nouveau dessin | document vide, pour dessiner de zéro |
| Partir de la silhouette du jeu | rejoue la silhouette procédurale et la convertit en formes éditables — utilisable sur les 51 espèces, sans aucun outil externe |
| Importer un SVG… | n'importe quel dessin vectoriel (Illustrator, Inkscape, le poseur d'ancrages) |
| Importer un JSON… | un document d'atelier déjà commencé |

Plus un **calque de repérage** : une image posée sous le dessin, à opacité
réglable, pour redessiner par-dessus un rendu généré ailleurs. Une image choisie
au disque est **embarquée** dans le document — le fichier reste autonome, on
reprend le travail sans avoir à retrouver l'image — mais elle l'alourdit (56 ko
pour un PNG de 410×200), donc à retirer avant l'enregistrement final. La planche
du design, elle, est **référencée par son chemin** (§1 bis).

---

## 1 bis. La planche du design, posée toute seule

`Assets/Concepts/Design Final.png` réunit les **30 créatures dessinées** du
projet, en cinq colonnes de six, chacune avec sa légende. `decoupe_planche.py`
en tire **une image par espèce** :

```bash
python decoupe_planche.py          # -> Assets/Reperes/<espèce>.png + index.json
```

Ce n'est pas une grille aveugle. Dans chaque case, on garde la **plus grosse
composante connexe** et ce qui la touche : ça écarte d'un coup la légende et le
bout de dessin de la case d'à côté, qui débordent tous les deux des lignes de la
grille. Trois règles s'y sont ajoutées, chacune pour un cas rencontré :

- **Les glyphes se retirent en premier.** La légende de l'étoile touchait un de
  ses bras : dilatée, elle entrait dans la composante du dessin et plus aucun
  filtre postérieur ne pouvait l'en sortir. Une lettre est petite, sombre et
  grise — ça suffit à la reconnaître une par une, avant tout le reste.
- **Un ventre blanc n'est pas du fond.** Le détourage part du blanc de la
  planche ; le pélican et la baleine, presque blancs, ressortaient troués. Le
  masque est rebouché par l'intérieur du contour.
- **Le sens du dessin vient d'une table, pas d'une détection.** Le jeu dessine
  tout vers la **droite** (`Entity.orientation` s'occupe du demi-tour), or 17 des
  30 vignettes regardent à gauche : elles servaient de patron à l'envers. Lire le
  sens sur la position de l'œil se trompait **8 fois sur 30** — un ventre blanc
  passe pour un œil, une créature vue de face n'a pas de sens. Sur un asset figé
  de trente images, la table (`VERS_LA_GAUCHE`) est plus sûre et se vérifie d'un
  coup d'œil. Le retournement est **cuit dans le PNG**, pas laissé à l'outil.

Dans l'atelier, la planche **se pose toute seule** : à l'ouverture d'une espèce,
sur « Nouveau dessin », sur « Partir de la silhouette » et sur un import. Sur un
document vide elle donne sa taille à la surface de travail (on trace dedans) ;
sur un dessin existant elle est **calée** dessus — même largeur, même centre.
Une espèce sans dessin l'affiche quand même en grand : c'est ce qu'on vient
regarder avant de décider de dessiner.

Le panneau la règle : opacité, échelle, x/y, « caler sur le dessin »,
« ↔ retourner » (les créatures vues de face n'ont pas de sens) et surtout
**« passer dessus »** — sous le dessin on calque, par-dessus on compare. Sans ce
bouton, une espèce reprise de sa silhouette recouvre entièrement sa référence
d'un corps opaque et il n'y a plus rien à comparer.

Elle **ne s'enregistre pas** dans le document : elle appartient au dépôt, elle
est reposée toute seule à l'ouverture, et la recopier en base64 dans trente
fichiers coûterait 1 Mo pour rien.

**Sept outils**, dans la barre :

- **Ancres** — `center` (le point que le jeu place à la position de la créature),
  `nose`, `tail`, et surtout `eye` / `mouth` qui portent le visage commun.
  Chaque ancre a aussi ses **coordonnées en clair** : sur une
  petite tête, `center`, `nose`, `eye` et `mouth` tiennent dans quarante pixels
  et deviennent impossibles à viser à la souris. (Le clic prend d'ailleurs la
  croix la **plus proche**, pas la première de la liste, qui raflait tout.)
  Un bouton **passe à deux yeux** : le visage commun est de profil, ce qui va à un
  poisson vu de côté, mais tout ce qui se voit de face ou de dessus — crabe,
  raie, coquillage, poulpe — en veut deux. Le second est **symétrique du
  premier**, réglé par un simple **écartement** : une seule ancre à placer. Un
  bouton le libère si le dessin est asymétrique.
  Trois **gabarits** replacent tout d'un coup : *Poisson* (un œil, bouche au
  museau, queue active), *De face* et *Rampant* (deux yeux, **bouche au milieu**,
  et pour le dernier **pas de queue**). Les valeurs par défaut supposaient un
  poisson vu de profil ; sur un crabe elles étaient fausses sur les trois points
  à la fois — bouche posée sur une pince, un seul œil, un tiers de la carapace
  qui ondulait.
- **🙂 Visage** — tout ce qui concerne le visage commun, qui était jusqu'ici
  éparpillé (la taille de l'œil au milieu des ancres) ou inexistant (sa forme,
  ses couleurs). C'est pourtant le seul élément que les 51 espèces partagent.
  Trois réglages :
  - **taille** de l'œil et de la bouche. L'ancre `eye` est un **cercle** dont on
    tire la poignée ; la bouche a le sien, qui la règle **indépendamment** —
    elle en était déduite, ce qui va sur un visage de dessin animé standard mais
    pas sur une gueule de requin ou un bec d'oiseau. Tant qu'on n'y touche pas,
    elle continue de suivre l'œil, pour ne pas déplacer un dessin déjà calé. Les
    deux poignées restent saisissables sur le dessin, dans cet outil comme dans
    « Ancres ».
  - **forme de la bouche** (`boucheStyle`) : *standard*, *grande*, *petite*,
    *gueule à dents*, *bec*, *ventouse*. Ce que la bouche **exprime** reste
    piloté par les émotions, communes à tout l'aquarium ; ce réglage dit à quoi
    elle **ressemble**. Tout le monde avait la même petite bouche de dessin
    animé, becs et gueules comprises.
  - **couleurs du visage** (`visage`) : trait, sourcil, pupille, blanc de l'œil,
    intérieur de bouche, langue, lèvres, dents, bec. Chacune revient à la valeur
    commune d'un clic sur ↺. Le visage étant dessiné **par-dessus** le dessin,
    repeindre le calque ne changeait rien : c'était la seule façon d'avoir une
    pupille dorée ou un bec orange.
- **Appendices** — nageoire, patte, antenne, bras. Clic dans le vide pour en
  poser un. **Deux types**, parce que ce sont deux gestes différents :
  - **nageoire** — la forme *pivote* autour de l'ancre. Le disque affiché est le
    **rayon d'influence** : plein effet au centre, plus rien au bord.
  - **tentacule** — une **onde court** de l'ancre vers la pointe de la flèche :
    la base ne bouge pas, le bout parcourt toute l'amplitude. C'est ce qu'il faut
    pour une patte de crabe ou un bras de poulpe — un pivot les rend raides,
    articulés sur une seule charnière. La pointe de la flèche se tire : elle
    règle direction et longueur d'un seul geste. Le curseur *ondes* dit si le
    membre se balance d'un bloc (0) ou se déroule (1).

  Communs aux deux : **symétrie** (un second ancrage en miroir de l'axe vertical,
  en pointillés, jouant en sens inverse — un crabe, une raie, un poulpe ont des
  appendices des deux côtés), **amplitude**, et surtout **déphasage** et
  **vitesse** propres à chaque appendice : sans eux les huit pattes d'un crabe
  battent toutes ensemble, ce qui se lit comme un tressaillement et pas comme une
  marche. Enfin, un appendice entraîne **plusieurs formes** (cases à cocher) :
  une patte dessinée en trois pièces bat alors d'un seul geste, sans déchirure au
  raccord.
- **Queue** — la ligne verticale `tailBlend` : tout ce qui est à sa gauche ondule.
  Un bouton **« cette créature n'a pas de queue »** la coupe entièrement (le
  réglage est conservé, décocher le rend tel quel) : un crabe, une étoile, un
  coquillage n'ont rien à faire onduler, et la valeur par défaut faisait tortiller
  un tiers du crabe. Un curseur **ondes le long du corps** fait *courir* l'onde
  vers le bout au lieu de battre d'un seul tenant : c'est une murène ou une
  anguille, dont le corps entier est un tentacule. Et la liste **formes qui
  ondulent** restreint la déformation quand un élément doit rester rigide — une
  carapace, un coquillage porté sur le dos.
- **Points** — tirer les carrés retouche le contour ; clic sur le trait insère un
  point, <kbd>alt</kbd>+clic en supprime un. **Un clic dans un autre calque le
  sélectionne** : c'était le seul moyen manquant pour reprendre un dessin
  existant, il fallait deviner son rang dans la liste.
- **✏️ Dessiner** — poser les sommets d'un polygone au clic. Double-clic,
  <kbd>Entrée</kbd> ou un clic sur le premier sommet ferment la forme ;
  <kbd>retour arrière</kbd> retire le dernier point, <kbd>Échap</kbd> abandonne.
  Couleur et **contour lissé** se choisissent avant, et se rechangent après dans
  la liste des formes. Pas de poignées de Bézier : le lissage passe par les
  milieux de segments, comme dans le jeu — ce qu'on trace est donc exactement ce
  qui sera rendu.
- **Calque** — la forme entière : on la tire pour la déplacer, et les boutons
  l'agrandissent, la tournent, la retournent ou la dupliquent autour de son
  centre. Cliquer n'importe quel calque le sélectionne (le calque actif garde la
  priorité, sinon celui du dessus lui volerait le clic). Un miroir horizontal
  sert à faire la nageoire de l'autre côté : dupliquer, retourner, déplacer.
  **Les ancrages suivent la forme** qu'ils visent, sinon le disque d'influence
  reste derrière et la nageoire se déforme autour du vide.

Les sept outils ont un raccourci, <kbd>1</kbd> à <kbd>7</kbd> dans l'ordre de la
barre.

### Aplatir des calques

Dans la liste des formes, chaque ligne a une **case à cocher** ; **Aplatir**
réunit les formes cochées en un **groupe**.

Aplatir ne fond **pas** les tracés — un corps et sa rayure n'ont pas la même
couleur, les souder ferait perdre le dessin. Ce que ça déclare, c'est que ces
calques n'en font plus qu'un du point de vue de l'**animation** et des **gestes** :
ils se déplacent, tournent et se retournent ensemble, et un seul appendice les
entraîne tous (bouton *tout le groupe*). C'est ce qu'il faut pour un corps peint
en plusieurs couches, et pour une patte dessinée en trois pièces.

Le contour du groupe est tracé en pointillés sur le dessin (plein pour le calque
actif), et la liste indique par un `🖐n` combien d'appendices animent chaque
forme, plus un pictogramme par réglage d'apparence (`▨` dégradé, `◌` contour,
`✦` luminescence, `🎲` couleur par individu).

### L'apparence d'un calque

Un calque n'était qu'un contour et **une couleur unie**. Les silhouettes
procédurales, elles, savaient déjà faire mieux : chaque individu tire sa teinte
dans `def.colors` (`Entity.color`), une méduse est translucide, un
poisson-lanterne s'allume la nuit. Un dessin fait main perdait tout ça — quarante
confettis dessinés sortaient du même moule là où le banc procédural chatoie.

La section **Apparence de la forme** rend au dessin ce que la silhouette avait :

| Réglage | Champ | À quoi ça sert |
|---|---|---|
| Remplissage · trait seul | `fill` (`null` = trait seul) | un tentacule, une antenne, une moustache |
| Contour ouvert | `ferme: false` | ne pas refermer un trait, ce qui dessinerait une corde en travers |
| Dégradé | `degrade` | le ventre plus clair que le dos, en un réglage plutôt qu'en deux calques |
| Contour | `stroke` + `lineWidth` | le liseré d'une forme pleine, ou le trait seul |
| Opacité | `alpha` | une méduse, une nageoire voile |
| Luminescence | `lueur` | la lampe du poisson-lanterne, une tache bioluminescente |
| Couleur par individu | `couleur` | **le banc qui chatoie** |

Deux points qui ne vont pas de soi :

- **Le dégradé part de la couleur de la forme**, pas d'une couleur fixe. Un
  dégradé à deux couleurs déclarées annulerait la variation individuelle — c'est
  précisément ce qu'on vient de gagner. Le second arrêt vaut par défaut la même
  couleur assombrie de 35 %.
- **La couleur par individu a cinq modes** : *fixe*, *couleur de l'individu*
  (celle qu'il a tirée dans `def.colors` — un bouton reprend la palette de
  l'espèce d'un clic, la recopier à la main revient à se tromper d'une nuance),
  *sa version foncée* (`Entity.colorDark`), *tirage dans une palette propre à la
  forme*, et *teinte décalée au hasard* de ±N°. Tous **déterministes** : la
  couleur est tirée de l'identifiant de l'individu, donc elle ne change ni d'une
  frame à l'autre ni au cours de sa vie, et elle est mise en cache comme
  `Entity.color` l'est déjà.

La luminescence pose le **halo en cache** de `FishBody.halo`, pas un
`shadowBlur` : celui-ci travaille en pixels écran, il grossirait donc sur un
petit poisson vu de loin, en plus de coûter cher. Deux corrections mesurées : le
halo doit **déborder** de la forme (centré dessus à sa propre taille, il restait
entièrement caché derrière elle — les silhouettes le tirent déjà à ~1,7 fois la
taille de la créature), et il doit savoir lire une couleur `rgb(…)` et pas
seulement `#rrggbb`, sinon une teinte tirée au sort ressort en halo **blanc**.

Plus, dans le panneau : un curseur d'**échelle**, un bouton **silhouette
d'origine**, qui superpose en gris la silhouette procédurale que le dessin
remplace (le repère pour juger d'une taille — surtout sur un dessin importé sans
échelle déclarée, où le jeu suppose un poisson allongé), et un bouton **🌙 nuit**
qui force `Main.nightAmount()` à 1 : le faux `Main` de la page répond « plein
jour », donc sans lui une luminescence ne se voit **jamais** dans l'atelier.

### Le panneau, rangé

Il montrait **tout, tout le temps**, d'un seul tenant : pour changer la couleur
d'un calque il fallait défiler devant les ancres, la queue, l'échelle et
l'enregistrement, et rien ne disait sur quoi l'outil courant agissait. Trois
règles :

1. le haut du panneau appartient à l'**outil sélectionné**, et il l'annonce
   (pictogramme, nom, une ligne de « ce que ça fait ») ;
2. tout le reste est en sections **repliables** — *Formes*, *Apparence de la
   forme*, *Taille & aperçu*, *Calque de repérage*, *Enregistrer* — qui se
   souviennent de leur état d'une session à l'autre. Il fallait le retenir hors
   du DOM : le panneau est reconstruit à chaque geste, une section ouverte se
   serait refermée au premier mouvement de curseur ;
3. les explications sont un **calque** (bouton 💡). Elles occupaient les deux
   tiers de la colonne, ce qui est bien la première fois et jamais après.

Les sections s'ouvrent par défaut selon l'outil : *Formes* et *Apparence* avec
Calque, Points et Dessiner ; *Formes* seule avec Appendices et Queue ; aucune
avec Ancres et Visage, où on regarde un visage.

<kbd>Ctrl</kbd>+<kbd>Z</kbd> annule, partout — **la sélection fait partie de
l'instantané**, sinon annuler une duplication laisse la forme active sur un
indice qui a changé de sens, et on croit tirer une nageoire en en déplaçant une
autre. Molette pour zoomer, glissé du fond pour déplacer la vue.

**Le bandeau du bas** a trois modes. Il n'en montrait que **7 humeurs** alors que
`FishBody.EMOTIONS` en compte 18 : on calibrait un visage sur sept cas et le jeu
en jouait dix-huit, la plus gênante des absentes étant `eating` — celle qui ouvre
la bouche en grand, donc celle qui met le plus à l'épreuve l'ancre de bouche et
son rayon, le réglage le plus délicat de tout l'atelier.

- **9 humeurs clés** — `idle`, `happy`, **`eating`**, `angry`, `sleeping`,
  `scared`, **`surprise`**, `kiss`, `disgust`. `sleeping` (bouche du ronflement)
  et `angry` (sourcil lourd) sont les deux qui débordent en premier d'une tête
  trop petite ; `eating` et `surprise` sont celles qui déforment le plus la
  bouche et les yeux.
- **les 18** — toutes, sur deux rangées. Au-delà de neuf vignettes, une seule
  rangée les rend illisibles.
- **6 individus** — le même dessin, la même humeur, six identifiants différents.
  C'est le seul endroit où se juge une **couleur tirée au sort** : sur un seul
  poisson, elle est invisible par construction.

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
| `points.mouth.r` | **taille de la bouche**, indépendante de celle de l'œil | la bouche suit l'œil |
| `points.nose`, `points.tail` | repères de l'atelier | ignorés par le jeu |
| `visage` | **palette du visage commun** : `encre`, `sourcil`, `pupille`, `blanc`, `gorge`, `langue`, `levres`, `dent`, `bec`, `joue` — surcharge **partielle** | `FishBody.VISAGE` |
| `boucheStyle` | **forme de la bouche** : `standard`, `grande`, `petite`, `gueule`, `bec`, `ventouse` | `standard` |
| `shapes[].points` | contour, `[[x,y], …]` | — |
| `shapes[].fill` | couleur pleine, ou `null` pour un tracé au trait seul | gris |
| `shapes[].stroke`, `.lineWidth` | **trait** — tentacule, antenne, patte — ou **liseré** d'une forme pleine | pas de trait |
| `shapes[].ferme` | contour refermé (`false` pour un trait ouvert) | fermé |
| `shapes[].smooth` | contour lissé plutôt qu'en ligne brisée | lignes droites |
| `shapes[].alpha` | opacité de la forme, multipliée à l'alpha courant | 1 |
| `shapes[].lueur` | **bioluminescence** (halo) 0→1, bridée à la nuit si l'espèce déclare `glowAtNight` | éteinte |
| `shapes[].degrade` | `{ type: 'lineaire'\|'radial', ang, de, vers, pos }` — le premier arrêt vaut la couleur **résolue** de la forme | aplat |
| `shapes[].couleur` | **couleur propre à l'individu** : `{ mode: 'espece'\|'especeSombre'\|'palette'\|'teinte', couleurs[], amplitude }` | la couleur du dessin |
| `shapes[].pivot` | rotation en bloc — **repli** quand aucun `fins[]` ne vise la forme | elle ondule |
| `shapes[].amp` | amplitude d'animation, en degrés pour une nageoire | 15 |
| `shapes[].groupe` | nom libre : calques **aplatis** en un seul bloc animé | forme isolée |
| `fins[]` | **appendices**, voir le tableau ci-dessous | rien n'est animé |
| `tailBlend` | x en deçà duquel les points appartiennent à la queue | rien n'ondule |
| `sansQueue` | la créature n'a **pas** de queue (crabe, étoile, coquillage) | elle en a une |
| `tailOndes` | nombre d'ondes le long de la queue — 0 = battement d'un bloc, 1-2 = onde qui **court** (murène) | 0 |
| `queueCalques` | restreint l'ondulation à certains calques | tous |
| `faceK`, `faceTx`, `faceTy` | calibration en multiples de `size` (repli) | `def.spriteFace`, puis 0,75 |

### Un appendice (`fins[]`)

| Champ | Rôle | Défaut |
|---|---|---|
| `x`, `y` | l'ancre : centre de rotation, ou **base** du tentacule | — |
| `r` | rayon d'influence (nageoire) ou **longueur** (tentacule) | 1 |
| `calques` | les formes entraînées, **plusieurs possibles** | `[layerIndex]` |
| `layerIndex` | forme unique — forme historique, toujours lue | — |
| `type` | `'nageoire'` (rotation) ou `'tentacule'` (onde progressive) | `nageoire` |
| `miroir` | second ancrage en miroir de l'axe vertical, jouant en sens inverse | non |
| `amp` | degrés de rotation, ou **% de la longueur** pour un tentacule | celle du calque |
| `phase` | déphasage en degrés — indispensable dès qu'il y a plusieurs pattes | 0 |
| `vitesse` | multiplicateur de fréquence | 1 |
| `ang` | tentacule : direction de la base vers le bout, en degrés | 180 (vers la queue) |
| `ondes` | tentacule : nombre d'ondes sur la longueur | 1 |

### Les cinq règles du rendu

0 bis. **Le visage commun est commun, sa PEINTURE ne l'est plus.** Ce que le
   visage dessine passait par trois couleurs en dur — l'encre `#1c2733`, la
   gorge `#5a2d3d`, la langue rose — et une seule petite bouche de dessin animé
   pour les 51 espèces, becs et gueules comprises. Deux tables les remplacent :
   `FishBody.VISAGE` (surchargeable partiellement) et `FishBody.BOUCHES`. Le
   partage tient parce que ce que la bouche **exprime** reste séparé de ce à
   quoi elle **ressemble** : `FishBody.GESTE` réduit chacune des quatorze
   bouches du catalogue à deux nombres — combien elle est ouverte, si elle
   sourit ou boude — et c'est avec ça qu'un bec ou une ventouse jouent les
   dix-huit émotions sans qu'on redessine quoi que ce soit. Les mêmes deux
   champs sont lisibles sur une **fiche d'espèce** (`def.visage`,
   `def.boucheStyle`), donc une silhouette procédurale en profite aussi ; le
   dessin l'emporte quand il en déclare.

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
   les 27 espèces d'alors, l'hippocampe ressortait **83 %** trop grand et le poisson-lune
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
SVGExport.tout()                  // toutes, à ~350 ms d'intervalle
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

### Contrôle sur les 27 espèces d'alors

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

*Revu le 5 septembre 2026, atelier ouvert et manifeste inspecté.*

### Ce qui bloque tout de suite

- **Le crabe est dessiné mais pas branché.** `Assets/crabe.json` existe (11
  formes, ancres posées, `spriteScale` réglé) mais n'est **pas dans le
  manifeste** : le jeu continue d'afficher la silhouette procédurale. Deux
  choses lui manquent avant d'être activable :
  - **aucun appendice** (`fins: []`) — ses huit pattes ne bougeront pas, alors
    que c'est exactement ce pour quoi le type `tentacule` a été ajouté ;
  - **`sansQueue` n'est pas posé**, et `tailBlend` vaut 51,7 sur un dessin large
    de 166 : tout ce qui est à gauche de cette ligne va onduler. C'est le
    « tiers du crabe qui tortille » déjà identifié.

### Le trou le plus sérieux : les accessoires de gag

Une silhouette procédurale ne dessine pas qu'un corps : elle porte parfois
l'**accessoire d'un gag**. Un dessin qui la remplace le perd, sans prévenir.

C'est le même problème que la danse du Crabe Disco, réglé une fois par
`FishBody.choregraphie()` — appliquée AUTOUR du corps, quel qu'il soit. Trois
cas restent enfermés dans leur silhouette :

- la **poche du Pélican** (`drawBird`, pilotée par `_poche` et `_chew`) — c'est
  là que se joue tout son gag ;
- la **lampe du Poisson-lanterne** et son halo de pêche (`drawLantern`,
  `_lureOn`) — la luminescence par calque (`lueur`) en rend une partie, mais pas
  la tige ni le balayage ;
- le **rocher de la Murène** (`drawEel`), calé sur la ligne de contour du fond.

Aucune de ces trois espèces n'a de dessin activé aujourd'hui, donc rien n'est
cassé — mais activer l'une d'elles sans hisser son accessoire hors de sa
silhouette **supprimerait son gag**. Le patron à suivre est `choregraphie()`.

### Le reste

- **Un dessin par espèce.** Deux sont activés (requin, confetti) et un attend
  (crabe). Les 48 autres s'ouvrent dans l'atelier en un clic (« partir de la
  silhouette du jeu »), et certaines n'en ont sans doute pas besoin. Le rail les
  range par état : la rubrique **« sans dessin de référence »** donne les 21
  espèces qui n'ont même pas de vignette dans la planche du design.
- **Trois gabarits seulement** (`Poisson`, `De face`, `Rampant`). Il en manque
  au moins deux que le roster réclame déjà : un **oiseau** (Fou Moustachu,
  Pélican, Goéland, Cormoran — le style de bouche `bec` existe maintenant, le
  gabarit d'ancres non) et une **méduse**, silhouette verticale dont la bouche
  et les yeux ne sont pas placés comme ceux d'un poisson.
- **Le miroir.** Un dessin est fait tourné vers la droite ; le jeu le retourne
  par `scale(-1, 1)` avec le demi-tour animé. Un dessin asymétrique (une tache
  sur un seul flanc) se retrouvera donc de l'autre côté la moitié du temps.
- **Les créatures posées au sol** (crabe, étoile, coquillage, ver, anémone,
  murène) pivotent avec la pente du fond : leur dessin doit être fait
  **horizontal**, pas incliné.
- **Le dessin à main levée.** L'atelier retouche un contour point par point et
  sait tracer un polygone au clic, mais il n'a pas de poignées de Bézier : pour
  une courbe fine, dessiner ailleurs et importer le SVG.
- **Les taches procédurales** (`def.spots`) n'ont pas d'équivalent tiré au sort :
  un dessin peut peindre ses taches, mais elles seront les mêmes sur tous les
  individus. La couleur, elle, varie désormais (`shapes[].couleur`).
- **Aucun aperçu en situation.** On voit la créature seule sur fond clair, jamais
  à sa taille réelle au milieu des autres, ni dans la couleur d'eau de sa
  profondeur. Un dessin abyssal jugé au bon contraste dans l'atelier peut se
  révéler illisible à 3 000 px de fond. Le bouton **🌙 nuit** en règle une
  moitié : il montre au moins ce que donne une luminescence.
