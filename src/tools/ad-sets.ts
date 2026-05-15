import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

const AD_SET_FIELDS = "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,budget_remaining,bid_amount,bid_strategy,billing_event,optimization_goal,targeting,start_time,end_time,created_time,updated_time";
const AD_SET_DETAIL_FIELDS = `${AD_SET_FIELDS},destination_type,promoted_object`;

export function registerAdSetTools(server: McpServer): void {
  // 1. List ad sets
  server.tool(
    "list_ad_sets",
    "List ad sets in an ad account or campaign. Provide either account_id or campaign_id.",
    {
      account_id: z.string().optional().describe("Ad account ID (without act_ prefix). Provide this or campaign_id."),
      campaign_id: z.string().optional().describe("Filter by campaign. Provide either account_id or campaign_id."),
      limit: z.number().optional().default(25).describe("Maximum number of ad sets to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
      effective_status: z.array(z.string()).optional().describe("Filter by effective status, e.g. [\"ACTIVE\",\"PAUSED\"]"),
    },
    async (params) => {
      try {
        if (!params.account_id && !params.campaign_id) {
          return { content: [{ type: "text" as const, text: "Either account_id or campaign_id must be provided." }], isError: true };
        }
        const basePath = params.campaign_id
          ? `/${params.campaign_id}/adsets`
          : `/act_${params.account_id}/adsets`;
        const qp = new URLSearchParams({ fields: AD_SET_FIELDS, limit: String(params.limit ?? 25) });
        if (params.after) qp.set("after", params.after);
        if (params.effective_status && params.effective_status.length > 0) {
          qp.set("effective_status", JSON.stringify(params.effective_status));
        }
        const result = await marketingFetch(`${basePath}?${qp.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get ad set details
  server.tool(
    "get_ad_set",
    "Get details of a specific ad set including targeting, budget, and status information.",
    {
      adset_id: z.string().describe("The ID of the ad set to retrieve"),
    },
    async (params) => {
      try {
        const result = await marketingFetch(`/${params.adset_id}?fields=${AD_SET_DETAIL_FIELDS}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create ad set
  server.tool(
    "create_ad_set",
    "Create a new ad set within a campaign. Budgets are specified in cents (e.g. 5000 = $50.00).",
    {
      account_id: z.string().describe("Ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the ad set"),
      campaign_id: z.string().describe("The campaign ID this ad set belongs to"),
      status: z.string().optional().default("PAUSED").describe("Initial status: ACTIVE or PAUSED (default PAUSED)"),
      daily_budget: z.number().optional().describe("Daily budget in cents (e.g. 5000 = $50.00). Provide either daily_budget or lifetime_budget."),
      lifetime_budget: z.number().optional().describe("Lifetime budget in cents (e.g. 100000 = $1000.00). Provide either daily_budget or lifetime_budget."),
      bid_amount: z.number().optional().describe("Bid amount in cents"),
      bid_strategy: z.string().optional().describe("Bid strategy: LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP"),
      billing_event: z.string().describe("Billing event: IMPRESSIONS, LINK_CLICKS, POST_ENGAGEMENT, PAGE_LIKES, APP_INSTALLS"),
      optimization_goal: z.string().describe("Optimization goal: LINK_CLICKS, IMPRESSIONS, REACH, LANDING_PAGE_VIEWS, POST_ENGAGEMENT, LEAD_GENERATION, CONVERSIONS"),
      targeting: z.string().describe('JSON string of targeting spec, e.g. {"geo_locations":{"countries":["AU"]},"age_min":18,"age_max":65}'),
      start_time: z.string().optional().describe("Start time in ISO 8601 format, e.g. 2025-01-01T00:00:00+0000"),
      end_time: z.string().optional().describe("End time in ISO 8601 format (required when using lifetime_budget)"),
      promoted_object: z.string().optional().describe('JSON string of promoted object, e.g. {"page_id":"123456"}'),
    },
    async (params) => {
      try {
        let targetingObj: unknown;
        try {
          targetingObj = JSON.parse(params.targeting);
        } catch {
          return { content: [{ type: "text" as const, text: "Invalid JSON in targeting parameter." }], isError: true };
        }

        const body: Record<string, unknown> = {
          name: params.name,
          campaign_id: params.campaign_id,
          status: params.status ?? "PAUSED",
          billing_event: params.billing_event,
          optimization_goal: params.optimization_goal,
          targeting: JSON.stringify(targetingObj),
        };
        if (params.daily_budget !== undefined) body.daily_budget = params.daily_budget;
        if (params.lifetime_budget !== undefined) body.lifetime_budget = params.lifetime_budget;
        if (params.bid_amount !== undefined) body.bid_amount = params.bid_amount;
        if (params.bid_strategy) body.bid_strategy = params.bid_strategy;
        if (params.start_time) body.start_time = params.start_time;
        if (params.end_time) body.end_time = params.end_time;
        if (params.promoted_object) {
          try {
            JSON.parse(params.promoted_object);
            body.promoted_object = params.promoted_object;
          } catch {
            return { content: [{ type: "text" as const, text: "Invalid JSON in promoted_object parameter." }], isError: true };
          }
        }

        const result = await marketingPost(`/act_${params.account_id}/adsets`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 4. Update ad set
  server.tool(
    "update_ad_set",
    "Update an existing ad set's name, status, budget, targeting, or schedule.",
    {
      adset_id: z.string().describe("The ID of the ad set to update"),
      name: z.string().optional().describe("New name for the ad set"),
      status: z.string().optional().describe("New status: ACTIVE, PAUSED, ARCHIVED"),
      daily_budget: z.number().optional().describe("New daily budget in cents"),
      lifetime_budget: z.number().optional().describe("New lifetime budget in cents"),
      bid_amount: z.number().optional().describe("New bid amount in cents"),
      targeting: z.string().optional().describe('JSON string of new targeting spec, e.g. {"geo_locations":{"countries":["AU"]},"age_min":18,"age_max":65}'),
      start_time: z.string().optional().describe("New start time in ISO 8601 format"),
      end_time: z.string().optional().describe("New end time in ISO 8601 format"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.status !== undefined) body.status = params.status;
        if (params.daily_budget !== undefined) body.daily_budget = params.daily_budget;
        if (params.lifetime_budget !== undefined) body.lifetime_budget = params.lifetime_budget;
        if (params.bid_amount !== undefined) body.bid_amount = params.bid_amount;
        if (params.start_time !== undefined) body.start_time = params.start_time;
        if (params.end_time !== undefined) body.end_time = params.end_time;
        if (params.targeting !== undefined) {
          try {
            const targetingObj = JSON.parse(params.targeting);
            body.targeting = JSON.stringify(targetingObj);
          } catch {
            return { content: [{ type: "text" as const, text: "Invalid JSON in targeting parameter." }], isError: true };
          }
        }

        const result = await marketingPost(`/${params.adset_id}`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 5. Delete ad set
  server.tool(
    "delete_ad_set",
    "Delete an ad set. This action cannot be undone.",
    {
      adset_id: z.string().describe("The ID of the ad set to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(`/${params.adset_id}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 6. Duplicate ad set
  server.tool(
    "duplicate_ad_set",
    "Duplicate an ad set, optionally into a different campaign.",
    {
      adset_id: z.string().describe("The ID of the ad set to duplicate"),
      campaign_id: z.string().optional().describe("Target campaign ID for the copy. If omitted, duplicates within the same campaign."),
      deep_copy: z.boolean().optional().default(true).describe("Whether to deep copy the ads within the ad set (default true)"),
      status_option: z.string().optional().describe("Status for the new ad set: ACTIVE, PAUSED, INHERITED_FROM_SOURCE"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          deep_copy: params.deep_copy ?? true,
        };
        if (params.campaign_id) body.campaign_id = params.campaign_id;
        if (params.status_option) body.status_option = params.status_option;

        const result = await marketingPost(`/${params.adset_id}/copies`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );
}
