# Running an instance is its own section, and reference pages own the detail

The sidebar has five sections: Getting started, Guides, Operating, Reference and Architecture. Self-hosting, configuration, the database, hardening and upgrades sit under Operating rather than under Guides, because someone running an instance is a different reader from someone building an app and shouldn't have to know that their path starts two levels down in Guides. Recipes moved up one level, beside the other guide groups, for the same reason.

Reference pages own every key, flag and field. A guide explains the few a reader needs first and links to the reference for the rest, so no fact has two homes. The Configuring an instance guide held a second copy of the configuration tables, which is the failure this rule stops.

Keeping Operating inside Guides was the alternative. It keeps the top level shorter, and it's what left operators with no visible way in.
