/* =========================================================================
   PLFC TOUCHLINE MANAGER — STATE
   Career state, save/load, and squad-depth helpers.
   ========================================================================= */

   const SAVE_KEY = "plfc_manager_save_v1";

   const Econ = {
     leagueFactor(league) { return LEAGUE_ECON[league] || 1; },
     // Starting transfer kitty by club reputation tier, scaled down hard for
     // the lower divisions.
     startBudget(tier, league = "PL") {
       const base = { 5: 80, 4: 45, 3: 25, 2: 12, 1: 5, 0: 2.5 }[tier] ?? 10;
       return Math.max(0.5, Math.round(base * this.leagueFactor(league) * 10) / 10);
     },
     // Per-matchweek broadcast/prize income trickle.
     weeklyIncome(tier, league = "PL") {
       const base = { 5: 2.2, 4: 1.4, 3: 1.0, 2: 0.6, 1: 0.4, 0: 0.25 }[tier] ?? 0.8;
       return Math.max(0.1, Math.round(base * this.leagueFactor(league) * 10) / 10);
     },
     // End-of-season prize money by final position, scaled by division.
     endOfSeasonPrize(position, league = "PL") {
       const prize = Math.max(4, Math.round((35 - position * 1.1) * 10) / 10);
       return Math.max(0.5, Math.round(prize * this.leagueFactor(league) * 10) / 10);
     },
   };
   
   function ensureSquadDepth(club) {
     if (club.strengthOnly) return; // foreign clubs are simulated from a strength rating, no squad
     const realCount = club.squad.length; // real players present before we top up depth
     const need = { GK: 2, DF: 7, MF: 6, FW: 4 };
     const have = { GK: 0, DF: 0, MF: 0, FW: 0 };
     club.squad.forEach(p => have[p.pos]++);
     // Gradient by reputation tier: elite generated sides (a tier-5 La Liga
     // club) are genuinely strong, lower tiers step down toward the fourth tier.
     const baseRating = Math.max(46, 52 + club.tier * 6);
     const country = LEAGUE_COUNTRY[club.league];
     // A club that shipped with a real roster only needs backup/depth fill-ins —
     // they must sit BELOW the real players so a generated name never becomes the
     // club's best player (real stars stay on top).
     const hasReal = realCount >= 1;
     const minReal = hasReal ? Math.min(...club.squad.map(p => p.rating)) : 99;
     for (const pos of POSITIONS) {
       while (have[pos] < need[pos]) {
         // Skew young: most fill-ins are academy-aged depth, with a handful of
         // older journeymen for squad balance.
         const age = Math.random() < 0.65 ? 17 + Math.floor(Math.random() * 6) : 24 + Math.floor(Math.random() * 10);
         let rating = baseRating - 6 + Math.floor(Math.random() * 10) - (age < 21 ? 4 : 0);
         if (hasReal) rating = Math.min(rating, minReal - 1); // depth never outranks the real squad
         const { name, nat } = homeProspect(country); // squads skew to the club's own nation
         const p = P(name, pos, age, rating, { nat });
         p.club = club.id;
         club.squad.push(p);
         have[pos]++;
       }
     }
     // Elite clubs get a couple of standout players so the top flight of every
     // nation feels genuinely strong — but only GENERATED squads; a club that
     // shipped with a real roster keeps its authored ratings.
     if (club.tier >= 4 && realCount === 0) {
       const targets = club.tier >= 5 ? [88, 86, 84] : [84, 82];
       club.squad.slice().sort((a, b) => b.rating - a.rating).slice(0, targets.length).forEach((p, i) => {
         if (p.rating < targets[i]) {
           p.rating = targets[i];
           if (p.potential < p.rating) p.potential = p.rating;
         }
       });
     }
   }
   
   // How many foreign clubs per top-flight KEEP real, persistent squads — the
   // likely European qualifiers of each nation. Scaled by association strength so
   // the powerhouses field real players in Europe: the top-5 leagues keep 7 each,
   // the mid nations 4, the minnows 2. (The rest of the world stays strength-only.)
   function euroKeepCountForCountry(country) {
     const rank = (typeof Euro !== "undefined" && Euro.ASSOC_RANK) ? (Euro.ASSOC_RANK.indexOf(country) + 1) : 0;
     if (rank >= 1 && rank <= 5) return 7;
     if (rank >= 6 && rank <= 20) return 4;
     return 2;
   }
   // A club's real-squad strength (mean of its best XI), or 0 if it has no roster.
   function realSquadStrength(c) {
     const sq = c.squad || [];
     if (sq.length < 5) return sq.length ? sq.reduce((s, p) => s + p.rating, 0) / sq.length - 20 : 0;
     const top = sq.map(p => p.rating).sort((a, b) => b - a).slice(0, 11);
     return top.reduce((s, r) => s + r, 0) / top.length;
   }
   // The set of foreign club ids that keep real squads (for European awards).
   function euroKeeperSet(managedCountry) {
     const keep = new Set();
     const topFlights = new Set();
     if (typeof LEAGUE_CHAINS !== "undefined") Object.values(LEAGUE_CHAINS).forEach(ch => { if (ch && ch.length) topFlights.add(ch[0]); });
     const byLeague = {};
     CLUBS.forEach(c => {
       if (!topFlights.has(c.league)) return;                          // top division only (Europe entrants)
       if (LEAGUE_COUNTRY[c.league] === managedCountry) return;        // your own country keeps everything anyway
       if (!c.squad || !c.squad.length) return;                        // must ship with some real players
       (byLeague[c.league] = byLeague[c.league] || []).push(c);
     });
     Object.keys(byLeague).forEach(lg => {
       const n = euroKeepCountForCountry(LEAGUE_COUNTRY[lg]);
       byLeague[lg]
         .map(c => ({ c, s: realSquadStrength(c) }))
         .sort((a, b) => b.s - a.s || (b.c.squad.length - a.c.squad.length))
         .slice(0, n)
         .forEach(x => keep.add(x.c.id));
     });
     return keep;
   }

   function freshClubsCopy(managedCountry) {
     // Deep-ish copy so a new career never mutates the shared template data.
     // Your own country gets real squads; so do the designated European qualifiers
     // of every other nation (euroKeeperSet). Everyone else is strength-only (a
     // single rating, no stored players) to keep the whole continent inside the
     // browser save budget.
     const keepers = managedCountry ? euroKeeperSet(managedCountry) : new Set();
     const copy = CLUBS.map(c => {
       const foreign = managedCountry && LEAGUE_COUNTRY[c.league] !== managedCountry;
       if (foreign && !keepers.has(c.id)) {
         return { ...c, squad: [], strengthOnly: true, strength: baseStrengthForTier(c.tier) };
       }
       return {
         ...c,
         euroKeeper: foreign || undefined, // a foreign club with a real squad, for Europe
         // Clone stats/bonus/career too — a shallow {...p} would otherwise share
         // those objects with the shared CLUBS template and leak across careers.
         squad: c.squad.map(p => ({ ...p, stats: Stats.blank(), bonus: Stats.blankBonus(), career: { ...p.career } })),
       };
     });
     copy.forEach(ensureSquadDepth); // fills real squads to depth; no-op for strength-only
     return copy;
   }
   
   function newCareerState(managerName, clubId) {
     const seed = CLUBS.find(c => c.id === clubId);
     const managedCountry = seed ? LEAGUE_COUNTRY[seed.league] : COUNTRIES[0];
     const clubs = freshClubsCopy(managedCountry);
     clubs.forEach(c => {
       c.budget = Econ.startBudget(c.tier, c.league);
       c.points = 0; c.played = 0; c.won = 0; c.drawn = 0; c.lost = 0;
       c.gf = 0; c.ga = 0;
       c.formation = "4-4-2";
       c.lineup = null; // filled by auto-pick on first use
       if (!c.strengthOnly) Coaching.initClubCoaches(c); // tier-appropriate starting staff
     });

     return {
       managerName,
       clubId,
       season: 2026,
       week: 0,
       clubs,                 // every club across both leagues, tagged c.league
       fixtures: { PL: [], CH: [] }, // generated per league by Season.buildFixtures
       results: [],           // completed match results this season
       market: [],            // current transfer market listings (shared by both leagues)
       freeAgents: [],        // always-open pool of clubless players (Market.seedFreeAgents)
       objective: null,       // the board's season target (Board.setObjective)
       negotiations: {},      // per-player contract-negotiation attempts/locks (Contracts)
       pendingSignings: [],   // pre-agreed deals waiting for the window to open (Market)
       watchlist: [],         // saved scout targets to sign later (Scouting)
       history: [],           // past season summaries {season, league, position, ...}
       titles: 0,             // Premier League titles won
       honours: [],           // trophy cabinet: [{type, season}]
       coachMarket: [],       // hireable coaches, refreshed each matchweek
       pendingShield: null,   // Community Shield participants for the coming season
       pendingSupercopa: null, // Supercopa de España final-four for the coming season
       pendingSuperCup: null,  // generic super cup (champion v national cup winner) for the coming season
       euro: null,            // this season's European competitions (set by Euro.initSeason)
       pendingEuro: null,     // next season's European qualification (by league finish)
       pendingMatch: null,    // result payload waiting to be viewed live
       windowWasOpen: false,
       splitDone: {},         // which split leagues have had their split applied this season
     };
   }
   
   const Aging = {
     retirementChance(age, pos) {
       const effAge = pos === "GK" ? age - 2 : age; // keepers play on longer
       if (effAge < 34) return 0;
       if (effAge >= 40) return 1;
       return clamp01((effAge - 33) * 0.14);
     },
   
     growthStep(age) {
       if (age <= 20) return 2 + Math.round(Math.random() * 4); // +2..6
       if (age <= 23) return 1 + Math.round(Math.random() * 3); // +1..4
       if (age <= 26) return Math.round(Math.random() * 2);     // +0..2
       if (age <= 29) return Math.random() < 0.5 ? 1 : 0;
       return 0;
     },
     declineStep(age) {
       if (age < 30) return 0;
       if (age < 33) return Math.random() < 0.4 ? 1 : 0;
       if (age < 36) return 1 + Math.round(Math.random() * 2);  // +1..3
       return 2 + Math.round(Math.random() * 3);                // +2..5
     },
   
     // Ages every player across the league by one year, grows or declines
     // ratings, retires the oldest, and tops squads back up. Returns a news
     // digest for the season-end screen.
     advanceSeason(state) {
       const news = { retirements: [], breakouts: [], willRetire: [], totalRetired: 0 };
       const mine = state.clubId;

       // Judge everyone's season BEFORE ratings move, then let it reshape both
       // potential and rating — relative to the player's own level, judged
       // within their own division, for every club in both leagues.
       const perfIndex = Stats.performanceIndex(state);

       state.clubs.forEach(club => {
         if (club.strengthOnly) return; // foreign clubs evolve via Dynamics (strength drift), not player ageing
         const survivors = [];
         club.squad.forEach(p => {
           p.age += 1;

           // A player who announced last season now hangs up his boots — never
           // mid-season, always at the end of his farewell campaign.
           if (p.retiringEndOfSeason) {
             news.totalRetired++;
             if (club.id === mine) {
               news.retirements.push({ name: p.name, age: p.age, pos: p.pos });
               if (typeof News !== "undefined") News.push(state, "player", `👏 ${p.name} has retired from football, aged ${p.age}.`);
             }
             return; // not pushed to survivors
           }

           const before = p.rating;
           const perf = perfIndex[p.id] || 0;             // ~[-1.5 … 2], vs expectation
           const over = perf > 0.5 ? perf - 0.5 : 0;
           const coachMult = Coaching.growthMultiplier(club, p.pos);
           const moraleMult = (club.id === mine && typeof Morale !== "undefined") ? Morale.devMult(p) : 1;

           // Potential drifts with performance (a big overachievement can raise the ceiling).
           let potDelta = clamp(Math.round(perf * 2 + over * 9), -4, 9);
           if (p.age < 24 && coachMult > 1 && Math.random() < coachMult - 1) potDelta += 1;
           p.potential = clamp(p.potential + potDelta, 40, 99);

           // Rating change is PERFORMANCE-DRIVEN with an age trend on top: youth
           // surges, prime fluctuates on form, veterans decline UNLESS they had a
           // good season — a strong campaign lets a 37-year-old hold his level
           // (a great one can even nudge him up), a poor one accelerates the drop.
           const perfComp = clamp(perf * 6, -7, 7);
           let delta;
           if (p.age < 24) {
             const room = p.rating < p.potential ? this.growthStep(p.age) * coachMult * moraleMult : 0;
             delta = room + perfComp * 0.5;
             delta = Math.max(delta, -1.5); // young talent rarely collapses
           } else if (p.age < 30) {
             const room = p.rating < p.potential ? this.growthStep(p.age) * coachMult * moraleMult * 0.7 : 0;
             delta = room + perfComp;
           } else {
             const ageDecline = this.declineStep(p.age) * clamp(1.25 - coachMult * 0.25, 0.6, 1.25);
             delta = -ageDecline + perfComp; // good season offsets the years
           }
           delta += (Math.random() - 0.5) * 1.3; // churn so nearly everyone moves a touch
           p.rating = clamp(Math.round(p.rating + delta), 40, 99);
           if (p.rating > p.potential) p.potential = p.rating; // a storming season lifts the ceiling

           if (club.id === mine) {
             p.ratingHistory = p.ratingHistory || [];
             p.ratingHistory.push({ season: state.season, ovr: p.rating });
             if (p.ratingHistory.length > 14) p.ratingHistory.shift();
             if (p.rating - before >= 4) news.breakouts.push({ name: p.name, age: p.age, from: before, to: p.rating });
           }

           // Apply to retire: an ageing player announces he'll go at the end of
           // the COMING season, then plays it out (never a surprise mid-contract
           // exit). Certain by the time his effective age passes 38.
           if (p.age >= 41 || Math.random() < this.retirementChance(p.age, p.pos)) {
             p.retiringEndOfSeason = true;
             if (club.id === mine) {
               news.willRetire.push({ name: p.name, age: p.age, pos: p.pos });
               if (typeof News !== "undefined") News.push(state, "player", `📣 ${p.name} (${p.age}) has announced he'll retire at the end of next season.`, { playerId: p.id });
             }
           }
           survivors.push(p);
         });
         club.squad = survivors;
         ensureSquadDepth(club);
         // Ratings/values/wages drift, so keep them consistent with the new numbers.
         club.squad.forEach(p => {
           p.value = parValue(p.rating, p.age);
           p.wage = parWage(p.rating, p.age); // top-flight par; league scaling lives in Contracts.effWage
         });
         club.lineup = null; // force a fresh auto-pick against the new squad
       });
   
       return news;
     },
   };
   
   function clamp01(v) { return Math.max(0, Math.min(1, v)); }

   // Saves made before potentials existed have players with no `potential`
   // field, which renders as "undefined"/"NaN-NaN". Give each a sensible
   // ceiling from their rating and age (older players cap at their rating).
   function ensurePotentials(state) {
     state.clubs.forEach(club => club.squad.forEach(p => {
       if (p.potential == null || isNaN(p.potential)) {
         p.potential = Math.max(p.rating, Math.min(96, p.rating + growthRoom(p.age)));
       }
       if (p.wonderkid == null) p.wonderkid = false;
     }));
   }
   
   const Game = {
     state: null,
   
     save() {
       try {
         localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
         return true;
       } catch (e) {
         console.error("Save failed", e);
         return false;
       }
     },
     load() {
       try {
         const raw = localStorage.getItem(SAVE_KEY);
         if (!raw) return false;
         this.state = JSON.parse(raw);
         migrateSave(this.state);       // upgrade single-league saves to two leagues
         Stats.ensureAll(this.state);   // backfill stats/bonus on saves predating them
         ensurePotentials(this.state);  // backfill potential on saves predating it
         return true;
       } catch (e) {
         console.error("Load failed", e);
         return false;
       }
     },
     hasSave() {
       try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
     },
     clearSave() {
       try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
     },
     start(managerName, clubId) {
       this.state = newCareerState(managerName, clubId);
       Season.buildFixtures(this.state);
       Cup.initCareer(this.state);
       Vertu.initSeason(this.state);
       Euro.initSeason(this.state);
       Market.weeklyUpdate(this.state);
       Market.seedFreeAgents(this.state);
       Coaching.weeklyMarket(this.state);
       Academy.ensure(this.state);
       Scouting.ensure(this.state);
       Fitness.ensure(this.state);
       Contracts.ensure(this.state);
       Morale.ensure(this.state);
       Tactics.ensure(this.myClub());
       Board.setObjective(this.state);
       Career.ensure(this.state);
       News.ensure(this.state);
       News.push(this.state, "manager", `${managerName} takes charge of ${this.myClub().name}.`);
       this.save();
     },
     myClub() {
       return this.state.clubs.find(c => c.id === this.state.clubId);
     },
     myLeague() {
       const c = this.myClub();
       return c ? c.league : "PL";
     },
     myCountry() {
       return LEAGUE_COUNTRY[this.myLeague()] || "ENG";
     },
   };

   // Brings any older save up to the current world: four divisions at their
   // full sizes (PL 20, CH/L1/L2 24 each), the FA Cup + Carabao Cup, and career
   // stats. Missing clubs are injected fresh; newly-added clubs play out the
   // rest of the current season alongside the existing ones.
   function migrateSave(state) {
     const LEAGUE_TEMPLATES = {
       CH: RAW_CHAMPIONSHIP, L1: RAW_LEAGUEONE, L2: RAW_LEAGUETWO, LL: RAW_LALIGA, SG: RAW_SEGUNDA,
       BL1: RAW_DE_BL1, BL2: RAW_DE_BL2, SA: RAW_IT_SA, SB: RAW_IT_SB, PP: RAW_PT_PP, P2: RAW_PT_P2,
       ER: RAW_NL_ER, EE: RAW_NL_EE, EK: RAW_PL_EK, IL: RAW_PL_IL, SL: RAW_TR_SL, T1: RAW_TR_T1,
       BPL: RAW_BE_BPL, BCH: RAW_BE_BCH, ABL: RAW_AT_ABL, A2L: RAW_AT_A2L,
       DSL: RAW_DK_DSL, D1D: RAW_DK_D1D, GSL: RAW_GR_GSL, GS2: RAW_GR_GS2,
       SPL: RAW_SC_SPL, SC2: RAW_SC_SC2, SSL: RAW_CH_SSL, SCL: RAW_CH_SCL,
       HNL: RAW_HR_HNL, HN2: RAW_HR_HN2, NB1: RAW_HU_NB1, NB2: RAW_HU_NB2,
       FL1: RAW_FR_FL1, FL2: RAW_FR_FL2, FN1: RAW_FR_FN1, FN2: RAW_FR_FN2,
       PRF: RAW_ES_PRF, SGF: RAW_ES_SGF, BL3: RAW_DE_BL3, BL4: RAW_DE_BL4,
       SEC: RAW_IT_SEC, SED: RAW_IT_SED,
       CZ1: RAW_CZ_CZ1, CZ2: RAW_CZ_CZ2, SR1: RAW_SR_SR1, SR2: RAW_SR_SR2,
       UA1: RAW_UA_UA1, UA2: RAW_UA_UA2, SE1: RAW_SE_SE1, SE2: RAW_SE_SE2,
       NO1: RAW_NO_NO1, NO2: RAW_NO_NO2, RO1: RAW_RO_RO1, RO2: RAW_RO_RO2,
       CY1: RAW_CY_CY1, CY2: RAW_CY_CY2, SK1: RAW_SK_SK1, SK2: RAW_SK_SK2,
       SN1: RAW_SVN1, SN2: RAW_SVN2, IS1: RAW_ISR1, IS2: RAW_ISR2, FI1: RAW_FIN1, FI2: RAW_FIN2,
       BG1: RAW_BUL1, BG2: RAW_BUL2, BA1: RAW_BIH1, BA2: RAW_BIH2, IC1: RAW_ISL1, IC2: RAW_ISL2,
       IE1: RAW_IRL1, IE2: RAW_IRL2, AL1: RAW_ALB1, AL2: RAW_ALB2, MK1: RAW_MKD1, MK2: RAW_MKD2,
       MD1: RAW_MDA1, MD2: RAW_MDA2, BY1: RAW_BLR1, BY2: RAW_BLR2, AZ1: RAW_AZE1, AZ2: RAW_AZE2,
       KZ1: RAW_KAZ1, KZ2: RAW_KAZ2, GE1: RAW_GEO1, GE2: RAW_GEO2, AM1: RAW_ARM1, AM2: RAW_ARM2,
       LV1: RAW_LVA1, LV2: RAW_LVA2, LT1: RAW_LTU1, LT2: RAW_LTU2, XK1: RAW_KVX1, XK2: RAW_KVX2,
       ME1: RAW_MNE1, ME2: RAW_MNE2, ET1: RAW_EST1, ET2: RAW_EST2, LU1: RAW_LUX1, LU2: RAW_LUX2,
       NI1: RAW_NIR1, NI2: RAW_NIR2, MT1: RAW_MLT1, MT2: RAW_MLT2, FO1: RAW_FRO1, FO2: RAW_FRO2,
       WA1: RAW_WAL1, WA2: RAW_WAL2, GI1: RAW_GIB1, GI2: RAW_GIB2, AD1: RAW_AND1, AD2: RAW_AND2,
       SM1: RAW_SMR1,
     };
     state.clubs.forEach(c => { if (!c.league) c.league = "PL"; });

     // Lightweight rest-of-world: only the managed country keeps real squads.
     // Convert every club outside it to strength-only (older saves stored full
     // squads for both countries) — preserving its current XI strength, then
     // dropping the stored players/coaches to keep the save small.
     const seed = state.clubs.find(c => c.id === state.clubId);
     const managedCountry = seed ? LEAGUE_COUNTRY[seed.league] : COUNTRIES[0];
     const keepers = euroKeeperSet(managedCountry);
     state.clubs.forEach(c => {
       if (LEAGUE_COUNTRY[c.league] === managedCountry) return; // your own country keeps everything
       if (keepers.has(c.id)) {
         // A designated European qualifier keeps its real squad. If an older save
         // stripped it to strength-only, re-inject the roster from the template so
         // the feature lights up on load (it ages from the current date forward).
         if (c.strengthOnly || !c.squad || !c.squad.length) {
           const tmpl = CLUBS.find(t => t.id === c.id);
           if (tmpl && tmpl.squad && tmpl.squad.length) {
             c.squad = tmpl.squad.map(p => ({ ...p, stats: Stats.blank(), bonus: Stats.blankBonus(), career: { ...p.career }, club: c.id }));
             c.strengthOnly = false; delete c.strength; c.lineup = null;
             ensureSquadDepth(c);
           }
         }
         c.euroKeeper = true;
         return;
       }
       if (c.strengthOnly) return;
       c.strength = Math.round(Stats.clubStrength(c));
       c.strengthOnly = true;
       c.squad = [];
       delete c.coaches; delete c.academy; c.lineup = null;
     });

     let injected = false;
     const existing = new Set(state.clubs.map(c => c.id));
     Object.entries(LEAGUE_TEMPLATES).forEach(([lg, templates]) => {
       templates.forEach(template => {
         if (existing.has(template.id)) return; // top up whatever's missing to the full 24
         injected = true;
         const club = {
           ...template, squad: [], crestInitials: template.short,
           budget: Econ.startBudget(template.tier, lg),
           points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0,
           formation: "4-4-2", lineup: null,
         };
         if (LEAGUE_COUNTRY[lg] !== managedCountry) {
           club.strengthOnly = true; club.strength = baseStrengthForTier(template.tier);
         }
         ensureSquadDepth(club); // no-op for strength-only clubs
         club.squad.forEach(p => { p.club = club.id; });
         state.clubs.push(club);
         existing.add(template.id);
       });
     });

     const counts = LEAGUES.map(lg => (state.fixtures && !Array.isArray(state.fixtures) && state.fixtures[lg] || []).length);
     // Expected REGULAR-season rounds, format-aware (2× default, 3×/4× for
     // triple/quadruple leagues). A split league that has already split will
     // legitimately hold MORE rounds than this, so we require "at least".
     const expected = LEAGUES.map(lg => {
       const n = state.clubs.filter(c => c.league === lg).length;
       const fmt = leagueFormat(lg);
       return ((fmt && fmt.rounds) || 2) * (n - 1);
     });
     const fixturesOk = counts.every((c, i) => c > 0 && c >= expected[i]);
     if (!fixturesOk || injected) {
       const oldPL = Array.isArray(state.fixtures) ? state.fixtures : (state.fixtures && state.fixtures.PL);
       Season.buildFixtures(state);
       // Keep the in-progress Premier League schedule if it still matches (20 clubs).
       if (oldPL && oldPL.length === state.fixtures.PL.length) state.fixtures.PL = oldPL;
       state.splitDone = {}; state.clubs.forEach(c => { c.splitGroup = null; }); // rebuilt schedules → clear split tracking
     }

     delete state.feederPool;
     delete state.leagueOnePool;
     delete state.faTeams; // placeholders retired — the cups now use real clubs

     // (Re)initialise the cups. Old FA brackets referenced placeholder "fa_"
     // teams; and older saves have no Carabao Cup. Mid-season the cups sit out
     // the current campaign and start fresh next season.
     const oldFa = state.faCup && (state.faCup.participants || []).some(id => String(id).startsWith("fa_"));
     if (!state.faCup || !state.eflCup || oldFa || injected) {
       Cup.initSeason(state);
       if (state.week > 0) { state.faCup.skipped = true; state.eflCup.skipped = true; }
     }

     // Vertu Trophy, honours and Community Shield are newer than some saves.
     if (!state.vertu || injected) {
       Vertu.initSeason(state);
       if (state.week > 0) state.vertu.skipped = true;
     }
     if (!state.splitDone) state.splitDone = {}; // championship/relegation split tracking (newer than some saves)
     if (!Array.isArray(state.honours)) state.honours = [];
     if (state.pendingShield === undefined) state.pendingShield = null;
     if (state.pendingSupercopa === undefined) state.pendingSupercopa = null;
     if (state.pendingSuperCup === undefined) state.pendingSuperCup = null;

     // Generic national cups (Phase 6) are newer than some saves — make sure the
     // managed country's cup exists (mid-season it sits out and starts fresh next).
     const myNatCup = Object.values(Cup.CUPS).find(c => c.generic && c.country === managedCountry);
     if (myNatCup && !state[myNatCup.stateKey]) {
       if (state.week > 0) state[myNatCup.stateKey] = { skipped: true, participants: [], entrantsByRound: {}, ties: [], winner: null };
       else Cup.init(state, myNatCup);
     }

     // European competitions are newer than some saves. Mid-season they sit out
     // the current campaign and begin fresh next season.
     if (state.pendingEuro === undefined) state.pendingEuro = null;
     // Old berth-shaped pendingEuro ({ucl,uel,uecl}) → drop it; the access-list
     // system (Euro.buildEuroFields) expects {standings, cupWinner}.
     if (state.pendingEuro && !state.pendingEuro.standings) state.pendingEuro = null;
     if (!state.euro || injected) {
       if (state.week > 0) state.euro = { season: state.season, userComp: null, champions: {}, user: null };
       else Euro.initSeason(state);
     }

     // Coaching staff + coaches market are newer than some saves.
     Coaching.ensureAll(state);
     if (!Array.isArray(state.coachMarket) || !state.coachMarket.length) Coaching.weeklyMarket(state);
     Academy.ensure(state); // youth academy is newer than some saves
     Scouting.ensure(state); // recruitment scouting is newer than some saves
     Fitness.ensure(state);  // stamina/injuries + physio are newer than some saves
     Market.ensureFreeAgents(state); // free-agent market is newer than some saves
     if (!Array.isArray(state.pendingSignings)) state.pendingSignings = []; // pre-agreed deals are newer than some saves
     state.clubs.forEach(c => { if (!c.strengthOnly && c.squad) c.squad.forEach(p => { p.value = parValue(p.rating, p.age); }); }); // refresh values to the current age curve
     Board.ensure(state);    // board objectives are newer than some saves
     Contracts.ensure(state); // contracts + wage budget are newer than some saves
     Morale.ensure(state);    // dynamic morale is newer than some saves
     { const mc = state.clubs.find(c => c.id === state.clubId); if (mc) Tactics.ensure(mc); } // team tactics newer than some saves
     Career.ensure(state);    // manager reputation / board confidence / job market newer than some saves
     News.ensure(state);      // the news feed is newer than some saves

     ensureCareers(state);
   }

   // Seed missing lifetime records on saves that predate career tracking.
   function ensureCareers(state) {
     state.clubs.forEach(club => club.squad.forEach(p => {
       if (!p.career) p.career = estimateCareer(p.rating, p.age, p.pos);
     }));
   }