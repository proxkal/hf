import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AcceptTermsDto } from '../auth/auth.dto.js';
import { AuthService } from '../auth/auth.service.js';
import { type AuthUser, CurrentUser } from '../common/decorators.js';
import { TERMS_VERSION } from '../common/legal.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  DELETE_CONFIRMATION,
  DeleteAccountDto,
  StudentProfileDto,
  UpdateMeDto,
} from './users.dto.js';

const USER_FIELDS = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  createdAt: true,
  termsAcceptedAt: true,
  termsVersion: true,
  studentProfile: true,
} as const;

/** Toutes les routes portent sur l'utilisateur du jeton : aucun identifiant n'est accepté en entrée. */
@Controller('me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const found = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { ...USER_FIELDS, passwordHash: true },
    });
    if (!found) throw new NotFoundException('Compte introuvable');
    const { passwordHash, ...account } = found;
    return {
      ...account,
      termsUpToDate: account.termsVersion === TERMS_VERSION,
      hasPassword: passwordHash !== null,
    };
  }

  @Patch()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { firstName: dto.firstName, lastName: dto.lastName },
      select: USER_FIELDS,
    });
  }

  /**
   * RGPD : enregistre le consentement aux CGU en vigueur (comptes créés via Google ou
   * LinkedIn, ou nouvelle version des conditions).
   */
  @Post('consent')
  consent(@CurrentUser() user: AuthUser, @Body() _dto: AcceptTermsDto) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION },
      select: USER_FIELDS,
    });
  }

  /** Onboarding : domaine, mots-clés, stage/alternance, villes. */
  @Put('student-profile')
  async upsertProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: StudentProfileDto,
  ) {
    const data = {
      domain: dto.domain,
      keywords: dto.keywords,
      contractType: dto.contractType,
      cities: dto.cities,
      studyLevel: dto.studyLevel ?? null,
      school: dto.school ?? null,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
      radiusKm: dto.radiusKm ?? 15,
    };
    return this.prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data, onboardingCompletedAt: new Date() },
      update: data,
    });
  }

  /** RGPD — droit à la portabilité : export de toutes les données du compte. */
  @Get('export')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async export(@CurrentUser() user: AuthUser) {
    const data = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        ...USER_FIELDS,
        lastLoginAt: true,
        bookings: { include: { offer: true } },
        registrations: { include: { event: { select: { title: true } } } },
        memberships: {
          include: { association: { select: { name: true } } },
        },
        dealClicks: true,
      },
    });
    if (!data) throw new NotFoundException('Compte introuvable');
    return { exportedAt: new Date().toISOString(), data };
  }

  /** RGPD — droit à l'effacement (« droit à l'oubli ») : suppression immédiate et définitive
   * du compte et de toutes les données liées (cascade en base). Confirmée par le mot de
   * passe, ou par un mot de confirmation pour un compte Google / LinkedIn. */
  @Delete()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async remove(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!account) throw new NotFoundException('Compte introuvable');
    if (account.passwordHash) {
      if (!dto.password || !(await this.auth.verifyPassword(user.id, dto.password))) {
        throw new ForbiddenException('Mot de passe incorrect');
      }
    } else if (dto.confirm !== DELETE_CONFIRMATION) {
      throw new ForbiddenException(
        `Saisis ${DELETE_CONFIRMATION} pour confirmer la suppression`,
      );
    }
    await this.prisma.user.delete({ where: { id: user.id } });
  }
}
