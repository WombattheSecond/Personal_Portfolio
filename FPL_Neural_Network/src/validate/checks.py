"""Assertions over the canonical table. Run after every rebuild.

The one that earns its keep is the points reconstruction: recompute
total_points from the components using each season's scoring rules and compare
against the recorded value. A disagreement rate above a fraction of a percent
means something is wrong - a rule version, a column mapping, a duplicate row.
It catches most silent ingestion bugs, and it will catch the next one you
introduce in 2018-19 six weeks from now.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from src.scoring.rules import compute_points

TOLERANCE = 0.005  # 0.5% of rows may disagree before a season is flagged


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str
    data: pd.DataFrame | None = field(default=None, repr=False)


def check_points_reconstruction(df: pd.DataFrame) -> CheckResult:
    rows = []
    mismatches = []
    for season, grp in df.groupby("season", sort=True):
        recomputed = compute_points(grp, season)
        diff = recomputed - grp["total_points"]
        bad = diff != 0
        rate = bad.mean()
        rows.append({"season": season, "rows": len(grp), "mismatched": int(bad.sum()), "rate": rate})
        if bad.any():
            m = grp[bad].copy()
            m["points_reconstructed"] = recomputed[bad]
            m["diff"] = diff[bad]
            mismatches.append(m)
    summary = pd.DataFrame(rows)
    worst = summary.rate.max()
    detail = summary.to_string(index=False, float_format=lambda x: f"{x:.4%}")
    return CheckResult(
        "points_reconstruction",
        bool(worst <= TOLERANCE),
        detail,
        pd.concat(mismatches) if mismatches else None,
    )


def check_unique_player_fixture(df: pd.DataFrame) -> CheckResult:
    dupes = df.duplicated(["season", "player_code", "fixture_id"], keep=False)
    return CheckResult(
        "unique_player_fixture",
        not dupes.any(),
        f"{int(dupes.sum())} duplicate (season, player_code, fixture_id) rows",
        df[dupes] if dupes.any() else None,
    )


def check_double_gameweeks(df: pd.DataFrame) -> CheckResult:
    counts = df.groupby(["season", "player_code", "gw"]).size()
    dgw = counts[counts > 1]
    return CheckResult(
        "double_gameweeks_present",
        len(dgw) > 0,
        f"{len(dgw):,} player-gameweeks with more than one fixture "
        f"(max {int(counts.max())} in a gameweek)",
    )


def check_identity_resolved(df: pd.DataFrame) -> CheckResult:
    missing = df.player_code.isna().sum()
    multi = (
        df.groupby(["season", "element"]).player_code.nunique().gt(1).sum()
    )
    return CheckResult(
        "identity_resolved",
        missing == 0 and multi == 0,
        f"{missing} unresolved rows; {multi} (season, element) mapping to >1 player_code",
    )


def check_sequences_ordered(df: pd.DataFrame) -> CheckResult:
    ordered = df.groupby("player_code").kickoff_time.is_monotonic_increasing
    bad = (~ordered).sum()
    return CheckResult(
        "sequences_ordered",
        bad == 0,
        f"{bad} players whose rows are not in kickoff_time order",
    )


def check_missing_not_zero(df: pd.DataFrame) -> CheckResult:
    """Columns absent for a season must be NaN across it, not silently zero."""
    xg = df.groupby("season").expected_goals.apply(lambda s: s.isna().all())
    pre2223 = [s for s in xg.index if s < "2022-23"]
    ok = all(xg[s] for s in pre2223)
    return CheckResult(
        "missing_not_zero",
        ok,
        "expected_goals is all-NaN before 2022-23: "
        + ", ".join(f"{s}={'NaN' if xg[s] else 'PRESENT'}" for s in pre2223),
    )


ALL_CHECKS = [
    check_identity_resolved,
    check_unique_player_fixture,
    check_double_gameweeks,
    check_sequences_ordered,
    check_missing_not_zero,
    check_points_reconstruction,
]


def run_all(df: pd.DataFrame) -> list[CheckResult]:
    return [check(df) for check in ALL_CHECKS]


if __name__ == "__main__":
    from src.canonical.build import load_canonical

    frame = load_canonical()
    print(f"canonical: {len(frame):,} rows\n")
    failed = 0
    for res in run_all(frame):
        mark = "PASS" if res.passed else "FAIL"
        failed += not res.passed
        print(f"[{mark}] {res.name}")
        for line in res.detail.splitlines():
            print(f"       {line}")
        print()
    print(f"{failed} check(s) failed")
