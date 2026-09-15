/* =========================================================================
   PLFC TOUCHLINE MANAGER — YOUTH ACADEMY
   An autonomous talent pipeline for the user's club. A youth SCOUT unearths a
   prospect four times a season (aged 10–16, with a ceiling set by the scout's
   rating); a youth COACH develops the prospects through the season (by the
   coach's rating). At 18 a prospect graduates: if there's room it can be
   promoted to the senior squad, otherwise you get three matchweeks to clear a
   place or the talent leaves on a free — and you can always decline a graduate,
   in which case another club signs them for nothing. Staff are hired from the
   Staff market. Only the user's club runs an academy.
   ========================================================================= */

const ACADEMY_INTAKE_WEEKS = [4, 13, 22, 31]; // four scout intakes per season
const ACADEMY_CAP = 16;                        // most prospects held at once
const ACADEMY_GRAD_DEADLINE = 3;               // matchweeks to resolve a graduate
const SENIOR_SQUAD_MAX = 32;

const Academy = {
  init(club) {
    club.academy = {
      scout: makeYouthStaff("scout", Coaching.tierCoachRating(club.tier)),
      coach: makeYouthStaff("youthcoach", Coaching.tierCoachRating(club.tier)),
      prospects: [],
      pending: [],
    };
  },
  ensure(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (club && !club.academy) this.init(club);
  },

  scoutRating(club) { return club.academy && club.academy.scout ? club.academy.scout.rating : 50; },
  coachRating(club) { return club.academy && club.academy.coach ? club.academy.coach.rating : 50; },

  // The scout brings in a 10–16-year-old whose potential reflects their rating.
  intake(club) {
    const a = club.academy;
    if (!a || !a.scout) return null;
    const age = 10 + Math.floor(Math.random() * 7); // 10–16
    const potential = clamp(this.scoutRating(club) - 12 + Math.floor(Math.random() * 22), 45, 96);
    const rating = clamp(38 + (age - 10) * 2 + Math.floor(Math.random() * 5), 35, potential - 4);
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const { name, nat } = homeProspect(LEAGUE_COUNTRY[club.league]); // youth from your own country
    const p = P(name, pos, age, rating, { nat, potential });
    p.club = club.id;
    p.academy = true;
    a.prospects.push(p);
    if (a.prospects.length > ACADEMY_CAP) {
      a.prospects.sort((x, y) => y.potential - x.potential);
      a.prospects.length = ACADEMY_CAP; // scout keeps only the most promising
    }
    return p;
  },

  // Each matchweek: scout intake (on schedule), youth-coach development, and
  // resolve any graduates whose deadline has come. Records notable news.
  weekly(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    state.academyNews = [];
    if (!club || !club.academy) return;
    const a = club.academy;
    a.prospects = a.prospects || [];
    a.pending = a.pending || [];

    if (ACADEMY_INTAKE_WEEKS.includes(state.week)) {
      const p = this.intake(club);
      if (p) state.academyNews.push(`🎓 Academy scout signs ${p.name} (age ${p.age}, potential ${p.potential})`);
    }

    // Youth-coach development — better coaches raise prospects faster.
    const pGain = clamp((this.coachRating(club) / 100) * 0.35, 0.05, 0.5);
    a.prospects.forEach(p => { if (p.rating < p.potential && Math.random() < pGain) p.rating++; });

    // Resolve graduates at their deadline: promote if there's room, else lost free.
    const remaining = [];
    a.pending.forEach(g => {
      if (state.week >= g.deadline) {
        if (club.squad.length < SENIOR_SQUAD_MAX) {
          this.promoteToSquad(club, g);
          state.academyNews.push(`🎓 ${g.name} promoted to the senior squad`);
        } else {
          state.academyNews.push(`⚠️ Lost academy graduate ${g.name} on a free — no room in the squad`);
        }
      } else remaining.push(g);
    });
    a.pending = remaining;
  },

  promoteToSquad(club, grad) {
    const { deadline, ...player } = grad;
    player.academy = false;
    player.transferListed = false;
    player.offers = [];
    Stats.ensure(player);
    club.squad.push(player);
    club.lineup = null;
  },

  // Manual actions from the Academy UI.
  promote(state, id) {
    const club = Game.myClub();
    const a = club.academy || {};
    const i = (a.pending || []).findIndex(g => g.id === id);
    if (i === -1) return { ok: false, reason: "Not available." };
    if (club.squad.length >= SENIOR_SQUAD_MAX) return { ok: false, reason: "Senior squad is full (32) — sell a player first." };
    const g = a.pending.splice(i, 1)[0];
    this.promoteToSquad(club, g);
    return { ok: true, name: g.name };
  },
  release(state, id) {
    const club = Game.myClub();
    const a = club.academy || {};
    let i = (a.pending || []).findIndex(g => g.id === id);
    if (i >= 0) return { ok: true, name: a.pending.splice(i, 1)[0].name };
    i = (a.prospects || []).findIndex(p => p.id === id);
    if (i >= 0) return { ok: true, name: a.prospects.splice(i, 1)[0].name };
    return { ok: false };
  },

  // Season rollover: prospects age a year; those turning 18 become graduates
  // awaiting a decision (three matchweeks into the new season).
  seasonRollover(state) {
    const club = state.clubs.find(c => c.id === state.clubId);
    if (!club || !club.academy) return;
    const a = club.academy;
    a.pending = a.pending || [];
    const stay = [];
    (a.prospects || []).forEach(p => {
      p.age++;
      if (p.age >= 18) a.pending.push({ ...p, academy: false, deadline: ACADEMY_GRAD_DEADLINE });
      else stay.push(p);
    });
    a.prospects = stay;
    a.pending.forEach(g => { g.deadline = ACADEMY_GRAD_DEADLINE; }); // fresh window each new season
  },
};
