const Database = require("better-sqlite3");

const db = new Database("data/scoreboard.db");

function initDB() {

  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      teamNumber INTEGER UNIQUE,
      name TEXT NOT NULL,
      checkedIn INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      teamId TEXT,
      score INTEGER,
      round INTEGER,
      timestamp INTEGER,
      UNIQUE(teamId, round)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

}

module.exports = { db, initDB };