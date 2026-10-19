## 🐠 Jouer

1. Téléchargez **`Aquarium-Vivant.html`** ci-dessous (dans « Assets »).
2. Double-cliquez dessus : le jeu s'ouvre dans votre navigateur.

C'est tout. Il n'y a rien à installer, pas besoin de Python ni de serveur, et ça marche sans connexion internet.

Ce fichier unique contient le jeu complet **et les dessins de toutes les créatures**.

> **Pourquoi pas `index.html` du dépôt ?** Si vous téléchargez le code (« Code → Download ZIP ») et ouvrez `index.html` d'un double-clic, le navigateur bloque le chargement des dessins (`Assets/*.json`) pour des raisons de sécurité. Le jeu se lance quand même, mais avec des silhouettes génériques à la place des dessins. Pour jouer depuis le code source, lancez plutôt `Aquarium.bat` sous Windows, ou `python dev_server.py 8642` puis ouvrez http://localhost:8642/.

## Contrôles

- **Clic** : nourrir · **clic maintenu** : bulles
- **Molette** : zoom · **clic droit / clic molette** ou souris au bord : déplacer la vue
- **Double-clic sur une créature** : la caméra la suit
- **Appui long sur une créature** : l'attraper
- 🔍 : fiche d'identité · ❔ : légende des bulles et des expressions · **F** : compteur de performance
- Au doigt : tap = nourrir, glisser = déplacer, pincer = zoomer

L'aquarium se sauvegarde tout seul dans le navigateur. 💾 et 📂 permettent d'emporter la sauvegarde dans un fichier et de la recharger ailleurs.

## Contenu

- Plus de cinquante espèces, toutes dessinées
- Chaîne alimentaire complète, de la plage aux abysses, avec cycle jour/nuit
- Navigateurs : Chrome / Edge 80+, Firefox 74+, Safari 13.1+

---

Conception, game design et dessins : Fabien Lacan. Code écrit avec l'aide de Claude (Anthropic). Licence MIT.
