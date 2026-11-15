import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AssociationsController } from './associations/associations.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { BookingsController } from './bookings/bookings.controller.js';
import { CoachesController } from './coaches/coaches.controller.js';
import { validateEnv } from './config/env.js';
import { DealsController } from './deals/deals.controller.js';
import { EventsController } from './events/events.controller.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersController } from './users/users.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Limite générale : 120 requêtes par minute et par IP (plus strict sur /auth).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    HealthController,
    UsersController,
    CoachesController,
    EventsController,
    AssociationsController,
    DealsController,
    BookingsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Authentification obligatoire par défaut ; les routes ouvertes portent @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
