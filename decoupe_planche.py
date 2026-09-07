# -*- coding: utf-8 -*-
"""Les planches du design -> une image de reperage par espece.

Assets/Reperes/<espece>.png  (PNG detoure, sans la legende, sans le voisin)
Assets/Reperes/index.json    (ce que l'atelier lit pour savoir qui en a une)

Le decoupage n'est pas une grille aveugle : dans chaque case on garde la plus
grosse composante connexe (la creature) et ce qui la touche, ce qui ecarte a la
fois la legende et le bout de dessin de la case d'a cote.
"""
import numpy as np, cv2, os, json
from PIL import Image

OUT = 'Assets/Reperes'
# MARGE AUTOUR DE LA CASE. La grille est un reperage, pas une frontiere : les
# creatures debordent de leur case, et decouper AU RAS coupait 17 vignettes sur
# 30 — toujours d'un cote, jamais en haut ni en bas (le perroquet perdait
# 96 pixels de bec sur son bord droit). On travaille donc sur une case elargie,
# et c'est la COMPOSANTE de la creature qui decide du cadrage final.
#
# Le choix de la bonne composante, lui, reste juge sur la case NOMINALE : sans
# ca on attraperait la voisine, qui est maintenant visible elle aussi.
MARGE = 0.25

# UNE PLANCHE = une image, sa grille, et l'ordre de ses cases. Il y en a deux :
# les 30 premieres creatures, puis les 21 qui restaient sans dessin. Les deux se
# decoupent avec le meme code et alimentent le meme index — l'atelier ne connait
# que `Assets/Reperes/<espece>.png`, pas la planche d'ou elle sort.
#
# `gauche` : le sens du dessin, relu A L'OEIL sur les vignettes. Une detection
# automatique par la position de l'oeil se trompait 8 fois sur 30 (ventre blanc
# pris pour un oeil, creatures vues de face) : sur un asset fige, la table est
# plus sure et se verifie d'un coup d'oeil.
PLANCHES = [
    dict(
        src='Assets/Concepts/Design Final.png', cols=5, rows=6,
        especes=[
            'bulle_fofolle', 'volant', 'moustachu', 'pelican', 'confetti',
            'thon', 'clown', 'hippocampe', 'perroquet', 'dauphin',
            'coquillage', 'etoile', 'anemone', 'meduse', 'requin',
            'murene', 'raie', 'poisson_lune', 'orque', 'lanterne',
            'crevette', 'calamar', 'calamar_geant', 'poisson_tapis', 'poulpe',
            'crabe', 'cachalot', 'gros_dodo', 'anguille', 'merou',
        ],
        gauche={
            'bulle_fofolle', 'thon', 'clown', 'hippocampe', 'perroquet',
            'dauphin', 'requin', 'poisson_lune', 'lanterne', 'crevette',
            'calamar', 'calamar_geant', 'poisson_tapis', 'cachalot',
            'gros_dodo', 'anguille', 'merou',
        },
    ),
    dict(
        src='Assets/Concepts/Design Final page2.png', cols=5, rows=5,
        especes=[
            'fugu', 'dentiste', 'police', 'papillon', 'dorade',
            'coffre', 'nudibranche', 'corail', 'tortue', 'espadon',
            'maquereau', 'crevette_claire', 'goeland', 'cormoran', 'jardiniere',
            'bernard', 'concombre', 'rascasse', 'oursin', 'barracuda',
            'krill',
        ],
        # Relu a l'oeil sur la planche-contact des 21 vignettes.
        gauche={
            'fugu', 'dentiste', 'police', 'papillon', 'dorade', 'coffre',
            'nudibranche', 'tortue', 'espadon', 'maquereau', 'crevette_claire',
            'goeland', 'concombre', 'rascasse', 'barracuda',
        },
    ),
]


def bouche_trous(m):
    """Un ventre blanc n'est pas du fond : on rebouche l'interieur du contour."""
    h, w = m.shape
    pad = cv2.copyMakeBorder(m, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
    mask = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(pad, mask, (0, 0), 1)
    return ((pad[1:-1, 1:-1] != 1) | (m > 0)).astype(np.uint8)


def analyse(planche):
    """Passe 1 : pour chaque case, la COMPOSANTE qui est la creature.

    Separee de la decoupe parce qu'il faut connaitre le corps des VOISINES avant
    de decider ce qu'on garde autour du sien (cf. `decoupe`).
    """
    especes, cols = planche['especes'], planche['cols']
    im = np.array(Image.open(planche['src']).convert('RGB'))
    H, W, _ = im.shape
    cw, ch = W / cols, H / planche['rows']
    ink = (im.min(axis=2) < 244).astype(np.uint8)
    sat = im.max(axis=2).astype(int) - im.min(axis=2).astype(int)
    cases = []
    for idx, nom in enumerate(especes):
        r, c = divmod(idx, cols)
        y0, y1, x0, x1 = int(r * ch), int((r + 1) * ch), int(c * cw), int((c + 1) * cw)
        # Case elargie, bornee a la planche.
        ey0, ey1 = max(0, int(y0 - ch * MARGE)), min(H, int(y1 + ch * MARGE))
        ex0, ex1 = max(0, int(x0 - cw * MARGE)), min(W, int(x1 + cw * MARGE))
        # Position de la case NOMINALE dans la case elargie : tous les tests de
        # placement (« la legende est en bas de la case », « la creature est au
        # centre ») restent exprimes dans la case d'origine, sinon la marge les
        # decale et ils attrapent la voisine.
        offx, offy = x0 - ex0, y0 - ey0
        sub, ssat = ink[ey0:ey1, ex0:ex1].copy(), sat[ey0:ey1, ex0:ex1]
        # Les GLYPHES d'abord. La legende de l'etoile touchait un de ses bras :
        # dilatee, elle entrait dans la composante du dessin et plus aucun filtre
        # posterieur ne pouvait l'en sortir. Une lettre est petite, sombre et
        # grise — ca suffit a la reconnaitre une par une.
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
            print('!! rien trouve pour', nom)
        cases.append(dict(nom=nom, im=im, W=W, H=H, cw=cw, ch=ch,
                          ex0=ex0, ex1=ex1, ey0=ey0, ey1=ey1, offx=offx, offy=offy,
                          sub=sub, ssat=ssat, n=n, lab=lab, st=st, cen=cen, best=best))
    return cases


def decoupe(planche, index):
    """Passe 2 : une planche -> ses vignettes, ajoutees a `index`."""
    cases = analyse(planche)
    gauche = planche['gauche']
    W, H = cases[0]['W'], cases[0]['H']
    # QUI POSSEDE QUEL PIXEL. Les cases se recouvrent (la marge de 25 %), donc
    # une case voit le corps de sa voisine et le prenait pour un accessoire du
    # sien : le Poisson Dentiste emportait le Poisson Police, la Raie emportait
    # la tete de la Murene. Un accessoire est petit, mais pas assez petit pour
    # qu'un seuil d'aire tranche (12,9 % du corps pour un vrai morceau contre
    # 15,8 % pour une voisine). Le critere EXACT est ailleurs : une composante
    # qui recouvre le corps CHOISI par une autre case EST cette creature-la.
    # Mesure sur les deux planches : 100,0 % de recouvrement pour les quatre
    # intruses, 0,0 % pour les quinze vrais accessoires — bulles, notes de
    # musique, etincelles.
    proprio = np.zeros((H, W), np.int16)
    for j, k in enumerate(cases):
        if k['best']:
            proprio[k['ey0']:k['ey1'], k['ex0']:k['ex1']][k['lab'] == k['best']] = j + 1

    for j, k in enumerate(cases):
        if not k['best']:
            continue
        nom, sub, ssat, ch = k['nom'], k['sub'], k['ssat'], k['ch']
        lab, st, cen, n = k['lab'], k['st'], k['cen'], k['n']
        h, w = sub.shape
        corps = (lab == k['best'])
        proche = cv2.dilate(corps.astype(np.uint8),
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
        vue = proprio[k['ey0']:k['ey1'], k['ex0']:k['ex1']]
        garde = np.zeros_like(sub)
        for i in range(1, n):
            m = (lab == i)
            if i != k['best']:
                if not (m & (proche > 0)).any():
                    continue                                   # accessoire flottant
                if st[i, cv2.CC_STAT_AREA] < 60:
                    continue
                if ssat[m & (sub > 0)].mean() < 25:
                    continue                                   # texte de la legende
                pr = vue[m]
                if ((pr != 0) & (pr != j + 1)).mean() > 0.5:
                    continue                                   # la creature d'a cote
                # La legende occupe le bas de la case. Une piece DETACHEE qui y
                # tombe est du texte : les morceaux du dessin, eux, sont deja
                # soudes au corps par la dilatation. Sans cette regle, « Etoile
                # Ventouse » restait collee sous son etoile.
                if cen[i][1] - k['offy'] > ch * 0.78:
                    continue
            garde[m] = 1
        garde = bouche_trous((garde & sub).astype(np.uint8))
        ys, xs = np.nonzero(garde)
        pad = 3
        sx0, sx1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)
        sy0, sy1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
        rgb = k['im'][k['ey0']:k['ey1'], k['ex0']:k['ex1']][sy0:sy1, sx0:sx1]
        mask = garde[sy0:sy1, sx0:sx1]
        # bord adouci : un detourage au pixel donne un lisere en escalier
        alpha = cv2.GaussianBlur(mask * 255, (3, 3), 0)
        out = np.dstack([rgb, alpha]).astype(np.uint8)
        # Le jeu dessine TOUT vers la droite (`Entity.orientation` s'occupe du
        # demi-tour). Une planche tournee vers la gauche servirait de patron a
        # l'envers : on la retourne une bonne fois ici, plutot que de laisser
        # 32 especes sur 51 se calquer en miroir.
        if nom in gauche:
            out = out[:, ::-1]
        Image.fromarray(out, 'RGBA').save('%s/%s.png' % (OUT, nom))
        index[nom] = dict(w=int(out.shape[1]), h=int(out.shape[0]),
                          rang=j + 1, retourne=nom in gauche)


def main():
    os.makedirs(OUT, exist_ok=True)
    index = {}
    for planche in PLANCHES:
        avant = len(index)
        decoupe(planche, index)
        print('%3d vignettes  %s' % (len(index) - avant, planche['src']))
    json.dump(index, open('%s/index.json' % OUT, 'w'), indent=0, sort_keys=True)
    print(len(index), 'reperes ecrits dans', OUT)


if __name__ == '__main__':
    main()
