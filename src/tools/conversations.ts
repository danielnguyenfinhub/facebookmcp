import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, getPageId } from "../fb-client.js";

export function registerConversationTools(server: McpServer): void {
  // 1. list_conversations
  server.tool(
    "list_conversations",
    "List conversations (Messenger threads) for a Page",
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
        qs.set("fields", "id,link,message_count,unread_count,updated_time,participants");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/conversations?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. get_conversation
  server.tool(
    "get_conversation",
    "Get details of a specific conversation",
    {
      conversation_id: z.string().describe("The Conversation ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ conversation_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${conversation_id}?fields=id,link,message_count,unread_count,updated_time,participants`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. list_messages
  server.tool(
    "list_messages",
    "List messages in a conversation",
    {
      conversation_id: z.string().describe("The Conversation ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        const pid = params.page_id || getPageId();
        const qs = new URLSearchParams();
        qs.set("fields", "id,message,from,to,created_time,attachments");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${params.conversation_id}/messages?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. get_message
  server.tool(
    "get_message",
    "Get a specific message by ID",
    {
      message_id: z.string().describe("The Message ID"),
      page_id: z.string().optional().describe("Page ID to use page token (defaults to configured page)"),
    },
    async ({ message_id, page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${message_id}?fields=id,message,from,to,created_time,attachments`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. send_message  — FIXED v2.5.0: page_id was previously ignored
  server.tool(
    "send_message",
    "Send a message to a user via Messenger (Page must have messaging permissions)",
    {
      page_id: z.string().optional().describe("Page ID to send from (defaults to configured page)"),
      recipient_id: z.string().describe("The recipient's user ID"),
      text: z.string().describe("Message text to send"),
    },
    async ({ page_id, recipient_id, text }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbPost(`/${pid}/messages`, {
          recipient: { id: recipient_id },
          message: { text },
        }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
