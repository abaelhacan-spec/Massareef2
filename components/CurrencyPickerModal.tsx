import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useDirection } from "@/hooks/useDirection";
import { useLanguage } from "@/lib/useLanguage";
import { useCurrency } from "@/lib/useCurrency";

// ─── قائمة العملات ───────────────────────────────────────────────────────────
export const CURRENCIES: { symbol: string; name: string; nameAr: string; nameFr: string }[] = [
  { symbol: "دج",  name: "Algerian Dinar",   nameAr: "دينار جزائري",    nameFr: "Dinar algérien" },
  { symbol: "د.م", name: "Moroccan Dirham",  nameAr: "درهم مغربي",      nameFr: "Dirham marocain" },
  { symbol: "د.ت", name: "Tunisian Dinar",   nameAr: "دينار تونسي",     nameFr: "Dinar tunisien" },
  { symbol: "ج.م", name: "Egyptian Pound",   nameAr: "جنيه مصري",       nameFr: "Livre égyptienne" },
  { symbol: "ر.س", name: "Saudi Riyal",      nameAr: "ريال سعودي",      nameFr: "Riyal saoudien" },
  { symbol: "د.إ", name: "UAE Dirham",       nameAr: "درهم إماراتي",    nameFr: "Dirham des EAU" },
  { symbol: "د.ك", name: "Kuwaiti Dinar",    nameAr: "دينار كويتي",     nameFr: "Dinar koweïtien" },
  { symbol: "ر.ق", name: "Qatari Riyal",     nameAr: "ريال قطري",       nameFr: "Riyal qatari" },
  { symbol: "ر.ع", name: "Omani Rial",       nameAr: "ريال عماني",      nameFr: "Rial omanais" },
  { symbol: "د.ب", name: "Bahraini Dinar",   nameAr: "دينار بحريني",    nameFr: "Dinar bahreïni" },
  { symbol: "ل.ل", name: "Lebanese Pound",   nameAr: "ليرة لبنانية",    nameFr: "Livre libanaise" },
  { symbol: "ل.س", name: "Syrian Pound",     nameAr: "ليرة سورية",      nameFr: "Livre syrienne" },
  { symbol: "د.ع", name: "Iraqi Dinar",      nameAr: "دينار عراقي",     nameFr: "Dinar irakien" },
  { symbol: "ر.ي", name: "Yemeni Rial",      nameAr: "ريال يمني",       nameFr: "Rial yéménite" },
  { symbol: "ج.س", name: "Sudanese Pound",   nameAr: "جنيه سوداني",     nameFr: "Livre soudanaise" },
  { symbol: "ل.د", name: "Libyan Dinar",     nameAr: "دينار ليبي",      nameFr: "Dinar libyen" },
  { symbol: "$",   name: "US Dollar",        nameAr: "دولار أمريكي",    nameFr: "Dollar américain" },
  { symbol: "€",   name: "Euro",             nameAr: "يورو",             nameFr: "Euro" },
  { symbol: "£",   name: "British Pound",    nameAr: "جنيه إسترليني",   nameFr: "Livre sterling" },
  { symbol: "¥",   name: "Japanese Yen",     nameAr: "ين ياباني",        nameFr: "Yen japonais" },
  { symbol: "Fr",  name: "Swiss Franc",      nameAr: "فرنك سويسري",     nameFr: "Franc suisse" },
  { symbol: "C$",  name: "Canadian Dollar",  nameAr: "دولار كندي",      nameFr: "Dollar canadien" },
  { symbol: "A$",  name: "Australian Dollar",nameAr: "دولار أسترالي",   nameFr: "Dollar australien" },
  { symbol: "₹",   name: "Indian Rupee",     nameAr: "روبية هندية",     nameFr: "Roupie indienne" },
  { symbol: "₺",   name: "Turkish Lira",     nameAr: "ليرة تركية",      nameFr: "Livre turque" },
  { symbol: "₽",   name: "Russian Ruble",    nameAr: "روبل روسي",       nameFr: "Rouble russe" },
  { symbol: "R",   name: "South African Rand",nameAr: "راند جنوب أفريقي",nameFr: "Rand sud-africain" },
  { symbol: "Br",  name: "Ethiopian Birr",   nameAr: "بير إثيوبي",      nameFr: "Birr éthiopien" },
  { symbol: "CFA", name: "CFA Franc",        nameAr: "فرنك أفريقي",     nameFr: "Franc CFA" },
  { symbol: "₱",   name: "Peso",             nameAr: "بيزو",             nameFr: "Peso" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CurrencyPickerModal({ visible, onClose }: Props) {
  const colors = useColors();
  const dir = useDirection();
  const { t, language } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  function getCurrencyName(item: typeof CURRENCIES[0]): string {
    if (language === "ar") return item.nameAr;
    if (language === "fr") return item.nameFr;
    return item.name;
  }

  const filtered = CURRENCIES.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.nameAr.includes(q) ||
      c.nameFr.toLowerCase().includes(q)
    );
  });

  async function handleSelect(symbol: string) {
    await setCurrency(symbol);
    onClose();
  }

  const NUM_COLUMNS = 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View
          style={[
            s.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Title */}
          <Text style={[s.title, { color: colors.foreground }]}>
            {t("settings.currency_select")}
          </Text>

          {/* Search */}
          <View
            style={[
              s.searchWrap,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                flexDirection: dir.flexRow,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[s.searchInput, { color: colors.foreground, textAlign: dir.textAlign }]}
              placeholder={t("settings.currency_search")}
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Grid */}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.symbol}
            numColumns={NUM_COLUMNS}
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={s.gridContent}
            renderItem={({ item }) => {
              const isSelected = item.symbol === currency;
              return (
                <TouchableOpacity
                  style={[
                    s.cell,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + "18"
                        : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(item.symbol)}
                >
                  <Text
                    style={[
                      s.cellSymbol,
                      { color: isSelected ? colors.primary : colors.foreground },
                    ]}
                  >
                    {item.symbol}
                  </Text>
                  <Text
                    style={[s.cellName, { color: colors.mutedForeground }]}
                    numberOfLines={2}
                  >
                    {getCurrencyName(item)}
                  </Text>
                  {isSelected && (
                    <View
                      style={[s.checkDot, { backgroundColor: colors.primary }]}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 0,
  },
  gridContent: {
    gap: 8,
    paddingBottom: 8,
  },
  cell: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
    position: "relative",
    minHeight: 72,
    justifyContent: "center",
  },
  cellSymbol: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  cellName: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 13,
  },
  checkDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
