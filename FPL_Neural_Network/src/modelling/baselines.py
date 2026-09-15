"""The bar every real model has to clear. Build these before training anything.

  1. predict 0 for everyone            - competitive on MAE; most rows are zeros
  2. season-to-date points per game
  3. mean points over last 5 appearances x played-last-match
  4. FPL's own `ep_next`               - the official expected points

Without these you cannot tell whether a model is working, and (4) in particular
is a genuine bar rather than a formality.
"""
