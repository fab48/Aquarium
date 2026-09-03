// Configuration globale du monde — toutes les unités monde en pixels.
// 1 mètre de profondeur ≈ 40 px (le doc parle de 0-40m+ → ~0-2400px+).
const CONFIG = {
  PX_PER_METER: 40,

  // Dimensions du monde
  WORLD_WIDTH: 8000,
  SURFACE_Y: 300,            // y monde de la ligne de flottaison (au-dessus = air/ciel)

  // "Triangle de profondeur" : profondeur max par colonne (grille, cf. GDD §4 & §14)
  DEPTH_COLUMN_WIDTH: 180,   // largeur d'une colonne de la grille (finesse du relief)
  BEACH_TOP: -170,           // hauteur du sable émergé au bord gauche (profondeur négative)
  DEPTH_MAX: 3400,           // profondeur au large (grands fonds 40m+)

  // Profil du fond : [x, profondeur]. Négatif = sable émergé.
  // Plage douce jusqu'au rivage (~x=1000), puis descente franche pour que chaque
  // strate ait une vraie hauteur d'eau, et qui s'adoucit vers les abysses.
  PROFILE: [
    [0, -170], [900, -40], [1350, 230], [2100, 800],
    [3100, 1500], [4600, 2200], [6200, 2900], [8000, 3400],
  ],

  // Zones écologiques, en px SOUS la surface (cf. GDD §2)
  ZONES: [
    { id: 'surface', label: 'Surface',      from: 0,    to: 120  },  // 0-3m
    { id: 'claire',  label: 'Eau claire',   from: 120,  to: 700  },  // 3-17m
    { id: 'trouble', label: 'Zone trouble', from: 700,  to: 1700 },  // 17-42m
    { id: 'abysse',  label: 'Grands fonds', from: 1700, to: 99999 },
  ],

  // Cycle jour/nuit (secondes réelles pour un cycle complet)
  DAY_LENGTH: 240,

  // Caps de population par zone (capacité de charge, cf. GDD §14)
  POP_CAP_PER_ZONE: 40,

  // Caméra
  CAMERA_SPEED: 900,         // px/s au scroll
  CAMERA_SMOOTH: 6,

  DEBUG: false,
};

// Types de nourriture (GDD §13 — générique + spécialisées)
const FOOD_TYPES = {
  generic:         { label: 'Graines',        color: '#d4b96a', sink: 30,  size: 3 },
  plancton_dore:   { label: 'Plancton doré',  color: '#ffd75e', sink: 8,   size: 2.5 },
  micro_crevettes: { label: 'Micro-crevettes',color: '#ff9d8a', sink: 15,  size: 3 },
  vers_de_sable:   { label: 'Vers de sable',  color: '#c98a5b', sink: 60,  size: 3.5 },
};
