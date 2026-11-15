/**
 * Validation des variables d'environnement au démarrage.
 * L'API refuse de démarrer si un secret est absent ou trop faible.
 */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TTL_DAYS: number;
  CORS_ORIGINS: string[];
  /** URL publique de l'API, utilisée pour les retours OAuth. */
  API_PUBLIC_URL: string;
  /** URL de l'application web, vers laquelle on renvoie après une connexion OAuth. */
  WEB_APP_URL: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINKEDIN_CLIENT_ID?: string;
  LINKEDIN_CLIENT_SECRET?: string;
}

const WEAK_SECRETS = new Set(['changeme', 'secret', 'change-me']);

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];
  const str = (key: string): string => {
    const value = raw[key];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${key} est obligatoire`);
      return '';
    }
    return value.trim();
  };
  const int = (key: string, fallback: number, min: number, max: number) => {
    const value = raw[key];
    if (value === undefined || value === '') return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push(`${key} doit être un entier entre ${min} et ${max}`);
      return fallback;
    }
    return n;
  };

  const nodeEnv = (raw.NODE_ENV as string | undefined) ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV doit valoir development, test ou production');
  }

  const secret = str('JWT_ACCESS_SECRET');
  if (secret && (secret.length < 32 || WEAK_SECRETS.has(secret.toLowerCase()))) {
    errors.push('JWT_ACCESS_SECRET doit contenir au moins 32 caractères aléatoires');
  }

  const corsOrigins = ((raw.CORS_ORIGINS as string | undefined) ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS est obligatoire en production');
  }
  if (corsOrigins.includes('*')) {
    errors.push('CORS_ORIGINS ne peut pas contenir "*"');
  }

  const optional = (key: string) => {
    const value = raw[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  };
  const url = (key: string, fallback: string) => {
    const value = optional(key) ?? fallback;
    try {
      const parsed = new URL(value);
      if (nodeEnv === 'production' && parsed.protocol !== 'https:') {
        errors.push(`${key} doit être en https en production`);
      }
      return parsed.origin;
    } catch {
      errors.push(`${key} doit être une URL valide`);
      return fallback;
    }
  };
  for (const provider of ['GOOGLE', 'LINKEDIN']) {
    if (!!optional(`${provider}_CLIENT_ID`) !== !!optional(`${provider}_CLIENT_SECRET`)) {
      errors.push(`${provider}_CLIENT_ID et ${provider}_CLIENT_SECRET vont ensemble`);
    }
  }

  const env: Env = {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: int('PORT', 3000, 1, 65535),
    DATABASE_URL: str('DATABASE_URL'),
    JWT_ACCESS_SECRET: secret,
    JWT_ACCESS_TTL_SECONDS: int('JWT_ACCESS_TTL_SECONDS', 900, 60, 3600),
    REFRESH_TTL_DAYS: int('REFRESH_TTL_DAYS', 30, 1, 90),
    CORS_ORIGINS: corsOrigins,
    API_PUBLIC_URL: url('API_PUBLIC_URL', 'http://127.0.0.1:3000'),
    WEB_APP_URL: url('WEB_APP_URL', 'http://localhost:8081'),
    GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
    LINKEDIN_CLIENT_ID: optional('LINKEDIN_CLIENT_ID'),
    LINKEDIN_CLIENT_SECRET: optional('LINKEDIN_CLIENT_SECRET'),
  };

  if (errors.length > 0) {
    throw new Error(`Configuration invalide :\n - ${errors.join('\n - ')}`);
  }
  return env;
}
