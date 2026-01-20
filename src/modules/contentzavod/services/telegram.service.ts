import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';
import { DeleteChannelDto } from '../dto/delete-channel.dto';
import { MakeTextUniqueDto } from '../dto/make-text-unique.dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getChannels(userId: number, telegramUsername: string, email?: string) {
    if (!telegramUsername) {
      throw new HttpException('Telegram username is required', HttpStatus.BAD_REQUEST);
    }

    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_TELEGRAM_CHANNELS_WEBHOOK') ||
      '/webhook/get-groups-telegram';

    try {
      const channels = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
        userLogin,
        telegramUsername,
      });

      return {
        status: 200,
        data: channels,
      };
    } catch (error) {
      this.logger.error(`Failed to get Telegram channels: ${error}`);
      throw new HttpException(
        'Failed to fetch Telegram channels',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteChannel(userId: number, dto: DeleteChannelDto, telegramUsername: string, email?: string) {
    if (!telegramUsername) {
      throw new HttpException('Telegram username is required', HttpStatus.BAD_REQUEST);
    }

    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_DELETE_TELEGRAM_CHANNEL_WEBHOOK') ||
      '/webhook/delete-group-telegram';

    try {
      await this.n8nWebhook.callWebhook({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { id: dto.id },
        userLogin,
        telegramUsername,
      });

      return {
        status: 200,
        message: 'Channel deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete Telegram channel: ${error}`);
      throw new HttpException(
        'Failed to delete Telegram channel',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPosts(userId: number, telegramUsername: string, email?: string) {
    if (!telegramUsername) {
      throw new HttpException('Telegram username is required', HttpStatus.BAD_REQUEST);
    }

    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_TELEGRAM_POSTS_WEBHOOK') ||
      '/webhook/get-the-posts';

    try {
      const posts = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
        userLogin,
        telegramUsername,
      });

      return {
        status: 200,
        data: posts,
      };
    } catch (error) {
      this.logger.error(`Failed to get Telegram posts: ${error}`);
      throw new HttpException(
        'Failed to fetch Telegram posts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async makePostTextUnique(userId: number, dto: MakeTextUniqueDto, telegramUsername: string, email?: string) {
    if (!telegramUsername) {
      throw new HttpException('Telegram username is required', HttpStatus.BAD_REQUEST);
    }

    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_UNIQUE_TELEGRAM_WEBHOOK') ||
      '/webhook/unique-zavod-telegram';

    try {
      const result = await this.n8nWebhook.callWebhook<{ unique_text: string }>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { text: dto.text },
        userLogin,
        telegramUsername,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to make Telegram post text unique: ${error}`);
      throw new HttpException(
        'Failed to make text unique',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
