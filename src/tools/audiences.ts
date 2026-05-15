import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

const AUDIENCE_FIELDS = "id,name,description,subtype,approximate_count,data_source,delivery_status,operation_status,permission_for_actions,time_created,time_updated";
const AUDIENCE_DETAIL_FIELDS = `${AUDIENCE_FIELDS},rule,lookalike_spec`;

export function registerAudienceTools(server: McpServer): void {
  // 1. List custom audiences
  server.tool(
    "list_custom_audiences",
    "List custom audiences in an ad account",
    {
      account_id: z.string().describe("Ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Number of audiences to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams({
          fields: AUDIENCE_FIELDS,
          limit: String(params.limit),
        });
        if (params.after) qs.set("after", params.after);
        const result = await marketingFetch(`/act_${params.account_id}/customaudiences?${qs.toString()}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get custom audience details
  server.tool(
    "get_custom_audience",
    "Get details of a custom audience",
    {
      audience_id: z.string().describe("The custom audience ID"),
    },
    async (params) => {
      try {
        const qs = new URLSearchParams({ fields: AUDIENCE_DETAIL_FIELDS });
        const result = await marketingFetch(`/${params.audience_id}?${qs.toString()}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create custom audience
  server.tool(
    "create_custom_audience",
    "Create a custom audience",
    {
      account_id: z.string().describe("Ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the custom audience"),
      description: z.string().optional().describe("Description of the custom audience"),
      subtype: z.string().describe("Audience subtype: CUSTOM, WEBSITE, APP, OFFLINE_CONVERSION, CLAIM, PARTNER, MANAGED, VIDEO, LOOKALIKE, ENGAGEMENT"),
      customer_file_source: z.string().optional().describe("Source of customer data: USER_PROVIDED_ONLY, PARTNER_PROVIDED_ONLY, BOTH_USER_AND_PARTNER_PROVIDED"),
      rule: z.string().optional().describe("JSON string defining the audience rule for website/app audiences"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          name: params.name,
          subtype: params.subtype,
        };
        if (params.description) body.description = params.description;
        if (params.customer_file_source) body.customer_file_source = params.customer_file_source;
        if (params.rule) {
          try {
            body.rule = JSON.parse(params.rule);
          } catch {
            return { content: [{ type: "text", text: "Invalid JSON in 'rule' parameter" }], isError: true };
          }
        }
        const result = await marketingPost(`/act_${params.account_id}/customaudiences`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. Update custom audience
  server.tool(
    "update_custom_audience",
    "Update a custom audience",
    {
      audience_id: z.string().describe("The custom audience ID to update"),
      name: z.string().optional().describe("New name for the custom audience"),
      description: z.string().optional().describe("New description for the custom audience"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {};
        if (params.name) body.name = params.name;
        if (params.description) body.description = params.description;
        const result = await marketingPost(`/${params.audience_id}`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. Delete custom audience
  server.tool(
    "delete_custom_audience",
    "Delete a custom audience",
    {
      audience_id: z.string().describe("The custom audience ID to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(`/${params.audience_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. Create lookalike audience
  server.tool(
    "create_lookalike_audience",
    "Create a lookalike audience from a source audience",
    {
      account_id: z.string().describe("Ad account ID (without act_ prefix)"),
      name: z.string().describe("Name for the lookalike audience"),
      origin_audience_id: z.string().describe("Source custom audience ID"),
      lookalike_spec: z.string().describe('JSON string, e.g. {"type":"similarity","starting_ratio":0,"ratio":0.01,"country":"AU"}'),
    },
    async (params) => {
      try {
        let parsedSpec: unknown;
        try {
          parsedSpec = JSON.parse(params.lookalike_spec);
        } catch {
          return { content: [{ type: "text", text: "Invalid JSON in 'lookalike_spec' parameter" }], isError: true };
        }
        const body = {
          name: params.name,
          subtype: "LOOKALIKE",
          origin_audience_id: params.origin_audience_id,
          lookalike_spec: parsedSpec,
        };
        const result = await marketingPost(`/act_${params.account_id}/customaudiences`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
