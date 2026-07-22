---
name: redmine-projects
description: Discover and inspect Redmine projects, memberships, versions, and categories. Use when the user asks which projects exist or needs project metadata before filtering tickets.
---

# Redmine projects

## When to use

- "What projects do I have?"
- Resolving a project name to an id before issue filters
- Inspecting versions, categories, or members

## Workflow

1. Call `redmine_list_projects` (optionally `status=*`).
2. Match the user's project name/identifier; prefer numeric `id` for issue filters.
3. Use `redmine_get_project` with includes for trackers/categories/modules when deeper context is needed.
4. For planning metadata:
   - `redmine_list_versions`
   - `redmine_list_issue_categories`
   - `redmine_list_memberships`

## Tips

- Issue `project_id` is typically the numeric id, not the friendly name.
- Mention both id and identifier when summarizing projects.
