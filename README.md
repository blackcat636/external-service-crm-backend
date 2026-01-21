# CRM External Service

External service with SSO (Single Sign-On) integration for CRM. This service allows users to authenticate through the main CRM server and access external services seamlessly.

## Overview

This is a NestJS-based external service that integrates with the main CRM server through:
- **SSO Authentication**: Users can authenticate once on the main server and access this service automatically
- **Service Tokens**: JWT tokens (RS256) for secure inter-server communication
- **REST API**: Access to user data, balance operations, and analytics

## Features

- ✅ SSO authentication flow
- ✅ Service token management (JWT RS256)
- ✅ User profile and permissions access
- ✅ Balance operations (check, charge)
- ✅ Analytics event tracking
- ✅ Health and readiness checks
- ✅ Swagger API documentation

## 📖 Developer Documentation

### For AI Agents

If you are an AI agent helping a programmer work with the backend project, please read:

**English:**
1. **[AI_AGENT_RULES_EN.md](./AI_AGENT_RULES_EN.md)** ⚠️ - **START HERE!** Short list of rules
2. **[AI_AGENT_GUIDE_EN.md](./AI_AGENT_GUIDE_EN.md)** - Full guide with all rules and examples
3. **[AI_AGENT_QUICK_REFERENCE_EN.md](./AI_AGENT_QUICK_REFERENCE_EN.md)** - Quick reference for quick start
4. **[AI_AGENT_CODE_EXAMPLES_EN.md](./AI_AGENT_CODE_EXAMPLES_EN.md)** - Ready-to-use code examples for copying

**Ukrainian:**
1. **[AI_AGENT_RULES.md](./AI_AGENT_RULES.md)** ⚠️ - **ПОЧНІТЬ З ЦЬОГО!** Короткий список правил
2. **[AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md)** - Повна інструкція з усіма правилами та прикладами
3. **[AI_AGENT_QUICK_REFERENCE.md](./AI_AGENT_QUICK_REFERENCE.md)** - Швидкий довідник для швидкого початку
4. **[AI_AGENT_CODE_EXAMPLES.md](./AI_AGENT_CODE_EXAMPLES.md)** - Готові приклади коду для копіювання

> **Important**: 
> - DO NOT change authentication logic (`src/auth/`, `src/services/main-server-client.service.ts`)
> - Use `UserContextService` to get `userLogin` from token
> - Use `N8NWebhookService` for n8n webhook calls
> - Use `MainServerClientService` for main server communication
> - Always use `JwtAuthGuard` for protected routes

## Installation

1. **Clone and install dependencies:**

```bash
cd /home/whitecat636/WORK/NEST/crm_external_service
npm install
```

2. **Configure environment variables:**

Copy `.env.example` to `.env` and configure:

```env
MAIN_SERVER_URL=http://localhost:3000/api
MAIN_FRONTEND_URL=http://localhost:3000
SERVICE_NAME=crm-external-service
PORT=3001
NODE_ENV=development
JWT_PUBLIC_KEY=  # Optional - will be fetched automatically
LOG_LEVEL=debug
```

3. **Start the service:**

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## SSO Flow

### Backend Flow

1. User makes request to external service
2. `AuthGuard` checks for service token in headers
3. If token is missing or invalid:
   - Returns 401 or redirects (for web requests)
   - Client redirects to `/auth/sso/initiate?redirect_uri=...`
4. Main server generates SSO code and redirects back
5. Client exchanges code for service token via `/auth/sso/exchange`
6. Service token is stored and used for subsequent requests

### Frontend Integration

```typescript
// Check authentication on page load
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');

  if (code) {
    // Handle SSO callback
    authService.handleCallback(code).then(success => {
      if (success) {
        // Token saved, can make requests
      }
    });
  } else {
    // Check auth status
    authService.checkAuth().then(isAuth => {
      if (!isAuth) {
        authService.initiateLogin();
      }
    });
  }
}, []);
```

## API Endpoints

### Authentication

- `GET /auth/sso/initiate` - Initiate SSO login
- `POST /auth/sso/exchange` - Exchange SSO code for token
- `GET /auth/check` - Check authentication status

### Health

- `GET /health` - Health check
- `GET /health/ready` - Readiness check (includes main server connectivity)

### Operations (Protected)

- `GET /operations/profile` - Get user profile
- `GET /operations/balances` - Get user balances
- `POST /operations/process-payment` - Process payment
- `POST /operations/analytics/event` - Send analytics event
- `POST /operations/analytics/batch` - Send batch analytics events

All protected endpoints require `Authorization: Bearer <service-token>` header.

## API Documentation

Swagger documentation is available at:
- **Development**: http://localhost:3001/api/docs

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MAIN_SERVER_URL` | Main CRM server API URL | Yes | - |
| `MAIN_FRONTEND_URL` | Main CRM server frontend URL | No | Auto-derived from MAIN_SERVER_URL |
| `SERVICE_NAME` | Service identifier | Yes | `crm-external-service` |
| `PORT` | Server port | No | `3001` |
| `NODE_ENV` | Environment | No | `development` |
| `JWT_PUBLIC_KEY` | RSA public key (optional) | No | Auto-fetched |
| `LOG_LEVEL` | Logging level | No | `debug` |

### JWT Public Key

The service automatically fetches the RSA public key from the main server on startup:
- Endpoint: `GET {MAIN_SERVER_URL}/auth/public-key`
- Cached for 1 hour
- Can be overridden with `JWT_PUBLIC_KEY` environment variable

## Security

1. **RS256 JWT**: Uses RSA public key for token validation
2. **Service Tokens**: 90-day expiration tokens
3. **HTTPS**: Required in production
4. **Token Validation**: Verified before each request
5. **Error Handling**: Proper handling of 401 errors

## Service Token

Service tokens are JWT tokens with:
- **Algorithm**: RS256 (RSA)
- **Expiration**: 90 days
- **Type**: `service`
- **Payload**: User ID, email, role, service name

### Getting a Service Token

1. External service redirects user to main service **frontend**: `{MAIN_FRONTEND_URL}/sso/initiate?redirect_uri=...`
2. User authenticates on main service frontend
3. Main service frontend redirects back to external service with SSO code
4. External service backend exchanges code: `POST /auth/sso/exchange` with code (backend-to-backend)
5. Receive service token in response

## Usage Examples

### Process Payment

```typescript
POST /operations/process-payment
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "amount": 100.50,
  "currencyCode": "USD",
  "referenceId": "PAYMENT_123456",
  "referenceType": "external-service",
  "description": "Payment for service"
}
```

### Send Analytics Event

```typescript
POST /operations/analytics/event
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "eventType": "payment.processed",
  "data": {
    "amount": 100,
    "currency": "USD",
    "transactionId": "TXN_123"
  },
  "metadata": {
    "source": "external-service"
  }
}
```

## Integration with Main Server

### Available Endpoints

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

## Development

### Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── auth/                      # Authentication
│   ├── auth.service.ts
│   ├── auth.guard.ts
│   ├── jwt.strategy.ts
│   └── interfaces/
├── services/                  # Business logic services
│   ├── main-server-client.service.ts
│   ├── balance-api.service.ts
│   ├── analytics.service.ts
│   └── public-key.service.ts
├── controllers/               # API controllers
│   ├── health.controller.ts
│   ├── operations.controller.ts
│   └── auth.controller.ts
├── config/                    # Configuration
│   ├── config.module.ts
│   └── jwt.config.ts
├── dto/                       # Data Transfer Objects
│   ├── charge-balance.dto.ts
│   ├── analytics-event.dto.ts
│   └── sso-exchange.dto.ts
└── filters/                   # Exception filters
    └── http-exception.filter.ts
```

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Troubleshooting

### Public Key Loading Fails

- Check `MAIN_SERVER_URL` is correct
- Verify main server is running
- Check network connectivity
- Try setting `JWT_PUBLIC_KEY` manually

### Authentication Errors

- Verify service token is valid (not expired)
- Check token type is `service`
- Ensure token is in Authorization header
- Verify main server is accessible

### Connection Errors

- Check `MAIN_SERVER_URL` configuration
- Verify network connectivity
- Check firewall rules
- Review main server logs

## License

UNLICENSED - Private project

## Support

For issues or questions, contact the development team.
