import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length } from 'class-validator';
import {
  DEFAULT_RADIUS_KM,
  NearQueryDto,
  TOULOUSE,
} from '../common/geo.dto.js';
import { boundingBox, withinRadius } from '../common/geo.js';
import { PrismaService } from '../prisma/prisma.service.js';

class CoachQueryDto extends NearQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 80)
  domain?: string;
}

/** Champs publics d'un coach. L'e-mail et le compte utilisateur ne sont jamais exposés. */
const COACH_FIELDS = {
  id: true,
  displayName: true,
  headline: true,
  bio: true,
  domains: true,
  knownProcesses: true,
  city: true,
  lat: true,
  lng: true,
  offersVisio: true,
  ratingAvg: true,
  ratingCount: true,
} as const;

@Controller('coaches')
export class CoachesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Coachs validés autour d'un point, du plus proche au plus éloigné. */
  @Get()
  async list(@Query() query: CoachQueryDto) {
    const lat = query.lat ?? TOULOUSE.lat;
    const lng = query.lng ?? TOULOUSE.lng;
    const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;
    const box = boundingBox(lat, lng, radiusKm);

    const coaches = await this.prisma.coachProfile.findMany({
      where: {
        status: 'APPROVED',
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
        ...(query.domain
          ? { domains: { has: query.domain } }
          : {}),
      },
      select: {
        ...COACH_FIELDS,
        offers: {
          where: { active: true },
          select: { priceCents: true },
        },
      },
      take: 200,
    });

    return withinRadius(coaches, lat, lng, radiusKm).map(
      ({ offers, bio: _bio, ...coach }) => ({
        ...coach,
        fromPriceCents: offers.length
          ? Math.min(...offers.map((o) => o.priceCents))
          : null,
      }),
    );
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const coach = await this.prisma.coachProfile.findFirst({
      where: { id, status: 'APPROVED' },
      select: {
        ...COACH_FIELDS,
        offers: {
          where: { active: true },
          orderBy: { priceCents: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            durationMin: true,
            priceCents: true,
          },
        },
      },
    });
    if (!coach) throw new NotFoundException('Coach introuvable');
    return coach;
  }
}
