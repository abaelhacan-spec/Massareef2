import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/lib/useLanguage";
import { useDirection } from "@/hooks/useDirection";
import { useCurrency } from "@/lib/useCurrency";
import { formatNumber } from "@/lib/budget";

interface CalcModalProps {
  visible: boolean;
  onClose: () => void;
  onInsert: (total: number) => void;
  initialValue?: number;
}

export function CalcModal({
  visible,
  onClose,
  onInsert,
  initialValue = 0,
}: CalcModalProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const dir = useDirection();
  const { currency } = useCurrency();
  const insets = useSafeAreaInsets();

  const [input, setInput] = useState("");
  const [items, setItems] = useState<number[]>(
    initialValue > 0 ? [initialValue] : []
  );

  useEffect(() => {
    if (visible) {
      setItems(initialValue > 0 ? [initialValue] : []);
      setInput("");
    }
  }, [visible, initialValue]);

  const total = items.reduce((sum, n) => sum + n, 0);

  function handleAdd() {
    const val = parseFloat(input.trim());
    if (!isNaN(val) && val > 0) {
      setItems((prev) => [...prev, val]);
      setInput("");
    }
  }

  function handleDeleteLast() {
    setItems((prev) => prev.slice(0, -1));
  }

  function handleClearAll() {
    setItems(initialValue > 0 ? [initialValue] : []);
    setInput("");
  }

  function handleInsert() {
    if (items.length > 0) {
      onInsert(total);
      setItems(initialValue > 0 ? [initialValue] : []);
      setInput("");
      onClose();
    }
  }

  function handleClose() {
    setItems(initialValue > 0 ? [initialValue] : []);
    setInput("");
    onClose();
  }

  const s = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: insets.bottom + 24,
      backgroundColor: colors.card,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#CBD5E1",
      alignSelf: "center",
      marginBottom: 18,
    },
    title: {
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: dir.textAlign,
      marginBottom: 16,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    inputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    textInput: {
      flex: 1,
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      textAlign: dir.textAlign,
      padding: 0,
      color: colors.foreground,
    },
    currency: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
      marginStart: 6,
    },
    addBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
      textAlign: dir.textAlign,
      marginBottom: 8,
    },
    itemsContainer: {
      backgroundColor: colors.secondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
      minHeight: 48,
    },
    emptyText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: dir.textAlign,
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: dir.isRTL ? "flex-end" : "flex-start",
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemText: {
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    totalValue: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
      color: colors.primary,
    },
    utilBtns: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    utilBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    utilBtnText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    insertBtn: {
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: items.length > 0 ? colors.primary : colors.border,
      alignItems: "center",
    },
    insertBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: items.length > 0 ? colors.primaryForeground : colors.mutedForeground,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalOverlay}
      >
        <Pressable style={s.modalBackdrop} onPress={handleClose} />

        <View style={s.sheet}>
          <View style={s.handle} />

          <Text style={s.title}>{t("calc.title")}</Text>

          {/* Input + Add Button */}
          <View style={s.inputRow}>
            <TouchableOpacity style={s.addBtn} onPress={handleAdd}>
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={s.inputWrapper}>
              <TextInput
                style={s.textInput}
                value={input}
                onChangeText={setInput}
                keyboardType="numeric"
                placeholder={t("calc.enter_amount")}
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                autoFocus
              />
              <Text style={s.currency}>{currency}</Text>
            </View>
          </View>

          {/* Items */}
          <Text style={s.sectionLabel}>{t("calc.items")}</Text>

          <View style={s.itemsContainer}>
            {items.length === 0 ? (
              <Text style={s.emptyText}>{t("calc.no_items")}</Text>
            ) : (
              items.map((item, index) => (
                <View key={index} style={s.itemRow}>
                  <Text style={s.itemText}>
                    {formatNumber(item, dir.locale)} {currency}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Total */}
          <View style={s.totalRow}>
            {dir.isRTL ? (
              <>
                <Text style={s.totalValue}>
                  {formatNumber(total, dir.locale)} {currency}
                </Text>
                <Text style={s.totalLabel}>{t("calc.total")}</Text>
              </>
            ) : (
              <>
                <Text style={s.totalLabel}>{t("calc.total")}</Text>
                <Text style={s.totalValue}>
                  {formatNumber(total, dir.locale)} {currency}
                </Text>
              </>
            )}
          </View>

          {/* Utility Buttons */}
          <View style={s.utilBtns}>
            <TouchableOpacity
              style={s.utilBtn}
              onPress={handleDeleteLast}
              disabled={items.length === 0}
            >
              <Text style={s.utilBtnText}>{t("calc.delete_last")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.utilBtn}
              onPress={handleClearAll}
              disabled={items.length === 0}
            >
              <Text style={s.utilBtnText}>{t("calc.clear_all")}</Text>
            </TouchableOpacity>
          </View>

          {/* Insert Button */}
          <TouchableOpacity
            style={s.insertBtn}
            onPress={handleInsert}
            disabled={items.length === 0}
          >
            <Text style={s.insertBtnText}>{t("calc.insert_total")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
