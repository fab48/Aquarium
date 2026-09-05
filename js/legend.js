// Légende : ce que veulent dire les bulles de BD et les expressions des poissons.
// Panneau HTML (pas du canvas) : c'est du texte, autant le laisser au navigateur.

const Legend = {
  BULLES: [
    ['❗', 'repère une proie et part en chasse'],
    ['💥', 'une proie vient de se faire attraper'],
    ['😋', 'vient de manger'],
    ['❤', 'amoureux · parade · câlin d\'étoile de mer'],
    ['ha', 'chatouillé par le Poisson-clown, il se marre'],
    ['PROUT !', 'le Poisson-perroquet Pétomane se soulage'],
    ['🥚', 'ponte'],
    ['★ + anneau', 'sonné après un raté ou une décharge'],
    ['💨', 'le nuage du Pétomane'],
    ['💦', 'la murène a raté son coup'],
    ['BOUH !', 'le Dauphin Farceur surgit et fait sursauter un banc'],
    ['♥ ♥ ♥', 'petits cœurs : un couple s\'embrasse avant de pondre'],
    ['♪', 'la Raie Ronron ronronne (survole-la lentement)'],
    ['○', 'la Sardine Bulle-fofolle fait son glouglou'],
    ['ZzZ', 'endormi (yeux fermés, bouche qui ronfle)'],
    ['BOUM !', 'trop nourri : il a atteint 5x sa taille et il a éclaté'],
    ['!', 'a peur'],
    ['une goutte penchée', 'gêné ou honteux — une goutte de sueur, pas une bulle'],
    ['un petit nuage vert', 'écœuré : il a respiré un prout ou avalé un caca'],
    ['💡', 'le Poisson-lanterne Allumeur a allumé sa lampe : ce qui passe vient droit dessus'],
    ['🖤', 'nuage d’encre : le poulpe ou le calamar vient de semer son poursuivant'],
    ['⚡', 'l’Anguille Coup-de-Jus lâche sa décharge : tout le voisinage est sonné'],
    ['🦷', 'le Requin Dents-Molles vient de perdre une dent — il ne peut plus manger'],
    ['VROUUUM', 'le Thon Speedy passe à fond'],
    ['🎢', 'l’Étoile de Mer Ventouse s’est collée à un passant et se fait transporter'],
    ['3', 'le Calmar Violette fait son décompte avant de décoller à reculons'],
    ['🌿', 'le Fou Moustachu est remonté avec une algue au lieu d’un poisson'],
    ['un banc en forme de cœur', 'les Poissons Confetti prennent la pose, puis se dispersent, gênés'],
    ['un poisson tout rond', 'le Fugu Gonflé se gonfle : ne le touchez pas, ça rend malade'],
    ['une poche qui gigote', 'le Pélican a raté : le poisson ressort par le haut'],
  ],

  // Chaque action du jeu a son émotion attitrée. Tenir cette table à jour :
  // c'est elle qui garantit qu'on lit ce que fait un poisson sur son visage.
  EXPRESSIONS: [
    ['tranquille', 'idle — sourcil neutre, la pupille suit votre souris'],
    ['chasse une proie', 'angry — sourcil lourd, croc, veine de colère'],
    ['prend la fuite', 'scared — œil énorme, pupille minuscule, cri'],
    ['vient d\'attraper', 'eating — bouche qui mâche, la queue de la proie dépasse'],
    ['régale (nourriture favorite)', 'happy — grand sourire, étincelles'],
    ['affamé', 'sad — sourcils tombants, bouche en arc inversé'],
    ['dort', 'sleeping — yeux fermés, bouche qui ronfle, ZzZ qui flottent'],
    ['sonné (attaque ratée)', 'dizzy — yeux en spirale, bouche ondulée'],
    ['cherche un partenaire', 'love — yeux brillants, petits cœurs'],
    ['embrasse (couple ou bisou du clown)', 'kiss — yeux fermés, lèvres en avant'],
    ['chatouillé', 'laughing — bouche grande ouverte, sourcils qui gigotent'],
    ['sent le pétomane, ou vient d’avaler un caca', 'disgust — joues VERTES, sourire inversé, sourcils froncés, petit nuage vert — et il perd de l’état'],
    ['a un caca en route', 'ashamed puis happy — il s’arrête, se concentre, soulagement'],
    ['gavé (plus de 2,5× sa taille)', 'surprise puis scared — il tremble de plus en plus fort avant d’exploser'],
    ['avant de lâcher son prout', 'ashamed — regard fuyant, sourcils tombants'],
    ['après son prout', 'blush — tout rouge'],
    ['surpris (BOUH, éclosion, fausse charge)', 'surprise — œil rond, sourcils au plafond, bouche en o (aucune bulle : le visage suffit)'],
    ['fait semblant de charger (orque)', 'wink — clin d\'œil complice'],
    ['approche en douce (dauphin)', 'smug — paupière basse, sourire en coin'],
    ['plongeon raté (oiseau)', 'sad — trempé et dépité'],
    ['gênée d\'avoir raté (murène)', 'blush'],
    ['timide (hippocampe, curseur proche)', 'blush'],
    ['hypnotisé par une lampe de poisson-lanterne', 'happy — il nage droit sur la lumière sans plus rien voir'],
    ['le Calamar Géant se sait observé', 'blush — il rentre ses bras en fuseau et n’ose plus bouger'],
  ],

  visible: false,

  init() {
    const panel = document.createElement('div');
    panel.id = 'legend';
    panel.innerHTML =
      '<h3>Bulles</h3><table>' +
      this.BULLES.map(([s, d]) => `<tr><td class="sym">${s}</td><td>${d}</td></tr>`).join('') +
      '</table><h3>Ce que fait le poisson &rarr; son visage</h3><table>' +
      this.EXPRESSIONS.map(([a, d]) => `<tr><td class="sym">${a}</td><td>${d}</td></tr>`).join('') +
      '</table>';
    document.getElementById('hud').appendChild(panel);
    this.panel = panel;

    const btn = document.getElementById('legend-btn');
    btn.addEventListener('click', () => {
      this.visible = !this.visible;
      panel.classList.toggle('open', this.visible);
      btn.classList.toggle('active', this.visible);
    });
  },
};
