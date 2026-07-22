import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RedmineClient, isReadOnly, requireEnv } from "./client.js";
import { applyCustomFieldFilters, errorResult, jsonResult } from "./format.js";

const ISSUE_FILTER_SHAPE = {
  project_id: z
    .string()
    .optional()
    .describe(
      "Filter by project. Prefer numeric project id. Some Redmine versions also accept the project identifier. Use list_projects to discover ids.",
    ),
  subproject_id: z
    .string()
    .optional()
    .describe(
      "Subproject filter. Use '!*' with project_id to exclude subprojects. Use '*' to include all subprojects.",
    ),
  tracker_id: z
    .string()
    .optional()
    .describe("Tracker id, or pipe-separated ids (e.g. '1|2'). Use list_trackers to discover ids."),
  status_id: z
    .string()
    .optional()
    .describe(
      "Status filter: 'open' (default), 'closed', '*' (all), a numeric status id, or pipe-separated ids. Use list_issue_statuses for ids.",
    ),
  assigned_to_id: z
    .string()
    .optional()
    .describe("Assignee user id, 'me' for the API key owner, or '!*' for unassigned."),
  author_id: z.string().optional().describe("Author user id, or 'me' for the API key owner."),
  category_id: z.string().optional().describe("Issue category id. Use list_issue_categories."),
  priority_id: z.string().optional().describe("Priority id. Use list_priorities."),
  fixed_version_id: z
    .string()
    .optional()
    .describe("Target version id (fixed_version_id). Use list_versions."),
  parent_id: z.string().optional().describe("Parent issue id for subtasks."),
  issue_id: z
    .string()
    .optional()
    .describe("One issue id or comma-separated ids (e.g. '12,15,18')."),
  subject: z.string().optional().describe("Subject filter. Prefix with ~ for contains, e.g. '~login'."),
  created_on: z
    .string()
    .optional()
    .describe(
      "Created date filter with Redmine operators, e.g. '>=2024-01-01', '<=2024-12-31', '><2024-01-01|2024-01-31'.",
    ),
  updated_on: z
    .string()
    .optional()
    .describe(
      "Updated date filter with Redmine operators, e.g. '>=2024-01-02T08:12:32Z'.",
    ),
  start_date: z.string().optional().describe("Start date filter with Redmine operators."),
  due_date: z.string().optional().describe("Due date filter with Redmine operators."),
  done_ratio: z.string().optional().describe("Done ratio filter, e.g. '>=50' or '100'."),
  is_private: z.enum(["true", "false"]).optional().describe("Filter private issues."),
  watcher_id: z.string().optional().describe("Watcher user id, or 'me'."),
  query_id: z
    .string()
    .optional()
    .describe("Saved query id. Use list_queries to discover saved filters."),
  sort: z
    .string()
    .optional()
    .describe("Sort expression, e.g. 'updated_on:desc', 'priority:desc,updated_on:desc'."),
  include: z
    .string()
    .optional()
    .describe("Comma-separated associations to include: attachments, relations."),
  offset: z.number().int().min(0).optional().describe("Pagination offset. Default 0."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Page size (1-100). Default 25."),
  custom_fields: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .optional()
    .describe(
      "Custom field filters keyed by field id or cf_<id>. Examples: {\"4\": \"~foo\"} or {\"cf_1\": \"abcdef\"}. Field must be enabled as a filter in Redmine.",
    ),
} as const;

async function main(): Promise<void> {
  const baseUrl = requireEnv("REDMINE_URL");
  const apiKey = requireEnv("REDMINE_API_KEY");
  const client = new RedmineClient(baseUrl, apiKey);
  const readOnly = isReadOnly();

  const server = new McpServer({
    name: "redmine",
    version: "1.0.0",
  });

  server.registerTool(
    "redmine_get_current_user",
    {
      title: "Get current Redmine user",
      description:
        "Return the Redmine account associated with the configured API access key. Call this first to verify connectivity and learn the authenticated user id for 'me' filters.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await client.get("/users/current.json", { include: "memberships,groups" });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_projects",
    {
      title: "List Redmine projects",
      description:
        "List Redmine projects visible to the API key. Use this to discover project ids/identifiers before filtering issues with project_id.",
      inputSchema: {
        status: z
          .enum(["1", "5", "9", "*"])
          .optional()
          .describe("Project status: 1=active (default), 5=closed, 9=archived, *=all."),
        include: z
          .string()
          .optional()
          .describe(
            "Comma-separated: trackers, issue_categories, enabled_modules, time_entry_activities.",
          ),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(100).optional().describe("Page size (1-100). Default 25."),
      },
    },
    async (args) => {
      try {
        const data = await client.get("/projects.json", {
          status: args.status,
          include: args.include,
          offset: args.offset,
          limit: args.limit ?? 25,
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_get_project",
    {
      title: "Get Redmine project",
      description: "Fetch a single Redmine project by numeric id or identifier.",
      inputSchema: {
        id: z.string().describe("Project numeric id or identifier."),
        include: z
          .string()
          .optional()
          .describe(
            "Comma-separated: trackers, issue_categories, enabled_modules, time_entry_activities, issue_custom_fields.",
          ),
      },
    },
    async (args) => {
      try {
        const data = await client.get(`/projects/${encodeURIComponent(args.id)}.json`, {
          include: args.include ?? "trackers,issue_categories,enabled_modules",
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_issues",
    {
      title: "List / filter Redmine issues (tickets)",
      description:
        "Fetch Redmine issues (tickets) with the official REST filters: project, subproject, tracker, status, assignee, author, category, priority, version, parent, dates, saved query, custom fields, sort, and pagination. Defaults to open issues. Resolve ids via list_projects, list_trackers, list_issue_statuses, list_priorities, list_users, list_versions, list_issue_categories, and list_queries.",
      inputSchema: ISSUE_FILTER_SHAPE,
    },
    async (args) => {
      try {
        const { custom_fields, ...rest } = args;
        const query: Record<string, string | number | boolean | undefined | null> = {
          ...rest,
          limit: rest.limit ?? 25,
          offset: rest.offset ?? 0,
        };
        applyCustomFieldFilters(query, custom_fields);
        const data = await client.get("/issues.json", query);
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_get_issue",
    {
      title: "Get Redmine issue",
      description:
        "Fetch a single Redmine issue by id, optionally including journals, attachments, relations, children, watchers, and allowed_statuses.",
      inputSchema: {
        id: z.number().int().positive().describe("Issue id."),
        include: z
          .string()
          .optional()
          .describe(
            "Comma-separated: children, attachments, relations, changesets, journals, watchers, allowed_statuses.",
          ),
      },
    },
    async (args) => {
      try {
        const data = await client.get(`/issues/${args.id}.json`, {
          include: args.include ?? "journals,attachments,relations,children,watchers",
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_trackers",
    {
      title: "List trackers",
      description: "List issue trackers (Bug, Feature, etc.). Use tracker ids in redmine_list_issues.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.get("/trackers.json"));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_issue_statuses",
    {
      title: "List issue statuses",
      description:
        "List issue statuses. Use status ids or open/closed/* with redmine_list_issues status_id.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.get("/issue_statuses.json"));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_priorities",
    {
      title: "List issue priorities",
      description: "List issue priorities from Redmine enumerations.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.get("/enumerations/issue_priorities.json"));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_users",
    {
      title: "List users",
      description:
        "List Redmine users (requires permission). Useful for assigned_to_id / author_id filters. Prefer assigned_to_id=me when possible.",
      inputSchema: {
        status: z
          .enum(["1", "2", "3"])
          .optional()
          .describe("1=active (default), 2=registered, 3=locked."),
        name: z.string().optional().describe("Filter by login, firstname, or lastname substring."),
        group_id: z.string().optional().describe("Only users in this group id."),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get("/users.json", {
          status: args.status,
          name: args.name,
          group_id: args.group_id,
          offset: args.offset,
          limit: args.limit ?? 25,
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_queries",
    {
      title: "List saved queries",
      description:
        "List saved issue queries visible to the user. Pass query_id to redmine_list_issues to reuse a saved filter.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.get("/queries.json"));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_versions",
    {
      title: "List project versions",
      description: "List versions (target versions) for a project. Use fixed_version_id when listing issues.",
      inputSchema: {
        project_id: z.string().describe("Project numeric id or identifier."),
      },
    },
    async (args) => {
      try {
        const data = await client.get(
          `/projects/${encodeURIComponent(args.project_id)}/versions.json`,
        );
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_issue_categories",
    {
      title: "List issue categories",
      description: "List issue categories for a project. Use category_id when listing issues.",
      inputSchema: {
        project_id: z.string().describe("Project numeric id or identifier."),
      },
    },
    async (args) => {
      try {
        const data = await client.get(
          `/projects/${encodeURIComponent(args.project_id)}/issue_categories.json`,
        );
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_custom_fields",
    {
      title: "List custom fields",
      description:
        "List custom fields (admin permission often required). Use cf_<id> / custom_fields on redmine_list_issues for fields marked 'used as a filter'.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonResult(await client.get("/custom_fields.json"));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_time_entries",
    {
      title: "List time entries",
      description: "List time entries filtered by project, issue, user, and spent_on date.",
      inputSchema: {
        project_id: z.string().optional().describe("Project id or identifier."),
        issue_id: z.string().optional().describe("Issue id."),
        user_id: z.string().optional().describe("User id or 'me'."),
        spent_on: z
          .string()
          .optional()
          .describe("Spent-on filter with Redmine operators, e.g. '>=2024-01-01'."),
        from: z.string().optional().describe("Start date YYYY-MM-DD."),
        to: z.string().optional().describe("End date YYYY-MM-DD."),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get("/time_entries.json", {
          project_id: args.project_id,
          issue_id: args.issue_id,
          user_id: args.user_id,
          spent_on: args.spent_on,
          from: args.from,
          to: args.to,
          offset: args.offset,
          limit: args.limit ?? 25,
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_search",
    {
      title: "Search Redmine",
      description:
        "Full-text search across Redmine (issues, wiki, projects, etc. depending on permissions).",
      inputSchema: {
        q: z.string().min(1).describe("Search query."),
        scope: z
          .enum(["all", "my_project", "subprojects", "project"])
          .optional()
          .describe("Search scope."),
        all_words: z.boolean().optional().describe("Match all words."),
        titles_only: z.boolean().optional().describe("Search titles only."),
        issues: z.boolean().optional().describe("Include issues."),
        news: z.boolean().optional(),
        documents: z.boolean().optional(),
        changesets: z.boolean().optional(),
        wiki_pages: z.boolean().optional(),
        messages: z.boolean().optional(),
        projects: z.boolean().optional(),
        open_issues: z.boolean().optional().describe("Only open issues when searching issues."),
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        const data = await client.get("/search.json", {
          q: args.q,
          scope: args.scope,
          all_words: args.all_words,
          titles_only: args.titles_only,
          issues: args.issues,
          news: args.news,
          documents: args.documents,
          changesets: args.changesets,
          wiki_pages: args.wiki_pages,
          messages: args.messages,
          projects: args.projects,
          open_issues: args.open_issues,
          offset: args.offset,
          limit: args.limit ?? 25,
        });
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "redmine_list_memberships",
    {
      title: "List project memberships",
      description: "List members and roles for a project.",
      inputSchema: {
        project_id: z.string().describe("Project numeric id or identifier."),
      },
    },
    async (args) => {
      try {
        const data = await client.get(
          `/projects/${encodeURIComponent(args.project_id)}/memberships.json`,
        );
        return jsonResult(data);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  if (!readOnly) {
    server.registerTool(
      "redmine_create_issue",
      {
        title: "Create Redmine issue",
        description:
          "Create a new Redmine issue. Disabled when REDMINE_READ_ONLY=true (plugin default).",
        inputSchema: {
          project_id: z.union([z.string(), z.number()]).describe("Target project id or identifier."),
          subject: z.string().min(1).describe("Issue subject."),
          description: z.string().optional(),
          tracker_id: z.number().int().optional(),
          status_id: z.number().int().optional(),
          priority_id: z.number().int().optional(),
          category_id: z.number().int().optional(),
          fixed_version_id: z.number().int().optional(),
          assigned_to_id: z.number().int().optional(),
          parent_issue_id: z.number().int().optional(),
          start_date: z.string().optional(),
          due_date: z.string().optional(),
          estimated_hours: z.number().optional(),
          done_ratio: z.number().int().min(0).max(100).optional(),
          is_private: z.boolean().optional(),
          watcher_user_ids: z.array(z.number().int()).optional(),
          custom_fields: z
            .array(
              z.object({
                id: z.number().int(),
                value: z.union([z.string(), z.number(), z.array(z.string())]),
              }),
            )
            .optional(),
        },
      },
      async (args) => {
        try {
          const { project_id, ...rest } = args;
          const data = await client.post("/issues.json", {
            issue: { project_id, ...rest },
          });
          return jsonResult(data);
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "redmine_update_issue",
      {
        title: "Update Redmine issue",
        description:
          "Update an existing Redmine issue and optionally add notes. Disabled when REDMINE_READ_ONLY=true.",
        inputSchema: {
          id: z.number().int().positive().describe("Issue id."),
          subject: z.string().optional(),
          description: z.string().optional(),
          notes: z.string().optional().describe("Journal notes / comment."),
          private_notes: z.boolean().optional(),
          project_id: z.union([z.string(), z.number()]).optional(),
          tracker_id: z.number().int().optional(),
          status_id: z.number().int().optional(),
          priority_id: z.number().int().optional(),
          category_id: z.number().int().optional(),
          fixed_version_id: z.number().int().optional(),
          assigned_to_id: z.number().int().optional(),
          parent_issue_id: z.number().int().optional(),
          start_date: z.string().optional(),
          due_date: z.string().optional(),
          estimated_hours: z.number().optional(),
          done_ratio: z.number().int().min(0).max(100).optional(),
          is_private: z.boolean().optional(),
          custom_fields: z
            .array(
              z.object({
                id: z.number().int(),
                value: z.union([z.string(), z.number(), z.array(z.string())]),
              }),
            )
            .optional(),
        },
      },
      async (args) => {
        try {
          const { id, ...issue } = args;
          const data = await client.put(`/issues/${id}.json`, { issue });
          return jsonResult(data ?? { ok: true, id });
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
