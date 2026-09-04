// Entité créature : boids contraints par type de liberté (GDD §5), faim,
// expressions, cycle de vie (GDD §7).

let ENTITY_ID = 0;

// Silhouettes qui reposent sur le sable : elles suivent la pente du fond
// (la murène n'y est pas : seul SON ROCHER suit la pente, cf. drawEel)
const GROUND_RENDERS = new Set(['worm', 'crab', 'shell', 'star', 'anemone']);

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
    // Les poissons grandissent toute leur vie : un vieux est sensiblement plus
    // gros qu'un jeune adulte, sans avoir été gavé pour autant.
    const vieillesse = U.lerp(0.9, 1.12, U.clamp(this.age / this.maxAge, 0, 1));
    return this.def.size * this.growth * this.gabarit * vieillesse;
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

  // Effets qui accompagnent l'émotion (le visage seul ne suffit pas à la lire).
  // Throttlés : sans ça, un banc entier qui prend peur affiche 20 bulles d'un coup.
  emoteVFX(expr) {
    if ((this._vfxCd ?? 0) > 0) return;
    // les réactions de groupe (peur, régal) ne s'affichent que sur quelques individus
    if ((expr === 'scared' || expr === 'eating') && Math.random() > 0.1) return;
    this._vfxCd = U.rand(2.5, 5);
    const x = this.x, y = this.y - this.size * 1.1, s = this.size;
    switch (expr) {
      case 'scared': Particles.comic(x, y, '!'); Particles.burst(x, y, '#bfe6ff', 5); break;
      case 'happy': Particles.sparkles(x, y, 5); break;
      case 'love': Particles.loveBurst(x, y, 3); break;
      case 'dizzy': Particles.stars(x, y); Particles.spin(x, y, s); break;
      case 'blush':
      case 'ashamed': Particles.sweat(x + s * 0.5, y); break;
      case 'angry': Particles.anger(x + s * 0.4, y); break;
      case 'eating': Particles.burst(x, y, '#ffe6a8', 3); break;

      case 'disgust': Particles.burst(x, y, '#8fbf6a', 5); break;
      case 'surprise': Particles.burst(x, y, '#ffffff', 6); break;
      case 'wink': Particles.sparkles(x, y, 3); break;
      case 'sad': Particles.sweat(x + s * 0.4, y); break;
    }
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
    const broute = this.def.grazes ?? !(this.def.prey && this.def.prey.length > 1);
    // DISETTE : un carnivore dont TOUTES les proies sont passées sous leur
    // plancher de protection n'a plus rien à chasser. Il se rabat alors sur ce
    // qu'il trouve — assez pour ne pas mourir, jamais assez pour se reproduire.
    // Sans ça, le mécanisme censé éviter les extinctions en cascade en
    // provoquait une par le haut : Orque éteinte et Requin à 1 en 18 min.
    const disette = !broute && Ecosystem.disette(this.def);
    if (broute || disette) {
      const dens = World.planktonAt(this.y);
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
    if (this._freeze > 0) this._freeze -= dt;
    if (this.exprTimer > 0) { this.exprTimer -= dt; if (this.exprTimer <= 0) this.expression = 'idle'; }
    if (this.wet > 0) this.wet = Math.max(0, this.wet - dt);
    if (this._lureT > 0) this._lureT -= dt;      // hypnotisée par une lampe (cf. pecheALaLampe)
    this.stateTimer -= dt;

    this.updateEyeLook();
    // ÉCHOUAGE. Les barrières (plafond de surface, limite au rivage) doivent
    // rendre ce cas rare ; c'est le filet de sécurité, et un vrai destin de
    // poisson : hors de l'eau, il frétille de plus en plus faiblement, puis
    // meurt. Sauteurs et volants en sont exclus, c'est leur métier.
    if (!this.def.aerial && !this.def.jumps && this.jumpState !== 'air'
        && !this._surfacing && this.def.movement !== 'crawl' && this.def.movement !== 'fixed') {
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
      // ZzZzZ qui s'envolent au rythme du ronflement
      this._zzzCd = (this._zzzCd ?? 0) - dt;
      if (this._zzzCd <= 0) {
        this._zzzCd = U.rand(1.1, 2.2);
        Particles.zzz(this.x + this.size * 0.7, this.y - this.size * 0.9, this.size);
      }
      if (def.snores && Math.random() < dt * 0.7) Particles.bubble(this.x + this.size * 0.8, this.y, U.rand(4, 9));
      if (this.stateTimer <= 0) { this.state = 'wander'; this.release(); }
      return;
    }
    if (def.sleeps && this.state === 'wander' && Math.random() < dt * 0.01) {
      this.state = 'sleep'; this.stateTimer = U.rand(12, 25); return;
    }
    // La nuit, l'aquarium s'endort (GDD §10). Seuls les nocturnes et les
    // embusqués veillent. Avant, seul le niveau 2 dormait : on ne voyait
    // presque personne s'assoupir.
    if (!def.sleeps && !def.nocturnal && !def.ambush && Main.nightAmount() > 0.55
        && Math.random() < dt * 0.06) {
      this.state = 'sleep'; this.stateTimer = U.rand(12, 30); return;
    }

    // Fuite (prioritaire) — petits poissons fuient curseur rapide et prédateurs.
    // Plus d'exemption pour les charognards : `nearestPredatorOf` ne renvoie une
    // menace que si elle a VRAIMENT l'espèce à son menu, donc le crabe (que
    // personne ne mange) n'a jamais rien à craindre — alors que le Poulpe
    // Ninja, charognard mais proie du Cachalot ET du Calamar Géant, ne prenait
    // jamais peur. Il n'y échappait que par son encre.
    const threat = Ecosystem.nearestPredatorOf(this);
    if (threat) {
      this.state = 'flee'; this.target = threat; this.stateTimer = 1.5;
      this.emote('scared', 1.6);
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
    if (def.prey && !def.lure && this.hunger > 0.45 && this.state !== 'hunt') {
      const prey = Ecosystem.nearestPreyFor(this);
      if (prey) {
        this.state = 'hunt'; this.target = prey; this.stateTimer = 8;
        this.emote('angry', 2.5);   // sourcils froncés + veine : on voit qu'il chasse
      }
    }
    if (this.state === 'hunt') {
      const p = this.target;
      // Le filtreur avale tout ce qui entre dans sa bouche : rayon large
      const reach = (this.size + p.size) ** 2 * (def.filterFeeder ? 2.2 : 0.6);
      if (!p || p.dead || this.stateTimer <= 0) { this.state = 'wander'; this.target = null; }
      else if (U.dist2(this.x, this.y, p.x, p.y) < reach) {
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
          if (def.aerial) {
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
      if (def.eatsFood && this.hunger > 0.4) {
        const c = Food.nearestPoop(this.x, this.y, 220);
        if (c) {
          this.state = 'seekFood'; this.targetFood = c; this.targetIsBone = false;
          if (U.dist2(this.x, this.y, c.x, c.y) < (this.size + 8) ** 2) {
            Food.removePoop(c);
            this.malaise(1, c.x, c.y);
            this.state = 'wander'; this.targetFood = null;
          }
          return;
        }
      }
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
    // La reproduction ne se déclenche plus en mangeant : il faut RENCONTRER
    // un partenaire lui aussi bien nourri (cf. tryMate).
  }

  // Portion de littoral où un rampant a le droit de se traîner : celle dont le
  // FOND tombe dans sa bande de profondeur. Calculée une fois — le relief ne
  // change pas. Le crabe ([0, 99999]) obtient tout le monde, comme avant.
  bornesReptation() {
    // Mémoïsé sur la FICHE D'ESPÈCE : le résultat ne dépend que de def
    // (depthBand) et le relief ne change pas — le cache par individu refaisait
    // le même balayage pour chacun des ~490 animaux.
    if (this.def._bornesRep) return this.def._bornesRep;
    const [dMin, dMax] = this.def.depthBand;
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
  limiteLarge() {
    // Mémoïsé sur la FICHE D'ESPÈCE (ne dépend que de def.offshore/def.size et
    // du relief, qui ne change pas) : ~490 balayages du relief → 27.
    if (this.def._limiteLarge != null) return this.def._limiteLarge;
    // Les colosses gardent une marge confortable ; pour les autres, il suffit
    // qu'ils tiennent dans la colonne d'eau sans racler ni dépasser. Une espèce
    // peut exiger davantage (`offshore`) : les petits nageurs de surface tiennent
    // dans 30 px d'eau, donc leur barrière tombait littéralement dans le ressac.
    const besoin = Math.max(this.def.offshore ?? 0,
                            this.def.size * (this.def.size >= 70 ? 2.6 : 2.2));
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
    for (let i = 0; i < 3; i++) Food.addBone(this.x + U.rand(-40, 40), this.y + U.rand(-25, 25));
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

  // Choc : il part en vrille, voit des étoiles et reste sonné un moment.
  assomme(solY = null) {
    if (this.state === 'dizzy') return;
    this.state = 'dizzy'; this.stateTimer = U.rand(2.5, 4);
    this.target = null; this._faceAt = null;
    this.emote('dizzy', 3);
    this.vx *= -0.25; this.vy = -Math.abs(this.vy) * 0.3;
    Particles.burst(this.x, this.y, '#ffe8a8', 8);
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
  // Position de l'évent : sur le dessus du corps, un peu EN ARRIÈRE des yeux.
  // Renvoie des coordonnées monde, en tenant compte du sens de nage.
  event() {
    const dir = this._facing < 0 ? -1 : 1;
    const dorsal = this.size * (this.def.bodyRatio || 0.5);
    return [this.x + dir * this.size * 0.12, this.y - dorsal * 0.95];
  }

  breathe(dt) {
    this._air = (this._air ?? U.rand(8, 25)) - dt;
    // Filet de bulles permanent, échappé de l'évent
    if (Math.random() < dt * 1.2) {
      const [bx, by] = this.event();
      Particles.bubble(bx, by, U.rand(2, 5));
    }

    if (this._air <= 0 && !this._surfacing) {
      this._surfacing = true;
      this._blown = false;
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
      if (Math.random() < dt * 3) Particles.bubble(bx, CONFIG.SURFACE_Y, U.rand(2, 5));
      if (this._surfaceHold <= 0) {
        Particles.splash(this.x);                 // elle replonge
        this._air = U.rand(20, 40) * (this.def.size >= 70 ? 1.5 : 1);
        this._surfacing = false; this._surfaceT = 0; this._surfaceHold = null;
        this._blown = false;
        this._diveTargetY = null;
      }
      return;
    }

    // Pendant la montée : un chapelet de bulles s'échappe de l'évent, ce qui
    // annonce la remontée avant même qu'on voie le dos percer la surface.
    if (by > CONFIG.SURFACE_Y && Math.random() < dt * 6) {
      Particles.bubble(bx + U.rand(-4, 4), by, U.rand(2.5, 6));
    }

    if (by < CONFIG.SURFACE_Y && !this._blown) {
      this._blown = true;
      this._surfaceHold = U.rand(1.4, 2.6);
      Particles.blow(bx, Math.min(by, CONFIG.SURFACE_Y), this.size);
      Particles.splash(this.x);
      Particles.splash(this.x + this.size * 0.5);
      this.emote('happy', 2);
    } else if (this._surfaceT > 25) {
      // Sécurité : s'il n'y arrive vraiment pas (coincé, gêné), on relance le
      // cycle plutôt que de le laisser monter indéfiniment.
      this._surfacing = false; this._surfaceT = 0; this._surfaceHold = null;
      this._blown = false;
      this._air = U.rand(10, 20);
      this._diveTargetY = null;
    }
  }

  // Reproduction (GDD §7) : deux adultes de la même espèce, tous deux bien
  // nourris, qui se croisent → cœurs → 1 à 3 œufs selon leur forme.
  tryMate(dt) {
    if (this.stage !== 'adult' || this.wellFed < 1) return;
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
        this.wellFed = 0; this._mateCd = 30; this._broadcastTried = false;
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
      if (Math.random() < dt * 3) Particles.loveBurst((this.x + p.x) / 2, (this.y + p.y) / 2, 2);

      // Un seul des deux pond, sinon la portée est doublée
      if (this._matingT > 1.6 && this.id < p.id) {
        const forme = (1 - this.hunger) + (1 - p.hunger);     // 0..2
        const eggs = U.clamp(1 + Math.floor(forme * 1.2), 1, 3);
        const mx = (this.x + p.x) / 2, my = (this.y + p.y) / 2;
        Particles.loveBurst(mx, my - this.size * 0.4, 7);
        for (let i = 0; i < eggs; i++) Ecosystem.layEgg(this, mx + U.rand(-12, 12), my);
        this.emote('happy', 2.5); p.emote('happy', 2.5);
        this.endMating(); p.endMating();
      }
      return;
    }

    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead || o._matingWith) continue;
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

  endMating() {
    this.wellFed = 0;
    this._mateCd = 18;          // pas de ponte en rafale
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

    // --- Créatures aériennes (Moustachu Volant) : volent AU-DESSUS de la surface,
    // gérées en y monde direct (pas de depthBand classique). ---
    if (def.aerial) {
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
        // Trop profond : abandonne et remonte, trempé et vexé
        if (this.y > CONFIG.SURFACE_Y + 130) {
          this.state = 'wander'; this.target = null; this.wet = 3;
          Particles.splash(this.x);
        }
      } else {
        // Hors chasse, un oiseau sous l'eau remonte vite (flottabilité)
        if (this.y > CONFIG.SURFACE_Y - 20) ay2 += (bandBot - this.y) * 5;
        if (this.y < bandTop) ay2 += (bandTop - this.y) * 3;
        if (this.y > bandBot) ay2 += (bandBot - this.y) * 3;
      }
      this.vx += ax2 * dt; this.vy += ay2 * dt;
      const sp2 = Math.hypot(this.vx, this.vy);
      if (sp2 > maxSpeed2) { this.vx *= maxSpeed2 / sp2; this.vy *= maxSpeed2 / sp2; }
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.x = U.clamp(this.x, World.shoreX, CONFIG.WORLD_WIDTH - 50);
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
          if (Math.random() < 1 / 3) this.setExpression('dizzy', 1); // plat retentissant, un coup sur trois
        }
        return;
      }
      if (this.state === 'wander' && this.y < CONFIG.SURFACE_Y + def.depthBand[1] * 0.8 && Math.random() < dt * 0.1) {
        this.jumpState = 'air';
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
      dir = dir || (this._crawlDir ?? 0);
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
      const mates = Ecosystem.groupMates(this);
      let cx = 0, cy = 0, avx = 0, avy = 0, sx = 0, sy = 0, n = 0, alarme = 0;
      for (const m of mates) {
        if (m === this) continue;
        const d2 = U.dist2(this.x, this.y, m.x, m.y);
        if (d2 > 340 * 340) continue;
        cx += m.x; cy += m.y; avx += m.vx; avy += m.vy; n++;
        if (d2 < 1600) { sx += (this.x - m.x); sy += (this.y - m.y); }
        if (m.state === 'flee') alarme++;      // la panique se propage de proche en proche
      }
      if (n > 0) {
        ax += ((cx / n) - this.x) * 1.5;       // cohésion
        ay += ((cy / n) - this.y) * 1.5;
        ax += (avx / n - this.vx) * 2.2;       // alignement
        ay += (avy / n - this.vy) * 2.2;
        ax += sx * 4.5; ay += sy * 4.5;        // séparation
        // Assez de voisins affolés : on file avec eux sans avoir vu la menace
        if (alarme > n * 0.25 && this.state === 'wander') {
          maxSpeed = def.speed * 1.8;
          this.emote('scared', 1.2);
        }
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
    let choc = this.speedNow > 280 && this.size < 45 && this.state !== 'dizzy';
    const poussable = !def.filterFeeder && def.size < 70;
    if (choc || poussable) {
    for (const o of Ecosystem.neighbors(this.x, this.y)) {
      if (o === this || o.dead) continue;
      if (choc && o.size >= 45) {
        const contact = o.size * 0.85 + this.size;
        if (U.dist2(this.x, this.y, o.x, o.y) < contact * contact) {
          this.assomme();
          o.emote('surprise', 1.8);
          choc = false;                     // un seul choc, comme l'ancien break
        }
      }
      if (!poussable) continue;
      if (o.def.size >= 70 || o.def.filterFeeder) continue;   // on ne pousse pas un colosse
      // Un DORMEUR ne se fait pas pousser : c'est celui qui passe qui contourne.
      // Sans ça, le moindre thon traversant un banc endormi le dispersait, et
      // les gros labouraient les bancs au repos.
      if (this.state === 'sleep' && o.state !== 'sleep') continue;
      const dortLautre = o.state === 'sleep' && this.state !== 'sleep';
      const minD = (this.size + o.size) * (dortLautre ? 1.5 : 0.95);
      const d2 = U.dist2(this.x, this.y, o.x, o.y);
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
    if (this._lureT > 0 && this.state !== 'flee') {
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
      if (def.sprintSpeed && Math.random() < dt * 2) Particles.wake(this.x - this.size, this.y);
    } else if (this.state === 'flee' && this.target) {
      maxSpeed = def.speed * 2;
      this.steerVers(this.x * 2 - this.target.x, this.y * 2 - this.target.y, maxSpeed, 4);
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
    } else if (this.state === 'migrate' && this._nursery) {
      maxSpeed = def.speed * 1.35;   // en route vers la frayère
      this.steerVers(this._nursery.x, this._nursery.y, maxSpeed, 2.2);
    } else if (this.state === 'sleep') {
      maxSpeed = def.speed * 0.05;
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
    if (this.y > dMax && !this._surfacing) ay += (dMax - this.y) * bandK;
    // Ancrage à RAYON DE CONFORT : le rappel ne s'exerce qu'au-delà du rayon,
    // sinon tout le monde converge sur le même point et s'empile autour de
    // l'anémone. À l'intérieur, chacun vaque librement.
    // Le rappel vers l'anémone est suspendu pendant une chatouille : sinon le
    // clown est retenu en laisse et n'atteint jamais sa victime.
    if (def.movement === 'anchored' && !this._tickleTarget) this.tetherVers(def.homeRadius ?? 120, 2.2);
    // Alevin né près d'une anémone (GDD §9) : reste à proximité de son refuge
    if (this._refugeAnchored && this.stage === 'fry') this.tetherVers(190, 1.4);
    // Reversement des contributions steerVers/tetherVers accumulées plus haut
    ax += this._axAcc; ay += this._ayAcc;
    // Cible verticale ponctuelle générique (ex. cycle de plongée du Cachalot via
    // def.gag). Suspendue en chasse : sinon le Cachalot est tiré vers les abysses
    // pendant qu'il poursuit un poulpe et ne l'attrape jamais.
    if (this._diveTargetY != null && this.state !== 'hunt') {
      ay += (this._diveTargetY - this.y) * (this._surfacing ? 1.6 : 0.4);
      if (this._surfacing) maxSpeed = Math.max(maxSpeed, def.speed * 1.6);
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
    // Les sauteurs (poisson volant, dauphin, orque) et les cétacés en train de
    // respirer en sont évidemment exemptés.
    if (!def.aerial && !def.jumps && !this._surfacing && this.jumpState !== 'air') {
      const plafond = CONFIG.SURFACE_Y + this.size * 0.7;
      if (this.y < plafond) { this.y = plafond; this.vy = Math.max(this.vy, 0); }
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
    if (!def.aerial && def.movement !== 'crawl') {
      const bord = this.limiteLarge();
      if (this.x < bord) { this.x = bord; this.vx = Math.max(this.vx, 0); ax += 250; }
    }
    if (this.x < shoreX + 100) ax += (shoreX + 100 - this.x) * 2;
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
      this.vy = Math.min(0, this.vy);
      if (sp > 100) Particles.sandCloud(this.x, fy - 4, this.size > 30);
    }

    // Orientation
    if (sp > 5) this.angle = U.angleLerp(this.angle, Math.atan2(this.vy, this.vx * 0.4), dt * 5);
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    if (this.stage === 'adult' || this.stage === 'fry') {
      Food.addBone(this.x, this.y);
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
      return this._facing;
    }
    const dt = U.clamp(ecart, 0, 0.05);

    // --- 1. Le sens VOULU
    let veut = this._facing;
    if (dirX > flipAt) veut = 1; else if (dirX < -flipAt) veut = -1;
    if (veut !== this._facing && this._flipX === this._facing) {
      const patience = this._faceAt ? 0 : 0.2 + Math.min(1, this.def.size / 90);
      this._flipHold = (this._flipHold ?? 0) + dt;
      if (this._flipHold >= patience) { this._facing = veut; this._flipHold = 0; }
    } else if (veut === this._facing) this._flipHold = 0;

    // --- 2. Le demi-tour lui-même. Un colosse ne pivote pas comme un alevin :
    // la durée suit le gabarit (~0,22 s pour un confetti, ~0,75 s pour une baleine).
    const duree = 0.22 + Math.min(0.55, this.def.size / 260);
    const pas = dt * 2 / duree;
    if (this._flipX < this._facing) this._flipX = Math.min(this._facing, this._flipX + pas);
    else if (this._flipX > this._facing) this._flipX = Math.max(this._facing, this._flipX - pas);

    // Adouci aux extrémités (sinus) : le demi-tour démarre et s'achève en
    // douceur au lieu de s'arrêter net une fois le poisson à plat.
    const k = Math.sin(this._flipX * Math.PI / 2);
    // Jamais exactement 0 : une matrice d'échelle nulle est dégénérée, et le
    // poisson disparaîtrait complètement pendant une frame ou deux.
    return Math.abs(k) < 0.05 ? (this._flipX < 0 ? -0.05 : 0.05) : k;
  }

  draw(ctx, t) {
    const sx = Camera.sx(this.x), sy = Camera.sy(this.y);
    ctx.save();
    ctx.translate(sx, sy);

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
    const maxTilt = this.expression === 'laughing' ? 0.18
                  : (this.def.size >= 70 ? 0.28 : 0.75);
    let tilt;
    if (this._faceAt) {
      // Orientation EXACTE vers la cible : pas d'amortissement ni de bride, sinon
      // un poisson placé au-dessus de sa victime pointe en oblique au lieu de
      // piquer vers elle (le bisou du clown paraissait de travers).
      tilt = U.clamp(Math.atan2(dirY, Math.abs(dirX)), -1.4, 1.4);
    } else {
      tilt = U.clamp(Math.atan2(dirY, Math.abs(dirX) + 40) * 0.5, -maxTilt, maxTilt);
    }
    // Une créature fixe ne bascule jamais : sinon le rocher de la murène, dessiné
    // dans son repère, se retrouve penché ou à l'envers.
    if (this.def.movement === 'fixed') tilt = 0;
    this._tilt = U.lerp(this._tilt ?? tilt, tilt, this._faceAt ? 0.25 : 0.08);
    // `_tilt` est calculé sur |dirX| : c'est déjà l'angle « non miroité ». Il
    // s'applique donc TEL QUEL dans les deux cas. Avec un signe inversé (l'ancien
    // code), un poisson tourné à gauche s'inclinait à l'envers — visible dès que
    // l'angle devient franc, comme pour le bisou du clown.
    ctx.scale(flipX, 1);
    ctx.rotate(this._tilt);
    // Le dauphin se tord de rire : il roule sur lui-même
    if (this._farceRoll) ctx.rotate(Math.sin(this._farceRoll) * 0.5);

    FishBody.draw(ctx, this, t);
    ctx.restore();
  }
}
