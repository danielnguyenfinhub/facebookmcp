import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch } from "../fb-client.js";

const INSIGHTS_FIELDS =
  "impressions,reach,frequency,spend,clicks,cpc,cpm,ctr,cpp,actions,conversions,cost_per_action_type,cost_per_conversion,purchase_roas,website_ctr,social_spend";

const commonInsightParams = {
  date_preset: z
    .string()
    .optional()
    .describe(
      "today, yesterday, this_month, last_month, this_quarter, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, last_week_mon_sun, last_week_sun_sat, last_quarter, last_year, this_year, lifetime"
    ),
  time_range_since: z
    .string()
    .optional()
    .describe("Start date YYYY-MM-DD, use with time_range_until"),
  time_range_until: z
    .string()
    .optional()
    .describe("End date YYYY-MM-DD, use with time_range_since"),
  level: z
    .string()
    .optional()
    .describe("account, campaign, adset, ad"),
  breakdowns: z
    .array(z.string())
    .optional()
    .describe(
      "age, gender, country, region, dma, impression_device, platform_position, publisher_platform, device_platform"
    ),
  limit: z.number().optional().default(25).describe("Number of results to return (default 25)"),
  after: z.string().optional().describe("Pagination cursor for next page of results"),
};

function buildInsightsQs(params: {
  date_preset?: string;
  time_range_since?: string;
  time_range_until?: string;
  level?: string;
  breakdowns?: string[];
  limit?: number;
  after?: string;
}): URLSearchParams {
  const qs = new URLSearchParams();
  qs.set("fields", INSIGHTS_FIELDS);
  if (params.date_preset) qs.set("date_preset", params.date_preset);
  if (params.time_range_since && params.time_range_until) {
    qs.set(
      "time_range",
      JSON.stringify({ since: params.time_range_since, until: params.time_range_until })
    );
  }
  if (params.level) qs.set("level", params.level);
  if (params.breakdowns) qs.set("breakdowns", params.breakdowns.join(","));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.after) qs.set("after", params.after);
  return qs;
}

export function registerAdInsightTools(server: McpServer): void {
  // 1. Account Insights
  server.tool(
    "get_account_insights",
    "Get insights for an ad account including spend, reach, impressions, clicks, conversions and ROAS",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      ...commonInsightParams,
    },
    async (params) => {
      try {
        const qs = buildInsightsQs(params);
        const result = await marketingFetch(`/act_${params.account_id}/insights?${qs.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 2. Campaign Insights
  server.tool(
    "get_campaign_insights",
    "Get insights for a specific campaign including spend, reach, impressions, clicks, conversions and ROAS",
    {
      campaign_id: z.string().describe("The campaign ID"),
      ...commonInsightParams,
    },
    async (params) => {
      try {
        const qs = buildInsightsQs(params);
        const result = await marketingFetch(`${params.campaign_id}/insights?${qs.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 3. Ad Set Insights
  server.tool(
    "get_adset_insights",
    "Get insights for a specific ad set including spend, reach, impressions, clicks, conversions and ROAS",
    {
      adset_id: z.string().describe("The ad set ID"),
      ...commonInsightParams,
    },
    async (params) => {
      try {
        const qs = buildInsightsQs(params);
        const result = await marketingFetch(`${params.adset_id}/insights?${qs.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 4. Ad Insights
  server.tool(
    "get_ad_insights",
    "Get insights for a specific ad including spend, reach, impressions, clicks, conversions and ROAS",
    {
      ad_id: z.string().describe("The ad ID"),
      ...commonInsightParams,
    },
    async (params) => {
      try {
        const qs = buildInsightsQs(params);
        const result = await marketingFetch(`${params.ad_id}/insights?${qs.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 5. Cross-object Insights Report
  server.tool(
    "get_insights_report",
    "Get a cross-object insights report with full breakdown across all campaigns, ad sets, or ads in an account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      ...commonInsightParams,
      level: z
        .string()
        .describe("Aggregation level: campaign, adset, or ad"),
    },
    async (params) => {
      try {
        const qs = buildInsightsQs(params);
        // Ensure level is always set for cross-object report
        qs.set("level", params.level);
        const result = await marketingFetch(`/act_${params.account_id}/insights?${qs.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );
}
