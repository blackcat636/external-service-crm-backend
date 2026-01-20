import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentZavodController } from './controllers/contentzavod.controller';
import { AuthorsService } from './services/authors.service';
import { VideosService } from './services/videos.service';
import { TelegramService } from './services/telegram.service';
import { DashboardService } from './services/dashboard.service';
import { EditWithAIService } from './services/edit-with-ai.service';
import { N8NWebhookService } from './services/n8n-webhook.service';
import { UserContextService } from './services/user-context.service';
import { MainServerClientService } from '../../services/main-server-client.service';

@Module({
  imports: [HttpModule],
  controllers: [ContentZavodController],
  providers: [
    AuthorsService,
    VideosService,
    TelegramService,
    DashboardService,
    EditWithAIService,
    N8NWebhookService,
    UserContextService,
    MainServerClientService,
  ],
  exports: [
    AuthorsService,
    VideosService,
    TelegramService,
    DashboardService,
    EditWithAIService,
  ],
})
export class ContentZavodModule {}
