// Chargeur de scripts avec anti-cache (projet sans build : pas de bundler pour
// gérer les versions). `async = false` conserve l'ordre d'exécution.
(function () {
  const FILES = [
    'config', 'utils', 'gags', 'species', 'sprites', 'world', 'camera', 'particles', 'food',
    'fishbody', 'entity', 'idcard', 'legend', 'ecosystem', 'background', 'input', 'main',
  ];
  const v = Date.now();
  for (const name of FILES) {
    const s = document.createElement('script');
    s.src = `js/${name}.js?v=${v}`;
    s.async = false;
    document.head.appendChild(s);
  }
})();
