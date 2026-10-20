#!/usr/bin/env node
// LE BANC D'ESSAI — ce qu'on mesurait à la main à chaque audit, rejoué par une
// machine. Il lance le serveur de dev, simule l'aquarium avec un hasard SEMÉ
// (même graine, même partie : un échec se reproduit), vérifie les deux
// versions publiables et l'atelier, et sort en erreur si une règle du jeu est
// enfreinte. Tourne en local et sur GitHub à chaque push (.github/workflows/banc.yml).
//
//   node outils/banc.js                 # le banc complet (~5 min)
//   node outils/banc.js --rapide        # simulations raccourcies (~2 min)
//
// Playwright est le seul outil requis, et il ne sert QU'ICI : le jeu reste sans
// dépendance. En local : `NODE_PATH=$(npm root -g) node outils/banc.js` si
// Playwright est installé globalement ; `CHROMIUM=/chemin/chrome` pour un
// navigateur précis.
//
// Les pièges de mesure que ce banc respecte, tous documentés dans CLAUDE.md :
// `Ecosystem.update(dt, t)` exige l'horloge du jeu (sans `t`, la simulation
// dérape et les chiffres sont faux) ; `Food.update` et `Particles.update`
// doivent tourner aussi ; `Main.fpsCap` à ~0 gèle la boucle rAF pendant la
// mesure.

const { spawn, execFileSync } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

const RACINE = path.resolve(__dirname, '..');
const RAPIDE = process.argv.includes('--rapide');
const PORT = 8800 + Math.floor(Math.random() * 100);
const GRAINE = 20261020;

const resultats = [];
const verifier = (nom, ok, detail) => {
  resultats.push({ nom, ok, detail });
  console.log(`${ok ? '  ok ' : ' ÉCHEC'}  ${nom}${detail ? ' — ' + detail : ''}`);
};

async function attendreServeur(url, ms = 15000) {
  const http = require('http');
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const ok = await new Promise(r => http.get(url, res => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false)));
    if (ok) return;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('le serveur de dev ne répond pas');
}

// La simulation, dans la page. `gaver` reproduit un joueur qui nourrit sans
// relâche tout le bas de chaîne (une graine toutes les 0,1 s, au cœur d'un
// banc différent à chaque fois) — c'est ce qui saturait le petit PC.
function simuler({ minutes, gaver }) {
  Main.fpsCap = 0.0001;
  Camera.isVisible = () => true;            // le public partout : borne HAUTE des cadences
  const dt = 1 / 20, N = Math.round(minutes * 60 / dt), ids = Object.keys(SPECIES);
  const cibles = ids.filter(id => SPECIES[id].fraiRapide);
  const r = { nan: 0, horsEau: [], faim: [], bulles: 0, totalMax: 0, saiyans: 0, gobes: 0,
              sousPlafond: [], liens: {}, especesFin: 0, absentes: [] };
  const die0 = Entity.prototype.die;
  Entity.prototype.die = function () {
    if (!this.dead && !this._causeNotee) {
      this._causeNotee = true;
      if (this.hunger >= 1) r.faim.push(this.speciesId);
    }
    return die0.apply(this, arguments);
  };
  const eat0 = Ecosystem.eat.bind(Ecosystem);
  Ecosystem.eat = (a, b) => { r.liens[a.speciesId + '>' + b.speciesId] = 1; return eat0(a, b); };
  if (typeof Son !== 'undefined') Son.compte = {};   // les sons « joués » (comptés même sans haut-parleur)
  const comic0 = Particles.comic.bind(Particles), shout0 = Particles.shout.bind(Particles);
  Particles.comic = (...a) => { r.bulles++; return comic0(...a); };
  Particles.shout = (...a) => { r.bulles++; return shout0(...a); };
  let prev = null;
  for (let i = 0; i < N; i++) {
    Main.time += dt;
    if (gaver && i % 2 === 0) {
      const l = Ecosystem.bySpecies[cibles[(i / 2) % cibles.length | 0]] || [];
      const e = l[(Math.random() * l.length) | 0];
      if (e) Food.drop(e.x + (Math.random() - 0.5) * 40, e.y - 30);
    }
    Food.update(dt); Ecosystem.update(dt, Main.time); Particles.update(dt);
    r.totalMax = Math.max(r.totalMax, Ecosystem.total);
    const a = Saiyan.actif;
    if (a && a !== prev) r.saiyans++;
    if (a && a._saiyan) {
      r.gobes = Math.max(r.gobes, a._saiyan.mange);
      const c = a._saiyan.cible;
      if (c && (Ecosystem.counts[c.speciesId] || 0) < Ecosystem.baseCap(SPECIES[c.speciesId]) - 1) r.sousPlafond.push(c.speciesId);
    }
    prev = a;
    if (i % 20) continue;                     // relevés une fois par seconde
    for (const e of Ecosystem.entities) {
      if (e.dead || e.stage === 'egg') continue;
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { r.nan++; continue; }
      const d = e.def;
      const enVol = d.aerial || e.jumpState === 'air' || e._galVol || e._surfacing || e._replonge
                 || e._saisi || e._lache || e._abattu > 0 || e._plage;
      if (!enVol && e.y < CONFIG.SURFACE_Y - e.size * 1.2) r.horsEau.push(e.speciesId + '/' + e.state);
    }
  }
  for (const id of ids) if ((Ecosystem.counts[id] || 0) > 0) r.especesFin++; else r.absentes.push(id);
  r.especes = ids.length;
  r.bullesParMin = Math.round(r.bulles / minutes);
  r.declares = ids.reduce((n, id) => n + (SPECIES[id].prey || []).length, 0);
  r.liensUtilises = Object.keys(r.liens).length;
  r.horsEau = [...new Set(r.horsEau)];
  r.sousPlafond = [...new Set(r.sousPlafond)];
  r.budget = Ecosystem.BUDGET;
  const sons = typeof Son !== 'undefined' ? Son.compte : {};
  r.sonsParMin = Math.round(Object.values(sons).reduce((a, b) => a + b, 0) / minutes);
  r.sonsTop = Object.entries(sons).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => [k, Math.round(v / minutes)]);
  return r;
}

async function page(navigateur, url, graine) {
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript((g) => {
    let s = g >>> 0 || 1;
    Math.random = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; };
    try { localStorage.clear(); } catch (e) { /* mode privé */ }
  }, graine);
  const p = await ctx.newPage();
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  await p.goto(url);
  return { ctx, p, erreurs };
}

(async () => {
  console.log(`Banc d'essai d'Aquarium Vivant${RAPIDE ? ' (rapide)' : ''} — graine ${GRAINE}\n`);
  const serveur = spawn('python3', ['dev_server.py', String(PORT)], { cwd: RACINE, stdio: 'ignore' });
  let code = 0;
  const navigateur = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  try {
    await attendreServeur(`http://localhost:${PORT}/`);
    const url = `http://localhost:${PORT}/`;
    const pret = () => typeof Saiyan !== 'undefined' && typeof Ecosystem !== 'undefined' && Ecosystem.entities.length > 300;

    // 1. L'aquarium sans joueur
    console.log('1. Aquarium sans joueur');
    {
      const { ctx, p, erreurs } = await page(navigateur, url, GRAINE);
      await p.waitForFunction(pret, null, { timeout: 30000 });
      const r = await p.evaluate(simuler, { minutes: RAPIDE ? 2 : 4, gaver: false });
      verifier('toutes les espèces vivantes', r.especesFin === r.especes, `${r.especesFin}/${r.especes}${r.absentes.length ? ', absentes : ' + r.absentes.join(', ') : ''}`);
      verifier('aucune position NaN', r.nan === 0, r.nan ? `${r.nan} relevés` : '');
      verifier('aucun nageur hors de l\'eau', r.horsEau.length === 0, r.horsEau.slice(0, 6).join(', '));
      verifier('pas de famine', r.faim.length <= 1, r.faim.length ? `${r.faim.length} mort(s) de faim : ${[...new Set(r.faim)].join(', ')}` : '');
      verifier('bulles de BD sous la cible', r.bullesParMin <= 300, `${r.bullesParMin}/min (cible ~250, caméra partout)`);
      verifier('pas de Super Saïyen sans joueur', r.saiyans === 0, `${r.saiyans} transformation(s)`);
      verifier('population sous le plafond', r.totalMax <= r.budget, `max ${r.totalMax} pour ${r.budget}`);
      // Le son suit la cadence : ce qui foisonne reste muet. Borne HAUTE (la
      // caméra « voit » tout l'aquarium) ; le joueur en entend ~20 à 40/min.
      verifier('sons sous le budget', r.sonsParMin <= 250 && (r.sonsTop[0] || [0, 0])[1] <= 45,
               `${r.sonsParMin}/min, dont ${r.sonsTop.map(([k, v]) => k + ' ' + v).join(', ')}`);
      console.log(`       liens alimentaires utilisés : ${r.liensUtilises}/${r.declares}`);
      verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // 2. Le joueur qui gave tout le bas de chaîne
    console.log('2. Gavage continu (le joueur fait proliférer)');
    {
      const { ctx, p, erreurs } = await page(navigateur, url, GRAINE + 1);
      await p.waitForFunction(pret, null, { timeout: 30000 });
      const r = await p.evaluate(simuler, { minutes: RAPIDE ? 2 : 3, gaver: true });
      verifier('le plafond global tient', r.totalMax <= r.budget + 15, `max ${r.totalMax} pour ${r.budget}`);
      verifier('le Super Saïyen intervient', r.saiyans >= 1 && r.gobes > 0, `${r.saiyans} transformation(s), jusqu'à ${r.gobes} gobés`);
      verifier('il ne descend aucune espèce sous son plafond', r.sousPlafond.length === 0, r.sousPlafond.join(', '));
      verifier('toutes les espèces vivantes', r.especesFin === r.especes, `${r.especesFin}/${r.especes}`);
      verifier('aucune position NaN', r.nan === 0);
      verifier('aucun nageur hors de l\'eau', r.horsEau.length === 0, r.horsEau.slice(0, 6).join(', '));
      verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // 3. L'atelier se charge, et chaque recette de son sonne
    console.log('3. Atelier et sons');
    {
      const { ctx, p, erreurs } = await page(navigateur, `http://localhost:${PORT}/sons.html`, GRAINE);
      await p.waitForTimeout(400);
      const r = await p.evaluate(async () => {
        const out = [];
        for (const nom of Object.keys(Son.R)) for (const h of [0.5, 1.8]) out.push(await analyser(nom, h));
        return out;
      });
      const muets = r.filter(x => x.erreur || x.crete < 0.02).map(x => x.nom + (x.erreur ? ' (' + x.erreur + ')' : ''));
      const satures = r.filter(x => x.crete > 1).map(x => x.nom);
      verifier('chaque recette de son se rend sans erreur et s\'entend', !muets.length && !erreurs.length, [...new Set(muets)].join(', ') || `${r.length / 2} recettes`);
      verifier('aucune recette ne sature', !satures.length, [...new Set(satures)].join(', '));
      await ctx.close();
    }
    {
      const { ctx, p, erreurs } = await page(navigateur, `http://localhost:${PORT}/atelier.html`, GRAINE);
      await p.waitForTimeout(2500);
      verifier('l\'atelier se charge sans erreur', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
      await ctx.close();
    }

    // 4. Les deux versions publiables, et les fiches qui doivent dire ce que fait le code
    console.log('4. Versions publiables et fiches');
    try { execFileSync('node', [path.join(__dirname, 'fiches.js'), '--verifier'], { cwd: RACINE, stdio: 'pipe' }); verifier('FICHES.md suit le code (Mange / Mangé par, plafonds)', true); }
    catch (e) { verifier('FICHES.md suit le code (Mange / Mangé par, plafonds)', false, String(e.stdout || e.message).split('\n')[0] + ' — lancer `node outils/fiches.js`'); }
    for (const [nom, args] of [['en ligne (PWA)', []], ['fichier unique', ['--inline']]]) {
      try { execFileSync('python3', ['build.py', ...args], { cwd: RACINE, stdio: 'pipe' }); verifier(`build.py ${args.join(' ') || ''}: ${nom}`.trim(), true); }
      catch (e) { verifier(`build.py ${nom}`, false, String(e.stderr || e.message).slice(0, 200)); }
    }
    {
      const { ctx, p, erreurs } = await page(navigateur, 'file://' + path.join(RACINE, 'dist', 'index.html'), GRAINE);
      await p.waitForTimeout(3500);
      const r = await p.evaluate(() => { const v = Object.values(Sprites.cache); return { ok: v.filter(x => x).length, n: v.length }; });
      verifier('le fichier unique affiche tous ses dessins (file://)', r.ok === r.n && r.n >= 50, `${r.ok}/${r.n}`);
      verifier('le fichier unique s\'ouvre sans erreur', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) {
    verifier('le banc a pu tourner jusqu\'au bout', false, e.message);
  } finally {
    await navigateur.close();
    serveur.kill();
  }
  const echecs = resultats.filter(r => !r.ok);
  console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies.`);
  if (echecs.length) { console.log('ÉCHECS :\n' + echecs.map(e => ` - ${e.nom}${e.detail ? ' : ' + e.detail : ''}`).join('\n')); code = 1; }
  process.exit(code);
})();
