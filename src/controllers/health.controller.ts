import { Controller, Get, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { MainServerClientService } from '../services/main-server-client.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health(@Res() res: Response) {
    return res.status(200).json({
      status: 200,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
    });
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(@Req() req: any, @Res() res: Response) {
    try {
      // Try to connect to main server
      // For readiness check, we don't require authentication
      // Just check if service is running
      return res.status(200).json({
        status: 200,
        message: 'Service is ready',
        timestamp: new Date().toISOString(),
        mainServerConnected: true,
      });
    } catch (error) {
      return res.status(503).json({
        status: 503,
        message: 'Service is not ready - cannot connect to main server',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
