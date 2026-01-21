# Rules for AI Agent - CRM External Service Backend

> Short list of rules that MUST be followed when working with the backend

## 🎯 Main Rule

**This backend service can be cloned and adapted for different projects with new functionality. BUT the SSO authentication mechanism, JWT validation, and main server integration MUST remain unchanged.**

### What can be changed:
- ✅ Business logic in modules (e.g., `modules/contentzavod/`)
- ✅ New modules can be added
- ✅ New endpoints can be added
- ✅ New services for business logic
- ✅ DTOs and validation
- ✅ n8n webhook endpoints (via environment variables)

### What must remain:
- ❌ **SSO Authentication** (`src/auth/`, `src/controllers/auth.controller.ts`)
- ❌ **JWT Validation** (`src/auth/jwt.strategy.ts`, `src/auth/auth.guard.ts`)
- ❌ **Main Server Integration** (`src/services/main-server-client.service.ts`)
- ❌ **Public Key Service** (`src/services/public-key.service.ts`, `src/config/jwt.config.ts`)
- ❌ **Core Auth Endpoints** (`/auth/sso/initiate`, `/auth/sso/exchange`, `/auth/check`)

## ✅ WHAT CAN BE MODIFIED

### ✅ Module `contentzavod`:
- All controllers in `src/modules/contentzavod/controllers/`
- All services in `src/modules/contentzavod/services/`
- All DTOs in `src/modules/contentzavod/dto/`
- All utilities in `src/modules/contentzavod/utils/`
- Can add new endpoints, services, DTOs
- Can modify business logic

### ✅ New Modules:
- Create new modules in `src/modules/`
- Add new controllers, services, DTOs
- Integrate with n8n webhooks
- Use `UserContextService` for user login
- Use `N8NWebhookService` for n8n calls

### ✅ Environment Variables:
- All `N8N_*_WEBHOOK` variables can be changed
- `N8N_WEBHOOK_BASE_URL` can be changed
- `N8N_WEBHOOK_SECRET` can be changed

## 🚫 WHAT CANNOT BE MODIFIED

### ❌ Authentication System (MUST BE PRESERVED):

1. **`src/auth/auth.service.ts`** - SSO authentication logic
   - `initiateLogin()` - SSO initiation
   - `handleCallback()` - SSO code exchange
   - `checkAuth()` - Authentication check

2. **`src/auth/jwt.strategy.ts`** - JWT validation strategy
   - Token validation logic
   - Service token type check
   - Service name validation

3. **`src/auth/auth.guard.ts`** - Route protection guard
   - JWT token extraction
   - User validation

4. **`src/controllers/auth.controller.ts`** - Auth endpoints
   - `/auth/sso/initiate` - SSO initiation endpoint
   - `/auth/sso/exchange` - Code exchange endpoint
   - `/auth/check` - Auth status check endpoint

5. **`src/services/public-key.service.ts`** - Public key fetching
   - Public key retrieval from main server
   - Caching logic

6. **`src/config/jwt.config.ts`** - JWT configuration
   - Public key loading
   - Key normalization

### ❌ Main Server Integration (MUST BE PRESERVED):

1. **`src/services/main-server-client.service.ts`** - Main server client
   - All methods for main server communication
   - Token management
   - Error handling

2. **`src/services/balance-api.service.ts`** - Balance API client
   - Balance operations
   - Transaction management

3. **`src/services/analytics.service.ts`** - Analytics API client
   - Event tracking
   - Batch events

### ❌ Core Infrastructure (MUST BE PRESERVED):

1. **`src/main.ts`** - Application bootstrap
   - CORS configuration
   - Validation pipes
   - Exception filters
   - Swagger setup

2. **`src/app.module.ts`** - Root module
   - Module imports
   - Auth providers
   - Core services

3. **`src/filters/http-exception.filter.ts`** - Global exception filter

## ✅ ALLOWED

### ✅ Create:
- New modules in `src/modules/`
- New controllers in modules
- New services for business logic
- New DTOs for validation
- New n8n webhook endpoints (via environment variables)

### ✅ Modify:
- Business logic in existing modules
- n8n webhook endpoints (change environment variables)
- Response formats (keep `{ status, data, message }` structure)
- Error messages (keep English)

### ✅ Use:
- `JwtAuthGuard` for protecting routes
- `RequestWithToken` interface for authenticated requests
- `UserContextService` for getting user login
- `N8NWebhookService` for calling n8n webhooks
- `MainServerClientService` for main server communication

## ⚠️ Important Rules

1. **Always use `JwtAuthGuard`** for protected routes
2. **Always use `@ApiBearerAuth()`** for Swagger documentation
3. **Always use `RequestWithToken`** interface for `@Req()` in controllers
4. **Always return `{ status, data, message }`** format
5. **Always use `UserContextService`** to get `userLogin` for n8n calls
6. **Always use `N8NWebhookService`** for calling n8n webhooks (not direct HTTP calls)
7. **Always use `MainServerClientService`** for main server communication
8. **Never modify authentication logic** in `src/auth/`
9. **Never modify JWT validation** in `src/auth/jwt.strategy.ts`
10. **Never modify main server client** in `src/services/main-server-client.service.ts`

## 🔌 n8n Integration

### Configuration
n8n webhook endpoints are configured via environment variables:

```env
N8N_WEBHOOK_BASE_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=your-secret
N8N_GET_AUTHORS_WEBHOOK=/webhook/get-authors
N8N_ADD_AUTHOR_WEBHOOK=/webhook/add-author
# ... other webhook endpoints
```

### Using N8NWebhookService

```typescript
import { N8NWebhookService } from './n8n-webhook.service';

constructor(private readonly n8nWebhook: N8NWebhookService) {}

// GET request
const channels = await this.n8nWebhook.callWebhook<any[]>({
  endpoint: '/webhook/get-groups-telegram',
  method: 'GET',
  userLogin: 'user@example.com',
  telegramUsername: 'username', // optional
});

// POST request
const author = await this.n8nWebhook.callWebhook<any>({
  endpoint: '/webhook/add-author',
  method: 'POST',
  body: { instagramUrl: 'https://instagram.com/...' },
  userLogin: 'user@example.com',
});
```

## 📋 Mandatory Rules

1. **Always integrate authentication** through `JwtAuthGuard` on protected routes
2. **Always use `UserContextService`** to get `userLogin` from token
3. **Always use `N8NWebhookService`** for n8n webhook calls
4. **Always use `MainServerClientService`** for main server communication
5. **Always return consistent response format** `{ status, data, message }`
6. **Always handle errors** properly with try/catch
7. **Always use DTOs** for request validation
8. **Always document endpoints** with Swagger decorators
9. **Never modify authentication logic** in `src/auth/`
10. **Never bypass JWT validation**

## 🎯 Quick Checklist

Before adding a new feature:

- [ ] **Authentication guard added** (`@UseGuards(JwtAuthGuard)`)
- [ ] **Swagger documentation added** (`@ApiBearerAuth()`, `@ApiOperation()`, `@ApiResponse()`)
- [ ] **DTO created** for request validation
- [ ] **UserContextService used** to get `userLogin`
- [ ] **N8NWebhookService used** for n8n calls (if needed)
- [ ] **Response format consistent** (`{ status, data, message }`)
- [ ] **Error handling** implemented
- [ ] **English messages** for all responses
- [ ] **NO changes to auth system** (`src/auth/`)
- [ ] **NO changes to main server client** (`src/services/main-server-client.service.ts`)

## 📚 Detailed Documentation

- **[AI_AGENT_GUIDE_EN.md](./AI_AGENT_GUIDE_EN.md)** - Full guide (English)
- **[AI_AGENT_QUICK_REFERENCE_EN.md](./AI_AGENT_QUICK_REFERENCE_EN.md)** - Quick reference (English)
- **[AI_AGENT_CODE_EXAMPLES_EN.md](./AI_AGENT_CODE_EXAMPLES_EN.md)** - Code examples (English)
- **[AI_AGENT_RULES.md](./AI_AGENT_RULES.md)** - Rules (Ukrainian)
- **[AI_AGENT_GUIDE.md](./AI_AGENT_GUIDE.md)** - Full guide (Ukrainian)

---

**Always refer to full documentation before starting work!**
