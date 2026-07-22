export type QueryValue = string | number | boolean | undefined | null;

export class RedmineClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  async request<T = unknown>(
    path: string,
    options: {
      method?: string;
      query?: Record<string, QueryValue>;
      body?: unknown;
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value === undefined || value === null || value === "") continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      "X-Redmine-API-Key": this.apiKey,
      Accept: "application/json",
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data && "errors" in data
          ? JSON.stringify((data as { errors: unknown }).errors)
          : text || response.statusText;
      throw new Error(`Redmine API ${response.status} ${response.statusText}: ${message}`);
    }

    return data as T;
  }

  get<T = unknown>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>(path, { query });
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  put<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Configure it in Cursor under Plugins → Configure.`,
    );
  }
  return value;
}

export function isReadOnly(): boolean {
  const value = (process.env.REDMINE_READ_ONLY ?? "true").trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "no";
}
