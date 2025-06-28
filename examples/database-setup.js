/**
 * Exemples de configuration pour différentes bases de données
 * 
 * Pour utiliser une base de données, installez les dépendances correspondantes
 * et décommentez la configuration souhaitée dans storage.js
 */

// ============================================================================
// MONGODB CONFIGURATION
// ============================================================================

/*
// Installation : npm install mongoose

const mongoose = require('mongoose');

// Modèle pour les points de dessin
const DrawingPointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String, required: true }
});

const DrawingPoint = mongoose.model('DrawingPoint', DrawingPointSchema);

// Dans DatabaseStorage class :
async connect() {
  await mongoose.connect(config.storage.database.mongodb.uri, config.storage.database.mongodb.options);
  this.isConnected = true;
}

async addPoint(point) {
  await DrawingPoint.create({
    x: point.x,
    y: point.y,
    sessionId: 'default-session'
  });
  return true;
}

async getAllPoints() {
  return await DrawingPoint.find().sort({ timestamp: 1 });
}

async clearAll() {
  await DrawingPoint.deleteMany({});
  return true;
}

async getPointCount() {
  return await DrawingPoint.countDocuments();
}
*/

// ============================================================================
// POSTGRESQL CONFIGURATION
// ============================================================================

/*
// Installation : npm install sequelize pg pg-hstore

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  config.storage.database.postgres.database,
  config.storage.database.postgres.username,
  config.storage.database.postgres.password,
  {
    host: config.storage.database.postgres.host,
    port: config.storage.database.postgres.port,
    dialect: 'postgres'
  }
);

const DrawingPoint = sequelize.define('DrawingPoint', {
  x: { type: DataTypes.INTEGER, allowNull: false },
  y: { type: DataTypes.INTEGER, allowNull: false },
  sessionId: { type: DataTypes.STRING, allowNull: false }
});

// Dans DatabaseStorage class :
async connect() {
  await sequelize.authenticate();
  await sequelize.sync();
  this.isConnected = true;
}

async addPoint(point) {
  await DrawingPoint.create({
    x: point.x,
    y: point.y,
    sessionId: 'default-session'
  });
  return true;
}

async getAllPoints() {
  return await DrawingPoint.findAll({
    order: [['createdAt', 'ASC']]
  });
}

async clearAll() {
  await DrawingPoint.destroy({ where: {} });
  return true;
}

async getPointCount() {
  return await DrawingPoint.count();
}
*/

// ============================================================================
// SQLITE CONFIGURATION
// ============================================================================

/*
// Installation : npm install sqlite3

const sqlite3 = require('sqlite3').verbose();

// Dans DatabaseStorage class :
constructor() {
  this.db = new sqlite3.Database(config.storage.database.sqlite.filename);
  this.isConnected = false;
}

async connect() {
  return new Promise((resolve, reject) => {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS drawing_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      else {
        this.isConnected = true;
        resolve();
      }
    });
  });
}

async addPoint(point) {
  return new Promise((resolve, reject) => {
    this.db.run(
      'INSERT INTO drawing_points (x, y, session_id) VALUES (?, ?, ?)',
      [point.x, point.y, 'default-session'],
      (err) => {
        if (err) reject(err);
        else resolve(true);
      }
    );
  });
}

async getAllPoints() {
  return new Promise((resolve, reject) => {
    this.db.all(
      'SELECT x, y FROM drawing_points ORDER BY created_at ASC',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

async clearAll() {
  return new Promise((resolve, reject) => {
    this.db.run('DELETE FROM drawing_points', (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

async getPointCount() {
  return new Promise((resolve, reject) => {
    this.db.get('SELECT COUNT(*) as count FROM drawing_points', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}
*/

// ============================================================================
// REDIS CONFIGURATION (pour cache/performance)
// ============================================================================

/*
// Installation : npm install redis

const redis = require('redis');

// Dans DatabaseStorage class :
constructor() {
  this.client = redis.createClient({
    url: config.storage.database.redis.url || 'redis://localhost:6379'
  });
  this.isConnected = false;
}

async connect() {
  await this.client.connect();
  this.isConnected = true;
}

async addPoint(point) {
  await this.client.lPush('drawing_points', JSON.stringify(point));
  return true;
}

async getAllPoints() {
  const points = await this.client.lRange('drawing_points', 0, -1);
  return points.map(p => JSON.parse(p));
}

async clearAll() {
  await this.client.del('drawing_points');
  return true;
}

async getPointCount() {
  return await this.client.lLen('drawing_points');
}
*/ 