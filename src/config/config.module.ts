import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtConfigService } from './jwt.config';
import { PublicKeyService } from '../services/public-key.service';

@Global()
@Module({
  imports: [
    NestConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  providers: [JwtConfigService, PublicKeyService],
  exports: [JwtConfigService, PublicKeyService],
})
export class ConfigModule {}
