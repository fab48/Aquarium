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

# Mode « Directeur du parc » — peupler l'aquarium à la souris

Idée : un menu d'espèces, on en pose à la souris, et on **gagne si l'écosystème
tient**, on perd sinon.

## Le conflit à trancher d'abord

Le jeu actuel est **conçu pour qu'on ne puisse pas perdre** (GDD §9). Quatre
mécanismes y veillent, tous documentés dans `CLAUDE.md` :

| Mécanisme | Ce qu'il empêche | Effet sur un mode « perdre » |
|---|---|---|
| Plancton ambiant (`World.planktonAt`) | la mort de faim | un herbivore ne meurt jamais, même sans rien |
| Report de prédation (`Ecosystem.refugeFloor`) | l'extinction en cascade | sous 22 % du plafond, l'espèce est intouchable |
| Immigration (`Ecosystem.immigration`) | l'extinction définitive | une espèce éteinte revient toute seule en 25 s |
| Plafonds (`popCap`) + `boom` | la surpopulation | nourrir ne peut pas casser l'équilibre |

Un mode compétitif ne se **superpose** donc pas au jeu : c'est un **mode à
part**, avec ces filets de sécurité coupés ou affaiblis. À décider explicitement,
et à garder séparé du mode contemplatif, qui reste le cœur du projet.

Proposition : un flag global `CONFIG.MODE` (`'libre'` par défaut, `'defi'`).
En mode `defi` : pas d'immigration, `refugeFloor` ramené à ~5 %, plancton
divisé par deux. Tout le reste du moteur est inchangé.

## Ce que le mode ajoute

1. **Un menu d'espèces** — vignettes, chacune avec un **coût** et sa fiche
   (régime, proies, prédateurs : `IdCard` sait déjà tout dire). Clic sur une
   vignette, puis clic dans l'eau = on pose un couple. Le curseur montre en
   fantôme la silhouette et refuse les zones invalides (mauvaise bande de
   profondeur, hors barrière `offshore`, colonne d'eau trop basse) — toutes ces
   règles existent déjà dans le spawn, il n'y a qu'à les exposer avant le clic.
2. **Un budget** — on ne peut pas tout poser. C'est ce qui fait le jeu : on
   choisit une chaîne, pas un catalogue.
3. **Une jauge de santé du récif**, lisible en un coup d'œil : nombre de niveaux
   trophiques occupés, nombre d'espèces au-dessus de leur `refugeFloor`,
   biomasse totale, cacas au sol. Un seul indicateur affiché, les détails au
   survol.
4. **Une condition de victoire par la durée** : tenir N jours de jeu sans
   qu'aucune espèce posée ne s'éteigne. La défaite, c'est une extinction — et
   comme le joueur *voit* venir la chute d'une population, il peut corriger.
5. **Un droit à l'erreur** : le filet d'immigration devient un **objet payant**
   (« faire venir des poissons du large »), ce qui transforme le garde-fou
   automatique d'aujourd'hui en décision de joueur.

## Pourquoi ça devrait bien marcher ici

Le moteur fait déjà tout le travail dur : chaîne alimentaire déclarative
(`prey`), plafonds, frayères, report de prédation. Le mode n'est presque que de
l'**interface** — un menu, un budget, une jauge, une condition d'arrêt — plus le
débranchement des filets de sécurité.

## Pièges prévisibles

- **Poser un prédateur sans sa proie** doit se voir *avant* le clic, pas trois
  minutes plus tard quand il meurt de faim. La fiche du menu doit dire « mange :
  X, Y — dont aucun dans votre aquarium ».
- **Le joueur va tout poser au même endroit.** Le spawn actuel répartit les
  groupes ; à la souris, il faut au minimum un rayon d'éparpillement.
- **Les espèces lentes ne migrent pas** (`speed < 45`) : posées loin de leur
  frayère, elles ne se reproduiront jamais. Le fantôme de placement doit le dire.
- **Une partie doit durer quelques minutes, pas 16.** Les constantes actuelles
  (longévités, taux de ponte) sont réglées pour la contemplation. Un mode défi
  demande une **accélération globale du temps**, pas un reréglage espèce par
  espèce.
- **Ne jamais punir le joueur qui nourrit** (GDD §9) : le `boom` doit rester une
  aide, même en mode défi.
