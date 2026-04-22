import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

export const colors = {
  bg: '#0b1220',
  surface: '#111a2b',
  card: '#18243b',
  border: '#263754',
  primary: '#d4af37',
  text: '#f8fafc',
  muted: '#9fb2d1',
  danger: '#ef4444',
}

export function ScreenContainer({ children }) {
  return <View style={styles.container}>{children}</View>
}

export function Card({ title, children }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  )
}

export function PGRLogo({ subtitle = 'Stock Control' }) {
  return (
    <View style={styles.logoWrap}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoInitials}>PGR</Text>
      </View>
      <Text style={styles.logoTitle}>PGR Premium</Text>
      <Text style={styles.logoSubtitle}>{subtitle}</Text>
    </View>
  )
}

export function AppButton({ label, onPress, disabled, variant = 'primary' }) {
  const buttonStyle = [styles.button, variant === 'danger' ? styles.buttonDanger : styles.buttonPrimary, disabled && styles.buttonDisabled]
  return (
    <Pressable style={buttonStyle} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  )
}

export function AppInput({ style, ...props }) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...props} />
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 14,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  button: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: '#111827',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 11,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: '#f7d778',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#13203a',
  },
  logoInitials: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f7d778',
  },
  logoTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  logoSubtitle: {
    color: colors.muted,
  },
})
