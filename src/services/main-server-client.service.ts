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
  private serviceToken: string | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('MAIN_SERVER_URL') || '';
    if (!this.baseUrl) {
      throw new Error('MAIN_SERVER_URL is not configured');
    }
  }

  setToken(token: string): void {
    this.serviceToken = token;
    this.logger.log('Service token set');
  }

  getToken(): string | null {
    return this.serviceToken;
  }

  clearToken(): void {
    this.serviceToken = null;
    this.logger.log('Service token cleared');
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<MainServerResponse<T>> {
    if (!this.serviceToken) {
      throw new HttpException(
        'Service token not set. Authentication required.',
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
            Authorization: `Bearer ${this.serviceToken}`,
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
          this.clearToken();
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
  async getUserProfile(): Promise<MainServerResponse> {
    return this.request('GET', '/users/profile');
  }

  async updateUserProfile(data: any): Promise<MainServerResponse> {
    return this.request('PUT', '/users/profile', data);
  }

  async getUserStructure(): Promise<MainServerResponse> {
    return this.request('GET', '/users/structure');
  }

  async getUserPermissions(): Promise<MainServerResponse> {
    return this.request('GET', '/users/my-permissions');
  }

  // Balance endpoints
  async getUserBalances(): Promise<MainServerResponse> {
    return this.request('GET', '/balance');
  }

  async getBalanceByCurrency(currency: string): Promise<MainServerResponse> {
    return this.request('GET', `/balance/${currency}`);
  }

  async getTransactions(params?: any): Promise<MainServerResponse> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.request('GET', `/balance/transactions${queryString}`);
  }

  async chargeBalance(data: any): Promise<MainServerResponse> {
    return this.request('POST', '/balance/charge', data);
  }

  async getBalanceSettings(): Promise<MainServerResponse> {
    return this.request('GET', '/balance/settings');
  }

  async updateBalanceSettings(data: any): Promise<MainServerResponse> {
    return this.request('PUT', '/balance/settings', data);
  }

  // Analytics endpoints
  async sendAnalyticsEvent(data: any): Promise<MainServerResponse> {
    return this.request('POST', '/analytics/events', data);
  }

  async sendAnalyticsBatch(data: any): Promise<MainServerResponse> {
    return this.request('POST', '/analytics/events/batch', data);
  }

  // Generic request method
  async genericRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
  ): Promise<MainServerResponse<T>> {
    return this.request<T>(method, endpoint, data);
  }
}
