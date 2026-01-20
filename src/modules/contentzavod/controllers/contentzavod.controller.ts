import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/auth.guard';
import { RequestWithToken } from '../../../auth/interfaces/request-with-token.interface';
import { AuthorsService } from '../services/authors.service';
import { VideosService } from '../services/videos.service';
import { TelegramService } from '../services/telegram.service';
import { DashboardService } from '../services/dashboard.service';
import { EditWithAIService } from '../services/edit-with-ai.service';
import { AddAuthorDto } from '../dto/add-author.dto';
import { DeleteAuthorDto } from '../dto/delete-author.dto';
import { TranscribeVideoDto } from '../dto/transcribe-video.dto';
import { MakeTextUniqueDto } from '../dto/make-text-unique.dto';
import { StartVideoGenerationDto } from '../dto/start-video-generation.dto';
import { DeleteChannelDto } from '../dto/delete-channel.dto';
import { EditWithAIDto } from '../dto/edit-with-ai.dto';

@ApiTags('ContentZavod')
@Controller('operations/contentzavod')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentZavodController {
  constructor(
    private readonly authorsService: AuthorsService,
    private readonly videosService: VideosService,
    private readonly telegramService: TelegramService,
    private readonly dashboardService: DashboardService,
    private readonly editWithAIService: EditWithAIService,
  ) {}

  // Instagram Authors Endpoints
  @Get('authors')
  @ApiOperation({ summary: 'Get all Instagram authors for user' })
  @ApiResponse({ status: 200, description: 'Authors retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAuthors(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.authorsService.getAuthors(userId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get authors',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('authors/add')
  @ApiOperation({ summary: 'Add new Instagram author' })
  @ApiResponse({ status: 201, description: 'Author added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Instagram URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async addAuthor(
    @Req() req: RequestWithToken,
    @Body() dto: AddAuthorDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.authorsService.addAuthor(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add author',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('authors/delete')
  @ApiOperation({ summary: 'Delete Instagram author' })
  @ApiResponse({ status: 200, description: 'Author deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid author ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteAuthor(
    @Req() req: RequestWithToken,
    @Body() dto: DeleteAuthorDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.authorsService.deleteAuthor(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete author',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Videos Endpoints
  @Get('videos')
  @ApiOperation({ summary: 'Get all videos for user' })
  @ApiResponse({ status: 200, description: 'Videos retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVideos(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.videosService.getVideos(userId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get videos',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('videos/transcribe')
  @ApiOperation({ summary: 'Transcribe video audio to text' })
  @ApiResponse({ status: 200, description: 'Video transcribed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid video URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async transcribeVideo(
    @Req() req: RequestWithToken,
    @Body() dto: TranscribeVideoDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.videosService.transcribeVideo(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to transcribe video',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('videos/unique')
  @ApiOperation({ summary: 'Make text unique' })
  @ApiResponse({ status: 200, description: 'Text made unique successfully' })
  @ApiResponse({ status: 400, description: 'Invalid text' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async makeTextUnique(
    @Req() req: RequestWithToken,
    @Body() dto: MakeTextUniqueDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.videosService.makeTextUnique(userId, dto);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to make text unique',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('videos/generate/start')
  @ApiOperation({ summary: 'Start async video generation' })
  @ApiResponse({ status: 200, description: 'Video generation started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async startVideoGeneration(
    @Req() req: RequestWithToken,
    @Body() dto: StartVideoGenerationDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.videosService.startVideoGeneration(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to start video generation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('videos/generate/status')
  @ApiOperation({ summary: 'Check video generation status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Job ID is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getVideoGenerationStatus(
    @Req() req: RequestWithToken,
    @Query('jobId') jobId: string,
    @Res() res: Response,
  ) {
    try {
      if (!jobId) {
        return res.status(400).json({
          status: 400,
          message: 'Job ID is required',
        });
      }

      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.videosService.getVideoGenerationStatus(userId, jobId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get video generation status',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Dashboard Endpoint
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDashboard(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.dashboardService.getDashboardStats(userId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get dashboard stats',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Telegram Endpoints
  @Get('telegram/channels')
  @ApiOperation({ summary: 'Get all Telegram channels for user' })
  @ApiHeader({ name: 'X-Telegram-Username', description: 'Telegram username', required: true })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Telegram username is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTelegramChannels(
    @Req() req: RequestWithToken,
    @Headers('x-telegram-username') telegramUsername: string,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.telegramService.getChannels(userId, telegramUsername, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get Telegram channels',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('telegram/channels/delete')
  @ApiOperation({ summary: 'Delete Telegram channel' })
  @ApiHeader({ name: 'X-Telegram-Username', description: 'Telegram username', required: true })
  @ApiResponse({ status: 200, description: 'Channel deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid channel ID or missing Telegram username' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteTelegramChannel(
    @Req() req: RequestWithToken,
    @Body() dto: DeleteChannelDto,
    @Headers('x-telegram-username') telegramUsername: string,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.telegramService.deleteChannel(userId, dto, telegramUsername, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete Telegram channel',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('telegram/posts')
  @ApiOperation({ summary: 'Get all Telegram posts for user' })
  @ApiHeader({ name: 'X-Telegram-Username', description: 'Telegram username', required: true })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Telegram username is required' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getTelegramPosts(
    @Req() req: RequestWithToken,
    @Headers('x-telegram-username') telegramUsername: string,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.telegramService.getPosts(userId, telegramUsername, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get Telegram posts',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('telegram/posts/unique')
  @ApiOperation({ summary: 'Make Telegram post text unique' })
  @ApiHeader({ name: 'X-Telegram-Username', description: 'Telegram username', required: true })
  @ApiResponse({ status: 200, description: 'Text made unique successfully' })
  @ApiResponse({ status: 400, description: 'Invalid text or missing Telegram username' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async makeTelegramPostTextUnique(
    @Req() req: RequestWithToken,
    @Body() dto: MakeTextUniqueDto,
    @Headers('x-telegram-username') telegramUsername: string,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.telegramService.makePostTextUnique(
        userId,
        dto,
        telegramUsername,
        email,
      );
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to make Telegram post text unique',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Edit with AI Endpoint
  @Post('edit-with-ai')
  @ApiOperation({ summary: 'Edit text with AI' })
  @ApiResponse({ status: 200, description: 'Text edited successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async editWithAI(
    @Req() req: RequestWithToken,
    @Body() dto: EditWithAIDto,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;
      
      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.editWithAIService.editText(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to edit text with AI',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
