"""The neural architecture.

  sequence encoder over match history
    + player / team / opponent embeddings
    + pre-match context features
  -> shared trunk
  -> one distributional head per component
  -> compose with src/scoring/rules.py

Each piece is there for a reason a GBM cannot serve:

  embeddings    let a 6-appearance rotation player borrow strength from similar
                players, instead of being memorised or flattened to the mean
  sequence      learns the shape of form decay rather than having it hardcoded
  shared trunk  multi-task learning - the representation predicting "will he
                start" overlaps heavily with "will he score", and separate GBMs
                would rediscover it six times independently
  dist. heads   zero-inflated Poisson trained on a proper likelihood gives the
                full points distribution directly, rather than bolting Monte
                Carlo on afterwards

Scale constraint: roughly 200k player-fixture rows, about half with non-zero
minutes. Small. Keep models modest, regularise hard, early-stop on the
walk-forward split, and lean on multi-task learning as a regulariser. A deep
transformer will memorise the training seasons.
"""
