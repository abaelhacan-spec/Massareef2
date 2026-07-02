import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useDirection } from "@/hooks/useDirection";
import { useLanguage } from "@/lib/useLanguage";

const ONBOARDING_KEY = "onboarding_shown";

export function OnboardingDialog() {
  const [visible, setVisible] = useState(false);
  const colors = useColors();
  const dir = useDirection();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  async function dismiss() {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setVisible(false);
  }

  async function handleSetBudget() {
    await dismiss();
    // Use replace to avoid stacking on top of tabs
    router.replace("/(tabs)/settings");
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {}}
        >
          {/* الشعار */}
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* العنوان */}
          <Text
            style={[
              styles.title,
              { color: colors.foreground, textAlign: dir.textAlign },
            ]}
          >
            {t("onboarding.title")}
          </Text>

          {/* الوصف */}
          <Text
            style={[
              styles.body,
              { color: colors.mutedForeground, textAlign: dir.textAlign },
            ]}
          >
            {t("onboarding.body")}
          </Text>

          {/* الأزرار */}
          <View style={styles.actions}>
            {/* زر أساسي */}
            <Pressable
              style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
              onPress={handleSetBudget}
            >
              <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>
                {t("onboarding.set_budget")}
              </Text>
            </Pressable>

            {/* زر ثانوي */}
            <Pressable
              style={styles.btnSecondary}
              onPress={dismiss}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.mutedForeground }]}>
                {t("onboarding.later")}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 4,
  },
  title: {
    fontSize: 21,
    fontFamily: "Inter_700Bold",
    width: "100%",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    width: "100%",
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: 10,
    marginTop: 10,
  },
  btnPrimary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  btnSecondary: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
