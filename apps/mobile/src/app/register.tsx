import { Link } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme';
import { Button, Field, Muted, Notice, Screen, Title } from '@/ui';
import { SocialButtons, TermsCheckbox } from '@/ui/auth-extras';

const MIN_PASSWORD = 12;

export default function Register() {
  const signUp = useAuth((state) => state.signUp);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD} caractères.`);
      return;
    }
    setLoading(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        email: email.trim(),
        password,
        acceptTerms,
      });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Rejoins HURDEN</Title>
      <Muted>Gratuit pour les étudiants. Un compte suffit pour commencer.</Muted>
      <Field
        label="Prénom"
        value={firstName}
        onChangeText={setFirstName}
        autoComplete="given-name"
        textContentType="givenName"
      />
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <Field
        label="Mot de passe"
        hint={`${MIN_PASSWORD} caractères minimum. Une phrase facile à retenir est idéale.`}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      <TermsCheckbox checked={acceptTerms} onChange={setAcceptTerms} />
      <Notice text={error} />
      <Button
        label="Créer mon compte"
        onPress={submit}
        loading={loading}
        disabled={!firstName.trim() || !email || !password || !acceptTerms}
      />
      <SocialButtons />
      <Muted>
        Avec Google ou LinkedIn, ton accord aux conditions générales te sera demandé à
        l'étape suivante.
      </Muted>
      <Muted>
        Déjà inscrit ?{' '}
        <Link href="/login" replace style={{ color: colors.blue }}>
          Se connecter
        </Link>
      </Muted>
    </Screen>
  );
}
