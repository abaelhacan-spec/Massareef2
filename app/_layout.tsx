import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as LocalAuthentication from "expo-local-authentication";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getAppLockEnabled, initDB } from "@/lib/database";
import { initNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [authState, setAuthState] = useState<"loading" | "authenticated" | "locked">("loading");

  useEffect(() => {
    initDB().catch(() => {});
    initNotifications().catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      checkAuth();
    }
  }, [fontsLoaded, fontError]);

  async function checkAuth() {
    try {
      const lockEnabled = await getAppLockEnabled();
      if (!lockEnabled) {
        setAuthState("authenticated");
        return;
      }
      await authenticate();
    } catch {
      setAuthState("authenticated");
    }
  }

  async function authenticate() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // هاتف بدون بصمة → نطلب كلمة مرور/PIN الجهاز
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "أدخل كلمة مرور جهازك للمتابعة",
          cancelLabel: "إلغاء",
          disableDeviceFallback: false,
        });
        if (result.success) {
          setAuthState("authenticated");
        } else {
          setAuthState("locked");
        }
        return;
      }

      // هاتف ببصمة → نطلب البصمة مع إمكانية الرجوع لكلمة المرور
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "أدخل بصمتك للمتابعة",
        fallbackLabel: "استخدم كلمة المرور",
        cancelLabel: "إلغاء",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setAuthState("authenticated");
      } else {
        setAuthState("locked");
      }
    } catch {
      setAuthState("authenticated");
    }
  }

  if (!fontsLoaded && !fontError) return null;

  if (authState === "loading") {
    return (
      <View style={styles.lockScreen}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (authState === "locked") {
    return (
      <View style={styles.lockScreen}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.lockTitle}>التطبيق مقفل</Text>
        <Text style={styles.lockSubtitle}>يرجى المصادقة للمتابعة</Text>
        <TouchableOpacity style={styles.lockBtn} onPress={authenticate}>
          <Text style={styles.lockBtnText}>إعادة المحاولة</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor: "#0B1120",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  lockIcon: {
    fontSize: 64,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  lockBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "#7C3AED",
    borderRadius: 12,
  },
  lockBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
});
