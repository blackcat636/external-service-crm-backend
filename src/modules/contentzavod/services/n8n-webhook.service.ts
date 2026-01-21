import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface N8NWebhookOptions {
  endpoint: string;
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  userId: number;
  telegramUsername?: string;
}

@Injectable()
export class N8NWebhookService {
  private readonly logger = new Logger(N8NWebhookService.name);
  private readonly baseUrl: string;
  private readonly secret: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('N8N_WEBHOOK_BASE_URL') || '';
    this.secret = this.configService.get<string>('N8N_WEBHOOK_SECRET');

    if (!this.baseUrl) {
      this.logger.warn('N8N_WEBHOOK_BASE_URL is not configured');
    }
  }

  async callWebhook<T>(options: N8NWebhookOptions): Promise<T> {
    const { endpoint, method = 'POST', body = {}, userId, telegramUsername } = options;

    if (!this.baseUrl) {
      throw new HttpException(
        'N8N webhook base URL is not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add webhook security header if configured
    if (this.secret) {
      headers['X-N8N-Secret'] = this.secret;
    }

    try {
      if (method === 'GET') {
        const params = new URLSearchParams({ userId: userId.toString() });
        if (telegramUsername) {
          params.set('username', telegramUsername);
        }
        const urlWithParams = `${url}?${params.toString()}`;

        const response = await firstValueFrom(
          this.httpService.get<T>(urlWithParams, { headers }),
        );

        return response.data;
      } else {
        // POST method
        const requestBody: Record<string, unknown> = { ...body, userId };
        if (telegramUsername) {
          requestBody.username = telegramUsername;
        }

        const response = await firstValueFrom(
          this.httpService.post<T>(url, requestBody, { headers }),
        );

        return response.data;
      }
    } catch (error) {
      const axiosError = error as AxiosError;

      this.logger.error(
        `N8N webhook error: ${method} ${endpoint} - ${axiosError.message}`,
        axiosError.stack,
      );

      if (axiosError.response) {
        const status = axiosError.response.status;
        const errorData = axiosError.response.data as any;

        throw new HttpException(
          errorData?.message || `N8N webhook error: ${status}`,
          status,
        );
      }

      throw new HttpException(
        `Failed to call N8N webhook: ${axiosError.message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
