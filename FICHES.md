# Fiches des espèces — état des lieux et cases à remplir

Une fiche par espèce **codée** dans `js/species.js` (27), plus les espèces
**à créer** dont le comportement est arrêté, marquées 🔨. Les lignes lues dans le
code décrivent le jeu tel qu'il tourne ; tout le reste est **décidé mais pas
encore codé**.

Les espèces encore à inventer sont dans `IDEES.md` §1 ; elles n'entrent ici
qu'une fois leur comportement décidé.

---

## Règles générales décidées

### Où vivent les phrases — tranché

**La phrase n'apparaît QUE dans la fiche d'identité** (la loupe). Jamais en
bulle : le budget de bulles est déjà tenu à ~250/min et l'aquarium raconte ses
histoires par le visage, pas par le texte. Une ligne à ajouter dans
`idcard.js`, un champ `phrase` dans `SPECIES`.

### Le faux nom latin

Chaque fiche porte en plus un **faux nom latin rigolo**, affiché sous le vrai nom
d'espèce. C'est la blague qui rend la fiche amusante à ouvrir, et elle glisse au
passage la vraie information : *Scarus petomanus* apprend « Scarus » sans en
avoir l'air. Champ `latin` dans `SPECIES`, une ligne dans `idcard.js`.

### Les oiseaux frayent sur la plage

Nouvelle frayère **`beach`** : les oiseaux ne pondent pas dans l'eau. Elle se
place sur le sable **émergé**, au-dessus de la ligne d'eau (`World.shoreX`, côté
plage). Concerne le Fou Moustachu, le 🔨 Pélican, et plus tard le cormoran et le
goéland. C'est la première frayère hors de l'eau : `Ecosystem.nurseryPoint` et la
migration de ponte devront l'accepter sans déclencher la noyade à l'air libre
(`_sec`, qui tue au bout de 4 s hors de l'eau).

### La maladie — qui rend malade qui

`Entity.malaise()` existe déjà (borne la faim à 0,9, dégoût visible, ne tue
jamais). Deux sources aujourd'hui, quatre de plus à brancher :

| Source | État |
|---|---|
| Avaler un caca | ✅ codé |
| Respirer le prout du Perroquet Pétomane | ✅ codé |
| Toucher un **Fugu Gonflé** | 🔨 à créer |
| Toucher un **Oursin Pic-pic** | 🔨 à créer |
| Toucher une **Rascasse Épineuse** | 🔨 à créer |
| Se prendre la décharge d'une **Anguille Coup-de-Jus** | 🔨 à créer — mais elle **assomme**, elle ne rend pas malade |

**Tous ceux qui pic-pic rendent malade.** Un seul flag générique `piquant: true`
suffit : au contact, la victime prend un `malaise()` et détale. C'est la
contrepartie de leur immunité — personne ne les mange, et c'est pour ça.

**Une exception à écrire** : le Poisson-Tapis mange les cacas **sans être
malade**.

---

## Ce que l'inventaire révèle

| Information | Renseignée | Manque |
|---|:--:|---|
| Nom, vraie espèce, couleurs, taille, longévité | **27 / 27** | — |
| Frayère (`nursery`) | **27 / 27** | + la frayère `beach` à créer |
| Nourriture favorite (`favoriteFood`) | 18 / 27 | 9 espèces ne peuvent pas être nourries |
| Action rigolote (`gag`) | 10 / 27 | **17 espèces n'ont aucune scène** |
| Sprite dessiné (`sprite`) | 1 / 27 | 26 encore en silhouette procédurale |
| **Phrase** | 0 / 27 | le champ n'existe pas — **27 phrases écrites ci-dessous** |
| **Faux nom latin** | 0 / 27 | le champ n'existe pas — **27 noms écrits ci-dessous** |
| Prédateur | 12 / 27 | 15 espèces ne sont mangées par personne |

Légende des frayères : **récif** = anémones · **haut-fond** = près du rivage ·
**profond** = sources chaudes · **plage** = sable émergé (à créer).

---

## Surface et plein ciel

### Sardine Bulle-fofolle — *petite sardine* — *Sardina bullabulla*
- **Phrase** — « Glou glou glou ! Oh, encore une bulle ! »
- **Action** — ✅ **codée** : chapelet de bulles permanent et gros glouglou joyeux.
- **Nourriture** — Plancton doré · **Frayère** — haut-fond
- **Mangé par** — Fou Moustachu · 🔨 Pélican (en l'air uniquement)
- **À compléter** — la seule espèce dont la phrase *est déjà* son gag : elle sert de modèle. Elle saute (`jumps`), donc le Pélican la guettera là-haut.

### Poisson Volant Cascadeur — *exocet* — *Exocetus cascadeurus*
- **Phrase** — « Regardez-moi ça ! Et… HOP ! »
- **Action** — 🔨 il rate son saut, atterrit sur le dos d'un autre, et prend un air `proud` comme si c'était voulu.
- **Nourriture** — Plancton doré · **Frayère** — haut-fond
- **Mangé par** — Fou Moustachu · 🔨 Pélican (en l'air uniquement)
- **À compléter** — **son saut ne sert à rien aujourd'hui** : personne ne l'attend en l'air. Le Pélican rend la scène lisible sans rien changer au poisson.

### Fou Moustachu Volant — *fou de Bassan* — *Sula moustachus*
- **Phrase** — « Repéré ! …plouf. »
- **Action** — 🔨 il plonge, remonte avec une **algue** au lieu d'un poisson, et la jette rageusement.
- **Nourriture** — ❌ aucune · **Frayère** — 🔨 **plage**
- **Mangé par** — personne (sommet de la chaîne aérienne)
- **À compléter** — son rôle se lit **par contraste** avec le Pélican : le Fou plonge dans l'eau, le Pélican ne la touche jamais.

### 🔨 Pélican Attrape-Tout — *pélican* — *Pelecanus attrapatoutus*
- **Phrase** — « J'ai de la place pour tout le monde ! »
- **Action** — il patrouille au-dessus de la surface et **cueille les poissons volants EN PLEIN VOL**, sans jamais entrer dans l'eau. Sur un raté : il referme le bec, sa **poche se gonfle**… et le poisson en ressort par le haut (`scared`) pendant qu'il prend un air `ashamed`.
- **Nourriture** — ❌ aucune · **Frayère** — 🔨 **plage**
- **Mange** — Poisson Volant, Sardine Bulle-fofolle — **uniquement en phase aérienne**
- **Mangé par** — personne
- **À créer** — mécanique `snatch: true`, rendu `pouch: true`. Spécification complète et pièges d'équilibre dans `IDEES.md` §1, section Ciel.

---

## Eau claire et récif

### Poisson Confetti — *banc de poissons tropicaux* — *Confettius multicolorus*
- **Phrase** — « On est nombreux, mais on est PAS pareils ! »
- **Action** — ✅ **validée**, 🔨 à coder : le banc dessine une forme un instant — **un cœur, un rond, un carré** — puis se disperse, gêné d'avoir été vu.
- **Nourriture** — Plancton doré · **Frayère** — haut-fond
- **Mangé par** — Thon, Dauphin, Murène
- **À compléter** — l'espèce la plus nombreuse de l'aquarium (plafond 96). La forme se dessine en donnant à chaque individu du banc une place assignée, le temps de la pose.

### Thon Speedy — *thon* — *Thunnus vroumvroum*
- **Phrase** — « Poussez-vous, je suis pressé ! »
- **Action** — 🔨 il affiche un **« Vrouuuuuum vrouuum »** en passant à fond. Le seul cas où le texte est justifié : c'est un bruit, pas une réplique.
- **Nourriture** — Micro-crevettes · **Frayère** — haut-fond
- **Mangé par** — Requin, Orque

### Poisson-clown Chatouille — *poisson-clown* — *Amphiprion guiliguili*
- **Phrase** — « Guili-guili ! »
- **Action** — ✅ **codée** : il vise le flanc d'un plus gros et le chatouille jusqu'au bisou.
- **Nourriture** — Micro-crevettes · **Frayère** — récif
- **Mangé par** — 🔨 **Mérou Patatras** *(validé — c'était la seule espèce de récif que rien ne mangeait)*

### Hippocampe Zen — *hippocampe* — *Hippocampus rougissimus*
*(renommé : « Timide » → « Zen »)*
- **Phrase** — « Ne me regardez pas… »
- **Action** — ✅ **codée** : il rougit quand le curseur reste près de lui.
- **Nourriture** — Micro-crevettes · **Frayère** — récif (herbiers)
- **Mangé par** — 🔨 **Murène du Récif** *(à ajouter — il n'a aucun prédateur aujourd'hui)*
- **À vérifier** — l'hippocampe vit à 200–1000 px, la murène à 350–1700 : ils se croisent bien. Mais l'hippocampe est **ancré** à son herbier (`homeRadius: 22`) : il ne peut pas fuir. Soit la murène le mange trop facilement, soit son `missChance` doit compenser.

### Poisson-perroquet Pétomane — *poisson-perroquet* — *Scarus petomanus*
- **Phrase** — « C'est pas moi ! »
- **Action** — ✅ **codée**, en 4 temps : il se fige gêné → se tortille → **détonation** par la queue (avec propulsion) → les voisins verdissent et **prennent un malaise**.
- **Nourriture** — Plancton doré · **Frayère** — récif
- **Mangé par** — Requin, Dauphin, Murène
- **À compléter** — le gag le plus abouti du jeu, et **l'une des deux sources de maladie déjà codées**. C'est le niveau à viser pour les autres.

### Dauphin Farceur — *dauphin* — *Delphinus blagueurus*
- **Phrase** — « BOUH ! …hihihi ! »
- **Action** — ✅ **codée**, en 3 temps : approche discrète → jaillissement « BOUH ! » → il se plie de rire en tournant sur lui-même.
- **Nourriture** — Micro-crevettes · **Frayère** — haut-fond
- **Mangé par** — ⚠️ **plus personne** si l'Orque passe aux calmars et aux thons (voir sa fiche). À trancher.
- **À compléter** — candidat naturel au rôle de **maître nageur** (`IDEES.md` §2).

### Coquillage Rieur — *bénitier* — *Bivalvus hilarius*
- **Phrase** — « Hi hi hi ! …hi. »
- **Action** — 🔨 il s'ouvre parfois en grand et fabrique une **perle qui brille**.
- **Nourriture** — Plancton doré · **Frayère** — récif
- **Mangé par** — 🔨 **un oiseau**
- **À vérifier** — un oiseau ne descend aujourd'hui qu'à 130 px sous la surface, et les coquillages vivent **posés sur le fond** (0–1000 px). Seuls ceux **les plus proches du rivage** seraient à portée. Soit on l'assume (l'oiseau va les chercher dans le ressac, ce qui est joli), soit c'est le 🔨 Cormoran Plongeur qui s'en charge — c'est lui qui nage sous l'eau.

### Étoile de Mer Ventouse — *étoile de mer* — *Asterias ventousa*
*(renommée : « Câline » → « Ventouse », le surnom Câline passe à l'Anémone)*
- **Phrase** — « Viens là, toi ! Plok ! »
- **Action** — 🔨 **nouvelle** : elle se **colle** à un poisson qui passe et rigole de se faire transporter ; au bout d'un moment elle se détache pour rejoindre un rocher. Son ancien câlin est **transféré à l'Anémone**.
- **Nourriture** — Plancton doré · **Frayère** — récif (rochers)
- **Mangé par** — personne
- **À compléter** — c'est le gag le plus ambitieux de la liste : l'étoile devient **passagère** d'une autre créature (attachement, transport, détachement, retour au rocher). Le retour au rocher réutilise `Background.habitatSpots('rock')`, déjà en place.

### Anémone Câline — *anémone de mer* — *Anemonia calinus*
*(surnom repris à l'Étoile)*
- **Phrase** — « Entrez, entrez, c'est chauffé ! »
- **Action** — 🔨 **deux choses** : elle **balance ses bras de gauche à droite en musique**, comme le Crabe Disco ; et elle **hérite du câlin de l'Étoile** — elle attrape un passant, replie ses bras autour, et le câliné rougit (gros cooldown, 30 s).
- **Nourriture** — Plancton doré · **Frayère** — récif
- **Mangé par** — personne
- **À compléter** — c'est le **refuge de ponte** de tout le récif (`refuge: true`) : le câlin lui va mieux qu'à l'étoile, il dit ce qu'elle est.

---

## Zone trouble

### Méduse Flottante — *méduse* — *Gelatinus sanstetus*
- **Phrase** — « Pas de tête, pas de souci. »
- **Action** — 🔨 prise dans le courant, elle part en **loopings** malgré elle, visage `dizzy`.
- **Nourriture** — Plancton doré · **Frayère** — haut-fond
- **Mangé par** — Murène, Poisson-lune
- **À compléter** — la 🔨 **Tortue Papi** (`IDEES.md` §1) reste son prédateur manquant.

### Requin Dents-Molles — *requin* — *Carcharodon dentimollis*
- **Phrase** — « Grrr… aïe, mes dents. »
- **Action** — 🔨 **son nom devient sa mécanique** : quand il mange, **il perd ses dents**. Il ne peut alors plus manger du tout, et doit aller voir le 🔨 **Poisson Dentiste** pour qu'elles repoussent.
- **Nourriture** — ❌ aucune · **Frayère** — 🔨 **bas-fond** *(aujourd'hui : haut-fond)*
- **Mangé par** — personne (apex)
- **À compléter** — **la plus belle boucle de tout le document** : elle relie un prédateur existant à une espèce à créer, et donne au Poisson Dentiste une vraie fonction d'écosystème plutôt qu'un gag isolé.
- **⚠️ Garde-fou obligatoire** — « il ne peut plus manger » **tue le requin** s'il n'y a pas de dentiste à portée. Il faut soit une repousse naturelle lente en secours, soit une immunité à la faim tant qu'il est édenté. C'est exactement le piège qui a affamé la Murène : deux modes d'échec cumulés (voir `CLAUDE.md`).

### Murène du Récif — *murène* — *Muraena monrocherus*
- **Phrase** — « C'est MON rocher. »
- **Action** — 🔨 elle sort la tête, **bâille** longuement, et rentre — un jaillissement pour rien qui fait détaler tout le récif.
- **Nourriture** — ❌ aucune · **Frayère** — récif
- **Mange** — Confetti, Perroquet, Méduse · 🔨 **+ Hippocampe**
- **Mangé par** — personne
- **À compléter** — un rocher = une murène (`territory`), la seule espèce territoriale.

### Raie Ronron — *raie manta* — *Manta ronronus*
- **Phrase** — « Rrrrron… »
- **Action** — ✅ **codée** : elle ronronne (♪), descend fouiller le sable et mastique.
- **Nourriture** — **Vers de sable** · **Frayère** — profond
- **Mangé par** — personne

### Poisson-lune Bada-boum — *môle* — *Mola badaboum*
*(renommé : « Zen » → « Bada-boum »)*
- **Phrase** — « Tout est calme… tout est… BADA-BOUM. »
- **Action** — ✅ **validée**, 🔨 à coder : il s'endort en pleine nage et **coule** lentement jusqu'à toucher le fond, où il se réveille en sursaut.
- **Nourriture** — ❌ aucune · **Frayère** — haut-fond
- **Mange** — Méduses · 🔨 **+ Crevette Guirlande**
- **Mangé par** — personne
- **⚠️ À vérifier** — le Poisson-lune vit à 200–1600 px, la Crevette Guirlande à 1500–3400 : **100 px de recouvrement seulement**. Il la poursuivrait sans jamais l'atteindre, le piège documenté dans `CLAUDE.md`. Soit descendre sa bande, soit renoncer à cette proie.

### Orque Echo — *orque* — *Orcinus echoechoecho*
*(renommée : « Blagueuse » → « Echo »)*
- **Phrase** — « Attends, attends, j'en ai une bonne. »
- **Action** — 🔨 elle lance des **échos la nuit**, qui **réveillent les poissons des profondeurs**. Beau contrepoint au sommeil général de la nuit (GDD §10), et ça donne enfin un sens au nom « Echo ».
- **Nourriture** — ❌ aucune · **Frayère** — haut-fond
- **Mange** — 🔨 **Calamar Géant, Thon** *(remplace : Thon, Dauphin)*
- **Mangé par** — personne (apex)
- **⚠️ Deux problèmes à trancher** :
  1. L'Orque vit à **450–1500 px**, le Calamar Géant à **1900–3400** : **aucun recouvrement**. Elle ne pourrait jamais l'atteindre — il faut descendre la bande de l'Orque, ou renoncer.
  2. Retirer le Dauphin de son menu **laisse le Dauphin sans aucun prédateur**. Voulu ?

---

## Grands fonds et abysses

### Baudroie-lanterne Allumeur — *baudroie abyssale* — *Melanocetus allumus*
*(renommée : « Poisson-lanterne » → « Baudroie-lanterne »)*
- **Phrase** — « Par ici la lumière, mes petits… »
- **Action** — 🔨 **la nuit, on ne voit plus que sa lanterne** : son corps disparaît en fondu, et **il réapparaît quand il mange**. Superbe, et ça ne coûte qu'une opacité pilotée par `Main.nightAmount()` et `_chew`.
- **Nourriture** — Plancton doré · **Frayère** — profond
- **Mange** — Crevette Guirlande
- **Mangé par** — Poisson-Tapis, Calmar Violette

### Crevette Guirlande — *crevette abyssale* — *Caridina guirlandus*
- **Phrase** — « On clignote tous ensemble ? À trois ! »
- **Action** — 🔨 tout l'essaim clignote en rythme — et il y en a **toujours une à contretemps**.
- **Nourriture** — Micro-crevettes · **Frayère** — profond
- **Mangé par** — Baudroie-lanterne, Poisson-Tapis, Calmar Violette · 🔨 + Poisson-lune *(sous réserve, voir sa fiche)*
- **À compléter** — base de toute la chaîne abyssale, longévité rallongée exprès (420–640). **Quatre prédateurs, c'est beaucoup** : c'est elle qui s'effondre en premier si on ajoute encore.

### Calmar Violette — *encornet* — *Loligo violetta*
*(renommé : « Calamar Fusée » → « Calmar Violette »)*
- **Phrase** — « Trois, deux, un… PSCHIT ! »
- **Action** — 🔨 **3, 2, 1** — il s'envole comme une fusée, puis **retombe dans les profondeurs**.
- **Nourriture** — Micro-crevettes · **Frayère** — profond
- **Mange** — Crevette Guirlande, Baudroie-lanterne
- **Mangé par** — Cachalot, Calamar Géant · 🔨 **+ Orque**
- **⚠️ Contradiction à trancher** — la fiche de l'Orque dit qu'elle mange « Calamar Géant et Thon », celle-ci dit qu'elle mange le Calmar Violette. Les deux ne peuvent pas être vrais. *(Et le Calmar Violette vit à 1200–3400, l'Orque à 450–1500 : même problème de bande que pour le Calamar Géant.)*

### Calamar Géant Timide — *Architeuthis* — *Architeuthis timidissimus*
- **Phrase** — « …vous m'avez vu ? Zut. »
- **Action** — **rien de plus** : il reste bien, bien au fond du fond.
- **Nourriture** — ❌ aucune · **Frayère** — profond
- **Mange** — Calmar Violette, Poulpe
- **Mangé par** — Cachalot · 🔨 + Orque *(sous réserve, voir sa fiche)*
- **À trancher** — une timidité **est déjà codée** (on l'approche, il rentre ses bras, rougit et se laisse couler). On la garde, ou on la retire pour qu'il ne fasse vraiment plus rien ?

### Poisson-Tapis — *requin-tapis (wobbegong)* — *Orectolobus grandebouche*
*(renommé : « Poisson-Tapis Câlin » → à trancher, le câlin disparaît)*
- **Phrase** — « …………… »  *(il ne dit rien, il attend)*
- **Action** — 🔨 **plus de câlin** : il **embusque**, immobile sur le sable, et **ouvre une énorme bouche** quand une proie s'approche du fond.
- **Nourriture** — 🔨 Micro-crevettes · **Frayère** — profond
- **Mange** — Baudroie-lanterne, Crevette Guirlande · 🔨 **+ Crabe Disco** · 🔨 **+ les cacas, sans être malade**
- **Mangé par** — personne
- **À compléter** — il faut **un nouveau nom** : « Câlin » ne va plus du tout. Et son immunité aux cacas est la première exception à `Entity.malaise()`.

### Poulpe Ninja — *poulpe* — *Octopus ninjaticus*
- **Phrase** — « Vous ne m'avez jamais vu. »
- **Action** — 🔨 **son comportement ninja ne se voit pas** : phases visibles à écrire (se faufiler, se figer, disparaître d'un coup, réapparaître ailleurs), plus le **rot d'encre** mis en scène.
- **Nourriture** — Graines · **Frayère** — profond
- **Mangé par** — Cachalot, Calamar Géant

### Crabe Disco — *crabe* — *Cancer discotecus*
- **Phrase** — « Ça pince ET ça danse ! »
- **Action** — ✅ **codée** : il plante ses pinces, s'arrête net et **danse** sur place en changeant de couleur.
- **Nourriture** — Graines (et les arêtes) · **Frayère** — récif
- **Mangé par** — 🔨 **Poisson-Tapis** *(il n'avait aucun prédateur)*
- **À compléter** — le seul sans bande de profondeur (`[0, 99999]`) : il vit sur tout le fond, donc certains crabes sont bien à portée du Poisson-Tapis abyssal. C'est lui qui fera le **crabe magicien** (`IDEES.md` §2).

### Cachalot Profond — *cachalot* — *Physeter profundissimus*
- **Phrase** — « Je descends chercher le goûter. »
- **Action** — ✅ **codée** : un aller-retour perpétuel entre l'air qu'il doit respirer et les céphalopodes du fond ; il passe deux fois plus de temps en bas qu'en haut.
- **Nourriture** — ❌ aucune · **Frayère** — haut-fond
- **Mange** — 🔨 **Calamar Géant, Calmar Violette** *(le Poulpe sort du menu)*
- **Mangé par** — personne (apex)
- **À vérifier** — retirer le Poulpe ne laisse au Poulpe qu'**un seul** prédateur, le Calamar Géant. Acceptable, mais c'est le dernier.

### Baleine Gros Dodo — *baleine à fanons* — *Balaena roupillonus*
- **Phrase** — « Encore cinq minutes… »
- **Action** — 🔨 elle ronfle si fort que les petits poissons devant elle sont **soufflés** à chaque expiration.
- **Nourriture** — ❌ aucune (elle filtre le plancton) · **Frayère** — haut-fond
- **Mangé par** — personne
- **À compléter** — 190 de taille, la plus grosse ; **elle ne mange personne**, ce n'est pas un prédateur.

### 🔨 Anguille Coup-de-Jus — *anguille électrique* — *Electrophorus zzzap* — **à créer**
- **Phrase** — « Touche pas, ça pique fort ! »
- **Action** — elle **électrocute** ce qui l'approche : des **éclairs** partent d'elle, et les touchés sont **sonnés** — exactement l'effet du choc contre un gros (`Entity.assomme` : il part en vrille, voit des étoiles, reste hébété quelques secondes). **Les très faibles en meurent.**
- **Nourriture** — à décider · **Frayère** — profond
- **Mangé par** — personne (comme tous les piquants)
- **À créer** — une mécanique générique `shock: { range, cooldown }` :
  - la décharge frappe **tous** les voisins dans le rayon, pas seulement un ;
  - effet par défaut : `assomme()`, qui existe déjà et se lit déjà (vrille + étoiles) ;
  - **la mort ne frappe que les très faibles** — à définir précisément : les **alevins** (`stage === 'fry'`), et/ou en dessous d'une taille, et/ou déjà affamés. C'est le seul point à trancher avant de coder ;
  - un **cooldown franc** entre deux décharges, sinon elle vide son voisinage en quelques secondes — la leçon de la murène « ping-pong » et du `_snapCd` de la Baudroie ;
  - les éclairs sont un nouveau VFX dans `particles.js`.
- **⚠️ Attention** — c'est la première mécanique du jeu qui **tue sans manger**. Elle échappe donc à tous les garde-fous d'équilibre (report de prédation, `refugeFloor`), qui ne comptent que la prédation. À surveiller en simulation longue.

---

## Ce qui reste à trancher

Six points, dans l'ordre où ils bloquent :

1. **L'Orque mange-t-elle le Calmar Violette ?** Sa fiche dit « Calamar Géant + Thon », celle du Calmar Violette dit qu'elle le mange aussi. À choisir.
2. **La bande de profondeur de l'Orque.** À 450–1500 px, elle ne peut atteindre **ni** le Calamar Géant (1900–3400) **ni** le Calmar Violette (1200–3400, à peine). Soit on la descend, soit ces proies sont décoratives.
3. **Le Dauphin sans prédateur.** Le retirer du menu de l'Orque le laisse seul au monde.
4. **Le Requin édenté.** Sans garde-fou, « il ne peut plus manger » le tue.
5. **La Crevette Guirlande à quatre prédateurs.** C'est la base de la chaîne abyssale ; elle a déjà failli s'éteindre une fois.
6. **Le nom du Poisson-Tapis.** « Câlin » ne décrit plus rien.

Et deux petites choses sans risque : trouver la nourriture de l'Anguille, et
décider si le Calamar Géant garde sa timidité déjà codée.
