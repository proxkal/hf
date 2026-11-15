import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api, errorMessage, type StudentProfile } from '@/lib/api';
import { useMe } from '@/lib/queries';
import { Button, Chip, ChipRow, Field, Heading, Muted, Notice, Screen, Stack } from '@/ui';

const DOMAINS = [
  'Informatique',
  'Cybersécurité',
  'Développement web',
  'Ingénierie',
  'Aéronautique',
  'Commerce',
  'Marketing',
  'Communication',
  'Banque',
  'Ressources humaines',
  'Santé',
  'Droit',
];
const CONTRACTS: { value: StudentProfile['contractType']; label: string }[] = [
  { value: 'ALTERNANCE', label: 'Alternance' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'BOTH', label: 'Les deux' },
];
const CITIES = ['Toulouse', 'Blagnac', 'Labège', 'Colomiers', 'Balma'];

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

export default function Onboarding() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const [domain, setDomain] = useState('');
  const [keywords, setKeywords] = useState('');
  const [contractType, setContractType] =
    useState<StudentProfile['contractType']>('ALTERNANCE');
  const [cities, setCities] = useState<string[]>(['Toulouse']);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modification d'un profil existant : on préremplit le formulaire.
  const existing = me.data?.studentProfile;
  useEffect(() => {
    if (!existing) return;
    setDomain(existing.domain);
    setKeywords(existing.keywords.join(', '));
    setContractType(existing.contractType);
    setCities(existing.cities);
  }, [existing]);

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      await api.put('/me/student-profile', {
        domain: domain.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        contractType,
        cities,
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/carte');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Stack>
        <Heading>1. Ton domaine</Heading>
        <ChipRow>
          {DOMAINS.map((d) => (
            <Chip key={d} label={d} selected={domain === d} onPress={() => setDomain(d)} />
          ))}
        </ChipRow>
        <Field
          label="Ou précise ton domaine"
          value={domain}
          onChangeText={setDomain}
          maxLength={80}
        />
        <Field
          label="Mots-clés (facultatif)"
          hint="Séparés par des virgules : métier visé, technologies, secteur…"
          value={keywords}
          onChangeText={setKeywords}
          maxLength={300}
        />
      </Stack>

      <Stack>
        <Heading>2. Ce que tu cherches</Heading>
        <ChipRow>
          {CONTRACTS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              selected={contractType === c.value}
              onPress={() => setContractType(c.value)}
            />
          ))}
        </ChipRow>
      </Stack>

      <Stack>
        <Heading>3. Où ?</Heading>
        <Muted>Toulouse et son agglomération pour le lancement.</Muted>
        <ChipRow>
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={cities.includes(c)}
              onPress={() => setCities((current) => toggle(current, c))}
            />
          ))}
        </ChipRow>
      </Stack>

      <Notice text={error} />
      <Button
        label="Voir ce qu'il y a autour de moi"
        onPress={submit}
        loading={saving}
        disabled={domain.trim().length < 2 || cities.length === 0}
      />
    </Screen>
  );
}
