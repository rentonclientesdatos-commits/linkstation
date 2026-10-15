import { getAdminSupabaseClient } from "@/lib/supabase/server";

/**
 * CHAT MEMORY SERVICE (DB-backed, resilient)
 * Replaces the brittle Redis implementation with a direct Supabase query.
 * Reads the last N messages from chat_messages for context.
 *
 * DI: usa getAdminSupabaseClient centralizado (Sprint 1 tarea 2-02.b),
 * mockable a nivel de modulo en tests.
 */

const MAX_LINES = 10;

export class ChatMemoryService {
  /**
   * Retrieves the last MAX_LINES messages for context window.
   * Reads directly from chat_messages — no Redis dependency.
   */
  static async getRecentContext(leadId: string): Promise<Array<{ role: string; content: string }>> {
    try {
      const supabase = await getAdminSupabaseClient();
       
      const { data, error } = await supabase
        .from("chat_messages")
        .select("direction, content")
        .eq("lead_id", leadId)
        .in("message_type", ["TEXT", "TEMPLATE", "DOCUMENT"])
        .order("created_at", { ascending: false })
        .limit(MAX_LINES);

      if (error || !data) return [];

      // Reverse so it's chronological (oldest first)
      return (data as Array<{ direction: string; content: string }>).reverse().map((m) => ({
        role: m.direction === "INBOUND" ? "user" : "assistant",
        content: m.content,
      }));
    } catch (err) {
      console.error("[CHAT_MEMORY] Failed to fetch context:", err);
      return [];
    }
  }

  /**
   * No-op — memory is stored in chat_messages automatically by the processor.
   */

  static async addMessage(_leadId: string, _role: "user" | "assistant", _content: string) {
    // Messages are persisted in chat_messages by WhatsAppAIProcessor itself.
    // This method is kept for interface compatibility.
  }

  /**
   * No-op — clearing memory in DB-backed mode would mean deleting messages,
   * which is handled separately by the inbox delete flow.
   */

  static async clearMemory(_leadId: string) {
    // No-op
  }
}
