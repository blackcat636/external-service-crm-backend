import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly mainServerUrl: string;
  private readonly mainFrontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.mainServerUrl =
      this.configService.get<string>('MAIN_SERVER_URL') || '';
    this.mainFrontendUrl =
      this.configService.get<string>('MAIN_FRONTEND_URL') || '';
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    // Handle 401 Unauthorized
    // ВАЖЛИВО: Бекенд НЕ має робити redirect на SSO!
    // Фронтенд сам має обробляти 401 та робити redirect тільки коли потрібно.
    // Тут ми просто повертаємо 401 з інформацією про те, що потрібна авторизація.
    if (status === HttpStatus.UNAUTHORIZED) {
      // Для SSO initiate endpoint - не робимо redirect, просто повертаємо помилку
      // Це endpoint, який сам має ініціювати SSO, тому не треба робити redirect
      if (request.url.includes('/auth/sso/initiate')) {
        this.logger.warn(`401 on SSO initiate endpoint - this shouldn't happen`);
        return response.status(status).json({
          status,
          message: 'Cannot initiate SSO: Authentication required',
          error: 'Unauthorized',
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      }

      // Для всіх інших endpoint - повертаємо 401 без redirect
      // Фронтенд сам має обробити 401 та викликати initiateSSO() якщо потрібно
      this.logger.warn(`401 Unauthorized on ${request.method} ${request.url}`);
      
      const errorResponse = {
        status,
        message: 'Authentication required',
        error: 'Unauthorized',
        path: request.url,
        timestamp: new Date().toISOString(),
      };

      // НЕ робимо redirect! Повертаємо просто 401 JSON
      return response.status(status).json(errorResponse);
    }

    const errorResponse = {
      status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.error(
      `HTTP ${status} Error: ${message} - Path: ${request.url}`,
    );

    response.status(status).json(errorResponse);
  }
}
