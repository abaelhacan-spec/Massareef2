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
  Svg,
} from "react-native";
import Svg2, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/lib/useLanguage";
import { useDirection } from "@/hooks/useDirection";
import { useCurrency } from "@/lib/useCurrency";
import {
  type Cycle,
  type DayExpense,
  getAllCycles,
  getExpensesForCycle,
  getMonthlyBudget,
} from "@/lib/database";
import {
  TOTAL_BUDGET,
  getDayName,
  formatShortDate,
  formatNumber,
  formatCycleDisplayName,
} from "@/lib/budget";

// ── Circular Progress Component ──────────────────────────────────────────────
function CircularProgress({
  pct,
  color,
  size = 80,
  strokeWidth = 7,
  label,
  sublabel,
}: {
  pct: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const progress = circ - (Math.min(100, pct) / 100) * circ;

  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Svg2 width={size} height={size}>
        {/* track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#334155"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg2>
      <Text style={{ color, fontSize: 13, fontFamily: "Inter_700Bold" }}>
        {label}
      </Text>
      <Text
        style={{
          color: "#94A3B8",
          fontSize: 11,
          fontFamily: "Inter_400Regular",
          textAlign: "center",
        }}
      >
        {sublabel}
      </Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const dir = useDirection();
  const { currency } = useCurrency();
  const insets = useSafeAreaInsets();
  const [cycles, setCycles] = useState<(Cycle & { total_spent: number })[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<
    (Cycle & { total_spent: number }) | null
  >(null);
  const [selectedExpenses, setSelectedExpenses] = useState<DayExpense[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(0);

  const loadCycles = useCallback(async () => {
    const [data, monthly] = await Promise.all([getAllCycles(), getMonthlyBudget()]);
    setCycles(data);
    setMonthlyBudgetState(monthly);
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

  function getCycleSummary(
    expenses: DayExpense[],
    monthlyBudgetValue: number,
    cycleEndDate: string
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ✅ FIX: only count past days (up to today) as zero-spending days
    const pastExpenses = expenses.filter((d) => {
      const day = new Date(d.date);
      day.setHours(0, 0, 0, 0);
      return day <= today;
    });

    const total = expenses.reduce((sum, d) => sum + d.amount, 0);
    const zeroDays = pastExpenses.filter((d) => d.amount === 0).length;
    const totalPastDays = pastExpenses.length;
    const dailyAverage = totalPastDays > 0 ? total / totalPastDays : 0;
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
      alignItems: "flex-start",
      paddingTop: Platform.OS === "web" ? 67 : insets.top + 12,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: dir.textAlign,
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
      textAlign: dir.textAlign,
    },
    activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    activeBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    cycleTotal: { fontSize: 18, fontFamily: "Inter_700Bold" },
    cycleDates: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: dir.textAlign,
      marginBottom: 10,
    },
    statsRow: { flexDirection: "row", justifyContent: "space-between" },
    stat: { alignItems: "flex-start" },
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
      maxHeight: "85%",
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CBD5E1",
      alignSelf: "center",
      marginBottom: 16,
    },
    modalHeader: { marginBottom: 16, alignItems: "flex-start" },
    modalTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      textAlign: dir.textAlign,
    },
    modalSubtitle: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: dir.textAlign,
      marginTop: 2,
    },
    circleRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      marginBottom: 18,
      paddingVertical: 16,
      borderRadius: 14,
    },
    modalScroll: { maxHeight: 380 },
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
    dayName: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      textAlign: dir.textAlign,
    },
    dayDate: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 1,
      textAlign: dir.textAlign,
    },
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
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t("history.title")}</Text>
        <Text style={s.headerSubtitle}>
          {cycles.length} {t("history.cycle_count")}
        </Text>
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
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              {t("history.no_cycles")}
            </Text>
          </View>
        )}

        {cycles.map((cycle, index) => {
          const budget = monthlyBudget > 0 ? monthlyBudget : TOTAL_BUDGET;
          const isOver = cycle.total_spent > budget;
          const statusColor = isOver ? colors.destructive : colors.success;
          const isActive = index === 0 && cycle.is_locked === 0;

          return (
            <TouchableOpacity
              key={cycle.id}
              style={[
                s.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => openCycleDetail(cycle)}
              activeOpacity={0.7}
            >
              <View style={s.cardTop}>
                <Text
                  style={[
                    s.cycleTotal,
                    {
                      color: isOver ? colors.destructive : colors.foreground,
                    },
                  ]}
                >
                  {formatNumber(cycle.total_spent, dir.locale)} {currency}
                </Text>
                <View style={s.nameRow}>
                  {isActive && (
                    <View
                      style={[s.activeBadge, { backgroundColor: colors.primary }]}
                    >
                      <Text
                        style={[
                          s.activeBadgeText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        {t("history.active")}
                      </Text>
                    </View>
                  )}
                  {cycle.is_locked === 1 && (
                    <Feather
                      name="lock"
                      size={12}
                      color={colors.mutedForeground}
                    />
                  )}
                  <Text style={[s.cycleName, { color: colors.foreground }]}>
                    {formatCycleDisplayName(
                      new Date(cycle.start_date + "T00:00:00"),
                      dir.locale
                    )}
                  </Text>
                </View>
              </View>

              <Text style={[s.cycleDates, { color: colors.mutedForeground }]}>
                {formatShortDate(cycle.start_date, dir.locale)} –{" "}
                {formatShortDate(cycle.end_date, dir.locale)}
              </Text>

              {/* ── Stats (no progress bar) ── */}
              <View style={s.statsRow}>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>
                    {t("history.percentage")}
                  </Text>
                  <Text style={[s.statValue, { color: statusColor }]}>
                    {Math.round(Math.min(100, (cycle.total_spent / budget) * 100))}%
                  </Text>
                </View>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>
                    {t("history.remaining")}
                  </Text>
                  <Text style={[s.statValue, { color: statusColor }]}>
                    {formatNumber(budget - cycle.total_spent, dir.locale)}{" "}
                    {currency}
                  </Text>
                </View>
                <View style={s.stat}>
                  <Text style={[s.statLabel, { color: colors.mutedForeground }]}>
                    {t("history.max")}
                  </Text>
                  <Text style={[s.statValue, { color: colors.mutedForeground }]}>
                    {formatNumber(budget, dir.locale)} {currency}
                  </Text>
                </View>
              </View>

              <View style={[s.tapHint, { borderTopColor: colors.border }]}>
                <Feather name="list" size={12} color={colors.mutedForeground} />
                <Text style={[s.tapHintText, { color: colors.mutedForeground }]}>
                  {t("history.tap_hint")}
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
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + 24,
              },
            ]}
          >
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.foreground }]}>
                {selectedCycle?.name ?? ""}
              </Text>
              <Text style={[s.modalSubtitle, { color: colors.mutedForeground }]}>
                {selectedCycle
                  ? `${formatShortDate(selectedCycle.start_date, dir.locale)} – ${formatShortDate(selectedCycle.end_date, dir.locale)}`
                  : ""}
              </Text>
            </View>

            {loadingDetail ? (
              <Text
                style={[s.loadingText, { color: colors.mutedForeground }]}
              >
                {t("app.loading")}
              </Text>
            ) : (
              <>
                {(() => {
                  const budget = monthlyBudget > 0 ? monthlyBudget : TOTAL_BUDGET;
                  const summary = getCycleSummary(
                    selectedExpenses,
                    budget,
                    selectedCycle?.end_date ?? ""
                  );
                  const pct = budget > 0
                    ? Math.min(100, (( selectedCycle?.total_spent ?? 0) / budget) * 100)
                    : 0;
                  const isOver = (selectedCycle?.total_spent ?? 0) > budget;
                  const statusColor = isOver ? colors.destructive : colors.success;
                  const hasSurplus = summary.surplus !== null;
                  const isSurplus = hasSurplus && (summary.surplus as number) >= 0;

                  return (
                    <View
                      style={[
                        s.circleRow,
                        { backgroundColor: colors.secondary },
                      ]}
                    >
                      {/* Circle 1: budget usage % */}
                      <CircularProgress
                        pct={pct}
                        color={statusColor}
                        label={`${Math.round(pct)}%`}
                        sublabel={t("history.percentage")}
                      />

                      {/* Circle 2: surplus / deficit */}
                      <CircularProgress
                        pct={hasSurplus ? Math.min(100, Math.abs(((summary.surplus as number) / budget) * 100)) : 0}
                        color={!hasSurplus ? colors.mutedForeground : isSurplus ? colors.success : colors.destructive}
                        label={
                          !hasSurplus
                            ? "—"
                            : `${isSurplus ? "+" : ""}${formatNumber(summary.surplus as number, dir.locale)}`
                        }
                        sublabel={
                          !hasSurplus
                            ? t("history.surplus_deficit")
                            : isSurplus
                            ? t("history.surplus")
                            : t("history.deficit")
                        }
                      />

                      {/* Circle 3: zero spending days */}
                      <CircularProgress
                        pct={
                          selectedExpenses.length > 0
                            ? (summary.zeroDays / selectedExpenses.length) * 100
                            : 0
                        }
                        color={colors.primary}
                        label={`${summary.zeroDays}`}
                        sublabel={t("history.zero_days")}
                      />
                    </View>
                  );
                })()}

                <ScrollView
                  style={s.modalScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {selectedExpenses.map((day) => {
                    const overDay =
                      monthlyBudget > 0
                        ? day.amount > monthlyBudget / 30
                        : false;
                    const amtColor =
                      day.amount === 0
                        ? colors.mutedForeground
                        : overDay
                        ? colors.destructive
                        : colors.success;

                    return (
                      <View
                        key={day.date}
                        style={[
                          s.dayRow,
                          {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View>
                          <Text style={[s.dayName, { color: colors.foreground }]}>
                            {getDayName(day.date, dir.locale)}
                          </Text>
                          <Text
                            style={[
                              s.dayDate,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {formatShortDate(day.date, dir.locale)}
                          </Text>
                        </View>
                        <Text style={[s.dayAmount, { color: amtColor }]}>
                          {formatNumber(day.amount, dir.locale)}{" "}
                          {currency}
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
              <Text style={[s.closeBtnText, { color: colors.foreground }]}>
                {t("app.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
