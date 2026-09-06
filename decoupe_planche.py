# -*- coding: utf-8 -*-
"""La planche des 30 creatures -> une image de reperage par espece.

Assets/Reperes/<espece>.png  (PNG detoure, sans la legende, sans le voisin)
Assets/Reperes/index.json    (ce que l'atelier lit pour savoir qui en a une)

Le decoupage n'est pas une grille aveugle : dans chaque case on garde la plus
grosse composante connexe (la creature) et ce qui la touche, ce qui ecarte a la
fois la legende et le bout de dessin de la case d'a cote.
"""
import numpy as np, cv2, os, json
from PIL import Image

SRC = 'Assets/Concepts/Design Final.png'
OUT = 'Assets/Reperes'
COLS, ROWS = 5, 6
# MARGE AUTOUR DE LA CASE. La grille est un reperage, pas une frontiere : les
# creatures debordent de leur case, et decouper AU RAS coupait 17 vignettes sur
# 30 — toujours d'un cote, jamais en haut ni en bas (le perroquet perdait
# 96 pixels de bec sur son bord droit). On travaille donc sur une case elargie,
# et c'est la COMPOSANTE de la creature qui decide du cadrage final.
#
# Le choix de la bonne composante, lui, reste juge sur la case NOMINALE : sans
# ca on attraperait la voisine, qui est maintenant visible elle aussi.
MARGE = 0.25

# L'ordre de la planche, qui est aussi celui de FICHES.md.
ESPECES = [
    'bulle_fofolle', 'volant', 'moustachu', 'pelican', 'confetti',
    'thon', 'clown', 'hippocampe', 'perroquet', 'dauphin',
    'coquillage', 'etoile', 'anemone', 'meduse', 'requin',
    'murene', 'raie', 'poisson_lune', 'orque', 'lanterne',
    'crevette', 'calamar', 'calamar_geant', 'poisson_tapis', 'poulpe',
    'crabe', 'cachalot', 'gros_dodo', 'anguille', 'merou',
]


def nom_de(idx): return ESPECES[idx]


# Sens du dessin sur la planche, relu a l'oeil sur les 30 vignettes. Une
# detection automatique par la position de l'oeil se trompait 8 fois sur 30
# (ventre blanc pris pour un oeil, creatures vues de face) : sur un asset fige
# de trente images, la table est plus sure et se verifie d'un coup d'oeil.
VERS_LA_GAUCHE = {
    'bulle_fofolle', 'thon', 'clown', 'hippocampe', 'perroquet', 'dauphin',
    'requin', 'poisson_lune', 'lanterne', 'crevette', 'calamar',
    'calamar_geant', 'poisson_tapis', 'cachalot', 'gros_dodo', 'anguille',
    'merou',
}


def bouche_trous(m):
    """Un ventre blanc n'est pas du fond : on rebouche l'interieur du contour."""
    h, w = m.shape
    pad = cv2.copyMakeBorder(m, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    mask = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(pad, mask, (0, 0), 1)
    return ((pad[1:-1, 1:-1] != 1) | (m > 0)).astype(np.uint8)


def main():
    os.makedirs(OUT, exist_ok=True)
    im = np.array(Image.open(SRC).convert('RGB'))
    H, W, _ = im.shape
    cw, ch = W / COLS, H / ROWS
    ink = (im.min(axis=2) < 244).astype(np.uint8)
    sat = im.max(axis=2).astype(int) - im.min(axis=2).astype(int)

    index = {}
    for r in range(ROWS):
        for c in range(COLS):
            idx = r * COLS + c
            if idx >= len(ESPECES):
                continue
            y0, y1, x0, x1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
            # Case elargie, bornee a la planche.
            ey0, ey1 = max(0, int(y0 - ch * MARGE)), min(H, int(y1 + ch * MARGE))
            ex0, ex1 = max(0, int(x0 - cw * MARGE)), min(W, int(x1 + cw * MARGE))
            # Position de la case NOMINALE dans la case elargie : tous les tests
            # de placement (« la legende est en bas de la case », « la creature
            # est au centre ») restent exprimes dans la case d'origine, sinon la
            # marge les decale et ils attrapent la voisine.
            offx, offy = x0 - ex0, y0 - ey0
            sub, ssat = ink[ey0:ey1, ex0:ex1].copy(), sat[ey0:ey1, ex0:ex1]
            h, w = sub.shape
            # Les GLYPHES d'abord. La legende de l'etoile touchait un de ses
            # bras : dilatee, elle entrait dans la composante du dessin et plus
            # aucun filtre posterieur ne pouvait l'en sortir. Une lettre est
            # petite, sombre et grise — ca suffit a la reconnaitre une par une.
            gn, glab, gst, gcen = cv2.connectedComponentsWithStats(sub, 8)
            for i in range(1, gn):
                m = (glab == i)
                if (gst[i, cv2.CC_STAT_AREA] < 900
                        and gst[i, cv2.CC_STAT_HEIGHT] < 34
                        and ssat[m].mean() < 25
                        and gcen[i][1] - offy > ch * 0.55):
                    sub[m] = 0
            big = cv2.dilate(sub, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
            n, lab, st, cen = cv2.connectedComponentsWithStats(big, 8)
            best, barea = 0, 0
            for i in range(1, n):
                cx, cy = cen[i][0] - offx, cen[i][1] - offy
                if not (0.1 * cw < cx < 0.9 * cw and 0.05 * ch < cy < 0.8 * ch):
                    continue
                if st[i, cv2.CC_STAT_AREA] > barea:
                    barea, best = st[i, cv2.CC_STAT_AREA], i
            if not best:
                print('!! rien trouve pour', ESPECES[idx])
                continue
            corps = (lab == best)
            proche = cv2.dilate(corps.astype(np.uint8),
                                cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
            garde = np.zeros_like(sub)
            for i in range(1, n):
                m = (lab == i)
                if i != best:
                    if not (m & (proche > 0)).any():
                        continue                                   # accessoire flottant
                    if st[i, cv2.CC_STAT_AREA] < 60:
                        continue
                    if ssat[m & (sub > 0)].mean() < 25:
                        continue                                   # texte de la legende
                    # La legende occupe le bas de la case. Une piece DETACHEE qui
                    # y tombe est du texte : les morceaux du dessin, eux, sont
                    # deja soudes au corps par la dilatation. Sans cette regle,
                    # « Etoile Ventouse » restait collee sous son etoile.
                    if cen[i][1] - offy > ch * 0.78:
                        continue
                garde[m] = 1
            garde = bouche_trous((garde & sub).astype(np.uint8))
            ys, xs = np.nonzero(garde)
            pad = 3
            sx0, sx1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)
            sy0, sy1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
            rgb = im[ey0:ey1, ex0:ex1][sy0:sy1, sx0:sx1]
            mask = garde[sy0:sy1, sx0:sx1]
            # bord adouci : un detourage au pixel donne un lisere en escalier
            alpha = cv2.GaussianBlur(mask * 255, (3, 3), 0)
            out = np.dstack([rgb, alpha]).astype(np.uint8)
            # Le jeu dessine TOUT vers la droite (`Entity.orientation` s'occupe
            # du demi-tour). Une planche tournee vers la gauche servirait de
            # patron a l'envers : on la retourne une bonne fois ici, plutot que
            # de laisser 17 especes sur 30 se calquer en miroir.
            if nom_de(idx) in VERS_LA_GAUCHE:
                out = out[:, ::-1]
            nom = nom_de(idx)
            Image.fromarray(out, 'RGBA').save(f'{OUT}/{nom}.png')
            index[nom] = dict(w=int(out.shape[1]), h=int(out.shape[0]),
                              rang=idx + 1, retourne=nom in VERS_LA_GAUCHE)
    json.dump(index, open(f'{OUT}/index.json', 'w'), indent=0, sort_keys=True)
    print(len(index), 'reperes ecrits dans', OUT)


if __name__ == '__main__':
    main()
