---
name: redmine-my-issues
description: List open Redmine issues assigned to me, optionally scoped to a project.
---

# My Redmine issues

1. Call `redmine_get_current_user` if the session has not verified auth yet.
2. If the user named a project, resolve it with `redmine_list_projects` / `redmine_get_project`.
3. Call `redmine_list_issues` with:
   - `assigned_to_id=me`
   - `status_id=open`
   - `sort=priority:desc,updated_on:desc`
   - `limit=25`
   - `project_id` when known
4. Summarize results as a compact list with id, subject, project, priority, and updated_on.
5. Offer follow-ups: closed issues, another project, or a specific issue deep-dive.
