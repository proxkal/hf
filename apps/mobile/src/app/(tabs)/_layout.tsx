import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors, fonts } from '@/theme';

const icon = (glyph: string) =>
  function TabIcon({ color }: { color: unknown }) {
    return (
      <Text style={{ color: color as string, fontSize: 20 }} accessibilityElementsHidden importantForAccessibility="no">
        {glyph}
      </Text>
    );
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.2 },
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 10,
          borderTopColor: colors.grey,
        },
        headerTitleStyle: { fontFamily: fonts.title, fontSize: 24, letterSpacing: -0.6 },
        headerShadowVisible: false,
        headerTintColor: colors.black,
        sceneStyle: { backgroundColor: colors.white },
      }}>
      <Tabs.Screen name="carte" options={{ title: 'Carte', tabBarIcon: icon('◎') }} />
      <Tabs.Screen name="activites" options={{ title: 'Activités', tabBarIcon: icon('✦') }} />
      <Tabs.Screen name="bons-plans" options={{ title: 'Bons plans', tabBarIcon: icon('%') }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil', tabBarIcon: icon('☻') }} />
    </Tabs>
  );
}
