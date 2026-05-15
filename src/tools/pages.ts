import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fbFetch, fbPost, getPageId, getAllPages, marketingFetch } from "../fb-client.js";

export function registerPageTools(server: McpServer): void {
  // 1. get_page
  server.tool(
    "get_page",
    "Get details of a Facebook Page by ID",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => { try { const pid = page_id || getPageId();
        const fields = "id,name,about,category,fan_count,followers_count,link,website,phone,emails,location,hours,cover,picture,description,single_line_address,is_published,verification_status,rating_count,overall_star_rating";
        const result = await fbFetch(`/${pid}?fields=${fields}`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 2. list_user_pages
  server.tool(
    "list_user_pages",
    "List all Facebook Pages managed by this account (returns all cached page tokens with IDs and names)",
    {
      limit: z.number().optional().default(25).describe("Number of results (default 25)"),
      after: z.string().optional().describe("Pagination cursor (after)"),
      before: z.string().optional().describe("Pagination cursor (before)"),
    },
    async (params) => {
      try {
        // First return the locally cached pages (fast, always available)
        const cached = getAllPages().map(p => ({ id: p.id, name: p.name, category: p.category }));
        if (cached.length > 0) {
          return { content: [{ type: "text", text: JSON.stringify({ data: cached, source: "cached_tokens", total: cached.length }, null, 2) }] };
        }
        // Fallback to API
        const qs = new URLSearchParams();
        qs.set("fields", "id,name,category,access_token,tasks");
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.after) qs.set("after", params.after);
        if (params.before) qs.set("before", params.before);
        const result = await marketingFetch(`/me/accounts?${qs}`);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 3. update_page
  server.tool(
    "update_page",
    "Update a Facebook Page's information",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      about: z.string().optional().describe("About text"),
      description: z.string().optional().describe("Page description"),
      website: z.string().optional().describe("Website URL"),
      phone: z.string().optional().describe("Phone number"),
      hours: z.record(z.string()).optional().describe("Business hours object"),
    },
    async ({ page_id, ...fields }) => { try { const pid = page_id || getPageId();
        const body: Record<string, any> = {};
        if (fields.about !== undefined) body.about = fields.about;
        if (fields.description !== undefined) body.description = fields.description;
        if (fields.website !== undefined) body.website = fields.website;
        if (fields.phone !== undefined) body.phone = fields.phone;
        if (fields.hours !== undefined) body.hours = fields.hours;
        const result = await fbPost(`/${pid}`, body, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 4. get_page_settings
  server.tool(
    "get_page_settings",
    "Get settings for a Facebook Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => { try { const pid = page_id || getPageId();
        const result = await fbFetch(`/${pid}/settings`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 5. update_page_settings
  server.tool(
    "update_page_settings",
    "Update a setting for a Facebook Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      setting: z.string().describe("Setting name"),
      value: z.boolean().describe("Setting value"),
    },
    async ({ page_id, setting, value }) => { try { const pid = page_id || getPageId();
        const result = await fbPost(`/${pid}/settings`, { option: { [setting]: value } }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 7. subscribe_app
  server.tool(
    "subscribe_app",
    "Subscribe an app to a Page's webhooks",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
      subscribed_fields: z.array(z.string()).describe("List of fields to subscribe to (e.g., feed, messages)"),
    },
    async ({ page_id, subscribed_fields }) => { try { const pid = page_id || getPageId();
        const result = await fbPost(`/${pid}/subscribed_apps`, { subscribed_fields }, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 8. get_page_tabs
  server.tool(
    "get_page_tabs",
    "Get the tabs on a Facebook Page",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => { try { const pid = page_id || getPageId();
        const result = await fbFetch(`/${pid}/tabs`, {}, pid);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );

  // 9. get_page_instagram_account  ← NEW v2.5.0
  server.tool(
    "get_page_instagram_account",
    "Get the Instagram Business/Creator account connected to a Facebook Page. Returns ig_user_id needed for ALL Instagram tools (list_ig_media, create_ig_media_container, get_ig_insights, etc.). Run this first before any Instagram operation.",
    {
      page_id: z.string().optional().describe("Page name or ID, e.g. \"FinHub Finance\" (defaults to configured page)"),
    },
    async ({ page_id }) => {
      try {
        const pid = page_id || getPageId();
        const result = await fbFetch(`/${pid}?fields=id,name,instagram_business_account`, {}, pid);
        const igAccount = result?.instagram_business_account;
        if (!igAccount) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                page_id: pid,
                instagram_connected: false,
                message: "No Instagram Business account connected to this page. Go to Facebook Business Settings → Instagram Accounts to connect one.",
              }, null, 2),
            }],
          };
        }
        // Fetch IG account details
        const igDetails = await fbFetch(`/${igAccount.id}?fields=id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website`, {}, pid);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              page_id: pid,
              instagram_connected: true,
              ig_user_id: igAccount.id,
              username: igDetails.username,
              name: igDetails.name,
              followers: igDetails.followers_count,
              media_count: igDetails.media_count,
              message: `Use ig_user_id "${igAccount.id}" in all Instagram tools.`,
            }, null, 2),
          }],
        };
      } catch (e: unknown) {
        return { content: [{ type: "text", text: String(e) }], isError: true };
      }
    }
  );
}
