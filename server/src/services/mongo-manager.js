const { MongoClient } = require('mongodb');

class MongoManager {
  constructor() {
    /** @type {Map<string, MongoClient>} */
    this.clients = new Map();
  }

  /**
   * Dapatkan koneksi MongoDB (cached per URI)
   * @param {string} uri - MongoDB connection string
   * @returns {Promise<MongoClient>}
   */
  async getConnection(uri) {
    if (this.clients.has(uri)) {
      const client = this.clients.get(uri);
      // Cek apakah koneksi masih hidup
      try {
        await client.db().admin().ping();
        return client;
      } catch {
        // Koneksi mati, hapus dari cache dan buat baru
        this.clients.delete(uri);
      }
    }

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    this.clients.set(uri, client);
    return client;
  }

  /**
   * Dapatkan database instance
   * @param {string} uri
   * @param {string} dbName
   * @returns {Promise<Db>}
   */
  async getDb(uri, dbName) {
    const client = await this.getConnection(uri);
    return client.db(dbName);
  }

  /**
   * Dapatkan config database (untuk stores, sync_state, dll).
   * URI & DB name dari .env
   * @returns {Promise<Db>}
   */
  async getConfigDb() {
    const uri = process.env.CONFIG_MONGO_URI;
    const dbName = process.env.CONFIG_DB_NAME || 'db_catalogue_config';
    if (!uri) throw new Error('CONFIG_MONGO_URI tidak di-set di .env');
    return this.getDb(uri, dbName);
  }

  /**
   * Tutup semua koneksi
   */
  async closeAll() {
    const entries = [...this.clients.entries()];
    for (const [uri, client] of entries) {
      try {
        await client.close();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }
}

module.exports = new MongoManager();
