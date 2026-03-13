import "react-native-gesture-handler";
import "expo-dev-client";
import { registerRootComponent } from "expo";
import React from "react";
import App from "./src/App";
import { ErrorBoundary } from "./src/components/ErrorBoundary";

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

registerRootComponent(Root);
