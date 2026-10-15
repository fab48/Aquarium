// Compteur de performance, touche F. En bas à droite, sous la jauge de
// profondeur. Fait pour juger le jeu sur une vraie machine (vieux PC, mobile)
// sans console : c'est là que les estimations de PERFORMANCE.md se vérifient.
//
// Trois chiffres, et c'est leur RAPPORT qui renseigne :
// - « frame » = l'intervalle réel entre deux frames rendues, la seule mesure
//   fiable (cf. PERFORMANCE.md §8.3) ;
// - « sim » = Ecosystem & Cie, du JavaScript pur : un processeur faible se lit
//   ici ;
// - « dessin » = l'ÉMISSION des commandes canvas. Canvas 2D les empile sans
//   les exécuter, donc ce chiffre ne compte pas la rastérisation : si frame
//   dépasse nettement sim + dessin, c'est la carte graphique (ou le rendu
//   logiciel) qui coince, pas le processeur.
// La dernière ligne dit où en est `Main.adaptResolution` : un plafond tombé à
// 30 ou un dpr réduit signalent que le jeu s'est déjà défendu tout seul.
//
// Rien n'est mesuré tant que le compteur est caché. Élément et style sont créés
// ici, sans toucher à index.html ni au CSS.
const Fps = {
  el: null,
  visible: false,
  _n: 0, _frame: 0, _sim: 0, _dessin: 0, _depuis: 0, _dernier: 0,

  init() {
    window.addEventListener('keydown', ev => {
      if (ev.key !== 'f' && ev.key !== 'F') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;     // Ctrl+F reste au navigateur
      const cible = ev.target;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      this.basculer();
    });
  },

  basculer() {
    this.visible = !this.visible;
    if (!this.el) {
      const el = document.createElement('div');
      el.id = 'fps';
      el.style.cssText = 'position:absolute;right:12px;bottom:12px;z-index:20;'
        + 'padding:5px 8px;border-radius:6px;background:rgba(6,20,32,.72);'
        + 'color:#cfe8f5;font:11px/1.35 ui-monospace,Consolas,monospace;'
        + 'white-space:pre;text-align:right;pointer-events:none;';
      document.body.appendChild(el);
      this.el = el;
    }
    this.el.style.display = this.visible ? '' : 'none';
    this._n = this._frame = this._sim = this._dessin = 0;
    this._depuis = this._dernier = 0;
    if (this.visible) this.el.textContent = '…';
  },

  // Appelé par Main.frame sur chaque frame RENDUE (les frames sautées par le
  // plafond de cadence n'arrivent pas jusqu'ici).
  mesure(ts, sim, dessin) {
    if (!this.visible) return;
    if (this._dernier) {
      const ecart = ts - this._dernier;
      if (ecart > 0 && ecart < 250) {       // une reprise d'onglet n'est pas une frame lente
        this._n++; this._frame += ecart; this._sim += sim; this._dessin += dessin;
      }
    }
    this._dernier = ts;
    if (!this._depuis) this._depuis = ts;
    if (ts - this._depuis < 500 || !this._n) return;    // deux mises à jour par seconde
    const n = this._n, f = this._frame / n;
    const vivants = Ecosystem.entities.reduce((k, e) => k + (e.dead ? 0 : 1), 0);
    this.el.textContent =
      `${Math.round(1000 / f)} fps · frame ${f.toFixed(1)} ms\n`
      + `sim ${(this._sim / n).toFixed(1)} · dessin ${(this._dessin / n).toFixed(1)} ms\n`
      + `${vivants} créatures · dpr ${+Main.dpr.toFixed(2)} · max ${Main.fpsCap} fps`;
    this._n = this._frame = this._sim = this._dessin = 0;
    this._depuis = ts;
  },
};

Fps.init();
