"""Read a season's raw files. Read-only with respect to data/raw/.

Frames come back as close to source as possible - only encoding and obvious
type coercion are handled here. Schema normalisation lives in schema.py,
identity resolution in src/identity/, anything derived in src/canonical/.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.config import load_config
from src.ingest.schema import encoding_for


def _read(path: Path, season: str) -> pd.DataFrame:
    return pd.read_csv(path, encoding=encoding_for(season), low_memory=False)


def load_merged_gw(season: str) -> pd.DataFrame:
    """Per-player per-fixture rows. The core table."""
    cfg = load_config()
    return _read(cfg.season_dir(season) / "gws" / "merged_gw.csv", season)


def load_players_raw(season: str) -> pd.DataFrame:
    """Season-level player metadata.

    Carries `code` - the globally stable FPL player id - and `team_code`, the
    globally stable club id. Both are the basis of cross-season identity.
    """
    cfg = load_config()
    return _read(cfg.season_dir(season) / "players_raw.csv", season)


def load_fixtures(season: str) -> pd.DataFrame:
    """Fixture list, including FPL's own difficulty ratings."""
    cfg = load_config()
    return _read(cfg.season_dir(season) / "fixtures.csv", season)


def load_teams(season: str) -> pd.DataFrame | None:
    """Team strength ratings. Only exists from 2019-20 onwards."""
    cfg = load_config()
    path = cfg.season_dir(season) / "teams.csv"
    return _read(path, season) if path.exists() else None


def available_seasons() -> list[str]:
    cfg = load_config()
    return [s for s in cfg.seasons if (cfg.season_dir(s) / "gws" / "merged_gw.csv").exists()]
