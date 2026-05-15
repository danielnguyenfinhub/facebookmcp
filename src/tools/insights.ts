import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, getPageId } from "../fb-client.js";

export function registerInsightTools(server: McpServer): void {
  // 1. get_page_insights
  server.tool(
    "get_page_insights",
    "Get Page-level insights/analytics. Common metrics: page_impressions, page_engaged_users, page_fans, page_views_total, page_actions_post_reactions_total, page_fan_adds, page_fan_removes. Periods: day, week, days_28, month, lifetime.",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      metrics: z.string().describe("Comma-separated metric names"),
      period: z.enum(["day", "week", "days_28", "month", "lifetime"]).optional().describe("Aggregation period"),
      since: z.string().optional().describe("Start date (YYYY-MM-DD or Unix timestamp)"),
      until: z.string().optional().describe("End date (YYYY-MM-DD or Unix timestamp)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("metric", params.metrics);
        if (params.period) qs.set("period", params.period);
        if (params.since) qs.set("since", params.since);
        if (params.until) qs.set("until", params.until);
        const result = await fbFetch(`/${pid}/insights?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_post_insights
  server.tool(
    "get_post_insights",
    "Get insights for a specific post. Common metrics: post_impressions, post_engaged_users, post_clicks, post_reactions_by_type_total.",
    {
      post_id: z.string().describe("The Post ID"),
      metrics: z.string().describe("Comma-separated metric names"),
    },
    async ({ post_id, metrics }) => {
      try {
        const qs = new URLSearchParams();
        qs.set("metric", metrics);
        const result = await fbFetch(`/${post_id}/insights?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_video_insights
  server.tool(
    "get_video_insights",
    "Get insights for a specific video",
    {
      video_id: z.string().describe("The Video ID"),
      metrics: z.string().describe("Comma-separated metric names"),
    },
    async ({ video_id, metrics }) => {
      try {
        const qs = new URLSearchParams();
        qs.set("metric", metrics);
        const result = await fbFetch(`/${video_id}/video_insights?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. get_page_fans_by_city
  // Fix: page_fans_city is a lifetime-only metric — period=day returns invalid metric error
  server.tool(
    "get_page_fans_by_city",
    "Get Page fans broken down by city",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => { try { const pid = page_id || getPageId();
        const result = await fbFetch(`/${pid}/insights?metric=page_fans_city&period=lifetime`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
