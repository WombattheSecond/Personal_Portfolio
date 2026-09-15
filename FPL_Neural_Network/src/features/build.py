"""Assemble feature matrices from the canonical table into data/processed/.

Every feature must be computable strictly before its row's kickoff_time. Roll
over appearances rather than calendar gameweeks, and shift by one so the current
match never contributes to its own features.

Feature groups:
  form        rolling/decayed minutes, xG, xA, shots, key passes, bps, ICT
  role        share of team shots, penalty and set-piece duties, recent starts
  team        rolling team xG for and against
  opponent    opponent xGA and form, FPL strength_* fields from teams.csv
  fixture     home/away, days rest, matches in last 14 days, DGW flag, month
  availability chance_of_playing, status, days since last appearance
  market      price, price changes, ownership, net transfers - these encode
              crowd knowledge of team news that is otherwise absent from the
              archive, and are legitimate because they are pre-deadline

No season-to-date aggregate computed over a full season. That leaks the future
into gameweek 3.
"""
