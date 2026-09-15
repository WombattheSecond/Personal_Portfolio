/* =========================================================================
   PLFC TOUCHLINE MANAGER — RECRUITMENT / SCOUTING
   Send talent scouts out to look for a TYPE of player (a position + a profile:
   young prospect, proven quality, or budget bargain). A few matchweeks later
   the scout returns a shortlist of real, signable targets. Better scouts come
   back faster, with more names, of higher quality — AND with a signing discount
   (their relationships get the deal done cheaper). Reports sit in the Scouting
   panel until you sign them (window permitting) or dismiss them; you never have
   to touch it if you don't want to. Only the user's club scouts.
   ========================================================================= */

const SCOUT_CAP = 3;
let _scoutId = 1, _repId = 1, _scListId = 1, _wlId = 1;

function makeScout(rating) {
  const { name } = randomProspect();
  return { id: "sct" + (_scoutId++), name, rating: Math.max(40, Math.min(96, Math.round(rating))), busyUntil: null, assignment: null };
}

// A generated find whose ceiling scales with the scout's quality — this is
// where a great scout unearths a gem an average one never would.
function scoutProspect(pos, profile, rating) {
  const { name, nat } = randomProspect();
  let age, rtg, pot;
  if (profile === "prospect") {
    age = 16 + Math.floor(Math.random() * 5);            // 16–20
    rtg = clamp(50 + Math.floor(Math.random() * 10), 46, 66);
    pot = clamp(rating - 6 + Math.floor(Math.random() * 20), 64, 96);
  } else if (profile === "bargain") {
    age = 26 + Math.floor(Math.random() * 7);            // 26–32
    rtg = clamp(58 + Math.floor(Math.random() * 10), 55, 74);
    pot = rtg;
  } else {                                                // proven quality
    age = 23 + Math.floor(Math.random() * 7);            // 23–29
    rtg = clamp(rating - 8 + Math.floor(Math.random() * 14), 66, 90);
    pot = Math.max(rtg, rtg + (age < 24 ? Math.floor(Math.random() * 4) : 0));
  }
  const p = P(name, pos, age, rtg, { nat, potential: pot });
  p.club = null;
  return p;
}

const Scouting = {
  CAP: 3, // most talent scouts you can hold at once
  PROFILES: [
    { key: "star",     label: "Proven quality", hint: "ready-made first-teamers" },
    { key: "prospect", label: "Young prospect", hint: "high-ceiling teenagers" },
    { key: "bargain",  label: "Budget bargain", hint: "value-for-money signings" },
  ],
  profileLabel(key) { const p = this.PROFILES.find(x => x.key === key); return p ? p.label : key; },

  // Assignment length, number of names, and the signing discount all improve
  // with the scout's rating.
  duration(rating) { return rating >= 80 ? 2 : rating >= 62 ? 3 : 4; },
  yieldCount(rating) { return rating >= 80 ? 4 : rating >= 62 ? 3 : 2; },
  discount(rating) { return clamp((rating - 50) / 200, 0, 0.22); }, // up to ~22% off

  init(club) {
    club.scouting = { scouts: [makeScout(Coaching.tierCoachRating(club.tier))], reports: [] };
  },
  ensure(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    if (!club.scouting) this.init(club);
    club.scouting.scouts = club.scouting.scouts || [];
    club.scouting.reports = club.scouting.reports || [];
    if (!Array.isArray(state.watchlist)) state.watchlist = [];
  },

  // ---- assignments ----------------------------------------------------------
  assign(state, scoutId, pos, profile) {
    this.ensure(state);
    const club = Game.myClub();
    const sc = club.scouting.scouts.find(s => s.id === scoutId);
    if (!sc) return { ok: false, reason: "That scout is no longer on your books." };
    if (sc.busyUntil != null) return { ok: false, reason: "That scout is already out on assignment." };
    if (!POSITIONS.includes(pos)) return { ok: false, reason: "Pick a position to scout." };
    if (!this.PROFILES.find(p => p.key === profile)) profile = "star";
    sc.assignment = { pos, profile };
    sc.busyUntil = state.week + this.duration(sc.rating);
    return { ok: true, name: sc.name, pos, profile, weeks: sc.busyUntil - state.week };
  },

  // Pull a scout back early — the assignment is scrapped, no report.
  recall(state, scoutId) {
    const club = Game.myClub();
    const sc = club.scouting && club.scouting.scouts.find(s => s.id === scoutId);
    if (!sc || sc.busyUntil == null) return { ok: false };
    sc.busyUntil = null; sc.assignment = null;
    return { ok: true, name: sc.name };
  },

  // ---- weekly tick: scouts return with reports ------------------------------
  weekly(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    state.scoutNews = [];
    if (!club || !club.scouting) return;
    const s = club.scouting;
    s.scouts = s.scouts || []; s.reports = s.reports || [];
    s.scouts.forEach(sc => {
      if (sc.busyUntil != null && state.week >= sc.busyUntil && sc.assignment) {
        const briefPos = sc.assignment.pos;
        const rep = this.buildReport(state, sc);
        sc.busyUntil = null; sc.assignment = null;
        if (rep) {
          s.reports.unshift(rep);
          state.scoutNews.push(`🔎 ${sc.name} returns with ${rep.candidates.length} ${rep.pos} target${rep.candidates.length === 1 ? "" : "s"} (${this.profileLabel(rep.profile)})`);
        } else {
          state.scoutNews.push(`🔎 ${sc.name} came back empty-handed — no ${briefPos} fitting the brief`);
        }
      }
    });
    if (s.reports.length > 6) s.reports.length = 6; // hold the six most recent
  },

  buildReport(state, scout) {
    const { pos, profile } = scout.assignment;
    const candidates = this.buildCandidates(state, pos, profile, scout.rating);
    if (!candidates.length) return null;
    return {
      id: "rep" + (_repId++), scoutId: scout.id, scoutName: scout.name,
      pos, profile, rating: scout.rating, discount: this.discount(scout.rating),
      week: state.week, candidates,
    };
  },

  // Build a shortlist mixing real rival players with a generated find or two;
  // a stronger scout's noise is smaller, so the genuinely best fits rise up.
  buildCandidates(state, pos, profile, rating) {
    const n = this.yieldCount(rating);
    const disc = this.discount(rating);

    const fit = p => {
      if (profile === "prospect") return (p.age <= 21 ? 1 : 0.2) * (p.potential - p.rating + 8) + (p.wonderkid ? 20 : 0) - Math.max(0, p.age - 21) * 3;
      if (profile === "bargain") return p.rating - p.value * 0.9;
      return p.rating + (p.age < 30 ? 4 : 0); // star: proven quality
    };
    const noise = () => Math.random() * (40 - rating * 0.35); // shrinks as rating rises

    // Real, sellable rival players of this position (skip a club's only keeper).
    const real = [];
    state.clubs.forEach(club => {
      if (club.id === state.clubId || club.strengthOnly) return;
      const keepers = club.squad.filter(p => p.pos === "GK").length;
      club.squad.forEach(p => {
        if (p.pos !== pos) return;
        if (pos === "GK" && keepers <= 1) return;
        real.push({ player: p, club });
      });
    });
    real.sort((a, b) => (fit(b.player) + noise()) - (fit(a.player) + noise()));

    const wantReal = Math.min(real.length, Math.max(1, Math.round(n * 0.45)));
    const out = [];
    for (let i = 0; i < wantReal; i++) {
      const { player, club } = real[i];
      const base = Market.listingFromExisting(player, club);
      out.push(this.decorate(base, disc));
    }
    // Scouts range across UEFA — pull in some foreign targets at this position.
    const wantForeign = Math.round(n * 0.35);
    for (let i = 0; i < wantForeign && out.length < n; i++) {
      const f = Market.buildForeignListing(state, pos);
      if (f) out.push(this.decorate(f, disc));
    }
    // Fill the rest with generated finds (ceiling scaled by the scout).
    while (out.length < n) {
      const p = scoutProspect(pos, profile, rating);
      const markup = 0.9 + Math.random() * 0.35;
      out.push(this.decorate({
        listingId: null, player: p, origin: null,
        originName: p.age <= 20 ? "Unattached prospect" : "Free agent",
        price: Math.max(0.3, Math.round(p.value * markup * 10) / 10),
      }, disc));
    }
    return out;
  },

  // Turn a market-style listing into a scouted candidate with its own id and
  // the discount baked into the fee (original fee kept for the UI).
  decorate(listing, disc) {
    const full = listing.price;
    const price = Math.max(0.2, Math.round(full * (1 - disc) * 10) / 10);
    return { ...listing, listingId: "sc" + (_scListId++), scouted: true, fullPrice: full, price };
  },

  // ---- signing a scouted target ---------------------------------------------
  // Routes through Market.executeSigning, so a deal struck outside the window
  // becomes a pre-agreed signing that lands when the window opens.
  // Resolve a scouted candidate to its current player + origin (used by the
  // negotiation modal to show live demands).
  resolveCandidate(state, reportId, listingId) {
    const club = Game.myClub();
    const rep = (club.scouting.reports || []).find(r => r.id === reportId);
    if (!rep) return null;
    const cand = rep.candidates.find(c => c.listingId === listingId);
    if (!cand) return null;
    let player = cand.player, originId = cand.origin || null, gone = false;
    if (originId) {
      const originClub = state.clubs.find(c => c.id === originId);
      const live = originClub && originClub.squad.find(p => p.id === cand.player.id);
      if (!live) gone = true; else player = live;
    }
    return { rep, cand, player, originId, gone };
  },

  // wage/years optional — supplied when signed through the negotiation modal,
  // otherwise auto-agreed at the player's demand on an age-appropriate length.
  sign(state, reportId, listingId, wage, years) {
    const club = Game.myClub();
    const r = this.resolveCandidate(state, reportId, listingId);
    if (!r) return { ok: false, reason: "That target is no longer listed." };
    if (r.gone) {
      const ci = r.rep.candidates.indexOf(r.cand);
      if (ci >= 0) r.rep.candidates.splice(ci, 1);
      if (!r.rep.candidates.length) this.dropReport(club, reportId);
      return { ok: false, reason: `${r.cand.player.name} has already moved on.` };
    }
    const res = Market.executeSigning(state, {
      player: r.player, fee: r.cand.price,
      wage: wage != null ? wage : Contracts.effWage(r.player),
      years: years != null ? years : Contracts.idealLength(r.player.age),
      originId: r.originId, originName: r.cand.originName, freeAgent: false,
    });
    if (!res.ok) return res;
    const ci = r.rep.candidates.indexOf(r.cand);
    if (ci >= 0) r.rep.candidates.splice(ci, 1);
    if (!r.rep.candidates.length) this.dropReport(club, reportId);
    return { ok: true, immediate: res.immediate, name: res.name, price: r.cand.price, origin: r.cand.originName };
  },

  // ---- watchlist / shortlist ------------------------------------------------
  // Save a scouted target to sign later. Reports clear every season but the
  // watchlist persists, so a scout can be re-used without losing the finds. The
  // saved player's data stays LIVE — real targets resolve to their current
  // club/rating/wage; generated prospects age on with you.
  saveToWatchlist(state, reportId, listingId) {
    const club = Game.myClub();
    const rep = (club.scouting.reports || []).find(r => r.id === reportId);
    if (!rep) return { ok: false, reason: "That report has expired." };
    const cand = rep.candidates.find(c => c.listingId === listingId);
    if (!cand) return { ok: false, reason: "That target is no longer listed." };
    state.watchlist = state.watchlist || [];
    const pid = cand.player.id;
    if (state.watchlist.some(e => e.playerId === pid || (e.player && e.player.id === pid))) {
      return { ok: false, reason: `${cand.player.name} is already on your shortlist.` };
    }
    const base = { id: "wl" + (_wlId++), pos: rep.pos, profile: rep.profile, discount: rep.discount, scoutName: rep.scoutName, addedWeek: state.week };
    // A real DOMESTIC player (in a squad) is tracked live by id; generated finds
    // and FOREIGN targets (no stored squad) keep their own snapshot.
    if (cand.origin && !cand.foreign) state.watchlist.push({ ...base, kind: "real", playerId: pid, originId: cand.origin });
    else state.watchlist.push({ ...base, kind: "prospect", player: { ...cand.player } });
    return { ok: true, name: cand.player.name };
  },

  removeWatchlist(state, entryId) {
    const wl = state.watchlist || [];
    const i = wl.findIndex(e => e.id === entryId);
    if (i === -1) return { ok: false };
    const name = wl[i].kind === "real" ? this.nameOf(state, wl[i].playerId) : (wl[i].player && wl[i].player.name);
    wl.splice(i, 1);
    return { ok: true, name };
  },
  nameOf(state, pid) {
    for (const c of state.clubs) { if (c.strengthOnly || !c.squad) continue; const p = c.squad.find(x => x.id === pid); if (p) return p.name; }
    return "The target";
  },

  // Resolve a watchlist entry to its CURRENT data (real players move/develop;
  // prospects carry their own aged snapshot).
  watchlistResolve(state, entry) {
    if (entry.kind === "real") {
      for (const club of state.clubs) {
        if (club.strengthOnly || !club.squad) continue;
        const p = club.squad.find(x => x.id === entry.playerId);
        if (p) return { available: true, player: p, club, moved: club.id !== entry.originId };
      }
      return { available: false };
    }
    return { available: true, player: entry.player, club: null, moved: false };
  },

  // Current fee for a watchlist target (recomputed from live value, scout
  // discount preserved).
  watchlistFee(entry, resolved) {
    const p = resolved.player;
    return Math.max(0.2, Math.round(Math.max(0.3, p.value * 1.05) * (1 - (entry.discount || 0)) * 10) / 10);
  },

  signFromWatchlist(state, entryId, wage, years) {
    const wl = state.watchlist || [];
    const i = wl.findIndex(e => e.id === entryId);
    if (i === -1) return { ok: false, reason: "That target is no longer on your shortlist." };
    const entry = wl[i];
    const r = this.watchlistResolve(state, entry);
    if (!r.available) { wl.splice(i, 1); return { ok: false, reason: "That target has left the game." }; }
    const fee = this.watchlistFee(entry, r);
    const res = Market.executeSigning(state, {
      player: r.player, fee,
      wage: wage != null ? wage : Contracts.effWage(r.player),
      years: years != null ? years : Contracts.idealLength(r.player.age),
      originId: entry.kind === "real" ? r.club.id : null,
      originName: entry.kind === "real" ? r.club.short : "Free agent", freeAgent: false,
    });
    if (!res.ok) return res;
    wl.splice(i, 1);
    return { ok: true, immediate: res.immediate, name: res.name, price: fee };
  },

  // Season tick for the watchlist: age generated prospects (rating can climb →
  // higher wage demands), and drop real targets who've left the game.
  watchlistSeasonRollover(state) {
    const wl = state.watchlist || [];
    state.watchlist = wl.filter(e => {
      if (e.kind === "prospect" && e.player) {
        const p = e.player;
        p.age += 1;
        if (p.age < 24 && p.rating < p.potential) p.rating = Math.min(p.potential, p.rating + Aging.growthStep(p.age));
        p.value = parValue(p.rating, p.age);
        p.wage = parWage(p.rating, p.age);
        return true;
      }
      return this.watchlistResolve(state, e).available; // prune vanished real targets
    });
  },

  dismiss(state, reportId) {
    const club = Game.myClub();
    return this.dropReport(club, reportId) ? { ok: true } : { ok: false };
  },
  dropReport(club, reportId) {
    const reps = club.scouting.reports || [];
    const i = reps.findIndex(r => r.id === reportId);
    if (i === -1) return false;
    reps.splice(i, 1);
    return true;
  },

  // New season: scrap outstanding reports and recall anyone still out, so you
  // start each campaign with a clean slate (scouts themselves stay on staff).
  seasonRollover(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || !club.scouting) return;
    club.scouting.reports = [];
    (club.scouting.scouts || []).forEach(sc => { sc.busyUntil = null; sc.assignment = null; });
    this.watchlistSeasonRollover(state); // watchlist PERSISTS — just age prospects & prune
  },
};
