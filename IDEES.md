# Aquarium Vivant — ce qui reste à faire

Toutes les idées rassemblées et dédoublonnées : les propositions des enfants, la
liste de souhaits d'espèces, les gags dans l'esprit parc à thème, la couche
économique. **Rien de ce document n'est codé.**

Le roster **codé** (27 espèces) est en [§6](#6-le-roster-existant-27-espèces).

| Section | Contenu |
|---|---|
| [§1](#1-les-poissons-manquants-25) | **Les 25 poissons manquants** — la liste de référence |
| [§2](#2-gags-et-mises-en-scène) | Gags et scènes, sans nouvelle espèce |
| [§3](#3-à-corriger-sur-lexistant) | À corriger sur l'existant |
| [§4](#4-interaction-joueur) | Interaction joueur |
| [§5](#5-économie-de-laquarium) | L'économie de l'aquarium |
| [§6](#6-le-roster-existant-27-espèces) | Le roster existant |
| [§7](#7-contraintes-à-respecter-en-ajoutant-une-espèce) | Contraintes à respecter |

---

## 1. Les poissons manquants (25)

Synthèse des trois sources — **(E)** les enfants, **(F)** la liste de souhaits,
**(A)** proposé en lisant les trous de la chaîne alimentaire. Les doublons entre
sources sont fusionnés (le « poisson ballon piquant » des enfants et le « Fugu
Gonflé » de la liste sont le même poisson ; le « poisson-balayeur » et le
« concombre aspirateur » aussi).

`T1` brouteur · `T2` petit poisson · `T3` prédateur moyen · `T4` grand
prédateur · `Ch` charognard.

### Récif et eau claire (9)

| Poisson | Niv. | Ce qu'il apporte | Source |
|---|:--:|---|:--:|
| **Poisson Dentiste** | T2 | soigne la bouche des prédateurs, qui font la queue devant sa station. Le prédateur ne le mange jamais. **C'est lui qui fait repousser les dents du Requin Dents-Molles** — sans lui le requin ne peut plus manger. | E·A |
| **Fugu Gonflé** | T2 | gonfle tout rond dès qu'on l'approche et **pique** l'importun, qui prend un `malaise()` | E·F |
| **Poisson Police** | T3 | gronde ceux qui pètent ou font des farces ; le fautif passe en `ashamed` | E |
| **Mérou Patatras** | T4 | embusqué de récif, aspire sa proie au lieu de la mordre. **Mange le Poisson-clown Chatouille**, qui n'avait aucun prédateur. | F |
| **Poisson Papillon** | T2 | ne se déplace **jamais seul** : toujours en couple, côte à côte | F |
| **Dorade Dorée** | T2 | banc doré, contrepoint au Confetti bariolé | F |
| **Poisson Coffre** | T2 | cubique, nage mal — c'est tout le gag | F |
| **Nudibranche Fluo** | T1 | **le seul brouteur mobile** : les trois T1 actuels sont tous `fixed` | A |
| **Corail Viva** | T1 | second refuge de ponte à côté de l'anémone (décor vivant) | F |

### Surface (4)

| Poisson | Niv. | Ce qu'il apporte | Source |
|---|:--:|---|:--:|
| **Tortue Papi** | T3 | **le trou le plus béant** : seuls le Poisson-lune et la Murène mangent des méduses. Traverse toute la colonne d'eau, respire en surface (`breathes`), lente à regarder. | A |
| **Espadon Voilier** | T4 | le sprinteur ; rien ne va vite en surface | F |
| **Maquereau Métronome** | T2 | la surface n'a que **2 espèces** contre 9 en eau claire | A |
| **Crevette Sauteuse** | T2 | base de chaîne en eau claire (la Crevette Guirlande est abyssale) | F |

### Ciel (3)

**Les oiseaux frayent sur la plage.** Nouvelle frayère `beach`, sur le sable
**émergé** au-dessus de la ligne d'eau : la première hors de l'eau. Elle vaut
pour le Fou Moustachu comme pour les trois à venir. `Ecosystem.nurseryPoint` et
la migration de ponte devront l'accepter **sans déclencher la noyade à l'air
libre** (`_sec`, qui tue au bout de 4 s hors de l'eau).

Il n'y a **qu'une** espèce aérienne aujourd'hui (le Fou Moustachu). En ajouter
trois ne se verra que si **chacun pêche autrement** — sinon ce sont trois
silhouettes qui font la même chose.

| Poisson | Niv. | Ce qu'il apporte | Source |
|---|:--:|---|:--:|
| **Pélican Attrape-Tout** | T4 | **chope les poissons volants EN PLEIN VOL** — voir la fiche ci-dessous | F |
| **Goéland Rapide** | T4 | vole la prise des deux autres. Un gag qui se raconte seul, et il ne consomme aucune proie de son côté. | F |
| **Cormoran Plongeur** | T4 | plonge et **nage sous l'eau**, contrairement au Fou | F |

#### Fiche : le Pélican Attrape-Tout

**Ce qu'il fait.** Il patrouille au-dessus de la surface et **cueille en plein
vol** les poissons volants — il n'entre jamais dans l'eau. C'est le contraire
exact du Fou Moustachu, qui plonge dedans. La scène existe déjà à moitié :
le Poisson Volant Cascadeur et la Sardine Bulle-fofolle **sautent déjà** hors de
l'eau (`jumps`), et personne ne les attend là-haut.

**La mécanique générique à créer : `snatch: true`.** Un happeur ne vise que les
proies en **phase aérienne** (`jumpState === 'air'`) et ne descend jamais sous la
surface. Trois branchements, tous dans du code qui existe :

- `Ecosystem.nearestPreyFor` — ignorer une proie qui n'est pas en l'air ;
- `Entity.think` — abandonner la chasse dès que la cible **retombe** à l'eau,
  sinon le pélican la suit dans la mer ;
- `Entity.move`, branche `aerial` — le seuil « trop profond, il abandonne » est
  la **surface** (`SURFACE_Y`) au lieu de `SURFACE_Y + 130`.

**Le gag est dans le raté.** Sur un `missChance`, il referme son bec sur le
poisson, sa **poche se gonfle**… et le poisson en ressort par le haut, `scared`,
pendant que le pélican prend un air `ashamed`. La poche qui se déforme se lit
depuis le rendu (`_chew`), sans nouvelle bulle.

**Rendu.** `render: 'bird'` + un flag `pouch: true` lu par `drawBird`, comme
`disco` pour le crabe : la grosse poche orange remplace la moustache noire du
Fou.

**Le risque d'équilibre, à mesurer avant de valider.** Il chasse **les deux
mêmes proies** que le Fou Moustachu (`volant`, `bulle_fofolle`), et `CLAUDE.md`
prévient que concentrer plusieurs prédateurs sur une même proie la fait
s'effondrer. Deux amortisseurs naturels, plus un à régler :

- sa fenêtre de tir est **beaucoup plus étroite** que celle du Fou : seulement
  les quelques secondes où un poisson est en l'air ;
- `popCap` bas (2 à 4 individus) ;
- `missChance` élevé — mais attention au **piège inverse** : avec une fenêtre
  déjà rare et un raté fréquent, c'est **le pélican** qui meurt de faim. C'est
  exactement ce qui était arrivé à la Murène quand la peur des proies s'est
  ajoutée à son `missChance`. À vérifier en simulation longue, sur les
  populations de `volant`, `bulle_fofolle` **et** `pelican`.

**Nom.** La liste de souhaits dit « Pélican Farceur », mais « Farceur » est déjà
pris par le Dauphin. « Attrape-Tout » dit ce qu'il fait — à trancher.

### Fond (6)

| Poisson | Niv. | Ce qu'il apporte | Source |
|---|:--:|---|:--:|
| **Anguilles-jardinières** | T2 | une colonie de tubes qui ondulent et **rentrent dans le sable d'un coup** quand un prédateur passe. Aucun effet de groupe équivalent aujourd'hui. | A |
| **Bernard-l'ermite Déménageur** | Ch | change de coquille, et peut **se disputer celle du Coquillage Rieur** : un gag né de deux espèces déjà là | A |
| **Concombre Aspirateur** | T1 | mange les cacas (`Food.poops`) en râlant : rend visible le mécanisme de trop-plein, et nettoie vraiment le sable | E·A |
| **Rascasse Épineuse** | T4 | embusquée immobile, venimeuse ; **piquer rend malade** | F |
| **Oursin Pic-pic** | T1 | fixe, intouchable ; **piquer rend malade** | F |
| **Anguille Coup-de-Jus** | T4 | **électrocute** ce qui l'approche — voir la fiche ci-dessous | F |

> **Collision de noms à trancher** : « Pic-pic » est donné à la fois à la
> rascasse et à l'oursin. J'ai mis « Rascasse Épineuse » pour les distinguer —
> à toi de choisir qui garde « Pic-pic ».

#### La mécanique commune des piquants : `piquant: true`

**Tous ceux qui pic-pic rendent malade.** Fugu, Oursin, Rascasse : au contact,
la victime prend un `malaise()` (la fonction existe déjà — elle borne la faim à
0,9, se voit sur le visage, et **ne tue jamais**) puis détale. C'est la
contrepartie de leur immunité : personne ne les mange, et c'est pour ça.

Ça rejoint les deux sources de maladie **déjà codées** — avaler un caca, et
respirer le prout du Perroquet Pétomane. Une seule exception à prévoir : le
Poisson-Tapis mange les cacas **sans être malade**.

#### Fiche : l'Anguille Coup-de-Jus

**Ce qu'elle fait.** Elle **électrocute** ce qui l'approche. Des **éclairs**
partent d'elle, et les touchés sont **sonnés** — exactement l'effet du choc
contre un gros, qui existe déjà et se lit déjà (`Entity.assomme` : il part en
vrille, voit des étoiles, reste hébété quelques secondes). **Les très faibles en
meurent.**

**La mécanique à créer : `shock: { range, cooldown }`.**

- la décharge frappe **tous** les voisins du rayon, pas seulement un ;
- effet par défaut : `assomme()` — rien à inventer, tout est déjà là ;
- **la mort ne frappe que les très faibles** : à définir précisément (les
  alevins ? en dessous d'une taille ? les déjà affamés ?). Seul point à
  trancher avant de coder ;
- un **cooldown franc** entre deux décharges, sinon elle vide son voisinage en
  quelques secondes — la leçon de la murène « ping-pong » et du `_snapCd` de la
  Baudroie ;
- les éclairs sont un nouveau VFX dans `particles.js`.

**⚠️ Le point délicat.** C'est la **première mécanique du jeu qui tue sans
manger**. Elle échappe donc à tous les garde-fous d'équilibre — report de
prédation, `refugeFloor`, plafonds — qui ne comptent que la prédation. À
surveiller en simulation longue avant de la valider.

### Grands prédateurs et base de chaîne (3)

| Poisson | Niv. | Ce qu'il apporte | Source |
|---|:--:|---|:--:|
| **Barracuda** | T4 | fonce à travers les Fugus et les fait **exploser** (`Entity.explose`) — le seul à pouvoir les manger sans se piquer | E |
| **Krill** | T1 | la Baleine et la Raie filtrent aujourd'hui du plancton **abstrait** ; un krill visible donnerait un sens à leur passage | A |
| **Requin-marteau** | T4 | *optionnel.* `CLAUDE.md` prévient que concentrer plusieurs prédateurs sur une même proie la fait s'effondrer — à n'ajouter qu'avec sa propre proie. | A |

### Noms à trancher sur l'existant

Cinq espèces codées portent un nom différent de la liste de souhaits :

| Liste de souhaits | Dans le jeu | Remarque |
|---|---|---|
| Orque **Echo** | Orque **Blagueuse** | « Echo » dit l'écholocation, « Blagueuse » ses gags |
| Calmar **Violette** | Calamar **Fusée** | « Fusée » raconte sa propulsion |
| Anémone **Câline** | l'Anémone n'a pas de surnom ; « Câline » est l'**Étoile de Mer** | un seul « Câline » possible |
| Poisson-lune **Bada-boum** | Poisson-lune **Zen** | **à intervertir, voir ci-dessous** |
| Hippocampe **Zen** | Hippocampe **Timide** | idem |

**L'inversion Zen / Bada-boum vaut d'être prise telle qu'elle est écrite dans la
liste de souhaits.** Le môle a déjà `sleeps: true`, il pique du nez en pleine
journée : « Bada-boum » raconte sa chute. Et un hippocampe minuscule qui
s'appelle « Zen », c'est plus drôle que l'inverse.

---

## 2. Gags et mises en scène

Sans nouvelle espèce : tout réutilise des mécaniques en place (phases de gag,
`_freeze`, `_faceAt`, émotions, `Particles.comic`).

### Rôles à confier à une espèce existante

Plutôt que d'en créer trois de plus — ce sont des **rôles**, pas des poissons :

- **Maître nageur** — remonte à la surface tout poisson échoué sur le sable. Le
  cas `_sec` existe déjà et se termine aujourd'hui par une mort que personne ne
  voit. À confier au Dauphin.
- **Poisson-guide** — nage en tête d'une file indienne et « commente » devant
  chaque élément de décor (`Background.habitatSpots`). Au Perroquet.
- **Mascotte du parc** — salue le curseur quand il passe près d'elle. Le regard
  suit déjà la souris (`updateEyeLook`), il ne manque que le coucou.

### Attractions et spectacles

- **L'heure du spectacle** — à heure fixe du cycle jour/nuit, dauphin et orque se
  rejoignent et enchaînent des sauts synchronisés (`jumps`). Les autres espèces
  s'arrêtent et regardent (`_freeze` + `_faceAt`) : un public. Une seule bulle 👏
  au plongeon final.
- **Le cerceau de corail** — un anneau posé en pleine eau. Le traverser en fuite
  vaut une émotion `proud` et des ⭐. Les dauphins le visent exprès.
- **Le grand huit du courant** — une veine de courant visible qui emporte qui s'y
  met, expression `dizzy` à la sortie.
- **Le toboggan de sable** — sur les fortes pentes (`World.slopeAt`), un crabe
  qui glisse sur le dos jusqu'en bas.
- **Photo souvenir** — un flash ; tout le monde dans le cadre se fige une
  demi-seconde, et l'un d'eux a raté la pose (paupières fermées).
- **Le crabe magicien** — de temps en temps, un crabe sort un chapeau et fait
  apparaître des crevettes. Spawn réel de 1 à 3 crevettes à la fin du tour.

### Vie de parc

- **La file d'attente** — devant l'anémone la plus peuplée, chacun regarde la
  nuque du précédent, avec un impatient qui double et se fait rappeler à l'ordre.
- **Le stand de nourriture** — une bouée où les graines s'accumulent quand on
  clique au même endroit : attroupement, bousculade, un poisson éjecté du tas.
- **Le distributeur en panne** — une graine coincée : trois poissons tapent
  dessus à tour de rôle, elle tombe sur le dernier arrivé.
- **Panneau « Ne pas nourrir »** — au-dessus d'une espèce qui le regarde,
  désespérée, chaque fois qu'on la nourrit.
- **Fermeture du parc** — à la tombée de la nuit, les lumières s'éteignent zone
  par zone et les dormeurs rejoignent leur coin.
- **Objets perdus** — un seau, un tuba, une chaussure au fond. Un poulpe se les
  met sur la tête.

### Événements

- **Naissance annoncée** — une éclosion massive déclenche confettis et
  attroupement (`Ecosystem.layEgg` sait déjà pondre en paquet).
- **Le poisson du mois** — une créature tirée au sort porte une écharpe pendant
  une journée de jeu, et tout le monde la laisse passer.
- **La chasse au trésor** — un coffre au fond, ouvert par trois créatures
  différentes venues chacune à leur tour, qui recrache un banc de poissons dorés
  éphémères.

---

## 3. À corriger sur l'existant

- **Le comportement ninja du Poulpe ne se voit pas.** Le rendre lisible par des
  phases visibles : se faufiler, se figer, disparaître d'un coup, réapparaître
  ailleurs. Aujourd'hui ce n'est qu'un flag `ink`.
- **Le rot d'encre.** L'encre doit sortir comme un **rot** mis en scène
  (inspiration, rot, nuage), pas comme un nuage silencieux.

---

## 4. Interaction joueur

- **Canne à pêche** — depuis la surface, lancer une ligne et attraper certains
  poissons de surface. Nouvel outil dans `input.js`, à articuler avec le clic
  « nourrir » existant.

---

## 5. Économie de l'aquarium

**On achète des poissons, on est récompensé quand l'aquarium se porte bien, on
est sanctionné quand il se déséquilibre.** Pas de mode séparé, pas d'écran de
victoire : une couche d'argent posée sur l'aquarium contemplatif, qu'on peut
regarder ou ignorer.

### La boucle

1. **Acheter** — un menu d'espèces, chacune avec son prix. Clic sur une vignette,
   puis clic dans l'eau : le couple apparaît. Le prix monte avec le niveau
   trophique (une crevette coûte trois fois rien, un cachalot une fortune).
2. **Encaisser les naissances** — chaque éclosion rapporte. Elle tombe toute
   seule quand l'écosystème tourne : on est payé pour avoir créé les conditions,
   pas pour avoir cliqué.
3. **Payer les dégâts** — une espèce qui s'éteint coûte cher ; une espèce
   envahissante coûte en continu tant que ça dure.

Rien de tout ça ne touche à la simulation : ce sont des **écouteurs** branchés
sur des événements qui existent déjà (`layEgg`, `die`, `counts`, `popCap`).

### Ce qui rapporte

| Événement | Gain |
|---|---|
| Éclosion d'un œuf | petit, par tête — le revenu de base |
| Éclosion d'une espèce **rare** (< 25 % de son plafond) | ×3 : on est payé pour repeupler ce qui manque |
| Première naissance d'une espèce qu'on vient d'acheter | prime fixe |
| Espèce tenue **dans sa fourchette saine** une journée de jeu | rente quotidienne |
| **Tous** les niveaux trophiques occupés en même temps | grosse rente |

### Ce qui coûte

| Événement | Perte |
|---|---|
| Espèce sous son plancher (`refugeFloor`) | amende unique — l'alerte, on est encore à temps |
| Espèce **éteinte** | grosse amende |
| Espèce **envahissante** (> ~85 % de `popCap` durablement) | ponction continue |
| Fond couvert de cacas | ponction continue, faible |
| Faire venir des poissons du large | coût fixe |

Les **paliers** viennent de là : qui laisse filer perd lentement, qui tient une
chaîne gagne bien, qui tient toute la chaîne trophique gagne beaucoup. Trois
régimes, sans mode ni menu.

### Trois décisions avant de coder

- **Peut-on tomber à zéro ?** Le GDD (§9) dit qu'on ne perd jamais. Proposition :
  on passe dans le rouge, mais **rien ne s'arrête** — on ne peut plus acheter
  tant qu'on n'est pas remonté. La sanction est de ne plus pouvoir jouer avec son
  jouet, pas de perdre la partie.
- **L'immigration reste-t-elle automatique ?** Elle ressuscite aujourd'hui une
  espèce éteinte en 25 s, ce qui annulerait l'amende d'extinction. Proposition :
  elle reste, mais **facturée**, avec une notification (« un banc de sardines est
  arrivé du large — 40 pièces »).
- **Le boom de nourrissage.** Nourrir monte le plafond jusqu'au double : on
  pourrait fabriquer des naissances pour se payer. Soit un rendement décroissant
  sur les naissances issues d'un boom, soit laisser faire. **Ne jamais punir le
  joueur qui nourrit** (GDD §9).

### Ce qu'il faut afficher, et pas plus

Une cagnotte, et la **dernière variation** qui remonte en fondu là où elle s'est
produite : `+3` au-dessus de l'œuf qui éclôt, `−80` sur la dernière murène qui
meurt. C'est ça qui apprend le jeu, pas un tableau de bord.

Dans la fiche d'identité (`idcard.js`), **une seule ligne de plus** : où en est
la population par rapport à sa fourchette saine, en une barre à trois zones
(rouge bas / vert / rouge haut).

### Pièges prévisibles

- **Poser un prédateur sans sa proie** doit se voir *avant* le clic : la vignette
  doit dire « mange : X, Y — aucun dans votre aquarium ».
- **Les espèces lentes ne migrent pas** (`speed < 45`) : posées loin de leur
  frayère, elles ne se reproduiront jamais, donc ne rapporteront jamais. Le
  fantôme de placement doit refuser les emplacements sans issue.
- **Tout sera posé au même endroit.** Prévoir un rayon d'éparpillement, comme
  `spawnGroups`.
- **Les revenus doivent être lisibles à l'échelle d'une session**, pas d'une
  simulation de 16 minutes.

---

## 6. Le roster existant (27 espèces)

Ce qui est **codé** dans `js/species.js`. Treize de ces espèces n'apparaissent
dans aucune liste de souhaits, et ce sont elles qui tiennent l'équilibre : elles
sont en **gras**.

| Espèce | Vraie espèce | Niv. | Taille | Où | Mange |
|---|---|:--:|---:|---|---|
| Poisson Confetti | banc de poissons tropicaux | T2 | 11 | eau claire | plancton |
| Sardine Bulle-fofolle | petite sardine | T2 | 13 | surface | plancton |
| Méduse Flottante | méduse | T2 | 16 | trouble | plancton |
| Thon Speedy | thon | T3 | 26 | eau claire | confetti |
| Requin Dents-Molles | requin | T4 | 70 | trouble | thon, perroquet |
| **Crabe Disco** | crabe | Ch | 13 | tout le fond | plancton, charogne |
| **Coquillage Rieur** | bénitier | T1 | 12 | eau claire | plancton |
| **Baleine Gros Dodo** | baleine à fanons | T3 | 190 | profond | plancton (filtreur) |
| **Étoile de Mer Câline** | étoile de mer | T1 | 10 | eau claire | plancton |
| Anémone | anémone de mer | T1 | 18 | eau claire | plancton (+ refuge de ponte) |
| Poisson Volant Cascadeur | exocet | T2 | 14 | surface | plancton |
| **Fou Moustachu Volant** | fou de Bassan | T4 | 22 | ciel | volant, sardine |
| Poisson-clown Chatouille | poisson-clown | T2 | 12 | eau claire | plancton |
| Hippocampe Timide | hippocampe | T2 | 13 | eau claire | plancton |
| Poisson-perroquet Pétomane | poisson-perroquet | T2 | 20 | eau claire | plancton |
| **Dauphin Farceur** | dauphin | T3 | 42 | eau claire | confetti, perroquet |
| **Poulpe Ninja** | poulpe | Ch | 24 | trouble → abysses | plancton, charogne |
| **Murène du Récif** | murène | T4 | 30 | trouble | confetti, perroquet, méduse |
| **Raie Ronron** | raie manta | T3 | 34 | trouble | plancton |
| Poisson-lune Zen | môle | T3 | 50 | trouble | méduse |
| Orque Blagueuse | orque | T4 | 70 | trouble | thon, dauphin |
| **Poisson-lanterne Allumeur** | baudroie abyssale | T2 | 16 | abysses | crevette |
| **Poisson-Tapis Câlin** | requin-tapis | T4 | 20 | abysses | lanterne, crevette |
| **Cachalot Profond** | cachalot | T3 | 100 | profond → abysses | poulpe, calamars |
| Crevette Guirlande | crevette abyssale | T2 | 7 | abysses | plancton |
| Calamar Fusée | encornet | T3 | 19 | abysses | crevette, lanterne |
| **Calamar Géant Timide** | Architeuthis | T4 | 78 | abysses | calamar, poulpe |

Les **algues ondulantes** existent aussi, mais comme **décor**
(`Background.flora`), pas comme espèce.

### Répartition actuelle, et ce qu'elle dit

| Zone | Espèces | |
|---|:--:|---|
| Ciel | 1 | à étoffer (3 oiseaux souhaités) |
| Surface | **2** | **la plus pauvre** |
| Eau claire | 9 | la plus fournie |
| Zone trouble | 6 | |
| Profond / abysses | 8 | complète depuis la chaîne abyssale |
| Tout le fond | 1 | le Crabe Disco, sans bande de profondeur |

| Niveau | Espèces | |
|---|:--:|---|
| T1 (brouteurs) | **3** | **tous `fixed`** — aucun brouteur mobile |
| T2 | 9 | |
| T3 | 7 | |
| T4 | 6 | |
| Charognards | 2 | |

---

## 7. Contraintes à respecter en ajoutant une espèce

Rappels tirés des erreurs déjà payées — le détail est dans `CLAUDE.md`.

- **`groupSize: [1, 1]` condamne l'espèce** : il en faut deux pour se reproduire.
- **Une proie hors de la bande de profondeur du prédateur est inatteignable** :
  il la poursuit, sa contrainte verticale le rappelle, il meurt de faim.
- **Un petit nageur de surface a besoin de `offshore`**, sinon le ressac le
  plaque sur la plage dès qu'on le poursuit.
- **Un embusqué a besoin d'un `senseRange` bien plus grand que son
  `ambush.range`** : sinon il ne sait pas vers quoi ramper.
- **Une espèce à longévité courte à la base d'une chaîne s'éteint** : elle n'a le
  temps que d'une seule portée.
- **Concentrer plusieurs prédateurs sur une même proie la fait s'effondrer**, et
  tout ce qui en dépend avec elle.
- **Toute nouvelle silhouette passe par le visage commun** (`FishBody.face`),
  jamais par des yeux dessinés à la main.
- **Nouveau fichier js = à ajouter dans `boot.js`**, pas dans `index.html`.
