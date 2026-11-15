import { Arsenal_400Regular, Arsenal_700Bold } from '@expo-google-fonts/arsenal';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth-store';
import { useMe } from '@/lib/queries';
import { colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Écrans réservés aux visiteurs non connectés. */
const GUEST_ROUTES = new Set<string | undefined>([
  undefined,
  'login',
  'register',
  'oauth-callback',
]);
/** Écrans accessibles à tous, connecté ou non (textes légaux). */
const OPEN_ROUTES = new Set<string | undefined>(['legal']);

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
      }),
  );
  const [fontsLoaded] = useFonts({
    Arsenal_400Regular,
    Arsenal_700Bold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
  });
  const status = useAuth((state) => state.status);
  const hydrate = useAuth((state) => state.hydrate);
  const ready = fontsLoaded && status !== 'loading';

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <NavigationGuard />
      <Stack
        screenOptions={{
          headerTintColor: colors.black,
          headerTitleStyle: { fontFamily: fonts.bodyBold },
          headerBackTitle: 'Retour',
          contentStyle: { backgroundColor: colors.white },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Connexion' }} />
        <Stack.Screen name="register" options={{ title: 'Créer un compte' }} />
        <Stack.Screen name="oauth-callback" options={{ headerShown: false }} />
        <Stack.Screen name="consent" options={{ title: 'Tes données', headerBackVisible: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Ton profil' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="coach/[id]" options={{ title: 'Coach' }} />
        <Stack.Screen name="event/[id]" options={{ title: 'Événement' }} />
        <Stack.Screen name="legal/cgu" options={{ title: 'CGU' }} />
        <Stack.Screen name="legal/confidentialite" options={{ title: 'Confidentialité' }} />
        <Stack.Screen name="explore" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

/**
 * Garde de navigation :
 * - visiteur sur un écran protégé → accueil ;
 * - connecté sans consentement aux CGU en vigueur → écran de consentement (RGPD) ;
 * - connecté sur un écran visiteur → carte (ou accueil personnalisé si le profil est vide).
 */
function NavigationGuard() {
  const status = useAuth((state) => state.status);
  const justRegistered = useAuth((state) => state.justRegistered);
  const segments = useSegments();
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe(status === 'authed');
  const route = segments[0];

  useEffect(() => {
    if (OPEN_ROUTES.has(route)) return;
    if (status === 'guest') {
      if (!GUEST_ROUTES.has(route)) {
        queryClient.clear();
        router.replace('/');
      }
      return;
    }
    if (status !== 'authed' || !me.data) return;

    if (!me.data.termsUpToDate) {
      if (route !== 'consent') router.replace('/consent');
      return;
    }
    if (GUEST_ROUTES.has(route) || route === 'consent') {
      const isNew = justRegistered || !me.data.studentProfile;
      router.replace(isNew ? '/welcome' : '/carte');
    }
  }, [status, justRegistered, route, me.data, router, queryClient]);

  return null;
}
