import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PublicKeyService {
  private readonly logger = new Logger(PublicKeyService.name);
  private cachedPublicKey: string | null = null;
  private readonly cacheTimeout = 3600000; // 1 hour
  private lastFetchTime: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getPublicKey(): Promise<string> {
    // Return cached key if still valid
    if (
      this.cachedPublicKey !== null &&
      Date.now() - this.lastFetchTime < this.cacheTimeout
    ) {
      return this.cachedPublicKey as string;
    }

    const mainServerUrl = this.configService.get<string>('MAIN_SERVER_URL');
    if (!mainServerUrl) {
      throw new Error('MAIN_SERVER_URL is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${mainServerUrl}/auth/public-key`),
      );

      if (response.data?.data?.publicKey) {
        const publicKey = response.data.data.publicKey;
        this.cachedPublicKey = publicKey;
        this.lastFetchTime = Date.now();
        this.logger.log('Public key fetched successfully');
        return publicKey;
      }

      throw new Error('Invalid response format from main server');
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch public key: ${error.message}`,
        error.stack,
      );
      throw new Error(
        `Failed to fetch public key from main server: ${error.message}`,
      );
    }
  }

  clearCache(): void {
    this.cachedPublicKey = null;
    this.lastFetchTime = 0;
    this.logger.log('Public key cache cleared');
  }
}
