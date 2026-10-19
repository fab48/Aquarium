// Entité créature : boids contraints par type de liberté (GDD §5), faim,
// expressions, cycle de vie (GDD §7).

let ENTITY_ID = 0;

// Silhouettes qui reposent sur le sable : elles suivent la pente du fond
// (la murène n'y est pas : seul SON ROCHER suit la pente, cf. drawEel)
const GROUND_RENDERS = new Set(['worm', 'crab', 'shell', 'star', 'anemone', 'urchin', 'gardeneel']);

// ÉTAT → ÉVÉNEMENT D'ANIMATION (cf. Entity.jouerAnime) : entrer dans un état
// propose au dessin son animation dessinée du même nom. La table est le
// CATALOGUE — dessiner une animation `peur` dans l'atelier suffit, rien à
// câbler ici. Les événements ponctuels (mange, crash, saut, pond, charge)
// sont déclenchés à leur source, pas par l'état.
const ANIM_ETATS = {
  flee: 'peur', sleep: 'dort', hunt: 'chasse',
  court: 'parade', migrate: 'voyage', strike: 'attaque',
};

// Le modele du sable (background.js) dessine des bandes qui suivent le contour
// du fond : une bande etroite au contact de l'eau (0-26 px), puis une plus
// large (26-90 px). Ces DEUX premieres bandes forment la partie du sable qu'on
// lit comme "proche", et les creatures de fond s'y repartissent au lieu d'etre
// toutes alignees sur une seule ligne.
const SABLE_BANDE = 82;

// Profondeur d'un individu dans le sable (stable, repartie par identifiant :
// un tirage au sort les agglutinerait, cf. les frayeres).
function sableOffset(e) {
  if (e._sable != null) return e._sable;
  return (e._sable = ((e.id * 0.618) % 1) * SABLE_BANDE);
}

// Trop-plein : au-dela de ce multiple de sa taille normale, l'animal explose.
const TAILLE_EXPLOSION = 5;

class Entity {
  constructor(speciesId, x, y, opts = {}) {
    this.id = ENTITY_ID++;
    this.speciesId = speciesId;
    this.def = SPECIES[speciesId];
    this.x = x; this.y = y;
    this.vx = U.rand(-20, 20); this.vy = U.rand(-10, 10);
    this.angle = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.groupId = opts.groupId ?? null;
    this.anchorX = opts.anchorX ?? x; this.anchorY = opts.anchorY ?? y;
    // `habitat: 'weed'` : l'hippocampe s'accroche AU BOUT des herbes. Fait ici
    // et pas seulement au spawn, sinon les petits nés par ponte s'ancraient
    // n'importe où dans la colonne d'eau.
    if (this.def.habitat === 'weed' && opts.anchorY == null && typeof Background !== 'undefined') {
      const h = Background.hauteurHerbier(x);
      this.anchorY = World.floorY(x) - h * U.rand(0.72, 1) - this.def.size * 0.4;
      this.y = this.anchorY;
    }

    // Cycle de vie
    this.stage = opts.stage ?? 'adult';   // 'egg' | 'fry' | 'adult'
    this.age = 0;
    this.maxAge = U.rand(this.def.lifespan[0], this.def.lifespan[1]);
    this.growth = this.stage === 'adult' ? 1 : 0.25;
    // Gabarit personnel : deux adultes de la même espèce n'ont pas la même
    // taille. L'amplitude est propre à l'espèce (`sizeVar`) — forte chez les
    // bariolés, faible chez les colosses, dont on remarquerait la moindre
    // irrégularité. Tiré une fois pour toutes : la taille ne doit pas frémir.
    this.gabarit = 1 + U.rand(-1, 1) * (this.def.sizeVar ?? 0.13);
    // Un adulte créé directement (peuplement du monde, immigration) n'a pas
    // d'histoire : on lui en donne une. Sans ça tout l'aquarium démarre avec des
    // animaux du même âge — donc de la même taille (cf. `vieillesse` dans le
    // getter `size`) — et toute une classe d'âge meurt de vieillesse d'un coup.
    // Les nouveau-nés, eux, arrivent par le stade `egg` et gardent age = 0.
    if (this.stage === 'adult') this.age = U.rand(0, this.maxAge * 0.6);

    // Faim / états
    this.hunger = U.rand(0.2, 0.5);       // 0 = repu, 1 = affamé
    this.wellFed = 0;                     // jauge de ponte
    this.expression = 'idle';
    this.exprTimer = 0;
    this.emoteDur = 1;
    this.state = 'wander';                // wander | seekFood | hunt | flee | sleep | dizzy | strike | jump
    this.stateTimer = 0;
    this.target = null;
    this.speedNow = 0;
    this.dead = false;

    // Champs génériques réutilisés par certains flags de def (data-driven, cf. species.js)
    this.stealth = 0;          // def.stealthy : monte à l'arrêt, retombe en mouvement
    this.strikeT = 0.3;        // def.ambush : anim de jaillissement 0.3 -> 1 -> 0.3
    this.wet = 0;              // def.aerial : "mouillé" après un plongeon raté
    this.jumpState = 'water';  // def.jumps : 'water' | 'air'
    this._refugeAnchored = false; // œuf/alevin ancré à une anémone (Ecosystem.layEgg)
    // Accumulateur d'accélération des méthodes de steering (steerVers/tetherVers) :
    // les fermetures locales qu'elles remplacent étaient recréées à chaque move()
    // (~1000 par frame). Déclaré ici pour figer la forme de l'objet.
    this._axAcc = 0; this._ayAcc = 0;
    // Saisie par le joueur (cf. saisie.js) : `_saisi` = tenue à la main,
    // `_lache` = retombée en cours après le relâché.
    this._saisi = false; this._lache = null;
  }

  // Steering "vitesse désirée" : vise droit sur la cible au lieu d'accélérer
  // vers elle (ce qui faisait orbiter en cercles). Écrit dans _axAcc/_ayAcc,
  // que move() reverse dans son accélération locale.
  steerVers(tx, ty, sp, k = 3) {
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) || 1;
    this._axAcc += (dx / d * sp - this.vx) * k;
    this._ayAcc += (dy / d * sp - this.vy) * k;
  }

  // Ancrage à RAYON DE CONFORT : le rappel ne s'exerce qu'au-delà du rayon,
  // sinon tout le monde converge sur le même point et s'empile autour de
  // l'anémone. À l'intérieur, chacun vaque librement.
  tetherVers(r, k) {
    const dx = this.anchorX - this.x, dy = this.anchorY - this.y;
    const d = Math.hypot(dx, dy);
    if (d <= r) return;
    const over = (d - r) / d;
    this._axAcc += dx * over * k; this._ayAcc += dy * over * k;
  }

  // Taille affichée = gabarit de l'espèce x maturité (`growth`) x gabarit
  // personnel x âge. `growth` reste la seule chose que le GAVAGE fait bouger
  // (au-delà de 1 c'est du gras, et à TAILLE_EXPLOSION ça éclate) : la
  // variabilité naturelle passe donc par des facteurs séparés.
  get size() {
    // MÉMOÏSÉE PAR FRAME. Lue à chaque paire de voisins (boids, contacts,
    // séparation), elle était recalculée 15 700 fois par frame en temps normal
    // et 68 800 en surpopulation — 20 % du temps propre de la simulation.
    // Recalculée si `growth` bouge dans la frame (une bouchée, le gavage) ;
    // hors jeu (`Entity.frame` reste à 0 dans l'atelier), jamais mémoïsée.
    const f = Entity.frame;
    if (f && this._tailleF === f && this._tailleG === this.growth) return this._taille;
    // Les poissons grandissent toute leur vie : un vieux est sensiblement plus
    // gros qu'un jeune adulte, sans avoir été gavé pour autant.
    const vieillesse = U.lerp(0.9, 1.12, U.clamp(this.age / this.maxAge, 0, 1));
    const s = this.def.size * this.growth * this.gabarit * vieillesse;
    if (f) { this._tailleF = f; this._tailleG = this.growth; this._taille = s; }
    return s;
  }
  get color() { return this._color ?? (this._color = U.pick(this.def.colors)); }
  get colorDark() { return this._cd ?? (this._cd = U.mixColor(this.color.startsWith('#') ? this.color : '#888888', '#102030', 0.35)); }
  colorAlpha(a) {
    // Le préfixe "r,g,b" est figé (la couleur d'un individu ne change jamais) :
    // on ne le redécoupe pas à chaque appel (74/frame mesurés).
    if (!this._rgbPrefix) {
      const c = U.hexRGB(this.color);
      this._rgbPrefix = `rgba(${c[0]},${c[1]},${c[2]},`;
    }
    return this._rgbPrefix + a + ')';
  }

  setExpression(expr, dur = 1.5) { this.emote(expr, dur); }

  // UN VOISIN QUI NE PEUT PAS PARTIR EST UN VOISIN PERMANENT. Toute réaction
  // déclenchée par sa seule présence tourne donc en boucle, indéfiniment, sur
  // la même victime. Mesuré avant correction : la Rascasse piquait le Corail
  // 29 fois/min et l'Anémone 24 fois/min (le récif restait vert de dégoût en
  // permanence), et l'Anguille assommait 112 créatures de fond par minute —
  // coquillages, oursins, étoiles, concombres, tous immobiles et donc tous à
  // portée en continu, sonnés 4 à 7 % du temps.
  //
  // C'est la règle que l'Anémone et le Clown appliquaient déjà pour choisir
  // qui câliner (`o.speedNow < 12 → continue`), généralisée : **une scène ne se
  // déclenche que sur quelqu'un qui PASSE.** Le décor vivant en est exclu
  // d'office, les rampants par leur vitesse.
  static passe(o) {
    return !o.def.refuge && o.def.movement !== 'fixed' && o.speedNow > 12;
  }

  // Part des individus qui montrent l'EFFET d'une émotion vécue en groupe.
  // Ajouter une ligne ici plutôt qu'un `Math.random()` dans le code appelant :
  // c'est le seul endroit où l'on voit le budget d'un coup d'œil.
  static VFX_GROUPE = { scared: 0.1, eating: 0.1, dizzy: 0.1, love: 0.22 };

  // Part de la patience d'orientation qu'une intention FRANCHE peut réclamer.
  // À 0 on retrouve le comportement d'origine — la patience s'applique en
  // entier quoi que veuille le poisson, et il nage à reculons en attendant.
  static PATIENCE_REMISE = 0.85;

  // Joue une émotion DANS LA DURÉE : montée rapide, tenue, retombée douce.
  // `emoteK()` renvoie l'intensité 0→1 que le visage utilise pour interpoler,
  // ce qui évite les expressions qui claquent d'une frame à l'autre.
  emote(expr, dur = 1.5, vfx = true) {
    const same = this.expression === expr;
    this._held = false;                  // une émotion ponctuelle annule un maintien
    this.expression = expr;
    this.exprTimer = Math.max(this.exprTimer, dur);
    this.emoteDur = Math.max(this.emoteDur || 0, dur);
    if (!same && vfx) this.emoteVFX(expr);
  }

  // Maintient une expression tant qu'un ÉTAT dure (sommeil, KO). L'enveloppe
  // one-shot d'emote() retombe à zéro : posée telle quelle, l'expression était
  // rendue à intensité nulle — un poisson endormi gardait les yeux OUVERTS.
  hold(expr) {
    if (this.expression !== expr) { this.expression = expr; this.emoteVFX(expr); }
    this._held = true;
    this.exprTimer = 0.6; this.emoteDur = 0.6;   // sert à la retombée au réveil
  }

  release() { this._held = false; }

  emoteK() {
    if (this._held) return 1;            // maintenue à pleine intensité
    const d = this.emoteDur || 1;
    const left = U.clamp(this.exprTimer / d, 0, 1);
    const inK = U.clamp((1 - left) / 0.14, 0, 1);   // montée (14 % du temps)
    const outK = U.clamp(left / 0.3, 0, 1);          // retombée (30 % de la fin)
    // petit dépassement au pic : l'expression "rebondit" comme en animation
    const overshoot = 1 + 0.18 * Math.sin(Math.PI * U.clamp((1 - left) / 0.35, 0, 1));
    return U.clamp(Math.min(inK, outK) * overshoot, 0, 1);
  }

  // UN SIGNE, UN SENS — ou pas de signe du tout.
  //
  // Relevé du 5 septembre 2026 sur 4 minutes : la couche d'effets d'émotion
  // pesait ~580 marques par minute, et **`burst` en faisait 352 à lui seul pour
  // quatre sens sans rapport** — surpris (157), écœuré (124), apeuré (65),
  // en train de manger (6) — que rien ne distinguait qu'une couleur. À l'échelle
  // d'un poisson de 15 px, dans une eau déjà teintée, cinq points colorés ne
  // veulent rien dire. Même défaut pour `sweat` : 87/min pour trois émotions,
  // et une petite goutte bleu pâle est indiscernable d'une BULLE, dont
  // l'aquarium en émet près de trois mille par minute.
  //
  // Le projet a déjà sa règle : « le visage raconte, la marque ne fait que
  // ponctuer ». Donc soit une émotion a un signe qui n'appartient qu'à elle,
  // soit elle n'en a pas et son visage suffit. Ce qui a été retiré :
  //
  //   - `surprise` — l'œil rond, les sourcils au plafond et la bouche en o
  //     disent tout. La gerbe blanche était le premier poste de la couche.
  //   - `eating` — la mastication et la queue de la proie qui dépasse de la
  //     gueule le racontent déjà, et bien mieux.
  //   - la gerbe de `scared` — le « ! » est le signal ; les points bleus
  //     n'ajoutaient rien.
  //   - la goutte de `sad` — sourcils tombants et bouche en arc inversé
  //     suffisent, et ça libère la goutte pour un seul sens.
  //
  // Et `disgust` passe de la gerbe verte au NUAGE vert, qui est déjà le
  // vocabulaire du prout : un lecteur apprend un symbole au lieu de deux.
  //
  // Le tableau est explicite exprès — c'est le seul endroit où l'on voit d'un
  // coup d'œil quelle émotion coûte une marque, et laquelle s'en passe.
  emoteVFX(expr) {
    if ((this._vfxCd ?? 0) > 0) return;
    // Les réactions de GROUPE ne s'affichent que sur une fraction des individus,
    // sinon un banc entier montre vingt marques d'un coup. `dizzy` y est depuis
    // l'Anguille (une décharge assomme cinq poissons à la fois) ; `love` depuis
    // la migration de ponte, qui met des dizaines de créatures en parade au même
    // moment. L'expression, elle, n'est JAMAIS filtrée — c'est le visage qui
    // raconte, la marque ne fait que ponctuer.
    const part = Entity.VFX_GROUPE[expr];
    if (part !== undefined && Math.random() > part) return;
    const x = this.x, y = this.y - this.size * 1.1, s = this.size;
    switch (expr) {
      case 'scared':   Particles.comic(x, y, '!'); break;              // le cri
      case 'happy':    Particles.sparkles(x, y, 5); break;             // les étincelles
      case 'wink':     Particles.sparkles(x, y, 3); break;
      case 'love':     Particles.loveBurst(x, y, 3); break;            // les cœurs
      case 'dizzy':    Particles.stars(x, y); Particles.spin(x, y, s); break;
      case 'angry':    Particles.anger(x + s * 0.4, y); break;         // la veine
      case 'blush':
      case 'ashamed':  Particles.sweat(x + s * 0.5, y, s); break;      // la goutte de gêne
      case 'disgust':  Particles.stink(x, y + s * 0.2, s); break;      // le nuage vert
      // `surprise`, `eating`, `sad` : rien. Leur visage se suffit.
      default: return;
    }
    this._vfxCd = U.rand(2.5, 5);
  }

  // ---------------------------------------------------------------------------
  update(dt, t) {
    this.age += dt;

    // Croissance alevin → adulte
    if (this.stage === 'fry') {
      if (this.growth >= 1) this.stage = 'adult';
    }
    // Croissance PROGRESSIVE, calée sur la longévité de l'espèce : un alevin de
    // confetti est adulte en ~40 s, un baleineau met plusieurs minutes. Un taux
    // fixe donnait à toutes les espèces la même enfance, quelle que soit leur
    // durée de vie. Elle ralentit en approchant de la taille adulte (les
    // derniers pourcents sont les plus lents), comme une vraie courbe de
    // croissance — le petit reste petit un moment, puis pousse.
    if (this.growth < 1 && this.stage !== 'egg') {
      const enfance = this.maxAge * 0.2;                 // 20 % de la vie à grandir
      const ralenti = U.lerp(1.5, 0.55, this.growth);    // vite d'abord, doucement à la fin
      this.growth = Math.min(1, this.growth + dt * (0.7 / enfance) * ralenti);
    }

    // Œuf : immobile, éclot
    if (this.stage === 'egg') {
      this.stateTimer += dt;
      if (this.stateTimer > U.lerp(15, 25, this.phase / 7)) {
        this.stage = 'fry'; this.growth = 0.3;
        this.emote('surprise', 2.5);        // il découvre le monde
      }
      return;
    }

    // SAISIE PAR LE JOUEUR (cf. saisie.js). Tenue à la main ou en train de
    // retomber après le relâché, la créature sort de la simulation : ni faim,
    // ni pensée, ni gag, ni prédateur — `Saisie.pilote` fait tout, jusqu'à la
    // rendre à `think`/`move` sur une position valide. Placé AVANT la faim :
    // « pas de faim pendant la saisie » est une promesse, pas un arrondi.
    // Une galipette en cours (GAGS.dauphin) se referme d'elle-même : sans ça
    // `_galVol` et l'angle piloté survivraient à la saisie et le dauphin
    // reposé reprendrait son arc balistique là où on l'a posé.
    if ((this._saisi || this._lache) && this._galPh) GAGS._galFin(this);
    if ((this._saisi || this._lache) && Saisie.pilote(this, dt, t)) return;
    // SUPER SAÏYEN (cf. saiyan.js) : même principe, la scène pilote tout.
    if (this._saiyan && Saiyan.pilote(this, dt, t)) return;

    // Faim. Métabolisme : les nageurs rapides brûlent plus, les embusqués
    // (murène, ver-tapis) qui attendent sans bouger beaucoup moins.
    const metab = this.def.metabolism ?? (this.def.ambush ? 0.4 : (this.def.speed > 100 ? 1.5 : 1));
    this.hunger = Math.min(1, this.hunger + dt * 0.004 * metab);

    // Broutage du plancton ambiant : toute espèce sans proies (filtreurs,
    // herbivores, charognards) se nourrit du fond de la chaîne alimentaire.
    // Ça ne rassasie jamais complètement — il faut manger mieux pour se
    // reproduire — mais ça évite de mourir de faim sans le joueur (GDD §1, §9).
    // Broutage du plancton : les filtreurs et les herbivores, mais AUSSI tout
    // prédateur qui n'a qu'UNE seule espèce au menu — il n'a aucune marge si
    // elle se raréfie. Le Poisson-lanterne le déclarait déjà à la main
    // (`grazes: true`) pour cette raison exacte ; la règle est maintenant
    // générale et couvre le Thon (4 morts de faim en 6 min) et le Poisson-lune.
    // Deuxième cas général : un EMBUSQUÉ QUI NE SE DÉPLACE PAS. Il ne peut pas
    // aller chercher son repas, il dépend entièrement de ce qui veut bien
    // passer devant son caillou — c'est la même absence de marge, sous une
    // autre forme. Mesuré sans : 5 Rascasses mortes de faim sur 6 en 10 min, et
    // 2 Murènes sur 3 dès qu'on descend leur bande de profondeur.
    const plante = this.def.ambush
      && (this.def.movement === 'fixed' || this.def.movement === 'crawl');
    const broute = this.def.grazes
      ?? (plante || !(this.def.prey && this.def.prey.length > 1));
    // DISETTE : un carnivore dont TOUTES les proies sont passées sous leur
    // plancher de protection n'a plus rien à chasser. Il se rabat alors sur ce
    // qu'il trouve — assez pour ne pas mourir, jamais assez pour se reproduire.
    // Sans ça, le mécanisme censé éviter les extinctions en cascade en
    // provoquait une par le haut : Orque éteinte et Requin à 1 en 18 min.
    const disette = !broute && Ecosystem.disette(this.def);
    if (broute || disette) {
      // Un OISEAU broute la surface, pas l'air : sa position en y est
      // au-dessus de la ligne d'eau, où `planktonAt` renvoie 0. Le Pélican
      // mourait donc de faim malgré son `grazes` (3 morts en 6 min).
      const dens = World.planktonAt(this.def.aerial ? CONFIG.SURFACE_Y + 40 : this.y);
      const k = disette ? 0.5 : 1;                 // un requin ne vit pas de plancton
      const cap = 1 - 0.45 * dens * k;
      if (this.hunger > cap) this.hunger = Math.max(cap, this.hunger - dt * 0.03 * k);
      // Natalité naturelle : il faut ~80 s de broutage pour être prêt à se
      // reproduire, soit plusieurs portées dans une vie. Nourrir accélère.
      // En disette, aucun gain : la population du prédateur stagne le temps que
      // ses proies remontent, au lieu de s'effondrer.
      if (!disette) this.wellFed += dt * 0.012 * dens;
    }

    if (this.hunger >= 1 || this.age > this.maxAge) { this.die(); return; }
    // Affamé : le visage s'affaisse. C'est le seul indice visuel de la faim.
    if (this.hunger > 0.82 && this.exprTimer <= 0 && Math.random() < dt * 0.5) this.emote('sad', 2.5);

    if (this._vfxCd > 0) this._vfxCd -= dt;
    if (this._chew > 0) { this._chew -= dt; if (this._chew <= 0) this._chewPrey = null; }
    // LES ÉVÉNEMENTS D'ANIMATION : chaque changement d'état propose au dessin
    // son animation dessinée (`doc.animes` : peur, dort, chasse, parade…) —
    // sans elle, rien ne change, le comportement générique reste la règle.
    if (this.state !== this._etatVu) {
      const evt = ANIM_ETATS[this.state];
      if (this._anime && this._anime.deEtat) {
        if (this._animeVisage) { this.release(); this._animeVisage = false; }
        this._anime = null;
      }
      if (this._animeFace && this._animeFace.deEtat) {
        if (this._animeFaceV) { this.release(); this._animeFaceV = false; }
        this._animeFace = null;
      }
      if (evt) this.evenement(evt, {}, true);
      this._etatVu = this.state;
    }
    // Le repas aussi est un événement : première frame de mastication.
    if (this._chew > 0 && !this._chewAnim) { this._chewAnim = true; this.evenement('mange'); }
    else if (this._chew <= 0) this._chewAnim = false;
    // LA GRANDE SCÈNE DE LA MORT en cours : le corps se fige et joue son clip,
    // plus de pensée, plus de faim — puis il meurt pour de bon (ou son
    // prédateur l'avale, cf. `_attendRepas`).
    if (this._agonie != null) {
      this._agonie -= dt;
      this._freeze = 0.3;
      this.vx *= 0.9; this.vy *= 0.9;
      if (this._agonie <= 0 && !this._agonieMangee) { this._mortJouee = true; this.die(); }
      // Mangée : le prédateur conclut — sauf s'il a disparu entre-temps.
      if (this._agonie < -2 && this._agonieMangee) this.dead = true;
      return;
    }
    // Il attend la fin de la grande scène de sa proie, les yeux dessus…
    if (this._attendRepas) {
      const a = this._attendRepas;
      a.reste -= dt;
      if (a.proie.dead) { this._attendRepas = null; this._faceAt = null; }
      else if (a.reste <= 0) {
        this._attendRepas = null; this._faceAt = null;
        Ecosystem.eat(this, a.proie);          // …et maintenant il avale
      } else { this._freeze = 0.3; this._faceAt = a.proie; }
    }
    if (this._freeze > 0) this._freeze -= dt;
    // La gelée d'un choc se calme toute seule (cf. `choc()` et `draw`)
    if (this._chocT != null) { this._chocT += dt; if (this._chocT > 0.9) this._chocT = null; }
    // L'accordéon du crash (cf. `crash()`) : il reste écrasé, puis PLOP.
    if (this._ecraseT > 0) {
      this._ecraseT -= dt;
      this._freeze = 0.3;
      this.vx *= 0.6; this.vy *= 0.6;
      if (this._ecraseT <= 0) {
        this.assomme(null, true);          // la vrille et les yeux KO
        // Le PLOP : amplitude NÉGATIVE — le retour part en dépassement étiré
        // puis tremblote, au lieu de rejouer un écrasement (celui qu'`assomme`
        // vient de poser est écrasé par ces trois lignes, et c'est voulu).
        this._chocT = 0; this._chocAmp = -0.8; this._chocAxe = 'x';
      }
    }
    if (this.exprTimer > 0) { this.exprTimer -= dt; if (this.exprTimer <= 0) this.expression = 'idle'; }
    if (this.wet > 0) this.wet = Math.max(0, this.wet - dt);
    if (this._lureT > 0) this._lureT -= dt;      // hypnotisée par une lampe (cf. pecheALaLampe)
    if (this._peps > 0) this._peps -= dt;        // le peps du nourrissage (cf. onAte)
    this.stateTimer -= dt;

    this.updateEyeLook();
    // ÉCHOUAGE. Les barrières (plafond de surface, limite au rivage) doivent
    // rendre ce cas rare ; c'est le filet de sécurité, et un vrai destin de
    // poisson : hors de l'eau, il frétille de plus en plus faiblement, puis
    // meurt. Sauteurs et volants en sont exclus, c'est leur métier.
    // `ponteTerrestre` : la Tortue SORT DE L'EAU pour pondre, et c'est voulu.
    // Tant qu'elle est dans sa scène de ponte (`_plage`), le sable ne la tue
    // pas — c'est le seul animal du jeu qui a le droit d'y être.
    if (!this.def.aerial && !this.def.jumps && this.jumpState !== 'air' && !this._plage
        && !this._surfacing && !this._replonge
        && this.def.movement !== 'crawl' && this.def.movement !== 'fixed') {
      if (World.isUnderwater(this.x, this.y)) this._sec = 0;
      else {
        this._sec = (this._sec ?? 0) + dt;
        this.hold('scared');
        this.vx += U.rand(-1, 1) * 260 * dt;      // il frétille sur le sable
        this.vy -= 120 * dt;
        if (Math.random() < dt * 3) Particles.sandCloud(this.x, this.y + this.size * 0.5);
        if (this._sec > 4) { this.release(); this.die(); return; }
      }
    }
    this.digere(dt, t);
    if (this.dead) return;
    if (this.def.breathes) this.breathe(dt);
    this.tryMate(dt);
    this.think(dt, t);
    this.move(dt, t);
  }

  think(dt, t) {
    const def = this.def;

    // Gag périodique générique (comportements comiques data-driven, cf. species.js)
    if (def.gag) def.gag(this, dt, t);

    // Furtivité générique (Poulpe Ninja) : monte à l'arrêt, retombe en mouvement
    if (def.stealthy) {
      const moving = this.speedNow > 8;
      this.stealth = U.clamp(this.stealth + (moving ? -dt * 0.8 : dt * 0.35), 0, 1);
      // le fondu de transparence raconte déjà la disparition : pas de bulle
      if (moving && this._wasStill) Particles.burst(this.x, this.y, '#8a5ea8', 6);
      this._wasStill = !moving;
    }

    // ENCRE (poulpe, calamars) : un poursuivant collé au train, et c'est le
    // rideau. Ce n'est pas décoratif — le prédateur PERD SA CIBLE. Placé avant
    // tout le reste parce que le Poulpe est un charognard : le moteur ne le
    // fait jamais « fuir », il n'avait donc aucune porte de sortie.
    if (def.ink) this.encre(dt);
    if (def.piquant) this.piquer(dt);
    if (def.shock) this.decharge(dt);

    if (this.state === 'dizzy') {
      this.hold('dizzy');
      if (this.stateTimer <= 0) { this.state = 'wander'; this.release(); }
      return;
    }

    // Prédateurs embusqués : ils ne poursuivent pas, ils jaillissent quand une
    // proie passe à portée. La Murène ne bouge pas du tout ; le Poisson-Tapis,
    // lui, rampe lentement vers ce qu'il a repéré (cf. `_traque`).
    if (def.ambush) {
      this._ambushCd = Math.max(0, (this._ambushCd ?? 0) - dt);

      if (this.state === 'strike') {
        // Jaillissement : le corps sort d'un coup
        const p = this.target;
        this.strikeT = Math.min(1, this.strikeT + dt * 4);
        const reached = p && !p.dead &&
          U.dist2(this.x, this.y, p.x, p.y) < (this.size * this.strikeT * 3 + p.size) ** 2;
        if (!p || p.dead || this.stateTimer <= 0 || (this.strikeT >= 1 && reached)) {
          if (p && !p.dead && reached && !Ecosystem.isNearRefuge(p.x, p.y)
              && Math.random() > def.ambush.missChance) {
            Ecosystem.eat(this, p);
          } else {
            this.emote('blush', 2.2);        // gênée d'avoir raté (aucun dégât)
            Particles.comic(this.x, this.y - this.size, '💦');
          }
          this.state = 'retract'; this.target = null; this.stateTimer = 0.6;
        }
        return;
      }

      if (this.state === 'retract') {
        // Se rétracte aussitôt dans SA cachette (GDD §12)
        this.strikeT = Math.max(0, this.strikeT - dt * 2.2);
        if (this.strikeT <= 0.02) {
          this.state = 'wander';
          this._ambushCd = U.rand(4, 9);     // ne rejaillit pas dans la foulée
        }
        return;
      }

      // À l'affût : rentrée, seule la tête ondule hors du trou
      this.strikeT = Math.max(0, this.strikeT - dt * 2);
      if (this._ambushCd <= 0 && this.hunger > 0.3) {
        const p = Ecosystem.nearestPreyFor(this);
        // Embusqué MOBILE (Poisson-Tapis) : il se traîne vers ce qu'il repère au
        // loin (`senseRange`) au lieu d'attendre qu'une proie daigne passer sur
        // lui. Immobile au fond des abysses, il ne mangeait tout simplement
        // jamais — c'est `move()`, branche `crawl`, qui exploite `_traque`.
        this._traque = (def.movement === 'crawl' && p && !p.dead) ? p : null;
        // Elle n'attaque que ce qui PASSE : une proie immobile collée au rocher
        // ne déclenche rien (c'est ce qui la faisait jaillir en boucle).
        // Elle n'attaque que ce qui PASSE (une proie garée contre son rocher la
        // faisait jaillir en boucle) — ou ce qui DORT à sa portée, aubaine d'une
        // embusquée. Sans ce second cas, elle mourait de faim toutes les nuits.
        const passe = p && (p.speedNow > 18 || p.state === 'sleep');
        if (passe && U.dist2(this.x, this.y, p.x, p.y) < def.ambush.range ** 2) {
          this.state = 'strike'; this.target = p; this.stateTimer = 1.1;
          this.emote('scared', 0.4);         // gueule grande ouverte
        }
      }
      return;
    }

    // Sommeil (nuit pour la plupart, cycles pour le Gros Dodo)
    if (this.state === 'sleep') {
      // RÉVEIL EN SURSAUT. La branche `sleep` sort de `think` avant le test de
      // fuite : un poisson endormi se faisait donc croquer sans un battement de
      // nageoire — mesuré, c'était le trou le plus visible (requin et dauphin
      // cueillaient des perroquets dans leur sommeil).
      const cauchemar = Ecosystem.nearestPredatorOf(this);
      if (cauchemar) {
        this.release();
        this.state = 'flee'; this.target = cauchemar; this.stateTimer = 2;
        this.emote('scared', 2);
        return;
      }
      this.hold('sleeping');
      // ZzZzZ qui s'envolent au rythme du ronflement — mais PAS SUR TOUT LE
      // MONDE. La nuit, ~46 % de l'aquarium dort : un « z » par dormeur toutes
      // les 1,5 s faisait 648 particules/min à lui seul, le plus gros poste du
      // jeu après les bulles de la Sardine. Le sommeil se lit déjà sur le
      // visage (yeux clos, bouche qui ronfle) ; le « z » n'est qu'une
      // ponctuation. Un dormeur sur quatre en émet, TOUJOURS LE MÊME (l'ancre
      // est l'identifiant) : un tirage par frame ferait clignoter la nuit.
      if ((this.id & 3) === 0) {
        this._zzzCd = (this._zzzCd ?? 0) - dt;
        if (this._zzzCd <= 0) {
          this._zzzCd = U.rand(2.6, 4.4);
          Particles.zzz(this.x + this.size * 0.7, this.y - this.size * 0.9, this.size);
        }
      }
      if (def.snores && Math.random() < dt * 0.7) Particles.bubble(this.x + this.size * 0.8, this.y, U.rand(4, 9));
      // UN BANC SE LÈVE ENSEMBLE. Pour un poisson de banc, c'est l'humeur du
      // groupe qui commande le réveil, pas son minuteur personnel — et elle
      // l'atteint quand la vague arrive jusqu'à lui.
      const hb = Ecosystem.humeurDe(this);
      if (hb && def.schooling) {
        if (!hb.dort && t >= (this._vagueDodo ?? 0)) { this.state = 'wander'; this.release(); }
        else if (this.stateTimer <= 0) { this.state = 'wander'; this.release(); }   // secours
        return;
      }
      if (this.stateTimer <= 0) { this.state = 'wander'; this.release(); }
      return;
    }
    // PAS de sieste ni de nuit en plein cycle de respiration : `breathe` a
    // beau réveiller, `think` rendormait DANS LA MÊME FRAME et le frein du
    // dormeur clouait la remontée sur place — mesuré : la Baleine réussissait
    // 3 souffles pour 9 cycles lancés, le reste avortait au garde-fou.
    // La galipette du dauphin (`_galPh`, GAGS.dauphin) compte aussi : la nuit,
    // un dauphin s'endormait en plein élan (3 scènes avortées sur 8 mesurées).
    const respire = this._surfacing || this._replonge || this._galPh;
    if (def.sleeps && !respire && this.state === 'wander' && Math.random() < dt * 0.01) {
      this.state = 'sleep'; this.stateTimer = U.rand(12, 25); return;
    }
    // --- SOMMEIL DE BANC : la décision est prise une fois pour le groupe
    // (`Ecosystem.humeurBancs`), et elle se propage en vague. Le tirage
    // individuel qui suit ne concerne donc plus que les solitaires.
    if (def.schooling) {
      const h = Ecosystem.humeurDe(this);
      if (h && h.dort && this.state === 'wander' && t >= (this._vagueDodo ?? 0)) {
        // Le banc commande le réveil, mais on garde un minuteur de SECOURS :
        // un poisson peut perdre son groupe en dormant (`regroupeBancs` remanie
        // les bancs toutes les 6 s, et un banc décimé disparaît). Sans lui, il
        // n'aurait plus personne pour le réveiller et dormirait indéfiniment.
        this.state = 'sleep'; this.stateTimer = U.rand(90, 150);
        return;
      }
    }
    // La nuit, l'aquarium s'endort (GDD §10). Seuls les nocturnes et les
    // embusqués veillent. Avant, seul le niveau 2 dormait : on ne voyait
    // presque personne s'assoupir.
    // Les AÉRIENS en sont exclus. Mesuré : le Pélican passait 53 % de son temps
    // à dormir et 1 % à chasser — or sa poche ratée, qui est tout son gag, ne
    // se joue QUE sur une chasse. Elle ne s'est pas affichée une seule fois en
    // 18 minutes, et le Fou Moustachu (45 % endormi) remontait son algue une
    // fois toutes les dix minutes. Un oiseau qui dort n'a plus de rôle.
    if (!def.schooling && !def.sleeps && !def.nocturnal && !def.ambush && !def.aerial
        && !respire && Main.nightAmount() > 0.55 && Math.random() < dt * 0.06) {
      this.state = 'sleep'; this.stateTimer = U.rand(12, 30); return;
    }

    // Fuite (prioritaire) — petits poissons fuient curseur rapide et prédateurs.
    // Plus d'exemption pour les charognards : `nearestPredatorOf` ne renvoie une
    // menace que si elle a VRAIMENT l'espèce à son menu, donc le crabe (que
    // personne ne mange) n'a jamais rien à craindre — alors que le Poulpe
    // Ninja, charognard mais proie du Cachalot ET du Calamar Géant, ne prenait
    // jamais peur. Il n'y échappait que par son encre.
    // UNE PEUR SE JOUE, ELLE NE SE MAINTIENT PAS. `emote` repousse `exprTimer`
    // à chaque appel : appelé à chaque frame de la fuite, il bloquait
    // l'enveloppe de `emoteK()` près de son sommet et le visage ne retombait
    // jamais (mesuré sur le Confetti : 1 085 appels/min pour 63 frayeurs).
    // L'émotion ne part donc plus qu'à l'ENTRÉE dans la fuite.
    let threat = def.schooling ? Ecosystem.menaceDuBanc(this, t) : null;
    if (!threat) {
      threat = Ecosystem.nearestPredatorOf(this);
      // Un poisson de banc qui voit une menace prévient TOUT LE MONDE, et la
      // consigne se propage en vague depuis lui.
      if (threat && def.schooling) Ecosystem.alerterBanc(this, threat, t);
    }
    if (threat) {
      if (this.state !== 'flee') this.emote('scared', 1.6, Math.random() < 0.25);
      this.state = 'flee'; this.target = threat; this.stateTimer = 1.5;
    } else if (this.state === 'flee') {
      if (this.stateTimer <= 0) { this.state = 'wander'; this.target = null; } // laisse le temps à une fausse alerte (gag) de se voir
    }

    if (this.state === 'flee') return;

    // PÊCHE À LA LAMPE (Poisson-lanterne) : il ne court pas après ses proies,
    // il ALLUME et attend qu'elles viennent se jeter dans sa bouche.
    // Elle REMPLACE la chasse (il n'y a pas de poursuite), mais rien d'autre :
    // le lanterne continue de brouter, d'avaler les graines et de se reproduire.
    if (def.lure) this.pecheALaLampe(dt);

    // Chasse (prédateurs) / charognards
    if (this._traverse > 0) this._traverse -= dt;
    // Il ne rechasse pas tant qu'il n'a pas traversé (cf. Ecosystem.eat).
    if (def.prey && !def.lure && this.hunger > 0.45 && this.state !== 'hunt'
        && !(this._traverse > 0)) {
      const prey = Ecosystem.nearestPreyFor(this);
      if (prey) {
        this.state = 'hunt'; this.target = prey; this.stateTimer = 8;
        // Expression toujours, bulle une fois sur quatre : c'est le visage qui
        // raconte la chasse, et un banc de thons lancés saturait l'écran.
        this.emote('angry', 2.5, Math.random() < 0.25);
      }
    }
    if (this.state === 'hunt') {
      const p = this.target;
      // ON NE MANGE QUE CE QU'ON A À SON MENU. L'état `hunt` sert aussi à
      // FONCER sur quelqu'un sans vouloir le manger — le Poisson Police se rue
      // sur les pétomanes pour les gronder, et il les avalait (6 poissons-clowns
      // en 3 min). Un prédateur ne dévore que ses proies déclarées.
      const comestible = p && def.prey && def.prey.includes(p.speciesId);
      // Le filtreur avale tout ce qui entre dans sa bouche : rayon large
      // Le marteau frappe VERS LE BAS, de toute la hauteur de sa tête : une
      // proie de fond vit dans la bande de sable, jusqu'à ~80 px sous le
      // contour : il plonge dessus (GAGS.marteau) et la frappe du bas de la barre.
      const reach = p && def.marteau ? (this.size * 1.25 + p.size) ** 2
                  : (this.size + p.size) ** 2 * (def.filterFeeder ? 2.2 : 0.6);
      if (!p || p.dead || this.stateTimer <= 0) { this.state = 'wander'; this.target = null; }
      else if (!comestible) {
        // Il l'a rejoint, mais il n'en veut pas : il le lâche.
        if (U.dist2(this.x, this.y, p.x, p.y) < reach) { this.state = 'wander'; this.target = null; }
      }
      else if (U.dist2(this.x, this.y, p.x, p.y) < reach) {
        const nearRefuge0 = Ecosystem.isNearRefuge(p.x, p.y);
        // LE COUP DE MARTEAU (Requin Marteau) : une proie éveillée ne se mange
        // pas, elle s'ASSOMME d'abord, d'un coup de tête dans le sable. Le
        // repas vient après un temps (`_toc`), sur une proie qui voit les
        // étoiles — c'est ce temps qui rend la scène lisible : toc, vrille,
        // puis la bouchée.
        if (def.marteau) {
          if ((this._toc ?? 0) > 0) return;
          // La portée est haute, pas large : il faut être AU-DESSUS de sa proie.
          if (Math.abs(p.x - this.x) > (this.size + p.size) * 1.1) return;
          if (p.state !== 'dizzy') {
            // Réfugiée contre une anémone : il renonce. Compté comme un raté,
            // c'était la moitié de ses coups — un requin qui se sonne lui-même
            // une fois sur deux ne raconte plus un raté, il raconte un bug.
            if (nearRefuge0) {
              this.target = null; this.state = 'wander';
              this.emote('sad', 1.4, false);
              return;
            }
            this._toc = 0.9;
            const fy = World.floorY(p.x);
            if (def.missChance && Math.random() < def.missChance) {
              // Raté : c'est lui qui a la tête dans le sable.
              p.emote('scared', 1.6);
              this.assomme(fy);
            } else {
              p.assomme(fy);
              p.stateTimer = Math.max(p.stateTimer, 3.2);   // le temps qu'il revienne
              this.choc(0.8, 'x');
              this.vx *= -0.35; this.vy -= 50;               // le recul du coup
              this.stateTimer = Math.max(this.stateTimer, 4);
              this.emote('proud', 1.4, false);
              if ((this._tocCd ?? 0) <= 0 && GAGS._enVue(this)) {
                this._tocCd = Ecosystem.cadence(this, CADENCE.toc);
                // Au point d'IMPACT (le crabe), pas derrière le requin : le
                // marteau est à l'avant, et `this.x + size` tombait sur sa
                // queue dès qu'il nageait vers la gauche.
                Particles.shout(p.x, Math.min(this.y, p.y) - this.size, 'TOC !', '#fff', 26);
              }
            }
            return;
          }
          // Proie sonnée : il n'y a plus rien à rater.
          Ecosystem.eat(this, p);
          this.target = null; if (this.state === 'hunt') this.state = 'wander';
          return;
        }
        // Fausse charge (Orque Blagueuse) : dévie au dernier moment, jamais de vraie prise
        if (def.trickster && Math.random() < 0.33) {
          this.emote('wink', 2.4);            // « je t'ai eu ! », le visage suffit
          p.emote('surprise', 1.6);           // la proie a eu très peur
          this.vx *= -0.5; this.vy -= 60;
          this.target = null; this.state = 'wander';
          return;
        }
        const nearRefuge = Ecosystem.isNearRefuge(p.x, p.y);
        // Contact ! Raté comique éventuel (Requin Dents-Molles…) ou proie réfugiée près d'une anémone
        if (nearRefuge || (def.missChance && Math.random() < def.missChance)) {
          if (def.snatch) {
            // LE PÉLICAN RATE : il referme le bec, sa poche se remplit… et le
            // poisson en ressort par le haut. Toute la scène est là.
            this._poche = 1;
            this.state = 'wander';
            p.emote('scared', 2);
            p.vy -= 160; p.vx += U.rand(-1, 1) * 90;
            Particles.burst(this.x + this.size, this.y, '#cfe8ff', 6);
          } else if (def.aerial) {
            // Le Moustachu Volant ressort mouillé plutôt que sonné
            this.wet = 3; this.state = 'wander';
            this.emote('sad', 2.5);          // trempé et dépité
            Particles.splash(this.x);
          } else {
            this.state = 'dizzy'; this.stateTimer = 2.5;
            Particles.stars(this.x, this.y - this.size);
            // Le nuage de sable ne se justifie QUE si le raté a lieu près du
            // fond : en pleine eau il apparaissait tout en bas de la colonne,
            // sans rapport visible avec la scène. Flagrant dans les abysses,
            // où un calamar rate à 1500 px au-dessus du sable.
            const fy = World.floorY(this.x);
            if (fy - this.y < this.size * 4) Particles.sandCloud(this.x, fy - 5, true);
            this.hunger = Math.max(0.3, this.hunger - 0.1);
          }
        } else {
          Ecosystem.eat(this, p);
          if (def.aerial) Particles.splash(this.x);
        }
        this.target = null; if (this.state === 'hunt') this.state = 'wander';
      }
      return;
    }

    // Parade : prêt à se reproduire et pas affamé → va rejoindre un partenaire.
    // C'est ce qui rend la reproduction lisible (deux poissons convergent, cœurs,
    // puis œufs) et ce qui sauve les espèces peu nombreuses.
    if (this.stage === 'adult' && this.wellFed >= 1 && (this._mateCd ?? 0) <= 0
        && this.hunger < 0.7 && def.movement !== 'fixed') {

      // 1. Rejoindre la frayère si on en est loin (migration visible)
      if (this._nursery === undefined) this._nursery = Ecosystem.nurseryPoint(this);
      const nur = this._nursery;
      if (nur && this.state !== 'court' && U.dist2(this.x, this.y, nur.x, nur.y) > 700 * 700) {
        this.state = 'migrate'; this.stateTimer = 40;
        if (Math.random() < dt * 0.3) this.emote('love', 2);
        return;
      }

      // 2. Sur place : chercher un partenaire
      if (this.state !== 'court' || !this.target || this.target.dead || this.target.wellFed < 1) {
        const mate = Ecosystem.nearestMateFor(this);
        if (mate) { this.state = 'court'; this.target = mate; this.stateTimer = 20; this.emote('love', 3); }
        else if (this.state === 'migrate') return;   // continue d'attendre sur la frayère
      }
      if (this.state === 'court') {
        // yeux doux tout au long de la parade
        if (Math.random() < dt * 0.6) this.emote('love', 2.5);
        if (this.stateTimer <= 0) { this.state = 'wander'; this.target = null; }
        return;
      }
    } else if (this.state === 'court' || this.state === 'migrate') {
      this.state = 'wander'; this.target = null; this._nursery = undefined;
    }

    // GOURMANDISE : une graine qui lui arrive sous le nez, il l'avale même le
    // ventre plein. Sans ça, un poisson repu (faim < 0,25) ignorait toute la
    // nourriture — impossible de le gaver, donc jamais d'explosion ni de caca.
    if (def.eatsFood) {
      const proche = Food.nearest(this.x, this.y, this.size + 55);
      if (proche) {
        Food.remove(proche);
        this.onAte(proche.type);
        return;
      }
    }

    // Recherche de nourriture (graines / arêtes)
    if ((def.eatsFood || def.eatsBones) && this.hunger > 0.25) {
      let f = def.eatsBones ? Food.nearestBone(this.x, this.y, 350) : null;
      let isBone = !!f;
      if (!f && def.eatsFood) { f = Food.nearest(this.x, this.y, 300); isBone = false; }
      if (f) {
        this.state = 'seekFood'; this.targetFood = f; this.targetIsBone = isBone;
        if (U.dist2(this.x, this.y, f.x, f.y) < (this.size + 8) ** 2) {
          isBone ? Food.removeBone(f) : Food.remove(f);
          this.onAte(isBone ? null : f.type);
          this.state = 'wander'; this.targetFood = null;
        }
        return;
      } else if (this.state === 'seekFood') { this.state = 'wander'; this.targetFood = null; }

      // Rien de comestible en vue ? Un caca, de loin, ressemble beaucoup à une
      // grosse graine. Il fonce dessus… et le regrette aussitôt.
      if ((def.eatsFood || def.eatsPoop) && this.hunger > 0.4) {
        const c = Food.nearestPoop(this.x, this.y, 220);
        if (c) {
          this.state = 'seekFood'; this.targetFood = c; this.targetIsBone = false;
          if (U.dist2(this.x, this.y, c.x, c.y) < (this.size + 8) ** 2) {
            Food.removePoop(c);
            // `eatsPoop` : le Poisson-Tapis, lui, s'en régale. C'est la seule
            // exception au malaise, et elle a une vraie utilité d'écosystème :
            // il nettoie le fond.
            if (def.eatsPoop) {
              this.hunger = Math.max(0, this.hunger - 0.2);
              this.emote('happy', 1.8);
            } else {
              this.malaise(1, c.x, c.y);
            }
            this.state = 'wander'; this.targetFood = null;
          }
          return;
        }
      }
    }
  }

  // ===========================================================================
  // PIQUANT (`piquant: true`) — Fugu, Oursin, Rascasse.
  // ===========================================================================
  // « Tous ceux qui pic-pic rendent malade. » C'est la contrepartie de leur
  // immunité : personne ne les mange, et c'est pour ça. Deux temps, pour que
  // la piqûre ne sorte pas de nulle part :
  //   1. l'avertissement — un gros s'approche, l'animal se GONFLE (`_gonfle`,
  //      déjà utilisé par le gavage, donc déjà dessiné et déjà tremblotant) ;
  //   2. le contact — la victime prend un `malaise()` (jamais mortel, GDD §9)
  //      et détale.
  // Un cooldown PAR VICTIME, sinon un poisson coincé contre un oursin repart
  // en malaise à chaque frame.
  piquer(dt) {
    const menace = this.def.piquant.range ?? this.size * 4;
    let proche = 0;
    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead || o.stage === 'egg') continue;
      if (o.speciesId === this.speciesId) continue;      // entre eux, ça ne pique pas
      // `perceBallon` : le Barracuda fonce à travers les piquants sans en
      // souffrir. C'est tout son intérêt — il est le seul régulateur du Fugu.
      if (o.def.perceBallon) continue;
      // ON NE PIQUE QUE CE QUI PASSE (cf. `Entity.passe`). Le décor vivant est
      // un voisin permanent : la Rascasse repiquait le Corail et l'Anémone
      // toutes les quatre secondes, sans fin — 53 malaises/min à elle seule, et
      // un récif vert de dégoût en continu. Le filtre couvre aussi le
      // gonflement : c'est ce qui faisait enfler le Fugu toutes les 6,5 s alors
      // que c'est censé être un AVERTISSEMENT.
      if (!Entity.passe(o)) continue;
      const d2 = U.dist2(this.x, this.y, o.x, o.y);
      if (d2 > menace * menace) continue;
      if (this.def.gonflable && this._gonfleCd > 0 && !(this._piquantGonfle > 0.5)) continue;
      // LE GONFLEMENT EST UN AVERTISSEMENT, DONC IL S'ADRESSE À UNE MENACE.
      // N'importe quel passant le déclenchait, krill compris : sur un récif
      // fréquenté, le Fugu enflait toutes les six secondes et ça devenait sa
      // respiration. Seul quelque chose d'au moins sa taille le fait gonfler —
      // mais tout ce qui touche se pique quand même, c'est le principe.
      if (o.size >= this.size * 1.6) proche = Math.max(proche, 1 - Math.sqrt(d2) / menace);

      // LE BALLON ET LES ÉPINES. Le Fugu ne se gonflait que devant du GROS et du
      // MOBILE : il ne gonflait donc jamais devant un Oursin, et le ballon
      // n'éclatait jamais. Or des épines, c'est exactement ce qui doit lui
      // faire peur — et c'est ce gonflement qui le perd. Il gonfle à cause des
      // piquants, et c'est ça qui le fait éclater.
      //
      // L'alarme passe par un canal d'une frame (`_alarmePiquant`), relevé par
      // le Fugu dans son propre `piquer()` : c'est le piquant qui prévient, pas
      // le ballon qui devine.
      if (o.def.gonflable) {
        o._alarmePiquant = Math.max(o._alarmePiquant ?? 0, 1 - Math.sqrt(d2) / menace);
      }
      // Contact : les épines entrent
      const touche = (this.size * this._piquantK() + o.size) * 0.9;
      if (d2 > touche * touche) continue;
      o._piqueCd = (o._piqueCd ?? 0) - dt;
      if (o._piqueCd > 0) continue;
      o._piqueCd = 12;                                   // 4 s : on repiquait le même voisin en boucle
      // UN BALLON CONTRE DES PIQUANTS. Le Fugu se gonfle pour ne pas être
      // mangé — et c'est exactement ce qui le perd face à un Oursin : plus il
      // est gros, plus il offre de surface aux épines. Il ne meurt pas (seul le
      // Barracuda le mange), il se dégonfle D'UN COUP et part en vrille comme
      // un ballon qu'on lâche. La règle est générique : tout `piquant` crève
      // tout `gonflable` gonflé, donc la Rascasse le fait aussi.
      if (o.def.gonflable && (o._piquantGonfle ?? 0) > 0.4) {
        o._piquantGonfle = 0; o._gonfle = 0; o._gonfleCd = 45;
        Particles.shout(o.x, o.y - o.size, 'PSCHIII', '#cfe4f5', o.size * 1.4);
        Particles.burst(o.x, o.y, '#ffe08a', 10);
        for (let k = 0; k < 5; k++) Particles.bubble(o.x, o.y, U.rand(2, 5));
        const a = Math.random() * Math.PI * 2;
        o.vx += Math.cos(a) * 360; o.vy += Math.sin(a) * 360;
        o.assomme(null, true);
        this.emote('smug', 2.4, false);
        continue;
      }
      o.malaise(0.8, this.x, this.y);
      o.state = 'flee'; o.target = this; o.stateTimer = 2;
      Particles.burst(o.x, o.y, '#ffe08a', 5);
      this.emote('smug', 1.6, false);                    // « bien fait »
    }
    // Gonflement : plein au contact, nul quand personne n'approche. Amorti,
    // sinon il claque d'un coup dès qu'un poisson passe à la limite.
    // `_alarmePiquant` est ce qu'un VOISIN PIQUANT lui a signalé cette frame :
    // c'est le seul cas où il gonfle pour quelque chose de petit et d'immobile.
    proche = Math.max(proche, this._alarmePiquant ?? 0);
    this._alarmePiquant = 0;
    this._piquantGonfle = U.lerp(this._piquantGonfle ?? 0, proche, Math.min(1, dt * 4));
    if (this.def.gonflable) {
      this._gonfle = this._piquantGonfle;
      if (proche > 0.7 && this.exprTimer <= 0 && Math.random() < dt * 1.2) this.emote('angry', 1.2);
      // UN AVERTISSEMENT QUI SE RÉPÈTE N'EN EST PLUS UN. Le gonflement partait
      // 16 fois par minute — dès qu'un gros passait, et il en passe. On note le
      // moment où il se dégonfle vraiment, et il ne peut pas re-gonfler tout de
      // suite : c'est ce délai qui rend le geste sérieux.
      if (this._piquantGonfle > 0.5) this._gonfleCd = 26;
      else if (this._gonfleCd > 0) this._gonfleCd -= dt;
    }
  }

  // Facteur de taille appliqué par le rendu quand l'animal est gonflé.
  _piquantK() { return 1 + (this._piquantGonfle ?? 0) * (this.def.gonflable ? 0.55 : 0); }

  // ===========================================================================
  // DÉCHARGE (`shock: {range, cooldown}`) — l'Anguille Coup-de-Jus.
  // ===========================================================================
  // Elle électrocute TOUT ce qui traîne autour, pas un seul individu : c'est
  // une décharge, pas une morsure. Les touchés sont SONNÉS (`assomme`, qui
  // existe déjà et se lit déjà : vrille, étoiles, hébétude) — jamais tués,
  // exactement comme un poisson qui percute un colosse (voir `move`, ligne
  // ~1608) : ça sonne, ça ne tue pas. Décision du 2026-09-05, annule la
  // première version où œufs et alevins mouraient sur le coup.
  //
  // D'où deux brides : un cooldown franc (sans lui elle vide son voisinage en
  // quelques secondes, la leçon de la murène « ping-pong »), et une décharge
  // qui ne part QUE si quelqu'un est assez près pour la justifier.
  decharge(dt) {
    const S = this.def.shock;
    this._shockCd = (this._shockCd ?? U.rand(0, S.cooldown)) - dt;
    if (this._shockCd > 0) return;

    const portee = S.range;
    const cibles = [];
    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead) continue;
      if (o.speciesId === this.speciesId) continue;      // elle ne s'électrocute pas elle-même
      // ELLE NE ZAPPE QUE CE QUI NAGE. Sa bande (900–2200) EST le sol : ses
      // voisins étaient donc les créatures de fond, immobiles, toujours à
      // portée — 112 KO/min, et un sable en permanence plein d'étoiles et
      // d'yeux en spirale (coquillage 18/min, oursin 17, étoile 15…). Une
      // décharge doit disperser un banc qui passe, pas assommer un coquillage
      // qui n'a jamais bougé de sa vie. Un dormeur reste une cible : le
      // réveiller en sursaut, c'est justement la scène.
      if (!Entity.passe(o) && o.state !== 'sleep') continue;
      if (U.dist2(this.x, this.y, o.x, o.y) < portee * portee) cibles.push(o);
    }
    if (!cibles.length) return;                          // rien à zapper : on garde le jus

    // LA DÉCHARGE EST L'ÉVÉNEMENT LE PLUS BRUYANT DU JEU — éclairs, cinq
    // poissons en vrille, des étoiles partout. Elle partait 25 fois par minute
    // quelque part dans l'aquarium, soit toutes les deux secondes et demie :
    // on ne la remarquait plus, elle faisait partie du décor. Le cooldown se
    // calcule donc sur l'EFFECTIF (`cadence`), pour une cadence d'aquarium
    // d'environ une décharge par minute — assez rare pour qu'on la surprenne,
    // assez fréquente pour qu'elle existe. `S.cooldown` reste le plancher.
    this._shockCd = Math.max(S.cooldown, Ecosystem.cadence(this, 1, S.cooldown));
    Particles.eclairs(this.x, this.y, portee, 6);
    this.emote('smug', 1.8, false);
    // BORNÉE À HUIT VICTIMES, LES PLUS PROCHES. Une décharge lâchée dans un
    // essaim de krill en assommait une vingtaine d'un coup (55 KO/min pour le
    // seul krill) : la scène se lit exactement pareil à huit, et le reste
    // n'était que des vrilles hors champ. Même raison que le filtre des
    // réactions de groupe dans `emoteVFX`.
    if (cibles.length > 8) {
      cibles.sort((a, b) => U.dist2(this.x, this.y, a.x, a.y) - U.dist2(this.x, this.y, b.x, b.y));
      cibles.length = 8;
    }
    for (const o of cibles) {
      o.assomme(null, Math.random() < 0.25);
      const dx = o.x - this.x, dy = o.y - this.y, d = Math.hypot(dx, dy) || 1;
      o.vx += dx / d * 140; o.vy += dy / d * 140;
    }
  }

  // ===========================================================================
  // ENCRE — la sortie de secours des céphalopodes (Poulpe, Calamars).
  // ===========================================================================
  // Un poursuivant à bout portant, et le nuage part. L'important n'est pas le
  // nuage : c'est que le prédateur PERDE SA CIBLE et reste planté dedans. Sans
  // ça, un Cachalot lancé sur un Calamar Géant l'attrape à tous les coups et
  // l'espèce ne tient pas trois minutes.
  encre(dt) {
    this._inkCd = Math.max(0, (this._inkCd ?? 0) - dt);
    if (this._inkCd > 0) return;
    for (const p of Ecosystem.neighbors(this.x, this.y)) {
      if (p.dead || p.state !== 'hunt' || p.target !== this) continue;
      if (U.dist2(this.x, this.y, p.x, p.y) > 240 * 240) continue;
      this._inkCd = U.rand(8, 14);          // pas un écran de fumée permanent
      Particles.ink(this.x, this.y, this.size * 1.5);
      p.target = null; p.state = 'wander'; p.stateTimer = 1.5;
      p.emote('surprise', 1.8);             // il cherche autour de lui
      // Et lui détale à reculons, dans le sens opposé au poursuivant
      const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
      const fuite = (this.def.sprintSpeed || this.def.speed * 2) * 1.2;
      this.vx += dx / d * fuite; this.vy += dy / d * fuite;
      this.state = 'flee'; this.target = p; this.stateTimer = 2;
      return;
    }
  }

  // ===========================================================================
  // PÊCHE À LA LAMPE — le Poisson-lanterne (GDD §12).
  // ===========================================================================
  // Il n'a aucune chance à la course : sa méthode, c'est d'allumer et d'attendre.
  // Ce qui traîne dans le noir vient droit sur la lumière, hypnotisé, et se fait
  // croquer. La scène se joue donc surtout CHEZ LA PROIE (`_lureT`, exploité par
  // `move`) — le lanterne, lui, se contente de briller et de rester sur place.
  pecheALaLampe(dt) {
    const L = this.def.lure;
    // La lampe ne s'allume que s'il a faim : repu, il se promène éteint, et on
    // comprend que la lumière EST l'appât.
    this._lureOn = this.hunger > 0.35 && this.state !== 'sleep' && this.stage === 'adult';
    if (!this._lureOn) return;

    // Le balayage des proies coûte cher (une liste d'espèce entière) : on ne le
    // refait que 4 fois par seconde, pas à chaque frame.
    this._lureCd = (this._lureCd ?? 0) - dt;
    if (this._lureCd <= 0) {
      this._lureCd = 0.25;
      for (const proie of Ecosystem.preyWithin(this, L.range)) {
        // Émotion UNIQUEMENT à l'entrée dans le halo (`_lureT` encore à zéro),
        // et seulement sur une proie sur six. Le balayage tourne 4 fois par
        // seconde : émettre à chaque passage, c'est un essaim entier qui
        // scintille en permanence — le budget de bulles explose (cf. CLAUDE.md).
        if (!(proie._lureT > 0) && Math.random() < 0.17) proie.emote('happy', 1.6);
        proie._lureX = this.x; proie._lureY = this.y; proie._lureT = 0.9;
      }
    }

    // La prise : ce qui arrive à sa bouche y passe (avec des ratés). Un vrai
    // temps de latence entre deux coups de mâchoire — sans lui, le test de raté
    // est rejoué à CHAQUE FRAME et l'essaim entier y passe en deux secondes.
    // « Manger un peu » : compter une prise toutes les quelques secondes.
    this._snapCd = (this._snapCd ?? 0) - dt;
    if (this._snapCd > 0) return;
    for (const proie of Ecosystem.neighbors(this.x, this.y)) {
      if (proie.dead || !this.def.prey.includes(proie.speciesId)) continue;
      // Espèce devenue rare : on la laisse tranquille (report de prédation).
      if ((Ecosystem.counts[proie.speciesId] || 0) <= Ecosystem.refugeFloor(proie.speciesId)) continue;
      const contact = this.size + proie.size;
      if (U.dist2(this.x, this.y, proie.x, proie.y) > contact * contact) continue;
      // Il reste PLANTÉ pendant que ça vient : c'est ce qui rend la scène lisible.
      this._freeze = 0.4;
      this._snapCd = U.rand(3.5, 6.5);
      if (Math.random() < L.missChance) {
        // Raté : la proie se réveille d'un coup et déguerpit
        proie._lureT = 0;
        proie.emote('scared', 1.6);
        proie.state = 'flee'; proie.target = this; proie.stateTimer = 1.6;
        this.emote('blush', 1.8);
      } else {
        proie._lureT = 0;
        Ecosystem.eat(this, proie);
      }
      return;
    }
  }

  onAte(foodType) {
    const fav = foodType && foodType === this.def.favoriteFood;
    this.hunger = Math.max(0, this.hunger - (fav ? 0.5 : 0.3));
    this.wellFed += fav ? 0.6 : 0.22;
    // Il GROSSIT. Tant qu'il n'est pas adulte c'est de la croissance normale
    // (plafonnée à 1) ; ensuite c'est du gras, et ça n'a plus de limite —
    // sauf celle du corps humain, euh, du corps de poisson : 5×, et boum.
    const prise = fav ? 0.1 : 0.03;
    // Un clic largue 5 graines : le gain par graine doit rester petit, sinon on
    // passe de 1× à 5× en deux secondes et on ne voit rien venir. Compter une
    // quarantaine de secondes de clics soutenus pour faire éclater un poisson.
    this.growth = this.peutGonfler() ? this.growth + prise * 1.3
                                     : Math.min(1, this.growth + prise);
    this.digestion();
    // Nourrir fait grimper le plafond de population de l'espèce : le joueur peut
    // délibérément favoriser une espèce jusqu'à déséquilibrer l'aquarium (GDD §9).
    Ecosystem.feedBoost(this.speciesId, fav ? 0.035 : 0.01);
    this.emote(fav ? 'happy' : 'eating', fav ? 2.2 : 1.4);
    if (fav) Particles.sparkles(this.x, this.y - this.size, 6);
    // LE PEPS DU NOURRISSAGE : une graine du joueur (jamais une arête — elles
    // passent ici avec foodType null) met CE poisson-là en forme : ses
    // cooldowns de SCÈNE défilent 10× plus vite (cf. GAGS._tic) tant qu'il a
    // du peps. Les graines s'ADDITIONNENT (plafond 10 min) : c'est ce qui rend
    // le lien lisible — je nourris celui-ci, c'est lui qui joue, bientôt.
    // Un cooldown plein (~30 min pour un thon) se vide en ~3 min de peps.
    // Sans joueur, l'aquarium garde ses cadences d'équilibre.
    if (foodType) {
      this._peps = Math.min(600, (this._peps ?? 0) + (fav ? 150 : 90));
      // Et une COUPE FRANCHE, encaissée d'un coup par le prochain tic du
      // cooldown de scène (`GAGS._tic`) : le multiplicateur seul ne suffisait
      // pas — « le thon ne fait JAMAIS son sprint même gavé » — parce qu'un
      // cooldown plein fait ~30 min et que le peps demande de rester nourri
      // des minutes. Là, une poignée de graines suffit.
      this._pepsCoup = (this._pepsCoup ?? 0) + (fav ? 480 : 240);
    }
    if (foodType) this.evenement('graine');   // une scène peut spécialiser la graine…
    this.evenement('mange');        // …sinon la façon de manger, du dessin ou partagée
    // FRAI ÉCLAIR (`fraiRapide`). Règle générale : la reproduction demande de
    // RENCONTRER un partenaire (cf. tryMate). Le bas de la chaîne y échappe —
    // crevettes, krill, méduses, calmars, sardines : ce sont eux qu'on mange,
    // et le joueur doit pouvoir les renflouer TOUT DE SUITE en les nourrissant.
    // C'est le geste le plus naturel du jeu (« ils se font tous manger, je vais
    // les aider »), et il n'avait aucun effet visible avant la minute suivante.
    if (this.def.fraiRapide && this.stage === 'adult'
        && Ecosystem.countSpecies(this.speciesId) < Ecosystem.popCap(this.def)
        && Ecosystem.total < Ecosystem.BUDGET) {
      this._fraiT = (this._fraiT ?? 0) + (fav ? 1 : 0.45);
      if (this._fraiT >= 1) {
        this._fraiT = 0;
        Ecosystem.layEgg(this, this.x + U.rand(-18, 18), this.y + U.rand(-10, 10));
        this.wellFed = Math.max(0, this.wellFed - 0.3);
        Particles.hearts(this.x, this.y - this.size);
        this.emote('love', 1.6, false);
      }
    }
  }

  // Portion de littoral où un rampant a le droit de se traîner : celle dont le
  // FOND tombe dans sa bande de profondeur. Calculée une fois — le relief ne
  // change pas. Le crabe ([0, 99999]) obtient tout le monde, comme avant.
  bornesReptation() {
    // Mémoïsé sur la FICHE D'ESPÈCE : le résultat ne dépend que de def
    // (depthBand) et le relief ne change pas — le cache par individu refaisait
    // le même balayage pour chacun des ~490 animaux.
    if (this.def._bornesRep) return this.def._bornesRep;
    // Même plancher d'eau qu'au spawn : un crabe a `depthBand [0, 99999]`, il
    // rampait donc jusqu'au rivage exact et se retrouvait sur le sable sec.
    const dMin = Math.max(this.def.depthBand[0], this.def.size * 3 + 40);
    const dMax = this.def.depthBand[1];
    let xMin = null, xMax = null;
    for (let x = World.shoreX; x < CONFIG.WORLD_WIDTH - 50; x += CONFIG.DEPTH_COLUMN_WIDTH / 2) {
      const d = World.depthAt(x);
      if (d < dMin || d > dMax) continue;
      if (xMin === null) xMin = x;
      xMax = x;
    }
    // Bande introuvable (relief modifié) : on ne l'enferme pas, il rampe partout.
    if (xMin === null) { xMin = World.shoreX; xMax = CONFIG.WORLD_WIDTH - 50; }
    return (this.def._bornesRep = [Math.max(xMin, World.shoreX + 60), Math.min(xMax, CONFIG.WORLD_WIDTH - 60)]);
  }

  // Le x le plus près de la côte où un colosse a encore assez d'eau sous la
  // quille (avec une marge : on ne veut pas le voir raser le fond). Calculé une
  // fois — le relief ne change pas.
  // BANDE HORIZONTALE de l'espèce : la portion du monde où sa bande de
  // profondeur existe réellement. Le monde ne se lisait que verticalement —
  // horizontalement tout le monde pouvait aller partout, et comme le rivage est
  // le seul endroit que TOUTES les bandes traversent, il devenait un goulot où
  // l'on s'entassait.
  //
  // C'est un rappel SOUPLE (cf. `move`), pas un mur : un prédateur peut en
  // sortir pour chasser, une créature poussée y revient d'elle-même. Les murs
  // durs, eux, alignent tout le monde sur le même pixel.
  //
  // Mémoïsé sur la fiche d'espèce : ne dépend que de `depthBand` et du relief.
  bandeX() {
    if (this.def._bandeX) return this.def._bandeX;
    const [dMin, dMax] = this.def.depthBand;
    let xMin = null, xMax = null;
    const pas = CONFIG.DEPTH_COLUMN_WIDTH / 2;
    for (let x = World.shoreX; x < CONFIG.WORLD_WIDTH - 60; x += pas) {
      const d = World.depthAt(x);
      // Il faut de quoi NAGER, pas seulement effleurer sa borne haute.
      if (d < dMin + this.def.size * 2 || d > dMax + 600) continue;
      if (xMin === null) xMin = x;
      xMax = x;
    }
    if (xMin === null) { xMin = World.shoreX + 200; xMax = CONFIG.WORLD_WIDTH - 200; }
    // Marge de confort : la bande stricte ferait une boîte, on veut une zone de
    // vie avec des bords flous. Elle suit la VITESSE — un nudibranche à 14 px/s
    // et une sardine à 90 n'ont pas besoin du même terrain : à marge constante,
    // la sardine se retrouvait dans un couloir de 900 px qu'elle traversait en
    // dix secondes, ce qui se lit comme une cage même quand le rappel est doux.
    const marge = 400 + Math.min(700, this.def.speed * 6);
    // LA BANDE NE COMMENCE JAMAIS AVANT LA BARRIÈRE DE RIVAGE de l'espèce.
    // Sans ce garde-fou les deux contraintes se battent : le rappel souple tire
    // vers la côte pendant que le mur dur interdit d'y aller, et tout le banc
    // reste COLLÉ au mur, en pleine eau, sur le même pixel. C'est le « mur
    // invisible » qu'on voyait au milieu de la mer — mesuré avant correction :
    // 67 % des Sardines Bulle-fofolle et 79 % des Poissons Volants tenaient à
    // moins de 40 px de leur barrière.
    const mur = (this.def.aerial || this.def.movement === 'crawl')
      ? 0 : this.limiteLarge() + 180;
    const x0 = Math.max(World.shoreX + 60, mur, xMin - marge);
    return (this.def._bandeX = [x0,
      Math.max(x0 + 900, Math.min(CONFIG.WORLD_WIDTH - 80, xMax + marge))]);
  }

  limiteLarge() {
    // Mémoïsé sur la FICHE D'ESPÈCE (ne dépend que de def.offshore/def.size et
    // du relief, qui ne change pas) : ~490 balayages du relief → 27.
    if (this.def._limiteLarge != null) return this.def._limiteLarge;
    // Les colosses gardent une marge confortable ; pour les autres, il suffit
    // qu'ils tiennent dans la colonne d'eau sans racler ni dépasser. Une espèce
    // peut exiger davantage (`offshore`) : les petits nageurs de surface tiennent
    // dans 30 px d'eau, donc leur barrière tombait littéralement dans le ressac.
    // PLANCHER GÉNÉRIQUE, la vraie leçon : calculer la barrière sur la seule
    // TAILLE ne protège personne. Un Confetti de 11 px pouvait descendre
    // jusqu'à 46 px d'eau, une Méduse et un Clown aussi, un Thon jusqu'à 112 —
    // c'est-à-dire le ressac. En simulation à vide personne n'y va ; dès qu'un
    // prédateur ou le curseur du joueur les pousse vers la côte, tout le monde
    // s'y entasse et ne peut plus repartir. C'est l'effet d'entonnoir.
    // Aucun nageur ne va donc là où il y a moins de 150 px d'eau, et un colosse
    // en exige 900 : une baleine de 190 (soit ~400 px dessinés) tenait dans
    // 548 px d'eau, ce qui la ramenait beaucoup trop près de la plage.
    const besoin = Math.max(this.def.offshore ?? 0,
                            this.def.size * (this.def.size >= 70 ? 2.6 : 2.2),
                            this.def.size >= 70 ? 900 : 150);
    let x = World.shoreX;
    const pas = CONFIG.DEPTH_COLUMN_WIDTH / 2;
    while (x < CONFIG.WORLD_WIDTH && World.floorY(x) - CONFIG.SURFACE_Y < besoin) x += pas;
    return (this.def._limiteLarge = Math.min(x, CONFIG.WORLD_WIDTH * 0.5));
  }

  // Qui peut gonfler ? Pas le décor vivant : une anémone à 3,6x n'est plus
  // qu'un triangle difforme, et la faire exploser détruirait les frayères du
  // récif. Les animaux qui se déplacent, eux, sont de la partie.
  peutGonfler() {
    return this.stage === 'adult' && !this.def.refuge && this.def.movement !== 'fixed';
  }

  // Met un caca en file d'attente : il ne part pas au moment du repas, mais
  // quelques secondes plus tard, pour qu'on fasse le lien de cause a effet.
  // Un seul caca en vol a la fois par individu — c'est ce plafond, et la duree
  // de vie courte de la crotte, qui empechent de tapisser le fond.
  digestion() {
    if (!this.peutGonfler() || this._poopIn != null) return;
    this._poopIn = U.rand(4, 10);
    this._poopPh = 0;
  }

  // ===========================================================================
  // DIGESTION : ce qui rentre doit ressortir. Deux issues comiques — le caca,
  // ou, si le joueur insiste vraiment, l'explosion.
  // ===========================================================================
  digere(dt, t) {
    if (this.stage !== 'adult') return;

    // Le surpoids se résorbe tout seul. C'est ce qui garde l'aquarium stable :
    // la prédation ordinaire fait osciller la taille autour de 1, et seul un
    // joueur qui nourrit SANS RELÂCHE au même endroit atteint les 5×.
    if (this.growth > 1) this.growth = Math.max(1, this.growth - dt * 0.045);

    if (this.growth >= TAILLE_EXPLOSION) { this.explose(); return; }

    // Montée de tension : au-delà de 2,5× il est visiblement à l'étroit —
    // il tremble, souffle des bulles et finit par paniquer. C'est l'avertissement
    // avant la détonation, pour que l'explosion ne sorte pas de nulle part.
    if (this.growth > 2.5) {
      const k = (this.growth - 2.5) / (TAILLE_EXPLOSION - 2.5);
      this._gonfle = k;
      if (this.exprTimer <= 0 && Math.random() < dt * (0.5 + k * 2)) {
        this.emote(k > 0.6 ? 'scared' : 'surprise', 1.5, k > 0.6);
      }
      if (Math.random() < dt * (1 + k * 5)) {
        Particles.bubble(this.x + U.rand(-1, 1) * this.size * 0.4, this.y - this.size * 0.7, U.rand(2, 5));
      }
    } else this._gonfle = 0;

    // Le caca part un moment APRÈS le repas (mis en file par onAte / Ecosystem.eat),
    // pour que le lien de cause à effet se voie.
    if (this._poopIn == null) return;
    // Pas de caca en pleine galipette (GAGS.dauphin) : la scène a son visage,
    // et le minuteur attend — il reprend là où il s'est arrêté, sous l'eau.
    if (this._galPh) return;
    this._poopIn -= dt;
    if (this._poopIn > 0.35) return;

    if (!this._poopPh) {              // 1. il ralentit et prend l'air concentré
      this._poopPh = 1;
      this._freeze = 0.45;
      this.emote('ashamed', 1.1);
      return;
    }
    if (this._poopIn > 0) { this._freeze = 0.2; return; }

    // 2. ça sort par la queue, comme le prout — même repère, même direction
    const dir = (this._facing < 0 ? 1 : -1);
    const qx = this.x + dir * this.size * 1.05, qy = this.y + this.size * 0.2;
    Food.poop(qx, qy, this.size);
    Particles.burst(qx, qy, '#8a6a3a', 4);
    this.emote('happy', 1.4, false);          // le soulagement, sans paillettes
    this._poopIn = null; this._poopPh = 0;
  }

  // Il a avalé un caca (ou pris un prout en pleine figure) : teint vert,
  // il perd de l'état, dégonfle et déguerpit.
  malaise(force = 1, sx = null, sy = null) {
    this.emote('disgust', 2.5 + force);
    // perte d'état : la faim remonte, la jauge de ponte s'effondre. Bornée à
    // 0,9 pour que le dégoût ne puisse jamais TUER de faim.
    this.hunger = Math.min(0.9, this.hunger + 0.16 * force);
    this.wellFed = Math.max(0, this.wellFed - 0.5 * force);
    if (this.growth > 1) this.growth = Math.max(1, this.growth - 0.3 * force);
    this._poopIn = null; this._poopPh = 0;
    if (sx !== null) {                        // il recule devant la chose
      const dx = this.x - sx, dy = this.y - sy, d = Math.hypot(dx, dy) || 1;
      this.vx += dx / d * 120 * force; this.vy += dy / d * 120 * force;
    }
  }

  // 5× sa taille normale : ça ne rentre plus. BOUM.
  explose() {
    if (this.dead) return;
    this.dead = true;
    Particles.boom(this.x, this.y, this.size, this.color);
    Particles.shout(this.x, this.y - this.size * 1.2, 'BOUM !', '#ffd75e', this.size * 0.9);
    // Il ne disparaît pas pour rien : ses restes nourrissent le fond
    Food.addBone(this.x, this.y, U.clamp(this.size / 16, 0.7, 4.5));
    for (let i = 0; i < 4; i++) Food.poop(this.x + U.rand(-50, 50), this.y + U.rand(-30, 30), this.size * 0.5);
    // Les témoins sont soufflés — et écœurés par ce qui leur retombe dessus
    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead || o.stage === 'egg') continue;
      const d2 = U.dist2(this.x, this.y, o.x, o.y);
      if (d2 > (this.size * 4) ** 2) continue;
      const d = Math.sqrt(d2) || 1;
      o.emote('scared', 2.2, false);
      o.vx += (o.x - this.x) / d * 280; o.vy += (o.y - this.y) / d * 280;
      o.state = 'flee'; o.stateTimer = 1.8; o.target = null;
    }
  }

  // DISTORSION D'IMPACT — le code du cartoon : ce qui se cogne s'ÉCRASE, puis
  // tremblote comme de la gelée en reprenant sa forme (écrasement, rebond
  // légèrement étiré, oscillation amortie en une demi-seconde — cf. draw()).
  // `axe` : 'x' = choc frontal (il se tasse en longueur), 'y' = à plat
  // (chute sur le sable : il s'aplatit). Purement visuel, aucun effet de sim.
  choc(force = 1, axe = 'x') {
    this._chocT = 0;
    this._chocAmp = U.clamp(force, 0, 1);
    this._chocAxe = axe;
  }

  // LE CRASH DU COYOTE — pour une collision à PLEINE VITESSE. Trois temps,
  // comme quand Vil Coyote rencontre une falaise : il se ratatine EN ACCORDÉON
  // et reste écrasé le temps de comprendre ce qui lui arrive (les yeux ronds),
  // puis « PLOP » — il reprend sa forme d'un coup (dépassement étiré, posé par
  // update()) et part en vrille, les yeux KO (`assomme`). La gelée de `choc()`
  // est pour les impacts ordinaires ; le crash, pour les fonceurs.
  // UNE ANIMATION DU DESSIN (timeline de poses clés, `doc.animes`, dessinée
  // dans l'atelier) remplace le visuel générique de l'ÉVÉNEMENT du même nom —
  // et SEULEMENT s'il en existe une : sans elle, poses et visage génériques
  // restent la règle. `deEtat` marque les animations liées à un ÉTAT (peur,
  // dort…), remplacées quand l'état change ; les autres (mange, crash, saut,
  // pond, charge) se jouent une fois et rendent la main.
  jouerAnime(nom, deEtat = false) {
    const sp = (this.def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(this.def.sprite) : null;
    // Un CLIP se résout : ceux du dessin d'abord, puis la BIBLIOTHÈQUE
    // partagée (`Assets/clips.json`) — la chorégraphie est commune, mais les
    // clés référencent des POSES, que chaque animal redéfinit : le poulpe ne
    // singera pas le thon.
    const an = sp && Sprites.clipDe(sp, nom);
    if (!an || !an.cles || !an.cles.length) return false;
    // DEUX PISTES, décision d'auteur : une seule animation de CORPS à la fois
    // (un événement pendant une scène est PERDU — pas de file, le cooldown de
    // la règle gate la suite), mais une animation de VISAGE SEUL (aucune clé
    // de pose) vit sur sa propre piste et se combine par-dessus.
    if (an.cles.every(c => !c.pose)) {
      if (this._animeFace) return this._animeFace.nom === nom;
      this._animeFace = { nom, t0: null, deEtat };
      return true;
    }
    if (this._anime) return this._anime.nom === nom;   // occupé : perdu
    this._anime = { nom, t0: null, deEtat };
    return true;
  }

  // LE BUS DES RÈGLES (`doc.regles`, posées dans l'atelier) : quand un
  // événement du jeu survient, chaque règle du dessin est filtrée — type,
  // `avec`, conditions `si` (vocabulaire FERMÉ : vitesse, profondeur, nuit,
  // faim — pas de code dans le JSON), cooldown par règle — et la première qui
  // matche joue son animation. Une règle HABILLE, elle ne touche jamais la
  // simulation : ce qui doit agir sur l'écosystème reste un gag dans gags.js.
  evenement(type, p = {}, deEtat = false) {
    const spr = (this.def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(this.def.sprite) : null;
    if (!spr) return;
    const regles = spr.scenes || [];
    const t = (typeof Main !== 'undefined' && Main.time) || 0;
    for (let i = 0; i < regles.length; i++) {
      const r = regles[i];
      // Deux générations de format : les SCÈNES (`si` = type d'événement,
      // `cond` = conditions) et les anciennes règles (`quand` = type, `si` =
      // conditions). Le typeof départage sans ambiguïté.
      const typeR = typeof r.si === 'string' ? r.si : r.quand;
      if (typeR !== type || !r.jouer) continue;
      if (r.avec && r.avec !== p.avec) continue;
      const si = r.cond || (typeof r.si === 'object' && r.si) || {};
      const v = p.vitesse ?? Math.hypot(this.vx || 0, this.vy || 0);
      if (si.vitesseMin != null && v < si.vitesseMin) continue;
      if (si.vitesseMax != null && v > si.vitesseMax) continue;
      const prof = this.y - CONFIG.SURFACE_Y;
      if (si.profMin != null && prof < si.profMin) continue;
      if (si.profMax != null && prof > si.profMax) continue;
      if (si.nuit != null && (Main.nightAmount() > 0.5) !== !!si.nuit) continue;
      if (si.faimMin != null && this.hunger < si.faimMin) continue;
      this._regleCd = this._regleCd || {};
      if ((this._regleCd[i] ?? 0) > t) continue;
      if (!this.jouerAnime(r.jouer, deEtat)) continue;   // piste occupée : événement perdu
      this._regleCd[i] = t + (r.cooldown ?? 10);
      return;
    }
    // Aucune scène custom : le clip qui porte le NOM de l'événement joue en
    // défaut — celui du dessin, sinon celui de la bibliothèque partagée (un
    // clip `peur` dans la bibliothèque anime tout l'aquarium d'un coup).
    this.jouerAnime(type, deEtat);
  }

  crash(duree = null) {
    if (this._ecraseT > 0 || this.state === 'dizzy') return;
    this.evenement('crash');        // le dessin peut avoir SA version du crash
    // La TENUE de l'accordéon est un réglage de la pose `crash` du dessin
    // (`duree`, posée dans l'atelier) — chaque espèce a son tempo comique.
    if (duree == null) {
      const sp = (this.def.sprite && typeof Sprites !== 'undefined')
        ? Sprites.get(this.def.sprite) : null;
      duree = (sp && sp.poses && sp.poses.crash && sp.poses.crash.duree) || 1.9;
    }
    this._ecraseT = duree;
    this._chocT = null;                    // l'accordéon remplace la gelée
    this.vx = 0; this.vy = 0;              // il s'arrête NET, collé à l'obstacle
    this.emote('surprise', duree, false);  // le temps de flottement, yeux ronds
    Particles.burst(this.x, this.y, '#ffe8a8', 8);
  }

  // Choc : il part en vrille, voit des étoiles et reste sonné un moment.
  assomme(solY = null, vfx = true) {
    if (this.state === 'dizzy') return;
    this.evenement('assomme');
    this.state = 'dizzy'; this.stateTimer = U.rand(2.5, 4);
    this.target = null; this._faceAt = null;
    this.choc(1, solY !== null ? 'y' : 'x');
    this.emote('dizzy', 3, vfx);
    this.vx *= -0.25; this.vy = -Math.abs(this.vy) * 0.3;
    // La gerbe suit le drapeau `vfx`, comme l'étoile de l'émotion. Elle partait
    // sur CHAQUE assommé : une décharge d'Anguille en touche six d'un coup, et
    // ça faisait 178 gerbes/min à soi seul alors que l'émotion `dizzy` est
    // déjà, elle, filtrée comme une réaction de groupe.
    if (vfx) Particles.burst(this.x, this.y, '#ffe8a8', 8);
    if (solY !== null) Particles.sandCloud(this.x, solY - 4, true);
  }

  // Le regard suit le curseur quand la créature est tranquille : plus la souris
  // est proche, plus la pupille se tourne vers elle. C'est le détail qui donne
  // l'impression que les poissons vous remarquent.
  updateEyeLook() {
    // Position monde du curseur : calculée une fois par frame dans Main.frame
    const dx = Input.wmx - this.x, dy = Input.wmy - this.y;
    const d = Math.hypot(dx, dy);
    const PORTEE = 420;
    if (d > PORTEE || d < 1 || !Input.inWindow) {
      // retour doux au regard neutre
      if (this._eyeLook) {
        this._eyeLook.x *= 0.9; this._eyeLook.y *= 0.9;
        if (Math.abs(this._eyeLook.x) < 0.02 && Math.abs(this._eyeLook.y) < 0.02) this._eyeLook = null;
      }
      return;
    }
    const force = 1 - d / PORTEE;
    // en repère local : x inversé si le poisson regarde à gauche
    const lx = (dx / d) * (this._facing < 0 ? -1 : 1) * 0.55 * force;
    const ly = (dy / d) * 0.5 * force;
    if (!this._eyeLook) this._eyeLook = { x: 0, y: 0 };
    this._eyeLook.x += (lx - this._eyeLook.x) * 0.15;
    this._eyeLook.y += (ly - this._eyeLook.y) * 0.15;
  }

  // Les cétacés (baleine, cachalot, dauphin, orque) sont des mammifères : ils
  // remontent régulièrement respirer et soufflent un panache en crevant la
  // surface. C'est leur moment le plus spectaculaire.
  // Position de l'évent, ALIGNÉE SUR LES YEUX : sur un dessin, l'ancre d'œil
  // dit où est la tête — l'ancien évent à 12 % du centre plaçait le panache au
  // milieu du dos d'une baleine dessinée, loin devant... du mauvais côté, et
  // comme c'est lui qui déclenche le souffle en crevant la surface, le jet
  // partait aussi TROP TARD (la tête était déjà sortie depuis longtemps).
  // Renvoie des coordonnées monde, en tenant compte du sens de nage.
  event() {
    const dir = this._facing < 0 ? -1 : 1;
    const sp = (this.def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(this.def.sprite) : null;
    if (sp && sp.oeil) {
      const k = FishBody.echelleSprite(sp, this);
      return [this.x + dir * (sp.oeil.x - sp.cx) * k,
              this.y + (sp.oeil.y - sp.cy) * k - this.size * 0.2];
    }
    // Silhouette procédurale : la tête est vers l'avant, pas au centre.
    const dorsal = this.size * (this.def.bodyRatio || 0.5);
    return [this.x + dir * this.size * 0.55, this.y - dorsal * 0.8];
  }

  breathe(dt) {
    // EN PLEINE GALIPETTE (GAGS.dauphin), le bond EST sa respiration : le
    // cycle de remontée est suspendu (sinon le filet « au-dessus du plafond »
    // ci-dessous le mettrait en `_replonge`, qui borne la percée à un quart de
    // longueur), et la jauge est pleine.
    if (this._galPh) { this._air = Math.max(this._air ?? 0, 18); return; }
    this._air = (this._air ?? U.rand(8, 25)) - dt;
    // Filet de bulles permanent, échappé de l'évent. LES TROIS CADENCES DE
    // BULLES DE CETTE MÉTHODE ONT ÉTÉ DIVISÉES PAR TROIS : mesurées ensemble à
    // 4 357 bulles/min, elles faisaient à elles seules 68 % de toutes les
    // particules de bulle du jeu, pour une quinzaine de cétacés. Un filet se
    // lit à trois bulles par seconde comme à vingt.
    if (Math.random() < dt * 0.35) {
      const [bx, by] = this.event();
      Particles.bubble(bx, by, U.rand(2, 5));
    }

    // Filet : un cétacé qui se retrouve au-dessus du plafond de surface SANS
    // être en cycle de respiration replonge proprement au lieu d'être reclaqué
    // sous l'eau d'un coup par le plafond dur. Le cas réel : la restauration
    // d'une sauvegarde prise dos hors de l'eau — les drapeaux `_surfacing` et
    // `_replonge` ne sont pas sauvés (mesuré : ~190 px de claquement au
    // chargement pour une baleine sauvée en pleine percée).
    if (!this._surfacing && !this._replonge && this.y < CONFIG.SURFACE_Y + this.size * 0.7) {
      this._replonge = true;
      this._diveTargetY = CONFIG.SURFACE_Y + this.size * 1.2;
    }

    // REPLONGÉE. La fin du souffle ne téléporte plus sous l'eau : le plafond
    // dur de la surface (move) remettait le cétacé de « dos hors de l'eau » à
    // « entièrement immergé » en UNE frame (~120 px pour une baleine).
    // `_replonge` le laisse exempté du plafond le temps qu'il repasse dessous
    // en nageant, tiré par une cible posée SOUS le plafond.
    if (this._replonge) {
      // Elle finit son plongeon AVANT la sieste et AVANT les gags : mesuré,
      // une orque endormie en pleine replongée restait suspendue hors de l'eau
      // (le sommeil coupe vitesse et accélération), et un `_freeze` de scène
      // faisait pareil. Même règle que la remontée : respirer prime sur tout.
      if (this.state === 'sleep') { this.state = 'wander'; this.release(); }
      this._freeze = 0;
      // PAS de minuteur-couperet ici : couper la phase pendant que le dos est
      // encore hors de l'eau rend la main au plafond dur, qui téléporte (le
      // bug qu'on corrige). La percée bornée (move) garantit qu'en attendant
      // l'animal nage à fleur d'eau — un visuel parfaitement normal — et le
      // rappel à pleine vitesse de croisière finit toujours par l'emporter.
      const plafond = CONFIG.SURFACE_Y + this.size * 0.7;
      if (this.y >= plafond) {
        // Le splash part quand elle perce vraiment la surface vers le bas —
        // pas au moment où elle DÉCIDE de replonger, le corps encore à l'air.
        if (this.y < CONFIG.SURFACE_Y + this.size * 1.5) Particles.splash(this.x);
        this._replonge = false;
        this._diveTargetY = null;
      }
    }

    if (this._air <= 0 && !this._surfacing) {
      this._surfacing = true;
      this._blown = false;
      // Le CAP de la remontée, choisi UNE fois : le sens de nage courant, sauf
      // s'il mène droit au rivage (la barrière dure l'y clouerait) ou au bord
      // du monde. C'est lui qui rend la montée oblique — cf. move().
      let cap = this._facing < 0 ? -1 : 1;
      if (this.x < this.limiteLarge() + 500) cap = 1;
      else if (this.x > CONFIG.WORLD_WIDTH - 500) cap = -1;
      this._surfDir = cap;
      // Budget de remontée proportionnel à la profondeur de départ : le
      // garde-fou fixe de 25 s coupait la montée d'un cachalot parti de
      // 2 000 px de fond dès qu'elle n'est plus verticale.
      this._surfBudget = 12 + (this.y - CONFIG.SURFACE_Y) / (this.def.speed * 1.1);
    }
    if (!this._surfacing) return;

    // Respirer PRIME sur tout : un cétacé endormi ou figé restait bloqué au fond
    // à faire du surplace, sans jamais remonter.
    if (this.state === 'sleep') { this.state = 'wander'; this.release(); }
    this._freeze = 0;
    this._surfaceT = (this._surfaceT ?? 0) + dt;

    // Elle SORT de l'eau : la cible place le dos franchement au-dessus de la
    // ligne de flottaison, pas seulement l'évent à fleur d'eau.
    const dorsal = this.size * (this.def.bodyRatio || 0.5);
    this._diveTargetY = CONFIG.SURFACE_Y + dorsal * 0.15;

    const [bx, by] = this.event();

    // Une fois soufflé, elle reste un moment à l'air libre avant de replonger
    if (this._blown) {
      this._surfaceHold = (this._surfaceHold ?? 1.8) - dt;
      if (Math.random() < dt * 1.2) Particles.bubble(bx, CONFIG.SURFACE_Y, U.rand(2, 5));
      if (this._surfaceHold <= 0) {
        this._air = U.rand(20, 40) * (this.def.size >= 70 ? 1.5 : 1);
        this._surfacing = false; this._surfaceT = 0; this._surfaceHold = null;
        this._blown = false;
        // Elle replonge EN NAGEANT (cf. `_replonge` en tête de méthode) : le
        // splash partira quand elle recroisera la surface, pas maintenant.
        this._replonge = true;
        this._diveTargetY = CONFIG.SURFACE_Y + this.size * 1.2;
      }
      return;
    }

    // Pendant la montée : un chapelet de bulles s'échappe de l'évent, ce qui
    // annonce la remontée avant même qu'on voie le dos percer la surface.
    if (by > CONFIG.SURFACE_Y && Math.random() < dt * 1.8) {
      Particles.bubble(bx + U.rand(-4, 4), by, U.rand(2.5, 6));
    }

    if (by < CONFIG.SURFACE_Y && !this._blown) {
      this._blown = true;
      this._surfaceHold = U.rand(1.4, 2.6);
      // LE PANACHE EST RÉSERVÉ AUX CÉTACÉS (`souffle: true`). La Tortue
      // respire aussi (`breathes`) mais n'a pas d'évent : elle sort juste la
      // tête, une petite ride d'eau suffit.
      if (this.def.souffle) {
        Particles.blow(bx, Math.min(by, CONFIG.SURFACE_Y), this.size);
        Particles.splash(this.x);
        Particles.splash(this.x + this.size * 0.5);
      } else {
        Particles.splash(bx);
      }
      this.emote('happy', 2);
    } else if (this._surfaceT > (this._surfBudget ?? 25)) {
      // Sécurité : s'il n'y arrive vraiment pas (coincé, gêné), on relance le
      // cycle plutôt que de le laisser monter indéfiniment.
      this._surfacing = false; this._surfaceT = 0; this._surfaceHold = null;
      this._blown = false;
      this._air = U.rand(10, 20);
      // S'il a été interrompu le dos hors de l'eau, il redescend proprement ;
      // profond, `_replonge` se referme dès la frame suivante (y ≥ plafond).
      this._replonge = true;
      this._diveTargetY = CONFIG.SURFACE_Y + this.size * 1.2;
    }
  }

  // Reproduction (GDD §7) : deux adultes de la même espèce, tous deux bien
  // nourris, qui se croisent → cœurs → 1 à 3 œufs selon leur forme.
  tryMate(dt) {
    if (this.stage !== 'adult' || this.wellFed < 1) return;
    // `ponteTerrestre` : la Tortue ne pond QUE sur la plage, jamais dans l'eau.
    // Sans cette sortie, la ponte ordinaire (appelée juste avant `think`) vidait
    // sa réserve et la scène de plage ne se déclenchait jamais.
    if (this.def.ponteTerrestre) return;
    if ((this._mateCd ?? 0) > 0) { this._mateCd -= dt; return; }

    // Ponte en DIFFUSION. Concerne toutes les espèces qui ne migrent pas vers
    // leur frayère (`Ecosystem.migre`) : les fixes, mais aussi les trop lentes.
    // Elles ne peuvent pas aller chercher un partenaire à l'autre bout d'un
    // monde de 8000 px, alors si aucun voisin n'est à portée elles lâchent
    // leurs œufs dans le courant. Sans ça la Méduse (dérive à 12 px/s) ne
    // pondait que 2 fois en 18 min et passait de 35 individus à 4.
    if (!Ecosystem.migre(this.def) && !this._broadcastTried) {
      this._broadcastTried = true;
      const mate = Ecosystem.neighbors(this.x, this.y).some(o =>
        o !== this && !o.dead && o.speciesId === this.speciesId && o.stage === 'adult' && o.wellFed >= 1);
      if (!mate) {
        // Discret : c'est la ponte la plus fréquente de l'aquarium (tout le
        // récif fixe s'y met), un cœur à chaque fois noyait l'écran.
        Particles.sparkles(this.x, this.y - this.size, 3);
        Ecosystem.layEgg(this, this.x + U.rand(-15, 15), this.y - 6);
        this.wellFed = 0; this._mateCd = this.repos(); this._broadcastTried = false;
        return;
      }
    }
    this._broadcastTried = false;

    // --- La scène du couple : ils se font FACE et s'embrassent avant de pondre.
    // C'est le moment le plus important de la simulation, il doit se voir.
    const p = this._matingWith;
    if (p) {
      if (p.dead || p._matingWith !== this) { this.endMating(); return; }
      this._matingT += dt;
      this._freeze = 0.25;
      this._faceAt = { x: p.x, y: p.y };      // nez à nez
      this.emote('kiss', 1.5, false);
      // UNE SEULE FOIS, AU DÉBUT DU BAISER. Le tirage par frame était la
      // première source de particules du moteur : 390 cœurs/min à lui seul,
      // soit une fois et demie le budget entier de bulles de l'aquarium. C'est
      // exactement la règle que le projet s'est donnée (« ne jamais émettre à
      // chaque frame d'une scène ») et qui n'avait pas été appliquée ici.
      if (this._matingT < dt * 2) Particles.loveBurst((this.x + p.x) / 2, (this.y + p.y) / 2, 4);

      // Un seul des deux pond, sinon la portée est doublée
      if (this._matingT > 1.6 && this.id < p.id) {
        const forme = (1 - this.hunger) + (1 - p.hunger);     // 0..2
        const eggs = this.def.fertile
          ? U.clamp(2 + Math.floor(forme * 2), 2, 6)
          : U.clamp(1 + Math.floor(forme * 1.2), 1, 3);
        const mx = (this.x + p.x) / 2, my = (this.y + p.y) / 2;
        Particles.loveBurst(mx, my - this.size * 0.4, 7);
        for (let i = 0; i < eggs; i++) Ecosystem.layEgg(this, mx + U.rand(-12, 12), my);
        this.emote('happy', 2.5); p.emote('happy', 2.5);
        this.endMating(); p.endMating();
      }
      return;
    }

    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead || o._matingWith || o._saisi || o._lache) continue;
      if (o.speciesId !== this.speciesId || o.stage !== 'adult') continue;
      if (o.wellFed < 1 || (o._mateCd ?? 0) > 0) continue;
      const near = (this.size + o.size) * 1.8;
      if (U.dist2(this.x, this.y, o.x, o.y) > near * near) continue;

      // Rencontre : on démarre la scène sur les DEUX partenaires
      this._matingWith = o; o._matingWith = this;
      this._matingT = 0; o._matingT = 0;
      Particles.hearts((this.x + o.x) / 2, (this.y + o.y) / 2 - this.size);
      return;
    }
  }

  // Délai entre deux pontes. Un ANIMAL RARE ET QUI VIT LONGTEMPS n'a pas besoin
  // de se reproduire souvent : la Baleine vit 2 000 à 3 000 s et son plafond est
  // de trois individus, les oiseaux vivent 550 à 850 s à quatre ou six. Avec le
  // délai commun ils passaient leur vie en parade — 54 % du temps pour la
  // Baleine — au lieu de nager, de chasser et de plonger. Le repos suit donc la
  // longévité : plus on vit vieux, plus on espace.
  repos() {
    const base = this.def.fertile ? 10 : 24;
    const vieux = U.clamp(this.maxAge / 420, 1, 7);   // 1 pour un confetti, 6 pour une baleine
    return base * vieux * U.rand(0.8, 1.25);
  }

  endMating() {
    this.wellFed = 0;
    this._mateCd = this.repos() * 0.6;                 // pas de ponte en rafale
    this._matingWith = null;
    this._faceAt = null;
  }

  move(dt, t) {
    const def = this.def;
    let ax = 0, ay = 0;
    let maxSpeed = def.speed;

    // Espèces fixes : rigoureusement immobiles, RECOLLÉES à leur ancre. Sans ce
    // recalage, une poussée extérieure (chatouille, bousculade) les déplaçait
    // un peu — et le rocher de la murène, dessiné dans son repère, se baladait.
    if (def.movement === 'fixed') {
      this.vx = this.vy = 0;
      this.x = this.anchorX; this.y = this.anchorY;
      return;
    }

    // TORTUE SUR LA PLAGE : à partir du moment où elle rampe, sa scène de ponte
    // (GAGS.tortue) pilote ENTIÈREMENT son déplacement. Sans cette sortie,
    // l'intégration normale écrasait la vitesse imposée par la scène et le
    // clamp `maxSpeed` la ralentissait : on la voyait « ramper » en pleine eau,
    // à 1300 px de profondeur, au lieu de monter sur le sable.
    if (this._plage && this._plagePh && this._plagePh !== 'approche') {
      this.x += this.vx * dt;
      this.y = World.floorY(this.x) - this.size * 0.5;
      this.speedNow = Math.abs(this.vx);
      return;
    }

    // GALIPETTE (GAGS.dauphin) : du lancement hors de l'eau jusqu'à la
    // freinée qui suit le plongeon, la scène pilote ENTIÈREMENT le corps — un
    // vrai arc BALISTIQUE (gravité, pas un ressort), et plus aucune contrainte
    // de strate : la bande de profondeur et le plafond de surface le
    // rabattraient sous l'eau en une frame (le bug de « la remontée »).
    //   - sous la surface avant le bond : vitesse constante (il file) ;
    //   - au-dessus : gravité seule ;
    //   - dès qu'il est RENTRÉ : l'eau le freine en exponentielle, ce qui
    //     évite le blocage net à 500 px/s que lui imposerait le plafond
    //     `maxSpeed` du déplacement ordinaire.
    // Le rivage reste une barrière dure, en vol comme les sauteurs (la phase
    // aérienne court-circuite tout le reste).
    if (this._galVol) {
      const v = this._galVol;
      if (this.y <= CONFIG.SURFACE_Y) { this.vy += v.g * dt; v.air = true; }
      else if (v.air) {
        v.entre = true;
        const k = Math.exp(-3.4 * dt);
        this.vx *= k; this.vy *= k;
      }
      this.x += this.vx * dt; this.y += this.vy * dt;
      const bord = this.limiteLarge();
      if (this.x < bord) { this.x = bord; this.vx = Math.abs(this.vx); }
      if (this.x > CONFIG.WORLD_WIDTH - 100) { this.x = CONFIG.WORLD_WIDTH - 100; this.vx = -Math.abs(this.vx); }
      const sol = World.floorY(this.x) - this.size * 0.5;
      if (this.y > sol) { this.y = sol; this.vy = Math.min(0, this.vy); }
      this.speedNow = Math.hypot(this.vx, this.vy);
      this.angle = Math.atan2(this.vy, this.vx || 1) * 0.6;
      return;
    }

    // --- Créatures aériennes (Moustachu Volant) : volent AU-DESSUS de la surface,
    // gérées en y monde direct (pas de depthBand classique). ---
    if (def.aerial) {
      // ABATTU PAR UN CRACHAT (Poisson Archer, cf. GAGS.archer) : il tombe
      // comme une pierre, s'étale à plat ventre sur l'eau et flotte, sonné,
      // en dérivant. Il se réveille au bout de son minuteur, s'ébroue et
      // repart trempé et furieux — à moins que l'archer n'arrive avant.
      // `_telescope` : MÊME chute, posée par le bond d'un dauphin (GAGS.dauphin) —
      // un drapeau à part, pour que l'Archer (qui ne retient que les `_abattu`)
      // ne transforme pas un télescopage en repas : cet oiseau-là ne meurt pas.
      if (this._abattu > 0 || this._telescope > 0) {
        if (this._abattu > 0) this._abattu -= dt; else this._telescope -= dt;
        const flotte = CONFIG.SURFACE_Y + 2;
        if (this.y < flotte) {
          this.vy += 900 * dt; this.vx *= 0.99;
          this.x += this.vx * dt; this.y += this.vy * dt;
          if (this.y >= flotte) {
            this.y = flotte; this.vy = 0; this.vx *= 0.2;
            Particles.splash(this.x);
            this.choc(1, 'y');                     // le plat retentissant
          }
        } else {
          this.vx *= 0.95; this.vy = 0;
          this.x += this.vx * dt;
          this.y = flotte + Math.sin(t * 3 + this.phase) * 1.5;   // il dodeline sur la houle
        }
        this.x = U.clamp(this.x, World.shoreX, CONFIG.WORLD_WIDTH - 50);
        this.speedNow = 0;
        this.angle = U.angleLerp(this.angle, 0.45, dt * 6);        // de guingois
        if (!(this._abattu > 0) && !(this._telescope > 0)) {
          this._abattu = 0; this._telescope = 0; this.wet = 3;
          this.state = 'wander'; this.target = null; this.release();
          this.vy = -230;
          this.emote('angry', 2.5);
          Particles.splash(this.x);
        }
        return;
      }
      const bandTop = CONFIG.SURFACE_Y - 350, bandBot = CONFIG.SURFACE_Y - 80;
      let ax2 = Math.sin(t * 0.5 + this.phase * 3) * 30;
      let ay2 = Math.cos(t * 0.4 + this.phase * 2) * 15;
      let maxSpeed2 = def.speed;
      if (this.state === 'hunt' && this.target) {
        maxSpeed2 = def.sprintSpeed || def.speed * 1.8;
        // Piqué dirigé (steering) : vise la proie sans orbiter autour
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const d = Math.hypot(dx, dy) || 1;
        ax2 += (dx / d * maxSpeed2 - this.vx) * 3;
        ay2 += (dy / d * maxSpeed2 - this.vy) * 3;
        // Le happeur (`snatch`) lâche l'affaire dès que sa cible RETOMBE à
        // l'eau : sans ça le Pélican la suivrait dans la mer, ce qui est
        // exactement ce qu'il ne fait jamais.
        if (def.snatch && this.target.jumpState !== 'air') {
          this.state = 'wander'; this.target = null;
          this.emote('sad', 1.6);
        }
        // Trop profond : abandonne et remonte, trempé et vexé. Le happeur ne
        // touche jamais l'eau : sa limite est la surface elle-même.
        // `plongeur` (Cormoran) : il ne se contente pas de piquer, il NAGE
        // sous l'eau. Sa limite est cinq fois plus basse que celle du Fou.
        const fond = def.snatch ? 4 : (def.plongeur ? 620 : 130);
        if (this.y > CONFIG.SURFACE_Y + fond) {
          this.state = 'wander'; this.target = null; this.wet = 3;
          Particles.splash(this.x);
        }
      } else {
        // Hors chasse, un oiseau sous l'eau remonte vite (flottabilité)
        if (this.y > CONFIG.SURFACE_Y - 20) ay2 += (bandBot - this.y) * 5;
        if (this.y < bandTop) ay2 += (bandTop - this.y) * 3;
        if (this.y > bandBot) ay2 += (bandBot - this.y) * 3;
      }
      // Né sur la plage, il rejoint la mer en douceur : un mur au rivage
      // l'aurait téléporté au-dessus de l'eau à l'éclosion.
      if (this.x < World.shoreX) ax2 += (World.shoreX - this.x) * 1.5;
      this.vx += ax2 * dt; this.vy += ay2 * dt;
      const sp2 = Math.hypot(this.vx, this.vy);
      if (sp2 > maxSpeed2) { this.vx *= maxSpeed2 / sp2; this.vy *= maxSpeed2 / sp2; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.x = U.clamp(this.x, World.shoreX * 0.4, CONFIG.WORLD_WIDTH - 50);
      this.speedNow = sp2;
      if (sp2 > 5) this.angle = U.angleLerp(this.angle, Math.atan2(this.vy, this.vx * 0.4), dt * 5);
      return;
    }

    // --- Saut hors de l'eau (Poisson Volant Cascadeur, Bulle-fofolle) ---
    if (def.jumps) {
      if (this.jumpState === 'air') {
        // Sous l'eau : monte en ligne droite vers la surface ; en l'air : arc balistique
        if (this.y <= CONFIG.SURFACE_Y) this.vy += 500 * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        // Filet de sécurité : la barrière du rivage vaut AUSSI en vol. Un saut
        // déclenché au large mais rattrapé par une fuite finissait au-dessus du
        // sable, seul cas où un poisson traverse la plage.
        const bord = this.limiteLarge();
        if (this.x < bord) { this.x = bord; this.vx = Math.abs(this.vx); }
        this.speedNow = Math.hypot(this.vx, this.vy);
        this.angle = Math.atan2(this.vy, this.vx || 1) * 0.6; // pique du nez en retombant
        // Sortie de l'eau (montée qui croise la surface)
        if (!this._airborne && this.y <= CONFIG.SURFACE_Y) {
          this._airborne = true;
          Particles.splash(this.x);
        }
        // Retombée : replonge quand il recroise la surface en descendant
        if (this._airborne && this.vy > 0 && this.y >= CONFIG.SURFACE_Y) {
          this._airborne = false;
          this.jumpState = 'water';
          Particles.splash(this.x);
          // Le VENTRE À PLAT : il s'aplatit en gelée à l'impact, d'autant plus
          // fort qu'il retombe vite. Silencieux, donc à chaque fois.
          this.choc(U.clamp(this.vy / 380, 0.4, 1), 'y');
          this.evenement('collision', { avec: 'surface', vitesse: this.vy });
          if (Math.random() < 1 / 3) this.setExpression('dizzy', 1); // plat retentissant, un coup sur trois
        }
        return;
      }
      if (this.state === 'wander' && this.y < CONFIG.SURFACE_Y + def.depthBand[1] * 0.8 && Math.random() < dt * 0.1) {
        this.jumpState = 'air';
        this.evenement('saut');     // le dessin peut avoir SA cabriole
        this._airborne = false;
        this.vy = -U.rand(240, 330);
        // élan horizontal : un saut en cloche, pas une chandelle sur place.
        // JAMAIS vers la plage quand on en est déjà près : la phase aérienne
        // court-circuite toutes les contraintes horizontales, et le sauteur
        // retombait sur le sable — spectaculairement, quand la fuite lui avait
        // déjà donné de l'élan dans cette direction.
        const versLeLarge = this.x < this.limiteLarge() + 300;
        const sens = versLeLarge ? 1 : (this.vx >= 0 ? 1 : -1);
        this.vx = sens * Math.max(Math.abs(this.vx), U.rand(70, 130));
        return;
      }
    }

    if (def.movement === 'crawl') {
      // rampe sur le fond
      // Il derive lentement en travers de la bande de sable : sans ca tous les
      // crabes suivent exactement la meme ligne de contour.
      this._sableV = (this._sableV ?? 0) + U.rand(-1, 1) * dt * 22;
      this._sableV = U.clamp(this._sableV, -9, 9);
      this._sable = U.clamp(sableOffset(this) + this._sableV * dt, 0, SABLE_BANDE);
      const fy = World.floorY(this.x) - this.size * 0.6 + this._sable;
      this.y += (fy - this.y) * Math.min(1, dt * 5);
      let dir = 0;
      if (this.state === 'seekFood' && this.targetFood) dir = Math.sign(this.targetFood.x - this.x);
      // Embusqué qui rampe (Poisson-Tapis) : il se traîne vers la proie repérée
      // au loin. C'est ce qui le sort de la famine — planté sur place au fond
      // des abysses, il ne voyait jamais passer le moindre poisson-lanterne.
      else if (this._traque && !this._traque.dead) dir = Math.sign(this._traque.x - this.x);
      else if (this.state === 'hunt' && this.target && !this.target.dead) dir = Math.sign(this.target.x - this.x);
      // Il va REJOINDRE son partenaire. Le steering de `court` vit dans la
      // partie boids, que la reptation court-circuite : un rampant partait donc
      // en parade… sans jamais se déplacer d'un pixel vers l'autre. Deux
      // Poisson-Tapis (ou deux crabes) ne se rencontraient qu'au hasard des
      // 195 px du voisinage, et les deux espèces s'éteignaient doucement.
      else if (this.state === 'court' && this.target && !this.target.dead) dir = Math.sign(this.target.x - this.x);
      else if (Math.random() < dt * 0.3) this._crawlDir = U.pick([-1, 0, 1]);
      // Endormi, il ne rampe plus du tout — la branche `crawl` ne passe pas
      // par le steering, elle aurait continué sa marche toute la nuit.
      if (this.state === 'sleep') dir = 0;
      dir = dir || (this.state === 'sleep' ? 0 : (this._crawlDir ?? 0));
      this.vx = dir * def.speed;
      this.x += this.vx * dt;
      // Bornes de reptation : un rampant reste sur la portion de fond qui
      // correspond à SA bande de profondeur. Sans ça le Poisson-Tapis, qui
      // suit le sable, remontait tranquillement jusqu'au récif — et le crabe
      // ([0, 99999]) n'est évidemment pas concerné.
      const [xMin, xMax] = this.bornesReptation();
      this.x = U.clamp(this.x, xMin, xMax);
      if (this.x <= xMin || this.x >= xMax) this._crawlDir = -(this._crawlDir ?? 1);
      this.speedNow = Math.abs(this.vx);
      return;
    }

    // --- Boids (séparation / alignement / cohésion) pour les bancs ---
    if (def.schooling) {
      // Banc serré : cohésion et alignement forts sur un large voisinage, ce qui
      // donne une masse qui ondule d'un seul tenant et se déforme quand un
      // prédateur ou la souris la traverse.
      // UN BANC POURSUIVI S'ÉPARPILLE, il ne se resserre pas. Tant que le banc
      // erre, la cohésion en fait une masse qui ondule d'un seul tenant — c'est
      // ce qu'on veut. Mais en FUITE elle devient catastrophique : tout le monde
      // part dans la même direction ET converge vers le même centre, si bien que
      // le banc se compacte en une COLONNE de poissons superposés pendant que le
      // thon le traverse. C'est ce qu'on voyait à l'écran.
      //
      // Sous la menace, donc : plus de cohésion, une séparation deux fois plus
      // forte et sur un rayon deux fois plus large. C'est aussi ce que font les
      // vrais bancs quand un prédateur frappe — ils explosent.
      const panique = this.state === 'flee';
      const rSep2 = panique ? 6400 : 1600;     // 80 px contre 40
      const mates = Ecosystem.groupMates(this);
      // LE BANC GAVÉ. Chacun regardait TOUT son banc : un coût au carré de sa
      // taille. Nourrir fait passer un banc de 31 à 89 poissons, soit de 3 749
      // à 38 672 paires par frame. Au-delà de `BANC_ECHANTILLON`, chacun n'en
      // regarde qu'un sur `pas`, un échantillon qui tourne à chaque frame :
      // cohésion et alignement sont des MOYENNES, l'échantillon les estime
      // sans biais ; la séparation est une SOMME, multipliée par `pas`. Un banc
      // de taille normale n'est pas concerné : le calcul y reste exact.
      const pas = mates.length > Entity.BANC_ECHANTILLON
        ? Math.ceil(mates.length / Entity.BANC_ECHANTILLON) : 1;
      let cx = 0, cy = 0, avx = 0, avy = 0, sx = 0, sy = 0, n = 0;
      for (let i = (this.id + Entity.frame) % pas; i < mates.length; i += pas) {
        const m = mates[i];
        if (m === this) continue;
        const d2 = U.dist2(this.x, this.y, m.x, m.y);
        if (d2 > 340 * 340) continue;
        cx += m.x; cy += m.y; avx += m.vx; avy += m.vy; n++;
        if (d2 < rSep2) { sx += (this.x - m.x); sy += (this.y - m.y); }
      }
      if (n > 0) {
        // EN FIGURE, chacun a une place à tenir. Cohésion et alignement tirent
        // vers le CENTRE et la direction du banc : ils luttaient contre la place
        // assignée, et le contour ne se fermait jamais. On garde la séparation,
        // qui empêche deux poissons de se superposer sur le tracé.
        if (!panique && !this._enFigure) {
          ax += ((cx / n) - this.x) * 1.5;     // cohésion : seulement au calme
          ay += ((cy / n) - this.y) * 1.5;
        }
        if (!this._enFigure) {
          ax += (avx / n - this.vx) * 2.2;     // alignement
          ay += (avy / n - this.vy) * 2.2;
        }
        const kSep = (panique ? 9 : 4.5) * pas;
        ax += sx * kSep; ay += sy * kSep;      // séparation
        // La contagion de panique vivait ICI : « assez de voisins affolés, on
        // file avec eux ». Elle comptait les fuyards à chaque frame et appelait
        // `emote('scared')` à chaque frame — 622 appels/min pour le seul
        // Confetti, l'essentiel de ses 1 085. Elle est remplacée par l'alerte de
        // banc (`Ecosystem.alerterBanc`), qui prévient tout le monde EN UNE FOIS
        // et propage la consigne en vague depuis celui qui a vu la menace.
        // C'est plus juste (un banc réagit comme un corps, pas par grappes) et
        // ça n'émet qu'une émotion par poisson et par frayeur.
      }
    }

    // Anti-chevauchement générique : toutes espèces confondues, chacun garde
    // son espace vital (rayon = somme des tailles). Doux, pour ne pas casser
    // la cohésion des bancs (leur propre séparation est plus courte).
    // Les colosses (baleine, cachalot, orque) ignorent les collisions : se faire
    // bousculer par des dizaines de petits poissons les faisait tourner sur
    // eux-mêmes, et un filtreur DOIT pouvoir chevaucher le banc qu'il avale.
    // Percuter de plein fouet un gros placide (baleine, poisson-lune, cachalot) :
    // on rebondit et on voit les étoiles. Le test vit dans la MÊME passe de
    // voisinage que l'anti-chevauchement ci-dessous (une seule itération de la
    // liste au lieu de deux, cf. PERFORMANCE.md §5.2).

    // Les colosses s'ignorent tous SAUF entre eux : deux baleines qui se
    // traversent, ça se voit tout de suite. Elles se cognent, se repoussent
    // franchement et échangent un regard surpris.
    if (def.size >= 70 || def.filterFeeder) {
      // `neighbors` ne porte qu'à ~195 px : bien trop court pour des corps qui
      // doivent rester à 323 px. On balaie la liste dédiée (une dizaine).
      for (const o of (Ecosystem.colosses || [])) {
        if (o === this || o.dead) continue;
        // EXCEPTION : quand l'un chasse l'autre, la séparation dure les tient à
        // 187 px alors que la prise se joue à 178 — le Cachalot ne pouvait
        // matériellement jamais attraper le Calamar Géant. Le temps de la
        // charge, ils ont le droit de se toucher.
        if ((this.state === 'hunt' && this.target === o) || (o.state === 'hunt' && o.target === this)) continue;
        // Tangence reelle : a 0,85 les corps se chevauchaient encore, le
        // rayon d'une silhouette valant a peu pres sa `size` en longueur.
        // `spanRatio` corrige les silhouettes qui débordent franchement de leur
        // `size` : le Calamar Géant, mantelé d'un côté et tentaculé de l'autre,
        // occupe une fois et demie son rayon nominal — respectée à 1,05, la
        // contrainte les laissait quasiment superposés à l'écran.
        const minD = this.size * (def.spanRatio ?? 1.05) + o.size * (o.def.spanRatio ?? 1.05);
        const d2 = U.dist2(this.x, this.y, o.x, o.y);
        if (d2 >= minD * minD) continue;
        const d = Math.max(Math.sqrt(d2), 0.5), push = (minD - d) / minD;
        const nx = d > 1 ? (this.x - o.x) / d : Math.cos(this.id * 2.4);
        const ny = d > 1 ? (this.y - o.y) / d : Math.sin(this.id * 2.4);
        ax += nx * push * 900; ay += ny * push * 900;
        // CONTRAINTE DURE, résolue en une frame : chacun s'écarte de la moitié
        // du recouvrement, donc les deux réunis le suppriment entièrement.
        // Amortie, la correction ne tenait pas — la migration vers la frayère
        // les ramenait l'un sur l'autre plus vite qu'ils ne se séparaient.
        const ecart = (minD - d) * 0.5;
        this.x += nx * ecart; this.y += ny * ecart;

        // On ne les ARRÊTE pas : leur vitesse d'approche GLISSE le long du
        // contact et chacun s'écarte par un côté opposé (départagés par l'id),
        // comme deux navires qui se croisent. Bloquer net la composante
        // normale les laisserait nez à nez, chacun poussant sans pouvoir
        // contourner l'autre.
        const approche = this.vx * nx + this.vy * ny;
        if (approche < 0) {
          this.vx -= nx * approche; this.vy -= ny * approche;   // ne reste que le tangentiel
          const sens = this.id < o.id ? 1 : -1;
          this.vx += -ny * sens * 45; this.vy += nx * sens * 45;
        }
        // Contact franc : le choc se voit et s'entend (une fois, pas à chaque frame)
        if (push > 0.55 && (this._bumpCd ?? 0) <= 0) {
          this._bumpCd = 3;
          this.evenement('collision', { avec: 'colosse' });
          this.choc(0.7);                     // l'écrasement de gelée (chacun le sien)
          this.emote('surprise', 1.6);
          Particles.burst((this.x + o.x) / 2, (this.y + o.y) / 2, '#dff0ff', 8);
        }
      }
    }
    if (this._bumpCd > 0) this._bumpCd -= dt;

    // UNE SEULE passe de voisinage pour deux tests : le choc contre un gros
    // (ex-boucle dédiée) et l'anti-chevauchement. Deux parcours de la même
    // liste coûtaient ~18 000 itérations de plus par frame.
    let crowd = 0;
    // LE CRASH DU COYOTE NE SE JOUE QUE PENDANT UNE FLÈCHE. Une première
    // version le branchait sur la seule vitesse : les espadons, qui chassent
    // à 460 px/s en temps NORMAL, s'écrabouillaient en permanence — pour
    // rien, sans scène. Deux verrous depuis :
    //   1. il faut être EN FLÈCHE (`_etire`, posé uniquement par les scènes
    //      de charge : run de l'Espadon, VROUUUM du Thon…) ;
    //   2. sur la vitesse VRAIE — `speedNow` est un EFFORT, il dépasse 255
    //      sur place (cf. la règle « speedNow est un effort »).
    const enFleche = (this._etire ?? 0) > 0.2 && this.state !== 'dizzy'
                  && !(this._ecraseT > 0)
                  && Math.hypot(this.vx, this.vy) > 220;
    // LES COLOSSES NE SONT PAS DANS LA PORTÉE DE LA GRILLE. Le contact avec
    // une baleine se joue à `o.size * 0,85 + size` ≈ 187 px du CENTRE, or
    // `neighbors` ne porte qu'à ~195 px dans le meilleur des cas : un thon
    // lancé la traversait sans jamais la « voir ». Même leçon que la liste
    // dédiée `Ecosystem.colosses` — on la balaie donc ici aussi (une dizaine
    // d'entrées, et seulement pendant une flèche).
    if (enFleche) {
      for (const o of (Ecosystem.colosses || [])) {
        if (o === this || o.dead) continue;
        const contact = o.size * 0.85 + this.size;
        if (U.dist2(this.x, this.y, o.x, o.y) < contact * contact) {
          // La règle du dessin passe AVANT le crash par défaut : si elle joue,
          // elle occupe la piste et le `jouerAnime('crash')` du crash échoue.
          this.evenement('collision', { avec: 'colosse' });
          this.crash();
          o.emote('surprise', 1.8);
          break;
        }
      }
    }
    // Hors scène, la collision garde son ANCIEN réglage discret : un petit
    // très rapide qui percute un gros placide est juste assommé.
    let choc = enFleche || (this.speedNow > 280 && this.size < 45 && this.state !== 'dizzy'
                            && !(this._ecraseT > 0));
    const poussable = !def.filterFeeder && def.size < 70;
    if (choc || poussable) {
    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead) continue;
      if (choc && o.size >= 45) {
        const contact = o.size * 0.85 + this.size;
        if (U.dist2(this.x, this.y, o.x, o.y) < contact * contact) {
          this.evenement('collision', { avec: 'colosse' });
          if (enFleche) this.crash();       // en scène : l'accordéon du Coyote
          else this.assomme();              // hors scène : la vrille d'avant
          o.emote('surprise', 1.8);
          choc = false;                     // un seul choc, comme l'ancien break
        }
      }
      if (!poussable) continue;
      // ÉCART EN X D'ABORD. La grille fait 130 px et on en balaie 3×3, donc
      // chaque créature examine une vingtaine de voisins — alors que deux
      // confettis de 11 px se touchent à 21 px. Neuf tests sur dix portaient
      // donc sur des voisins hors de portée, et chacun payait un appel à
      // `U.dist2` (deux soustractions, deux multiplications, une addition).
      // Une soustraction et une comparaison suffisent à les écarter : c'est le
      // même filtre que fait une boîte englobante avant un test exact.
      const dx = this.x - o.x;
      const porteeMax = (this.size + o.size) * 1.5;
      if (dx > porteeMax || dx < -porteeMax) continue;
      const dy = this.y - o.y;
      if (dy > porteeMax || dy < -porteeMax) continue;
      if (o.def.size >= 70 || o.def.filterFeeder) continue;   // on ne pousse pas un colosse
      // Un DORMEUR ne se fait pas pousser : c'est celui qui passe qui contourne.
      // Sans ça, le moindre thon traversant un banc endormi le dispersait, et
      // les gros labouraient les bancs au repos.
      if (this.state === 'sleep' && o.state !== 'sleep') continue;
      const dortLautre = o.state === 'sleep' && this.state !== 'sleep';
      const minD = (this.size + o.size) * (dortLautre ? 1.5 : 0.95);
      const d2 = dx * dx + dy * dy;
      if (d2 < minD * minD) {
        const d = Math.max(Math.sqrt(d2), 0.5), push = (minD - d) / minD;
        // direction de séparation ; deux entités exactement superposées se
        // repoussent quand même grâce à un axe de secours dérivé de leur id
        const nx = d > 1 ? (this.x - o.x) / d : Math.cos(this.id * 2.4);
        const ny = d > 1 ? (this.y - o.y) / d : Math.sin(this.id * 2.4);
        ax += nx * push * (dortLautre ? 900 : 520); ay += ny * push * (dortLautre ? 900 : 520);
        crowd++;
      }
    }
    // Trop serré : on cherche activement de l'espace plutôt que de vibrer sur place
    if (crowd >= 3 && poussable) { ax *= 1.4; ay *= 1.4; maxSpeed = Math.max(maxSpeed, def.speed * 1.5); }
    }

    // Errance — amplitude réduite pour les colosses, qui doivent glisser droit
    const wander = def.size >= 70 ? 0.25 : 1;
    ax += Math.sin(t * 0.6 + this.phase * 3) * 25 * wander;
    ay += Math.cos(t * 0.45 + this.phase * 2) * 12 * wander;

    // Dérive (méduses) : elles suivent un COURANT qui les emmène lentement vers
    // le large et les fait respirer verticalement. Sans ça elles s'accumulaient
    // toutes sur le bord, là où elles étaient nées.
    if (def.movement === 'drift') {
      ax *= 0.15;
      const courant = Math.sin(this.y / 420 + t * 0.05) * 14 + 6;   // vers le large
      ax += courant;
      ay += Math.sin(t * 0.3 + this.phase) * 8;
      // Chaque méduse a SA profondeur de prédilection (répartie par identifiant),
      // et tout l'essaim remonte la nuit : sinon elles s'empilent toutes à la
      // même hauteur au lieu d'occuper la colonne d'eau.
      const perso = ((this.id * 0.618) % 1);
      const jour = U.lerp(def.depthBand[0] + 100, def.depthBand[1] * 0.92, perso);
      const cible = CONFIG.SURFACE_Y + jour * U.lerp(1, 0.45, Main.nightAmount());
      ay += U.clamp((cible - this.y) * 0.02, -12, 12);
      maxSpeed = def.speed;
    }

    // Objectifs d'état — steering "vitesse désirée" (steerVers/tetherVers, en
    // méthodes de prototype : les fermetures locales coûtaient ~1000
    // allocations par frame). L'accumulateur est reversé dans ax/ay plus bas.
    this._axAcc = 0; this._ayAcc = 0;
    // FIGURE DU BANC : chaque confetti a reçu sa place sur le contour d'un
    // cœur, d'un rond ou d'un carré (cf. GAGS.confetti). Elle prime sur tout,
    // sauf sur la peur — un banc qui garde la pose pendant qu'un thon fonce
    // dedans, ça ne va pas.
    if (this._figX != null && this.state !== 'flee') {
      // `_figSpeed` : une scène peut demander SA vitesse. Le plafond de 1,6×
      // convient à une figure de banc, pas au grand run de l'Espadon, qui a
      // 460 px/s de sprint et ne s'en servait jamais que sur trente pixels.
      maxSpeed = this._figSpeed ?? def.speed * 1.6;
      this.steerVers(this._figX, this._figY, maxSpeed, 5);
    } else if (this._lureT > 0 && this.state !== 'flee') {
      // HYPNOTISÉE par une lampe de poisson-lanterne : elle avance droit sur la
      // lumière, sans plus rien voir. Une vraie peur la réveille quand même —
      // c'est le seul état qui prime, sinon la crevette se laisse manger deux
      // fois de suite par des prédateurs différents.
      maxSpeed = def.speed * 0.75;
      this.steerVers(this._lureX, this._lureY, maxSpeed, 2.5);
    } else if (this.state === 'seekFood' && this.targetFood) {
      maxSpeed = def.speed * 1.4;
      this.steerVers(this.targetFood.x, this.targetFood.y, maxSpeed);
    } else if (this.state === 'hunt' && this.target) {
      maxSpeed = def.sprintSpeed || def.speed * 1.8;
      this.steerVers(this.target.x, this.target.y, maxSpeed, 4);
      if (def.sprintSpeed && Math.random() < dt * 0.8) Particles.wake(this.x - this.size, this.y);
    } else if (this.state === 'flee' && this.target) {
      maxSpeed = def.speed * 2;
      // EN ÉVENTAIL, pas en file. Fuir « à l'opposé exact » envoyait tous les
      // voisins dans la même direction : le banc s'étirait en ligne au lieu de
      // se disperser. Chacun a donc son propre écart d'angle (jusqu'à ±40°),
      // fixé par sa phase — c'est stable dans le temps, donc il ne zigzague pas.
      const dx = this.x - this.target.x, dy = this.y - this.target.y;
      const a = Math.atan2(dy, dx) + Math.sin(this.phase * 3.7) * 0.7;
      const d = Math.hypot(dx, dy) || 1;
      this.steerVers(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, maxSpeed, 4);
    } else if (this.state === 'court' && this.target) {
      maxSpeed = def.speed * 1.5;
      this.steerVers(this.target.x, this.target.y, maxSpeed, 3);
    } else if (this._tickleTarget && !this._tickleTarget.dead) {
      // Le Poisson-clown vise le POINT DE BISOU (tangent au flanc), pas le centre
      // de sa victime : c'est ce qui le colle contre elle au lieu de la traverser.
      maxSpeed = def.speed * 1.8;
      this.steerVers(this._kissX ?? this._tickleTarget.x, this._kissY ?? this._tickleTarget.y, maxSpeed, 4);
    } else if (this._farceX != null) {
      // Dauphin en pleine farce : approche discrète puis jaillissement
      const fonce = this._farcePh === 'bouh';
      maxSpeed = fonce ? (def.sprintSpeed || def.speed * 2) : def.speed * 0.5;
      this.steerVers(this._farceX, this._farceY, maxSpeed, fonce ? 5 : 2);
    } else if (this._galX != null) {
      // Dauphin qui PREND SON ÉLAN pour une galipette (GAGS.dauphin) : il file
      // vers son point de départ, sous la surface, à bonne vitesse (il doit
      // rattraper un oiseau qui vole : mesuré à 60 px/s, 150 ne suffisait pas).
      maxSpeed = def.speed * 2;
      this.steerVers(this._galX, this._galY, maxSpeed, 3);
    } else if (this.state === 'migrate' && this._nursery) {
      maxSpeed = def.speed * 1.35;   // en route vers la frayère
      this.steerVers(this._nursery.x, this._nursery.y, maxSpeed, 2.2);
    } else if (this.state === 'sleep') {
      // UN DORMEUR NE SE DÉPLACE PLUS DE LUI-MÊME : on coupe l'errance et tout
      // ce que le steering avait accumulé, sinon un crabe endormi traversait sa
      // bande de sable pendant la nuit.
      //
      // Mais IL DOIT ENCORE SE FAIRE POUSSER. Une première version mettait
      // `maxSpeed = 0`, ce qui annulait aussi l'anti-chevauchement : un banc
      // qui s'endormait s'empilait en COLONNE VERTICALE, tous les poissons au
      // même x, et y restait toute la nuit. Il garde donc juste de quoi
      // s'écarter d'un voisin — pas de quoi partir en balade.
      this._axAcc = 0; this._ayAcc = 0;
      ax = 0; ay = 0;
      this._dort = true;
      maxSpeed = def.speed * 0.3;
      this.vx *= 0.86; this.vy *= 0.86;
    } else {
      this._dort = false;
    }

    // Fuite du curseur rapide (remous). Position monde du curseur : calculée
    // une fois par frame dans Main.frame, plus par chaque petit poisson.
    if (Input.inWindow && def.size < 26) {
      const mx = Input.wmx, my = Input.wmy;
      const d2 = U.dist2(this.x, this.y, mx, my);
      // Le curseul rapide fend le banc ; même lent, il crée un léger halo d'évitement.
      const portee = Input.mouseSpeed > 700 ? 230 : 110;
      if (d2 < portee * portee) {
        const d = Math.max(Math.sqrt(d2), 1);
        const force = (1 - d / portee) * (Input.mouseSpeed > 700 ? 900 : 260);
        ax += (this.x - mx) / d * force;
        ay += (this.y - my) / d * force;
        maxSpeed = def.speed * 2;
      }
    }

    // Contraintes de liberté (GDD §5). La hauteur du fond sous l'animal est
    // lue UNE fois pour toutes les contraintes qui suivent (bande, tirant
    // d'eau, garde au sol) : elle était recalculée 3 à 4 fois par move().
    const fondY = World.floorY(this.x);
    const dMin = CONFIG.SURFACE_Y + def.depthBand[0];
    const dMax = Math.min(CONFIG.SURFACE_Y + def.depthBand[1], fondY - this.size);
    // En pleine chasse, un prédateur peut déborder de sa bande pour aller
    // chercher sa proie : le rappel vertical est assoupli.
    // Assoupli en chasse ET en migration : aller frayer, c'est justement quitter
    // sa strate habituelle.
    const bandK = (this.state === 'hunt' || this.state === 'migrate') ? 0.7 : 3;
    // Un cétacé qui remonte respirer IGNORE sa profondeur minimale : sinon sa
    // bande le retient vers le fond et il n'atteint jamais la surface.
    if (this.y < dMin && !this._surfacing) ay += (dMin - this.y) * bandK;
    // `_coule` : le pendant de `_surfacing`, vers le bas. Le Poisson-lune
    // Bada-boum s'endort en nageant et doit COULER JUSQU'AU SABLE — c'est tout
    // son gag, et le nom de l'espèce. Sa bande s'arrête à 1900 px alors que le
    // fond est bien plus bas là où il vit : le rappel de bande le retenait, et
    // la scène ne s'est jamais produite en 18 minutes de mesure.
    if (this.y > dMax && !this._surfacing && !this._coule) ay += (dMax - this.y) * bandK;
    // Ancrage à RAYON DE CONFORT : le rappel ne s'exerce qu'au-delà du rayon,
    // sinon tout le monde converge sur le même point et s'empile autour de
    // l'anémone. À l'intérieur, chacun vaque librement.
    // Le rappel vers l'anémone est suspendu pendant une chatouille : sinon le
    // clown est retenu en laisse et n'atteint jamais sa victime.
    if (def.movement === 'anchored' && !this._tickleTarget) {
      // L'HÔTE EST UNE VRAIE RÉFÉRENCE, pas une copie de coordonnées. L'ancre
      // était figée à la position du refuge le jour du spawn : un clown né
      // d'une ponte, ou arrivé par immigration, restait ancré à un point d'eau
      // vide et ne rejoignait jamais aucune anémone.
      if (def.anchorToRefuge) {
        if (!this._hote || this._hote.dead) {
          this._hoteCd = (this._hoteCd ?? 0) - dt;
          if (this._hoteCd <= 0) {                 // recherche rare : elle balaie tout
            this._hoteCd = 4;
            this._hote = Ecosystem.nearestRefuge(this.x, this.y);
          }
        }
        if (this._hote) {
          this.anchorX = this._hote.x;
          this.anchorY = this._hote.y - this._hote.size * 0.35;
        }
      }
      // DEDANS pour dormir, autour le reste du temps. Le rayon de confort se
      // referme la nuit : sinon le clown passe la nuit à 120 px de son anémone,
      // en pleine eau — c'est-à-dire loin de la seule chose qui le protège.
      const dedans = this.state === 'sleep';
      this.tetherVers(dedans ? this.size * 0.5 : (def.homeRadius ?? 120), dedans ? 3.4 : 2.2);
    }
    // Alevin né près d'une anémone (GDD §9) : reste à proximité de son refuge
    if (this._refugeAnchored && this.stage === 'fry') this.tetherVers(190, 1.4);
    // Reversement des contributions steerVers/tetherVers accumulées plus haut
    ax += this._axAcc; ay += this._ayAcc;
    // Cible verticale ponctuelle générique (ex. cycle de plongée du Cachalot via
    // def.gag). Suspendue en chasse : sinon le Cachalot est tiré vers les abysses
    // pendant qu'il poursuit un poulpe et ne l'attrape jamais.
    // La replongée garde son rappel MÊME en chasse : elle est courte, proche de
    // la surface, et la proie est de toute façon plus bas — sans ça un
    // prédateur qui repartait en chasse le dos hors de l'eau y restait pendu
    // jusqu'au garde-fou, qui le claquait sous l'eau d'un coup.
    if (this._diveTargetY != null && (this.state !== 'hunt' || this._replonge)) {
      const dy = this._diveTargetY - this.y;                 // négatif en montée
      if (this._surfacing) {
        maxSpeed = Math.max(maxSpeed, def.speed * 1.6);
        // Une remontée SE NAGE, en oblique. Le rappel proportionnel seul est
        // un ascenseur : loin de la cible ay explose et la composante
        // horizontale n'existe pas — le cétacé montait en ligne droite. On
        // vise donc une VITESSE de croisière (~50° loin de la surface, qui
        // s'aplatit en approchant), et la croisière horizontale reste pendant
        // le souffle : elle longe la surface au lieu de faire du surplace.
        const cap = this._surfDir ?? (this._facing < 0 ? -1 : 1);
        ax += (cap * def.speed * 1.1 - this.vx) * 3;
        const k = U.clamp(-dy / (this.size * 3), 0, 1);
        if (k > 0.12) ay += (-def.speed * 1.3 * k - this.vy) * 3;
        else ay += dy * 1.6;
      } else {
        // La replongée est tirée un peu plus fort que le rappel générique :
        // c'est un plongeon, pas une dérive — et elle a droit à sa vitesse de
        // croisière pleine (l'errance bride maxSpeed, et une baleine bridée ne
        // couvrait pas la descente avant le garde-fou).
        ay += dy * (this._replonge ? 1.0 : 0.4);
        if (this._replonge) maxSpeed = Math.max(maxSpeed, def.speed);
      }
    }
    // Tirant d'eau : une créature ne va pas là où la colonne d'eau est plus
    // basse qu'elle. Sans ça les baleines venaient s'échouer sur le haut-fond.
    const tirant = this.size * 2.2;
    const colonne = fondY - CONFIG.SURFACE_Y;
    if (colonne < tirant) {
      const versLeLarge = World.floorY(this.x + 60) > World.floorY(this.x - 60) ? 1 : -1;
      ax += versLeLarge * (tirant - colonne) * 1.6;
      ay -= 20;                                    // et elle remonte un peu
    }
    // Garde au sol : un colosse ne racle pas le sable. Il garde toujours une
    // demi-longueur d'eau sous le ventre — sauf en remontee pour respirer,
    // ou seule la surface compte.
    if (def.size >= 70 && !this._surfacing) {
      const garde = fondY - this.size * 1.5;
      if (this.y > garde) { ay += (garde - this.y) * 3; this.vy = Math.min(this.vy, 0); }
    }

    // PLAFOND DUR de la surface. Le rappel de bande n'est qu'une accélération :
    // un banc qui prend peur la franchit et se retrouve EN L'AIR au-dessus de
    // l'eau (mesuré : 6,9 % du temps pour les sardines et les confettis).
    // Les sauteurs (poisson volant, sardine) et les cétacés en train de
    // respirer en sont évidemment exemptés — et aussi pendant leur REPLONGÉE :
    // réappliquer le plafond dès la fin du souffle les téléportait de « dos
    // hors de l'eau » à « entièrement immergés » en une frame.
    if (!def.aerial && !def.jumps && !this._surfacing && !this._replonge
        && this.jumpState !== 'air' && !this._plage) {
      const plafond = CONFIG.SURFACE_Y + this.size * 0.7;
      if (this.y < plafond) { this.y = plafond; this.vy = Math.max(this.vy, 0); }
    } else if ((this._surfacing || this._replonge) && !this._plage) {
      // PERCÉE BORNÉE : le dos sort de l'eau, le corps ne DÉCOLLE jamais.
      // L'exemption de plafond laissait s'accumuler l'inertie d'un rapide
      // (le dauphin croise sa cible à 130 px/s) et les poussées extérieures
      // (séparation de colosses) : mesuré, une baleine à 220 px AU-DESSUS de
      // la ligne d'eau. Borne continue, donc jamais de claquement.
      const percee = CONFIG.SURFACE_Y - this.size * 0.25;
      if (this.y < percee) { this.y = percee; this.vy = Math.max(this.vy, 0); }
    }

    // bords du monde + rivage de la plage
    const shoreX = World.shoreX;
    // Pour un colosse le rappel par accélération ne suffit pas : lancé, il
    // traverse quand même et vient s'échouer sur le sable. On lui pose une
    // BARRIÈRE DURE au x où la colonne d'eau atteint enfin son tirant.
    if (def.size >= 70) {
      const limite = this.limiteLarge();
      if (this.x < limite) {
        this.x = limite;
        this.vx = Math.max(this.vx, 0);             // on tue la vitesse vers la côte
        ax += 400;
      }
    }
    // Barrière dure au rivage pour TOUT nageur, à sa propre échelle : le rappel
    // par accélération se franchit quand un banc paniqué file vers la plage.
    // La tortue qui monte pondre franchit sa propre barrière : c'est tout
    // l'intérêt. Le reste du temps elle est tenue TRÈS au large (`offshore`).
    // RAPPEL SOUPLE VERS SA ZONE. Une créature hors de sa bande horizontale est
    // ramenée par une accélération proportionnelle au dépassement, jamais par un
    // mur : elle peut en sortir pour chasser ou fuir, mais elle rentre toujours.
    // C'est ce qui répartit les espèces de gauche à droite au lieu de les
    // laisser toutes converger vers le rivage.
    if (!def.aerial && def.movement !== 'fixed' && def.movement !== 'crawl' && !this._plage) {
      const [zx0, zx1] = this.bandeX();
      // En chasse et en fuite, le rappel est très assoupli : on ne veut pas
      // qu'un prédateur lâche sa proie parce qu'il sort de sa zone.
      const k = (this.state === 'hunt' || this.state === 'flee') ? 0.25 : 1.1;
      if (this.x < zx0) ax += (zx0 - this.x) * k;
      else if (this.x > zx1) ax += (zx1 - this.x) * k;
    }

    // La tortue qui MONTE PONDRE franchit sa propre barrière — pendant la
    // migration comme pendant la scène de plage. Sans l'exemption en migration
    // elle restait bloquée à 1200 px d'eau, c'est-à-dire à 1500 px du rivage,
    // et la ponte terrestre ne se déclenchait jamais.
    const montePondre = def.ponteTerrestre && (this._plage || this.state === 'migrate');
    if (!def.aerial && def.movement !== 'crawl' && !montePondre) {
      // CHACUN SA DISTANCE AU MUR. Un `clamp` commun pose tous ceux qui le
      // touchent exactement sur le même x : un banc poussé par un prédateur s'y
      // empile en colonne, et la barrière se lit comme une vitre. Le décalage
      // est stable (tiré de l'identifiant), donc personne ne glisse le long.
      const bord = this.limiteLarge() + (this.id % 7) * 26;
      if (this.x < bord) { this.x = bord; this.vx = Math.max(this.vx, 0); ax += 250; }
    }
    if (this.x < shoreX + 100 && !montePondre) ax += (shoreX + 100 - this.x) * 2;
    if (this.x > CONFIG.WORLD_WIDTH - 100) ax += (CONFIG.WORLD_WIDTH - 100 - this.x) * 2;

    // Intégration
    this.vx += ax * dt; this.vy += ay * dt;
    // Il mâche : il s'arrête net le temps d'avaler
    if (this._chew > 0) { this.vx *= 0.82; this.vy *= 0.82; maxSpeed = def.speed * 0.12; }
    // Scène de gag en cours (bisou, farce…) : les protagonistes cessent de nager,
    // sinon la mimique passe inaperçue parce qu'ils continuent leur route.
    if (this._freeze > 0) { this.vx *= 0.7; this.vy *= 0.7; maxSpeed = def.speed * 0.06; }
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > maxSpeed) { this.vx *= maxSpeed / sp; this.vy *= maxSpeed / sp; }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.speedNow = sp;

    // Collision avec le fond → nuage de sable (socle réutilisable, GDD §3)
    const fy = World.floorY(this.x);
    if (this.y > fy - this.size * 0.5) {
      this.y = fy - this.size * 0.5;
      // Percuter le sable en pleine charge assomme : c'est le gag du Requin
      // Dents-Molles, mais la règle vaut pour tout le monde.
      // Seule une VRAIE charge assomme (un simple plongeon ne suffit pas)
      if (this.vy > 300 && def.movement !== 'crawl' && def.movement !== 'fixed') this.assomme(fy);
      // Le bus des règles : « collision : sol », avec la vitesse d'impact —
      // c'est le `si.vitesseMin` de la règle qui sépare le vrai plantage du
      // frôlement (ce contact-ci se joue des centaines de fois par minute).
      this.evenement('collision', { avec: 'sol', vitesse: sp });
      this.vy = Math.min(0, this.vy);
      // UN NUAGE PAR SECONDE AU PLUS. Il partait à CHAQUE frame passée contre
      // le sable à plus de 100 px/s : 953 nuages/min, le deuxième émetteur du
      // jeu, et un banc qui longe le fond en faisait un mur opaque.
      this._sableCd = (this._sableCd ?? 0) - dt;
      if (sp > 100 && this._sableCd <= 0) {
        this._sableCd = U.rand(0.8, 1.6);
        Particles.sandCloud(this.x, fy - 4, this.size > 30);
      }
    }

    // Orientation
    if (sp > 5) this.angle = U.angleLerp(this.angle, Math.atan2(this.vy, this.vx * 0.4), dt * 5);
  }

  // LA GRANDE SCÈNE DE LA MORT (décision d'auteur : TOUTES les morts). Si le
  // dessin a une scène ou un clip « mort », le corps se fige le temps de le
  // jouer — yeux en X, petite âme, ce qu'on aura dessiné — puis meurt pour de
  // bon. `mangee` : c'est le prédateur qui conclura (cf. Ecosystem.eat).
  agonise(mangee) {
    const sp = (this.def.sprite && typeof Sprites !== 'undefined') ? Sprites.get(this.def.sprite) : null;
    if (!sp) return false;
    let nom = null;
    for (const r of (sp.scenes || [])) {
      const typeR = typeof r.si === 'string' ? r.si : r.quand;
      if (typeR === 'mort' && r.jouer) { nom = r.jouer; break; }
    }
    if (!nom && Sprites.clipDe(sp, 'mort')) nom = 'mort';
    if (!nom) return false;
    const clip = Sprites.clipDe(sp, nom);
    if (!clip || !clip.cles || !clip.cles.length) return false;
    // La mort passe avant toute animation en cours, et sa durée est BORNÉE :
    // une agonie de dix secondes bloquerait un prédateur tout ce temps.
    this._anime = { nom, t0: null, deEtat: false };
    this._agonie = U.clamp(clip.cles[clip.cles.length - 1].t + 0.15, 0.5, 2.5);
    this._agonieMangee = !!mangee;
    this.target = null; this._faceAt = null;
    return true;
  }

  die() {
    if (this.dead) return;
    if (!this._mortJouee && this._agonie == null && this.agonise(false)) return;
    this.dead = true;
    if (this.stage === 'adult' || this.stage === 'fry') {
      // UNE seule arête, mise à l'échelle du poisson : trois petites arêtes
      // identiques ne disaient pas si c'était une sardine ou un cachalot.
      Food.addBone(this.x, this.y, U.clamp(this.size / 16, 0.7, 4.5));
      Particles.bones(this.x, this.y);
    }
  }

  // RETOURNEMENT ANIMÉ : au lieu de basculer d'un coup de `scale(1,1)` à
  // `scale(-1,1)`, le poisson passe par toutes les valeurs intermédiaires — il
  // se met de profil, disparaît une fraction de seconde dans sa propre
  // épaisseur, et ressort dans l'autre sens. C'est ce demi-tour qui manquait :
  // le miroir instantané se lisait comme un défaut d'affichage.
  //
  // ATTENTION — c'est ici que se rejoue le bug de « la baleine qui clignote ».
  // L'hystérésis sur `flipAt` ne suffit PAS : le vx d'un colosse traîne autour
  // de zéro, `_facing` rebascule avant la fin du demi-tour précédent, et au
  // lieu d'un clignotement à peine visible on obtient une baleine qui TOURNE SUR
  // PLACE en continu, coincée de profil. D'où deux verrous en plus du seuil :
  //   1. un demi-tour commencé s'achève — aucun nouveau sens n'est accepté tant
  //      que `_flipX` n'a pas rejoint `_facing` ;
  //   2. le nouveau sens doit être TENU un certain temps avant d'être validé,
  //      d'autant plus longtemps que l'animal est gros (une baleine ne fait pas
  //      volte-face sur un coup de nageoire).
  // `_faceAt` (viser quelqu'un : bisou, farce) court-circuite la patience :
  // c'est une intention, pas une dérive de vitesse.
  orientation(dirX, t) {
    const ecart = t - (this._flipT ?? t);
    this._flipT = t;
    const flipAt = Math.max(6, this.def.size >= 45 ? this.def.speed * 0.5 : this.def.speed * 0.25);
    if (this._facing === undefined) this._facing = dirX < 0 ? -1 : 1;

    // Hors champ, `draw` n'est pas appelé : au retour, le poisson se pose
    // directement dans son sens actuel au lieu de faire un demi-tour fantôme
    // sous les yeux du joueur qui vient de le retrouver.
    if (this._flipX === undefined || ecart > 0.25) {
      if (dirX > flipAt) this._facing = 1; else if (dirX < -flipAt) this._facing = -1;
      this._flipX = this._facing;
      this._vir = 0;                 // posé à plat : aucune déformation de virage
      return this._facing;
    }
    const dt = U.clamp(ecart, 0, 0.05);

    // --- 1. Le sens VOULU
    let veut = this._facing;
    if (dirX > flipAt) veut = 1; else if (dirX < -flipAt) veut = -1;
    if (veut !== this._facing && this._flipX === this._facing) {
      // LA PATIENCE PROTÈGE DE L'HÉSITATION, PAS DE LA DÉCISION.
      // Elle existe pour que la baleine ne pivote pas sur place quand son `vx`
      // traîne autour de zéro. Mais appliquée telle quelle à une intention
      // FRANCHE — un requin qui repart chercher une proie derrière lui — elle
      // le faisait nager à reculons pendant une seconde entière : mesuré,
      // 21 % du temps pour un gros poisson, jusqu'à 3,8 fois sa vitesse.
      //
      // Elle cède donc d'autant plus vite que la volonté est nette. Le cas
      // « hésitation » (dirX à peine au-dessus du seuil) garde toute sa
      // patience ; le cas « il fonce dans l'autre sens » ne garde presque rien.
      // LES COLOSSES EN SONT EXCLUS, et c'est mesuré : la patience a été écrite
      // pour eux (une baleine coincée de profil, qui pivote sur place en
      // continu), et la leur remettre doublait leurs demi-tours — 1,6 à
      // 3,2 par minute pour la Baleine Gros Dodo — pour un gain quasi nul sur
      // la marche arrière (3,3 % → 2,8 %). Sous le seuil, en revanche, le gain
      // est franc : un poisson moyen passe de 2,7 % à 1,3 %, un petit de 2,2 %
      // à 0,7 %. La marge décroît quand même avec le gabarit à l'intérieur de
      // la plage, pour qu'il n'y ait pas de marche à 70.
      const franchise = U.clamp(Math.abs(dirX) / (flipAt * 4), 0, 1);
      const marge = this.def.size >= 70 ? 0
                  : Entity.PATIENCE_REMISE * U.clamp(1 - this.def.size / 90, 0.25, 1);
      const patience = this._faceAt ? 0
                     : (0.2 + Math.min(1, this.def.size / 90)) * (1 - franchise * marge);
      this._flipHold = (this._flipHold ?? 0) + dt;
      if (this._flipHold >= patience) { this._facing = veut; this._flipHold = 0; }
    } else if (veut === this._facing) this._flipHold = 0;

    // --- 2. Le demi-tour lui-même. Un colosse ne pivote pas comme un alevin :
    // la durée suit le gabarit (~0,26 s pour un confetti, ~0,9 s pour une baleine).
    const duree = 0.26 + Math.min(0.65, this.def.size / 220);
    const pas = dt * 2 / duree;
    const avant = this._flipX;
    if (this._flipX < this._facing) this._flipX = Math.min(this._facing, this._flipX + pas);
    else if (this._flipX > this._facing) this._flipX = Math.max(this._facing, this._flipX - pas);
    if (this._flipX !== avant) this._virSens = Math.sign(this._flipX - avant);

    // UNE FEUILLE QUI S'ENROULE, PAS UNE PAGE QU'ON TOURNE.
    //
    // L'ancienne version écrasait la silhouette jusqu'à 5 % de sa largeur : le
    // poisson devenait un trait, disparaissait une frame ou deux, et
    // réapparaissait miroité. C'est ça qu'on lisait comme un « flip brutal » —
    // pas la vitesse du demi-tour, mais le passage par le néant.
    //
    // Une feuille qui s'enroule ne disparaît jamais : elle se met de trois
    // quarts, et c'est la COURBURE qui raconte la rotation. On ne descend donc
    // plus sous `LARGEUR_MIN` (un tiers), et le reste du virage est porté par
    // l'arc et le roulis, posés dans `draw` à partir de `_vir`.
    //
    // `_vir` monte à 1 au milieu du virage et redescend — mais en `smoothstep`
    // du sinus, pour que la déformation s'installe et se retire en douceur au
    // lieu de suivre linéairement le pivotement.
    const u = Math.sin(this._flipX * Math.PI / 2);       // -1 → 1, adouci aux bouts
    const brut = 1 - Math.abs(u);
    this._vir = brut * brut * (3 - 2 * brut);
    const LARGEUR_MIN = 0.34;
    return (u < 0 ? -1 : 1) * U.lerp(LARGEUR_MIN, 1, Math.abs(u));
  }

  draw(ctx, t) {
    const sx = Camera.sx(this.x), sy = Camera.sy(this.y);
    ctx.save();
    ctx.translate(sx, sy);

    // Dans la main du joueur (halo + gigotement HORIZONTAL), ou colosse qui
    // secoue la tête devant un poids qu'on ne lui retirera pas (cf. saisie.js).
    if (this._saisi || this._secousseFin > t) Saisie.deformer(ctx, this, t);

    // Trop nourri : il tremble de plus en plus fort à mesure qu'il approche
    // du point de rupture. C'est l'avertissement avant le BOUM.
    if (this._gonfle > 0) {
      const a = this._gonfle * this.size * 0.07;
      ctx.translate(Math.sin(t * 47 + this.phase) * a, Math.cos(t * 41 + this.phase) * a);
    }

    if (this.stage === 'egg') {
      const wob = Math.sin(t * 8 + this.phase) * (this.stateTimer > 12 ? 2 : 0.5);
      // halo doux pour repérer les œufs dans le décor
      ctx.fillStyle = 'rgba(255,250,220,0.25)';
      ctx.beginPath(); ctx.arc(wob, 0, 14 + Math.sin(t * 2 + this.phase) * 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,214,0.95)';
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(wob, 0, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,160,80,0.9)';
      ctx.beginPath(); ctx.arc(wob + 1.5, 1.5, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // Sens de nage : hystérésis, verrous anti-oscillation et demi-tour animé
    // sont tous dans `orientation()`.
    // Orientation forcée vers un point (bisou) : à l'arrêt, la vitesse ne dit
    // plus où le poisson regarde, il faut viser explicitement.
    let dirX = this.vx, dirY = this.vy;
    if (this._faceAt) { dirX = (this._faceAt.x - this.x) * 4; dirY = (this._faceAt.y - this.y) * 4; }
    // Tenu à la main : on le promène, on ne le met pas la tête en bas.
    if (this._saisi) dirY *= 0.3;
    const flipX = this.orientation(dirX, t);

    // Créatures posées sur le fond : elles épousent la pente du sable, comme le
    // décor. Sans ça un ver-tapis ou une étoile paraît penché dans le vide.
    if (GROUND_RENDERS.has(this.def.render)) {
      ctx.rotate(Math.atan(World.slopeAt(this.x)));   // rotation AVANT le miroir
      // Perspective pauvre mais efficace : plus la creature est loin dans la
      // bande de sable, plus elle est petite. Sans ca l'etalement se lit comme
      // un decalage vertical bizarre au lieu d'une profondeur.
      if (this._sable) ctx.scale(1 - this._sable / 420, 1 - this._sable / 420);
      ctx.scale(flipX, 1);
      FishBody.draw(ctx, this, t);
      ctx.restore();
      return;
    }
    // Inclinaison selon la montée/descente, lissée et BORNÉE : sans limite, un
    // gros animal qui monte à la verticale se retrouvait presque sur la tête.
    // Chatouillé : il frissonne mais ne bascule pas — il se retrouvait la tête
    // en bas à force de secousses verticales.
    // La bride est GRADUÉE par le gabarit, et CONTINUE plutôt qu'en paliers : un
    // confetti peut piquer du nez, un barracuda de 40 penché à 43° se lit déjà
    // comme un poisson mort — et avec des seuils, le Thon (26) tombait du bon
    // côté du palier « moyen » et gardait la bride des petits poissons.
    const gab = this.def.size;
    const maxTilt = this.expression === 'laughing' ? 0.18
                  : U.clamp(0.95 - gab * 0.0095, 0.26, 0.75);
    let tilt;
    if (this._faceAt) {
      // Orientation FRANCHE vers la cible : peu d'amortissement, sinon un
      // poisson placé au-dessus de sa victime pointe en oblique au lieu de
      // piquer vers elle (le bisou du clown paraissait de travers).
      // Franche, mais pas VERTICALE : la même bride de gabarit s'applique, en
      // plus large. Sans elle, un requin arrêté à la station de nettoyage se
      // dressait sur la queue pour regarder le Poisson Dentiste qui flottait
      // au-dessus de lui — c'est ça, « les requins à la verticale ».
      const visee = U.clamp(1.7 - gab * 0.045, 0.32, 1.4);
      tilt = U.clamp(Math.atan2(dirY, Math.abs(dirX)), -visee, visee);
    } else {
      tilt = U.clamp(Math.atan2(dirY, Math.abs(dirX) + 40) * 0.5, -maxTilt, maxTilt);
    }
    // Une créature fixe ne bascule jamais : sinon le rocher de la murène, dessiné
    // dans son repère, se retrouve penché ou à l'envers.
    if (this.def.movement === 'fixed') tilt = 0;
    // GALIPETTE (GAGS.dauphin) : en l'air l'angle est PILOTÉ par la scène —
    // celui de la trajectoire plus les tours de la vrille, cumulés sans jamais
    // être ramenés dans ±π (un lissage et une bride casseraient la rotation :
    // la tête en bas est ici voulue). Posé tel quel : `tilt` s'applique dans
    // le repère MIROITÉ, donc une valeur croissante fait plonger le nez vers
    // l'avant du bond, à droite comme à gauche.
    if (this._galAng != null) this._tilt = tilt = this._galAng;
    else this._tilt = U.lerp(this._tilt ?? tilt, tilt, this._faceAt ? 0.25 : 0.08);
    // `_tilt` est calculé sur |dirX| : c'est déjà l'angle « non miroité ». Il
    // s'applique donc TEL QUEL dans les deux cas. Avec un signe inversé (l'ancien
    // code), un poisson tourné à gauche s'inclinait à l'envers — visible dès que
    // l'angle devient franc, comme pour le bisou du clown.
    ctx.scale(flipX, 1);
    ctx.rotate(this._tilt);
    // DEMI-TOUR : squash & stretch. Comprimer la silhouette en x et rien
    // d'autre, c'est une feuille de papier qu'on tourne sur la tranche — elle
    // s'amincit jusqu'à disparaître. Un vrai virage conserve le volume : ce que
    // le corps perd en largeur, il le reprend en hauteur, et la queue traîne
    // derrière la tête avant de fouetter dans le nouveau sens.
    //
    // Les deux déformations sont posées APRÈS la rotation, donc dans le repère
    // du CORPS : le cisaillement décale bien la queue par rapport à la tête, et
    // pas le bas du poisson par rapport au haut. Son signe s'inverse tout seul
    // avec le miroir, au moment précis où la silhouette est sur la tranche —
    // c'est ce qui fait lire un coup de queue continu et non un à-coup.
    const vir = this._vir ?? 0;           // 0 en ligne droite, 1 au plus fort du virage
    if (vir > 0.01) {
      // L'ARC : la queue traîne derrière la tête et le corps se creuse en C,
      // comme une feuille qui s'enroule. C'est un cisaillement en y le long de
      // l'axe du corps — posé APRÈS la rotation, donc dans le repère du CORPS,
      // sinon c'est le bas du poisson qui glisse par rapport au haut. Son signe
      // s'inverse tout seul avec le miroir, au moment précis où la silhouette
      // est de trois quarts : c'est ce qui fait lire un coup de queue continu.
      ctx.transform(1, vir * 0.62, 0, 1, 0, 0);
      // Le VOLUME : ce que le corps perd en largeur, il le reprend en hauteur.
      // Sans ça il maigrit au lieu de tourner.
      ctx.scale(1, 1 + vir * 0.34);
      // Le ROULIS : il s'incline dans son virage, comme tout ce qui tourne
      // vite. Léger — c'est la touche qui empêche la déformation de paraître
      // plate — et dans le sens du virage, d'où `_virSens`.
      ctx.rotate(vir * 0.22 * (this._virSens ?? 1));
    }
    // CODES DU CARTOON — deux canaux de déformation que les gags pilotent,
    // posés dans le repère du CORPS et à volume conservé (même leçon que le
    // demi-tour : ce que la silhouette perd dans un axe, elle le reprend dans
    // l'autre, sinon elle maigrit au lieu de se déformer) :
    //   `_crispe` (0→1) = l'ANTICIPATION. Le ressort se comprime : squash, arc,
    //     et un frisson HORIZONTAL qui monte avec la compression (jamais
    //     vertical — un tremblement en y met la tête en bas). C'est lui qui
    //     fait lire la détente qui suit : la vitesse ne se lit qu'au contraste.
    //   `_etire` (0→1) = la DÉTENTE. La flèche : étirement, et la nage se
    //     RAIDIT (`FishBody.raideur`) — « droit comme un i ».
    // Ces canaux sont réservés aux GAGS : la nage ordinaire, même en sprint,
    // ne déforme rien et ne calcule rien — une version « automatique au
    // sprint » a été essayée puis RETIRÉE (elle décorait la locomotion, pas
    // les scènes, et 8 % de l'aquarium smearait en permanence pour rien).
    // Le détail des canaux (cabré `_crispe`, flèche `_etire`, gelée d'un choc,
    // accordéon du crash) et les traînées du smear sont FACTORISÉS dans
    // `FishBody.deformationScene` et `FishBody.smear` : l'atelier (vue Scènes)
    // applique exactement les mêmes — deux copies divergeraient au premier
    // réglage.
    if (this._saiyan) Saiyan.aura(ctx, this, t);       // derrière le corps
    FishBody.deformationScene(ctx, this, t);
    // Le dauphin se tord de rire : il roule sur lui-même
    if (this._farceRoll) ctx.rotate(Math.sin(this._farceRoll) * 0.5);
    FishBody.smear(ctx, this, t);
    // `rendreScene` plie le corps par tranches quand la pose le demande
    // (cabré en arc de cercle, tête froissée du crash), sinon dessin direct.
    FishBody.rendreScene(ctx, this, t);
    if (this._saiyan) Saiyan.crete(ctx, this, t);      // par-dessus le crâne
    ctx.restore();
  }
}

// Le compteur de frames de la simulation, avancé par `Ecosystem.update` : il
// date les mémos par frame (`size`) et fait tourner l'échantillon des grands
// bancs. Il reste à 0 hors jeu — l'atelier ne charge pas l'écosystème.
Entity.frame = 0;
// Au-delà, un poisson n'examine plus qu'un échantillon de son banc (cf. boids).
// Un banc normal va jusqu’à une cinquantaine de poissons : il reste en calcul exact.
Entity.BANC_ECHANTILLON = 60;
