"""FPL scoring: components -> points, versioned by season.

Points are a deterministic function of match components. Never make a model
learn arithmetic it can simply be told: predict the components, apply these
rules.

Rules change between seasons, which is why component targets are comparable
across the archive and point targets are not. Every version here is verified
against the data by src/validate/checks.py.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

GOAL_POINTS = {"GK": 6, "DEF": 6, "MID": 5, "FWD": 4}
CLEAN_SHEET_POINTS = {"GK": 4, "DEF": 4, "MID": 1, "FWD": 0}
ASSIST_POINTS = 3

# Defensive contribution, introduced 2025-26. `defensive_contribution` in the
# data is a raw count (clearances+blocks+interceptions+tackles for defenders,
# plus recoveries for everyone else). Reaching the threshold is worth 2 points.
DEFCON_FROM = "2025-26"
DEFCON_THRESHOLD = {"DEF": 10, "MID": 12, "FWD": 12, "GK": 999}
DEFCON_POINTS = 2


def _defcon_active(season: str) -> bool:
    return season >= DEFCON_FROM


def compute_points(df: pd.DataFrame, season: str) -> pd.Series:
    """Reconstruct total_points from components for one season's rows.

    Expects the canonical column names. Returns an integer Series aligned to df.
    """
    pos = df["position"]
    mins = df["minutes"].fillna(0)

    # Appearance: 1 point for playing, 2 for 60 minutes or more.
    pts = np.where(mins >= 60, 2, np.where(mins > 0, 1, 0)).astype("int64")

    pts += (df["goals_scored"].fillna(0) * pos.map(GOAL_POINTS).fillna(0)).astype("int64")
    pts += (df["assists"].fillna(0) * ASSIST_POINTS).astype("int64")

    # Clean sheet only counts if the player was on for 60+ minutes.
    cs = df["clean_sheets"].fillna(0).astype(bool) & (mins >= 60)
    pts += (cs * pos.map(CLEAN_SHEET_POINTS).fillna(0)).astype("int64")

    # Goals conceded: -1 per 2, goalkeepers and defenders only.
    conceded_penalty = (df["goals_conceded"].fillna(0) // 2).astype("int64")
    pts -= np.where(pos.isin(["GK", "DEF"]), conceded_penalty, 0)

    # Saves: 1 point per 3, goalkeepers only.
    pts += np.where(pos == "GK", (df["saves"].fillna(0) // 3).astype("int64"), 0)

    pts += (df["penalties_saved"].fillna(0) * 5).astype("int64")
    pts -= (df["penalties_missed"].fillna(0) * 2).astype("int64")
    pts -= (df["own_goals"].fillna(0) * 2).astype("int64")
    pts -= (df["yellow_cards"].fillna(0) * 1).astype("int64")
    pts -= (df["red_cards"].fillna(0) * 3).astype("int64")
    pts += df["bonus"].fillna(0).astype("int64")

    if _defcon_active(season) and "defensive_contribution" in df:
        threshold = pos.map(DEFCON_THRESHOLD).fillna(999)
        hit = df["defensive_contribution"].fillna(0) >= threshold
        pts += (hit * DEFCON_POINTS).astype("int64")

    return pd.Series(pts, index=df.index, name="points_reconstructed")
