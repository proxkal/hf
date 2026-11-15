import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useMe } from '@/lib/queries';
import { colors, fonts, space } from '@/theme';
import { Button, P, Screen, Title } from '@/ui';

export default function Welcome() {
  const router = useRouter();
  const me = useMe();
  return (
    <Screen dark>
      <View style={styles.center}>
        <Title style={styles.title}>
          Bienvenue{me.data ? `, ${me.data.firstName}` : ''}
        </Title>
        <P style={styles.text}>
          Trois questions pour te montrer les coachs, les événements et les bons plans
          qui correspondent à ta recherche.
        </P>
      </View>
      <View style={styles.actions}>
        <Button label="Personnaliser mon profil" onPress={() => router.replace('/onboarding')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', gap: space.md },
  title: { color: colors.white, fontSize: 40, lineHeight: 50 },
  text: { color: colors.white, fontFamily: fonts.body, fontSize: 18, lineHeight: 27 },
  actions: { paddingBottom: space.lg },
});
