/* =========================================================================
   PLFC TOUCHLINE MANAGER — PLAYER INDIVIDUALITY
   Attributes and traits are DERIVED from a player's rating, position, age and a
   deterministic per-player seed — never stored — so every one of the ~1,500
   clubs' players (and every existing save) gets them for free with zero data
   bloat, and they stay stable across renders. Two players with the same OVR end
   up genuinely different: one pacey and direct, another a slow deep playmaker.
   Traits are not cosmetic — Injury Prone / Professional feed the medical model,
   and the rest colour development, the profile and (later) the match engine.
   ========================================================================= */

const Players = {
  // ---- deterministic seeding ------------------------------------------------
  hash(s) { let h = 2166136261 >>> 0; s = String(s || ""); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  rand01(id, salt) { return (this.hash(id + "|" + salt) % 100000) / 100000; },
  axis(id, name) { return this.rand01(id, "axis:" + name) * 2 - 1; }, // −1..1

  // Fifteen attributes in three groups. `axis` gives each player a coherent
  // style (a high speed-axis player is fast AND agile); `bias` shifts by
  // position so a defender tackles and a striker finishes.
  ATTRS: [
    { k: "finishing",   g: "Technical", label: "Finishing",   axis: "tech",  bias: { GK: -34, DF: -14, MF: -2, FW: 10 } },
    { k: "passing",     g: "Technical", label: "Passing",     axis: "tech",  bias: { GK: -18, DF: -4, MF: 8, FW: -2 } },
    { k: "dribbling",   g: "Technical", label: "Dribbling",   axis: "tech",  bias: { GK: -34, DF: -10, MF: 4, FW: 8 } },
    { k: "tackling",    g: "Technical", label: "Tackling",    axis: "def",   bias: { GK: -28, DF: 12, MF: 4, FW: -14 } },
    { k: "heading",     g: "Technical", label: "Heading",     axis: "phys",  bias: { GK: -30, DF: 8, MF: -4, FW: 4 } },
    { k: "pace",        g: "Physical",  label: "Pace",        axis: "speed", bias: { GK: -30, DF: 0, MF: 0, FW: 6 } },
    { k: "acceleration",g: "Physical",  label: "Acceleration",axis: "speed", bias: { GK: -30, DF: -2, MF: 2, FW: 6 } },
    { k: "strength",    g: "Physical",  label: "Strength",    axis: "power", bias: { GK: -6, DF: 8, MF: 0, FW: 4 } },
    { k: "stamina",     g: "Physical",  label: "Stamina",     axis: "power", bias: { GK: -20, DF: 2, MF: 10, FW: 2 } },
    { k: "agility",     g: "Physical",  label: "Agility",     axis: "speed", bias: { GK: 6, DF: -2, MF: 2, FW: 4 } },
    { k: "positioning", g: "Mental",    label: "Positioning", axis: "brain", bias: { GK: 8, DF: 8, MF: 2, FW: 4 } },
    { k: "composure",   g: "Mental",    label: "Composure",   axis: "brain", bias: { GK: 6, DF: 2, MF: 4, FW: 4 } },
    { k: "vision",      g: "Mental",    label: "Vision",      axis: "tech",  bias: { GK: -14, DF: -2, MF: 10, FW: 2 } },
    { k: "workRate",    g: "Mental",    label: "Work Rate",   axis: "power", bias: { GK: -6, DF: 4, MF: 8, FW: 0 } },
    { k: "leadership",  g: "Mental",    label: "Leadership",  axis: "brain", bias: { GK: 4, DF: 4, MF: 4, FW: 0 } },
  ],

  attr(p, def) {
    const base = p.rating || 70;
    const posBias = (def.bias && def.bias[p.pos]) || 0;
    const spread = 13;
    const av = this.axis(p.id, def.axis);
    const noise = (this.rand01(p.id, def.k) - 0.5) * 9;
    let v = base + posBias + av * spread + noise;
    // Age: legs fade, heads grow.
    if (def.g === "Physical") v += (p.age <= 23 ? 3 : p.age >= 31 ? -(p.age - 30) * 2.2 : 0);
    if (def.k === "leadership" || def.k === "composure" || def.k === "positioning" || def.k === "vision") v += clamp(p.age - 22, 0, 12) * 0.6;
    return clamp(Math.round(v), 22, 99);
  },
  // { finishing: 62, passing: 78, ... } — all fifteen.
  attributes(p) { const o = {}; this.ATTRS.forEach(d => o[d.k] = this.attr(p, d)); return o; },
  groups() { return ["Technical", "Physical", "Mental"]; },

  // ---- traits ---------------------------------------------------------------
  TRAITS: {
    "High Potential":   { icon: "🌟", desc: "A big ceiling still to reach.", effect: "Develops faster with minutes." },
    "Wonderkid":        { icon: "💎", desc: "Generational youth talent.", effect: "Exceptional growth ceiling." },
    "Leader":           { icon: "🎖️", desc: "Drives standards in the dressing room.", effect: "Lifts team morale & mentality." },
    "Big Game Player":  { icon: "🔥", desc: "Turns up when it matters most.", effect: "Sharper in finals & big matches." },
    "Professional":     { icon: "🧊", desc: "Model pro, looks after himself.", effect: "Lower injury risk, steady form." },
    "Injury Prone":     { icon: "🩼", desc: "A body that keeps breaking down.", effect: "Higher injury risk." },
    "Consistent":       { icon: "📈", desc: "Reliable week in, week out.", effect: "Low performance variance." },
    "Inconsistent":     { icon: "🎲", desc: "Blows hot and cold.", effect: "High performance variance." },
    "Speedster":        { icon: "⚡", desc: "Electric over the ground.", effect: "Thrives on the counter." },
    "Clinical Finisher":{ icon: "🎯", desc: "Ruthless in front of goal.", effect: "Converts the big chances." },
    "Playmaker":        { icon: "🪄", desc: "Dictates play through the middle.", effect: "Creates for others." },
    "Target Man":       { icon: "🗼", desc: "A wall to build attacks around.", effect: "Wins the ball up top." },
    "Ball Winner":      { icon: "🛡️", desc: "Breaks play up all over the pitch.", effect: "Regains possession." },
    "Poor Discipline":  { icon: "🟥", desc: "One eye always on the referee.", effect: "More cards & suspensions." },
    "One Club Player":  { icon: "❤️", desc: "Devoted to the badge.", effect: "Rarely agitates to leave." },
  },

  traits(p) {
    const A = this.attributes(p);
    const ax = n => this.axis(p.id, n);
    const r = s => this.rand01(p.id, s);
    const t = [];
    // Ability-driven — gated on the player's STYLE AXIS (a percentile) so each
    // stays a genuine standout rather than a near-universal label, then sanity-
    // checked against the actual attribute.
    if (p.age <= 20 && (p.potential - p.rating) >= 12) t.push(r("wk") < 0.25 ? "Wonderkid" : "High Potential");
    else if (p.age <= 22 && (p.potential - p.rating) >= 8) t.push("High Potential");
    if (ax("brain") > 0.55 && p.age >= 28 && A.leadership >= 82) t.push("Leader");
    if (ax("speed") > 0.6 && A.pace >= 85) t.push("Speedster");
    if (p.pos === "FW" && ax("tech") > 0.5 && A.finishing >= 84) t.push("Clinical Finisher");
    if (p.pos === "MF" && ax("tech") > 0.58 && A.vision >= 88) t.push("Playmaker");
    if (p.pos === "FW" && ax("power") > 0.5 && A.strength >= 84) t.push("Target Man");
    if (p.pos !== "FW" && ax("def") > 0.55 && A.tackling >= 86) t.push("Ball Winner");
    // Personality rolls.
    if (r("inj") < 0.09) t.push("Injury Prone"); else if (r("pro") < 0.15) t.push("Professional");
    if (r("big") < 0.11) t.push("Big Game Player");
    if (r("con") < 0.16) t.push(r("con2") < 0.5 ? "Consistent" : "Inconsistent");
    if (r("disc") < 0.08) t.push("Poor Discipline");
    if (r("loy") < 0.07) t.push("One Club Player");
    // De-dup, cap at three so profiles stay readable.
    return [...new Set(t)].slice(0, 3);
  },
  hasTrait(p, name) { return this.traits(p).includes(name); },

  // ---- gameplay hooks (NOT cosmetic) ---------------------------------------
  // Injury-risk multiplier consumed by Fitness.weekly.
  injuryMult(p) {
    if (this.hasTrait(p, "Injury Prone")) return 1.75;
    if (this.hasTrait(p, "Professional")) return 0.6;
    return 1;
  },

  // ---- morale ---------------------------------------------------------------
  moraleLabel(m) {
    m = m == null ? 70 : m;
    return m >= 85 ? "Very Happy" : m >= 68 ? "Happy" : m >= 52 ? "Content" : m >= 36 ? "Unhappy" : "Very Unhappy";
  },
  moraleClass(m) {
    m = m == null ? 70 : m;
    return m >= 68 ? "good" : m >= 52 ? "ok" : "bad";
  },

  // A player's headline archetype for the profile subtitle.
  role(p) {
    const A = this.attributes(p);
    if (p.pos === "GK") return "Goalkeeper";
    if (p.pos === "DF") return A.pace >= 80 ? "Ball-playing / pacey defender" : A.heading >= 80 ? "Commanding centre-back" : "Solid defender";
    if (p.pos === "MF") return A.vision >= 82 ? "Creative playmaker" : A.tackling >= 80 ? "Ball-winning midfielder" : A.stamina >= 82 ? "Box-to-box engine" : "Central midfielder";
    return A.pace >= 82 ? "Pacey forward" : A.strength >= 82 ? "Target forward" : A.finishing >= 82 ? "Clinical striker" : "Forward";
  },
};
