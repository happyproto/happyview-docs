# v3 pages pin beta, and alpha is parked

A v3 page that pulls an image, clones the source or links a file on GitHub names a v3 tag or the `beta` branch. HappyView merged `alpha` into `beta` for v3.0.0-beta.1, and `beta` is now the default branch and cuts `3.0.0-beta.N`. `alpha` is parked and read-only, `release/v2` takes the 2.17.x fixes, and `main` stays at v2.17.0 until v3 ships stable. This supersedes [ADR 10](0010-v3-pages-pin-the-alpha-line.md).

The default branch is v3 again, so a clone without `--branch` gets v3. `latest` is still v2, so a page that pulls an image keeps naming a v3 version. A link to `alpha` would point at a branch that no longer changes.

Unpinning everything to the default branch and `latest` was the alternative. It works for clones and links today, but `latest` would install v2 until v3 ships stable. The cost is the same as before: a sweep of these pages when v3 becomes stable and `latest` moves.
