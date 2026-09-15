"""Ordered per-player match sequences for the sequence encoder.

Emit, for each player-fixture, the preceding N matches as an ordered tensor plus
a padding mask. Zero-minute matches stay in the sequence - absence is signal.

This is the alternative to hand-picking rolling windows of 3/5/10: let the model
learn the decay, and learn that it differs between minutes and attacking output.
"""
