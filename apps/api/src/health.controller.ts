import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './common/decorators.js';
import { PrismaService } from './prisma/prisma.service.js';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Base de données indisponible');
    }
    return { status: 'ok' };
  }
}
