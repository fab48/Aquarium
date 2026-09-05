#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prépare le jeu pour la MISE EN LIGNE. Rien à installer, rien à lancer pour
développer : ce script ne sert qu'au déploiement.

    python build.py            -> dist/  (le jeu, prêt à téléverser)
    python build.py --inline   -> dist/index.html, UN SEUL FICHIER autonome

Ce qu'il règle, et pourquoi :

1. LE CACHE. En dev, `js/boot.js` ajoute `?v=<timestamp>` à chaque script : un
   F5 recharge toujours le vrai code. En ligne, cette même URL change à chaque
   visite — 600 ko de JS retéléchargés à chaque fois, jamais rien en cache. Ici
   les 20 fichiers deviennent UN fichier nommé par son empreinte
   (`aquarium.<hash>.js`), qu'un hébergeur peut servir en `immutable` : cache
   parfait, et une nouvelle version change de nom donc s'impose d'elle-même.
   Aucun numéro de version à penser à incrémenter.

2. CE QU'ON PUBLIE. Le dépôt pèse 23 Mo, le jeu 700 ko. Les planches de concept,
   les repères de découpe, l'atelier, le serveur de dev et la documentation sont
   de l'OUTILLAGE. On ne copie que ce que le jeu lit vraiment.

La liste des scripts n'est PAS recopiée ici : elle est lue dans `js/boot.js`,
qui reste la seule source de vérité. Ajouter un fichier js ne demande donc
toujours qu'une seule modification.
"""

import gzip
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent
DIST = RACINE / "dist"


def lire(chemin):
    return chemin.read_text(encoding="utf-8")


def scripts_du_boot():
    """L'ordre des scripts, lu dans `js/boot.js` — jamais recopié."""
    src = lire(RACINE / "js" / "boot.js")
    bloc = re.search(r"const FILES = \[(.*?)\];", src, re.S)
    if not bloc:
        sys.exit("! js/boot.js : liste FILES introuvable (le format a changé ?)")
    noms = re.findall(r"'([\w-]+)'", bloc.group(1))
    if not noms:
        sys.exit("! js/boot.js : liste FILES vide")
    return [RACINE / "js" / f"{n}.js" for n in noms]


def concatener(fichiers):
    """Un seul fichier, dans l'ordre des dépendances.

    Sans emballage : ce sont des scripts CLASSIQUES, ils partagent déjà la même
    portée globale. Les envelopper dans une IIFE cacherait `Main`, `Camera` &
    Cie, que la console de debug et `atelier.html` utilisent.
    """
    parts = []
    for f in fichiers:
        if not f.exists():
            sys.exit(f"! {f.relative_to(RACINE)} listé par boot.js mais absent")
        parts.append(f"/* ===== {f.name} ===== */\n{lire(f).rstrip()}\n")
    return "\n".join(parts)


def sprites_utilises():
    """Les dessins que le jeu charge VRAIMENT. Deux sources, parce que
    `Sprites.init` en lit deux : le manifeste `Assets/sprites.json` (ce que
    l'atelier active sans toucher au code) ET les `sprite:` déclarés dans les
    fiches d'espèce. Les autres `Assets/*.json` sont des dessins EN COURS, ils
    n'ont rien à faire en ligne."""
    manifeste_f = RACINE / "Assets" / "sprites.json"
    manifeste = json.loads(lire(manifeste_f)) if manifeste_f.exists() else {}

    noms = {v for v in manifeste.values() if v}
    noms |= set(re.findall(r"sprite:\s*'([^']+)'", lire(RACINE / "js" / "species.js")))

    dessins = {}
    for nom in sorted(noms):
        f = RACINE / "Assets" / (nom + ".json")
        if not f.exists():
            print("  ~ " + nom + ".json declare mais absent - silhouette procedurale")
            continue
        dessins[nom] = json.loads(lire(f))
    return manifeste, dessins


def index_deploye(html, balise_css, balise_js):
    """`index.html` d'origine, débarrassé de ce qui n'a pas de sens en ligne."""
    # Le lien vers l'atelier : outil de dev. Il se masque déjà tout seul hors
    # localhost, mais autant ne pas l'expédier du tout.
    html, n = re.subn(
        r"\n<!-- LIEN VERS L'ATELIER.*?</script>\n", "\n", html, flags=re.S
    )
    if n != 1:
        sys.exit("! index.html : bloc atelier introuvable (le format a changé ?)")
    # `lambda` et pas la chaîne directement : dans un remplacement `re`, les
    # antislashs sont des références de groupe — 546 ko de JS en contiennent.
    html, n = re.subn(r'<link rel="stylesheet" href="css/style\.css">',
                      lambda _: balise_css, html)
    if n != 1:
        sys.exit("! index.html : lien CSS introuvable")
    html, n = re.subn(r'<script src="js/boot\.js"></script>',
                      lambda _: balise_js, html)
    if n != 1:
        sys.exit("! index.html : appel à boot.js introuvable")
    return html


def ko(n):
    return f"{n / 1024:,.0f} ko".replace(",", " ")


def gz(txt):
    return len(gzip.compress(txt.encode("utf-8"), 9))


def main():
    inline = "--inline" in sys.argv[1:]

    js = concatener(scripts_du_boot())
    css = lire(RACINE / "css" / "style.css")
    html = lire(RACINE / "index.html")
    manifeste, dessins = sprites_utilises()

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    if inline:
        # UN SEUL FICHIER. Les dessins sont embarqués parce que `fetch` est
        # bloqué par CORS sur `file://` : sans ça, un fichier ouvert d'un
        # double-clic perdrait tous ses sprites, en silence.
        charge = json.dumps(
            {"manifeste": manifeste, "dessins": dessins},
            ensure_ascii=False, separators=(",", ":"),
        )
        # `</script>` dans une chaîne JSON fermerait la balise qui la contient.
        charge = charge.replace("</", "<" + chr(92) + "/")
        page = index_deploye(
            html,
            f"<style>\n{css}\n</style>",
            "<script>\n{}\nSprites.PRECHARGE = {};\n</script>".format(js, charge),
        )
        cible = DIST / "index.html"
        cible.write_text(page, encoding="utf-8")
        print(f"dist/index.html      {ko(cible.stat().st_size)}  "
              f"({ko(gz(page))} gzippé)  — {len(dessins)} dessin(s) embarqué(s)")
        print("\nUn seul fichier, aucune dépendance : il s'ouvre même en "
              "double-clic (file://).")
        return

    empreinte = hashlib.sha256((js + css).encode("utf-8")).hexdigest()[:8]
    nom_js, nom_css = f"aquarium.{empreinte}.js", f"style.{empreinte}.css"

    (DIST / "js").mkdir()
    (DIST / "css").mkdir()
    (DIST / "Assets").mkdir()
    (DIST / "js" / nom_js).write_text(js, encoding="utf-8")
    (DIST / "css" / nom_css).write_text(css, encoding="utf-8")
    (DIST / "Assets" / "sprites.json").write_text(
        json.dumps(manifeste, ensure_ascii=False), encoding="utf-8")
    for nom, d in dessins.items():
        (DIST / "Assets" / f"{nom}.json").write_text(
            json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    page = index_deploye(
        html,
        f'<link rel="stylesheet" href="css/{nom_css}">',
        f'<script src="js/{nom_js}"></script>',
    )
    (DIST / "index.html").write_text(page, encoding="utf-8")

    total = sum(f.stat().st_size for f in DIST.rglob("*") if f.is_file())
    print(f"dist/index.html      {ko((DIST / 'index.html').stat().st_size)}")
    print(f"dist/js/{nom_js}   {ko(len(js.encode()))}  ({ko(gz(js))} gzippé)")
    print(f"dist/css/{nom_css}    {ko(len(css.encode()))}")
    print(f"dist/Assets/         {len(dessins) + 1} fichiers")
    print(f"                     ------")
    print(f"total                {ko(total)}")
    print("\nÀ téléverser tel quel sur n'importe quel hébergeur statique.")
    print("Cache conseillé : `immutable` sur js/ et css/ (leur nom porte "
          "l'empreinte), revalidation sur index.html.")


if __name__ == "__main__":
    main()
