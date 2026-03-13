import { useEffect, useRef } from "react";
import { useAuth } from "../providers/AuthProvider";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute (same as web)

/**
 * Sends presence heartbeats so the user's last_activity_at is stored in the users table.
 * Updates users.last_activity_at so member list can show online / away / offline badges.
 * 1) Tries POST /api/team-chat/presence/heartbeat (same as web).
 * 2) Also updates users.last_activity_at directly via Supabase so mobile presence is
 *    saved even if the API uses cookie-based auth and rejects the Bearer token.
 * Call when the user is viewing a team chat thread (e.g. from TeamChatThreadScreen).
 */
export function usePresenceHeartbeat(active: boolean) {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id || !active) return;

    const sendHeartbeat = async () => {
      const now = new Date().toISOString();

      await supabase
        .from("users")
        .update({ last_activity_at: now })
        .eq("id", user.id);

      api.post("/api/team-chat/presence/heartbeat").catch(() => {
        // Ignore API errors (e.g. cookie-based auth, network off)
      });
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, active]);

  return null;
}
