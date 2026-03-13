import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { supabase } from "../../lib/supabase";
import { AuthStackParamList } from "../../navigation/AuthStack";

function toDisplayText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "$$typeof" in (value as object)) return "";
  return String(value);
}

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    setError("");
    setIsLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: "statxt://reset-password",
    });
    setIsLoading(false);
    if (err) setError(err.message);
    else setSuccess(true);
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>We sent a password reset link to {email}</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>Enter your email and we'll send you a reset link</Text>

        {error ? <Text style={styles.error}>{toDisplayText(error)}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 32 },
  error: { color: "#ff4444", textAlign: "center", marginBottom: 16 },
  input: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 16,
    color: "#fff",
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#10B981",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#10B981", fontSize: 14 },
});
