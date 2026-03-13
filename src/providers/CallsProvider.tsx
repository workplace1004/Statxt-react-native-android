import React, { createContext, useCallback, useContext, useState } from "react";

export type CallState = "idle" | "connecting" | "active" | "ended";

interface CallsContextValue {
  callState: CallState;
  startCall: (destination?: string) => void;
  endCall: () => void;
}

const CallsContext = createContext<CallsContextValue | null>(null);

export function useCalls() {
  const ctx = useContext(CallsContext);
  if (!ctx) throw new Error("useCalls must be used within CallsProvider");
  return ctx;
}

/**
 * Placeholder for Vonage Client SDK + CallKit/CallKeep integration.
 * startCall/endCall are stubs; wire to real SDK when available.
 */
export function CallsProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>("idle");

  const startCall = useCallback((_destination?: string) => {
    setCallState("connecting");
    setTimeout(() => setCallState("active"), 500);
  }, []);

  const endCall = useCallback(() => {
    setCallState("ended");
    setTimeout(() => setCallState("idle"), 300);
  }, []);

  return (
    <CallsContext.Provider value={{ callState, startCall, endCall }}>
      {children}
    </CallsContext.Provider>
  );
}
