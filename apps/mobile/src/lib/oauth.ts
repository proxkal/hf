import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { API_URL, OAUTH_VERIFIER_KEY, useAuth } from './auth-store';
import { secureStorage } from './storage';

export type OAuthProvider = 'google' | 'linkedin';

const NATIVE_CALLBACK = 'hurden://oauth-callback';

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * Lance une connexion Google / LinkedIn.
 * L'app génère un secret, n'en envoie que l'empreinte, et le présentera au retour :
 * un lien de retour intercepté est donc inutilisable par quelqu'un d'autre.
 */
export async function startOAuth(provider: OAuthProvider): Promise<void> {
  const verifier = toHex(Crypto.getRandomBytes(32));
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await secureStorage.set(OAUTH_VERIFIER_KEY, verifier);

  const target = Platform.OS === 'web' ? 'web' : 'native';
  const url = `${API_URL}/auth/oauth/${provider}/start?challenge=${challenge}&target=${target}`;

  if (Platform.OS === 'web') {
    window.location.assign(url);
    return;
  }
  // iOS / Android : navigateur système sécurisé, retour par le lien hurden://
  const result = await WebBrowser.openAuthSessionAsync(url, NATIVE_CALLBACK);
  if (result.type !== 'success') return;
  const ticket = new URL(result.url).searchParams.get('ticket');
  if (!ticket) throw new Error('Connexion refusée');
  await useAuth.getState().completeOAuth(ticket);
}
