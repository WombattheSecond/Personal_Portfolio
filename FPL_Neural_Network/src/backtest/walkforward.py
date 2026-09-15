"""Walk-forward validation. The only valid scheme for this data.

Train on everything up to gameweek t-1, predict gameweek t, advance, repeat
across whole seasons. Report per-gameweek and pooled.

Random k-fold will hand you excellent numbers and a worthless model. There is no
version of it that is acceptable here.

Split on kickoff_time, not gameweek number - rescheduled matches otherwise leak
across the boundary.

configs/config.yaml names a final_holdout season. Do not look at it until you
believe you are finished.
"""
