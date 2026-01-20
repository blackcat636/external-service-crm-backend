import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    
    this.logger.debug(`Checking authentication for ${request.method} ${request.url}`);
    
    if (!authHeader) {
      this.logger.warn('No Authorization header found');
      return super.canActivate(context);
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Invalid Authorization header format: ${authHeader.substring(0, 20)}...`);
      return super.canActivate(context);
    }

    const token = authHeader.substring(7);
    this.logger.debug(`Token extracted (length: ${token.length}): ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error(`JWT validation error: ${err.message}`, err.stack);
      throw err;
    }

    if (!user) {
      this.logger.warn(`No user extracted from token. Info: ${JSON.stringify(info)}`);
      throw new UnauthorizedException('Invalid or missing service token');
    }

    this.logger.debug(`User extracted from token: ${JSON.stringify({
      sub: user.sub,
      email: user.email,
      role: user.role,
      type: user.type,
      service: user.service,
    })}`);

    // Validate that this is a service token
    if (user.type !== 'service') {
      this.logger.warn(`Invalid user type: ${user.type}, expected 'service'`);
      throw new UnauthorizedException('Invalid token type. Expected service token.');
    }

    this.logger.debug(`Authentication successful for user ${user.sub}`);
    return user;
  }
}
