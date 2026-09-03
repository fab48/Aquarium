# Idées à faire (proposées par les enfants)

Notes brutes, à raffiner au moment de l'implémentation. Rien n'est codé ici.

## Nouvelles espèces

- **Poisson Ballon Piquant** — gonfle tout rond quand on l'approche de trop près,
  et pique l'importun. Piste : réutiliser `_gonfle` (déjà là pour le gavage) mais
  déclenché par la proximité, plus un flag `spiky` qui inflige une réaction de
  douleur (émotion + fuite) au prédateur qui touche. Attention à `peutGonfler` et
  à ne pas confondre avec l'explosion de surpoids.
- **Barracuda** — fonce à travers les ballons piquants et les fait **exploser**
  (le seul à pouvoir les manger sans se piquer). Charge en ligne droite, très
  rapide. Réutiliser `Entity.explose`.
- **Poisson Police** — gronde ceux qui pètent ou font des farces. Réagit aux
  événements existants (prout, caca, gags) : se déplace vers le fautif, émotion
  `angry`, une seule bulle. Le fautif passe en `ashamed`.
- **Poisson Dentiste** — soigne la bouche des prédateurs. Scène en trois temps :
  le prédateur s'arrête bouche ouverte (`_freeze` + `_faceAt`), le dentiste
  travaille, les deux repartent. Le prédateur ne mange pas son dentiste.

## Gags

- **Crabe magicien** — de temps en temps, un crabe sort un chapeau et fait
  apparaître des crevettes. Gag rare, à mettre dans `gags.js` ; spawn réel de
  1–3 crevettes à la fin du tour.
- **Poulpe Ninja : rot d'encre** — l'encre doit sortir comme un **rot** (mise en
  scène : inspiration, rot, nuage), pas comme un simple nuage silencieux.

## À corriger / renforcer

- **Le comportement ninja du poulpe ne se voit pas.** Il faut le rendre lisible :
  se faufiler, se figer, disparaître d'un coup, réapparaître ailleurs — des
  phases visibles, pas juste un flag `ink`.

## Interaction joueur

- **Canne à pêche** — depuis la surface, lancer une ligne et attraper certains
  poissons de surface. Nouvel outil d'input (cf. `input.js`), à articuler avec le
  clic « nourrir » existant.

---

# Esprit « parc aquatique » (propositions)

L'aquarium est déjà un spectacle qu'on regarde. Ces idées poussent le côté
**parc à thème** : des attractions, des employés, des horaires, du public.
Toutes réutilisent des mécaniques déjà en place (phases de gag, `_freeze`,
`_faceAt`, émotions, frayères, `Particles.comic`).

## Attractions et spectacles

- **L'heure du spectacle** — à heure fixe du cycle jour/nuit, dauphin et orque
  se rejoignent au même endroit et enchaînent des sauts synchronisés. Réutilise
  `jumps`. Les autres espèces s'arrêtent et regardent (`_freeze` + `_faceAt`) :
  un public. Une seule bulle 👏 au moment du plongeon final.
- **Le cerceau de corail** — un anneau de décor posé en pleine eau. Un poisson
  qui le traverse en fuite gagne une émotion `proud` et des ⭐. Les dauphins le
  visent exprès.
- **Le grand huit du courant** — une veine de courant visible (traînée de
  bulles) qui emporte qui s'y met, tête la première, expression `dizzy` à la
  sortie. Décor + champ de vitesse local, aucune nouvelle espèce.
- **Le toboggan de sable** — sur les fortes pentes du fond, un crabe qui glisse
  sur le dos jusqu'en bas. `World.slopeAt` donne déjà la pente.
- **Photo souvenir** — un flash se déclenche de temps en temps ; tout le monde
  dans le cadre se fige une demi-seconde, yeux ronds, avec l'un des poissons
  qui a raté la pose (paupières fermées, `sleeping`).

## Personnel du parc

- **Le poisson-guide** — nage lentement en tête d'une file indienne de petits
  poissons et « commente » devant chaque élément de décor. Reprend la mécanique
  de banc, avec une cible qui saute de site en site (`Background.habitatSpots`).
- **Le poisson-vigile** — cousin du **Poisson Police** déjà noté : il siffle
  quand quelqu'un dépasse la ligne rouge (la barrière de rivage, `limiteLarge`)
  et le renvoie au large.
- **Le poisson-balayeur** — mange les cacas au sol (`Food.poops`) et râle à
  chaque fois. Il rend le mécanisme de trop-plein lisible, et il a une vraie
  utilité d'équilibre : il nettoie le fond.
- **Le maître nageur** — remonte à la surface tout poisson échoué sur le sable
  (le cas `_sec` existe déjà et se termine aujourd'hui par une mort discrète).
- **La mascotte du parc** — un poisson déguisé (grosse tête en mousse) qui salue
  le curseur quand il passe près de lui. Le regard suit déjà la souris
  (`updateEyeLook`), il ne manque que le coucou.

## Vie de parc

- **La file d'attente** — devant l'anémone-refuge la plus peuplée, les candidats
  font la queue en rang, chacun regardant la nuque du précédent, avec un
  impatient qui double et se fait rappeler à l'ordre.
- **Le stand de nourriture** — une bouée à la surface où les graines
  s'accumulent quand le joueur clique au même endroit ; ça fait un attroupement,
  et l'attroupement fait un gag (bousculade, un poisson éjecté du tas).
- **Le distributeur en panne** — une graine coincée : trois poissons tapent
  dessus à tour de rôle, elle finit par tomber sur le dernier arrivé.
- **Panneau « Ne pas nourrir »** — au-dessus d'une espèce, avec l'espèce en
  question qui le regarde, désespérée, à chaque fois qu'on la nourrit.
- **Fermeture du parc** — à la tombée de la nuit, les lumières s'éteignent zone
  par zone et les dormeurs rejoignent leur coin. Le cycle jour/nuit existe déjà,
  il ne se voit que dans le ciel.
- **Objets perdus** — un seau, un tuba, une chaussure tombés au fond. Un poulpe
  se les met sur la tête.

## Anniversaires et événements

- **Naissance annoncée** — une éclosion massive déclenche des confettis et
  l'attroupement de tout le voisinage. `Ecosystem.layEgg` sait déjà pondre en
  paquet.
- **Le poisson du mois** — une créature tirée au sort porte une écharpe pendant
  une journée de jeu, et tout le monde la laisse passer.
- **La chasse au trésor** — un coffre au fond, ouvert par trois créatures
  différentes venues chacune à leur tour, qui recrache un banc de poissons dorés
  éphémères.

---

# Économie de l'aquarium — acheter des poissons, être payé pour l'équilibre

L'envie de départ est simple, et il faut la garder simple : **on achète des
poissons, on est récompensé quand l'aquarium se porte bien, on est sanctionné
quand il se déséquilibre.** Pas de mode de jeu séparé, pas d'écran de victoire :
une couche d'argent posée sur l'aquarium contemplatif, qu'on peut regarder ou
ignorer.

## La boucle

1. **Acheter** — un menu d'espèces, chacune avec son prix. Clic sur une vignette,
   puis clic dans l'eau : le couple apparaît. Le prix monte avec le niveau
   trophique (une crevette coûte trois fois rien, un cachalot coûte une fortune).
2. **Encaisser les naissances** — chaque éclosion rapporte. C'est la récompense
   principale, et elle tombe toute seule quand l'écosystème tourne : le joueur
   est payé pour avoir créé les conditions, pas pour avoir cliqué.
3. **Payer les dégâts** — une espèce qui s'éteint coûte cher ; une espèce qui
   devient envahissante coûte aussi, un peu moins, et en continu tant que ça dure.

Rien de tout ça ne touche à la simulation : ce sont des **écouteurs** branchés
sur des événements qui existent déjà (`layEgg`, `die`, `counts`, `popCap`).

## Barème (à régler, mais l'esprit y est)

### Ce qui rapporte

| Événement | Gain | Pourquoi |
|---|---|---|
| Éclosion d'un œuf | petit, par tête | le revenu de base, régulier |
| Éclosion d'une espèce **rare** dans l'aquarium (< 25 % de son plafond) | ×3 | on est payé pour repeupler ce qui manque |
| Première naissance d'une espèce qu'on vient d'acheter | prime fixe | ça valide l'installation |
| Une espèce tenue **dans sa fourchette saine** pendant une journée de jeu | rente quotidienne | le vrai revenu du joueur avisé |
| **Tous** les niveaux trophiques occupés en même temps | grosse rente | l'objectif implicite du jeu |

### Ce qui coûte

| Événement | Perte | Pourquoi |
|---|---|---|
| Espèce descendue sous son plancher (`refugeFloor`) | amende, une fois | l'alerte : on est encore à temps |
| Espèce **éteinte** | grosse amende | la faute grave |
| Espèce **envahissante** (> ~85 % de `popCap` durablement) | ponction continue | l'excès coûte tant qu'il dure |
| Fond couvert de cacas | ponction continue, faible | rend visible le trop-plein |
| Faire venir des poissons du large (l'immigration, devenue payante) | coût fixe | le filet de sécurité devient une décision |

Les **paliers** viennent naturellement de là : le joueur qui laisse filer perd
lentement, celui qui tient une chaîne complète gagne bien, celui qui tient toute
la chaîne trophique gagne beaucoup. Trois régimes, sans mode ni menu.

## Trois décisions à prendre avant de coder

- **Peut-on tomber à zéro ?** Le GDD (§9) dit qu'on ne perd jamais. Proposition :
  on peut passer dans le rouge, mais **rien ne s'arrête** — on ne peut simplement
  plus acheter tant qu'on n'est pas remonté. La sanction est de ne plus pouvoir
  jouer avec son jouet, pas de perdre la partie.
- **L'immigration reste-t-elle automatique ?** Aujourd'hui elle ressuscite toute
  seule une espèce éteinte en 25 s — ce qui annulerait l'amende d'extinction.
  Proposition : elle reste, mais **facturée** au joueur, avec une notification
  (« un banc de sardines est arrivé du large — 40 pièces »).
- **Le boom de nourrissage.** Nourrir monte le plafond jusqu'au double : le
  joueur pourrait déclencher artificiellement des naissances pour se payer. Deux
  garde-fous possibles — un rendement décroissant sur les naissances issues d'un
  boom, ou tout simplement laisser faire (nourrir en continu demande de rester
  là, et c'est déjà le jeu). **Ne jamais punir le joueur qui nourrit** (GDD §9).

## Ce qu'il faut afficher, et pas plus

Une cagnotte, et la **dernière variation** qui remonte en fondu à l'endroit où
elle s'est produite : `+3` au-dessus de l'œuf qui éclôt, `−80` sur la dernière
murène qui meurt. C'est ça qui apprend le jeu — pas un tableau de bord.

La fiche d'identité (`idcard.js`) sait déjà tout dire d'une espèce ; il suffit
d'y ajouter **une ligne** : où en est sa population par rapport à sa fourchette
saine, en une barre à trois zones (rouge bas / vert / rouge haut).

## Pièges prévisibles

- **Poser un prédateur sans sa proie** doit se voir *avant* le clic : la vignette
  du menu doit dire « mange : X, Y — aucun dans votre aquarium ».
- **Les espèces lentes ne migrent pas** (`speed < 45`) : posées loin de leur
  frayère, elles ne se reproduiront jamais, donc ne rapporteront jamais. Le
  fantôme de placement doit refuser les emplacements sans issue.
- **Le joueur va tout poser au même endroit.** Prévoir un rayon d'éparpillement,
  comme le fait `spawnGroups`.
- **Les revenus doivent être lisibles à l'échelle d'une session**, pas d'une
  simulation de 16 minutes. Si une éclosion rapporte trop peu pour se voir, la
  boucle ne s'apprend pas.
