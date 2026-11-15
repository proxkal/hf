import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators.js';

/**
 * Garde globale : toute route exige un jeton d'accès valide, sauf `@Public()`.
 * `@Roles(...)` restreint en plus l'accès à certains rôles.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const header: unknown = request.headers?.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice(7)
        : null;
    if (!token) throw new UnauthorizedException('Authentification requise');

    let payload: { sub?: unknown; role?: unknown };
    try {
      payload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Session expirée ou invalide');
    }
    if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      throw new UnauthorizedException('Session expirée ou invalide');
    }
    request.user = { id: payload.sub, role: payload.role };

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(payload.role)) {
      throw new ForbiddenException('Accès refusé');
    }
    return true;
  }
}
