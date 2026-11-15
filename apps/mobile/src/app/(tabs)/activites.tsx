import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { api, type Association, errorMessage, euros } from '@/lib/api';
import { ASSOCIATION_MEDIA } from '@/lib/association-media';
import { TOULOUSE, useAssociations, useEvents } from '@/lib/queries';
import { colors, fonts, radius, space } from '@/theme';
import {
  Button,
  Card,
  Chip,
  ChipRow,
  Heading,
  Muted,
  Notice,
  P,
  QueryState,
  Screen,
  Tag,
} from '@/ui';

import { EventCard } from './carte';

export default function Activites() {
  const router = useRouter();
  const [tab, setTab] = useState<'events' | 'associations'>('events');
  const events = useEvents({ ...TOULOUSE, radiusKm: 30 });
  const associations = useAssociations();

  return (
    <Screen>
      <ChipRow>
        <Chip label="Événements" selected={tab === 'events'} onPress={() => setTab('events')} />
        <Chip
          label="Associations"
          selected={tab === 'associations'}
          onPress={() => setTab('associations')}
        />
      </ChipRow>

      {tab === 'events' ? (
        <>
          <Muted>
            Meet-ups, conférences et job datings : le réseau se construit en vrai.
          </Muted>
          <QueryState
            loading={events.isPending}
            error={events.error ? errorMessage(events.error) : null}
            empty={events.data?.length === 0}
            emptyText="Aucun événement à venir pour le moment."
            onRetry={events.refetch}
          />
          {events.data?.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onPress={() => router.push(`/event/${event.id}`)}
            />
          ))}
        </>
      ) : (
        <>
          <Muted>
            S'engager dans une association développe ton réseau et tes soft skills.
          </Muted>
          <QueryState
            loading={associations.isPending}
            error={associations.error ? errorMessage(associations.error) : null}
            empty={associations.data?.length === 0}
            emptyText="Aucune association référencée pour le moment."
            onRetry={associations.refetch}
          />
          {associations.data?.map((association) => (
            <AssociationCard key={association.id} association={association} />
          ))}
        </>
      )}
    </Screen>
  );
}

function AssociationCard({ association }: { association: Association }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post(`/associations/${association.id}/membership-request`);
      await queryClient.invalidateQueries({ queryKey: ['associations'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const media = association.mediaKey ? ASSOCIATION_MEDIA[association.mediaKey] : undefined;
  const initials = association.name.slice(0, 2).toUpperCase();

  return (
    <Card style={styles.card}>
      {/* En-tête façon page LinkedIn : bannière rectangulaire, logo en médaillon à gauche. */}
      <View style={styles.header}>
        {media ? (
          <Image
            source={media.banner}
            style={styles.banner}
            contentFit="cover"
            contentPosition={{ top: '30%', left: '50%' }}
            accessibilityLabel={media.bannerAlt}
          />
        ) : (
          <View style={[styles.banner, styles.bannerEmpty]} />
        )}
        <View style={styles.logoFrame}>
          {media ? (
            <Image
              source={media.logo}
              style={styles.logo}
              contentFit="contain"
              accessibilityLabel={`Logo de ${association.name}`}
            />
          ) : (
            <Text style={styles.initials}>{initials}</Text>
          )}
        </View>
      </View>
      <View style={styles.body}>
      {association.needsVolunteers ? <Tag label="Recherche des bénévoles" /> : null}
      <Heading>{association.name}</Heading>
      <P>{association.tagline}</P>
      <Muted>{association.description}</Muted>
      <Muted>
        {association.address}, {association.city}
        {association.membershipFeeCents !== null
          ? ` · cotisation indicative ${euros(association.membershipFeeCents)} / an`
          : ''}
      </Muted>
      <Notice text={error} />
      {association.requested ? (
        <Notice
          tone="success"
          text="Demande enregistrée. L'association te recontactera."
        />
      ) : (
        <Button label="Adhérer" onPress={join} loading={loading} />
      )}
      </View>
    </Card>
  );
}

const LOGO_SIZE = 84;

const styles = StyleSheet.create({
  card: { padding: 0, gap: 0, overflow: 'hidden' },
  header: { marginBottom: LOGO_SIZE / 2 },
  banner: { width: '100%', aspectRatio: 3, backgroundColor: colors.grey },
  bannerEmpty: { backgroundColor: colors.black },
  logoFrame: {
    position: 'absolute',
    left: space.md,
    bottom: -LOGO_SIZE / 2,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: '100%', height: '100%' },
  initials: { fontFamily: fonts.title, fontSize: 28, color: colors.black },
  body: { padding: space.md, paddingTop: space.sm, gap: space.sm },
});
