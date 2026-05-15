import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost } from "../fb-client.js";

export function registerAdCreativeTools(server: McpServer): void {
  // 1. List ad creatives in an ad account
  server.tool(
    "list_ad_creatives",
    "List ad creatives in a Facebook ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Number of results to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
    },
    async (params) => {
      try {
        const fields = "id,name,title,body,image_url,image_hash,thumbnail_url,object_story_spec,url_tags,call_to_action_type,link_url,status,effective_object_story_id";
        const queryParams: Record<string, string> = {
          fields,
          limit: String(params.limit),
        };
        if (params.after) {
          queryParams.after = params.after;
        }
        const qs = new URLSearchParams(queryParams).toString();
        const result = await marketingFetch(`/act_${params.account_id}/adcreatives?${qs}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get details of a specific ad creative
  server.tool(
    "get_ad_creative",
    "Get details of a specific ad creative by ID",
    {
      creative_id: z.string().describe("The ad creative ID"),
    },
    async (params) => {
      try {
        const fields = "id,name,title,body,image_url,image_hash,thumbnail_url,object_story_spec,url_tags,call_to_action_type,link_url,status,effective_object_story_id,object_type,asset_feed_spec";
        const result = await marketingFetch(`/${params.creative_id}?fields=${fields}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create a new ad creative
  server.tool(
    "create_ad_creative",
    "Create a new ad creative in a Facebook ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the ad creative"),
      object_story_spec: z.string().describe(
        'JSON string of the ad creative spec. Example for link ad: {"page_id":"PAGE_ID","link_data":{"link":"https://example.com","message":"Check this out!","name":"Ad Title","description":"Ad description","image_hash":"IMAGE_HASH","call_to_action":{"type":"LEARN_MORE"}}}'
      ),
      url_tags: z.string().optional().describe("URL tags for tracking"),
      asset_feed_spec: z.string().optional().describe("JSON string for dynamic creative asset feed"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          name: params.name,
          object_story_spec: JSON.parse(params.object_story_spec),
        };
        if (params.url_tags) {
          body.url_tags = params.url_tags;
        }
        if (params.asset_feed_spec) {
          body.asset_feed_spec = JSON.parse(params.asset_feed_spec);
        }
        const result = await marketingPost(`/act_${params.account_id}/adcreatives`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 4. Update an ad creative
  server.tool(
    "update_ad_creative",
    "Update an existing ad creative",
    {
      creative_id: z.string().describe("The ad creative ID to update"),
      name: z.string().optional().describe("New name for the ad creative"),
      url_tags: z.string().optional().describe("Updated URL tags for tracking"),
      status: z.string().optional().describe("New status for the ad creative (e.g. ACTIVE, PAUSED)"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name) body.name = params.name;
        if (params.url_tags) body.url_tags = params.url_tags;
        if (params.status) body.status = params.status;
        const result = await marketingPost(`/${params.creative_id}`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 5. Preview an ad creative
  server.tool(
    "preview_ad_creative",
    "Generate a preview of an ad creative in a specific format",
    {
      creative_id: z.string().describe("The ad creative ID to preview"),
      ad_format: z.string().describe("Preview format: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, RIGHT_COLUMN_STANDARD, INSTAGRAM_STANDARD, INSTAGRAM_STORY"),
    },
    async (params) => {
      try {
        const result = await marketingFetch(`/${params.creative_id}/previews?ad_format=${encodeURIComponent(params.ad_format)}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );
}
