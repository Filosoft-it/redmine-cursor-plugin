---
name: redmine-filters
description: Map natural-language Redmine requests onto official REST issue filters and discovery tools. Use when the user describes filters vaguely (by project, assignee, status, dates, custom fields, saved queries).
---

# Redmine filters

## Discovery order

1. `redmine_list_projects` → `project_id`
2. `redmine_list_trackers` → `tracker_id`
3. `redmine_list_issue_statuses` → numeric `status_id` (or `open` / `closed` / `*`)
4. `redmine_list_priorities` → `priority_id`
5. `redmine_list_users` / `me` → `assigned_to_id`, `author_id`, `watcher_id`
6. `redmine_list_versions` → `fixed_version_id`
7. `redmine_list_issue_categories` → `category_id`
8. `redmine_list_queries` → `query_id`
9. `redmine_list_custom_fields` → `custom_fields` / `cf_<id>`

## Operator cheat sheet

- Multiple values: `1|2|3`
- Contains subject: `subject=~login`
- Date after: `updated_on=>=2024-01-01`
- Date range: `created_on=><2024-01-01|2024-01-31`
- Unassigned: `assigned_to_id=!*`
- Exclude subprojects: `subproject_id=!*`
- Sort: `sort=updated_on:desc` or `priority:desc,updated_on:desc`

## Strategy

- Translate the user request into the smallest precise filter set.
- If a name is ambiguous, list candidates and ask or choose the closest match with confidence stated.
- Prefer `redmine_search` for free-text exploration, then refine with `redmine_list_issues`.
