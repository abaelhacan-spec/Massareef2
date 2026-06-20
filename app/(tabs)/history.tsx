import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { type Cycle, type DayExpense, getAllCycles, getExpensesForCycle, getMonthlyBudget } from "@/lib/database";
import { DAILY_BUDGET, TOTAL_BUDGET, formatDateAr, getDayNameAr } from "@/lib/budget";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [cycles, setCycles] = useState<(Cycle & { total_spent: number })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<(Cycle & { total_spent: number }) | null>(null);
  const [selectedExpenses, setSelectedExpenses] = useState<DayExpense[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(0);

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

  async function openCycleDetail(cycle: Cycle & { total_spent: number }) {
    setSelectedCycle(cycle);
    setDetailVisible(true);
    setLoadingDetail(true);
    const data = await getExpensesForCycle(cycle.id);
    const monthly = await getMonthlyBudget();
    setSelectedExpenses(data);
    setMonthlyBudgetState(monthly);
    setLoadingDetail(false);
  }

  function closeDetail() {
    setDetailVisible(false);
    setSelectedCycle(null);
    setSelectedExpenses([]);
  }

  function formatAmount(n: number): string {
    return Math.round(n).toLocaleString("ar-DZ");
  }

  function getCycleSummary(expenses: DayExpense[], monthlyBudgetValue: number) {
    const total = expenses.reduce((sum, d) => sum + d.amount, 0);
    const zeroDays = expenses.filter((d) => d.amount === 0).length;
    const totalDays = expenses.length;
    const dailyAverage = totalDays > 0 ? total / totalDays : 0;
    const surplus = monthlyBudgetValue > 0 ? monthlyBudgetValue - total : null;
    return { total, zeroDays, dailyAverage, surplus };
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
    tapHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
    },
    tapHintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
    // Modal styles
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      maxHeight: "80%",
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CBD5E1",
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: { marginBottom: 12 },
    modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
      marginTop: 2,
    },
    modalScroll: { maxHeight: 420 },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 6,
    },
    dayName: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
    dayDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, textAlign: "right" },
    dayAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    closeBtn: {
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    closeBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    loadingText: {
      textAlign: "center",
      paddingVertical: 30,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    // Summary box
    summaryBox: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      gap: 8,
    },
    summaryItem: { flex: 1, alignItems: "center", gap: 4 },
    summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
    summaryValue: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
    summarySub: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 1, textAlign: "center" },
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
            <TouchableOpacity
              key={cycle.id}
              style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openCycleDetail(cycle)}
              activeOpacity={0.7}
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

              <View style={[s.tapHint, { borderTopColor: colors.border }]}>
                <Feather name="list" size={12} color={colors.mutedForeground} />
                <Text style={[s.tapHintText, { color: colors.mutedForeground }]}>
                  اضغط لعرض التفاصيل اليومية
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Cycle Detail Modal ── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDetail}
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={closeDetail} />
          <View
            style={[
              s.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>
                {selectedCycle?.name ?? ""}
              </Text>
              <Text style={[s.modalSubtitle, { color: colors.mutedForeground }]}>
                {selectedCycle
                  ? `${formatDateAr(selectedCycle.start_date)} – ${formatDateAr(selectedCycle.end_date)}`
                  : ""}
              </Text>
            </View>

            {loadingDetail ? (
              <Text style={[s.loadingText, { color: colors.mutedForeground }]}>جاري التحميل...</Text>
            ) : (
              <>
                {(() => {
                  const summary = getCycleSummary(selectedExpenses, monthlyBudget);
                  const hasSurplus = summary.surplus !== null;
                  const isSurplus = hasSurplus && (summary.surplus as number) >= 0;
                  return (
                    <View style={[s.summaryBox, { backgroundColor: colors.secondary }]}>
                      <View style={s.summaryItem}>
                        <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>
                          {!hasSurplus ? "الفائض/العجز" : isSurplus ? "الفائض" : "العجز"}
                        </Text>
                        <Text
                          style={[
                            s.summaryValue,
                            {
                              color: !hasSurplus
                                ? colors.mutedForeground
                                : isSurplus
                                ? colors.success
                                : colors.destructive,
                            },
                          ]}
                        >
                          {!hasSurplus
                            ? "—"
                            : `${isSurplus ? "+" : ""}${formatAmount(summary.surplus as number)} دج`}
                        </Text>
                      </View>
                      <View style={s.summaryItem}>
                        <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>
                          المتوسط اليومي
                        </Text>
                        <Text style={[s.summaryValue, { color: colors.foreground }]}>
                          {formatAmount(summary.dailyAverage)} دج
                        </Text>
                      </View>
                      <View style={s.summaryItem}>
                        <Text style={[s.summaryLabel, { color: colors.mutedForeground }]}>
                          أيام بدون صرف
                        </Text>
                        <Text style={[s.summaryValue, { color: colors.success }]}>
                          {summary.zeroDays}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
                  {selectedExpenses.map((day) => {
                    const overDay = day.amount > DAILY_BUDGET;
                    const amtColor =
                      day.amount === 0
                        ? colors.mutedForeground
                        : overDay
                        ? colors.destructive
                        : colors.success;

                    return (
                      <View
                        key={day.date}
                        style={[s.dayRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                      >
                        <View>
                          <Text style={[s.dayName, { color: colors.foreground }]}>
                            {getDayNameAr(day.date)}
                          </Text>
                          <Text style={[s.dayDate, { color: colors.mutedForeground }]}>
                            {formatDateAr(day.date)}
                          </Text>
                        </View>
                        <Text style={[s.dayAmount, { color: amtColor }]}>
                          {formatAmount(day.amount)} دج
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <TouchableOpacity
              style={[s.closeBtn, { backgroundColor: colors.secondary }]}
              onPress={closeDetail}
            >
              <Text style={[s.closeBtnText, { color: colors.foreground }]}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
