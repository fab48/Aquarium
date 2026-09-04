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
    gag: (e, dt, t) => GAGS.confetti(e, dt, t),
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
    gag: (e, dt, t) => GAGS.meduse(e, dt, t),
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
    gag: (e, dt, t) => GAGS.thon(e, dt, t),
  },

  requin: {
    name: 'Requin Dents-Molles', realName: 'Requin', trophic: 4, movement: 'free',
    nursery: 'shallow',
    // Gabarit d'ORQUE (70). C'est le seuil exact des colosses : il en prend
    // donc toutes les regles — tirant d'eau, garde au sol, barriere dure au
    // rivage, liste de separation dediee.
    depthBand: [500, 1700], size: 70, speed: 80, sprintSpeed: 360,
    // Pas de `metabolism` ralenti : l'Orque, exactement du même gabarit et
    // soumise aux mêmes règles de colosse, n'en a pas. Il n'était nécessaire
    // qu'à taille triplée (138), où le rayon de prise du requin vidait ses
    // proies jusqu'à leur plancher de report avant qu'il ne s'affame lui-même.
    schooling: false, groupSize: [1, 2], popCap: 6,
    prey: ['thon', 'perroquet'], missChance: 0.5,   // rate souvent (gag signature)
    colors: ['#8aa3b8'],
    bodyRatio: 0.42, tail: 'shark', fin: true,
    // Premier sprite de l'éditeur SVG (Assets/SharkSVG.json). Le visage commun
    // reste dessiné par-dessus : la DA change, pas les émotions.
    sprite: 'SharkSVG',
    lifespan: [750, 1050],   // les grands prédateurs vivent longtemps : sinon ils
                             // meurent de vieillesse avant d'avoir pu se reproduire
    gag: (e, dt, t) => GAGS.requin(e, dt, t),
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
    gag: (e, dt, t) => GAGS.coquillage(e, dt, t),
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
    gag: (e, dt, t) => GAGS.gros_dodo(e, dt, t),
  },

  // --- Extension du roster (GDD §14, 24 espèces) ---------------------------

  etoile: {
    name: 'Étoile de Mer Ventouse', realName: 'Étoile de mer', trophic: 1, movement: 'fixed',
    habitat: 'rock',   // se pose sur les rochers
    nursery: 'reef',
    depthBand: [0, 1000], size: 10, speed: 0,
    schooling: false, groupSize: [3, 6], popCap: 16,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ffb347', '#ff8fa3'],
    render: 'star',
    lifespan: [500, 800],
    // Câlin (GDD §12) : referme ses bras sur qui la TOUCHE vraiment — un seul
    gag: (e, dt, t) => GAGS.etoile_ventouse(e, dt, t),
  },

  anemone: {
    name: 'Anémone Câline', realName: 'Anémone de mer', trophic: 1, movement: 'fixed',
    nursery: 'reef',
    depthBand: [120, 1150], size: 18, speed: 0,
    schooling: false, groupSize: [1, 2],
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ff7eb6', '#c78aff', '#8affc1'],
    render: 'anemone', refuge: true,   // pas un poisson : refuge pour la ponte et les alevins
    lifespan: [1000, 1600],
    gag: (e, dt, t) => GAGS.anemone(e, dt, t),
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
    gag: (e, dt, t) => GAGS.volant(e, dt, t),
  },

  moustachu: {
    name: 'Fou Moustachu Volant', realName: 'Oiseau marin plongeur', trophic: 4, movement: 'free', aerial: true,
    nursery: 'shallow',
    depthBand: [0, 0],   // ignoré (aerial) — bande gérée en y monde dans Entity.move
    size: 22, speed: 110, sprintSpeed: 320,
    schooling: false, groupSize: [1, 2],
    prey: ['volant', 'bulle_fofolle'], missChance: 0.4, grazes: true,
    colors: ['#e8e8e8', '#3a4a5a'],
    render: 'bird',
    lifespan: [550, 800],
    gag: (e, dt, t) => GAGS.moustachu(e, dt, t),
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
    name: 'Hippocampe Zen', realName: 'Hippocampe', trophic: 2, movement: 'anchored', homeRadius: 22,   // il s'accroche vraiment a son herbe
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
    // Le ninja se MET EN SCÈNE : guet, poof, il ressort ailleurs (gags.js).
    gag: (e, dt, t) => GAGS.poulpe(e, dt, t),
  },

  murene: {
    name: 'Murène du Récif', realName: 'Murène', trophic: 4, movement: 'fixed',
    nursery: 'reef',
    // Haut de la zone trouble : c'est là que ses proies descendent réellement.
    // (Avec [800,1600] elle ne croisait AUCUNE de ses proies et mourait de faim.)
    depthBand: [350, 1700], size: 30, speed: 0,
    schooling: false, groupSize: [1, 1], popCap: 6, territory: 340,   // un rocher = une murene (GDD 12)
    // `missChance` abaissé depuis que la proie RÉAGIT au jaillissement (elle ne
    // se faisait pas cueillir sans broncher) : sans ça deux modes d'échec se
    // cumulaient et la murène mourait de faim. Le raté se raconte mieux ainsi —
    // c'est la victime qui l'esquive, pas la murène qui vise mal.
    prey: ['confetti', 'perroquet', 'meduse', 'hippocampe'], ambush: { range: 140, missChance: 0.22 },
    colors: ['#7a8a6a'],
    render: 'eel',
    lifespan: [700, 1000],
    gag: (e, dt, t) => GAGS.murene(e, dt, t),
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
    name: 'Baudroie-lanterne Allumeur', realName: 'Poisson-lanterne (baudroie abyssale)', trophic: 2, movement: 'strata',
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
    gag: (e, dt, t) => GAGS.lanterne(e, dt, t),
  },

  poisson_tapis: {
    // C'est un REQUIN-TAPIS (wobbegong) : une carpette à dents posée sur le sable,
    // pas un ver. L'ancien nom (« Ver-Tapis ») ne disait rien de ce qu'il fait.
    name: 'Poisson-Tapis Grande-Bouche', realName: 'Requin-tapis (wobbegong)', trophic: 4, movement: 'crawl',
    flatGround: true,   // se pose à plat : cherche une terrasse sableuse
    nursery: 'deep',
    // IL RAMPE (`crawl`). Immobile (`fixed`) au fond des abysses, il ne croisait
    // jamais un poisson-lanterne et mourait de faim sans avoir rien mangé : il
    // se traîne maintenant le long du sable jusqu'à sa proie, puis l'embusque.
    depthBand: [1900, 3400], size: 20, speed: 15,
    schooling: false, groupSize: [2, 3], popCap: 10,
    // `senseRange` porte bien plus loin que `ambush.range` : la première distance
    // sert à REPÉRER (et à ramper vers), la seconde à jaillir.
    prey: ['lanterne', 'crevette', 'crabe'], senseRange: 950,
    eatsPoop: true,                    // il avale les cacas SANS être malade
    ambush: { range: 175, missChance: 0.3 },   // idem murène : la proie esquive désormais toute seule
    colors: ['#a0785a'],
    render: 'worm', sizeVar: 0.16,
    lifespan: [700, 1000],
    // Plus de câlin : il embusque et ouvre une énorme bouche (gags.js).
    gag: (e, dt, t) => GAGS.poisson_tapis(e, dt, t),
  },

  poisson_lune: {
    name: 'Poisson-lune Bada-boum', realName: 'Môle / poisson-lune', trophic: 3, movement: 'free',
    nursery: 'shallow',
    // Descend à 1900 : sinon il ne croise jamais la Crevette Guirlande (1500+),
    // qui vient d'entrer à son menu.
    depthBand: [200, 1900], size: 50, speed: 18, sprintSpeed: 65,
    // Géant placide : métabolisme lent, il ne meurt pas de faim entre deux méduses
    schooling: false, groupSize: [1, 2], popCap: 8, metabolism: 0.5,
    prey: ['meduse', 'crevette'],   // principal régulateur des méduses (GDD §13)
    colors: ['#e0d8c8'],
    render: 'sunfish', sleeps: true,
    lifespan: [800, 1100],
    gag: (e, dt, t) => GAGS.poisson_lune(e, dt, t),
  },

  orque: {
    name: 'Orque Echo', realName: 'Orque', trophic: 4, movement: 'wideband',
    breathes: true,   // remonte souffler en surface
    nursery: 'shallow',
    // Bande étendue à 2400 : à 1500 elle ne pouvait matériellement pas atteindre
    // les calmars qu'elle est censée chasser (1200–3400). Une proie hors bande
    // est une proie inatteignable, et le prédateur meurt de faim en la suivant.
    depthBand: [450, 2400], size: 70, speed: 90, sprintSpeed: 340,
    schooling: false, groupSize: [2, 2], popCap: 5,   // apex : doit rester rare (GDD §14)
    // Le Thon reste sa cible favorite ; le Dauphin en secours évite que l'Orque
    // s'éteigne dès que les Thons baissent (GDD : « niveau 2-3 accepté »).
    // Comme le dauphin : une blagueuse ne fait pas la sieste en plein jour.
    // Elle dort la nuit avec tout le monde (`sleeps` = siestes a toute heure,
    // reserve au Gros Dodo et au Poisson-lune Zen, pour qui c'est le gag).
    prey: ['thon', 'dauphin', 'calamar', 'calamar_geant'], trickster: true,
    colors: ['#1c2733'],
    bodyRatio: 0.42, tail: 'whale',
    lifespan: [850, 1150],
    gag: (e, dt, t) => GAGS.orque(e, dt, t),
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
    prey: ['calamar', 'calamar_geant'],   // le Poulpe sort du menu : le Calamar Géant s'en charge
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
    gag: (e, dt, t) => GAGS.crevette(e, dt, t),
  },

  calamar: {
    name: 'Calmar Violette', realName: 'Calmar (encornet)', trophic: 3, movement: 'wideband',
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
    gag: (e, dt, t) => GAGS.calamar(e, dt, t),
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

  // --- Le Fugu : personne ne le mange, et c'est bien le problème des autres.
  // Il gonfle quand on approche (`gonflable`) puis pique au contact
  // (`piquant`), ce qui inflige un malaise — jamais mortel (GDD §9).
  fugu: {
    name: 'Fugu Gonflé', realName: 'Poisson-globe', trophic: 2, movement: 'strata',
    nursery: 'reef',
    depthBand: [150, 900], size: 15, speed: 38,
    schooling: false, groupSize: [2, 3], popCap: 10,
    favoriteFood: 'plancton_dore', eatsFood: true,
    piquant: { range: 70 }, gonflable: true,
    colors: ['#e8c85a', '#f6e6a8'],
    bodyRatio: 0.92, tail: 'fan', sizeVar: 0.18,
    lifespan: [320, 500],
    gag: (e, dt, t) => GAGS.fugu(e, dt, t),
  },

  // --- Le Pélican : il cueille les poissons volants EN PLEIN VOL, et n'entre
  // jamais dans l'eau. C'est le contraire exact du Fou Moustachu, qui plonge
  // dedans — et ça donne enfin une raison d'être aux sauts des exocets.
  pelican: {
    name: 'Pélican Attrape-Tout', realName: 'Pélican', trophic: 4, movement: 'free', aerial: true,
    nursery: 'beach',
    depthBand: [0, 0],   // ignoré (aerial)
    size: 27, speed: 95, sprintSpeed: 300,
    schooling: false, groupSize: [1, 2], popCap: 4, senseRange: 1400,
    // `snatch` : ne vise QUE les proies en phase aérienne. Sa fenêtre de tir
    // est donc bien plus étroite que celle du Fou, ce qui l'empêche de vider
    // les bancs de surface qu'ils se partagent. `missChance` volontairement
    // modéré pour la raison inverse : fenêtre rare ET raté fréquent, c'est le
    // prédateur qui meurt de faim (la leçon de la murène).
    prey: ['volant', 'bulle_fofolle'], snatch: true, missChance: 0.3, grazes: true,
    colors: ['#f2ede2', '#8d99a8'],
    render: 'bird', pouch: true, sizeVar: 0.1,
    lifespan: [600, 850],
    gag: (e, dt, t) => GAGS.pelican(e, dt, t),
  },

  // --- L'Anguille : la première créature qui TUE SANS MANGER. Elle électrocute
  // tout son voisinage ; les touchés sont sonnés, les alevins n'y survivent pas.
  anguille: {
    name: 'Anguille Coup-de-Jus', realName: 'Anguille électrique', trophic: 3, movement: 'strata',
    nursery: 'deep',
    depthBand: [900, 2200], size: 26, speed: 34,
    schooling: false, groupSize: [1, 2], popCap: 6, metabolism: 0.7,
    grazes: true,                      // elle ne chasse pas : elle assomme et broute
    shock: { range: 150, cooldown: 9 },
    piquant: { range: 60 },            // même à l'arrêt, on ne la touche pas impunément
    colors: ['#6f7fa8', '#b9d4f0'],
    render: 'eel', sizeVar: 0.15, glowAtNight: true,
    lifespan: [600, 900],
    gag: (e, dt, t) => GAGS.anguille(e, dt, t),
  },

  // ========================================================================
  // LE RÉCIF ET L'EAU CLAIRE
  // ========================================================================

  // Il ouvre une STATION DE NETTOYAGE et soigne la bouche des prédateurs, qui
  // font la queue devant lui. C'est lui qui fait repousser les dents du Requin
  // Dents-Molles — sans lui, le requin reste édenté beaucoup plus longtemps.
  // Personne ne le mange : le contrat est respecté même par les affamés.
  dentiste: {
    name: 'Poisson Dentiste', realName: 'Labre nettoyeur', trophic: 2, movement: 'anchored',
    nursery: 'reef', homeRadius: 70,
    depthBand: [150, 1100], size: 10, speed: 45,
    schooling: false, groupSize: [1, 2], popCap: 8,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    intouchable: true,                 // aucun prédateur ne l'attaque
    colors: ['#4fd0e0', '#123a52'],
    bodyRatio: 0.42, tail: 'fan', sizeVar: 0.1,
    lifespan: [420, 650],
    gag: (e, dt, t) => GAGS.dentiste(e, dt, t),
  },

  // Il gronde ceux qui pètent, qui font des farces ou qui laissent un caca.
  police: {
    name: 'Poisson Police', realName: 'Poisson-sergent', trophic: 3, movement: 'strata',
    nursery: 'reef',
    depthBand: [120, 1100], size: 17, speed: 72, sprintSpeed: 160,
    schooling: false, groupSize: [1, 2], popCap: 6,
    favoriteFood: 'generic', eatsFood: true, grazes: true,
    colors: ['#2f4f7a', '#e8eef5'],
    bodyRatio: 0.55, tail: 'lunate', sizeVar: 0.1,
    lifespan: [420, 620],
    gag: (e, dt, t) => GAGS.police(e, dt, t),
  },

  // Embusqué du récif : il n'attrape pas, il ASPIRE. Et il mange le
  // Poisson-clown Chatouille, qui n'avait aucun prédateur.
  merou: {
    name: 'Mérou Patatras', realName: 'Mérou', trophic: 4, movement: 'strata',
    nursery: 'reef',
    depthBand: [250, 1200], size: 38, speed: 34, sprintSpeed: 150,
    schooling: false, groupSize: [1, 2], popCap: 6, metabolism: 0.7,
    prey: ['clown', 'confetti', 'fugu'], missChance: 0.35, senseRange: 700,
    ambush: { range: 190, missChance: 0.3 },
    colors: ['#7d5a3c', '#c9a06a'],
    bodyRatio: 0.72, tail: 'fan', sizeVar: 0.16,
    lifespan: [700, 1000],
    gag: (e, dt, t) => GAGS.merou(e, dt, t),
  },

  // Ils vont TOUJOURS par deux, côte à côte. Séparez-les et ils se cherchent.
  papillon: {
    name: 'Poisson Papillon Amoureux', realName: 'Poisson-papillon', trophic: 2, movement: 'strata',
    nursery: 'reef',
    depthBand: [150, 900], size: 12, speed: 58,
    schooling: false, groupSize: [2, 4], popCap: 14,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ffd75e', '#2b2f4a'],
    bodyRatio: 0.86, tail: 'fan', sizeVar: 0.12,
    lifespan: [300, 460],
    gag: (e, dt, t) => GAGS.papillon(e, dt, t),
  },

  // Un banc doré, contrepoint calme au Confetti bariolé.
  dorade: {
    name: 'Dorade Dorée', realName: 'Dorade royale', trophic: 2, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [120, 800], size: 16, speed: 78,
    schooling: true, groupSize: [7, 11], popCap: 26,
    favoriteFood: 'generic', eatsFood: true,
    colors: ['#f2d98a', '#b9a15a'],
    bodyRatio: 0.6, tail: 'lunate', sizeVar: 0.14,
    lifespan: [280, 430],
  },

  // Cubique. Il nage mal. C'est tout le gag.
  coffre: {
    name: 'Poisson Coffre-au-Trésor', realName: 'Poisson-coffre', trophic: 2, movement: 'strata',
    nursery: 'reef',
    depthBand: [180, 1000], size: 13, speed: 26,
    schooling: false, groupSize: [1, 3], popCap: 9,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#f0c04a', '#6b4a1e'],
    bodyRatio: 1, tail: 'fan', sizeVar: 0.1,
    lifespan: [360, 540],
    gag: (e, dt, t) => GAGS.coffre(e, dt, t),
  },

  // LE SEUL BROUTEUR MOBILE : les autres T1 sont tous fixes. Et l'animal le
  // plus coloré de la mer.
  nudibranche: {
    name: 'Nudibranche Fluo', realName: 'Limace de mer', trophic: 1, movement: 'crawl',
    nursery: 'reef',
    depthBand: [100, 1300], size: 8, speed: 14,
    schooling: false, groupSize: [2, 4], popCap: 16,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ff5ec4', '#7de8ff'],
    render: 'worm', sizeVar: 0.2,
    lifespan: [380, 560],
    gag: (e, dt, t) => GAGS.nudibranche(e, dt, t),
  },

  // Second refuge de ponte, à côté de l'anémone.
  corail: {
    name: 'Corail Viva', realName: 'Corail branchu', trophic: 1, movement: 'fixed',
    nursery: 'reef',
    depthBand: [140, 900], size: 20, speed: 0,
    schooling: false, groupSize: [1, 2], popCap: 10,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ff8fb1', '#ffd0dd'],
    render: 'anemone', refuge: true,
    lifespan: [1200, 1900],
  },

  // ========================================================================
  // LA SURFACE
  // ========================================================================

  // LE TROU LE PLUS BÉANT DE LA CHAÎNE : seuls le Poisson-lune et la Murène
  // mangeaient des méduses. Elle traverse toute la colonne d'eau, remonte
  // respirer, et elle est lente — parfaite à regarder.
  tortue: {
    name: 'Tortue Papi', realName: 'Tortue caouanne', trophic: 3, movement: 'free',
    nursery: 'beach',                  // elle pond sur la plage, comme les vraies
    depthBand: [40, 1400], size: 34, speed: 32, sprintSpeed: 78,
    schooling: false, groupSize: [1, 2], popCap: 7, metabolism: 0.6,
    prey: ['meduse'], missChance: 0.25, senseRange: 1100,
    breathes: true, grazes: true,
    colors: ['#6d8f5a', '#3f5a34'],
    render: 'turtle', sizeVar: 0.14,
    lifespan: [1100, 1700],
    gag: (e, dt, t) => GAGS.tortue(e, dt, t),
  },

  // Le sprinteur : rien n'allait vite en surface.
  espadon: {
    name: 'Espadon Voilier', realName: 'Voilier / espadon', trophic: 4, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [60, 700], size: 46, speed: 120, sprintSpeed: 460,
    offshore: 900,
    schooling: false, groupSize: [1, 2], popCap: 6,
    prey: ['dorade', 'bulle_fofolle', 'maquereau'], missChance: 0.4, senseRange: 1500,
    colors: ['#3f6fa8', '#cfe4f5'],
    bodyRatio: 0.3, tail: 'lunate', sizeVar: 0.12,
    lifespan: [600, 900],
    gag: (e, dt, t) => GAGS.espadon(e, dt, t),
  },

  // La surface n'avait que deux espèces contre neuf en eau claire.
  maquereau: {
    name: 'Maquereau Métronome', realName: 'Maquereau', trophic: 2, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [30, 500], size: 14, speed: 96,
    offshore: 800,
    schooling: true, groupSize: [9, 13], popCap: 30,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#5c8fb8', '#e7f0f7'],
    bodyRatio: 0.45, tail: 'lunate', sizeVar: 0.1,
    lifespan: [220, 340],
  },

  // Base de chaîne en EAU CLAIRE : la Crevette Guirlande est abyssale.
  crevette_claire: {
    name: 'Crevette Sauteuse', realName: 'Crevette de récif', trophic: 2, movement: 'wideband',
    nursery: 'reef',
    depthBand: [120, 900], size: 6, speed: 40,
    schooling: true, groupSize: [7, 10], popCap: 32,
    favoriteFood: 'micro_crevettes', eatsFood: true,
    colors: ['#ffb3a0', '#ffe3d8'],
    render: 'shrimp', sizeVar: 0.2,
    lifespan: [260, 400],
  },

  // ========================================================================
  // LE CIEL
  // ========================================================================

  // IL NE PÊCHE PAS : IL VOLE LA PRISE DES AUTRES. Un gag qui se raconte tout
  // seul, et il ne consomme aucune proie de son côté — c'est ce qui permet
  // d'ajouter un troisième oiseau sans vider les bancs de surface.
  goeland: {
    name: 'Goéland Chapardeur', realName: 'Goéland argenté', trophic: 3, movement: 'free', aerial: true,
    nursery: 'beach',
    depthBand: [0, 0],
    size: 20, speed: 130, sprintSpeed: 340,
    schooling: false, groupSize: [1, 3], popCap: 6,
    grazes: true,                      // il se débrouille, et il chaparde
    colors: ['#f6f6f2', '#9aa8b5'],
    render: 'bird', sizeVar: 0.1,
    lifespan: [520, 780],
    gag: (e, dt, t) => GAGS.goeland(e, dt, t),
  },

  // Il plonge et NAGE SOUS L'EAU, contrairement au Fou qui ne fait que piquer.
  cormoran: {
    name: 'Cormoran Sous-Marin', realName: 'Cormoran', trophic: 4, movement: 'free', aerial: true,
    nursery: 'beach',
    depthBand: [0, 0],
    size: 21, speed: 100, sprintSpeed: 260,
    schooling: false, groupSize: [1, 2], popCap: 5,
    prey: ['maquereau', 'crevette_claire'], missChance: 0.35, grazes: true,
    plongeur: true,                    // il descend BIEN plus bas que les autres oiseaux
    colors: ['#2e3b45', '#66798a'],
    render: 'bird', sizeVar: 0.1,
    lifespan: [520, 780],
    gag: (e, dt, t) => GAGS.cormoran(e, dt, t),
  },

  // ========================================================================
  // LE FOND
  // ========================================================================

  // Une colonie de tubes qui ondulent et RENTRENT DANS LE SABLE D'UN COUP
  // quand un prédateur passe. Aucun effet de groupe équivalent ailleurs.
  jardiniere: {
    name: 'Anguille Jardinière', realName: 'Anguille-jardinière', trophic: 2, movement: 'fixed',
    nursery: 'reef',
    depthBand: [400, 1600], size: 11, speed: 0,
    schooling: false, groupSize: [5, 8], popCap: 22,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#cbbfa2', '#7d735c'],
    render: 'eel', sizeVar: 0.12,
    lifespan: [500, 750],
    gag: (e, dt, t) => GAGS.jardiniere(e, dt, t),
  },

  // Il change de coquille — et il peut disputer la sienne au Coquillage Rieur.
  bernard: {
    name: 'Bernard-l’Ermite Déménageur', realName: 'Pagure', trophic: 'scavenger', movement: 'crawl',
    nursery: 'reef',
    depthBand: [0, 1400], size: 11, speed: 24,
    schooling: false, groupSize: [2, 4], popCap: 14,
    favoriteFood: 'generic', eatsFood: true, eatsBones: true,
    colors: ['#d98a5a', '#f0d8b8'],
    render: 'crab', sizeVar: 0.15,
    lifespan: [400, 620],
    gag: (e, dt, t) => GAGS.bernard(e, dt, t),
  },

  // Il mange les cacas en râlant : il rend visible le mécanisme de trop-plein,
  // et il nettoie vraiment le fond.
  concombre: {
    name: 'Concombre Aspirateur', realName: 'Holothurie', trophic: 1, movement: 'crawl',
    nursery: 'deep',
    depthBand: [300, 2600], size: 14, speed: 10,
    schooling: false, groupSize: [2, 3], popCap: 12,
    favoriteFood: 'generic', eatsFood: true, eatsPoop: true,
    colors: ['#8a6a86', '#c9a8c4'],
    render: 'worm', sizeVar: 0.16,
    lifespan: [600, 900],
    gag: (e, dt, t) => GAGS.concombre(e, dt, t),
  },

  // Embusquée, immobile, venimeuse. On ne s'y frotte pas deux fois.
  rascasse: {
    name: 'Rascasse Épineuse', realName: 'Poisson-scorpion', trophic: 4, movement: 'fixed',
    nursery: 'reef',
    depthBand: [250, 1500], size: 18, speed: 0,
    schooling: false, groupSize: [1, 2], popCap: 7, metabolism: 0.4,
    prey: ['confetti', 'crevette_claire', 'papillon'],
    ambush: { range: 130, missChance: 0.25 }, senseRange: 420,
    piquant: { range: 60 },
    colors: ['#b04a4a', '#f0c8a0'],
    bodyRatio: 0.8, tail: 'fan', sizeVar: 0.14,
    lifespan: [650, 950],
    gag: (e, dt, t) => GAGS.rascasse(e, dt, t),
  },

  // Fixe, intouchable, il pique qui le bouscule.
  oursin: {
    name: 'Oursin Pic-Pic', realName: 'Oursin', trophic: 1, movement: 'fixed',
    nursery: 'reef',
    depthBand: [80, 1400], size: 10, speed: 0,
    schooling: false, groupSize: [3, 5], popCap: 14,
    favoriteFood: 'plancton_dore', eatsFood: true,
    piquant: { range: 55 },
    colors: ['#3a2b52', '#6d5a8a'],
    render: 'urchin', sizeVar: 0.18,
    lifespan: [800, 1300],
  },

  // ========================================================================
  // LE LARGE
  // ========================================================================

  // IL FONCE À TRAVERS LES FUGUS ET LES FAIT EXPLOSER : le seul à pouvoir les
  // manger sans se piquer.
  barracuda: {
    name: 'Barracuda Perce-Ballon', realName: 'Barracuda', trophic: 4, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [150, 1200], size: 40, speed: 110, sprintSpeed: 420,
    schooling: false, groupSize: [1, 3], popCap: 7,
    prey: ['fugu', 'dorade', 'maquereau'], missChance: 0.3, senseRange: 1400,
    perceBallon: true,                 // il crève les piquants sans en souffrir
    colors: ['#8d9aa8', '#e2ecf4'],
    bodyRatio: 0.28, tail: 'lunate', sizeVar: 0.12,
    lifespan: [600, 900],
    gag: (e, dt, t) => GAGS.barracuda(e, dt, t),
  },

  // La Baleine et la Raie filtraient du plancton ABSTRAIT. Un krill visible
  // donne un sens à leur passage.
  krill: {
    name: 'Krill Étincelle', realName: 'Krill', trophic: 1, movement: 'wideband',
    nursery: 'shallow',
    depthBand: [200, 2000], size: 4, speed: 30,
    schooling: true, groupSize: [12, 18], popCap: 46,
    favoriteFood: 'plancton_dore', eatsFood: true,
    colors: ['#ffd9a8', '#ffeed8'],
    render: 'shrimp', sizeVar: 0.2, glowAtNight: true,
    lifespan: [200, 320],
  },
};

// ===========================================================================
// FICHES : phrase et faux nom latin.
//
// La phrase n'apparaît QUE dans la fiche d'identité (la loupe), jamais en
// bulle : le budget de bulles est déjà tenu à ~250/min pour tout l'aquarium, et
// l'aquarium raconte ses histoires par le visage, pas par le texte.
//
// Le faux nom latin est la blague qui rend la fiche amusante à ouvrir, et il
// glisse la vraie information au passage : « Scarus petomanus » apprend
// « Scarus » sans en avoir l'air.
//
// Bloc séparé pour que les fiches d'espèces au-dessus restent des données de
// simulation lisibles. Voir FICHES.md.
// ===========================================================================
const FICHES = {
  confetti:      { latin: 'Confettius multicolorus', phrase: 'On est nombreux, mais on est PAS pareils !' },
  bulle_fofolle: { latin: 'Sardina bullabulla',      phrase: 'Glou glou glou ! Oh, encore une bulle !' },
  meduse:        { latin: 'Gelatinus sanstetus',     phrase: 'Pas de tête, pas de souci.' },
  thon:          { latin: 'Thunnus vroumvroum',      phrase: 'Poussez-vous, je suis pressé !' },
  requin:        { latin: 'Carcharodon dentimollis', phrase: 'Grrr… aïe, mes dents.' },
  crabe:         { latin: 'Cancer discotecus',       phrase: 'Ça pince ET ça danse !' },
  coquillage:    { latin: 'Bivalvus hilarius',       phrase: 'Hi hi hi ! …hi.' },
  gros_dodo:     { latin: 'Balaena roupillonus',     phrase: 'Encore cinq minutes…' },
  etoile:        { latin: 'Asterias ventousa',       phrase: 'Viens là, toi ! Plok !' },
  anemone:       { latin: 'Anemonia calinus',        phrase: 'Entrez, entrez, c’est chauffé !' },
  volant:        { latin: 'Exocetus cascadeurus',    phrase: 'Regardez-moi ça ! Et… HOP !' },
  moustachu:     { latin: 'Sula moustachus',         phrase: 'Repéré ! …plouf.' },
  clown:         { latin: 'Amphiprion guiliguili',   phrase: 'Guili-guili !' },
  hippocampe:    { latin: 'Hippocampus rougissimus', phrase: 'Ne me regardez pas…' },
  perroquet:     { latin: 'Scarus petomanus',        phrase: 'C’est pas moi !' },
  dauphin:       { latin: 'Delphinus blagueurus',    phrase: 'BOUH ! …hihihi !' },
  poulpe:        { latin: 'Octopus ninjaticus',      phrase: 'Vous ne m’avez jamais vu.' },
  murene:        { latin: 'Muraena monrocherus',     phrase: 'C’est MON rocher.' },
  raie:          { latin: 'Manta ronronus',          phrase: 'Rrrrron…' },
  lanterne:      { latin: 'Melanocetus allumus',     phrase: 'Par ici la lumière, mes petits…' },
  poisson_tapis: { latin: 'Orectolobus grandebouche',phrase: '…………… (il attend)' },
  poisson_lune:  { latin: 'Mola badaboum',           phrase: 'Tout est calme… tout est… BADA-BOUM.' },
  orque:         { latin: 'Orcinus echoechoecho',    phrase: 'Attends, attends, j’en ai une bonne.' },
  cachalot:      { latin: 'Physeter profundissimus', phrase: 'Je descends chercher le goûter.' },
  crevette:      { latin: 'Caridina guirlandus',     phrase: 'On clignote tous ensemble ? À trois !' },
  calamar:       { latin: 'Loligo violetta',         phrase: 'Trois, deux, un… PSCHIT !' },
  calamar_geant: { latin: 'Architeuthis timidissimus',phrase: '…vous m’avez vu ? Zut.' },
  pelican:       { latin: 'Pelecanus attrapatoutus', phrase: 'J’ai de la place pour tout le monde !' },
  anguille:      { latin: 'Electrophorus zzzap',     phrase: 'Touche pas, ça pique fort !' },
  fugu:          { latin: 'Tetraodon ballonus',      phrase: 'N’approche pas… je gonfle !' },
};
for (const id in FICHES) if (SPECIES[id]) Object.assign(SPECIES[id], FICHES[id]);
