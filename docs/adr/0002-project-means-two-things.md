---
status: accepted
---

# "Project" means one thing on each side, and the docs qualify the HappyProto one

On HappyView's side a project is the directory with `happyview.toml` and `src/` that is deployed to an instance. In the HappyProto dashboard a project is a container that holds one HappyView instance today and will hold other services (a PDS, a labeler, a relay) later. Both names are established in their products, so neither is renamed. The docs write "project" for the directory and always "HappyProto project" for the container; bare "project" never means the container. On HappyProto-facing pages the first mention says how they relate: your project deploys to the HappyView instance in a HappyProto project.
