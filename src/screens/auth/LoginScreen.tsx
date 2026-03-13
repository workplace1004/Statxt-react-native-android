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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setIsLoading(true);
    const result = await signIn(email.trim(), password);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requires2fa) {
      navigation.navigate("TwoFactorVerify");
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    const result = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requires2fa) {
      navigation.navigate("TwoFactorVerify");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "android" ? "height" : "padding"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.title}>Statxt</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

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

        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            autoComplete="password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={12}
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
          onPress={handleGoogleSignIn}
          disabled={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#fff" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05080f" },
  content: { flex: 1, justifyContent: "center", padding: 24 },
  logoContainer: { alignItems: "center", marginBottom: 16 },
  logo: { width: 80, height: 80 },
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
  passwordWrap: {
    position: "relative",
    marginBottom: 16,
  },
  passwordInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 16,
    paddingRight: 48,
    color: "#fff",
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
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
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  orLine: { flex: 1, height: 1, backgroundColor: "#333" },
  orText: { color: "#666", paddingHorizontal: 12, fontSize: 14 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    padding: 16,
  },
  googleIcon: { marginRight: 10 },
  googleButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#10B981", fontSize: 14 },
});
