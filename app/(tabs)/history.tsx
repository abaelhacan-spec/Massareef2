import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { type Cycle, getAllCycles } from "@/lib/database";
import { TOTAL_BUDGET, formatDateAr } from "@/lib/budget";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cycles, setCycles] = useState<(Cycle & { total_spent: number })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCycles = useCallback(async () => {
    const data = await getAllCycles();
    setCycles(data);
  }, []);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCycles();
    setRefreshing(false);
  }, [loadCycles]);

  function formatAmount(n: number): string {
    return Math.round(n).toLocaleString("ar-DZ");
  }

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
    emptyState: { alignItems: "center", paddingTop: 80, gap: 16 },
    emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
    card: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
    },
    cardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    cycleName: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      textAlign: "right",
    },
    activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    activeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    cycleTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
    cycleDates: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
      marginBottom: 10,
    },
    progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 10 },
    progressFill: { height: "100%", borderRadius: 3 },
    statsRow: { flexDirection: "row", justifyContent: "space-between" },
    stat: { alignItems: "flex-end" },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
    statValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>سجل الدورات</Text>
        <Text style={s.headerSubtitle}>{cycles.length} دورة</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {cycles.length === 0 && !refreshing && (
          <View style={s.emptyState}>
            <Feather name="inbox" size={48} color={colors.border} />
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>لا توجد دورات بعد</Text>
          </View>
        )}

        {cycles.map((cycle, index) => {
          const isOver = cycle.total_spent > TOTAL_BUDGET;
          const pct = Math.min(100, (cycle.total_spent / TOTAL_BUDGET) * 100);
          const statusColor = isOver ? colors.destructive : colors.success;
          const isActive = index === 0 && cycle.is_locked === 0;

          return (
            <View
              key={cycle.id}
              style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={s.cardTop}>
                <Text style={[s.cycleTotal, { color: isOver ? colors.destructive : colors.foreground }]}>
                  {formatAmount(cycle.total_spent)} دج
                </Text>
                <View style={s.nameRow}>
                  {isActive && (
                    <View style={[s.activeBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[s.activeBadgeText, { color: colors.primaryForeground }]}>
                        جارية
                      </Text>
                    </View>
                  )}
                  {cycle.is_locked === 1 && (
                    <Feather name="lock" size={12} color={colors.mutedForeground} />
                  )}
                  <Text style={[s.cycleName, { color: colors.foreground }]}>{cycle.name}</Text>
                </View>
              </View>

              <Text style={[s.cycleDates, { color: colors.mutedForeground }]}>
                {formatDateAr(cycle.start_date)} – {formatDateAr(cycle.end_date)}
              </Text>

              <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: statusColor }]}
                />
              </View>

              <View style={s.statsRow}>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>النسبة</Text>
                  <Text style={[s.statValue, { color: statusColor }]}>{Math.round(pct)}%</Text>
                </View>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>المتبقي</Text>
                  <Text style={[s.statValue, { color: statusColor }]}>
                    {formatAmount(TOTAL_BUDGET - cycle.total_spent)} دج
                  </Text>
                </View>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>الحد الأقصى</Text>
                  <Text style={[s.statValue, { color: colors.mutedForeground }]}>
                    {formatAmount(TOTAL_BUDGET)} دج
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
