---
name: redmine-list-projects
description: List Redmine projects visible to the configured API key.
---

# List Redmine projects

1. Call `redmine_list_projects` with `limit=100` (paginate if `total_count` is higher).
2. Present id, identifier, name, and status.
3. Ask or infer which project to use for subsequent issue filters.
