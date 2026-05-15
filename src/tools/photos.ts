import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, fbDelete, getPageId } from "../fb-client.js";

export function registerPhotoTools(server: McpServer): void {
  // 1. list_page_photos
  server.tool(
    "list_page_photos",
    "List photos uploaded to a Page",
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
        qs.set("fields", "id,name,source,link,created_time,album");
        qs.set("type", "uploaded");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/photos?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_photo
  server.tool(
    "get_photo",
    "Get details of a specific photo",
    {
      photo_id: z.string().describe("The Photo ID"),
    },
    async ({ photo_id }) => {
      try {
        const result = await fbFetch(`/${photo_id}?fields=id,name,source,link,created_time,album,images,width,height`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. upload_photo
  server.tool(
    "upload_photo",
    "Upload a photo to a Page from a URL",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      url: z.string().describe("Public URL of the photo"),
      caption: z.string().optional().describe("Photo caption"),
    },
    async ({ page_id, url, caption }) => { try { const pid = page_id || getPageId();
        const payload: Record<string, any> = { url };
        if (caption !== undefined) payload.caption = caption;
        const result = await fbPost(`/${pid}/photos`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. delete_photo
  server.tool(
    "delete_photo",
    "Delete a photo",
    {
      photo_id: z.string().describe("The Photo ID"),
    },
    async ({ photo_id }) => {
      try {
        const result = await fbDelete(`/${photo_id}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. list_albums
  server.tool(
    "list_albums",
    "List photo albums on a Page",
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
        qs.set("fields", "id,name,count,cover_photo,created_time,description,type");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/albums?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
