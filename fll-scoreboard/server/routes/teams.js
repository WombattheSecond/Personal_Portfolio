const express = require("express");
const { db } = require("../db");
const crypto = require("crypto");

const router = express.Router();

router.get("/", (req, res) => {
  const teams = db.prepare("SELECT * FROM teams").all();
  res.json(teams);
});

router.post("/", (req, res) => {

    const { teamId, score, round } = req.body;
  
    if (!teamId || !round || score === undefined) {
      return res.status(400).json({
        error: "Missing fields"
      });
    }
  
    const existing = db.prepare(`
      SELECT id FROM runs
      WHERE teamId = ? AND round = ?
    `).get(teamId, round);
  
    if (existing) {
  
      db.prepare(`
        UPDATE runs
        SET score = ?, timestamp = ?
        WHERE teamId = ? AND round = ?
      `).run(score, Date.now(), teamId, round);
  
    } else {
  
      db.prepare(`
        INSERT INTO runs (
          id, teamId, score, round, timestamp
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        require("crypto").randomUUID(),
        teamId,
        round,
        score,
        Date.now()
      );
  
    }
  
    const rankings = require("../ranking").getRankings();
  
    req.app.get("io")
      .emit("rankings:update", rankings);
  
    res.json({ success: true });
  
  });

router.put("/:id", (req, res) => {

  const { teamNumber, name, checkedIn } = req.body;

  db.prepare(`
    UPDATE teams
    SET teamNumber = ?, name = ?, checkedIn = ?
    WHERE id = ?
  `).run(teamNumber, name, checkedIn ? 1 : 0, req.params.id);

  res.json({ success: true });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM teams WHERE id = ?")
    .run(req.params.id);

  res.json({ success: true });
});

router.delete("/all", (req, res) => {
  db.prepare("DELETE FROM teams").run();
  res.json({ success: true });
});

router.patch("/:id/checking", (req, res) => {

  const team = db.prepare(`
    SELECT checkedIn FROM teams WHERE id = ?
  `).get(req.params.id);

  db.prepare(`
    UPDATE teams SET checkedIn = ? WHERE id = ?
  `).run(team.checkedIn ? 0 : 1, req.params.id);

  res.json({ success: true });
});

module.exports = router;