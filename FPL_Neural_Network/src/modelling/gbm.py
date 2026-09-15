"""Gradient boosting. The control group, not the destination.

Two jobs:
  * the deliberately simple v1 - single model, target total_points, ~20 lagged
    features, whose purpose is a working end-to-end pipeline rather than
    accuracy
  * a tuned per-component baseline that the neural model has to beat on
    identical features, so "the network helped" is a measurement rather than
    an assumption

Use objectives that match the targets: Poisson for counts, binary logloss for
starts and clean sheets.
"""
