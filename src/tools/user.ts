import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, getAllPages } from "../fb-client.js";

export function registerUserTools(server: McpServer): void {
  // 1. list_accounts — uses USER_TOKEN for /me/accounts
  server.tool(
    "list_accounts",
    "List Pages the authenticated user manages (with access tokens)",
    {
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams();
        qs.set("fields", "id,name,access_token,category,tasks");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await marketingFetch(`/me/accounts?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. debug_token
  server.tool(
    "debug_token",
    "Debug an access token to see its metadata (app, user, permissions, expiry)",
    {
      input_token: z.string().describe("The access token to debug"),
    },
    async ({ input_token }) => {
      try {
        const result = await marketingFetch(`/debug_token?input_token=${encodeURIComponent(input_token)}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. list_all_pages — shows all cached pages with IDs (no tokens exposed)
  server.tool(
    "list_all_pages",
    "List all Facebook Pages this MCP server can manage. Returns page ID, name, and category for each page. Use the page_id in other tools to target a specific page.",
    {},
    async () => {
      try {
        const pages = getAllPages();
        if (pages.length === 0) {
          return { content: [{ type: "text", text: "No pages found. Check FACEBOOK_ACCESS_TOKEN has page access." }] };
        }
        const result = pages.map(p => ({
          page_id: p.id,
          name: p.name,
          category: p.category || "Unknown",
        }));
        return { content: [{ type: "text", text: JSON.stringify({ pages: result, total: result.length }, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
