import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

function getWabaId(id?: string): string { return id || WABA_ID; }

export function registerWhatsAppTemplateTools(server: McpServer): void {
  // 1. wa_list_templates
  server.tool(
    "wa_list_templates",
    "List all message templates for the WhatsApp Business Account",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
      status: z.enum(["APPROVED", "PENDING", "REJECTED"]).optional().describe("Filter by template status"),
      limit: z.number().optional().default(100).describe("Max results (default 100)"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        const qs = new URLSearchParams();
        qs.set("fields", "id,name,status,category,language,components,quality_score");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.status) qs.set("status", params.status);
        if (params.after) qs.set("after", params.after);
        const result = await marketingFetch(`/${id}/message_templates?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. wa_get_template
  server.tool(
    "wa_get_template",
    "Get a specific message template by ID",
    {
      template_id: z.string().describe("Message template ID"),
    },
    async (params) => {
      try {
        const fields = "id,name,status,category,language,components,quality_score";
        const result = await marketingFetch(`/${params.template_id}?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. wa_create_template
  server.tool(
    "wa_create_template",
    "Create a new message template (requires approval before use). Components array defines HEADER, BODY, FOOTER, BUTTONS.",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
      name: z.string().describe("Template name (lowercase, underscores, no spaces)"),
      language: z.string().describe("Language code e.g. en_US, en, pt_BR"),
      category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).describe("Template category"),
      components: z.array(z.record(z.unknown())).describe("Template components array [{type:HEADER|BODY|FOOTER|BUTTONS, ...}]"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        const body = {
          name: params.name,
          language: params.language,
          category: params.category,
          components: params.components,
        };
        const result = await marketingPost(`/${id}/message_templates`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. wa_edit_template
  server.tool(
    "wa_edit_template",
    "Edit an existing message template's components (only APPROVED or REJECTED templates can be edited)",
    {
      template_id: z.string().describe("Message template ID to edit"),
      components: z.array(z.record(z.unknown())).describe("Updated components array"),
    },
    async (params) => {
      try {
        const result = await marketingPost(`/${params.template_id}`, { components: params.components });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. wa_delete_template
  server.tool(
    "wa_delete_template",
    "Delete a message template by name (deletes ALL languages for that template name)",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
      name: z.string().describe("Template name to delete"),
      hsm_id: z.string().optional().describe("Template ID for targeted deletion of specific language"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        const qs = new URLSearchParams();
        qs.set("name", params.name);
        if (params.hsm_id) qs.set("hsm_id", params.hsm_id);
        const result = await marketingDelete(`/${id}/message_templates?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
