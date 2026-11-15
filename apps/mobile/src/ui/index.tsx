import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, maxWidth, radius, space, typeScale } from '@/theme';

/** Page plein écran, contenu centré et limité en largeur sur grand écran. */
export function Screen({
  children,
  dark,
  scroll = true,
}: {
  children: ReactNode;
  dark?: boolean;
  scroll?: boolean;
}) {
  const background = dark ? colors.black : colors.white;
  const body = <View style={styles.body}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Title({ style, ...props }: TextProps) {
  return <Text accessibilityRole="header" style={[styles.title, style]} {...props} />;
}

export function Heading({ style, ...props }: TextProps) {
  return <Text accessibilityRole="header" style={[styles.heading, style]} {...props} />;
}

export function P({ style, ...props }: TextProps) {
  return <Text style={[styles.p, style]} {...props} />;
}

export function Muted({ style, ...props }: TextProps) {
  return <Text style={[styles.p, styles.muted, style]} {...props} />;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'inverse' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}) {
  const inactive = disabled || loading;
  const textColor =
    variant === 'secondary'
      ? colors.black
      : variant === 'inverse'
        ? colors.black
        : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

export function Card({
  children,
  onPress,
  selected,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewProps['style'];
}) {
  const cardStyle = [styles.card, selected && styles.cardSelected, style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function Tag({ label, tone = 'grey' }: { label: string; tone?: 'grey' | 'blue' | 'black' }) {
  const toneStyle =
    tone === 'blue' ? styles.tagBlue : tone === 'black' ? styles.tagBlack : null;
  return (
    <View style={[styles.tag, toneStyle]}>
      <Text style={[styles.tagLabel, tone !== 'grey' && { color: colors.white }]}>
        {label}
      </Text>
    </View>
  );
}

export function Notice({ text, tone = 'error' }: { text?: string | null; tone?: 'error' | 'success' | 'info' }) {
  if (!text) return null;
  const color =
    tone === 'error' ? colors.danger : tone === 'success' ? colors.success : colors.black;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { borderColor: color }]}>
      <Text style={[styles.p, { color }]}>{text}</Text>
    </View>
  );
}

/** États de chargement, d'erreur et de liste vide d'une requête. */
export function QueryState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
  onRetry?: () => void;
}) {
  if (loading) return <ActivityIndicator color={colors.black} style={styles.loader} />;
  if (error) {
    return (
      <View style={styles.stack}>
        <Notice text={error} />
        {onRetry ? <Button label="Réessayer" variant="secondary" onPress={onRetry} /> : null}
      </View>
    );
  }
  if (empty) return <Muted style={styles.loader}>{emptyText}</Muted>;
  return null;
}

export const Stack = ({ children, gap = space.md }: { children: ReactNode; gap?: number }) => (
  <View style={{ gap }}>{children}</View>
);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  body: {
    flex: 1,
    width: '100%',
    maxWidth,
    alignSelf: 'center',
    padding: space.md,
    gap: space.md,
  },
  stack: { gap: space.md },
  title: { ...typeScale.title, color: colors.black },
  heading: { ...typeScale.heading, color: colors.black },
  p: { ...typeScale.body, color: colors.black },
  muted: { color: colors.muted },
  button: {
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: { backgroundColor: colors.blue },
  button_secondary: { backgroundColor: colors.grey },
  button_inverse: { backgroundColor: colors.white },
  button_danger: { backgroundColor: colors.danger },
  buttonLabel: { fontFamily: fonts.semibold, fontSize: 16, letterSpacing: -0.1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  inactive: { opacity: 0.45 },
  field: { gap: space.xs },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
  input: {
    minHeight: 52,
    borderWidth: 0,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.black,
    backgroundColor: colors.grey,
  },
  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 38,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.grey,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.black },
  chipLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  chipLabelSelected: { color: colors.white, fontFamily: fonts.semibold },
  card: {
    borderWidth: 1,
    borderColor: colors.grey,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    backgroundColor: colors.white,
  },
  cardSelected: { borderColor: colors.blue, borderWidth: 2 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.grey,
  },
  tagBlue: { backgroundColor: colors.blue },
  tagBlack: { backgroundColor: colors.black },
  tagLabel: { ...typeScale.overline, fontSize: 11, letterSpacing: 0.8, color: colors.black },
  notice: { borderWidth: 1, borderRadius: radius.sm, padding: space.md },
  loader: { marginVertical: space.lg, textAlign: 'center' },
});
