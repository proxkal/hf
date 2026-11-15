import { useQuery } from '@tanstack/react-query';

import {
  api,
  type Association,
  type Booking,
  type CoachDetail,
  type CoachSummary,
  type Deal,
  type DealCategory,
  type EventItem,
  type Me,
} from './api';

export interface Near {
  lat: number;
  lng: number;
  radiusKm: number;
}

const get = <T>(url: string, params?: object) =>
  api.get<T>(url, { params }).then((response) => response.data);

export const useMe = (enabled = true) =>
  useQuery({ queryKey: ['me'], queryFn: () => get<Me>('/me'), enabled });

export const useCoaches = (near: Near) =>
  useQuery({
    queryKey: ['coaches', near],
    queryFn: () => get<CoachSummary[]>('/coaches', near),
  });

export const useCoach = (id: string) =>
  useQuery({
    queryKey: ['coach', id],
    queryFn: () => get<CoachDetail>(`/coaches/${id}`),
  });

export const useEvents = (near: Near) =>
  useQuery({
    queryKey: ['events', near],
    queryFn: () => get<EventItem[]>('/events', near),
  });

export const useEvent = (id: string) =>
  useQuery({
    queryKey: ['event', id],
    queryFn: () => get<EventItem>(`/events/${id}`),
  });

export const useAssociations = () =>
  useQuery({
    queryKey: ['associations'],
    queryFn: () => get<Association[]>('/associations'),
  });

export const useDeals = (category: DealCategory | null) =>
  useQuery({
    queryKey: ['deals', category],
    queryFn: () => get<Deal[]>('/deals', category ? { category } : undefined),
  });

export const useBookings = () =>
  useQuery({ queryKey: ['bookings'], queryFn: () => get<Booking[]>('/bookings') });

/** Toulouse, place du Capitole : centre par défaut, la ville pilote. */
export const TOULOUSE = { lat: 43.6045, lng: 1.444 };
