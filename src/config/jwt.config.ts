import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicKeyService } from '../services/public-key.service';

@Injectable()
export class JwtConfigService implements OnModuleInit {
  private readonly logger = new Logger(JwtConfigService.name);
  private publicKey: string | null = null;
  private loadingPromise: Promise<string> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly publicKeyService: PublicKeyService,
  ) {}

  async onModuleInit() {
    // Pre-load public key on startup
    try {
      await this.loadPublicKey();
    } catch (error) {
      this.logger.warn(
        'Failed to pre-load public key, will attempt on first request',
      );
    }
  }

  async loadPublicKey(): Promise<string> {
    if (this.publicKey) {
      return this.publicKey;
    }

    // If already loading, wait for that promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading
    this.loadingPromise = this._loadPublicKey();
    try {
      this.publicKey = await this.loadingPromise;
      return this.publicKey;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async _loadPublicKey(): Promise<string> {
    try {
      // Try to get public key from environment first
      const envKey = this.configService.get<string>('JWT_PUBLIC_KEY');
      if (envKey) {
        // Normalize the key: remove quotes, handle multiline format
        let normalizedKey = envKey
          .replace(/^["']|["']$/g, '') // Remove surrounding quotes
          .trim();
        
        // If key contains newlines, it's already formatted
        // Otherwise, format it properly from single line
        if (!normalizedKey.includes('\n')) {
          // Format single-line key: add newlines after BEGIN and before END
          normalizedKey = normalizedKey
            .replace(/-----BEGIN PUBLIC KEY-----\s*/, '-----BEGIN PUBLIC KEY-----\n')
            .replace(/\s*-----END PUBLIC KEY-----/, '\n-----END PUBLIC KEY-----')
            // Add newline every 64 characters for base64 content
            .replace(/(.{64})/g, '$1\n');
        }
        
        // Ensure proper format with newlines
        normalizedKey = normalizedKey
          .replace(/\n\n+/g, '\n') // Remove multiple consecutive newlines
          .replace(/\s+$/gm, '') // Remove trailing whitespace from each line
          .trim();
        
        this.publicKey = normalizedKey;
        this.logger.log('Loaded public key from environment');
        return this.publicKey;
      }

      // Otherwise, fetch from main server
      this.publicKey = await this.publicKeyService.getPublicKey();
      this.logger.log('Loaded public key from main server');
      return this.publicKey;
    } catch (error) {
      this.logger.error(
        `Failed to load public key: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  getPublicKey(): string {
    if (!this.publicKey) {
      throw new Error(
        'Public key not loaded. Make sure JwtConfigService.onModuleInit() completed successfully.',
      );
    }
    return this.publicKey;
  }
}
