import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { SsoExchangeDto } from '../dto/sso-exchange.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('sso/initiate')
  @ApiOperation({ summary: 'Initiate SSO login flow' })
  @ApiQuery({ name: 'redirect_uri', required: true, description: 'Redirect URI after authentication' })
  @ApiQuery({ name: 'service', required: false, description: 'Service name' })
  @ApiResponse({ status: 302, description: 'Redirects to main server SSO' })
  initiateSso(
    @Query('redirect_uri') redirectUri: string,
    @Query('service') service: string | undefined,
    @Res() res: Response,
  ) {
    if (!redirectUri) {
      return res.status(400).json({
        status: 400,
        message: 'redirect_uri query parameter is required',
      });
    }

    const ssoUrl = this.authService.initiateLogin(redirectUri, service);
    return res.redirect(302, ssoUrl);
  }

  @Post('sso/exchange')
  @ApiOperation({ summary: 'Exchange SSO code for service token' })
  @ApiResponse({ status: 200, description: 'Token retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async exchangeCode(
    @Body() exchangeDto: SsoExchangeDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.handleCallback(
        exchangeDto.code,
        exchangeDto.redirectUri,
      );

      return res.status(200).json({
        status: 200,
        data: result,
        message: 'Token retrieved successfully',
      });
    } catch (error) {
      return res.status(400).json({
        status: 400,
        message: error.message || 'Failed to exchange code',
      });
    }
  }

  @Get('check')
  @ApiOperation({ summary: 'Check authentication status' })
  @ApiResponse({ status: 200, description: 'Authentication status' })
  async checkAuth(@Res() res: Response) {
    const isAuthenticated = await this.authService.checkAuth();
    return res.status(200).json({
      status: 200,
      data: {
        authenticated: isAuthenticated,
      },
    });
  }
}
