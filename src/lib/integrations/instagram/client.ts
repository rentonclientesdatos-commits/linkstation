/**
 * src/lib/integrations/instagram/client.ts
 *
 * Instagram Messaging Client — Messenger API for Instagram (Meta Graph API v20.0)
 *
 * Responsibilities:
 *   - Send DM text replies to Instagram users
 *   - Send typing indicators
 *   - Mark messages as seen
 *   - Retrieve Lead Ad data from Meta Graph API
 *   - Get Instagram user profile info
 */

import axios from "axios";
import type {
  InstagramConfig,
  InstagramSendMessagePayload,
  InstagramSendMessageResponse,
  InstagramLeadAdData,
} from "./types";

const META_GRAPH_URL = "https://graph.facebook.com/v20.0";

class InstagramClient {
  /**
   * Send a text DM reply to an Instagram user.
   * Uses the Messenger API for Instagram (same as FB Messenger but with IG scope).
   */
  async sendTextMessage(
    recipientIgsid: string,
    text: string,
    config: InstagramConfig
  ): Promise<InstagramSendMessageResponse> {
    const payload: InstagramSendMessagePayload = {
      recipient: { id: recipientIgsid },
      message: { text },
      messaging_type: "RESPONSE",
    };

    const response = await axios.post<InstagramSendMessageResponse>(
      `${META_GRAPH_URL}/me/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${config.pageAccessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      `[INSTAGRAM CLIENT] ✅ Message sent to ${recipientIgsid}: ${response.data.message_id}`
    );
    return response.data;
  }

  /**
   * Send a typing indicator (sender_action: typing_on).
   */
  async sendTypingIndicator(recipientIgsid: string, config: InstagramConfig): Promise<void> {
    try {
      await axios.post(
        `${META_GRAPH_URL}/me/messages`,
        {
          recipient: { id: recipientIgsid },
          sender_action: "typing_on",
        },
        {
          headers: {
            Authorization: `Bearer ${config.pageAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch {
      // Non-critical — ignore typing failures
    }
  }

  /**
   * Mark a message as seen.
   */
  async markSeen(recipientIgsid: string, config: InstagramConfig): Promise<void> {
    try {
      await axios.post(
        `${META_GRAPH_URL}/me/messages`,
        {
          recipient: { id: recipientIgsid },
          sender_action: "mark_seen",
        },
        {
          headers: {
            Authorization: `Bearer ${config.pageAccessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch {
      // Non-critical
    }
  }

  /**
   * Retrieve Lead Ad data by leadgen_id from Meta Graph API.
   */
  async getLeadAdData(leadgenId: string, pageAccessToken: string): Promise<InstagramLeadAdData> {
    const response = await axios.get<InstagramLeadAdData>(`${META_GRAPH_URL}/${leadgenId}`, {
      params: {
        access_token: pageAccessToken,
        fields:
          "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data",
      },
    });
    return response.data;
  }

  /**
   * Get Instagram user profile (name, profile pic) via IGSID.
   */
  async getUserProfile(
    igsid: string,
    config: InstagramConfig
  ): Promise<{ name?: string; profile_pic?: string; username?: string } | null> {
    try {
      const response = await axios.get(`${META_GRAPH_URL}/${igsid}`, {
        params: {
          access_token: config.pageAccessToken,
          fields: "name,profile_pic,username",
        },
      });
      return response.data;
    } catch (err) {
      console.warn("[INSTAGRAM CLIENT] Could not fetch user profile:", err);
      return null;
    }
  }

  /**
   * Get Instagram Account info (to validate the token and get igAccountId).
   */
  async getAccountInfo(
    pageAccessToken: string
  ): Promise<{ id: string; name: string; instagram_business_account?: { id: string } } | null> {
    try {
      const response = await axios.get(`${META_GRAPH_URL}/me`, {
        params: {
          access_token: pageAccessToken,
          fields: "id,name,instagram_business_account",
        },
      });
      return response.data;
    } catch (err) {
      console.warn("[INSTAGRAM CLIENT] Could not fetch account info:", err);
      return null;
    }
  }
}

export const instagramClient = new InstagramClient();
export { InstagramClient };
