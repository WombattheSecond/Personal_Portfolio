/* =========================================================================
   PLFC TOUCHLINE MANAGER — SQUAD MORALE (the connective tissue)
   Morale was a dead field; now it's a live, weekly-updated number for the
   user's squad that BOTH responds to and drives the rest of the game:

     playing time vs squad role · team form · league position vs the board's
     objective · injuries · being transfer-listed · contract situation
                                   ↓  morale  ↓
     match performance · season development · transfer requests (wants to leave)
     · how amenable a player is in contract talks · dressing-room news

   Roles are derived from a player's standing in the squad, so a Key Player who
   never starts sours while a Prospect getting minutes thrives. Only the modelled
   (user's) club is tracked; rivals sit at a neutral baseline.
   ========================================================================= */

const Morale = {
  EXP_SHARE: { "Key Player": 0.82, "First Team": 0.66, "Rotation": 0.44, "Backup": 0.20, "Prospect": 0.14 },
  ROLE_W:    { "Key Player": 1.4,  "First Team": 1.1,  "Rotation": 0.85, "Backup": 0.55, "Prospect": 0.4 },
  ROLES: ["Key Player", "First Team", "Rotation", "Backup", "Prospect"],

  ensurePlayer(p) {
    if (typeof p.morale !== "number") p.morale = 70;
    if (typeof p.wantsOut !== "boolean") p.wantsOut = false;
  },
  ensure(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (club && club.squad) club.squad.forEach(p => this.ensurePlayer(p));
  },

  // A player's squad role — a manual choice if the manager set one, otherwise
  // derived from where he ranks by rating in the squad.
  role(club, p) {
    if (p.squadRoleSet && p.squadRole) return p.squadRole;
    const better = club.squad.filter(x => x.rating > p.rating).length;
    const ratings = club.squad.map(x => x.rating).sort((a, b) => b - a);
    const cut11 = ratings[10] != null ? ratings[10] : 0;
    if (p.age <= 20 && p.rating < cut11 - 1) return "Prospect";
    if (better < 4) return "Key Player";
    if (better < 11) return "First Team";
    if (better < 16) return "Rotation";
    return "Backup";
  },

  // Club-wide morale inputs computed once per week.
  clubContext(state, club) {
    const played = club.played || 0;
    const ppg = played > 0 ? club.points / played : 1.3;
    const form = clamp((ppg - 1.3) * 22, -12, 12);
    let objective = 0;
    try {
      const tbl = Season.table(state, club.league);
      const row = tbl.find(r => r.id === club.id);
      if (row) {
        if (state.objective) objective = clamp((state.objective.targetPos - row.pos) * 1.4, -6, 8);
        const relZone = (Season.LEAGUE_RULES[club.league] || {}).relegate || 0;
        if (relZone && row.pos > tbl.length - relZone) objective -= 8; // staring at the drop
      }
    } catch (e) { /* table not ready — no objective effect */ }
    return { form, objective };
  },

  // The morale a player is drifting TOWARD given his current situation.
  target(state, club, p, ctx) {
    let base = 62;
    const role = this.role(club, p);
    const games = club.played || 0;
    const ramp = clamp(games / 6, 0, 1); // don't judge playing time in week one
    if (games > 0) {
      const share = (p.stats && p.stats.apps ? p.stats.apps : 0) / games;
      const diff = share - this.EXP_SHARE[role];
      base += clamp(diff * 55, -30, 16) * this.ROLE_W[role] * ramp;
    }
    base += ctx.form;
    base += ctx.objective;
    if (p.injuryWeeks > 0) base -= 7;
    if (p.transferListed) base -= 14;
    if (p.contractLeft === 1) base -= 4;
    if (role === "Prospect") base += 4; // a young player getting developed is content
    return clamp(base, 5, 100);
  },

  // Weekly tick — nudge every squad player toward their target, then handle
  // transfer requests. Pushes dressing-room news into state.moraleNews.
  weekly(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    state.moraleNews = [];
    if (!club || club.strengthOnly || !club.squad) return;
    const ctx = this.clubContext(state, club);
    club.squad.forEach(p => {
      this.ensurePlayer(p);
      const tgt = this.target(state, club, p, ctx);
      p.morale = clamp(Math.round(p.morale + (tgt - p.morale) * 0.28), 5, 100);
      const role = this.role(club, p);

      // Transfer requests: a persistently miserable first-teamer may down tools.
      if (p.morale <= 26 && !p.wantsOut && !p.transferListed) {
        if ((role === "Key Player" || role === "First Team" || role === "Rotation") && Math.random() < 0.25) {
          p.wantsOut = true;
          state.moraleNews.push(`😠 ${p.name} has handed in a transfer request — unhappy at the club`);
        }
      } else if (p.wantsOut && p.morale >= 55) {
        p.wantsOut = false;
        state.moraleNews.push(`🙂 ${p.name} has withdrawn his transfer request`);
      }

      // One-off nudge when a notable player first turns unhappy (no spam).
      if (p.morale < 42 && role !== "Backup" && role !== "Prospect" && !p._unhappyFlagged && !p.wantsOut) {
        p._unhappyFlagged = true;
        state.moraleNews.push(`⚠️ ${p.name} is unhappy — ${this.reasonFor(club, p, ctx)}`);
      } else if (p.morale > 56 && p._unhappyFlagged) { delete p._unhappyFlagged; }
    });
  },

  // A short human reason for an unhappy player (best single driver).
  reasonFor(club, p, ctx) {
    const role = this.role(club, p);
    const games = club.played || 0;
    const share = games > 0 ? (p.stats && p.stats.apps ? p.stats.apps : 0) / games : 1;
    if (p.transferListed) return "he's been transfer-listed";
    if (games >= 5 && share < this.EXP_SHARE[role] - 0.15) return "not enough playing time";
    if (ctx.objective < -4) return "the team's league position";
    if (ctx.form < -6) return "the team's poor run of form";
    if (p.contractLeft === 1) return "his contract situation";
    return "his role at the club";
  },

  // ---- consequences ---------------------------------------------------------
  // Match performance: unhappy players underperform, happy ones lift a touch.
  // Centred so a neutral (70) or rival player is unaffected.
  factor(p) { const m = typeof p.morale === "number" ? p.morale : 70; return clamp(1 + (m - 70) / 100 * 0.1, 0.93, 1.03); },
  // Season development: happy players grow a little more, unhappy ones stall.
  // Centred at the neutral baseline (70) so a settled/rival squad is unaffected.
  devMult(p) { const m = typeof p.morale === "number" ? p.morale : 70; return clamp(1 + (m - 70) / 100 * 0.35, 0.85, 1.12); },
  // Contract talks: a happy player takes a bigger cut; an unhappy one digs in.
  contractSwing(p) { const m = typeof p.morale === "number" ? p.morale : 70; return clamp((m - 60) / 300, -0.07, 0.05); },

  // ---- events ---------------------------------------------------------------
  onSign(p) { p.morale = 66; p.wantsOut = false; },        // settling in
  onRenew(p) { p.morale = clamp((p.morale ?? 70) + 10, 5, 100); p.wantsOut = false; },
  onPromote(p) { p.morale = 74; },                         // thrilled to make the step up

  // Pre-season: last year's grievances ease but don't fully reset.
  seasonRollover(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || !club.squad) return;
    club.squad.forEach(p => {
      this.ensurePlayer(p);
      p.morale = clamp(Math.round(p.morale * 0.4 + 68 * 0.6), 5, 100);
      if (p.morale >= 55) p.wantsOut = false;
      delete p._unhappyFlagged;
    });
  },

  // ---- UI helpers -----------------------------------------------------------
  label(m) { m = m == null ? 70 : m; return m >= 85 ? "Very Happy" : m >= 68 ? "Happy" : m >= 52 ? "Content" : m >= 36 ? "Unhappy" : "Very Unhappy"; },
  cls(m) { m = m == null ? 70 : m; return m >= 68 ? "good" : m >= 52 ? "ok" : "bad"; },
  emoji(m) { m = m == null ? 70 : m; return m >= 85 ? "😀" : m >= 68 ? "🙂" : m >= 52 ? "😐" : m >= 36 ? "🙁" : "😞"; },
};
