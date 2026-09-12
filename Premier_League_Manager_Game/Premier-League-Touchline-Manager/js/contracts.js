/* =========================================================================
   PLFC TOUCHLINE MANAGER — CONTRACTS & WAGE BUDGET
   A light contract layer for the user's club. Every signing is negotiated:
   pick a length (1–10 yrs) and a weekly wage on two sliders, make an offer,
   and the player accepts or rejects on the spot. Five rejected attempts and
   the target is off-limits until the next transfer window. Wages are paid
   from a separate WEEKLY WAGE BUDGET (e.g. £150k/wk) — sign a £30k/wk player
   and you have £120k/wk left — so quality costs wage room, not just fees.
   Contracts run down a year each season; let one expire and the player walks
   for free, so keep your key men renewed. Only the managed club is tracked.
   ========================================================================= */

const Contracts = {
  MAX_ATTEMPTS: 5,
  SCALE_V: 2, // wage-scale version; a bump triggers a one-time save recalibration

  // League/country pay scale from the existing `econ` multiplier: an English
  // top flight (econ 1) pays full "par", a minor league (econ ~0.15) a fraction.
  wageFactor(league) {
    const e = (typeof LEAGUE_ECON !== "undefined" && LEAGUE_ECON[league] != null) ? LEAGUE_ECON[league] : 0.5;
    return clamp(0.06 + 0.94 * e, 0.08, 1);
  },
  leagueOf(p) {
    if (p.club && Game.state && Game.state.clubs) {
      const c = Game.state.clubs.find(x => x.id === p.club);
      if (c) return c.league;
    }
    return Game.myLeague();
  },

  // A player's effective weekly wage (£k): a negotiated figure if they have one,
  // otherwise their realistic par wage scaled to the league they're in.
  effWage(p) {
    if (typeof p.wageAgreed === "number") return p.wageAgreed;
    return Math.max(1, Math.round(parWage(p.rating, p.age) * this.wageFactor(this.leagueOf(p))));
  },

  // What they ask to sign = what they currently earn (the pay-cut logic in
  // `evaluate` decides how far below that they'll go).
  wageDemand(p) { return Math.max(1, this.effWage(p)); },

  // Preferred contract length by age — the young want long security, veterans
  // only short deals.
  idealLength(age) {
    return age <= 22 ? 5 : age <= 26 ? 4 : age <= 29 ? 3 : age <= 32 ? 2 : 1;
  },

  // Slider bounds for a wage offer (£k/wk). The low end dips well under the
  // demand so pay-cut offers are possible.
  wageRange(p) {
    const d = this.wageDemand(p);
    return { min: Math.max(1, Math.round(d * 0.4)), max: Math.max(d + 2, Math.round(d * 1.7)), demand: d };
  },

  // ---- wage budget ----------------------------------------------------------
  wageBill(club) { return club.squad.reduce((s, p) => s + this.effWage(p), 0); },
  // Wages already committed to pre-agreed signings that haven't joined yet.
  pendingWage(state) { return ((state && state.pendingSignings) || []).reduce((s, pd) => s + (pd.wage || 0), 0); },
  wageRoom(club) { return (club.wageBudget || 0) - this.wageBill(club) - this.pendingWage(Game.state); },

  // Convert between the two budgets. £1m of transfer kitty ≈ one season of
  // £WAGE_PER_M k/wk of wage-budget capacity. Positive wageKDelta moves transfer
  // money INTO the wage budget; negative frees wage budget back into transfers.
  WAGE_PER_M: 20,
  rebalance(state, wageKDelta) {
    const club = Game.myClub();
    wageKDelta = Math.round(wageKDelta);
    const mDelta = wageKDelta / this.WAGE_PER_M;
    const newWage = (club.wageBudget || 0) + wageKDelta;
    const newTransfer = Math.round((club.budget - mDelta) * 10) / 10;
    if (newTransfer < 0) return { ok: false, reason: "Not enough transfer budget to move across." };
    if (newWage < this.wageBill(club) + this.pendingWage(state)) return { ok: false, reason: "That would cut the wage budget below your current bill." };
    club.wageBudget = Math.round(newWage);
    club.budget = newTransfer;
    return { ok: true };
  },

  // ---- negotiation bookkeeping ----------------------------------------------
  neg(state, id) {
    if (!state.negotiations) state.negotiations = {};
    if (!state.negotiations[id]) state.negotiations[id] = { attempts: 0, locked: false };
    return state.negotiations[id];
  },
  attemptsLeft(state, id) { return this.MAX_ATTEMPTS - this.neg(state, id).attempts; },
  isLocked(state, id) { return !!this.neg(state, id).locked; },
  recordReject(state, id) {
    const n = this.neg(state, id);
    n.attempts++;
    if (n.attempts >= this.MAX_ATTEMPTS) n.locked = true;
    return n;
  },
  clearNeg(state, id) { if (state.negotiations) delete state.negotiations[id]; },
  clearLocks(state) { state.negotiations = {}; }, // fresh slate each window / season

  // ---- the decision ---------------------------------------------------------
  // A wage at/above the ask (on a sensible length) is always accepted. BELOW the
  // ask, the player may still sign for a pay cut — probabilistically. Renewals
  // only stomach a small cut (loyalty); a move to a bigger club tempts a much
  // larger one. `ctx` = { kind:'market'|'free'|'renew', targetClub, originClub }.
  evaluate(p, wage, years, ctx) {
    ctx = ctx || { kind: "market" };
    const ideal = this.idealLength(p.age);
    if (years > ideal + 2) return { accepted: false, reason: "tooLong", ideal };
    if (years < Math.max(1, ideal - 2)) return { accepted: false, reason: "tooShort", ideal };
    const demand = this.wageDemand(p);
    const reqWage = Math.round(demand * (1 + Math.max(0, years - ideal) * 0.06));
    if (wage >= reqWage) return { accepted: true, reqWage, demand };

    // Below the ask — how big a cut, and how far would they go?
    const cutFrac = (reqWage - wage) / Math.max(1, reqWage);
    const maxCut = this.maxCut(p, ctx);
    if (cutFrac > maxCut) return { accepted: false, reason: "bigcut", reqWage, demand, maxCut };
    const prob = this.acceptProb(cutFrac, maxCut);
    const accepted = Math.random() < prob;
    return { accepted, reason: accepted ? null : "wage", reqWage, demand, prob, cutFrac };
  },

  // The largest pay cut (fraction of their ask) a player will entertain. Real
  // players will take 20–30% fairly readily for a move, occasionally up to ~50%
  // for a genuine step up; renewals stomach a smaller trim out of loyalty.
  maxCut(p, ctx) {
    const moraleSwing = typeof Morale !== "undefined" ? Morale.contractSwing(p) : 0; // happy give more, unhappy dig in
    if (ctx.kind === "renew") {
      // Up to ~20% to stay put; the bigger the name, the less they'll give.
      return clamp(0.20 - (p.rating - 78) * 0.005 + moraleSwing, 0.03, 0.24);
    }
    // A signing — even a lateral "change of scenery" is worth a decent cut.
    let m = ctx.kind === "free" ? 0.42 : 0.35;
    const tgt = ctx.targetClub, org = ctx.originClub;
    if (tgt && typeof Stats !== "undefined") {
      const ts = Stats.clubStrength(tgt);
      const os = org ? Stats.clubStrength(org) : ts - 4; // free agent: treat as a slight step up
      m += clamp((ts - os) / 35, -0.25, 0.20); // big step up → up to ~55% cut; a step down → little
    }
    m += clamp((74 - p.rating) / 220, -0.04, 0.05); // ambitious lower-rated push harder
    m += moraleSwing;
    return clamp(m, 0.03, 0.55);
  },

  // Chance of accepting a given cut: ~0.9 for a tiny trim, easing toward the
  // player's ceiling (a cut near their max still lands ~1 in 3).
  acceptProb(cutFrac, maxCut) {
    const t = maxCut > 0 ? cutFrac / maxCut : 1;
    return clamp(0.9 - 0.6 * t, 0.06, 0.95);
  },

  // ---- contract lifecycle ---------------------------------------------------
  ensurePlayer(p) {
    if (typeof p.contractLeft !== "number") p.contractLeft = 2 + Math.floor(Math.random() * 4); // 2–5 seasons
    if (typeof p.contractYears !== "number") p.contractYears = p.contractLeft;
  },

  ensure(state) {
    if (!state.negotiations) state.negotiations = {};
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    club.squad.forEach(p => this.ensurePlayer(p));
    // One-time recalibration when the wage scale changes (older, inflated saves):
    // drop stale negotiated wages and resize the budget to the new realistic bill.
    if (state.wageScaleV !== this.SCALE_V) {
      club.squad.forEach(p => { delete p.wageAgreed; });
      club.wageBudget = Math.max(30, Math.round(this.wageBill(club) * 1.3 / 5) * 5);
      state.wageScaleV = this.SCALE_V;
    }
    if (typeof club.wageBudget !== "number") {
      club.wageBudget = Math.max(30, Math.round(this.wageBill(club) * 1.3 / 5) * 5);
    }
  },

  // Give a signed player their agreed terms (used by every signing path). The
  // agreed wage overrides the league-scaled par in effWage.
  applyContract(player, wage, years) {
    player.wageAgreed = Math.round(wage);
    player.wage = player.wageAgreed; // keep the legacy field in sync for any stray reader
    player.contractYears = years;
    player.contractLeft = years;
  },

  // Season tick for the user's club: run every contract down a year; anyone who
  // hits zero leaves on a free. Returns the departures for the season-end news.
  seasonRollover(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    this.clearLocks(state);
    if (!club) return [];
    const gone = [];
    club.squad = club.squad.filter(p => {
      this.ensurePlayer(p);
      p.contractLeft -= 1;
      if (p.contractLeft <= 0) { gone.push({ name: p.name, pos: p.pos, rating: p.rating, age: p.age }); return false; }
      return true;
    });
    if (gone.length) { Market.guardMinimum(club); club.lineup = null; }
    return gone;
  },

  // The board resizes the wage budget when the club changes division, and never
  // lets it sit below the current bill.
  adjustBudgetForMovement(state, promoted, relegated) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    if (typeof club.wageBudget !== "number") { this.ensure(state); return; }
    if (promoted) club.wageBudget = Math.round(club.wageBudget * 1.4 / 5) * 5;
    else if (relegated) club.wageBudget = Math.round(club.wageBudget * 0.75 / 5) * 5;
    const floor = Math.round(this.wageBill(club) * 1.1 / 5) * 5;
    if (club.wageBudget < floor) club.wageBudget = floor;
  },
};
