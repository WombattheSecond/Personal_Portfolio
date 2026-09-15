"""Assemble all seasons into one long table: ONE ROW PER PLAYER-FIXTURE.

Per fixture, not per gameweek. Double gameweeks give a player two rows in one
gameweek and blanks give none; a gameweek-grained table represents neither.

Design constraints, all load-bearing for what comes later:

  * Sorted by player_code then kickoff_time. The sequence encoder repeatedly
    needs "this player's last N matches before this date".
  * Zero-minute rows kept. Absence is signal, and sequences must be unbroken.
  * Ordered by kickoff_time, never gameweek number - gameweeks span days and
    matches get rescheduled.
  * Missing columns are NaN, never 0.
  * Managers (2024-25+) dropped: different scoring rules, not footballers.

Output: parquet at data/interim/canonical.parquet.
"""
from __future__ import annotations

import pandas as pd

from src.canonical.columns import KEYS, POST_MATCH, PRE_MATCH
from src.config import ensure_dirs, load_config
from src.identity.players import element_to_code
from src.identity.teams import season_team_id_to_code
from src.ingest.load_raw import available_seasons, load_merged_gw
from src.ingest.schema import (
    NON_PLAYER_POSITIONS,
    NUMERIC_COLUMNS,
    POSITION_ALIASES,
    clean_player_name,
)

CANONICAL_COLUMNS = KEYS + PRE_MATCH + POST_MATCH


def build_season(season: str) -> pd.DataFrame:
    df = load_merged_gw(season).copy()
    ids = element_to_code(season)

    df["element"] = df["element"].astype("int64")
    df = df.merge(
        ids[["element", "player_code", "team_code", "position", "player_name"]],
        on="element",
        how="left",
        suffixes=("", "_meta"),
    )

    unresolved = df["player_code"].isna().sum()
    if unresolved:
        raise ValueError(
            f"{season}: {unresolved} rows failed identity resolution. "
            "Add them to reference/player_id_overrides.csv."
        )

    # Position comes from players_raw.element_type ALWAYS, never from
    # merged_gw's own `position` column - see schema.ELEMENT_TYPE_TO_POSITION.
    df["position"] = df["position_meta"] if "position_meta" in df else df["position"]
    df["position"] = df["position"].replace(POSITION_ALIASES)
    df["player_name"] = df["name"].map(clean_player_name)

    # Season-local opponent integer -> stable global club code.
    mapping = season_team_id_to_code(season)
    df["opponent_team_code"] = df["opponent_team"].astype("int64").map(mapping)

    df["season"] = season
    df["fixture_id"] = df["fixture"].astype("int64")
    df["gw"] = df["GW"].astype("int64")
    df["kickoff_time"] = pd.to_datetime(df["kickoff_time"], utc=True, errors="coerce")
    df["was_home"] = df["was_home"].astype(bool)

    # Managers are FPL assets from 2024-25 but score by other rules entirely.
    df = df[~df["position"].isin(NON_PLAYER_POSITIONS)]

    # Absent columns become NaN, never 0.
    for col in CANONICAL_COLUMNS:
        if col not in df:
            df[col] = pd.NA
    for col in NUMERIC_COLUMNS:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return deduplicate(df[CANONICAL_COLUMNS], season)


def deduplicate(df: pd.DataFrame, season: str) -> pd.DataFrame:
    """Remove the two kinds of duplicate (season, player_code, fixture_id).

    1. Exact duplicates - identical in every column. Upstream double-scrape;
       20 rows in 2025-26. Simply dropped.

    2. Postponement placeholders. When a fixture is postponed and replayed, FPL
       keeps the original gameweek's entry alongside the replay under the SAME
       fixture id. 2019-20 has 59 players x (GW29 -> GW39), the Covid-suspended
       Manchester City v Arsenal match: the GW29 rows are all zero-minute
       placeholders and the GW39 rows carry the real match. The placeholder is
       not a match the player featured in and must not become a sequence entry -
       it is a blank gameweek. Keep the latest kickoff_time.
    """
    before = len(df)
    df = df.drop_duplicates()
    exact_removed = before - len(df)

    key = ["season", "player_code", "fixture_id"]
    df = (
        df.sort_values(key + ["kickoff_time"])
        .drop_duplicates(subset=key, keep="last")
    )
    postponed_removed = before - exact_removed - len(df)

    if exact_removed or postponed_removed:
        print(
            f"  {season}: dropped {exact_removed} exact duplicate row(s), "
            f"{postponed_removed} postponement placeholder(s)"
        )
    return df


def build_all(seasons: list[str] | None = None) -> pd.DataFrame:
    seasons = seasons or available_seasons()
    frames = [build_season(s) for s in seasons]
    out = pd.concat(frames, ignore_index=True)
    out = out.sort_values(["player_code", "kickoff_time"]).reset_index(drop=True)
    return out


def write_canonical(seasons: list[str] | None = None) -> pd.DataFrame:
    ensure_dirs()
    cfg = load_config()
    df = build_all(seasons)
    df.to_parquet(cfg.interim / "canonical.parquet", index=False)
    return df


def load_canonical() -> pd.DataFrame:
    cfg = load_config()
    return pd.read_parquet(cfg.interim / "canonical.parquet")


if __name__ == "__main__":
    frame = write_canonical()
    print(f"canonical: {len(frame):,} rows x {frame.shape[1]} cols")
    print(f"seasons:   {frame.season.nunique()}  players: {frame.player_code.nunique():,}")
