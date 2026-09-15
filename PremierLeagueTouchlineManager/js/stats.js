/* =========================================================================
   PLFC TOUCHLINE MANAGER — PLAYER STATS, LEADERBOARDS & AWARDS
   Season-long per-player tallies (goals, assists, clean sheets, saves,
   appearances), attributed across EVERY match in the league — the user's
   live games and the AI-vs-AI quick sims alike — so the leaderboards and
   end-of-season awards are league-wide and fair. Award winners who play
   for the user's club carry a small, bounded performance bonus into the
   following season.
   ========================================================================= */

// Award categories. `key` matches the per-player stat field; `bonus` is the
// boost handed to a user-club winner for the next season (consumed by the
// match engine). Order here is the order shown on the hub and season-end.
// `pos` (optional) scopes a category to a position group, so Golden Glove
// ranks goalkeepers and Best Defender ranks defenders even though both read
// the shared cleanSheets tally.
const STAT_DEFS = [
  { key: "goals",       label: "Goals",        short: "G",  award: "Golden Boot",  icon: "🥇", bonus: { goal: 0.12 } },
  { key: "assists",     label: "Assists",      short: "A",  award: "Playmaker",    icon: "🎯", bonus: { assist: 0.12 } },
  { key: "cleanSheets", label: "Clean Sheets", short: "CS", award: "Best Defender", icon: "🛡️", pos: "DF", bonus: { defense: 0.06 } },
  { key: "cleanSheets", label: "Clean Sheets", short: "CS", award: "Golden Glove", icon: "🧤", pos: "GK", bonus: { keeper: 0.06 } },
  { key: "saves",       label: "Saves",        short: "SV", award: "Shot Stopper", icon: "🧱", pos: "GK", bonus: { keeper: 0.04 } },
];
const STAT_KEYS = ["goals", "assists", "cleanSheets", "saves", "apps"];
const BONUS_KEYS = ["goal", "assist", "keeper", "defense"];
const BONUS_CAP = 0.25; // a single player can never carry more than +25% in any track
const TOP5_BONUS_SCALE = 0.4; // ranks 2–5 earn this fraction of the winner's boost

const Stats = {
  blank() { return { goals: 0, assists: 0, cleanSheets: 0, saves: 0, apps: 0 }; },
  blankBonus() { return { goal: 0, assist: 0, keeper: 0, defense: 0 }; },

  // Guarantees a player has well-formed stats/bonus/career objects (used on
  // load to migrate older saves, and defensively elsewhere).
  ensure(p) {
    if (!p.stats) p.stats = this.blank();
    else STAT_KEYS.forEach(k => { if (p.stats[k] == null) p.stats[k] = 0; });
    if (!p.bonus) p.bonus = this.blankBonus();
    else BONUS_KEYS.forEach(k => { if (p.bonus[k] == null) p.bonus[k] = 0; });
    if (!p.career) p.career = this.blank();
    else STAT_KEYS.forEach(k => { if (p.career[k] == null) p.career[k] = 0; });
    if (!p.compStats) p.compStats = {}; // per-competition buckets (cups, Europe)
    return p;
  },
  ensureAll(state) { state.clubs.forEach(c => c.squad.forEach(p => this.ensure(p))); },

  // The stat bucket for a competition: "league" is the primary p.stats bucket
  // (so all existing league code is untouched); every other competition gets its
  // own bucket under p.compStats[comp].
  bucket(p, comp) {
    this.ensure(p);
    if (!comp || comp === "league") return p.stats;
    if (!p.compStats[comp]) p.compStats[comp] = this.blank();
    return p.compStats[comp];
  },

  // Add to a player's competition tally AND their lifetime career total at once.
  add(p, key, n = 1, comp = "league") {
    this.ensure(p);
    this.bucket(p, comp)[key] += n;
    p.career[key] += n;
  },

  resetSeason(state) { state.clubs.forEach(c => c.squad.forEach(p => { p.stats = this.blank(); p.compStats = {}; })); },
  clearBonuses(state) { state.clubs.forEach(c => c.squad.forEach(p => { p.bonus = this.blankBonus(); })); },

  // ---- match attribution ----------------------------------------------------

  // Saves: shots on target faced (scaled to the opponent's attack vs this
  // defence) minus the goals that beat the keeper, with a rare extra stop for
  // a Golden-Glove/Shot-Stopper keeper. Shared by every match so the
  // most-saves race is comparable across the whole division.
  recordSaves(gk, starters, oppStarters, goalsAgainst, comp) {
    const oppAtt = MatchEngine.attackRating(oppStarters);
    const myDef = MatchEngine.defenseRating(starters);
    const keeperBonus = (gk.bonus && gk.bonus.keeper) || 0;
    const sot = poisson(clamp(oppAtt * 0.05 - myDef * 0.025 + 2.2, 0.4, 8));
    let saves = Math.max(0, sot - goalsAgainst);
    if (Math.random() < keeperBonus * 5) saves += 1;
    this.add(gk, "saves", saves, comp);
  },

  // Credit appearances, clean sheet, saves for one side, then hand `goalsFor`
  // goals to scorers/assisters. When `scorers` (an ordered list of player ids
  // straight from the live commentary) is supplied, those exact players are
  // credited so the feed and the stat sheet never disagree; otherwise scorers
  // are drawn fresh (AI matches). When `assists` (the live match's real assister
  // ids) is supplied, those exact players are credited instead of a fresh roll.
  recordSide(starters, oppStarters, goalsFor, goalsAgainst, scorers, assists, roster, comp) {
    // Resolve a scorer/assister id to the real player — a substitute who came on
    // won't be in the starting XI, so fall back to the club's full squad.
    const find = id => (roster && roster.find(p => p.id === id)) || starters.find(p => p.id === id);
    starters.forEach(p => this.add(p, "apps", 1, comp));
    const gk = starters.find(p => p.pos === "GK");
    if (gk) this.recordSaves(gk, starters, oppStarters, goalsAgainst, comp);
    // A clean sheet is shared by the keeper and every starting defender — it
    // anchors both the Golden Glove (GK) and Best Defender (DF) races.
    if (goalsAgainst === 0) {
      if (gk) this.add(gk, "cleanSheets", 1, comp);
      starters.filter(p => p.pos === "DF").forEach(d => this.add(d, "cleanSheets", 1, comp));
    }

    const attackers = starters.filter(p => p.pos === "FW" || p.pos === "MF");
    const pool = attackers.length ? attackers : starters;
    for (let i = 0; i < goalsFor; i++) {
      let scorer = null;
      if (scorers && scorers[i]) scorer = find(scorers[i]);
      if (!scorer) scorer = MatchEngine.weightedScorer(pool);
      if (!scorer) continue;
      this.add(scorer, "goals", 1, comp);
      // When we have the live match's actual assisters, credit those exact
      // players below; otherwise (AI matches) roll a plausible assist here.
      if (!assists && Math.random() < 0.72) {
        const assister = MatchEngine.weightedAssister(pool, scorer);
        if (assister) this.add(assister, "assists", 1, comp);
      }
    }
    // Real assisters from the watched match (by id) — accurate, not re-rolled.
    if (assists) assists.forEach(id => { const a = find(id); if (a) this.add(a, "assists", 1, comp); });
  },

  // AI-vs-AI fixtures: both sides attributed from the scoreline alone. `comp`
  // routes the stats to the right competition bucket (default the league).
  recordMatch(hStarters, aStarters, hg, ag, comp) {
    this.recordSide(hStarters, aStarters, hg, ag, null, null, null, comp);
    this.recordSide(aStarters, hStarters, ag, hg, null, null, null, comp);
  },

  // The user's watched match: goals AND assists follow the exact players from
  // the live sim, so player stats match what you actually saw happen.
  recordUserMatch(hStarters, aStarters, hg, ag, homeScorers, awayScorers, homeAssists, awayAssists, hRoster, aRoster, comp) {
    this.recordSide(hStarters, aStarters, hg, ag, homeScorers, homeAssists, hRoster, comp);
    this.recordSide(aStarters, hStarters, ag, hg, awayScorers, awayAssists, aRoster, comp);
  },

  // ---- leaderboards & awards ------------------------------------------------

  // Read a competition's bucket WITHOUT creating it (so ranking a comp doesn't
  // stamp an empty bucket onto every player and bloat the save).
  _ZERO: { goals: 0, assists: 0, cleanSheets: 0, saves: 0, apps: 0 },
  readBucket(p, comp) {
    if (!comp || comp === "league") return p.stats || this._ZERO;
    return (p.compStats && p.compStats[comp]) || this._ZERO;
  },

  allEntries(state, league = null, comp = "league") {
    const out = [];
    state.clubs.forEach(c => {
      if (league && c.league !== league) return;
      (c.squad || []).forEach(p => {
        this.ensure(p);
        out.push({
          id: p.id, name: p.name, pos: p.pos,
          clubId: c.id, clubShort: c.short, league: c.league, mine: c.id === state.clubId,
          stats: this.readBucket(p, comp),
        });
      });
    });
    return out;
  },

  // Ranked list for one stat in a competition. Returns the top `n`, plus — when
  // none of the user's players made that cut — their single best performer.
  leaderboard(state, key, n = 5, pos = null, league = null, comp = "league") {
    const ranked = this.allEntries(state, league, comp)
      .filter(e => (!pos || e.pos === pos) && e.stats[key] > 0)
      .map(e => ({ id: e.id, name: e.name, pos: e.pos, clubShort: e.clubShort, mine: e.mine, value: e.stats[key] }));
    ranked.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    ranked.forEach((e, i) => { e.rank = i + 1; });
    const top = ranked.slice(0, n);
    const yourBest = top.some(e => e.mine) ? null : (ranked.find(e => e.mine) || null);
    return { key, top, yourBest, all: ranked };
  },

  // The user's own squad ranked within a stat, each tagged with league rank.
  teamLeaders(state, key, n = 5, pos = null, league = null) {
    return this.leaderboard(state, key, Infinity, pos, league).all.filter(e => e.mine).slice(0, n);
  },

  // One bundle per award category, including the winner and the display board.
  // Scoped to a single league when one is given (each division has its own).
  awards(state, league = null, comp = "league") {
    return STAT_DEFS.map(def => {
      const lb = this.leaderboard(state, def.key, 5, def.pos, league, comp);
      return { def, winner: lb.all[0] || null, top: lb.top, yourBest: lb.yourBest };
    });
  },

  // Clear last season's boosts, then hand fresh ones to the top five of every
  // category at EVERY club — the winner gets the full boost, ranks 2–5 a
  // scaled-down share. Returns the user's own players' boosts for the digest.
  assignSeasonBonuses(state, awards) {
    this.clearBonuses(state);
    const byId = {};
    state.clubs.forEach(c => c.squad.forEach(p => { byId[p.id] = p; }));
    const granted = [];
    awards.forEach(a => {
      a.top.forEach(e => {
        const player = byId[e.id];
        if (!player) return; // may have retired in the off-season
        this.ensure(player);
        const scale = e.rank === 1 ? 1 : TOP5_BONUS_SCALE;
        Object.entries(a.def.bonus).forEach(([k, v]) => {
          player.bonus[k] = Math.min((player.bonus[k] || 0) + v * scale, BONUS_CAP);
        });
        if (e.mine) granted.push({ name: player.name, award: a.def.award, icon: a.def.icon, rank: e.rank, value: e.value, def: a.def, scale });
      });
    });
    return granted;
  },

  // ---- career records -------------------------------------------------------

  // The headline lifetime stat for a position: FW goals, MF assists,
  // DF clean sheets, GK saves.
  careerKeyFor(pos) {
    return ({ FW: "goals", MF: "assists", DF: "cleanSheets", GK: "saves" })[pos] || "goals";
  },
  careerKeyLabel(key) {
    return ({ goals: "goals", assists: "assists", cleanSheets: "clean sheets", saves: "saves" })[key] || key;
  },
  // "312 apps · 88 goals" — appearances plus the position's headline stat.
  signingLine(p) {
    this.ensure(p);
    const key = this.careerKeyFor(p.pos);
    return `${p.career.apps} apps · ${p.career[key]} ${this.careerKeyLabel(key)}`;
  },

  // A fuller career line for the squad list — appearances, goals and assists,
  // plus clean sheets / saves where they matter for the position.
  careerSquadLine(p) {
    this.ensure(p);
    const c = p.career;
    const parts = [`${c.apps} apps`];
    if (p.pos === "GK") parts.push(`${c.saves} saves`, `${c.cleanSheets} CS`);
    else if (p.pos === "DF") parts.push(`${c.goals} G`, `${c.assists} A`, `${c.cleanSheets} CS`);
    else parts.push(`${c.goals} G`, `${c.assists} A`);
    return "Career: " + parts.join(" · ");
  },

  // Human-readable summary of a player's active boosts, e.g. "+12% goals".
  bonusTags(p) {
    if (!p.bonus) return [];
    const labels = { goal: "goals", assist: "assists", keeper: "keeping", defense: "defending" };
    return BONUS_KEYS.filter(k => p.bonus[k]).map(k => `+${Math.round(p.bonus[k] * 100)}% ${labels[k]}`);
  },

  // ---- end-of-season performance, for player growth -------------------------

  // A per-game contribution score, weighted by what each position is there to
  // do. Keepers and defenders live off clean sheets (and a keeper's saves),
  // attackers off goals and assists.
  contribution(p) {
    const s = p.stats;
    switch (p.pos) {
      case "FW": return s.goals * 1.0 + s.assists * 0.6;
      case "MF": return s.goals * 0.7 + s.assists * 1.0;
      case "DF": return s.cleanSheets * 0.8 + (s.goals + s.assists) * 0.5;
      case "GK": return s.cleanSheets * 1.0 + s.saves * 0.04;
    }
    return 0;
  },

  // Contribution from an explicit stat bucket (per-competition version of
  // `contribution`, which reads the league bucket p.stats).
  contribInBucket(pos, b) {
    switch (pos) {
      case "FW": return b.goals * 1.0 + b.assists * 0.6;
      case "MF": return b.goals * 0.7 + b.assists * 1.0;
      case "DF": return b.cleanSheets * 0.8 + (b.goals + b.assists) * 0.5;
      case "GK": return b.cleanSheets * 1.0 + b.saves * 0.04;
    }
    return 0;
  },

  // Team of the Season / Team of the Tournament for a competition, judged on
  // performance RELATIVE TO THE PLAYER'S TEAM and how far that team went: a
  // lower-rated club's standout who carried them counts for more (bigger
  // `underdog` multiplier), and going deep means more appearances (which lifts
  // the volume-based contribution) — so a fourth-tier hero of a cup run beats a
  // superstar who barely featured or went out early. Returns a best XI, a
  // handful of honourable-mention nominees, and a standout Player of the ...
  // For a cup, leave `league` null (every division competes); for the league
  // Team of the Season, scope to that division.
  teamOf(state, comp, opts = {}) {
    const league = opts.league || null;
    const formation = opts.formation || { GK: 1, DF: 4, MF: 3, FW: 3 };
    // The apps threshold ADAPTS to how far the competition has run, so a "Team of
    // the Season so far" appears from a couple of games in and tightens to
    // regulars only by season's end (never asking for more than the cap below).
    const cap = opts.minApps != null ? opts.minApps : (comp === "league" ? 10 : 2);
    let maxApps = 0;
    state.clubs.forEach(c => { if (league && c.league !== league) return; (c.squad || []).forEach(p => { const b = this.readBucket(p, comp); if (b && b.apps > maxApps) maxApps = b.apps; }); });
    const minApps = Math.min(cap, Math.max(1, Math.round(maxApps * 0.55)));
    const clubStr = {};
    state.clubs.forEach(c => { clubStr[c.id] = this.clubStrength(c); });
    const cand = [];
    state.clubs.forEach(c => {
      if (league && c.league !== league) return;
      (c.squad || []).forEach(p => {
        const b = this.readBucket(p, comp);
        if (!b || b.apps < minApps) return;
        const contrib = this.contribInBucket(p.pos, b);
        if (contrib <= 0 && p.pos !== "GK" && p.pos !== "DF") return; // outfield needs an end product
        const underdog = 1 + clamp((78 - (clubStr[c.id] || 70)) / 55, -0.28, 0.6);
        const score = contrib * underdog + b.apps * 0.12;
        cand.push({ id: p.id, name: p.name, pos: p.pos, clubShort: c.short, clubId: c.id, mine: c.id === state.clubId, apps: b.apps, stats: b, score: +score.toFixed(3) });
      });
    });
    cand.sort((a, b) => b.score - a.score);
    const xi = [], used = new Set();
    ["GK", "DF", "MF", "FW"].forEach(pos => {
      cand.filter(e => e.pos === pos && !used.has(e.id)).slice(0, formation[pos]).forEach(e => { xi.push(e); used.add(e.id); });
    });
    const order = { GK: 0, DF: 1, MF: 2, FW: 3 };
    xi.sort((a, b) => order[a.pos] - order[b.pos] || b.score - a.score);
    const nominees = cand.filter(e => !used.has(e.id)).slice(0, 6);
    const potm = xi.slice().sort((a, b) => b.score - a.score)[0] || null;
    return { comp, xi, nominees, potm, count: cand.length };
  },

  // Average of a club's eleven best ratings — a smooth strength proxy used to
  // derive where each club was *expected* to finish within its own league.
  clubStrength(club) {
    // A strength-only foreign club (no stored squad) carries its rating
    // directly; a squad club is the mean of its best XI.
    if (club.strengthOnly || !club.squad || !club.squad.length) {
      return typeof club.strength === "number" ? club.strength : 60;
    }
    const top = club.squad.map(p => p.rating).sort((a, b) => b - a).slice(0, 11);
    return top.length ? top.reduce((s, r) => s + r, 0) / top.length : 60;
  },

  // Scores every player's season in [-~1.5, ~2], judged RELATIVE to what's
  // expected of a player at their rating (so a 64 holding his own is a win,
  // while an 88 is expected to dominate) and lifted/dragged by how their club
  // did versus expectation — all WITHIN their own division. Drives the
  // potential/rating drift in Aging.advanceSeason, for both leagues.
  performanceIndex(state) {
    const index = {};
    // Only the managed country has reliable, fully-credited league stats. Foreign
    // leagues (even those with a few real-squad European keepers) are judged on a
    // partial stat picture, so we leave their players to age on the age curve
    // alone — a keeper player simply gets no index entry (treated as neutral).
    const managedCountry = LEAGUE_COUNTRY[(state.clubs.find(c => c.id === state.clubId) || {}).league];
    LEAGUES.forEach(lg => {
      if (managedCountry && LEAGUE_COUNTRY[lg] !== managedCountry) return;
      const clubs = state.clubs.filter(c => c.league === lg);
      if (!clubs.length) return;
      // Foreign (strength-only) leagues have no player-level data to judge.
      if (clubs.every(c => c.strengthOnly)) return;

      const posByClub = {};
      Season.table(state, lg).forEach(r => { posByClub[r.id] = r.pos; });
      // Expected finishing position = rank by squad strength within the league.
      const expectedPos = {};
      clubs.slice().sort((a, b) => this.clubStrength(b) - this.clubStrength(a))
        .forEach((c, i) => { expectedPos[c.id] = i + 1; });

      // Average contribution rate per position, among this league's regulars.
      const sums = { GK: [0, 0], DF: [0, 0], MF: [0, 0], FW: [0, 0] };
      clubs.forEach(c => c.squad.forEach(p => {
        this.ensure(p);
        if (p.stats.apps >= 8) { sums[p.pos][0] += this.contribution(p) / p.stats.apps; sums[p.pos][1] += 1; }
      }));
      const posAvg = {};
      ["GK", "DF", "MF", "FW"].forEach(k => { posAvg[k] = sums[k][1] ? sums[k][0] / sums[k][1] : 0.0001; });

      const mid = clubs.length / 2;
      clubs.forEach(c => {
        const teamScore = clamp(((expectedPos[c.id] || mid) - (posByClub[c.id] || mid)) / 12, -1, 1);
        c.squad.forEach(p => {
          const apps = p.stats.apps;
          const played = clamp(apps / 26, 0, 1);
          const rate = apps ? this.contribution(p) / apps : 0;
          const rel = rate / (posAvg[p.pos] || 0.0001);
          // The bar rises with rating: ~0.6x the positional average at 60 OVR,
          // ~1.0x at 80, ~1.2x at 90.
          const expectedRel = 0.6 + (p.rating - 60) / 40 * 0.8;
          const individual = clamp(rel - expectedRel, -1.5, 2);
          // Establishment credit: a low-rated regular simply holding a place is
          // an achievement worth a nudge upward.
          const establish = clamp((72 - p.rating) / 50, 0, 0.25) * played;
          index[p.id] = played * 0.7 * individual + 0.5 * teamScore + establish;
        });
      });
    });
    return index;
  },
};
