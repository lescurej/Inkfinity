/**
 * Configuration du projet Canvas Collaboratif
 */

require('dotenv').config();

const config = {
  // Configuration du serveur
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // Configuration du stockage
  storage: {
    // Type de stockage : 'memory' ou 'database'
    type: process.env.STORAGE_TYPE || 'memory',
    
    // Configuration pour la base de données (si utilisée)
    database: {
      // MongoDB
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/inkfinity',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      },
      
      // PostgreSQL
      postgres: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'collab_canvas',
        username: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'password'
      },
      
      // SQLite
      sqlite: {
        filename: process.env.SQLITE_FILE || './database.sqlite'
      }
    }
  },

  // Configuration du canvas
  canvas: {
    maxPoints: parseInt(process.env.MAX_POINTS) || 10000,
    width: parseInt(process.env.CANVAS_WIDTH) || 2000,
    height: parseInt(process.env.CANVAS_HEIGHT) || 2000
  },

  // Configuration des logs
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true'
  }
};

module.exports = config; 