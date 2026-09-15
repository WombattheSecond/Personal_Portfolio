/* =========================================================================
   PLFC TOUCHLINE MANAGER — TACTICS & CLUB PHILOSOPHY
   A club plays to a PHILOSOPHY (Possession, Counter-Attack, Tiki-Taka, High
   Pressure, Highly Defensive, Direct, Balanced) — a named identity that sets a
   coherent set of five tactical DIALS (Mentality, Pressing, Tempo, Width, Line).
   Pick a philosophy for a one-tap identity, then fine-tune the dials FC-Mobile
   style; each dial and each philosophy's signature move the match engine in a
   different way, so styles beat other styles: sit deep and counter a big side,
   or pass them to death with tiki-taka if your squad's good enough to pull it off.
   ========================================================================= */

const Tactics = {
  // Each dial option carries deltas: att/def scale the side's ratings; cf/ca scale
  // its own / the opponent's goal chances (openness & vulnerability); drain =
  // stamina cost; poss = possession lean (%).
  DIALS: {
    mentality: [
      { k: "very-defensive", label: "Very Defensive", att: -0.15, def: 0.12 },
      { k: "defensive",      label: "Defensive",      att: -0.07, def: 0.06 },
      { k: "balanced",       label: "Balanced",       att: 0,     def: 0 },
      { k: "attacking",      label: "Attacking",      att: 0.08,  def: -0.06 },
      { k: "very-attacking", label: "Very Attacking", att: 0.15,  def: -0.14 },
    ],
    pressing: [
      { k: "low",    label: "Low Press",    cf: -0.08, ca: -0.06, drain: -0.15, poss: -4 },
      { k: "medium", label: "Medium Press", cf: 0,     ca: 0,     drain: 0,     poss: 0 },
      { k: "high",   label: "High Press",   cf: 0.08,  ca: 0.14,  drain: 0.28,  poss: 3 },
    ],
    tempo: [
      { k: "slow",     label: "Slow Tempo",     cf: -0.06, ca: -0.05, drain: -0.10, poss: 11 },
      { k: "balanced", label: "Balanced Tempo", cf: 0,     ca: 0,     drain: 0,     poss: 0 },
      { k: "fast",     label: "Fast Tempo",     cf: 0.12,  ca: 0.10,  drain: 0.12,  poss: -9 },
    ],
    width: [
      { k: "narrow",   label: "Narrow", att: -0.03, def: 0.05,  cf: -0.03 },
      { k: "balanced", label: "Balanced Width", att: 0, def: 0,  cf: 0 },
      { k: "wide",     label: "Wide",   att: 0.05,  def: -0.02, cf: 0.06 },
    ],
    line: [
      { k: "deep",     label: "Deep Line",     att: -0.04, def: 0.06,  ca: -0.10, poss: -3 },
      { k: "balanced", label: "Balanced Line", att: 0,     def: 0,     ca: 0,     poss: 0 },
      { k: "high",     label: "High Line",     att: 0.05,  def: -0.03, ca: 0.12,  poss: 3 },
    ],
  },
  DIAL_ORDER: ["mentality", "pressing", "tempo", "width", "line"],

  PHILOSOPHIES: [
    { k: "balanced",   label: "Balanced",        icon: "⚖️", desc: "An even, adaptable shape between the boxes.",
      effects: ["No weaknesses, no edges", "A safe default"],
      dials: { mentality: "balanced", pressing: "medium", tempo: "balanced", width: "balanced", line: "balanced" }, sig: {} },
    { k: "possession", label: "Possession",      icon: "🔵", desc: "Keep the ball, probe patiently, starve the opponent of chances.",
      effects: ["Dominates the ball", "Fewer chances against", "Needs patience to break sides down"],
      dials: { mentality: "balanced", pressing: "medium", tempo: "slow", width: "wide", line: "balanced" }, sig: { ca: -0.08, poss: 9 } },
    { k: "tiki-taka",  label: "Tiki-Taka",       icon: "🎯", desc: "Short-passing overload — lethal with a technical squad, exposed without one.",
      effects: ["Total control", "Lethal with a great squad", "Exposed if you lack quality"],
      dials: { mentality: "attacking", pressing: "high", tempo: "slow", width: "narrow", line: "high" }, sig: { quality: true, poss: 12 } },
    { k: "counter",    label: "Counter-Attack",  icon: "⚡", desc: "Sit deep and strike on the break — thrives against attacking sides.",
      effects: ["Soaks up pressure", "Deadly on the break", "Cedes possession"],
      dials: { mentality: "defensive", pressing: "low", tempo: "fast", width: "balanced", line: "deep" }, sig: { counter: true } },
    { k: "high-press", label: "High Pressure",   icon: "🔴", desc: "Hunt the ball high and force errors — thrilling, tiring and risky.",
      effects: ["Wins the ball high", "Lots of chances both ways", "Tiring & risky at the back"],
      dials: { mentality: "attacking", pressing: "high", tempo: "fast", width: "balanced", line: "high" }, sig: { cf: 0.05, ca: 0.05 } },
    { k: "defensive",  label: "Highly Defensive",icon: "🛡️", desc: "Two banks of four — concede nothing and take what comes.",
      effects: ["Very hard to break down", "Low-scoring", "Little attacking threat"],
      dials: { mentality: "very-defensive", pressing: "low", tempo: "slow", width: "narrow", line: "deep" }, sig: { ca: -0.08, cf: -0.04 } },
    { k: "direct",     label: "Direct",          icon: "➡️", desc: "Get it forward fast and attack with width.",
      effects: ["Fast, vertical attacks", "Gets forward quickly", "Can be end-to-end"],
      dials: { mentality: "attacking", pressing: "medium", tempo: "fast", width: "wide", line: "balanced" }, sig: { cf: 0.05 } },
  ],

  dial(type, k) { const arr = this.DIALS[type] || []; return arr.find(d => d.k === k) || arr[Math.floor(arr.length / 2)] || {}; },
  phil(k) { return this.PHILOSOPHIES.find(p => p.k === k) || this.PHILOSOPHIES[0]; },
  philosophy(club) { return this.phil(club && club.tactics && club.tactics.philosophy); },
  // The philosophy to DISPLAY for any club: the managed club's chosen one, else a
  // stable identity derived from the club's id (so an opponent always plays the
  // same recognisable way in the pre-match brief). Not stored — pure display.
  philosophyOf(club) {
    if (club && club.tactics && this.PHILOSOPHIES.some(p => p.k === club.tactics.philosophy)) return this.phil(club.tactics.philosophy);
    const key = (club && (club.id || club.name)) || "x";
    let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return this.PHILOSOPHIES[(h >>> 0) % this.PHILOSOPHIES.length];
  },

  ensure(club) {
    if (!club.tactics) club.tactics = {};
    const t = club.tactics;
    if (!this.PHILOSOPHIES.some(p => p.k === t.philosophy)) { t.philosophy = "balanced"; this.applyPhilosophy(club, "balanced"); }
    // Backfill any missing dials from the current philosophy.
    const ph = this.phil(t.philosophy);
    this.DIAL_ORDER.forEach(d => { if (!this.DIALS[d].some(o => o.k === t[d])) t[d] = ph.dials[d]; });
  },
  applyPhilosophy(club, k) {
    club.tactics = club.tactics || {};
    club.tactics.philosophy = k;
    const ph = this.phil(k);
    this.DIAL_ORDER.forEach(d => { club.tactics[d] = ph.dials[d]; });
  },
  // Is the current dial set still the philosophy's preset, or has it been tweaked?
  isCustom(club) {
    const t = club.tactics, ph = this.philosophy(club);
    return this.DIAL_ORDER.some(d => t[d] !== ph.dials[d]);
  },

  // The dials a club actually plays to: a managed club uses its own chosen
  // philosophy + (possibly customised) dials; any other club uses the preset of
  // its stable identity philosophy (`philosophyOf`). Nothing is stored for AI
  // clubs — this just resolves what they play like, so their philosophy is real.
  effectiveTactics(club) {
    if (club && club.tactics && this.PHILOSOPHIES.some(p => p.k === club.tactics.philosophy)) return club.tactics;
    const ph = this.philosophyOf(club);
    return { philosophy: ph.k, ...ph.dials };
  },

  // The combined effect on a side. `oppAttNorm` (0–1, how attacking the opponent
  // is) powers the counter-attack bonus. Works for ANY club — the managed side
  // and its AI opponent alike — via effectiveTactics.
  sideMods(club, oppAttNorm) {
    const t = this.effectiveTactics(club);
    const m = this.dial("mentality", t.mentality), p = this.dial("pressing", t.pressing),
      te = this.dial("tempo", t.tempo), w = this.dial("width", t.width), l = this.dial("line", t.line);
    let att = 1 + (m.att || 0) + (w.att || 0) + (l.att || 0);
    let def = 1 + (m.def || 0) + (w.def || 0) + (l.def || 0);
    let cf = 1 + (p.cf || 0) + (te.cf || 0) + (w.cf || 0);
    let ca = 1 + (p.ca || 0) + (te.ca || 0) + (l.ca || 0);
    let drain = 1 + (p.drain || 0) + (te.drain || 0);
    let poss = 50 + (p.poss || 0) + (te.poss || 0) + (l.poss || 0);
    const sig = this.phil(t.philosophy).sig || {};
    if (sig.cf) cf += sig.cf;
    if (sig.ca) ca += sig.ca;
    if (sig.poss) poss += sig.poss;
    if (sig.quality && typeof Stats !== "undefined") {
      const q = clamp((Stats.clubStrength(club) - 75) / 15, -1, 1); // −1 weak … +1 elite
      att += q * 0.08; cf += q * 0.06; ca += 0.05 - q * 0.05;       // elite thrive, weak exposed
    }
    if (sig.counter && oppAttNorm != null) { cf += clamp(oppAttNorm, 0, 1) * 0.24; def += 0.03; }
    return {
      att: clamp(att, 0.7, 1.35), def: clamp(def, 0.7, 1.35),
      cf: clamp(cf, 0.7, 1.5), ca: clamp(ca, 0.6, 1.6),
      drain: clamp(drain, 0.75, 1.5), poss: clamp(poss, 25, 75),
    };
  },
  drainMult(club) { if (!club || !club.tactics) return 1; return clamp(1 + (this.dial("pressing", club.tactics.pressing).drain || 0) + (this.dial("tempo", club.tactics.tempo).drain || 0), 0.75, 1.5); },
  summary(club) { const ph = this.philosophy(club); return ph.label + (this.isCustom(club) ? " (custom)" : ""); },
};
