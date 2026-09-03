// Roster complet (24 espèces + anémones) couvrant chaque niveau trophique et
// chaque type de liberté de mouvement (GDD §14).
//
// movement: 'fixed' | 'anchored' | 'strata' | 'wideband' | 'free' | 'crawl' | 'drift'
// depthBand: [min, max] en px sous la surface (contrainte verticale) — ignoré si aerial: true
// trophic: 1..4 | 'scavenger'
// prey: liste d'ids d'espèces chassées ; favoriteFood: id FOOD_TYPES
//
// Flags génériques (comportement câblé une fois pour toutes dans entity.js/ecosystem.js) :
//   refuge: true          — pas un poisson, sert de refuge (ponte, ancrage, ratés de chasse à proximité)
//   anchorToRefuge: true  — spawn + reste ancré (movement:'anchored') près de l'anémone la plus proche
//   ambush: {range, missChance} — prédateur fixe embusqué (jaillit quand une proie passe à portée)
//   aerial: true           — vole au-dessus de la surface (bande gérée en y monde direct)
//   jumps: true            — bondit hors de l'eau périodiquement (phase aérienne avec gravité)
//   stealthy: true          — furtivité : monte à l'arrêt, retombe en mouvement (poof au démarrage)
//   trickster: true         — 1 attaque sur 3 est une fausse charge (jamais de vraie prise)
//   nocturnal: true         — ne s'endort pas la nuit comme les autres trophic 2
//   lure: {range, missChance} — pêche à la lampe : hypnotise les proies alentour et
//                               les attire à sa bouche (Poisson-lanterne)
//   ink: true               — lâche un rideau d'encre en fuyant : le poursuivant perd sa trace
//   offshore: <px>          — colonne d'eau minimale sous l'espèce : elle est tenue AU LARGE
//                             de ce point (barrière, spawn et frayère). Sert aux espèces de
//                             surface que le haut-fond piège contre la plage.
//   spanRatio: n            — demi-emprise DESSINÉE, en multiples de `size` (défaut 1,05).
//                             À déclarer dès qu'une silhouette déborde nettement de sa
//                             taille nominale : c'est ce que lit l'anti-chevauchement des colosses.
//   sizeVar: 0..1           — dispersion des tailles adultes de l'espèce (défaut 0,13).
//                             Fort chez les espèces bariolées, faible chez les colosses.
//   gag: (entity, dt, t) => void — comportement comique périodique, appelé depuis Entity.think

const SPECIES = {

  confetti: {
    name: 'Poisson Confetti', realName: 'Banc de poissons tropicaux', trophic: 2, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [80, 750], size: 11, speed: 70,
    // Espèce clé de voûte du niveau 2 : plusieurs prédateurs en dépendent,
    // il lui faut donc un plafond de population élevé.
    schooling: true, groupSize: [26, 32], popCap: 96,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ff6b8a', '#ffb84d', '#5ecfff', '#a3e64c', '#c78aff'],
    bodyRatio: 0.62, tail: 'fan', sizeVar: 0.26,   // un banc de confettis, ça dépareille
    lifespan: [180, 300],
  },

  bulle_fofolle: {
    name: 'Sardine Bulle-fofolle', realName: 'Petite sardine de surface', trophic: 2, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [10, 110], size: 13, speed: 90,
    // AU LARGE. Sa barrière de rivage, calculée sur sa taille, tombait à 40 px
    // de colonne d'eau : poursuivie par le Fou Moustachu, elle finissait
    // plaquée dans le ressac, et ses sauts la déposaient carrément sur le sable.
    offshore: 950,
    schooling: true, groupSize: [5, 8],
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#7fd8ff', '#a8e6ff'],
    bodyRatio: 0.75, tail: 'fan', jumps: true,
    lifespan: [180, 300],
    gag: (e, dt, t) => GAGS.bulle_fofolle(e, dt, t),
  },

  meduse: {
    name: 'Méduse Flottante', realName: 'Méduse', trophic: 2, movement: 'drift',
    nursery: 'shallow',
    depthBand: [150, 1600], size: 16, speed: 12,
    schooling: false, groupSize: [4, 6], popCap: 70,   // proie de 2 prédateurs, dérive lentement
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#e8b3ff', '#b3d9ff'],
    render: 'jelly', glowAtNight: true,
    lifespan: [200, 350],
  },

  thon: {
    name: 'Thon Speedy', realName: 'Thon', trophic: 3, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [150, 900], size: 26, speed: 130, sprintSpeed: 420,
    schooling: false, groupSize: [3, 4], popCap: 20,   // chassé par le Requin ET l'Orque : il lui faut du stock
    // Confetti seul : la Méduse (vitesse 12) ne peut pas échapper à un sprint à
    // 420 et se faisait exterminer. Sa régulation revient au Poisson-lune (GDD §13).
    prey: ['confetti'], favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#4a7fb5'],
    bodyRatio: 0.4, tail: 'lunate',
    lifespan: [280, 420],
  },

  requin: {
    name: 'Requin Dents-Molles', realName: 'Requin', trophic: 4, movement: 'free',
    nursery: 'shallow',
    depthBand: [500, 1700], size: 46, speed: 80, sprintSpeed: 360,
    schooling: false, groupSize: [1, 2], popCap: 6,
    prey: ['thon', 'perroquet'], missChance: 0.5,   // rate souvent (gag signature)
    colors: ['#8aa3b8'],
    bodyRatio: 0.42, tail: 'shark', fin: true,
    lifespan: [750, 1050],   // les grands prédateurs vivent longtemps : sinon ils
                             // meurent de vieillesse avant d'avoir pu se reproduire
  },

  crabe: {
    name: 'Crabe Disco', realName: 'Crabe', trophic: 'scavenger', movement: 'crawl',
    nursery: 'reef',
    depthBand: [0, 99999], size: 13, speed: 30,
    schooling: false, groupSize: [2, 4], popCap: 14,
    favoriteFood: 'generic', eatsBones: true, eatsFood: true,
    colors: ['#ff5e5e'],
    render: 'crab', disco: true,
    lifespan: [300, 500],
    gag: (e, dt, t) => GAGS.crabe(e, dt, t),
  },

  coquillage: {
    name: 'Coquillage Rieur', realName: 'Bénitier', trophic: 1, movement: 'fixed',
    nursery: 'reef',
    depthBand: [0, 1000], size: 12, speed: 0,
    schooling: false, groupSize: [4, 8], popCap: 16,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#f2c9a0', '#e8a8b8'],
    render: 'shell',
    lifespan: [600, 900],
  },

  gros_dodo: {
    name: 'Baleine Gros Dodo', realName: 'Baleine à fanons', trophic: 3, movement: 'free',
    nursery: 'shallow',
    depthBand: [750, 2600], size: 190, speed: 45, sprintSpeed: 110,   // vraie masse de baleine
    schooling: false, groupSize: [1, 2], popCap: 3, metabolism: 0.5,
    // Elle ne chasse personne : c'est une filtreuse de PLANCTON. Elle broute la
    // colonne d'eau bouche ouverte (grazes) et souffle en surface (breathes).
    filterFeeder: true, grazes: true, breathes: true,
    colors: ['#5b7fa6'],
    bodyRatio: 0.5, tail: 'whale', sleeps: true, snores: true,
    lifespan: [2000, 3000],
  },

  // --- Extension du roster (GDD §14, 24 espèces) ---------------------------

  etoile: {
    name: 'Étoile de Mer Câline', realName: 'Étoile de mer', trophic: 1, movement: 'fixed',
    habitat: 'rock',   // se pose sur les rochers
    nursery: 'reef',
    depthBand: [0, 1000], size: 10, speed: 0,
    schooling: false, groupSize: [3, 6], popCap: 16,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ffb347', '#ff8fa3'],
    render: 'star',
    lifespan: [500, 800],
    // Câlin (GDD §12) : referme ses bras sur qui la TOUCHE vraiment — un seul
    gag: (e, dt, t) => GAGS.etoile(e, dt, t),
  },

  anemone: {
    name: 'Anémone', realName: 'Anémone de mer', trophic: 1, movement: 'fixed',
    nursery: 'reef',
    depthBand: [120, 1150], size: 18, speed: 0,
    schooling: false, groupSize: [1, 2],
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ff7eb6', '#c78aff', '#8affc1'],
    render: 'anemone', refuge: true,   // pas un poisson : refuge pour la ponte et les alevins
    lifespan: [1000, 1600],
  },

  volant: {
    name: 'Poisson Volant Cascadeur', realName: 'Exocet', trophic: 2, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [10, 100], size: 14, speed: 95,
    offshore: 950,   // même raison que la Sardine Bulle-fofolle : le haut-fond la piégeait
    schooling: true, groupSize: [4, 6],
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#5ecfff', '#9be8ff'],
    bodyRatio: 0.6, tail: 'fan', jumps: true,
    lifespan: [180, 300],
  },

  moustachu: {
    name: 'Fou Moustachu Volant', realName: 'Oiseau marin plongeur', trophic: 4, movement: 'free', aerial: true,
    nursery: 'shallow',
    depthBand: [0, 0],   // ignoré (aerial) — bande gérée en y monde dans Entity.move
    size: 22, speed: 110, sprintSpeed: 320,
    schooling: false, groupSize: [1, 2],
    prey: ['volant', 'bulle_fofolle'], missChance: 0.4,
    colors: ['#e8e8e8', '#3a4a5a'],
    render: 'bird',
    lifespan: [550, 800],
  },

  clown: {
    name: 'Poisson-clown Chatouille', realName: 'Poisson-clown', trophic: 2, movement: 'anchored', anchorToRefuge: true,
    nursery: 'reef',
    depthBand: [120, 1150], size: 12, speed: 55,
    schooling: false, groupSize: [2, 3], popCap: 12,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#ff7a3d', '#ffffff'],
    render: 'clown',
    lifespan: [250, 400],
    // BISOU (GDD §12) : il choisit le plus gros du coin, vient se coller à son
    // flanc, et lui fait un bisou. Les deux s'ARRÊTENT de nager, il pince les
    // lèvres, l'autre part en fou rire — c'est l'animation qui raconte le gag,
    gag: (e, dt, t) => GAGS.clown(e, dt, t),
  },

  hippocampe: {
    name: 'Hippocampe Timide', realName: 'Hippocampe', trophic: 2, movement: 'anchored', homeRadius: 22,   // il s'accroche vraiment a son herbe
    habitat: 'weed',   // s'accroche dans les herbiers
    nursery: 'reef',
    depthBand: [200, 1000], size: 13, speed: 25,
    schooling: false, groupSize: [2, 3], popCap: 12,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#f2c14e', '#e88fb0'],
    render: 'seahorse',
    lifespan: [250, 400],
    gag: (e, dt, t) => GAGS.hippocampe(e, dt, t),
  },

  perroquet: {
    name: 'Poisson-perroquet Pétomane', realName: 'Poisson-perroquet', trophic: 2, movement: 'strata',
    nursery: 'reef',
    depthBand: [220, 1100], size: 20, speed: 60,   // broute la roche jusqu'au haut de la zone trouble
    schooling: false, groupSize: [3, 5],
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#4cd980', '#ff5ea8', '#5ea8ff'],
    bodyRatio: 0.55, tail: 'fan',
    lifespan: [300, 450],
    // LE PROUT, joué comme une vraie scène : il s'arrête, se tortille de gêne,
    // puis ça part DE SA QUEUE avec un « PROUT ! » et un nuage. Les voisins font
    gag: (e, dt, t) => GAGS.perroquet(e, dt, t),
  },

  dauphin: {
    name: 'Dauphin Farceur', realName: 'Dauphin', trophic: 3, movement: 'wideband',
    breathes: true,   // remonte souffler en surface
    nursery: 'shallow',
    depthBand: [200, 900], size: 42, speed: 100, sprintSpeed: 260,
    schooling: false, groupSize: [2, 3], popCap: 10,
    prey: ['confetti', 'perroquet'], favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#b8c4cc'],
    // PAS de `sleeps` : le farceur ne fait pas la sieste en plein jour, c'est
    // lui qui va reveiller les DORMEURS.
    bodyRatio: 0.45, tail: 'whale',
    lifespan: [400, 600],
    // LA FARCE, jouée en trois temps pour qu'on la COMPRENNE (GDD §12) :
    // 1. il se glisse en douce sous un banc (ralenti, l'air de rien)
    // 2. il jaillit avec un « BOUH ! », le banc explose en tous sens
    gag: (e, dt, t) => GAGS.dauphin(e, dt, t),
  },

  poulpe: {
    name: 'Poulpe Ninja', realName: 'Poulpe', trophic: 'scavenger', movement: 'free',
    nursery: 'deep',
    // Il DESCEND jusqu'au fond des abysses : c'est un des rares habitants mobiles
    // des grands fonds, et la proie de base du Cachalot comme du Calamar Géant.
    depthBand: [400, 3400], size: 24, speed: 45,
    schooling: false, groupSize: [2, 3], popCap: 34,   // proie du Cachalot ET du Calamar Géant
    favoriteFood: 'generic', eatsBones: true, eatsFood: true, stealthy: true, ink: true,
    colors: ['#8a5ea8', '#6a4a8a'],
    render: 'octopus', sizeVar: 0.2,
    lifespan: [300, 500],
  },

  murene: {
    name: 'Murène du Récif', realName: 'Murène', trophic: 4, movement: 'fixed',
    nursery: 'reef',
    // Haut de la zone trouble : c'est là que ses proies descendent réellement.
    // (Avec [800,1600] elle ne croisait AUCUNE de ses proies et mourait de faim.)
    depthBand: [350, 1700], size: 30, speed: 0,
    schooling: false, groupSize: [1, 1], popCap: 6, territory: 340,   // un rocher = une murene (GDD 12)
    prey: ['confetti', 'perroquet', 'meduse'], ambush: { range: 140, missChance: 0.35 },
    colors: ['#7a8a6a'],
    render: 'eel',
    lifespan: [700, 1000],
  },

  raie: {
    name: 'Raie Ronron', realName: 'Raie manta', trophic: 3, movement: 'wideband',
    nursery: 'deep',
    depthBand: [1300, 1700], size: 34, speed: 40,
    schooling: false, groupSize: [1, 2],
    favoriteFood: 'vers_de_sable', eatsFood: true,
    colors: ['#6a7a8a'],
    render: 'ray',
    lifespan: [350, 550],
    // Elle fouille le sable pour ses vers : plongeon du museau, nuage de sable
    gag: (e, dt, t) => GAGS.raie(e, dt, t),
  },

  lanterne: {
    name: 'Poisson-lanterne Allumeur', realName: 'Poisson-lanterne (baudroie abyssale)', trophic: 2, movement: 'strata',
    nursery: 'deep',
    depthBand: [1800, 3000], size: 16, speed: 40,
    // Abysse : le plancton y est plus rare, il faut donc vivre plus longtemps
    // pour avoir le temps de se reproduire (proie du Poisson-Tapis et du Calamar).
    schooling: false, groupSize: [3, 4], popCap: 40,
    // PÊCHE À LA LAMPE (GDD §12) : il allume, ce qui traîne dans le noir vient
    // droit sur la lumière, et il croque. `grazes` reste explicite : sans lui,
    // avoir des proies le priverait du plancton ambiant et il crèverait de faim
    // entre deux crevettes (cf. Entity.update, `def.grazes ?? !def.prey`).
    prey: ['crevette'], grazes: true, senseRange: 320,
    lure: { range: 300, missChance: 0.6 },
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#4a5a8a', '#ffd75e'],
    render: 'lantern', glowAtNight: true, nocturnal: true, sizeVar: 0.18,
    lifespan: [500, 750],
  },

  poisson_tapis: {
    // C'est un REQUIN-TAPIS (wobbegong) : une carpette à dents posée sur le sable,
    // pas un ver. L'ancien nom (« Ver-Tapis ») ne disait rien de ce qu'il fait.
    name: 'Poisson-Tapis Câlin', realName: 'Requin-tapis (wobbegong)', trophic: 4, movement: 'crawl',
    flatGround: true,   // se pose à plat : cherche une terrasse sableuse
    nursery: 'deep',
    // IL RAMPE (`crawl`). Immobile (`fixed`) au fond des abysses, il ne croisait
    // jamais un poisson-lanterne et mourait de faim sans avoir rien mangé : il
    // se traîne maintenant le long du sable jusqu'à sa proie, puis l'embusque.
    depthBand: [1900, 3400], size: 20, speed: 15,
    schooling: false, groupSize: [2, 3], popCap: 10,
    // `senseRange` porte bien plus loin que `ambush.range` : la première distance
    // sert à REPÉRER (et à ramper vers), la seconde à jaillir.
    prey: ['lanterne', 'crevette'], senseRange: 950,
    ambush: { range: 175, missChance: 0.45 },
    colors: ['#a0785a'],
    render: 'worm', sizeVar: 0.16,
    lifespan: [700, 1000],
  },

  poisson_lune: {
    name: 'Poisson-lune Zen', realName: 'Môle / poisson-lune', trophic: 3, movement: 'free',
    nursery: 'shallow',
    depthBand: [200, 1600], size: 50, speed: 18, sprintSpeed: 65,
    // Géant placide : métabolisme lent, il ne meurt pas de faim entre deux méduses
    schooling: false, groupSize: [1, 2], popCap: 8, metabolism: 0.5,
    prey: ['meduse'],   // régime ultra-spécialisé : seul régulateur des méduses (GDD §13)
    colors: ['#e0d8c8'],
    render: 'sunfish', sleeps: true,
    lifespan: [800, 1100],
  },

  orque: {
    name: 'Orque Blagueuse', realName: 'Orque', trophic: 4, movement: 'wideband',
    breathes: true,   // remonte souffler en surface
    nursery: 'shallow',
    depthBand: [450, 1500], size: 70, speed: 90, sprintSpeed: 340,
    schooling: false, groupSize: [2, 2], popCap: 5,   // apex : doit rester rare (GDD §14)
    // Le Thon reste sa cible favorite ; le Dauphin en secours évite que l'Orque
    // s'éteigne dès que les Thons baissent (GDD : « niveau 2-3 accepté »).
    // Comme le dauphin : une blagueuse ne fait pas la sieste en plein jour.
    // Elle dort la nuit avec tout le monde (`sleeps` = siestes a toute heure,
    // reserve au Gros Dodo et au Poisson-lune Zen, pour qui c'est le gag).
    prey: ['thon', 'dauphin'], trickster: true,
    colors: ['#1c2733'],
    bodyRatio: 0.42, tail: 'whale',
    lifespan: [850, 1150],
  },

  cachalot: {
    name: 'Cachalot Profond', realName: 'Cachalot', trophic: 3, movement: 'free',
    breathes: true,   // remonte souffler en surface
    nursery: 'shallow',
    depthBand: [450, 3400], size: 100, speed: 40, sprintSpeed: 210,
    // Sonar (GDD §12) : il repère ses proies de très loin, ce qui compense le
    // fait qu'il passe la moitié de son cycle plus bas qu'elles.
    schooling: false, groupSize: [1, 2], popCap: 4, metabolism: 0.5, senseRange: 2200,
    // Toute la faune céphalopode des grands fonds : c'est SA raison de plonger,
    // et ça donne enfin une scène aux abysses (le duel avec le Calamar Géant).
    prey: ['poulpe', 'calamar', 'calamar_geant'],
    colors: ['#4a5866'],
    bodyRatio: 0.38, tail: 'whale',
    lifespan: [1500, 2500],
    // Cycle de plongée : remonte respirer en surface puis redescend dans les grands fonds ;
    gag: (e, dt, t) => GAGS.cachalot(e, dt, t),
  },

  // --- Les grands fonds (GDD §2 « Grands fonds ») ---------------------------
  // Les abysses n'avaient que le Poisson-lanterne et un embusqué immobile : un
  // décor noir et vide. Ces trois espèces y montent une vraie chaîne — la
  // crevette broute la neige marine, le calamar la chasse, le Calamar Géant
  // chasse le calamar, et le Cachalot descend chercher tout le monde.

  crevette: {
    name: 'Crevette Guirlande', realName: 'Crevette abyssale bioluminescente', trophic: 2, movement: 'wideband',
    nursery: 'deep',
    depthBand: [1500, 3400], size: 7, speed: 46,
    // Base de la chaîne abyssale : trois espèces la mangent, il lui faut donc
    // un plafond élevé et des essaims nombreux (même rôle que le Confetti en haut).
    schooling: true, groupSize: [12, 18], popCap: 96,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#ff9d8a', '#ffc2a8', '#e88fb0'],
    render: 'shrimp', glowAtNight: true, nocturnal: true, sizeVar: 0.22,
    // LONGUE VIE, comme le Poisson-lanterne et pour la même raison : le plancton
    // abyssal (0,72) remplit la jauge de ponte deux fois moins vite qu'en eau
    // claire. Mesuré avec [160, 260] : chaque crevette n'avait le temps que
    // d'UNE portée (donc une demi-descendance par individu, les couples se
    // partageant la ponte) et l'espèce passait de 70 à 2 en huit minutes,
    // entraînant le Calamar avec elle. Il lui faut trois à quatre pontes.
    lifespan: [420, 640],
  },

  calamar: {
    name: 'Calamar Fusée', realName: 'Calmar (encornet)', trophic: 3, movement: 'wideband',
    nursery: 'deep',
    depthBand: [1200, 3400], size: 19, speed: 55, sprintSpeed: 230,
    schooling: true, groupSize: [3, 5], popCap: 24,
    // Il fonce en marche arrière et dépasse souvent sa cible : le raté est
    // comique, et il allège la pression sur le Poisson-lanterne, dont il est
    // de loin le premier prédateur (45 prises en 12 min sans ce garde-fou).
    prey: ['crevette', 'lanterne'], missChance: 0.4,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    ink: true,   // il détale à reculons dans son nuage
    colors: ['#c76a8a', '#9a5a7a'],
    render: 'squid', glowAtNight: true, sizeVar: 0.18,
    lifespan: [280, 430],
  },

  calamar_geant: {
    name: 'Calamar Géant Timide', realName: 'Calmar géant (Architeuthis)', trophic: 4, movement: 'free',
    nursery: 'deep',
    // Il ne remonte JAMAIS dans l'eau claire : c'est le monstre du fond, et sa
    // taille (≥ 70) le fait basculer dans les règles des colosses.
    depthBand: [1900, 3400], size: 78, speed: 46, sprintSpeed: 190,
    schooling: false, groupSize: [1, 2], popCap: 4, metabolism: 0.6, senseRange: 1800,
    prey: ['calamar', 'poulpe'], missChance: 0.35,   // ses grands bras s'emmêlent
    ink: true,
    colors: ['#a34a5e'],
    render: 'squid', giantSquid: true, sizeVar: 0.1, spanRatio: 1.45,
    lifespan: [1000, 1500],
    // Timide (GDD §12) : il se recroqueville dès qu'on l'approche de trop près.
    gag: (e, dt, t) => GAGS.calamar_geant(e, dt, t),
  },
};
