/* =========================================================================
   PLFC TOUCHLINE MANAGER — DETAILED POSITIONS
   Ten real positions (GK, LB/CB/RB, CDM/CM/CAM, LW/RW/ST) layered on top of the
   four broad lines the rest of the engine already uses. Every player has a
   natural detailed position (`dpos`, derived deterministically from their id so
   nothing new is stored) and can be played ANYWHERE — but the further a slot is
   from their natural spot, the less effective they are (a CM makes a fine CDM, a
   striker makes a poor one). No per-player role micromanagement: the position IS
   the role, so signings and subs stay simple — "can they cover here, and how well?"
   ========================================================================= */

const Positions = {
  ALL: ["GK", "LB", "CB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST"],
  // line: 0 GK … 5 striker; flank: −1 left, 0 central, +1 right.
  META: {
    GK: { l: 0, f: 0 }, LB: { l: 1, f: -1 }, CB: { l: 1, f: 0 }, RB: { l: 1, f: 1 },
    CDM: { l: 2, f: 0 }, CM: { l: 3, f: 0 }, CAM: { l: 4, f: 0 },
    LW: { l: 4.3, f: -1 }, RW: { l: 4.3, f: 1 }, ST: { l: 5, f: 0 },
  },
  BROAD: { GK: "GK", LB: "DF", CB: "DF", RB: "DF", CDM: "MF", CM: "MF", CAM: "MF", LW: "FW", RW: "FW", ST: "FW" },

  // Which detailed position each broad line's players lean toward — used only to
  // spread a squad's players across real positions deterministically.
  SPREAD: { DF: [["CB", 0.50], ["LB", 0.25], ["RB", 0.25]], MF: [["CDM", 0.28], ["CM", 0.44], ["CAM", 0.28]], FW: [["ST", 0.54], ["LW", 0.23], ["RW", 0.23]] },

  // Detailed labels for every slot of every formation, aligned to FORMATION_LAYOUT
  // order (GK, then the DF / MF / FW groups left-to-right) so slot index N in a
  // group maps straight onto the pitch coordinate at the same index.
  FORMATION_SLOTS: {
    "4-4-2":   { GK: ["GK"], DF: ["LB", "CB", "CB", "RB"], MF: ["LW", "CM", "CM", "RW"], FW: ["ST", "ST"] },
    "4-3-3":   { GK: ["GK"], DF: ["LB", "CB", "CB", "RB"], MF: ["CM", "CDM", "CM"], FW: ["LW", "ST", "RW"] },
    "4-2-3-1": { GK: ["GK"], DF: ["LB", "CB", "CB", "RB"], MF: ["CDM", "CDM", "LW", "CAM", "RW"], FW: ["ST"] },
    "3-5-2":   { GK: ["GK"], DF: ["CB", "CB", "CB"], MF: ["LW", "CM", "CDM", "CM", "RW"], FW: ["ST", "ST"] },
    "5-3-2":   { GK: ["GK"], DF: ["LB", "CB", "CB", "CB", "RB"], MF: ["CM", "CDM", "CM"], FW: ["ST", "ST"] },
    "4-5-1":   { GK: ["GK"], DF: ["LB", "CB", "CB", "RB"], MF: ["LW", "CM", "CDM", "CM", "RW"], FW: ["ST"] },
  },

  _hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); },

  broad(dpos) { return this.BROAD[dpos] || "MF"; },

  // A player's natural detailed position, derived from their broad pos + id hash
  // so a squad gets a realistic spread (≈half its defenders centre-backs, the
  // rest split between full-backs, etc.) without storing anything new.
  dposOf(p) {
    if (!p) return "CM";
    if (p.dpos && this.META[p.dpos]) return p.dpos;
    if (p.pos === "GK") return "GK";
    const table = this.SPREAD[p.pos] || this.SPREAD.MF;
    let r = (this._hash(p.id || p.name || "x") % 1000) / 1000, acc = 0;
    for (const [pos, w] of table) { acc += w; if (r < acc) return pos; }
    return table[0][0];
  },

  // 0.30–1.00 fitness of a player (by natural position) for a given slot.
  // 1.00 only when it's their natural spot; adjacent spots stay high, far ones drop.
  fit(slot, dpos) {
    if (slot === dpos) return 1;
    const a = this.META[slot], b = this.META[dpos];
    if (!a || !b) return 0.7;
    if (slot === "GK" || dpos === "GK") return 0.2; // keepers don't swap with outfield
    let d = 0.145 * Math.abs(a.l - b.l) + 0.11 * Math.abs(a.f - b.f);
    if (a.f !== 0 && a.f === b.f) d *= 0.72; // same flank (full-back ↔ winger) costs less
    return clamp(1 - d, 0.3, 0.95);
  },
  // A NATURAL secondary position some players are born comfortable in (Rodri at
  // CM+CDM, say). ~40% of outfielders get one — the strongest adjacent spot —
  // deterministically from their id, so it's stable and costs nothing to store.
  nativeSecondary(p) {
    if (!p) return null;
    const prim = this.dposOf(p);
    if (prim === "GK") return null;
    const h = this._hash((p.id || p.name || "x") + "~sec");
    if ((h % 100) >= 40) return null; // ~40% are two-footed positionally
    const opts = this.ALL.filter(s => s !== prim && s !== "GK" && this.fit(s, prim) >= 0.82);
    if (!opts.length) return null;
    return opts[(Math.floor(h / 100)) % opts.length];
  },
  isNative(p, dpos) { return dpos === this.dposOf(p) || this.nativeSecondary(p) === dpos; },

  // How well a player KNOWS a position (0–1). Native spots are 1.0; anywhere else
  // starts at the innate proximity fit and climbs toward 1.0 as they log games
  // there (stored progress `p.posProg[dpos]`, 0–1). So a CM asked to play CDM is
  // decent from day one and masters it over a run of matches.
  familiarity(p, dpos) {
    if (this.isNative(p, dpos)) return 1;
    const base = this.fit(dpos, this.dposOf(p));
    const prog = (p.posProg && p.posProg[dpos]) || 0;
    return clamp(base + (1 - base) * prog, 0, 1);
  },
  // How a player's contribution scales when played in `slot` (never below ~0.68),
  // using their learned FAMILIARITY so improvement over time shows up in results.
  fitFactor(slot, p) { return 0.55 + 0.45 * this.familiarity(p, slot); },

  // Spots a player is genuinely comfortable in (familiarity ≥ 0.82) — natives plus
  // anywhere they've trained up. Grows as they play new positions.
  canPlay(p) {
    const prim = this.dposOf(p);
    return this.ALL.filter(s => this.familiarity(p, s) >= 0.82)
      .sort((x, y) => (x === prim ? -1 : y === prim ? 1 : this.familiarity(p, y) - this.familiarity(p, x)));
  },

  // Log a match at a position: nudges progress toward mastery. Closer positions
  // are learned much faster (prox²), so a CM masters CDM in ~15 games while a
  // striker barely learns centre-back in a career. Natives don't train (already 1).
  trainPosition(p, dpos, minutes) {
    if (!p || !dpos || dpos === "GK" || this.isNative(p, dpos)) return 0;
    const prox = this.fit(dpos, this.dposOf(p));
    // ~8 full games to master a near position (CM→CDM), ~20–25 for a far one
    // (CB→ST): slow, but possible — the Christopher Samba / Adam Virgo switch.
    const gain = 0.16 * clamp((minutes || 0) / 90, 0, 1) * Math.pow(prox, 1.5);
    if (!p.posProg) p.posProg = {};
    const cur = p.posProg[dpos] || 0;
    const nv = Math.min(1, cur + gain);
    if (nv > cur + 0.0005) { p.posProg[dpos] = Math.round(nv * 1000) / 1000; return nv - cur; }
    return 0;
  },

  // A compact "CM/CDM/CAM" or "CB/LB" style label of the positions a player is a
  // genuine specialist in — their primary, a natural secondary, and any spot
  // they've trained up to comfortable. Specialists show one; versatile players 2–3.
  roleLabel(p) {
    if (!p) return "";
    const prim = this.dposOf(p);
    const set = [prim];
    const sec = this.nativeSecondary(p); if (sec && !set.includes(sec)) set.push(sec);
    if (p.posProg) Object.keys(p.posProg).forEach(dp => { if (!set.includes(dp) && this.familiarity(p, dp) >= 0.82) set.push(dp); });
    set.sort((a, b) => (a === prim ? -1 : b === prim ? 1 : this.familiarity(p, b) - this.familiarity(p, a)));
    return set.slice(0, 4).join("/");
  },

  // {playerId: slotDetailedPos} for a club's current XI — the map the match engine
  // reads to apply out-of-position penalties. Bench/unused players aren't included.
  slotMap(club) {
    const out = {};
    const lu = club && club.lineup; if (!lu || !lu.slots) return out;
    const fs = this.FORMATION_SLOTS[lu.formation] || this.FORMATION_SLOTS["4-4-2"];
    ["GK", "DF", "MF", "FW"].forEach(group => {
      (lu.slots[group] || []).forEach((id, i) => { if (id) out[id] = (fs[group] && fs[group][i]) || group; });
    });
    return out;
  },
  // The detailed label for the i-th slot of a broad group in a formation.
  slotLabel(formation, group, i) { const fs = this.FORMATION_SLOTS[formation] || this.FORMATION_SLOTS["4-4-2"]; return (fs[group] && fs[group][i]) || group; },
};
