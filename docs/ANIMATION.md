# Animation, émotions et mise en scène

Le visage commun, les émotions, les gags comme animations, l'anticipation et la flèche, les scènes et clips, la cadence de l'aquarium, la nage et le demi-tour.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

- `fishbody.js` — rendu cartoon procédural. **Système yeux/SOURCILS/bouche commun** partagé par toutes les silhouettes.

### Émotions

`FishBody.EMOTIONS` est une table de paramètres (ouverture d'œil, pupille, regard, paupière, **angle et hauteur du sourcil**, bouche, rougeur) : idle, happy, love, eating, sleeping, dizzy, scared, blush, angry, proud, ashamed. Ajouter une émotion = ajouter une ligne.

**Ce que la bouche EXPRIME est séparé de ce à quoi elle RESSEMBLE.** Les
émotions restent communes à tout l'aquarium ; la forme de la bouche est un
réglage d'espèce ou de dessin (`boucheStyle` : `standard`, `grande`, `petite`,
`gueule` à dents, `bec`, `ventouse`, table `FishBody.BOUCHES`). Tout le monde
avait la même petite bouche de dessin animé, becs d'oiseau et gueules de requin
compris. Le partage tient grâce à `FishBody.GESTE`, qui réduit chacune des
quatorze bouches du catalogue à **deux nombres** — combien elle est ouverte, si
elle sourit ou boude : c'est avec ça qu'un bec joue les dix-huit émotions sans
qu'on le redessine dix-huit fois.

De même, ce que le visage **peint** passait par trois couleurs en dur (encre
`#1c2733`, gorge, langue). `FishBody.VISAGE` est une palette **surchargeable
partiellement** — trait, sourcil, pupille, blanc de l'œil, gorge, langue, lèvres,
dents, bec, joue — déclarée sur la fiche d'espèce (`def.visage`) ou sur le
dessin (`visage`, réglé dans l'atelier), le dessin l'emportant. Le visage étant
dessiné **par-dessus** le corps, repeindre le corps ne changeait rien : c'était
la seule prise possible sur une pupille dorée ou un bec orange.

**[EMOTIONS.md](../EMOTIONS.md) est la table de référence** : catalogue des expressions, correspondance action → émotion, budget de bulles, idées de gags à brancher. Le mettre à jour en même temps que `FishBody.EMOTIONS` et `js/legend.js`.

**Toute silhouette doit passer par le système commun.** `FishBody.face()` pour
un visage groupé, `FishBody.oeil(ctx, x, y, r, e, t)` pour un œil isolé (crabe
sur tiges, coquillage entre ses valves), `FishBody.bouche(ctx, mx, my, …)` pour
une bouche posée ailleurs qu'à sa place par défaut — c'est ce dont un sprite
dessiné à la main a besoin, son ancre de bouche n'étant pas là où le visage
commun l'attend. Le crabe et le coquillage dessinaient
les leurs à la main : ils restaient **grands ouverts en toutes circonstances**,
y compris endormis en pleine nuit — et ce sont les créatures les plus nombreuses
du fond, donc l'anomalie sautait aux yeux. Contrôle non visuel : rendre la
silhouette hors écran et compter les pixels de blanc d'œil (crabe 450 éveillé
→ 0 endormi ; coquillage 220 → 0). Le coquillage reste d'ailleurs **entrouvert**
en dormant, sinon ses yeux clos ne se verraient pas du tout.

Le sourcil porte l'essentiel de la lecture — c'est lui qu'il faut pousser en premier si une émotion ne se voit pas. **Privilégier toujours le visage** (yeux, joues, bouche, sourcils) plutôt qu'une bulle : c'est pour ça que ce socle existe.

Au repos, la **pupille suit le curseur** (`Entity.updateEyeLook` → `e._eyeLook`), avec une intensité qui décroît avec la distance et qui s'efface dès qu'une émotion prend le dessus.

Une émotion se **joue dans la durée** : `entity.emote(expr, durée)` déclenche l'expression *et* son VFX ; `entity.emoteK()` renvoie une enveloppe 0→1 (montée rapide, léger dépassement, retombée douce) avec laquelle `drawFace` interpole depuis le visage neutre. Une silhouette doit appeler `FishBody.face(ctx, taille, e, t)` (jamais `drawFace` directement) pour en bénéficier.

Une prise se lit en trois temps : impact (`Particles.chomp`), **pause de mastication** (`pred._chew`, ~0,55 s pendant laquelle il s'arrête net) avec la **queue de la proie qui dépasse de sa gueule** (`FishBody.drawMouthful`, appelé pour toutes les silhouettes), puis les témoins qui détalent.

### La fréquence d'un gag, c'est son cooldown DIVISÉ PAR L'EFFECTIF

Aucun cooldown du roster n'avait été réglé sur le nombre d'individus de
l'espèce, et l'écart mesuré entre le gag le plus fréquent et le plus rare
atteignait **cent fois** : le Fugu se gonflait toutes les 6,5 s (3 individus),
le Dauphin faisait « BOUH ! » toutes les 3,4 s quelque part dans l'aquarium
(9 individus), pendant que le Requin perdait une dent toutes les 11 minutes.

`Ecosystem.cadence(e, parMinute)` déclare la fréquence voulue **pour tout
l'aquarium** et en déduit le cooldown d'un individu, avec sa dispersion (sans
elle, un groupe né ensemble joue sa scène en chœur). C'est ce qu'il faut
utiliser pour tout nouveau gag périodique, plutôt qu'un `U.rand(a, b)` en dur.

### Une réaction ne se déclenche que sur quelqu'un qui PASSE

`Entity.passe(o)` — ni décor (`refuge`, `movement: 'fixed'`), ni immobile
(`speedNow > 12`). **Un voisin qui ne peut pas partir est un voisin permanent**,
donc toute réaction déclenchée par sa seule présence tourne en boucle sur la
même victime, indéfiniment. Mesuré avant : la Rascasse piquait le Corail
29 fois/min et l'Anémone 24 fois/min — le récif était vert de dégoût en
permanence — et l'Anguille assommait **112 créatures de fond par minute**
(coquillages, oursins, étoiles, concombres), toutes sonnées 4 à 7 % du temps.
Après : ces piqûres ont disparu et le fond est sonné **0 à 2 %** du temps.

L'Anémone et le Clown appliquaient déjà la règle pour choisir qui câliner ;
elle vaut pour `piquer()`, `decharge()` et tout ce qui viendra. Le cooldown par
victime est passé de 4 à 12 s dans la foulée, et le gonflement d'un piquant ne
répond qu'à quelque chose d'**au moins 1,6 fois sa taille** : c'est un
avertissement adressé à une menace, pas une respiration (2 % du temps gonflé
contre un gonflement toutes les 6,5 s).

### Les gags sont des ANIMATIONS, pas des bulles

Une bulle de BD ne raconte rien toute seule. Un gag lisible se construit avec :
- des **phases** (le dauphin : approche discrète → jaillissement « BOUH ! » → il se tord de rire), stockées dans un `_xxxPh` et pilotées depuis `def.gag` ;
- un **arrêt de la nage** des protagonistes (`e._freeze`), sinon la mimique défile hors champ ;
- une **orientation forcée** (`e._faceAt`) quand un poisson doit en regarder un autre — à l'arrêt, la vitesse ne dit plus où il regarde ;
- une **expression dédiée** (`laughing`, `kiss`) plutôt qu'un symbole ;
- **une seule bulle**, au moment clé.

Pièges de mise en scène déjà rencontrés :
- Une créature **fixe** ne doit jamais s'incliner (`_tilt = 0`) : son décor est dessiné dans son repère, et le rocher de la murène partait de travers.
- **Inclinaison et miroir.** `_tilt` est calculé sur `Math.abs(dirX)` : c'est déjà l'angle « non miroité », il s'applique donc **tel quel** dans les deux sens (`scale(-1,1)` puis `rotate(+tilt)`). L'inverser fait pencher à l'envers tout poisson tourné à gauche. En revanche une rotation calculée dans le repère MONDE (la pente du fond pour le rocher de la murène) doit, elle, être inversée après un miroir.
- Quand un poisson doit **viser** un autre (`_faceAt`), l'inclinaison est prise **exacte** (`atan2(dirY, |dirX|)`, bornée à 1,4 rad) : l'amortissement `+40` et la bride à 0,75 rad utilisés pour la nage normale l'empêchaient de piquer vers sa cible, d'où un bisou de travers.
- Secouer une victime en `vy` la met la tête en bas : préférer un frisson **horizontal** et brider son inclinaison.
- Un gag qui modifie une émotion doit passer `vfx: false` s'il a déjà son propre effet, sinon les deux se cumulent.

### L'anticipation, puis la flèche : la vitesse ne se lit qu'au contraste

Le grand run de l'Espadon partait sans préavis : on voyait un poisson accélérer,
pas un sprinteur se détendre. Le code du cartoon qui manquait partout est
l'**anticipation** — se comprimer comme un ressort AVANT l'action — et son
pendant, l'**étirement** pendant l'action. Deux canaux génériques, posés par
les gags et lus par `Entity.draw` dans le repère du CORPS, à volume conservé
(même leçon que le demi-tour : ce qui se perd en largeur se reprend en hauteur,
vérifié à l'encre près) :

- **`_crispe` (0→1)** — l'ANTICIPATION. Le CABRÉ (dessin de référence de
  l'auteur) : il se dresse comme un **cheval qui cabre**, le corps plié en
  vraie courbe par **LA COLONNE** (voir ci-dessous). Trois essais pour y
  arriver, chacun jugé, à raison : une rotation de 12° (illisible), rotation +
  cisaillement (« penche, ne courbe pas »), puis un pliage de PIXELS par
  tranches — qui **déchirait les SVG aux coutures**. La leçon vaut pour tout :
  **plier un dessin, c'est déformer sa GÉOMÉTRIE, jamais ses pixels.** Le
  **ressort vibre** pendant la compression (boing-boing à ~2,4 Hz), plus le
  frisson horizontal d'effort (jamais vertical : la tête en bas).
- **`_etire` (0→1)** — la DÉTENTE. La flèche : 110×41 → **149×32**, et la nage
  se **raidit** (`FishBody.raideur`, −85 % d'amplitude de battement) — « droit
  comme un i », le corps ne bat plus, il fend l'eau.

Trois scènes s'en servent : l'**Espadon** (phase `charge` de 1,15 s entre la
montée et le run — arrêt net, l'air fier tenu (`hold('proud')`), compression en
k², recul de quelques pixels, puis flèche à 1 qui se pose à 0,6 pendant le run) ;
le **Calamar Fusée** (le décompte est une compression — un calamar se propulse
littéralement en se contractant — et le départ une détente de 0,7 s) ; le
**jaillissement du Dauphin** (flèche de 0,8 qui s'efface en une demi-seconde).
Vérifié en simulation accélérée : la scène de l'Espadon se joue montée 6,7 s →
charge 1,2 s (crispe max 0,97) → run 4,6 s (438 px/s, 1 150 px de ligne droite)
→ fin 1,8 s, et les **résidus des deux canaux sont à 0** après chaque scène —
chaque phase doit remettre son canal à zéro en sortant, sinon la déformation
reste gravée sur le poisson.

**Les canaux appartiennent aux GAGS, jamais à la locomotion.** Une version
« automatique au sprint » (étirement dès 1,3× la croisière, smear dès 1,5×) a
été essayée puis RETIRÉE : elle décorait le déplacement ordinaire — 8 % de
l'aquarium smearait en permanence, du calcul pour rien — et diluait exactement
ce qu'un smear doit signaler : *cette course-ci est un événement*. La référence
est **Bip Bip et Coyote** : le monde est calme, et c'est la SCÈNE qui explose.

Deux autres codes du cartoon complètent la panoplie, tous deux mesurés :

- **La distorsion d'impact** (`Entity.choc(force, axe)`) — ce qui se cogne
  s'ÉCRASE puis tremblote comme de la gelée (cosinus amorti : écrasement,
  rebond un peu étiré, calme en une demi-seconde). Axe `'x'` = choc frontal,
  `'y'` = à plat. Purement visuel, aucun effet de simulation. Branchée sur
  `assomme()`, le contact franc des colosses, la retombée des sauteurs (le
  VENTRE À PLAT, proportionnel à la vitesse de chute), le Bada-boum du
  Poisson-lune, le raté du Mérou (le « patatras » ne se voyait jamais) et le
  ballon crevé du Barracuda (contrecoup + recul). Mesuré sur 50 s :
  ~134 chocs/min dont 97 sont les ventre-plats des sauteurs — **silencieux et
  collés à un splash qui existait déjà**, donc dans la règle « ce qui foisonne
  doit être silencieux » ; le reste est rare.
- **Le CRASH DU COYOTE** (`Entity.crash()`) — pour une collision à PLEINE
  VITESSE, trois temps : **seule la TÊTE se froisse** (les tranches du museau
  se compriment en accordéon jusqu'à 25 % de leur largeur, via
  `FishBody.plier` — écraser tout le poisson d'un scale affine le rendait
  méconnaissable au lieu de drôle), il **reste écrasé ~2 s** le temps de
  comprendre (yeux ronds, tremblement de tension), puis « PLOP » — retour en
  dépassement étiré (un `choc` à amplitude NÉGATIVE) et vrille, les yeux KO
  (`assomme`).
  C'est lui que déclenche la collision fonceur-contre-gros — mais **UNIQUEMENT
  PENDANT UNE FLÈCHE** (`_etire > 0,2`, posé par les seules scènes de charge)
  et sur la **vitesse VRAIE** : une première version branchée sur `speedNow`
  seul faisait s'écrabouiller les espadons en permanence, hors de toute scène
  — ils chassent à 460 px/s en temps normal, et `speedNow` est un EFFORT qui
  dépasse le seuil sur place. Hors scène, la collision garde son ancien
  réglage discret (un petit très rapide contre un gros placide est juste
  assommé). Deux autres leçons en le branchant :
  **les colosses ne sont pas à portée de la grille** (contact à ~187 px du
  centre, `neighbors` porte à ~195 au mieux : un thon lancé traversait la
  baleine sans la « voir » — le test balaie donc aussi `Ecosystem.colosses`,
  une dizaine d'entrées, seulement quand quelqu'un dépasse 255 px/s) ; et **le
  ressort doit CLAQUER** — un départ de charge qui monte en régime arrive sur
  l'obstacle sous le seuil de crash, donc les scènes de charge posent leur
  vitesse d'un coup au lancement (`e.vx = dir * speed * 2,3`), ce qui est de
  toute façon plus drôle qu'une accélération.
- **Le smear** (`_smear`, canal de gag) — des TRAÎNÉES, pas des copies : trois
  échos dessinés AVANT le corps, chacun plus reculé, plus étiré, plus aplati
  et plus transparent que le précédent — le corps fond en stries vers
  l'arrière (dessin de référence de l'auteur). Allumé par : le grand run de
  l'Espadon, les charges du Thon et du Barracuda, sa torpille sur un ballon,
  le jet du Calamar, le bond du Dauphin.

Les déformations sont **factorisées dans `FishBody`** — `deformationScene`
(l'affine : ressort, flèche, gelée, tremblements), `smear` (les traînées) et
`rendreScene`/`plier` (le pliage par tranches : arc, tête froissée) —
`Entity.draw` les applique en jeu, et l'atelier applique EXACTEMENT les mêmes
dans sa **vue Scènes** (sélecteur 🎬 de la barre d'aperçu) : charge complète,
cabré, flèche, crash, chocs, en boucle sur le dessin ouvert. C'est là qu'on
règle une pose sans attendre qu'un thon veuille bien charger en jeu ; les
poignées d'édition sont coupées pendant une scène (le corps est déformé,
elles ne tomberaient plus juste), et couper ▶ Animer referme la scène.

**LA COLONNE, et pas un rig de bones.** Un poisson est un corps 1D — son
« système de bones », c'est **une colonne vertébrale à cinq poignées**,
chacune `{dy` (position), `sy` (épaisseur), `sx` (compression accordéon)`}`,
plus `rot` qui oriente l'ensemble. `FishBody.colonne` l'échantillonne en
25 points et **chaque point du dessin y est reporté, sa section tournée selon
la pente locale** — dans `deformer`, le même chemin de code que l'onde de
queue et les appendices, donc la même qualité et **aucune couture** (le
pliage de pixels par tranches, essayé avant, déchirait les SVG ; il ne reste
qu'en repli pour les silhouettes procédurales, qui n'ont pas de points).
L'œil et la bouche suivent la tête, tournés avec elle (`colPoint` sur leurs
ancres).

Les poses sont **des données du dessin** : `doc.poses = { cabre, crash, … }`,
dessinées dans l'atelier (mode « Pose manuelle » de la vue Scènes — les cinq
poignées se GLISSENT sur le dessin, molette = épaisseur, Maj+molette =
écraser, un curseur pour l'orientation, → cabré/→ crash pour charger,
💾 cabré/💾 crash pour garder dans le dessin, Ctrl+Z les annule comme tout).
Le jeu joue la pose `cabre` de l'espèce pour sa charge et `crash` pour son
accordéon — la tête SEULE se froisse, le corps ne bouge pas — avec des poses
par défaut (`FishBody.POSES`) pour tout dessin qui n'en déclare pas. Des bones
articulés n'apporteraient rien de plus : pattes, tentacules et nageoires ont
déjà leurs pivots et leur onde progressive dans le système d'appendices.

**LA TIMELINE DE POSES CLÉS, ET LES ÉVÉNEMENTS.** `doc.animes` = des
animations PAR ÉVÉNEMENT : `{ mange: { boucle, cles: [{ t, pose, visage }] } }`
— chaque clé référence une pose nommée (interpolée en douceur jusqu'à la
suivante) et peut poser un VISAGE (tenu jusqu'à la clé suivante qui en
déclare un ; sans clé de visage, le système d'émotions générique garde la
main — c'est la règle : **le comportement générique est le défaut, une
animation dessinée le remplace, et seulement elle**). UN SEUL lecteur,
`FishBody.poseAt`, partagé par le jeu (`rendreScene`) et l'aperçu de
l'atelier.

Les événements câblés (`Entity.jouerAnime`) : les transitions d'ÉTAT via la
table `ANIM_ETATS` (`flee→peur, sleep→dort, hunt→chasse, court→parade,
migrate→voyage, strike→attaque`) — dessiner une animation de ce nom dans
l'atelier SUFFIT, rien à câbler ; et les ponctuels à leur source : `mange`
(mastication et graine), `crash`, `saut`, `pond`, `charge`.

**SCÈNES ET CLIPS — le modèle de l'auteur, qui a remplacé mes trois
mécanismes séparés** (animations-par-nom, règles, aperçus) :

- **Un CLIP** est une timeline réutilisable, et la bibliothèque est
  **PARTAGÉE** (`Assets/clips.json`, décision d'auteur) : la chorégraphie est
  commune, mais les clés référencent des POSES que chaque animal redéfinit —
  le poulpe joue le même clip que le thon avec son propre corps. Un clip
  local au dessin (`doc.clips`, et les vieilles `animes`) l'emporte sur son
  homonyme de bibliothèque (`Sprites.clipDe`). `build.py` expédie la
  bibliothèque (fichier + pré-cache PWA + `PRECHARGE.clips` en inline).
- **Une SCÈNE** (`doc.scenes`) = « SI événement [conditions] ALORS play
  clip » : `{ si: 'collision', avec: 'sol', cond: { vitesseMin: 180 },
  jouer: 'dans_les_pommes', cooldown: 15 }`. Le bus
  `Entity.evenement(type, p)` est branché sur des tests qui existaient déjà
  (tout le moteur est en cercles et en seuils — le sol est un champ de
  hauteurs par colonne, pas un cast) : `collision` sol/surface/colosse,
  `assomme`, `graine`, plus tous les noms d'événements (mange, peur, dort…).
  Sans scène, le clip qui PORTE LE NOM de l'événement joue en défaut ; sans
  clip, le générique du moteur. `cond` est un **vocabulaire fermé** (vitesse,
  profondeur, nuit, faim — pas de code dans le JSON ; ce qui agit sur la
  simulation reste un gag dans gags.js). L'ancien format `regles`
  (`quand`/`si`-objet) est encore lu, un typeof départage.
- **Une seule animation de CORPS à la fois** — un événement pendant une scène
  est PERDU, pas de file, le cooldown gate la suite — et les clips de
  **VISAGE SEUL** (aucune clé de pose) ont leur propre piste et se combinent
  par-dessus. Le cooldown est vital : « collision : sol » se joue des
  centaines de fois par minute (contact au sable mesuré à 953/min),
  `vitesseMin` sépare le vrai plantage du frôlement.
- **LA MORT SE JOUE, TOUTES les morts** (décision d'auteur) : un clip ou une
  scène `mort` fige le corps le temps de sa grande scène (bornée à 2,5 s)
  avant l'arête — et **même mangée** : le prédateur SE FIGE, la regarde
  jouer, puis revient l'avaler (`Entity.agonise` + `_attendRepas` ; la
  simulation ne change pas, seul l'avalage se décale). Vérifié : mort
  naturelle → clip → arête ; dans la gueule → le requin attend 1,55 s → il
  mâche.

L'atelier a été réorganisé sur ce modèle : le menu 🎬 n'a plus que DEUX vues —
**Scènes du poisson** (les aperçus des défauts du moteur, la liste des scènes
SI→play, et les clips avec leur timeline ; 💾 bibliothèque écrit
`Assets/clips.json` par `api/sprite/clips`, chargée au démarrage sinon chaque
session écraserait celle des autres) et **Poses** (les poignées de la
colonne). La timeline avait grandi dans le sélecteur d'aperçu — un accident
d'historique, signalé par l'auteur, pas un design. Exemple canon :
« un animal bizarre quand il mange » = une animation `mange` de trois clés
(surprise → crash+eating → cabré+happy), vérifiée en jeu sur une vraie
graine. L'atelier édite tout ça : vue Scènes → **Timeline (poses clés)** —
créer l'animation d'un événement, des rangées de clés (temps · pose ·
visage), boucle, lecture ½×/¼×, aperçu joué par le même lecteur que le jeu,
et les poses se fabriquent à côté (mode Pose manuelle, noms libres,
💾 pose).

Les scènes construites avec ces briques (passe « poisson par poisson, les
rapides d'abord ») :

- **Orque Echo** — elle ne faisait rien (un ♪ la nuit). Scène en trois temps :
  elle s'arrête et se cambre en INSPIRANT, gueule grande ouverte (`_crispe`) ;
  « ECHOOO » — l'onde VOYAGE devant elle (les cercles naissent sur le front,
  560 px en 1,4 s) et chaque poisson réagit QUAND le front l'atteint : les
  proches sont assommés (bornés à quatre, règle de la foule), les lointains
  détalent, les dormeurs se réveillent en sursaut ; puis elle se trouve très
  forte. Elle ne crie que si au moins trois spectateurs sont dans le cône.
- **Thon Pressé et Barracuda** — la même charge, partagée (`GAGS._charge`) :
  l'air le plus fier (`hold('proud')`), cabré de cheval en se comprimant, et
  pfiouuu — départ instantané, flèche + smear à travers la foule, badauds
  écartés en silence, crash du Coyote selon le parcours. Le Thon la crie
  (VROUUUM, l'ancien réactif y est fondu), le Barracuda la joue en torpille
  silencieuse (`CADENCE.torpille`) : c'est sa traînée qui parle.
- **Espadon** — sa charge est FIÈRE (l'air de celui qui se sait beau), le
  ressort claque au FIOUUU, smear sur tout le run.
- **Calamar Fusée** — un VRAI décompte 3-2-1 pendant la compression (la seule
  scène dont la bulle EST le gag : elle a droit à ses trois temps).
- **Mérou** — l'aspiration ratée finit en écrasement de gelée, sonné, nuage de
  sable s'il a labouré le fond.

Une scène qui peut être interrompue par le crash doit **se refermer
elle-même** (`if (e._ecraseT > 0 || e.state === 'dizzy')` en tête de ses
phases) : sans ça le steering de figure continue de pousser un poisson
ratatiné, et les canaux restent gravés. Vérifié après chaque scène : résidus
`_crispe`/`_etire`/`_smear` à 0.

Candidats relevés à l'audit mais volontairement pas faits : les embusqués
(murène, rascasse, poisson-tapis) frappent sans détente préalable, mais leur
strike est piloté par la simulation — y insérer un délai d'anticipation, c'est
régler l'écosystème (le temps d'esquive de la proie), pas l'habillage.

Piège de vérification : **prendre une capture réveille `requestAnimationFrame`**
(le panneau passe au premier plan), donc la scène avance entre le moment où on
la met en place et la photo — une pose de 1,15 s est déjà passée. Pour une
capture déterministe : pousser `Main.fpsCap` à ~0 (toutes les frames rAF sont
sautées, la boucle ne fait que se replanifier), avancer et RENDRE à la main
(sim + `Background/Ecosystem/Particles.draw`, sans replanifier de rAF — en
appeler un soi-même démultiplie les boucles pour toujours), photographier, puis
restaurer `fpsCap`. Second piège du même tonneau : **fronter le panneau peut
redimensionner le canvas, ce qui l'EFFACE** — la photo montre alors le fond de
page nuit, pas le rendu, et on cherche un bug de nuit qui n'existe pas. Prendre
une première capture à blanc, re-rendre à la main, capturer ensuite.

Garde-fou : le total de bulles était monté à ~930/min et saturait l'écran. Cible : **~250/min** pour tout l'aquarium.

**Ce ne sont PAS les bulles de BD qui coûtent, ce sont les particules.**
Audit du 5 septembre 2026, 18 min de simulation instrumentée : les bulles au
sens strict tenaient déjà la cible (~285/min pour `comic` + `shout`), mais le
jeu créait **35 700 particules par minute**. Trois postes en faisaient les deux
tiers, aucun n'était un gag :

| Poste | Avant | Après | Ce que c'était |
|---|---|---|---|
| `Entity.breathe` | 4 357/min | ~1 300 | trois cadences de bulles pour 15 cétacés |
| `GAGS.bulle_fofolle` | 5 550/min | ~1 400 | 3,5 bulles/s **par sardine** |
| branche `sleep` (ZzZ) | 3 864/min | 402 | un « z » par dormeur, et l'aquarium dort à 46 % |
| sable au contact du fond | 953/min | ~190 | émis à **chaque frame** passée contre le sable |
| sillage de chasse | 1 179/min | ~450 | idem, sans garde |
| `GAGS.anguille` (étincelles) | 632/min | ~180 | 9 étincelles/s pour un préavis d'une seconde |
| `tryMate` (le baiser) | 390/min | ~40 | `Math.random() < dt*3` **à chaque frame** |
| `emoteVFX('love')` | 237/min | ~50 | la parade est un événement de GROUPE |

Total vérifié après correction, sur 10 min de simulation :
**15 456 particules créées par minute contre 35 736, soit −57 %** — bulles
8 075 → 2 866 (−64 %), gerbes 2 164 → 898 (−59 %), ZzZ −90 %, cœurs −72 %,
étincelles −68 %, nuages de sable −72 %.

Le nombre de **bulles de BD**, lui, n'a presque pas bougé (534 → 514/min) — et
c'est le vrai enseignement : **il était déjà à peu près à la cible.** Ce qui
saturait la machine n'était pas ce qui parle, c'était ce qui scintille.

Quatre règles générales en sont sorties, à respecter pour tout nouvel effet :

- **La méthode d'audit reste la même** : compter par **ligne d'appel**, en
  enveloppant `Particles.*` et en lisant `new Error().stack`. Compter par espèce
  ne suffit pas — 63 % des bulles partaient du moteur, pas des gags.
- **`Entity.VFX_GROUPE`** remplace le test en dur de `emoteVFX` : une table
  `expression → part des individus qui montrent l'effet` (`scared`, `eating`,
  `dizzy`, `love` à 10–22 %). Ajouter une ligne là plutôt qu'un `Math.random()`
  chez l'appelant — c'est le seul endroit où l'on voit le budget d'un coup.
  L'**expression n'est jamais filtrée** : c'est le visage qui raconte.
- **Ne jamais émettre à chaque frame d'une scène** (`Math.random() < dt * k`) :
  une fois au démarrage (`if (e._xxxT < dt * 2)`). Le baiser de `tryMate`
  enfreignait la règle que le projet s'était donnée.
- **Un effet infligé à une foule se borne en nombre.** Une décharge d'Anguille
  lâchée dans un essaim de krill en assommait vingt d'un coup ; elle est bornée
  aux **huit plus proches** et la gerbe de `assomme` suit le drapeau `vfx`.

Les VFX restent throttlés par individu (`_vfxCd`).

### `speedNow` est un EFFORT, pas une vitesse

`Entity.move` relève `speedNow` **avant** l'écrêtage par `maxSpeed` : il monte
jusqu'à 4,5 fois la vitesse nominale. S'en servir pour cadencer une animation
fait battre tout le monde à fond en permanence — l'Anguille se tortillait
frénétiquement alors qu'elle avance à 34 px/s, et c'est ce qui la faisait
paraître « beaucoup trop rapide » alors que son déplacement était correct.

Deux helpers pour ça, à utiliser partout : **`FishBody.allure(e)`** (0 arrêté,
1 vitesse de croisière, 2 sprint), qui lit la vitesse VRAIE, et
**`FishBody.battement(e)`**, qui en tire une fréquence bornée et pondérée par le
gabarit — un gros animal bat lentement, c'est la première chose qu'on lit dans
une nage.

### Une fréquence variable s'INTÈGRE — jamais `sin(t * f)`

C'est la vraie cause du tortillement de l'Anguille, et elle survivait à la
correction de sa fréquence. **`f` dépend de la vitesse, donc elle change à chaque
frame** ; or dans `t · f`, une variation Δf déplace la phase de `t · Δf`. Après
dix minutes de jeu (t = 600), un frémissement de vitesse fait sauter l'animation
de plusieurs tours **entre deux frames**. Ça ne se lit pas comme une fréquence,
ça se lit comme du bruit.

Mesuré sur l'Anguille, en avance de phase par seconde :

| | à t = 30 s | à t = 600 s |
|---|---:|---:|
| `sin(t * f)` | 3,2 tours/s | **79,8 tours/s** |
| phase intégrée | 0,67 tours/s | 0,57 tours/s |

D'où **`FishBody.phaseNage(e, f, t)`**, qui accumule `f · dt` et rend un angle.
Les rapports de fréquence CONSTANTS (une nageoire qui bat à 0,7 fois la queue)
peuvent la multiplier sans danger — c'est la variation de `f` qui casse, pas son
échelle. Trois appelants : le ruban de l'Anguille, la queue des sprites vectoriels
et le battement des nageoires.

Corollaire à retenir : **plus la partie dure, plus l'artefact est violent**. Il
est invisible en test court et flagrant après dix minutes, donc il faut le
chercher en avançant l'horloge, pas en regardant une seconde de jeu.

### Les galipettes du Dauphin : un arc balistique, pas un ressort (octobre 2026)

`GAGS._galipette` : élan → charge (cabré `_crispe`) → bond (`_etire` + `_smear`,
vitesse posée d'un trait) → 1 à 3 tours → plongeon nez le premier. L'arc est un
VRAI vol libre (`Entity.move`, `_galVol`, gravité 640 px/s²), sans strate ni
plafond ; l'eau le freine en exponentielle à la rentrée, sinon `maxSpeed` le
clouait net à 500 px/s. **L'angle est piloté** (`_galAng`, lu par `Entity.draw`)
= trajectoire + 2π·n·smoothstep, CUMULÉ sans jamais être ramené dans ±π (un
lissage ferait refaire les tours à l'envers) ; `tilt` vit dans le repère
miroité, donc croissant = galipette AVANT des deux côtés (vérifié, sprite et
silhouette procédurale, le visage tourne avec le corps). `_galTuck` replie le
corps en boule. **Le télescopage pose `_telescope`, PAS `_abattu`** : l'Archer ne
retient que les `_abattu`, un oiseau heurté n'est donc jamais un repas (20
mangés en 70 min, tous abattus par l'Archer). La visée est résolue AU LANCEMENT
sur la hauteur PRÉDITE de l'oiseau (il bouge de ±70 px/s : sans ça, tout
ratait). Trois pièges : un dauphin affamé passe en `hunt` dans la foulée
(départ interdit au-delà de 0,38), la nuit il s'endormait en plein élan
(`respire` couvre `_galPh`), et le caca partait en plein bond. Mesuré sur
7 × 10 min : **0,6 à 1,1 scène/min**, 0,8 en moyenne (nominal 0,9, ramené à 0,8), apex 1,5 à 3
longueurs, vol 1,3–1,8 s, **0,64 oiseau télescopé/min**, 0 oiseau mort du heurt
(un pélican est mort de vieillesse 9 s après), 0 NaN, 0 résidu de canal, **53 espèces sur 53 vivantes**.

### LA CADENCE DE L'AQUARIUM : peu de gags, et rares

Relevé du 6 septembre 2026 : **160 déclenchements de scène par minute** pour
tout l'aquarium, soit près de trois par seconde. Le joueur ne contemplait plus
rien, il assistait à un feu d'artifice — BOUH, prout, vroum, éclair, poof, sans
interruption.

**La référence est Theme Park** : le public y exprime des émotions en
permanence — des visages, des petites réactions — mais les ÉVÉNEMENTS y sont
rares. D'où la règle : **ce qui foisonne doit être SILENCIEUX** (le visage, les
sourcils, le regard qui suit le curseur, le tangage, le clignotement, le
gonflement d'avertissement) ; **ce qui claque doit être RARE**, pour qu'on ait
le plaisir de le surprendre.

`GAGS.CADENCE` (en tête de `gags.js`) est la table unique des fréquences, en
déclenchements par minute **pour tout l'aquarium** — `Ecosystem.cadence` fait la
division par l'effectif. Trois régimes :

| Régime | Cible | Ce que c'est |
|---|---|---|
| **bruyant** | 0,3 – 0,5 /min | il y a un cri, une détonation, un éclair. Une fois toutes les deux à trois minutes quelque part. |
| **scène** | 0,8 – 1,2 /min | visible mais silencieux : une pose, une danse, une disparition, un câlin. |
| **vivant** | 2 – 4 /min | vie de fond discrète : une perle qui brille, un duo qui se reforme. |

Mesuré après : **160 → 27 déclenchements/min**. Le « BOUH ! » du Dauphin passe
de un toutes les 3,4 secondes à un toutes les trois minutes.

Deux mécaniques ne sont pas des gags et se règlent ailleurs, mais suivent la
même règle :

- **La décharge de l'Anguille** partait 25 fois par minute — l'événement le plus
  bruyant du jeu, devenu un bruit de fond. Son cooldown se calcule maintenant
  sur l'effectif (`Ecosystem.cadence`), `shock.cooldown` n'étant plus qu'un
  plancher.
- **Le gonflement du Fugu** est un AVERTISSEMENT : répété toutes les quinze
  secondes, il n'en est plus un. Un délai (`_gonfleCd`) l'empêche de re-gonfler
  aussitôt.

Ce qui est piloté par la simulation — embuscades, sauts, mastication, poursuite
— n'a pas sa place dans la table : le régler reviendrait à régler l'écosystème.

### Le public d'abord, et le peps

Constat vécu : « j'ai surveillé des thons, je n'ai jamais vu l'animation ». La
cadence divise par l'effectif — un thon donné chargeait toutes les ~30 min,
presque toujours hors écran. Trois règles depuis, toutes dans les
déclencheurs des grandes scènes (thon, espadon, orque, calamar, dauphin) :

- **Le public d'abord** (`GAGS._enVue`) : un cooldown expiré se met en ATTENTE
  et la scène ne part que quand son acteur est à l'écran. Design de parc à
  thème — l'attraction joue quand les visiteurs sont devant. La cadence par
  individu ne change pas (après sa scène, l'acteur repart pour son long
  cooldown), donc camper la caméra ne fait pas un feu d'artifice. Et **un seul
  congénère en scène à la fois**.
- **Le peps du nourrissage** (`Entity.onAte` → `_peps` + `_pepsCoup`, lus par
  `GAGS._tic`) : une graine du joueur (jamais une arête) met **ce poisson-là**
  en forme — champs de l'individu, comme son cooldown de scène : on achète le
  numéro du poisson qu'on nourrit, pas celui de l'espèce. Chaque graine fait
  DEUX choses : une **coupe franche** de 240 s sur le cooldown de scène (480
  pour la favorite), encaissée au tic suivant, et 90 s de peps qui le fait
  défiler **10× plus vite**. Le multiplicateur seul ne suffisait pas —
  mesuré : « le thon ne fait JAMAIS son sprint même gavé », un cooldown plein
  demandait des minutes de nourrissage ininterrompu. Vérifié après : cooldown
  de 1 700 s, **six graines, déclenchement immédiat** — deux clics bien placés
  et le numéro part. L'aquarium sans joueur garde ses cadences d'équilibre, et
  hors champ rien ne part.
- **La piste doit être dégagée — mais PAS choisie pour éviter le crash**
  (`GAGS._couloirLibre`) : un chargeur veut 350 px devant lui (colosses sur la
  trajectoire + bords du monde), **préfère son cap**, se retourne si c'est
  bouché, attend si tout l'est — il s'écrasait AU DÉCOLLAGE, avant sa course.
  Une première version prenait le couloir LE PLUS dégagé des deux : il
  esquivait délibérément tous les obstacles et ne crashait plus jamais. La
  course est longue (4,2 s, ~1 250 px mesurés) : le crash du Coyote arrive
  **selon la suite du parcours** (mesuré : à 2,4 s de course sur une baleine
  posée à 700 px).

### Un poisson TOURNE, il ne recule pas

Mesuré avant correction : un gros poisson passait **21 % de son temps à nager à
reculons**, jusqu'à 3,8 fois sa vitesse de croisière. La cause n'est pas la
nage, c'est l'hystérésis d'orientation ci-dessous : elle est là pour empêcher la
baleine de clignoter, mais elle laissait le corps filer dans un sens pendant que
la tête regardait encore dans l'autre — pendant près d'une seconde pour un gros
gabarit.

**La patience protège de l'hésitation, pas de la décision.** Elle cède donc
d'autant plus vite que l'intention est franche (`Entity.PATIENCE_REMISE`,
pondérée par `|dirX| / seuil`) : un `vx` qui traîne autour de zéro garde toute
sa patience, un poisson qui repart franchement dans l'autre sens n'en garde
presque rien. Mesuré : **2,5 % → 1,2 % pour un moyen, 1,7 % → 0,8 % pour un
petit.**

Deux enseignements, tous deux contre-intuitifs et tous deux mesurés :

- **Les colosses en sont EXCLUS** (`size >= 70`). Leur remettre la patience
  doublait leurs demi-tours — 1,6 à 3,2 par minute pour la Baleine Gros Dodo —
  pour un gain quasi nul sur la marche arrière (3,3 % → 2,8 %). La patience a
  été écrite pour eux ; on ne la leur retire pas.
- **Une brise sur la vitesse arrière a été essayée puis RETIRÉE.** Elle semblait
  la réponse évidente (« un gros poisson ne peut pas reculer ») ; elle mesurait
  moins bien que la patience seule (gros : 4,7 % sans elle, 7,9 % avec). Elle
  se mordait la queue — en effaçant la vitesse arrière, elle réduisait la
  franchise perçue, donc rallongeait la patience, donc prolongeait l'état
  qu'elle prétendait corriger. Ne pas la réintroduire sans mesurer.

### Le demi-tour est une FEUILLE QUI S'ENROULE

L'ancien demi-tour écrasait la silhouette jusqu'à **5 % de sa largeur** : le
poisson devenait un trait, disparaissait une frame ou deux et réapparaissait
miroité. C'est ça qu'on lisait comme un « flip brutal » — pas la vitesse du
demi-tour, mais le passage par le néant.

Une feuille qui s'enroule ne disparaît jamais : elle se met de trois quarts, et
c'est la **courbure** qui raconte la rotation. Quatre réglages, tous dans
`orientation()` et `draw()` :

- **largeur minimale 0,34** au lieu de 0,05 — c'est le changement qui fait tout ;
- **l'arc** (`_vir`, cisaillement en y le long du corps) : la queue traîne
  derrière la tête et le corps se creuse en C ;
- **le volume** : ce que le corps perd en largeur, il le reprend en hauteur ;
- **le roulis** (`_virSens`) : il s'incline dans son virage.

`_vir` suit un `smoothstep` du sinus, pas le pivotement linéaire : la
déformation s'installe et se retire en douceur. Contrôle : rendre la même
silhouette à neuf valeurs de `_flipX` de −1 à +1 et regarder la planche — avant,
la case du milieu est un trait.

### Le retournement (`Entity.orientation`)

Un poisson qui change de sens **pivote** : `ctx.scale(flipX, 1)` avec `flipX`
animé de −1 à +1 (adouci en sinus, jamais exactement 0 — une matrice d'échelle
nulle est dégénérée). Le miroir instantané se lisait comme un défaut d'affichage.

**Attention, c'est ici que se rejoue « la baleine qui clignote ».** L'hystérésis
sur le seuil ne suffit pas : le `vx` d'un colosse traîne autour de zéro,
`_facing` rebascule avant la fin du demi-tour, et au lieu d'un clignotement à
peine visible on obtient une baleine qui **tourne sur place en continu**, coincée
de profil. Trois verrous, tous nécessaires :

1. seuil relevé pour les gros (`speed * 0,5` au-delà de `size` 45) ;
2. **un demi-tour commencé s'achève** — aucun nouveau sens tant que `_flipX`
   n'a pas rejoint `_facing` ;
3. le nouveau sens doit être **tenu** avant d'être validé, d'autant plus
   longtemps que l'animal est gros (`0,2 + size/90` s). `_faceAt` (viser
   quelqu'un : bisou, farce) court-circuite cette patience — c'est une
   intention, pas une dérive de vitesse.

Mesuré sur 45 s : baleine, cachalot, orque et calamar géant à **0 demi-tour/min**
(contre 0,4 à 2,7 avec le seuil nu), et moins de 1 % du temps de profil pour les
petites espèces.

**Squash & stretch.** Comprimer la silhouette en x et rien d'autre, c'est une
feuille de papier qu'on tourne sur la tranche : elle s'amincit jusqu'à
disparaître. Un vrai virage conserve le volume — ce que le corps perd en largeur,
il le reprend en hauteur — et la queue traîne derrière la tête avant de fouetter
dans le nouveau sens. Deux déformations, posées **après la rotation**, donc dans
le repère du CORPS (sinon le cisaillement décale le bas du poisson par rapport au
haut au lieu de la queue par rapport à la tête) :

```js
const vir = 1 - Math.abs(flipX);      // 0 en ligne droite, 1 au plus fort du virage
ctx.transform(1, vir * 0.5, 0, 1, 0, 0);   // la queue traîne
ctx.scale(1, 1 + vir * 0.3);               // le volume se reporte en hauteur
```

Le signe du cisaillement s'inverse tout seul avec le miroir, au moment précis où
la silhouette est sur la tranche : c'est ce qui fait lire un coup de queue
continu et non un à-coup. Contrôle non visuel (rendu hors écran, emprise de
l'encre) sur un thon : largeur 59 → 7 px pendant que la hauteur passe de 25 à
**41**.

**L'inclinaison est bridée CONTINÛMENT, pas par paliers.** Deux brides, toutes
deux fonction du gabarit : `maxTilt` pour la nage
(`clamp(0,95 − size × 0,0095)`, de 0,75 rad pour un confetti à 0,26 pour un
colosse) et **`visee` pour `_faceAt`** (`clamp(1,7 − size × 0,045)`). C'est cette
seconde qui manquait : viser quelqu'un autorisait 1,4 rad — **80°, c'est-à-dire
debout sur la queue**. Le coupable n'était pas le requin mais le Thon arrêté à la
station de nettoyage du Poisson Dentiste, qui pointait vers le petit nettoyeur
flottant au-dessus de lui. Mesuré sur 40 s, toutes espèces de plus de 20 :
**479 frames au-delà de 0,9 rad → 0**, pointe maximale 0,80 rad (le Perroquet,
qui est petit et a le droit d'être expressif).

Un piège de paliers en passant : le Thon fait 26, il tombait donc du bon côté
d'un seuil « ≥ 30 » et gardait la bride des petits poissons. Les seuils en
paliers laissent toujours quelqu'un juste en dessous.

Hors champ `draw` n'est pas appelé : au retour, la créature se **pose** dans son
sens courant plutôt que de faire un demi-tour fantôme.

### Deux scènes qui ne se voyaient pas (20 octobre 2026)

- **Le bâillement de la Murène** se jouait au fond de son trou : une bouche
  ouverte une seconde, invisible de loin. Il se joue maintenant en trois temps
  (`GAGS._baillement`) : elle se hisse à moitié hors du rocher (0,8 s,
  `_sortie`, le canal de son jaillissement sans l'attaque — lu par `drawEel` et
  par la colonne du dessin), bâille 1,6 s avec la nouvelle émotion `yawn`
  (yeux fermés, sourcils hissés, la gueule la plus grande du catalogue), les
  petits voisins qui PASSENT détalent, puis elle rentre. Elle attend son public
  (`GAGS._enVue`), et la scène se referme d'elle-même si la murène jaillit ou
  s'endort — `_sortie` revient à 0, aucun résidu.
- **Le Goéland se téléportait** sur sa victime pour lui voler son repas
  (jusqu'à ~200 px d'un coup, un saut d'image). Il FOND dessus : un piqué
  d'un quart de seconde, et s'il arrive trop tard (la victime a tout avalé),
  il en est pour ses frais (`sad`).
