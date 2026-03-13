import React, { createContext, useContext } from "react";
import type { NavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./RootNavigator";

const RootNavigationRefContext = createContext<React.RefObject<
  NavigationContainerRef<RootStackParamList> | null
> | null>(null);

export function useRootNavigationRef() {
  const ref = useContext(RootNavigationRefContext);
  return ref;
}

export function RootNavigationRefProvider({
  navigationRef,
  children,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<RootStackParamList> | null>;
  children: React.ReactNode;
}) {
  return (
    <RootNavigationRefContext.Provider value={navigationRef}>
      {children}
    </RootNavigationRefContext.Provider>
  );
}
