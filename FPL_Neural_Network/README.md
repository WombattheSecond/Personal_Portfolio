# Premier_League_ML_Predictions


A learning experience where I have attempted to predict individual player
performances in the Premier League so that I am able to learn about Machine
Learning.

Data: [vaastav/Fantasy-Premier-League](https://github.com/vaastav/Fantasy-Premier-League)

## Approach

Points are a deterministic function of match components, so the model predicts
the **components** - minutes, goals, assists, clean sheets, saves, cards, bonus -
and applies the scoring rules afterwards. Components stay comparable across
seasons; points do not, because FPL changes the rules.

The target architecture is a multi-task neural network: a sequence encoder over
each player's match history, plus player and club embeddings, feeding a shared
trunk with one distributional head per component. A gradient boosting model is
kept alongside it as a control, so improvements can be measured rather than
assumed.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

`data/` and `artifacts/` are gitignored in full, so they do not survive a clone.
Recreate the skeleton:

```bash
mkdir -p data/{raw,interim,processed} artifacts/{models,predictions,reports}
```

Clone the upstream data (shallow - you want the files, not ten years of history):

```bash
git clone --depth 1 https://github.com/vaastav/Fantasy-Premier-League.git data/raw/fpl
```

Then pin the version you pulled, in `data_manifest.yaml`:

```bash
git -C data/raw/fpl rev-parse HEAD
```

LightGBM needs the OpenMP runtime on macOS, which pip does not supply:

```bash
brew install libomp
```

## Pipeline

Build the canonical table (all 11 seasons, ~2 min):

```bash
python -m src.canonical.build
```

Verify it. Run this after every rebuild - the points reconstruction is what
catches a mis-mapped column:

```bash
python -m src.validate.checks
```

## Layout

```
data/                 gitignored in full
  raw/fpl/            upstream clone - READ ONLY, never edited
  interim/            canonical long table, one row per player-fixture
  processed/          model-ready feature matrices
reference/            COMMITTED - hand-maintained lookups (see its README)
configs/config.yaml   paths, season lists, validation scheme
data_manifest.yaml    COMMITTED - which upstream commit produced the data
src/
  ingest/             read raw CSVs, normalise schema drift across seasons
  identity/           stable cross-season player and club ids
  canonical/          build the long table; pre/post-match column split
  validate/           data quality assertions (points reconstruction)
  scoring/            FPL scoring rules, versioned by season
  features/           lagged features, ordered sequences
  modelling/          baselines, GBM control, and nn/
  backtest/           walk-forward validation, season simulation
notebooks/            exploration only
artifacts/            gitignored - weights, predictions, reports
```

## Rules

**Raw is immutable.** Nothing writes to `data/raw/`. If a row is wrong, fix it in
the transformation with a comment saying why, so the fix is versioned and
visible.

**Pin the upstream commit.** The source repo updates weekly in season. Without a
pinned SHA in `data_manifest.yaml` you cannot tell whether a metric moved because
of your model or because the data changed underneath you.

**Everything under `data/` is reproducible.** Upstream clone, or derived from
`src/`. Anything that is neither belongs in `reference/`.

**Walk-forward validation only.** Random k-fold on this data produces excellent
numbers and a worthless model.

**Notebooks for looking, modules for doing.** Nothing a later stage depends on
may live only in a notebook.

## Order of work

1. ~~Read one season, split columns pre/post-match~~ **done**
2. ~~Points reconstruction check~~ **done** - 0 mismatches across 254,119 rows
3. ~~All seasons ingested, cross-season identity resolved~~ **done**
4. Baselines, scored with walk-forward validation *(next)*
5. v1 GBM on total points - a working pipeline, not a good model
6. Component decomposition
7. Neural architecture
8. Distributions, then decisions

Stages 1-3 are built and verified. `src/features/`, `src/modelling/` and
`src/backtest/` are still docstring stubs - that is the modelling work.

## The data, as built

| | |
|---|---|
| rows (player-fixture) | 254,119 |
| unique players | 2,718 |
| seasons | 2016-17 to 2026-27 |
| zero-minute rows | 57.1% |
| mean points per row | 1.25 |
| half of all points | comes from the top 7.5% of rows |
