import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

export function registerAdRuleTools(server: McpServer): void {
  // 1. List automated rules in an ad account
  server.tool(
    "list_ad_rules",
    "List automated rules in an ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Maximum number of rules to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
    },
    async (params) => {
      try {
        const queryParams = new URLSearchParams({
          fields: "id,name,status,evaluation_spec,execution_spec,schedule_spec,created_time,updated_time",
          limit: String(params.limit),
        });
        if (params.after) {
          queryParams.set("after", params.after);
        }
        const result = await marketingFetch(
          `/act_${params.account_id}/adrules_library?${queryParams.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get details of a specific ad rule
  server.tool(
    "get_ad_rule",
    "Get details of a specific ad rule",
    {
      rule_id: z.string().describe("The ID of the ad rule to retrieve"),
    },
    async (params) => {
      try {
        const queryParams = new URLSearchParams({
          fields: "id,name,status,evaluation_spec,execution_spec,schedule_spec,created_time,updated_time,entity_type",
        });
        const result = await marketingFetch(
          `${params.rule_id}?${queryParams.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. Create an automated ad rule
  server.tool(
    "create_ad_rule",
    "Create an automated ad rule in an ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      name: z.string().describe("Name of the automated rule"),
      evaluation_spec: z
        .string()
        .describe(
          'JSON string defining when the rule triggers. Example: {"evaluation_type":"TRIGGER","filters":[{"field":"spent","value":1000,"operator":"GREATER_THAN"}]}'
        ),
      execution_spec: z
        .string()
        .describe(
          'JSON string defining what happens when the rule triggers. Example: {"execution_type":"PAUSE"}'
        ),
      schedule_spec: z
        .string()
        .optional()
        .describe(
          'JSON string for the rule schedule. Example: {"schedule_type":"DAILY"}'
        ),
      entity_type: z
        .string()
        .optional()
        .describe("The entity type the rule applies to: CAMPAIGN, ADSET, or AD"),
    },
    async (params) => {
      try {
        const body: Record<string, unknown> = {
          name: params.name,
          evaluation_spec: JSON.parse(params.evaluation_spec),
          execution_spec: JSON.parse(params.execution_spec),
        };
        if (params.schedule_spec) {
          body.schedule_spec = JSON.parse(params.schedule_spec);
        }
        if (params.entity_type) {
          body.entity_type = params.entity_type;
        }
        const result = await marketingPost(
          `/act_${params.account_id}/adrules_library`,
          body
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. Delete an ad rule
  server.tool(
    "delete_ad_rule",
    "Delete an ad rule",
    {
      rule_id: z.string().describe("The ID of the ad rule to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(params.rule_id);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
