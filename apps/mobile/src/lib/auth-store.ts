import axios from 'axios';
import { create } from 'zustand';

import { secureStorage } from './storage';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000/api/v1';

/** Client sans intercepteur, réservé aux appels d'authentification. */
const authClient = axios.create({ baseURL: API_URL, timeout: 15_000 });

const REFRESH_KEY = 'hurden.refresh';
/** Secret temporaire d'une connexion Google / LinkedIn en cours. */
export const OAUTH_VERIFIER_KEY = 'hurden.oauth-verifier';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface AuthState {
  /** loading : session en cours de restauration au démarrage. */
  status: 'loading' | 'guest' | 'authed';
  /** Le jeton d'accès (15 min) ne vit qu'en mémoire. */
  accessToken: string | null;
  /** Vrai juste après une inscription : déclenche l'accueil et l'onboarding. */
  justRegistered: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    acceptTerms: boolean;
  }) => Promise<void>;
  /** Termine une connexion Google / LinkedIn avec le ticket reçu au retour. */
  completeOAuth: (ticket: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Renvoie un nouveau jeton d'accès, ou null si la session est perdue. */
  refresh: () => Promise<string | null>;
  clear: () => Promise<void>;
}

let refreshInFlight: Promise<string | null> | null = null;

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  accessToken: null,
  justRegistered: false,

  hydrate: async () => {
    const token = await get().refresh();
    if (!token) set({ status: 'guest' });
  },

  signIn: async (email, password) => {
    const { data } = await authClient.post('/auth/login', { email, password });
    await secureStorage.set(REFRESH_KEY, data.refreshToken);
    set({ status: 'authed', accessToken: data.accessToken, justRegistered: false });
  },

  signUp: async (input) => {
    const { data } = await authClient.post('/auth/register', input);
    await secureStorage.set(REFRESH_KEY, data.refreshToken);
    set({ status: 'authed', accessToken: data.accessToken, justRegistered: true });
  },

  completeOAuth: async (ticket) => {
    const verifier = await secureStorage.get(OAUTH_VERIFIER_KEY);
    await secureStorage.remove(OAUTH_VERIFIER_KEY);
    if (!verifier) throw new Error('Connexion expirée');
    const { data } = await authClient.post('/auth/oauth/exchange', { ticket, verifier });
    await secureStorage.set(REFRESH_KEY, data.refreshToken);
    set({ status: 'authed', accessToken: data.accessToken, justRegistered: false });
  },

  signOut: async () => {
    const refreshToken = await secureStorage.get(REFRESH_KEY);
    if (refreshToken) {
      await authClient.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    await get().clear();
  },

  // Un seul rafraîchissement à la fois : le jeton est à usage unique côté serveur.
  refresh: () => {
    refreshInFlight ??= (async () => {
      try {
        const refreshToken = await secureStorage.get(REFRESH_KEY);
        if (!refreshToken) return null;
        const { data } = await authClient.post('/auth/refresh', { refreshToken });
        await secureStorage.set(REFRESH_KEY, data.refreshToken);
        set({ status: 'authed', accessToken: data.accessToken });
        return data.accessToken as string;
      } catch (error) {
        // Session refusée par le serveur : on l'oublie. Panne réseau : on la garde.
        if (axios.isAxiosError(error) && error.response) await get().clear();
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  clear: async () => {
    await secureStorage.remove(REFRESH_KEY);
    set({ status: 'guest', accessToken: null, justRegistered: false });
  },
}));
