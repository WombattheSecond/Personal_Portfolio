# PLFC Touchline Manager

A Premier League club-management browser game — pick a club, run the transfer
market, set your matchday XI on a tactics board, then watch the match play
out minute-by-minute with live commentary. Built as a static site: plain
HTML/CSS/JS, no build step, no server.

## Play it locally

Just open `index.html` in a browser. Everything (career data, squads,
transfer market, save file) runs client-side and is stored in
`localStorage`.

## Deploy to GitHub Pages

1. Create a new repository (e.g. `plfc-manager`) and push these files to it:
   ```
   git init
   git add .
   git commit -m "PLFC Touchline Manager"
   git branch -M main
   git remote add origin https://github.com/<you>/plfc-manager.git
   git push -u origin main
   ```
2. In the repo settings, go to **Settings → Pages**, set **Source** to
   `Deploy from a branch`, branch `main`, folder `/ (root)`.
3. Your game will be live at `https://<you>.github.io/plfc-manager/` within
   a minute or two.

No build tools, bundlers, or dependencies are required — it's the same
zero-config setup as the original NRL game this was modeled on.

## How it's structured

```
index.html          All screens (start, hub, squad, market, lineup, match, table)
css/styles.css       Design tokens + all styling
js/data.js           Club & player data (England's 4 + Spain's 2 leagues), country/chain constants, career estimation, formations, name pools
js/state.js          Career state, save/load + migration, squad-depth helper
js/lineup.js         Formation handling, best-XI auto-pick
js/match.js          Match engine: quick AI sim + full live commentary timeline
js/stats.js          Player stats, per-league leaderboards, season awards & bonuses
js/cup.js            Domestic cups (FA, Carabao, Copa del Rey): generic country-gated staged-entry knockout engine
js/vertu.js          Vertu Trophy: League One & Two group stage + knockout
js/europe.js         Champions/Europa/Conference League: 36-team league phase + two-legged knockouts
js/season.js         Per-league fixtures & tables, promotion/relegation between divisions
js/squad.js          Transfer market (buy/sell) + AI-to-AI transfers
js/coaches.js        Coaching + youth staff, the Staff market, development multipliers
js/academy.js        Youth academy: scout intake, youth development, graduation
js/dynamics.js       Dynamic club fortunes: reputation drift + chasing-pack catch-up
js/ui.js             Rendering functions
js/main.js           App controller, event wiring, live match player
```

## Gameplay notes

- **Squads** are built around real 2026/27 Premier League rosters (plus
  generated squad depth so every club has enough players for a full XI and
  bench). Player data is a snapshot for gameplay purposes, not a live
  database — real transfers will make it drift out of date. Update the
  `squad` arrays in `js/data.js` whenever you want to refresh a club.
- **Transfer market** listings are freshly generated free agents/loanees
  each reroll, priced off the same rating curve used for your own squad.
- **Selling is offer-based**: you no longer sell instantly. Rival clubs bid for
  your players during a window (each bid within ±25% of market value). A 💰
  badge by a player's name expands to show every offer — accept, decline, or
  just ignore it. **Transfer-list** a player (their row turns amber) to draw
  far more offers. Bids only stand while the window is open, and lapse when it
  shuts.
- **Two countries, six divisions**: England's four-tier pyramid (a 20-club
  Premier League plus a 24-club Championship, League One and League Two — 92
  real clubs) *and* Spain's top two tiers (a 20-club La Liga and a 22-club
  Segunda División — 42 clubs). Each division runs its own separate season (a
  20-team league is 38 games, a 22-team 42, a 24-team 46), table, stats,
  leaderboards and awards. You can start a career in any of them — the club
  picker has a country bar at the top (England / Spain); pick a country and
  only that nation's clubs are shown, grouped by league. The season lasts as long as
  *your* league; divisions that run longer are completed before promotions are
  worked out. Every matchweek your own match is played live and every other
  game across **all six divisions in both countries** is quick-simmed. The
  lower leagues run on far smaller budgets and weaker squads.
- **Promotion & relegation** flow up and down each country's own closed chain
  (England: PL ⇄ CH ⇄ L1 ⇄ L2; Spain: LL ⇄ SG). The Championship promotes 3
  directly; League One and League Two promote 3 directly **plus one play-off
  winner** from the next four (positions 4–7, semis + final, quick-simmed and
  reported at season's end). Segunda promotes its top 3 directly. Relegation
  counts keep every league at its size. Top flights (Premier League, La Liga)
  have European spots; the lower leagues show automatic-promotion, play-off and
  relegation zones. Clubs keep their squads when they change division. Careers
  stay within their country's pyramid.
- **Careers survive relegation** all the way down — you just drop a division
  and play on. **League Two has no relegation** (there's nothing below it);
  instead its bottom four is a *sacking zone* — finish there and the board
  dismiss you, ending the career.
- **Universal transfer market**: one market spans every division in **both
  countries**, so a Spanish club can sign an English player and vice versa —
  and rival clubs bid across borders for your squad too. Rival AI clubs also
  **trade among themselves** while a window is open — squads churn, money
  changes hands, and players (with their stats and career records) move between
  clubs — so the world isn't static around you. Your own club is never touched
  automatically.
- **Coaching staff** drive player development. Every club fields a position
  coach for each unit (GK, DF, MF, FW), scaled to reputation at kick-off. Coach
  quality is the **primary** driver of how fast a club's players grow toward
  (or hold off decline from) their potential — the season result is only a
  small nudge, *except* a dramatic overachievement (a relegation-tipped side
  finishing top five) still earns big growth. You upgrade your staff from the
  **Staff market** (the Staff tab) that refreshes on its own every matchweek —
  there's no reroll, you wait for next week's names. Lives in `js/coaches.js`;
  growth is applied in `Aging.advanceSeason` (`js/state.js`).
- **Youth academy** (`js/academy.js`): an autonomous talent pipeline. A youth
  **scout** unearths a prospect four times a season (aged 10–16, ceiling set by
  the scout's rating) and a youth **coach** develops them week by week (by the
  coach's rating) — both hired from the Staff market, where top youth staff are
  expensive. At 18 a prospect graduates: with a squad place free you promote
  them; if the squad is full you get three matchweeks to sell someone or the
  talent leaves on a free, and you can always decline a graduate (they sign
  elsewhere for nothing). The academy runs itself — hands-off, graduates
  auto-resolve at the deadline (promoted if there's room). Only your club runs
  one.
- **Squad development is league-wide**: every club's players — not just yours —
  develop or decline each off-season under the same coaching + performance
  model, so rival squads strengthen and fade around you.
- **Dynamic club fortunes** keep the league from going stale (`js/dynamics.js`).
  Between seasons a club's reputation drifts with its results, and its squad and
  coaching follow — so a fallen giant sheds quality and slides to mid-table
  while an overachieving minnow builds into a force (Arsenal can fade; Burnley
  can rise to contention). If you pull well clear of the field, only the top
  few clubs in your division (the title-race pack) chase your level — and only
  when you're clearly ahead — so a handful of genuine rivals always exist while
  the rest stay beatable. Match results also carry a per-game "form" swing, so
  even a dominant side drops the odd point: winning the league five years
  running is a real achievement, not a formality, but very doable with a
  clearly superior squad.
- **Two domestic cups** run *through* the season as knockouts, not at the end,
  and every entrant is a real club (no placeholders). On a cup week you play
  your league game *and*, if still in, your cup tie — two live matches with
  clear competition banners. Draws go to penalties, cup goals stay out of the
  league leaderboards, and the hub shows a panel per cup with your run and the
  round-by-round schedule. Clubs enter at staged rounds (minnows early, the
  biggest sides latest), so the field halves cleanly to a Wembley final.
  - **FA Cup** — all 92 clubs: the weakest 16 open the First Round, the next
    tier joins the Second Round, and the strongest are seeded into the 64-team
    Third Round; then a clean knockout to the Final.
  - **Carabao Cup** — the 72 EFL clubs open in Round One; the 13
    "non-European" Premier League clubs join in Round Two; the 7 "European"
    clubs (approximated by squad strength) in Round Three.
  - Tune the rounds, weeks and entry structure in `js/cup.js` (a single
    generic engine drives both cups).
- **The Vertu Trophy** (EFL Trophy) is a League One & League Two competition
  (48 clubs): a group stage of 16 groups of three — each club plays the other
  two home and away (3 pts a win) — and the 16 group winners go into a straight
  knockout to the Final at Wembley. If you manage a third- or fourth-tier club
  you play your group games and knockout ties live (the hub shows your group
  table and progress); for anyone else it plays out in the background. Lives in
  `js/vertu.js`.
- **The Community Shield** opens every season (matchweek 1) — last season's
  Premier League champions vs the FA Cup winners (the FA Cup runner-up
  deputises if they're the same club). You play it live if your club is one of
  the two; it doesn't count for the leagues, just the honours board.
- **Spanish cups** mirror the English framework for a La Liga or Segunda save
  (the English cups sit out, and vice versa):
  - **Copa del Rey** — Spain's premier knockout, comparable to the FA Cup: all
    42 Spanish clubs enter (the weakest open the First Round, the strongest are
    seeded straight into a clean 32-team bracket), running through the season to
    the Final. Same generic engine as the English cups (`js/cup.js`).
  - **Supercopa de España** — a season-opening (matchweek 1) *final four*
    contested by the winners and runners-up of La Liga and the Copa del Rey: two
    semi-finals (La Liga champion v Copa runner-up, Copa winner v La Liga
    runner-up) and a final. If a club qualifies twice, the berth passes to the
    next-best La Liga side so it's always four distinct teams. You play your own
    tie(s) live; the rest are simmed. Draws go to penalties; it counts only for
    the honours board.
- **European competitions** (`js/europe.js`) run through the season for clubs
  that qualified on **last season's league finish**: the top four of each top
  flight enter the **Champions League**, 5th the **Europa League**, 6th the
  **Conference League**. Each uses the modern **36-team League Phase** — one big
  Swiss-style table where every club plays **eight** different opponents (two
  from each of four coefficient pots, four home and four away). Final standings
  decide everything: **1–8** go straight to the Round of 16, **9–24** contest a
  two-legged knockout playoff for the last eight R16 spots, and **25–36** are
  eliminated outright (no drop into a lesser competition). The knockouts are
  two-legged — away goals abolished, level aggregate goes to extra time and
  penalties — up to a single-leg Final. You play **your** competition in full
  (the whole 36-team table fills alongside your eight live matchdays, then your
  knockout ties are played leg by leg); the other two are resolved in the
  background to a champion. Because the world currently holds only England +
  Spain, each 36-team field is completed with the strongest remaining clubs by
  coefficient, standing in for the wider continent — as more countries are added
  the fields fill with genuine foreign qualifiers instead. The hub shows a
  European panel with your league-phase position (or knockout tie) and holders.
- **Trophy cabinet**: the 🏆 button in the top bar opens your manager's honours
  — league titles (English and Spanish), the Champions/Europa/Conference League,
  FA Cup, Carabao Cup, Vertu Trophy, Community Shield, Copa del Rey and Supercopa
  de España, each with a count and the seasons you won them.
- **Career records**: every player carries lifetime totals — appearances,
  goals, assists, clean sheets, saves — that accumulate across seasons.
  Made-up players are seeded with a plausible history estimated from their
  rating, age and position. In the transfer market each listing shows the
  player's career appearances plus the headline stat for their position
  (forwards → goals, midfielders → assists, defenders → clean sheets,
  keepers → saves).
- **Live matches** are a precomputed minute-by-minute event timeline
  (goals, chances, cards, subs, half/full time) revealed at your chosen
  speed (1x/2x/4x), with a momentum bar driven by the same model.
- **Player stats** (goals, assists, clean sheets, saves, appearances) are
  tracked for *every* player in the league — your own live matches and the
  AI-vs-AI quick sims alike — so the leaderboards are division-wide. Your
  live match's goals are credited to the exact scorers named in the
  commentary. The hub's **Season Stat Leaders** panel toggles between the
  league top five (your players highlighted, your best appended with their
  rank if they miss the cut) and a **My Squad** view ranked within your team.
- **Season awards** crown a Golden Boot (goals), Playmaker (assists), Best
  Defender (defender clean sheets), Golden Glove (keeper clean sheets) and
  Shot Stopper (saves) at season's end, with full top-five boards. A clean
  sheet is credited to the keeper *and* every starting defender, so it feeds
  both keeper and defender races.
- **Form bonuses** go to the top five of every category at *every* club —
  the winner gets the full boost (+12% goal/assist weighting, +6% defending
  or keeping, +4% keeping for saves), ranks 2–5 a 40% share. They fold into
  the match engine, last one season, must be re-won, and are capped at +25%
  per track (`BONUS_CAP`/`TOP5_BONUS_SCALE` in `js/stats.js`).
- **Performance-based development**: at season's end every player in the
  league has their potential and overall nudged by how they did — judged
  *relative to their own level* (a 64-rated regular surviving the Prem is an
  achievement; an 88 is expected to dominate) and lifted or dragged by how
  their club finished versus its tier. Strong seasons grow players and raise
  ceilings; poor ones trim both. Tune the model in `Stats.performanceIndex`
  (`js/stats.js`) and `Aging.advanceSeason` (`js/state.js`).
- **Scouted potential**: the transfer market reveals a player's potential
  only as a 5-wide band (an 83 shows as `80-85`); your own squad list shows
  each player's exact potential.

## Customizing

- Swap club colors/names/players in `RAW_CLUBS` (`js/data.js`).
- Tune scoring rates in `js/match.js` (`pHomeGoal`/`pAwayGoal` and the
  `simulateQuick` xG formulas) if you want a higher- or lower-scoring league.
- Add formations by extending `FORMATIONS` and `FORMATION_LAYOUT` in
  `js/data.js` (the layout array needs one `[x%, y%]` pair per outfield
  slot, GK first).
