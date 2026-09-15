/* =========================================================================
   PLFC TOUCHLINE MANAGER — DOMESTIC CUPS (FA CUP + CARABAO CUP)
   A generic single-elimination engine that runs TWO knockouts through the
   season alongside the four leagues. Every entrant is a real league club (no
   placeholders). Clubs enter at staged rounds — minnows early, the biggest
   sides latest — so the field halves cleanly to a Final. On designated
   matchweeks you play a cup tie as well as your league game. Draws go to
   penalties; cup goals stay out of the league leaderboards.

   FA Cup: all 92 clubs. The weakest play a First Round; the rest are seeded
   into the 64-team Third Round.
   Carabao Cup: the 72 EFL clubs open in Round One; the 13 "non-European"
   Premier League clubs join in Round Two; the 7 "European" clubs in Round
   Three (European status approximated by squad strength).
   ========================================================================= */

const FA_CUP_ROUNDS = [
  { key: "R1", name: "First Round",   short: "R1",    week: 3 },
  { key: "R2", name: "Second Round",  short: "R2",    week: 7 },
  { key: "R3", name: "Third Round",   short: "R3",    week: 12 },
  { key: "R4", name: "Fourth Round",  short: "R4",    week: 17 },
  { key: "R5", name: "Fifth Round",   short: "R5",    week: 23 },
  { key: "QF", name: "Quarter-Final", short: "QF",    week: 28 },
  { key: "SF", name: "Semi-Final",    short: "SF",    week: 32 },
  { key: "F",  name: "Final",         short: "Final", week: 36 },
];
const CARABAO_ROUNDS = [
  { key: "R1", name: "Round One",     short: "R1",    week: 2 },
  { key: "R2", name: "Round Two",     short: "R2",    week: 6 },
  { key: "R3", name: "Round Three",   short: "R3",    week: 11 },
  { key: "R4", name: "Round Four",    short: "R4",    week: 16 },
  { key: "QF", name: "Quarter-Final", short: "QF",    week: 22 },
  { key: "SF", name: "Semi-Final",    short: "SF",    week: 27 },
  { key: "F",  name: "Final",         short: "Final", week: 33 },
];
const COPA_ROUNDS = [
  { key: "R1",  name: "First Round",    short: "R1",    week: 3 },
  { key: "R32", name: "Round of 32",    short: "R32",   week: 8 },
  { key: "R16", name: "Round of 16",    short: "R16",   week: 14 },
  { key: "QF",  name: "Quarter-Final",  short: "QF",    week: 20 },
  { key: "SF",  name: "Semi-Final",     short: "SF",    week: 26 },
  { key: "F",   name: "Final",          short: "Final", week: 33 },
];

const Cup = {
  // Build functions return { participants: <round-0 field ids>, entrantsByRound:
  // { roundIndex: [ids joining at that round] } }. Each cup belongs to a country.
  CUPS: {
    fa: {
      key: "fa", stateKey: "faCup", name: "FA Cup", country: "ENG", rounds: FA_CUP_ROUNDS,
      build(state) {
        // Weakest 16 open the First Round; the next tier joins the Second
        // Round; the strongest 44 are seeded into the 64-team Third Round.
        const eng = state.clubs.filter(c => LEAGUE_COUNTRY[c.league] === "ENG");
        const ranked = eng.slice().sort((a, b) => Stats.clubStrength(a) - Stats.clubStrength(b));
        const total = ranked.length;
        const r1 = 16;
        const m = Math.max(0, 2 * (total - 76)); // clubs entering the Second Round (32 for 92)
        const participants = ranked.slice(0, r1).map(c => c.id);
        const r2entrants = ranked.slice(r1, r1 + m).map(c => c.id);
        const r3entrants = ranked.slice(r1 + m).map(c => c.id); // seeded to the Third Round
        return { participants, entrantsByRound: { 1: r2entrants, 2: r3entrants } };
      },
    },
    efl: {
      key: "efl", stateKey: "eflCup", name: "Carabao Cup", country: "ENG", rounds: CARABAO_ROUNDS,
      build(state) {
        const byStrength = list => list.slice().sort((a, b) => Stats.clubStrength(b) - Stats.clubStrength(a)).map(c => c.id);
        const efl = byStrength(state.clubs.filter(c => c.league === "CH" || c.league === "L1" || c.league === "L2"));
        const pl = byStrength(state.clubs.filter(c => c.league === "PL"));
        const eflByes = efl.slice(0, 2);      // 2 strongest EFL sides skip Round One
        const round1 = efl.slice(2);           // remaining EFL clubs open the cup
        const euroPL = pl.slice(0, 7);         // "in Europe" — enter latest, Round Three
        const nonEuroPL = pl.slice(7);         // enter Round Two
        return { participants: round1, entrantsByRound: { 1: [...eflByes, ...nonEuroPL], 2: euroPL } };
      },
    },
    copa: {
      key: "copa", stateKey: "copaCup", name: "Copa del Rey", country: "ESP", rounds: COPA_ROUNDS,
      build(state) {
        // All Spanish clubs; the weakest open a First Round, the rest are seeded
        // into a 32-team Round of 32.
        const esp = state.clubs.filter(c => LEAGUE_COUNTRY[c.league] === "ESP");
        const ranked = esp.slice().sort((a, b) => Stats.clubStrength(a) - Stats.clubStrength(b));
        const prelim = Math.max(0, 2 * (ranked.length - 32)); // 20 for 42 clubs
        const participants = ranked.slice(0, prelim).map(c => c.id);
        const byes = ranked.slice(prelim).map(c => c.id);
        return { participants, entrantsByRound: { 1: byes } };
      },
    },
  },

  // Only the user's country's cups are live; the rest stay dormant.
  initAll(state) {
    const country = Game.myCountry();
    Object.values(this.CUPS).forEach(cfg => {
      if (cfg.country === country) this.init(state, cfg);
      else state[cfg.stateKey] = { skipped: true, participants: [], entrantsByRound: {}, ties: [], winner: null };
    });
  },
  initCareer(state) { this.initAll(state); },
  initSeason(state) { this.initAll(state); },

  init(state, cfg) {
    const built = cfg.build(state);
    const { participants, entrantsByRound } = built;
    let userEntryRound = participants.includes(state.clubId) ? 0 : null;
    if (userEntryRound === null) {
      for (const r of Object.keys(entrantsByRound)) {
        if (entrantsByRound[r].includes(state.clubId)) { userEntryRound = Number(r); break; }
      }
    }
    state[cfg.stateKey] = {
      season: state.season, roundIndex: 0, drawnRound: -1,
      participants, entrantsByRound, rounds: built.rounds || null, // per-instance rounds for generic cups
      userEntryRound: userEntryRound == null ? 0 : userEntryRound,
      ties: [], winner: null, userOut: false, userExitRound: null, skipped: false,
    };
  },

  // Rounds for a cup instance: a generic national cup carries its own rounds
  // list (sized to the field); the hand-built cups use their static config.
  roundsOf(cfg, fc) { return (fc && fc.rounds) || cfg.rounds || []; },

  // Build a rounds list for a knockout of `bracket` clubs (a power of two),
  // optionally preceded by a preliminary round. Names are derived from the
  // teams remaining; the Final always lands late in the season.
  buildRounds(bracket, hasPrelim) {
    const names = [];
    if (hasPrelim) names.push("Preliminary Round");
    for (let t = bracket; t >= 2; t /= 2) {
      names.push(t > 16 ? "Round of " + t : t === 16 ? "Round of 16" : t === 8 ? "Quarter-Final" : t === 4 ? "Semi-Final" : "Final");
    }
    const WEEKS = [2, 5, 8, 11, 15, 19, 23, 27, 30, 34];
    const weeks = WEEKS.slice(-names.length);
    return names.map((name, i) => ({ key: "r" + i, name, short: name.length > 8 ? name.slice(0, 8) : name, week: weeks[i] }));
  },

  // ---- lookups & status ----------------------------------------------------

  isActive(fc) { return !!(fc && !fc.skipped); },
  clubByAnyId(state, id) { return state.clubs.find(c => c.id === id) || null; },
  clubName(state, id) { const c = this.clubByAnyId(state, id); return c ? c.name : id; },
  clubShort(state, id) { const c = this.clubByAnyId(state, id); return c ? c.short : id; },
  roundForWeek(cfg, week, fc) { return this.roundsOf(cfg, fc).find(r => r.week === week) || null; },
  currentRoundDef(cfg, fc) { return this.roundsOf(cfg, fc)[fc.roundIndex] || null; },
  userHasBye(fc) { return fc.winner == null && !fc.userOut && fc.roundIndex < fc.userEntryRound; },
  userTie(state, fc) {
    if (!this.isActive(fc)) return null;
    return fc.ties.find(t => t.home === state.clubId || t.away === state.clubId) || null;
  },

  // ---- drawing & resolving -------------------------------------------------

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  drawRound(state, fc) {
    if (fc.winner || fc.drawnRound === fc.roundIndex) return;
    const pool = this.shuffle(fc.participants.slice());
    const ties = [];
    for (let i = 0; i + 1 < pool.length; i += 2) {
      ties.push({ home: pool[i], away: pool[i + 1], played: false, winner: null, hg: 0, ag: 0, pens: false });
    }
    fc.ties = ties;
    fc.drawnRound = fc.roundIndex;
  },

  _pendingPenWinner: null, // set by an interactive shootout; consumed once here
  penaltyWinner(home, away) {
    if (this._pendingPenWinner) { const w = this._pendingPenWinner; this._pendingPenWinner = null; return w; }
    const rh = MatchEngine.overallRating(Lineup.starters(home));
    const ra = MatchEngine.overallRating(Lineup.starters(away));
    return Math.random() < rh / (rh + ra) ? home.id : away.id;
  },

  applyScore(state, tie, hg, ag) {
    tie.hg = hg; tie.ag = ag;
    if (hg > ag) tie.winner = tie.home;
    else if (ag > hg) tie.winner = tie.away;
    else {
      tie.pens = true;
      tie.winner = this.penaltyWinner(this.clubByAnyId(state, tie.home), this.clubByAnyId(state, tie.away));
    }
    tie.played = true;
  },

  simulateOtherTies(state, fc, comp) {
    fc.ties.forEach(t => {
      if (t.played || t.home === state.clubId || t.away === state.clubId) return;
      const home = this.clubByAnyId(state, t.home);
      const away = this.clubByAnyId(state, t.away);
      const { hg, ag } = MatchEngine.simulateQuick(home, away);
      // Credit per-competition player stats for real-squad clubs (a domestic cup
      // is all the user's own country, so both sides have real players).
      if (comp && typeof Stats !== "undefined" && !home.strengthOnly && !away.strengthOnly && home.squad && away.squad) {
        Stats.recordMatch(Lineup.starters(home), Lineup.starters(away), hg, ag, comp);
      }
      this.applyScore(state, t, hg, ag);
    });
  },

  recordUserTie(state, fc, hg, ag) {
    const tie = this.userTie(state, fc);
    if (tie && !tie.played) this.applyScore(state, tie, hg, ag);
    return tie;
  },

  // Advance the bracket once every tie has a winner; new entrants join the
  // survivors for the next round.
  completeRoundIfDone(state, fc) {
    if (!fc.ties.length || fc.ties.some(t => !t.played)) return false;
    const winners = fc.ties.map(t => t.winner);
    const userWasIn = fc.ties.some(t => t.home === state.clubId || t.away === state.clubId);
    if (userWasIn && !winners.includes(state.clubId) && !fc.userOut) {
      fc.userOut = true;
      fc.userExitRound = fc.roundIndex;
    }
    if (winners.length === 1) {
      fc.winner = winners[0];
      const final = fc.ties[0];
      fc.runnerUp = final.winner === final.home ? final.away : final.home;
    } else {
      const next = fc.roundIndex + 1;
      fc.participants = [...winners, ...(fc.entrantsByRound[next] || [])];
      fc.roundIndex = next;
    }
    return true;
  },

  // ---- season-end recap ----------------------------------------------------

  seasonSummary(state, fc, cfg) {
    if (!fc || fc.skipped) return null;
    let userResult = "Did not feature";
    if (fc.winner === state.clubId) userResult = "🏆 Winners";
    else if (fc.userExitRound != null) userResult = "Out in the " + (this.roundsOf(cfg, fc)[fc.userExitRound] || {}).name;
    return { name: cfg.name, winner: fc.winner ? this.clubName(state, fc.winner) : "—", userWon: fc.winner === state.clubId, userResult };
  },
};

// A generic national cup for every nation that doesn't already have a bespoke
// one (England's FA/Carabao, Spain's Copa). The weakest clubs contest a
// preliminary round; the strongest are seeded into a clean single-elimination
// bracket. Field size varies by nation, so each carries its own rounds list.
function makeNationalCup(country, name, stateKey) {
  return {
    key: stateKey, stateKey, name, country, generic: true, rounds: null,
    build(state) {
      const clubs = state.clubs.filter(c => LEAGUE_COUNTRY[c.league] === country);
      const ranked = clubs.slice().sort((a, b) => Stats.clubStrength(a) - Stats.clubStrength(b)); // weakest first
      const N = ranked.length;
      let bracket = 1; while (bracket * 2 <= N) bracket *= 2; // largest power of two ≤ field
      const prelimClubs = 2 * (N - bracket);
      const hasPrelim = prelimClubs > 0;
      const participants = (hasPrelim ? ranked.slice(0, prelimClubs) : ranked).map(c => c.id);
      const byes = hasPrelim ? ranked.slice(prelimClubs).map(c => c.id) : [];
      return { participants, entrantsByRound: hasPrelim ? { 1: byes } : {}, rounds: Cup.buildRounds(bracket, hasPrelim) };
    },
  };
}

const NATIONAL_CUPS = {
  GER: "DFB-Pokal", ITA: "Coppa Italia", FRA: "Coupe de France", POR: "Taça de Portugal",
  NED: "KNVB Beker", POL: "Puchar Polski", TUR: "Turkish Cup", BEL: "Belgian Cup",
  AUT: "ÖFB-Cup", DEN: "DBU Pokalen", GRE: "Greek Cup", SCO: "Scottish Cup",
  SUI: "Swiss Cup", CRO: "Croatian Cup", HUN: "Magyar Kupa",
  CZE: "Czech Cup", SRB: "Serbian Cup", UKR: "Ukrainian Cup", SWE: "Svenska Cupen",
  NOR: "Norwegian Cup", ROU: "Cupa României", CYP: "Cypriot Cup", SVK: "Slovak Cup",
  SVN: "Slovenian Cup", ISR: "State Cup", FIN: "Suomen Cup", BUL: "Bulgarian Cup",
  BIH: "BiH Cup", ISL: "Icelandic Cup", IRL: "FAI Cup", ALB: "Albanian Cup",
  MKD: "Macedonian Cup", MDA: "Cupa Moldovei", BLR: "Belarusian Cup", AZE: "Azerbaijan Cup",
  KAZ: "Kazakhstan Cup", GEO: "Georgian Cup", ARM: "Armenian Cup", LVA: "Latvian Cup",
  LTU: "Lithuanian Cup", KVX: "Kosovar Cup", MNE: "Montenegrin Cup", EST: "Estonian Cup",
  LUX: "Luxembourg Cup", NIR: "Irish Cup", MLT: "FA Trophy", FRO: "Faroese Cup",
  WAL: "Welsh Cup", GIB: "Rock Cup", AND: "Copa Constitució", SMR: "Coppa Titano",
};
Object.entries(NATIONAL_CUPS).forEach(([cc, name]) => {
  Cup.CUPS["cup" + cc] = makeNationalCup(cc, name, "cup" + cc);
});
