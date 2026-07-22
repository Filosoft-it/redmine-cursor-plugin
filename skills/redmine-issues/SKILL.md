---
name: redmine-issues
description: Fetch, inspect, and summarize Redmine tickets/issues. Use when the user asks about Redmine issues, bugs, tickets, triage, or issue details.
---

# Redmine issues

## When to use

- Listing or searching tickets
- Opening a specific issue id
- Triaging assigned / overdue / recently updated work

## Workflow

1. If connectivity is uncertain, call `redmine_get_current_user`.
2. Resolve project context with `redmine_list_projects` or `redmine_get_project` when the user names a project.
3. Fetch tickets with `redmine_list_issues` using precise filters.
4. For a single ticket, call `redmine_get_issue` with journals/attachments/relations as needed.
5. Present a concise table or bullets; include issue ids and subjects first.

## Useful filters

| Goal | Filter |
| --- | --- |
| My open work | `assigned_to_id=me`, `status_id=open` |
| Project backlog | `project_id=<id>`, `status_id=open` |
| Project only (no subs) | `project_id=<id>`, `subproject_id=!*` |
| Closed in range | `status_id=closed`, `closed_on` / `updated_on` operators |
| By tracker | `tracker_id` from `redmine_list_trackers` |
| Saved query | `query_id` from `redmine_list_queries` |
| Custom field | `custom_fields` / `cf_<id>` |

## Output format

- Lead with count / total_count when present
- For each issue: `#id` subject — status — assignee — priority — updated_on
- Offer next filters instead of dumping huge JSON
