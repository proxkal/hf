import { Link } from 'expo-router';
import { useState } from 'react';

import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { colors } from '@/theme';
import { Button, Field, Muted, Notice, Screen, Title } from '@/ui';
import { SocialButtons } from '@/ui/auth-extras';

export default function Login() {
  const signIn = useAuth((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Content de te revoir</Title>
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
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Notice text={error} />
      <Button
        label="Se connecter"
        onPress={submit}
        loading={loading}
        disabled={!email || !password}
      />
      <SocialButtons />
      <Muted>
        Pas encore de compte ?{' '}
        <Link href="/register" replace style={{ color: colors.blue }}>
          Créer un compte
        </Link>
      </Muted>
    </Screen>
  );
}
