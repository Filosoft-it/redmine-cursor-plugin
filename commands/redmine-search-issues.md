---
name: redmine-search-issues
description: Search and filter Redmine issues from a natural-language request.
---

# Search Redmine issues

1. Parse the user request for project, status, assignee, tracker, dates, and keywords.
2. Discover missing ids with the Redmine list tools (`projects`, `trackers`, `statuses`, etc.).
3. Prefer `redmine_list_issues` with structured filters.
4. Use `redmine_search` when the request is free-text and filters are unclear, then refine.
5. Return a ranked, readable summary and the exact filters used.
