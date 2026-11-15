import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, Max, Min } from 'class-validator';

/** Paramètres de recherche autour d'un point (la position n'est jamais stockée). */
export class NearQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  radiusKm?: number;
}

/** Centre de Toulouse (place du Capitole), ville pilote. */
export const TOULOUSE = { lat: 43.6045, lng: 1.444 };
export const DEFAULT_RADIUS_KM = 15;
