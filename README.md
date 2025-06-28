# Inkfinity - Canvas Collaboratif Infini

Un canvas collaboratif infini en temps réel avec React, PixiJS et Socket.IO.

## 🚀 Fonctionnalités

- **Canvas infini** : Zoom et pan illimités avec virtualisation
- **Collaboration temps réel** : Dessin synchronisé entre tous les utilisateurs
- **Curseurs distants** : Voir les curseurs des autres utilisateurs en temps réel
- **Brushes avancés** : 7 types de pinceaux différents (rond, calligraphique, crayon, marqueur, gomme, rainbow, pattern)
- **Rendu WebGL** : Performance optimale avec PixiJS
- **Interface moderne** : Interface React responsive et intuitive
- **Stockage persistant** : Support MongoDB pour la persistance des données

## 🛠️ Technologies

- **Frontend** : React 18, Vite, PixiJS
- **Backend** : Node.js, Express, Socket.IO
- **Base de données** : MongoDB avec Mongoose
- **Package Manager** : pnpm
- **Déploiement** : Render.com

## 📦 Installation

### Prérequis
- Node.js >= 18.0.0
- pnpm (recommandé) ou npm

### Installation avec pnpm (recommandé)
```bash
# Installer pnpm globalement
npm install -g pnpm

# Cloner le projet
git clone <repository-url>
cd Inkfinity

# Installer les dépendances
pnpm install

# Développement
pnpm dev

# Production
pnpm build
pnpm start
```

### Installation avec npm
```bash
# Cloner le projet
git clone <repository-url>
cd Inkfinity

# Installer les dépendances
npm install

# Développement
npm run dev

# Production
npm run build
npm start
```

## 🎮 Utilisation

### Navigation
- **Trackpad** : Déplacer le canvas
- **Molette** : Zoom in/out
- **Ctrl+Clic** : Pan manuel

### Outils de dessin
- **Couleur** : Sélecteur de couleur
- **Taille** : Slider de 1 à 20 pixels
- **Type de brush** : 7 styles différents
- **Effacer** : Bouton pour vider tout le canvas

## 🏗️ Architecture

```
src/
├── components/          # Composants React
│   ├── Canvas.jsx      # Canvas principal avec PixiJS
│   ├── Controls.jsx    # Panneau de contrôles
│   ├── CursorPreview.jsx # Aperçu du curseur
│   ├── Coordinates.jsx # Affichage des coordonnées
│   ├── RemoteCursors.jsx # Curseurs des autres utilisateurs
│   └── Status.jsx      # Statut de connexion
├── hooks/              # Hooks personnalisés
│   ├── useCanvas.js    # Logique du canvas
│   ├── useBrush.js     # Gestion des brushes
│   └── useSocket.js    # Communication Socket.IO
├── utils/              # Utilitaires
│   └── uuid.js         # Génération d'UUID
├── App.jsx             # Composant principal
├── main.jsx            # Point d'entrée
└── index.css           # Styles globaux
```

## 🔧 Configuration

### Variables d'environnement

Copier `env.example` vers `.env` et configurer :

```bash
# Configuration du serveur
PORT=3000
HOST=localhost

# Type de stockage (memory ou mongodb)
STORAGE_TYPE=memory

# Configuration MongoDB (requis si STORAGE_TYPE=mongodb)
MONGODB_URI=mongodb://localhost:27017/inkfinity
```

### Configuration locale MongoDB

```bash
# Installer MongoDB localement
# macOS avec Homebrew
brew install mongodb-community

# Démarrer MongoDB
brew services start mongodb-community

# Ou utiliser MongoDB Atlas (cloud)
```

## 🚀 Déploiement sur Render.com

### Méthode 1 : Déploiement automatique avec render.yaml

1. Pousser le code sur GitHub
2. Connecter le repository à Render
3. Render détectera automatiquement le fichier `render.yaml`
4. Le déploiement se fera automatiquement avec MongoDB

### Méthode 2 : Déploiement manuel

1. **Créer un nouveau Web Service sur Render**
   - Connecter le repository GitHub
   - Build Command : `npm install && npm run build`
   - Start Command : `npm start`

2. **Créer une base de données MongoDB**
   - Créer un nouveau service MongoDB
   - Copier l'URI de connexion

3. **Configurer les variables d'environnement**
   ```
   NODE_ENV=production
   STORAGE_TYPE=mongodb
   MONGODB_URI=<URI_DE_TA_BASE_DE_DONNEES>
   ```

4. **Déployer**
   - Render buildera et déploiera automatiquement

### Variables d'environnement Render

- `PORT` : Automatiquement défini par Render
- `NODE_ENV` : `production`
- `STORAGE_TYPE` : `mongodb`
- `MONGODB_URI` : Fourni par Render lors de la création de la base de données

## 📝 Scripts disponibles

```bash
# Développement
pnpm dev          # Lance le serveur + client en mode dev
pnpm server       # Lance uniquement le serveur
pnpm client       # Lance uniquement le client Vite

# Production
pnpm build        # Build l'application React
pnpm start        # Lance le serveur de production
pnpm preview      # Preview du build local

# Installation
pnpm install      # Installe les dépendances
```

## 🔍 Développement

### Structure des données MongoDB

```javascript
{
  x1: Number,        // Coordonnée X du point de départ
  y1: Number,        // Coordonnée Y du point de départ
  x2: Number,        // Coordonnée X du point d'arrivée
  y2: Number,        // Coordonnée Y du point d'arrivée
  color: String,     // Couleur du trait (hex)
  size: Number,      // Taille du pinceau
  brush: String,     // Type de brush
  timestamp: Date    // Timestamp de création
}
```

### Ajout de nouveaux types de brush

1. Ajouter le type dans `src/components/Controls.jsx`
2. Implémenter le rendu dans `src/components/Canvas.jsx`
3. Tester avec différents paramètres

## 📝 Licence

MIT License - Voir le fichier LICENSE pour plus de détails. 