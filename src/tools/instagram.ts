import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, fbDelete, getPageId } from "../fb-client.js";

export function registerInstagramTools(server: McpServer): void {
  // 1. get_ig_user
  server.tool(
    "get_ig_user",
    "Get an Instagram Business/Creator account profile. Use get_page_instagram_account first to obtain the ig_user_id.",
    {
      ig_user_id: z.string().describe("The Instagram User ID (get from get_page_instagram_account tool)"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ ig_user_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${ig_user_id}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_ig_media
  server.tool(
    "list_ig_media",
    "List media posts for an Instagram account. Use get_page_instagram_account first to obtain the ig_user_id.",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.ig_user_id}/media?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_ig_media
  server.tool(
    "get_ig_media",
    "Get details of a specific Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ media_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${media_id}?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,children`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. create_ig_media_container  — FIXED v2.5.0: uses page token
  server.tool(
    "create_ig_media_container",
    "Create an Instagram media container (step 1 of publishing). Use publish_ig_media to publish it. Requires page_id of the Facebook Page connected to the Instagram account.",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      page_id: z.string().optional().describe("Page ID connected to this Instagram account (defaults to configured page)"),
      image_url: z.string().optional().describe("Public URL of the image (for IMAGE type)"),
      video_url: z.string().optional().describe("Public URL of the video (for VIDEO/REELS type)"),
      caption: z.string().optional().describe("Post caption"),
      media_type: z.enum(["IMAGE", "VIDEO", "REELS", "CAROUSEL_ALBUM"]).optional().describe("Media type"),
    },
    async ({ ig_user_id, page_id, image_url, video_url, caption, media_type }) => {
      try {
        const pid = page_id || getPageId();
        const payload: Record<string, any> = {};
        if (image_url !== undefined) payload.image_url = image_url;
        if (video_url !== undefined) payload.video_url = video_url;
        if (caption !== undefined) payload.caption = caption;
        if (media_type !== undefined) payload.media_type = media_type;
        const result = await fbPost(`/${ig_user_id}/media`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. publish_ig_media  — FIXED v2.5.0: uses page token
  server.tool(
    "publish_ig_media",
    "Publish a previously created Instagram media container (step 2 of publishing). Requires page_id of the Facebook Page connected to the Instagram account.",
    {
      ig_user_id: z.string().describe("The Instagram User ID"),
      creation_id: z.string().describe("The media container ID from create_ig_media_container"),
      page_id: z.string().optional().describe("Page ID connected to this Instagram account (defaults to configured page)"),
    },
    async ({ ig_user_id, creation_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${ig_user_id}/media_publish`, { creation_id }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. list_ig_comments
  server.tool(
    "list_ig_comments",
    "List comments on an Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "id,text,username,timestamp,like_count,replies");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.media_id}/comments?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. create_ig_comment  — FIXED v2.5.0: uses page token
  server.tool(
    "create_ig_comment",
    "Create a comment on an Instagram media post",
    {
      media_id: z.string().describe("The Instagram Media ID"),
      message: z.string().describe("Comment text"),
      page_id: z.string().optional().describe("Page ID connected to this Instagram account (defaults to configured page)"),
    },
    async ({ media_id, message, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${media_id}/comments`, { message }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. delete_ig_comment
  server.tool(
    "delete_ig_comment",
    "Delete an Instagram comment",
    {
      comment_id: z.string().describe("The Instagram Comment ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ comment_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbDelete(`/${comment_id}`, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 12. ig_business_discovery  — FIXED v2.5.0: removed unused qs variable, proper URL encoding
  server.tool(
    "ig_business_discovery",
    "Look up another Instagram Business/Creator account's public profile and recent media",
    {
      ig_user_id: z.string().describe("Your Instagram User ID (get from get_page_instagram_account)"),
      username: z.string().describe("The target account's username to look up (without @)"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ ig_user_id, username, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const fields = "business_discovery.fields(id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url,media.limit(10){id,caption,media_type,permalink,timestamp,like_count,comments_count})";
        const result = await fbFetch(
          `/${ig_user_id}?fields=${encodeURIComponent(fields)}&username=${encodeURIComponent(username)}`,
          {},
          pid
        );
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
