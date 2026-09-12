/* =========================================================================
   PLFC TOUCHLINE MANAGER — APP CONTROLLER
   Boot sequence, navigation, event wiring, and the live-match player.
   ========================================================================= */

   const App = {
    selectedClubId: null,
    selectedLeague: null,   // which league's clubs the picker is showing
    clubSearch: "",         // current picker search text
    hubStatScope: "league", // "league" | "team" toggle on the hub stats panel
    mktPos: "ALL", mktSort: "rating-desc", // market/free-agent filter + sort
    sqPos: "ALL", sqSort: "pos",           // squad filter + sort (default grouped by position)
    tableLeague: null,      // which division the Table tab is showing
    weekQueue: [],          // the user's remaining live matches this week (league, then cup)
    currentItem: null,      // the match currently being played
    weekInProgress: false,  // a matchweek sequence is mid-flight
    windowTransition: null,

    init() {
      this.selectedLeague = LEAGUES[0];
      UI.renderClubGrid(null, this.selectedLeague, this.clubSearch);
      this.wireStartScreen();
      this.wireTabs();
      this.wireHub();
      this.wireSquad();
      this.wireMarket();
      this.wireLineup();
      this.wireMatch();
      this.wireTable();
      this.wireTrophies();
      this.wireCoaches();
      this.wireContracts();
      this.wireFinance();
      this.wireProfile();
      this.wireManager();

      if (Game.hasSave() && Game.load()) {
        const club = Game.myClub();
        document.getElementById("continuePanel").classList.remove("hidden");
        document.getElementById("continueSummary").textContent =
          `${Game.state.managerName} — ${club.name} (${LEAGUE_NAMES[club.league]}) — Season ${Game.state.season}/${String(Game.state.season + 1).slice(2)}, Matchweek ${Math.min(Game.state.week + 1, Season.totalWeeks(Game.state))}`;
      } else {
        Game.state = null;
      }
    },
  
    // ---------------- Start screen ----------------
    wireStartScreen() {
      document.getElementById("leagueBar").addEventListener("click", e => {
        const btn = e.target.closest(".league-chip");
        if (!btn) return;
        if (btn.dataset.league === this.selectedLeague && !this.clubSearch) return;
        this.selectedLeague = btn.dataset.league;
        this.clubSearch = "";
        const si = document.getElementById("clubSearch"); if (si) si.value = "";
        UI.renderClubGrid(this.selectedClubId, this.selectedLeague, this.clubSearch);
        this.validateStart();
      });
      document.getElementById("clubSearch").addEventListener("input", e => {
        this.clubSearch = e.target.value;
        UI.renderClubGrid(this.selectedClubId, this.selectedLeague, this.clubSearch);
      });
      document.getElementById("clubGrid").addEventListener("click", e => {
        const tile = e.target.closest(".club-tile");
        if (!tile) return;
        this.selectedClubId = tile.dataset.club;
        UI.renderClubGrid(this.selectedClubId, this.selectedLeague, this.clubSearch);
        this.validateStart();
      });
      document.getElementById("managerNameInput").addEventListener("input", () => this.validateStart());
  
      document.getElementById("btnBeginCareer").addEventListener("click", () => {
        const name = document.getElementById("managerNameInput").value.trim();
        if (!name || !this.selectedClubId) return;
        if (Game.hasSave() && !confirm("Starting a new career will overwrite your existing save. Continue?")) return;
        Game.start(name, this.selectedClubId);
        this.enterCareer();
      });
  
      document.getElementById("btnContinue").addEventListener("click", () => this.enterCareer());
  
      document.getElementById("btnDeleteSave").addEventListener("click", () => {
        if (!confirm("Delete your saved career? This can't be undone.")) return;
        Game.clearSave();
        Game.state = null;
        document.getElementById("continuePanel").classList.add("hidden");
      });
    },
  
    validateStart() {
      const name = document.getElementById("managerNameInput").value.trim();
      document.getElementById("btnBeginCareer").disabled = !(name && this.selectedClubId);
    },
  
    enterCareer() {
      document.getElementById("screen-start").classList.add("hidden");
      document.getElementById("topbar").classList.remove("hidden");
      document.getElementById("tabs").classList.remove("hidden");
      this.showTab("hub");
    },
  
    // ---------------- Tabs / screens ----------------
    wireTabs() {
      document.getElementById("tabs").addEventListener("click", e => {
        const btn = e.target.closest("button[data-tab]");
        if (!btn) return;
        this.showTab(btn.dataset.tab);
      });
    },
  
    showTab(name) {
      // If navigating away mid-matchweek, wrap up the whole week (record the
      // remaining precomputed results and advance) so nothing is lost.
      if (this.weekInProgress) {
        if (this.wrapUpWeek()) return; // jumped to the season-end screen
      }
  
      ["hub", "squad", "market", "coaches", "academy", "lineup", "table"].forEach(t => {
        document.getElementById("screen-" + t).classList.toggle("hidden", t !== name);
        const tabBtn = document.getElementById("tab" + t[0].toUpperCase() + t.slice(1));
        if (tabBtn) tabBtn.classList.toggle("active", t === name);
      });
      document.getElementById("screen-match").classList.add("hidden");
      document.getElementById("screen-seasonend").classList.add("hidden");
      this.refreshChrome();
      if (name === "hub") UI.renderHub(Game.state);
      if (name === "squad") UI.renderSquad(Game.state);
      if (name === "market") UI.renderMarket(Game.state);
      if (name === "coaches") { UI.renderCoaches(Game.state); UI.renderMedical(Game.state); UI.renderScouting(Game.state); }
      if (name === "academy") UI.renderAcademy(Game.state);
      if (name === "lineup") UI.renderLineup(Game.state);
      if (name === "table") {
        // Default the Table tab to the user's own division each visit.
        this.tableLeague = Game.myLeague();
        UI.renderTable(Game.state, this.tableLeague);
      }
    },

    // ---------------- Staff & Academy ----------------
    wireCoaches() {
      document.getElementById("coachMarketList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-hirecoach]");
        if (!btn) return;
        const res = Coaching.hire(Game.state, btn.dataset.hirecoach);
        if (!res.ok) { UI.toast(res.reason); return; }
        UI.toast(`Hired ${res.name} — ${Coaching.ROLE_LABEL[res.role]} (${UI.money(res.price)})`);
        Game.save();
        UI.renderCoaches(Game.state);
        UI.renderMedical(Game.state);
        UI.renderScouting(Game.state);
        this.refreshChrome();
      });
      // Academy (own tab): promote or release graduates/prospects.
      document.getElementById("screen-academy").addEventListener("click", e => {
        const prom = e.target.closest("button[data-promote]");
        if (prom) {
          const res = Academy.promote(Game.state, prom.dataset.promote);
          if (!res.ok) { UI.toast(res.reason); return; }
          const promoted = Game.myClub().squad.find(p => p.name === res.name);
          if (promoted) { Contracts.ensurePlayer(promoted); Morale.ensurePlayer(promoted); Morale.onPromote(promoted); } // a starting deal + the buzz of making the step up
          UI.toast(`${res.name} promoted to the senior squad`);
          Game.save(); UI.renderAcademy(Game.state); this.refreshChrome();
          return;
        }
        const rel = e.target.closest("button[data-release]");
        if (rel) {
          const res = Academy.release(Game.state, rel.dataset.release);
          if (res.ok) { UI.toast(`${res.name} released from the academy`); Game.save(); UI.renderAcademy(Game.state); }
        }
      });
      // Scouting: assign, recall, sign a target, or dismiss a report.
      document.getElementById("screen-coaches").addEventListener("click", e => {
        const send = e.target.closest("button[data-scoutsend]");
        if (send) {
          const row = send.closest(".scout-row");
          const pos = row.querySelector("select[data-scoutpos]").value;
          const profile = row.querySelector("select[data-scoutprofile]").value;
          const res = Scouting.assign(Game.state, send.dataset.scoutsend, pos, profile);
          if (!res.ok) { UI.toast(res.reason); return; }
          UI.toast(`${res.name} sent to scout ${posLabel(pos)} — back in ${res.weeks} matchweek${res.weeks === 1 ? "" : "s"}`);
          Game.save(); UI.renderScouting(Game.state);
          return;
        }
        const recall = e.target.closest("button[data-scoutrecall]");
        if (recall) {
          const res = Scouting.recall(Game.state, recall.dataset.scoutrecall);
          if (res.ok) { UI.toast(`${res.name} recalled`); Game.save(); UI.renderScouting(Game.state); }
          return;
        }
        const sign = e.target.closest("button[data-scoutsign]");
        if (sign) {
          const [repId, listingId] = sign.dataset.scoutsign.split("|");
          const r = Scouting.resolveCandidate(Game.state, repId, listingId);
          if (!r || r.gone) { UI.toast(r ? `${r.cand.player.name} has already moved on.` : "That target is no longer listed."); Scouting.sign(Game.state, repId, listingId); Game.save(); UI.renderScouting(Game.state); return; }
          this.openContract({ kind: "scout", reportId: repId, listingId, player: r.player, fee: r.cand.price, origin: r.originId });
          return;
        }
        const save = e.target.closest("button[data-scoutsave]");
        if (save) {
          const [repId, listingId] = save.dataset.scoutsave.split("|");
          const res = Scouting.saveToWatchlist(Game.state, repId, listingId);
          UI.toast(res.ok ? `★ ${res.name} added to your shortlist` : res.reason);
          Game.save(); UI.renderScouting(Game.state);
          return;
        }
        const wlSign = e.target.closest("button[data-wlsign]");
        if (wlSign) {
          const entry = (Game.state.watchlist || []).find(x => x.id === wlSign.dataset.wlsign);
          if (!entry) { UI.toast("That target is no longer on your shortlist."); UI.renderScouting(Game.state); return; }
          const r = Scouting.watchlistResolve(Game.state, entry);
          if (!r.available) { UI.toast("That target has left the game."); Scouting.removeWatchlist(Game.state, entry.id); Game.save(); UI.renderScouting(Game.state); return; }
          this.openContract({ kind: "watchlist", entryId: entry.id, player: r.player, fee: Scouting.watchlistFee(entry, r), origin: entry.kind === "real" ? r.club.id : null });
          return;
        }
        const wlRem = e.target.closest("button[data-wlremove]");
        if (wlRem) {
          Scouting.removeWatchlist(Game.state, wlRem.dataset.wlremove);
          Game.save(); UI.renderScouting(Game.state);
          return;
        }
        const dis = e.target.closest("button[data-scoutdismiss]");
        if (dis) {
          Scouting.dismiss(Game.state, dis.dataset.scoutdismiss);
          Game.save(); UI.renderScouting(Game.state);
        }
      });
    },

    // ---------------- Trophy cabinet ----------------
    wireTrophies() {
      const modal = document.getElementById("trophyModal");
      document.getElementById("btnTrophies").addEventListener("click", () => {
        UI.renderTrophyCabinet(Game.state);
        modal.classList.remove("hidden");
      });
      document.getElementById("btnCloseTrophies").addEventListener("click", () => modal.classList.add("hidden"));
      modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

      // Honours: awards & Teams of the Year (browsable any time).
      const hon = document.getElementById("honoursModal");
      document.getElementById("btnHonours").addEventListener("click", () => {
        this._honComp = this._honComp || "league";
        UI.renderHonours(Game.state, this._honComp);
        hon.classList.remove("hidden");
      });
      document.getElementById("btnHonoursClose").addEventListener("click", () => hon.classList.add("hidden"));
      hon.addEventListener("click", e => {
        if (e.target === hon) { hon.classList.add("hidden"); return; }
        const tab = e.target.closest("[data-honcomp]");
        if (tab) { this._honComp = tab.dataset.honcomp; UI.renderHonours(Game.state, this._honComp); }
      });
    },

    // ---------------- Table ----------------
    wireTable() {
      document.querySelector("#screen-table .scope-toggle").addEventListener("click", e => {
        const btn = e.target.closest("button[data-league]");
        if (!btn) return;
        this.tableLeague = btn.dataset.league;
        UI.renderTable(Game.state, this.tableLeague);
      });
    },
  
    refreshChrome() {
      if (Game.state) UI.renderTopbar(Game.state);
    },
  
    // ---------------- Hub ----------------
    wireHub() {
      // "Set Lineup & Play" on the hub navigates to the Lineup tab so the
      // manager can review/adjust before kicking off.
      document.getElementById("btnGoToLineup").addEventListener("click", () => this.showTab("lineup"));
      // League / My Squad toggle on the season-stats panel.
      document.querySelector("#hubStatsPanel .scope-toggle").addEventListener("click", e => {
        const btn = e.target.closest("button[data-scope]");
        if (!btn) return;
        this.hubStatScope = btn.dataset.scope;
        UI.renderHubStats(Game.state, this.hubStatScope);
      });
    },
  
    // ---------------- Squad ----------------
    wireSquad() {
      const sc = document.getElementById("squadControls");
      sc.addEventListener("click", e => { const c = e.target.closest("[data-filterpos]"); if (!c) return; this.sqPos = c.dataset.filterpos; UI.renderSquad(Game.state); });
      sc.addEventListener("change", e => { if (e.target.matches("[data-sortsel]")) { this.sqSort = e.target.value; UI.renderSquad(Game.state); } });
      document.getElementById("squadList").addEventListener("click", e => {
        // Expand/collapse a player's offers.
        const badge = e.target.closest("button[data-offers]");
        if (badge) {
          const panel = document.getElementById("offers-" + badge.dataset.offers);
          if (panel) panel.classList.toggle("hidden");
          return;
        }
        // Renew a player's contract (opens the negotiation modal).
        const renew = e.target.closest("button[data-renew]");
        if (renew) {
          const p = Game.myClub().squad.find(pl => pl.id === renew.dataset.renew);
          if (p) this.openContract({ kind: "renew", playerId: p.id, player: p, fee: 0 });
          return;
        }
        // Transfer-list / unlist.
        const listBtn = e.target.closest("button[data-list]");
        if (listBtn) {
          const res = Market.toggleTransferList(Game.state, listBtn.dataset.list);
          if (res.ok) { UI.toast(res.listed ? `${res.name} transfer-listed` : `${res.name} taken off the list`); Game.save(); UI.renderSquad(Game.state); }
          return;
        }
        // Accept an offer.
        const acc = e.target.closest("button[data-accept]");
        if (acc) {
          const pName = (Game.myClub().squad.find(pl => pl.id === acc.dataset.accept) || {}).name || "Player";
          const res = Market.acceptOffer(Game.state, acc.dataset.accept, Number(acc.dataset.idx));
          if (!res.ok) { UI.toast(res.reason); return; }
          UI.toast(`Sold to ${res.buyerName} for ${UI.money(res.fee)}`);
          News.transfer(Game.state, `${Game.myClub().short} sell ${pName} to ${res.buyerName} for ${UI.money(res.fee)}.`);
          Game.save();
          UI.renderSquad(Game.state);
          this.refreshChrome();
          return;
        }
        // Decline an offer.
        const dec = e.target.closest("button[data-decline]");
        if (dec) {
          Market.declineOffer(Game.state, dec.dataset.decline, Number(dec.dataset.idx));
          Game.save();
          UI.renderSquad(Game.state);
        }
      });
    },
  
    // ---------------- Market ----------------
    wireMarket() {
      const mc = document.getElementById("marketControls");
      mc.addEventListener("click", e => { const c = e.target.closest("[data-filterpos]"); if (!c) return; this.mktPos = c.dataset.filterpos; UI.renderMarket(Game.state); });
      mc.addEventListener("change", e => { if (e.target.matches("[data-sortsel]")) { this.mktSort = e.target.value; UI.renderMarket(Game.state); } });
      document.getElementById("btnReroll").addEventListener("click", () => {
        Market.reroll(Game.state);
        Game.save();
        UI.renderMarket(Game.state);
      });
      document.getElementById("marketList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-buy]");
        if (!btn) return;
        const listing = (Game.state.market || []).find(l => l.listingId === btn.dataset.buy);
        if (!listing) { UI.toast("That player is no longer available."); UI.renderMarket(Game.state); return; }
        this.openContract({ kind: "market", listingId: listing.listingId, player: listing.player, fee: listing.price, origin: listing.origin });
      });
      document.getElementById("freeAgentList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-signfree]");
        if (!btn) return;
        const listing = (Game.state.freeAgents || []).find(l => l.listingId === btn.dataset.signfree);
        if (!listing) { UI.toast("That free agent has already moved on."); UI.renderMarket(Game.state); return; }
        this.openContract({ kind: "free", listingId: listing.listingId, player: listing.player, fee: listing.price });
      });
      document.getElementById("pendingList").addEventListener("click", e => {
        const btn = e.target.closest("button[data-cancelpending]");
        if (!btn) return;
        const res = Market.cancelPending(Game.state, btn.dataset.cancelpending);
        if (res.ok) UI.toast(`Cancelled — ${res.name}, ${UI.money(res.refund)} refunded`);
        Game.save();
        UI.renderMarket(Game.state);
        this.refreshChrome();
      });
    },

    // ---------------- Manager profile + job market ----------------
    wireManager() {
      document.getElementById("btnManager").addEventListener("click", () => { UI.renderManagerModal(Game.state); document.getElementById("managerModal").classList.remove("hidden"); });
      document.getElementById("btnManagerClose").addEventListener("click", () => document.getElementById("managerModal").classList.add("hidden"));
      document.getElementById("managerModal").addEventListener("click", e => { if (e.target.id === "managerModal") document.getElementById("managerModal").classList.add("hidden"); });
      document.getElementById("managerBody").addEventListener("click", e => {
        if (e.target.id !== "btnResign") return;
        Career.enterJobMarket(Game.state, "resigned");
        Game.save();
        document.getElementById("managerModal").classList.add("hidden");
        this.renderJobMarket("You've resigned", "You've stepped down from your post. A fresh challenge awaits — choose your next club.");
      });
    },
    renderJobMarket(title, subtitle) {
      const state = Game.state;
      ["hub", "squad", "market", "coaches", "academy", "lineup", "table"].forEach(t => document.getElementById("screen-" + t).classList.add("hidden"));
      document.getElementById("screen-match").classList.add("hidden");
      document.getElementById("screen-seasonend").classList.add("hidden");
      document.getElementById("tabs").classList.add("hidden");
      document.getElementById("topbar").classList.add("hidden");
      const screen = document.getElementById("screen-jobs");
      screen.classList.remove("hidden");
      screen.innerHTML = UI.jobMarketHTML(state, title, subtitle);
      screen.querySelectorAll("[data-takejob]").forEach(b => b.addEventListener("click", () => {
        const res = Career.takeJob(state, b.dataset.takejob);
        if (!res.ok) { UI.toast("You don't have the reputation for that job yet."); return; }
        Game.save();
        screen.classList.add("hidden");
        document.getElementById("topbar").classList.remove("hidden");
        document.getElementById("tabs").classList.remove("hidden");
        this.refreshChrome();
        this.showTab("hub");
        UI.toast(`✍️ Appointed manager of ${res.clubName}!`);
      }));
    },

    // ---------------- Player profile ----------------
    wireProfile() {
      document.getElementById("btnProfileClose").addEventListener("click", () => this.closeProfile());
      document.getElementById("profileModal").addEventListener("click", e => { if (e.target.id === "profileModal") this.closeProfile(); });
      // Manual squad-role assignment from the profile.
      document.getElementById("profileBody").addEventListener("change", e => {
        const sel = e.target.closest("[data-setrole]");
        if (!sel) return;
        const p = Game.myClub().squad.find(x => x.id === sel.dataset.setrole);
        if (!p) return;
        if (sel.value === "auto") { delete p.squadRole; p.squadRoleSet = false; }
        else { p.squadRole = sel.value; p.squadRoleSet = true; }
        Game.save();
        UI.renderProfileModal(p, true);
      });
      // Any clickable player name across the app opens their profile.
      document.addEventListener("click", e => { const t = e.target.closest("[data-profile]"); if (t) this.openProfile(t.dataset.profile); });
    },
    findPlayer(state, id) {
      const mine = Game.myClub();
      if (mine && mine.squad) { const p = mine.squad.find(x => x.id === id); if (p) return { player: p, mine: true }; }
      for (const pd of (state.pendingSignings || [])) if (pd.player && pd.player.id === id) return { player: pd.player, mine: true };
      for (const c of (state.clubs || [])) { if (c.strengthOnly || !c.squad) continue; const p = c.squad.find(x => x.id === id); if (p) return { player: p, mine: c.id === state.clubId }; }
      for (const l of (state.market || [])) if (l.player && l.player.id === id) return { player: l.player, mine: false };
      for (const l of (state.freeAgents || [])) if (l.player && l.player.id === id) return { player: l.player, mine: false };
      const sc = mine && mine.scouting;
      if (sc) for (const rep of (sc.reports || [])) for (const c of (rep.candidates || [])) if (c.player && c.player.id === id) return { player: c.player, mine: false };
      for (const e of (state.watchlist || [])) if (e.player && e.player.id === id) return { player: e.player, mine: false };
      if (mine && mine.academy) for (const arr of [mine.academy.prospects, mine.academy.pending]) for (const g of (arr || [])) if (g && g.id === id) return { player: g, mine: true };
      return null;
    },
    openProfile(id) {
      const found = this.findPlayer(Game.state, id);
      if (!found) return;
      document.getElementById("profileModal").classList.remove("hidden");
      UI.renderProfileModal(found.player, found.mine);
    },
    closeProfile() { document.getElementById("profileModal").classList.add("hidden"); },

    // ---------------- Rebalance budgets ----------------
    wireFinance() {
      document.getElementById("btnFinance").addEventListener("click", () => this.openFinance());
      document.getElementById("btnFinanceClose").addEventListener("click", () => this.closeFinance());
      document.getElementById("financeModal").addEventListener("click", e => { if (e.target.id === "financeModal") this.closeFinance(); });
      const fb = document.getElementById("financeBody");
      fb.addEventListener("input", e => { if (e.target.id === "finSlider") { this.financeDelta = +e.target.value; UI.updateFinancePreview(Game.state); } });
      fb.addEventListener("click", e => {
        if (e.target.closest("#btnFinanceApply")) this.applyFinance();
        else if (e.target.closest("#btnFinanceReset")) { this.financeDelta = 0; const sl = document.getElementById("finSlider"); if (sl) sl.value = 0; UI.updateFinancePreview(Game.state); }
      });
    },
    openFinance() {
      this.financeDelta = 0;
      document.getElementById("financeModal").classList.remove("hidden");
      UI.renderFinanceModal(Game.state);
    },
    closeFinance() { document.getElementById("financeModal").classList.add("hidden"); },
    applyFinance() {
      const res = Contracts.rebalance(Game.state, this.financeDelta || 0);
      if (!res.ok) { UI.toast(res.reason); return; }
      UI.toast("💷 Budgets rebalanced");
      Game.save();
      this.closeFinance();
      UI.renderMarket(Game.state);
      this.refreshChrome();
    },

    // ---------------- Contract negotiation ----------------
    wireContracts() {
      document.getElementById("btnContractClose").addEventListener("click", () => this.closeContract());
      document.getElementById("contractModal").addEventListener("click", e => {
        if (e.target.id === "contractModal") this.closeContract(); // click backdrop to dismiss
      });
      const body = document.getElementById("contractBody");
      body.addEventListener("input", e => {
        if (e.target.id === "cLen" || e.target.id === "cWage") this.updateContractSliders();
      });
      body.addEventListener("click", e => {
        if (e.target.closest("#btnContractOffer")) this.makeOffer();
      });
    },

    openContract(ctx) {
      const p = ctx.player;
      const ideal = Contracts.idealLength(p.age);
      const wr = Contracts.wageRange(p);
      this.contractCtx = ctx;
      this.contractOffer = { years: Math.min(10, Math.max(1, ideal)), wage: wr.demand };
      this.contractFeedback = "";
      document.getElementById("contractModal").classList.remove("hidden");
      UI.renderContractModal(Game.state);
    },

    closeContract() {
      this.contractCtx = null;
      document.getElementById("contractModal").classList.add("hidden");
    },

    updateContractSliders() {
      const len = +document.getElementById("cLen").value;
      const wage = +document.getElementById("cWage").value;
      this.contractOffer = { years: len, wage };
      document.getElementById("cLenVal").textContent = len + (len === 1 ? " year" : " years");
      document.getElementById("cWageVal").textContent = UI.wage(wage);
      UI.updateContractComputed(Game.state);
    },

    makeOffer() {
      const state = Game.state, ctx = this.contractCtx;
      if (!ctx) return;
      const p = ctx.player, club = Game.myClub();
      if (Contracts.isLocked(state, p.id)) return;
      const { years, wage } = this.contractOffer;
      const roomBase = Contracts.wageRoom(club) + (ctx.kind === "renew" ? Contracts.effWage(p) : 0);
      if (wage > roomBase) { this.contractFeedback = "That wage won't fit your budget — free up wage room first."; UI.renderContractModal(state); return; }
      if (ctx.kind !== "renew" && club.budget < ctx.fee) { this.contractFeedback = "Not enough transfer budget for the fee."; UI.renderContractModal(state); return; }

      const evalCtx = {
        kind: ctx.kind,
        targetClub: club,
        originClub: ctx.origin ? state.clubs.find(c => c.id === ctx.origin) : null,
      };
      const verdict = Contracts.evaluate(p, wage, years, evalCtx);
      if (verdict.accepted) {
        let res;
        if (ctx.kind === "renew") res = Market.renewContract(state, p.id, wage, years);
        else if (ctx.kind === "scout") res = Scouting.sign(state, ctx.reportId, ctx.listingId, wage, years);
        else if (ctx.kind === "watchlist") res = Scouting.signFromWatchlist(state, ctx.entryId, wage, years);
        else res = Market.completeSigning(state, ctx, wage, years);
        if (!res.ok) { this.contractFeedback = res.reason; UI.renderContractModal(state); return; }
        const msg = ctx.kind === "renew" ? `✍️ ${res.name} renews — ${years}yr deal`
          : res.immediate === false ? `🤝 Pre-agreed ${res.name} — joins when the window opens`
          : `✍️ Signed ${res.name} — ${years}yr deal`;
        UI.toast(msg);
        News.push(state, ctx.kind === "renew" ? "player" : "transfer",
          ctx.kind === "renew" ? `${Game.myClub().short} tie ${res.name} down to a new ${years}-year deal.`
          : `${Game.myClub().short} sign ${res.name} on a ${years}-year deal${res.immediate === false ? " (joins when the window opens)" : ""}.`,
          { playerId: p.id });
        Game.save();
        this.closeContract();
        UI.renderMarket(state); UI.renderSquad(state); UI.renderScouting(state); this.refreshChrome();
        return;
      }
      // Rejected — burn an attempt and give feedback.
      Contracts.recordReject(state, p.id);
      this.contractFeedback = this.rejectMsg(verdict, p);
      Game.save();
      UI.renderContractModal(state);
    },

    rejectMsg(v, p) {
      if (v.reason === "tooLong") return `${p.name} won't commit to a deal that long — offer fewer years.`;
      if (v.reason === "tooShort") return `${p.name} wants more security — offer a longer deal.`;
      if (v.reason === "bigcut") return `${p.name} won't take a pay cut that steep — move closer to their wage.`;
      // Probabilistic knock-back on a below-ask offer: another try might land it.
      const gap = v.reqWage - this.contractOffer.wage;
      return gap > v.reqWage * 0.15
        ? `${p.name} turned down the pay cut — offer more, or try again.`
        : `${p.name} isn't quite convinced — nudge the wage up, or try again.`;
    },
  
    // ---------------- Lineup ----------------
    wireLineup() {
      document.getElementById("formationSelect").addEventListener("change", e => {
        const club = Game.myClub();
        Lineup.autoPick(club, e.target.value);
        Game.save();
        UI.renderLineup(Game.state);
      });
      // Tactics: philosophy chips + dial selects, delegated so they work on the
      // dynamically-rendered panels. ctx "lineup" edits the club's setup; ctx
      // "match" pushes the change into the live sim immediately.
      const applyTac = (ctx, opts) => {
        if (ctx === "match") {
          if (!MatchPlayer.lm) return;
          MatchPlayer.lm.setTactics(opts);
          const club = MatchPlayer.lm.state.userSide === "home" ? MatchPlayer.home : MatchPlayer.away;
          UI.renderTactics(club, document.getElementById("matchTactics"), "match");
          UI.toast(`Tactics — ${Tactics.summary(club)}`);
        } else {
          const club = Game.myClub();
          Tactics.ensure(club);
          if (opts.philosophy) Tactics.applyPhilosophy(club, opts.philosophy);
          else Object.assign(club.tactics, opts);
          Game.save();
          UI.renderTactics(club, document.getElementById("tacticsPanel"), "lineup");
        }
      };
      document.addEventListener("click", e => {
        const chip = e.target.closest("[data-phil]");
        if (!chip) return;
        const panel = chip.closest("[data-tacctx]");
        applyTac(panel ? panel.dataset.tacctx : "lineup", { philosophy: chip.dataset.phil });
      });
      document.addEventListener("change", e => {
        const sel = e.target.closest("select[data-dial]");
        if (!sel) return;
        const panel = sel.closest("[data-tacctx]");
        applyTac(panel ? panel.dataset.tacctx : "lineup", { [sel.dataset.dial]: sel.value });
      });
      document.getElementById("btnAutoPick").addEventListener("click", () => {
        const club = Game.myClub();
        Lineup.autoPick(club, club.formation);
        Game.save();
        UI.renderLineup(Game.state);
      });
      document.getElementById("lineupSlots").addEventListener("change", e => {
        const sel = e.target.closest("select[data-pos]");
        if (!sel) return;
        const club = Game.myClub();
        const pos = sel.dataset.pos, idx = Number(sel.dataset.idx);
        if (sel.value) {
          Lineup.assign(club, pos, idx, sel.value);
        } else {
          const prev = club.lineup.slots[pos][idx];
          club.lineup.slots[pos][idx] = null;
          if (prev) Lineup.addToBench(club, prev);
        }
        Game.save();
        UI.renderPitch(club);
        UI.renderLineupSlots(club);
        UI.renderBench(club);
      });
      document.getElementById("btnPlayMatch").addEventListener("click", () => this.startMatch());

      // Tap a spot on the pitch → set that POSITION's role & instructions.
      document.getElementById("pitch").addEventListener("click", e => {
        const tok = e.target.closest("[data-roleslot]");
        if (tok) this.openRole(tok.dataset.roleslot, tok.dataset.roleplayer);
      });
      document.getElementById("btnRoleClose").addEventListener("click", () => this.closeRole());
      document.getElementById("roleModal").addEventListener("click", e => { if (e.target.id === "roleModal") this.closeRole(); });
      // Role dials / toggles / reset — edit the POSITION's instructions.
      document.getElementById("roleBody").addEventListener("click", e => {
        const club = Game.myClub();
        const dpos = this._roleDpos;
        if (!dpos) return;
        const dial = e.target.closest("[data-rdial]");
        const tog = e.target.closest("[data-rtog]");
        const reset = e.target.closest("[data-rreset]");
        if (dial) PlayerRoles.setPos(club, dpos, dial.dataset.rdial, dial.dataset.val);
        else if (tog) PlayerRoles.setPos(club, dpos, tog.dataset.rtog, !PlayerRoles.ofPos(club, dpos)[tog.dataset.rtog]);
        else if (reset) PlayerRoles.resetPos(club, dpos);
        else return;
        Game.save();
        UI.renderRole(club, dpos, this._roleOccupant);
        UI.renderPitch(club);
      });
    },

    openRole(dpos, playerId) {
      this._roleDpos = dpos;
      const club = Game.myClub();
      const occ = playerId && club.squad.find(p => p.id === playerId);
      this._roleOccupant = occ ? occ.name : "";
      UI.renderRole(club, dpos, this._roleOccupant);
      document.getElementById("roleModal").classList.remove("hidden");
    },
    closeRole() { document.getElementById("roleModal").classList.add("hidden"); },

    startMatch() {
      const club = Game.myClub();
      if (!club.lineup || !Lineup.isComplete(club.lineup)) {
        // Auto-pick first so the error message is a last resort, not the first
        // thing the manager sees if they haven't touched lineup yet.
        Lineup.autoPick(club, club.formation || "4-4-2");
      }
      if (!Lineup.isComplete(club.lineup)) {
        document.getElementById("lineupError").textContent = "Fill every starting slot before kicking off.";
        return;
      }
      const state = Game.state;
      const fixture = Season.userMatchThisRound(state);
      if (!fixture) { UI.toast("No fixture this week."); return; }

      // Resolve every other match in both leagues for the week.
      Season.simulateOtherMatchesThisRound(state);

      // Build the user's live-match queue for the week.
      this.weekQueue = [];

      // Champions League qualifying — played live at the very start of the season.
      this.queueQualifying(state, club);
      // Season curtain-raisers on matchweek 1 (per country).
      this.queueCommunityShield(state, club);
      this.queueSupercopa(state, club);
      this.queueSuperCup(state, club);

      // The league game.
      const home = state.clubs.find(c => c.id === fixture.home);
      const away = state.clubs.find(c => c.id === fixture.away);
      // AI opponents get a fresh auto-pick so they field a valid full XI.
      const ai = home.id === club.id ? away : home;
      Lineup.autoPick(ai, ai.formation || "4-4-2");
      const leagueFull = MatchEngine.simulateFull(home, away);
      this.weekQueue.push({
        type: "league", home, away, full: leagueFull, recorded: false,
        label: LEAGUE_NAMES[Game.myLeague()] + " · Matchweek " + (state.week + 1),
      });

      // A cup round can fall on this week (FA Cup and/or Carabao Cup).
      Object.values(Cup.CUPS).forEach(cfg => {
        const fc = state[cfg.stateKey];
        if (!Cup.isActive(fc) || fc.winner || !Cup.roundForWeek(cfg, state.week, fc)) return;
        Cup.drawRound(state, fc);
        Cup.simulateOtherTies(state, fc, cfg.key);
        const tie = Cup.userTie(state, fc);
        if (tie && !tie.played) {
          const roundDef = Cup.currentRoundDef(cfg, fc);
          const chome = Cup.clubByAnyId(state, tie.home);
          const caway = Cup.clubByAnyId(state, tie.away);
          const cai = chome.id === club.id ? caway : chome;
          Lineup.autoPick(cai, cai.formation || "4-4-2");
          const cupFull = MatchEngine.simulateFull(chome, caway);
          this.weekQueue.push({
            type: "cup", cupKey: cfg.key, home: chome, away: caway, full: cupFull, tie, recorded: false,
            label: cfg.name + " · " + roundDef.name,
          });
        } else {
          Cup.completeRoundIfDone(state, fc); // user not involved — resolve now
        }
      });

      // Vertu Trophy (League One & Two): a group game or a knockout tie.
      this.queueVertu(state, club);

      // European competition (Champions/Europa/Conference League).
      this.queueEuro(state, club);

      this.weekInProgress = true;
      document.getElementById("screen-lineup").classList.add("hidden");
      document.getElementById("screen-hub").classList.add("hidden");
      this.playNextInQueue();
    },

    // Queue the Community Shield if it's matchweek 1, there are participants,
    // and the user is one of them. Otherwise resolve it silently.
    queueCommunityShield(state, club) {
      if (state.week !== 0 || !state.pendingShield) return;
      const ps = state.pendingShield;
      state.pendingShield = null;
      const other = ps.faWinner === ps.champion ? ps.faRunnerUp : ps.faWinner;
      const a = state.clubs.find(c => c.id === ps.champion);
      const b = state.clubs.find(c => c.id === other);
      if (!a || !b) return;
      if (a.id === club.id || b.id === club.id) {
        const foe = a.id === club.id ? b : a;
        Lineup.autoPick(foe, foe.formation || "4-4-2");
        const full = MatchEngine.simulateFull(a, b);
        this.weekQueue.push({ type: "shield", home: a, away: b, full, recorded: false, label: "FA Community Shield" });
      } else {
        MatchEngine.simulateQuick(a, b); // played in the background
      }
    },

    // Winner id of a background one-off tie (penalties settle a draw).
    qsWinner(h, a) {
      Lineup.autoPick(h, h.formation || "4-4-2");
      Lineup.autoPick(a, a.formation || "4-4-2");
      const { hg, ag } = MatchEngine.simulateQuick(h, a);
      if (hg > ag) return h.id;
      if (ag > hg) return a.id;
      return Cup.penaltyWinner(h, a);
    },

    // Queue the Supercopa de España (final four) on matchweek 1 for a Spanish
    // save: La Liga champ v Copa runner-up, Copa champ v La Liga runner-up,
    // then the final. The user plays their own ties live; the rest are simmed.
    queueSupercopa(state, club) {
      if (state.week !== 0 || !state.pendingSupercopa) return;
      const ps = state.pendingSupercopa;
      state.pendingSupercopa = null;
      const byId = id => state.clubs.find(c => c.id === id);
      const clubs = [ps.llWinner, ps.copaRunnerUp, ps.copaWinner, ps.llRunnerUp].map(byId);
      if (clubs.some(c => !c)) return;
      const [a1, a2, b1, b2] = clubs;       // semi A: a1 v a2, semi B: b1 v b2
      const resolve = (h, a, full) => full.hg > full.ag ? h.id : full.ag > full.hg ? a.id : Cup.penaltyWinner(h, a);
      const userInA = a1.id === club.id || a2.id === club.id;
      const userInB = b1.id === club.id || b2.id === club.id;
      if (!userInA && !userInB) {
        const wA = this.qsWinner(a1, a2), wB = this.qsWinner(b1, b2);
        this.qsWinner(byId(wA), byId(wB)); // final, in the background
        return;
      }
      const userSemi = userInA ? [a1, a2] : [b1, b2];
      const otherSemi = userInA ? [b1, b2] : [a1, a2];
      const otherWinnerId = this.qsWinner(otherSemi[0], otherSemi[1]);
      const foe = userSemi[0].id === club.id ? userSemi[1] : userSemi[0];
      Lineup.autoPick(foe, foe.formation || "4-4-2");
      const semiFull = MatchEngine.simulateFull(userSemi[0], userSemi[1]);
      const semiWinnerId = resolve(userSemi[0], userSemi[1], semiFull);
      this.weekQueue.push({ type: "supercopa-semi", home: userSemi[0], away: userSemi[1], full: semiFull, recorded: false, label: "Supercopa de España · Semi-Final" });
      if (semiWinnerId === club.id) {
        const other = byId(otherWinnerId);
        Lineup.autoPick(other, other.formation || "4-4-2");
        const finalFull = MatchEngine.simulateFull(club, other);
        this.weekQueue.push({ type: "supercopa-final", home: club, away: other, full: finalFull, recorded: false, label: "Supercopa de España · Final" });
      } else {
        this.qsWinner(byId(semiWinnerId), byId(otherWinnerId)); // final, in the background
      }
    },

    // Generic season-opening super cup (any nation without a bespoke one):
    // last season's league champion vs the national cup winner, single match.
    queueSuperCup(state, club) {
      if (state.week !== 0 || !state.pendingSuperCup) return;
      const ps = state.pendingSuperCup;
      state.pendingSuperCup = null;
      const a = state.clubs.find(c => c.id === ps.champion);
      const b = state.clubs.find(c => c.id === ps.cupWinner);
      if (!a || !b || a.id === b.id) return; // champion also won the cup — skip
      if (a.id === club.id || b.id === club.id) {
        const foe = a.id === club.id ? b : a;
        Lineup.autoPick(foe, foe.formation || "4-4-2");
        this.weekQueue.push({ type: "supercup", home: a, away: b, full: MatchEngine.simulateFull(a, b), recorded: false, label: ps.name });
      } else {
        this.qsWinner(a, b); // resolved in the background
      }
    },

    // Build a single-leg qualifying tie against the user's next opponent
    // (venue alternates round to round).
    qualItem(me, opp, q) {
      const userHome = (q.round % 2) === 0;
      const home = userHome ? me : opp, away = userHome ? opp : me;
      Lineup.autoPick(opp, opp.formation || "4-4-2");
      return { type: "qual", home, away, full: MatchEngine.simulateFull(home, away), recorded: false, label: q.roundNames[q.round] };
    },

    // Queue the user's current Champions League qualifying tie (start of season).
    queueQualifying(state, club) {
      const q = state.euro && state.euro.qual;
      if (!q || q.resolved || state.week !== 0) return;
      const opp = state.clubs.find(c => c.id === q.opponents[q.round]);
      if (!opp) { q.madeIt = true; Euro.finalizeUserQual(state); return; } // no opponent → walkover through
      this.weekQueue.push(this.qualItem(club, opp, q));
    },

    queueVertu(state, club) {
      if (!Vertu.isActive(state)) return;
      const v = state.vertu;
      if (v.stage === "group") {
        const g = Vertu.userGameThisWeek(state);
        if (!g) return;
        const vh = Vertu.clubById(state, g.home), va = Vertu.clubById(state, g.away);
        const foe = vh.id === club.id ? va : vh;
        Lineup.autoPick(foe, foe.formation || "4-4-2");
        this.weekQueue.push({ type: "vertu-group", game: g, home: vh, away: va, full: MatchEngine.simulateFull(vh, va), recorded: false, label: "Vertu Trophy · Group Stage" });
      } else if (v.stage === "ko" && Vertu.roundForWeek(state.week)) {
        Vertu.drawKoRound(state);
        Vertu.simulateOtherKoTies(state);
        const tie = Vertu.userKoTie(state);
        if (tie && !tie.played) {
          const roundDef = Vertu.currentKoRound(state);
          const vh = Vertu.clubById(state, tie.home), va = Vertu.clubById(state, tie.away);
          const foe = vh.id === club.id ? va : vh;
          Lineup.autoPick(foe, foe.formation || "4-4-2");
          this.weekQueue.push({ type: "vertu-ko", tie, home: vh, away: va, full: MatchEngine.simulateFull(vh, va), recorded: false, label: "Vertu Trophy · " + roundDef.name });
        } else {
          Vertu.completeKoRoundIfDone(state);
        }
      }
    },

    // European competition: a League-Phase matchday or a two-legged knockout
    // leg. The Euro helpers quick-sim every non-user match in the background.
    queueEuro(state, club) {
      if (!Euro.isActive(state)) return;
      Euro.simBackgroundMatchday(state, state.week); // fill the table alongside the user
      const lf = Euro.userLeagueFixtureThisWeek(state);
      if (lf) {
        const eh = Euro.club(state, lf.home), ea = Euro.club(state, lf.away);
        const foe = eh.id === club.id ? ea : eh;
        Lineup.autoPick(foe, foe.formation || "4-4-2");
        const md = Euro.MD_WEEKS.indexOf(lf.week) + 1;
        this.weekQueue.push({
          type: "euro-league", fixture: lf, home: eh, away: ea, full: MatchEngine.simulateFull(eh, ea),
          recorded: false, label: Euro.COMPS[state.euro.userComp].name + " · Matchday " + md,
        });
        return;
      }
      const ko = Euro.userKoLegThisWeek(state, club);
      if (ko) {
        const eh = Euro.club(state, ko.legFix.home), ea = Euro.club(state, ko.legFix.away);
        const foe = eh.id === club.id ? ea : eh;
        Lineup.autoPick(foe, foe.formation || "4-4-2");
        const legTag = ko.meta.twoLeg ? " (" + (ko.legIndex === 0 ? "1st" : "2nd") + " leg)" : "";
        this.weekQueue.push({
          type: "euro-ko", euro: ko, home: eh, away: ea, full: MatchEngine.simulateFull(eh, ea),
          recorded: false, label: Euro.COMPS[ko.comp].name + " · " + ko.meta.name + legTag,
        });
      }
    },

    // Load the next queued match into the player, or wrap up the week.
    playNextInQueue() {
      if (!this.weekQueue.length) { this.finalizeWeek(); return; }
      this.currentItem = this.weekQueue.shift();
      MatchPlayer.load(this.currentItem.home, this.currentItem.away, this.currentItem.full, {
        label: this.currentItem.label, type: this.currentItem.type,
      });
      document.getElementById("screen-match").classList.remove("hidden");
    },

    // Knockout ties the user is in that finished level go to an interactive
    // shootout instead of an auto pen result.
    SHOOTOUT_TYPES: ["cup", "shield", "supercopa-semi", "supercopa-final", "supercup", "qual"],
    needsShootout(item) {
      return !!item && !item.recorded && item.full && item.full.hg === item.full.ag
        && this.SHOOTOUT_TYPES.includes(item.type);
    },

    // Called by MatchPlayer the instant a live match reaches full time.
    onLiveMatchEnded() {
      const item = this.currentItem;
      if (this.needsShootout(item)) {
        Shootout.start(item.home, item.away, Game.state.clubId, winnerId => this.afterShootout(item, winnerId));
        return; // defer recording until the shootout decides the winner
      }
      this.recordItem(item);
    },

    showShootoutScreen() {
      ["hub", "squad", "market", "coaches", "academy", "lineup", "table"].forEach(t => document.getElementById("screen-" + t).classList.add("hidden"));
      document.getElementById("screen-match").classList.add("hidden");
      document.getElementById("screen-seasonend").classList.add("hidden");
      document.getElementById("screen-shootout").classList.remove("hidden");
      document.getElementById("tabs").classList.add("hidden"); // no navigating away mid-shootout
    },

    afterShootout(item, winnerId) {
      Cup._pendingPenWinner = winnerId; // consumed by the pen resolution in recordItem
      document.getElementById("screen-shootout").classList.add("hidden");
      document.getElementById("tabs").classList.remove("hidden");
      this.recordItem(item);
      this.playNextInQueue();
    },

    // Apply a match's precomputed outcome to game state (idempotent).
    // Credit a played match's goals/assists into a competition bucket, using the
    // real scorers/assisters from the live result (falls back gracefully).
    creditUserSideMatch(item, comp) {
      const f = item.full;
      if (f && f.hStarters && f.aStarters && item.home && item.away) {
        Stats.recordUserMatch(f.hStarters, f.aStarters, f.hg, f.ag, f.homeScorers, f.awayScorers, f.homeAssists, f.awayAssists, item.home.squad, item.away.squad, comp);
      }
    },

    recordItem(item) {
      if (!item || item.recorded) return;
      item.recorded = true;
      const state = Game.state;
      // Any match the user's club played drains the fitness of the XI that
      // featured (stacks across a congested week) and settles discipline.
      if (item.full && item.home && item.away && (item.home.id === state.clubId || item.away.id === state.clubId)) {
        const me = Game.myClub();
        if (me) {
          // Minutes played come from the live match if it was played out; otherwise
          // assume the starting XI did the full 90.
          let minutes = item.userMinutes;
          if (!minutes && me.lineup) { minutes = {}; Lineup.starterIds(me.lineup).forEach(id => { minutes[id] = 90; }); }
          if (minutes) Fitness.recordMatch(me, minutes);
          // Positional development: whoever played out of position gets a little
          // better at that spot (a CM learning CDM, etc.). Uses the XI's slots.
          if (minutes && typeof Positions !== "undefined") {
            const slotMap = Positions.slotMap(me);
            const learned = [];
            Object.entries(slotMap).forEach(([id, dpos]) => {
              const p = me.squad.find(x => x.id === id);
              if (!p || !minutes[id]) return;
              const before = Positions.familiarity(p, dpos);
              Positions.trainPosition(p, dpos, minutes[id]);
              const after = Positions.familiarity(p, dpos);
              if (after >= 0.82 && before < 0.82) learned.push(`${p.name} can now play ${dpos}`);
            });
            learned.forEach(msg => { if (typeof News !== "undefined") News.push(state, "player", `📐 ${msg}.`); });
          }
          // A standout or stinker of a performance nudges morale (feeds the loop).
          (item.userRatings || []).forEach(r => {
            const p = me.squad.find(x => x.id === r.id);
            if (!p) return;
            const bump = r.potm ? 4 : r.rating >= 7.8 ? 3 : r.rating >= 7 ? 1.5 : r.rating < 5.5 ? -3 : r.rating < 6.2 ? -1.5 : 0;
            if (bump && typeof Morale !== "undefined") p.morale = clamp((p.morale ?? 70) + bump, 5, 100);
          });
          // Any outstanding ban is served by sitting out this match; then new
          // red cards from this match start a one-match ban.
          (me.squad || []).forEach(p => { if (p.suspendedMatches > 0) p.suspendedMatches--; });
          const userSide = item.home.id === state.clubId ? "home" : "away";
          Career.recordMatch(state, userSide === "home" ? item.full.hg : item.full.ag, userSide === "home" ? item.full.ag : item.full.hg);
          News.userResult(state, item);
          (item.full.reds || []).forEach(r => {
            if (r.side !== userSide) return;
            const p = me.squad.find(x => x.id === r.playerId);
            if (p) { p.suspendedMatches = 1; UI.toast(`🟥 ${p.name} sent off — suspended for the next match`); }
          });
        }
      }
      if (item.type === "league") {
        Season.recordResult(state, item.home.id, item.away.id, item.full.hg, item.full.ag);
        Stats.recordUserMatch(item.full.hStarters, item.full.aStarters, item.full.hg, item.full.ag, item.full.homeScorers, item.full.awayScorers, item.full.homeAssists, item.full.awayAssists, item.home.squad, item.away.squad);
      } else if (item.type === "cup") {
        const cfg = Cup.CUPS[item.cupKey];
        const fc = state[cfg.stateKey];
        Cup.recordUserTie(state, fc, item.full.hg, item.full.ag);
        if (item.full.hStarters && item.full.aStarters) {
          Stats.recordUserMatch(item.full.hStarters, item.full.aStarters, item.full.hg, item.full.ag, item.full.homeScorers, item.full.awayScorers, item.full.homeAssists, item.full.awayAssists, item.home.squad, item.away.squad, cfg.key);
        }
        Cup.completeRoundIfDone(state, fc);
        if (item.tie.pens) {
          document.getElementById("matchStatus").textContent = "AET · " + Cup.clubShort(state, item.tie.winner) + " win on pens";
        }
      } else if (item.type === "shield") {
        this.creditUserSideMatch(item, "supercup");
        let winnerId = item.full.hg > item.full.ag ? item.home.id
          : item.full.ag > item.full.hg ? item.away.id
          : Cup.penaltyWinner(item.home, item.away);
        if (winnerId === state.clubId) {
          state.honours = state.honours || [];
          state.honours.push({ type: "shield", season: state.season });
        }
        document.getElementById("matchStatus").textContent =
          (item.full.hg === item.full.ag ? "Pens · " : "") + Cup.clubShort(state, winnerId) + " lift the Shield";
      } else if (item.type === "supercopa-semi") {
        this.creditUserSideMatch(item, "supercup");
        const w = item.full.hg > item.full.ag ? item.home.id
          : item.full.ag > item.full.hg ? item.away.id
          : Cup.penaltyWinner(item.home, item.away);
        document.getElementById("matchStatus").textContent =
          (item.full.hg === item.full.ag ? "Pens · " : "") + Cup.clubShort(state, w) + " reach the final";
      } else if (item.type === "supercopa-final") {
        this.creditUserSideMatch(item, "supercup");
        const w = item.full.hg > item.full.ag ? item.home.id
          : item.full.ag > item.full.hg ? item.away.id
          : Cup.penaltyWinner(item.home, item.away);
        if (w === state.clubId) {
          state.honours = state.honours || [];
          state.honours.push({ type: "supercopa", season: state.season });
        }
        document.getElementById("matchStatus").textContent =
          (item.full.hg === item.full.ag ? "Pens · " : "") + Cup.clubShort(state, w) + " win the Supercopa";
      } else if (item.type === "supercup") {
        this.creditUserSideMatch(item, "supercup");
        const w = item.full.hg > item.full.ag ? item.home.id
          : item.full.ag > item.full.hg ? item.away.id
          : Cup.penaltyWinner(item.home, item.away);
        if (w === state.clubId) {
          state.honours = state.honours || [];
          state.honours.push({ type: "supercup", season: state.season });
        }
        document.getElementById("matchStatus").textContent =
          (item.full.hg === item.full.ag ? "Pens · " : "") + Cup.clubShort(state, w) + " win the Super Cup";
      } else if (item.type === "qual") {
        const q = state.euro.qual;
        const userIsHome = item.home.id === state.clubId;
        const uG = userIsHome ? item.full.hg : item.full.ag;
        const oG = userIsHome ? item.full.ag : item.full.hg;
        const userWon = uG > oG ? true : oG > uG ? false : Cup.penaltyWinner(item.home, item.away) === state.clubId;
        const statusEl = document.getElementById("matchStatus");
        const pens = uG === oG ? "Pens · " : "";
        if (userWon) {
          q.round++;
          if (q.round >= q.total) {
            q.madeIt = true; Euro.finalizeUserQual(state);
            if (statusEl) statusEl.textContent = pens + "🎉 Qualified for the Champions League!";
          } else {
            if (statusEl) statusEl.textContent = pens + "Through to the next round!";
            const me = Game.myClub();
            const opp = state.clubs.find(c => c.id === q.opponents[q.round]);
            if (opp && me) this.weekQueue.unshift(this.qualItem(me, opp, q));
            else { q.madeIt = true; Euro.finalizeUserQual(state); }
          }
        } else {
          q.madeIt = false; Euro.finalizeUserQual(state);
          if (statusEl) statusEl.textContent = pens + "Knocked out — into the Europa League.";
        }
      } else if (item.type === "euro-league") {
        Euro.recordUserLeagueGame(state, item.fixture, item.full.hg, item.full.ag);
        if (item.full.hStarters && item.full.aStarters && state.euro && state.euro.userComp) {
          Stats.recordUserMatch(item.full.hStarters, item.full.aStarters, item.full.hg, item.full.ag, item.full.homeScorers, item.full.awayScorers, item.full.homeAssists, item.full.awayAssists, item.home.squad, item.away.squad, state.euro.userComp);
        }
      } else if (item.type === "euro-ko") {
        const status = Euro.recordUserKoLeg(state, item.euro, item.full.hg, item.full.ag);
        if (status) document.getElementById("matchStatus").textContent = status;
        if (item.full.hStarters && item.full.aStarters && state.euro && state.euro.userComp) {
          Stats.recordUserMatch(item.full.hStarters, item.full.aStarters, item.full.hg, item.full.ag, item.full.homeScorers, item.full.awayScorers, item.full.homeAssists, item.full.awayAssists, item.home.squad, item.away.squad, state.euro.userComp);
        }
      } else if (item.type === "vertu-group") {
        Vertu.recordUserGroupGame(state, item.game, item.full.hg, item.full.ag);
        this.creditUserSideMatch(item, "vertu");
      } else if (item.type === "vertu-ko") {
        Vertu.recordUserKoTie(state, item.full.hg, item.full.ag);
        this.creditUserSideMatch(item, "vertu");
        Vertu.completeKoRoundIfDone(state);
        if (item.tie.pens) {
          document.getElementById("matchStatus").textContent = "AET · " + Vertu.clubShort(state, item.tie.winner) + " win on pens";
        }
      }
      Game.save();
    },
  
    // ---------------- Match controls ----------------
    wireMatch() {
      document.getElementById("btnMatchStart").addEventListener("click", () => MatchPlayer.start());
      document.getElementById("btnMatchPause").addEventListener("click", () => MatchPlayer.pause());
      document.getElementById("btnMatchSkip").addEventListener("click", () => MatchPlayer.skip());
      document.getElementById("btnMatchSubs").addEventListener("click", () => MatchPlayer.openSubs());
      document.getElementById("btnSubsClose").addEventListener("click", () => { MatchPlayer.closeSubs(); MatchPlayer.start(); });
      document.getElementById("btnMatchRatings").addEventListener("click", () => MatchPlayer.toggleRatings());
      document.getElementById("btnRatingsClose").addEventListener("click", () => { MatchPlayer.closeRatings(); MatchPlayer.start(); });
      // In-match approach shift (attack / defend) — the only tactical change allowed live.
      document.getElementById("matchTactics").addEventListener("click", e => {
        const b = e.target.closest("[data-mment]");
        if (!b || !MatchPlayer.lm) return;
        MatchPlayer.lm.setTactics({ mentality: b.dataset.mment });
        const club = MatchPlayer.lm.state.userSide === "home" ? MatchPlayer.home : MatchPlayer.away;
        UI.renderMatchMentality(club, document.getElementById("matchTactics"));
        UI.toast(`Approach: ${b.dataset.mment === "attacking" ? "⚔️ Attack" : b.dataset.mment === "defensive" ? "🛡️ Defend" : "⚖️ Balanced"}`);
      });
      document.getElementById("subsPanel").addEventListener("click", e => {
        const off = e.target.closest("button[data-suboff]");
        if (off) { MatchPlayer.selectOff(off.dataset.suboff); return; }
        const on = e.target.closest("button[data-subon]");
        if (on && !on.disabled) MatchPlayer.doSub(on.dataset.subon);
      });
      document.querySelectorAll(".speed-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".speed-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          MatchPlayer.setSpeed(Number(btn.dataset.speed));
        });
      });
      document.getElementById("btnMatchContinue").addEventListener("click", () => this.finishMatch());
      document.getElementById("goalWrap").addEventListener("click", e => {
        const spot = e.target.closest("[data-spot]");
        if (spot) Shootout.pick(Number(spot.dataset.spot));
      });
      document.getElementById("btnShootoutContinue").addEventListener("click", () => Shootout.onContinue());
    },
  
    // "Continue" after a live match — record it (if not already) and move on
    // to the next queued match, or finalise the week.
    finishMatch() {
      if (this.needsShootout(this.currentItem)) return; // a shootout is deciding this tie
      this.recordItem(this.currentItem);
      this.playNextInQueue();
    },

    // No more live matches this week: advance the week and route onward.
    finalizeWeek() {
      this.weekInProgress = false;
      this.currentItem = null;
      const state = Game.state;
      this.windowTransition = Season.advanceWeek(state);
      Game.save();
      if (Season.isSeasonOver(state)) {
        const result = Season.endOfSeason(state);
        Game.save();
        this.renderSeasonEnd(result);
      } else if (Career.checkMidSeasonSack(state)) {
        Career.enterJobMarket(state, "sacked mid-season");
        Game.save();
        this.renderJobMarket("💥 You've been dismissed", "The board have run out of patience and relieved you of your duties mid-season.");
      } else {
        const t = this.windowTransition;
        this.showTab("hub");
        if (t && t.transition === "opened") {
          UI.toast(`🔁 ${t.name} transfer window is now open!`);
          (t.arrivals || []).forEach(a => UI.toast(a.refunded ? `⚠️ ${a.name}'s pre-agreed move fell through (squad full) — fee refunded` : `✅ ${a.name} completes his pre-agreed move and joins the squad`));
        }
        else if (t && t.transition === "closed") UI.toast("🔒 Transfer window has closed — you can still pre-agree deals for the next window.");
        (state.academyNews || []).forEach(m => UI.toast(m));
        (state.scoutNews || []).forEach(m => UI.toast(m));
        (state.medicalNews || []).forEach(m => UI.toast(m));
        (state.moraleNews || []).forEach(m => UI.toast(m));
      }
    },

    // Mid-week bail-out (e.g. user taps a tab): record every remaining match
    // from its precomputed result, advance the week. Returns true if it routed
    // to the season-end screen.
    wrapUpWeek() {
      MatchPlayer.finishSilently(); // resolve the in-progress live match's result + minutes
      this.recordItem(this.currentItem);
      while (this.weekQueue.length) this.recordItem(this.weekQueue.shift());
      this.weekInProgress = false;
      this.currentItem = null;
      const state = Game.state;
      this.windowTransition = Season.advanceWeek(state);
      Game.save();
      if (Season.isSeasonOver(state)) {
        const result = Season.endOfSeason(state);
        Game.save();
        this.renderSeasonEnd(result);
        return true;
      }
      return false;
    },
  
    // ---------------- Season end ----------------
    renderSeasonEnd(result) {
      const state = Game.state;
      const club = Game.myClub();
      ["hub", "squad", "market", "lineup", "table"].forEach(t => document.getElementById("screen-" + t).classList.add("hidden"));
      document.getElementById("tabs").classList.add("hidden");
      document.getElementById("screen-match").classList.add("hidden");
      const screen = document.getElementById("screen-seasonend");
      screen.classList.remove("hidden");
  
      const fromLeagueName = LEAGUE_NAMES[result.userLeague];

      if (result.sacked) {
        // No longer career-over: the board dismiss you, but a job market opens.
        Career.enterJobMarket(state, result.sackReason);
        Game.save();
        this.renderJobMarket("You've been sacked", `${club.name} ${result.sackReason}. The board have dismissed you — but your managerial career continues. Choose your next challenge.`);
        return;
      }

      // Headline + subtitle for the season's outcome.
      const toLeagueName = LEAGUE_NAMES[result.toLeague];
      let headline = "Season Complete", headClass = "";
      if (result.isChampion && result.userLeague !== "PL") headline = `🏆 ${fromLeagueName} Winners!`;
      else if (result.isChampion) headline = "🏆 Champions!";
      else if (result.userPromoted) headline = "🔼 Promoted!";
      else if (result.userRelegated) { headline = "🔽 Relegated"; headClass = "relegated"; }

      let movementLine = "";
      if (result.userPromoted) movementLine = `<p class="promo-line">${club.name} go up to the <strong>${toLeagueName}</strong> next season.</p>`;
      else if (result.userRelegated) movementLine = `<p class="releg-line">${club.name} drop to the <strong>${toLeagueName}</strong> next season — the career continues.</p>`;

      // Play-off outcome (League One / Two only).
      let playoffLine = "";
      if (result.userPlayoff === "won") playoffLine = `<p class="promo-line">🎉 Won the play-off final!</p>`;
      else if (result.userPlayoff === "lostFinal") playoffLine = `<p class="muted">Lost the play-off final — so near, yet so far.</p>`;
      else if (result.userPlayoff === "lostSemi") playoffLine = `<p class="muted">Knocked out in the play-off semi-final.</p>`;

      const cupLine = cup => cup
        ? `<p class="${cup.userWon ? "promo-line" : "muted"}">${cup.name}: ${cup.userWon ? "🏆 " + club.name + " — Winners!" : cup.winner + " · your run: " + cup.userResult}</p>`
        : "";

      const verdict = result.objectiveVerdict;
      const objectiveHTML = verdict
        ? `<div class="objective-verdict ${verdict.status}">
             <span class="obj-badge">${verdict.status === "exceeded" ? "⭐ Objective exceeded" : verdict.status === "met" ? "✅ Objective met" : "✖ Objective missed"}</span>
             <div style="margin-top:0.35rem;">Board target: <strong>${verdict.headline}</strong>. ${verdict.detail}${verdict.reward ? ` A <strong>${UI.money(verdict.reward)}</strong> boost has been added to your budget.` : ""}</div>
           </div>`
        : "";

      const size = (result.tables && result.tables[result.userLeague]) ? result.tables[result.userLeague].length : 20;
      const zone = Season.zoneFor(result.myFinalPos, result.userLeague, size);
      const news = result.ageingNews;
      let newsHTML = "";
      if (news && (news.retirements.length || news.breakouts.length || (news.willRetire && news.willRetire.length))) {
        newsHTML = `<div class="panel" style="text-align:left; margin-top:1.2rem;"><h3>Off-season news — ${club.name}</h3>`;
        if (news.retirements.length) {
          newsHTML += `<p class="muted">Retired: ${news.retirements.map(r => `${r.name} (${r.age})`).join(", ")}</p>`;
        }
        if (news.willRetire && news.willRetire.length) {
          newsHTML += `<p>📣 Retiring at the end of next season: <strong>${news.willRetire.map(r => `${r.name} (${r.age})`).join(", ")}</strong></p>`;
        }
        if (news.breakouts.length) {
          newsHTML += `<p>Breakout development: ${news.breakouts.map(b => `${b.name} ${b.from}→${b.to}`).join(", ")}</p>`;
        }
        newsHTML += `<p class="muted" style="font-size:0.78rem;">${news.totalRetired} players retired across both leagues this off-season.</p></div>`;
      }
      const departed = result.contractDepartures || [];
      if (departed.length) {
        newsHTML += `<div class="panel" style="text-align:left; margin-top:1.2rem;"><h3>Contracts expired — ${club.name}</h3>
          <p class="muted">Left on a free (out of contract): ${departed.map(d => `${d.name} (${d.rating})`).join(", ")}</p>
          <p class="muted" style="font-size:0.78rem;">Renew key players before their deal runs out to keep them.</p></div>`;
      }
      const awardsHTML = result.awards
        ? `<div class="panel" style="text-align:left; margin-top:1.2rem;">
             <h3>${fromLeagueName} Awards</h3>
             ${UI.awardsGridHTML(result.awards)}
             ${UI.bonusCalloutHTML(result.bonusesGranted)}
             <h4 style="margin-top:1.2rem;">Final ${fromLeagueName} Leaderboards</h4>
             ${UI.seasonStatBoardsHTML(result.awards)}
           </div>`
        : "";
      const teamsHTML = (result.teamsOfYear && result.teamsOfYear.length)
        ? `<div class="panel" style="text-align:left; margin-top:1.2rem;"><h3>🏅 Teams of the Year — final</h3>${UI.renderSeasonEndTeams(result.teamsOfYear)}</div>`
        : "";
      screen.innerHTML = `
        <div class="trophy-screen">
          <p class="eyebrow">${fromLeagueName} · Season ${state.season - 1}/${String(state.season).slice(2)} complete</p>
          <div class="big ${headClass}">${headline}</div>
          <p>${club.name} finished <strong>${ordinal(result.myFinalPos)}</strong> in the ${fromLeagueName}${zone ? " — " + zoneLabel(zone) : ""}.</p>
          ${objectiveHTML}
          ${movementLine}
          ${playoffLine}
          ${cupLine(result.faCup)}
          ${cupLine(result.eflCup)}
          ${cupLine(result.copa)}
          ${cupLine(result.natCup)}
          ${result.euro && result.euro.eligible ? cupLine(result.euro) : ""}
          ${result.vertu && result.vertu.eligible ? cupLine(result.vertu) : ""}
          <p class="muted">${fromLeagueName} champions: ${result.champion.name} · New budget: ${UI.money(club.budget)}</p>
          <button class="primary" id="btnSeasonContinue">Continue to Next Season</button>
          ${teamsHTML}
          ${awardsHTML}
          ${newsHTML}
        </div>
      `;
      document.getElementById("btnSeasonContinue").addEventListener("click", () => {
        document.getElementById("tabs").classList.remove("hidden");
        this.showTab("hub");
      });
    },
  };
  
  // =========================================================================
  // LIVE MATCH PLAYER
  // =========================================================================
  // Pure visualiser — reveals a precomputed timeline. Recording the outcome
  // and advancing the week is App's job (App.onLiveMatchEnded / finalizeWeek).
  const MatchPlayer = {
    home: null, away: null, lm: null, speed: 1, timer: null, running: false, interactive: false, selectedOff: null,

    load(home, away, full, meta) {
      this.home = home; this.away = away;
      this.lm = MatchEngine.liveMatch(home, away, Game.state.clubId);
      this.interactive = !!this.lm.state.userSide;
      this.speed = 1; this.running = false; this.selectedOff = null;
      clearInterval(this.timer);

      const comp = document.getElementById("matchCompetition");
      comp.textContent = (meta && meta.label) || "";
      comp.className = "match-competition" + (meta && meta.type && meta.type !== "league" ? " cup" : "");

      document.getElementById("matchHomeCrest").outerHTML = UI.crestHTML(home).replace('class="crest "', 'class="crest" id="matchHomeCrest"');
      document.getElementById("matchAwayCrest").outerHTML = UI.crestHTML(away).replace('class="crest "', 'class="crest" id="matchAwayCrest"');
      document.getElementById("matchHomeName").textContent = home.short;
      document.getElementById("matchAwayName").textContent = away.short;
      document.getElementById("matchScore").textContent = "0 – 0";
      document.getElementById("matchClock").textContent = "0'";
      document.getElementById("matchStatus").textContent = "Ready";
      document.getElementById("commentaryFeed").innerHTML = "";
      document.getElementById("momHome").style.width = "50%";
      document.getElementById("momAway").style.width = "50%";
      // Live-stats panel — team labels, your side highlighted, everything reset.
      const us = this.lm.state.userSide;
      document.getElementById("momLabelH").textContent = home.short + (us === "home" ? " (you)" : "");
      document.getElementById("momLabelA").textContent = away.short + (us === "away" ? " (you)" : "");
      document.getElementById("momStatus").textContent = "Kick-off";
      const ls = document.getElementById("matchLiveStats");
      ls.dataset.you = us || "";
      ["lsPossH", "lsPossA"].forEach(id => document.getElementById(id).textContent = "50%");
      document.getElementById("lsPossBar").style.width = "50%";
      ["lsShotsH", "lsShotsA", "lsSotH", "lsSotA"].forEach(id => document.getElementById(id).textContent = "0");
      ["lsXgH", "lsXgA"].forEach(id => document.getElementById(id).textContent = "0.0");
      document.getElementById("btnMatchStart").disabled = false;
      document.getElementById("btnMatchPause").disabled = true;
      document.getElementById("btnMatchContinue").classList.add("hidden");
      document.getElementById("subsPanel").classList.add("hidden");
      document.getElementById("matchReport").classList.add("hidden");
      document.getElementById("btnMatchSubs").classList.toggle("hidden", !this.interactive);
      document.getElementById("btnMatchRatings").classList.toggle("hidden", !this.interactive);
      document.getElementById("matchRatings").classList.add("hidden");
      // In-match you can only shift the approach (attack/defend) — not restyle the
      // whole team or re-brief players (those are locked in from the lineup screen).
      const mt = document.getElementById("matchTactics");
      mt.classList.toggle("hidden", !this.interactive);
      if (this.interactive) {
        const club = this.lm.state.userSide === "home" ? home : away;
        UI.renderMatchMentality(club, mt);
      }
      // Basic opposition scouting: their club philosophy only, nothing more.
      const ob = document.getElementById("oppBrief");
      if (this.interactive && typeof Tactics !== "undefined") {
        const opp = this.lm.state.userSide === "home" ? away : home;
        const ph = Tactics.philosophyOf(opp);
        ob.innerHTML = `<span class="ob-eyebrow">Opposition</span><span class="ob-club">${opp.short}</span><span class="ob-phil">${ph.icon} ${ph.label}</span>`;
        ob.classList.remove("hidden");
      } else {
        ob.classList.add("hidden");
      }
      this.updateSubsBtn();
      this.buildPitch(home, away);
      document.querySelectorAll(".speed-btn").forEach(b => b.classList.toggle("active", b.dataset.speed === "1"));
    },

    updateSubsBtn() {
      const btn = document.getElementById("btnMatchSubs");
      if (!this.interactive) { btn.classList.add("hidden"); return; }
      const left = this.lm.subsLeft();
      btn.disabled = left <= 0 || this.lm.state.done;
      btn.textContent = "🔁 Subs (" + left + ")";
    },

    start() {
      if (!this.lm || this.lm.state.done) return;
      this.running = true;
      document.getElementById("btnMatchStart").disabled = true;
      document.getElementById("btnMatchPause").disabled = false;
      document.getElementById("matchStatus").textContent = "Live";
      this.scheduleTick();
    },

    // Self-scheduling loop so each minute can run at its own pace: normal most of
    // the time, but stretched out for the big moments (see nextDelay).
    scheduleTick(delay) {
      clearTimeout(this.timer);
      if (!this.running) return;
      this.timer = setTimeout(() => this.tick(), delay != null ? delay : 300 / this.speed);
    },

    setSpeed(n) { this.speed = n; if (this.running) this.scheduleTick(); },

    pause() {
      this.running = false;
      clearTimeout(this.timer);
      this.setSlowmo(false);
      document.getElementById("btnMatchStart").disabled = false;
      document.getElementById("btnMatchPause").disabled = true;
      document.getElementById("matchStatus").textContent = "Paused";
    },

    tick() {
      if (this.lm.state.done) { this.endMatch(); return; }
      const events = this.lm.stepMinute();
      events.forEach(e => this.reveal(e));
      this.movePitch(events);
      this.updateClock();
      if (!document.getElementById("matchRatings").classList.contains("hidden")) this.renderRatings();
      if (this.lm.state.done) { this.endMatch(); return; }
      if (this.running) this.scheduleTick(this.nextDelay(events));
    },

    // Drama-driven pacing: the clock slows for the moments that matter — a goal
    // holds longest, then big chances and red cards, and a hard momentum swing
    // (a team suddenly breaking / on the counter) gets stretched a little too.
    nextDelay(events) {
      const base = 300 / this.speed;
      const mom = this.lm.state.momentum;
      const swing = Math.abs(mom - (this._prevMom == null ? mom : this._prevMom));
      this._prevMom = mom;
      const has = t => events.some(e => e.type === t);
      let mult = 1;
      if (has("goal")) mult = 5.5;
      else if (has("chance")) mult = 2.8;
      else if (has("red")) mult = 2.2;
      else if (swing >= 14 || mom >= 82 || mom <= 18) mult = 1.7; // a surge / counter breaking
      const slow = mult >= 1.7;
      this.setSlowmo(slow, base * mult);
      return base * mult;
    },
    setSlowmo(on, holdMs) {
      const scr = document.getElementById("screen-match");
      if (!scr) return;
      scr.classList.toggle("slowmo", !!on);
      clearTimeout(this._slowClear);
      if (on) this._slowClear = setTimeout(() => scr.classList.remove("slowmo"), (holdMs || 500) + 120);
    },

    // ---- live pitch (watch the game happen) ----
    buildPitch(home, away) {
      const wrap = document.getElementById("mpPlayers");
      if (!wrap) return;
      wrap.innerHTML = "";
      this.dots = [];
      const us = this.lm.state.userSide;
      const userXI = us ? this.lm.onPitchUser() : [];
      const byPos = { GK: userXI.filter(p => p.pos === "GK"), DF: userXI.filter(p => p.pos === "DF"), MF: userXI.filter(p => p.pos === "MF"), FW: userXI.filter(p => p.pos === "FW") };
      const idx = { GK: 0, DF: 0, MF: 0, FW: 0 };
      const add = (x, y, side, team, role, pid) => { const d = document.createElement("div"); d.className = "mp-dot " + team + (role === "gk" ? " gk" : ""); d.style.left = x + "%"; d.style.top = y + "%"; wrap.appendChild(d); this.dots.push({ el: d, bx: x, by: y, x, y, side, team, role, pid }); };
      const layout = (formation, side) => {
        const rows = String(formation || "4-4-2").split("-").map(Number).filter(n => n > 0);
        const team = side === us ? "you" : "opp";
        const isUser = side === us;
        const pool = pn => { if (!isUser) return null; const arr = byPos[pn]; const p = arr && arr[idx[pn]] ? arr[idx[pn]] : null; idx[pn]++; return p && p.id; };
        add(side === "home" ? 7 : 93, 50, side, team, "gk", pool("GK"));
        const names = rows.length === 3 ? ["DF", "MF", "FW"] : rows.length === 4 ? ["DF", "MF", "MF", "FW"] : rows.map((_, i) => i === 0 ? "DF" : i === rows.length - 1 ? "FW" : "MF");
        const R = rows.length;
        rows.forEach((n, bi) => {
          // Spread the outfield rows across the pitch: defenders sit deep (~x22),
          // forwards push into the opponent half (~x64), so the two teams
          // actually meet in midfield instead of hugging their own halves.
          const frac = R > 1 ? bi / (R - 1) : 0.5;
          const x = side === "home" ? 22 + frac * 42 : 78 - frac * 42;
          const role = bi === 0 ? "def" : bi === R - 1 ? "fwd" : "mid";
          for (let i = 0; i < n; i++) add(x, n === 1 ? 50 : 14 + (i / (n - 1)) * 72, side, team, role, pool(names[bi] || "MF"));
        });
      };
      layout(home.formation, "home");
      layout(away.formation, "away");
      this.ballX = 50; this.ballY = 50;
      const b = document.getElementById("mpBall"); if (b) { b.style.left = "50%"; b.style.top = "50%"; }
      this.updateFormation();
      this.updateDotColors();
    },
    setBall(x, y) {
      this.ballX = x; this.ballY = y;
      const b = document.getElementById("mpBall");
      if (b) { b.style.left = x + "%"; b.style.top = y + "%"; }
      this.updateFormation();
    },
    // The whole team breathes with the ball — it slides up the pitch when the ball
    // is forward and drops when it's back — but everyone holds their formation
    // shape (forwards stay high, defenders stay deep). Subtle, so dots stand where
    // they're meant to rather than swarming the ball.
    updateFormation() {
      if (!this.dots) return;
      const bx = this.ballX ?? 50, by = this.ballY ?? 50;
      // How far each line shifts with the ball (forwards move most, keeper least).
      const roleShift = { gk: 0.05, def: 0.30, mid: 0.46, fwd: 0.60 };
      this.dots.forEach(d => {
        const dir = d.side === "home" ? 1 : -1;          // this team's attacking direction
        const ballFwd = dir * (bx - 50);                  // >0 → ball is in this team's attacking half
        const w = roleShift[d.role] ?? 0.4;
        let tx = d.bx + ballFwd * w * 0.30;               // slide the block with the play
        if (d.role === "gk") tx = d.bx + ballFwd * 0.05;  // keeper barely leaves the line
        d.x = clamp(tx, 3, 97);
        d.y = d.by;                                        // hold the formation's width
        d.el.style.left = d.x + "%"; d.el.style.top = d.y + "%";
      });
      // Ring the dot nearest the ball, for a bit of life.
      let best = null, bd = 1e9;
      this.dots.forEach(d => { const dd = (d.x - bx) ** 2 + (d.y - by) ** 2; if (dd < bd) { bd = dd; best = d; } });
      this.dots.forEach(d => d.el.classList.toggle("active", d === best));
    },
    ratingColor(r) { const hue = clamp((r - 4) / 5, 0, 1) * 125; return `hsl(${Math.round(hue)}, 68%, 52%)`; },
    updateDotColors() {
      if (!this.dots || !this.lm) return;
      const lr = this.lm.ratingsLive();
      this.dots.forEach(d => { if (d.team !== "you" || !d.pid) return; const r = lr[d.pid]; if (r != null) d.el.style.background = this.ratingColor(r); });
    },

    // ---- live player ratings (spot who's struggling) ----
    toggleRatings() {
      const panel = document.getElementById("matchRatings");
      if (panel.classList.contains("hidden")) { this.pause(); this.openRatings(); }
      else { this.closeRatings(); }
    },
    openRatings() { document.getElementById("matchRatings").classList.remove("hidden"); this.renderRatings(); },
    closeRatings() { document.getElementById("matchRatings").classList.add("hidden"); },
    renderRatings() {
      const panel = document.getElementById("matchRatings");
      if (!this.lm || panel.classList.contains("hidden")) return;
      const club = this.lm.state.userSide === "home" ? this.home : this.away;
      const lr = this.lm.ratingsLive();
      const slotMap = typeof Positions !== "undefined" ? Positions.slotMap(club) : {};
      const list = this.lm.onPitchUser()
        .map(p => ({ p, r: lr[p.id] != null ? lr[p.id] : 6.5, slot: slotMap[p.id] || (typeof Positions !== "undefined" ? Positions.dposOf(p) : p.pos) }))
        .sort((a, b) => a.r - b.r); // worst first — surface the problems
      document.getElementById("matchRatingsList").innerHTML = list.map(({ p, r, slot }) => {
        const rr = r.toFixed(1);
        return `<div class="rate-row">
          <span class="rate-pos">${slot}</span>
          <span class="rate-name">${p.name}</span>
          <span class="rate-bar"><span class="rate-fill" style="width:${Math.round(r / 10 * 100)}%;background:${this.ratingColor(r)};"></span></span>
          <span class="rate-val" style="color:${this.ratingColor(r)};">${rr}</span>
        </div>`;
      }).join("");
    },
    flashPitch(type) {
      const f = document.getElementById("mpFlash");
      if (!f) return;
      f.className = "mp-flash"; void f.offsetWidth; f.classList.add(type);
    },
    // A super-brief GOAL! flash with the scorer and (if any) the assister.
    showGoalFlash(evt) {
      const el = document.getElementById("goalFlash");
      if (!el || !evt) return;
      const us = this.lm.state.userSide;
      const forUs = us && evt.side === us;
      el.className = "goal-flash " + (us ? (forUs ? "gf-for" : "gf-against") : "gf-for");
      document.getElementById("gfScorer").textContent = evt.scorer || "Goal";
      const asst = document.getElementById("gfAssist");
      asst.textContent = evt.assist ? "assist — " + evt.assist : "";
      asst.hidden = !evt.assist;
      document.getElementById("gfScore").textContent = `${this.lm.state.hg} – ${this.lm.state.ag}`;
      void el.offsetWidth; el.classList.add("show");
      clearTimeout(this._gfTimer);
      this._gfTimer = setTimeout(() => el.classList.remove("show"), 2000);
    },
    movePitch(events) {
      if (!this.dots) return;
      const st = this.lm.state, us = st.userSide;
      let goalSide = null, chanceSide = null, goalEvt = null;
      events.forEach(e => { if (e.type === "goal") { goalSide = e.side; goalEvt = e; } else if (e.type === "chance") chanceSide = e.side || chanceSide; });
      if (goalSide) {
        this.flashPitch(us && goalSide === us ? "goal-for" : us && goalSide ? "goal-against" : "goal-for");
        this.showGoalFlash(goalEvt);
        this.setBall(goalSide === "home" ? 96 : 4, 50);
        clearTimeout(this._ballReset);
        this._ballReset = setTimeout(() => { if (this.lm && !this.lm.state.done) this.setBall(50, 45 + Math.random() * 10); }, 800);
      } else if (chanceSide) {
        this.flashPitch("shot");
        this.setBall(chanceSide === "home" ? 84 : 16, 24 + Math.random() * 52);
      } else {
        const m = st.momentum;
        this.setBall(clamp(50 + (m - 50) * 0.72 + (Math.random() - 0.5) * 30, 9, 91), clamp((this.ballY ?? 50) + (Math.random() - 0.5) * 42, 12, 88));
      }
      this.updateDotColors();
    },

    clockLabel() {
      const st = this.lm.state, m = st.minute;
      const lab = m <= 45 + st.stoppage1 ? Math.min(m, 45) : Math.min(m - st.stoppage1, 90);
      const stopp = (m > 45 && m <= 45 + st.stoppage1) || (m > 45 + st.stoppage1 + 45);
      return lab + (stopp ? "+" : "") + "'";
    },
    updateClock() {
      const st = this.lm.state;
      document.getElementById("matchScore").textContent = `${st.hg} – ${st.ag}`;
      document.getElementById("matchClock").textContent = this.clockLabel();
      const mh = Math.round(st.momentum);
      document.getElementById("momHome").style.width = mh + "%";
      document.getElementById("momAway").style.width = (100 - mh) + "%";
      const status = document.getElementById("momStatus");
      if (status) status.textContent = mh >= 60 ? `${st.home.short} on top` : mh <= 40 ? `${st.away.short} on top` : "End to end";
      // Live match stats — so you can SEE whether you're on top or hanging on.
      const s = this.lm.stats();
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
      set("lsPossH", s.home.poss + "%"); set("lsPossA", s.away.poss + "%");
      const bar = document.getElementById("lsPossBar"); if (bar) bar.style.width = s.home.poss + "%";
      set("lsShotsH", s.home.shots); set("lsShotsA", s.away.shots);
      set("lsSotH", s.home.sot); set("lsSotA", s.away.sot);
      set("lsXgH", s.home.xg.toFixed(1)); set("lsXgA", s.away.xg.toFixed(1));
    },

    reveal(evt) {
      const feed = document.getElementById("commentaryFeed");
      const item = document.createElement("div");
      let cls = "feed-item " + evt.type;
      // Colour events by whether they helped or hurt the managed side.
      const us = this.lm.state.userSide;
      if (us && evt.side) cls += evt.side === us ? " ev-for" : " ev-against";
      item.className = cls;
      item.innerHTML = `<div class="min mono">${evt.minute}${evt.stoppage ? "+" : ""}'</div><div>${evt.text}</div>`;
      feed.appendChild(item);
      // A goal flashes the scoreline so it lands.
      if (evt.type === "goal") {
        const sc = document.getElementById("matchScore");
        sc.classList.remove("flash-for", "flash-against"); void sc.offsetWidth;
        sc.classList.add(us && evt.side === us ? "flash-for" : us && evt.side ? "flash-against" : "flash-for");
      }
    },

    skip() {
      clearTimeout(this.timer); this.running = false; this.setSlowmo(false);
      document.getElementById("subsPanel").classList.add("hidden");
      while (!this.lm.state.done) this.lm.stepMinute().forEach(e => this.reveal(e));
      this.updateClock();
      this.endMatch();
    },

    stop() { clearInterval(this.timer); this.running = false; },

    // Finish the sim to full-time with no UI (used when bailing out of a week).
    finishSilently() {
      clearInterval(this.timer); this.running = false;
      while (this.lm && !this.lm.state.done) this.lm.stepMinute();
      this.writeResult();
    },

    // Push the live result + minutes onto the current item so recordItem uses them.
    writeResult() {
      if (!this.lm || !App.currentItem) return;
      App.currentItem.full = { ...App.currentItem.full, ...this.lm.result() };
      App.currentItem.userMinutes = this.lm.minutesMap();
      if (this.interactive) App.currentItem.userRatings = this.lm.ratings();
    },

    // ---- Substitutions ----
    openSubs() {
      if (!this.interactive || this.lm.subsLeft() <= 0 || this.lm.state.done) return;
      this.pause();
      this.selectedOff = null;
      document.getElementById("subsPanel").classList.remove("hidden");
      this.renderSubs();
    },
    closeSubs() { document.getElementById("subsPanel").classList.add("hidden"); this.selectedOff = null; },
    renderSubs() {
      const st = this.lm.state;
      const club = st.userSide === "home" ? this.home : this.away;
      document.getElementById("subsLeft").textContent = this.lm.subsLeft();
      const onList = this.lm.onPitchUser();
      const onIds = new Set(onList.map(p => p.id));
      const tag = p => `<span class="fit-tag ${Fitness.level(p)}">${Fitness.label(p)}</span>`;
      const surname = p => p.name.split(" ").slice(-1)[0];
      document.getElementById("subsOn").innerHTML = onList
        .slice().sort((a, b) => (a.fitness ?? 100) - (b.fitness ?? 100))
        .map(p => `<button class="sub-chip ${this.selectedOff === p.id ? "sel" : ""}" data-suboff="${p.id}"><span class="pos-chip ${p.pos}">${p.pos}</span> ${surname(p)} ${tag(p)}</button>`).join("");
      const bench = ((club.lineup && club.lineup.bench) || []).map(id => club.squad.find(p => p.id === id))
        .filter(p => p && !onIds.has(p.id) && !p.injuryWeeks && !p.suspendedMatches);
      document.getElementById("subsBench").innerHTML = bench.length
        ? bench.map(p => `<button class="sub-chip" data-subon="${p.id}" ${this.selectedOff ? "" : "disabled"}><span class="pos-chip ${p.pos}">${p.pos}</span> ${surname(p)} ${tag(p)}</button>`).join("")
        : `<p class="muted" style="font-size:0.78rem;">No bench players available.</p>`;
      document.getElementById("subsHint").textContent = this.selectedOff ? "Now tap a bench player to bring on." : "Tap a player on the pitch to take off.";
    },
    selectOff(id) { this.selectedOff = this.selectedOff === id ? null : id; this.renderSubs(); },
    doSub(onId) {
      if (!this.selectedOff) return;
      const evt = this.lm.substitute(this.selectedOff, onId);
      if (evt) this.reveal(evt);
      this.selectedOff = null;
      this.updateSubsBtn();
      if (this.lm.subsLeft() <= 0) this.closeSubs(); else this.renderSubs();
    },

    endMatch() {
      clearTimeout(this.timer);
      this.running = false;
      this.setSlowmo(false);
      this.writeResult();
      document.getElementById("subsPanel").classList.add("hidden");
      document.getElementById("matchStatus").textContent = "Full Time";
      document.getElementById("btnMatchStart").disabled = true;
      document.getElementById("btnMatchPause").disabled = true;
      document.getElementById("btnMatchSubs").classList.add("hidden");
      document.getElementById("btnMatchRatings").classList.add("hidden");
      document.getElementById("matchRatings").classList.add("hidden");
      document.getElementById("matchTactics").classList.add("hidden");
      // Match report — stats + player ratings (interactive matches only).
      const report = document.getElementById("matchReport");
      if (this.interactive && App.currentItem) { UI.renderMatchReport(App.currentItem, App.currentItem.userRatings); report.classList.remove("hidden"); }
      else report.classList.add("hidden");
      document.getElementById("btnMatchContinue").classList.remove("hidden");
      App.onLiveMatchEnded();
    },
  };
  
  document.addEventListener("DOMContentLoaded", () => App.init());