import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, getPageId } from "../fb-client.js";

export function registerRatingTools(server: McpServer): void {
  // 1. list_page_ratings
  server.tool(
    "list_page_ratings",
    "List ratings and reviews for a Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "reviewer,created_time,rating,review_text,recommendation_type");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/ratings?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_page_overall_rating
  server.tool(
    "get_page_overall_rating",
    "Get a Page's overall star rating and rating count",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => { try { const pid = page_id || getPageId();
        const result = await fbFetch(`/${pid}?fields=overall_star_rating,rating_count`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
