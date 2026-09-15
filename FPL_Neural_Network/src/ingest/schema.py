"""Per-season schema drift, and the mapping onto one normalised schema.

The archive is not homogeneous. Measured against the actual files:

  2016-17 .. 2018-19   latin-1 encoded. Rich match detail (tackles, key_passes,
                       big_chances_*, attempted_passes) but NO position, team,
                       xP, expected_* or starts. `name` is "First_Last", with
                       "_<element>" appended from 2017-18.
  2019-20              utf-8 from here on. Detailed stats dropped. Still no
                       position/team/xP.
  2020-21 .. 2021-22   position, team and xP appear. `name` becomes "First Last".
  2022-23 ..           expected_* and starts appear.
  2024-25 ..           manager entries appear as pseudo-players (position "AM").
  2025-26 ..           defensive_contribution, recoveries, tackles,
                       clearances_blocks_interceptions return; scoring changes.

THE RULE: a column absent for a season is filled with NaN, never 0. "xG was not
recorded in 2017" and "his xG was 0.00" are different facts, and every model
downstream needs to be able to tell them apart.
"""
from __future__ import annotations

# Seasons whose CSVs are not utf-8.
LATIN1_SEASONS = {"2016-17", "2017-18", "2018-19"}

# Seasons where merged_gw.csv lacks position/team and they must be backfilled
# from players_raw.csv via the element id.
NEEDS_POSITION_BACKFILL = {"2016-17", "2017-18", "2018-19", "2019-20"}

# FPL element_type -> position label. element_type is an integer in
# players_raw.csv and cannot drift, which is why position is derived from it
# rather than from merged_gw's own `position` column - that column carries 101
# rows labelled "GKP" instead of "GK" in 2021-22, which silently cost those
# goalkeepers their saves and clean-sheet points until the reconstruction check
# caught it.
ELEMENT_TYPE_TO_POSITION = {1: "GK", 2: "DEF", 3: "MID", 4: "FWD", 5: "MNG"}

# Belt and braces for any position label arriving from elsewhere.
POSITION_ALIASES = {"GKP": "GK", "GOALKEEPER": "GK", "AM": "MNG"}

# Position labels that are not footballers. Managers became FPL assets in
# 2024-25 for the Assistant Manager chip. They score by an entirely different
# rule set and must not enter a player model.
NON_PLAYER_POSITIONS = {"MNG", "AM"}

# Columns carried through to the canonical table, with the dtype they must end
# up as. Anything not listed is dropped.
NUMERIC_COLUMNS = [
    "minutes", "starts", "goals_scored", "assists", "clean_sheets",
    "goals_conceded", "own_goals", "penalties_saved", "penalties_missed",
    "yellow_cards", "red_cards", "saves", "bonus", "bps",
    "influence", "creativity", "threat", "ict_index",
    "expected_goals", "expected_assists", "expected_goal_involvements",
    "expected_goals_conceded",
    "defensive_contribution", "clearances_blocks_interceptions",
    "recoveries", "tackles",
    "value", "selected", "transfers_in", "transfers_out", "transfers_balance",
    "xP", "team_h_score", "team_a_score", "total_points",
]


def encoding_for(season: str) -> str:
    return "latin-1" if season in LATIN1_SEASONS else "utf-8"


def clean_player_name(name: str) -> str:
    """Normalise the three `name` formats into "First Last".

    2016-17     "Aaron_Cresswell"
    2017-18+    "Aaron_Cresswell_402"   (element id appended)
    2020-21+    "Aaron Connolly"

    Only cosmetic - identity is resolved on the stable `code`, never on names.
    """
    if "_" not in name:
        return name.strip()
    parts = name.split("_")
    if parts[-1].isdigit():
        parts = parts[:-1]
    return " ".join(parts).strip()
