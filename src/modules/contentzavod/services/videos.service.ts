import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';
import { TranscribeVideoDto } from '../dto/transcribe-video.dto';
import { MakeTextUniqueDto } from '../dto/make-text-unique.dto';
import { StartVideoGenerationDto } from '../dto/start-video-generation.dto';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getVideos(serviceToken: string, userId: number, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_VIDEOS_WEBHOOK') || '/webhook/get-videos';

    try {
      const videos = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'POST',
        userLogin,
      });

      // Sort by engagement (descending)
      const sortedVideos = videos.sort(
        (a, b) => parseInt(b.engagement || '0') - parseInt(a.engagement || '0'),
      );

      return {
        status: 200,
        data: sortedVideos,
      };
    } catch (error) {
      this.logger.error(`Failed to get videos: ${error}`);
      throw new HttpException('Failed to fetch videos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async transcribeVideo(serviceToken: string, userId: number, dto: TranscribeVideoDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_TRANSCRIBE_WEBHOOK') || '/webhook/transcribe';

    try {
      const result = await this.n8nWebhook.callWebhook<{ transcription: string }>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { videoUrl: dto.videoUrl },
        userLogin,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to transcribe video: ${error}`);
      throw new HttpException('Failed to transcribe video', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async makeTextUnique(serviceToken: string, userId: number, dto: MakeTextUniqueDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_UNIQUE_WEBHOOK') || '/webhook/unique';

    try {
      const result = await this.n8nWebhook.callWebhook<{ unique_text: string }>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: { text: dto.text },
        userLogin,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to make text unique: ${error}`);
      throw new HttpException('Failed to make text unique', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async startVideoGeneration(userId: number, dto: StartVideoGenerationDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Convert orientation to aspect ratio format
    const aspectRatio = dto.orientation === 'vertical' ? '9:16' : '16:9';

    const webhookEndpoint =
      this.configService.get<string>('N8N_GENERATE_VIDEO_START_WEBHOOK') ||
      '/webhook/generate-video-start-zavod';

    try {
      const result = await this.n8nWebhook.callWebhook<{
        job_id: string;
        status: 'pending';
      }>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: {
          type: dto.type,
          videoId: dto.videoId,
          text: dto.text.trim(),
          orientation: aspectRatio,
        },
        userLogin,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to start video generation: ${error}`);
      throw new HttpException(
        'Failed to start video generation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getVideoGenerationStatus(serviceToken: string, userId: number, jobId: string, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GENERATE_VIDEO_STATUS_WEBHOOK') ||
      '/webhook/generate-video-status-zavod';

    try {
      const result = await this.n8nWebhook.callWebhook<{
        status: 'pending' | 'processing' | 'completed' | 'failed';
        link?: string;
        error?: string;
      }>({
        endpoint: `${webhookEndpoint}?jobId=${encodeURIComponent(jobId)}`,
        method: 'GET',
        userLogin,
      });

      return {
        status: 200,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to get video generation status: ${error}`);
      throw new HttpException(
        'Failed to get video generation status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
