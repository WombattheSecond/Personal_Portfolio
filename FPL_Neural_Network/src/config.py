"""Load configs/config.yaml and resolve paths against the repo root.

Every other module gets its paths and season lists from here rather than
hardcoding them.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Config:
    raw: Path
    interim: Path
    processed: Path
    reference: Path
    artifacts: Path
    seasons: list[str]
    exploration_season: str
    final_holdout: str
    current_season: str
    anomalous_seasons: list[str]
    test_seasons: list[str]
    random_seed: int

    @property
    def raw_data(self) -> Path:
        """The `data/` directory inside the upstream clone."""
        return self.raw / "data"

    def season_dir(self, season: str) -> Path:
        return self.raw_data / season


@lru_cache(maxsize=1)
def load_config(path: Path | None = None) -> Config:
    path = path or REPO_ROOT / "configs" / "config.yaml"
    raw = yaml.safe_load(path.read_text())
    p, s, v = raw["paths"], raw["seasons"], raw["validation"]

    def resolve(key: str) -> Path:
        return (REPO_ROOT / p[key]).resolve()

    return Config(
        raw=resolve("raw"),
        interim=resolve("interim"),
        processed=resolve("processed"),
        reference=resolve("reference"),
        artifacts=resolve("artifacts"),
        seasons=list(s["all"]),
        exploration_season=s["exploration"],
        final_holdout=s["final_holdout"],
        current_season=s["current"],
        anomalous_seasons=list(s["anomalous"]),
        test_seasons=list(v["test_seasons"]),
        random_seed=raw["random_seed"],
    )


def ensure_dirs() -> None:
    cfg = load_config()
    for d in (cfg.interim, cfg.processed, cfg.artifacts):
        d.mkdir(parents=True, exist_ok=True)
