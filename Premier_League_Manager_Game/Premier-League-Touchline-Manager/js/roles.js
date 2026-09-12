/* =========================================================================
   PLFC TOUCHLINE MANAGER — PLAYER ROLES & INSTRUCTIONS
   Tap a player on the lineup pitch to shape how they play. Everything is
   plain-English and position-aware — each player only sees the instructions that
   make sense for where they play. Data-driven: every dial option and toggle
   carries an `fx` delta, and `sideEffect` just sums them, so all of it genuinely
   moves the match. `p.instr` is only stored when it differs from default (tiny;
   user club only), so there's no migration and no bloat.
   ========================================================================= */

const PlayerRoles = {
  // Three-way "style" dials. `wide` only shows for wide players. Middle option
  // (index 1) is always the default. `pos` limits a dial to certain positions.
  DIALS: [
    { key: "pos", label: "Positioning", opts: [
      { k: "back", label: "Stay Back", desc: "Holds position and defends first.", fx: { att: -0.010, def: 0.013 } },
      { k: "balanced", label: "Balanced", desc: "Sticks to their normal position.", fx: {} },
      { k: "forward", label: "Get Forward", desc: "Pushes higher to join attacks — leaves a little space behind.", fx: { att: 0.014, def: -0.012 } },
    ] },
    { key: "ball", label: "On the Ball", opts: [
      { k: "safe", label: "Keep It Simple", desc: "Short, safe passing — keeps the ball, lower risk.", fx: { poss: 2.0, cf: -0.02, ca: -0.02 } },
      { k: "balanced", label: "Balanced", desc: "Mixes it up as the game demands.", fx: {} },
      { k: "direct", label: "Play Direct", desc: "Longer, forward passes — more attacking, more turnovers.", fx: { poss: -2.2, cf: 0.03, ca: 0.015 } },
    ] },
    { key: "free", label: "Creative Freedom", opts: [
      { k: "disciplined", label: "Disciplined", desc: "Sticks to the plan — safe and reliable.", fx: { cf: -0.015, ca: -0.02, poss: 1 } },
      { k: "balanced", label: "Balanced", desc: "Picks the right moments.", fx: {} },
      { k: "express", label: "Express Yourself", desc: "Tries the ambitious ball — more creation, more turnovers.", fx: { cf: 0.03, ca: 0.02, poss: -1 } },
    ] },
    { key: "width", label: "Width", wide: true, opts: [
      { k: "inside", label: "Cut Inside", desc: "Drifts infield to get on the ball and shoot.", fx: { cf: 0.02, ca: 0.005 } },
      { k: "balanced", label: "Balanced", desc: "Judges when to go outside or in.", fx: {} },
      { k: "wide", label: "Stay Wide", desc: "Hugs the touchline to stretch the pitch.", fx: { att: 0.006, cf: 0.02, poss: -1 } },
    ] },
  ],

  // On/off instructions. `pos` = the detailed positions they're offered to.
  TOGGLES: [
    { key: "shoot",   label: "Shoot on Sight", icon: "🎯", desc: "Backs themselves from distance — more long-range efforts.", pos: ["LB","CB","RB","CDM","CM","CAM","LW","RW","ST"], flag: "shoot" },
    { key: "press",   label: "Press Hard",     icon: "🔥", desc: "Hounds the ball high up the pitch — wins it back sooner, tires quicker.", pos: ["LB","CB","RB","CDM","CM","CAM","LW","RW","ST"], fx: { press: 0.02, drain: 0.03 } },
    { key: "aggro",   label: "Hard Tackling",  icon: "🦵", desc: "Flies into challenges, unafraid to foul — wins more balls, risks cards.", pos: ["LB","CB","RB","CDM","CM","CAM","LW","RW","ST"], fx: { def: 0.006 }, flag: "aggro" },
    { key: "mark",    label: "Mark Tight",     icon: "🔒", desc: "Sticks to an opponent — harder to get past, but can be dragged out.", pos: ["LB","CB","RB","CDM"], fx: { def: 0.012, ca: -0.015, att: -0.004 } },
    { key: "overlap", label: "Overlap",        icon: "🏃", desc: "Bombs on down the flank to support the attack.", pos: ["LB","RB"], fx: { att: 0.012, def: -0.010, cf: 0.015 } },
    { key: "bringout",label: "Bring Ball Out", icon: "🧲", desc: "Steps out and carries the ball forward to start moves.", pos: ["CB","CDM"], fx: { poss: 2, cf: 0.01, ca: 0.006 } },
    { key: "ballwin", label: "Win Ball Back",  icon: "🛡️", desc: "Screens the defence and breaks up play.", pos: ["CDM","CM"], fx: { def: 0.010, press: 0.01, drain: 0.02 } },
    { key: "killer",  label: "Killer Passes",  icon: "🗝️", desc: "Looks for the defence-splitting through ball.", pos: ["CDM","CM","CAM"], fx: { cf: 0.025, ca: 0.008 } },
    { key: "getbox",  label: "Get in the Box", icon: "📥", desc: "Makes late runs into the area to get on the end of things.", pos: ["CM","CAM","LW","RW"], fx: { cf: 0.02 } },
    { key: "dribble", label: "Dribble More",   icon: "⚡", desc: "Takes defenders on 1-v-1 — flair, but can lose it.", pos: ["LB","RB","CAM","LW","RW","ST"], fx: { cf: 0.02, ca: 0.008, poss: -0.5 } },
    { key: "behind",  label: "Run in Behind",  icon: "🎿", desc: "Makes runs beyond the last defender for through-balls.", pos: ["CAM","LW","RW","ST"], fx: { att: 0.006, cf: 0.025 } },
    { key: "holdup",  label: "Hold Up Play",   icon: "🧱", desc: "Backs into defenders and brings team-mates into play.", pos: ["ST","CAM"], fx: { poss: 2, cf: 0.01, att: 0.004 } },
    { key: "sweep",   label: "Sweeper Keeper", icon: "🧤", desc: "Comes off the line to mop up balls in behind.", pos: ["GK"], fx: { def: 0.006, ca: 0.006 } },
    { key: "distrib", label: "Quick Distribution", icon: "🎯", desc: "Starts attacks fast with sharp throws and passes.", pos: ["GK"], fx: { poss: 1.5, cf: 0.008 } },
  ],

  _isDefault(i) { return this.DIALS.every(d => i[d.key] === this.DEFAULT[d.key]) && this.TOGGLES.every(t => !i[t.key]); },

  // Instructions belong to a POSITION on the club, not a specific player — set the
  // "CB role" and whoever you field at centre-back plays it. Stored on
  // `club.roleInstr[dpos]`, only when it differs from default.
  ofPos(club, dpos) { return { ...this.DEFAULT, ...((club && club.roleInstr && club.roleInstr[dpos]) || {}) }; },
  isSetPos(club, dpos) { return !this._isDefault(this.ofPos(club, dpos)); },
  setPos(club, dpos, key, val) {
    if (!club.roleInstr) club.roleInstr = {};
    const i = this.ofPos(club, dpos); i[key] = val;
    if (this._isDefault(i)) delete club.roleInstr[dpos]; else club.roleInstr[dpos] = i;
  },
  resetPos(club, dpos) { if (club.roleInstr) delete club.roleInstr[dpos]; },
  // The dials / toggles a given detailed position is actually offered.
  dialsFor(dpos) { return this.DIALS.filter(d => (!d.wide || ["LB", "RB", "LW", "RW"].includes(dpos)) && (!d.pos || d.pos.includes(dpos)) && dpos !== "GK"); },
  togglesFor(dpos) { return this.TOGGLES.filter(t => t.pos.includes(dpos)); },

  // Coverage zone on a vertical pitch (percent; y≈90 = own goal, attacking up).
  BASE: {
    GK: [50, 90, 30, 12], CB: [50, 75, 46, 15], LB: [19, 73, 26, 22], RB: [81, 73, 26, 22],
    CDM: [50, 62, 46, 18], CM: [50, 50, 48, 26], CAM: [50, 37, 42, 22],
    LW: [19, 31, 26, 30], RW: [81, 31, 26, 30], ST: [50, 22, 36, 24],
  },
  coverage(dpos, instr) {
    const b = this.BASE[dpos] || this.BASE.CM;
    let cx = b[0], cy = b[1], w = b[2], h = b[3];
    if (instr.pos === "forward") { cy -= 13; h += 8; } else if (instr.pos === "back") { cy += 9; h += 5; }
    if (instr.overlap) { cy -= 10; h += 6; }
    if (instr.behind) { cy -= 6; h += 4; }
    if (instr.getbox) { cy -= 4; }
    if (instr.press) { cy -= 4; w += 8; h += 4; }
    if (instr.width === "wide") { cx += cx < 50 ? -8 : 8; w += 4; }
    else if (instr.width === "inside") { cx += cx < 50 ? 13 : -13; w += 2; }
    if (instr.dribble) { w += 4; }
    return { cx: clamp(cx, 11, 89), cy: clamp(cy, 8, 92), w: clamp(w, 18, 66), h: clamp(h, 10, 54) };
  },

  // Plain-English one-liner of what the player in this position will do.
  summaryPos(club, dpos) {
    const i = this.ofPos(club, dpos), bits = [];
    if (i.pos === "forward") bits.push("gets forward"); else if (i.pos === "back") bits.push("holds position");
    if (i.width === "wide") bits.push("stays wide"); else if (i.width === "inside") bits.push("cuts inside");
    if (i.ball === "safe") bits.push("keeps it simple"); else if (i.ball === "direct") bits.push("plays direct");
    if (i.free === "express") bits.push("expresses himself"); else if (i.free === "disciplined") bits.push("stays disciplined");
    const togWords = { overlap: "overlaps", bringout: "brings it out", ballwin: "wins the ball back", killer: "plays killer balls", getbox: "gets in the box", dribble: "dribbles", behind: "runs in behind", holdup: "holds it up", mark: "marks tight", shoot: "shoots on sight", press: "presses hard", aggro: "tackles hard", sweep: "sweeps behind", distrib: "distributes quickly" };
    this.TOGGLES.forEach(t => { if (i[t.key] && togWords[t.key]) bits.push(togWords[t.key]); });
    if (!bits.length) return "Plays the position's natural game.";
    return "Whoever plays here " + bits.join(", ") + ".";
  },

  // Per-side aggregate the match engine reads. Each on-pitch player's instructions
  // come from the POSITION they're filling (`slotOf` → `club.roleInstr[slotPos]`),
  // so it's the SPOT that carries the instructions, not the individual player.
  sideEffect(onArr, slotOf, club) {
    const acc = { att: 0, def: 0, cf: 0, ca: 0, poss: 0, press: 0, drain: 0, foul: 0 };
    const shootIds = new Set(), aggroIds = new Set();
    const add = fx => { if (!fx) return; for (const k in fx) acc[k] = (acc[k] || 0) + fx[k]; };
    for (const p of onArr || []) {
      const dpos = (slotOf && slotOf[p.id]) || (typeof Positions !== "undefined" ? Positions.dposOf(p) : null);
      const raw = club && club.roleInstr && club.roleInstr[dpos]; if (!raw) continue;
      const I = { ...this.DEFAULT, ...raw };
      this.DIALS.forEach(d => { const o = d.opts.find(x => x.k === I[d.key]); if (o) add(o.fx); });
      this.TOGGLES.forEach(t => {
        if (!I[t.key]) return;
        add(t.fx);
        if (t.flag === "shoot") shootIds.add(p.id);
        if (t.flag === "aggro") { aggroIds.add(p.id); acc.foul += 1; }
      });
    }
    const cl = (v, m) => clamp(v, -m, m);
    return {
      att: cl(acc.att, 0.08), def: cl(acc.def, 0.08), cf: cl(acc.cf, 0.16), ca: cl(acc.ca, 0.12),
      poss: cl(acc.poss, 15), press: clamp(acc.press, 0, 0.15), drain: clamp(acc.drain, 0, 0.2),
      foul: acc.foul, shootIds, aggroIds,
      any: shootIds.size + aggroIds.size + Math.abs(acc.att) + Math.abs(acc.cf) + Math.abs(acc.poss) > 0,
    };
  },
};
// Build DEFAULT from the catalog so no key is ever missed.
PlayerRoles.DEFAULT = (() => {
  const d = {};
  PlayerRoles.DIALS.forEach(dl => { d[dl.key] = dl.opts[1].k; });
  PlayerRoles.TOGGLES.forEach(t => { d[t.key] = false; });
  return d;
})();
