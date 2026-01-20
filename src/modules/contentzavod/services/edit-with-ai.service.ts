import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';
import { EditWithAIDto } from '../dto/edit-with-ai.dto';

@Injectable()
export class EditWithAIService {
  private readonly logger = new Logger(EditWithAIService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async editText(userId: number, dto: EditWithAIDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_EDIT_WITH_AI_WEBHOOK') || '/webhook/edit-with-ai';

    try {
      const result = await this.n8nWebhook.callWebhook<{ text: string }>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { text: dto.text, prompt: dto.prompt },
        userLogin,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to edit text with AI: ${error}`);
      throw new HttpException('Failed to edit text with AI', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
