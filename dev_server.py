"""Serveur de dev : http.server sans cache, plus une écriture dans Assets/.

Sans le no-cache, le navigateur garde des versions obsolètes des fichiers js/ et
on débogue du code qui n'est plus celui du disque.

L'écriture sert à l'atelier (`atelier.html`) : une page web ne peut pas écrire
sur le disque, donc les sprites qu'on y dessine ne seraient jamais enregistrés
dans le jeu — il faudrait les télécharger puis les déplacer à la main à chaque
essai. Deux routes, volontairement minuscules :

    POST /api/sprite/<nom>   corps = JSON       -> Assets/<nom>.json
    POST /api/manifeste      corps = JSON       -> Assets/sprites.json

Garde-fous : serveur lié à 127.0.0.1 uniquement, écriture cantonnée à Assets/,
noms de fichiers restreints à [A-Za-z0-9_-], corps refusé s'il n'est pas du JSON
valide ou s'il dépasse 4 Mo. C'est un outil de développement local, pas un
service : ne l'exposez pas sur le réseau.

    python dev_server.py [port]
"""
import json
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(RACINE, "Assets")
NOM_VALIDE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
TAILLE_MAX = 4 * 1024 * 1024


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # silence : une ligne par fichier, inutile
        pass

    # --- Écriture ------------------------------------------------------------
    def do_POST(self):
        try:
            if self.path == "/api/manifeste":
                self._ecrire("sprites")
            elif self.path.startswith("/api/sprite/"):
                self._ecrire(self.path[len("/api/sprite/"):])
            else:
                self._repondre(404, {"erreur": "route inconnue"})
        except Exception as err:                      # noqa: BLE001 - outil de dev
            self._repondre(500, {"erreur": str(err)})

    def _ecrire(self, nom):
        if not NOM_VALIDE.match(nom or ""):
            return self._repondre(400, {"erreur": "nom de fichier refuse"})
        taille = int(self.headers.get("Content-Length") or 0)
        if taille <= 0 or taille > TAILLE_MAX:
            return self._repondre(400, {"erreur": "corps vide ou trop gros"})
        brut = self.rfile.read(taille)
        try:
            donnees = json.loads(brut.decode("utf-8"))
        except Exception:
            return self._repondre(400, {"erreur": "JSON invalide"})

        os.makedirs(ASSETS, exist_ok=True)
        chemin = os.path.join(ASSETS, nom + ".json")
        # Ceinture et bretelles : on revérifie que le chemin résolu reste bien
        # dans Assets/, au cas où un nom exotique passerait le motif.
        if os.path.commonpath([os.path.abspath(chemin), ASSETS]) != ASSETS:
            return self._repondre(400, {"erreur": "chemin hors de Assets/"})

        # Écriture atomique : un fichier temporaire puis un remplacement. Le jeu
        # relit ces fichiers en continu ; il ne doit jamais tomber sur un JSON
        # tronqué parce que l'atelier enregistrait au même instant.
        tmp = chemin + ".tmp"
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            json.dump(donnees, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(tmp, chemin)
        self._repondre(200, {"ok": True, "fichier": f"Assets/{nom}.json",
                             "octets": os.path.getsize(chemin)})

    def _repondre(self, code, charge):
        corps = json.dumps(charge).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    print(f"Aquarium sur http://localhost:{port} (cache desactive)")
    print(f"Atelier des sprites : http://localhost:{port}/atelier.html")
    # MULTI-THREAD, et pas le HTTPServer mono-thread d'origine : le
    # navigateur garde plusieurs connexions ouvertes sur la page, et un
    # serveur mono-thread met alors tout le reste en file — un simple curl
    # depuis un terminal attendait plusieurs minutes.
    ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
