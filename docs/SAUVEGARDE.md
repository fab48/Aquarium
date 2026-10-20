# Sauvegarde

Ce qu'on enregistre, ce qu'on n'enregistre pas, et toutes les entrées de secours.

> Déplacé tel quel depuis `CLAUDE.md` (octobre 2026), qui ne garde que les
> règles et la carte du projet. Les chiffres datés sont ceux de leur audit ;
> l'état courant se vérifie avec le banc d'essai (`node outils/banc.js`).

## Sauvegarde (`js/save.js`)

L'aquarium se retrouve tel qu'on l'a laissé, sur le web comme sur mobile.
`localStorage`, clé `aquarium.sauvegarde`, **9 à 10 ko pour ~550 créatures**.

Ce qu'on enregistre : la **graine du monde**, l'heure qu'il était, la caméra, et
par créature son espèce, sa position (entière), son stade et son banc. Pas
d'âge, pas de faim, pas de vélocité, pas de particules. Cinq points qui ne se
devinent pas :

- **La graine d'abord.** `Background.init(graine)` construit 260 rochers, les
  herbiers et les cheminées **au hasard** ; sans graine, `habitatSpots` change
  d'une session à l'autre et une étoile de mer restaurée sur son rocher se
  réveille sur du sable nu. `U.semer` / `U.alea` / `U.oublier` : le mode semé ne
  vaut QUE pour la génération du décor — la simulation doit garder du vrai
  hasard, sinon toutes les parties se déroulent à l'identique. Le décor est donc
  reconstruit **avant** qu'on y replace les créatures.
- **Les bancs sont renumérotés.** `groupId` est un compteur global qui n'a aucun
  sens d'une session à l'autre. Sans lui, un banc de confettis se rouvre en
  quarante poissons solitaires — et sa figure en cœur, qui exige un chef de
  banc, ne se joue plus jamais.
- **Ne pas retenir l'âge est un choix, pas un oubli.** Le constructeur donne
  déjà un âge aléatoire aux adultes créés directement, précisément pour qu'une
  classe d'âge entière ne meure pas d'un coup.
- **Le monde ne vit pas pendant l'absence, et il n'y a rien à coder pour ça** :
  `requestAnimationFrame` est en pause dès que l'onglet est caché (le « piège
  dev connu » plus bas est ici une fonctionnalité). On ne rejoue rien au retour.
- **`visibilitychange` fait foi, pas `beforeunload`** : sur mobile, une
  application passée en arrière-plan peut être tuée sans jamais le déclencher.
  Il y a en plus une sauvegarde périodique (20 s de jeu) et `pagehide`.

Toutes les entrées de secours sont vérifiées : JSON tronqué, illisible, vide,
mauvaise version, graine absente, `pop` vide, espèce disparue du code, positions
`NaN`, `localStorage` qui lève (mode privé, quota) — chacune donne un monde neuf
ou une restauration partielle, **jamais une exception ni une page blanche**. Une
espèce inconnue est sautée, l'immigration la ramènera si elle existe encore ; un
quota dépassé désactive la sauvegarde au lieu de relancer une exception toutes
les vingt secondes.

Cas vécu (2026-09-06) : un `NaN` de position devient **`null` dans le JSON**
(`JSON.stringify` ne connaît pas NaN) — une session de debug qui appelait
`Ecosystem.update()` **sans dt** avait mis tous les nageurs libres en NaN, la
sauvegarde suivante a écrit des null, la restauration jetait les 7 espèces d'un
coup et l'autosave gravait la perte à chaque rechargement : une extinction
silencieuse en cascade, alors que seules les espèces fixes/rampantes
survivaient. Depuis, une espèce dont **toutes** les entrées sont illisibles est
**repeuplée immédiatement** (`spawnGroups`, comme l'immigration mais sans
attendre) ; s'il reste des congénères valides, on ne fait rien. Le moteur
lui-même ne produit pas de NaN en marche normale (vérifié sur 5 min de
simulation au dt réel) — c'est bien la donnée sauvée qu'il faut savoir réparer.

Deux boutons discrets sous ↻ : **💾 emporter** (télécharge la sauvegarde en
fichier) et **📂 rapporter** (la recharge, avec confirmation — un fichier
illisible est refusé AVANT de toucher au stockage, l'aquarium courant ne
risque rien). La raison d'être est iOS, qui efface le localStorage des sites
non visités depuis 7 jours : le fichier est la seule persistance sûre, et il
sert aussi à déménager un aquarium d'un appareil à l'autre. `FileReader` et
pas `Blob.text()` : ce dernier n'existe qu'à partir de Safari 14, or le socle
du jeu est Safari 13.1.

Le bouton **↻** (en haut à gauche, avec confirmation) efface et recharge. Il est
volontairement **hors de la barre d'action** : c'est la seule commande qui
détruise quelque chose, elle n'a rien à faire à côté de « nourrir » — et la
barre est calibrée au pixel pour tenir dans les 375 px d'un petit téléphone, un
septième bouton la ferait déborder.
