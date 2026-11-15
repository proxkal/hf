import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { type AuthUser, CurrentUser } from '../common/decorators.js';
import { BookingMode } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

class CreateBookingDto {
  @IsUUID()
  offerId: string;

  @IsDateString()
  startsAt: string;

  @IsEnum(BookingMode)
  mode: BookingMode;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  note?: string;
}

const MIN_NOTICE_MS = 60 * 60 * 1000;
const MAX_ADVANCE_MS = 90 * 24 * 60 * 60 * 1000;

const BOOKING_VIEW = {
  id: true,
  startsAt: true,
  durationMin: true,
  priceCents: true,
  mode: true,
  note: true,
  status: true,
  createdAt: true,
  offer: { select: { title: true } },
  coach: { select: { id: true, displayName: true, city: true } },
} as const;

@Controller('bookings')
export class BookingsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Mes réservations uniquement (filtrées par l'identité du jeton). */
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.prisma.booking.findMany({
      where: { studentId: user.id },
      orderBy: { startsAt: 'desc' },
      select: BOOKING_VIEW,
    });
  }

  /**
   * Demande de réservation. Le prix et la durée sont lus en base (jamais envoyés par
   * le client) et figés dans la réservation. Le paiement sera branché avec Stripe.
   */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateBookingDto) {
    const startsAt = new Date(dto.startsAt);
    const delay = startsAt.getTime() - Date.now();
    if (delay < MIN_NOTICE_MS) {
      throw new BadRequestException(
        'Le rendez-vous doit commencer dans au moins une heure',
      );
    }
    if (delay > MAX_ADVANCE_MS) {
      throw new BadRequestException(
        'Le rendez-vous doit avoir lieu dans les 90 jours',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.coachOffer.findFirst({
          where: { id: dto.offerId, active: true, coach: { status: 'APPROVED' } },
          include: { coach: { select: { userId: true, offersVisio: true } } },
        });
        if (!offer) throw new NotFoundException('Offre introuvable');
        if (offer.coach.userId === user.id) {
          throw new BadRequestException(
            'Vous ne pouvez pas réserver votre propre séance',
          );
        }
        if (dto.mode === 'VISIO' && !offer.coach.offersVisio) {
          throw new BadRequestException('Ce coach ne propose pas la visio');
        }

        const endsAt = new Date(startsAt.getTime() + offer.durationMin * 60_000);
        // Chevauchement : un créneau existant qui commence avant la fin et finit après le début.
        const dayBefore = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
        const sameWindow = await tx.booking.findMany({
          where: {
            status: { in: ['REQUESTED', 'CONFIRMED'] },
            startsAt: { gt: dayBefore, lt: endsAt },
            OR: [{ coachId: offer.coachId }, { studentId: user.id }],
          },
          select: { startsAt: true, durationMin: true },
        });
        const overlaps = sameWindow.some(
          (b) => b.startsAt.getTime() + b.durationMin * 60_000 > startsAt.getTime(),
        );
        if (overlaps) {
          throw new ConflictException("Ce créneau n'est plus disponible");
        }

        return tx.booking.create({
          data: {
            studentId: user.id,
            coachId: offer.coachId,
            offerId: offer.id,
            startsAt,
            durationMin: offer.durationMin,
            priceCents: offer.priceCents,
            mode: dto.mode,
            note: dto.note || null,
          },
          select: BOOKING_VIEW,
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Le filtre sur studentId empêche d'annuler la réservation d'un autre utilisateur.
    const result = await this.prisma.booking.updateMany({
      where: {
        id,
        studentId: user.id,
        status: { in: ['REQUESTED', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED' },
    });
    if (result.count === 0) {
      throw new NotFoundException('Réservation introuvable ou déjà clôturée');
    }
    return { status: 'CANCELLED' };
  }
}
