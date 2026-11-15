import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

import { TERMS_REQUIRED_MESSAGE } from '../common/legal.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email: string;

  /** 12 caractères minimum : la longueur protège mieux que la complexité imposée. */
  @IsString()
  @Length(12, 128, {
    message: 'Le mot de passe doit contenir entre 12 et 128 caractères',
  })
  password: string;

  @Transform(trim)
  @IsString()
  @Length(1, 60)
  @Matches(/^[\p{L}][\p{L}\p{M}' -]*$/u, { message: 'Prénom invalide' })
  firstName: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  @Matches(/^[\p{L}][\p{L}\p{M}' -]*$/u, { message: 'Nom invalide' })
  lastName?: string;

  /** RGPD : consentement explicite, la case ne peut pas être pré-cochée ni omise. */
  @Equals(true, { message: TERMS_REQUIRED_MESSAGE })
  acceptTerms: boolean;
}

export class AcceptTermsDto {
  @Equals(true, { message: TERMS_REQUIRED_MESSAGE })
  acceptTerms: boolean;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(1, 128)
  password: string;
}

export class RefreshDto {
  @IsString()
  @Length(20, 200)
  refreshToken: string;
}
