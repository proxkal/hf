import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { API_URL } from '@/lib/auth-store';
import { type OAuthProvider, startOAuth } from '@/lib/oauth';
import { colors, fonts, radius, space } from '@/theme';

import { Muted, Notice } from './index';

const PROVIDERS: { id: OAuthProvider; label: string; mark: string; markColor: string }[] = [
  { id: 'google', label: 'Continuer avec Google', mark: 'G', markColor: '#4285F4' },
  { id: 'linkedin', label: 'Continuer avec LinkedIn', mark: 'in', markColor: '#0A66C2' },
];

/** Boutons Google / LinkedIn. Un fournisseur non configuré côté serveur reste désactivé. */
export function SocialButtons() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const providers = useQuery({
    queryKey: ['oauth-providers'],
    queryFn: () =>
      axios
        .get<Record<OAuthProvider, boolean>>(`${API_URL}/auth/oauth/providers`, { timeout: 10_000 })
        .then((response) => response.data),
    staleTime: 5 * 60_000,
  });

  const start = async (provider: OAuthProvider) => {
    setError(null);
    setPending(provider);
    try {
      await startOAuth(provider);
    } catch {
      setError('La connexion a échoué. Réessaie ou utilise ton e-mail.');
    } finally {
      setPending(null);
    }
  };

  const anyDisabled = PROVIDERS.some((p) => !providers.data?.[p.id]);

  return (
    <View style={styles.block}>
      <View style={styles.separator}>
        <View style={styles.line} />
        <Text style={styles.or}>ou</Text>
        <View style={styles.line} />
      </View>
      {PROVIDERS.map((provider) => {
        const enabled = !!providers.data?.[provider.id];
        return (
          <Pressable
            key={provider.id}
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled || pending !== null }}
            disabled={!enabled || pending !== null}
            onPress={() => start(provider.id)}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              !enabled && styles.disabled,
            ]}>
            <Text style={[styles.mark, { color: provider.markColor }]}>{provider.mark}</Text>
            <Text style={styles.label}>{provider.label}</Text>
          </Pressable>
        );
      })}
      {providers.data && anyDisabled ? (
        <Muted style={styles.hint}>Les connexions grisées seront bientôt disponibles.</Muted>
      ) : null}
      <Notice text={error} />
    </View>
  );
}

/** Case de consentement RGPD : jamais pré-cochée, liens vers les textes complets. */
export function TermsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <View style={styles.terms}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="J'accepte les conditions générales d'utilisation et la politique de confidentialité"
        onPress={() => onChange(!checked)}
        hitSlop={10}
        style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </Pressable>
      <Text style={styles.termsText}>
        J'accepte les{' '}
        <Link href="/legal/cgu" style={styles.link}>
          conditions générales d'utilisation
        </Link>{' '}
        et la{' '}
        <Link href="/legal/confidentialite" style={styles.link}>
          politique de confidentialité
        </Link>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  separator: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  button: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: space.lg,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4, borderColor: colors.border },
  mark: { fontFamily: fonts.bodyBold, fontSize: 18, width: 24, textAlign: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.black },
  hint: { fontSize: 13, textAlign: 'center' },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  box: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: colors.black,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  boxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  tick: { color: colors.white, fontSize: 16, lineHeight: 20, fontFamily: fonts.bodyBold },
  termsText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.black },
  link: { color: colors.blue, textDecorationLine: 'underline' },
});
