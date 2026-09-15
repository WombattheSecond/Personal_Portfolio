# reference/

Hand-maintained lookup tables. **These are committed to git.**

Everything under `data/` is either an upstream clone or machine-derived, and is
reproducible from `data_manifest.yaml` plus the code in `src/`. The files in
here are neither - they encode manual decisions that exist nowhere else. Losing
them means redoing that work by hand.

They live outside `data/` rather than inside it with a gitignore negation
pattern, because negation patterns are a reliable way to lose files you thought
were tracked.

| File | Purpose |
|---|---|
| `player_id_overrides.csv` | Manual cross-season player identity links that automatic name matching gets wrong. |
| `team_aliases.csv` | Maps club name spellings across seasons and sources onto one stable club id. |
| `scoring_rules.md` | Notes on how FPL scoring changed by season. |

Add a row whenever you resolve an ambiguity by hand, and put the reason in the
`note` column. Future-you will not remember why "Rodri" and "Rodrigo" were
separated.
