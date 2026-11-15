import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, space } from '@/theme';
import { Button, P, Screen } from '@/ui';

export default function Landing() {
  const router = useRouter();
  return (
    <Screen dark>
      <View style={styles.hero}>
        <View style={styles.logoFrame}>
          <Image
            source={require('@/assets/images/logo-on-black.png')}
            style={styles.logo}
            contentFit="cover"
            accessibilityLabel="HURDEN — Agir pour Réussir !"
          />
        </View>
        <P style={styles.pitch}>
          Des coachs qui connaissent le recrutement que tu vises, des événements et des
          bons plans autour de toi.
        </P>
      </View>
      <View style={styles.actions}>
        <Button label="Créer un compte" onPress={() => router.push('/register')} />
        <Button
          label="J'ai déjà un compte"
          variant="inverse"
          onPress={() => router.push('/login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  // Le visuel fourni a un liseré clair : on le rogne en agrandissant l'image dans son cadre.
  logoFrame: { width: 300, height: 170, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 400, height: 305 },
  pitch: {
    color: colors.white,
    textAlign: 'center',
    fontFamily: fonts.brandItalic,
    fontSize: 19,
    lineHeight: 28,
    maxWidth: 420,
  },
  actions: { gap: space.md, paddingBottom: space.lg },
});
