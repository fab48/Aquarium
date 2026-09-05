# Émotions et gags — table de référence

Le catalogue des expressions disponibles et de leur affectation aux actions du
jeu. **C'est le document à mettre à jour** quand on ajoute une émotion ou un gag,
et celui dans lequel piocher quand on cherche la bonne réaction pour un
comportement.

Principe : **le visage raconte, la bulle ne fait que ponctuer.** Le socle
yeux / sourcils / joues / bouche existe pour ça (`FishBody.EMOTIONS` dans
`js/fishbody.js`). Une bulle de BD ne se justifie que quand le visage ne peut
pas dire la chose (un son, un mot crié).

---

## 1. Le catalogue des expressions

Chaque ligne est une entrée de `FishBody.EMOTIONS`. Ajouter une émotion = ajouter
une ligne là-bas, puis une ligne ici et une dans `js/legend.js`.

| Clé | Ce qu'elle dit | Comment elle est dessinée |
|---|---|---|
| `idle` | tranquille | sourcil neutre ; **la pupille suit le curseur** |
| `happy` | content | grand sourire, sourcils hauts, étincelles |
| `love` | amoureux | yeux brillants, joues roses, petits cœurs |
| `kiss` | embrasse | yeux fermés en `^`, lèvres pincées projetées en avant |
| `laughing` | fou rire | yeux plissés, bouche grande ouverte + langue, **sourcils qui gigotent** |
| `eating` | mange | bouche qui mâche, langue |
| `sleeping` | dort | yeux fermés en `⌣`, bouche `ronfle` (cycle inspire/expire + bulle de morve), `ZzZzZ` flottants |
| `dizzy` | sonné | yeux en spirale, bouche ondulée |
| `scared` | apeuré | œil énorme, pupille minuscule, bouche en cri |
| `surprise` | surpris | œil rond, sourcils au plafond, bouche en `o` |
| `angry` | agressif | sourcil lourd, croc, veine de colère |
| `blush` | gêné | regard fuyant, joues rouges, goutte |
| `ashamed` | honteux | sourcils tombants, regard au sol |
| `disgust` | écœuré | **teint et joues verts**, grand sourire inversé, sourcils très froncés |
| `sad` | abattu | sourcils tombants, bouche en arc inversé |
| `wink` | complice | clin d'œil |
| `smug` | malin | paupière basse, sourire en coin |
| `proud` | fier | paupière basse, petit sourire |

---

## 2. Quelle émotion pour quelle action

| Action dans le jeu | Émotion | Où c'est câblé |
|---|---|---|
| au repos | `idle` | `Entity.updateEyeLook` |
| repère une proie, part en chasse | `angry` | `entity.js` — début de `hunt` |
| prend la fuite | `scared` | `entity.js` — `flee` |
| vient d'attraper une proie | `eating` + mastication | `Ecosystem.eat` |
| se régale de sa nourriture favorite | `happy` | `Entity.onAte` |
| **affamé** (faim > 0,82) | `sad` | `Entity.update` |
| dort | `sleeping` (maintenue par `hold()`) | `entity.js` — `sleep` |
| rate son attaque et se cogne | `dizzy` | `entity.js` — `missChance` |
| **percute le sable en pleine charge** | `dizzy` | `Entity.assomme` (via la collision au sol) |
| **percute un colosse** (baleine, poisson-lune) | `dizzy` (et `surprise` pour le colosse) | `Entity.move` |
| cherche un partenaire | `love` | `entity.js` — `court` |
| **couple qui s'embrasse avant de pondre** | `kiss` (les deux) | `Entity.tryMate` |
| se fait chatouiller | `laughing` | gag du Poisson-clown |
| chatouille quelqu'un | `kiss` | gag du Poisson-clown |
| **hypnotisé par la lampe d'un poisson-lanterne** | `happy` (une proie sur six, à l'entrée dans le halo seulement) | `Entity.pecheALaLampe` |
| **rate sa pêche à la lampe** | `blush` (le pêcheur) + `scared` (la proie qui se réveille) | `Entity.pecheALaLampe` |
| **perd sa proie dans un nuage d'encre** | `surprise` | `Entity.encre` |
| **le Calamar Géant se sait observé** | `blush`, bras repliés en fuseau, il n'ose plus bouger | `GAGS.calamar_geant` |
| **réveil en sursaut** (un prédateur fonce sur un dormeur) | `scared` puis fuite | `entity.js` — branche `sleep` |
| **la victime esquive un embusqué** | `scared` pendant le jaillissement | `Ecosystem.alerteDe` |
| sent passer le pétomane | `disgust` | gag du Poisson-perroquet |
| juste avant de lâcher son prout | `ashamed` | gag du Poisson-perroquet |
| juste après | `blush` | gag du Poisson-perroquet |
| éclôt de son œuf | `surprise` | `Entity.update` |
| se fait faire « BOUH ! » | `surprise` | gag du Dauphin |
| fait « BOUH ! » | `surprise` (gueule ouverte) | gag du Dauphin |
| s'approche en douce d'un banc | `smug` | gag du Dauphin |
| se tord de rire après sa farce | `laughing` | gag du Dauphin |
| fait semblant de charger | `wink` | `entity.js` — `trickster` |
| ressort trempé d'un plongeon raté | `sad` | `entity.js` — `aerial` |
| gênée d'avoir raté son coup (murène) | `blush` | `entity.js` — `ambush` |
| timide quand le curseur approche | `blush` | gag de l'Hippocampe |
| danse sur sa boule disco | `happy` + **notes de musique** | gag du Crabe |
| dort (la nuit, ~46 % de l'aquarium) | `sleeping` | `entity.js` — sauf nocturnes et embusqués |
| fait un câlin | `happy` | gag de l'Étoile |

---

## 3. Les bulles et les cris qui restent

Réservés à ce qu'un visage ne peut pas dire.

| Signe | Sens |
|---|---|
| `BOUH !` | cri du Dauphin Farceur (gros texte + traits de cri) |
| `PROUT !` | le Pétomane se soulage, depuis sa queue |
| `❗` | un prédateur vient de repérer une proie |
| `💥` | une proie vient de se faire attraper |
| `😋` | vient de manger |
| `❤` | un couple se forme |
| `♥ ♥ ♥` (petits, sans bulle) | le couple s'embrasse |
| `ha` | il se marre |
| `★` | sonné |
| `💨` | le nuage du Pétomane |
| `💦` | la murène a raté |
| `♪` | la Raie ronronne |
| `z` | endormi |
| `♪ ♫` | le Crabe Disco danse |
| `!` | a peur |

**Conséquences de jeu.** Un gag peut coûter quelque chose : subir un prout
augmente la faim de la victime et casse sa jauge de reproduction. C'est ce qui
relie l'humour à la simulation.

**Budget :** environ **250 à 300 bulles par minute** pour tout l'aquarium. Au-delà
l'écran sature. Ne jamais émettre une bulle à chaque frame d'une scène : une
seule, au démarrage (`if (e._xxxT < dt * 2)`).

Mesuré le 5 septembre 2026 : les bulles au sens strict tenaient déjà la cible
(~285/min), mais le jeu créait **35 700 particules/min**, dont les deux tiers
venaient de trois postes qui n'étaient pas des gags (respiration des cétacés,
chapelet de la Sardine, ZzZ des dormeurs). Ramené à 19 300/min. Le détail et la
méthode d'audit sont dans `CLAUDE.md`.

**`Entity.VFX_GROUPE`** est la table des émotions vécues en GROUPE et de la part
des individus qui en montrent l'effet — `scared`, `eating`, `dizzy` à 10 %,
`love` à 22 % (la parade collective des migrations de ponte faisait de
`loveBurst` le deuxième émetteur du jeu). Ajouter une ligne là plutôt qu'un
`Math.random()` chez l'appelant. **L'expression, elle, n'est jamais filtrée :
c'est le visage qui raconte, la gerbe ne fait que ponctuer.**

---

## 4. Idées de gags à brancher

Le socle est prêt, il ne manque que la mise en scène :

- **Poisson Volant Cascadeur** — son atterrissage raté (plat retentissant) :
  `surprise` en l'air puis `dizzy` à la rentrée.
- **Poulpe Ninja** — il devient transparent puis réapparaît ailleurs (`smug`).
- **Poisson-lune Zen** — il gobe une méduse au ralenti, l'air solennel.
- **Baleine Gros Dodo** — son bâillement géant qui disperse doucement les bancs.
- **Cachalot** — l'éternuement enrhumé prévu au GDD §11.

## 6. Expressions d'ÉTAT vs émotions ponctuelles

`emote()` joue une enveloppe qui retombe à zéro : posée sur un état qui dure,
l'expression finissait rendue à intensité nulle — un poisson endormi gardait
**les yeux ouverts**. Les états durables (sommeil, KO) utilisent donc
`hold(expr)` / `release()`, qui tiennent l'expression à fond tant que l'état
dure et la relâchent en douceur à la sortie.

## 7. Respiration des cétacés

Baleine Gros Dodo, Dauphin Farceur, Orque Blagueuse et Cachalot Profond
remontent respirer (~1 fois/min chacun) :

1. chapelet de bulles à l'évent pendant la montée ;
2. le **dos sort franchement de l'eau** (cible : centre à 15 % de la
   demi-hauteur sous la ligne d'eau) ;
3. panache blanc opaque en colonne serrée + gouttes, depuis l'évent
   (`Entity.event()` : au-dessus du corps, un peu derrière les yeux) ;
4. maintien 1,4–2,6 s à l'air libre, puis replongée avec un splash.

La respiration ignore la bande de profondeur et prime sur le sommeil.

## 8. Trop-plein : caca, malaise et explosion

Trois mécaniques liées, toutes accrochées au fait de manger :

| Ce qui se passe | Émotion | Où |
|---|---|---|
| il digère, un caca se prépare | `ashamed` (il s'arrête, se concentre) | `Entity.digere` |
| le caca part par la queue | `happy` (soulagement, sans paillettes) | `Entity.digere` |
| il avale un caca en le prenant pour une graine | `disgust` | `Entity.malaise` |
| il respire le prout d'un voisin | `disgust` (force 0,55) | `Gags.perroquet` |
| il dépasse 2,5x sa taille | `surprise` puis `scared`, tremblement croissant | `Entity.digere` |
| il atteint 5x | BOUM (flash, onde de choc, éclats) | `Entity.explose` |

Réglages qui tiennent l'équilibre, à revérifier si on y touche :

- le caca ne part qu'**un repas sur deux** et **5 à 13 s après** le repas,
  pour que le lien de cause à effet se voie sans tapisser le fond
  (mesuré : **9 cacas maximum** au sol sur 16 min sans joueur) ;
- le surpoids **se résorbe** (−0,045/s) : la prédation ordinaire ne fait
  jamais exploser personne (mesuré : **0 explosion en 16 min** sans joueur).
  Il faut ~40 s de clics soutenus sur le même poisson ;
- le décor vivant (`refuge`, `movement: 'fixed'`) est **exclu** : une anémone
  gonflée n'est plus qu'un triangle difforme, et la faire exploser
  détruirait les frayères du récif ;
- `malaise()` borne la faim à 0,9 : le dégoût ne peut jamais **tuer**.
