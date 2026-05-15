import express from "express";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { init as fbInit } from "./fb-client.js";

// Core Facebook tools
import { registerPageTools } from "./tools/pages.js";
import { registerPostTools } from "./tools/posts.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerPhotoTools } from "./tools/photos.js";
import { registerVideoTools } from "./tools/videos.js";
import { registerConversationTools } from "./tools/conversations.js";
import { registerInstagramTools } from "./tools/instagram.js";
import { registerReactionTools } from "./tools/reactions.js";
import { registerEventTools } from "./tools/events.js";
import { registerUserTools } from "./tools/user.js";
import { registerRatingTools } from "./tools/ratings.js";
import { registerInsightTools } from "./tools/insights.js";

// WhatsApp tools
import { registerWhatsAppAccountTools } from "./tools/whatsapp-account.js";
import { registerWhatsAppTemplateTools } from "./tools/whatsapp-templates.js";
import { registerWhatsAppMessagingTools } from "./tools/whatsapp-messaging.js";
import { registerWhatsAppMediaTools } from "./tools/whatsapp-media.js";
import { registerWhatsAppAnalyticsTools } from "./tools/whatsapp-analytics.js";

// Ads & Marketing tools
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
import { registerLeadGenTools } from "./tools/leadgen.js";

const VERSION = "3.1.0";

function createServer(): McpServer {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || "";
  fbInit(accessToken);

  const server = new McpServer({
    name: "facebook-whatsapp-mcp",
    version: VERSION,
  });

  // Register all tool groups
  registerPageTools(server);
  registerPostTools(server);
  registerCommentTools(server);
  registerPhotoTools(server);
  registerVideoTools(server);
  registerConversationTools(server);
  registerInstagramTools(server);
  registerReactionTools(server);
  registerEventTools(server);
  registerUserTools(server);
  registerRatingTools(server);
  registerInsightTools(server);

  registerWhatsAppAccountTools(server);
  registerWhatsAppTemplateTools(server);
  registerWhatsAppMessagingTools(server);
  registerWhatsAppMediaTools(server);
  registerWhatsAppAnalyticsTools(server);

  registerAdAccountTools(server);
  registerCampaignTools(server);
  registerAdSetTools(server);
  registerAdTools(server);
  registerAdCreativeTools(server);
  registerAdImageTools(server);
  registerAdVideoTools(server);
  registerAudienceTools(server);
  registerAdInsightTools(server);
  registerAdRuleTools(server);
  registerLeadGenTools(server);

  return server;
}

const MODE = process.env.MCP_MODE || "http";

if (MODE === "stdio") {
  const server = createServer();
  const transport = new StdioServerTransport();
  server.connect(transport).catch(console.error);
} else {
  const app = express();
  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      transport = sessions.get(sessionId)!;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (id) => sessions.set(id, transport),
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      const server = createServer();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  };

  app.get("/mcp", handleSessionRequest);
  app.delete("/mcp", handleSessionRequest);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", version: VERSION, mode: "http" });
  });

  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.listen(PORT, () => {
    console.log(`Facebook+WhatsApp MCP v${VERSION} running on port ${PORT}`);
  });
}
