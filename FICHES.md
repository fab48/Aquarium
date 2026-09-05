# Fiches des espèces

Une fiche par créature du roster — **51 espèces**. Tout ce document décrit le
jeu **tel qu'il tourne** : phrases, faux noms latins, actions, régimes, frayères
et plafonds sont relevés dans le code, pas souhaités.

Les espèces encore à inventer sont dans `IDEES.md` §1.

*Dernière mise à jour : 5 septembre 2026 (zones horizontales).*

---

## Comment lire une fiche

- **Phrase** — elle n'apparaît **que dans la fiche d'identité** (la loupe),
  jamais en bulle : le budget de bulles est déjà tenu à ~250/min pour tout
  l'aquarium, et l'aquarium raconte par le visage, pas par le texte.
- **Faux nom latin** — la blague qui rend la fiche amusante à ouvrir, et qui
  glisse la vraie information au passage : *Scarus petomanus* apprend
  « Scarus » sans en avoir l'air.
- **Zone** — la bande **horizontale** où l'espèce vit réellement (`Entity.bandeX`,
  affichée aussi dans la fiche d'identité du jeu). La seule profondeur ne situe
  pas une créature : la Dorade Dorée et le Poisson Confetti partagent l'eau
  claire et ne se croisent jamais, l'une au large, l'autre au récif.
- **Plafond / plancher** — le plancher (35 % du plafond) est le seuil sous
  lequel l'espèce n'est plus chassée. Une fois la prédation efficace, c'est
  **lui** qui fixe l'effectif d'équilibre, pas le plafond.
- **Frai éclair** — nourrir cette espèce fait des œufs **immédiatement**.
  Réservé au bas de la chaîne : ce sont eux qu'on mange, et le joueur doit
  pouvoir les renflouer tout de suite.

Frayères : **récif** = anémones et coraux · **haut-fond** = pleine eau éclairée ·
**profond** = sources chaudes · **plage** = sable émergé, pour les oiseaux et
la tortue.

---

## Le ciel (4)

### Pélican Attrape-Tout — *Pélican* — *Pelecanus attrapatoutus*
- **Phrase** — « J’ai de la place pour tout le monde ! »
- **Action** — il cueille les poissons volants **en plein vol** sans jamais entrer dans l'eau. Sur un raté, sa poche se remplit… et le poisson ressort par le haut.
- **Mange** — Poisson Volant Cascadeur, Sardine Bulle-fofolle · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 27 · zone **Le ciel** · frayère **plage** · plafond 4, plancher 2

### Fou Moustachu Volant — *Oiseau marin plongeur* — *Sula moustachus*
- **Phrase** — « Repéré ! …plouf. »
- **Action** — il plonge, remonte avec une algue au lieu d'un poisson, et la jette rageusement.
- **Mange** — Poisson Volant Cascadeur, Sardine Bulle-fofolle · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 22 · zone **Le ciel** · frayère **haut-fond** · plafond 8, plancher 4

### Cormoran Sous-Marin — *Cormoran* — *Phalacrocorax submarinus*
- **Phrase** — « Je descends, je reviens. »
- **Action** — il plonge cinq fois plus bas que le Fou et **nage vraiment sous l'eau**, puis ressort en secouant ses plumes.
- **Mange** — Maquereau Métronome, Crevette Sauteuse · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 21 · zone **Le ciel** · frayère **plage** · plafond 5, plancher 3

### Goéland Chapardeur — *Goéland argenté* — *Larus chapardus*
- **Phrase** — « C’est à moi, maintenant. »
- **Action** — **il ne chasse rien** : il guette un oiseau qui vient d'attraper quelque chose, fond dessus et repart avec sa prise.
- **Mange** — plancton · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 20 · zone **Le ciel** · frayère **plage** · plafond 6, plancher 4

---

## La surface (2)

### Poisson Volant Cascadeur — *Exocet* — *Exocetus cascadeurus*
- **Phrase** — « Regardez-moi ça ! Et… HOP ! »
- **Action** — il rate son saut et prend un air très fier, comme si c'était voulu.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Fou Moustachu Volant, Pélican Attrape-Tout
- T2 petit poisson · taille 14 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 34, plancher 12 · **frai éclair**
- *5 sept. 2026* — `offshore` 950 → **260**. À 950 il passait sa vie collé à sa propre barrière, en pleine mer : **79 %** du banc à moins de 40 px du mur. Le plancher générique de 150 px d'eau suffit à le tenir hors du ressac.

### Sardine Bulle-fofolle — *Petite sardine de surface* — *Sardina bullabulla*
- **Phrase** — « Glou glou glou ! Oh, encore une bulle ! »
- **Action** — chapelet de bulles permanent et gros glouglou joyeux. Sa phrase EST son gag.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Fou Moustachu Volant, Pélican Attrape-Tout
- T2 petit poisson · taille 13 · zone **Mer** · frayère **haut-fond** · plafond 36, plancher 13 · **frai éclair**
- *5 sept. 2026* — `offshore` 950 → **260**, même raison : **67 %** du banc collé au mur invisible. Elle a de nouveau droit au rivage, comme le Confetti.

---

## L'eau claire et le récif (19)

### Espadon Voilier — *Voilier / espadon* — *Istiophorus fiouuus*
- **Phrase** — « Vous avez vu passer quelqu’un ? »
- **Action** — il charge en ligne droite et siffle en passant.
- **Mange** — Dorade Dorée, Maquereau Métronome · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 46 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 6, plancher 4

### Dauphin Farceur — *Dauphin* — *Delphinus blagueurus*
- **Phrase** — « BOUH ! …hihihi ! »
- **Action** — en trois temps : approche discrète, jaillissement « BOUH ! », et il se plie de rire en tournant sur lui-même.
- **Mange** — Poisson Confetti · plancton · **Favori**** — Micro-crevettes
- **Mangé par** — personne
- T3 prédateur moyen · taille 42 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 10, plancher 4

### Thon Speedy — *Thon* — *Thunnus vroumvroum*
- **Phrase** — « Poussez-vous, je suis pressé ! »
- **Action** — il klaxonne un « VROUUUM » en passant à fond. Le seul texte justifié du jeu : c'est un bruit, pas une réplique.
- **Mange** — Crevette Sauteuse · plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Requin Dents-Molles, Orque Echo
- T3 prédateur moyen · taille 26 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 12, plancher 4

### Poisson-perroquet Pétomane — *Poisson-perroquet* — *Scarus petomanus*
- **Phrase** — « C’est pas moi ! »
- **Action** — en quatre temps : il se fige gêné, se tortille, **détonation** par la queue avec propulsion, et les voisins verdissent. Le gag le plus abouti du jeu.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Requin Dents-Molles, Murène du Récif
- T2 petit poisson · taille 20 · zone **Rivage → Grand large** · frayère **récif** · plafond 20, plancher 7

### Corail Viva — *Corail branchu* — *Acropora vivarium*
- **Phrase** — « Installez-vous, il y a de la place. »
- **Action** — *(aucune — décor vivant, second refuge de ponte à côté de l'anémone)*
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 20 · zone **Rivage → Grand large** · frayère **récif** · plafond 10, plancher 4

### Anémone Câline — *Anémone de mer* — *Anemonia calinus*
- **Phrase** — « Entrez, entrez, c’est chauffé ! »
- **Action** — elle balance ses bras en musique, et fait le câlin dont elle a hérité de l'Étoile : elle attrape un passant, replie ses bras autour, et le câliné rougit.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 18 · zone **Rivage → Grand large** · frayère **récif** · plafond 12, plancher 4

### Poisson Police — *Poisson-sergent* — *Abudefduf gendarmus*
- **Phrase** — « Circulez, y’a rien à voir ! »
- **Action** — il repère un pétomane, un caca frais ou un farceur, fonce dessus et le sermonne — le fautif file, tout honteux.
- **Mange** — plancton · **Favori**** — Graines
- **Mangé par** — personne
- T3 prédateur moyen · taille 17 · zone **Rivage → Grand large** · frayère **récif** · plafond 6, plancher 4

### Dorade Dorée — *Dorade royale* — *Sparus doreus*
- **Phrase** — « Nous sommes les plus brillants. »
- **Action** — *(aucune — espèce d'ambiance, et c'est assumé)*
- **Mange** — plancton · **Favori**** — Graines
- **Mangé par** — Espadon Voilier, Barracuda Perce-Ballon
- T2 petit poisson · taille 16 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 26, plancher 9 · **frai éclair**

### Fugu Gonflé — *Poisson-globe* — *Tetraodon ballonus*
- **Phrase** — « N’approche pas… je gonfle ! »
- **Action** — il gonfle dès qu'on approche, en avalant de l'eau (les bulles le disent), et **pique au contact**. Une fois dégonflé il souffle un grand coup, soulagé.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Mérou Patatras, Barracuda Perce-Ballon
- T2 petit poisson · taille 15 · zone **Rivage → Grand large** · frayère **récif** · plafond 10, plancher 4

### Maquereau Métronome — *Maquereau* — *Scomber metronomus*
- **Phrase** — « Un, deux. Un, deux. »
- **Action** — *(aucune — espèce d'ambiance)*
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Espadon Voilier, Cormoran Sous-Marin
- T2 petit poisson · taille 14 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 22, plancher 8 · **frai éclair**

### Hippocampe Zen — *Hippocampe* — *Hippocampus rougissimus*
- **Phrase** — « Ne me regardez pas… »
- **Action** — il rougit quand le curseur reste près de lui. Il s'accroche **au bout des herbes**.
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Murène du Récif
- T2 petit poisson · taille 13 · zone **Rivage → Grand large** · frayère **récif** · plafond 12, plancher 4

### Poisson Coffre-au-Trésor — *Poisson-coffre* — *Ostracion cubicus*
- **Phrase** — « Je nage très bien. Si si. »
- **Action** — il nage très mal : il avance par à-coups en tournant sur lui-même, et il a l'air très content de lui.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Murène du Récif
- T2 petit poisson · taille 13 · zone **Rivage → Grand large** · frayère **récif** · plafond 9, plancher 4

### Coquillage Rieur — *Bénitier* — *Bivalvus hilarius*
- **Phrase** — « Hi hi hi ! …hi. »
- **Action** — il s'ouvre parfois en grand et fabrique une perle qui brille.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 12 · zone **Rivage → Grand large** · frayère **récif** · plafond 16, plancher 6

### Poisson-clown Chatouille — *Poisson-clown* — *Amphiprion guiliguili*
- **Phrase** — « Guili-guili ! »
- **Action** — **il vit DANS une anémone** : il en adopte une pour de bon, s'y niche pour dormir, et n'en sort que pour aller chatouiller **quelqu'un qui passe** — le flanc d'un plus gros, jusqu'au bisou.
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Mérou Patatras
- T2 petit poisson · taille 12 · zone **Rivage → Grand large** · frayère **récif** · plafond 12, plancher 4
- *5 sept. 2026* — il était ancré à une **copie des coordonnées** de l'anémone la plus proche au jour du spawn : un clown né d'une ponte restait ancré à un point d'eau vide. Il garde maintenant une vraie référence, et son rayon de confort se referme la nuit. Mesuré au cœur de la nuit, distance à l'hôte : **médiane 103 px et jusqu'à 377 → médiane 26 px**.

### Poisson Papillon Amoureux — *Poisson-papillon* — *Chaetodon duobus*
- **Phrase** — « On ne se quitte jamais, hein ? »
- **Action** — ils vont **toujours par deux** : chacun se choisit un compagnon et le suit côte à côte, avec des cœurs quand ils se trouvent.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Rascasse Épineuse
- T2 petit poisson · taille 12 · zone **Rivage → Grand large** · frayère **récif** · plafond 14, plancher 5

### Poisson Confetti — *Banc de poissons tropicaux* — *Confettius multicolorus*
- **Phrase** — « On est nombreux, mais on est PAS pareils ! »
- **Action** — le banc dessine une forme — un cœur, un rond ou un carré — puis se disperse, gêné d'avoir été vu.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Dauphin Farceur
- T2 petit poisson · taille 11 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 80, plancher 28 · **frai éclair**

### Étoile de Mer Ventouse — *Étoile de mer* — *Asterias ventousa*
- **Phrase** — « Viens là, toi ! Plok ! »
- **Action** — elle se colle à un passant et rigole de se faire transporter, puis se décroche pour rejoindre un rocher. Son ancien câlin est passé à l'Anémone.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 10 · zone **Rivage → Grand large** · frayère **récif** · plafond 16, plancher 6

### Poisson Dentiste — *Labre nettoyeur* — *Labroides dentistus*
- **Phrase** — « Ouvrez grand… ça ne fera pas mal ! »
- **Action** — il ouvre une **station de nettoyage** : un gros s'arrête, ouvre grand, il travaille dedans. C'est lui qui refait les dents du Requin. Personne ne le mange, jamais — le contrat vaut même pour un prédateur affamé.
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — personne
- T2 petit poisson · taille 10 · zone **Rivage → Grand large** · frayère **récif** · plafond 8, plancher 4

### Crevette Sauteuse — *Crevette de récif* — *Palaemon saltator*
- **Phrase** — « Et hop ! Et hop ! »
- **Action** — *(aucune — espèce d'ambiance)*
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Thon Speedy, Cormoran Sous-Marin, Rascasse Épineuse
- T2 petit poisson · taille 6 · zone **Rivage → Grand large** · frayère **récif** · plafond 34, plancher 12 · **frai éclair**
- *5 sept. 2026* — plafond 24 → 34. **Trois** prédateurs, dont le poisson le plus rapide du jeu : 33 prises par le seul Thon en 10 min, l'espèce tombait de 17 adultes à 3.

---

## La zone trouble (12)

### Requin Dents-Molles — *Requin* — *Carcharodon dentimollis*
- **Phrase** — « Grrr… aïe, mes dents. »
- **Action** — son nom est devenu sa mécanique — **quand il mange, il perd une dent**, et il ne peut plus attraper personne tant qu'elle n'a pas repoussé. Le Poisson Dentiste la lui refait sur-le-champ ; sinon elle revient toute seule, faute de quoi il mourrait de faim.
- **Mange** — Thon Speedy, Poisson-perroquet Pétomane · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 70 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 6, plancher 4

### Barracuda Perce-Ballon — *Barracuda* — *Sphyraena perceballon*
- **Phrase** — « J’adore le bruit que ça fait. »
- **Action** — il fonce droit sur un Fugu gonflé et **le fait exploser**. Le seul à pouvoir le manger sans se piquer.
- **Mange** — Fugu Gonflé, Dorade Dorée · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 40 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 7, plancher 4

### Mérou Patatras — *Mérou* — *Epinephelus patatras*
- **Phrase** — « Chut… je ne suis pas là. »
- **Action** — il n'attrape pas, il **aspire** : une bouche énorme et la proie est happée.
- **Mange** — Poisson-clown Chatouille, Fugu Gonflé · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 38 · zone **Rivage → Grand large** · frayère **récif** · plafond 6, plancher 4

### Raie Ronron — *Raie manta* — *Manta ronronus*
- **Phrase** — « Rrrrron… »
- **Action** — elle ronronne, descend fouiller le sable et mastique.
- **Mange** — plancton · **Favori**** — Vers de sable
- **Mangé par** — personne
- T3 prédateur moyen · taille 34 · zone **Mer → Grand large** · frayère **profond** · plafond 14, plancher 5

### Tortue Papi — *Tortue caouanne* — *Caretta papyrus*
- **Phrase** — « Rien ne sert de courir… »
- **Action** — **elle sort de l'eau pour pondre**, en cinq temps : elle nage jusqu'au rivage, rampe hors de l'eau, creuse en projetant du sable, pond, puis redescend à la mer et repart très au large. Le seul animal du jeu qui a le droit d'être sur le sable sec.
- **Mange** — Méduse Flottante · plancton · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 34 · zone **Grand large** · frayère **plage** · plafond 7, plancher 4

### Murène du Récif — *Murène* — *Muraena monrocherus*
- **Phrase** — « C’est MON rocher. »
- **Action** — elle sort la tête, bâille longuement, et rentre — un jaillissement pour rien qui fait détaler tout le récif.
- **Mange** — Poisson Coffre-au-Trésor, Poisson-perroquet Pétomane, Méduse Flottante, Hippocampe Zen · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 30 · zone **Mer → Grand large** · frayère **récif** · plafond 6, plancher 4
- *5 sept. 2026* — sa bande passe de 350–1700 à **650–1800 px** : à 350 son rocher tombait au bord du haut-fond, là où il y a déjà foule. Le **Confetti sort de son menu** (plus que 100 px de recouvrement, le lien ne pouvait presque jamais servir), le **Coffre** le remplace. Et elle **broute** : embusquée immobile, elle ne peut pas aller chercher son repas.

### Rascasse Épineuse — *Poisson-scorpion* — *Scorpaena caillouxus*
- **Phrase** — « … (c’est un caillou, promis) »
- **Action** — elle se fait passer pour un caillou — jusqu'au jaillissement.
- **Mange** — Crevette Sauteuse, Poisson Papillon Amoureux · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 18 · zone **Rivage → Grand large** · frayère **récif** · plafond 7, plancher 4

### Méduse Flottante — *Méduse* — *Gelatinus sanstetus*
- **Phrase** — « Pas de tête, pas de souci. »
- **Action** — prise dans le courant, elle part en loopings malgré elle, les yeux qui tournent.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — Murène du Récif, Poisson-lune Bada-boum, Tortue Papi
- T2 petit poisson · taille 16 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 44, plancher 15 · **frai éclair**

### Anguille Jardinière — *Anguille-jardinière* — *Heteroconger cachettus*
- **Phrase** — « Vite, tout le monde dans le trou ! »
- **Action** — la colonie ondule hors du sable et **rentre dans le trou d'un coup** dès qu'un prédateur passe.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T2 petit poisson · taille 11 · zone **Rivage → Grand large** · frayère **récif** · plafond 18, plancher 6

### Bernard-l’Ermite Déménageur — *Pagure* — *Pagurus demenagus*
- **Phrase** — « Celle-là me plairait bien… »
- **Action** — il trouve sa coquille trop petite, en cherche une autre — et va lorgner celle du Coquillage Rieur, qui n'apprécie pas.
- **Mange** — arêtes (charogne) · plancton · **Favori**** — Graines
- **Mangé par** — personne
- charognard · taille 11 · zone **Rivage → Grand large** · frayère **récif** · plafond 14, plancher 5

### Oursin Pic-Pic — *Oursin* — *Echinus picpicus*
- **Phrase** — « On ne touche pas. Vraiment pas. »
- **Action** — *(aucune — décor vivant piquant)*
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 10 · zone **Rivage → Grand large** · frayère **récif** · plafond 14, plancher 5

### Nudibranche Fluo — *Limace de mer* — *Nudibranchia fluorus*
- **Phrase** — « Regardez mes couleurs ! »
- **Action** — il pulse de couleur en broutant, comme s'il digérait quelque chose de très sucré.
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 8 · zone **Rivage → Grand large** · frayère **récif** · plafond 16, plancher 6

---

## Les grands fonds (13)

### Baleine Gros Dodo — *Baleine à fanons* — *Balaena roupillonus*
- **Phrase** — « Encore cinq minutes… »
- **Action** — elle ronfle si fort que les petits poissons devant elle sont soufflés à chaque expiration.
- **Mange** — plancton · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 190 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 3, plancher 1

### Cachalot Profond — *Cachalot* — *Physeter profundissimus*
- **Phrase** — « Je descends chercher le goûter. »
- **Action** — un aller-retour perpétuel entre l'air qu'il doit respirer et les céphalopodes du fond ; il passe deux fois plus de temps en bas qu'en haut.
- **Mange** — Calmar Violette, Calamar Géant Timide · plancton · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 100 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 4, plancher 2

### Calamar Géant Timide — *Calmar géant (Architeuthis)* — *Architeuthis timidissimus*
- **Phrase** — « …vous m’avez vu ? Zut. »
- **Action** — on l'approche, il rentre ses bras, rougit et se laisse couler en espérant qu'on ne l'ait pas vu. Un géant qui fait le tout petit.
- **Mange** — Poulpe Ninja · plancton · **Favori**** — —
- **Mangé par** — Cachalot Profond
- T4 grand prédateur · taille 78 · zone **Grand large** · frayère **profond** · plafond 4, plancher 2

### Orque Echo — *Orque* — *Orcinus echoechoecho*
- **Phrase** — « Attends, attends, j’en ai une bonne. »
- **Action** — elle lance des échos la nuit, qui **réveillent les poissons des profondeurs**.
- **Mange** — Thon Speedy, Calmar Violette · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 70 · zone **Mer → Grand large** · frayère **haut-fond** · plafond 5, plancher 3

### Poisson-lune Bada-boum — *Môle / poisson-lune* — *Mola badaboum*
- **Phrase** — « Tout est calme… tout est… BADA-BOUM. »
- **Action** — il s'endort en pleine nage et **coule** lentement jusqu'à toucher le fond, où il se réveille en sursaut. C'est exactement ce que « Bada-boum » raconte.
- **Mange** — Méduse Flottante, Crevette Guirlande · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 50 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 8, plancher 4

### Anguille Coup-de-Jus — *Anguille électrique* — *Electrophorus zzzap*
- **Phrase** — « Touche pas, ça pique fort ! »
- **Action** — elle **électrocute tout son voisinage d'un coup** : des éclairs partent d'elle, les touchés sont sonnés, les alevins n'y survivent pas. De petites étincelles courent sur elle avant la décharge.
- **Mange** — Crabe Disco · plancton · **Favori**** — —
- **Mangé par** — personne
- T3 prédateur moyen · taille 26 · zone **Mer → Grand large** · frayère **profond** · plafond 6, plancher 4

### Poulpe Ninja — *Poulpe* — *Octopus ninjaticus*
- **Phrase** — « Vous ne m’avez jamais vu. »
- **Action** — **le ninja, enfin visible** : il se fige et regarde autour de lui, nuage d'encre, il s'efface complètement, ressort à 300 px de là et réapparaît en fondu, très fier. Son encre part en ROT annoncé.
- **Mange** — arêtes (charogne) · plancton · **Favori**** — Graines
- **Mangé par** — Calamar Géant Timide
- charognard · taille 24 · zone **Rivage → Grand large** · frayère **profond** · plafond 24, plancher 8

### Poisson-Tapis Grande-Bouche — *Requin-tapis (wobbegong)* — *Orectolobus grandebouche*
- **Phrase** — « …………… (il attend) »
- **Action** — **plus de câlin** : il attend, confondu avec le sable, et ouvre une gueule plus large que lui. Il avale aussi les cacas sans être malade — le seul.
- **Mange** — Baudroie-lanterne Allumeur, Crevette Guirlande, Crabe Disco · plancton · **Favori**** — —
- **Mangé par** — personne
- T4 grand prédateur · taille 20 · zone **Grand large** · frayère **profond** · plafond 10, plancher 4

### Calmar Violette — *Calmar (encornet)* — *Loligo violetta*
- **Phrase** — « Trois, deux, un… PSCHIT ! »
- **Action** — trois, deux, un — il décolle à reculons, trop fort, et se cogne.
- **Mange** — Crevette Guirlande, Baudroie-lanterne Allumeur · **Favori**** — Micro-crevettes
- **Mangé par** — Orque Echo, Cachalot Profond
- T3 prédateur moyen · taille 19 · zone **Mer → Grand large** · frayère **profond** · plafond 24, plancher 8 · **frai éclair**

### Baudroie-lanterne Allumeur — *Poisson-lanterne (baudroie abyssale)* — *Melanocetus allumus*
- **Phrase** — « Par ici la lumière, mes petits… »
- **Action** — la nuit, **son corps disparaît et il ne reste que la lanterne**. Elle réapparaît quand elle mange.
- **Mange** — Crevette Guirlande · plancton · **Favori**** — Plancton doré
- **Mangé par** — Poisson-Tapis Grande-Bouche, Calmar Violette
- T2 petit poisson · taille 16 · zone **Grand large** · frayère **profond** · plafond 28, plancher 10

### Concombre Aspirateur — *Holothurie* — *Holothuria aspirator*
- **Phrase** — « Encore moi qui nettoie. Bien sûr. »
- **Action** — il aspire le sable en râlant, et laisse un sillon propre : le seul animal du jeu qui **nettoie**.
- **Mange** — plancton · **Favori**** — Graines
- **Mangé par** — personne
- T1 brouteur · taille 14 · zone **Rivage → Grand large** · frayère **profond** · plafond 12, plancher 4

### Crevette Guirlande — *Crevette abyssale bioluminescente* — *Caridina guirlandus*
- **Phrase** — « On clignote tous ensemble ? À trois ! »
- **Action** — tout l'essaim clignote en rythme — et il y en a toujours une à contretemps, toujours la même.
- **Mange** — plancton · **Favori**** — Micro-crevettes
- **Mangé par** — Baudroie-lanterne Allumeur, Poisson-Tapis Grande-Bouche, Poisson-lune Bada-boum, Calmar Violette
- T2 petit poisson · taille 7 · zone **Mer → Grand large** · frayère **profond** · plafond 62, plancher 22 · **frai éclair**

### Krill Étincelle — *Krill* — *Euphausia scintilla*
- **Phrase** — « On est un million, tu sais. »
- **Action** — *(aucune — espèce d'ambiance ; la Baleine et la Raie filtrent enfin quelque chose de visible)*
- **Mange** — plancton · **Favori**** — Plancton doré
- **Mangé par** — personne
- T1 brouteur · taille 4 · zone **Rivage → Grand large** · frayère **haut-fond** · plafond 30, plancher 11 · **frai éclair**

---

## Partout sur le fond (1)

### Crabe Disco — *Crabe* — *Cancer discotecus*
- **Phrase** — « Ça pince ET ça danse ! »
- **Action** — il plante ses pinces, s'arrête net et danse sur place en changeant de couleur.
- **Mange** — arêtes (charogne) · plancton · **Favori**** — Graines
- **Mangé par** — Poisson-Tapis Grande-Bouche, Anguille Coup-de-Jus
- charognard · taille 13 · zone **Rivage → Grand large** · frayère **récif** · plafond 14, plancher 5

---

## Les règles qui valent pour tout le monde

### Qui rend malade qui

`Entity.malaise()` borne la faim à 0,9, se voit sur le visage, et **ne tue
jamais**. Quatre sources :

| Source | |
|---|---|
| Avaler un caca | tout le monde, **sauf le Poisson-Tapis**, qui s'en régale |
| Respirer le prout du Perroquet Pétomane | les voisins verdissent |
| Toucher un **Fugu Gonflé** ou un **Oursin Pic-Pic** | `piquant` — cooldown par victime |
| Toucher une **Rascasse Épineuse** | idem |

L'**Anguille Coup-de-Jus** est à part : elle ne rend pas malade, elle
**assomme** — et tue les alevins.

### Qui sort de l'eau

Trois cas, et trois seulement :

- les **oiseaux**, qui y vivent (et qui broutent la surface, pas l'air — sans
  quoi le Pélican mourait de faim) ;
- les **sauteurs** (`jumps`), le temps d'un saut ;
- la **Tortue Papi**, qui monte pondre sur le sable sec (`ponteTerrestre`).
  C'est la seule qui franchit sa propre barrière de rivage, et le sable ne la
  tue pas pendant sa scène.

Tout le reste est tenu à l'écart du rivage : **150 px d'eau minimum** pour un
nageur, **900 px pour un colosse**, et de quoi les recouvrir pour les créatures
de fond.

### Les quatre zones, de gauche à droite

Le monde se lit maintenant **horizontalement** aussi. Chaque fiche porte sa
bande : **Plage** (le sable émergé) · **Rivage** (le haut-fond) · **Mer** (la
pleine eau) · **Grand large** (le large et les abysses). Elles sont déduites du
relief, pas figées, et le HUD les affiche en haut de l'écran avec la profondeur :
« Grand large · Eau claire · 34 m ».

Deux conséquences pour qui ajoute une espèce :

- **La bande horizontale découle de la bande de profondeur.** Baisser
  `depthBand[0]` rapproche l'espèce du rivage, la monter l'envoie au large — la
  Murène du Récif a changé de zone sans qu'on touche à son x.
- **Prédateur et proie doivent se recouvrir dans les DEUX sens.** En dessous de
  300 px en x ou 120 px en y, le lien trophique est décoratif : il est déclaré
  et ne sert jamais. C'est ce qui a sorti le Confetti du menu de la Murène.

### Qui broute (et pourquoi ça évite les extinctions)

Le plancton ambiant est le filet qui empêche de mourir de faim. Trois cas, tous
génériques :

- toute espèce **sans proie** (filtreurs, herbivores, charognards) ;
- tout prédateur qui n'a qu'**une seule espèce** au menu — aucune marge si elle
  se raréfie ;
- tout **embusqué immobile** (`ambush` + `fixed`/`crawl`) : il ne peut pas aller
  chercher son repas, il dépend de ce qui veut bien passer devant son caillou.
  Sans cette troisième règle : 5 Rascasses mortes de faim sur 6, et 2 Murènes
  sur 3 dès qu'on descend leur bande.

Deux exceptions déclarées à la main, l'**Orque Echo** et le **Cachalot
Profond** : deux proies chacun, mais deux proies rares et protégées la plupart
du temps. La disette est censée couvrir ce cas, mais elle est tout-ou-rien — il
suffit qu'une proie repasse une minute au-dessus de son plancher pour que le
prédateur cesse de brouter sans pour autant attraper quoi que ce soit.

### Six espèces d'ambiance n'ont pas de gag

Dorade, Corail, Maquereau, Crevette Sauteuse, Oursin, Krill. C'est **assumé** :
on les regarde en masse sans les suivre. Leur donner une scène coûterait du
budget de bulles sans rien raconter de plus.

---

## Journal des réglages d'équilibre

Chaque ligne a été mesurée en simulation, jamais supposée. La méthode :
instrumenter `Entity.prototype.die` (cause de mort) et `Ecosystem.eat` (qui
mange qui), puis faire tourner `Ecosystem.update` sans rendu — en appelant
**aussi** `Food.update` et `Particles.update`, sinon arêtes et sable
s'accumulent et faussent tout.

### Ce qui a été réparé

| Problème mesuré | Correctif |
|---|---|
| L'aquarium s'effondrait par le haut : Orque **éteinte**, Requin à 1, Thon 22→2 | La **disette** — un carnivore dont toutes les proies sont protégées broute à moitié rendement |
| **11 des 22 liens trophiques n'avaient jamais servi** | Le plancher ne peut plus rejoindre le plafond (le Calamar Géant était inchassable **par construction**) |
| La Méduse pondait 2 fois en 18 min et passait de 35 à 4 | Ponte en diffusion pour **tout ce qui ne migre pas**, pas seulement les espèces fixes |
| Le banc de Confetti tombait à 21 pour un plafond de 96 | Plancher porté de 22 % à **35 %** : c'est lui qui fixe l'effectif d'équilibre |
| Tout s'entassait contre la plage dès que le curseur poussait | **150 px d'eau minimum** pour tout nageur (le Confetti descendait à 46) |
| La Baleine venait trop près du rivage | **900 px** pour un colosse : sa barrière recule de x=1790 à 2420 |
| On trouvait des coquillages sur le **sable sec** | Même plancher d'eau au spawn et en reptation |
| Un crabe endormi traversait sa bande de sable toute la nuit | Le sommeil coupe la vitesse **et** l'accélération — deux fois, car la reptation court-circuite le steering |
| Le Thon, le Mérou, le Barracuda, l'Espadon et les oiseaux mouraient de faim | Ils broutent : un prédateur à proie unique ou à proies rares n'a aucune marge |
| Le Confetti était au menu de **cinq** prédateurs | Il sort de celui du Mérou et de la Rascasse, qui ont d'autres proies |
| Le banc de Confetti se faisait quand même massacrer : **34 prises par les seuls thons en 3 min** | Trois leviers, dans cet ordre d'efficacité : le peuplement initial partait à **23 thons pour un plafond de 12**, le plafond lui-même descend de 20 à 12, et le Thon rate désormais une charge sur trois |
| Le **Poisson Police mangeait les fautifs** qu'il venait gronder (6 poissons-clowns en 3 min) | L'état `hunt` sert aussi à foncer sur quelqu'un sans vouloir le manger : on ne dévore que ses **proies déclarées** |
| Un chasseur restait planté dans le banc à enchaîner les bouchées | La **traversée** : après une prise il poursuit sur sa lancée et ressort de l'autre côté avant de rechasser |
| Perroquet, Sardine et Calmar Violette avaient trois prédateurs chacun | Le Dauphin lâche le Perroquet, l'Espadon lâche la Sardine, le Calamar Géant lâche le Calmar |
| L'Orque ne pouvait atteindre aucun de ses calmars | Sa bande descend de 1500 à 2400 : une proie hors bande est **inatteignable** |
| Le Krill passait de 28 à 8 en 4 min | Longévité portée à [420, 620] — une base de chaîne à vie courte n'a le temps que d'une portée |
| Un **mur invisible en pleine mer** : 67 % des Sardines et 79 % des Poissons Volants collés à moins de 40 px de leur barrière | La bande horizontale ne commence plus avant la barrière de rivage de l'espèce, la barrière donne à chacun sa distance, et la marge de confort suit la vitesse |
| La **Murène** posait son rocher au bord du haut-fond, là où il y a déjà foule | Sa bande passe de 350–1700 à **650–1800 px** — et le Confetti sort de son menu, faute de recouvrement |
| La **Rascasse** mourait de faim à 5 exemplaires sur 6 en 10 min | Un **embusqué immobile broute** : il ne peut pas aller chercher son repas |
| L'**Orque** repassait éteinte (5 mortes de faim) | Elle broute, comme le Requin : la disette est tout-ou-rien et lâche dès qu'une proie repasse une minute au-dessus de son plancher |
| La **Crevette Sauteuse** tombait de 17 à 3 (33 prises par le seul Thon) | Plafond 24 → 34 : trois prédateurs, il faut de quoi les nourrir |
| Des **étoiles sur le sable sec, à deux au pixel près** | Les sites d'habitat sont filtrés sur la colonne d'eau, pas seulement sur la bande de profondeur (`Ecosystem.sitesHabitat`) |

### État actuel

Simulation de contrôle de **15 minutes**, 5 septembre 2026 :

- **Zéro espèce éteinte**, **zéro mort de faim**, **36 liens trophiques actifs**.
- Répartition horizontale : **rivage 11 · mer 143 · grand large 247** adultes.
  Le goulot du rivage a disparu, et **aucun nageur sur le sable sec**.
- ~590 entités pour 51 espèces, simulation à **6,1 ms** par frame.
- Budget de bulles : **~508/min** pour une cible de 250. Ramené de 1284, mais
  encore au double. Méthode pour finir dans `CLAUDE.md`.

Ce qu'une simulation longue montre et qu'il ne faut PAS prendre pour une panne :
les populations de départ sont **au-dessus** de leur équilibre (`spawnGroups`
ignore `popCap`), donc tout le monde décroît pendant les dix premières minutes.
Une espèce qui passe sous son plancher cesse d'être chassée et remonte. Une
espèce rare qui touche zéro revient par l'**immigration** dans les 25 s. La
mesure qui compte est donc « éteinte à la fin », pas « en baisse ».

### Les trois pièges qui reviennent toujours

1. **Une proie hors de la bande de profondeur de son prédateur est
   inatteignable.** Il la poursuit, sa contrainte verticale le rappelle, il
   meurt de faim sans jamais manger.
2. **Concentrer plusieurs prédateurs sur une même proie la fait s'effondrer**,
   et tout ce qui en dépend avec elle. Trois, c'est déjà beaucoup — deux est la
   bonne valeur pour une espèce qu'on veut voir en banc.
3. **Une base de chaîne doit vivre longtemps.** Avec une longévité de petit
   poisson, elle n'a le temps que d'une portée et s'éteint.

4. **Le peuplement initial doit respecter les plafonds.** `spawnGroups(id, n)`
   crée `n × groupSize` individus sans regarder `popCap` : on démarrait à 23
   thons pour un plafond de 12, soit trois minutes de massacre avant que la
   population redescende — et c'est précisément ce que le joueur voit en
   arrivant.

Et un piège de méthode : **en simulation à vide, personne ne va sur la plage.**
C'est le curseur du joueur qui pousse. Une mesure sans interaction peut donc
déclarer sain un système qui ne l'est pas.

Corollaire vérifié : le massacre du banc près du rivage n'était **pas** dû à la
souris. Sans aucune interaction, zéro confetti mangé à moins de 600 px du
rivage — mais 34 avalés par les thons partout ailleurs. Quand quelque chose se
voit à un endroit, la cause n'est pas forcément à cet endroit.
