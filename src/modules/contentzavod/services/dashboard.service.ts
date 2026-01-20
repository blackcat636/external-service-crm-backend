import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getDashboardStats(userId: number, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_DASHBOARD_WEBHOOK') ||
      '/webhook/get-dashboard';

    try {
      const stats = await this.n8nWebhook.callWebhook<any>({
        endpoint: webhookEndpoint,
        method: 'POST',
        userLogin,
      });

      return {
        status: 200,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard stats: ${error}`);
      throw new HttpException(
        'Failed to fetch dashboard statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
