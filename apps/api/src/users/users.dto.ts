import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ContractType } from '../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const trimAll = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ]
    : value;

export class UpdateMeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 60)
  lastName?: string;
}

export class StudentProfileDto {
  @Transform(trim)
  @IsString()
  @Length(2, 80)
  domain: string;

  @Transform(trimAll)
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @Length(2, 40, { each: true })
  keywords: string[];

  @IsEnum(ContractType)
  contractType: ContractType;

  @Transform(trimAll)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Length(2, 60, { each: true })
  cities: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  studyLevel?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  school?: string;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  radiusKm?: number;
}

/** Mot à saisir pour confirmer la suppression d'un compte sans mot de passe. */
export const DELETE_CONFIRMATION = 'SUPPRIMER';

export class DeleteAccountDto {
  /** Compte avec mot de passe : le mot de passe confirme la suppression. */
  @IsOptional()
  @IsString()
  @Length(1, 128)
  password?: string;

  /** Compte Google / LinkedIn (sans mot de passe) : saisir le mot de confirmation. */
  @IsOptional()
  @IsString()
  @Length(1, 20)
  confirm?: string;
}
