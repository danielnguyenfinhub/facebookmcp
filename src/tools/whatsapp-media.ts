import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingDelete, USER_TOKEN, BASE_URL } from "../fb-client.js";

const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";

function getPhoneId(id?: string): string { return id || PHONE_ID; }

export function registerWhatsAppMediaTools(server: McpServer): void {
  // 1. wa_upload_media
  server.tool(
    "wa_upload_media",
    "Upload media to WhatsApp for sending in messages. Provide a publicly accessible URL — the server will download and re-upload it to WhatsApp. Supported: image/jpeg, image/png, video/mp4, audio/ogg, audio/mp4, application/pdf, etc.",
    {
      file_url: z.string().describe("Publicly accessible URL of the file to upload"),
      mime_type: z.string().describe("MIME type (e.g. image/jpeg, application/pdf, video/mp4, audio/ogg)"),
      phone_number_id: z.string().optional().describe("Phone Number ID (defaults to env)"),
    },
    async (params) => {
      try {
        const pid = getPhoneId(params.phone_number_id);
        // Download the file from URL
        const fileRes = await fetch(params.file_url);
        if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.status} ${fileRes.statusText}`);
        const fileBlob = await fileRes.blob();

        // Build multipart form
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", params.mime_type);
        formData.append("file", fileBlob, "upload");

        const url = `${BASE_URL}/${pid}/media?access_token=${USER_TOKEN}`;
        const res = await fetch(url, { method: "POST", body: formData });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`WhatsApp Media Upload error ${res.status}: ${text}`);
        }
        const result = await res.json();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. wa_get_media_url
  server.tool(
    "wa_get_media_url",
    "Get the download URL for a WhatsApp media item (URL valid for 5 minutes)",
    {
      media_id: z.string().describe("Media ID from a received message or upload"),
    },
    async (params) => {
      try {
        const result = await marketingFetch(`/${params.media_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. wa_delete_media
  server.tool(
    "wa_delete_media",
    "Delete an uploaded WhatsApp media item",
    {
      media_id: z.string().describe("Media ID to delete"),
    },
    async (params) => {
      try {
        const result = await marketingDelete(`/${params.media_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
