import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
    router.push("/(tabs)/settings");
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
          {/* أيقونة */}
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="trending-up" size={32} color={colors.primary} />
          </View>

          {/* العنوان */}
          <Text
            style={[
              styles.title,
              { color: colors.foreground, textAlign: dir.textAlign },
            ]}
          >
            {t("onboarding.title")}
          </Text>

          {/* النص */}
          <Text
            style={[
              styles.body,
              { color: colors.mutedForeground, textAlign: dir.textAlign },
            ]}
          >
            {t("onboarding.body")}
          </Text>

          {/* الأزرار */}
          <View style={[styles.actions, { flexDirection: dir.flexRow }]}>
            {/* زر ثانوي — لاحقاً */}
            <Pressable
              style={[styles.btnSecondary, { borderColor: colors.border }]}
              onPress={dismiss}
            >
              <Text
                style={[
                  styles.btnSecondaryText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t("onboarding.later")}
              </Text>
            </Pressable>

            {/* زر أساسي — تحديد سقف الإنفاق */}
            <Pressable
              style={[
                styles.btnPrimary,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleSetBudget}
            >
              <Text
                style={[
                  styles.btnPrimaryText,
                  { color: colors.primaryForeground },
                ]}
              >
                {t("onboarding.set_budget")}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    width: "100%",
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    width: "100%",
  },
  actions: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  btnSecondaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimaryText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
