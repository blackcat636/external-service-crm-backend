import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface MainServerResponse<T = any> {
  status: number;
  data?: T;
  message?: string;
}

@Injectable()
export class MainServerClientService {
  private readonly logger = new Logger(MainServerClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('MAIN_SERVER_URL') || '';
    if (!this.baseUrl) {
      throw new Error('MAIN_SERVER_URL is not configured');
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    serviceToken: string,
    data?: any,
  ): Promise<MainServerResponse<T>> {
    if (!serviceToken) {
      throw new HttpException(
        'Service token is required. Authentication required.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url,
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            'Content-Type': 'application/json',
          },
          data,
        }),
      );

      return {
        status: response.status,
        data: response.data?.data || response.data,
        message: response.data?.message,
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const errorData = axiosError.response.data as any;

        this.logger.error(
          `Request failed: ${method} ${endpoint} - Status: ${status}`,
        );

        if (status === HttpStatus.UNAUTHORIZED) {
          throw new HttpException(
            errorData?.message || 'Authentication failed',
            HttpStatus.UNAUTHORIZED,
          );
        }

        throw new HttpException(
          errorData?.message || 'Request failed',
          status,
        );
      }

      this.logger.error(
        `Network error: ${method} ${endpoint} - ${axiosError.message}`,
      );
      throw new HttpException(
        'Network error: Unable to reach main server',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // User endpoints
  async getUserProfile(serviceToken: string): Promise<MainServerResponse> {
    return this.request('GET', '/users/profile', serviceToken);
  }

  async updateUserProfile(serviceToken: string, data: any): Promise<MainServerResponse> {
    return this.request('PUT', '/users/profile', serviceToken, data);
  }

  async getUserStructure(serviceToken: string): Promise<MainServerResponse> {
    return this.request('GET', '/users/structure', serviceToken);
  }

  async getUserPermissions(serviceToken: string): Promise<MainServerResponse> {
    return this.request('GET', '/users/my-permissions', serviceToken);
  }

  // Balance endpoints
  async getUserBalances(serviceToken: string): Promise<MainServerResponse> {
    return this.request('GET', '/balance', serviceToken);
  }

  async getBalanceByCurrency(serviceToken: string, currency: string): Promise<MainServerResponse> {
    return this.request('GET', `/balance/${currency}`, serviceToken);
  }

  async getTransactions(serviceToken: string, params?: any): Promise<MainServerResponse> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request('GET', `/balance/transactions${queryString}`, serviceToken);
  }

  async chargeBalance(serviceToken: string, data: any): Promise<MainServerResponse> {
    return this.request('POST', '/balance/charge', serviceToken, data);
  }

  async getBalanceSettings(serviceToken: string): Promise<MainServerResponse> {
    return this.request('GET', '/balance/settings', serviceToken);
  }

  async updateBalanceSettings(serviceToken: string, data: any): Promise<MainServerResponse> {
    return this.request('PUT', '/balance/settings', serviceToken, data);
  }

  // Analytics endpoints
  async sendAnalyticsEvent(serviceToken: string, data: any): Promise<MainServerResponse> {
    return this.request('POST', '/analytics/events', serviceToken, data);
  }

  async sendAnalyticsBatch(serviceToken: string, data: any): Promise<MainServerResponse> {
    return this.request('POST', '/analytics/events/batch', serviceToken, data);
  }

  // Generic request method
  async genericRequest<T>(
    method: string,
    endpoint: string,
    serviceToken: string,
    data?: any,
  ): Promise<MainServerResponse<T>> {
    return this.request<T>(method, endpoint, serviceToken, data);
  }
}
