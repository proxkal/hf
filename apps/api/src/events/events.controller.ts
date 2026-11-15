import {
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { IsEnum, IsOptional } from 'class-validator';
import { type AuthUser, CurrentUser } from '../common/decorators.js';
import {
  DEFAULT_RADIUS_KM,
  NearQueryDto,
  TOULOUSE,
} from '../common/geo.dto.js';
import { boundingBox, withinRadius } from '../common/geo.js';
import { EventType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

class EventQueryDto extends NearQueryDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;
}

@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Événements validés à venir autour d'un point, par date. */
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: EventQueryDto) {
    const lat = query.lat ?? TOULOUSE.lat;
    const lng = query.lng ?? TOULOUSE.lng;
    const radiusKm = query.radiusKm ?? DEFAULT_RADIUS_KM;
    const box = boundingBox(lat, lng, radiusKm);

    const events = await this.prisma.event.findMany({
      where: {
        status: 'APPROVED',
        endsAt: { gte: new Date() },
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
      include: {
        association: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
        registrations: { where: { userId: user.id }, select: { id: true } },
      },
    });

    return withinRadius(events, lat, lng, radiusKm)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((event) => this.present(event));
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: 'APPROVED' },
      include: {
        association: { select: { id: true, name: true } },
        _count: { select: { registrations: true } },
        registrations: { where: { userId: user.id }, select: { id: true } },
      },
    });
    if (!event) throw new NotFoundException('Événement introuvable');
    return this.present(event);
  }

  /** Réserver sa place. La capacité est vérifiée dans une transaction sérialisée. */
  @Post(':id/registration')
  async register(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        const event = await tx.event.findFirst({
          where: { id, status: 'APPROVED' },
          include: { _count: { select: { registrations: true } } },
        });
        if (!event) throw new NotFoundException('Événement introuvable');
        if (event.endsAt < new Date()) {
          throw new ConflictException('Cet événement est terminé');
        }
        const already = await tx.eventRegistration.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: id } },
        });
        if (already) return;
        if (
          event.capacity !== null &&
          event._count.registrations >= event.capacity
        ) {
          throw new ConflictException('Cet événement est complet');
        }
        await tx.eventRegistration.create({
          data: { userId: user.id, eventId: id },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    return { registered: true };
  }

  @Delete(':id/registration')
  @HttpCode(204)
  async unregister(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.prisma.eventRegistration.deleteMany({
      where: { userId: user.id, eventId: id },
    });
  }

  private present<
    T extends {
      capacity: number | null;
      _count: { registrations: number };
      registrations: { id: string }[];
    },
  >(event: T) {
    const { _count, registrations, ...rest } = event;
    return {
      ...rest,
      registered: registrations.length > 0,
      seatsLeft:
        event.capacity === null
          ? null
          : Math.max(event.capacity - _count.registrations, 0),
    };
  }
}
