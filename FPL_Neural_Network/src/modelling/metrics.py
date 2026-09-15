"""Evaluation. MAE alone will mislead you here.

Points are zero-inflated, so a model predicting a flat 1.8 for everyone scores
respectably on MAE while being useless. Track it, but judge on:

  * Spearman rank correlation WITHIN each gameweek - are players ordered right
  * precision@K within position
  * calibration of every probabilistic head (reliability curves)
  * errors segmented by position, minutes, price bracket, and nailed-on versus
    rotation risk - pooled metrics hide a model that is fine on starters and
    hopeless on the players where decisions are actually made
"""
