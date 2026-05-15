import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, getPageId } from "../fb-client.js";

export function registerLeadGenTools(server: McpServer): void {
  // 1. list_leadgen_forms
  server.tool(
    "list_leadgen_forms",
    "List lead generation forms for a Page",
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
        qs.set("fields", "id,name,status,created_time,leads_count");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/leadgen_forms?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_leadgen_form
  server.tool(
    "get_leadgen_form",
    "Get details of a specific lead generation form",
    {
      form_id: z.string().describe("The Lead Gen Form ID"),
    },
    async ({ form_id }) => {
      try {
        const result = await fbFetch(`/${form_id}?fields=id,name,status,created_time,leads_count,questions`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_leads
  server.tool(
    "get_leads",
    "Get leads submitted to a lead generation form",
    {
      form_id: z.string().describe("The Lead Gen Form ID"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {

        const qs = new URLSearchParams();
        qs.set("fields", "id,created_time,field_data");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.form_id}/leads?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. get_lead
  server.tool(
    "get_lead",
    "Get a specific lead by ID",
    {
      lead_id: z.string().describe("The Lead ID"),
    },
    async ({ lead_id }) => {
      try {
        const result = await fbFetch(`/${lead_id}?fields=id,created_time,field_data`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
