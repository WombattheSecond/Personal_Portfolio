/* =========================================================================
   PLFC TOUCHLINE MANAGER — DYNAMIC NEWS FEED
   A rolling feed generated from what actually happens in the world: your own
   results, signings, injuries, youth and morale flashpoints, rival transfers,
   notable league results, and transfer rumours about your best players. It's
   the connective narrative — the same events that drive morale, the board and
   the market also get written up here, so the save reads like a season story.
   ========================================================================= */

const News = {
  ICONS: { transfer: "🔁", result: "⚽", injury: "🚑", board: "🏛️", youth: "🌱", player: "👤", rumour: "👀", manager: "👔", league: "📊" },

  ensure(state) { if (!Array.isArray(state.news)) state.news = []; },
  push(state, cat, text, extra) {
    this.ensure(state);
    state.news.unshift({ id: "nw" + (state._newsId = (state._newsId || 0) + 1), week: state.week, season: state.season, cat, icon: this.ICONS[cat] || "•", text, ...(extra || {}) });
    if (state.news.length > 60) state.news.length = 60;
  },
  byId(state, id) { return state.clubs.find(c => c.id === id); },
  posWord(pos) { return pos === "GK" ? "goalkeeper" : pos === "DF" ? "defender" : pos === "MF" ? "midfielder" : "forward"; },

  // ---- weekly world + own-club generation -----------------------------------
  weekly(state) {
    this.ensure(state);
    // Own-club flashpoints already collected by the other systems this week.
    (state.moraleNews || []).forEach(t => this.push(state, "player", t));
    (state.medicalNews || []).forEach(t => this.push(state, "injury", t));
    (state.academyNews || []).forEach(t => this.push(state, "youth", t));
    (state.scoutNews || []).forEach(t => this.push(state, "transfer", t));
    this.notableLeagueResult(state);
    this.leagueNote(state);
    this.rumours(state);
    this.boardNote(state);
  },

  // One eye-catching AI result from the user's division this week.
  notableLeagueResult(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    const wk = state.week - 1;
    const rows = (state.results || []).filter(r => r.week === wk && r.home !== state.clubId && r.away !== state.clubId)
      .map(r => ({ r, h: this.byId(state, r.home), a: this.byId(state, r.away) }))
      .filter(x => x.h && x.a && x.h.league === club.league);
    if (!rows.length) return;
    // Favour upsets (weaker side wins) and big margins.
    rows.forEach(x => {
      const margin = Math.abs(x.r.hg - x.r.ag);
      const winnerStr = x.r.hg > x.r.ag ? Stats.clubStrength(x.h) : x.r.hg < x.r.ag ? Stats.clubStrength(x.a) : 0;
      const loserStr = x.r.hg > x.r.ag ? Stats.clubStrength(x.a) : Stats.clubStrength(x.h);
      x.score = margin + Math.max(0, loserStr - winnerStr) * 0.6; // upset bonus
    });
    rows.sort((a, b) => b.score - a.score);
    const top = rows[0];
    if (top.score < 3) return; // nothing worth reporting
    const upset = (top.r.hg > top.r.ag ? Stats.clubStrength(top.a) : Stats.clubStrength(top.h)) > (top.r.hg > top.r.ag ? Stats.clubStrength(top.h) : Stats.clubStrength(top.a)) + 6;
    this.push(state, "result", `${upset ? "😱 Shock result: " : ""}${top.h.short} ${top.r.hg}–${top.r.ag} ${top.a.short}${top.score >= 4 && !upset ? " in a one-sided affair" : ""}.`);
  },

  // Occasional title-race / table note.
  leagueNote(state) {
    if (Math.random() > 0.3) return;
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || (club.played || 0) < 3) return;
    try {
      const tbl = Season.table(state, club.league);
      if (tbl.length < 2) return;
      const lead = tbl[0].points - tbl[1].points;
      const name = tbl[0].id === club.id ? "You" : tbl[0].short;
      this.push(state, "league", lead <= 1
        ? `${name} lead ${LEAGUE_NAMES[club.league]} on goal difference — it's tight at the top.`
        : `${name} lead ${LEAGUE_NAMES[club.league]} by ${lead} point${lead === 1 ? "" : "s"}.`);
    } catch (e) { /* table not ready */ }
  },

  // Rival interest in your best / unsettled / brightest young players.
  rumours(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || !club.squad) return;
    const myStr = Stats.clubStrength(club);
    const suitors = state.clubs.filter(c => c.id !== club.id && !c.strengthOnly && Stats.clubStrength(c) > myStr + 3);
    if (!suitors.length) return;
    const targets = club.squad.filter(p => p.rating >= 76 || p.wantsOut || (p.age <= 21 && (p.potential || 0) >= 80));
    if (!targets.length) return;
    const n = Math.random() < 0.45 ? (Math.random() < 0.6 ? 1 : 2) : 0;
    const used = new Set();
    for (let i = 0; i < n; i++) {
      const p = targets[Math.floor(Math.random() * targets.length)];
      if (used.has(p.id)) continue; used.add(p.id);
      const suitor = suitors[Math.floor(Math.random() * suitors.length)];
      const line = p.wantsOut
        ? `${suitor.name} are said to be ready to test your resolve over unsettled ${this.posWord(p.pos)} ${p.name}.`
        : `${suitor.name} are reportedly monitoring your ${p.age}-year-old ${this.posWord(p.pos)} ${p.name}.`;
      this.push(state, "rumour", line, { playerId: p.id });
    }
  },

  boardNote(state) {
    if (typeof state.boardConfidence !== "number" || state.boardConfidence >= 30) return;
    if (Math.random() > 0.5) return;
    this.push(state, "board", (state.boardMessage && state.boardMessage.text) || "The board have concerns over recent form.");
  },

  // ---- event hooks (called from the systems that cause the event) -----------
  transfer(state, text) { this.push(state, "transfer", text); },
  userResult(state, item) {
    if (!item || !item.full || !item.home || !item.away) return;
    const hs = item.home.short, as = item.away.short, hg = item.full.hg, ag = item.full.ag;
    const meHome = item.home.id === state.clubId;
    const gf = meHome ? hg : ag, ga = meHome ? ag : hg;
    const tag = gf > ga ? "✅ " : gf < ga ? "❌ " : "";
    const comp = item.type && item.type !== "league" ? ` (${(item.meta && item.meta.label) || "cup"})` : "";
    this.push(state, "result", `${tag}${hs} ${hg}–${ag} ${as}${comp}`);
  },

  seasonRollover(state) { this.push(state, "league", `— Season ${state.season}/${String(state.season + 1).slice(2)} begins —`); },

  // Human "time ago" for the feed.
  ago(state, item) {
    if (item.season !== state.season) return `${state.season - item.season} season${state.season - item.season === 1 ? "" : "s"} ago`;
    const d = state.week - item.week;
    return d <= 0 ? "this week" : d === 1 ? "last week" : `${d} weeks ago`;
  },
};
