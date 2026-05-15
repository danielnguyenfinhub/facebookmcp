import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

export function registerCampaignTools(server: McpServer): void {
  // 1. List campaigns
  server.tool(
    "list_campaigns",
    "List campaigns in an ad account with optional filtering by status",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Number of campaigns to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
      effective_status: z
        .array(z.string())
        .optional()
        .describe("Filter by status: ACTIVE, PAUSED, DELETED, ARCHIVED"),
      date_preset: z.string().optional().describe("Date preset for time-based filtering, e.g. today, yesterday, last_7d, last_30d"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams();
        query.set(
          "fields",
          "id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time,bid_strategy,special_ad_categories"
        );
        query.set("limit", String(params.limit));
        if (params.after) query.set("after", params.after);
        if (params.effective_status && params.effective_status.length > 0) {
          query.set("effective_status", JSON.stringify(params.effective_status));
        }
        if (params.date_preset) query.set("date_preset", params.date_preset);

        const result = await marketingFetch(`/act_${params.account_id}/campaigns?${query.toString()}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get campaign details
  server.tool(
    "get_campaign",
    "Get details of a specific campaign by its ID",
    {
      campaign_id: z.string().describe("The campaign ID"),
    },
    async (params) => {
      try {
        const fields =
          "id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time,updated_time,bid_strategy,special_ad_categories,spend_cap,budget_rebalance_flag";
        const result = await marketingFetch(`/${params.campaign_id}?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create campaign
  server.tool(
    "create_campaign",
    "Create a new campaign in an ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the campaign"),
      objective: z
        .string()
        .describe(
          "Campaign objective: OUTCOME_AWARENESS, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_TRAFFIC, OUTCOME_APP_PROMOTION"
        ),
      status: z
        .string()
        .optional()
        .default("PAUSED")
        .describe("Initial campaign status: ACTIVE or PAUSED (default PAUSED)"),
      special_ad_categories: z
        .array(z.string())
        .optional()
        .describe(
          "Special ad categories: NONE, EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS"
        ),
      daily_budget: z.number().optional().describe("Daily budget in cents (e.g. 1000 = $10.00)"),
      lifetime_budget: z.number().optional().describe("Lifetime budget in cents (e.g. 5000 = $50.00)"),
      bid_strategy: z
        .string()
        .optional()
        .describe("Bid strategy: LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP"),
      buying_type: z.string().optional().describe("Buying type: AUCTION or RESERVED"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          name: params.name,
          objective: params.objective,
          status: params.status,
        };
        if (params.special_ad_categories) {
          body.special_ad_categories = params.special_ad_categories;
        }
        if (params.daily_budget !== undefined) body.daily_budget = params.daily_budget;
        if (params.lifetime_budget !== undefined) body.lifetime_budget = params.lifetime_budget;
        if (params.bid_strategy) body.bid_strategy = params.bid_strategy;
        if (params.buying_type) body.buying_type = params.buying_type;

        const result = await marketingPost(`/act_${params.account_id}/campaigns`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. Update campaign
  server.tool(
    "update_campaign",
    "Update an existing campaign's settings",
    {
      campaign_id: z.string().describe("The campaign ID to update"),
      name: z.string().optional().describe("New campaign name"),
      status: z.string().optional().describe("New status: ACTIVE, PAUSED, DELETED, ARCHIVED"),
      daily_budget: z.number().optional().describe("New daily budget in cents"),
      lifetime_budget: z.number().optional().describe("New lifetime budget in cents"),
      bid_strategy: z
        .string()
        .optional()
        .describe("New bid strategy: LOWEST_COST_WITHOUT_CAP, LOWEST_COST_WITH_BID_CAP, COST_CAP"),
      spend_cap: z.number().optional().describe("Spend cap for the campaign in cents"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.status !== undefined) body.status = params.status;
        if (params.daily_budget !== undefined) body.daily_budget = params.daily_budget;
        if (params.lifetime_budget !== undefined) body.lifetime_budget = params.lifetime_budget;
        if (params.bid_strategy !== undefined) body.bid_strategy = params.bid_strategy;
        if (params.spend_cap !== undefined) body.spend_cap = params.spend_cap;

        const result = await marketingPost(`/${params.campaign_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. Delete campaign
  server.tool(
    "delete_campaign",
    "Delete a campaign by its ID",
    {
      campaign_id: z.string().describe("The campaign ID to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(`/${params.campaign_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. Duplicate campaign
  server.tool(
    "duplicate_campaign",
    "Duplicate an existing campaign, optionally including its ad sets and ads",
    {
      campaign_id: z.string().describe("The campaign ID to duplicate"),
      deep_copy: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, also copies ad sets and ads (default true)"),
      status_option: z
        .string()
        .optional()
        .describe("Status for the duplicated campaign: PAUSED or ACTIVE"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          deep_copy: params.deep_copy,
        };
        if (params.status_option) body.status_option = params.status_option;

        const result = await marketingPost(`/${params.campaign_id}/copies`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
