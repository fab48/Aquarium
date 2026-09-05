// Le monde : grille "profondeur max par colonne" (GDD §4 + reco §14) et
// helpers de zone. La surface de l'eau est à CONFIG.SURFACE_Y ; au-dessus, l'air.

const World = {
  columns: [],

  init() {
    // Profil du fond défini par POINTS DE CONTRÔLE : la plage émergée reste
    // douce, mais dès le rivage franchi le fond plonge franchement. Un profil
    // trop plat sous l'eau écrase toutes les espèces contre le sable — les
    // poissons de strate moyenne n'avaient pas de hauteur d'eau où nager.
    const CTRL = CONFIG.PROFILE;
    const n = Math.ceil(CONFIG.WORLD_WIDTH / CONFIG.DEPTH_COLUMN_WIDTH) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * CONFIG.DEPTH_COLUMN_WIDTH;
      let k = 0;
      while (k < CTRL.length - 2 && x > CTRL[k + 1][0]) k++;
      const [x0, d0] = CTRL[k], [x1, d1] = CTRL[k + 1];
      const u = U.clamp((x - x0) / (x1 - x0), 0, 1);
      const eased = u * u * (3 - 2 * u);          // raccord doux entre segments
      let depth = U.lerp(d0, d1, eased);
      // relief léger, estompé près du rivage pour garder la plage lisse
      depth += Math.sin(i * 1.7) * 45 * U.clamp(depth / 400, 0, 1);
      this.columns.push(depth);
    }
    // Replats sableux : le Poisson-Tapis (et la Raie) sont des créatures À PLAT ;
    // sur une pente continue ils paraissent penchés dans le vide. On aplanit
    // donc quelques terrasses en lissant des groupes de colonnes voisines.
    for (let i = 3; i < this.columns.length - 3; i += 9) {
      if (this.columns[i] < 200) continue;      // pas de terrasse sur la plage
      const n = 2;                               // ~360 px : un palier, pas un plateau
      let m = 0;
      for (let k = 0; k < n; k++) m += this.columns[i + k];
      m /= n;
      for (let k = 0; k < n; k++) this.columns[i + k] = m;
    }
    // Rivage = x où le sable croise la ligne d'eau. Déduit du profil (et non
    // figé dans une constante) pour rester juste si le profil change.
    this.shoreX = 0;
    for (let x = 0; x < CONFIG.WORLD_WIDTH; x += 20) {
      if (this.depthAt(x) >= 0) { this.shoreX = x; break; }
    }
    // LES QUATRE ZONES DE GAUCHE À DROITE. Le monde ne se lisait que
    // verticalement (les bandes de profondeur) ; horizontalement, tout le monde
    // pouvait aller partout, et le rivage devenait un goulot où l'on
    // s'entassait. Les zones sont DÉDUITES du relief, jamais figées : si le
    // profil change, elles suivent.
    //
    //   plage      : le sable émergé, avant le rivage
    //   rivage     : le haut-fond, jusqu'à 350 px d'eau
    //   mer        : la pleine eau, jusqu'à 1400 px
    //   haute mer  : le grand large et les abysses
    this.zonesX = { plage: 0, rivage: this.shoreX, mer: 0, hauteMer: 0 };
    for (let x = this.shoreX; x < CONFIG.WORLD_WIDTH; x += 20) {
      const d = this.depthAt(x);
      if (!this.zonesX.mer && d >= 350) this.zonesX.mer = x;
      if (d >= 1400) { this.zonesX.hauteMer = x; break; }
    }
    if (!this.zonesX.mer) this.zonesX.mer = this.shoreX + 600;
    if (!this.zonesX.hauteMer) this.zonesX.hauteMer = CONFIG.WORLD_WIDTH * 0.6;
  },

  // Profondeur max (px sous la surface) à une position x monde, interpolée
  depthAt(x) {
    const fi = U.clamp(x / CONFIG.DEPTH_COLUMN_WIDTH, 0, this.columns.length - 1.001);
    const i = Math.floor(fi);
    return U.lerp(this.columns[i], this.columns[Math.min(i + 1, this.columns.length - 1)], fi - i);
  },

  // y monde du fond sableux à x
  floorY(x) { return CONFIG.SURFACE_Y + this.depthAt(x); },

  // Densité de plancton ambiant (niveau 1 de la chaîne, GDD §6) : la nourriture
  // de base que broutent en continu filtreurs et herbivores, sans le joueur.
  // Riche là où la lumière passe, pauvre dans les abysses (mais jamais nulle :
  // neige marine + plancton phosphorescent y font vivre les espèces abyssales).
  planktonAt(y) {
    const d = y - CONFIG.SURFACE_Y;
    if (d < 0) return 0;
    if (d < 700) return 1;                              // surface + eau claire
    if (d < 1700) return U.lerp(1, 0.72, (d - 700) / 1000);  // zone trouble
    return 0.72;
  },

  // Zone écologique pour un y monde donné
  zoneAt(y) {
    const d = y - CONFIG.SURFACE_Y;
    if (d < 0) return { id: 'air', label: 'Air' };
    for (const z of CONFIG.ZONES) if (d >= z.from && d < z.to) return z;
    return CONFIG.ZONES[CONFIG.ZONES.length - 1];
  },

  isUnderwater(x, y) { return y > CONFIG.SURFACE_Y && y < this.floorY(x); },

  // Pente locale du fond (dy/dx) — sert à poser rochers et végétation à plat
  slopeAt(x) { return (this.floorY(x + 40) - this.floorY(x - 40)) / 80; },

  beachShoreX() { return this.shoreX; },

  // Dans quelle zone horizontale se trouve ce x ?
  zoneX(x) {
    const z = this.zonesX;
    if (x < z.rivage) return 'plage';
    if (x < z.mer) return 'rivage';
    if (x < z.hauteMer) return 'mer';
    return 'haute mer';
  },
};
