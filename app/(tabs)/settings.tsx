import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  exportBackup,
  getAppLockEnabled,
  getCycleStartDay,
  getDailyBudget,
  getMonthlyBudget,
  importBackup,
  setAppLockEnabled,
  setCycleStartDay,
  setDailyBudget,
  setMonthlyBudget,
  type BackupData,
} from "@/lib/database";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [cycleStartDay, setCycleStartDayState] = useState<number>(6);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [appLockEnabled, setAppLockEnabledState] = useState<boolean>(false);
  const [dailyBudget, setDailyBudgetState] = useState<number>(0);
  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [dailyInput, setDailyInput] = useState("");
  const [monthlyInput, setMonthlyInput] = useState("");
  const [monthlyEditedManually, setMonthlyEditedManually] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const day = await getCycleStartDay();
      setCycleStartDayState(day);
      const lock = await getAppLockEnabled();
      setAppLockEnabledState(lock);
      const daily = await getDailyBudget();
      const monthly = await getMonthlyBudget();
      setDailyBudgetState(daily);
      setMonthlyBudgetState(monthly);
    })();
  }, []);

  async function chooseDay(day: number) {
    await setCycleStartDay(day);
    setCycleStartDayState(day);
    setPickerVisible(false);
  }

  async function toggleAppLock(value: boolean) {
    await setAppLockEnabled(value);
    setAppLockEnabledState(value);
  }

  function openBudgetModal() {
    setDailyInput(dailyBudget > 0 ? String(dailyBudget) : "");
    setMonthlyInput(monthlyBudget > 0 ? String(monthlyBudget) : "");
    setMonthlyEditedManually(false);
    setBudgetModalVisible(true);
  }

  function onDailyInputChange(val: string) {
    setDailyInput(val);
    if (!monthlyEditedManually) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed > 0) {
        setMonthlyInput(String(Math.round(parsed * 30)));
      } else {
        setMonthlyInput("");
      }
    }
  }

  async function saveBudget() {
    const daily = parseFloat(dailyInput);
    const monthly = parseFloat(monthlyInput);

    if (isNaN(daily) || daily <= 0) {
      Alert.alert("خطأ", "يرجى إدخال سقف إنفاق يومي صحيح");
      return;
    }
    if (isNaN(monthly) || monthly <= 0) {
      Alert.alert("خطأ", "يرجى إدخال سقف إنفاق شهري صحيح");
      return;
    }

    await setDailyBudget(daily);
    await setMonthlyBudget(monthly);
    setDailyBudgetState(daily);
    setMonthlyBudgetState(monthly);
    setBudgetModalVisible(false);
  }

  function formatAmount(n: number): string {
    return Math.round(n).toLocaleString("ar-DZ");
  }

  async function handleExport() {
    try {
      setBackupLoading(true);
      const data = await exportBackup();
      const json = JSON.stringify(data, null, 2);
      const date = new Date().toISOString().split("T")[0];
      const fileName = `massareef_backup_${date}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "حفظ النسخة الاحتياطية",
          UTI: "public.json",
        });
      } else {
        Alert.alert("خطأ", "المشاركة غير متاحة على هذا الجهاز");
      }
    } catch {
      Alert.alert("خطأ", "فشل إنشاء النسخة الاحتياطية");
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleImport() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file?.uri) return;

      Alert.alert(
        "تأكيد الاستيراد",
        "سيتم استبدال جميع البيانات الحالية بالنسخة الاحتياطية. هل أنت متأكد؟",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استيراد",
            style: "destructive",
            onPress: async () => {
              try {
                setBackupLoading(true);
                const content = await FileSystem.readAsStringAsync(file.uri, {
                  encoding: FileSystem.EncodingType.UTF8,
                });
                const data: BackupData = JSON.parse(content);
                await importBackup(data);
                Alert.alert(
                  "تم بنجاح",
                  "تم استيراد النسخة الاحتياطية. أغلق التطبيق وأعد فتحه لتطبيق التغييرات."
                );
              } catch {
                Alert.alert("خطأ", "الملف غير صالح أو تالف");
              } finally {
                setBackupLoading(false);
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert("خطأ", "فشل اختيار الملف");
    }
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
    rowBorder: { borderTopWidth: 1 },
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
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      maxHeight: "75%",
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CBD5E1",
      alignSelf: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      textAlign: "right",
      marginBottom: 4,
    },
    modalNote: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
      marginBottom: 14,
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 8,
      paddingBottom: 20,
    },
    dayChip: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayChipText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      textAlign: "right",
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    amountInput: {
      flex: 1,
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      textAlign: "right",
      padding: 0,
    },
    currencyLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      marginLeft: 8,
    },
    autoNote: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
      marginTop: 4,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
      marginBottom: 8,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
    },
    cancelBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    saveBtn: {
      flex: 2,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    saveBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
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
        {/* ── الميزانية ── */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>الميزانية</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

          <TouchableOpacity
            style={s.row}
            activeOpacity={0.6}
            onPress={openBudgetModal}
          >
            <View style={s.rowRight}>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {dailyBudget > 0 ? `${formatAmount(dailyBudget)} دج` : "غير محدد"}
              </Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>سقف الإنفاق اليومي</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={openBudgetModal}
          >
            <View style={s.rowRight}>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {monthlyBudget > 0 ? `${formatAmount(monthlyBudget)} دج` : "غير محدد"}
              </Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>سقف الإنفاق الشهري</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="pie-chart" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={() => setPickerVisible(true)}
          >
            <View style={s.rowRight}>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>{cycleStartDay}</Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>يوم بداية الدورة</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="rotate-cw" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── العملة واللغة ── */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>العملة واللغة</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={1} disabled>
            <View style={s.rowRight}>
              <View style={[s.soonBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[s.soonText, { color: colors.mutedForeground }]}>قريباً</Text>
              </View>
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>دج (DZD)</Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>العملة</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="dollar-sign" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, s.rowBorder, { borderTopColor: colors.border }]} activeOpacity={1} disabled>
            <View style={s.rowRight}>
              <View style={[s.soonBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[s.soonText, { color: colors.mutedForeground }]}>قريباً</Text>
              </View>
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>العربية</Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>اللغة</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="globe" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── الأمان ── */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>الأمان</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.row}>
            <Switch
              value={appLockEnabled}
              onValueChange={toggleAppLock}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>قفل التطبيق</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={16} color={colors.primary} />
              </View>
            </View>
          </View>
        </View>

        {/* ── الإشعارات ── */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>الإشعارات</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={1} disabled>
            <View style={s.rowRight}>
              <View style={[s.soonBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[s.soonText, { color: colors.mutedForeground }]}>قريباً</Text>
              </View>
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>21:00</Text>
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>وقت التذكير اليومي</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="bell" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── البيانات ── */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>البيانات</Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[s.row, { opacity: backupLoading ? 0.5 : 1 }]}
            activeOpacity={0.6}
            onPress={handleExport}
            disabled={backupLoading}
          >
            <View style={s.rowRight}>
              {backupLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
              )}
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>تصدير نسخة احتياطية</Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="upload" size={16} color={colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border, opacity: backupLoading ? 0.5 : 1 }]}
            activeOpacity={0.6}
            onPress={handleImport}
            disabled={backupLoading}
          >
            <View style={s.rowRight}>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </View>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.destructive }]}>
                استعادة من نسخة احتياطية
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.dangerLight }]}>
                <Feather name="download" size={16} color={colors.destructive} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>مصاريف</Text>
          <Text style={[s.footerVersion, { color: colors.mutedForeground }]}>الإصدار 2.0</Text>
        </View>
      </ScrollView>

      {/* ── Budget Modal ── */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalOverlay}
        >
          <Pressable style={s.modalBackdrop} onPress={() => setBudgetModalVisible(false)} />
          <View style={[s.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>سقف الإنفاق</Text>
            <Text style={[s.modalNote, { color: colors.mutedForeground }]}>
              السقف الشهري يُحسب تلقائياً (اليومي × 30) ويمكنك تعديله يدوياً.
            </Text>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.foreground }]}>السقف اليومي</Text>
              <View style={[s.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[s.amountInput, { color: colors.foreground }]}
                  value={dailyInput}
                  onChangeText={onDailyInputChange}
                  keyboardType="numeric"
                  placeholder="أدخل المبلغ"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                  autoFocus
                />
                <Text style={[s.currencyLabel, { color: colors.mutedForeground }]}>دج</Text>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.foreground }]}>السقف الشهري</Text>
              <View style={[s.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  style={[s.amountInput, { color: colors.foreground }]}
                  value={monthlyInput}
                  onChangeText={(val) => {
                    setMonthlyInput(val);
                    setMonthlyEditedManually(true);
                  }}
                  keyboardType="numeric"
                  placeholder="يُحسب تلقائياً"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
                <Text style={[s.currencyLabel, { color: colors.mutedForeground }]}>دج</Text>
              </View>
              {!monthlyEditedManually && dailyInput.length > 0 && (
                <Text style={[s.autoNote, { color: colors.mutedForeground }]}>
                  محسوب تلقائياً ({dailyInput} × 30)
                </Text>
              )}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveBudget}
              >
                <Text style={[s.saveBtnText, { color: colors.primaryForeground }]}>حفظ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Cycle Start Day Picker ── */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setPickerVisible(false)} />
          <View style={[s.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]}>
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>يوم بداية الدورة</Text>
            <Text style={[s.modalNote, { color: colors.mutedForeground }]}>
              سيُطبَّق هذا التغيير على الدورة القادمة فقط، ولن يؤثر على الدورة الحالية.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.daysGrid}>
                {DAY_OPTIONS.map((day) => {
                  const selected = day === cycleStartDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        s.dayChip,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : colors.secondary,
                        },
                      ]}
                      onPress={() => chooseDay(day)}
                    >
                      <Text style={[s.dayChipText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
