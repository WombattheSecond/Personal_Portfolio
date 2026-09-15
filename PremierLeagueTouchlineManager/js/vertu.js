/* =========================================================================
   PLFC TOUCHLINE MANAGER — THE VERTU TROPHY (EFL Trophy)
   A competition for the 48 League One & League Two clubs, run through the
   season alongside the leagues and cups. The 48 clubs are drawn into 16 groups
   of three; each club plays the other two home and away (3 pts a win, 1 a
   draw). The group winner advances to a straight 16-team knockout that ends
   with the Final at Wembley. Only relevant when you manage a third- or
   fourth-tier club; otherwise it plays out in the background.
   ========================================================================= */

const VERTU_GROUP_WEEKS = [4, 9, 14, 19]; // the user's four group games
const VERTU_KO_ROUNDS = [
  { key: "R16", name: "Round of 16",   week: 25 },
  { key: "QF",  name: "Quarter-Final", week: 30 },
  { key: "SF",  name: "Semi-Final",    week: 35 },
  { key: "F",   name: "Final",         week: 40 },
];

const Vertu = {
  GROUP_WEEKS: VERTU_GROUP_WEEKS,
  KO_ROUNDS: VERTU_KO_ROUNDS,

  isActive(state) { return !!(state.vertu && !state.vertu.skipped); },
  clubById(state, id) { return state.clubs.find(c => c.id === id) || null; },
  clubShort(state, id) { const c = this.clubById(state, id); return c ? c.short : id; },
  clubName(state, id) { const c = this.clubById(state, id); return c ? c.name : id; },

  initSeason(state) {
    // The Vertu Trophy is an English League One & Two competition only.
    if (Game.myCountry() !== "ENG") { state.vertu = { skipped: true, groups: [], userGroup: -1 }; return; }
    const pool = Cup.shuffle(state.clubs.filter(c => c.league === "L1" || c.league === "L2").map(c => c.id));
    const groups = [];
    for (let i = 0; i + 2 < pool.length + 1 && i < pool.length; i += 3) groups.push(pool.slice(i, i + 3));
    const standings = {};
    pool.forEach(id => { standings[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; });

    let userGroup = -1;
    groups.forEach((g, i) => { if (g.includes(state.clubId)) userGroup = i; });

    let userGames = [];
    if (userGroup >= 0) {
      const opps = groups[userGroup].filter(id => id !== state.clubId);
      userGames = [
        { week: VERTU_GROUP_WEEKS[0], home: state.clubId, away: opps[0], played: false, hg: 0, ag: 0 },
        { week: VERTU_GROUP_WEEKS[1], home: state.clubId, away: opps[1], played: false, hg: 0, ag: 0 },
        { week: VERTU_GROUP_WEEKS[2], home: opps[0], away: state.clubId, played: false, hg: 0, ag: 0 },
        { week: VERTU_GROUP_WEEKS[3], home: opps[1], away: state.clubId, played: false, hg: 0, ag: 0 },
      ];
    }

    state.vertu = {
      season: state.season, stage: "group", groups, userGroup, standings, userGames,
      koRoundIndex: 0, koParticipants: [], koTies: [], koDrawn: -1,
      winner: null, runnerUp: null, userOut: false, userExitStage: null, skipped: false,
    };

    // Quick-sim every group game except the user's four live fixtures.
    this.simulateGroupsExceptUser(state);
    // If the user isn't in this competition, resolve it fully in the background.
    if (userGroup < 0) this.autoResolve(state);
  },

  simulateGroupsExceptUser(state) {
    const v = state.vertu;
    v.groups.forEach((g, gi) => {
      for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) {
        if (i === j) continue;
        const home = g[i], away = g[j];
        if (gi === v.userGroup && (home === state.clubId || away === state.clubId)) continue;
        const { hg, ag } = MatchEngine.simulateQuick(this.clubById(state, home), this.clubById(state, away));
        this.creditMatch(state, home, away, hg, ag);
        this.applyGroupResult(state, home, away, hg, ag);
      }
    });
  },

  applyGroupResult(state, home, away, hg, ag) {
    const s = state.vertu.standings; const H = s[home], A = s[away];
    if (!H || !A) return;
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; H.pts += 3; A.l++; }
    else if (ag > hg) { A.w++; A.pts += 3; H.l++; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  },

  userGameThisWeek(state) {
    if (!this.isActive(state) || state.vertu.stage !== "group") return null;
    return (state.vertu.userGames || []).find(g => g.week === state.week && !g.played) || null;
  },

  recordUserGroupGame(state, game, hg, ag) {
    game.hg = hg; game.ag = ag; game.played = true;
    this.applyGroupResult(state, game.home, game.away, hg, ag);
    if ((state.vertu.userGames || []).every(g => g.played)) this.finalizeGroupStage(state);
  },

  groupWinner(state, group) {
    const s = state.vertu.standings;
    return group.slice().sort((a, b) =>
      (s[b].pts - s[a].pts) ||
      ((s[b].gf - s[b].ga) - (s[a].gf - s[a].ga)) ||
      (s[b].gf - s[a].gf) ||
      (Stats.clubStrength(this.clubById(state, b)) - Stats.clubStrength(this.clubById(state, a)))
    )[0];
  },

  finalizeGroupStage(state) {
    const v = state.vertu;
    if (v.stage !== "group") return;
    v.koParticipants = v.groups.map(g => this.groupWinner(state, g));
    v.stage = "ko";
    if (v.userGroup >= 0 && !v.koParticipants.includes(state.clubId)) {
      v.userOut = true; v.userExitStage = "group";
    }
  },

  roundForWeek(week) { return this.KO_ROUNDS.find(r => r.week === week) || null; },
  currentKoRound(state) { return this.KO_ROUNDS[state.vertu.koRoundIndex] || null; },

  drawKoRound(state) {
    const v = state.vertu;
    if (v.winner || v.stage !== "ko" || v.koDrawn === v.koRoundIndex) return;
    const pool = Cup.shuffle(v.koParticipants.slice());
    const ties = [];
    for (let i = 0; i + 1 < pool.length; i += 2) ties.push({ home: pool[i], away: pool[i + 1], played: false, winner: null, hg: 0, ag: 0, pens: false });
    v.koTies = ties; v.koDrawn = v.koRoundIndex;
  },

  userKoTie(state) {
    if (!this.isActive(state) || state.vertu.stage !== "ko") return null;
    return (state.vertu.koTies || []).find(t => t.home === state.clubId || t.away === state.clubId) || null;
  },

  applyKoScore(state, tie, hg, ag) {
    tie.hg = hg; tie.ag = ag;
    if (hg > ag) tie.winner = tie.home;
    else if (ag > hg) tie.winner = tie.away;
    else { tie.pens = true; tie.winner = Cup.penaltyWinner(this.clubById(state, tie.home), this.clubById(state, tie.away)); }
    tie.played = true;
  },

  // Credit Vertu Trophy player stats (both English lower-tier clubs have real squads).
  creditMatch(state, homeId, awayId, hg, ag) {
    if (typeof Stats === "undefined") return;
    const home = this.clubById(state, homeId), away = this.clubById(state, awayId);
    if (!home || !away || home.strengthOnly || away.strengthOnly || !home.squad || !home.squad.length || !away.squad || !away.squad.length) return;
    Stats.recordMatch(Lineup.starters(home), Lineup.starters(away), hg, ag, "vertu");
  },

  simulateOtherKoTies(state) {
    state.vertu.koTies.forEach(t => {
      if (t.played || t.home === state.clubId || t.away === state.clubId) return;
      const { hg, ag } = MatchEngine.simulateQuick(this.clubById(state, t.home), this.clubById(state, t.away));
      this.creditMatch(state, t.home, t.away, hg, ag);
      this.applyKoScore(state, t, hg, ag);
    });
  },

  recordUserKoTie(state, hg, ag) {
    const tie = this.userKoTie(state);
    if (tie && !tie.played) this.applyKoScore(state, tie, hg, ag);
    return tie;
  },

  completeKoRoundIfDone(state) {
    const v = state.vertu;
    if (!v.koTies.length || v.koTies.some(t => !t.played)) return false;
    const winners = v.koTies.map(t => t.winner);
    const userWasIn = v.koTies.some(t => t.home === state.clubId || t.away === state.clubId);
    if (userWasIn && !winners.includes(state.clubId) && !v.userOut) {
      v.userOut = true; v.userExitStage = this.KO_ROUNDS[v.koRoundIndex].name;
    }
    if (winners.length === 1) {
      v.winner = winners[0]; v.stage = "done";
      const final = v.koTies[0];
      v.runnerUp = final.winner === final.home ? final.away : final.home;
    } else {
      v.koParticipants = winners; v.koRoundIndex++;
    }
    return true;
  },

  // Resolve the whole competition without user interaction (background clubs,
  // or a safety net to guarantee a winner by season's end).
  autoResolve(state) {
    const v = state.vertu;
    if (!v || v.skipped || v.winner) return;
    if (v.stage === "group") this.finalizeGroupStage(state);
    let guard = 0;
    while (v.stage === "ko" && !v.winner && guard++ < 10) {
      this.drawKoRound(state);
      this.simulateOtherKoTies(state);
      const ut = this.userKoTie(state);
      if (ut && !ut.played) {
        const { hg, ag } = MatchEngine.simulateQuick(this.clubById(state, ut.home), this.clubById(state, ut.away));
        this.creditMatch(state, ut.home, ut.away, hg, ag);
        this.applyKoScore(state, ut, hg, ag);
      }
      this.completeKoRoundIfDone(state);
    }
  },

  // The user's own group standings, sorted, for the hub panel.
  userGroupTable(state) {
    const v = state.vertu;
    if (!v || v.userGroup < 0) return [];
    const s = v.standings;
    return v.groups[v.userGroup].slice().sort((a, b) =>
      (s[b].pts - s[a].pts) || ((s[b].gf - s[b].ga) - (s[a].gf - s[a].ga)) || (s[b].gf - s[a].gf)
    ).map((id, i) => ({ id, rank: i + 1, ...s[id] }));
  },

  seasonSummary(state) {
    const v = state.vertu;
    if (!v || v.skipped) return null;
    let userResult = "Not eligible (top two tiers)";
    if (v.userGroup >= 0) {
      if (v.winner === state.clubId) userResult = "🏆 Winners";
      else if (v.userExitStage === "group") userResult = "Out in the group stage";
      else if (v.userExitStage) userResult = "Out in the " + v.userExitStage;
      else userResult = "Eliminated";
    }
    return { name: "Vertu Trophy", winner: v.winner ? this.clubName(state, v.winner) : "—", userWon: v.winner === state.clubId, userResult, eligible: v.userGroup >= 0 };
  },
};
