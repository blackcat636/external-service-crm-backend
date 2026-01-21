# Guide for AI Agent - CRM External Service Backend

> **Important**: This guide is intended for AI agents that help programmers work with the backend service. It contains rules and examples for safe code work.

## 🎯 Main Project Rule

**This backend service can be cloned and adapted for different projects with new functionality. BUT the SSO authentication mechanism, JWT validation, and main server integration MUST remain unchanged.**

### ⚠️ IMPORTANT: Service Token Management

**Service tokens are NOT stored globally anymore!** After SSO exchange, the token is returned to the frontend and stored in `localStorage`. Each API request must include the token in the `Authorization: Bearer <token>` header. The backend extracts the token from each request and passes it to services.

**Key changes:**
- `MainServerClientService` methods now require `serviceToken` as first parameter
- `UserContextService.getUserLoginFromToken()` now requires `serviceToken` as first parameter
- Use `requireServiceToken(req)` or `extractServiceToken(req)` from `src/auth/utils/extract-token.util.ts` to extract tokens
- No global token storage - each request uses its own token

### What can be changed:
- ✅ All business logic in modules (e.g., `modules/contentzavod/`)
- ✅ New modules can be created
- ✅ New endpoints can be added
- ✅ New services for business logic
- ✅ DTOs and validation
- ✅ n8n webhook endpoints (via environment variables)
- ✅ Response messages (keep English)

### What must remain:
- ❌ **SSO Authentication** (`src/auth/`, `src/controllers/auth.controller.ts`)
- ❌ **JWT Validation** (`src/auth/jwt.strategy.ts`, `src/auth/auth.guard.ts`)
- ❌ **Main Server Integration** (`src/services/main-server-client.service.ts`)
- ❌ **Public Key Service** (`src/services/public-key.service.ts`, `src/config/jwt.config.ts`)
- ❌ **Core Auth Endpoints** (`/auth/sso/initiate`, `/auth/sso/exchange`, `/auth/check`)

### If creating new modules:
**MUST integrate existing authentication mechanism!** See section [Authentication Integration](#authentication-integration).

## 📋 Table of Contents

1. [Project Architecture](#project-architecture)
2. [Authentication System](#authentication-system)
3. [Authentication Integration](#authentication-integration)
4. [Main Server Integration](#main-server-integration)
5. [n8n Integration](#n8n-integration)
6. [Creating New Modules](#creating-new-modules)
7. [Creating New Services](#creating-new-services)
8. [Creating New Controllers](#creating-new-controllers)
9. [Response Format](#response-format)
10. [Error Handling](#error-handling)
11. [Forbidden Actions](#forbidden-actions)
12. [Code Examples](#code-examples)

---

## 🏗️ Project Architecture

### Folder Structure

```
crm_external_service/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── auth/                      # Authentication (DO NOT MODIFY)
│   │   ├── auth.service.ts       # SSO authentication logic
│   │   ├── auth.guard.ts         # JWT auth guard
│   │   ├── jwt.strategy.ts       # JWT validation strategy
│   │   └── interfaces/
│   ├── config/                    # Configuration (DO NOT MODIFY)
│   │   ├── config.module.ts
│   │   └── jwt.config.ts         # JWT public key config
│   ├── controllers/               # API controllers
│   │   ├── auth.controller.ts   # Auth endpoints (DO NOT MODIFY)
│   │   ├── health.controller.ts  # Health checks
│   │   └── operations.controller.ts  # General operations
│   ├── services/                  # Core services (DO NOT MODIFY main-server-client)
│   │   ├── main-server-client.service.ts  # Main CRM server client (DO NOT MODIFY)
│   │   ├── balance-api.service.ts
│   │   ├── analytics.service.ts
│   │   └── public-key.service.ts  # Public key fetching (DO NOT MODIFY)
│   ├── modules/                   # Business logic modules (CAN MODIFY)
│   │   └── contentzavod/         # ContentZavod module (CAN MODIFY)
│   │       ├── contentzavod.module.ts
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── dto/
│   │       └── utils/
│   ├── dto/                       # Shared DTOs
│   └── filters/                   # Exception filters
└── .env.example                   # Environment variables template
```

### Technologies

- **Framework**: NestJS 11
- **Language**: TypeScript
- **Authentication**: JWT RS256 (service tokens)
- **SSO**: Single Sign-On through main CRM server
- **Webhooks**: n8n for business logic
- **Database**: n8n Data Tables (via webhooks)
- **Documentation**: Swagger/OpenAPI

---

## 🔐 Authentication System

### ⚠️ IMPORTANT: Do not change authentication logic!

**DO NOT DELETE and DO NOT CHANGE:**
- `src/auth/auth.service.ts` - SSO authentication logic
- `src/auth/jwt.strategy.ts` - JWT validation strategy
- `src/auth/auth.guard.ts` - Route protection guard
- `src/controllers/auth.controller.ts` - Auth endpoints
- `src/services/public-key.service.ts` - Public key fetching
- `src/config/jwt.config.ts` - JWT configuration

### How Authentication Works

1. **User makes request** → Frontend sends `Authorization: Bearer <service-token>` header
2. **JwtAuthGuard intercepts** → Extracts token from header
3. **JwtStrategy validates** → Verifies token signature with public key (RS256)
4. **Token validation** → Checks token type is `service` and service name matches
5. **User extracted** → Token payload attached to `req.user`
6. **Request proceeds** → Controller has access to `req.user`

### Service Token Structure

```typescript
interface JwtPayload {
  sub: number;        // User ID
  email: string;      // User email
  role: string;       // User role
  type: string;       // Must be "service"
  service?: string;   // Service name (optional)
  iat?: number;       // Issued at
  exp?: number;       // Expiration
}
```

### Environment Variables for Auth

```env
# Main CRM server URL (required)
MAIN_SERVER_URL=http://localhost:3000/api

# Main CRM frontend URL (optional, auto-derived)
MAIN_FRONTEND_URL=http://localhost:3000

# Service name (optional, for service name validation)
SERVICE_NAME=crm-external-service

# JWT public key (optional, auto-fetched from main server)
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...
```

---

## 🔗 Authentication Integration

### ⚠️ CRITICALLY IMPORTANT

If you are creating a **new module** or **new protected route**, you **MUST** integrate the existing authentication mechanism. **DO NOT create a new authentication mechanism!**

### Service Token Extraction

**IMPORTANT:** All `MainServerClientService` methods and `UserContextService.getUserLoginFromToken()` now require `serviceToken` as the first parameter. Extract it from the request:

```typescript
import { requireServiceToken } from '../../auth/utils/extract-token.util';

// In controller method
async getData(@Req() req: RequestWithToken, @Res() res: Response) {
  // Extract service token from Authorization header
  const serviceToken = requireServiceToken(req);
  
  // Pass serviceToken to services
  const result = await this.service.getData(serviceToken, userId, email);
}
```

**Helper functions:**
- `requireServiceToken(req)` - Extracts token and throws error if not found (use for required tokens)
- `extractServiceToken(req)` - Extracts token or returns null (use for optional tokens)

### Creating a New Protected Route

**ALWAYS use `JwtAuthGuard` for protected routes:**

```typescript
import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)  // ✅ REQUIRED for protected routes
@ApiBearerAuth()           // ✅ REQUIRED for Swagger
export class MyModuleController {
  @Get('data')
  @ApiOperation({ summary: 'Get data' })
  @ApiResponse({ status: 200, description: 'Data retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getData(
    @Req() req: RequestWithToken,  // ✅ Use RequestWithToken interface
    @Res() res: Response
  ) {
    const userId = req.user?.sub;      // User ID from token
    const email = req.user?.email;     // Email from token
    
    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    // Extract service token from Authorization header
    const serviceToken = requireServiceToken(req);

    // Your business logic here - pass serviceToken to services
    
    return res.status(200).json({
      status: 200,
      data: { /* your data */ },
    });
  }
}
```

### Getting User Login

**ALWAYS use `UserContextService` to get user login for n8n calls:**

```typescript
import { Injectable } from '@nestjs/common';
import { UserContextService } from './user-context.service';

@Injectable()
export class MyService {
  constructor(
    private readonly userContext: UserContextService,
  ) {}

  async getData(serviceToken: string, userId: number, email?: string) {
    // ✅ REQUIRED: Get userLogin from token - serviceToken is first parameter
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Use userLogin for n8n webhook calls
    // ...
  }
}
```

### Authentication Checklist

Before creating a new protected route:

- [ ] Used `@UseGuards(JwtAuthGuard)` on controller
- [ ] Used `@ApiBearerAuth()` for Swagger
- [ ] Used `RequestWithToken` interface for `@Req()`
- [ ] Used `UserContextService` to get `userLogin`
- [ ] Checked `req.user?.sub` for user ID
- [ ] Did NOT modify authentication files (`src/auth/`)
- [ ] Did NOT create new authentication mechanism

---

## 🔌 Main Server Integration

### ⚠️ IMPORTANT: Always use MainServerClientService!

**DO NOT make direct HTTP calls to main server!** Use `MainServerClientService` - it automatically:
- Adds service token to all requests
- Handles errors (401, etc.)
- Formats URLs correctly
- Manages token lifecycle

### How MainServerClientService Works

**`MainServerClientService` from `src/services/main-server-client.service.ts` - this is the ONLY way to communicate with main server:**

1. **Automatic token management:**
   - Token is set after SSO exchange
   - Automatically added to all requests
   - Cleared on 401 errors

2. **Consistent response format:**
   ```typescript
   {
     status: number,
     data?: any,
     message?: string
   }
   ```

3. **Error handling:**
   - 401 errors automatically clear token
   - Network errors throw `SERVICE_UNAVAILABLE`
   - Other errors extract message from response

### Available Methods

**⚠️ IMPORTANT:** All methods now require `serviceToken` as the first parameter!

```typescript
// User endpoints
await mainServerClient.getUserProfile(serviceToken);
await mainServerClient.updateUserProfile(serviceToken, data);
await mainServerClient.getUserStructure(serviceToken);
await mainServerClient.getUserPermissions(serviceToken);

// Balance endpoints
await mainServerClient.getUserBalances(serviceToken);
await mainServerClient.getBalanceByCurrency(serviceToken, currency);
await mainServerClient.getTransactions(serviceToken, params);
await mainServerClient.chargeBalance(serviceToken, data);
await mainServerClient.getBalanceSettings(serviceToken);
await mainServerClient.updateBalanceSettings(serviceToken, data);

// Analytics endpoints
await mainServerClient.sendAnalyticsEvent(serviceToken, data);
await mainServerClient.sendAnalyticsBatch(serviceToken, data);

// Generic request
await mainServerClient.genericRequest<T>(method, endpoint, serviceToken, data);
```

### Using MainServerClientService

```typescript
import { Injectable } from '@nestjs/common';
import { MainServerClientService } from '../../services/main-server-client.service';

@Injectable()
export class MyService {
  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  async getUserData(serviceToken: string) {
    try {
      // ✅ CORRECT: Use MainServerClientService with serviceToken
      const result = await this.mainServerClient.getUserProfile(serviceToken);
      
      if (result.status === 200) {
        return {
          status: 200,
          data: result.data,
        };
      }
      
      throw new HttpException(
        result.message || 'Failed to get user profile',
        result.status,
      );
    } catch (error) {
      // Error handling
      throw new HttpException(
        error.message || 'Failed to get user data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### ❌ INCORRECT - Direct HTTP calls

```typescript
// ❌ DO NOT DO THIS!
import { HttpService } from '@nestjs/axios';

const response = await firstValueFrom(
  this.httpService.get(`${MAIN_SERVER_URL}/users/profile`, {
    headers: {
      Authorization: `Bearer ${token}`, // DO NOT manage token manually!
    },
  }),
);

// Problems:
// 1. Token management is manual
// 2. No automatic error handling
// 3. No token refresh on 401
// 4. Hardcoded URL
```

### ✅ CORRECT - Using MainServerClientService

```typescript
// ✅ CORRECT - Extract token from request first
import { requireServiceToken } from '../../auth/utils/extract-token.util';

// In controller
async getProfile(@Req() req: RequestWithToken, @Res() res: Response) {
  const serviceToken = requireServiceToken(req);
  const result = await this.mainServerClient.getUserProfile(serviceToken);
  // Token is passed explicitly, errors are handled!
}
```

---

## 🔗 n8n Integration

### ⚠️ IMPORTANT: Always use N8NWebhookService!

**DO NOT make direct HTTP calls to n8n!** Use `N8NWebhookService` - it automatically:
- Adds `userLogin` to all requests
- Adds security header `X-N8N-Secret` if configured
- Handles errors properly
- Formats URLs correctly

### How N8NWebhookService Works

**`N8NWebhookService` from `src/modules/contentzavod/services/n8n-webhook.service.ts` - this is the ONLY way to call n8n webhooks:**

1. **Automatic userLogin addition:**
   ```typescript
   // GET request: ?userLogin=xxx&username=yyy
   // POST request: { userLogin: "xxx", username: "yyy", ...body }
   ```

2. **Security header:**
   ```typescript
   headers: {
     'X-N8N-Secret': process.env.N8N_WEBHOOK_SECRET  // If configured
   }
   ```

3. **Error handling:**
   - Extracts error message from n8n response
   - Throws `HttpException` with proper status code
   - Logs errors for debugging

### Environment Variables for n8n

```env
# n8n base URL (required)
N8N_WEBHOOK_BASE_URL=http://localhost:5678

# n8n webhook secret (optional, for security)
N8N_WEBHOOK_SECRET=your-secret

# Individual webhook endpoints (optional, have defaults)
N8N_GET_AUTHORS_WEBHOOK=/webhook/get-authors
N8N_ADD_AUTHOR_WEBHOOK=/webhook/add-author
N8N_DELETE_AUTHOR_WEBHOOK=/webhook/delete-author
N8N_GET_VIDEOS_WEBHOOK=/webhook/get-videos
N8N_TRANSCRIBE_WEBHOOK=/webhook/transcribe
N8N_UNIQUE_WEBHOOK=/webhook/unique
N8N_GENERATE_VIDEO_START_WEBHOOK=/webhook/generate-video-start-zavod
N8N_GENERATE_VIDEO_STATUS_WEBHOOK=/webhook/generate-video-status-zavod
N8N_GET_DASHBOARD_WEBHOOK=/webhook/get-dashboard
N8N_GET_TELEGRAM_CHANNELS_WEBHOOK=/webhook/get-groups-telegram
N8N_DELETE_TELEGRAM_CHANNEL_WEBHOOK=/webhook/delete-group-telegram
N8N_GET_TELEGRAM_POSTS_WEBHOOK=/webhook/get-the-posts
N8N_UNIQUE_TELEGRAM_WEBHOOK=/webhook/unique-zavod-telegram
N8N_EDIT_WITH_AI_WEBHOOK=/webhook/edit-with-ai
```

### Using N8NWebhookService

```typescript
import { Injectable } from '@nestjs/common';
import { N8NWebhookService } from './n8n-webhook.service';
import { UserContextService } from './user-context.service';

@Injectable()
export class MyService {
  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getData(userId: number, email?: string) {
    // 1. Get userLogin (REQUIRED)
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 2. Get webhook endpoint from config
    const webhookEndpoint =
      this.configService.get<string>('N8N_MY_WEBHOOK') || '/webhook/my-endpoint';

    try {
      // 3. Call webhook (GET request)
      const data = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
        userLogin,
      });

      return {
        status: 200,
        data: data,
      };
    } catch (error) {
      this.logger.error(`Failed to get data: ${error}`);
      throw new HttpException(
        'Failed to fetch data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createItem(userId: number, dto: CreateDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_CREATE_WEBHOOK') || '/webhook/create';

    try {
      // POST request with body
      const result = await this.n8nWebhook.callWebhook<any>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: {
          field1: dto.field1,
          field2: dto.field2,
        },
        userLogin,  // Automatically added to body
      });

      return {
        status: 201,
        data: result,
        message: 'Item created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create item: ${error}`);
      throw new HttpException(
        'Failed to create item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTelegramData(serviceToken: string, userId: number, telegramUsername: string, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_TELEGRAM_WEBHOOK') || '/webhook/telegram';

    try {
      // GET request with telegramUsername
      const data = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
        userLogin,
        telegramUsername,  // Automatically added to query/body
      });

      return {
        status: 200,
        data: data,
      };
    } catch (error) {
      this.logger.error(`Failed to get Telegram data: ${error}`);
      throw new HttpException(
        'Failed to fetch Telegram data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### ❌ INCORRECT - Direct HTTP calls to n8n

```typescript
// ❌ DO NOT DO THIS!
import { HttpService } from '@nestjs/axios';

const response = await firstValueFrom(
  this.httpService.post(`${N8N_BASE_URL}/webhook/endpoint`, {
    userLogin: 'manual',  // DO NOT add userLogin manually!
    field: 'value',
  }),
);

// Problems:
// 1. userLogin might be wrong
// 2. Security header not added
// 3. No proper error handling
// 4. Hardcoded URL
```

### ✅ CORRECT - Using N8NWebhookService

```typescript
// ✅ CORRECT
const data = await this.n8nWebhook.callWebhook<any[]>({
  endpoint: '/webhook/endpoint',
  method: 'POST',
  body: { field: 'value' },
  userLogin,  // Automatically added, retrieved from token
});
```

---

## 🧩 Creating New Modules

### Module Structure

```
src/modules/
└── my-module/
    ├── my-module.module.ts
    ├── controllers/
    │   └── my-module.controller.ts
    ├── services/
    │   ├── my-module.service.ts
    │   └── n8n-webhook.service.ts  # Optional, can use shared one
    └── dto/
        ├── create-item.dto.ts
        └── update-item.dto.ts
```

### Module Template

```typescript
// src/modules/my-module/my-module.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MyModuleController } from './controllers/my-module.controller';
import { MyModuleService } from './services/my-module.service';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';
import { MainServerClientService } from '../../services/main-server-client.service';

@Module({
  imports: [HttpModule],
  controllers: [MyModuleController],
  providers: [
    MyModuleService,
    N8NWebhookService,  // Can reuse shared service
    UserContextService,  // Can reuse shared service
    MainServerClientService,  // Can reuse shared service
  ],
  exports: [MyModuleService],
})
export class MyModuleModule {}
```

### Registering Module in AppModule

```typescript
// src/app.module.ts
import { MyModuleModule } from './modules/my-module/my-module.module';

@Module({
  imports: [
    // ... existing imports
    MyModuleModule,  // Add your module here
  ],
  // ... rest of module
})
export class AppModule {}
```

---

## 🔧 Creating New Services

### Service Template

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';
import { MainServerClientService } from '../../services/main-server-client.service';

@Injectable()
export class MyModuleService {
  private readonly logger = new Logger(MyModuleService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly mainServerClient: MainServerClientService,
    private readonly configService: ConfigService,
  ) {}

  async getItems(serviceToken: string, userId: number, email?: string) {
    // 1. Get userLogin - serviceToken is first parameter
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // 2. Get webhook endpoint from config
    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_ITEMS_WEBHOOK') || '/webhook/get-items';

    try {
      // 3. Call webhook
      const items = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'POST',
        userLogin,
      });

      return {
        status: 200,
        data: items,
      };
    } catch (error) {
      this.logger.error(`Failed to get items: ${error}`);
      throw new HttpException(
        'Failed to fetch items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createItem(serviceToken: string, userId: number, dto: CreateItemDto, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_CREATE_ITEM_WEBHOOK') || '/webhook/create-item';

    try {
      const item = await this.n8nWebhook.callWebhook<any>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: {
          name: dto.name,
          description: dto.description,
        },
        userLogin,
      });

      return {
        status: 201,
        data: item,
        message: 'Item created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create item: ${error}`);
      throw new HttpException(
        'Failed to create item',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Service Creation Rules

1. **Always accept `serviceToken`** as first parameter in service methods
2. **Always pass `serviceToken`** to `UserContextService.getUserLoginFromToken()` as first parameter
3. **Always pass `serviceToken`** to `MainServerClientService` methods as first parameter
4. **Always inject `UserContextService`** to get `userLogin`
5. **Always inject `N8NWebhookService`** for n8n calls
6. **Always inject `ConfigService`** for webhook endpoints
7. **Always get `userLogin`** before calling webhooks
8. **Always handle errors** with try/catch
9. **Always return `{ status, data, message }`** format
10. **Always log errors** with `this.logger.error()`
11. **Always use English** for error messages

---

## 🎮 Creating New Controllers

### Controller Template

```typescript
import {
  Controller,
  Get,
  Post,
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
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';
import { requireServiceToken } from '../../auth/utils/extract-token.util';
import { MyModuleService } from '../services/my-module.service';
import { CreateItemDto } from '../dto/create-item.dto';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)  // ✅ REQUIRED
@ApiBearerAuth()           // ✅ REQUIRED for Swagger
export class MyModuleController {
  constructor(private readonly myModuleService: MyModuleService) {}

  @Get('items')
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getItems(
    @Req() req: RequestWithToken,  // ✅ Use RequestWithToken
    @Res() res: Response
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

      const serviceToken = requireServiceToken(req);
      const result = await this.myModuleService.getItems(serviceToken, userId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get items',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('items')
  @ApiOperation({ summary: 'Create new item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async createItem(
    @Req() req: RequestWithToken,
    @Body() dto: CreateItemDto,
    @Res() res: Response
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

      const result = await this.myModuleService.createItem(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create item',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Controller Creation Rules

1. **Always use `@UseGuards(JwtAuthGuard)`** on controller class
2. **Always use `@ApiBearerAuth()`** for Swagger documentation
3. **Always use `RequestWithToken`** interface for `@Req()`
4. **Always check `req.user?.sub`** for user ID
5. **Always use `@ApiOperation()`** for endpoint descriptions
6. **Always use `@ApiResponse()`** for all possible status codes
7. **Always return `{ status, data, message }`** format
8. **Always handle errors** with try/catch
9. **Always use `@Res() res: Response`** and return `res.status().json()`

---

## 📤 Response Format

### Standard Response Format

**All endpoints MUST return consistent format:**

```typescript
{
  status: number,      // HTTP status code (200, 201, 400, 401, 404, 500)
  data?: any,          // Response data (optional)
  message?: string     // Human-readable message (optional)
}
```

### Success Responses

```typescript
// GET request
{
  status: 200,
  data: { /* your data */ }
}

// POST request (creation)
{
  status: 201,
  data: { /* created resource */ },
  message: 'Resource created successfully'
}

// PUT/PATCH request
{
  status: 200,
  data: { /* updated resource */ },
  message: 'Resource updated successfully'
}
```

### Error Responses

```typescript
// 400 Bad Request
{
  status: 400,
  message: 'Invalid input data'
}

// 401 Unauthorized
{
  status: 401,
  message: 'User ID not found in token'
}

// 404 Not Found
{
  status: 404,
  message: 'Resource not found'
}

// 500 Internal Server Error
{
  status: 500,
  message: 'Failed to fetch data'
}
```

### Using Response in Controller

```typescript
// ✅ CORRECT
async getData(@Req() req: RequestWithToken, @Res() res: Response) {
  const serviceToken = requireServiceToken(req);
  const result = await this.service.getData(serviceToken, req.user.sub);
  return res.status(result.status).json(result);
}

// ❌ INCORRECT - Don't return directly
async getData(@Req() req: RequestWithToken) {
  return await this.service.getData(req.user.sub);
}
```

---

## 🚨 Error Handling

### Error Handling Pattern

```typescript
async getData(userId: number, email?: string) {
  try {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const data = await this.n8nWebhook.callWebhook<any[]>({
      endpoint: '/webhook/get-data',
      method: 'POST',
      userLogin,
    });

    return {
      status: 200,
      data: data,
    };
  } catch (error) {
    // Log error
    this.logger.error(`Failed to get data: ${error}`);
    
    // Re-throw HttpException as-is
    if (error instanceof HttpException) {
      throw error;
    }
    
    // Wrap other errors
    throw new HttpException(
      error.message || 'Failed to fetch data',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Error Messages

**All error messages MUST be in English:**

```typescript
// ✅ CORRECT
throw new HttpException('Invalid input data', HttpStatus.BAD_REQUEST);
throw new HttpException('Resource not found', HttpStatus.NOT_FOUND);
throw new HttpException('Failed to fetch data', HttpStatus.INTERNAL_SERVER_ERROR);

// ❌ INCORRECT - Other languages
throw new HttpException('Невірні дані', HttpStatus.BAD_REQUEST);
```

---

## 📝 Creating DTOs

### DTO Template with Validation

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'My Item',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Item description',
    required: false,
    example: 'Item description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Item URL',
    example: 'https://example.com/item',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
```

### DTO Validation Rules

1. **Always use class-validator decorators** (`@IsString()`, `@IsNotEmpty()`, etc.)
2. **Always use `@ApiProperty()`** for Swagger documentation
3. **Always specify required/optional** with `@IsOptional()`
4. **Always add validation constraints** (`@MaxLength()`, `@MinLength()`, etc.)
5. **Always add examples** in `@ApiProperty()`

---

## 🚫 Forbidden Actions

### ❌ DO NOT DO:

1. **DO NOT modify authentication system:**
   - `src/auth/auth.service.ts`
   - `src/auth/jwt.strategy.ts`
   - `src/auth/auth.guard.ts`
   - `src/controllers/auth.controller.ts`

2. **DO NOT modify main server integration:**
   - `src/services/main-server-client.service.ts`
   - `src/services/public-key.service.ts`
   - `src/config/jwt.config.ts`

3. **DO NOT make direct HTTP calls:**
   - DO NOT use `HttpService` directly for main server calls (use `MainServerClientService`)
   - DO NOT use `HttpService` directly for n8n calls (use `N8NWebhookService`)

4. **DO NOT bypass authentication:**
   - DO NOT remove `@UseGuards(JwtAuthGuard)`
   - DO NOT skip token validation
   - DO NOT create new authentication mechanisms

5. **DO NOT change response format:**
   - DO NOT change `{ status, data, message }` structure
   - DO NOT use different status code formats

### ✅ DO:

1. **Create new modules** in `src/modules/`
2. **Create new services** for business logic
3. **Create new controllers** with proper guards
4. **Create new DTOs** with validation
5. **Use existing services** (`UserContextService`, `N8NWebhookService`, `MainServerClientService`)
6. **Follow response format** `{ status, data, message }`
7. **Use English** for all messages
8. **Document endpoints** with Swagger decorators

---

## 📝 Code Examples

### Example 1: New Service with n8n Integration

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getItems(serviceToken: string, userId: number, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_ITEMS_WEBHOOK') || '/webhook/get-items';

    try {
      const items = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'POST',
        userLogin,
      });

      return {
        status: 200,
        data: items,
      };
    } catch (error) {
      this.logger.error(`Failed to get items: ${error}`);
      throw new HttpException(
        'Failed to fetch items',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Example 2: New Controller

```typescript
import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';
import { requireServiceToken } from '../../auth/utils/extract-token.util';
import { MyService } from '../services/my.service';
import { CreateItemDto } from '../dto/create-item.dto';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyController {
  constructor(private readonly myService: MyService) {}

  @Get('items')
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getItems(@Req() req: RequestWithToken, @Res() res: Response) {
    const userId = req.user?.sub;
    const email = req.user?.email;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    const serviceToken = requireServiceToken(req);
    const result = await this.myService.getItems(serviceToken, userId, email);
    return res.status(result.status).json(result);
  }

  @Post('items')
  @ApiOperation({ summary: 'Create new item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createItem(
    @Req() req: RequestWithToken,
    @Body() dto: CreateItemDto,
    @Res() res: Response
  ) {
    const userId = req.user?.sub;
    const email = req.user?.email;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    const serviceToken = requireServiceToken(req);
    const result = await this.myService.createItem(serviceToken, userId, dto, email);
    return res.status(result.status).json(result);
  }
}
```

### Example 3: DTO with Validation

```typescript
import { IsString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'My Item',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Item URL',
    example: 'https://example.com/item',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;
}
```

---

## 🔍 API Endpoints Reference

### Authentication Endpoints (DO NOT MODIFY)

- `GET /auth/sso/initiate` - Initiate SSO login
- `POST /auth/sso/exchange` - Exchange SSO code for token
- `GET /auth/check` - Check authentication status

### Operations Endpoints (Existing)

- `GET /operations/profile` - Get user profile
- `GET /operations/balances` - Get user balances
- `POST /operations/process-payment` - Process payment
- `POST /operations/analytics/event` - Send analytics event

### ContentZavod Endpoints (Example - Can Modify)

- `GET /operations/contentzavod/authors` - Get Instagram authors
- `POST /operations/contentzavod/authors/add` - Add author
- `POST /operations/contentzavod/authors/delete` - Delete author
- `GET /operations/contentzavod/videos` - Get videos
- `POST /operations/contentzavod/videos/transcribe` - Transcribe video
- `POST /operations/contentzavod/videos/unique` - Make text unique
- `GET /operations/contentzavod/telegram/channels` - Get Telegram channels
- `GET /operations/contentzavod/telegram/posts` - Get Telegram posts

---

## ✅ Checklist for New Features

Before adding a new feature:

- [ ] **Authentication guard added** (`@UseGuards(JwtAuthGuard)`)
- [ ] **Swagger documentation added** (`@ApiBearerAuth()`, `@ApiOperation()`, `@ApiResponse()`)
- [ ] **DTO created** with validation decorators
- [ ] **UserContextService used** to get `userLogin`
- [ ] **N8NWebhookService used** for n8n calls (if needed)
- [ ] **MainServerClientService used** for main server calls (if needed)
- [ ] **Response format consistent** (`{ status, data, message }`)
- [ ] **Error handling** implemented
- [ ] **English messages** for all responses
- [ ] **Logger used** for errors
- [ ] **NO changes to auth system** (`src/auth/`)
- [ ] **NO changes to main server client** (`src/services/main-server-client.service.ts`)

---

**Created for AI agents working with CRM External Service backend**
