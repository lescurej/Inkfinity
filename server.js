const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { StorageFactory } = require('./storage');
const config = require('./config');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialisation du système de stockage
const storageOptions = config.storage.type === 'mongodb' 
  ? { uri: config.storage.mongodb.uri }
  : {};
const storage = StorageFactory.create(config.storage.type, storageOptions);

// Connexion à la base de données si nécessaire
async function initializeStorage() {
  try {
    if (config.storage.type === 'mongodb') {
      await storage.connect();
      console.log('✅ Base de données MongoDB connectée');
    } else {
      console.log('✅ Stockage mémoire activé');
    }
  } catch (error) {
    console.error('❌ Erreur de connexion au stockage:', error.message);
    process.exit(1);
  }
}

// Servir les fichiers statiques React
app.use(express.static(path.join(__dirname, 'dist')));

// Route pour toutes les pages React (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Map pour suivre les UUID des sockets
const userUUIDs = new Map();

io.on('connection', async (socket) => {
  console.log('🟢 Utilisateur connecté');

  try {
    // Envoyer l'historique des dessins au nouveau client
    const pointCount = await storage.getPointCount();
    if (pointCount > 0) {
      console.log(`📤 Envoi de ${pointCount} points au nouveau client`);
      const drawingHistory = await storage.getAllPoints();
      socket.emit('drawingHistory', drawingHistory);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'historique:', error.message);
  }

  socket.on('draw', async (data) => {
    try {
      // Validation des coordonnées (support des coordonnées infinies)
      if (
        typeof data.x1 !== 'number' || typeof data.y1 !== 'number' ||
        typeof data.x2 !== 'number' || typeof data.y2 !== 'number'
      ) {
        console.warn('⚠️ Coordonnées invalides reçues:', data);
        return;
      }
      // Limiter les coordonnées à des valeurs raisonnables pour éviter les débordements
      const maxCoord = 1000000; // 1 million de pixels
      if (
        Math.abs(data.x1) > maxCoord || Math.abs(data.y1) > maxCoord ||
        Math.abs(data.x2) > maxCoord || Math.abs(data.y2) > maxCoord
      ) {
        console.warn('⚠️ Coordonnées trop grandes ignorées:', data);
        return;
      }
      // Ajouter le segment au stockage
      await storage.addPoint(data);
      // Diffuser le segment à tous les autres clients
      socket.broadcast.emit('draw', data);
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du segment:', error.message);
    }
  });

  socket.on('clearCanvas', async () => {
    try {
      // Vider le stockage
      await storage.clearAll();
      console.log('🧹 Canvas effacé par un utilisateur');
      
      // Diffuser l'événement de nettoyage à tous les autres clients
      socket.broadcast.emit('clearCanvas');
    } catch (error) {
      console.error('❌ Erreur lors de l\'effacement:', error.message);
    }
  });

  socket.on('cursorMove', (data) => {
    if (data && data.uuid && typeof data.x === 'number' && typeof data.y === 'number') {
      userUUIDs.set(socket.id, data.uuid);
      // Relayer la position à tous les autres clients
      socket.broadcast.emit('remoteCursor', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Utilisateur déconnecté');
    // Informer les autres clients de la déconnexion
    const uuid = userUUIDs.get(socket.id);
    if (uuid) {
      socket.broadcast.emit('userDisconnect', uuid);
      userUUIDs.delete(socket.id);
    }
  });
});

// Initialisation et démarrage du serveur
async function startServer() {
  await initializeStorage();
  
  const { port, host } = config.server;
  server.listen(port, host, () => {
    console.log(`✅ Serveur lancé sur http://${host}:${port}`);
    console.log(`💾 Type de stockage: ${config.storage.type}`);
    console.log(`🎨 Canvas infini avec React et PixiJS activé`);
  });
}

startServer().catch(error => {
  console.error('❌ Erreur lors du démarrage du serveur:', error);
  process.exit(1);
}); 