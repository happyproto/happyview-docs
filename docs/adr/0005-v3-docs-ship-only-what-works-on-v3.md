# The v3 docs ship only what works on v3

A page that would fail a reader on v3 is retired or held back rather than shipped with a warning: the Statusphere tutorial (built in the dashboard, no interpreter step), the Railway guide (its templates are v2's) and the GitHub Actions guide (its actions deploy a v2 file layout) are out of the v3 docs, with their old URLs redirected to the v2 archive or the nearest v3 page. A page that is planned but not written is a visible stub saying what it will cover. Behaviour that exists only in an open pull request is marked as pending and names the pull request.

The alternative was to keep the v2-era pages under a caution. A newcomer following them would hit a refused save or a missing `require` on their first script, which is the failure the docs audit found on every new-user path.
