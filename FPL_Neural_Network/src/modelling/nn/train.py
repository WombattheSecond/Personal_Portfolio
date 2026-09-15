"""Training loop: composite multi-task likelihood over the heads.

Weight the per-head losses deliberately - the minutes head matters far more to
final points error than the cards head.

Recency-decay the sample weights (half-life around a season) and early-stop on a
walk-forward split, never a random one.
"""
