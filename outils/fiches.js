#!/usr/bin/env node
// FICHES.md, CE QUI SE DÉDUIT DU CODE. Les lignes « Mange » et « Mangé par »,
// la taille, le plafond et le plancher de chaque fiche sont recalculés depuis
// `js/species.js` — c'est-à-dire depuis ce que le jeu fait vraiment. Recopiés
// à la main, ils avaient dérivé sur dix espèces à la première série de
// nouveaux liens (requin, raie, orque, mérou, cormoran, barracuda…).
//
//   node outils/fiches.js              # réécrit FICHES.md
//   node outils/fiches.js --verifier   # n'écrit rien, sort en erreur si une fiche a dérivé
//
// Le reste de la fiche (phrase, action, zone, frayère) est de la prose : on n'y
// touche pas. Les règles reprises ici sont celles du moteur, citées à leur
// source pour qu'on sache quoi suivre si elles changent :
//   - qui broute : `Entity.update`, `broute = def.grazes ?? (embusqué planté
//     || une seule proie)` ;
//   - le plancher : `Ecosystem.refugeFloor` ;
//   - « Mangé par » : la table `prey`, comme `IdCard.predatorsOf`.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.resolve(__dirname, '..');
const VERIFIER = process.argv.includes('--verifier');
const FICHIER = path.join(RACINE, 'FICHES.md');

// Les trois scripts qui définissent les espèces, dans leur portée commune (les
// `const` de haut niveau ne vont pas sur l'objet global : on les rend par la
// dernière expression).
const source = ['config.js', 'utils.js', 'species.js']
  .map(f => fs.readFileSync(path.join(RACINE, 'js', f), 'utf8')).join('\n;\n');
const { SPECIES, FOOD_TYPES } = vm.runInNewContext(source + '\n;({ SPECIES, FOOD_TYPES })', { console });

const broute = d => d.grazes
  ?? ((d.ambush && (d.movement === 'fixed' || d.movement === 'crawl')) || !(d.prey && d.prey.length > 1));
const plafond = d => {
  if (d.popCap != null) return d.popCap;
  if (d.refuge) return 12;
  if (d.trophic === 'scavenger') return 20;
  return { 1: 22, 2: d.schooling ? 55 : 26, 3: 14, 4: 8 }[d.trophic] ?? 16;
};
const plancher = d => { const c = plafond(d); return Math.min(Math.max(4, Math.round(c * 0.35)), Math.max(1, c - 2)); };

function mange(d) {
  const parts = [];
  if (d.prey && d.prey.length) parts.push(d.prey.map(p => SPECIES[p].name).join(', '));
  if (d.eatsBones) parts.push('arêtes (charogne)');
  if (broute(d)) parts.push('plancton');
  const fav = d.favoriteFood ? FOOD_TYPES[d.favoriteFood].label : '—';
  return `- **Mange** — ${parts.join(' · ') || '—'} · **Favori** — ${fav}`;
}
function mangePar(id) {
  const l = Object.values(SPECIES).filter(d => d.prey && d.prey.includes(id)).map(d => d.name);
  return `- **Mangé par** — ${l.join(', ') || 'personne'}`;
}

const parNom = new Map(Object.entries(SPECIES).map(([id, d]) => [d.name, id]));
const lignes = fs.readFileSync(FICHIER, 'utf8').split('\n');
const vues = new Set(), changees = [];
let id = null;
for (let i = 0; i < lignes.length; i++) {
  const l = lignes[i];
  const titre = l.match(/^### (.+?) — /);
  if (titre) { id = parNom.get(titre[1]) || null; if (id) vues.add(id); continue; }
  if (/^##? /.test(l)) { id = null; continue; }
  if (!id) continue;
  const d = SPECIES[id];
  let n = l;
  if (l.startsWith('- **Mange** —')) n = mange(d);
  else if (l.startsWith('- **Mangé par** —')) n = mangePar(id);
  else if (/^- T\S* .* · taille \d+/.test(l) || /· plafond \d+, plancher \d+/.test(l)) {
    n = l.replace(/· taille \d+/, `· taille ${d.size}`)
         .replace(/· plafond \d+, plancher \d+/, `· plafond ${plafond(d)}, plancher ${plancher(d)}`);
  }
  if (n !== l) { changees.push(`${d.name} : ${l.slice(0, 60)}… → ${n.slice(0, 60)}…`); lignes[i] = n; }
}

const manquantes = Object.keys(SPECIES).filter(k => !vues.has(k)).map(k => SPECIES[k].name);
if (manquantes.length) console.log(`Sans fiche dans FICHES.md : ${manquantes.join(', ')}`);

if (VERIFIER) {
  if (changees.length) {
    console.log(`FICHES.md a dérivé du code sur ${changees.length} ligne(s) — lancer \`node outils/fiches.js\` :`);
    for (const c of changees) console.log('  ' + c);
  }
  process.exit(changees.length || manquantes.length ? 1 : 0);
}
fs.writeFileSync(FICHIER, lignes.join('\n'));
console.log(changees.length ? `${changees.length} ligne(s) mise(s) à jour.` : 'FICHES.md est déjà à jour.');
