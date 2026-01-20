import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';
import { isValidInstagramURL } from '../utils/instagram.utils';
import { AddAuthorDto } from '../dto/add-author.dto';
import { DeleteAuthorDto } from '../dto/delete-author.dto';

@Injectable()
export class AuthorsService {
  private readonly logger = new Logger(AuthorsService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getAuthors(userId: number, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_AUTHORS_WEBHOOK') || '/webhook/get-authors';

    try {
      const authors = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'POST',
        userLogin,
      });

      return {
        status: 200,
        data: authors,
      };
    } catch (error) {
      this.logger.error(`Failed to get authors: ${error}`);
      throw new HttpException(
        'Failed to fetch authors',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async addAuthor(userId: number, dto: AddAuthorDto, email?: string) {
    if (!isValidInstagramURL(dto.url)) {
      throw new HttpException('Invalid Instagram profile URL', HttpStatus.BAD_REQUEST);
    }

    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_ADD_AUTHOR_WEBHOOK') || '/webhook/add-author';

    try {
      const author = await this.n8nWebhook.callWebhook<any>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { instagramUrl: dto.url },
        userLogin,
      });

      return {
        status: 201,
        data: author,
        message: 'Author added successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to add author: ${error}`);
      throw new HttpException('Failed to add author', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteAuthor(userId: number, dto: DeleteAuthorDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_DELETE_AUTHOR_WEBHOOK') ||
      '/webhook/delete-author';

    try {
      await this.n8nWebhook.callWebhook({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { id: dto.id },
        userLogin,
      });

      return {
        status: 200,
        message: 'Author deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete author: ${error}`);
      throw new HttpException('Failed to delete author', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
