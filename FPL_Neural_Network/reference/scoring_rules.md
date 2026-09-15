# FPL scoring rules by season

The scoring function is a known, deterministic mapping from match components to
points. Record every change here, because it is the reason `total_points` is not
comparable across seasons - and the reason this project models components and
applies the rules afterwards, rather than regressing on points directly.

Used by `src/scoring/rules.py`, which should select a rule version by season.

## Notes to fill in

- Baseline rules: appearance, goals by position, assists, clean sheets,
  goals conceded, saves, penalties, cards, own goals, bonus.
- 2025-26: defensive contribution points introduced.
- Verify each version against the data with the points-reconstruction check in
  `src/validate/checks.py` before trusting it.
