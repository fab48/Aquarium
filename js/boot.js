// Chargeur de scripts (projet sans build : pas de bundler pour gérer les
// versions). `async = false` ne sérialise que l'EXÉCUTION — les fichiers se
// téléchargent en parallèle, l'ordre de la liste est celui des dépendances.
//
// Ajouter un fichier js = l'ajouter ICI, jamais à `index.html`.
//
// ANTI-CACHE, et seulement en LOCAL. `?v=<timestamp>` garantit qu'un F5 après
// une modification recharge vraiment le code (ceinture et bretelles avec le
// `Cache-Control: no-store` de `dev_server.py`, utile si le jeu est servi par
// autre chose). En ligne, c'est exactement ce qu'il ne faut pas : l'URL change
// à chaque visite, donc 600 ko de JS retéléchargés à chaque fois, sans jamais
// rien mettre en cache. Hors localhost on charge donc l'URL nue et on laisse
// l'ETag du serveur faire son travail (revalidation, 304, aucun octet transféré
// si rien n'a bougé). Pour un vrai cache immuable, passer par `build.py`, qui
// produit un fichier unique nommé par empreinte.
(function () {
  const FILES = [
    'config', 'utils', 'gags', 'species', 'sprites', 'world', 'camera', 'particles', 'food',
    'fishbody', 'entity', 'idcard', 'legend', 'ecosystem', 'background', 'input',
    'svgexport', 'svgimport', 'save', 'main',
  ];
  const local = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname);
  const v = local ? `?v=${Date.now()}` : '';
  for (const name of FILES) {
    const s = document.createElement('script');
    s.src = `js/${name}.js${v}`;
    s.async = false;
    document.head.appendChild(s);
  }
})();
