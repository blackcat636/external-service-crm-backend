import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule as AppConfigModule } from './config/config.module';
import { PublicKeyService } from './services/public-key.service';
import { MainServerClientService } from './services/main-server-client.service';
import { BalanceApiService } from './services/balance-api.service';
import { AnalyticsService } from './services/analytics.service';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { HealthController } from './controllers/health.controller';
import { OperationsController } from './controllers/operations.controller';
import { AuthController } from './controllers/auth.controller';
import { ContentZavodModule } from './modules/contentzavod/contentzavod.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AppConfigModule,
    ContentZavodModule,
  ],
  controllers: [HealthController, OperationsController, AuthController],
  providers: [
    PublicKeyService,
    MainServerClientService,
    BalanceApiService,
    AnalyticsService,
    AuthService,
    JwtStrategy,
  ],
  exports: [
    MainServerClientService,
    BalanceApiService,
    AnalyticsService,
    AuthService,
    PublicKeyService,
  ],
})
export class AppModule {}
