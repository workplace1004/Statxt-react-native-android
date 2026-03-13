import { useCallback, useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";

SplashScreen.preventAutoHideAsync();

interface UseFontsResult {
  fontsLoaded: boolean;
  onLayoutRootView: () => Promise<void>;
}

export function useFonts(): UseFontsResult {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          ...(Ionicons.font ?? {}),
        });
      } catch (e) {
        console.warn("[Fonts] Load failed, using system fonts:", e);
      } finally {
        if (!cancelled) setFontsLoaded(true);
      }
    })();

    // Fallback: if fonts don't resolve in 5s, continue so app doesn't stay on black screen
    timeoutId = setTimeout(() => {
      if (!cancelled) setFontsLoaded(true);
    }, 5000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) await SplashScreen.hideAsync();
  }, [fontsLoaded]);

  return { fontsLoaded, onLayoutRootView };
}
