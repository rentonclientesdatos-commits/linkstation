/**
 * src/lib/integrations/instagram/types.ts
 *
 * TypeScript type definitions for Instagram DM & Lead Ads integration.
 */

// ─── Configuration ────────────────────────────────────────────────────────────

export interface InstagramConfig {
  /** Long-lived Page Access Token (from Meta App / Facebook Page) */
  pageAccessToken: string;
  /** Instagram Business Account ID linked to the Page */
  igAccountId: string;
  /** The Facebook Page ID that owns the IG account */
  pageId?: string;
}

// ─── Incoming DM Event (Messenger API for Instagram) ─────────────────────────

export interface InstagramMessagingEntry {
  id: string; // sender IGSID (Instagram-scoped ID)
  time: number;
  messaging: InstagramMessaging[];
}

export interface InstagramMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: InstagramAttachment[];
    reply_to?: { mid: string };
    is_echo?: boolean;
  };
  postback?: {
    title: string;
    payload: string;
  };
  read?: { watermark: number };
  delivery?: { watermark: number; mids: string[] };
}

export interface InstagramAttachment {
  type: "image" | "video" | "audio" | "file" | "reel" | "ig_reel" | "share" | "story_mention";
  payload: {
    url?: string;
    sticker_id?: number;
  };
}

// ─── Outbound Message ─────────────────────────────────────────────────────────

export interface InstagramSendMessagePayload {
  recipient: { id: string };
  message: {
    text?: string;
    attachment?: {
      type: string;
      payload: Record<string, unknown>;
    };
  };
  messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
  tag?: string;
}

export interface InstagramSendMessageResponse {
  recipient_id: string;
  message_id: string;
}

// ─── Lead Ads ─────────────────────────────────────────────────────────────────

export interface InstagramLeadAdField {
  name: string;
  values: string[];
}

export interface InstagramLeadAdData {
  id: string;
  form_id: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  created_time: string;
  field_data: InstagramLeadAdField[];
}

export interface InstagramLeadWebhookEntry {
  id: string; // Page ID
  time: number;
  changes: {
    field: "leadgen";
    value: {
      leadgen_id: string;
      page_id: string;
      form_id: string;
      ad_id?: string;
      ad_name?: string;
      adset_id?: string;
      adset_name?: string;
      campaign_id?: string;
      campaign_name?: string;
      created_time: number;
    };
  }[];
}

// ─── Instagram Configuration stored in tenant config ─────────────────────────

export interface InstagramTenantConfig {
  pageAccessToken: string;
  igAccountId: string;
  pageId: string;
  webhookVerifyToken?: string;
  aiEnabled?: boolean;
  leadAdsEnabled?: boolean;
  connectedAt?: string;
}
