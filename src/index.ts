import express from "express";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { init as fbInit } from "./fb-client.js";
import { registerPageTools } from "./tools/pages.js";
import { registerPostTools } from "./tools/posts.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerPhotoTools } from "./tools/photos.js";
import { registerVideoTools } from "./tools/videos.js";
import { registerInsightTools } from "./tools/insights.js";
import { registerConversationTools } from "./tools/conversations.js";
import { registerInstagramTools } from "./tools/instagram.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerLeadGenTools } from "./tools/leadgen.js";
import { registerEventTools } from "./tools/events.js";
import { registerUserTools } from "./tools/user.js";
import { registerRatingTools } from "./tools/ratings.js";
import { registerAdAccountTools } from "./tools/ad-accounts.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerAdSetTools } from "./tools/ad-sets.js";
import { registerAdTools } from "./tools/ads.js";
import { registerAdCreativeTools } from "./tools/ad-creatives.js";
import { registerAdImageTools } from "./tools/ad-images.js";
import { registerAdVideoTools } from "./tools/ad-videos.js";
import { registerAudienceTools } from "./tools/audiences.js";
import { registerAdInsightTools } from "./tools/ad-insights.js";
import { registerAdRuleTools } from "./tools/ad-rules.js";
import { registerWhatsAppAccountTools } from "./tools/whatsapp-account.js";
import { registerWhatsAppTemplateTools } from "./tools/whatsapp-templates.js";
import { registerWhatsAppMessagingTools } from "./tools/whatsapp-messaging.js";
import { registerWhatsAppMediaTools } from "./tools/whatsapp-media.js";
import { registerWhatsAppAnalyticsTools } from "./tools/whatsapp-analytics.js";

// v2.5.0: 148 tools
// Changes: added get_page_instagram_account (+1), fixed page tokens on 6 tools
const TOOL_COUNT = 148;

// Token status from init - shared with health endpoint
let tokenStatus: { pageId: string; pageName: string; scopes: string[]; pageCount?: number } | null = null;
let initError: string | null = null;

function createServer(): McpServer {
  const server = new McpServer({
    name: "facebook-mcp-server",
    version: "3.0.0",
  });

  registerPageTools(server);           // 9 tools (added get_page_instagram_account)
  registerPostTools(server);           // 10 tools
  registerCommentTools(server);        // 7 tools
  registerPhotoTools(server);          // 5 tools
  registerVideoTools(server);          // 4 tools
  registerInsightTools(server);        // 4 tools
  registerConversationTools(server);   // 5 tools
  registerInstagramTools(server);      // 12 tools
  registerReactionTools(server);       // 3 tools
  registerLeadGenTools(server);        // 4 tools
  registerEventTools(server);          // 4 tools
  registerUserTools(server);           // 3 tools
  registerRatingTools(server);         // 2 tools

  // Marketing API modules
  registerAdAccountTools(server);      // 4 tools
  registerCampaignTools(server);       // 6 tools
  registerAdSetTools(server);          // 6 tools
  registerAdTools(server);             // 6 tools
  registerAdCreativeTools(server);     // 5 tools
  registerAdImageTools(server);        // 4 tools
  registerAdVideoTools(server);        // 3 tools
  registerAudienceTools(server);       // 6 tools
  registerAdInsightTools(server);      // 5 tools
  registerAdRuleTools(server);         // 4 tools

  // WhatsApp Business API modules
  registerWhatsAppAccountTools(server);   // 5 tools
  registerWhatsAppTemplateTools(server);  // 5 tools
  registerWhatsAppMessagingTools(server); // 11 tools
  registerWhatsAppMediaTools(server);     // 3 tools
  registerWhatsAppAnalyticsTools(server); // 2 tools

  return server;
}

async function main() {
  // Initialize token exchange BEFORE starting server
  try {
    const initResult = await fbInit();
    tokenStatus = { pageId: initResult.pageId, pageName: initResult.pageName, scopes: initResult.scopes, pageCount: initResult.pageCount };
    console.log(`[init] ✅ Page: "${tokenStatus.pageName}" (${tokenStatus.pageId})`);
    console.log(`[init] ✅ Scopes: ${tokenStatus.scopes.join(', ')}`);
  } catch (err: any) {
    initError = err.message;
    console.error(`[init] ⚠️  Token exchange failed: ${initError}`);
    console.error('[init] Server will start but page operations may fail.');
  }

  const transport = process.env.TRANSPORT || "http";

  if (transport === "stdio") {
    const server = createServer();
    const t = new StdioServerTransport();
    await server.connect(t);
    console.error("Facebook MCP server running on stdio");
  } else {
    const app = express();
    // CORS middleware for Claude.ai compatibility
    app.use((_req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id");
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
      if (_req.method === "OPTIONS") { res.status(204).end(); return; }
      next();
    });
    app.use(express.json());

    // Store sessions: sessionId → { server, transport }
    const sessions = new Map<string, { server: McpServer; transport: StreamableHTTPServerTransport }>();

    // Health endpoint
    app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        server: "facebook-mcp-server",
        version: "3.0.0",
        tools: TOOL_COUNT,
        activeSessions: sessions.size,
        token: tokenStatus ? {
          pageId: tokenStatus.pageId,
          pageName: tokenStatus.pageName,
          scopes: tokenStatus.scopes,
          pageTokenAcquired: true,
          pageCount: tokenStatus.pageCount || 1,
        } : {
          pageTokenAcquired: false,
          error: initError,
        },
      });
    });

    // MCP endpoint - stateful session handling
    app.post("/mcp", async (req, res) => {
      try {
        const sessionId = req.headers["mcp-session-id"] as string | undefined;

        if (sessionId && sessions.has(sessionId)) {
          const session = sessions.get(sessionId)!;
          await session.transport.handleRequest(req, res, req.body);
          return;
        }

        // New session
        const server = createServer();
        const t = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
        });

        const origSetHeader = res.setHeader.bind(res);
        res.setHeader = function (name: string, value: any) {
          if (name.toLowerCase() === "mcp-session-id" && typeof value === "string") {
            sessions.set(value, { server, transport: t });
            setTimeout(() => sessions.delete(value), 30 * 60 * 1000);
          }
          return origSetHeader(name, value);
        };

        await server.connect(t);
        await t.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });

    app.get("/mcp", async (_req, res) => {
      res.writeHead(405).end(JSON.stringify({ error: "Use POST for MCP requests" }));
    });

    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (sessionId && sessions.has(sessionId)) {
        sessions.delete(sessionId);
        res.status(200).json({ message: "Session terminated" });
      } else {
        res.status(404).json({ error: "Session not found" });
      }
    });

    const PORT = parseInt(process.env.PORT || "8080", 10);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Facebook MCP server listening on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/health`);
      console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`Tools registered: ${TOOL_COUNT}`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
