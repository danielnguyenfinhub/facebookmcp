import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { marketingFetch, marketingPost, marketingDelete } from "../fb-client.js";

export function registerAdImageTools(server: McpServer): void {
  // 1. List ad images
  server.tool(
    "list_ad_images",
    "List images in an ad account's image library",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      limit: z.number().optional().default(25).describe("Maximum number of images to return (default 25)"),
      after: z.string().optional().describe("Pagination cursor to fetch the next page of results"),
      hashes: z.array(z.string()).optional().describe("Filter by specific image hashes"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams({
          fields: "id,name,hash,url,url_128,created_time,updated_time,status,width,height",
          limit: String(params.limit),
        });
        if (params.after) query.set("after", params.after);
        if (params.hashes && params.hashes.length > 0) {
          query.set("hashes", JSON.stringify(params.hashes));
        }
        const result = await marketingFetch(
          `/act_${params.account_id}/adimages?${query.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. Get ad image by hash
  server.tool(
    "get_ad_image",
    "Get a specific ad image by its hash",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      image_hash: z.string().describe("The hash of the ad image to retrieve"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams({
          hashes: JSON.stringify([params.image_hash]),
          fields: "id,name,hash,url,url_128,created_time,status,width,height",
        });
        const result = await marketingFetch(
          `/act_${params.account_id}/adimages?${query.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. Upload ad image from URL
  server.tool(
    "upload_ad_image",
    "Upload an image to the ad account image library from a public URL",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      image_url: z.string().describe("Public URL of the image to upload"),
    },
    async (params) => {
      try {
        const result = await marketingPost(
          `/act_${params.account_id}/adimages`,
          { url: params.image_url }
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. Delete ad image
  server.tool(
    "delete_ad_image",
    "Delete an image from the ad account image library",
    {
      account_id: z.string().describe("The ad account ID (without act_ prefix)"),
      image_hash: z.string().describe("The hash of the ad image to delete"),
    },
    async (params) => {
      try {
        const query = new URLSearchParams({ hash: params.image_hash });
        const result = await marketingDelete(
          `/act_${params.account_id}/adimages?${query.toString()}`
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
