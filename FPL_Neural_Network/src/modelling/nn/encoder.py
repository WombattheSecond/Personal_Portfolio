"""Sequence encoder over a player's preceding matches.

GRU or a small masked transformer. Consumes the padded sequences from
src/features/sequences.py and returns one form vector per player-fixture.
"""
