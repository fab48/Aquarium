# Interface et contrôles

Souris, tactile, fiche d'identité, les deux barres du HUD, le zoom, la saisie à la main.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

## Contrôles

Molette = zoom (centré curseur) · clic molette/droit = déplacer la vue · souris
au bord de l'écran = défilement · clic gauche = nourrir/bulles (jamais de
déplacement) · **double-clic sur une créature = la caméra la suit** (cerceau doré ;
double-clic dans le vide ou déplacement manuel pour la relâcher) · **appui long
(~0,4 s, sans bouger) sur une créature = la saisir** : un anneau se remplit, elle
suit le curseur, on la relâche en levant le bouton (`js/saisie.js`) · bouton 🔍 =
fiche d'identité **sur le côté** de la créature survolée, touchée ou suivie ·
bouton ❔ = légende · **touche F = compteur de performance** en bas à droite
(`js/fps.js` : fps, sim/dessin en ms, créatures, dpr et plafond de cadence
d'`adaptResolution` — rien n'est mesuré tant qu'il est caché).

**Tactile** (`Input.touchDown/touchMove/touchUp/tap`) : tap = nourrir · glissé
1 doigt = déplacer la vue · pincement = zoom · double-tap = suivre · **appui long
d'un doigt posé SUR une créature = la saisir** (le doigt la promène au lieu de
déplacer la vue ; un second doigt la relâche et pince) · avec la
loupe, tap sur une créature = fiche **épinglée** (pas de survol au doigt). Le
défilement par les bords est coupé en mode tactile. Pièges vérifiés dans
[PERFORMANCE.md](../PERFORMANCE.md) §4 : `touch-action` ne s'hérite pas (posé sur
`#game`), `setPointerCapture` peut jeter, et un doigt perdu sans `pointerup` se
purge sur `lostpointercapture` — sinon pincement fantôme.

**La fiche d'identité est un panneau du HUD SUR LE CÔTÉ**, comme les deux barres
(`#idcard`, `IdCard.update`, bouton 🔍) — plus une bulle posée près de la
créature, qui la masquait, se décalait pour éviter sa voisine et clignotait dès
que le poisson bougeait. Une **seule** fiche à la fois : la créature survolée
(souris) ou **épinglée** (tap — au doigt `Input.hovered` EST l'épingle), à
défaut la **suivie** (bordure dorée + 🎯, comme son cerceau). Le survol passe
devant la suivie et celle-ci revient dès que le curseur la quitte : on n'a pas
à lâcher sa créature pour en lire une autre. Le sujet est signalé sur le canvas
par un cerceau fin (`IdCard.dessinerCerceau` : blanc pour la survolée, la suivie
garde son cerceau doré pointillé). Ancrage : flanc **droit**, juste à gauche de
la jauge de profondeur ; la légende ouverte la repousse à sa gauche ; sous
600 px de large elle devient un **bandeau en bas**, au-dessus de la barre
d'action (la légende la masque alors). La fiche garde l'écran 0,4 s après la
perte du sujet (`IdCard.HOLD`) puis s'efface en fondu. Pas de canvas : le
navigateur replie le texte (« Mange » / « Mangé par » listent jusqu'à cinq
espèces) et rien n'est retouché tant que rien ne change — champs d'espèce
mémoïsés (`IdCard.statique`), valeurs vivantes (position, état, faim) relues à
4 Hz et écrites seulement si elles diffèrent, jauge par `transform`. Le panneau
est `pointer-events: none` : le curseur qui le traverse continue de survoler ce
qui est dessous. Pour mesurer son fondu, `transition: none` et des `update(dt)`
manuels : un panneau d'aperçu masqué gèle rAF et les transitions CSS.

Le rayon de survol a un **minimum en
pixels écran** (`Input.RAYON_SURVOL`, 34 px) et une **hystérésis** : la créature
déjà survolée est conservée dans un rayon 1,7× plus large. Sans ces deux règles
une crevette (7 px de monde) se visait au pixel près et sa fiche clignotait dès
qu'elle bougeait.

### Les deux barres du HUD sont la MÊME barre

Le HUD le disait déjà en mots — « Grand large · Eau claire · 34 m », la position
se lit dans les deux sens — mais il ne le montrait pas : à gauche quatre
segments nommés, à droite un simple filet gris avec une pastille. Impossible de
savoir qu'on était dans la *zone trouble* sans lire le texte.

Les deux barres partagent donc **leur constructeur, leur mise à jour et leur
CSS** (`Main.construireBarre` / `Main.majBarre`, classe `.hud-bar` et son
modificateur `.vertical`) : la seule différence est l'axe. Deux barres écrites
séparément divergent au premier réglage.

- **Chacune a sa source de vérité dans `world.js`** : `bandesX()` pour les zones
  horizontales, `bandesY()` pour les bandes de profondeur, même forme. Rien
  n'est écrit en dur — si `CONFIG.PROFILE` ou `CONFIG.ZONES` change, les barres
  suivent.
- **L'air y figure**, au même titre que la plage horizontalement : c'est la part
  du monde qui n'est pas de l'eau, et le centre de la vue peut y monter. La
  dernière zone de `CONFIG.ZONES` est déclarée à 99999 (c'est un test
  d'appartenance, pas une borne d'affichage) : `bandesY()` la ramène à
  `DEPTH_MAX`, sinon les grands fonds écrasent toute la barre.
- **Le texte tourne avec la barre** (`writing-mode: vertical-rl`) : à 22 px de
  large, « Zone trouble » ne tient pas à l'horizontale, et élargir la barre
  mangerait l'aquarium.
- **Le curseur se place dans le segment RÉEL**, jamais à la proportion
  théorique. Les segments trop petits pour leur libellé sont élargis par la CSS
  (`min-width` / `min-height: max-content`) — le Rivage ne fait que 7 % du monde,
  la Surface 3,5 % de la profondeur — et un curseur calculé sur la taille du
  monde se retrouverait à côté.

Piège de vérification : **un panneau d'aperçu masqué gèle les transitions CSS**
en même temps que `requestAnimationFrame`. Un test qui mesure la position du
curseur juste après l'avoir posée le trouve immobile et conclut à tort que rien
ne bouge. Mesurer avec `transition: none`, ou après avoir remis l'onglet au
premier plan.

### Le zoom, et un piège qui a coûté cher

`Camera.zoom` et la taille de vue (`w = vw / zoom`) sont **liés** : poser `zoom`
à la main laisse `w`/`h` au facteur précédent, et tout ce qui les lit travaille
alors en dimensions fausses — le décor étant un dégradé étiré aux dimensions de
la VUE, l'écran se retrouve à moitié peint. C'est exactement ce qui arrivait au
chargement d'une sauvegarde faite à un zoom ≠ 1, et il fallait un coup de
molette (le seul chemin qui appelait `updateSize`) pour que tout se remette
d'aplomb. **Passer par `Camera.setZoom()`, jamais par `Camera.zoom = …`.**

Les deux bornes ne se règlent pas de la même façon :

- **`ZOOM_MAX` est un choix de mise en scène** : 3,2 (au lieu de 1,6), parce que
  tout le travail du projet est sur les visages et qu'à 1,6 on ne voyait pas
  vraiment une créature de près.
- **Le dézoom est une question de PERF.** Il n'ajoute aucune entité à la
  simulation, mais multiplie ce qu'il faut dessiner : à 0,35 la vue couvre trois
  fois plus de monde qu'à 1. Le plancher est donc adaptatif
  (`Camera.zoomMinPerf`), remonté par `Main.adaptResolution` **après** la
  résolution — c'est le levier le moins visible qui passe en premier — et jamais
  redescendu tout seul, le pompage du cadrage se voyant bien plus qu'une frame
  lente.

- `input.js` — molette (vertical) / shift+molette + drag (bi-axial), clic = nourrir + splash/sable, clic maintenu = bulles, souris rapide = remous + fuite des petits.
- `saisie.js` — **attraper un poisson à la main** (objet `Saisie`, après `input.js` dans `boot.js`). Un appui maintenu ~0,4 s SANS BOUGER (12 px à la souris, 14 au doigt) sur une créature saisit ; le clic bref nourrit toujours, l'appui long dans le vide fait toujours des bulles (`Saisie.occupe()` ne les coupe que si une créature est visée). Cible : rayon de survol (`Input.RAYON_SURVOL`), la plus proche du curseur avec une préférence pour les petites (`score = distance + size/2`). Les colosses (`def.size ≥ 70`) ne se saisissent pas : tremblement + « TROP LOURD ! » une fois par appui ; décor vivant (`refuge`, `fixed`), œufs et agonisants non.
  **La créature sort de la simulation** : `_saisi` (tenue) ou `_lache` (retombée) → `Entity.update` appelle `Saisie.pilote` AVANT la faim et rend la main (ni faim, ni pensée, ni gag ; `Ecosystem.nearestPreyFor/preyWithin/eat` la déclarent intouchable ; `_nettoyer` retire sa cible à ceux qui la chassaient et efface les phases de scène `_xxxPh`). Elle suit le curseur par un **ressort** (ω = 12, ζ = 0,82 — jamais de téléport), gigote **horizontalement** (`Entity.draw` → `Saisie.deformer`, halo compris) avec le visage `scared` (`angry` pour un oiseau, qui proteste). Une seule à la fois, 1,5 s avant d'en ressaisir une, relâchée d'office après 20 s ; la caméra suspend son suivi le temps de la saisie (sinon curseur et vue se disputent la créature) et le reprend au relâché.
  **Le relâché ne laisse jamais échoué** (`Saisie._chute`) : dans l'eau, une décélération puis le rappel souple de `move` — et le mur dur du rivage n'a jamais l'occasion de la téléporter, elle le rejoint en nageant ; dans l'air, gravité, éclaboussure à la surface et ventre à plat (`Entity.choc`) ; au-dessus de la plage, des bonds vers la mer ; un rampant coule puis marche jusqu'à sa bande. Filet de sécurité à 14 s (`positionSure`, jamais déclenché en 3 min de simulation avec 30 saisies). La sauvegarde écrit la position `positionSure` d'une créature tenue (jamais dans l'air ni sur le sable), et `_porter`/`_chute` repoussent tout NaN sur la dernière position saine.
  Hooks ailleurs : `Input.touchMove` (le doigt promène au lieu de défiler), bulles de `Input.update`, `Main.frame` (update/draw), `Save.ecrire`, `Entity` (update/draw/tryMate).
  Vérifié (harnais Node sans DOM + navigateur) : clic bref nourrit, appui long saisit à 0,4 s, suivi sans panoramique au doigt, pincement relâche, ressaisie bloquée 1,5 s, 3 min de simulation avec 30 saisies aléatoires (air, plage, banc, colosses) : **53 espèces sur 53 vivantes**, 0 NaN, 0 mort de faim, 0 retombée forcée (la même graine sans saisie : 53/53, 567 individus contre 586).
- `main.js` — boucle, cycle jour/nuit (`Main.nightAmount()`), HUD (les deux barres de position, heure).
- `save.js` — sauvegarde/restauration (voir la section **Sauvegarde**). À ajouter à `js/boot.js`, comme tout nouveau fichier.
