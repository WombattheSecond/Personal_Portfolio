/* =========================================================================
   PLFC TOUCHLINE MANAGER — BOARD OBJECTIVES
   Each season the board sets a realistic league target for the manager. The
   target is anchored to how strong the squad actually is RELATIVE to its
   division (rank by squad strength), so a newly-promoted or thin side is only
   ever asked to survive, while a genuine heavyweight is asked to win things.
   A team that over-performs sees the bar rise — but only a little, since one
   season can be a fluke — unless the squad is genuinely good, in which case
   the board expects them to kick on. Meeting the target loosens the purse.
   ========================================================================= */

const Board = {
  REWARD_MET: 3,       // £m budget boost for hitting the target
  REWARD_EXCEEDED: 8,  // £m for comfortably beating it

  // Rank the user's club by squad strength within its own division (1 = best).
  expectedRank(state, club) {
    const rivals = state.clubs.filter(c => c.league === club.league);
    rivals.sort((a, b) => Stats.clubStrength(b) - Stats.clubStrength(a));
    const idx = rivals.findIndex(c => c.id === club.id);
    return { rank: idx < 0 ? Math.ceil(rivals.length / 2) : idx + 1, size: rivals.length || 1 };
  },

  dropZone(lg) { const r = Season.LEAGUE_RULES[lg] || {}; return r.relegate || r.sacking || 3; },
  promoZone(lg) { const r = Season.LEAGUE_RULES[lg] || {}; return (r.autoPromote || 0) + (r.playoff ? 1 : 0); },
  isTopFlight(lg) { return Season.leagueAbove(lg) === null; },
  isBottomTier(lg) { return Season.leagueBelow(lg) === null; },

  // Did the user change divisions since last season? (Promotion/relegation ⇒
  // a fresh slate, no history pull — a newcomer is simply asked to stay up.)
  justArrived(state, club) {
    const h = state.history;
    if (!h || !h.length) return false;
    const last = h[h.length - 1];
    return !!(last && last.league && last.league !== club.league);
  },

  // Compute and store the board's objective for the user's coming season.
  setObjective(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return null;
    const lg = club.league;
    const { rank: E, size: N } = this.expectedRank(state, club);
    const drop = this.dropZone(lg);
    const promo = this.promoZone(lg);
    const topFlight = this.isTopFlight(lg);
    const bottomTier = this.isBottomTier(lg);
    const survivalPos = Math.max(1, N - drop); // finish here or higher = safe

    // Base target = roughly where the squad ranks, with a little optimism for
    // sides that clearly belong higher (nudged ~12% toward the top).
    let target = E - Math.round((E - 1) * 0.12);

    // Fluke-dampened history pull: if they held station in the same division and
    // beat (or missed) their strength last season, drag the target toward that
    // finish — but only a little. Genuinely strong squads (ranked near the top
    // on merit) get a bigger pull, so a real force isn't held back by "maybe it
    // was luck"; a smaller side that over-achieved barely moves the bar.
    if (!this.justArrived(state, club) && state.history && state.history.length) {
      const last = state.history[state.history.length - 1];
      if (last && last.league === lg && typeof last.position === "number") {
        const over = target - last.position;          // >0 ⇒ finished better than target
        const eliteFrac = clamp((N - E) / N, 0, 1);     // ~1 when expected near the top
        const pull = over > 0 ? (0.2 + 0.3 * eliteFrac) // over-achievers: cautious raise
                              : 0.35;                    // under-achievers ease back a touch faster
        target = Math.round(target - over * pull);
      }
    }

    // The board never demands worse than "just stay up" (or, in a bottom tier,
    // "don't get the sack"), and never below 1st.
    const floorPos = bottomTier
      ? Math.max(1, N - ((Season.LEAGUE_RULES[lg] || {}).sacking || 4))
      : survivalPos;
    target = clamp(target, 1, floorPos);
    // A newcomer or genuinely weak side is pinned to survival.
    if (this.justArrived(state, club) && E > N * 0.6) target = floorPos;

    const kind = this.kindFor(target, N, topFlight, promo, drop);
    const copy = this.copyFor(kind, target);
    state.objective = { season: state.season, league: lg, targetPos: target, kind, headline: copy.headline, blurb: copy.blurb, expectedRank: E, size: N };
    return state.objective;
  },

  kindFor(target, N, topFlight, promo, drop) {
    const frac = (target - 1) / Math.max(1, N - 1);
    if (!topFlight && target <= promo) return "promotion";
    if (topFlight && target === 1) return "title";
    if (topFlight && frac <= 0.20) return "europe";
    if (frac <= 0.40) return "tophalf";
    if (target < N - drop) return "midtable";
    return "survival";
  },

  copyFor(kind, target) {
    switch (kind) {
      case "title":     return { headline: "Win the league", blurb: "The board will accept nothing less than the title this season." };
      case "promotion": return { headline: "Win promotion", blurb: `Go up — the board want a top-${target} finish and a return to the division above.` };
      case "europe":    return { headline: "Reach Europe", blurb: `Push for a top-${target} finish and take the club back into continental competition.` };
      case "tophalf":   return { headline: "Climb the table", blurb: `A top-half campaign is expected — finish ${ordinal(target)} or better.` };
      case "midtable":  return { headline: "Consolidate", blurb: `Steer a steady mid-table course — around ${ordinal(target)}, well clear of any trouble.` };
      default:          return { headline: "Beat the drop", blurb: `Survival is the one job — finish ${ordinal(target)} or higher and keep the club up.` };
    }
  },

  // Judge the finished season against the stored objective and reward the budget
  // if the board is happy. Returns a verdict for the season-end screen.
  evaluate(state, ctx) {
    const obj = state.objective;
    if (!obj) return null;
    const margin = Math.max(1, Math.round((obj.size || 20) * 0.08));
    let status;
    if (ctx.relegated || ctx.sacked) status = "missed";
    else if (obj.kind === "promotion") {
      status = (ctx.champion || ctx.promoted) ? (ctx.champion ? "exceeded" : "met")
             : (ctx.finalPos <= obj.targetPos ? "met" : "missed");
    } else if (obj.kind === "title") {
      status = ctx.champion ? "met" : "missed";
    } else {
      if (ctx.finalPos <= obj.targetPos - margin) status = "exceeded";
      else if (ctx.finalPos <= obj.targetPos) status = "met";
      else status = "missed";
    }
    if ((ctx.champion || ctx.promoted) && status === "missed") status = "exceeded";

    const reward = status === "exceeded" ? this.REWARD_EXCEEDED : status === "met" ? this.REWARD_MET : 0;
    if (reward) {
      const club = state.clubs.find(c => c.id === state.clubId);
      if (club) club.budget = Math.round((club.budget + reward) * 10) / 10;
    }
    const detail = status === "exceeded"
      ? "The board are delighted — you comfortably beat their target."
      : status === "met"
      ? "Objective met — the board are satisfied with the season."
      : (ctx.relegated || ctx.sacked)
      ? "The board are dismayed — the season fell well short."
      : "The board expected more — the target was missed this year.";
    return { status, reward, headline: obj.headline, targetPos: obj.targetPos, kind: obj.kind, detail };
  },

  // Backfill an objective on saves that predate this feature.
  ensure(state) {
    if (!state.objective) this.setObjective(state);
  },
};
