/* =========================================================================
   PLFC TOUCHLINE MANAGER — MANAGER CAREER
   The manager is now a career, not a single save. A REPUTATION (0–100) grows
   with promotions, trophies and beating objectives; BOARD CONFIDENCE tracks how
   safe your job is week to week. Fall too far short and you're sacked — but the
   career doesn't end: you enter a JOB MARKET of clubs across your country, each
   with a reputation requirement, and rebuild somewhere new. Every stint is kept
   in your MANAGER HISTORY. (Cross-country moves need per-country squad rebuilds
   — a later step; the market offers clubs in your current nation for now.)
   ========================================================================= */

const Career = {
  clubStature(club) { return Stats.clubStrength(club); },
  startingRep(club) { return clamp(Math.round(this.clubStature(club) - 20), 28, 72); },
  // How much reputation a club's board demands of an incoming manager.
  jobRequirement(club) {
    const topFlight = Season.leagueAbove(club.league) === null;
    return clamp(Math.round(this.clubStature(club) - 24 + (topFlight ? 6 : 0)), 16, 93);
  },

  ensure(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (typeof state.managerRep !== "number") state.managerRep = club ? this.startingRep(club) : 45;
    if (typeof state.boardConfidence !== "number") state.boardConfidence = 66;
    if (!Array.isArray(state.managerHistory)) state.managerHistory = [];
    if (!state.managerStatus) state.managerStatus = "employed";
    if (!state.currentStint && club) this.startStint(state, club, true);
  },

  startStint(state, club, keepConfidence) {
    state.currentStint = { clubId: club.id, clubName: club.name, league: club.league, startSeason: state.season, seasons: 0, matches: 0, wins: 0, draws: 0, losses: 0, titles: 0, promotions: 0, trophies: 0 };
    if (!keepConfidence) state.boardConfidence = 66;
    state.boardMessage = { tone: "neutral", text: `The board welcome you to ${club.name}. Meet their objective and you'll have their backing.` };
  },

  // Tally a played user match into the current stint.
  recordMatch(state, gf, ga) {
    const st = state.currentStint;
    if (!st) return;
    st.matches++;
    if (gf > ga) st.wins++; else if (gf < ga) st.losses++; else st.draws++;
  },

  // ---- board confidence (updated weekly from results vs the objective) ------
  updateConfidence(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    let target = 66;
    try {
      const tbl = Season.table(state, club.league);
      const row = tbl.find(r => r.id === club.id);
      if (row && state.objective) {
        target = clamp(66 + (state.objective.targetPos - row.pos) * 3.5, 10, 96);
        const rel = (Season.LEAGUE_RULES[club.league] || {}).relegate || 0;
        if (rel && row.pos > tbl.length - rel) target -= 20; // in the drop zone
      }
      if (club.played > 0) target += clamp((club.points / club.played - 1.3) * 10, -12, 12);
    } catch (e) { /* table not ready */ }
    state.boardConfidence = clamp(Math.round(state.boardConfidence + (clamp(target, 5, 98) - state.boardConfidence) * 0.3), 3, 99);
    state.boardMessage = this.message(state);
  },

  message(state) {
    const c = state.boardConfidence;
    if (c >= 80) return { tone: "good", text: "The board are delighted with the job you're doing." };
    if (c >= 62) return { tone: "good", text: "The board are pleased with how the season is going." };
    if (c >= 45) return { tone: "neutral", text: "The board are content with your work, for now." };
    if (c >= 28) return { tone: "warn", text: "The board are concerned about results — turn it around, quickly." };
    if (c >= 14) return { tone: "bad", text: "⚠️ Your position is under review. The board's patience is nearly gone." };
    return { tone: "bad", text: "🔴 The board have lost faith — your job is hanging by a thread." };
  },
  confidenceLabel(c) { c = c == null ? 66 : c; return c >= 80 ? "Rock Solid" : c >= 62 ? "Secure" : c >= 45 ? "Stable" : c >= 28 ? "Shaky" : c >= 14 ? "Under Review" : "Untenable"; },
  confidenceClass(c) { c = c == null ? 66 : c; return c >= 62 ? "good" : c >= 28 ? "ok" : "bad"; },

  // Mid-season dismissal — only when it's truly dire and enough games have gone.
  checkMidSeasonSack(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    return !!club && state.boardConfidence < 10 && (club.played || 0) >= 8;
  },

  // ---- end-of-season reputation + sacking verdict ---------------------------
  seasonUpdate(state, result) {
    let rep = state.managerRep;
    if (result.isChampion) rep += 8; else if (result.userPromoted) rep += 6;
    const v = result.objectiveVerdict;
    rep += v ? (v.status === "exceeded" ? 3 : v.status === "met" ? 1 : -3) : 0;
    if (result.userRelegated) rep -= 6;
    const club = state.clubs.find(c => c.id === state.clubId);
    if (club) rep += ((this.clubStature(club) - 20) - rep) * 0.06; // drift toward the club's profile
    state.managerRep = clamp(Math.round(rep), 1, 99);

    const st = state.currentStint;
    if (st) {
      st.seasons++; if (result.isChampion) st.titles++; if (result.userPromoted) st.promotions++;
      const seasonHonours = (state.honours || []).filter(h => h.season === state.season).length;
      st.trophies += Math.max(0, seasonHonours - (result.isChampion ? 1 : 0)); // cups/euro (league title counted above)
    }

    const sackByObjective = v && v.status === "missed" && state.boardConfidence < 30;
    const sacked = !!(result.userSacked || sackByObjective || (result.userRelegated && state.boardConfidence < 25));
    return { sacked, reason: result.userSacked ? "finished bottom of the pyramid" : result.userRelegated ? "suffered relegation" : "fell short of the board's expectations" };
  },

  // ---- job market -----------------------------------------------------------
  closeStint(state, endReason) {
    const st = state.currentStint;
    if (!st) return;
    state.managerHistory.push({ ...st, endSeason: state.season, endReason: endReason || "left the club" });
    state.currentStint = null;
  },

  enterJobMarket(state, reason) {
    this.closeStint(state, reason);
    state.managerStatus = "seeking";
    this.generateJobs(state);
  },

  generateJobs(state) {
    const country = LEAGUE_COUNTRY[(state.clubs.find(c => c.id === state.clubId) || {}).league] || Game.myCountry();
    const rep = state.managerRep;
    const pool = state.clubs.filter(c => !c.strengthOnly && LEAGUE_COUNTRY[c.league] === country)
      .map(c => ({ club: c, req: this.jobRequirement(c) }));
    const qualify = pool.filter(x => x.req <= rep).sort((a, b) => b.req - a.req);
    const aspir = pool.filter(x => x.req > rep).sort((a, b) => a.req - b.req);
    let jobs = qualify.slice(0, 5);
    if (!jobs.length) { jobs = pool.slice().sort((a, b) => a.req - b.req).slice(0, 3).map(x => ({ ...x, forced: true })); } // never stranded
    jobs = jobs.concat(aspir.slice(0, 2)); // a couple of aspirational locks
    state.jobOffers = jobs.map(x => {
      const er = Board.expectedRank(state, x.club);
      return { clubId: x.club.id, clubName: x.club.name, league: x.club.league, req: x.req, qualified: x.req <= rep || !!x.forced, strength: Math.round(this.clubStature(x.club)), expRank: er.rank, size: er.size };
    });
    return state.jobOffers;
  },

  takeJob(state, clubId) {
    const offer = (state.jobOffers || []).find(o => o.clubId === clubId);
    if (!offer || !offer.qualified) return { ok: false };
    state.clubId = clubId;
    const club = state.clubs.find(c => c.id === clubId);
    if (!club.coaches) Coaching.initClubCoaches(club);
    Coaching.ensureAll(state);
    Academy.ensure(state); Scouting.ensure(state); Fitness.ensure(state);
    Contracts.ensure(state); Morale.ensure(state); Tactics.ensure(club);
    this.startStint(state, club);
    Board.setObjective(state);
    state.managerStatus = "employed";
    state.jobOffers = null;
    return { ok: true, clubName: club.name };
  },

  // Win % for display.
  winPct(st) { return st && st.matches ? Math.round(st.wins / st.matches * 100) : 0; },
  repLabel(r) { r = r == null ? 45 : r; return r >= 82 ? "World-class" : r >= 68 ? "Elite" : r >= 54 ? "Established" : r >= 40 ? "Promising" : r >= 26 ? "Journeyman" : "Rookie"; },
};
