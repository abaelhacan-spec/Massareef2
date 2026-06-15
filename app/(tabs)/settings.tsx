import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type SettingItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  comingSoon?: boolean;
};

type SettingSection = {
  title: string;
  items: SettingItem[];
};

const SECTIONS: SettingSection[] = [
  {
    title: "الميزانية",
    items: [
      { icon: "calendar", label: "سقف الإنفاق اليومي", value: "1,000 دج", comingSoon: true },
      { icon: "pie-chart", label: "سقف الإنفاق الشهري", value: "30,000 دج", comingSoon: true },
      { icon: "rotate-cw", label: "يوم بداية الدورة", value: "6", comingSoon: true },
    ],
  },
  {
    title: "العملة واللغة",
    items: [
      { icon: "dollar-sign", label: "العملة", value: "دج (DZD)", comingSoon: true },
      { icon: "globe", label: "اللغة", value: "العربية", comingSoon: true },
    ],
  },
  {
    title: "الإشعارات",
    items: [
      { icon: "bell", label: "وقت التذكير اليومي", value: "21:00", comingSoon: true },
    ],
  },
  {
    title: "البيانات",
    items: [
      { icon: "upload", label: "نسخ احتياطي", comingSoon: true },
      { icon: "download", label: "استعادة من نسخة احتياطية", comingSoon: true },
    ],
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: "flex-end",
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "right",
    },
    headerSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
    scroll: { flex: 1 },
    content: {
      padding: 16,
      paddingBottom: (Platform.OS === "web" ? 84 : 80) + insets.bottom,
    },
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      textAlign: "right",
      marginBottom: 8,
      marginTop: 18,
      marginRight: 4,
    },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    rowBorder: {
      borderTopWidth: 1,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      textAlign: "right",
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    rowValue: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    soonBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    soonText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
    },
    footer: {
      alignItems: "center",
      marginTop: 28,
      gap: 4,
    },
    footerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    footerVersion: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
    },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>الإعدادات</Text>
        <Text style={s.headerSubtitle}>تخصيص مصاريف</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
            <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    s.row,
                    idx > 0 && [s.rowBorder, { borderTopColor: colors.border }],
                  ]}
                  activeOpacity={item.comingSoon ? 1 : 0.6}
                  disabled={item.comingSoon}
                >
                  <View style={s.rowRight}>
                    {item.comingSoon ? (
                      <View style={[s.soonBadge, { backgroundColor: colors.secondary }]}>
                        <Text style={[s.soonText, { color: colors.mutedForeground }]}>قريباً</Text>
                      </View>
                    ) : (
                      <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
                    )}
                    {item.value && (
                      <Text style={[s.rowValue, { color: colors.mutedForeground }]}>{item.value}</Text>
                    )}
                  </View>

                  <View style={s.rowLeft}>
                    <Text style={[s.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                      <Feather name={item.icon} size={16} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>مصاريف</Text>
          <Text style={[s.footerVersion, { color: colors.mutedForeground }]}>الإصدار 1.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}
