# 🐠 Aquarium Vivant

Un aquarium à regarder vivre. Plus de cinquante créatures dessinées, de la
plage aux abysses, qui mangent, se reproduisent, dorment, font des bêtises et
se jouent des tours — une chaîne alimentaire complète qui tient toute seule,
avec un cycle jour/nuit. On peut la nourrir, la faire proliférer, attraper un
poisson à la main ou suivre une créature à la caméra.

## Jouer

**En ligne, sans rien installer : https://fab48.github.io/Aquarium/**

Sur téléphone, « Ajouter à l'écran d'accueil » l'installe comme une
application ; il marche ensuite sans connexion, et la sauvegarde y est à
l'abri (iOS efface le stockage des sites non visités depuis sept jours, pas
celui d'une application installée).

**Sans connexion, sur ordinateur** : téléchargez `Aquarium-Vivant.html` dans
la [dernière release](https://github.com/fab48/Aquarium/releases/latest) et
double-cliquez dessus. Ce fichier unique contient le jeu **et** tous les
dessins.

> Le `index.html` du dépôt, ouvert d'un double-clic depuis un ZIP, n'affiche
> **aucun** dessin : le navigateur interdit à une page `file://` de charger
> `Assets/*.json`. Pour jouer depuis le code, lancez un serveur (ci-dessous).

## Contrôles

| | Souris | Doigt |
|---|---|---|
| Nourrir | clic | tap |
| Bulles | clic maintenu dans le vide | — |
| Zoom | molette | pincement |
| Déplacer la vue | clic droit ou molette maintenus, souris au bord | glisser |
| Suivre une créature | double-clic dessus | double-tap |
| L'attraper | appui long dessus | appui long dessus |

🔍 fiche d'identité · ❔ légende des bulles et des expressions · **F** compteur
de performance · 💾 / 📂 emporter et rapporter la sauvegarde · 🔊 / 🔇 le son
(tout est synthétisé en direct, aucun fichier audio ; rien ne joue avant le
premier clic).

## Depuis le code

Aucune dépendance, aucun build : HTML5 et Canvas 2D.

```sh
python dev_server.py 8642      # puis http://localhost:8642/
                               # atelier de dessin : http://localhost:8642/atelier.html
python build.py                # dist/ : la version en ligne (PWA)
python build.py --inline       # dist/index.html : le fichier unique
node outils/banc.js --rapide   # le banc d'essai (Playwright requis)
```

Sous Windows, `Aquarium.bat` lance le serveur et ouvre le jeu.

La documentation du projet est en français : [CLAUDE.md](CLAUDE.md) pour les
règles et la carte, [FICHES.md](FICHES.md) pour les espèces, `docs/` pour le
détail de chaque domaine.

## Crédits

Conception, game design et dessins : Fabien Lacan. Code écrit avec l'aide de
Claude (Anthropic). Licence MIT — voir [CREDITS.md](CREDITS.md) et
[LICENSE](LICENSE).
