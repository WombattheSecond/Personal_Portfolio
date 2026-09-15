"""Player, club and opponent embedding tables.

Keyed on canonical ids from src/identity/ - never on FPL element ids, which are
reassigned each season.

Needs a cold-start path for players and promoted clubs with no history: an
out-of-vocabulary vector, or a prior pooled by position and price bracket.
"""
