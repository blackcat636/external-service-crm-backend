import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RequestWithToken } from '../auth/interfaces/request-with-token.interface';
import { requireServiceToken } from '../auth/utils/extract-token.util';
import { BalanceApiService } from '../services/balance-api.service';
import { AnalyticsService } from '../services/analytics.service';
import { MainServerClientService } from '../services/main-server-client.service';
import { ChargeBalanceDto } from '../dto/charge-balance.dto';
import { AnalyticsEventDto, AnalyticsBatchDto } from '../dto/analytics-event.dto';

@ApiTags('Operations')
@Controller('operations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OperationsController {
  constructor(
    private readonly balanceApi: BalanceApiService,
    private readonly analytics: AnalyticsService,
    private readonly mainServerClient: MainServerClientService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const serviceToken = requireServiceToken(req);
      const result = await this.mainServerClient.getUserProfile(serviceToken);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get profile',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('balances')
  @ApiOperation({ summary: 'Get user balances' })
  @ApiResponse({ status: 200, description: 'Balances retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBalances(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const serviceToken = requireServiceToken(req);
      const result = await this.balanceApi.getUserBalances(serviceToken);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get balances',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('process-payment')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or insufficient funds' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async processPayment(
    @Req() req: RequestWithToken,
    @Body() data: ChargeBalanceDto,
    @Res() res: Response,
  ) {
    try {
      const serviceToken = requireServiceToken(req);

      // 1. Check if user has sufficient funds
      const hasFunds = await this.balanceApi.checkSufficientFunds(
        serviceToken,
        data.currencyCode,
        data.amount,
      );

      if (!hasFunds) {
        return res.status(400).json({
          status: 400,
          message: 'Insufficient funds',
        });
      }

      // 2. Charge balance
      const chargeResult = await this.balanceApi.chargeBalance(serviceToken, {
        amount: data.amount,
        currencyCode: data.currencyCode,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        description: data.description || 'Payment for service',
      });

      if (chargeResult.status !== 200) {
        return res.status(chargeResult.status).json(chargeResult);
      }

      // 3. Send analytics event
      try {
        await this.analytics.sendEvent(serviceToken, {
          eventType: 'payment.processed',
          data: {
            amount: data.amount,
            currency: data.currencyCode,
            transactionId: chargeResult.data?.transactionId,
            referenceId: data.referenceId,
          },
          metadata: {
            source: 'external-service',
          },
        });
      } catch (analyticsError) {
        // Log but don't fail the payment if analytics fails
        console.error('Failed to send analytics event:', analyticsError);
      }

      return res.status(200).json({
        status: 200,
        message: 'Payment processed successfully',
        data: {
          transactionId: chargeResult.data?.transactionId,
          amount: data.amount,
          currency: data.currencyCode,
        },
      });
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process payment',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analytics/event')
  @ApiOperation({ summary: 'Send analytics event' })
  @ApiResponse({ status: 200, description: 'Event sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendAnalyticsEvent(
    @Req() req: RequestWithToken,
    @Body() event: AnalyticsEventDto,
    @Res() res: Response,
  ) {
    try {
      const serviceToken = requireServiceToken(req);
      const result = await this.analytics.sendEvent(serviceToken, event);
      return res.status(result.status || 200).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send analytics event',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analytics/batch')
  @ApiOperation({ summary: 'Send batch analytics events' })
  @ApiResponse({ status: 200, description: 'Events sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendAnalyticsBatch(
    @Req() req: RequestWithToken,
    @Body() batch: AnalyticsBatchDto,
    @Res() res: Response,
  ) {
    try {
      const serviceToken = requireServiceToken(req);
      const result = await this.analytics.sendBatch(serviceToken, batch.events);
      return res.status(result.status || 200).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to send analytics batch',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
