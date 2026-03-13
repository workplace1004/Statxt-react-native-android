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
import { useAuth } from "../../providers/AuthProvider";
import { AuthStackParamList } from "../../navigation/AuthStack";

function toDisplayText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "$$typeof" in (value as object)) return "";
  return String(value);
}

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await signUp(email.trim(), password, fullName.trim());
    setIsLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up for Statxt</Text>

        {error ? <Text style={styles.error}>{toDisplayText(error)}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#666"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
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
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password-new"
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
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
