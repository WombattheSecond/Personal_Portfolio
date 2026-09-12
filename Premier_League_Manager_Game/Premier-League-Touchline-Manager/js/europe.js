/* =========================================================================
   PLFC TOUCHLINE MANAGER — EUROPEAN COMPETITIONS
   The three UEFA club competitions run through the season for clubs that
   qualified via last season's league finish:
     • Champions League  — top 4 of each top flight
     • Europa League     — 5th
     • Conference League  — 6th
   Each uses the modern 36-team "League Phase" (a single Swiss-style table):
   every club plays 8 distinct opponents (two from each of four coefficient
   pots, four home and four away). Positions 1–8 go straight to the Round of
   16; 9–24 contest a two-legged knockout playoff for the other eight R16
   spots; 25–36 are eliminated outright (no drop into a lesser competition).
   The knockouts are two-legged (away goals abolished — level aggregate goes to
   a shootout) up to a single-leg Final.

   Because the world currently holds only England + Spain, each 36-team field
   is completed with the strongest remaining clubs by coefficient, standing in
   for the wider continent; as more countries are added the fields fill with
   genuine foreign qualifiers instead. You play YOUR competition in full (the
   whole league-phase table, your ties live); the other two are resolved in the
   background to a champion for the news and the honours board.
   ========================================================================= */

const EURO_COMPS = {
  ucl:  { key: "ucl",  name: "UEFA Champions League",  short: "UCL",  prestige: 3 },
  uel:  { key: "uel",  name: "UEFA Europa League",     short: "UEL",  prestige: 2 },
  uecl: { key: "uecl", name: "UEFA Conference League",  short: "UECL", prestige: 1 },
};
const EURO_COMP_KEYS = ["ucl", "uel", "uecl"];

// How many clubs each country sends to the group/league phase of each comp,
// roughly by UEFA coefficient. Everything not listed uses DEFAULT_BERTHS. The
// UCL field is a fixed 36, so if the total guaranteed exceeds that, buildFields
// keeps the strongest (small-nation champions effectively play "qualifying").
const EURO_BERTHS = {
  ENG: { ucl: 4, uel: 1, uecl: 1 }, ESP: { ucl: 4, uel: 1, uecl: 1 },
  GER: { ucl: 4, uel: 1, uecl: 1 }, ITA: { ucl: 4, uel: 1, uecl: 1 },
  FRA: { ucl: 3, uel: 1, uecl: 1 },
  POR: { ucl: 2, uel: 1, uecl: 1 }, NED: { ucl: 2, uel: 1, uecl: 1 },
  BEL: { ucl: 2, uel: 1, uecl: 1 }, TUR: { ucl: 2, uel: 1, uecl: 1 },
};
const DEFAULT_BERTHS = { ucl: 1, uel: 1, uecl: 1 };

// League-phase matchdays and the two-legged knockout weeks (0-based, within a
// 38-week top-flight season).
const EURO_MD_WEEKS = [3, 5, 7, 9, 12, 14, 16, 18];
const EURO_STAGE_ORDER = ["playoff", "r16", "qf", "sf", "final"];
const EURO_STAGE_META = {
  playoff: { name: "Knockout Playoff", short: "PO",  legWeeks: [21, 23], twoLeg: true },
  r16:     { name: "Round of 16",      short: "R16", legWeeks: [25, 27], twoLeg: true },
  qf:      { name: "Quarter-Final",    short: "QF",  legWeeks: [29, 31], twoLeg: true },
  sf:      { name: "Semi-Final",       short: "SF",  legWeeks: [33, 35], twoLeg: true },
  final:   { name: "Final",            short: "F",   legWeeks: [37],     twoLeg: false },
};

const Euro = {
  COMPS: EURO_COMPS,
  MD_WEEKS: EURO_MD_WEEKS,

  stageName(key) { return (EURO_STAGE_META[key] || {}).name || key; },
  club(state, id) { return state.clubs.find(c => c.id === id) || null; },
  coeff(club) { return Stats.clubStrength(club) + (club.tier || 0) * 0.4; },
  isActive(state) { return !!(state.euro && state.euro.userComp && state.euro.user); },

  // ---- qualification (UEFA access list) ------------------------------------
  // The Champions League league phase (36 clubs) is assembled the real way:
  // direct entrants by association coefficient rank, plus survivors of the
  // Champions Path (league champions of ranks 11–55) and the League Path
  // (non-champions of ranks 6–16), each decided by two-legged qualifying that
  // is simulated. Losers drop into the Europa League. See buildEuroFields.

  // Record each country's top-flight finishers + the user's cup winner, for the
  // coming season's access list. (Stored on state.pendingEuro over save/load.)
  standingsFromTables(state, tables) {
    const standings = {};
    COUNTRIES.forEach(co => {
      const tbl = tables[LEAGUE_CHAINS[co][0]];
      if (tbl) standings[co] = tbl.slice(0, 6).map(r => r.id);
    });
    const cup = Object.values(Cup.CUPS).find(c => c.country === Game.myCountry() && Cup.isActive(state[c.stateKey]) && state[c.stateKey].winner);
    return { standings, cupWinner: cup ? state[cup.stateKey].winner : null };
  },
  // Kept for callers that still reference the old name.
  qualificationFromTables(state, tables) { return this.standingsFromTables(state, tables); },

  // Season 1 has no prior finish — seed standings from current squad strength.
  bootstrapStandings(state) {
    const standings = {};
    COUNTRIES.forEach(co => {
      standings[co] = state.clubs.filter(c => c.league === LEAGUE_CHAINS[co][0])
        .sort((a, b) => Stats.clubStrength(b) - Stats.clubStrength(a)).slice(0, 6).map(c => c.id);
    });
    return { standings, cupWinner: null };
  },

  // UEFA association coefficient order (2024-ish, Russia excluded). Drives the
  // access list. Any country not listed falls in behind by squad strength.
  ASSOC_RANK: [
    "ENG", "ITA", "ESP", "GER", "FRA", "NED", "POR", "BEL", "TUR", "GRE",
    "CZE", "NOR", "AUT", "SUI", "DEN", "SCO", "UKR", "ISR", "SRB", "POL",
    "CYP", "SWE", "CRO", "HUN", "ROU", "AZE", "SVK", "BUL", "SVN", "KAZ",
    "BIH", "FIN", "ISL", "MDA", "IRL", "MKD", "BLR", "ALB", "GEO", "ARM",
    "LVA", "KVX", "LTU", "LUX", "NIR", "MNE", "MLT", "FRO", "WAL", "EST",
    "GIB", "AND", "SMR",
  ],
  associationRank(state) {
    const listed = this.ASSOC_RANK.filter(co => COUNTRIES.includes(co));
    const rest = COUNTRIES.filter(co => !listed.includes(co));
    return listed.concat(rest);
  },

  // THE ACCESS LIST — the single source of truth for where a top-flight
  // finishing position goes, by association coefficient rank. Used both to
  // build the fields AND to colour the league table (Season.euroZone), so the
  // two always agree. Returns { comp, path, round } or null.
  //   comp: "ucl" | "uel" | "uecl"
  //   path: "direct" (straight to league phase) | "cp" (Champions Path) | "lp" (League Path)
  //   round: which qualifying round the path club enters at
  entryFor(country, pos) {
    const r = (this.ASSOC_RANK.indexOf(country) + 1) || 99;
    if (pos === 1) { // champions
      if (r <= 10) return { comp: "ucl", path: "direct" };
      if (r <= 14) return { comp: "ucl", path: "cp", round: "po" };
      if (r <= 23) return { comp: "ucl", path: "cp", round: "r2" };
      return { comp: "ucl", path: "cp", round: "r1" };
    }
    // non-champions
    if (r <= 5)  { if (pos <= 4) return { comp: "ucl", path: "direct" }; if (pos === 5) return { comp: "uel" }; if (pos === 6) return { comp: "uecl" }; return null; }
    if (r === 6) { if (pos === 2) return { comp: "ucl", path: "direct" }; if (pos === 3) return { comp: "ucl", path: "lp", round: "r3" }; if (pos === 4) return { comp: "uel" }; if (pos === 5) return { comp: "uecl" }; return null; }
    if (r <= 9)  { if (pos === 2) return { comp: "ucl", path: "lp", round: "r3" }; if (pos === 3) return { comp: "uel" }; if (pos === 4) return { comp: "uecl" }; return null; }
    if (r <= 15) { if (pos === 2) return { comp: "ucl", path: "lp", round: "r2" }; if (pos === 3) return { comp: "uel" }; if (pos === 4) return { comp: "uecl" }; return null; }
    if (r === 16) { if (pos === 2) return { comp: "ucl", path: "lp", round: "r3" }; if (pos === 3) return { comp: "uel" }; return null; }
    if (pos === 2) return { comp: "uel" }; if (pos === 3) return { comp: "uecl" }; return null;
  },

  // Split every qualifier into direct league-phase entrants, the two CL
  // qualifying paths, and the Europa/Conference direct entrants.
  buildAccessList(state, pe) {
    const standings = (pe && pe.standings) || {};
    const directLP = [], cp = { r1: [], r2: [], po: [] }, lp = { r2: [], r3: [] }, uel = [], uecl = [];
    COUNTRIES.forEach(co => {
      const s = standings[co] || [];
      for (let pos = 1; pos <= 6; pos++) {
        const id = s[pos - 1]; if (!id) continue;
        const e = this.entryFor(co, pos); if (!e) continue;
        if (e.comp === "ucl") {
          if (e.path === "direct") directLP.push(id);
          else if (e.path === "cp") cp[e.round].push(id);
          else if (e.path === "lp") lp[e.round].push(id);
        } else if (e.comp === "uel") uel.push(id);
        else if (e.comp === "uecl") uecl.push(id);
      }
    });
    return { directLP, cp, lp, uel, uecl };
  },

  // One two-legged qualifying tie, strength-based (penalties settle a level tie).
  qualTieWinner(state, a, b) {
    const A = this.club(state, a), B = this.club(state, b);
    if (!A) return b; if (!B) return a;
    const l1 = MatchEngine.simulateQuick(A, B), l2 = MatchEngine.simulateQuick(B, A);
    const aggA = l1.hg + l2.ag, aggB = l1.ag + l2.hg;
    if (aggA > aggB) return a; if (aggB > aggA) return b;
    return Cup.penaltyWinner(A, B);
  },

  // One qualifying round: seed by coefficient, pair strongest v weakest, return
  // { winners, losers } (an odd club gets a bye).
  simKoRound(state, ids) {
    const sorted = ids.slice().sort((x, y) => this.coeff(this.club(state, y)) - this.coeff(this.club(state, x)));
    const winners = [], losers = [], n = sorted.length;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const hi = sorted[i], lo = sorted[n - 1 - i];
      const w = this.qualTieWinner(state, hi, lo);
      winners.push(w); losers.push(w === hi ? lo : hi);
    }
    if (n % 2 === 1) winners.push(sorted[Math.floor(n / 2)]); // bye
    return { winners, losers };
  },

  runPath(state, roundsEntrants) {
    let alive = [], losers = [];
    roundsEntrants.forEach(entrants => {
      const r = this.simKoRound(state, alive.concat(entrants));
      alive = r.winners; losers = losers.concat(r.losers);
    });
    return { winners: alive, losers };
  },

  // Assemble all three 36-club fields via the access list + qualifying.
  buildEuroFields(state, pe) {
    const A = this.buildAccessList(state, pe);
    const userId = state.clubId;
    const inArr = (...arrs) => arrs.some(a => a.includes(userId));
    const userInCP = inArr(A.cp.r1, A.cp.r2, A.cp.po);
    const userInLP = inArr(A.lp.r2, A.lp.r3);

    const champ = this.runPath(state, [A.cp.r1, A.cp.r2, [], A.cp.po]); // 30→15, +9=24→12, →6, +4=10→5
    const league = this.runPath(state, [A.lp.r2, A.lp.r3, []]);         // 6→3, +5=8→4, →2

    const ranked = state.clubs.slice().sort((a, b) => this.coeff(b) - this.coeff(a)).map(c => c.id);
    const assigned = new Set();
    const fill = (field, seed) => {
      seed.forEach(id => { if (id && !assigned.has(id) && field.length < 36) { field.push(id); assigned.add(id); } });
      for (const id of ranked) { if (field.length >= 36) break; if (!assigned.has(id)) { field.push(id); assigned.add(id); } }
    };
    const ucl = [], uel = [], uecl = [];
    fill(ucl, [...A.directLP, ...champ.winners, ...league.winners]); // + performance spots by coefficient
    // Europa League: the domestic cup winner, the position-based Europa entrants,
    // and CL qualifying losers drop in. Conference: the position-based entrants.
    fill(uel, [pe && pe.cupWinner, ...A.uel, ...champ.losers, ...league.losers].filter(Boolean));
    fill(uecl, [...A.uecl]);

    // Route the user. If they entered a qualifying path, they PLAY it live at the
    // start of the season — leave their competition pending until it's decided.
    let userComp = null, qualNote = null, qual = null;
    if (userInCP || userInLP) {
      qual = this.buildUserQual(state, A);
      qualNote = qual && qual.introNote;
    }
    if (!qual) {
      if (ucl.includes(userId)) userComp = "ucl";
      else if (uel.includes(userId)) userComp = "uel";
      else if (uecl.includes(userId)) userComp = "uecl";
    }
    return { fields: { ucl, uel, uecl }, userComp, qualNote, qual };
  },

  // The user's live qualifying journey: how many ties they must win from their
  // entry round, and a progressively tougher opponent for each.
  buildUserQual(state, A) {
    const userId = state.clubId;
    let path, total, roundNames;
    if (A.cp.r1.includes(userId)) { path = "cp"; total = 4; roundNames = ["Champions Path — Round 1", "Champions Path — Round 2", "Champions Path — Round 3", "Champions Path — Play-off"]; }
    else if (A.cp.r2.includes(userId)) { path = "cp"; total = 3; roundNames = ["Champions Path — Round 2", "Champions Path — Round 3", "Champions Path — Play-off"]; }
    else if (A.cp.po.includes(userId)) { path = "cp"; total = 1; roundNames = ["Champions Path — Play-off"]; }
    else if (A.lp.r2.includes(userId)) { path = "lp"; total = 3; roundNames = ["League Path — Round 2", "League Path — Round 3", "League Path — Play-off"]; }
    else if (A.lp.r3.includes(userId)) { path = "lp"; total = 2; roundNames = ["League Path — Round 3", "League Path — Play-off"]; }
    else return null;
    const pool = (path === "cp" ? [...A.cp.r1, ...A.cp.r2, ...A.cp.po] : [...A.lp.r2, ...A.lp.r3])
      .filter(id => id !== userId)
      .sort((a, b) => this.coeff(this.club(state, a)) - this.coeff(this.club(state, b))); // weakest first
    const opponents = [];
    for (let i = 0; i < total; i++) opponents.push(pool.length ? pool[Math.min(Math.floor(i * pool.length / total), pool.length - 1)] : null);
    return {
      comp: "ucl", path, total, round: 0, opponents, roundNames,
      resolved: false, madeIt: false,
      introNote: `Champions League ${path === "cp" ? "Champions" : "League"} Path — win ${total} qualifying tie${total > 1 ? "s" : ""} to reach the league phase.`,
    };
  },

  // Once the user's live qualifying is decided, slot them into the Champions
  // League (won) or Europa League (lost) and finish setting up their season.
  finalizeUserQual(state) {
    const q = state.euro.qual;
    const userId = state.clubId;
    const fields = state.euro._pendingFields || { ucl: [], uel: [], uecl: [] };
    const ranked = state.clubs.slice().sort((a, b) => this.coeff(b) - this.coeff(a)).map(c => c.id);
    const inField = new Set([].concat(fields.ucl, fields.uel, fields.uecl));
    EURO_COMP_KEYS.forEach(k => { const i = fields[k].indexOf(userId); if (i >= 0) fields[k].splice(i, 1); });
    inField.delete(userId);
    const target = q.madeIt ? "ucl" : "uel";
    if (fields[target].length >= 36) { const dropped = fields[target].pop(); inField.delete(dropped); }
    fields[target].push(userId); inField.add(userId);
    EURO_COMP_KEYS.forEach(k => { for (const id of ranked) { if (fields[k].length >= 36) break; if (!inField.has(id)) { fields[k].push(id); inField.add(id); } } });
    q.resolved = true;
    state.euro.userComp = target;
    state.euro.qualNote = q.madeIt
      ? `Came through the ${q.path === "cp" ? "Champions" : "League"} Path — into the Champions League!`
      : "Knocked out in Champions League qualifying — into the Europa League.";
    EURO_COMP_KEYS.forEach(k => { if (k !== target) state.euro.champions[k] = this.resolveBackgroundChampion(state, fields[k]); });
    this.setupUserComp(state, target, fields[target]);
    delete state.euro._pendingFields;
  },

  // ---- season init ---------------------------------------------------------

  initSeason(state) {
    state.euro = { season: state.season, userComp: null, champions: {}, user: null, qualNote: null, qual: null };
    const pe = state.pendingEuro || this.bootstrapStandings(state);
    state.pendingEuro = null;

    const built = this.buildEuroFields(state, pe);
    state.euro.qualNote = built.qualNote;

    if (built.qual) {
      // The user plays the Champions League qualifiers live at the season's
      // start; their competition and the background champions are settled then.
      state.euro.qual = built.qual;
      state.euro._pendingFields = built.fields;
      return;
    }

    const userComp = built.userComp;
    state.euro.userComp = userComp;
    EURO_COMP_KEYS.forEach(k => {
      if (k === userComp) return;
      state.euro.champions[k] = this.resolveBackgroundChampion(state, built.fields[k], k);
    });
    if (userComp) this.setupUserComp(state, userComp, built.fields[userComp]);
  },

  // A lightweight seeded knockout among a field's 16 strongest, to name a winner.
  // `comp` (uel/uecl) credits the ties' player stats so those competitions get a
  // real Golden Boot & Team of the Tournament even though the user isn't in them.
  resolveBackgroundChampion(state, field, comp) {
    let alive = field.slice()
      .sort((a, b) => Stats.clubStrength(this.club(state, b)) - Stats.clubStrength(this.club(state, a)))
      .slice(0, 16);
    let guard = 0;
    while (alive.length > 1 && guard++ < 8) {
      alive.sort((a, b) => Stats.clubStrength(this.club(state, b)) - Stats.clubStrength(this.club(state, a)));
      const winners = [];
      for (let i = 0; i < alive.length / 2; i++) {
        const hi = this.club(state, alive[i]);
        const lo = this.club(state, alive[alive.length - 1 - i]);
        const { hg, ag } = MatchEngine.simulateQuick(hi, lo);
        if (comp) this.creditMatch(state, hi.id, lo.id, hg, ag, comp);
        winners.push(hg >= ag ? hi.id : lo.id);
      }
      alive = winners;
    }
    return alive[0] || field[0];
  },

  setupUserComp(state, comp, field) {
    const eu = {
      comp, field: field.slice(), pots: [], table: {}, fixtures: [], stage: "league",
      ranking: [], seedOf: {}, ko: null, finalPos: null,
      winner: null, runnerUp: null, userOut: false, userExitStage: null,
    };
    // Four coefficient pots of nine.
    const ranked = field.slice().sort((a, b) => this.coeff(this.club(state, b)) - this.coeff(this.club(state, a)));
    for (let p = 0; p < 4; p++) eu.pots.push(ranked.slice(p * 9, p * 9 + 9));
    field.forEach(id => eu.table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

    const { matches, userFixtures } = this.buildSchedule(state, eu);
    userFixtures.forEach((f, i) => { f.week = EURO_MD_WEEKS[i]; f.played = false; f.hg = 0; f.ag = 0; eu.fixtures.push(f); });

    // Spread the background matches across the eight matchdays so the table
    // fills alongside the user's own games rather than all at once up front.
    eu.bgMatches = matches.map((m, i) => ({ home: m.home, away: m.away, week: EURO_MD_WEEKS[i % EURO_MD_WEEKS.length], played: false }));
    state.euro.user = eu;
  },

  // Credit per-player stats for a simulated European tie, into the user's
  // competition bucket (ucl/uel/uecl) — but only for real-squad clubs (the
  // designated foreign keepers + the user's own nation's qualifiers). Strength-
  // only clubs have no players, so those ties simply aren't attributed.
  creditMatch(state, homeId, awayId, hg, ag, comp) {
    comp = comp || (state.euro && state.euro.userComp);
    if (typeof Stats === "undefined" || !comp) return;
    const home = this.club(state, homeId), away = this.club(state, awayId);
    if (!home || !away || home.strengthOnly || away.strengthOnly) return;
    if (!home.squad || !home.squad.length || !away.squad || !away.squad.length) return;
    Stats.recordMatch(Lineup.starters(home), Lineup.starters(away), hg, ag, comp);
  },

  // Quick-sim every background league-phase match scheduled for this week.
  simBackgroundMatchday(state, week) {
    if (!this.isActive(state)) return;
    const eu = state.euro.user;
    if (!eu.bgMatches || eu.stage !== "league") return;
    eu.bgMatches.forEach(m => {
      if (m.played || m.week !== week) return;
      const { hg, ag } = MatchEngine.simulateQuick(this.club(state, m.home), this.club(state, m.away));
      this.creditMatch(state, m.home, m.away, hg, ag);
      this.applyLeagueResult(eu, m.home, m.away, hg, ag);
      m.played = true;
    });
  },

  // An (approximately) 8-regular schedule on the 36 clubs, with the user's eight
  // games locked first (two per pot, four home / four away).
  buildSchedule(state, eu) {
    const ids = eu.field;
    const uid = state.clubId;
    const need = {}, played = {}, homeCount = {};
    ids.forEach(id => { need[id] = 8; played[id] = new Set(); homeCount[id] = 0; });

    // Lock the user's opponents: two from each pot.
    const userFixtures = [];
    eu.pots.forEach(pot => {
      const cands = Cup.shuffle(pot.filter(id => id !== uid && !played[uid].has(id)));
      let picked = 0;
      for (const id of cands) {
        if (picked >= 2) break;
        played[uid].add(id); played[id].add(uid); need[uid]--; need[id]--;
        userFixtures.push({ opp: id }); picked++;
      }
    });
    // Four home, four away.
    Cup.shuffle(userFixtures);
    userFixtures.forEach((f, i) => {
      const userHome = i < 4;
      f.home = userHome ? uid : f.opp;
      f.away = userHome ? f.opp : uid;
      homeCount[f.home]++;
    });

    // Greedy-pair the rest until everyone has (close to) eight games.
    const matches = [];
    let guard = 0;
    while (guard++ < 400000) {
      const pending = ids.filter(id => need[id] > 0);
      if (!pending.length) break;
      pending.sort((a, b) => need[b] - need[a]);
      const a = pending[0];
      const cands = pending.filter(b => b !== a && !played[a].has(b));
      if (!cands.length) { need[a] = 0; continue; } // rare dead-end: drop remaining games
      const b = cands[Math.floor(Math.random() * cands.length)];
      const home = homeCount[a] <= homeCount[b] ? a : b;
      const away = home === a ? b : a;
      matches.push({ home, away });
      homeCount[home]++; played[a].add(b); played[b].add(a); need[a]--; need[b]--;
    }
    return { matches, userFixtures };
  },

  applyLeagueResult(eu, h, a, hg, ag) {
    const H = eu.table[h], A = eu.table[a];
    if (!H || !A) return;
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; H.pts += 3; A.l++; }
    else if (ag > hg) { A.w++; A.pts += 3; H.l++; }
    else { H.d++; A.d++; H.pts++; A.pts++; }
  },

  // ---- league phase (user side) -------------------------------------------

  userLeagueFixtureThisWeek(state) {
    if (!this.isActive(state)) return null;
    const eu = state.euro.user;
    if (eu.stage !== "league") return null;
    return eu.fixtures.find(f => f.week === state.week && !f.played) || null;
  },

  recordUserLeagueGame(state, fixture, hg, ag) {
    const eu = state.euro.user;
    fixture.hg = hg; fixture.ag = ag; fixture.played = true;
    this.applyLeagueResult(eu, fixture.home, fixture.away, hg, ag);
    if (eu.fixtures.every(f => f.played)) this.finalizeLeaguePhase(state);
  },

  tableSorted(state, eu) {
    const gd = id => eu.table[id].gf - eu.table[id].ga;
    return eu.field.slice().sort((a, b) =>
      (eu.table[b].pts - eu.table[a].pts) || (gd(b) - gd(a)) || (eu.table[b].gf - eu.table[a].gf) ||
      (Stats.clubStrength(this.club(state, b)) - Stats.clubStrength(this.club(state, a)))
    );
  },

  finalizeLeaguePhase(state) {
    const eu = state.euro.user;
    // Safety net: settle any background match that hasn't been played yet.
    (eu.bgMatches || []).forEach(m => {
      if (m.played) return;
      const { hg, ag } = MatchEngine.simulateQuick(this.club(state, m.home), this.club(state, m.away));
      this.creditMatch(state, m.home, m.away, hg, ag);
      this.applyLeagueResult(eu, m.home, m.away, hg, ag);
      m.played = true;
    });
    const ranked = this.tableSorted(state, eu);
    eu.ranking = ranked;
    eu.seedOf = {}; ranked.forEach((id, i) => eu.seedOf[id] = i + 1);
    eu.finalPos = eu.seedOf[state.clubId];
    eu.top8 = ranked.slice(0, 8);
    eu.poField = ranked.slice(8, 24);
    eu.eliminated = ranked.slice(24);
    eu.ko = { order: EURO_STAGE_ORDER.slice(), stages: {} };
    if (eu.finalPos >= 25) { eu.stage = "out"; eu.userOut = true; eu.userExitStage = "League Phase"; }
    else eu.stage = "ko";
  },

  // ---- knockout bracket ----------------------------------------------------

  pairBySeed(eu, alive) {
    const sorted = alive.slice().sort((a, b) => eu.seedOf[a] - eu.seedOf[b]);
    const pairs = []; const n = sorted.length;
    for (let i = 0; i < n / 2; i++) pairs.push([sorted[i], sorted[n - 1 - i]]);
    return pairs;
  },

  ensureDrawn(state, eu, stageKey) {
    if (eu.ko.stages[stageKey]) return eu.ko.stages[stageKey];
    let alive;
    if (stageKey === "playoff") alive = eu.poField.slice();
    else if (stageKey === "r16") alive = eu.top8.concat(this.resolveStage(state, eu, "playoff").winners);
    else alive = this.resolveStage(state, eu, { qf: "r16", sf: "qf", final: "sf" }[stageKey]).winners.slice();

    const meta = EURO_STAGE_META[stageKey];
    const ties = this.pairBySeed(eu, alive).map(([hi, lo]) => {
      const legs = meta.twoLeg
        ? [{ home: lo, away: hi, week: meta.legWeeks[0], played: false, hg: 0, ag: 0 },
           { home: hi, away: lo, week: meta.legWeeks[1], played: false, hg: 0, ag: 0 }]
        : [{ home: hi, away: lo, week: meta.legWeeks[0], played: false, hg: 0, ag: 0 }];
      return { hi, lo, legs, winner: null, pens: false };
    });
    eu.ko.stages[stageKey] = { alive, ties, resolved: false, winners: null };
    return eu.ko.stages[stageKey];
  },

  simStageLeg(state, eu, stageKey, legIndex) {
    const st = eu.ko.stages[stageKey];
    if (!st) return;
    st.ties.forEach(t => {
      const lf = t.legs[legIndex];
      if (!lf || lf.played) return;
      if (t.hi === state.clubId || t.lo === state.clubId) return; // user's leg is played live
      const { hg, ag } = MatchEngine.simulateQuick(this.club(state, lf.home), this.club(state, lf.away));
      this.creditMatch(state, lf.home, lf.away, hg, ag);
      lf.hg = hg; lf.ag = ag; lf.played = true;
    });
  },

  resolveTie(state, eu, t, stageKey) {
    if (t.winner) return;
    const meta = EURO_STAGE_META[stageKey];
    if (!meta.twoLeg) {
      const lf = t.legs[0];
      if (!lf.played) return;
      if (lf.hg > lf.ag) t.winner = lf.home;
      else if (lf.ag > lf.hg) t.winner = lf.away;
      else { t.pens = true; t.winner = Cup.penaltyWinner(this.club(state, lf.home), this.club(state, lf.away)); }
    } else {
      const [l1, l2] = t.legs;
      if (!l1.played || !l2.played) return;
      const aggHi = l1.ag + l2.hg, aggLo = l1.hg + l2.ag; // l1: lo home, l2: hi home
      if (aggHi > aggLo) t.winner = t.hi;
      else if (aggLo > aggHi) t.winner = t.lo;
      else { t.pens = true; t.winner = Cup.penaltyWinner(this.club(state, t.hi), this.club(state, t.lo)); }
    }
  },

  resolveStage(state, eu, stageKey) {
    const st = this.ensureDrawn(state, eu, stageKey);
    if (st.resolved) return st;
    EURO_STAGE_META[stageKey].legWeeks.forEach((w, li) => this.simStageLeg(state, eu, stageKey, li));
    st.ties.forEach(t => this.resolveTie(state, eu, t, stageKey));
    if (st.ties.some(t => !t.winner)) return st; // a user leg still outstanding — resolve later
    st.winners = st.ties.map(t => t.winner);
    st.resolved = true;
    const ut = st.ties.find(t => t.hi === state.clubId || t.lo === state.clubId);
    if (ut && ut.winner !== state.clubId && !eu.userOut) { eu.userOut = true; eu.userExitStage = EURO_STAGE_META[stageKey].name; }
    if (stageKey === "final") {
      const f = st.ties[0];
      eu.winner = f.winner; eu.runnerUp = f.winner === f.hi ? f.lo : f.hi; eu.stage = "done";
    }
    return st;
  },

  // Bring every stage whose legs are already in the past up to date.
  syncTo(state, eu, week) {
    for (const k of eu.ko.order) {
      const meta = EURO_STAGE_META[k];
      if (meta.legWeeks[0] > week) break;
      this.ensureDrawn(state, eu, k);
      if (meta.legWeeks[meta.legWeeks.length - 1] < week) this.resolveStage(state, eu, k);
    }
  },

  // The user's live knockout leg this week (also simulates the round's other
  // legs in the background). Returns null when the user has nothing to play.
  userKoLegThisWeek(state, club) {
    const eu = state.euro.user;
    if (!eu || eu.stage !== "ko") return null;
    const week = state.week;
    const stageKey = eu.ko.order.find(k => EURO_STAGE_META[k].legWeeks.includes(week));
    if (!stageKey) return null;
    this.syncTo(state, eu, week);
    if (eu.stage === "done") return null;
    this.ensureDrawn(state, eu, stageKey);
    const legIndex = EURO_STAGE_META[stageKey].legWeeks.indexOf(week);
    this.simStageLeg(state, eu, stageKey, legIndex);
    const st = eu.ko.stages[stageKey];
    const t = st.ties.find(t => t.hi === club.id || t.lo === club.id);
    if (t) {
      const lf = t.legs[legIndex];
      if (lf && !lf.played) return { comp: eu.comp, stageKey, tie: t, legIndex, legFix: lf, meta: EURO_STAGE_META[stageKey] };
    }
    return null;
  },

  // Record a user knockout leg and (if the tie is complete) settle it. Returns a
  // short status string for the match screen.
  recordUserKoLeg(state, item, hg, ag) {
    const eu = state.euro.user;
    const t = item.tie, lf = item.legFix;
    lf.hg = hg; lf.ag = ag; lf.played = true;
    this.resolveTie(state, eu, t, item.stageKey);
    if (!t.winner) {
      // First leg of a two-legged tie.
      return `1st leg · ${hg}–${ag}`;
    }
    const meta = item.meta;
    const userWon = t.winner === state.clubId;
    if (!userWon && !eu.userOut) { eu.userOut = true; eu.userExitStage = meta.name; }
    if (item.stageKey === "final") {
      eu.winner = t.winner; eu.runnerUp = t.winner === t.hi ? t.lo : t.hi; eu.stage = "done";
      eu.ko.stages.final.resolved = true; eu.ko.stages.final.winners = [t.winner];
      return userWon ? `🏆 ${EURO_COMPS[eu.comp].short} Winners!` : `${Cup.clubShort(state, t.winner)} win the ${EURO_COMPS[eu.comp].short}`;
    }
    if (meta.twoLeg) {
      const aggHi = t.legs[0].ag + t.legs[1].hg, aggLo = t.legs[0].hg + t.legs[1].ag;
      const hiG = Math.max(aggHi, aggLo), loG = Math.min(aggHi, aggLo);
      const tag = t.pens ? "Pens" : `Agg ${hiG}–${loG}`;
      return `${tag} · ${userWon ? "Through!" : Cup.clubShort(state, t.winner) + " advance"}`;
    }
    return userWon ? "Through!" : "Eliminated";
  },

  // ---- season recap --------------------------------------------------------

  ordinalPos(state, eu) {
    const ranked = this.tableSorted(state, eu);
    return ranked.indexOf(state.clubId) + 1;
  },

  seasonSummary(state) {
    const e = state.euro;
    if (!e) return null;
    const comp = e.userComp;
    const champions = { ...(e.champions || {}) };
    if (comp && e.user) champions[comp] = e.user.winner;
    if (!comp) return { name: "Europe", comp: null, userWon: false, winner: "—", userResult: "Did not qualify", eligible: false, champions };
    const eu = e.user; const meta = EURO_COMPS[comp];
    let userResult;
    if (eu.winner === state.clubId) userResult = "🏆 Winners";
    else if (eu.userExitStage) userResult = "Out in the " + eu.userExitStage;
    else if (eu.finalPos) userResult = "League phase — finished " + eu.finalPos + "th of 36";
    else userResult = "Eliminated";
    return {
      name: meta.name, comp, userWon: eu.winner === state.clubId,
      winner: eu.winner ? Cup.clubName(state, eu.winner) : "—", userResult, eligible: true, champions,
    };
  },
};
