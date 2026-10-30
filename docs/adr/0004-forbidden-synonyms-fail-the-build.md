# Avoided words fail the build

`GLOSSARY.md` is the writers' list of canonical terms, and each term's _Avoid_ list is enforced: a test fails when one of those words appears in the prose of a v3 docs page. Code blocks, inline code and quoted UI labels are exempt, so a config key such as `superadmin` or a dashboard button can still be named. The site's Glossary page is the reader-facing version of the same terms and must agree with `GLOSSARY.md`.

A style note alone was the alternative. It did not hold on the old site, where one person had three names (super user, superadmin, Owner) and a record script had four.
