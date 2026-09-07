#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prépare le jeu pour la MISE EN LIGNE. Rien à installer, rien à lancer pour
développer : ce script ne sert qu'au déploiement.

    python build.py            -> dist/  (le jeu, prêt à téléverser, en PWA)
    python build.py --inline   -> dist/index.html, UN SEUL FICHIER autonome

Ce qu'il règle, et pourquoi :

1. LE CACHE. En dev, `js/boot.js` ajoute `?v=<timestamp>` à chaque script : un
   F5 recharge toujours le vrai code. En ligne, cette même URL change à chaque
   visite — 600 ko de JS retéléchargés à chaque fois, jamais rien en cache. Ici
   les 20 fichiers deviennent UN fichier nommé par son empreinte
   (`aquarium.<hash>.js`), qu'un hébergeur peut servir en `immutable` : cache
   parfait, et une nouvelle version change de nom donc s'impose d'elle-même.
   Aucun numéro de version à penser à incrémenter.

2. CE QU'ON PUBLIE. Le dépôt pèse 23 Mo, le jeu ~700 ko. Les planches de
   concept, les repères de découpe, l'atelier, le serveur de dev et la
   documentation sont de l'OUTILLAGE. On ne copie que ce que le jeu lit.

3. LA PWA (mode normal seulement). Manifeste, icônes générées et service
   worker de pré-cache : le jeu s'installe sur l'écran d'accueil, tourne en
   plein écran et hors ligne. La motivation première est iOS, qui efface le
   localStorage des sites non visités depuis 7 jours — une PWA installée en
   est exemptée, et c'est toute la sauvegarde du joueur qui en dépend. Le
   service worker n'existe QU'ICI : en dev il serait un anti-cache inversé,
   servant du vieux code avec entêtement.

La liste des scripts n'est PAS recopiée ici : elle est lue dans `js/boot.js`,
qui reste la seule source de vérité. Ajouter un fichier js ne demande donc
toujours qu'une seule modification.
"""

import gzip
import hashlib
import json
import re
import shutil
import struct
import sys
import zlib
from pathlib import Path

RACINE = Path(__file__).resolve().parent
DIST = RACINE / "dist"
FOND = "#0b2642"          # le bleu du HUD — thème et écran de lancement PWA


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
            print(f"  ~ {nom}.json déclaré mais absent — silhouette procédurale")
            continue
        dessins[nom] = json.loads(lire(f))
    return manifeste, dessins


# ---------------------------------------------------------------------------
# PWA : manifeste, icônes, service worker.

def _png(taille, pixels):
    """Écrit un PNG RGBA carré sans aucune dépendance (stdlib : struct + zlib)."""
    def bloc(tag, donnees):
        c = tag + donnees
        return struct.pack(">I", len(donnees)) + c + struct.pack(">I", zlib.crc32(c))
    lignes = bytearray()
    for y in range(taille):
        lignes.append(0)                       # filtre 0 (aucun) par ligne
        lignes += pixels[y * taille * 4:(y + 1) * taille * 4]
    return (bytes([137]) + b"PNG" + bytes([13, 10, 26, 10])
            + bloc(b"IHDR", struct.pack(">IIBBBBB", taille, taille, 8, 6, 0, 0, 0))
            + bloc(b"IDAT", zlib.compress(bytes(lignes), 9))
            + bloc(b"IEND", b""))


def _icone(taille):
    """Le poisson de l'icône, dessiné au pixel : dégradé d'eau, poisson cartoon,
    gros œil blanc à pupille encre — la signature du jeu, c'est le visage.
    Plein cadre : la zone sûre `maskable` est le cercle central, et tout le
    poisson tient dans les 70 % du milieu."""
    def ellipse(x, y, cx, cy, rx, ry):
        dx = (x - cx) / rx; dy = (y - cy) / ry
        return dx * dx + dy * dy <= 1.0

    def triangle(x, y, a, b, c):
        d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1])
        d2 = (x - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (y - c[1])
        d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1])
        return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))

    ENCRE = (28, 39, 51)             # le trait commun du jeu (#1c2733)
    CORPS = (255, 154, 84)
    QUEUE = (247, 126, 62)
    HAUT, BAS = (116, 196, 232), (11, 38, 66)

    def couleur(u, v):
        # premier test gagnant, du calque le plus haut vers le fond
        if ellipse(u, v, 0.678, 0.447, 0.030, 0.030): return ENCRE            # pupille
        if ellipse(u, v, 0.664, 0.442, 0.060, 0.060): return (255, 255, 255)  # œil
        if ellipse(u, v, 0.742, 0.565, 0.020, 0.020): return ENCRE            # bouche
        if ellipse(u, v, 0.700, 0.522, 0.028, 0.022): return (255, 122, 110)  # joue
        if ellipse(u, v, 0.550, 0.500, 0.260, 0.175): return CORPS            # corps
        if triangle(u, v, (0.335, 0.500), (0.155, 0.355), (0.155, 0.645)): return QUEUE
        for bx, by, br in ((0.815, 0.270, 0.024), (0.860, 0.205, 0.017),
                           (0.828, 0.150, 0.012)):
            if ellipse(u, v, bx, by, br, br): return (225, 244, 252)          # bulles
        t = v * v * 0.25 + v * 0.75            # l'eau s'assombrit vers le fond
        return tuple(round(HAUT[i] + (BAS[i] - HAUT[i]) * t) for i in range(3))

    pix = bytearray(taille * taille * 4)
    pas = 1.0 / taille
    for y in range(taille):
        for x in range(taille):
            # 2×2 sous-échantillons : l'anticrénelage qui suffit à une icône
            r = g = b = 0
            for sx, sy in ((0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)):
                cr, cg, cb = couleur((x + sx) * pas, (y + sy) * pas)
                r += cr; g += cg; b += cb
            i = (y * taille + x) * 4
            pix[i], pix[i + 1], pix[i + 2], pix[i + 3] = r >> 2, g >> 2, b >> 2, 255
    return _png(taille, pix)


def pwa(fichiers_caches, empreinte):
    """Écrit manifeste, service worker et icônes dans dist/. Renvoie les
    balises <head> et le script d'enregistrement à injecter dans l'index."""
    for taille in (512, 192, 180):
        (DIST / f"icone-{taille}.png").write_bytes(_icone(taille))

    manifeste = {
        "name": "Aquarium Vivant",
        "short_name": "Aquarium",
        "description": "Un écosystème aquatique contemplatif et comique.",
        "lang": "fr",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "background_color": FOND,
        "theme_color": FOND,
        "icons": [
            {"src": "icone-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "icone-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "icone-512.png", "sizes": "512x512", "type": "image/png",
             "purpose": "maskable"},
        ],
    }
    # .json et pas .webmanifest : les serveurs simples (http.server compris) ne
    # connaissent pas le type MIME de .webmanifest et servent de l'octet-stream.
    (DIST / "manifest.json").write_text(
        json.dumps(manifeste, ensure_ascii=False, indent=2), encoding="utf-8")

    tous = ["./", "index.html", "manifest.json",
            "icone-512.png", "icone-192.png", "icone-180.png"] + fichiers_caches
    sw_lignes = [
        "// Service worker généré par build.py — pré-cache intégral, cache d'abord.",
        "// Le nom du cache porte l'empreinte du build : une nouvelle version",
        "// installe le sien et efface les anciens à l'activation. Les fichiers à",
        "// empreinte ne changent jamais de contenu, donc cache d'abord est sûr.",
        f"const CACHE = 'aquarium-{empreinte}';",
        f"const FICHIERS = {json.dumps(tous)};",
        "self.addEventListener('install', ev => {",
        "  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS))",
        "    .then(() => self.skipWaiting()));",
        "});",
        "self.addEventListener('activate', ev => {",
        "  ev.waitUntil(caches.keys()",
        "    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))",
        "    .then(() => self.clients.claim()));",
        "});",
        "self.addEventListener('fetch', ev => {",
        "  if (ev.request.method !== 'GET') return;",
        "  ev.respondWith(caches.match(ev.request, { ignoreSearch: true })",
        "    .then(r => r || fetch(ev.request)));",
        "});",
        "",
    ]
    (DIST / "sw.js").write_text(chr(10).join(sw_lignes), encoding="utf-8")

    balises = chr(10).join([
        '<link rel="manifest" href="manifest.json">',
        '<link rel="apple-touch-icon" href="icone-180.png">',
        f'<meta name="theme-color" content="{FOND}">',
    ])
    enregistrement = chr(10).join([
        "<script>",
        "if ('serviceWorker' in navigator)",
        "  addEventListener('load', () => navigator.serviceWorker.register('sw.js')"
        ".catch(() => {}));",
        "</script>",
    ])
    return balises, enregistrement


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
    # La BIBLIOTHÈQUE DE CLIPS partagée (timelines de poses jouées par les
    # scènes) : un troisième fichier consommé par `Sprites.init`, au même
    # titre que le manifeste.
    clips_f = RACINE / "Assets" / "clips.json"
    clips = json.loads(lire(clips_f)) if clips_f.exists() else {}

    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    if inline:
        # UN SEUL FICHIER. Les dessins sont embarqués parce que `fetch` est
        # bloqué par CORS sur `file://` : sans ça, un fichier ouvert d'un
        # double-clic perdrait tous ses sprites, en silence. Pas de PWA ici :
        # un service worker n'a pas de sens sur un fichier local.
        charge = json.dumps(
            {"manifeste": manifeste, "dessins": dessins, "clips": clips},
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
    (DIST / "Assets" / "clips.json").write_text(
        json.dumps(clips, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for nom, d in dessins.items():
        (DIST / "Assets" / f"{nom}.json").write_text(
            json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    caches = [f"js/{nom_js}", f"css/{nom_css}", "Assets/sprites.json", "Assets/clips.json"]
    caches += [f"Assets/{nom}.json" for nom in dessins]
    balises_pwa, enregistrement = pwa(caches, empreinte)

    page = index_deploye(
        html,
        f'<link rel="stylesheet" href="css/{nom_css}">\n{balises_pwa}',
        f'<script src="js/{nom_js}"></script>\n{enregistrement}',
    )
    (DIST / "index.html").write_text(page, encoding="utf-8")

    total = sum(f.stat().st_size for f in DIST.rglob("*") if f.is_file())
    print(f"dist/index.html      {ko((DIST / 'index.html').stat().st_size)}")
    print(f"dist/js/{nom_js}   {ko(len(js.encode()))}  ({ko(gz(js))} gzippé)")
    print(f"dist/css/{nom_css}    {ko(len(css.encode()))}")
    print(f"dist/Assets/         {len(dessins) + 1} fichiers")
    print(f"dist/ (PWA)          manifest.json, sw.js, 3 icônes")
    print(f"                     ------")
    print(f"total                {ko(total)}")
    print("\nÀ téléverser tel quel sur n'importe quel hébergeur statique (HTTPS")
    print("requis pour la partie PWA — installation et hors-ligne).")
    print("Cache conseillé : `immutable` sur js/ et css/ (leur nom porte "
          "l'empreinte), revalidation sur index.html et sw.js.")


if __name__ == "__main__":
    main()
