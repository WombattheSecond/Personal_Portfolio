"""Read, verify and update data_manifest.yaml.

Should be able to report the current upstream commit and warn when the clone in
data/raw/ has drifted from the pinned commit - that mismatch is the usual
explanation for results that will not reproduce.
"""
