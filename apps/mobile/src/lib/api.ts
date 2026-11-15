import axios, { type InternalAxiosRequestConfig } from 'axios';

import { API_URL, useAuth } from './auth-store';

export const api = axios.create({ baseURL: API_URL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Jeton d'accès expiré : on le renouvelle une fois, puis on rejoue la requête.
api.interceptors.response.use(undefined, async (error) => {
  const config = error.config as
    | (InternalAxiosRequestConfig & { _retried?: boolean })
    | undefined;
  if (error.response?.status === 401 && config && !config._retried) {
    config._retried = true;
    const token = await useAuth.getState().refresh();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    }
  }
  return Promise.reject(error);
});

/** Message lisible pour l'utilisateur à partir d'une erreur d'appel API. */
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Connexion au serveur impossible. Vérifie ta connexion et réessaie.';
    }
    if (error.response.status === 429) {
      return 'Trop de tentatives. Patiente une minute avant de réessayer.';
    }
    const message = error.response.data?.message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return 'Une erreur est survenue. Réessaie dans un instant.';
}

export interface Me {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  role: string;
  /** Faux tant que les CGU en vigueur n'ont pas été acceptées. */
  termsUpToDate: boolean;
  /** Faux pour un compte créé uniquement via Google ou LinkedIn. */
  hasPassword: boolean;
  studentProfile: StudentProfile | null;
}

export interface StudentProfile {
  domain: string;
  keywords: string[];
  contractType: 'STAGE' | 'ALTERNANCE' | 'BOTH';
  cities: string[];
  radiusKm: number;
}

export interface CoachSummary {
  id: string;
  displayName: string;
  headline: string;
  domains: string[];
  knownProcesses: string[];
  city: string;
  lat: number;
  lng: number;
  offersVisio: boolean;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number;
  fromPriceCents: number | null;
}

export interface CoachOffer {
  id: string;
  title: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
}

export interface CoachDetail extends Omit<CoachSummary, 'distanceKm' | 'fromPriceCents'> {
  bio: string;
  offers: CoachOffer[];
}

export type EventType =
  | 'MEETUP'
  | 'CONFERENCE'
  | 'JOB_DATING'
  | 'WORKSHOP'
  | 'NETWORKING';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  type: EventType;
  organizerName: string;
  association: { id: string; name: string } | null;
  startsAt: string;
  endsAt: string;
  venue: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  capacity: number | null;
  priceCents: number;
  registered: boolean;
  seatsLeft: number | null;
  distanceKm?: number;
}

export interface Association {
  id: string;
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  membershipFeeCents: number | null;
  needsVolunteers: boolean;
  mediaKey: string | null;
  requested: boolean;
}

export type DealCategory = 'BANK' | 'INSURANCE' | 'HOUSING' | 'FOOD' | 'DISCOUNT';

export interface Deal {
  id: string;
  partnerName: string;
  category: DealCategory;
  title: string;
  description: string;
  highlight: string | null;
  city: string | null;
}

export interface Booking {
  id: string;
  startsAt: string;
  durationMin: number;
  priceCents: number;
  mode: 'IN_PERSON' | 'VISIO';
  status: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  offer: { title: string };
  coach: { id: string; displayName: string; city: string };
}

export const EVENT_LABELS: Record<EventType, string> = {
  MEETUP: 'Meet-up',
  CONFERENCE: 'Conférence',
  JOB_DATING: 'Job dating',
  WORKSHOP: 'Atelier',
  NETWORKING: 'Réseautage',
};

export const DEAL_LABELS: Record<DealCategory, string> = {
  BANK: 'Banques',
  INSURANCE: 'Mutuelles',
  HOUSING: 'Logement',
  FOOD: 'Alimentation',
  DISCOUNT: 'Réductions',
};

export const BOOKING_LABELS: Record<Booking['status'], string> = {
  REQUESTED: 'Demande envoyée',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export const euros = (cents: number) =>
  cents === 0
    ? 'Gratuit'
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
      }).format(cents / 100);

export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
