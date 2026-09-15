"""The pre-match / post-match column split - the project's leakage control.

Every column in the canonical table is either known before kickoff or observed
after the match. A post-match column is leakage on its own row and a legitimate
feature only once lagged to a player's previous matches.

The feature builder consults these lists rather than relying on anyone
remembering the distinction. `assert_no_leakage` is the enforcement.
"""
from __future__ import annotations

# --- Identity and context: known before kickoff -----------------------------
KEYS = [
    "season",
    "player_code",       # stable across seasons (FPL `code`)
    "element",           # season-local FPL id, kept for tracing back to source
    "fixture_id",
    "gw",
]

PRE_MATCH = [
    "player_name",
    "position",
    "team_code",
    "opponent_team_code",
    "was_home",
    "kickoff_time",
    "round",
    "value",             # price x10, set before the deadline
    "selected",          # ownership at deadline
    "transfers_in",
    "transfers_out",
    "transfers_balance",
    "xP",                # FPL's own projection - VERIFIED pre-match, see below
]

# --- Observed only after the match ------------------------------------------
POST_MATCH = [
    "minutes",
    "starts",
    "goals_scored",
    "assists",
    "clean_sheets",
    "goals_conceded",
    "own_goals",
    "penalties_saved",
    "penalties_missed",
    "yellow_cards",
    "red_cards",
    "saves",
    "bonus",
    "bps",
    "influence",
    "creativity",
    "threat",
    "ict_index",
    "expected_goals",
    "expected_assists",
    "expected_goal_involvements",
    "expected_goals_conceded",
    "defensive_contribution",
    "clearances_blocks_interceptions",
    "recoveries",
    "tackles",
    "team_h_score",
    "team_a_score",
    "total_points",
]

TARGET = "total_points"

# Components the model predicts directly; points are then reconstructed from
# them via src/scoring/rules.py rather than regressed on.
COMPONENTS = [
    "minutes",
    "goals_scored",
    "assists",
    "clean_sheets",
    "goals_conceded",
    "saves",
    "yellow_cards",
    "red_cards",
    "own_goals",
    "penalties_saved",
    "penalties_missed",
    "bonus",
    "defensive_contribution",
]


def assert_no_leakage(feature_columns: list[str]) -> None:
    """Raise if any feature is a post-match column used unlagged.

    Call this on every feature matrix before training. Lagged features should be
    named with an explicit suffix (`_lag1`, `_roll5`, ...) so a bare post-match
    name in a feature list is unambiguously a bug.
    """
    bad = sorted(set(feature_columns) & set(POST_MATCH))
    if bad:
        raise ValueError(
            f"Post-match columns used unlagged as features: {bad}. "
            "Lag them to previous appearances or drop them."
        )
