/* =========================================================================
   PLFC TOUCHLINE MANAGER — PENALTY SHOOTOUT
   An interactive shootout for the user's knockout ties. The goal is split into
   18 spots; the manager picks a spot to SHOOT (their team's kicks) or to DIVE
   (the opponent's kicks). Each kick, a subset of the 18 spots is the "good
   outcome" for the user (a goal when shooting, a save when diving) — how many
   depends on the shooter's rating versus the goalkeeper's — and the spots are
   reshuffled every time so there's no learnable pattern. Best of five, then
   sudden death. Replaces the auto pen result for ties the user is in.
   ========================================================================= */

const SPOT_COLS = 6, SPOT_ROWS = 3, SPOT_COUNT = SPOT_COLS * SPOT_ROWS;

const Shootout = {
  s: null,

  // Conversion chance for a shooter vs a keeper (~0.72 at parity).
  conversion(shooterRating, gkRating) {
    return clamp(0.62 + (shooterRating - gkRating) / 140 + 0.10, 0.33, 0.92);
  },
  rateOf(club, p) {
    if (p && typeof p.rating === "number") return p.rating;
    return typeof club.strength === "number" ? club.strength : 70;
  },
  squadOf(club) {
    const sq = (club.squad && club.squad.length) ? club.squad : (typeof MatchEngine !== "undefined" ? MatchEngine.tempStarters(club) : []);
    return sq;
  },
  teamKit(club) {
    const sq = this.squadOf(club);
    const gk = sq.filter(p => p.pos === "GK").sort((a, b) => b.rating - a.rating)[0] || sq[0];
    const shooters = sq.filter(p => p !== gk).sort((a, b) => b.rating - a.rating);
    return { club, gk, shooters, order: 0 };
  },

  // start(home, away, userClubId, onDone). onDone(winnerId) resumes the match flow.
  start(home, away, userClubId, onDone) {
    const s = {
      home, away, userClubId, onDone,
      H: this.teamKit(home), A: this.teamKit(away),
      userSide: home.id === userClubId ? "home" : "away",
      scoreH: 0, scoreA: 0, kicksH: 0, kicksA: 0,
      history: [], turn: Math.random() < 0.5 ? "home" : "away",
      suddenDeath: false, done: false, winner: null,
      good: null, awaiting: false, resolving: false,
    };
    this.s = s;
    document.getElementById("btnShootoutContinue").classList.add("hidden");
    App.showShootoutScreen();
    document.getElementById("shootoutTitle").textContent = `${home.short} vs ${away.short} — Penalties`;
    this.nextKick();
  },

  decided() {
    const s = this.s;
    if (!s.suddenDeath) {
      const remH = 5 - s.kicksH, remA = 5 - s.kicksA;
      if (s.scoreH > s.scoreA + remA) return "home";
      if (s.scoreA > s.scoreH + remH) return "away";
      if (s.kicksH >= 5 && s.kicksA >= 5 && s.scoreH !== s.scoreA) return s.scoreH > s.scoreA ? "home" : "away";
      return null;
    }
    // sudden death: decide only after both have taken an equal number of kicks
    if (s.kicksH === s.kicksA && s.kicksH > 5 && s.scoreH !== s.scoreA) return s.scoreH > s.scoreA ? "home" : "away";
    return null;
  },

  nextKick() {
    const s = this.s;
    const w = this.decided();
    if (w) { this.finish(w); return; }
    if (!s.suddenDeath && s.kicksH >= 5 && s.kicksA >= 5) s.suddenDeath = true;

    const kickSide = s.turn;
    const kicking = kickSide === "home" ? s.H : s.A;
    const keeping = kickSide === "home" ? s.A : s.H;
    const shooter = kicking.shooters[kicking.order % Math.max(1, kicking.shooters.length)] || kicking.gk;
    const gk = keeping.gk;
    const userIsShooter = kickSide === s.userSide;

    // How likely is the USER's desired outcome? A goal when shooting, a save when diving.
    const conv = this.conversion(this.rateOf(kicking.club, shooter), this.rateOf(keeping.club, gk));
    const pUserGood = userIsShooter ? conv : (1 - conv);
    const goodCount = clamp(Math.round(pUserGood * SPOT_COUNT), 1, SPOT_COUNT - 1);
    const idx = Array.from({ length: SPOT_COUNT }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    s.good = { set: new Set(idx.slice(0, goodCount)), userIsShooter, kickSide, shooter, gk, kickerClub: kicking.club, keeperClub: keeping.club };
    s.awaiting = true; s.resolving = false;
    this.render();
  },

  pick(spot) {
    const s = this.s;
    if (!s.awaiting || s.resolving || s.done) return;
    s.resolving = true; s.awaiting = false;
    const g = s.good;
    const userGood = g.set.has(spot);
    // Did the KICKING team score?
    const scored = g.userIsShooter ? userGood : !userGood;
    if (g.kickSide === "home") { s.kicksH++; if (scored) s.scoreH++; s.H.order++; }
    else { s.kicksA++; if (scored) s.scoreA++; s.A.order++; }
    s.history.push({ side: g.kickSide, scored });

    // Reveal outcome on the goal, then advance.
    this.renderResult(spot, scored);
    setTimeout(() => {
      s.turn = s.turn === "home" ? "away" : "home";
      this.nextKick();
    }, 1100);
  },

  finish(winnerSide) {
    const s = this.s;
    s.done = true;
    s.winner = winnerSide === "home" ? s.home.id : s.away.id;
    this.render();
    const won = s.winner === s.userClubId;
    document.getElementById("shootoutBanner").innerHTML =
      `<strong class="${won ? "amber" : ""}">${won ? "🎉 " : ""}${(winnerSide === "home" ? s.home : s.away).name} win ${Math.max(s.scoreH, s.scoreA)}–${Math.min(s.scoreH, s.scoreA)} on penalties</strong>`;
    document.getElementById("shootoutHint").textContent = "";
    document.getElementById("btnShootoutContinue").classList.remove("hidden");
  },

  onContinue() {
    const s = this.s; if (!s || !s.done) return;
    const cb = s.onDone, winner = s.winner;
    this.s = null;
    if (cb) cb(winner);
  },

  // ---- rendering ------------------------------------------------------------
  tallyRow(label, history, side, score) {
    const marks = history.filter(h => h.side === side).map(h => `<span class="pk ${h.scored ? "scored" : "missed"}">${h.scored ? "●" : "○"}</span>`).join("");
    return `<div class="tally-row"><span class="tally-team">${label}</span><span class="tally-marks">${marks}</span><span class="tally-num">${score}</span></div>`;
  },

  render() {
    const s = this.s;
    document.getElementById("shootoutScore").textContent = `${s.scoreH} – ${s.scoreA}`;
    document.getElementById("shootoutTallies").innerHTML =
      this.tallyRow(s.home.short, s.history, "home", s.scoreH) +
      this.tallyRow(s.away.short, s.history, "away", s.scoreA);
    if (s.done) { document.getElementById("goalWrap").innerHTML = this.goalSVG(false); return; }
    const g = s.good;
    const banner = g.userIsShooter
      ? `⚽ <strong>${g.shooter.name}</strong> steps up — pick where to shoot`
      : `🧤 Opponent's kick — <strong>${g.gk.name}</strong> to save. Pick where to dive`;
    document.getElementById("shootoutBanner").innerHTML = banner + (s.suddenDeath ? ` <span class="muted">· sudden death</span>` : "");
    document.getElementById("shootoutHint").textContent = g.userIsShooter
      ? "Some spots beat the keeper, some don't — better shooters vs weaker keepers give you more."
      : "Guess where they'll shoot — a better keeper covers more of the goal.";
    document.getElementById("goalWrap").innerHTML = this.goalSVG(true);
  },

  renderResult(spot, scored) {
    const s = this.s, g = s.good;
    // good = green outcome for the USER; show all good spots, highlight the pick.
    document.getElementById("goalWrap").innerHTML = this.goalSVG(false, { pick: spot, good: g.set });
    const kicker = (g.kickSide === "home" ? s.home : s.away).short;
    let msg;
    if (g.userIsShooter) msg = scored ? `⚽ GOAL! ${g.shooter.name} scores.` : `❌ SAVED! ${g.gk.name} denies you.`;
    else msg = scored ? `❌ ${kicker} score past ${g.gk.name}.` : `🧤 SAVED! ${g.gk.name} guesses right!`;
    document.getElementById("shootoutBanner").innerHTML = `<strong class="${(g.userIsShooter === scored) ? "amber" : ""}">${msg}</strong>`;
    document.getElementById("shootoutHint").textContent = "";
  },

  // Build the goal SVG. If interactive, spots are clickable (data-spot). If a
  // result overlay is given, colour the good/bad spots and ring the pick.
  goalSVG(interactive, overlay) {
    const W = 360, H = 210, postX0 = 24, postX1 = 336, barY = 22, groundY = 176;
    let spots = "";
    const cellW = (postX1 - postX0 - 12) / SPOT_COLS, cellH = (groundY - barY - 12) / SPOT_ROWS;
    for (let r = 0; r < SPOT_ROWS; r++) {
      for (let c = 0; c < SPOT_COLS; c++) {
        const i = r * SPOT_COLS + c;
        const x = postX0 + 6 + c * cellW, y = barY + 6 + r * cellH;
        let cls = "spot";
        if (overlay) {
          cls += overlay.good.has(i) ? " good" : " bad";
          if (i === overlay.pick) cls += " picked";
        }
        spots += `<rect class="${cls}" ${interactive ? `data-spot="${i}"` : ""} x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cellW - 4).toFixed(1)}" height="${(cellH - 4).toFixed(1)}" rx="6"></rect>`;
      }
    }
    return `<svg viewBox="0 0 ${W} ${H}" class="goal-svg" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${groundY}" width="${W}" height="${H - groundY}" class="goal-grass"></rect>
      <rect x="${postX0}" y="${barY}" width="${postX1 - postX0}" height="${groundY - barY}" class="goal-net"></rect>
      <g class="goal-spots">${spots}</g>
      <rect x="${postX0 - 8}" y="${barY - 8}" width="8" height="${groundY - barY + 8}" class="goal-post"></rect>
      <rect x="${postX1}" y="${barY - 8}" width="8" height="${groundY - barY + 8}" class="goal-post"></rect>
      <rect x="${postX0 - 8}" y="${barY - 8}" width="${postX1 - postX0 + 16}" height="8" class="goal-post"></rect>
    </svg>`;
  },
};
