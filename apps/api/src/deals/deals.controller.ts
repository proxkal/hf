import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEnum, IsOptional } from 'class-validator';
import { type AuthUser, CurrentUser } from '../common/decorators.js';
import { DealCategory } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

class DealQueryDto {
  @IsOptional()
  @IsEnum(DealCategory)
  category?: DealCategory;
}

const activeDeal = () => ({
  status: 'APPROVED' as const,
  OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
});

@Controller('deals')
export class DealsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() query: DealQueryDto) {
    return this.prisma.deal.findMany({
      where: {
        ...activeDeal(),
        ...(query.category ? { category: query.category } : {}),
      },
      orderBy: [{ category: 'asc' }, { partnerName: 'asc' }],
      select: {
        id: true,
        partnerName: true,
        category: true,
        title: true,
        description: true,
        highlight: true,
        city: true,
        validUntil: true,
      },
    });
  }

  /**
   * « Profiter de l'offre » : enregistre le clic (facturation partenaire) puis renvoie
   * l'URL. L'URL vient uniquement de la base : aucune redirection ouverte possible.
   */
  @Post(':id/click')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async click(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, ...activeDeal() },
      select: { id: true, url: true },
    });
    if (!deal) throw new NotFoundException('Bon plan introuvable');
    await this.prisma.dealClick.create({
      data: { dealId: deal.id, userId: user.id },
    });
    return { url: deal.url };
  }
}
