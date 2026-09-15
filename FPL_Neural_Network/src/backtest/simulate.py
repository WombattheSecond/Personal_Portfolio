"""Season simulation - the real objective, eventually.

Monte Carlo the component distributions into a full points distribution per
player-fixture, so questions like "probability of a 10+ haul" become answerable.
Spread matters as much as the mean: captaincy is a bet on upside.

Later, team selection as a constrained optimisation over those distributions
(budget, 3-per-club, formation, transfer costs, chips), backtested as a whole
decision system.

Too slow and too noisy to iterate against - use it as a final check, not an
inner loop.
"""
