import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, getPageId } from "../fb-client.js";

const EVENT_FIELDS = "id,name,description,start_time,end_time,place,cover,attending_count,interested_count";

export function registerEventTools(server: McpServer): void {
  // 1. list_page_events
  server.tool(
    "list_page_events",
    "List events for a Page",
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
        qs.set("fields", EVENT_FIELDS);
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await fbFetch(`/${pid}/events?${qs}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. create_event
  server.tool(
    "create_event",
    "Create an event on a Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      name: z.string().describe("Event name"),
      description: z.string().optional().describe("Event description"),
      start_time: z.string().describe("Start time (ISO 8601 format)"),
      end_time: z.string().optional().describe("End time (ISO 8601 format)"),
      place: z.string().optional().describe("Event location/place name"),
    },
    async ({ page_id, ...body }) => { try { const pid = page_id || getPageId();
        const payload: Record<string, any> = { name: body.name, start_time: body.start_time };
        if (body.description !== undefined) payload.description = body.description;
        if (body.end_time !== undefined) payload.end_time = body.end_time;
        if (body.place !== undefined) payload.place = body.place;
        const result = await fbPost(`/${pid}/events`, payload, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. get_event
  server.tool(
    "get_event",
    "Get details of a specific event",
    {
      event_id: z.string().describe("The Event ID"),
    },
    async ({ event_id }) => {
      try {
        const result = await fbFetch(`/${event_id}?fields=${EVENT_FIELDS}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. update_event
  server.tool(
    "update_event",
    "Update an existing event",
    {
      event_id: z.string().describe("The Event ID"),
      name: z.string().optional().describe("New event name"),
      description: z.string().optional().describe("New event description"),
      start_time: z.string().optional().describe("New start time (ISO 8601)"),
      end_time: z.string().optional().describe("New end time (ISO 8601)"),
      place: z.string().optional().describe("New location/place name"),
    },
    async ({ event_id, ...fields }) => {
      try {
        const payload: Record<string, any> = {};
        if (fields.name !== undefined) payload.name = fields.name;
        if (fields.description !== undefined) payload.description = fields.description;
        if (fields.start_time !== undefined) payload.start_time = fields.start_time;
        if (fields.end_time !== undefined) payload.end_time = fields.end_time;
        if (fields.place !== undefined) payload.place = fields.place;
        const result = await fbPost(`/${event_id}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
