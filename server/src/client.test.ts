import { RedmineClient, isReadOnly } from "../src/client.js";
import { applyCustomFieldFilters } from "../src/format.js";
import assert from "node:assert/strict";
import test from "node:test";

test("applyCustomFieldFilters prefixes cf_", () => {
  const query = {};
  applyCustomFieldFilters(query, { "4": "~foo", cf_1: "bar" });
  assert.equal(query.cf_4, "~foo");
  assert.equal(query.cf_1, "bar");
});

test("isReadOnly defaults to true", () => {
  const previous = process.env.REDMINE_READ_ONLY;
  delete process.env.REDMINE_READ_ONLY;
  assert.equal(isReadOnly(), true);
  process.env.REDMINE_READ_ONLY = "false";
  assert.equal(isReadOnly(), false);
  process.env.REDMINE_READ_ONLY = "true";
  assert.equal(isReadOnly(), true);
  if (previous === undefined) delete process.env.REDMINE_READ_ONLY;
  else process.env.REDMINE_READ_ONLY = previous;
});

test("RedmineClient builds query and sends API key", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ issues: [], total_count: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const client = new RedmineClient("https://redmine.example.com/", "secret-key");
    const data = await client.get("/issues.json", {
      project_id: 12,
      status_id: "open",
      assigned_to_id: "me",
      empty: "",
      missing: undefined,
    });
    assert.equal(data.total_count, 0);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /https:\/\/redmine\.example\.com\/issues\.json\?/);
    assert.match(calls[0].url, /project_id=12/);
    assert.match(calls[0].url, /status_id=open/);
    assert.match(calls[0].url, /assigned_to_id=me/);
    assert.doesNotMatch(calls[0].url, /empty=/);
    assert.equal(calls[0].init.headers["X-Redmine-API-Key"], "secret-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("RedmineClient surfaces API errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ errors: ["Unauthorized"] }), {
      status: 401,
      statusText: "Unauthorized",
      headers: { "Content-Type": "application/json" },
    });

  try {
    const client = new RedmineClient("https://redmine.example.com", "bad");
    await assert.rejects(() => client.get("/users/current.json"), /401/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
