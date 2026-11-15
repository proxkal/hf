import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { type AuthUser, CurrentUser } from '../common/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('associations')
export class AssociationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const associations = await this.prisma.association.findMany({
      where: { status: 'APPROVED' },
      orderBy: { name: 'asc' },
      include: {
        memberships: { where: { userId: user.id }, select: { id: true } },
      },
    });
    return associations.map(({ memberships, ...association }) => ({
      ...association,
      requested: memberships.length > 0,
    }));
  }

  @Get(':id')
  async detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const association = await this.prisma.association.findFirst({
      where: { id, status: 'APPROVED' },
      include: {
        memberships: { where: { userId: user.id }, select: { id: true } },
        events: {
          where: { status: 'APPROVED', endsAt: { gte: new Date() } },
          orderBy: { startsAt: 'asc' },
          select: { id: true, title: true, startsAt: true, venue: true },
        },
      },
    });
    if (!association) throw new NotFoundException('Association introuvable');
    const { memberships, ...rest } = association;
    return { ...rest, requested: memberships.length > 0 };
  }

  /** Bouton « Adhérer » : enregistre la demande, transmise ensuite à l'association. */
  @Post(':id/membership-request')
  async join(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const association = await this.prisma.association.findFirst({
      where: { id, status: 'APPROVED' },
      select: { id: true },
    });
    if (!association) throw new NotFoundException('Association introuvable');
    await this.prisma.membershipRequest.upsert({
      where: { userId_associationId: { userId: user.id, associationId: id } },
      create: { userId: user.id, associationId: id },
      update: {},
    });
    return { requested: true };
  }
}
