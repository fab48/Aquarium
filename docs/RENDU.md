# Rendu : dessins vectoriels, atelier, performance

Le contrat des sprites vectoriels côté moteur, l'atelier, les planches, et le résumé des mesures de performance.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

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
- **Le visage commun est commun, ses ANCRAGES ne le sont plus.** Deux calques
  marqués `role: 'becHaut'` / `'becBas'` sont un **bec dessiné** : ils pivotent
  autour de l'ancre de bouche, chacun de son côté, à l'ouverture de l'expression
  courante — et le bec procédural s'efface, sinon il y en aurait deux l'un sur
  l'autre. L'ancre doit être posée à la **charnière** (base 1,3 px de course,
  pointe 39,7). De même, `bouches: { cri: [dx, dy] }` décale l'ancre **par forme
  de bouche** : le cri et le bisou ne sortent pas du même endroit d'un museau, et
  une ancre unique en pose forcément un à côté. C'est la FORME qui est retenue,
  pas l'humeur (`happy`, `love`, `proud` et `wink` partagent `sourire`), et le
  repos reste la référence — sans décalage, rien ne bouge.
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
- **Un appendice peut être piloté par l'ÉTAT et pas par la nage** (`fins[].source`).
  L'ouverture d'un coquillage ne suit pas le battement du corps : entrouverte en
  dormant — refermée, on ne verrait pas ses yeux clos —, elle glousse en mangeant
  et s'ouvre en grand sur une perle. `FishBody.ouvertureCoquille` est donc extraite
  de `drawShell` et offerte aux appendices : un coquillage DESSINÉ retrouve
  l'animation de sa silhouette, ce qu'un rythme libre ne pouvait pas imiter.
- **Un accessoire de gag enfermé dans une silhouette disparaît avec elle.** La
  danse du Crabe Disco a déjà été hissée dans `FishBody.choregraphie()`,
  appliquée AUTOUR du corps quel qu'il soit. Tous les autres l'ont été depuis
  (octobre 2026), dans `FishBody.gagsDuCorps` et la branche sprite de
  `FishBody.draw` : poche du Pélican (sous le `becBas` dessiné), lampe du
  Lanterne (ancre `points.lampe`, réglable dans l'atelier), rocher et
  jaillissement de la Murène, trou de la Jardinière, hérissement de l'Oursin,
  repli du Calamar Géant, charge de l'Anguille, guirlande de la Crevette,
  gueule du Poisson-Tapis, poof du Poulpe. L'atelier les joue tous (vue
  Scènes → « gag de l'espèce »). Avant d'activer un dessin sur une espèce à
  `render` spécial : lister les `e._xxx` que lit sa `drawXxx` et hisser ce qui
  manque — sinon le gag disparaît sans la moindre erreur.
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
  `nageoire` (rotation autour de l'ancre, pondérée par la distance),
  `tentacule` (**onde progressive** le long d'un axe : base fixe, bout qui
  parcourt toute l'amplitude) `aile` (**l'angle croît le long de l'envergure** — l'épaule tient, le bout décrit
  tout l'arc, l'inverse exact de la nageoire dont le plein effet est sur l'ancre
  où le bras de levier est nul ; retardé vers le bout, donc l'aile se courbe ;
  battement **asymétrique**, 35 % de descente vive contre 65 % de remontée
  molle — un oiseau porte son poids — et surtout elle se **retourne** : une aile
  qui pivote en gardant sa largeur est un éventail rigide, elle monte et descend
  mais ne vole pas. La corde est écrasée selon la position dans la course, donc
  l'aile se présente de face aux extrêmes et sur la tranche au passage. Mesuré
  sur le Poisson Volant, aire du polygone déformé : rapport min/max 0,71 sans, 
  0,42 au défaut, 0,21 à fond), `queue` (**la formule même de la caudale**,
  appliquée depuis l'ancre : même horloge, même plan `tailAxe`, même onde
  `tailOndes` tant qu'il n'a pas la sienne — une dorsale ou une anale bat AVEC
  le corps ; mesuré en corrélation avec le bout de la caudale : 1,000, et
  −1,000 à 180° de déphasage, contre un tentacule qui bat à 0,7 fois la queue et
  en travers de sa flèche) ou `pince` (**une charnière et deux
  mâchoires** :
  les DEUX
  mâchoires s'écartent de l'axe, chacune de son côté, et l'amplitude est
  l'écartement TOTAL. N'en animer qu'une était le geste d'une **porte**, pas
  d'une pince, et obligeait à choisir laquelle — un choix qui se lit par le
  signe d'un **produit vectoriel**, donc qui s'inverse dès qu'on retourne le
  repère : une paire ouvrait la mâchoire du haut d'un côté et celle du bas de
  l'autre, par le bouton *symétrique* comme en posant deux pinces d'angles
  opposés. Les animer toutes les deux fait disparaître le choix, donc le
  problème. Deux pièges de vérification : « quelle moitié bouge » n'est pas un
  juge (découper par l'ordonnée de la charnière ne veut rien dire sur un axe
  incliné — le bon critère est qu'une paire symétrique **reste** symétrique en
  s'animant, la référence étant l'écart du DESSIN et non zéro), et deux
  appendices **déphasés n'ouvrent pas ensemble**, donc chacun se mesure à SON
  moment). **Une paire en miroir : une moitié du dessin chacun** — le profil
  d'un appendice est borné à 1 au-delà de sa longueur, pas coupé, donc
  l'ancrage d'en face « fuyait » sur les points situés devant sa flèche, et pas
  du même montant des deux côtés (9,32 px contre 8,69 sur une paire de
  dorsales). Chaque ancrage ne traite plus que sa moitié : écart au miroir
  0,0000 px, aucun dessin du dépôt modifié. Le rythme d'une pince n'est pas un va-et-vient :
  fermée 55 % du cycle, ouverture douce sur 30 %, puis **clac** sur les 15 %
  restants. Un sinus ne sait pas dire « clac », il referme aussi lentement qu'il
  ouvre. Une patte de crabe ou un bras de poulpe animés
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

- `sprites.js` — chargement des dessins de l'éditeur SVG (`Assets/*.json`), consommés par `FishBody.drawSprite`. Une espèce qui déclare `sprite:` remplace sa silhouette procédurale, **jamais son visage**.
- `svgexport.js` / `svgimport.js` — les deux sens du pont : rejouer une silhouette procédurale dans un faux contexte 2D qui enregistre au lieu de peindre pour la sortir en SVG, et échantillonner un dessin vectoriel pour le faire entrer.
- `ANCHOR_TOOL.md` — spécification du « poseur d'ancrages », l'outil construit à part (Artifact autonome, hors dépôt) dont l'atelier reprend les capacités.
- `atelier.html` — **l'outil unique** (page à part, servie par le même serveur de dev) : importer, poser les ancres et les nageoires, calibrer le visage, peindre les calques, prévisualiser avec le VRAI rendu du jeu, et **enregistrer directement dans `Assets/`**. Une espèce s'active par le manifeste `Assets/sprites.json`, sans toucher au code. **[SPRITES.md](../SPRITES.md) est le contrat complet.**
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
  rail range les 53 espèces **par état** d'avancement, pas dans l'ordre de
  `SPECIES`, avec un filtre — la rubrique « sans dessin de référence » est la
  liste, tenue à jour toute seule, de ce qu'il reste à dessiner (vide depuis
  la seconde planche ; le Poisson Archer et le Requin Marteau l'ont habitée
  jusqu'à ce que leurs dessins soient activés au manifeste — ils sont rangés
  sous « dessin actif », sans pour autant avoir de repère de planche).
- `decoupe_planche.py` — découpe les **deux planches** (`Assets/Concepts/Design
  Final.png`, 5×6, puis `… page2.png`, 5×5) en **un repère par espèce** dans
  `Assets/Reperes/`. Les **51 espèces** des planches en ont un ; les deux arrivées
  suivantes (Archer, Marteau) n'en ont pas — et n'en ont plus besoin : leurs
  dessins existent (`archer.json` fait à main levée dans l'atelier, `marteau.json`
  décalqué sur la vignette du requin, `fond.planche: 'requin'`). Pour leur donner
  un repère, il faudrait une troisième planche et une troisième entrée de
  `PLANCHES`. Chaque planche déclare sa
  grille, l'ordre de ses cases et le sens de ses dessins (`PLANCHES`) — l'atelier
  ne connaît que `Assets/Reperes/<espèce>.png`.
  La grille est un **repérage, pas une frontière** : les créatures débordent de
  leur case, et découper au ras en coupait 17 sur 30 (le perroquet perdait 96 px
  de bec). Chaque vignette est taillée dans une case **élargie de 25 %**, le
  choix de la bonne composante restant jugé sur la case nominale. Mesuré :
  17/30 coupées → **2/30**, 621 px au bord → 71, et **0 px au bord** sur les 21
  de la seconde planche.
  **Mais alors chaque case VOIT sa voisine**, et « ce qui touche le corps, on le
  garde » l'attrapait — le Dentiste emportait le Police, la Raie la tête de la
  Murène. Aucun seuil d'aire ne tranche (un vrai morceau détaché pèse jusqu'à
  12,9 % du corps, une voisine commençait à 15,8 %) : le critère exact est
  qu'une composante qui **recouvre le corps choisi par une AUTRE case est cette
  créature-là**. D'où un découpage en deux passes et une carte « quel pixel
  appartient à qui » — 100,0 % de recouvrement pour les quatre intruses, 0,0 %
  pour les quinze vrais accessoires.
  L'atelier les pose tout seuls en calque de repérage. Les **32 vignettes sur
  51** qui regardent à gauche sont **retournées à la découpe** : le jeu dessine
  tout vers la droite, une planche à l'envers est un patron à l'envers. Le sens
  se relit sur une planche-contact des vignettes DÉCOUPÉES — six créatures de la
  seconde page regardent déjà à droite, les retourner les mettrait à l'envers.

## Performance (mesurée, pas supposée)

**[PERFORMANCE.md](../PERFORMANCE.md) est l'audit complet** — son dernier point
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

Le rendu procédural n'était **pas** le goulot — mais les **dessins vectoriels le sont devenus** (PERFORMANCE.md §10, octobre 2026) : sur un petit PC en rendu logiciel, les 53 dessins coûtent 3 à 6 fois leurs silhouettes et font 70 à 80 % de la frame, et ce coût suit le nombre de CALQUES, pas la taille à l'écran. D'où **l'imposteur** (`FishBody.corpsEnCache`) : le corps de chaque créature dessinée est gardé en image — peinte par le même `peindreCorps`, repeinte dès que la pose réelle s'en écarte de plus d'un pixel écran (`CACHE_TOLERANCE`, écart borné par des sensibilités mesurées sur la vraie `deformer`) — et, sous 48 px, tiré d'une **planche** de seize poses par battement de queue, partagée par les individus qui se ressemblent. **Le visage n'est jamais en cache.** Actif sur le seul canvas du jeu (`activerCache`, par `Main.init`) : l'atelier dessine toujours en direct ; `?imposteur=0` le coupe. Créatures −35 % (récif) à −58 % (dézoom) à la cadence d'une machine lente. Deux règles qui en sortent : un calque ne prend un `save/restore` que s'il tourne (16 % du dessin y passait), et toute mesure d'un cache de pose se fait au `dt` d'une machine LENTE (0,05), pas à 1/60 — sinon on mesure un cache qui ne servira pas. Côté simulation, le coût est dans les recherches de voisinage. Utiliser systématiquement `Ecosystem.neighbors()` (grille spatiale) et `Ecosystem.bySpecies[id]` plutôt que de balayer `entities`.
