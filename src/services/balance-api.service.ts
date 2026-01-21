import { Injectable, Logger } from '@nestjs/common';
import { MainServerClientService } from './main-server-client.service';

export interface BalanceCheckParams {
  currencyCode: string;
  amount: number;
}

export interface ChargeBalanceParams {
  amount: number;
  currencyCode: string;
  referenceId: string;
  referenceType: string;
  description: string;
}

@Injectable()
export class BalanceApiService {
  private readonly logger = new Logger(BalanceApiService.name);

  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  async getUserBalances(serviceToken: string) {
    return this.mainServerClient.getUserBalances(serviceToken);
  }

  async getBalanceByCurrency(serviceToken: string, currency: string) {
    return this.mainServerClient.getBalanceByCurrency(serviceToken, currency);
  }

  async getTransactions(serviceToken: string, params?: {
    currencyCode?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.mainServerClient.getTransactions(serviceToken, params);
  }

  async checkSufficientFunds(
    serviceToken: string,
    currency: string,
    amount: number,
  ): Promise<boolean> {
    try {
      const result = await this.getBalanceByCurrency(serviceToken, currency);
      const balance = result.data?.available_balance || 0;
      return balance >= amount;
    } catch (error) {
      this.logger.error(
        `Failed to check sufficient funds: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async chargeBalance(serviceToken: string, params: ChargeBalanceParams) {
    this.logger.log(
      `Charging balance: ${params.amount} ${params.currencyCode} - ${params.description}`,
    );
    return this.mainServerClient.chargeBalance(serviceToken, params);
  }
}
