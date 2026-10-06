# Aquarium Vivant — ce qui reste à faire

Toutes les idées rassemblées et dédoublonnées : les propositions des enfants, la
liste de souhaits d'espèces, les gags dans l'esprit parc à thème, la couche
économique.

**État au 5 septembre 2026** : le §1 est **fait** — 21 des 25 espèces manquantes
sont codées et équilibrées, le roster passe de 27 à **51** — la liste complète
et le détail de chacune sont dans **`FICHES.md`**, qui fait autorité. Le reste du document
(§2 à §5) n'est pas codé. `FICHES.md` décrit chaque espèce du roster une par une.

| Section | Contenu |
|---|---|
| [§1](#1-les-poissons-manquants--21-sur-25-sont-faits) | Les poissons manquants — **21 sur 25 sont faits** |
| [§2](#2-gags-et-mises-en-scène) | Gags et scènes, sans nouvelle espèce |
| [§3](#3-à-corriger-sur-lexistant) | À corriger sur l'existant |
| [§4](#4-interaction-joueur) | Interaction joueur |
| [§5](#5-économie-de-laquarium) | L'économie de l'aquarium |
| [§6](#6-le-roster-existant-27-espèces) | Le roster existant |
| [§7](#7-contraintes-à-respecter-en-ajoutant-une-espèce) | Contraintes à respecter |

---

## 1. Les poissons manquants — **21 sur 25 sont faits**

*Mis à jour le 4 septembre 2026. Le roster est passé de 27 à **51 espèces**.*

Toutes les espèces listées ici ont été codées, équilibrées en simulation et
décrites dans `FICHES.md` :

**Récif et eau claire** — Poisson Dentiste, Fugu Gonflé, Poisson Police, Mérou
Patatras, Poisson Papillon Amoureux, Dorade Dorée, Poisson Coffre-au-Trésor,
Nudibranche Fluo, Corail Viva.

**Surface** — Tortue Papi, Espadon Voilier, Maquereau Métronome, Crevette
Sauteuse.

**Ciel** — Pélican Attrape-Tout, Goéland Chapardeur, Cormoran Sous-Marin.

**Fond** — Anguille Jardinière, Bernard-l'Ermite Déménageur, Concombre
Aspirateur, Rascasse Épineuse, Oursin Pic-Pic.

**Le large** — Barracuda Perce-Ballon, Anguille Coup-de-Jus, Krill Étincelle.

### Ce qui reste à inventer

- **Requin-marteau** — resté optionnel : `CLAUDE.md` prévient que concentrer
  plusieurs prédateurs sur une même proie la fait s'effondrer, et le large en
  compte déjà six.

### Six espèces d'ambiance n'ont pas de gag

Dorade, Corail, Maquereau, Crevette Sauteuse, Oursin, Krill. C'est **assumé** :
elles remplissent l'eau, on les regarde en masse sans les suivre. Leur donner
une scène coûterait du budget de bulles (déjà à 567/min pour 250 visées) sans
rien raconter de plus.

### La leçon de la grande vague

Vingt et une espèces d'un coup, c'est **+300 entités** et la simulation qui passe
de 4,8 à 7,6 ms (elle monte en O(n^1,4)). Les espèces d'**ambiance** ont donc été
dimensionnées à la moitié de ce qu'on croirait : elles remplissent l'eau aussi
bien à 30 qu'à 60, et chaque individu coûte. Retombé à 6,0 ms.

Deuxième leçon : **une silhouette posée au sol doit être inscrite dans TROIS
listes** (`GROUND_RENDERS`, `bottomDweller` du spawn, et le calage en y). L'oursin
n'était dans aucune : il flottait en pleine eau, à 1 100 px au-dessus du sable.

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

- **Galipettes du Dauphin hors de l'eau**, avec **télescopage d'oiseaux** en
  vol (à articuler avec `aerial`, `snatch` et la phase aérienne des sauteurs).

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
- **Les oursins sont agglutinés sur la plage.** À mesurer (positions, bande de
  profondeur, `sitesHabitat`) avant de régler — cf. les règles d'entassement du
  CLAUDE.md.
- **Les arêtes** (`Food.bones`) : améliorer leur dessin.
- **Poisson Archer et Requin Marteau** : vérifier que leurs gags se jouent bien
  et à la bonne cadence (audit « 53 sur 53 vivantes » à refaire, scène par scène).
- **Fiche d'identité de la loupe sur le côté**, comme la barre de zone, plutôt
  qu'au survol de la créature. À arbitrer : lisibilité sur mobile, fiche épinglée.

---

## 4. Interaction joueur

- **Canne à pêche** — depuis la surface, lancer une ligne et attraper certains
  poissons de surface. Nouvel outil dans `input.js`, à articuler avec le clic
  « nourrir » existant.
- **Attraper un poisson à la main** — le joueur saisit une créature (glisser ou
  maintien), la déplace et la relâche. Pas de la canne : contact direct, avec
  tactile en tête (cf. `Input.touch*`) ; prévoir la réaction (visage, gigotement).

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

## 6. Le roster (51 espèces)

Le tableau ci-dessous est celui des **27 espèces d'origine** ; les 24 ajoutées
depuis (§1) sont décrites une par une dans **`FICHES.md`**, qui fait autorité.
Treize des espèces ci-dessous n'apparaissaient dans aucune liste de souhaits, et
ce sont elles qui tiennent l'équilibre : elles sont en **gras**.

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
| **Poisson-Tapis Grande-Bouche** | requin-tapis | T4 | 20 | abysses | lanterne, crevette |
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
