import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, USER_TOKEN, BASE_URL } from "../fb-client.js";

// WhatsApp uses the System User token (same as marketing/user token), not page tokens
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "";
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

function getWabaId(id?: string): string { return id || WABA_ID; }
function getPhoneId(id?: string): string { return id || PHONE_ID; }

export function registerWhatsAppAccountTools(server: McpServer): void {
  // 1. wa_get_business_account
  server.tool(
    "wa_get_business_account",
    "Get WhatsApp Business Account details (name, currency, timezone, review status)",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        const fields = "id,name,currency,timezone_id,message_template_namespace,account_review_status";
        const result = await marketingFetch(`/${id}?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. wa_list_phone_numbers
  server.tool(
    "wa_list_phone_numbers",
    "List all phone numbers registered to the WhatsApp Business Account",
    {
      waba_id: z.string().optional().describe("WhatsApp Business Account ID (defaults to env)"),
    },
    async (params) => {
      try {
        const id = getWabaId(params.waba_id);
        const fields = "id,display_phone_number,verified_name,quality_rating,platform_type,throughput,code_verification_status,status";
        const result = await marketingFetch(`/${id}/phone_numbers?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. wa_get_phone_number_details
  server.tool(
    "wa_get_phone_number_details",
    "Get details for a specific WhatsApp phone number (quality, status, throughput)",
    {
      phone_number_id: z.string().optional().describe("Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const fields = "id,display_phone_number,verified_name,quality_rating,platform_type,throughput,code_verification_status,status,name_status";
        const result = await marketingFetch(`/${pid}?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. wa_get_business_profile
  server.tool(
    "wa_get_business_profile",
    "Get the WhatsApp Business Profile (about, address, description, email, websites)",
    {
      phone_number_id: z.string().optional().describe("Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const fields = "about,address,description,email,profile_picture_url,websites,vertical";
        const result = await marketingFetch(`/${pid}/whatsapp_business_profile?fields=${fields}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. wa_update_business_profile
  server.tool(
    "wa_update_business_profile",
    "Update the WhatsApp Business Profile (about, address, description, email, websites, vertical)",
    {
      phone_number_id: z.string().optional().describe("Phone Number ID (defaults to env)"),
      about: z.string().optional().describe("About text (max 139 chars)"),
      address: z.string().optional().describe("Business address"),
      description: z.string().optional().describe("Business description (max 512 chars)"),
      email: z.string().optional().describe("Business email"),
      websites: z.array(z.string()).optional().describe("Business websites (max 2)"),
      vertical: z.string().optional().describe("Business vertical/industry"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const body: Record<string, unknown> = { messaging_product: "whatsapp" };
        if (params.about !== undefined) body.about = params.about;
        if (params.address !== undefined) body.address = params.address;
        if (params.description !== undefined) body.description = params.description;
        if (params.email !== undefined) body.email = params.email;
        if (params.websites !== undefined) body.websites = params.websites;
        if (params.vertical !== undefined) body.vertical = params.vertical;
        const result = await marketingPost(`/${pid}/whatsapp_business_profile`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
