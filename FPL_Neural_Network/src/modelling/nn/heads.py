"""Distributional output heads, one per scoring component.

  minutes    P(appears), P(60+), E[minutes] - the highest-leverage head, and
             the one most constrained by data: whether a player starts depends
             on a Friday press conference that is nowhere in this archive.
             Historical rotation patterns go a long way, then hit a ceiling.
  goals      Poisson rate per 90, scaled by predicted minutes
  assists    as above
  defence    P(clean sheet), E[goals conceded] - modelled at TEAM-fixture level
             and joined onto players; per-player wastes sample size
  saves      goalkeepers only
  cards      logistic
  bps        model the continuous bps, then rank within match to get 3/2/1 -
             bps is a deterministic formula and far more predictable than the
             discretised award

Goalkeepers and forwards score through nearly disjoint mechanisms; either split
by position or make sure the heads can.
"""
