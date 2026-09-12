const { db } = require("./db");

function getRankings() {

  const teams = db.prepare("SELECT * FROM teams").all();
  const runs = db.prepare("SELECT * FROM runs").all();

  const results = teams.map(team => {

    const teamRuns = runs.filter(r => r.teamId === team.id);

    const best = Math.max(
      0,
      ...teamRuns.map(r => r.score)
    );

    return {
      teamId: team.id,
      teamNumber: team.teamNumber,
      name: team.name,
      bestScore: best
    };

  });

  return results.sort((a, b) => b.bestScore - a.bestScore);
}

module.exports = { getRankings };