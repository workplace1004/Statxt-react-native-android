import React, { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthProvider";

/**
 * When authenticated and app returns to foreground, invalidates conversation
 * list queries so data is refreshed.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["chat"] });
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [isAuthenticated, queryClient]);

  return <>{children}</>;
}
