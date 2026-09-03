"""Serveur de dev : identique à http.server mais interdit toute mise en cache.

Sans ça, le navigateur garde des versions obsolètes des fichiers js/ et on
débogue du code qui n'est plus celui du disque.

    python dev_server.py [port]
"""
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):  # silence : une ligne par fichier, inutile
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
    print(f"Aquarium sur http://localhost:{port} (cache desactive)")
    HTTPServer(("127.0.0.1", port), NoCacheHandler).serve_forever()
