import { Injectable, Logger } from '@nestjs/common';
import { MainServerClientService } from './main-server-client.service';

export interface AnalyticsEvent {
  eventType: string;
  data: any;
  metadata?: any;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  async sendEvent(serviceToken: string, event: AnalyticsEvent): Promise<any> {
    try {
      const eventData = {
        ...event,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(`Sending analytics event: ${event.eventType}`);
      const result = await this.mainServerClient.sendAnalyticsEvent(serviceToken, eventData);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send analytics event: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendBatch(serviceToken: string, events: AnalyticsEvent[]): Promise<any> {
    try {
      const eventsWithTimestamp = events.map((event) => ({
        ...event,
        timestamp: new Date().toISOString(),
      }));

      this.logger.log(`Sending batch of ${events.length} analytics events`);
      const result = await this.mainServerClient.sendAnalyticsBatch(serviceToken, {
        events: eventsWithTimestamp,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send analytics batch: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
