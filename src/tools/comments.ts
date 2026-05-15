import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, fbDelete, getPageId } from "../fb-client.js";

export function registerCommentTools(server: McpServer): void {
  // 1. list_comments
  server.tool(
    "list_comments",
    "List comments on a post or object",
    {
      object_id: z.string().describe("The object ID (post, photo, video, etc.)"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "id,message,from,created_time,like_count,comment_count");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.object_id}/comments?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. create_comment  — FIXED v2.5.0: now uses page token
  server.tool(
    "create_comment",
    "Create a comment on a post or object as the Page",
    {
      object_id: z.string().describe("The object ID to comment on (post ID, photo ID, etc.)"),
      message: z.string().describe("Comment text"),
      page_id: z.string().optional().describe("Page ID to comment as (defaults to configured page)"),
    },
    async ({ object_id, message, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${object_id}/comments`, { message }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_comment
  server.tool(
    "get_comment",
    "Get a specific comment by ID",
    {
      comment_id: z.string().describe("The Comment ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ comment_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${comment_id}?fields=id,message,from,created_time,like_count,comment_count,parent`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. update_comment  — FIXED v2.5.0: now uses page token
  server.tool(
    "update_comment",
    "Update an existing comment's message",
    {
      comment_id: z.string().describe("The Comment ID"),
      message: z.string().describe("New comment text"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ comment_id, message, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${comment_id}`, { message }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. delete_comment
  server.tool(
    "delete_comment",
    "Delete a comment",
    {
      comment_id: z.string().describe("The Comment ID"),
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

  // 6. hide_comment  — FIXED v2.5.0: now uses page token
  server.tool(
    "hide_comment",
    "Hide a comment (makes it invisible to everyone except the commenter)",
    {
      comment_id: z.string().describe("The Comment ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ comment_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${comment_id}`, { is_hidden: true }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. list_comment_replies
  server.tool(
    "list_comment_replies",
    "List replies to a comment",
    {
      comment_id: z.string().describe("The parent Comment ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "id,message,from,created_time,like_count,comment_count");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.comment_id}/comments?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
