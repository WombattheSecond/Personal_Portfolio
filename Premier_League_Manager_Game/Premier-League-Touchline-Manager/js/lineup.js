/* =========================================================================
   PLFC TOUCHLINE MANAGER — LINEUP
   Formation handling and best-XI auto-pick.
   ========================================================================= */

   const Lineup = {
    emptyLineup(formationKey) {
      const req = FORMATIONS[formationKey];
      return {
        formation: formationKey,
        slots: { GK: new Array(req.GK).fill(null), DF: new Array(req.DF).fill(null), MF: new Array(req.MF).fill(null), FW: new Array(req.FW).fill(null) },
        bench: [],
      };
    },
  
    autoPick(club, formationKey) {
      // Strength-only foreign clubs have no players to pick — they never field
      // a stored XI (they're simulated from a single strength rating).
      if (club.strengthOnly || !club.squad || !club.squad.length) return club.lineup || null;
      formationKey = formationKey || club.formation || "4-4-2";
      const req = FORMATIONS[formationKey];
      const lineup = this.emptyLineup(formationKey);
      const used = new Set();
  
      // Injured or suspended players can't be selected.
      const available = p => !p.injuryWeeks && !p.suspendedMatches;
      const slotsFor = (typeof Positions !== "undefined") && Positions.FORMATION_SLOTS[formationKey];
      POSITIONS.forEach(pos => {
        const pool = club.squad.filter(p => p.pos === pos && available(p));
        const detailed = slotsFor && slotsFor[pos];
        for (let i = 0; i < req[pos]; i++) {
          // Fill each detailed slot with the best remaining player of this line,
          // scored by rating × positional fit — so a natural left-back takes the
          // LB slot over a marginally higher-rated centre-back, and a squad short
          // in a position covers it with the nearest fit rather than leaving a hole.
          const slotPos = detailed ? detailed[i] : pos;
          let best = null, bestScore = -Infinity;
          for (const p of pool) {
            if (used.has(p.id)) continue;
            // Score on the ENERGY-adjusted rating, so tired legs are rotated out
            // for fresher players of similar quality, and by positional fit.
            const base = typeof Fitness !== "undefined" && Fitness.effRating ? Fitness.effRating(p) : p.rating;
            const score = base * (typeof Positions !== "undefined" ? Positions.familiarity(p, slotPos) : 1);
            if (score > bestScore) { bestScore = score; best = p; }
          }
          if (best) { lineup.slots[pos][i] = best.id; used.add(best.id); }
        }
      });

      // Bench: best remaining players, up to 7, at least one spare keeper if possible.
      const eff = p => typeof Fitness !== "undefined" && Fitness.effRating ? Fitness.effRating(p) : p.rating;
      const rest = club.squad.filter(p => !used.has(p.id) && available(p)).sort((a, b) => eff(b) - eff(a));
      lineup.bench = rest.slice(0, 7).map(p => p.id);
  
      club.formation = formationKey;
      club.lineup = lineup;
      return lineup;
    },
  
    starterIds(lineup) {
      return [...lineup.slots.GK, ...lineup.slots.DF, ...lineup.slots.MF, ...lineup.slots.FW].filter(Boolean);
    },
  
    starters(club) {
      if (club.strengthOnly || !club.squad || !club.squad.length) return [];
      const lineup = club.lineup || this.autoPick(club);
      if (!lineup) return [];
      const ids = this.starterIds(lineup);
      return ids.map(id => club.squad.find(p => p.id === id)).filter(Boolean);
    },
  
    isComplete(lineup) {
      return Object.values(lineup.slots).every(arr => arr.every(id => id !== null));
    },
  
    // Assign a player to a slot, swapping out anyone already there (back to bench).
    assign(club, pos, index, playerId) {
      const lineup = club.lineup;
      const prev = lineup.slots[pos][index];
      // Remove the incoming player from wherever else it currently sits.
      POSITIONS.forEach(p => {
        lineup.slots[p] = lineup.slots[p].map(id => (id === playerId ? null : id));
      });
      lineup.bench = lineup.bench.filter(id => id !== playerId);
      lineup.slots[pos][index] = playerId;
      if (prev && prev !== playerId && !lineup.bench.includes(prev)) lineup.bench.push(prev);
    },
  
    removeFromBench(club, playerId) {
      club.lineup.bench = club.lineup.bench.filter(id => id !== playerId);
    },
  
    addToBench(club, playerId) {
      if (!club.lineup.bench.includes(playerId)) club.lineup.bench.push(playerId);
    },
  };