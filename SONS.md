# Sons — la liste des SFX

**C'est codé** (octobre 2026) : `js/son.js`, synthèse **Web Audio
procédurale** — zéro fichier, zéro dépendance, comme les silhouettes. Chaque
son est une recette de `Son.R` (quelques oscillateurs et un bruit filtré).
`sons.html` (outil de dev, comme l'atelier) les joue une par une à la hauteur
voulue et les rend hors ligne en `.wav` ; le banc d'essai les rend toutes et
vérifie qu'aucune ne se tait ni ne sature.

Comment c'est branché, en un coup d'œil :

- **Le son EST la bulle.** `Particles.shout` et `Particles.comic` appellent
  `Son.bulle(texte)` ; la table `Son.BULLES` dit quelle bulle sonne. Ce qui
  n'y est pas reste muet — c'est la règle 1 appliquée par construction.
- **Les effets du moteur** sonnent depuis `Particles` (`chomp`, `splash`,
  `blow`, `ink`, `eclairs`) et depuis `Entity` (`crash`, son PLOP, `assomme`,
  `malaise`, `agonise`, `onAte` favorite, le baiser de `tryMate`), plus
  `Food.poop`.
- **Les scènes sans bulle** ont une ligne `Particles.son(nom, x, y, taille)`
  à l'instant clé : départ de charge (ressort) et torpille, fusée du Calmar,
  préavis de l'Anguille, crachat qui touche (couac), bâillement de la Murène,
  aspiration et raté du Mérou, ballon crevé par le Barracuda, ponte de la
  Tortue, gonflement du Fugu.
- **Le joueur** : `Input.click` (plic, qui étouffe le plouf du splash),
  bulles du clic maintenu, remous, saisie (pop).
- **L'ambiance** (`Son.ambiance` / `Son.update`, à 4 Hz) : rumeur selon la
  profondeur de la vue, ressac près du rivage, grondement des abysses,
  mouettes de jour en surface, chant de cétacé lointain au fond, « bloup »
  isolés la nuit.

Mesuré (2 min, caméra réelle au départ, au récif, trois graines) : **28 à 38
sons/min** — un son toutes les deux secondes environ, dont un tiers de ploufs
de sauteurs. Borne haute (caméra qui « voit » tout l'aquarium) : ~170/min,
aucun type au-delà de 35. Les réglages qui en sont sortis : le plouf ne
rejoue pas avant 4 s, le hérissement de l'oursin et le plat ventre du volant
avant 5 à 6 s, et le « bleuh » n'est que pour le caca avalé — la piqûre
d'oursin se lit sur le visage.

Les tableaux ci-dessous sont la liste d'origine ; la recette réelle est dans
`Son.R` sous le nom indiqué entre crochets ; **(muet)** quand c'est voulu.

## Les règles d'abord (elles valent plus que la liste)

La cadence des gags a été réglée pendant des semaines (`GAGS.CADENCE`) et le son
doit la suivre, pas la défaire :

1. **Ce qui foisonne reste silencieux, ce qui claque est rare.** Un son par
   bulle de BD, pas un son par particule. Les 15 000 particules/min du jeu n'ont
   droit à aucun son individuel : bulles, sable, sillage, ZzZ, cœurs restent
   muets (au mieux, ils nourrissent l'ambiance).
2. **Hors champ = silence.** Même règle que « le public d'abord » : un son ne
   joue que si sa source est à l'écran (`GAGS._enVue`), atténué selon la
   distance au centre de la vue et le zoom. Panoramique gauche/droite selon la
   position à l'écran.
3. **Le gabarit donne la hauteur.** Un même son est joué plus grave par un gros
   animal (`size` → pitch, avec le tirage `gabarit` de l'individu). C'est ce qui
   permet de partager un son entre espèces sans qu'on l'entende en double. Une
   baleine qui rote n'a pas la voix d'une crevette.
4. **Jamais deux fois pareil.** ±8 % de hauteur et de durée par déclenchement,
   sinon la répétition se remarque dès le troisième.
5. **Budget de voix.** 6 à 8 sons simultanés au plus, et un cooldown par
   *type* de son (deux « PLOP » à 50 ms d'écart n'en font qu'un).
6. **Sous l'eau, c'est étouffé.** Un passe-bas global quand la vue est
   immergée ; les oiseaux et la surface restent nets. La profondeur assombrit
   encore le filtre : les abysses sont sourds.
7. **Bouton 🔇** dans le HUD, et rien ne joue avant le premier geste du joueur
   (règle des navigateurs).

## P1 — le joueur

Ce sont les seuls sons qui répondent à **un geste**. Ce sont aussi les plus
fréquents : ils doivent être courts, doux, et se fondre.

| Son | Quand | Branché sur | Recette |
|---|---|---|---|
| **Plic** de graine [plic] | clic = nourrir | `input.js` (splash + nourriture) | goutte : sinus 900→1600 Hz en 40 ms |
| **Graine favorite** mangée [carillon] | une espèce mange SA graine | `Entity.onAte` (favorite) | deux notes montantes, carillon |
| **Bulles** du clic maintenu [bloup] | appui long dans le vide | `input.js` | petits « bloup » aléatoires, très bas en volume |
| **Remous** souris rapide [remous] | balayage qui fait fuir les petits | `input.js` | souffle de bruit filtré, bref |
| **Saisie** : prise [pop] | l'anneau se remplit, la créature est à vous | `saisie.js` | « pop » de ventouse |
| **HÉ !** [he] | la créature se débat / proteste | `saisie.js:169` | couinement aigu court |
| **TROP LOURD !** [lourd] | tentative sur un colosse | `saisie.js:150` | « hnnngh » grave, effort raté |
| **Relâché** dans l'eau / sur la plage [plouf, flop] | retombée, frétillement | `saisie.js` (splash) | plouf ; sur le sable, petits « flop » |

## P2 — les scènes BRUYANTES (0,3–0,5 /min)

Le cœur du sujet : chacune a déjà son onomatopée dans le jeu, le son **est** la
bulle. Rares par construction, donc on peut se permettre du caractère.

| Son | Espèce / scène | Branché sur | Recette |
|---|---|---|---|
| **PROUT !** [prout] | Perroquet pétomane | `gags.js:265` | bruit rose, passe-bas ~150 Hz, modulé en amplitude (« brrrt ») + glissando final |
| **BOUH !** [bouh] | Dauphin farceur, le jaillissement | `gags.js:344` | voix synthétique grave, « bouh » (formant O) |
| **ha ha** [rire] | Dauphin qui se tord de rire, Clown | `gags.js:372`, `:230` | 3–4 « ha » de clic-cliquetis (le rire du dauphin) |
| **VROUUUM** [vroum] | Thon pressé, la charge | `_charge`, `gags.js:925` | moteur : dent de scie 60→180 Hz + vibrato |
| **FIOUUU** [fiou] | Espadon, le grand run | `gags.js:1756` | sifflement descendant, bruit filtré passe-bande qui glisse |
| **Torpille** (sans bulle) [whoosh] | Barracuda | `_charge` (`shout: null`) | whoosh seul, plus sec que le thon |
| **ECHOOO** [echo] | Orque, l'onde | `gags.js:1019` | appel tonal 400→800 Hz + délai/réverb qui **voyage** avec l'onde |
| **3… 2… 1…** [bip3, bip2, bip1, fusee] | Calamar Fusée, décompte | `gags.js:1121` | trois bips montants, puis **fusée** (souffle + glissando) |
| **PTUI !** [ptui] | Poisson Archer, le crachat | `gags.js:2011`, `:2095` | « ptt » labial + petit jet d'eau |
| **Oiseau abattu** [couac] | l'oiseau tombe à plat ventre | `Entity.move` (branche aérienne) | couac + plouf |
| **TOC !** [toc] | Requin Marteau, coup de tête | `entity.js:705` | bloc de bois creux, sec |
| **Bâillement** [baille] | Murène | `gags.js:1144` (`baille`) | « aaaouh » grave, formant A→O |
| **ZAP** + préavis [gresille, zap] | Anguille Coup-de-Jus | préavis `gags.js:820`, décharge `entity.js:985` | grésillement qui monte (préavis), puis claquement électrique |
| **PSCHIII** [pschiii] | Fugu crevé par des épines | `entity.js:906` | ballon qui se dégonfle : bruit + pitch qui chute en zigzag |
| **PAN !** [pan] | Barracuda crève un Fugu gonflé | `gags.js:1930` | ballon qui éclate : clic large + bruit court |
| **BOUM !** [boum] | Explosion de gavage | `entity.js:1332` | grosse détonation sourde, puis « splotch » des retombées |
| **BUUURP** [burp] | Poulpe Ninja, le rot avant le poof | `gags.js:1398` | rot : dent de scie grave, vibrato irrégulier |
| **Poof** d'encre [poof] | Poulpe, Calamar | `gags.js:1410`, `entity.js:1017` | « pfff » de nuage étouffé |
| **SUPER !** [super] | un Requin devient Super Saïyen | `Saiyan.pilote` (la bulle) | accord qui monte en puissance, puis l'éclat |

## P2 — la panoplie du cartoon (moteur, partagée)

Ces sons servent à TOUTES les espèces, d'où leur importance : un seul son bien
fait sonne dans vingt scènes. Hauteur indexée sur le gabarit (règle 3).

| Son | Quand | Branché sur | Recette |
|---|---|---|---|
| **Crash du Coyote** [krrsh] | collision pleine vitesse | `Entity.crash` | « krrsh » d'accordéon (bruit qui se comprime), silence tenu ~2 s… |
| **PLOP** de retour [boing] | il reprend sa forme | `Entity.crash` (fin) | « boing » : sinus qui oscille et retombe |
| **Assommé** [tuiii] | vrille + étoiles | `Entity.assomme` | petits « tuiii » de cuicui tournoyants |
| **Choc gelée** [bloing — sur le raté du Mérou seulement] | `Entity.choc` (rare, hors ventre-plat) | `Entity.choc` | « bloïng » mou, ressort amorti |
| **Ressort** (anticipation) [ressort] | `_crispe` qui monte (cabré) | `_charge`, espadon, calamar | grincement de ressort qui se tend, très court |
| **Chomp** [chomp] | une prise | `ecosystem.js:730` (`Particles.chomp`) | claquement de mâchoire, grave pour un gros |
| **Mastication** **(muet, volontairement : le chomp suffit)** | pause de mastication | `pred._chew` | 2–3 « nom » étouffés |
| **Mort jouée** [mort] | le clip `mort` | `Entity.agonise` | petit glissando descendant (trombone triste, 0,6 s) |
| **Raté** comique [whiff, sur 💦] | `missChance`, la proie esquive | moteur de chasse | « whiff » dans le vide |
| **Caca** [caca] | il part par la queue | `Food.poops` | « plop » mouillé discret |
| **Beurk** [beurk, caca avalé seulement] | `Entity.malaise` (caca avalé, prout respiré) | `Entity.malaise` | « bleuh » nasal |
| **Splash / plouf** [plouf] | sauteurs, cétacés, oiseaux qui plongent | `Particles.splash` (12 appels) | plouf, plus profond pour un gros ; **cooldown fort**, les sauteurs en font beaucoup |
| **Souffle** de cétacé [souffle] | évent qui crève la surface | `entity.js:1628` (`Particles.blow`) | « pschhh » d'évent, grave et long pour la baleine |

## P3 — les scènes SILENCIEUSES (0,8–1,2 /min)

Elles ont été réglées **sans bulle** exprès. Un son discret peut les rendre
lisibles hors du centre de l'écran, mais il doit rester **sous** le niveau des
bruyantes. Si on hésite : pas de son.

| Son | Espèce / scène | Branché sur | Recette |
|---|---|---|---|
| Boule disco [disco] | Crabe Disco danse | `gags.js:148` | 4 mesures de basse funky, très bas |
| ♪ musique [harpe] | Anémone qui balance ses bras | `gags.js:1314` | deux notes de harpe |
| **BONK !** [bonk] | Dauphin, galipette qui heurte un oiseau | `gags.js:552` | « bonk » de tête creuse |
| **WOUHOU !** [wouhou] | Dauphin en l'air | `gags.js:616`, `:685` | petit sifflement joyeux de dauphin |
| Glouglou [glouglou] | Sardine Bulle-fofolle | `gags.js:140` | chapelet de « bloup » rapides |
| Sirène 🚨 [sirene] | Poisson Police gronde | `gags.js:1545` | « pin-pon » minuscule, deux notes |
| Brossage 🪥 [brosse] | Poisson Dentiste | `gags.js:1517` | « scritch-scritch » |
| Dent qui tombe 🦷 [tink] | Requin Dents-Molles | `gags.js:1376` | « tink » cristallin |
| Ronflement [ronfle] | Baleine Gros Dodo | `gags.js:944` | ronflement très grave, une expiration toutes les 2,6 s — **à n'entendre qu'en zoom proche** |
| Bada-boum [badaboum] | Poisson-lune qui coule et touche le fond | `gags.js:979` | « boum » mou + nuage |
| Gloups de poche [gloups] | Pélican rate, le poisson ressort | `gags.js:806` | « gloup » puis « pop » |
| Plongeon + ébrouement [plouf, ebroue] | Cormoran | `gags.js:1839` | plouf, puis frrr de plumes |
| Algue trophée [hmpf] | Fou Moustachu | `gags.js:1160` | plouf + « hmpf » |
| Saut raté [flac] | Poisson Volant | `gags.js:1169` | plat ventre (« flac ») |
| Vol à la tire 😈 [goeland] | Goéland chapardeur | `gags.js:1815` | cri de goéland moqueur |
| Zip [zip] | Anguilles-Jardinières rentrent toutes | `gags.js:1854` | « zwip » collectif, rapide |
| Déménagement 🐚 [coquille] | Bernard-l'Ermite | `gags.js:1873` | toc-toc de coquille + « pop » |
| Ventouse 🎢 [ventouse] | Étoile collée à un passant | `gags.js:1273` | « schlop » de ventouse au collage et au décollage |
| Aspiration ratée [aspire] | Mérou Patatras | `gags.js:1555` | aspirateur qui monte, puis « splotch » |
| Repli gêné **(muet)** | Calamar Géant timide | `gags.js:752` | rien, ou un « oh » minuscule |
| Ponte 🥚 + soupir [soupir] | Tortue sur la plage | `gags.js:1693` | soupir d'aise |
| Gonflement [gonfle] | Fugu (avertissement) | `gags.js:788` | baudruche qui se remplit (couinement) |
| Hérissement [tchk] | Oursin | `_piquantGonfle` | « tchk » sec |
| Bisou [smack] | couples (`tryMate`), Papillons | `entity.js:1702` | « smack » |
| Perle ✨ [perle] | Coquillage rieur | `gags.js:930` | ting de carillon |

## P4 — l'ambiance (le liant) — les cinq couches sont codées

Ce qui fait passer de « des sons » à « un lieu ». Continu, très bas, jamais
de mélodie qui tourne en boucle (on l'entendrait au bout de cinq minutes).

| Couche | Varie avec | Recette |
|---|---|---|
| Rumeur sous-marine | profondeur de la vue (plus grave et plus sourde en bas) | bruit brun filtré, LFO très lent |
| Ressac | proximité du rivage (`World.zonesX`) | bruit rose en vagues de 6–9 s |
| Mouettes au loin | vue en surface, de jour | cris rares, aléatoires |
| Nuit | `Main.nightAmount()` | l'ambiance baisse, quelques « bloup » isolés |
| Abysses | profondeur > grands fonds | grondement + rares chants de cétacé lointains |

## Ce qu'on garde MUET, volontairement

- les bulles qui montent, le sable, le sillage, les ZzZ, les étincelles, les
  cœurs et les étoiles : ce sont des particules, il y en a des milliers par
  minute ;
- les ventre-plats des sauteurs (97 chocs/min) : ils restent collés au splash,
  qui a déjà son cooldown ;
- le Poisson Coffre, le Nudibranche, le Concombre, la Crevette Guirlande, la
  Lanterne, le banc de Confettis en figure : leur gag est visuel, c'est le
  contraste avec le reste qui le rend drôle ;
- les émotions du visage : c'est la règle du projet, le visage raconte en
  silence.

## Combien de sons au total

**Codés : 67 recettes** (`Son.R`) et les cinq couches d'ambiance — toute la
liste. Restent muets, volontairement, la mastication (le chomp suffit) et le
repli du Calamar Géant, en plus de tout ce que la section précédente garde
silencieux.

L'estimation de départ :

Environ **25 sons du moteur et du joueur**, qui couvrent la majorité de ce qu'on
entendra, plus **~35 sons de scène** spécifiques et **5 couches d'ambiance**.
Ordre conseillé : P1 (pour sentir tout de suite si le son apporte quelque
chose), la panoplie cartoon de P2, puis les bruyantes une par une, chacune
écoutée en jeu avant de passer à la suivante.
