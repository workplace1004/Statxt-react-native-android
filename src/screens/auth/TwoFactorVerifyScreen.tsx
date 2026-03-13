import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { send2faOtp, verify2faOtp } from "../../lib/api";
import { spacing, typography, radius } from "../../theme/tokens";

function toDisplayText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return String(value);
}

export function TwoFactorVerifyScreen() {
  const { session, complete2faVerification } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const token = session?.access_token ?? "";

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    (async () => {
      setSending(true);
      try {
        await send2faOtp(token);
      } catch (e) {
        if (mounted) setError("Could not send code. Try again.");
      } finally {
        if (mounted) setSending(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the code from your app");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await verify2faOtp(token, trimmed);
      complete2faVerification();
    } catch {
      setError("Invalid code. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSending(true);
    try {
      await send2faOtp(token);
    } catch {
      setError("Could not send code.");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Two-factor verification</Text>
        <Text style={styles.subtitle}>
          Enter the code from your authenticator app
        </Text>

        {error ? <Text style={styles.error}>{toDisplayText(error)}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Code"
          placeholderTextColor="#666"
          value={code}
          onChangeText={(t) => { setCode(t); setError(""); }}
          keyboardType="number-pad"
          maxLength={8}
          editable={!isLoading}
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={handleResend}
          disabled={sending}
        >
          <Text style={styles.linkText}>
            {sending ? "Sending…" : "Resend code"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    ...typography.displayMd,
    color: "#fff",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: "#666",
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: radius.sm,
    padding: spacing.lg,
    color: "#fff",
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: "#10B981",
    borderRadius: radius.sm,
    padding: spacing.lg,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", ...typography.titleSm },
  link: { marginTop: spacing.xl, alignItems: "center" },
  linkText: { color: "#10B981", fontSize: 14 },
});
