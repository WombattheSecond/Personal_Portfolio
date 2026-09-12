const express = require("express");
const { db } = require("../db");
const crypto = require("crypto");
const { getRankings } = require("../ranking");

const router = express.Router();

router.get("/", (req, res) => {
  const runs = db.prepare("SELECT * FROM runs").all();
  res.json(runs);
});

router.post("/", (req, res) => {

  const { teamId, score, round } = req.body;

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
      INSERT INTO runs (id, teamId, score, round, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      teamId,
      score,
      round,
      Date.now()
    );

  }

  const rankings = getRankings();
  req.app.get("io").emit("rankings:update", rankings);

  res.json({ success: true });
});

router.delete("/all", (req, res) => {
  db.prepare("DELETE FROM runs").run();
  res.json({ success: true });
});

router.get("/rankings", (req, res) => {

  const teams = db.prepare("SELECT * FROM teams").all();
  const runs = db.prepare("SELECT * FROM runs").all();

  const ranked = teams.map(team => {

    const teamRuns = runs
      .filter(r => r.teamId === team.id)
      .map(r => ({
        round: r.round,
        score: Number(r.score)
      }));

    const bestScore = teamRuns.length
      ? Math.max(...teamRuns.map(r => r.score))
      : 0;

    return {
      id: team.id,
      teamNumber: team.teamNumber,
      name: team.name,
      runs: teamRuns,
      bestScore
    };

  });

  ranked.sort((a, b) => b.bestScore - a.bestScore);

  res.json(ranked);
});
module.exports = router;