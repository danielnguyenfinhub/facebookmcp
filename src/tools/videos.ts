import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, getPageId } from "../fb-client.js";

export function registerVideoTools(server: McpServer): void {
  // 1. list_page_videos
  server.tool(
    "list_page_videos",
    "List videos on a Page",
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
        qs.set("fields", "id,title,description,source,created_time,length,views,likes.summary(true)");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/videos?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_video
  server.tool(
    "get_video",
    "Get details of a specific video",
    {
      video_id: z.string().describe("The Video ID"),
    },
    async ({ video_id }) => {
      try {
        const result = await fbFetch(`/${video_id}?fields=id,title,description,source,created_time,length,views,embed_html,permalink_url`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. create_video_post
  server.tool(
    "create_video_post",
    "Create a video post on a Page from a URL",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      file_url: z.string().describe("Public URL of the video file"),
      title: z.string().optional().describe("Video title"),
      description: z.string().optional().describe("Video description"),
    },
    async ({ page_id, file_url, title, description }) => { try { const pid = page_id || getPageId();
        const payload: Record<string, any> = { file_url };
        if (title !== undefined) payload.title = title;
        if (description !== undefined) payload.description = description;
        const result = await fbPost(`/${pid}/videos`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
