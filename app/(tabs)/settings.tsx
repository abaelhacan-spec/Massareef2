import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import type { User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useLanguage } from "@/lib/useLanguage";
import { useDirection } from "@/hooks/useDirection";
import type { SupportedLanguage } from "@/lib/i18n";
import {
  downloadBackupFromCloud,
  getGoogleSignInError,
  getLastCloudBackupDate,
  onAuthChange,
  signInWithGoogle,
  signOutGoogle,
  uploadBackupToCloud,
} from "@/lib/cloudBackup";
import {
  exportBackup,
  getAppLockEnabled,
  getCycleStartDay,
  getDailyBudget,
  getMonthlyBudget,
  importBackup,
  loadBackupFromFile,
  saveBackupToFile,
  setAppLockEnabled,
  setCycleStartDay,
  setDailyBudget,
  setMonthlyBudget,
} from "@/lib/database";
import { formatNumber } from "@/lib/budget";
import { CurrencyPickerModal } from "@/components/CurrencyPickerModal";
import { useCurrency, initCurrency } from "@/lib/useCurrency";

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

const LANGUAGE_OPTIONS: { code: SupportedLanguage; nativeName: string }[] = [
  { code: "ar", nativeName: "العربية" },
  { code: "en", nativeName: "English" },
  { code: "fr", nativeName: "Français" },
];

function formatDateTimeLocale(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SettingsScreen() {
  const colors = useColors();
  const { t, language, changeLanguage } = useLanguage();
  const dir = useDirection();
  const { currency, setCurrency } = useCurrency();
  const insets = useSafeAreaInsets();

  const [cycleStartDay, setCycleStartDayState] = useState(6);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [dailyBudget, setDailyBudgetState] = useState(0);
  const [monthlyBudget, setMonthlyBudgetState] = useState(0);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [dailyInput, setDailyInput] = useState("");
  const [monthlyInput, setMonthlyInput] = useState("");
  const [monthlyEditedManually, setMonthlyEditedManually] = useState(false);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [day, lock, daily, monthly] = await Promise.all([
        getCycleStartDay(),
        getAppLockEnabled(),
        getDailyBudget(),
        getMonthlyBudget(),
      ]);
      setCycleStartDayState(day);
      setAppLockEnabledState(lock);
      setDailyBudgetState(daily);
      setMonthlyBudgetState(monthly);
    })();

    const unsubscribe = onAuthChange(async (user) => {
      setCloudUser(user);
      if (user) {
        const date = await getLastCloudBackupDate();
        setLastBackupDate(date);
      } else {
        setLastBackupDate(null);
      }
    });
    return unsubscribe;
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
      const p = parseFloat(val);
      setMonthlyInput(!isNaN(p) && p > 0 ? String(Math.round(p * 30)) : "");
    }
  }

  async function saveBudget() {
    const daily = parseFloat(dailyInput);
    const monthly = parseFloat(monthlyInput);
    if (isNaN(daily) || daily <= 0) {
      Alert.alert(t("app.error"), t("settings.invalid_daily_limit"));
      return;
    }
    if (isNaN(monthly) || monthly <= 0) {
      Alert.alert(t("app.error"), t("settings.invalid_monthly_limit"));
      return;
    }
    await setDailyBudget(daily);
    await setMonthlyBudget(monthly);
    setDailyBudgetState(daily);
    setMonthlyBudgetState(monthly);
    setBudgetModalVisible(false);
  }

  async function handleLocalExport() {
    setLocalLoading(true);
    try {
      const backup = await exportBackup();
      const path = await saveBackupToFile(backup);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: "application/json",
          dialogTitle: t("settings.backup"),
        });
      } else {
        Alert.alert(t("app.done"), `${path}`);
      }
    } catch (e: any) {
      Alert.alert(t("app.error"), e.message ?? t("settings.backup_export_fail"));
    } finally {
      setLocalLoading(false);
    }
  }

  async function handleLocalImport() {
    Alert.alert(t("app.warning"), t("settings.restore_confirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("app.confirm"),
        style: "destructive",
        onPress: async () => {
          setLocalLoading(true);
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: "application/json",
              copyToCacheDirectory: true,
            });
            if (result.canceled) return;
            const file = result.assets[0];
            const backup = await loadBackupFromFile(file.uri);
            await importBackup(backup);
            await initCurrency();
            Alert.alert(t("app.done"), t("settings.restore_success_file"));
          } catch (e: any) {
            Alert.alert(t("app.error"), e.message ?? t("settings.import_fail"));
          } finally {
            setLocalLoading(false);
          }
        },
      },
    ]);
  }

  async function handleGoogleSignIn() {
    setCloudLoading(true);
    try {
      await signInWithGoogle();
      const date = await getLastCloudBackupDate();
      setLastBackupDate(date);
    } catch (e) {
      Alert.alert(t("app.error"), getGoogleSignInError(e));
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(t("settings.logout"), t("settings.disconnect_google"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        onPress: async () => {
          setCloudLoading(true);
          try {
            await signOutGoogle();
          } catch (e: any) {
            Alert.alert(t("app.error"), e.message);
          } finally {
            setCloudLoading(false);
          }
        },
      },
    ]);
  }

  async function handleCloudUpload() {
    setCloudLoading(true);
    try {
      const backup = await exportBackup();
      await uploadBackupToCloud(backup);
      setLastBackupDate(new Date().toISOString());
      Alert.alert(t("app.done_check"), t("settings.backup_success"));
    } catch (e: any) {
      Alert.alert(t("app.error"), e.message ?? t("settings.backup_upload_fail"));
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleCloudDownload() {
    Alert.alert(t("settings.restore_cloud"), t("settings.restore_confirm"), [
      { text: t("app.cancel"), style: "cancel" },
      {
        text: t("settings.restore"),
        style: "destructive",
        onPress: async () => {
          setCloudLoading(true);
          try {
            const backup = await downloadBackupFromCloud();
            await importBackup(backup);
            await initCurrency();
            Alert.alert(t("app.done_check"), t("settings.restore_success"));
          } catch (e: any) {
            Alert.alert(
              t("app.error"),
              e.message ?? t("settings.restore_fail")
            );
          } finally {
            setCloudLoading(false);
          }
        },
      },
    ]);
  }

  const currentLangName =
    LANGUAGE_OPTIONS.find((l) => l.code === language)?.nativeName ?? language;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      alignItems: "flex-start", // I18nManager يعكس هذا تلقائياً
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
    sectionTitle: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      textAlign: dir.textAlign,
      marginBottom: 8,
      marginTop: 18,
      marginStart: 4, // يتكيف تلقائياً مع RTL/LTR
    },
    card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
    row: {
      flexDirection: "row", // I18nManager يعكسها تلقائياً في RTL
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
    },
    rowRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    rowValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
    soonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    soonText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    userCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
    },
    userAvatar: { width: 44, height: 44, borderRadius: 22 },
    userAvatarPlaceholder: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    userInfo: { flex: 1, alignItems: "flex-start" }, // I18nManager يعكس تلقائياً
    userName: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      textAlign: dir.textAlign,
    },
    userEmail: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      marginTop: 2,
      textAlign: dir.textAlign,
    },
    userBackupDate: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      marginTop: 3,
      textAlign: dir.textAlign,
    },
    cloudActionsRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 14,
      borderTopWidth: 1,
    },
    cloudBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
    },
    cloudBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    signOutRow: {
      flexDirection: "row",
      justifyContent: "flex-start", // I18nManager يعكس الصف تلقائياً
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    signOutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    signOutText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    signInBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      margin: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    signInBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    footer: { alignItems: "center", marginTop: 28, gap: 4 },
    footerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
    footerVersion: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
      textAlign: dir.textAlign,
      marginBottom: 4,
    },
    modalNote: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: dir.textAlign,
      marginBottom: 14,
    },
    daysGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-start", // I18nManager يعكس الصف تلقائياً
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
    dayChipText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    inputGroup: { marginBottom: 16 },
    inputLabel: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      textAlign: dir.textAlign,
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
      textAlign: dir.textAlign,
      padding: 0,
    },
    currencyLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      marginStart: 8,
    },
    autoNote: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      textAlign: dir.textAlign,
      marginTop: 4,
    },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 8 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
    },
    cancelBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    // Language picker
    langOption: {
      flexDirection: "row", // I18nManager يعكسها تلقائياً في RTL
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
    },
    langOptionText: {
      flex: 1,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      textAlign: dir.textAlign,
    },
    langOptionSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
  });

  const chevron = dir.isRTL ? "chevron-left" : "chevron-right";

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t("settings.title")}</Text>
        <Text style={s.headerSubtitle}>{t("settings.customize_expenses")}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* الميزانية */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.spending_limit")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={openBudgetModal}>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.daily_limit")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="calendar" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <Feather name={chevron} size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {dailyBudget > 0
                  ? `${formatNumber(dailyBudget, dir.locale)} ${currency}`
                  : t("app.undefined")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={openBudgetModal}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.monthly_limit")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="pie-chart" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <Feather name={chevron} size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {monthlyBudget > 0
                  ? `${formatNumber(monthlyBudget, dir.locale)} ${currency}`
                  : t("app.undefined")}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={() => setPickerVisible(true)}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.cycle_start_day")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="rotate-cw" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <Feather name={chevron} size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {cycleStartDay}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* العملة واللغة */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.currency_and_language")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.6}
            onPress={() => setCurrencyPickerVisible(true)}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.currency")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="dollar-sign" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <Feather name={chevron} size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {currency}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Language row — now active */}
          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={() => setLangPickerVisible(true)}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.language")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="globe" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <Feather name={chevron} size={16} color={colors.mutedForeground} />
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                {currentLangName}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* الأمان */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.security")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.app_lock")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={16} color={colors.primary} />
              </View>
            </View>
            <Switch
              value={appLockEnabled}
              onValueChange={toggleAppLock}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.primaryForeground}
            />
          </View>
        </View>

        {/* الإشعارات */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.notifications")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={s.row} activeOpacity={1} disabled>
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.daily_reminder")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="bell" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              <View style={[s.soonBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[s.soonText, { color: colors.mutedForeground }]}>
                  {t("app.soon")}
                </Text>
              </View>
              <Text style={[s.rowValue, { color: colors.mutedForeground }]}>
                21:00
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* النسخ الاحتياطي المحلي */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.local_backup")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={s.row}
            activeOpacity={0.6}
            onPress={handleLocalExport}
            disabled={localLoading}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.export_backup")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="upload" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              {localLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name={chevron} size={16} color={colors.mutedForeground} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.row, s.rowBorder, { borderTopColor: colors.border }]}
            activeOpacity={0.6}
            onPress={handleLocalImport}
            disabled={localLoading}
          >
            <View style={s.rowLeft}>
              <Text style={[s.rowLabel, { color: colors.foreground }]}>
                {t("settings.restore_file")}
              </Text>
              <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
                <Feather name="download" size={16} color={colors.primary} />
              </View>
            </View>
            <View style={s.rowRight}>
              {localLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name={chevron} size={16} color={colors.mutedForeground} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* النسخ الاحتياطي السحابي */}
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          {t("settings.cloud_backup")}
        </Text>
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {cloudUser != null ? (
            <View>
              <View style={s.userCard}>
                {cloudUser.photoURL != null ? (
                  <Image
                    source={{ uri: cloudUser.photoURL }}
                    style={s.userAvatar}
                  />
                ) : (
                  <View
                    style={[
                      s.userAvatarPlaceholder,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Feather name="user" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={s.userInfo}>
                  <Text
                    style={[s.userName, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {cloudUser.displayName ?? t("settings.google_user")}
                  </Text>
                  <Text
                    style={[s.userEmail, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {cloudUser.email}
                  </Text>
                  <Text
                    style={[s.userBackupDate, { color: colors.mutedForeground }]}
                  >
                    {lastBackupDate != null
                      ? `${t("settings.last_backup")}: ${formatDateTimeLocale(
                          lastBackupDate,
                          dir.locale
                        )}`
                      : t("settings.no_backup_yet")}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  s.cloudActionsRow,
                  { borderTopColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  style={[s.cloudBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCloudUpload}
                  disabled={cloudLoading}
                >
                  {cloudLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primaryForeground}
                    />
                  ) : (
                    <Feather
                      name="upload-cloud"
                      size={15}
                      color={colors.primaryForeground}
                    />
                  )}
                  <Text
                    style={[s.cloudBtnText, { color: colors.primaryForeground }]}
                  >
                    {t("settings.upload_cloud")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.cloudBtn,
                    {
                      backgroundColor: colors.secondary,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handleCloudDownload}
                  disabled={cloudLoading}
                >
                  {cloudLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.foreground}
                    />
                  ) : (
                    <Feather
                      name="download-cloud"
                      size={15}
                      color={colors.foreground}
                    />
                  )}
                  <Text style={[s.cloudBtnText, { color: colors.foreground }]}>
                    {t("settings.restore")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={s.signOutRow}>
                <TouchableOpacity
                  style={[s.signOutBtn, { backgroundColor: colors.background }]}
                  onPress={handleSignOut}
                  disabled={cloudLoading}
                >
                  <Feather name="log-out" size={13} color={colors.destructive} />
                  <Text style={[s.signOutText, { color: colors.destructive }]}>
                    {t("settings.disconnect")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.signInBtn, { borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={cloudLoading}
            >
              {cloudLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="cloud" size={18} color={colors.primary} />
              )}
              <Text style={[s.signInBtnText, { color: colors.foreground }]}>
                {cloudLoading
                  ? t("settings.logging_in")
                  : t("settings.google_login")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.mutedForeground }]}>
            {t("app.name")}
          </Text>
          <Text style={[s.footerVersion, { color: colors.mutedForeground }]}>
            {t("app.version")}
          </Text>
        </View>
      </ScrollView>

      {/* Modal: سقف الإنفاق */}
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
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setBudgetModalVisible(false)}
          />
          <View
            style={[
              s.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              {t("settings.spending_limit")}
            </Text>
            <Text style={[s.modalNote, { color: colors.mutedForeground }]}>
              {t("settings.monthly_auto_note")}
            </Text>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.foreground }]}>
                {t("settings.daily_limit_label")}
              </Text>
              <View
                style={[
                  s.inputWrapper,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <TextInput
                  style={[s.amountInput, { color: colors.foreground }]}
                  value={dailyInput}
                  onChangeText={onDailyInputChange}
                  keyboardType="numeric"
                  placeholder={t("settings.enter_amount")}
                  placeholderTextColor={colors.mutedForeground}
                  textAlign={dir.textAlign}
                  autoFocus
                />
                <Text style={[s.currencyLabel, { color: colors.mutedForeground }]}>
                  {currency}
                </Text>
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.foreground }]}>
                {t("settings.monthly_limit_label")}
              </Text>
              <View
                style={[
                  s.inputWrapper,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <TextInput
                  style={[s.amountInput, { color: colors.foreground }]}
                  value={monthlyInput}
                  onChangeText={(val) => {
                    setMonthlyInput(val);
                    setMonthlyEditedManually(true);
                  }}
                  keyboardType="numeric"
                  placeholder={t("app.auto_calculated")}
                  placeholderTextColor={colors.mutedForeground}
                  textAlign={dir.textAlign}
                />
                <Text style={[s.currencyLabel, { color: colors.mutedForeground }]}>
                  {currency}
                </Text>
              </View>
              {!monthlyEditedManually && dailyInput.length > 0 && (
                <Text style={[s.autoNote, { color: colors.mutedForeground }]}>
                  {t("settings.auto_calculated_note", { daily: dailyInput })}
                </Text>
              )}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>
                  {t("app.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }]}
                onPress={saveBudget}
              >
                <Text style={[s.saveBtnText, { color: colors.primaryForeground }]}>
                  {t("app.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: يوم بداية الدورة */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setPickerVisible(false)}
          />
          <View
            style={[
              s.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              {t("settings.cycle_start_day")}
            </Text>
            <Text style={[s.modalNote, { color: colors.mutedForeground }]}>
              {t("settings.cycle_change_note")}
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
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          backgroundColor: selected
                            ? colors.primary
                            : colors.secondary,
                        },
                      ]}
                      onPress={() => chooseDay(day)}
                    >
                      <Text
                        style={[
                          s.dayChipText,
                          {
                            color: selected
                              ? colors.primaryForeground
                              : colors.foreground,
                          },
                        ]}
                      >
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

      {/* Modal: اختيار اللغة */}
      <Modal
        visible={langPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLangPickerVisible(false)}
      >
        <View style={s.modalOverlay}>
          <Pressable
            style={s.modalBackdrop}
            onPress={() => setLangPickerVisible(false)}
          />
          <View
            style={[
              s.modalSheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={s.modalHandle} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>
              {t("settings.language_select")}
            </Text>

            <View style={{ marginTop: 8 }}>
              {LANGUAGE_OPTIONS.map((opt) => {
                const isSelected = opt.code === language;
                return (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      s.langOption,
                      {
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected
                          ? colors.primary + "18"
                          : colors.secondary,
                      },
                    ]}
                    onPress={async () => {
                      setLangPickerVisible(false);
                      await changeLanguage(opt.code);
                    }}
                  >
                    <Text
                      style={[
                        s.langOptionText,
                        {
                          color: isSelected
                            ? colors.primary
                            : colors.foreground,
                        },
                      ]}
                    >
                      {opt.nativeName}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: اختيار العملة */}
      <CurrencyPickerModal
        visible={currencyPickerVisible}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </View>
  );
}
