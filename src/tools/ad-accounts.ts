import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost } from "../fb-client.js";

export function registerAdAccountTools(server: McpServer): void {
  // 1. List ad accounts for the authenticated user
  server.tool(
    "list_ad_accounts",
    "List ad accounts for the authenticated user, including account status, currency, timezone, spend info, and business details.",
    {
      limit: z.number().optional().default(25).describe("Maximum number of ad accounts to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor: return results after this cursor"),
      before: z.string().optional().describe("Pagination cursor: return results before this cursor"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams({
          fields: "id,name,account_id,account_status,currency,timezone_name,business,amount_spent,balance,spend_cap,business_name,funding_source_details",
          limit: String(params.limit),
        });
        if (params.after) query.set("after", params.after);
        if (params.before) query.set("before", params.before);

        const result = await marketingFetch(`/me/adaccounts?${query.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get details of a specific ad account
  server.tool(
    "get_ad_account",
    "Get detailed information about a specific ad account, including owner, funding source, creation time, and associated agencies.",
    {
      account_id: z.string().describe("Ad account ID without the act_ prefix"),
    },
    async (params) => {
      try {
        const fields = "id,name,account_id,account_status,currency,timezone_name,business,amount_spent,balance,spend_cap,business_name,age,created_time,end_advertiser,media_agency,partner,funding_source_details,is_personal,owner";
        const result = await marketingFetch(`/act_${params.account_id}?fields=${encodeURIComponent(fields)}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 3. Update ad account settings
  server.tool(
    "update_ad_account",
    "Update settings of an ad account such as name, spend cap, or timezone.",
    {
      account_id: z.string().describe("Ad account ID without the act_ prefix"),
      name: z.string().optional().describe("New name for the ad account"),
      spend_cap: z.number().optional().describe("Spend cap for the account in the account currency's smallest unit (e.g. cents for USD)"),
      timezone_id: z.number().optional().describe("Timezone ID for the ad account (see Facebook timezone IDs reference)"),
    },
    async (params) => {
      try {
        const body: Record<string, string | number> = {};
        if (params.name !== undefined) body.name = params.name;
        if (params.spend_cap !== undefined) body.spend_cap = params.spend_cap;
        if (params.timezone_id !== undefined) body.timezone_id = params.timezone_id;

        const result = await marketingPost(`/act_${params.account_id}`, body);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );

  // 4. List users with access to an ad account
  server.tool(
    "list_ad_account_users",
    "List all users who have access to a specific ad account, including their roles and email addresses.",
    {
      account_id: z.string().describe("Ad account ID without the act_ prefix"),
      limit: z.number().optional().default(25).describe("Maximum number of users to return (default 25)"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams({
          fields: "id,name,role,email",
          limit: String(params.limit),
        });

        const result = await marketingFetch(`/act_${params.account_id}/users?${query.toString()}`);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text" as const, text: String(e) }], isError: true };
      }
    }
  );
}
