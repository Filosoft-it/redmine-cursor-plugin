# Redmine

State-of-the-art Cursor plugin that connects your Redmine instance to the agent using an **instance URL** and **API access key**.

Fetch projects and tickets, then filter issues with the official Redmine REST surface: project, subproject, tracker, status, assignee, author, priority, version, category, dates, saved queries, custom fields, sort, and pagination.

## Install

### Cursor Marketplace

1. Install **Redmine** from the Cursor marketplace.
2. Open **Plugins → Configure** and set:
   - `REDMINE_URL` — e.g. `https://redmine.example.com`
   - `REDMINE_API_KEY` — from Redmine → **My account** → **API access key**
   - `REDMINE_READ_ONLY` — `true` (default) or `false` to allow create/update issue tools
3. Ensure an administrator enabled **Administration → Settings → API → Enable REST web service**.

### Local development

```bash
mkdir -p ~/.cursor/plugins/local
ln -s /absolute/path/to/redmine-cursor-plugin ~/.cursor/plugins/local/redmine
```

Then configure the same variables in Cursor.

## What you can do

Ask Cursor things like:

- "List my open Redmine tickets"
- "Show projects I can access"
- "Filter open bugs in project X updated this week"
- "Open issue #1234 with comments"
- "Use saved query 'Sprint board'"

### Slash commands

| Command | Description |
| --- | --- |
| `/redmine-my-issues` | Open issues assigned to me |
| `/redmine-list-projects` | List visible projects |
| `/redmine-search-issues` | Natural-language issue search/filter |
| `/redmine-issue` | Deep-dive a single issue |

### MCP tools

| Tool | Purpose |
| --- | --- |
| `redmine_get_current_user` | Verify API key / learn `me` |
| `redmine_list_projects` / `redmine_get_project` | Discover projects |
| `redmine_list_issues` | Filter tickets (full REST filter set) |
| `redmine_get_issue` | Issue detail + journals/attachments/relations |
| `redmine_list_trackers` | Tracker ids |
| `redmine_list_issue_statuses` | Status ids |
| `redmine_list_priorities` | Priority ids |
| `redmine_list_users` | User ids for assignee/author filters |
| `redmine_list_queries` | Saved queries → `query_id` |
| `redmine_list_versions` | Target versions |
| `redmine_list_issue_categories` | Categories |
| `redmine_list_custom_fields` | Custom field ids |
| `redmine_list_time_entries` | Time entries |
| `redmine_list_memberships` | Project members/roles |
| `redmine_search` | Full-text search |
| `redmine_create_issue` / `redmine_update_issue` | Writes (only when `REDMINE_READ_ONLY=false`) |

### Issue filter examples

```text
assigned_to_id=me&status_id=open&sort=priority:desc,updated_on:desc
project_id=12&subproject_id=!*&tracker_id=1&status_id=*
updated_on=>=2024-01-01&priority_id=5|6
query_id=42
custom_fields={"4":"~foo"}
```

## Components

- **MCP server** — bundled Node server under `server/` (zero install beyond Node 18+)
- **Skills** — issue, project, and filter workflows
- **Commands** — triage shortcuts
- **Agent** — `redmine-assistant`
- **Rules** — safe, filter-first defaults

## Development

```bash
cd server
npm install
npm run build:bundle
npm run typecheck
```

Smoke-test the server:

```bash
REDMINE_URL=https://redmine.example.com \
REDMINE_API_KEY=your-key \
node server/dist/index.js
```

## Security

- API keys are configured in Cursor plugin settings, not committed to the repo.
- Default mode is read-only.
- Do not paste API keys into chats or commits.

## License

MIT
