import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

export function registerAdTools(server: McpServer): void {
  // 1. List ads
  server.tool(
    "list_ads",
    "List ads in an ad account, campaign, or ad set. Provide one of account_id, adset_id, or campaign_id.",
    {
      account_id: z.string().optional().describe("Ad account ID (without act_ prefix). Provide one of account_id, adset_id, or campaign_id."),
      adset_id: z.string().optional().describe("Ad set ID to list ads for"),
      campaign_id: z.string().optional().describe("Campaign ID to list ads for"),
      limit: z.number().optional().default(25).describe("Maximum number of ads to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
      effective_status: z.array(z.string()).optional().describe("Filter by effective status, e.g. ['ACTIVE','PAUSED']"),
    },
    async (params) => {
      try {
        let endpoint: string;
        if (params.adset_id) {
          endpoint = `/${params.adset_id}/ads`;
        } else if (params.campaign_id) {
          endpoint = `/${params.campaign_id}/ads`;
        } else if (params.account_id) {
          endpoint = `/act_${params.account_id}/ads`;
        } else {
          return { content: [{ type: "text" as const, text: "Error: Provide one of account_id, adset_id, or campaign_id" }], isError: true };
        }

        const queryParams = new URLSearchParams();
        queryParams.set("fields", "id,name,adset_id,campaign_id,status,effective_status,creative,created_time,updated_time,tracking_specs,conversion_specs");
        queryParams.set("limit", String(params.limit ?? 25));
        if (params.after) queryParams.set("after", params.after);
        if (params.effective_status && params.effective_status.length > 0) {
          queryParams.set("effective_status", JSON.stringify(params.effective_status));
        }

        const result = await marketingFetch(`${endpoint}?${queryParams.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get ad details
  server.tool(
    "get_ad",
    "Get details of a specific ad by its ID",
    {
      ad_id: z.string().describe("The ID of the ad to retrieve"),
    },
    async (params) => {
      try {
        const fields = "id,name,adset_id,campaign_id,status,effective_status,creative,created_time,updated_time,tracking_specs,conversion_specs,bid_amount,source_ad_id";
        const result = await marketingFetch(`/${params.ad_id}?fields=${fields}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create ad
  server.tool(
    "create_ad",
    "Create a new ad in the specified ad account",
    {
      account_id: z.string().describe("Ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the ad"),
      adset_id: z.string().describe("ID of the ad set this ad belongs to"),
      creative_id: z.string().describe("ID of the ad creative to use"),
      status: z.string().optional().default("PAUSED").describe("Initial status of the ad: ACTIVE or PAUSED (default PAUSED)"),
      tracking_specs: z.string().optional().describe("JSON string of tracking specs"),
      conversion_domain: z.string().optional().describe("Conversion domain for the ad"),
    },
    async (params) => {
      try {
        const body: Record<string, string> = {
          name: params.name,
          adset_id: params.adset_id,
          creative: JSON.stringify({ creative_id: params.creative_id }),
          status: params.status ?? "PAUSED",
        };
        if (params.tracking_specs) body.tracking_specs = params.tracking_specs;
        if (params.conversion_domain) body.conversion_domain = params.conversion_domain;

        const result = await marketingPost(`/act_${params.account_id}/ads`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 4. Update ad
  server.tool(
    "update_ad",
    "Update an existing ad's properties",
    {
      ad_id: z.string().describe("The ID of the ad to update"),
      name: z.string().optional().describe("New name for the ad"),
      status: z.string().optional().describe("New status: ACTIVE, PAUSED, DELETED, ARCHIVED"),
      creative_id: z.string().optional().describe("New creative ID to use for the ad"),
      bid_amount: z.number().optional().describe("Bid amount in cents for the ad"),
    },
    async (params) => {
      try {
        const body: Record<string, string | number> = {};
        if (params.name) body.name = params.name;
        if (params.status) body.status = params.status;
        if (params.creative_id) body.creative = JSON.stringify({ creative_id: params.creative_id });
        if (params.bid_amount !== undefined) body.bid_amount = params.bid_amount;

        const result = await marketingPost(`/${params.ad_id}`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 5. Delete ad
  server.tool(
    "delete_ad",
    "Delete an ad by its ID",
    {
      ad_id: z.string().describe("The ID of the ad to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(`/${params.ad_id}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 6. Get ad preview
  server.tool(
    "get_ad_preview",
    "Generate a preview of an ad in a specified format",
    {
      ad_id: z.string().describe("The ID of the ad to preview"),
      ad_format: z.string().describe("Preview format: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, RIGHT_COLUMN_STANDARD, INSTAGRAM_STANDARD, INSTAGRAM_STORY, AUDIENCE_NETWORK_OUTSTREAM_VIDEO"),
    },
    async (params) => {
      try {
        const result = await marketingFetch(`/${params.ad_id}/previews?ad_format=${encodeURIComponent(params.ad_format)}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );
}
