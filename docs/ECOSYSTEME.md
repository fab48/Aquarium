# Écosystème et équilibre

Les mécanismes qui tiennent l'aquarium sans réglage espèce par espèce, et toutes les leçons de mesure qui les ont fait naître.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

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
- `idcard.js` — fiche d'identité, panneau HTML sur le côté (`#idcard`) : `champs(e)` calcule les champs (régime, prédateurs, jauge de faim), `update(dt)` choisit le sujet et n'écrit dans le DOM que ce qui change (cf. « Contrôles »). « Mangé par » est **déduit** des tables `prey`, donc rien à ressaisir en ajoutant une espèce.
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

### Le surnombre : un plafond pour la machine, un Super Saïyen pour la scène

Le boom ne double que le plafond de l'espèce nourrie ; rien ne plafonnait
l'aquarium ENTIER. Nourrir tout le bas de chaîne : 576 → 1 223 créatures, et la
simulation de 11 à 55 ms par frame (vécu : « le PC était au bout du rouleau »).
Deux niveaux depuis (octobre 2026) :

- **`Ecosystem.BUDGET` (800)** — au-delà, plus aucune ponte (`layEgg` et le
  frai éclair). Invisible, c'est le filet de la machine. `Ecosystem.total` est
  compté avec `counts`, une fois par frame.
- **Le Requin Super Saïyen** (`js/saiyan.js`) — la scène qui ramène l'équilibre,
  décrite dans FICHES.md. Il sort de la simulation comme une créature saisie
  (`Saiyan.pilote`, appelé avant la faim) et **gobe sans `Ecosystem.eat`** :
  passer par `eat` le ferait grossir à chaque bouchée et exploser au trentième
  poisson. Il décrémente `counts` à chaque bouchée, sinon il dévorerait un banc
  entier dans la frame où il l'atteint.

Mesuré, 6 min chacun : aquarium sans joueur **0 transformation** (total 532 à
674) ; gavage continu de tout le bas de chaîne : total plafonné à **808**,
simulation **10 à 27 ms** au lieu de 55, 3 transformations, 1 101 créatures
gobées, **aucune espèce sous son plafond normal**, jamais hors de l'eau, aucun
résidu de canal, 53 espèces sur 53.

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

### Un colosse se règle par le RIVAGE, pas par sa strate

La Baleine Gros Dodo était déclarée entre 750 et 2 600 px de profondeur ; elle
vivait mesurée entre 69 et 1 045. La contrainte ne servait qu'à la mettre en
faute — et pire, à la garder 95 % de son temps en migration de ponte, à faire
l'aller-retour vers une frayère qu'elle ne pouvait pas atteindre depuis sa bande.

Ce qui compte pour un colosse n'est pas sa strate, c'est **le rivage**. Trois
garde-fous s'en chargent déjà et suffisent : le tirant d'eau (`size * 2.2`), la
barrière dure de `limiteLarge()` et les 900 px d'eau exigés d'un colosse. Sa
bande couvre donc maintenant toute la colonne ([140, 3200]). Mesuré après :
barrière à x = 2 420 pour un rivage à 980, les trois baleines entre x 3 383 et
6 443, dans 1 590 à 2 900 px d'eau, **zéro échouage** — et 90 % de leur temps
passé à nager au lieu de 3 %.

### Un animal rare et qui vit vieux ne se reproduit pas souvent

Mesuré : la Baleine passait **95 % de son temps à se reproduire** (54 % de
parade, 41 % de migration), le Pélican 56 %, le Goéland 48 %, le Cormoran 43 %,
le Fou Moustachu 41 %. Ils ne faisaient jamais ce pour quoi ils existent.

Deux corrections, toutes deux générales :

- **Les aériens et les colosses ne migrent plus vers leur frayère**
  (`Ecosystem.migre`). Les lents en étaient déjà exclus parce qu'ils n'y
  arrivaient pas ; ceux-là en sont exclus parce qu'ils y arrivent trop bien, et
  que leur frayère est à l'autre bout du monde de leur zone de vie. Ils pondent
  en diffusion, là où ils sont.
- **`Entity.repos()`** espace les pontes selon la longévité : une Baleine qui
  vit 2 000 à 3 000 s et plafonne à trois individus n'a pas besoin du même délai
  qu'un Confetti qui vit quatre minutes.

Mesuré après : Baleine **90 % d'errance** (0 % de parade, 0 % de migration),
Goéland 99 %, Cormoran 98 %, Pélican 97 %, Fou Moustachu 94 % — et les quatre
oiseaux chassent enfin.

### On ne harcèle pas une espèce qui passe sa vie à fuir

Le plancher de population (`refugeFloor`) protège une espèce qui s'effondre en
NOMBRE. Il ne dit rien d'une espèce nombreuse mais épuisée : mesuré, le
**Maquereau Métronome passait 61 % de son temps en fuite** — contre 15 % à errer
— et déclenchait `scared` 254 fois par heure. Suivaient la Dorade (31 %), le
Poisson Volant (31 %), la Crevette Sauteuse (24 %). Un poisson qui fuit ne fait
rien d'autre : il ne mange pas, ne se reproduit pas, et n'a plus d'autre
expression que la peur.

`Ecosystem.harcelee(id)` est le pendant « stress » du plancher de population :
la part de l'espèce en fuite est relevée chaque frame, lissée sur ~4 s, et
au-delà de **50 %** l'espèce sort des menus le temps qu'elle souffle. Avec
hystérésis (on ne la rechasse qu'une fois retombée à 35 %) — sans elle, le répit
la fait cesser de fuir, donc la remet aussitôt au menu, donc elle refuit.

Mesuré après : Maquereau **61 % → 33 %**, Dorade 31 → 20, Crevette Sauteuse
24 → 15.

### Aucune espèce ne doit être immangeable par accident

Relevé du 6 septembre 2026 : **19 espèces sur 51 n'avaient aucun prédateur**.
Neuf étaient des sommets de chaîne, et c'est normal. Les dix autres étaient des
maillons morts — Oursin, Coquillage, Étoile, Nudibranche, Concombre, Anguille
Jardinière, Krill, Raie, Poisson-lune, Tortue, Police, Anguille Coup-de-Jus,
Bernard-l'Ermite. Rien ne les mangeait, donc elles plafonnaient et ne mouraient
que de vieillesse : aucune tension, rien à regarder.

Chacune a reçu **un seul** nouveau prédateur, choisi pour que la rencontre soit
possible (bandes qui se recouvrent, sprint supérieur à la fuite) et cohérente :

| Proie | Prédateur | Pourquoi |
|---|---|---|
| Oursin | Mérou Patatras | il aspire, et il mange déjà un piquant (le Fugu) |
| Étoile · Coquillage · Concombre | Raie Ronron | elle fouit le sable — c'est son gag — et n'en mangeait rien |
| Nudibranche · Anguille Jardinière | Anguille Coup-de-Jus | elle vit dans le sable et y mange ce qui y vit |
| Krill | Poisson-lune Bada-boum | une mola gobe du plancton |
| Bernard-l'Ermite | Poisson-Tapis | il mange déjà du crabe |
| Police | Barracuda Perce-Ballon | même bande, et il est deux fois plus rapide |
| Poisson-lune | Orque Echo | une orque qui mange une mola, c'est du documentaire |
| Raie · Tortue · Anguille | Requin Dents-Molles | et il se prend une décharge en tentant l'Anguille |

Restent sans prédateur, volontairement : les onze sommets, les quatre oiseaux,
le Dentiste (`intouchable`), et le Corail et l'Anémone — les manger détruirait
les frayères du récif.

**Le garde-fou a été respecté** : chaque nouvelle proie n'a qu'UN nouveau
prédateur, et la Raie a dû voir sa bande élargie ([1300, 1700] était une lame de
400 px) pour atteindre le fond qu'elle est censée fouiller. Validé sur 15 min :
**51 espèces sur 51 vivantes**, prises entre 0,1 et 0,7 par minute — une
régulation douce, pas un massacre.

### Le Poisson Archer et le Requin Marteau (22 septembre 2026)

Deux arrivées, deux mécaniques de chasse qui ne sont PAS des morsures — la
proie est d'abord assommée, mangée ensuite. Le détail est dans FICHES.md.

- **`abat: true` (Poisson Archer)** — ses proies déclarées sont des oiseaux,
  mais `nearestPreyFor` n'en retient un que s'il flotte, sonné, à la surface
  (`_abattu`). C'est la scène (`GAGS.archer`, régime bruyant) qui fait le
  travail : visée comprimée sous la surface, « PTUI ! », jet balistique vers la
  position ANTICIPÉE de l'oiseau (particule `jet`, gravité propre, qui ne meurt
  pas en croisant la surface à la montée), puis l'oiseau tombe à plat ventre
  (`Entity.move`, branche aérienne, 3,5–6,5 s) et l'archer file le gober par
  la chasse ordinaire. Mesuré : chaque oiseau abattu a été mangé.
- **La riposte et la rancune.** Le Cormoran mange l'Archer — c'est son seul
  prédateur. Sans défense, il en mangeait **1,38/min**, presque tout ce qui
  naissait. L'archer lui crache donc au visage quand il plonge sur lui
  (`GAGS._riposte`, silencieuse sauf une fois sur dix, devant le public), et un cormoran
  sonné garde **rancune** 90 s (`pred._evite[espèce]`, lu par
  `nearestPreyFor` — générique, réutilisable). La riposte seule ne suffisait
  pas : il replongeait dès qu'il reprenait ses esprits. Après : **0,41/min**,
  l'Archer tient entre 5 et 8 sur 8.
- **`marteau: true` (Requin Marteau)** — au contact d'une proie éveillée, il
  ne mord pas : coup de tête, la proie `assomme()`, et il l'avale 0,9 s plus
  tard (`_toc`). La portée est HAUTE et pas large : une proie de fond vit dans
  la bande de sable, jusqu'à ~80 px sous le contour, alors que le requin est
  tenu une longueur au-dessus — `GAGS.marteau` pilote sa vitesse verticale
  pour qu'il plonge dessus. Taille 46, volontairement sous le seuil des
  colosses (qui gardent 1,5 longueur d'eau sous le ventre). Une proie
  réfugiée contre une anémone le fait **renoncer** : comptée comme un raté,
  elle le faisait se sonner lui-même une fois sur deux (7 % de ratés après).
  Plafond 3 et `metabolism: 0.7` : à quatre gros mangeurs, ils vidaient le
  Bernard-l'Ermite jusqu'à son plancher en quatre minutes.

Deux corrections sont sorties de là :

- **Les oiseaux nichent sur la plage** (`layEgg`, branche `aerial`). Depuis
  qu'ils pondent sur place plutôt que de migrer, l'œuf tombait par défaut au
  fond de la mer : des oisillons éclosaient à 1 000 px sous l'eau et
  remontaient comme des bulles. Le rivage est un rappel doux pour eux, plus
  un mur — un oisillon né sur le sable aurait été téléporté au-dessus de l'eau.
- **Une sauvegarde antérieure reçoit les nouvelles espèces** : `Save.restaurer`
  sème toute espèce du code absente de la sauvegarde. Sans ça, un joueur qui
  revient sur son aquarium ne verrait jamais les nouveaux venus.

Validé sur 14,5 min : **53 espèces sur 53 vivantes**, Marteau 1 repas/min,
bulle « TOC ! » 0,48/min.

**Audit du 10 octobre 2026, AVEC les dessins actifs** (`archer.json`,
`marteau.json` ; rendus vérifiés à gauche et à droite, sprite et silhouette
procédurale, par la colonne et le visage commun). Les scènes se jouent et se
voient — rien ne manquait côté `gagsDuCorps` : ni l'Archer ni le Marteau ne
portent d'accessoire dans leur silhouette (leurs seuls canaux, `_crispe`,
`_etire` et `choc`, sont génériques). Quatre choses se sont pourtant révélées :

- **Le jet partait du centre du corps**, pas de la bouche. Corrigé :
  `GAGS._boucheArcher(e, dir, vers)` — ancre `mouth` du dessin, sens de nage ET
  inclinaison. Cette dernière compte : l'archer qui vise un oiseau à 190 px de
  haut est dressé à ~45°, et la bouche monte de la moitié de sa longueur. On
  lit l'inclinaison que `Entity.draw` va prendre (l'angle d'un `_faceAt`, bridé
  par le gabarit) plutôt que `_tilt`, que le lissage ne rattrape qu'en huit
  frames. La riposte au Cormoran en profite : l'archer se retourne le temps du
  tir (`_riposteFace`, 0,35 s) — le plongeur arrive souvent par-derrière, et le
  jet lui traversait le corps.
- **Une flèche gravée dans le poisson.** `_archerFin` ne remettait à zéro que
  `_crispe` ; si le Cormoran interrompait la scène pendant le VOL du jet
  (`_etire` = 0,5), le canal restait à 0,5 pour toujours : un archer étiré
  pendant plus de six minutes, relevé en simulation (7 119 frames sur une
  seed). Les deux canaux sont remis à zéro ; vérifié par une scène interrompue
  (`flee` et `dizzy` pendant le vol) avant/après : 0,5 → 0.
- **« TOC ! » éclatait derrière le requin** (`this.x + this.size`, sans le sens)
  dès qu'il nageait vers la gauche. Il part maintenant du point d'impact.
- **Deux cibles de cadence dépassées.** `missChance` du Marteau à 0,2 donnait
  **22 % de ratés** (9 coups sur 41, 3 × 12 min) pour un contrat de « moins de
  10 % » : 0,08 → 1 raté sur 20 coups. Et « PTUI ! » à **0,67–1,00/min** pour
  une cible de 0,3–0,5 : la riposte (1,4/min, soit plus que la scène) émettait
  sa bulle une fois sur quatre. Elle est à une sur dix et réservée à ce qu'on
  regarde (`_enVue`) ; `CADENCE.crachat` passe de 0,7 à 0,6.

Mesuré après, 3 seeds × 12 min (`dt` 1/20, caméra sur tout le monde : le
public est toujours là, donc c'est la borne haute des cadences) :
**53 espèces sur 53 vivantes**, zéro mort de faim, zéro NaN, zéro nageur hors
de l'eau (une seule frame sur 6 seeds, avant la correction — mais ce relevé
exemptait les sauteurs : le banc d'essai a trouvé en octobre ~5 Poissons
Volants et Sardines en l'air en permanence, corrigé depuis, cf. « Le plafond
des sauteurs » plus bas), **résidus `_crispe`/`_etire`/`_smear` à 0**,
aucun empilement exact (distance minimale entre archers 19–24 px au relevé,
entre marteaux 120–250 px). Archer : 4 à 7 tirs par 12 min (**0,47/min**),
15 touchés sur 17, **tous les oiseaux comestibles abattus ont été mangés**
(14 sur 14 ; le Pélican, hors menu, tombe sans être mangé), 0,25–0,33 archer
mangé par le Cormoran par minute (riposte : 12 à 21 par 12 min). Marteau :
0,3–0,6 repas/min, « TOC ! » 0,17–0,33/min, 1 raté sur 20. Le renoncement sur
proie réfugiée est vérifié (`isNearRefuge` forcé : « sad » puis `wander`, aucun
auto-assommé, aucun re-ciblage en boucle).

À savoir, sans que ce soit une panne : la **cohorte de départ** de l'Archer
(8 adultes d'âge tiré dans [0 ; 0,6 × longévité]) s'éteint presque d'un bloc
vers la 7ᵉ–10ᵉ minute — plancher de 2 à 4 individus sur 8, remonté par la ponte
(8 à 11 œufs par 10 min) et l'immigration. Le Marteau (plafond 3) passe
régulièrement à un seul individu en fin de fenêtre, et passe ~20 % de son temps
en migration vers sa frayère `shallow`. Côté dessin : à pleine compression
(`_crispe` 0,7) la visée + le cabré par défaut dressent l'archer à près de 80° ;
si l'auteur veut plus doux, c'est une pose `cabre` à dessiner dans l'atelier
(l'archer n'en a pas, il joue celle par défaut).

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
Rascasse le fait aussi. Le Fugu n'en meurt pas (seuls le Barracuda et le Mérou le mangent) : il
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

### Une bande étroite ET saturée de décor : le tas se forme à la borne (oursins)

« Les oursins sont agglutinés sur la plage. » Leur bande `[80, 1000]` ne couvre
que ~1 400 px de fond (x 1 100 → 2 500), déjà occupés par le décor fixe. La
recherche d'une place « à 85 px de tout le décor » courait jusqu'à 1 400 px et
trouvait la seule poche vide — côté plage —, puis `desempile` recadrait le tout
sur `shoreX + 90`, **hors de leur propre bande**, où des passes symétriques ne
défont pas un tas collé à une borne. Mesuré sur 30 mondes neufs, avant : 7,5
oursins sur 16 à moins de 500 px du rivage, 6,4 paires à moins de 40 px
(empilements exacts, 1,3 dans le ressac), écart max 399 px. Correctif générique
pour toute espèce posée : place **la plus proche de l'intention, marge qui se
desserre par paliers** (décor d'abord, congénères ensuite, portée 400 px) ;
`desempile` borné par `bornesFond(def)` + balayage aller-retour ; l'œuf d'une
espèce posée va dans **le plus grand vide à ±900 px** (`placeLibreAuFond(…,
etale)`) ; et `Save.restaurer` rappelle `desempile(true)`, car un tas gravé dans
une sauvegarde ne bouge plus jamais. Après : écart min 64 px, 0 empilement,
0 dans le ressac, 3,6 sur 16 près du rivage, écart max 165 px — et sur 25 min
avec descendance, 0 paire à moins de 64 px (oursin, coquillage, anémone,
corail, rascasse).

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

### Les colosses (taille ≥ 70)

Baleine, cachalot, orque demandent des règles à part, apprises en corrigeant leurs bugs :
- Le sens de nage utilise une **hystérésis** (`_facing`, seuil `speed * 0.25`) et l'inclinaison est **bornée** (`maxTilt`) puis lissée : sinon la baleine clignote et part sur la tête.
- Ils **ignorent l'anti-chevauchement** dans les deux sens : se faire bousculer par des dizaines de petits poissons les faisait tourner sur eux-mêmes, et un `filterFeeder` doit pouvoir chevaucher le banc qu'il avale.
- Un **tirant d'eau** (`size * 2.2`) les repousse vers le large là où la colonne d'eau est trop basse : les baleines venaient s'échouer sur le haut-fond, attirées par leur frayère. Leur `depthBand` commence aussi sous l'eau claire (≥ 450) — un colosse en eau claire écrase toute la faune du récif.
- `breathes: true` (baleine, cachalot, dauphin, orque, tortue) : ce sont des animaux à poumons. `Entity.breathe` gère l'apnée et la remontée (via `_diveTargetY`, prioritaire sur les autres cibles verticales). Le **panache** `Particles.blow` exige EN PLUS `souffle: true` — réservé aux cétacés : la Tortue respire mais n'a pas d'évent, elle sort juste la tête (une ride d'eau, pas un jet). L'évent est **aligné sur l'ancre d'œil du dessin** (`Entity.event`, via `FishBody.echelleSprite` — une seule formule d'échelle) : l'ancien évent à 12 % du centre plaçait le jet au milieu du dos d'une baleine dessinée, et comme c'est l'évent qui déclenche le souffle en crevant la surface, le jet partait aussi TROP TARD. Mesuré après : évent à +79/−25 px de la tête pour une baleine de 167, jet à l'instant où l'œil perce. La contrainte de profondeur s'assouplit pendant la remontée.

### La remontée SE NAGE, et le retour aussi (2026-09-07)

La remontée était un **ascenseur vertical** (le rappel proportionnel de
`_diveTargetY` explose loin de la cible et n'a aucune composante horizontale),
et sa fin une **téléportation** : dès le souffle terminé, le plafond dur de la
surface reprenait la main et reclaquait le cétacé de « dos hors de l'eau » à
« entièrement immergé » en UNE frame (~120 px pour une baleine). Cinq règles,
toutes mesurées :

- **La montée vise une VITESSE, pas une position** : croisière horizontale
  (cap `_surfDir` choisi une fois au départ, jamais vers le rivage ni le bord
  du monde) + verticale qui s'aplatit en approchant — un plan à ~45–50° qui se
  couche à la surface, où la croisière continue pendant le souffle (elle longe
  l'eau au lieu de faire du surplace). Le garde-fou de remontée est un budget
  proportionnel à la profondeur de départ, plus les 25 s fixes qui coupaient un
  cachalot parti de 2 000 px dès que sa montée n'était plus verticale.
- **`_replonge` remplace le claquement** : exempté du plafond dur, tiré par une
  cible posée sous lui à pleine vitesse de croisière, splash au moment où il
  perce vraiment vers le bas. La phase ne se referme QUE sous le plafond,
  **jamais au minuteur** — tout couperet rend la main au plafond, donc au bug.
- **La PERCÉE est bornée** (centre jamais au-dessus de `SURFACE_Y − size·0,25`,
  borne continue donc sans à-coup) : l'inertie d'un dauphin qui croise sa cible
  à 130 px/s et la séparation de colosses envoyaient une baleine à **220 px
  au-dessus de la ligne d'eau**, que l'ancien couperet reclaquait de 360 px.
- **Respirer prime sur la sieste et sur `_freeze`, dans les DEUX phases.**
  `breathe` réveillait déjà pendant la montée, mais `think` rendormait dans la
  même frame et le frein du dormeur clouait tout : la Baleine réussissait
  3 souffles pour 9 cycles lancés. Le sommeil ne s'installe plus pendant
  `_surfacing`/`_replonge`, et un dormeur suspendu hors de l'eau n'existe plus.
- **Un cétacé restauré dos hors de l'eau rentre par la même porte** : les
  drapeaux ne sont pas sauvés, et une sauvegarde prise en pleine percée
  reclaquait ~190 px au chargement. `breathe` détecte le cas et pose
  `_replonge` — il tourne avant `move`, le plafond n'a jamais la main.

Mesuré après : **0 téléportation sur 197 s** pour les 29 individus qui
respirent (contre des claquements de 120 à 360 px), angles de montée 40–50°,
dépassement max au-dessus de la percée 2,4 px (contre 220).
- La **Baleine Gros Dodo n'est pas un prédateur** : `grazes: true` sans `prey`. Elle filtre le plancton, elle ne mange personne.

### Ce que le banc d'essai a trouvé (20 octobre 2026)

Le banc (`node outils/banc.js`) rejoue en quelques minutes ce que les audits
mesuraient à la main. Sa première passe, et deux audits longs (2 × 12 min,
puis 3 × 10 min), ont sorti cinq défauts qu'aucun audit précédent ne voyait :

- **Le plafond des sauteurs.** Le plafond dur de la surface exemptait les
  espèces `jumps` ENTIÈRES, alors que seule leur phase aérienne
  (`jumpState === 'air'`) doit l'être — elle sort de `move()` bien avant le
  plafond. Un Poisson Volant ou une Sardine qui fuyait vers le haut sans
  sauter montait jusqu'à 209 px au-dessus de l'eau et y restait, endormi
  compris : ~5 individus en l'air en permanence. Les relevés précédents ne le
  voyaient pas parce qu'ils exemptaient eux aussi l'espèce. Leur plafond est
  plus près de la surface (`size * 0,2` au lieu de 0,7), pour que la retombée
  d'un saut ne claque pas. Après : zéro nageur hors de l'eau, zéro mort de faim
  chez les oiseaux qui les pêchent.
- **Un repas hors d'`Ecosystem.eat` n'existe pas pour l'audit.** Le Barracuda
  crevait le Fugu à la main (`p.dead = true`) : ni scène de mort, ni caca, ni
  témoins — et le lien « barracuda > fugu » passait pour mort alors qu'il
  servait ~2 fois par minute. Tout repas passe par `eat`.
- **Une proie posée ne « passe » jamais.** L'Oursin est `fixed` ; la règle de
  l'embusqué (n'attaquer que ce qui passe) interdisait donc au Mérou, son seul
  prédateur, de le manger : 0 prise en 36 min. Trois corrections, toutes dans la
  branche `ambush` d'`Entity.think` : un embusqué qui NAGE descend chercher une
  proie posée en chasse ordinaire, une tentative toutes les 25 à 45 s
  (`_poseeCd`, sinon le ping-pong de la murène revient) ; la portée se mesure à
  la LIGNE DE SABLE de la proie (`p.y - p._sable` : le décalage dans la bande de
  sable est de la perspective, un nageur tenu au-dessus du sable ne l'aurait
  jamais atteinte — un alevin restait bloqué à 57 px) ; et l'anémone ne protège
  que ce qui s'y RÉFUGIE, pas une proie posée qui vit au récif. Après : 1 à 4
  oursins par 10 min.
- **Un lien « à 350 px de recouvrement » peut rester décoratif.** La Murène
  devait manger le Coffre (bandes de profondeur recouvertes sur 350 px) :
  zéro prise en 24 min, jamais un coffre à moins de 140 px d'elle — il nage en
  pleine eau, elle guette au ras de son rocher. Le recouvrement des BANDES ne
  suffit pas pour un embusqué fixe : il faut que la proie passe à portée de
  mâchoire. Le Coffre est passé au Mérou, qui va chercher ses proies (3 à 4
  par 10 min). L'audit de recouvrement doit donc, pour un embusqué, mesurer la
  distance réelle proie ↔ embusqué, pas les bandes.
- **Le peuplement de départ doit être l'équilibre.** Quatre espèces démarraient
  bien au-dessus de ce que la prédation leur laisse — Calmar 16 → 5, Maquereau
  23 → 7, Fugu 8 → 4, Oursin 18 pour un plafond de 14 — et le joueur arrivait
  sur une hécatombe. Leurs `spawnGroups` sont ramenés à l'effectif tenu.

Deux cadences, au passage : la décharge de l'Anguille lisait `1` en dur au
lieu de `CADENCE.decharge` (la table n'était pas lue), et le looping de la
Méduse tirait un `U.rand(55, 120)` par individu — ~25 loopings par minute pour
une trentaine de méduses. Les deux passent par `Ecosystem.cadence`.

Mesuré mais laissé tel quel : la Tortue chasse 31 à 33 % du temps (sous le
seuil de 40 %), le Barracuda mange ~1,8 Fugu par minute (le Fugu tient à son
plancher, c'est le ballon qu'il crève), et « archer > goéland » est rare par
construction — l'Archer tire sur l'oiseau le plus proche, et le Goéland l'est
rarement.
