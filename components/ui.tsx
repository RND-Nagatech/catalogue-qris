import { Ionicons } from "@expo/vector-icons";
import { type BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type AppTheme, useAppTheme } from "../lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  rightBadge?: number | string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  showThemeToggle?: boolean;
  topInset?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({
  title,
  subtitle,
  leftIcon = "menu-outline",
  rightIcon,
  rightBadge,
  onLeftPress,
  onRightPress,
  showThemeToggle = true,
  topInset = 0,
  style,
}: AppHeaderProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.divider,
          minHeight: theme.components.headerHeight + topInset,
          paddingTop: topInset,
        },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.headerIconButton,
          { opacity: pressed ? 0.72 : 1 },
        ]}
        onPress={onLeftPress}
      >
        <Ionicons name={leftIcon} size={24} color={theme.colors.primary} />
      </Pressable>

      <View style={styles.headerTitleWrap}>
        <Text style={[theme.typography.title, styles.headerTitle, { color: theme.colors.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.headerActions}>
        {showThemeToggle ? (
          <Pressable accessibilityRole="button" style={styles.headerIconButton} onPress={theme.toggleTheme}>
            <Ionicons name={theme.isDark ? "sunny-outline" : "moon-outline"} size={23} color={theme.colors.primary} />
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable accessibilityRole="button" style={styles.headerIconButton} onPress={onRightPress}>
            <Ionicons name={rightIcon} size={22} color={theme.colors.primary} />
            {rightBadge !== undefined ? (
              <View style={[styles.headerBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text style={[styles.headerBadgeText, { color: theme.colors.onSecondaryContainer }]}>{rightBadge}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function createBottomTabScreenOptions(theme: AppTheme, bottomInset = 0): BottomTabNavigationOptions {
  const fallbackBottom = Platform.OS === "android" ? 18 : 10;
  const safeBottom = Math.max(bottomInset, fallbackBottom);
  const tabHeight = 64 + safeBottom;

  return {
    headerShown: false,
    headerStyle: { backgroundColor: theme.colors.background },
    headerTitleStyle: { ...theme.typography.titleSmall, color: theme.colors.text },
    headerShadowVisible: false,
    sceneStyle: { backgroundColor: theme.colors.background },
    tabBarActiveTintColor: theme.colors.bottomNavActive,
    tabBarInactiveTintColor: theme.colors.bottomNavInactive,
    tabBarActiveBackgroundColor: "transparent",
    tabBarHideOnKeyboard: true,
    tabBarItemStyle: {
      borderRadius: theme.radius.md,
      marginHorizontal: 4,
      marginVertical: 4,
      paddingTop: 0,
    },
    tabBarLabelStyle: { fontSize: 10, fontWeight: "700", lineHeight: 14 },
    tabBarStyle: {
      backgroundColor: theme.colors.bottomNavBackground,
      borderTopColor: theme.colors.divider,
      height: tabHeight,
      paddingBottom: safeBottom,
      paddingTop: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: theme.isDark ? 0.18 : 0.06,
      shadowRadius: 18,
      elevation: 8,
    },
  };
}

export type BottomNavItem = {
  key: string;
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  active?: boolean;
  badge?: number | string;
  onPress: () => void;
};

export function AppBottomNavigation({
  items,
  style,
}: {
  items: BottomNavItem[];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: theme.colors.bottomNavBackground,
          borderTopColor: theme.colors.divider,
          minHeight: theme.components.bottomTabHeight + Math.max(insets.bottom - 10, 0),
          paddingBottom: Math.max(insets.bottom, 10),
        },
        style,
      ]}
    >
      {items.map((item) => {
        const color = item.active ? theme.colors.bottomNavActive : theme.colors.bottomNavInactive;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.bottomNavItem,
              pressed && { opacity: 0.76 },
            ]}
            onPress={item.onPress}
          >
            <View>
              <Ionicons name={item.active ? item.activeIcon ?? item.icon : item.icon} size={24} color={color} />
              {item.badge !== undefined ? (
                <View style={[styles.bottomNavBadge, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={[styles.headerBadgeText, { color: theme.colors.onSecondaryContainer }]}>{item.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[theme.typography.labelSmall, { color }]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CardContainer({
  children,
  padded = true,
  style,
}: {
  children: ReactNode;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.cardBackground,
          borderColor: theme.colors.cardBorder,
          borderRadius: theme.components.cardRadius,
        },
        styles.card,
        theme.elevation.level1,
        padded && { padding: theme.spacing.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type AppButtonProps = {
  title: string;
  icon?: IconName;
  iconColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PrimaryButton(props: AppButtonProps) {
  const theme = useAppTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor={theme.colors.buttonPrimary}
      borderColor={theme.colors.buttonPrimary}
      color={theme.colors.onPrimary}
      pressedColor={theme.colors.primary}
    />
  );
}

export function SecondaryButton(props: AppButtonProps) {
  const theme = useAppTheme();
  return (
    <ButtonBase
      {...props}
      backgroundColor={theme.colors.surfaceContainerLowest}
      borderColor={theme.colors.outlineVariant}
      color={theme.colors.text}
      pressedColor={theme.colors.surfaceContainerLow}
    />
  );
}

function ButtonBase({
  title,
  icon,
  iconColor,
  onPress,
  disabled,
  loading,
  fullWidth,
  style,
  textStyle,
  backgroundColor,
  borderColor,
  color,
  pressedColor,
}: AppButtonProps & { backgroundColor: string; borderColor: string; color: string; pressedColor: string }) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && !isDisabled ? pressedColor : backgroundColor,
          borderColor,
          borderRadius: theme.components.controlRadius,
          minHeight: theme.components.buttonHeight,
          opacity: isDisabled ? 0.48 : 1,
          width: fullWidth ? "100%" : undefined,
        },
        style,
      ]}
      onPress={onPress}
    >
      {loading ? <ActivityIndicator color={color} /> : icon ? <Ionicons name={icon} size={19} color={iconColor ?? color} /> : null}
      <Text style={[theme.typography.label, { color }, textStyle]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

type AppTextFieldProps = TextInputProps & {
  label?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AppTextField({
  label,
  leftIcon,
  rightIcon,
  onRightPress,
  containerStyle,
  style,
  placeholderTextColor,
  editable = true,
  ...inputProps
}: AppTextFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      {label ? <Text style={[theme.typography.labelCaps, { color: theme.colors.subtleText }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: editable ? theme.colors.inputBackground : theme.colors.surfaceContainerLow,
            borderColor: theme.colors.inputBorder,
            borderRadius: theme.components.controlRadius,
            minHeight: theme.components.inputHeight,
          },
        ]}
      >
        {leftIcon ? <Ionicons name={leftIcon} size={19} color={theme.colors.subtleText} /> : null}
        <TextInput
          {...inputProps}
          editable={editable}
          placeholderTextColor={placeholderTextColor ?? theme.colors.subtleText}
          style={[theme.typography.body, styles.input, { color: theme.colors.text }, style]}
        />
        {rightIcon ? (
          <Pressable accessibilityRole="button" onPress={onRightPress} disabled={!onRightPress}>
            <Ionicons name={rightIcon} size={20} color={theme.colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function SearchField(props: Omit<AppTextFieldProps, "leftIcon">) {
  return <AppTextField {...props} leftIcon="search-outline" />;
}

export function EmptyState({
  title,
  description,
  icon = "cube-outline",
  action,
  style,
}: {
  title: string;
  description?: string;
  icon?: IconName;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <CardContainer style={[styles.stateCard, style]}>
      <View style={[styles.stateIconWrap, { backgroundColor: theme.colors.surfaceContainer }]}>
        <Ionicons name={icon} size={34} color={theme.colors.subtleText} />
      </View>
      <Text style={[theme.typography.titleSmall, styles.stateTitle, { color: theme.colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[theme.typography.bodySmall, styles.stateDescription, { color: theme.colors.subtleText }]}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.stateAction}>{action}</View> : null}
    </CardContainer>
  );
}

export function LoadingState({
  title = "Memuat data...",
  description,
  style,
}: {
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();

  return (
    <CardContainer style={[styles.stateCard, style]}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={[theme.typography.label, styles.stateTitle, { color: theme.colors.text }]}>{title}</Text>
      {description ? (
        <Text style={[theme.typography.bodySmall, styles.stateDescription, { color: theme.colors.subtleText }]}>
          {description}
        </Text>
      ) : null}
    </CardContainer>
  );
}

type BadgeVariant = "success" | "warning" | "danger" | "neutral" | "info";

export function StatusBadge({
  label,
  variant = "neutral",
  icon,
  style,
}: {
  label: string;
  variant?: BadgeVariant;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const colors = getBadgeColors(theme, variant);

  return (
    <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }, style]}>
      {icon ? <Ionicons name={icon} size={13} color={colors.text} /> : null}
      <Text style={[theme.typography.labelSmall, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function DynamicFeatureChips({
  title = "Fitur aktif",
  features,
  maxVisible = 6,
  style,
}: {
  title?: string;
  features: { key: string; label: string; group: string; enabled: boolean }[];
  maxVisible?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useAppTheme();
  const visibleFeatures = features.filter((feature) => feature.enabled).slice(0, maxVisible);
  if (!visibleFeatures.length) return null;

  return (
    <View style={[styles.featurePanel, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }, style]}>
      <Text style={[theme.typography.labelCaps, { color: theme.colors.subtleText }]}>{title}</Text>
      <View style={styles.featureChipWrap}>
        {visibleFeatures.map((feature) => (
          <View key={`${feature.group}-${feature.key}`} style={[styles.featureChip, { backgroundColor: theme.colors.successContainer, borderColor: theme.colors.primary }]}>
            <Text style={[theme.typography.labelSmall, { color: theme.colors.primary }]} numberOfLines={1}>
              {feature.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getBadgeColors(theme: AppTheme, variant: BadgeVariant) {
  switch (variant) {
    case "success":
      return { background: theme.colors.successContainer, border: theme.colors.success, text: theme.colors.success };
    case "warning":
      return { background: theme.colors.warningContainer, border: theme.colors.warning, text: theme.colors.warning };
    case "danger":
      return { background: theme.colors.errorContainer, border: theme.colors.error, text: theme.colors.error };
    case "info":
      return { background: theme.colors.infoContainer, border: theme.colors.info, text: theme.colors.info };
    default:
      return {
        background: theme.colors.surfaceContainer,
        border: theme.colors.outlineVariant,
        text: theme.colors.subtleText,
      };
  }
}

export type BottomSheetOption<T extends string = string> = {
  label: string;
  value: T;
  description?: string;
  icon?: IconName;
};

export function BottomSheetDropdown<T extends string = string>({
  label,
  value,
  placeholder = "Pilih data",
  options,
  onChange,
  disabled,
  title,
  searchable = false,
}: {
  label?: string;
  value?: T;
  placeholder?: string;
  options: BottomSheetOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  title?: string;
  searchable?: boolean;
}) {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [options, query]);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        style={({ pressed }) => [
          styles.dropdownField,
          {
            backgroundColor: theme.colors.inputBackground,
            borderColor: theme.colors.inputBorder,
            borderRadius: theme.components.controlRadius,
            opacity: disabled ? 0.48 : 1,
          },
          pressed && !disabled && { backgroundColor: theme.colors.surfaceContainerLow },
        ]}
        onPress={() => setVisible(true)}
      >
        <View style={styles.dropdownTextWrap}>
          {label ? <Text style={[theme.typography.labelCaps, { color: theme.colors.subtleText }]}>{label}</Text> : null}
          <Text
            style={[theme.typography.body, { color: selected ? theme.colors.text : theme.colors.subtleText }]}
            numberOfLines={1}
          >
            {selected?.label ?? placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down-outline" size={20} color={theme.colors.subtleText} />
      </Pressable>

      <BottomSheet visible={visible} title={title ?? label ?? placeholder} onClose={() => setVisible(false)}>
        {searchable ? (
          <SearchField
            value={query}
            onChangeText={setQuery}
            placeholder="Cari data..."
            containerStyle={{ marginBottom: theme.spacing.md }}
          />
        ) : null}
        {filteredOptions.length ? (
          filteredOptions.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: active ? theme.colors.successContainer : theme.colors.surfaceContainerLowest,
                    borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
                    borderRadius: theme.components.controlRadius,
                  },
                  pressed && { backgroundColor: theme.colors.surfaceContainerLow },
                ]}
                onPress={() => {
                  onChange(option.value);
                  setVisible(false);
                  setQuery("");
                }}
              >
                {option.icon ? <Ionicons name={option.icon} size={20} color={theme.colors.primary} /> : null}
                <View style={styles.optionTextWrap}>
                  <Text style={[theme.typography.label, { color: theme.colors.text }]}>{option.label}</Text>
                  {option.description ? (
                    <Text style={[theme.typography.bodySmall, { color: theme.colors.subtleText }]}>
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {active ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
              </Pressable>
            );
          })
        ) : (
          <EmptyState title="Data tidak ditemukan" description="Coba gunakan kata kunci lain." icon="search-outline" />
        )}
      </BottomSheet>
    </>
  );
}

export function BottomSheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={[styles.sheetOverlay, { backgroundColor: theme.colors.scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceContainerLowest,
              borderColor: theme.colors.outlineVariant,
              paddingBottom: Math.max(insets.bottom, theme.spacing.md),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: theme.colors.outlineVariant }]} />
          <View style={styles.sheetHeader}>
            <Text style={[theme.typography.title, { color: theme.colors.text }]}>{title}</Text>
            <Pressable accessibilityRole="button" style={styles.headerIconButton} onPress={onClose}>
              <Ionicons name="close-outline" size={26} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  headerBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: 1,
    top: 1,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  headerIconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    fontSize: 22,
    flexShrink: 1,
    lineHeight: 30,
  },
  headerTitleWrap: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
  },
  button: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputWrap: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
  },
  stateAction: {
    marginTop: 16,
    width: "100%",
  },
  stateCard: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  stateDescription: {
    marginTop: 6,
    maxWidth: 280,
    textAlign: "center",
  },
  stateIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    marginBottom: 14,
    width: 64,
  },
  stateTitle: {
    marginTop: 10,
    textAlign: "center",
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
  },
  featurePanel: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  featureChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureChip: {
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bottomNav: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  bottomNavBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 17,
    justifyContent: "center",
    minWidth: 17,
    paddingHorizontal: 4,
    position: "absolute",
    right: -8,
    top: -6,
  },
  bottomNavItem: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    marginHorizontal: 2,
    minHeight: 56,
    paddingHorizontal: 6,
  },
  dropdownField: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  dropdownTextWrap: {
    flex: 1,
    gap: 3,
  },
  optionRow: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "86%",
    overflow: "hidden",
    width: "100%",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 5,
    marginTop: 10,
    width: 54,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
