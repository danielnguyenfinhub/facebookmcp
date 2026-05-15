import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost } from "../fb-client.js";

export function registerAdVideoTools(server: McpServer): void {
  server.tool(
    "list_ad_videos",
    "List videos in an ad account",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Maximum number of videos to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
    },
    async (params) => {
      try {
        const queryParams = new URLSearchParams({
          fields: "id,title,description,source,picture,created_time,updated_time,length,status",
          limit: String(params.limit),
        });
        if (params.after) {
          queryParams.set("after", params.after);
        }
        const result = await marketingFetch(
          `/act_${params.account_id}/advideos?${queryParams.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  server.tool(
    "get_ad_video",
    "Get details of a specific ad video",
    {
      video_id: z.string().describe("The ID of the video to retrieve"),
    },
    async (params) => {
      try {
        const queryParams = new URLSearchParams({
          fields: "id,title,description,source,picture,created_time,updated_time,length,status,thumbnails",
        });
        const result = await marketingFetch(
          `${params.video_id}?${queryParams.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  server.tool(
    "upload_ad_video",
    "Upload a video to the ad account from a public URL",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      file_url: z.string().describe("Public URL of the video file"),
      title: z.string().optional().describe("Title for the video"),
      description: z.string().optional().describe("Description for the video"),
    },
    async (params) => {
      try {
        const body: Record<string, string> = {
          file_url: params.file_url,
        };
        if (params.title) {
          body.title = params.title;
        }
        if (params.description) {
          body.description = params.description;
        }
        const result = await marketingPost(
          `/act_${params.account_id}/advideos`,
          body
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
