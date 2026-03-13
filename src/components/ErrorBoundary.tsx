import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.message}>{this.state.error.message}</Text>
            {this.state.error.stack ? (
              <Text style={styles.stack}>{this.state.error.stack}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginBottom: 16,
  },
  scroll: { flex: 1 },
  message: { fontSize: 14, color: "#F8FAFC", marginBottom: 12 },
  stack: { fontSize: 11, color: "#94A3B8", fontFamily: "monospace" },
});
