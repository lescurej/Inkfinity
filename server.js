const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e4,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  allowUpgrades: true,
  transports: ['websocket']
});

// Stockage en mémoire avec limite de 2000 strokes
const canvasState = {
  strokes: [],
  maxStrokes: 2000
};

// Gestion des utilisateurs connectés
const connectedUsers = new Map();
const socketIdToUuid = new Map();
const socketHeartbeats = new Map();
const socketLastActivity = new Map();

const HISTORY_FILE = './canvas-history.json';

// Charger l'historique au démarrage
async function loadHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    canvasState.strokes = history.strokes || [];
    
    // S'assurer de ne pas dépasser la limite au chargement
    if (canvasState.strokes.length > canvasState.maxStrokes) {
      canvasState.strokes = canvasState.strokes.slice(-canvasState.maxStrokes);
      console.log('🧹 Historique tronqué à', canvasState.maxStrokes, 'strokes');
    }
    
    console.log('📚 Historique chargé:', canvasState.strokes.length, 'strokes');
  } catch (error) {
    console.log('📚 Pas d\'historique existant, démarrage à vide');
  }
}

// Sauvegarder l'historique
async function saveHistory() {
  try {
    const data = {
      strokes: canvasState.strokes,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes,
      lastUpdate: new Date().toISOString()
    };
    await fs.writeFile(HISTORY_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Sauvegarde:', canvasState.strokes.length, '/', canvasState.maxStrokes, 'strokes');
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error.message);
  }
}

// Sauvegarder toutes les 30 secondes
setInterval(saveHistory, 30000);

// Nettoyer les strokes les plus anciens si nécessaire
function cleanupOldStrokes() {
  if (canvasState.strokes.length > canvasState.maxStrokes) {
    const toRemove = canvasState.strokes.length - canvasState.maxStrokes;
    canvasState.strokes.splice(0, toRemove);
    console.log('🧹 Supprimé', toRemove, 'anciens strokes (limite:', canvasState.maxStrokes, ')');
  }
}

function cleanupZombieConnections() {
  const now = Date.now();
  const heartbeatTimeout = 90000;
  const activityTimeout = 120000;
  
  for (const [socketId, lastHeartbeat] of socketHeartbeats.entries()) {
    if (now - lastHeartbeat > heartbeatTimeout) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        console.log('🧟 Connection zombie détectée, forçage de la déconnexion:', socketId);
        socket.disconnect(true);
      }
      socketHeartbeats.delete(socketId);
      socketLastActivity.delete(socketId);
    }
  }
  
  for (const [uuid, lastActivity] of connectedUsers.entries()) {
    if (now - lastActivity > activityTimeout) {
      connectedUsers.delete(uuid);
      io.emit('userDisconnect', uuid);
      console.log('🧹 Utilisateur inactif supprimé:', uuid);
    }
  }
}

// Nettoyer les utilisateurs inactifs toutes les 10 secondes
setInterval(cleanupZombieConnections, 30000);

io.on('connection', (socket) => {
  console.log('🟢 Nouveau client connecté:', socket.id);
  
  socketHeartbeats.set(socket.id, Date.now());
  socketLastActivity.set(socket.id, Date.now());
  
  // 1. Envoyer l'état complet au nouveau client
  socket.emit('canvas-state', {
    strokes: canvasState.strokes,
    totalStrokes: canvasState.strokes.length,
    maxStrokes: canvasState.maxStrokes
  });
  
  console.log('📤 État envoyé à', socket.id, ':', canvasState.strokes.length, 'strokes');
  
  // 2. Écouter les nouveaux traits
  socket.on('draw', (stroke) => {
    socketLastActivity.set(socket.id, Date.now());
    
    // Validation du stroke
    if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) {
      return;
    }
    
    // Si c'est un eraser, supprimer les strokes qui intersectent
    if (stroke.brush === 'eraser') {
      const eraserRadius = stroke.size / 2;
      const strokesToRemove = [];
      
      for (let i = 0; i < canvasState.strokes.length; i++) {
        const existingStroke = canvasState.strokes[i];
        if (existingStroke.brush === 'eraser') continue; // Ne pas supprimer les autres erasers
        
        // Vérifier si le stroke intersecte avec l'eraser
        for (const eraserPoint of stroke.points) {
          for (const strokePoint of existingStroke.points) {
            const distance = Math.sqrt(
              Math.pow(eraserPoint.x - strokePoint.x, 2) + 
              Math.pow(eraserPoint.y - strokePoint.y, 2)
            );
            if (distance <= eraserRadius + existingStroke.size / 2) {
              strokesToRemove.push(i);
              break;
            }
          }
          if (strokesToRemove.includes(i)) break;
        }
      }
      
      // Supprimer les strokes dans l'ordre inverse pour éviter les problèmes d'index
      for (let i = strokesToRemove.length - 1; i >= 0; i--) {
        canvasState.strokes.splice(strokesToRemove[i], 1);
      }
      
      // Diffuser la suppression à tous les clients
      io.emit('strokes-removed', { removedIndices: strokesToRemove });
      console.log('🧽 Eraser a supprimé', strokesToRemove.length, 'strokes');
    } else {
      // Ajouter à l'historique
      canvasState.strokes.push({
        ...stroke,
        timestamp: Date.now(),
        id: Date.now() + Math.random() // ID unique
      });
      
      // Nettoyer les anciens strokes si nécessaire
      cleanupOldStrokes();
      
      // Diffuser aux autres clients
      socket.broadcast.emit('stroke-added', stroke);
    }
  });
  
  // 2.5. Écouter les segments en temps réel
  socket.on('stroke-segment', (segment) => {
    socketLastActivity.set(socket.id, Date.now());
    
    // Validation du segment
    if (!segment || !segment.from || !segment.to) {
      return;
    }
    
    // Diffuser immédiatement aux autres clients
    socket.broadcast.emit('stroke-segment', segment);
  });
  
  // 3. Gestion des curseurs
  socket.on('cursorMove', (cursorData) => {
    socketLastActivity.set(socket.id, Date.now());
    
    if (cursorData && cursorData.uuid) {
      // Unicité du curseur : si un autre socket utilise déjà ce uuid, on le déconnecte
      for (const [otherSocketId, otherUuid] of socketIdToUuid.entries()) {
        if (otherUuid === cursorData.uuid && otherSocketId !== socket.id) {
          const otherSocket = io.sockets.sockets.get(otherSocketId);
          if (otherSocket) {
            otherSocket.disconnect(true);
          }
          socketIdToUuid.delete(otherSocketId);
          connectedUsers.delete(cursorData.uuid);
          io.emit('userDisconnect', cursorData.uuid);
          break;
        }
      }
      connectedUsers.set(cursorData.uuid, Date.now());
      socketIdToUuid.set(socket.id, cursorData.uuid);
      socket.broadcast.emit('remoteCursor', cursorData);
    }
  });
  
  // 4. Effacer le canvas
  socket.on('clear-canvas', () => {
    socketLastActivity.set(socket.id, Date.now());
    canvasState.strokes = [];
    io.emit('canvas-cleared');
    console.log('🧹 Canvas effacé par', socket.id);
  });
  
  // 5. Demande d'état (pour les reconnexions)
  socket.on('request-state', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('canvas-state', {
      strokes: canvasState.strokes,
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes
    });
    console.log('📤 État renvoyé à', socket.id);
  });
  
  // 6. Demande d'historique pour fit to content
  socket.on('requestDrawingHistory', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('drawingHistory', canvasState.strokes);
    console.log('📤 Historique envoyé à', socket.id, ':', canvasState.strokes.length, 'strokes');
  });
  
  // 7. Statistiques
  socket.on('get-stats', () => {
    socketLastActivity.set(socket.id, Date.now());
    socket.emit('stats', {
      totalStrokes: canvasState.strokes.length,
      maxStrokes: canvasState.maxStrokes,
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      connectedClients: io.engine.clientsCount,
      activeUsers: connectedUsers.size
    });
  });
  
  socket.on('ping', () => {
    socketHeartbeats.set(socket.id, Date.now());
    socket.emit('pong');
  });
  
  socket.on('disconnect', (reason) => {
    const uuid = socketIdToUuid.get(socket.id);
    if (uuid) {
      connectedUsers.delete(uuid);
      io.emit('userDisconnect', uuid);
      socketIdToUuid.delete(socket.id);
    }
    
    socketHeartbeats.delete(socket.id);
    socketLastActivity.delete(socket.id);
    
    console.log('🔴 Client déconnecté:', socket.id, '| Raison:', reason, '| Clients restants:', io.engine.clientsCount - 1);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Erreur socket pour', socket.id, ':', error);
    socket.disconnect(true);
  });
});

// Sauvegarder avant de quitter
process.on('SIGINT', async () => {
  console.log('💾 Sauvegarde avant arrêt...');
  await saveHistory();
  process.exit(0);
});

// Nettoyage périodique (toutes les 5 minutes)
setInterval(() => {
  cleanupOldStrokes();
  console.log('📊 État actuel:', canvasState.strokes.length, '/', canvasState.maxStrokes, 'strokes');
  console.log('👥 Utilisateurs actifs:', connectedUsers.size);
  console.log('🔗 Sockets connectés:', io.engine.clientsCount);
}, 5 * 60 * 1000);

server.listen(3000, async () => {
  await loadHistory();
  console.log('🚀 Serveur démarré sur port 3000');
  console.log('📊 Configuration:');
  console.log('   - Limite strokes:', canvasState.maxStrokes);
  console.log('   - Sauvegarde:', '30 secondes');
  console.log('   - Nettoyage:', 'automatique');
  console.log('   - Historique chargé:', canvasState.strokes.length, 'strokes');
  console.log('   - Gestion curseurs:', 'activée');
  console.log('   - Nettoyage utilisateurs:', 'activé');
}); 