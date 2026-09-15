"""Stable cross-season club identity.

`opponent_team` in merged_gw is an index into that season's team table, not a
club identity. `players_raw.team_code` is the global FPL club code and is stable
across the archive (Arsenal is always 3), so the season-local integer is mapped
through it.

master_team_list.csv in the upstream repo does a similar job but only covers
2016-17 to 2023-24, so it is not used.

Promoted clubs have no prior top-flight history. That cold start is a modelling
decision, made explicitly in src/features/, not papered over here.
"""
from __future__ import annotations

import pandas as pd

from src.identity.players import element_to_code


def season_team_id_to_code(season: str) -> pd.Series:
    """Map this season's team integers onto stable global club codes."""
    ids = element_to_code(season)[["team_season_id", "team_code"]].drop_duplicates()
    dupes = ids[ids.team_season_id.duplicated(keep=False)]
    if not dupes.empty:
        raise ValueError(f"{season}: ambiguous team id -> code mapping\n{dupes}")
    return ids.set_index("team_season_id")["team_code"]
