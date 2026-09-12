const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {

  const rows = db.prepare(`
    SELECT * FROM settings
  `).all();

  const settings = {};

  rows.forEach(r => {
    settings[r.key] = r.value;
  });

  res.json(settings);
});

router.post("/", (req, res) => {

  const data = req.body;

  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const key in data) {
    stmt.run(key, data[key]);
  }

  res.json({ success: true });
});

module.exports = router;