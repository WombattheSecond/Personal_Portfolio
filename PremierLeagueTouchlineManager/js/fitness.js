/* =========================================================================
   PLFC TOUCHLINE MANAGER — FITNESS, STAMINA & INJURIES
   Every player carries match fitness (0–100). Playing drains it; resting
   recovers it. A tired player is less effective (their rating is scaled down in
   the match engine), so a congested run of fixtures rewards rotation. Players
   can also pick up injuries in matches and miss weeks. A PHYSIO (medical staff)
   cuts how often injuries happen, shortens them, and speeds fitness recovery.
   Only the user's club — the one modelled at player level — tracks any of this;
   strength-only foreign clubs are unaffected. Runs itself: you never set it up,
   you just pick from who's fit and decide whether to rest tired legs.
   ========================================================================= */

const Fitness = {
  MATCH_DRAIN: [8, 16],   // fitness lost by a starter per match (min..spread)
  INJURY_BASE: 0.012,     // per-played-player, per-week base injury chance

  physioRating(club) { return club && club.physio ? club.physio.rating : 50; },
  // 0 → ~9 recovery bonus as the physio improves from average to world-class.
  physioBonus(club) { return clamp((this.physioRating(club) - 50) / 6, 0, 9); },

  // Per-player stamina — the higher, the slower a player tires and the faster
  // they recover. Driven mostly by AGE (young legs are stamina machines,
  // veterans fade), with a small edge for elite athletes and a deterministic
  // per-player jitter so two same-age players still differ a touch.
  ageStamina(age) {
    return age <= 21 ? 1.18 : age <= 24 ? 1.10 : age <= 28 ? 1.00
         : age <= 31 ? 0.92 : age <= 34 ? 0.83 : 0.75;
  },
  idJitter(id) {
    let h = 0; const s = String(id || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
    return ((h % 100) / 100 - 0.5) * 0.12; // ~ -0.06 … +0.06
  },
  staminaFactor(p) {
    const quality = clamp(((p.rating || 70) - 76) / 120, 0, 0.09); // elite → a bit fitter
    return clamp(this.ageStamina(p.age || 26) + quality + this.idJitter(p.id), 0.68, 1.30);
  },

  init(club) {
    club.physio = makeYouthStaff("physio", Coaching.tierCoachRating(club.tier));
  },
  ensure(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    if (!club.physio) this.init(club);
    (club.squad || []).forEach(p => {
      if (typeof p.fitness !== "number") p.fitness = 100;
      if (typeof p.injuryWeeks !== "number") p.injuryWeeks = 0;
      if (typeof p.suspendedMatches !== "number") p.suspendedMatches = 0;
    });
  },

  available(p) { return !p || !p.injuryWeeks; },   // selectable this week?

  // Position drain weight: goalkeepers barely tire (they play nearly every
  // minute of every game in real life), outfield players tire in full.
  posDrain(pos) { return pos === "GK" ? 0.4 : 1.0; },

  // Called from recordItem for every match the user's club plays, with a map of
  // {playerId: minutes}. Drain is proportional to minutes on the pitch (a 20-min
  // cameo barely dents fitness), lighter for keepers, and lighter for young/fit
  // legs (÷ stamina). Stacks across a congested week (cup + league + Euro).
  recordMatch(club, minutesMap) {
    if (!club || club.strengthOnly || !club.squad || !minutesMap) return;
    const [lo, spread] = this.MATCH_DRAIN;
    const pressMult = typeof Tactics !== "undefined" ? Tactics.drainMult(club) : 1; // high press tires legs faster
    club.squad.forEach(p => {
      const mins = minutesMap[p.id];
      if (mins == null || mins <= 0) return;
      p._played = true;
      const drain = (lo + Math.random() * spread) * clamp(mins / 90, 0, 1.1) * this.posDrain(p.pos) * pressMult / this.staminaFactor(p);
      p.fitness = clamp((p.fitness ?? 100) - drain, 5, 100);
    });
  },

  // How long a new injury keeps a player out — a good physio shortens it.
  injuryDuration(club) {
    const sev = Math.random();
    let w = sev < 0.55 ? 1 + Math.floor(Math.random() * 2)      // 1–2 wk (knocks)
          : sev < 0.85 ? 3 + Math.floor(Math.random() * 2)      // 3–4 wk
          : 5 + Math.floor(Math.random() * 4);                  // 5–8 wk (bad ones)
    return Math.max(1, Math.round(w * (1 - clamp((this.physioRating(club) - 50) / 160, 0, 0.3))));
  },

  // Each matchweek: recover the fit, count down the injured, then roll fresh
  // injuries for anyone who played. Pushes news into state.medicalNews.
  weekly(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    state.medicalNews = [];
    if (!club || club.strengthOnly || !club.squad) return;

    // 1) Existing injuries tick down first (so a fresh one isn't shortened).
    club.squad.forEach(p => {
      if (p.injuryWeeks > 0) {
        p.injuryWeeks--;
        if (p.injuryWeeks === 0) state.medicalNews.push(`✅ ${p.name} is back in training`);
      }
    });

    // 2) Recovery — a rested player bounces back fast (near-full within a week
    //    or two, so rotation is a real option, not a season-ender); a player who
    //    featured recovers only a little; the injured recover slowly while out.
    //    Younger/fitter legs recover more (× stamina).
    const bonus = this.physioBonus(club);
    const REST_BASE = 42, PLAYED_BASE = 9;
    club.squad.forEach(p => {
      let gain;
      if (p.injuryWeeks > 0) gain = 6;
      else {
        const f = this.staminaFactor(p);
        gain = p._played ? PLAYED_BASE * f + bonus / 2 : REST_BASE * f + bonus;
      }
      p.fitness = clamp((p.fitness ?? 100) + gain, 5, 100);
    });

    // 3) Fresh injuries for players who featured — likelier when tired, rarer
    //    with a top physio.
    const cut = clamp((this.physioRating(club) - 50) / 120, 0, 0.42);
    club.squad.forEach(p => {
      if (!p._played || p.injuryWeeks > 0) return;
      const lowFit = 1 + (100 - (p.fitness ?? 100)) / 70;
      const traitMult = typeof Players !== "undefined" ? Players.injuryMult(p) : 1; // Injury Prone ↑, Professional ↓
      if (Math.random() < this.INJURY_BASE * lowFit * (1 - cut) * traitMult) {
        p.injuryWeeks = this.injuryDuration(club);
        this.dropFromLineup(club, p.id);
        state.medicalNews.push(`⚠️ ${p.name} injured — out ${p.injuryWeeks} week${p.injuryWeeks === 1 ? "" : "s"}`);
      }
    });

    club.squad.forEach(p => { delete p._played; });
  },

  // Pull an injured player out of the current XI/bench so the lineup can be
  // re-completed with fit players.
  dropFromLineup(club, playerId) {
    if (!club.lineup) return;
    POSITIONS.forEach(pos => { club.lineup.slots[pos] = club.lineup.slots[pos].map(id => id === playerId ? null : id); });
    club.lineup.bench = club.lineup.bench.filter(id => id !== playerId);
  },

  injuredList(club) { return (club.squad || []).filter(p => p.injuryWeeks > 0).sort((a, b) => b.injuryWeeks - a.injuryWeeks); },

  // Fresh legs each pre-season: everyone starts fully fit and healthy.
  seasonRollover(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || !club.squad) return;
    club.squad.forEach(p => { p.fitness = 100; p.injuryWeeks = 0; p.suspendedMatches = 0; delete p._played; });
  },

  // ---- UI helpers -----------------------------------------------------------
  label(p) {
    if (p.injuryWeeks > 0) return `🚑 ${p.injuryWeeks}w`;
    return Math.round(p.fitness ?? 100) + "%";
  },
  level(p) {
    if (p.injuryWeeks > 0) return "injured";
    const f = p.fitness ?? 100;
    return f >= 85 ? "fresh" : f >= 65 ? "ok" : "tired";
  },

  // Energy-adjusted rating: a tired player performs BELOW their base rating, but
  // only mildly — fitness barely bites until the second half of the tank, then
  // costs about a point per 10% below ~55%: 50%→-1, 40%→-2, 30%→-3, capped at -5.
  // This same delta drives the match engine, so what you see is what you get.
  energyDelta(p) {
    const f = typeof p.fitness === "number" ? p.fitness : 100;
    return -Math.round(clamp((55 - f) / 10, 0, 5));
  },
  effRating(p) { return Math.max(1, (p.rating || 1) + this.energyDelta(p)); },
  // Plain-text "55 (-3)" for <option>s and anywhere HTML isn't wanted.
  ratingText(p) { const d = this.energyDelta(p); return `${p.rating}${d < 0 ? ` (${d})` : ""}`; },
};
