import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Redirect,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Public } from '../common/decorators.js';
import {
  type OAuthProvider,
  OAuthService,
  type OAuthTarget,
} from './oauth.service.js';

enum Provider {
  google = 'google',
  linkedin = 'linkedin',
}

class StartQueryDto {
  @IsString()
  @Length(43, 43)
  challenge: string;

  @IsOptional()
  @IsIn(['web', 'native'])
  target?: OAuthTarget;
}

class CallbackQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  state?: string;

  // Paramètres d'erreur ou annexes renvoyés par les fournisseurs : acceptés, ignorés.
  @IsOptional() @IsString() error?: string;
  @IsOptional() @IsString() error_description?: string;
  @IsOptional() @IsString() scope?: string;
  @IsOptional() @IsString() authuser?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsString() hd?: string;
}

class ExchangeDto {
  @IsString()
  @Length(20, 200)
  ticket: string;

  @IsString()
  @Length(43, 128)
  verifier: string;
}

@Public()
@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  /** Fournisseurs configurés : l'application n'active que ces boutons. */
  @Get('providers')
  providers() {
    return this.oauth.enabledProviders();
  }

  @Get(':provider/start')
  @Redirect()
  async start(
    @Param('provider', new ParseEnumPipe(Provider)) provider: OAuthProvider,
    @Query() query: StartQueryDto,
  ) {
    const url = await this.oauth.authorizationUrl(
      provider,
      query.challenge,
      query.target ?? 'web',
    );
    return { url, statusCode: 302 };
  }

  @Get(':provider/callback')
  @Redirect()
  async callback(
    @Param('provider', new ParseEnumPipe(Provider)) provider: OAuthProvider,
    @Query() query: CallbackQueryDto,
  ) {
    const url = await this.oauth.handleCallback(provider, query.code, query.state);
    return { url, statusCode: 302 };
  }

  @Post('exchange')
  @HttpCode(200)
  exchange(@Body() dto: ExchangeDto) {
    return this.oauth.exchangeTicket(dto.ticket, dto.verifier);
  }
}
