import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingPost, USER_TOKEN, BASE_URL } from "../fb-client.js";

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

function getPhoneId(id?: string): string { return id || PHONE_ID; }

// Helper for PUT requests (mark_as_read) — fb-client doesn't have fbPut
async function waPut(path: string, body: Record<string, unknown>): Promise<any> {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}access_token=${USER_TOKEN}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export function registerWhatsAppMessagingTools(server: McpServer): void {
  // 1. wa_send_text
  server.tool(
    "wa_send_text",
    "Send a text message via WhatsApp",
    {
      to: z.string().describe("Recipient phone number in international format (e.g. 61430111188)"),
      body: z.string().describe("Message text"),
      preview_url: z.boolean().optional().describe("Enable URL preview in message"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const body: Record<string, unknown> = {
          messaging_product: "whatsapp",
          to: params.to,
          type: "text",
          text: { body: params.body, preview_url: params.preview_url || false },
        };
        const result = await marketingPost(`/${pid}/messages`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. wa_send_template
  server.tool(
    "wa_send_template",
    "Send a pre-approved template message via WhatsApp (required to initiate conversations outside 24h window)",
    {
      to: z.string().describe("Recipient phone number in international format"),
      template_name: z.string().describe("Approved template name"),
      language_code: z.string().describe("Template language code (e.g. en_US, en)"),
      components: z.array(z.record(z.unknown())).optional().describe("Template components for variable substitution [{type:header|body, parameters:[{type:text,text:value}]}]"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const template: Record<string, unknown> = {
          name: params.template_name,
          language: { code: params.language_code },
        };
        if (params.components) template.components = params.components;
        const body = {
          messaging_product: "whatsapp",
          to: params.to,
          type: "template",
          template,
        };
        const result = await marketingPost(`/${pid}/messages`, body);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. wa_send_image
  server.tool(
    "wa_send_image",
    "Send an image via WhatsApp (provide link URL or media ID)",
    {
      to: z.string().describe("Recipient phone number"),
      link: z.string().optional().describe("Public image URL (HTTPS)"),
      media_id: z.string().optional().describe("Uploaded media ID"),
      caption: z.string().optional().describe("Image caption"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const image: Record<string, unknown> = {};
        if (params.link) image.link = params.link;
        if (params.media_id) image.id = params.media_id;
        if (params.caption) image.caption = params.caption;
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "image", image,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. wa_send_document
  server.tool(
    "wa_send_document",
    "Send a document via WhatsApp (PDF, DOCX, etc.)",
    {
      to: z.string().describe("Recipient phone number"),
      link: z.string().optional().describe("Public document URL (HTTPS)"),
      media_id: z.string().optional().describe("Uploaded media ID"),
      caption: z.string().optional().describe("Document caption"),
      filename: z.string().optional().describe("Display filename for the document"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const doc: Record<string, unknown> = {};
        if (params.link) doc.link = params.link;
        if (params.media_id) doc.id = params.media_id;
        if (params.caption) doc.caption = params.caption;
        if (params.filename) doc.filename = params.filename;
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "document", document: doc,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. wa_send_video
  server.tool(
    "wa_send_video",
    "Send a video via WhatsApp",
    {
      to: z.string().describe("Recipient phone number"),
      link: z.string().optional().describe("Public video URL (HTTPS)"),
      media_id: z.string().optional().describe("Uploaded media ID"),
      caption: z.string().optional().describe("Video caption"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const video: Record<string, unknown> = {};
        if (params.link) video.link = params.link;
        if (params.media_id) video.id = params.media_id;
        if (params.caption) video.caption = params.caption;
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "video", video,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. wa_send_audio
  server.tool(
    "wa_send_audio",
    "Send an audio message via WhatsApp",
    {
      to: z.string().describe("Recipient phone number"),
      link: z.string().optional().describe("Public audio URL (HTTPS)"),
      media_id: z.string().optional().describe("Uploaded media ID"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const audio: Record<string, unknown> = {};
        if (params.link) audio.link = params.link;
        if (params.media_id) audio.id = params.media_id;
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "audio", audio,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. wa_send_location
  server.tool(
    "wa_send_location",
    "Send a location pin via WhatsApp",
    {
      to: z.string().describe("Recipient phone number"),
      latitude: z.number().describe("Latitude"),
      longitude: z.number().describe("Longitude"),
      name: z.string().optional().describe("Location name"),
      address: z.string().optional().describe("Location address text"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const location: Record<string, unknown> = {
          latitude: params.latitude,
          longitude: params.longitude,
        };
        if (params.name) location.name = params.name;
        if (params.address) location.address = params.address;
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "location", location,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. wa_send_contact
  server.tool(
    "wa_send_contact",
    "Send a contact card via WhatsApp",
    {
      to: z.string().describe("Recipient phone number"),
      contacts: z.array(z.object({
        name: z.object({
          formatted_name: z.string().describe("Full display name"),
          first_name: z.string().optional(),
          last_name: z.string().optional(),
        }),
        phones: z.array(z.object({
          phone: z.string().describe("Phone number"),
          type: z.string().optional().describe("Phone type: CELL, MAIN, HOME, WORK"),
        })).optional(),
        emails: z.array(z.object({
          email: z.string(),
          type: z.string().optional().describe("Email type: HOME, WORK"),
        })).optional(),
      })).describe("Array of contact cards to send"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "contacts", contacts: params.contacts,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 9. wa_send_interactive
  server.tool(
    "wa_send_interactive",
    "Send an interactive message (buttons, lists, or CTA URL) via WhatsApp",
    {
      to: z.string().describe("Recipient phone number"),
      interactive_type: z.enum(["button", "list", "cta_url"]).describe("Interactive message type"),
      body_text: z.string().describe("Message body text"),
      header: z.record(z.unknown()).optional().describe("Header object {type:text|image|video|document, text?:string, image?:{link}, ...}"),
      footer_text: z.string().optional().describe("Footer text"),
      action: z.record(z.unknown()).describe("Action object — buttons:[{type:reply,reply:{id,title}}] for button type, button+sections for list type, {name:cta_url,parameters:{display_text,url}} for cta_url"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const interactive: Record<string, unknown> = {
          type: params.interactive_type,
          body: { text: params.body_text },
          action: params.action,
        };
        if (params.header) interactive.header = params.header;
        if (params.footer_text) interactive.footer = { text: params.footer_text };
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp", to: params.to, type: "interactive", interactive,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 10. wa_send_reaction
  server.tool(
    "wa_send_reaction",
    "React to a WhatsApp message with an emoji (send empty emoji to remove reaction)",
    {
      to: z.string().describe("Recipient phone number"),
      message_id: z.string().describe("Message ID to react to (wamid.xxx)"),
      emoji: z.string().describe("Emoji to react with (e.g. 👍) or empty string to remove"),
      phone_number_id: z.string().optional().describe("Sender Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const result = await marketingPost(`/${pid}/messages`, {
          messaging_product: "whatsapp",
          to: params.to,
          type: "reaction",
          reaction: { message_id: params.message_id, emoji: params.emoji },
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 11. wa_mark_as_read
  server.tool(
    "wa_mark_as_read",
    "Mark a WhatsApp message as read (sends blue ticks to sender)",
    {
      message_id: z.string().describe("Message ID to mark as read (wamid.xxx)"),
      phone_number_id: z.string().optional().describe("Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        const result = await waPut(`/${pid}/messages`, {
          messaging_product: "whatsapp",
          status: "read",
          message_id: params.message_id,
        });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
