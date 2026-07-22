---
name: redmine-issue
description: Fetch a single Redmine issue by id with journals and relations.
---

# Show Redmine issue

1. Read the issue id from the user (e.g. `#1234` or `1234`).
2. Call `redmine_get_issue` with `include=journals,attachments,relations,children,watchers`.
3. Summarize subject, status, project, tracker, priority, assignee, dates, description, and recent journals.
4. Mention attachment names and related issues when present.
