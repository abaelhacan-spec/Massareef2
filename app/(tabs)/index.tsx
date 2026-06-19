import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  type Cycle,
  type DayExpense,
  getDailyBudget,
  getMonthlyBudget,
  getCycleStartDay,
  getExpensesForCycle,
  getOrCreateCurrentCycle,
  upsertDayAmount,
} from "@/lib/database";
import {
  DAILY_BUDGET,
  TOTAL_BUDGET,
  computeBudgetStats,
  formatDate,
  formatDateAr,
  getCycleName,
  getCycleEndDate,
  getCycleStartDate,
  getDayNameAr,
} from "@/lib/budget";
import { CalcModal } from "@/components/CalcModal";

// ─── In-app reminder banner ───────────────────────────────────────────────────
function ReminderBanner({
  visible,
  onDismiss,
  colors,
}: {
  visible: boolean;
  onDismiss: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const native = Platform.OS !== "web";
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: native,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: native,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -120,
          duration: 250,
          useNativeDriver: native,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: native,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim.__getValue() === 0) return null;

  return (
    <Animated.View
      style={[
        bannerStyles.container,
        {
          backgroundColor: "#7C3AED",
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={bannerStyles.iconWrap}>
        <Text style={bannerStyles.emoji}>💰</Text>
      </View>
      <Text style={bannerStyles.text}>
        أخي، لا تنسَ تسجيل مصاريفك اليومية لتبقى ميزانيتك في الأمان!
      </Text>
      <TouchableOpacity onPress={onDismiss} style={bannerStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="x" size={16} color="#ffffff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 18 },
  text: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "right",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [expenses, setExpenses] = useState<DayExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayExpense | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [dailyBudget, setDailyBudgetState] = useState<number>(0);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(0);
const [calcVisible, setCalcVisible] = useState(false);
  
  const today = new Date();
  const todayStr = formatDate(today);

  const loadData = useCallback(async () => {
    const cycleStartDay = await getCycleStartDay();
    const daily = await getDailyBudget();
    const monthly = await getMonthlyBudget();
    setDailyBudgetState(daily);
    setMonthlyBudgetState(monthly);
    const startDate = getCycleStartDate(today, cycleStartDay);
    const endDate = getCycleEndDate(startDate, cycleStartDay);
    const name = getCycleName(startDate);
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const currentCycle = await getOrCreateCurrentCycle(name, startStr, endStr, todayStr);
    if (currentCycle) {
      setCycle(currentCycle);
      const dayExpenses = await getExpensesForCycle(currentCycle.id);
      setExpenses(dayExpenses);
      setLoading(false);
      // Check if reminder banner should show
      checkBannerVisibility(dayExpenses);
    } else {
      setLoading(false);
    }
  }, [todayStr]);

  // Show banner if after 21:00 and today's expense is 0 / not entered
  function checkBannerVisibility(dayExpenses: DayExpense[]) {
    if (bannerDismissed) return;
    const hour = new Date().getHours();
    if (hour < 21) return;
    const todayRow = dayExpenses.find((e) => e.date === todayStr);
    const hasExpense = !!(todayRow && todayRow.amount > 0);
    setBannerVisible(!hasExpense);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-check banner every minute (handles the 21:00 threshold crossing)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!bannerDismissed) checkBannerVisibility(expenses);
    }, 60_000);
    return () => clearInterval(interval);
  }, [expenses, bannerDismissed, todayStr]);

  const stats =
    cycle && expenses.length > 0
      ? computeBudgetStats(
          expenses,
          new Date(cycle.start_date + "T00:00:00"),
          new Date(cycle.end_date + "T00:00:00"),
          today,
          dailyBudget,
          monthlyBudget
        )
      : null;

  const isGood = stats ? !stats.isOverBudget : true;
  const statusColor = isGood ? colors.success : colors.destructive;
  const statusBg = isGood
    ? isDark ? colors.successLight : "#DCFCE7"
    : isDark ? colors.dangerLight : "#FEE2E2";

  function openDayModal(day: DayExpense) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
  setInputAmount(day.is_entered && day.amount > 0 ? String(day.amount) : "");  
    setModalVisible(true);
  }

  async function saveAmount() {
    if (!selectedDay || !cycle) return;
    const amount = inputAmount.trim() === "" ? 0 : parseFloat(inputAmount) || 0;
    await upsertDayAmount(cycle.id, selectedDay.date, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);

    // If the saved day is today and amount > 0, hide the banner
    if (selectedDay.date === todayStr && amount > 0) {
      setBannerVisible(false);
    }

    loadData();
  }

  function dismissBanner() {
    setBannerDismissed(true);
    setBannerVisible(false);
  }

  function formatAmount(n: number): string {
    return Math.round(n).toLocaleString("ar-DZ");
  }

  const isToday = (dateStr: string) => dateStr === todayStr;

  // Banner top offset accounts for the status bar / safe area
  const bannerTop = Platform.OS === "web" ? 0 : insets.top;

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
      textAlign: "right",
    },
    scroll: { flex: 1 },
    content: {
      padding: 16,
      paddingBottom: (Platform.OS === "web" ? 84 : 80) + insets.bottom,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      padding: 16,
      marginBottom: 20,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      marginBottom: 14,
      gap: 5,
    },
    statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statBox: {
      width: "48%",
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      alignItems: "flex-end",
    },
    statLabel: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginBottom: 4,
      textAlign: "right",
    },
    statValue: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "right" },
    progressSection: { marginTop: 8 },
    progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
    progressLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
    progressLabelSm: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
    progressBar: { height: 8, borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "right" },
    sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: colors.radius - 4,
      borderWidth: 1,
      marginBottom: 6,
    },
    dayLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    dayDot: { width: 8, height: 8, borderRadius: 4 },
    dayName: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "right" },
    todayBadge: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    dayDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, textAlign: "right" },
    dayRight: { flexDirection: "row", alignItems: "center" },
    dayAmount: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    loadingText: {
      textAlign: "center",
      marginTop: 40,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
    },
    // Modal
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CBD5E1",
      alignSelf: "center",
      marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "right" },
    modalDate: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
      marginTop: 2,
      marginBottom: 20,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: colors.radius,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    amountInput: {
      flex: 1,
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      textAlign: "right",
      padding: 0,
    },
    currencyLabel: { fontSize: 18, fontFamily: "Inter_500Medium", marginLeft: 8 },
    quickAmounts: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
      justifyContent: "flex-end",
    },
    quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    quickBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    modalActions: { flexDirection: "row", gap: 10 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: colors.radius,
      borderWidth: 1.5,
      alignItems: "center",
    },
    cancelBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    saveBtn: { flex: 2, paddingVertical: 14, borderRadius: colors.radius, alignItems: "center" },
    saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  });

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>مصاريف</Text>
        {cycle && (
          <Text style={s.headerSubtitle}>
            {cycle.name} • {formatDateAr(cycle.start_date)} – {formatDateAr(cycle.end_date)}
          </Text>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <Text style={[s.loadingText, { color: colors.mutedForeground }]}>جاري التحميل...</Text>
        )}

        {/* ── Summary Card ── */}
        {stats && (
          <View style={[s.summaryCard, { borderWidth: 2, borderColor: statusColor }]}>
            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
              <Feather
                name={isGood ? "trending-down" : "trending-up"}
                size={14}
                color={statusColor}
              />
              <Text style={[s.statusText, { color: statusColor }]}>
                {isGood ? "في الميزانية" : "تجاوزت الميزانية"}
              </Text>
            </View>

            <View style={s.statsGrid}>
              <View style={[s.statBox, { backgroundColor: colors.secondary }]}>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>المصروف الكلي</Text>
                <Text style={[s.statValue, { color: colors.foreground }]}>
                  {formatAmount(stats.totalSpent)} دج
                </Text>
              </View>
              <View style={[s.statBox, { backgroundColor: colors.secondary }]}>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>المسموح حتى الآن</Text>
                <Text style={[s.statValue, { color: colors.mutedForeground }]}>
                  {formatAmount(stats.allowedSoFar)} دج
                </Text>
              </View>
              <View style={[s.statBox, { backgroundColor: statusBg }]}>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>الفرق</Text>
                <Text style={[s.statValue, { color: statusColor }]}>
                  {stats.difference >= 0 ? "+" : ""}{formatAmount(stats.difference)} دج
                </Text>
              </View>
              <View style={[s.statBox, { backgroundColor: colors.secondary }]}>
                <Text style={[s.statLabel, { color: colors.mutedForeground }]}>المتبقي</Text>
                <Text style={[s.statValue, { color: stats.remaining >= 0 ? colors.success : colors.destructive }]}>
                  {formatAmount(stats.remaining)} دج
                </Text>
              </View>
            </View>

            <View style={s.progressSection}>
              <View style={s.progressRow}>
                <Text style={[s.progressLabelSm, { color: colors.mutedForeground }]}>
                 {monthlyBudget > 0 ? `${formatAmount(monthlyBudget)} دج` : "غير محدد"} 
                </Text>
                <Text style={[s.progressLabel, { color: colors.mutedForeground }]}>
                  {stats.daysElapsed} / {stats.totalDays} يوم • {Math.round(stats.percentUsed)}%
                </Text>
              </View>
              <View style={[s.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${stats.percentUsed}%` as any, backgroundColor: statusColor },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* ── Day list ── */}
        {expenses.length > 0 && (
          <View style={s.sectionHeader}>
            <Text style={[s.sectionSub, { color: colors.mutedForeground }]}>
             {dailyBudget > 0 ? `${formatAmount(dailyBudget)} دج / يوم` : "لم يُحدد سقف"} 
            </Text>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>أيام الدورة</Text>
          </View>
        )}

        {expenses.map((day) => {
          const todayFlag = isToday(day.date);
          const overDay = !!day.is_entered && dailyBudget > 0 && day.amount > dailyBudget;
          const amtColor =
    !day.is_entered
      ? colors.mutedForeground
      : overDay
      ? colors.destructive
      : day.amount === 0
      ? colors.foreground
      : colors.success;
          const rowBg = todayFlag ? (isDark ? "#1A2D44" : "#EFF6FF") : colors.card;

          return (
            <TouchableOpacity
              key={day.date}
              style={[
                s.dayRow,
                {
                  backgroundColor: rowBg,
                  borderColor: todayFlag ? colors.primary : colors.border,
                  borderWidth: todayFlag ? 1.5 : 1,
                },
              ]}
              onPress={() => openDayModal(day)}
              activeOpacity={0.7}
            >
              <View style={[s.dayLeft, { justifyContent: "flex-end" }]}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.dayName, { color: colors.foreground }]}>
                    {getDayNameAr(day.date)}
                    {todayFlag ? (
                      <Text style={[s.todayBadge, { color: colors.primary }]}> • اليوم</Text>
                    ) : null}
                  </Text>
                  <Text style={[s.dayDate, { color: colors.mutedForeground }]}>
                    {formatDateAr(day.date)}
                  </Text>
                </View>
                <View style={[s.dayDot, {backgroundColor: day.is_entered && day.amount > 0 ? amtColor : colors.border }]} />
              </View>
              <View style={s.dayRight}>
                <Feather name="edit-2" size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                <Text style={[s.dayAmount, { color: amtColor }]}>
                 {day.is_entered ? `${formatAmount(day.amount)} دج` : "— دج"}
             </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View
            style={[
              s.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              {selectedDay ? getDayNameAr(selectedDay.date) : ""}
            </Text>
            <Text style={[s.modalDate, { color: colors.mutedForeground }]}>
              {selectedDay ? formatDateAr(selectedDay.date) : ""}
            </Text>

            <View
  style={[s.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}
>
  <TextInput
    style={[s.amountInput, { color: colors.foreground }]}
    value={inputAmount}
    onChangeText={setInputAmount}
    keyboardType="numeric"
    placeholder="0"
    placeholderTextColor={colors.mutedForeground}
    textAlign="right"
    autoFocus
    selectTextOnFocus
  />

  <Text style={[s.currencyLabel, { color: colors.mutedForeground }]}>دج</Text>

  <TouchableOpacity
    onPress={() => setCalcVisible(true)}
    style={{ marginLeft: 8 }}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Feather
      name="grid"
      size={20}
      color={colors.mutedForeground}
    />
  </TouchableOpacity>
</View>

            <View style={s.quickAmounts}>
              {[500, 1000, 1500, 2000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[s.quickBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
                  onPress={() => setInputAmount(String(amt))}
                >
                  <Text style={[s.quickBtnText, { color: colors.foreground }]}>
                    {formatAmount(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveAmount}
              >
                <Text style={[s.saveBtnText, { color: colors.primaryForeground }]}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
