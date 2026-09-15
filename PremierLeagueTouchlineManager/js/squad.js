/* =========================================================================
   PLFC TOUCHLINE MANAGER â€” SQUAD & TRANSFER MARKET
   Two real-style transfer windows (summer / winter), listings sourced from
   rival clubs' actual squads plus generated free agents and academy
   prospects, and sales that send your players to a real buying club.
   ========================================================================= */

// Matchweek ranges (0-indexed state.week) during which business can be done.
const TRANSFER_WINDOWS = [
  { name: "Summer", from: 0, to: 3 },     // pre-season through ~deadline day
  { name: "Winter", from: 20, to: 23 },   // January window
];

const TransferWindow = {
  current(week) {
    return TRANSFER_WINDOWS.find(w => week >= w.from && week <= w.to) || null;
  },
  isOpen(week) {
    return !!this.current(week);
  },
  nextOpenWeek(week) {
    const upcoming = TRANSFER_WINDOWS.find(w => w.from > week);
    return upcoming ? upcoming.from : TRANSFER_WINDOWS[0].from; // wraps to next season's summer window
  },
  status(state) {
    const week = state.week;
    const win = this.current(week);
    if (win) return { open: true, name: win.name, closesIn: win.to - week };
    const nextWeek = this.nextOpenWeek(week);
    const wraps = nextWeek <= week;
    return { open: false, opensIn: wraps ? null : nextWeek - week, wraps };
  },
};

let _pndId = 1; // id source for pre-agreed (pending) signings

const Market = {
  // ---- listing construction -------------------------------------------------
  listingFromExisting(player, originClub) {
    const bigSaleRoll = player.rating >= 80 ? Math.random() : 1; // stars rarely listed
    const markup = bigSaleRoll < 0.15 ? 1.8 + Math.random() * 0.8 : 0.95 + Math.random() * 0.45;
    return {
      listingId: "x" + player.id,
      player,
      origin: originClub.id,
      originName: originClub.short,
      price: Math.max(0.4, Math.round(player.value * markup * 10) / 10),
    };
  },
  listingFromProspect() {
    const isYouth = Math.random() < 0.55;
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const { name, nat } = randomProspect();
    let age, rating;
    if (isYouth) {
      age = 16 + Math.floor(Math.random() * 5); // 16-20
      const roll = Math.random();
      rating = roll < 0.06 ? 68 + Math.floor(Math.random() * 10)  // rare teenage gem
             : roll < 0.30 ? 58 + Math.floor(Math.random() * 10)
             : 48 + Math.floor(Math.random() * 12);
    } else {
      age = 21 + Math.floor(Math.random() * 14);
      const roll = Math.random();
      rating = roll < 0.06 ? 78 + Math.floor(Math.random() * 10)
             : roll < 0.35 ? 66 + Math.floor(Math.random() * 10)
             : 55 + Math.floor(Math.random() * 13);
    }
    const player = P(name, pos, age, rating, { nat });
    player.club = null;
    const markup = 0.9 + Math.random() * 0.4;
    return {
      listingId: "f" + player.id,
      player,
      origin: null,
      originName: isYouth ? "Academy free agent" : "Free agent",
      price: Math.max(0.3, Math.round(player.value * markup * 10) / 10),
    };
  },

  // Pool of plausibly-sellable players across every rival club: weighted
  // toward fringe/lower-rated players, with a rare star "shock listing".
  sellablePoolAcrossLeague(state) {
    const pool = [];
    state.clubs.forEach(club => {
      if (club.id === state.clubId || club.strengthOnly) return; // foreign clubs have no player-level squad
      const sorted = club.squad.slice().sort((a, b) => a.rating - b.rating);
      const fringeCount = Math.max(2, Math.round(sorted.length * 0.45));
      sorted.slice(0, fringeCount).forEach(p => pool.push({ player: p, club }));
      // Small chance any given club puts a star up for a big-money move.
      if (Math.random() < 0.12 && sorted.length) {
        const star = sorted[sorted.length - 1];
        if (!pool.find(e => e.player.id === star.id)) pool.push({ player: star, club });
      }
    });
    return pool;
  },

  // A plausible foreign target generated on demand from a strength-only club
  // abroad (the game is UEFA-wide, but only the managed country stores real
  // squads — so foreign players are conjured from their club's strength +
  // nationality). Rating tracks the club's strength, so bigger clubs surface
  // bigger names. `posOverride` forces a position (used by scouting briefs).
  buildForeignListing(state, posOverride) {
    const foreign = state.clubs.filter(c => c.strengthOnly && typeof c.strength === "number");
    if (!foreign.length) return null;
    const weights = foreign.map(c => Math.pow(Math.max(40, c.strength), 2.4)); // favour stronger clubs
    const club = weightedPick(foreign, weights);
    if (!club) return null;
    const country = LEAGUE_COUNTRY[club.league] || "ENG";
    const { name, nat } = homeProspect(country);
    const pos = posOverride || POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const rating = clamp(Math.round(club.strength + (Math.random() * 14 - 8)), 47, 92);
    const age = 21 + Math.floor(Math.random() * 12); // 21–32 (skew away from teen value inflation)
    const p = P(name, pos, age, rating, { nat });
    p.club = club.id; // so effWage reads the foreign league's pay scale
    // Fees scale with the selling league's wealth — a Maltese player costs a
    // fraction of a Bundesliga one of the same rating.
    const feeFactor = clamp(0.3 + 0.7 * (LEAGUE_ECON[club.league] != null ? LEAGUE_ECON[club.league] : 0.4), 0.25, 1);
    const markup = 1.0 + Math.random() * 0.6;
    const price = Math.max(0.4, Math.round(p.value * feeFactor * markup * 10) / 10);
    return { listingId: "fx" + p.id, player: p, origin: club.id, originName: `${club.short} · ${COUNTRY_NAMES[country] || country}`, price, foreign: true };
  },

  buildListings(state, count) {
    const listings = [];
    // ~30% foreign targets from across UEFA, ~40% real domestic, rest generated.
    const foreignCount = Math.round(count * 0.3);
    for (let i = 0; i < foreignCount; i++) { const f = this.buildForeignListing(state); if (f) listings.push(f); }
    const realPool = this.sellablePoolAcrossLeague(state);
    const realCount = Math.round(count * 0.4);
    for (let i = 0; i < realCount && realPool.length; i++) {
      const idx = Math.floor(Math.random() * realPool.length);
      const { player, club } = realPool.splice(idx, 1)[0];
      listings.push(this.listingFromExisting(player, club));
    }
    while (listings.length < count) listings.push(this.listingFromProspect());
    return listings;
  },

  // Full reroll of the listings. The market is now browsable YEAR-ROUND so deals
  // can be negotiated any time — only the actual squad entry waits for a window.
  reroll(state) {
    const count = 10 + Math.floor(Math.random() * 6);
    state.market = this.buildListings(state, count);
  },

  // Called every matchweek. The listing pool churns year-round; rival bids for
  // your players and AI-to-AI trades still only happen while a window is open.
  // When a window opens, any pre-agreed signings complete and land in your squad.
  weeklyUpdate(state) {
    const openNow = TransferWindow.isOpen(state.week);
    const openBefore = state.windowWasOpen;
    state.windowWasOpen = openNow;

    // Keep the market populated + gently churning whatever the calendar says.
    if (!state.market || !state.market.length) this.reroll(state);
    else {
      const keep = state.market.filter(() => Math.random() > 0.3);
      const need = Math.max(10, state.market.length) - keep.length;
      state.market = keep.concat(this.buildListings(state, need));
    }

    if (openNow && !openBefore) {
      const arrivals = this.completePending(state); // pre-agreed deals land now
      this.aiTransfers(state, 8 + Math.floor(Math.random() * 8)); // opening flurry
      this.generateOffers(state);
      Contracts.clearLocks(state); // failed negotiations reset — targets are approachable again
      return { transition: "opened", name: TransferWindow.current(state.week).name, arrivals };
    }
    if (!openNow && openBefore) {
      this.clearOffers(state); // outstanding bids for your players lapse when the window shuts
      return { transition: "closed" };
    }
    if (openNow) {
      this.aiTransfers(state, 3 + Math.floor(Math.random() * 4)); // ongoing rival business
      this.generateOffers(state); // rivals bid for your players
    }
    return { transition: "none" };
  },

  // ---- offers for the user's players -----------------------------------------
  // While a window is open, rival clubs bid for your squad — far more often for
  // anyone you've transfer-listed. Each bid is within ±25% of market value.
  generateOffers(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club) return;
    const rivals = state.clubs.filter(c => c.id !== state.clubId && !c.strengthOnly);
    club.squad.forEach(p => {
      p.offers = p.offers || [];
      const cap = (p.transferListed || p.wantsOut) ? 5 : 2;
      if (p.offers.length >= cap) return;
      const desire = clamp((p.rating - 60) / 50, 0, 0.25); // better players draw interest anyway
      // A player agitating to leave draws bids like a transfer-listed one.
      const chance = clamp(((p.transferListed || p.wantsOut) ? 0.65 : 0.06) + desire, 0, 0.92);
      if (Math.random() > chance) return;
      const fee = Math.max(0.2, Math.round(p.value * (0.75 + Math.random() * 0.5) * 10) / 10); // ±25%
      const weights = rivals.map(c => { const exp = 54 + c.tier * 6; return 1 / (1 + Math.abs(p.rating - exp)); });
      // Find an interested club that can actually afford the fee (a few tries).
      let buyer = null;
      for (let t = 0; t < 6 && !buyer; t++) { const c = weightedPick(rivals, weights); if (c && c.budget >= fee && c.id !== (p.offers[0] && p.offers[0].clubId)) buyer = c; }
      if (!buyer) return;
      p.offers.push({ clubId: buyer.id, clubShort: buyer.short, clubName: buyer.name, fee, week: state.week });
    });
  },

  clearOffers(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (club) club.squad.forEach(p => { p.offers = []; });
  },

  toggleTransferList(state, playerId) {
    const club = Game.myClub();
    const player = club.squad.find(p => p.id === playerId);
    if (!player) return { ok: false };
    player.transferListed = !player.transferListed;
    return { ok: true, listed: player.transferListed, name: player.name };
  },

  declineOffer(state, playerId, offerIdx) {
    const player = Game.myClub().squad.find(p => p.id === playerId);
    if (player && player.offers) player.offers.splice(offerIdx, 1);
    return { ok: true };
  },

  // Accept a specific offer — this is now the only way to sell a player.
  acceptOffer(state, playerId, offerIdx) {
    if (!TransferWindow.isOpen(state.week)) return { ok: false, reason: "The transfer window is closed." };
    const club = Game.myClub();
    const player = club.squad.find(p => p.id === playerId);
    if (!player || !player.offers || !player.offers[offerIdx]) return { ok: false, reason: "That offer is no longer on the table." };
    const offer = player.offers[offerIdx];
    if (player.pos === "GK" && club.squad.filter(p => p.pos === "GK").length <= 1) return { ok: false, reason: "You can't sell your only goalkeeper." };
    if (club.squad.length <= 14) return { ok: false, reason: "Your squad is too thin to sell anyone else." };
    const buyer = state.clubs.find(c => c.id === offer.clubId);
    if (!buyer) return { ok: false, reason: "The buying club has withdrawn." };

    club.budget = Math.round((club.budget + offer.fee) * 10) / 10;
    club.squad = club.squad.filter(p => p.id !== playerId);
    if (club.lineup) {
      POSITIONS.forEach(pos => { club.lineup.slots[pos] = club.lineup.slots[pos].map(id => id === playerId ? null : id); });
      club.lineup.bench = club.lineup.bench.filter(id => id !== playerId);
    }
    Stats.ensure(player);
    buyer.squad.push({ ...player, club: buyer.id, transferListed: false, offers: [], stats: { ...player.stats }, bonus: { ...player.bonus }, career: { ...player.career } });
    buyer.lineup = null;
    return { ok: true, fee: offer.fee, buyerName: offer.clubName };
  },

  // ---- AI-to-AI transfer activity -------------------------------------------
  // While a window is open, rival clubs trade players among themselves so
  // squads churn realistically (money changes hands too). Never touches the
  // user's club — their business stays manual.
  aiTransfers(state, moves) {
    const others = () => state.clubs.filter(c => c.id !== state.clubId && !c.strengthOnly);
    for (let i = 0; i < moves; i++) {
      const sellers = others().filter(c => c.squad.length > 16);
      if (!sellers.length) break;
      const seller = sellers[Math.floor(Math.random() * sellers.length)];

      // Mostly fringe/squad players are sold; occasionally a marquee name.
      const sorted = seller.squad.slice().sort((a, b) => a.rating - b.rating);
      const player = Math.random() < 0.12
        ? sorted[sorted.length - 1]
        : sorted[Math.floor(Math.random() * Math.max(1, Math.round(sorted.length * 0.5)))];
      if (!player) continue;
      if (player.pos === "GK" && seller.squad.filter(p => p.pos === "GK").length <= 1) continue;

      // A buyer whose level fits the player, with room and money for the deal.
      const candidates = others().filter(c => c.id !== seller.id && c.squad.length < 32);
      const weights = candidates.map(c => {
        const expected = 54 + c.tier * 6;
        return 1 / (1 + Math.abs(player.rating - expected));
      });
      const buyer = weightedPick(candidates, weights);
      if (!buyer) continue;

      const fee = Math.max(0.2, Math.round(player.value * (0.75 + buyer.tier * 0.06) * 10) / 10);
      if (buyer.budget < fee) continue;

      buyer.budget = Math.round((buyer.budget - fee) * 10) / 10;
      seller.budget = Math.round((seller.budget + fee) * 10) / 10;
      seller.squad = seller.squad.filter(p => p.id !== player.id);
      this.guardMinimum(seller);
      Stats.ensure(player);
      buyer.squad.push({ ...player, club: buyer.id, stats: { ...player.stats }, bonus: { ...player.bonus }, career: { ...player.career } });
      seller.lineup = null; buyer.lineup = null;
      // Notable rival business makes the news.
      if (typeof News !== "undefined" && (fee >= 12 || player.rating >= 78)) {
        News.transfer(state, `${buyer.short} sign ${player.name} (${player.rating}) from ${seller.short} for £${fee}m.`);
      }
      // Drop any user-market listing referencing a player who's just moved.
      state.market = (state.market || []).filter(l => l.player.id !== player.id);
    }
  },

  guardMinimum(club) {
    const have = { GK: 0, DF: 0, MF: 0, FW: 0 };
    club.squad.forEach(p => have[p.pos]++);
    const floor = { GK: 1, DF: 3, MF: 2, FW: 1 };
    POSITIONS.forEach(pos => {
      while (have[pos] < floor[pos]) {
        const { name, nat } = homeProspect(LEAGUE_COUNTRY[club.league]);
        const age = 18 + Math.floor(Math.random() * 5);
        const p = P(name, pos, age, 55 + Math.floor(Math.random() * 8), { nat });
        p.club = club.id;
        club.squad.push(p);
        have[pos]++;
      }
    });
  },

  // ---- free agents -----------------------------------------------------------
  // A separate, always-open pool of clubless players. They carry only a small
  // signing fee (a fraction of a comparable transfer), can be signed at ANY
  // point in the season — window open or not — and skew weak: genuinely good
  // free agents are rare, and the best of them are ageing veterans.
  FREE_AGENT_CAP: 7,

  buildFreeAgent() {
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const { name, nat } = randomProspect();
    const roll = Math.random();
    let rating, age;
    if (roll < 0.015)      { rating = 85 + Math.floor(Math.random() * 4); age = 29 + Math.floor(Math.random() * 5); } // ~1.5% ageing star
    else if (roll < 0.07)  { rating = 77 + Math.floor(Math.random() * 5); age = 26 + Math.floor(Math.random() * 5); } // rare veteran quality
    else if (roll < 0.22)  { rating = 70 + Math.floor(Math.random() * 7); age = 24 + Math.floor(Math.random() * 10); }
    else if (roll < 0.55)  { rating = 62 + Math.floor(Math.random() * 8); age = 20 + Math.floor(Math.random() * 14); }
    else                   { rating = 50 + Math.floor(Math.random() * 8); age = 18 + Math.floor(Math.random() * 16); }
    const player = P(name, pos, age, rating, { nat });
    player.club = null;
    // Only a signing fee — no fee owed to a selling club — so ~12–28% of value.
    const fee = Math.max(0.1, Math.round(player.value * (0.12 + Math.random() * 0.16) * 10) / 10);
    return { listingId: "fa" + player.id, player, origin: null, originName: "Free agent", price: fee, freeAgent: true };
  },

  seedFreeAgents(state) {
    state.freeAgents = [];
    for (let i = 0; i < this.FREE_AGENT_CAP; i++) state.freeAgents.push(this.buildFreeAgent());
  },

  ensureFreeAgents(state) {
    if (!Array.isArray(state.freeAgents)) this.seedFreeAgents(state);
  },

  // Every matchweek (regardless of the transfer window): a few free agents sign
  // elsewhere or drift off the list, and fresh ones appear, keeping the pool
  // roughly at cap so there's always something available.
  freeAgentWeekly(state) {
    if (!Array.isArray(state.freeAgents)) state.freeAgents = [];
    state.freeAgents = state.freeAgents.filter(() => Math.random() > 0.18);
    const room = this.FREE_AGENT_CAP - state.freeAgents.length;
    const add = Math.min(room, Math.random() < 0.5 ? 2 : 1);
    for (let i = 0; i < add && state.freeAgents.length < this.FREE_AGENT_CAP; i++) state.freeAgents.push(this.buildFreeAgent());
  },

  // Sign a free agent — no transfer-window gate, just budget + squad room.
  signFreeAgent(state, listingId) {
    const club = Game.myClub();
    const idx = (state.freeAgents || []).findIndex(l => l.listingId === listingId);
    if (idx === -1) return { ok: false, reason: "That free agent has already moved on." };
    const listing = state.freeAgents[idx];
    if (club.budget < listing.price) return { ok: false, reason: "Not enough budget for the signing fee." };
    if (club.squad.length >= 32) return { ok: false, reason: "Your squad is full (32 players max)." };
    club.budget = Math.round((club.budget - listing.price) * 10) / 10;
    state.freeAgents.splice(idx, 1);
    Stats.ensure(listing.player);
    const player = { ...listing.player, club: club.id, transferListed: false, offers: [], stats: { ...listing.player.stats }, bonus: { ...listing.player.bonus }, career: { ...listing.player.career } };
    club.squad.push(player);
    club.lineup = null;
    return { ok: true, name: listing.player.name };
  },

  // ---- buy / sell ------------------------------------------------------------
  buy(state, listingId) {
    if (!TransferWindow.isOpen(state.week)) return { ok: false, reason: "The transfer window is closed." };
    const club = Game.myClub();
    const idx = state.market.findIndex(l => l.listingId === listingId);
    if (idx === -1) return { ok: false, reason: "That player is no longer available." };
    const listing = state.market[idx];
    if (club.budget < listing.price) return { ok: false, reason: "Not enough budget for this deal." };
    if (club.squad.length >= 32) return { ok: false, reason: "Your squad is full (32 players max)." };

    club.budget = Math.round((club.budget - listing.price) * 10) / 10;
    state.market.splice(idx, 1);

    if (listing.origin) {
      const originClub = state.clubs.find(c => c.id === listing.origin);
      if (originClub) {
        originClub.squad = originClub.squad.filter(p => p.id !== listing.player.id);
        this.guardMinimum(originClub);
        originClub.lineup = null;
      }
      // Remove any other listing referencing the same now-departed player.
      state.market = state.market.filter(l => l.player.id !== listing.player.id);
    }
    Stats.ensure(listing.player);
    const player = { ...listing.player, club: club.id, transferListed: false, offers: [], stats: { ...listing.player.stats }, bonus: { ...listing.player.bonus }, career: { ...listing.player.career } };
    club.squad.push(player);
    club.lineup = null;
    return { ok: true, name: listing.player.name, origin: listing.originName };
  },

  // ---- signing engine -------------------------------------------------------
  // How many players are spoken for but not yet in the squad.
  pendingCount(state) { return (state.pendingSignings || []).length; },

  // Core signing on agreed terms. Free agents (and any deal struck while a
  // window is open) join immediately; a fee-based deal agreed OUTSIDE the window
  // becomes a PRE-AGREED signing — the fee is paid now to reserve it and the
  // player joins the moment the next window opens. `deal` = { player, fee, wage,
  // years, originId, originName, freeAgent }.
  executeSigning(state, deal) {
    const club = Game.myClub();
    const pending = state.pendingSignings || (state.pendingSignings = []);
    if (club.squad.length + pending.length >= 32) return { ok: false, reason: "Your squad (incl. pending signings) is full — 32 max." };
    if (Contracts.wageRoom(club) < deal.wage) return { ok: false, reason: "Not enough room in your wage budget." };
    if (club.budget < deal.fee) return { ok: false, reason: "Not enough transfer budget for this deal." };

    const immediate = deal.freeAgent || TransferWindow.isOpen(state.week);

    // A real target is pulled out of their club — they're committed to you now.
    // (Foreign, strength-only clubs have no player-level squad to remove from.)
    if (deal.originId) {
      const origin = state.clubs.find(c => c.id === deal.originId);
      if (origin && origin.squad) { origin.squad = origin.squad.filter(p => p.id !== deal.player.id); this.guardMinimum(origin); origin.lineup = null; }
      state.market = (state.market || []).filter(l => l.player.id !== deal.player.id);
    }

    club.budget = Math.round((club.budget - deal.fee) * 10) / 10;
    Stats.ensure(deal.player);
    const signed = { ...deal.player, transferListed: false, offers: [], stats: { ...deal.player.stats }, bonus: { ...deal.player.bonus }, career: { ...deal.player.career } };
    Contracts.applyContract(signed, deal.wage, deal.years);
    if (typeof Morale !== "undefined") Morale.onSign(signed); // fresh signing settles in
    Contracts.clearNeg(state, deal.player.id);

    if (immediate) {
      signed.club = club.id;
      club.squad.push(signed);
      club.lineup = null;
      return { ok: true, immediate: true, name: signed.name };
    }
    signed.club = null; // joins when the window opens
    pending.push({ id: "pnd" + (_pndId++), player: signed, fee: deal.fee, originId: deal.originId || null, originName: deal.originName || "", wage: deal.wage, agreedWeek: state.week });
    return { ok: true, immediate: false, name: signed.name };
  },

  // Modal-driven signing from a market listing or the free-agent pool.
  completeSigning(state, ctx, wage, years) {
    const fromFree = ctx.source === "free" || ctx.kind === "free";
    const pool = fromFree ? (state.freeAgents || []) : (state.market || []);
    const idx = pool.findIndex(l => l.listingId === ctx.listingId);
    if (idx === -1) return { ok: false, reason: fromFree ? "That free agent has already moved on." : "That player is no longer available." };
    const listing = pool[idx];
    const res = this.executeSigning(state, {
      player: listing.player, fee: listing.price, wage, years,
      originId: fromFree ? null : listing.origin, originName: listing.originName, freeAgent: fromFree,
    });
    if (!res.ok) return res;
    const j = pool.findIndex(l => l.listingId === ctx.listingId); // may already be gone (real player stripped)
    if (j !== -1) pool.splice(j, 1);
    return { ...res, origin: listing.originName, fee: listing.price, freeAgent: fromFree };
  },

  // Pre-agreed signings land as the window opens (called from weeklyUpdate).
  completePending(state) {
    const club = Game.myClub();
    const pend = state.pendingSignings || [];
    if (!pend.length) return [];
    const arrivals = [];
    pend.forEach(pd => {
      if (club.squad.length >= 32) { club.budget = Math.round((club.budget + pd.fee) * 10) / 10; arrivals.push({ name: pd.player.name, refunded: true }); return; }
      const p = { ...pd.player, club: club.id };
      Stats.ensure(p);
      club.squad.push(p);
      arrivals.push({ name: p.name });
    });
    state.pendingSignings = [];
    club.lineup = null;
    return arrivals;
  },

  // Call off a pre-agreed deal: refund the reserved fee and hand the player back
  // to their old club if it's still around.
  cancelPending(state, id) {
    const pend = state.pendingSignings || [];
    const i = pend.findIndex(p => p.id === id);
    if (i === -1) return { ok: false };
    const pd = pend[i];
    const club = Game.myClub();
    club.budget = Math.round((club.budget + pd.fee) * 10) / 10;
    pend.splice(i, 1);
    if (pd.originId) {
      const origin = state.clubs.find(c => c.id === pd.originId);
      if (origin && !origin.strengthOnly) { const r = { ...pd.player, club: origin.id }; delete r.wageAgreed; origin.squad.push(r); origin.lineup = null; }
    }
    return { ok: true, name: pd.player.name, refund: pd.fee };
  },

  // Re-sign an existing squad player on new terms (no fee; only the wage delta
  // moves against the wage budget).
  renewContract(state, playerId, wage, years) {
    const club = Game.myClub();
    const p = club.squad.find(pl => pl.id === playerId);
    if (!p) return { ok: false, reason: "That player is no longer at the club." };
    if (wage > Contracts.wageRoom(club) + Contracts.effWage(p)) return { ok: false, reason: "Not enough room in your wage budget." };
    Contracts.applyContract(p, wage, years);
    if (typeof Morale !== "undefined") Morale.onRenew(p); // a new deal lifts spirits
    Contracts.clearNeg(state, playerId);
    return { ok: true, name: p.name };
  },
};

// Weighted random pick from a parallel list of items and weights.
function weightedPick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  if (!items.length || total <= 0) return items[0] || null;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}