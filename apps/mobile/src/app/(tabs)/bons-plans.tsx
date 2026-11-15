import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import {
  api,
  type Deal,
  DEAL_LABELS,
  type DealCategory,
  errorMessage,
} from '@/lib/api';
import { useDeals } from '@/lib/queries';
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

const CATEGORIES = Object.keys(DEAL_LABELS) as DealCategory[];

export default function BonsPlans() {
  const [category, setCategory] = useState<DealCategory | null>(null);
  const deals = useDeals(category);

  return (
    <Screen>
      <Muted>Banques, mutuelles, logement : des offres pensées pour la vie étudiante.</Muted>
      <ChipRow>
        <Chip label="Tout" selected={category === null} onPress={() => setCategory(null)} />
        {CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={DEAL_LABELS[c]}
            selected={category === c}
            onPress={() => setCategory(c)}
          />
        ))}
      </ChipRow>
      <QueryState
        loading={deals.isPending}
        error={deals.error ? errorMessage(deals.error) : null}
        empty={deals.data?.length === 0}
        emptyText="Aucun bon plan dans cette catégorie pour le moment."
        onRetry={deals.refetch}
      />
      {deals.data?.map((deal) => <DealCard key={deal.id} deal={deal} />)}
    </Screen>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // L'adresse du partenaire est fournie par l'API au moment du clic (et le clic est compté).
  const open = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<{ url: string }>(`/deals/${deal.id}/click`);
      if (!/^https:\/\//i.test(data.url)) throw new Error('Lien invalide');
      await WebBrowser.openBrowserAsync(data.url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Tag label={DEAL_LABELS[deal.category]} />
      <Heading>{deal.partnerName}</Heading>
      <P>{deal.title}</P>
      {deal.highlight ? <Tag label={deal.highlight} tone="blue" /> : null}
      <Muted>{deal.description}</Muted>
      <Notice text={error} />
      <Button label="Profiter de l'offre" variant="secondary" onPress={open} loading={loading} />
    </Card>
  );
}
