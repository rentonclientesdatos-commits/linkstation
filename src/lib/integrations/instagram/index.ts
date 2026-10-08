/**
 * src/lib/integrations/instagram/index.ts
 *
 * Central re-export for all Instagram integration modules.
 * Supports:
 *   - Instagram DM automation (Messenger API for Instagram)
 *   - Instagram Lead Ads (webhook + lead retrieval)
 */

export * from "./client";
export { instagramClient } from "./client";
export * from "./types";
