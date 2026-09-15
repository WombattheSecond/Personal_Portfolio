"""Stable cross-season player identity.

FPL reassigns its per-season `element` id every August - Salah is element 234 in
2017-18 and 233 in 2021-22. But `players_raw.csv` carries `code`, which is
FPL's global player id and is stable across the entire archive (Salah is 118748
in both). Identity is therefore an exact join, not fuzzy name matching:

    merged_gw.element  --(season)-->  players_raw.id  -->  code

This matters more than it looks. An embedding table keyed on an id that is
reassigned every season learns nothing.

reference/player_id_overrides.csv remains as an escape hatch for any (season,
element) that fails to resolve. It should stay close to empty.
"""
from __future__ import annotations

import pandas as pd

from src.config import load_config
from src.ingest.load_raw import load_players_raw
from src.ingest.schema import ELEMENT_TYPE_TO_POSITION


def element_to_code(season: str) -> pd.DataFrame:
    """Map a season's element ids onto stable player codes.

    Returns columns: element, player_code, player_name, position, team_code.
    """
    raw = load_players_raw(season)
    out = pd.DataFrame(
        {
            "element": raw["id"].astype("int64"),
            "player_code": raw["code"].astype("int64"),
            "player_name": (
                raw["first_name"].fillna("").str.strip()
                + " "
                + raw["second_name"].fillna("").str.strip()
            ).str.strip(),
            "position": raw["element_type"].astype("int64").map(ELEMENT_TYPE_TO_POSITION),
            "team_code": raw["team_code"].astype("int64"),
            "team_season_id": raw["team"].astype("int64"),
        }
    )
    return out


def load_overrides() -> pd.DataFrame:
    cfg = load_config()
    path = cfg.reference / "player_id_overrides.csv"
    return pd.read_csv(path) if path.exists() else pd.DataFrame(
        columns=["season", "element", "canonical_player_id", "note"]
    )
