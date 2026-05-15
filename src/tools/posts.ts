import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, fbDelete, getPageId } from "../fb-client.js";

// Removed likes.summary(true) and comments.summary(true) — deprecated aggregated
// sub-fields on /feed and /published_posts endpoints since Graph API v3.3+
const POST_FIELDS = "id,message,created_time,permalink_url,full_picture,shares,status_type";

export function registerPostTools(server: McpServer): void {
  // 1. list_page_posts
  server.tool(
    "list_page_posts",
    "List posts from a Page's feed (includes visitor posts)",
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
        qs.set("fields", POST_FIELDS);
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/posts?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_published_posts
  server.tool(
    "list_published_posts",
    "List only published posts by the Page",
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
        qs.set("fields", POST_FIELDS);
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/published_posts?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. list_scheduled_posts
  server.tool(
    "list_scheduled_posts",
    "List scheduled (unpublished) posts for a Page",
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
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/scheduled_posts?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. create_post
  server.tool(
    "create_post",
    "Create a new post on a Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      message: z.string().optional().describe("Post message text"),
      link: z.string().optional().describe("URL to share"),
      published: z.boolean().optional().describe("Whether to publish immediately (default true)"),
      scheduled_publish_time: z.number().optional().describe("Unix timestamp for scheduled publish"),
    },
    async ({ page_id, ...body }) => { try { const pid = page_id || getPageId();
        const payload: Record<string, any> = {};
        if (body.message !== undefined) payload.message = body.message;
        if (body.link !== undefined) payload.link = body.link;
        if (body.published !== undefined) payload.published = body.published;
        if (body.scheduled_publish_time !== undefined) payload.scheduled_publish_time = body.scheduled_publish_time;
        const result = await fbPost(`/${pid}/feed`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. create_photo_post
  server.tool(
    "create_photo_post",
    "Create a photo post on a Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      url: z.string().describe("Public URL of the photo"),
      caption: z.string().optional().describe("Photo caption"),
      published: z.boolean().optional().describe("Whether to publish immediately (default true)"),
    },
    async ({ page_id, ...body }) => { try { const pid = page_id || getPageId();
        const payload: Record<string, any> = { url: body.url };
        if (body.caption !== undefined) payload.caption = body.caption;
        if (body.published !== undefined) payload.published = body.published;
        const result = await fbPost(`/${pid}/photos`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 6. get_post
  server.tool(
    "get_post",
    "Get a specific post by ID",
    {
      post_id: z.string().describe("The Post ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ post_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${post_id}?fields=${POST_FIELDS}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. update_post  — FIXED v2.5.0: now uses page token
  server.tool(
    "update_post",
    "Update an existing post's message",
    {
      post_id: z.string().describe("The Post ID"),
      message: z.string().describe("New message text"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ post_id, message, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${post_id}`, { message }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. delete_post  — FIXED v2.5.0: now uses page token
  server.tool(
    "delete_post",
    "Delete a post",
    {
      post_id: z.string().describe("The Post ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ post_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbDelete(`/${post_id}`, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 9. list_visitor_posts
  server.tool(
    "list_visitor_posts",
    "List posts by visitors on a Page",
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
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/visitor_posts?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 10. list_tagged_posts
  server.tool(
    "list_tagged_posts",
    "List posts the Page is tagged in",
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
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/tagged?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
