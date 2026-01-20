import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtConfigService } from '../config/jwt.config';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  type: string;
  service?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly jwtConfigService: JwtConfigService,
    private readonly configService: ConfigService,
  ) {
    // Use secretOrKeyProvider to asynchronously get the public key
    // This allows the key to be loaded even if onModuleInit hasn't completed yet
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (request, rawJwtToken, done) => {
        try {
          this.logger.debug('Loading public key for token validation...');
          const publicKey = await jwtConfigService.loadPublicKey();
          this.logger.debug('Public key loaded successfully');
          done(null, publicKey);
        } catch (error) {
          this.logger.error(`Failed to load public key: ${error.message}`, error.stack);
          done(error, undefined);
        }
      },
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      service: payload.service,
    })}`);

    // Validate that this is a service token
    if (payload.type !== 'service') {
      this.logger.warn(`Invalid token type: ${payload.type}, expected 'service'`);
      throw new UnauthorizedException('Invalid token type. Expected service token.');
    }

    // Validate service name if required
    // Only validate if SERVICE_NAME is explicitly set and both values are present
    // Allow if service names match exactly, or if token service contains config service name (for flexible naming)
    const serviceName = this.configService.get<string>('SERVICE_NAME');
    this.logger.debug(`Service name from config: ${serviceName}, token service: ${payload.service}`);
    
    if (serviceName && payload.service) {
      // Exact match - always allowed
      if (payload.service === serviceName) {
        this.logger.debug(`Service name matches exactly: ${serviceName}`);
      }
      // Flexible match: allow if token service contains config service name or vice versa
      // This handles cases like token="external-service" vs config="crm-external-service"
      else if (
        payload.service.includes(serviceName) ||
        serviceName.includes(payload.service)
      ) {
        this.logger.debug(`Service name flexible match: ${serviceName} <-> ${payload.service}`);
      }
      // No match - reject
      else {
        this.logger.warn(`Service token mismatch: expected ${serviceName}, got ${payload.service}`);
        throw new UnauthorizedException(
          `Service token does not match expected service: ${serviceName}`,
        );
      }
    } else if (serviceName && !payload.service) {
      // Config requires service name but token doesn't have it
      this.logger.warn(`Service name required in token but missing. Config: ${serviceName}`);
      throw new UnauthorizedException(
        `Service token must include service name: ${serviceName}`,
      );
    }

    this.logger.debug(`Token validation successful for user ${payload.sub}`);
    
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      service: payload.service,
    };
  }
}
