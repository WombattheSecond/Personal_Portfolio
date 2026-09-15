/* =========================================================================
   PLFC TOUCHLINE MANAGER — COACHING STAFF
   Every club fields a position coach for each unit (GK, DF, MF, FW). Coach
   quality is the PRIMARY driver of how fast a club's players develop toward
   (or hold off decline from) their potential — season results only nudge it,
   though a dramatic overachievement still pays off big. The user upgrades
   their staff from a coaches market that refreshes on its own every matchweek
   (no manual reroll — you wait for next week's names).
   ========================================================================= */

let _coachId = 1;

function makeCoach(pos, rating) {
  const { name } = randomProspect();
  return { id: "co" + (_coachId++), name, pos, role: pos, rating: Math.max(40, Math.min(95, Math.round(rating))) };
}

// Youth-academy staff: a scout (finds prospects) or a youth coach (develops
// them). role is "scout" or "youthcoach".
function makeYouthStaff(role, rating) {
  const { name } = randomProspect();
  return { id: "st" + (_coachId++), name, role, rating: Math.max(40, Math.min(96, Math.round(rating))) };
}

const Coaching = {
  DEFAULT_RATING: 52,

  // AI/starting coach quality scales with club reputation tier.
  tierCoachRating(tier) { return 48 + tier * 7 + Math.floor(Math.random() * 5); },

  initClubCoaches(club) {
    club.coaches = {};
    POSITIONS.forEach(pos => { club.coaches[pos] = makeCoach(pos, this.tierCoachRating(club.tier)); });
  },
  ensureAll(state) { state.clubs.forEach(c => { if (!c.coaches && !c.strengthOnly) this.initClubCoaches(c); }); },

  ratingFor(club, pos) {
    const c = club && club.coaches && club.coaches[pos];
    return c ? c.rating : this.DEFAULT_RATING;
  },

  // Development multiplier applied to a player's growth: a weak coach (~45)
  // barely develops anyone; an elite coach (~90+) nearly doubles growth.
  growthMultiplier(club, pos) {
    return clamp((this.ratingFor(club, pos) - 40) / 35, 0.3, 2.0);
  },

  // A short descriptor for the UI.
  ratingLabel(rating) {
    if (rating >= 85) return "World-class";
    if (rating >= 75) return "Excellent";
    if (rating >= 66) return "Very good";
    if (rating >= 57) return "Solid";
    if (rating >= 50) return "Average";
    return "Basic";
  },

  ROLE_LABEL: { GK: "Goalkeeping", DF: "Defence", MF: "Midfield", FW: "Attack", scout: "Youth Scout", youthcoach: "Youth Coach", talentscout: "Talent Scout", physio: "Physio" },
  isYouth(role) { return role === "scout" || role === "youthcoach"; },
  // Backroom staff (youth staff, recruitment scouts, physios) cost the "investment" premium.
  isBackroom(role) { return this.isYouth(role) || role === "talentscout" || role === "physio"; },

  // Youth staff cost more than position coaches — a top scout/academy coach is
  // a real investment.
  cost(rating, role) {
    const base = Math.max(0.3, Math.round(Math.pow(Math.max(0, rating - 45), 1.45) * 0.05 * 10) / 10);
    return this.isBackroom(role) ? Math.round(base * 1.4 * 10) / 10 : base;
  },

  // Fresh candidates each matchweek — position coaches plus youth staff. No
  // reroll button; you wait for next week's names.
  weeklyMarket(state) {
    const list = [];
    const rate = () => { const r = Math.random(); return r < 0.08 ? 82 + Math.floor(Math.random() * 12) : r < 0.4 ? 64 + Math.floor(Math.random() * 16) : 48 + Math.floor(Math.random() * 16); };
    const n = 6 + Math.floor(Math.random() * 4); // 6–9 position coaches
    for (let i = 0; i < n; i++) list.push(makeCoach(POSITIONS[Math.floor(Math.random() * POSITIONS.length)], rate()));
    const yn = 2 + Math.floor(Math.random() * 3); // 2–4 youth staff
    for (let i = 0; i < yn; i++) list.push(makeYouthStaff(Math.random() < 0.5 ? "scout" : "youthcoach", rate()));
    if (Math.random() < 0.6) list.push(makeYouthStaff("talentscout", rate())); // a recruitment scout most weeks
    if (Math.random() < 0.55) list.push(makeYouthStaff("physio", rate()));      // a physio most weeks
    const order = ["GK", "DF", "MF", "FW", "scout", "youthcoach", "talentscout", "physio"];
    list.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || b.rating - a.rating);
    state.coachMarket = list;
  },

  hire(state, coachId) {
    const club = Game.myClub();
    const idx = (state.coachMarket || []).findIndex(c => c.id === coachId);
    if (idx === -1) return { ok: false, reason: "That staff member is no longer available." };
    const staff = state.coachMarket[idx];
    const price = this.cost(staff.rating, staff.role);
    if (club.budget < price) return { ok: false, reason: "Not enough budget to hire this staff member." };
    club.budget = Math.round((club.budget - price) * 10) / 10;
    if (staff.role === "scout") { if (!club.academy) Academy.init(club); club.academy.scout = staff; }
    else if (staff.role === "youthcoach") { if (!club.academy) Academy.init(club); club.academy.coach = staff; }
    else if (staff.role === "talentscout") {
      Scouting.ensure(state);
      const team = club.scouting.scouts;
      const hired = { id: staff.id, name: staff.name, rating: staff.rating, busyUntil: null, assignment: null };
      if (team.length < Scouting.CAP) team.push(hired);
      else { team.sort((a, b) => a.rating - b.rating); team[0] = hired; } // swap out the weakest
    }
    else if (staff.role === "physio") { club.physio = staff; }
    else club.coaches[staff.role] = staff; // position coach
    state.coachMarket.splice(idx, 1);
    return { ok: true, name: staff.name, role: staff.role, price };
  },
};
