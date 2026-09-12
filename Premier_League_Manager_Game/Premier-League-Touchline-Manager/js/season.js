/* =========================================================================
   PLFC TOUCHLINE MANAGER — SEASON
   Fixture generation (double round-robin), table maths, and the
   promotion / relegation / European-qualification turnover between
   seasons.
   ========================================================================= */

   const Season = {
    // Double round-robin schedule for one set of club ids. Handles odd counts
    // too (a phantom "bye" team sits one club out per round) — needed for the
    // odd-sized championship/relegation groups a split league can create (e.g.
    // a 7-team half). Byte-identical to the classic even-n schedule for leagues.
    roundRobin(ids) {
      const teams = ids.slice();
      if (teams.length % 2 === 1) teams.push("__bye__"); // odd → add a phantom
      const n = teams.length;
      const half = []; // first leg, n-1 rounds

      let arr = teams.slice(1);
      for (let r = 0; r < n - 1; r++) {
        const round = [];
        const lineup = [teams[0], ...arr];
        for (let i = 0; i < n / 2; i++) {
          const a = lineup[i];
          const b = lineup[n - 1 - i];
          if (a === "__bye__" || b === "__bye__") continue; // this club sits out
          // Alternate which side is "home" round to round for balance.
          if (r % 2 === 0) round.push({ home: a, away: b });
          else round.push({ home: b, away: a });
        }
        half.push(round);
        arr.unshift(arr.pop()); // rotate
      }
      // Second leg: same fixtures, venues swapped.
      const secondHalf = half.map(round => round.map(m => ({ home: m.away, away: m.home })));
      return [...half, ...secondHalf];
    },

    // A single round-robin (each pair meets once) — used for the extra games a
    // split league's groups play after the regular season.
    singleRoundRobin(ids) {
      const full = this.roundRobin(ids);
      return full.slice(0, full.length / 2);
    },

    // Play each pair `times` times (2 = double, the default; 3 = triple as in
    // Scotland/Switzerland/Hungary; 4 = quadruple as in Croatia/Ireland and most
    // 10-club leagues). Legs alternate venue so meetings are venue-balanced.
    roundRobinN(ids, times) {
      const dbl = this.roundRobin(ids);       // [firstLeg…, secondLeg…]
      const legLen = dbl.length / 2;
      const firstLeg = dbl.slice(0, legLen);
      const secondLeg = dbl.slice(legLen);
      let rounds = [];
      for (let i = 0; i < (times || 2); i++) rounds = rounds.concat(i % 2 === 0 ? firstLeg : secondLeg);
      return rounds;
    },

    // Builds a separate schedule for each league.
    buildFixtures(state) {
      state.fixtures = {};
      LEAGUES.forEach(lg => {
        const ids = state.clubs.filter(c => c.league === lg).map(c => c.id);
        const fmt = leagueFormat(lg);
        state.fixtures[lg] = this.roundRobinN(ids, (fmt && fmt.rounds) || 2);
      });
    },

    // Leagues have different sizes (20 vs 24 clubs) and therefore different
    // fixture counts. The season runs for as long as the USER's league does.
    totalWeeks(state) {
      const lg = Game.myLeague();
      return (state.fixtures[lg] || state.fixtures.PL || []).length;
    },

    // Leagues longer than the user's keep playing after the user's season is
    // done — quick-sim their outstanding rounds so every table is complete
    // before promotions and relegations are worked out.
    finishRemainingLeagues(state) {
      LEAGUES.forEach(lg => {
        let w = state.week, guard = 0;
        while (guard++ < 200) {
          this.ensureSplit(state, lg); // a split league appends its split rounds once its regular season is done
          const sched = state.fixtures[lg] || [];
          if (w >= sched.length) break;
          (sched[w] || []).forEach(m => {
            const home = state.clubs.find(c => c.id === m.home);
            const away = state.clubs.find(c => c.id === m.away);
            if (!home || !away) return;
            const { hg, ag } = MatchEngine.simulateQuick(home, away);
            this.recordResult(state, m.home, m.away, hg, ag);
            if (!home.strengthOnly && !away.strengthOnly) Stats.recordMatch(Lineup.starters(home), Lineup.starters(away), hg, ag);
          });
          w++;
        }
      });
    },

    currentRound(state, league) {
      this.ensureSplit(state, league); // append split-phase rounds once due
      const sched = state.fixtures[league];
      return (sched && sched[state.week]) || null;
    },

    // ---- championship/relegation split --------------------------------------
    // Leagues with a `format.split` play a regular double round-robin, then the
    // table splits into positional groups (top group = championship) that play
    // extra games among themselves, optionally with points halved/reset. The
    // split fixtures depend on the final regular-season table, so they can't be
    // pre-built — they're generated here the moment the regular season ends.

    ensureSplit(state, league) {
      const fmt = leagueFormat(league);
      if (!fmt || !fmt.split) return;
      state.splitDone = state.splitDone || {};
      if (state.splitDone[league]) return;
      const clubs = state.clubs.filter(c => c.league === league);
      if (clubs.length < 2) return;
      const regularRounds = ((fmt.rounds) || 2) * (clubs.length - 1); // triple/quadruple leagues split later
      if (Math.max(...clubs.map(c => c.played || 0)) < regularRounds) return; // regular season not done yet
      this.applySplit(state, league, fmt.split, clubs);
      state.splitDone[league] = true;
    },

    ensureAllSplits(state) { LEAGUES.forEach(lg => this.ensureSplit(state, lg)); },

    applySplit(state, league, split, clubs) {
      const table = this.table(state, league); // regular-season final order
      const sizes = split.groups || [Math.ceil(clubs.length / 2), Math.floor(clubs.length / 2)];
      const byId = id => clubs.find(c => c.id === id);
      // Lock each club into a positional group (0 = championship group).
      let idx = 0;
      const groupIds = sizes.map(size => {
        const ids = table.slice(idx, idx + size).map(r => r.id); idx += size; return ids;
      });
      table.slice(idx).forEach(r => groupIds[groupIds.length - 1].push(r.id)); // leftovers → last group
      groupIds.forEach((ids, gi) => ids.forEach(id => { const c = byId(id); if (c) c.splitGroup = gi; }));

      // Points transform — the signature tightener of some leagues.
      const mode = split.points || "carry";
      if (mode !== "carry") clubs.forEach(c => {
        if (mode === "halveUp") c.points = Math.ceil(c.points / 2);
        else if (mode === "halveDown") c.points = Math.floor(c.points / 2);
        else if (mode === "reset") { c.points = 0; c.won = 0; c.drawn = 0; c.lost = 0; c.gf = 0; c.ga = 0; c.played = 0; }
      });

      // Each group plays a round-robin among itself; merge so all groups play in
      // parallel each split week, then append to the league's schedule.
      const legs = split.legs || 1;
      const scheds = groupIds.map(ids => ids.length < 2 ? [] : (legs >= 2 ? this.roundRobin(ids) : this.singleRoundRobin(ids)));
      const maxRounds = scheds.reduce((m, s) => Math.max(m, s.length), 0);
      const splitRounds = [];
      for (let r = 0; r < maxRounds; r++) {
        let round = [];
        scheds.forEach(s => { if (s[r]) round = round.concat(s[r]); });
        splitRounds.push(round);
      }
      state.fixtures[league] = (state.fixtures[league] || []).concat(splitRounds);
    },

    userMatchThisRound(state) {
      const round = this.currentRound(state, Game.myLeague());
      if (!round) return null;
      return round.find(m => m.home === state.clubId || m.away === state.clubId) || null;
    },
  
    recordResult(state, homeId, awayId, hg, ag) {
      const home = state.clubs.find(c => c.id === homeId);
      const away = state.clubs.find(c => c.id === awayId);
      home.played++; away.played++;
      home.gf += hg; home.ga += ag;
      away.gf += ag; away.ga += hg;
      if (hg > ag) { home.won++; home.points += 3; away.lost++; }
      else if (hg < ag) { away.won++; away.points += 3; home.lost++; }
      else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
      state.results.push({ week: state.week, home: homeId, away: awayId, hg, ag });
      home.budget = Math.round((home.budget + Econ.weeklyIncome(home.tier, home.league)) * 10) / 10;
      away.budget = Math.round((away.budget + Econ.weeklyIncome(away.tier, away.league)) * 10) / 10;
    },
  
    // Simulate every match in BOTH leagues this round, except the user's own
    // match (which is played live). Stats are attributed for every game so the
    // per-league leaderboards reflect the whole division.
    simulateOtherMatchesThisRound(state) {
      LEAGUES.forEach(lg => {
        const round = this.currentRound(state, lg);
        if (!round) return;
        round.forEach(m => {
          if (m.home === state.clubId || m.away === state.clubId) return;
          const home = state.clubs.find(c => c.id === m.home);
          const away = state.clubs.find(c => c.id === m.away);
          const { hg, ag } = MatchEngine.simulateQuick(home, away);
          this.recordResult(state, m.home, m.away, hg, ag);
          // Player-level stats only exist for the managed country's squad clubs.
          if (!home.strengthOnly && !away.strengthOnly) Stats.recordMatch(Lineup.starters(home), Lineup.starters(away), hg, ag);
        });
      });
    },

    advanceWeek(state) {
      state.week++;
      this.ensureAllSplits(state); // extend split leagues' schedules the moment their regular season ends
      const transition = Market.weeklyUpdate(state);
      Market.freeAgentWeekly(state); // free agents churn every week, window or not
      Coaching.weeklyMarket(state); // fresh staff shortlist every matchweek
      Academy.weekly(state);        // scout intake, youth development, graduations
      Scouting.weekly(state);       // talent scouts return from assignments
      Fitness.weekly(state);        // stamina recovery, injury recovery + fresh injuries
      Morale.weekly(state);         // squad morale drifts on playing time, form, position…
      Career.updateConfidence(state); // board confidence tracks results vs the objective
      News.weekly(state);           // write the week up: results, rumours, rival business
      return transition;
    },
  
    isSeasonOver(state) {
      return state.week >= this.totalWeeks(state);
    },

    table(state, league = "PL") {
      const rows = state.clubs.filter(c => c.league === league).map(c => ({
        id: c.id, name: c.name, short: c.short, colors: c.colors,
        played: c.played, won: c.won, drawn: c.drawn, lost: c.lost,
        gf: c.gf, ga: c.ga, gd: c.gf - c.ga, points: c.points, splitGroup: c.splitGroup,
      }));
      // After a championship/relegation split, a lower-group club can't rank
      // above a higher-group one however many points it has: sort by group first.
      const grouped = rows.some(r => r.splitGroup != null);
      rows.sort((a, b) => {
        if (grouped) {
          const ga = a.splitGroup == null ? 99 : a.splitGroup, gb = b.splitGroup == null ? 99 : b.splitGroup;
          if (ga !== gb) return ga - gb;
        }
        return b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name);
      });
      rows.forEach((r, i) => r.pos = i + 1);
      return rows;
    },

    // Promotion / relegation rules per division. Each country's chain is closed
    // (England PL⇄CH⇄L1⇄L2, Spain LaLiga⇄Segunda). The top tier has European
    // places and relegation; second tiers promote (some with a play-off); the
    // lowest tier of a country has no relegation — its bottom is a sacking zone.
    LEAGUE_RULES: {
      PL: { autoPromote: 0, playoff: 0, relegate: 3 },
      CH: { autoPromote: 3, playoff: 0, relegate: 4 },
      L1: { autoPromote: 3, playoff: 1, relegate: 4 },
      L2: { autoPromote: 3, playoff: 1, relegate: 0, sacking: 4 },
      LL: { autoPromote: 0, playoff: 0, relegate: 3 },            // La Liga
      SG:  { autoPromote: 3, playoff: 0, relegate: 3 },            // Segunda (now a middle tier)
      PRF: { autoPromote: 3, playoff: 0, relegate: 3 },            // Primera Federación
      SGF: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 }, // Segunda Federación (bottom Spanish tier)
      // Foreign nations (Phase 3): top flight relegates 3, second tier promotes
      // 3 and is the sacking-zone bottom of its two-tier chain.
      BL1: { autoPromote: 0, playoff: 0, relegate: 3 },
      BL2: { autoPromote: 3, playoff: 0, relegate: 3 },
      BL3: { autoPromote: 3, playoff: 0, relegate: 3 },
      BL4: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      SA:  { autoPromote: 0, playoff: 0, relegate: 3 },
      SB:  { autoPromote: 3, playoff: 0, relegate: 3 },
      SEC: { autoPromote: 3, playoff: 0, relegate: 3 },
      SED: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      FL1: { autoPromote: 0, playoff: 0, relegate: 3 },
      FL2: { autoPromote: 3, playoff: 0, relegate: 3 },
      FN1: { autoPromote: 3, playoff: 0, relegate: 3 },
      FN2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      PP:  { autoPromote: 0, playoff: 0, relegate: 3 },
      P2:  { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      ER:  { autoPromote: 0, playoff: 0, relegate: 3 },
      EE:  { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      EK:  { autoPromote: 0, playoff: 0, relegate: 3 },
      IL:  { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      SL:  { autoPromote: 0, playoff: 0, relegate: 3 },
      T1:  { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      // Split-league nations (Phase 4): rules apply to FINAL post-split positions.
      BPL: { autoPromote: 0, playoff: 0, relegate: 3 },
      BCH: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      ABL: { autoPromote: 0, playoff: 0, relegate: 3 },
      A2L: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      DSL: { autoPromote: 0, playoff: 0, relegate: 3 },
      D1D: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      GSL: { autoPromote: 0, playoff: 0, relegate: 3 },
      GS2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      // N-times round-robin nations (Phase 5) — smaller 10-12 club leagues, 2 up/down.
      SPL: { autoPromote: 0, playoff: 0, relegate: 2 },
      SC2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      SSL: { autoPromote: 0, playoff: 0, relegate: 2 },
      SCL: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      HNL: { autoPromote: 0, playoff: 0, relegate: 2 },
      HN2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      NB1: { autoPromote: 0, playoff: 0, relegate: 2 },
      NB2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      // Batch 2 nations.
      CZ1: { autoPromote: 0, playoff: 0, relegate: 3 }, CZ2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      SR1: { autoPromote: 0, playoff: 0, relegate: 3 }, SR2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      UA1: { autoPromote: 0, playoff: 0, relegate: 3 }, UA2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      SE1: { autoPromote: 0, playoff: 0, relegate: 3 }, SE2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      NO1: { autoPromote: 0, playoff: 0, relegate: 3 }, NO2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      RO1: { autoPromote: 0, playoff: 0, relegate: 3 }, RO2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      CY1: { autoPromote: 0, playoff: 0, relegate: 3 }, CY2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      SK1: { autoPromote: 0, playoff: 0, relegate: 2 }, SK2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      // Batch 3 — all remaining UEFA nations.
      SN1: { autoPromote: 0, playoff: 0, relegate: 2 }, SN2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      IS1: { autoPromote: 0, playoff: 0, relegate: 3 }, IS2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      FI1: { autoPromote: 0, playoff: 0, relegate: 2 }, FI2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      BG1: { autoPromote: 0, playoff: 0, relegate: 3 }, BG2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      BA1: { autoPromote: 0, playoff: 0, relegate: 2 }, BA2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      IC1: { autoPromote: 0, playoff: 0, relegate: 2 }, IC2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      IE1: { autoPromote: 0, playoff: 0, relegate: 2 }, IE2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      AL1: { autoPromote: 0, playoff: 0, relegate: 2 }, AL2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      MK1: { autoPromote: 0, playoff: 0, relegate: 2 }, MK2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      MD1: { autoPromote: 0, playoff: 0, relegate: 2 }, MD2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      BY1: { autoPromote: 0, playoff: 0, relegate: 3 }, BY2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      AZ1: { autoPromote: 0, playoff: 0, relegate: 2 }, AZ2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      KZ1: { autoPromote: 0, playoff: 0, relegate: 3 }, KZ2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      GE1: { autoPromote: 0, playoff: 0, relegate: 2 }, GE2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      AM1: { autoPromote: 0, playoff: 0, relegate: 2 }, AM2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      LV1: { autoPromote: 0, playoff: 0, relegate: 2 }, LV2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      LT1: { autoPromote: 0, playoff: 0, relegate: 2 }, LT2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      XK1: { autoPromote: 0, playoff: 0, relegate: 2 }, XK2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      ME1: { autoPromote: 0, playoff: 0, relegate: 2 }, ME2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      ET1: { autoPromote: 0, playoff: 0, relegate: 2 }, ET2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      LU1: { autoPromote: 0, playoff: 0, relegate: 3 }, LU2: { autoPromote: 3, playoff: 0, relegate: 0, sacking: 3 },
      NI1: { autoPromote: 0, playoff: 0, relegate: 2 }, NI2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      MT1: { autoPromote: 0, playoff: 0, relegate: 2 }, MT2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      FO1: { autoPromote: 0, playoff: 0, relegate: 2 }, FO2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      WA1: { autoPromote: 0, playoff: 0, relegate: 2 }, WA2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      GI1: { autoPromote: 0, playoff: 0, relegate: 2 }, GI2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      AD1: { autoPromote: 0, playoff: 0, relegate: 2 }, AD2: { autoPromote: 2, playoff: 0, relegate: 0, sacking: 3 },
      SM1: { autoPromote: 0, playoff: 0, relegate: 0, sacking: 3 },
    },
    leagueAbove(lg) { const ch = chainFor(lg); const i = ch.indexOf(lg); return i > 0 ? ch[i - 1] : null; },
    leagueBelow(lg) { const ch = chainFor(lg); const i = ch.indexOf(lg); return i >= 0 && i < ch.length - 1 ? ch[i + 1] : null; },

    // Coloured table zones, sized to the league, and shaped by where it sits in
    // its country's pyramid.
    zoneFor(pos, league = "PL", size = 20) {
      const r = this.LEAGUE_RULES[league] || {};
      const isTop = this.leagueAbove(league) === null;
      const isBottom = this.leagueBelow(league) === null;
      if (isTop) {
        // European places follow the UEFA access list for THIS association's
        // coefficient rank — a top-5 nation sends four straight to the Champions
        // League league phase, a mid nation's champion enters CL qualifying,
        // a small nation gets only a qualifying place. (Euro.entryFor is the
        // shared source of truth with how the fields are actually built.)
        if (pos === 1) return "champion";
        const e = Euro.entryFor(LEAGUE_COUNTRY[league], pos);
        if (e) {
          if (e.comp === "ucl") return e.path === "direct" ? "ucl" : "uclq";
          if (e.comp === "uel") return "uel";
          if (e.comp === "uecl") return "ecl";
        }
        if (r.relegate && pos > size - r.relegate) return "relegation";
        return "";
      }
      if (pos <= r.autoPromote) return "promotion";
      if (r.playoff && pos <= r.autoPromote + 4) return "playoff";
      if (isBottom) { if (pos > size - (r.sacking || 3)) return "sacking"; return ""; }
      if (pos > size - r.relegate) return "relegation";
      return "";
    },

    // Resolve a play-off among a league's next four (positions autoPromote+1..+4):
    // semis are 1v4 and 2v3 by seed, then a final. Returns { winner, finalists }.
    runPlayoff(state, table, autoPromote) {
      const c = table.slice(autoPromote, autoPromote + 4).map(r => r.id);
      if (c.length < 4) return { winner: c[0] || null, finalists: c.slice(0, 2) };
      const f1 = this.playoffWinner(state, c[0], c[3]); // seed 4 v 7
      const f2 = this.playoffWinner(state, c[1], c[2]); // seed 5 v 6
      const winner = this.playoffWinner(state, f1, f2);
      return { winner, finalists: [f1, f2], contenders: c };
    },
    playoffWinner(state, aId, bId) {
      const a = state.clubs.find(c => c.id === aId), b = state.clubs.find(c => c.id === bId);
      const ra = MatchEngine.overallRating(Lineup.starters(a)) + 1.5; // slight edge to the higher seed
      const rb = MatchEngine.overallRating(Lineup.starters(b));
      return Math.random() < ra / (ra + rb) ? aId : bId;
    },
  
    endOfSeason(state) {
      // Finish any divisions that run longer than the user's before ranking.
      this.finishRemainingLeagues(state);

      const tables = {}; LEAGUES.forEach(lg => { tables[lg] = this.table(state, lg); });
      const awardsByLeague = {}; LEAGUES.forEach(lg => { awardsByLeague[lg] = Stats.awards(state, lg); });

      const userLeague = Game.myLeague();
      const myTable = tables[userLeague];
      const size = myTable.length;
      const champion = myTable[0];
      const myFinalPos = myTable.find(r => r.id === state.clubId).pos;
      const awards = awardsByLeague[userLeague]; // the user sees their own league's awards
      const faCup = Cup.seasonSummary(state, state.faCup, Cup.CUPS.fa);
      const eflCup = Cup.seasonSummary(state, state.eflCup, Cup.CUPS.efl);
      const copa = Cup.seasonSummary(state, state.copaCup, Cup.CUPS.copa);
      // The user's country's generic national cup (non-ENG/ESP nations).
      const natCupCfg = Object.values(Cup.CUPS).find(c => c.generic && c.country === Game.myCountry());
      const natCup = natCupCfg ? Cup.seasonSummary(state, state[natCupCfg.stateKey], natCupCfg) : null;
      Vertu.autoResolve(state); // guarantee a Vertu Trophy winner
      const vertu = Vertu.seasonSummary(state);
      const euro = Euro.seasonSummary(state); // the European campaign just played

      // Movement per league: N automatic promotions (+ a play-off winner where
      // applicable) go up; the bottom few go down.
      const promoteIds = {}; // clubs going UP out of each league
      const relegateIds = {}; // clubs going DOWN out of each league
      let userPlayoff = null;  // the user's play-off run, if any
      LEAGUES.forEach(lg => {
        const rules = this.LEAGUE_RULES[lg]; const tbl = tables[lg]; const n = tbl.length;
        if (rules.autoPromote) {
          const promoted = tbl.slice(0, rules.autoPromote).map(r => r.id);
          if (rules.playoff) {
            const po = this.runPlayoff(state, tbl, rules.autoPromote);
            if (po.winner) promoted.push(po.winner);
            if (lg === userLeague && po.contenders && po.contenders.includes(state.clubId)) {
              userPlayoff = po.winner === state.clubId ? "won"
                : po.finalists.includes(state.clubId) ? "lostFinal" : "lostSemi";
            }
          }
          promoteIds[lg] = promoted;
        }
        if (rules.relegate) relegateIds[lg] = tbl.slice(n - rules.relegate).map(r => r.id);
      });

      // Prize money for every club, scaled to its division.
      LEAGUES.forEach(lg => tables[lg].forEach(row => {
        const club = state.clubs.find(c => c.id === row.id);
        club.budget = Math.round((club.budget + Econ.endOfSeasonPrize(row.pos, lg)) * 10) / 10;
      }));

      // The user's fate.
      const rules = this.LEAGUE_RULES[userLeague];
      const isChampion = champion.id === state.clubId;
      const userPromoted = !!(promoteIds[userLeague] && promoteIds[userLeague].includes(state.clubId));
      const userRelegated = !!(relegateIds[userLeague] && relegateIds[userLeague].includes(state.clubId));
      // The bottom tier of a country has no division below — its bottom is a
      // sacking zone.
      const userSacked = this.leagueBelow(userLeague) === null && myFinalPos > size - (rules.sacking || 3);
      const toLeague = userPromoted ? this.leagueAbove(userLeague)
        : userRelegated ? this.leagueBelow(userLeague) : userLeague;

      // Grade the season against the board's objective (may reward the budget).
      const objectiveVerdict = Board.evaluate(state, {
        finalPos: myFinalPos, userLeague, promoted: userPromoted,
        relegated: userRelegated, champion: isChampion, sacked: userSacked,
      });

      state.history.push({
        season: state.season, league: userLeague, position: myFinalPos,
        champion: isChampion, promoted: userPromoted, relegated: userRelegated || userSacked,
        club: clubNameLookup(state, state.clubId),
      });
      if (isChampion && this.leagueAbove(userLeague) === null) state.titles++; // top-flight title

      // Trophy cabinet: record everything the manager won this season.
      state.honours = state.honours || [];
      const seasonPlayed = state.season;
      if (isChampion) state.honours.push({ type: userLeague, season: seasonPlayed });
      if (faCup && faCup.userWon) state.honours.push({ type: "facup", season: seasonPlayed });
      if (eflCup && eflCup.userWon) state.honours.push({ type: "carabao", season: seasonPlayed });
      if (vertu && vertu.userWon) state.honours.push({ type: "vertu", season: seasonPlayed });
      if (copa && copa.userWon) state.honours.push({ type: "copa", season: seasonPlayed });
      if (natCup && natCup.userWon) state.honours.push({ type: natCupCfg.stateKey, season: seasonPlayed });
      if (euro && euro.userWon) state.honours.push({ type: euro.comp, season: seasonPlayed });

      const resultBase = {
        userLeague, toLeague, myFinalPos, champion, isChampion,
        userPromoted, userRelegated, userSacked, userPlayoff,
        awards, tables, faCup, eflCup, vertu, copa, natCup, euro,
        objectiveVerdict,
      };

      // Snapshot the FINAL Teams of the Year now — before ageing shifts ratings,
      // before pro/rel moves clubs, and before the stat reset — for the
      // season-end reveal. (The Honours screen shows the live "so far" version.)
      {
        const uc = Game.myCountry();
        const euroLbl = { ucl: "Champions League", uel: "Europa League", uecl: "Conference League" };
        const toyList = [{ key: "league", label: LEAGUE_NAMES[userLeague] || "League", league: userLeague }];
        Object.values(Cup.CUPS).forEach(cfg => { if (cfg.country === uc) toyList.push({ key: cfg.key, label: cfg.name }); });
        ["ucl", "uel", "uecl"].forEach(k => { if (state.clubs.some(c => (c.squad || []).some(p => p.compStats && p.compStats[k] && p.compStats[k].apps))) toyList.push({ key: k, label: euroLbl[k] }); });
        if (state.clubs.some(c => (c.squad || []).some(p => p.compStats && p.compStats.vertu && p.compStats.vertu.apps))) toyList.push({ key: "vertu", label: "Vertu Trophy" });
        resultBase.teamsOfYear = toyList.map(cc => {
          const t = Stats.teamOf(state, cc.key, cc.key === "league" ? { league: cc.league } : {});
          return t.count ? { key: cc.key, label: cc.label, xi: t.xi, potm: t.potm, nominees: t.nominees } : null;
        }).filter(Boolean);
      }

      // Manager reputation + whether the board keep faith. A sacking no longer
      // ends the career — the world rolls on and a job market opens next season.
      const careerVerdict = Career.seasonUpdate(state, resultBase);
      resultBase.sacked = careerVerdict.sacked;
      resultBase.sackReason = careerVerdict.reason;

      // Off-season development for every club in all four divisions.
      const ageingNews = Aging.advanceSeason(state);
      // Club fortunes: reputations shift, squads/coaches follow, and the
      // chasing pack keeps a runaway leader honest.
      Dynamics.apply(state, tables);
      // Academy prospects age; 18-year-olds line up to graduate next season.
      Academy.seasonRollover(state);
      Scouting.seasonRollover(state); // scrap old scouting reports, recall scouts
      Fitness.seasonRollover(state);  // everyone fit & healthy for pre-season
      const contractDepartures = Contracts.seasonRollover(state); // expiring deals walk for free
      Morale.seasonRollover(state); // grievances ease into the new campaign

      // Apply the swaps: relegated clubs drop a division, promoted clubs rise.
      // Clubs keep their squads and reputation tier; only their league changes.
      LEAGUES.forEach(lg => {
        (relegateIds[lg] || []).forEach(id => { const c = state.clubs.find(c => c.id === id); if (c) c.league = this.leagueBelow(lg); });
        (promoteIds[lg] || []).forEach(id => { const c = state.clubs.find(c => c.id === id); if (c) c.league = this.leagueAbove(lg); });
      });

      // The board resizes the wage budget when the club changes division.
      Contracts.adjustBudgetForMovement(state, userPromoted, userRelegated);

      // Next season's form bonuses — top five of every category in every
      // league — then wipe season tallies (career totals persist).
      const allAwards = LEAGUES.flatMap(lg => awardsByLeague[lg]);
      const bonusesGranted = Stats.assignSeasonBonuses(state, allAwards);
      Stats.resetSeason(state);

      state.clubs.forEach(c => {
        c.points = 0; c.played = 0; c.won = 0; c.drawn = 0; c.lost = 0; c.gf = 0; c.ga = 0;
        c.splitGroup = null; // clear championship/relegation split group for the new season
      });
      state.splitDone = {}; // split leagues re-split next season

      // Super-cup curtain-raisers for the coming season, per the user's country.
      // England — Community Shield: PL champions vs FA Cup winners (runner-up
      // deputises if the same club).
      const country = Game.myCountry();
      state.pendingShield = null;
      state.pendingSupercopa = null;
      state.pendingSuperCup = null;
      if (country === "ENG") {
        const faWinnerId = state.faCup && state.faCup.winner;
        if (faWinnerId) state.pendingShield = { champion: tables.PL[0].id, faWinner: faWinnerId, faRunnerUp: state.faCup.runnerUp };
      } else if (country === "ESP") {
        // Supercopa de España — a "final four": La Liga winners & runners-up vs
        // Copa del Rey winners & runners-up.
        const copaWinnerId = state.copaCup && state.copaCup.winner;
        if (copaWinnerId) {
          const llTable = tables.LL;
          const llWinner = llTable[0].id, llRunnerUp = llTable[1].id;
          const used = new Set([llWinner, llRunnerUp]);
          // If a Copa side already qualified through the league, its berth
          // passes to the next-best La Liga club — so the final four is always
          // four distinct teams.
          const nextLL = () => { for (const row of llTable) if (!used.has(row.id)) { used.add(row.id); return row.id; } return llWinner; };
          let copaWinner = copaWinnerId;
          if (used.has(copaWinner)) copaWinner = nextLL(); else used.add(copaWinner);
          let copaRunnerUp = state.copaCup.runnerUp;
          if (!copaRunnerUp || used.has(copaRunnerUp)) copaRunnerUp = nextLL(); else used.add(copaRunnerUp);
          state.pendingSupercopa = { llWinner, llRunnerUp, copaWinner, copaRunnerUp };
        }
      } else {
        // Generic super cup: top-flight champion vs national cup winner.
        const cupWinnerId = natCupCfg && state[natCupCfg.stateKey] && state[natCupCfg.stateKey].winner;
        const topLg = LEAGUE_CHAINS[country] && LEAGUE_CHAINS[country][0];
        const champ = topLg && tables[topLg] && tables[topLg][0];
        if (cupWinnerId && champ) {
          state.pendingSuperCup = { champion: champ.id, cupWinner: cupWinnerId, name: (COUNTRY_NAMES[country] || country) + " Super Cup" };
        }
      }

      // European qualification for the coming season, from this season's final
      // top-flight tables (top 4 → UCL, 5th → UEL, 6th → UECL).
      state.pendingEuro = Euro.qualificationFromTables(state, tables);

      state.season++;
      state.week = 0;
      state.results = [];
      this.buildFixtures(state);
      Cup.initSeason(state); // fresh FA Cup + Carabao Cup brackets
      Vertu.initSeason(state); // fresh Vertu Trophy
      Euro.initSeason(state); // fresh Champions/Europa/Conference League
      state.windowWasOpen = false; // force the season-opening "window just opened" transition
      Market.weeklyUpdate(state);
      Market.seedFreeAgents(state); // fresh free-agent pool for the new season
      Coaching.weeklyMarket(state);
      Board.setObjective(state); // the board's target for the coming season
      Contracts.ensure(state); // backfill contracts on any newly-added squad players

      return { ...resultBase, ageingNews, bonusesGranted, contractDepartures };
    },
  };
  
  function clubNameLookup(state, id) {
    const c = state.clubs.find(c => c.id === id);
    return c ? c.name : id;
  }