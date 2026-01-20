# CRM External Service - Project Summary

> **Type:** External Service (Standalone NestJS Application)  
> **Purpose:** External service with SSO integration for CRM system  
> **Technology Stack:** NestJS, TypeScript, Passport JWT (RS256), Axios

## Overview

This is a standalone NestJS application that serves as an external service integrated with the main CRM system through SSO (Single Sign-On) authentication. The service allows users to authenticate once on the main server and access external services seamlessly.

## Architecture

### Project Type
- **Standalone NestJS Application** (separate from main CRM)
- **Microservice-style** architecture
- **Stateless** - uses JWT service tokens for authentication
- **No database** - communicates with main CRM server via HTTP API

### Technology Stack

**Core Framework:**
- NestJS 11.x
- TypeScript 5.x
- Express (via @nestjs/platform-express)

**Authentication & Security:**
- Passport.js with JWT strategy
- RS256 (RSA) algorithm for JWT validation
- Public key fetched from main server or configured via env

**HTTP Client:**
- Axios (via @nestjs/axios)
- For communication with main CRM server

**Documentation:**
- Swagger/OpenAPI (via @nestjs/swagger)
- Available at `/api/docs`

**Configuration:**
- @nestjs/config for environment variables
- Global ConfigModule

**Validation:**
- class-validator
- class-transformer
- Global ValidationPipe

## Project Structure

```
crm_external_service/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   │
│   ├── auth/                      # Authentication module
│   │   ├── auth.service.ts        # SSO flow logic
│   │   ├── auth.guard.ts          # JWT authentication guard
│   │   ├── jwt.strategy.ts        # Passport JWT strategy (RS256)
│   │   └── interfaces/
│   │       └── request-with-token.interface.ts
│   │
│   ├── config/                    # Configuration
│   │   ├── config.module.ts       # Config module
│   │   └── jwt.config.ts          # JWT config service (public key management)
│   │
│   ├── controllers/               # API controllers
│   │   ├── auth.controller.ts     # SSO endpoints
│   │   ├── health.controller.ts   # Health checks
│   │   └── operations.controller.ts # Business operations (protected)
│   │
│   ├── modules/                   # Feature modules
│   │   └── contentzavod/          # ContentZavod module
│   │       ├── contentzavod.module.ts
│   │       ├── controllers/
│   │       │   └── contentzavod.controller.ts
│   │       ├── services/
│   │       │   ├── n8n-webhook.service.ts
│   │       │   ├── authors.service.ts
│   │       │   ├── videos.service.ts
│   │       │   ├── telegram.service.ts
│   │       │   ├── dashboard.service.ts
│   │       │   ├── edit-with-ai.service.ts
│   │       │   └── user-context.service.ts
│   │       ├── dto/
│   │       └── utils/
│   │
│   ├── services/                  # Business logic services
│   │   ├── main-server-client.service.ts # HTTP client for main CRM
│   │   ├── balance-api.service.ts # Balance operations wrapper
│   │   ├── analytics.service.ts   # Analytics wrapper
│   │   └── public-key.service.ts  # Public key fetching/caching
│   │
│   ├── dto/                       # Data Transfer Objects
│   │   ├── sso-exchange.dto.ts    # SSO code exchange
│   │   ├── charge-balance.dto.ts  # Balance operations
│   │   └── analytics-event.dto.ts # Analytics events
│   │
│   └── filters/                   # Exception filters
│       └── http-exception.filter.ts # Global exception handler
│
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

## Key Components

### 1. Authentication (`auth/`)

**AuthService:**
- `initiateLogin()` - Returns SSO URL (redirects to **frontend**, not backend)
- `handleCallback()` - Exchanges SSO code for service token (backend-to-backend)
- `checkAuth()` - Validates current service token
- `setServiceToken()` / `clearToken()` - Token management

**JwtStrategy:**
- Validates JWT tokens using RS256 algorithm
- Validates token type is `service`
- Optional service name validation
- Public key from `JwtConfigService`

**JwtAuthGuard:**
- Protects routes requiring authentication
- Validates service token type
- Throws 401 if token is invalid/missing

### 2. Configuration (`config/`)

**JwtConfigService:**
- Manages JWT public key loading and caching
- Pre-loads public key on module init
- Supports environment variable or fetching from main server
- Singleton pattern for key caching

**PublicKeyService:**
- Fetches public key from main server: `{MAIN_SERVER_URL}/auth/public-key`
- Caches public key for 1 hour
- Handles fetch errors

### 3. Controllers (`controllers/`)

**AuthController:**
- `GET /auth/sso/initiate` - Initiates SSO flow (redirects to frontend)
- `POST /auth/sso/exchange` - Exchanges code for service token
- `GET /auth/check` - Checks authentication status

**HealthController:**
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (validates main server connectivity)

**OperationsController:**
- `GET /operations/profile` - Get user profile (protected)
- `GET /operations/balances` - Get user balances (protected)
- `POST /operations/process-payment` - Process payment (protected)
- `POST /operations/analytics/event` - Send analytics event (protected)
- `POST /operations/analytics/batch` - Send batch analytics events (protected)

**ContentZavodController:**
- `GET /operations/contentzavod/authors` - Get Instagram authors (protected)
- `POST /operations/contentzavod/authors/add` - Add Instagram author (protected)
- `POST /operations/contentzavod/authors/delete` - Delete Instagram author (protected)
- `GET /operations/contentzavod/videos` - Get videos (protected)
- `POST /operations/contentzavod/videos/transcribe` - Transcribe video (protected)
- `POST /operations/contentzavod/videos/unique` - Make text unique (protected)
- `POST /operations/contentzavod/videos/generate/start` - Start video generation (protected)
- `GET /operations/contentzavod/videos/generate/status` - Check generation status (protected)
- `GET /operations/contentzavod/dashboard` - Get dashboard stats (protected)
- `GET /operations/contentzavod/telegram/channels` - Get Telegram channels (protected, requires X-Telegram-Username)
- `POST /operations/contentzavod/telegram/channels/delete` - Delete Telegram channel (protected, requires X-Telegram-Username)
- `GET /operations/contentzavod/telegram/posts` - Get Telegram posts (protected, requires X-Telegram-Username)
- `POST /operations/contentzavod/telegram/posts/unique` - Make Telegram post text unique (protected, requires X-Telegram-Username)
- `POST /operations/contentzavod/edit-with-ai` - Edit text with AI (protected)

### 4. Services (`services/`)

**MainServerClientService:**
- HTTP client for communicating with main CRM server
- Manages service token storage
- Methods: `getUserProfile()`, `getUserStructure()`, `getUserPermissions()`, etc.
- Automatic token injection in Authorization header
- Error handling and response formatting

**BalanceApiService:**
- Wrapper around balance operations
- Methods: `getUserBalances()`, `chargeBalance()`, `getBalanceSettings()`

**AnalyticsService:**
- Wrapper around analytics operations
- Methods: `sendEvent()`, `sendBatchEvents()`

### 5. Exception Handling (`filters/`)

**HttpExceptionFilter:**
- Global exception filter
- Handles 401 errors - redirects to SSO (frontend URL)
- Formats error responses consistently
- Logs errors

## Environment Variables

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `MAIN_SERVER_URL` | Main CRM server API URL | Yes | - | `http://localhost:3000/api` |
| `MAIN_FRONTEND_URL` | Main CRM server frontend URL | No | Auto-derived from MAIN_SERVER_URL | `http://localhost:3000` |
| `SERVICE_NAME` | Service identifier | Yes | `crm-external-service` | `external-service` |
| `PORT` | Server port | No | `3001` | `3001` |
| `NODE_ENV` | Environment | No | `development` | `production` |
| `JWT_PUBLIC_KEY` | RSA public key (optional) | No | Auto-fetched | `-----BEGIN PUBLIC KEY-----...` |
| `LOG_LEVEL` | Logging level | No | `debug` | `info` |

## SSO Flow Architecture

### Important Principle
**User should NOT see backend URLs. All user-facing redirects go to frontends.**

### Complete SSO Flow

1. **User Request:** User makes request to external service (frontend)

2. **Backend Check:** External service backend `AuthGuard` checks for service token in `Authorization` header

3. **If Token Missing/Invalid:**
   - External service redirects user to **main service FRONTEND** (not backend)
   - URL: `{MAIN_FRONTEND_URL}/sso/initiate?redirect_uri={external_service_url}&service={SERVICE_NAME}`
   - ✅ User sees frontend URL, not backend URL

4. **Main Service Frontend:**
   - Frontend checks authentication status via `/api/auth/sso/initiate-check`
   - If authenticated: redirects to external service with SSO code
   - If not authenticated: redirects to main service login page

5. **After Login:**
   - Main service frontend redirects to external service with SSO code
   - URL: `{external_service_url}?code={sso_code}`

6. **Code Exchange:**
   - External service **backend** exchanges code for service token
   - Endpoint: `POST {MAIN_SERVER_URL}/auth/sso/exchange` (backend-to-backend)
   - Receives service token (JWT RS256)

7. **Token Storage:**
   - Service token stored in `MainServerClientService`
   - Used for subsequent API requests to main server

### Key Points
- User redirects: **frontend → frontend** (user sees frontend URLs only)
- Backend communication: **backend → backend** (using service tokens)
- Service token: JWT RS256, type `service`, 90-day expiration
- Token validation: Public key from main server (cached 1 hour)

## API Endpoints

### Public Endpoints

**Authentication:**
- `GET /auth/sso/initiate` - Initiate SSO login (redirects to frontend)
- `POST /auth/sso/exchange` - Exchange SSO code for service token
- `GET /auth/check` - Check authentication status

**Health:**
- `GET /health` - Health check
- `GET /health/ready` - Readiness check

**Documentation:**
- `GET /api/docs` - Swagger documentation

### Protected Endpoints (Require `Authorization: Bearer <service-token>`)

**User Operations:**
- `GET /operations/profile` - Get user profile
- `GET /operations/balances` - Get user balances
- `POST /operations/process-payment` - Process payment
- `POST /operations/analytics/event` - Send analytics event
- `POST /operations/analytics/batch` - Send batch analytics events

**ContentZavod Operations:**
- `GET /operations/contentzavod/authors` - Get Instagram authors
- `POST /operations/contentzavod/authors/add` - Add Instagram author
- `POST /operations/contentzavod/authors/delete` - Delete Instagram author
- `GET /operations/contentzavod/videos` - Get videos
- `POST /operations/contentzavod/videos/transcribe` - Transcribe video
- `POST /operations/contentzavod/videos/unique` - Make text unique
- `POST /operations/contentzavod/videos/generate/start` - Start video generation
- `GET /operations/contentzavod/videos/generate/status` - Check generation status
- `GET /operations/contentzavod/dashboard` - Get dashboard stats
- `GET /operations/contentzavod/telegram/channels` - Get Telegram channels
- `POST /operations/contentzavod/telegram/channels/delete` - Delete Telegram channel
- `GET /operations/contentzavod/telegram/posts` - Get Telegram posts
- `POST /operations/contentzavod/telegram/posts/unique` - Make Telegram post text unique
- `POST /operations/contentzavod/edit-with-ai` - Edit text with AI

## Main Server Integration

### Available Endpoints (via MainServerClientService)

**Users:**
- `GET /users/profile`
- `PUT /users/profile`
- `GET /users/structure`
- `GET /users/my-permissions`

**Balance:**
- `GET /balance`
- `GET /balance/:currency`
- `GET /balance/transactions`
- `POST /balance/charge`
- `GET /balance/settings`
- `PUT /balance/settings`

**Analytics:**
- `POST /analytics/events`
- `POST /analytics/events/batch`

All requests automatically include `Authorization: Bearer <service-token>` header.

## Authentication Details

### Service Token
- **Algorithm:** RS256 (RSA)
- **Type:** `service` (validated in JwtStrategy)
- **Expiration:** 90 days
- **Payload:**
  ```typescript
  {
    sub: number;        // User ID
    email: string;      // User email
    role: string;       // User role
    type: 'service';    // Token type
    service?: string;   // Service name (optional)
    iat?: number;       // Issued at
    exp?: number;       // Expiration
  }
  ```

### Public Key Management
- Fetched from: `{MAIN_SERVER_URL}/auth/public-key`
- Cached for 1 hour
- Pre-loaded on module init
- Can be overridden via `JWT_PUBLIC_KEY` environment variable
- Fallback: Throws error if key cannot be loaded

## Response Format

All endpoints return consistent response format:

**Success:**
```typescript
{
  status: 200 | 201,
  data?: any,
  message?: string
}
```

**Error:**
```typescript
{
  status: 400 | 401 | 404 | 500,
  message: string,
  error?: string
}
```

## Error Handling

### 401 Unauthorized
- Global `HttpExceptionFilter` catches 401 errors
- For browser requests: Redirects to SSO (frontend URL)
- For API requests: Returns JSON with SSO URL
- Format:
  ```json
  {
    "status": 401,
    "message": "Authentication required",
    "error": "Unauthorized",
    "ssoUrl": "{MAIN_FRONTEND_URL}/sso/initiate?redirect_uri=...",
    "redirect": false
  }
  ```

### Other Errors
- Standard HTTP status codes
- Consistent error response format
- Logging via NestJS Logger

## Dependencies

### Core Dependencies
- `@nestjs/common` - Core NestJS functionality
- `@nestjs/core` - NestJS core
- `@nestjs/config` - Configuration management
- `@nestjs/axios` - HTTP client
- `@nestjs/passport` - Authentication
- `@nestjs/jwt` - JWT utilities
- `@nestjs/swagger` - API documentation
- `passport` - Authentication framework
- `passport-jwt` - JWT strategy
- `axios` - HTTP client
- `class-validator` - Validation
- `class-transformer` - Transformation
- `rxjs` - Reactive extensions

### Development Dependencies
- TypeScript
- Jest (testing)
- ESLint
- Prettier
- @nestjs/testing

## Configuration Files

### `package.json`
- Standard NestJS project structure
- Scripts: `build`, `start`, `start:dev`, `start:prod`, `test`, etc.
- Dependencies listed above

### `tsconfig.json`
- TypeScript configuration
- Path aliases (if any)

### `nest-cli.json`
- NestJS CLI configuration

## Key Implementation Details

### 1. SSO Redirect Logic
- `AuthService.initiateLogin()` uses `MAIN_FRONTEND_URL` (or derives from `MAIN_SERVER_URL`)
- Redirects to: `{MAIN_FRONTEND_URL}/sso/initiate?redirect_uri=...&service=...`
- User should NOT see backend URLs

### 2. Token Storage
- Service token stored in `MainServerClientService` (in-memory)
- Not persisted to database
- Cleared on service restart

### 3. Public Key Loading
- `JwtConfigService` pre-loads public key on module init
- `PublicKeyService` caches key for 1 hour
- Fallback to environment variable if fetch fails

### 4. Request Flow
1. Request arrives at controller
2. `JwtAuthGuard` validates token
3. If valid: Request proceeds
4. If invalid: 401 → `HttpExceptionFilter` → Redirect to SSO (frontend)

### 5. Main Server Communication
- All requests to main server use `MainServerClientService`
- Automatic token injection in `Authorization` header
- Consistent error handling
- Response format conversion

## Testing Considerations

- Unit tests: Test services independently
- Integration tests: Test with mocked main server
- E2E tests: Test complete SSO flow
- Mock dependencies: `HttpService`, `ConfigService`

## Deployment Considerations

### Environment Setup
- Set `MAIN_SERVER_URL` (required)
- Set `MAIN_FRONTEND_URL` (recommended, or auto-derived)
- Set `SERVICE_NAME` (required)
- Optional: `JWT_PUBLIC_KEY` (if not fetching from main server)

### Health Checks
- `/health` - Basic health check
- `/health/ready` - Validates main server connectivity

### Security
- Use HTTPS in production
- Service tokens are JWT (secure)
- Public key validation
- CORS configured (adjust for production)

### Scalability
- Stateless design (can scale horizontally)
- Token storage in-memory (consider Redis for multi-instance)
- Public key caching (reduces main server load)

## Common Patterns

### Adding New Protected Endpoint
1. Add method to appropriate controller
2. Use `@UseGuards(JwtAuthGuard)` decorator
3. Use `MainServerClientService` for main server calls
4. Return consistent response format

### Adding New Main Server Endpoint
1. Add method to `MainServerClientService`
2. Use private `request<T>()` method
3. Handle errors consistently
4. Return `MainServerResponse<T>` format

### Error Handling
- Use NestJS `HttpException` for standard errors
- Global filter handles 401 (redirects to SSO)
- Log errors with context
- Return consistent error format

## Integration Points

### With Main CRM Server
- SSO authentication flow
- User profile access
- Balance operations
- Analytics events
- Public key fetching

### With Frontend
- SSO redirects (frontend URLs)
- Error responses (for API calls)
- Service token management (client-side)

## Notes for New Instance Creation

1. **Environment Variables:**
   - Copy `.env.example` to `.env`
   - Set `MAIN_SERVER_URL` (main CRM backend API)
   - Set `MAIN_FRONTEND_URL` (main CRM frontend URL)
   - Set `SERVICE_NAME` (unique identifier)

2. **Service Token:**
   - Obtained via SSO flow
   - Stored in-memory
   - Validated on each request
   - 90-day expiration

3. **Public Key:**
   - Fetched from main server on startup
   - Cached for 1 hour
   - Required for JWT validation

4. **Main Server Communication:**
   - All requests use `MainServerClientService`
   - Service token automatically injected
   - Error handling included

5. **SSO Flow:**
   - User redirects go to **frontend** URLs
   - Backend communication uses service tokens
   - Code exchange is backend-to-backend

6. **Configuration:**
   - No database required
   - Configuration via environment variables
   - Stateless design

## Adaptation Guidelines

### When Creating New External Service

1. **Copy Structure:**
   - Copy entire project structure
   - Update `package.json` name and description
   - Update service name in env vars

2. **Update Configuration:**
   - Set new `SERVICE_NAME`
   - Update `MAIN_SERVER_URL` if needed
   - Update `MAIN_FRONTEND_URL` if needed

3. **Customize Controllers:**
   - Modify `OperationsController` for specific operations
   - Add new controllers as needed
   - Keep authentication pattern

4. **Add Business Logic:**
   - Extend `MainServerClientService` for new endpoints
   - Add new services if needed
   - Follow existing patterns

5. **Update Documentation:**
   - Update `README.md`
   - Update Swagger docs
   - Document new endpoints

### When Adapting Existing Service

1. **Keep Core Structure:**
   - Maintain authentication flow
   - Keep SSO redirect logic (frontend URLs)
   - Preserve error handling

2. **Extend Functionality:**
   - Add new endpoints to controllers
   - Add new methods to services
   - Add new DTOs as needed

3. **Maintain Consistency:**
   - Use same response format
   - Follow same error handling
   - Use same authentication pattern

---

**Created:** 2024  
**Last Updated:** 2024  
**Version:** 1.0
