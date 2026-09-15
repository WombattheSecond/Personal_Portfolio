/* =========================================================================
   PLFC TOUCHLINE MANAGER — MATCH ENGINE
   Quick simulation for AI-vs-AI fixtures, plus a full minute-by-minute
   timeline generator (with commentary) for the user's live matches.
   ========================================================================= */

   const Commentary = {
    kickoff: [
      "{home} get us underway at {stadium}.",
      "We're off! {home} versus {away} begins here.",
      "Kick-off at {stadium} — {home} in possession to start.",
    ],
    chanceMiss: [
      "{player} drives forward but the final ball goes astray.",
      "{player} works a yard of space but fires well over the bar.",
      "Half-chance for {team} — {player}'s effort drifts wide.",
      "{player} can't quite get hold of it, the shot balloons off target.",
    ],
    shotSaved: [
      "{player} tests the keeper with a firm strike — well saved!",
      "Good save! {player}'s effort was heading in before the stop.",
      "{player} shoots — pushed away at full stretch by the goalkeeper.",
    ],
    woodwork: [
      "{player} crashes the woodwork! So close for {team}.",
      "Off the post! {player} will wonder how that stayed out.",
    ],
    goal: [
      "GOAL! {player} finishes brilliantly for {team}!",
      "GOAL! {team} are ahead — {player} with the finish!",
      "GOAL! {player} slots it home, {team} fans erupt!",
      "GOAL! A composed finish from {player} for {team}!",
    ],
    yellow: [
      "{player} goes into the book for {team} after a late challenge.",
      "Yellow card shown to {player}.",
    ],
    red: [
      "RED CARD! {player} is sent off for {team} — big moment in this game.",
    ],
    sub: [
      "{team} make a change: {playerOff} makes way for {playerOn}.",
    ],
    half: ["Half-time at {stadium}."],
    full: ["That's full-time."],
  };
  
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ""); }
  
  // Award boosts (carried by a user-club winner into the next season) nudge a
  // player's effective contribution. Team-level effects are deliberately half
  // the headline number so a "+12% goals" striker lifts the whole attack only
  // modestly, while their personal share of the goals gets the full boost in
  // weightedScorer below.
  function goalBoost(p) { return (p.bonus && p.bonus.goal) || 0; }
  function assistBoost(p) { return (p.bonus && p.bonus.assist) || 0; }
  function keeperBoost(p) { return (p.bonus && p.bonus.keeper) || 0; }
  function defenseBoost(p) { return (p.bonus && p.bonus.defense) || 0; }
  // A tired player contributes less. This mirrors the energy-adjusted rating the
  // UI shows ("55 (-3)"), so a player performs exactly at the value on screen:
  // fitFactor scales p.rating down to Fitness.effRating(p). Foreign/generated
  // players have no fitness field and are unaffected (delta 0 → factor 1).
  function fitFactor(p) {
    if (typeof Fitness !== "undefined" && Fitness.effRating && p.rating) return Fitness.effRating(p) / p.rating;
    const f = typeof p.fitness === "number" ? p.fitness : 100; return 0.7 + 0.3 * (f / 100);
  }
  // Morale nudges a player's effective contribution (neutral for rivals / players
  // with no tracked morale). Combined with fitness for a single condition factor.
  function condFactor(p) { return fitFactor(p) * (typeof Morale !== "undefined" ? Morale.factor(p) : 1); }

  const MatchEngine = {
    // `slotOf` ({playerId: detailedPos}) is optional. When supplied (live match),
    // each player is bucketed by the LINE THEY'RE PLAYING (so a striker shoved to
    // centre-back defends instead of attacking) and scaled by positional fit — a
    // player out of position contributes less. Without it (quick-sims, where the
    // XI is auto-picked in position) behaviour is bit-identical to before.
    _lineOf(p, slotOf) { return (slotOf && slotOf[p.id] && typeof Positions !== "undefined") ? Positions.broad(slotOf[p.id]) : p.pos; },
    _posFF(p, slotOf) { return (slotOf && slotOf[p.id] && typeof Positions !== "undefined") ? Positions.fitFactor(slotOf[p.id], p) : 1; },
    attackRating(players, slotOf) {
      const eff = p => p.rating * (1 + 0.5 * goalBoost(p) + 0.3 * assistBoost(p)) * condFactor(p) * this._posFF(p, slotOf);
      const fw = players.filter(p => this._lineOf(p, slotOf) === "FW");
      const mf = players.filter(p => this._lineOf(p, slotOf) === "MF");
      const avg = arr => arr.length ? arr.reduce((s, p) => s + eff(p), 0) / arr.length : 60;
      return avg(fw) * 0.6 + avg(mf) * 0.4;
    },
    defenseRating(players, slotOf) {
      const df = players.filter(p => this._lineOf(p, slotOf) === "DF");
      const gk = players.filter(p => this._lineOf(p, slotOf) === "GK");
      const avgDf = df.length ? df.reduce((s, p) => s + p.rating * (1 + defenseBoost(p)) * condFactor(p) * this._posFF(p, slotOf), 0) / df.length : 60;
      const avgGk = gk.length ? gk.reduce((s, p) => s + p.rating * (1 + keeperBoost(p)) * condFactor(p) * this._posFF(p, slotOf), 0) / gk.length : 60;
      return avgDf * 0.72 + avgGk * 0.28;
    },
    overallRating(players) {
      if (!players.length) return 60;
      return players.reduce((s, p) => s + p.rating, 0) / players.length;
    },

    // Attack/defense ratings for a club, whichever way it's modelled.
    // A club managed at player level (the user's country) has a real squad, so
    // its ratings come from its starting XI. A "strength-only" foreign club
    // (no stored squad — see the lightweight rest-of-world model) is simulated
    // from a single `strength` number, used for both attack and defense. This
    // keeps every quick-sim call site working for both kinds of club with no
    // change, and is bit-identical to the old path for squad clubs.
    sideRatings(club) {
      if (!club.strengthOnly && club.squad && club.squad.length) {
        const st = Lineup.starters(club);
        return { att: this.attackRating(st), def: this.defenseRating(st), starters: st };
      }
      const s = typeof club.strength === "number" ? club.strength : 60;
      return { att: s, def: s, starters: null };
    },

    // A disposable XI for a strength-only club, so it can appear in a LIVE
    // match (Europe) with named players for the commentary/scorers. Generated
    // around the club's strength and never stored — the club stays squad-less.
    tempStarters(club) {
      const s = typeof club.strength === "number" ? club.strength : 60;
      const out = [];
      [["GK", 1], ["DF", 4], ["MF", 4], ["FW", 2]].forEach(([pos, n]) => {
        for (let i = 0; i < n; i++) {
          const nm = (typeof randomProspect === "function") ? randomProspect().name : (club.short + " " + pos + (i + 1));
          out.push({ id: club.id + "_t" + out.length, name: nm, pos, bonus: {},
            rating: Math.max(40, Math.min(95, Math.round(s + (Math.random() * 8 - 4)))) });
        }
      });
      return out;
    },

    // Picks a goalscorer, weighted toward forwards and toward anyone carrying a
    // goalscoring boost. Promoted to the engine so the stat attributor and the
    // live commentary draw scorers from the exact same model.
    weightedScorer(list) {
      if (!list.length) return null;
      const weights = list.map(p => p.rating * (p.pos === "FW" ? 1.9 : 1.0) * (1 + goalBoost(p)));
      const total = weights.reduce((s, w) => s + w, 0);
      let r = Math.random() * total;
      for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
      return list[list.length - 1];
    },
    // Picks an assister (midfield-weighted, boost-aware), never the scorer.
    weightedAssister(list, scorer) {
      const pool = scorer ? list.filter(p => p.id !== scorer.id) : list.slice();
      const src = pool.length ? pool : list;
      if (!src.length) return null;
      const weights = src.map(p => p.rating * (p.pos === "MF" ? 1.6 : 1.0) * (1 + assistBoost(p)));
      const total = weights.reduce((s, w) => s + w, 0);
      let r = Math.random() * total;
      for (let i = 0; i < src.length; i++) { r -= weights[i]; if (r <= 0) return src[i]; }
      return src[src.length - 1];
    },
  
    // Converts a rating gap into a goal-rate multiplier. Exponential rather
    // than linear/ratio-based, so a big quality gap (10+ rating points,
    // roughly a top-half side vs a relegation-threatened one) produces a
    // genuinely dominant favorite instead of a near coin-flip, while small
    // gaps stay close to fair. Clamped so even huge mismatches keep a small
    // chance of an upset rather than becoming a foregone conclusion.
    goalRatio(att, def) {
      // Compressed vs. before so even a big favourite can't run up cricket
      // scores every week — dominance shows over a season, not in one blowout.
      return clamp(Math.pow(1.045, att - def), 0.25, 3.6);
    },

    // A per-match "form" swing (±20%) applied to each side, so a strong team can
    // have an off day and an underdog can catch fire — the source of the odd
    // dropped point and giant-killing that make a perfect season very hard.
    form() { return 0.8 + Math.random() * 0.4; },

    // Fast result for AI-vs-AI matches: no commentary, just a scoreline.
    simulateQuick(home, away) {
      const H = this.sideRatings(home), A = this.sideRatings(away);
      const hAtt = H.att * 1.04;
      const hDef = H.def;
      const aAtt = A.att;
      const aDef = A.def;

      const hxg = clamp(1.28 * this.goalRatio(hAtt, aDef) * this.form(), 0.2, 5.2);
      const axg = clamp(1.05 * this.goalRatio(aAtt, hDef) * this.form(), 0.22, 4.8);

      const hg = poisson(hxg);
      const ag = poisson(axg);
      return { hg, ag };
    },
  
    // Builds the full minute-by-minute event timeline for a live, watched match.
    simulateFull(home, away) {
      const H = this.sideRatings(home), A = this.sideRatings(away);
      const hStarters = H.starters || this.tempStarters(home);
      const aStarters = A.starters || this.tempStarters(away);
      const hAtt = H.att * 1.04;
      const hDef = H.def;
      const aAtt = A.att;
      const aDef = A.def;
  
      const pHomeGoal = clamp(0.0130 * this.goalRatio(hAtt, aDef) * this.form(), 0.004, 0.062);
      const pAwayGoal = clamp(0.0110 * this.goalRatio(aAtt, hDef) * this.form(), 0.004, 0.058);
  
      const timeline = [];
      let hg = 0, ag = 0;
      const homeScorers = [], awayScorers = []; // ordered scorer ids, fed to the stat sheet
      const reds = []; // {side, playerId} — used to suspend the user's player next match
      let momentum = 50;
      const push = obj => { timeline.push({ ...obj, mom: Math.round(momentum), seq: timeline.length }); };
  
      const attackersOf = (club, starters) => {
        const list = starters.filter(p => p.pos === "FW" || p.pos === "MF");
        return list.length ? list : starters;
      };
      const hAttackers = attackersOf(home, hStarters);
      const aAttackers = attackersOf(away, aStarters);
      const weightedPlayer = list => {
        const total = list.reduce((s, p) => s + p.rating, 0);
        let r = Math.random() * total;
        for (const p of list) { r -= p.rating; if (r <= 0) return p; }
        return list[list.length - 1];
      };
      const weightedScorer = list => MatchEngine.weightedScorer(list);

      push({ minute: 0, type: "kickoff", text: fmt(pick(Commentary.kickoff), { home: home.name, away: away.name, stadium: home.stadium }), hg, ag });
  
      let hSubsUsed = 0, aSubsUsed = 0;
      const stoppage1 = 1 + Math.floor(Math.random() * 4);
      const stoppage2 = 1 + Math.floor(Math.random() * 6);
      const totalMinutes = 45 + stoppage1 + 45 + stoppage2;
  
      for (let m = 1; m <= totalMinutes; m++) {
        if (m === 46 + stoppage1) {
          push({ minute: 45, type: "half", text: fmt(pick(Commentary.half), { stadium: home.stadium }), hg, ag });
        }
        const driftTarget = 50 + (hAtt - aAtt + (aDef - hDef)) * 1.4;
        momentum += (driftTarget - momentum) * 0.04 + (Math.random() - 0.5) * 6;
        momentum = clamp(momentum, 5, 95);
  
        const minuteLabel = m <= 45 + stoppage1 ? Math.min(m, 45) : Math.min(m - stoppage1, 90);
        const isStoppage = (m > 45 && m <= 45 + stoppage1) || (m > 45 + stoppage1 + 45);
  
        const roll = Math.random();
        if (roll < pHomeGoal) {
          hg++; const scorer = weightedScorer(hAttackers); homeScorers.push(scorer.id);
          push({ minute: minuteLabel, stoppage: isStoppage, type: "goal", side: "home", text: fmt(pick(Commentary.goal), { player: scorer.name, team: home.name }), hg, ag });
        } else if (roll < pHomeGoal + pAwayGoal) {
          ag++; const scorer = weightedScorer(aAttackers); awayScorers.push(scorer.id);
          push({ minute: minuteLabel, stoppage: isStoppage, type: "goal", side: "away", text: fmt(pick(Commentary.goal), { player: scorer.name, team: away.name }), hg, ag });
        } else if (roll < pHomeGoal + pAwayGoal + 0.05) {
          const homeChance = Math.random() * 100 < momentum;
          const team = homeChance ? home : away;
          const list = homeChance ? hAttackers : aAttackers;
          const player = weightedPlayer(list);
          const flavor = Math.random();
          const pool = flavor < 0.45 ? Commentary.chanceMiss : flavor < 0.85 ? Commentary.shotSaved : Commentary.woodwork;
          push({ minute: minuteLabel, stoppage: isStoppage, type: "chance", text: fmt(pick(pool), { player: player.name, team: team.name }), hg, ag });
        } else if (roll < pHomeGoal + pAwayGoal + 0.06) {
          const homeChance = Math.random() < 0.5;
          const team = homeChance ? home : away;
          const list = homeChance ? hStarters : aStarters;
          const player = pick(list);
          const isRed = Math.random() < 0.05;
          if (isRed && player) reds.push({ side: homeChance ? "home" : "away", playerId: player.id, name: player.name });
          push({ minute: minuteLabel, stoppage: isStoppage, type: isRed ? "red" : "yellow", side: homeChance ? "home" : "away", playerId: player && player.id, text: fmt(pick(isRed ? Commentary.red : Commentary.yellow), { player: player.name, team: team.name }), hg, ag });
        } else if (m === 60 + (m > 45 ? stoppage1 : 0) && hSubsUsed < 1 && home.lineup) {
          const bench = home.lineup.bench.map(id => home.squad.find(p => p.id === id)).filter(Boolean);
          const off = pick(hStarters);
          const on = pick(bench.length ? bench : hStarters);
          hSubsUsed++;
          push({ minute: minuteLabel, stoppage: isStoppage, type: "sub", text: fmt(pick(Commentary.sub), { team: home.name, playerOff: off.name, playerOn: on.name }), hg, ag });
        } else if (m === 67 + (m > 45 ? stoppage1 : 0) && aSubsUsed < 1 && away.lineup) {
          const bench = away.lineup.bench.map(id => away.squad.find(p => p.id === id)).filter(Boolean);
          const off = pick(aStarters);
          const on = pick(bench.length ? bench : aStarters);
          aSubsUsed++;
          push({ minute: minuteLabel, stoppage: isStoppage, type: "sub", text: fmt(pick(Commentary.sub), { team: away.name, playerOff: off.name, playerOn: on.name }), hg, ag });
        }
      }
  
      push({ minute: 90, stoppage: stoppage2 > 0, type: "full", text: fmt(pick(Commentary.full), {}), hg, ag });
  
      return { timeline, hg, ag, hStarters, aStarters, homeScorers, awayScorers, reds };
    },

    // A LIVE, steppable match the manager can intervene in (make subs). The user's
    // side is driven minute-by-minute so substitutions genuinely change what happens
    // next; the AI side auto-subs on the hour. Tracks per-player minutes for the
    // user's club so fitness drain can be proportional to time on the pitch.
    liveMatch(home, away, userClubId) {
      const eng = this;
      const H = this.sideRatings(home), A = this.sideRatings(away);
      const hStart = (H.starters || this.tempStarters(home)).slice();
      const aStart = (A.starters || this.tempStarters(away)).slice();
      const userSide = home.id === userClubId ? "home" : away.id === userClubId ? "away" : null;
      const formFactor = this.form();
      const st = {
        home, away, userSide,
        hOn: hStart.slice(), aOn: aStart.slice(), hStart, aStart,
        minute: 0, hg: 0, ag: 0, momentum: 50, done: false,
        homeScorers: [], awayScorers: [], homeAssists: [], awayAssists: [], reds: [],
        hSubsUsed: 0, aSubsUsed: 0, userSubsUsed: 0, USER_SUB_MAX: 5,
        stoppage1: 1 + Math.floor(Math.random() * 4),
        stoppage2: 1 + Math.floor(Math.random() * 6),
        minutes: {}, seq: 0,
      };
      st.totalMinutes = 45 + st.stoppage1 + 45 + st.stoppage2;
      // Which detailed position each starter is playing — drives out-of-position
      // penalties in the rating functions. A sub inherits the slot they come into.
      st.slotOf = (typeof Positions !== "undefined") ? { ...Positions.slotMap(home), ...Positions.slotMap(away) } : {};
      st.pr = {}; // live per-player match rating (managed side), 0.1–10
      (userSide === "home" ? hStart : userSide === "away" ? aStart : []).forEach(p => { st.minutes[p.id] = 0; st.pr[p.id] = 6.5; });
      const bumpR = (id, d) => { if (st.pr[id] != null) st.pr[id] = clamp(st.pr[id] + d, 0.1, 10); };

      const attackers = list => { const l = list.filter(p => p.pos === "FW" || p.pos === "MF"); return l.length ? l : list; };
      const rnd = arr => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
      // Scorer pick that leans toward Shoot-on-Sight players on the given side.
      const scorerW = (list, side) => {
        const ii = side === "home" ? st.instrH : st.instrA;
        if (!ii || !ii.shootIds.size) return eng.weightedScorer(list);
        const weights = list.map(p => p.rating * (p.pos === "FW" ? 1.9 : 1) * (1 + ((p.bonus && p.bonus.goal) || 0)) * (ii.shootIds.has(p.id) ? 1.7 : 1));
        const tot = weights.reduce((s, w) => s + w, 0); let r = Math.random() * tot;
        for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
        return list[list.length - 1];
      };
      // BOTH clubs play to their PHILOSOPHY now — the managed side to the one the
      // manager set, the opponent to its stable identity (the one shown in the
      // pre-match brief). `sideMods` folds mentality/width/line into a side's
      // attack/defence ratings; its own pressing/tempo (`cf`, openness) plus the
      // OPPONENT's line/press (`ca`, how much they leave at the back) set each
      // side's goal chances; the philosophy signatures (counter break, tiki-taka
      // quality, etc.) layer on top. So a "Highly Defensive" opponent really is
      // hard to break down, a "High Pressure" one really does trade chances.
      const T = typeof Tactics !== "undefined" ? Tactics : null;
      function recalc() {
        st.hAtt = eng.attackRating(st.hOn, st.slotOf) * 1.04; st.hDef = eng.defenseRating(st.hOn, st.slotOf);
        st.aAtt = eng.attackRating(st.aOn, st.slotOf); st.aDef = eng.defenseRating(st.aOn, st.slotOf);
        let hMods = null, aMods = null;
        if (T) {
          if (userSide === "home") T.ensure(st.home); else if (userSide === "away") T.ensure(st.away);
          const rawHAtt = st.hAtt, rawAAtt = st.aAtt;
          hMods = T.sideMods(st.home, clamp((rawAAtt - 60) / 30, 0, 1));
          aMods = T.sideMods(st.away, clamp((rawHAtt - 60) / 30, 0, 1));
          st.hAtt *= hMods.att; st.hDef *= hMods.def;
          st.aAtt *= aMods.att; st.aDef *= aMods.def;
        }
        st._uMods = userSide === "home" ? hMods : userSide === "away" ? aMods : null;
        // Individual player instructions (Get Forward, Keep It Simple, Press Hard…)
        // aggregate per side and layer on top of the team philosophy.
        const R = typeof PlayerRoles !== "undefined" ? PlayerRoles : null;
        const iH = st.instrH = R ? R.sideEffect(st.hOn, st.slotOf, st.home) : null;
        const iA = st.instrA = R ? R.sideEffect(st.aOn, st.slotOf, st.away) : null;
        if (iH) { st.hAtt *= 1 + iH.att; st.hDef *= 1 + iH.def; }
        if (iA) { st.aAtt *= 1 + iA.att; st.aDef *= 1 + iA.def; }
        // Possession-heavy styles pull the run of play (and the possession stat)
        // toward their side; counter/direct styles cede it. Net of both clubs,
        // plus each side's Keep-It-Simple / Play-Direct instructions.
        st._possBias = (hMods && aMods) ? (hMods.poss - aMods.poss) * 0.65 : 0;
        if (iH) st._possBias += iH.poss * 0.5; if (iA) st._possBias -= iA.poss * 0.5;
        let pHome = 0.0130 * eng.goalRatio(st.hAtt, st.aDef) * formFactor;
        let pAway = 0.0110 * eng.goalRatio(st.aAtt, st.hDef) * formFactor;
        if (hMods && aMods) {
          // Own openness (cf) × opponent's vulnerability (ca).
          pHome *= hMods.cf * aMods.ca;
          pAway *= aMods.cf * hMods.ca;
        }
        // Instructions: own openness (direct passing, runs in behind, pressing) and
        // the opponent leaving space behind (their press/direct risk).
        if (iH) { pHome *= 1 + iH.cf + iH.press; pAway *= 1 + iH.ca + iH.press * 0.5; }
        if (iA) { pAway *= 1 + iA.cf + iA.press; pHome *= 1 + iA.ca + iA.press * 0.5; }
        st.pHomeGoal = clamp(pHome, 0.004, 0.09);
        st.pAwayGoal = clamp(pAway, 0.004, 0.087);
      }
      st.stats = { home: { shots: 0, sot: 0, xg: 0, corners: 0, fouls: 0, poss: 0 }, away: { shots: 0, sot: 0, xg: 0, corners: 0, fouls: 0, poss: 0 } };
      recalc();
      const label = () => (st.minute <= 45 + st.stoppage1 ? Math.min(st.minute, 45) : Math.min(st.minute - st.stoppage1, 90));
      const mk = (min, type, text, extra) => ({ minute: min, type, text, side: null, hg: st.hg, ag: st.ag, mom: Math.round(st.momentum), seq: st.seq++, ...extra });

      return {
        state: st,
        subsLeft() { return st.USER_SUB_MAX - st.userSubsUsed; },
        onPitchUser() { return (st.userSide === "home" ? st.hOn : st.userSide === "away" ? st.aOn : []).slice(); },

        stepMinute() {
          if (st.done) return [];
          const events = [];
          st.minute++;
          const m = st.minute;
          (st.userSide === "home" ? st.hOn : st.userSide === "away" ? st.aOn : []).forEach(p => { if (st.minutes[p.id] != null) st.minutes[p.id]++; });

          if (m === 46 + st.stoppage1) events.push(mk(45, "half", fmt(pick(Commentary.half), { stadium: st.home.stadium })));

          const driftTarget = clamp(50 + (st.hAtt - st.aAtt + (st.aDef - st.hDef)) * 1.4 + (st._possBias || 0), 8, 92);
          st.momentum = clamp(st.momentum + (driftTarget - st.momentum) * 0.04 + (Math.random() - 0.5) * 6, 5, 95);
          const isStoppage = (m > 45 && m <= 45 + st.stoppage1) || (m > 45 + st.stoppage1 + 45);
          const lab = label();
          const roll = Math.random();
          // Instructions widen the event bands: Shoot-on-Sight → more shots/chances;
          // Hard Tackling → more fouls & cards.
          const hAggro = st.instrH ? st.instrH.foul : 0, aAggro = st.instrA ? st.instrA.foul : 0;
          const shootTot = (st.instrH ? st.instrH.shootIds.size : 0) + (st.instrA ? st.instrA.shootIds.size : 0);
          const goalTop = st.pHomeGoal + st.pAwayGoal;
          const chanceTop = goalTop + 0.05 + 0.004 * shootTot;
          const discTop = chanceTop + 0.01 + 0.0035 * (hAggro + aAggro);

          // Live match stats: possession follows momentum; the odd corner falls to
          // whoever's on top. Background half-chances/fouls (no commentary) pad the
          // stat line to a realistic ~10–14 shots and ~10 fouls a game — the big
          // commentated chances/goals below add on top.
          st.stats.home.poss += st.momentum / 100; st.stats.away.poss += (100 - st.momentum) / 100;
          if (Math.random() < 0.045) (Math.random() * 100 < st.momentum ? st.stats.home : st.stats.away).corners++;
          if (m <= 90 + st.stoppage1 + st.stoppage2) {
            if (Math.random() < 0.11 + 0.006 * shootTot) { const sd = (Math.random() * 100 < st.momentum) ? st.stats.home : st.stats.away; sd.shots++; if (Math.random() < 0.34) sd.sot++; sd.xg += 0.02 + Math.random() * 0.09; }
            if (Math.random() < 0.14 + 0.012 * (hAggro + aAggro)) { const pick2 = (hAggro + aAggro) > 0 ? (Math.random() * (hAggro + aAggro + 2) < hAggro + 1 ? st.stats.home : st.stats.away) : (Math.random() < 0.5 ? st.stats.home : st.stats.away); pick2.fouls++; }
          }

          if (roll < st.pHomeGoal) {
            st.hg++; const s = scorerW(attackers(st.hOn), "home"); st.homeScorers.push(s.id);
            const asH = Math.random() < 0.72 ? eng.weightedAssister(attackers(st.hOn), s) : null;
            if (asH) { st.homeAssists.push(asH.id); if (userSide === "home") bumpR(asH.id, 0.9); }
            st.stats.home.shots++; st.stats.home.sot++; st.stats.home.xg += 0.42 + Math.random() * 0.36;
            if (userSide === "home") { bumpR(s.id, 1.3); attackers(st.hOn).forEach(p => bumpR(p.id, 0.08)); }
            else if (userSide === "away") st.aOn.forEach(p => { if (p.pos === "GK") bumpR(p.id, -0.6); else if (p.pos === "DF") bumpR(p.id, -0.35); });
            events.push(mk(lab, "goal", fmt(pick(Commentary.goal), { player: s.name, team: st.home.name }), { side: "home", scorer: s.name, assist: asH && asH.name, stoppage: isStoppage }));
          } else if (roll < goalTop) {
            st.ag++; const s = scorerW(attackers(st.aOn), "away"); st.awayScorers.push(s.id);
            const asA = Math.random() < 0.72 ? eng.weightedAssister(attackers(st.aOn), s) : null;
            if (asA) { st.awayAssists.push(asA.id); if (userSide === "away") bumpR(asA.id, 0.9); }
            st.stats.away.shots++; st.stats.away.sot++; st.stats.away.xg += 0.42 + Math.random() * 0.36;
            if (userSide === "away") { bumpR(s.id, 1.3); attackers(st.aOn).forEach(p => bumpR(p.id, 0.08)); }
            else if (userSide === "home") st.hOn.forEach(p => { if (p.pos === "GK") bumpR(p.id, -0.6); else if (p.pos === "DF") bumpR(p.id, -0.35); });
            events.push(mk(lab, "goal", fmt(pick(Commentary.goal), { player: s.name, team: st.away.name }), { side: "away", scorer: s.name, assist: asA && asA.name, stoppage: isStoppage }));
          } else if (roll < chanceTop) {
            const homeChance = Math.random() * 100 < st.momentum;
            const team = homeChance ? st.home : st.away;
            const p = scorerW(attackers(homeChance ? st.hOn : st.aOn), homeChance ? "home" : "away");
            const flavor = Math.random();
            const pool = flavor < 0.45 ? Commentary.chanceMiss : flavor < 0.85 ? Commentary.shotSaved : Commentary.woodwork;
            const sd = homeChance ? st.stats.home : st.stats.away;
            sd.shots++; if (flavor >= 0.45 && flavor < 0.85) sd.sot++; // saved shots are on target
            sd.xg += flavor < 0.45 ? 0.07 + Math.random() * 0.12 : flavor < 0.85 ? 0.14 + Math.random() * 0.22 : 0.2 + Math.random() * 0.2;
            if (userSide) {
              const uOn = userSide === "home" ? st.hOn : st.aOn;
              if ((homeChance && userSide === "home") || (!homeChance && userSide === "away")) { const a = rnd(attackers(uOn)); if (a) bumpR(a.id, 0.12); }
              else { const d = rnd(uOn.filter(p => p.pos === "DF" || p.pos === "GK")); if (d) bumpR(d.id, -0.05); }
            }
            events.push(mk(lab, "chance", fmt(pick(pool), { player: p.name, team: team.name }), { side: homeChance ? "home" : "away", stoppage: isStoppage }));
          } else if (roll < discTop) {
            const homeChance = Math.random() < 0.5;
            const team = homeChance ? st.home : st.away;
            const onArr = homeChance ? st.hOn : st.aOn;
            const ii = homeChance ? st.instrH : st.instrA;
            // Hard Tacklers are the likely culprits, and likelier to see red.
            const aggList = ii ? onArr.filter(x => ii.aggroIds.has(x.id)) : [];
            const p = (aggList.length && Math.random() < 0.72) ? pick(aggList) : pick(onArr);
            const hasAgg = !!(ii && p && ii.aggroIds.has(p.id));
            const isRed = Math.random() < (0.05 + (hasAgg ? 0.06 : 0));
            (homeChance ? st.stats.home : st.stats.away).fouls++;
            if (isRed && p) st.reds.push({ side: homeChance ? "home" : "away", playerId: p.id, name: p.name });
            // A booking dents the player's live match rating (so the ratings panel
            // shows the cost of over-aggression).
            if (p && ((homeChance && userSide === "home") || (!homeChance && userSide === "away"))) bumpR(p.id, isRed ? -2.4 : -0.7);
            events.push(mk(lab, isRed ? "red" : "yellow", fmt(pick(isRed ? Commentary.red : Commentary.yellow), { player: p.name, team: team.name }), { side: homeChance ? "home" : "away", playerId: p && p.id, stoppage: isStoppage }));
          } else {
            // AI auto-subs on the hour, but only for a side the user isn't managing.
            const aiSub = (club, onArr, used, at) => {
              if (m !== at || used() >= 1 || !club.lineup) return null;
              const bench = club.lineup.bench.map(id => club.squad.find(pp => pp.id === id)).filter(Boolean);
              if (!bench.length) return null;
              const off = pick(onArr); const on = pick(bench);
              const i = onArr.indexOf(off); if (i >= 0) onArr[i] = on;
              if (st.slotOf && st.slotOf[off.id] != null) st.slotOf[on.id] = st.slotOf[off.id];
              return mk(lab, "sub", fmt(pick(Commentary.sub), { team: club.name, playerOff: off.name, playerOn: on.name }), { stoppage: isStoppage });
            };
            if (st.userSide !== "home") { const e = aiSub(st.home, st.hOn, () => st.hSubsUsed, 60 + (m > 45 ? st.stoppage1 : 0)); if (e) { st.hSubsUsed++; recalc(); events.push(e); } }
            if (st.userSide !== "away") { const e = aiSub(st.away, st.aOn, () => st.aSubsUsed, 67 + (m > 45 ? st.stoppage1 : 0)); if (e) { st.aSubsUsed++; recalc(); events.push(e); } }
          }

          // Ratings drift gently toward a baseline set by the scoreline (a team
          // that's winning is generally playing well).
          if (st.userSide) {
            const gd = (st.userSide === "home" ? st.hg - st.ag : st.ag - st.hg);
            const baseline = clamp(6.4 + gd * 0.16, 5.6, 7.4);
            for (const id in st.pr) st.pr[id] = clamp(st.pr[id] + (baseline - st.pr[id]) * 0.02, 0.1, 10);
          }

          if (m >= st.totalMinutes) { st.done = true; events.push(mk(90, "full", fmt(pick(Commentary.full), {}), { stoppage: st.stoppage2 > 0 })); }
          return events;
        },

        // Bring a bench player on for a starter (user's side only). Returns the
        // commentary event, or null if it can't be done.
        substitute(offId, onId) {
          if (st.done || !st.userSide || st.userSubsUsed >= st.USER_SUB_MAX) return null;
          const onArr = st.userSide === "home" ? st.hOn : st.aOn;
          const club = st.userSide === "home" ? st.home : st.away;
          const offP = onArr.find(p => p.id === offId);
          const onP = (club.squad || []).find(p => p.id === onId);
          if (!offP || !onP || onArr.some(p => p.id === onId)) return null;
          onArr[onArr.indexOf(offP)] = onP;
          st.userSubsUsed++;
          if (st.slotOf && st.slotOf[offId] != null) st.slotOf[onId] = st.slotOf[offId]; // take the same position
          if (st.minutes[onId] == null) st.minutes[onId] = 0; // starts accruing from now
          if (st.pr[onId] == null) st.pr[onId] = 6.4; // fresh legs start neutral
          recalc();
          return mk(label(), "sub", fmt(pick(Commentary.sub), { team: club.name, playerOff: offP.name, playerOn: onP.name }), { stoppage: (st.minute > 45 && st.minute <= 45 + st.stoppage1) || (st.minute > 45 + st.stoppage1 + 45) });
        },

        // Change the managed club's tactics mid-match (recomputes the balance).
        // Accepts a philosophy (applies its whole preset) and/or individual dials.
        setTactics(opts) {
          if (!st.userSide || !opts) return;
          const club = st.userSide === "home" ? st.home : st.away;
          if (!club.tactics) club.tactics = {};
          if (opts.philosophy && T) T.applyPhilosophy(club, opts.philosophy);
          ["mentality", "pressing", "tempo", "width", "line"].forEach(d => { if (opts[d]) club.tactics[d] = opts[d]; });
          recalc();
        },
        tactics() { const club = st.userSide === "home" ? st.home : st.userSide === "away" ? st.away : null; return club ? club.tactics : null; },

        // Match statistics from the live sim (possession normalised to 100).
        stats() {
          const h = st.stats.home, a = st.stats.away;
          const tp = h.poss + a.poss || 1;
          const hp = Math.round(h.poss / tp * 100);
          return {
            home: { poss: hp, shots: h.shots, sot: h.sot, xg: Math.round(h.xg * 10) / 10, corners: h.corners, fouls: h.fouls },
            away: { poss: 100 - hp, shots: a.shots, sot: a.sot, xg: Math.round(a.xg * 10) / 10, corners: a.corners, fouls: a.fouls },
          };
        },

        // Current live per-player ratings (managed side) for the pitch dot colours.
        ratingsLive() { return { ...st.pr }; },

        // Final player ratings (0.1–10) for the managed club's players who
        // featured — the live tally plus a clean-sheet bonus and red-card penalty.
        ratings() {
          if (!st.userSide) return [];
          const side = st.userSide;
          const club = side === "home" ? st.home : st.away;
          const started = side === "home" ? st.hStart : st.aStart;
          const onNow = side === "home" ? st.hOn : st.aOn;
          const scorers = side === "home" ? st.homeScorers : st.awayScorers;
          const ga = side === "home" ? st.ag : st.hg;
          const reds = st.reds.filter(r => r.side === side).map(r => r.playerId);
          const out = [];
          Object.keys(st.minutes).forEach(id => {
            const mins = st.minutes[id];
            if (!mins) return;
            const p = (club.squad || []).find(x => x.id === id) || started.find(x => x.id === id) || onNow.find(x => x.id === id);
            if (!p) return;
            let r = st.pr[id] != null ? st.pr[id] : 6.4;
            if ((p.pos === "GK" || p.pos === "DF") && ga === 0) r += 0.6; // clean sheet
            if (reds.includes(id)) r -= 1.4;
            out.push({ id, name: p.name, pos: p.pos, mins, goals: scorers.filter(s => s === id).length, rating: clamp(Math.round(r * 10) / 10, 0.1, 10) });
          });
          out.sort((a, b) => b.rating - a.rating);
          if (out.length) out[0].potm = true;
          return out;
        },

        result() {
          return { hg: st.hg, ag: st.ag, hStarters: st.hStart, aStarters: st.aStart, homeScorers: st.homeScorers, awayScorers: st.awayScorers, homeAssists: st.homeAssists, awayAssists: st.awayAssists, reds: st.reds, timeline: [], stats: this.stats() };
        },
        minutesMap() { return st.minutes; },
      };
    },
  };
  
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function poisson(lambda) {
    // Knuth's algorithm — fine at these small lambdas.
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  }