/**
 * Module de stockage abstrait pour les dessins
 * Permet de basculer facilement entre stockage mémoire et base de données
 */

const mongoose = require('mongoose');

// Schéma MongoDB pour les segments de dessin
const DrawingSegmentSchema = new mongoose.Schema({
  x1: { type: Number, required: true },
  y1: { type: Number, required: true },
  x2: { type: Number, required: true },
  y2: { type: Number, required: true },
  color: { type: String, default: '#000000' },
  size: { type: Number, default: 2 },
  brush: { type: String, default: 'round' },
  timestamp: { type: Date, default: Date.now }
});

const DrawingSegment = mongoose.model('DrawingSegment', DrawingSegmentSchema);

// Stockage en mémoire
class MemoryStorage {
  constructor() {
    this.points = [];
  }

  async addPoint(data) {
    this.points.push(data);
    return Promise.resolve();
  }

  async getAllPoints() {
    return Promise.resolve(this.points);
  }

  async getPointCount() {
    return Promise.resolve(this.points.length);
  }

  async clearAll() {
    this.points = [];
    return Promise.resolve();
  }
}

// Stockage MongoDB
class MongoDBStorage {
  constructor(uri) {
    this.uri = uri;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;
    
    try {
      await mongoose.connect(this.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      this.connected = true;
      console.log('✅ Connecté à MongoDB');
    } catch (error) {
      console.error('❌ Erreur de connexion MongoDB:', error.message);
      throw error;
    }
  }

  async addPoint(data) {
    await this.connect();
    const segment = new DrawingSegment(data);
    await segment.save();
  }

  async getAllPoints() {
    await this.connect();
    const segments = await DrawingSegment.find().sort({ timestamp: 1 });
    return segments.map(seg => ({
      x1: seg.x1,
      y1: seg.y1,
      x2: seg.x2,
      y2: seg.y2,
      color: seg.color,
      size: seg.size,
      brush: seg.brush
    }));
  }

  async getPointCount() {
    await this.connect();
    return await DrawingSegment.countDocuments();
  }

  async clearAll() {
    await this.connect();
    await DrawingSegment.deleteMany({});
  }
}

// Factory pour créer le bon type de stockage
class StorageFactory {
  static create(type, options = {}) {
    switch (type) {
      case 'memory':
        return new MemoryStorage();
      case 'mongodb':
        return new MongoDBStorage(options.uri);
      default:
        throw new Error(`Type de stockage non supporté: ${type}`);
    }
  }
}

module.exports = { StorageFactory, MemoryStorage, MongoDBStorage }; 