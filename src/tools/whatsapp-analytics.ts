import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch } from "../fb-client.js";

const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";

function getWabaId(id?: string): string { return id || WABA_ID; }

export function registerWhatsAppAnalyticsTools(server: McpServer): void {
  // 1. wa_get_analytics
  server.tool(
    "wa_get_analytics",
    "Get WhatsApp message analytics (sent, delivered, read counts) for a date range",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
      start: z.number().describe("Start timestamp (Unix seconds)"),
      end: z.number().describe("End timestamp (Unix seconds)"),
      granularity: z.enum(["DAY", "MONTH"]).optional().default("DAY").describe("Data granularity (DAY or MONTH)"),
      phone_numbers: z.array(z.string()).optional().describe("Filter by phone number IDs (empty = all)"),
      country_codes: z.array(z.string()).optional().describe("Filter by country codes e.g. ['AU','US']"),
      message_types: z.array(z.string()).optional().describe("Filter by message types"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        // Build the analytics field filter string
        let analyticsField = `analytics.start(${params.start}).end(${params.end}).granularity(${params.granularity || "DAY"})`;
        if (params.phone_numbers?.length) analyticsField += `.phone_numbers([${params.phone_numbers.join(",")}])`;
        if (params.country_codes?.length) analyticsField += `.country_codes([${params.country_codes.join(",")}])`;
        if (params.message_types?.length) analyticsField += `.message_types([${params.message_types.join(",")}])`;
        const result = await marketingFetch(`/${id}?fields=${analyticsField}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. wa_get_conversation_analytics
  server.tool(
    "wa_get_conversation_analytics",
    "Get WhatsApp conversation-based analytics (billable conversations by type and direction)",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
      start: z.number().describe("Start timestamp (Unix seconds)"),
      end: z.number().describe("End timestamp (Unix seconds)"),
      granularity: z.enum(["DAY", "MONTH"]).optional().default("DAY").describe("Data granularity"),
      phone_numbers: z.array(z.string()).optional().describe("Filter by phone number IDs"),
      conversation_types: z.array(z.string()).optional().describe("Filter: FREE_TIER, FREE_ENTRY_POINT, REGULAR"),
      conversation_directions: z.array(z.string()).optional().describe("Filter: BUSINESS_INITIATED, USER_INITIATED"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        let field = `conversation_analytics.start(${params.start}).end(${params.end}).granularity(${params.granularity || "DAY"})`;
        if (params.phone_numbers?.length) field += `.phone_numbers([${params.phone_numbers.join(",")}])`;
        if (params.conversation_types?.length) field += `.conversation_types([${params.conversation_types.join(",")}])`;
        if (params.conversation_directions?.length) field += `.conversation_directions([${params.conversation_directions.join(",")}])`;
        const result = await marketingFetch(`/${id}?fields=${field}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
