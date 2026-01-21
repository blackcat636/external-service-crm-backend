# Quick Reference for AI Agent - CRM External Service Backend

> Short guide for quick start with backend development

## 🎯 Main Rule

**Backend can be cloned and adapted (new modules, endpoints, business logic), but SSO authentication mechanism MUST remain unchanged!**

## 🚀 Quick Start

### Basic Rules

1. **DO NOT change** `src/auth/`, `src/services/main-server-client.service.ts`, `src/config/jwt.config.ts`
2. **Use `JwtAuthGuard`** for all protected routes
3. **Use `UserContextService`** to get `userLogin` from token
4. **Use `N8NWebhookService`** for n8n webhook calls
5. **Use `MainServerClientService`** for main server communication
6. **Return consistent format** `{ status, data, message }`

## 🔐 Authentication

### Protected Route Template

```typescript
import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)  // ✅ REQUIRED
@ApiBearerAuth()           // ✅ REQUIRED
export class MyController {
  @Get('data')
  @ApiOperation({ summary: 'Get data' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getData(@Req() req: RequestWithToken, @Res() res: Response) {
    const userId = req.user?.sub;      // User ID from token
    const email = req.user?.email;     // Email from token
    
    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    // Your logic here
    
    return res.status(200).json({
      status: 200,
      data: { /* your data */ },
    });
  }
}
```

## 🔌 Main Server Communication

### ⚠️ IMPORTANT: Always use MainServerClientService!

```typescript
import { MainServerClientService } from '../../services/main-server-client.service';

constructor(
  private readonly mainServerClient: MainServerClientService,
) {}

// Get user profile
const result = await this.mainServerClient.getUserProfile();

// Get balances
const balances = await this.mainServerClient.getUserBalances();

// Charge balance
const chargeResult = await this.mainServerClient.chargeBalance({
  amount: 100,
  currencyCode: 'USD',
  referenceId: 'REF123',
  referenceType: 'service',
  description: 'Payment',
});

// Generic request
const data = await this.mainServerClient.genericRequest('GET', '/endpoint');
```

### ❌ DO NOT use HttpService directly!

```typescript
// ❌ INCORRECT
const response = await firstValueFrom(
  this.httpService.get(`${MAIN_SERVER_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
);
```

## 🔗 n8n Integration

### ⚠️ IMPORTANT: Always use N8NWebhookService!

```typescript
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';

constructor(
  private readonly n8nWebhook: N8NWebhookService,
  private readonly userContext: UserContextService,
  private readonly configService: ConfigService,
) {}

async getData(userId: number, email?: string) {
  // 1. Get userLogin (REQUIRED)
  const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
  if (!userLogin) {
    throw new HttpException(
      'Unable to determine user login',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // 2. Get webhook endpoint from config
  const webhookEndpoint =
    this.configService.get<string>('N8N_MY_WEBHOOK') || '/webhook/my-endpoint';

  // 3. Call webhook
  const data = await this.n8nWebhook.callWebhook<any[]>({
    endpoint: webhookEndpoint,
    method: 'POST',
    userLogin,  // Automatically added
  });

  return {
    status: 200,
    data: data,
  };
}
```

### GET Request with Telegram Username

```typescript
const channels = await this.n8nWebhook.callWebhook<any[]>({
  endpoint: '/webhook/get-groups-telegram',
  method: 'GET',
  userLogin,
  telegramUsername: 'username',  // Added to query params
});
```

### POST Request with Body

```typescript
const result = await this.n8nWebhook.callWebhook<any>({
  endpoint: '/webhook/add-item',
  method: 'POST',
  body: {
    name: 'Item Name',
    description: 'Description',
  },
  userLogin,  // Automatically added to body
});
```

## 📤 Response Format

### Standard Response

```typescript
// Success
{
  status: 200,
  data: { /* your data */ }
}

// Creation
{
  status: 201,
  data: { /* created resource */ },
  message: 'Resource created successfully'
}

// Error
{
  status: 400,
  message: 'Invalid input data'
}
```

### Controller Response Pattern

```typescript
async getData(@Req() req: RequestWithToken, @Res() res: Response) {
  const result = await this.service.getData(req.user.sub);
  return res.status(result.status).json(result);
}
```

## 🧩 Service Template

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

  async getItems(userId: number, email?: string) {
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
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

## 📝 DTO Template

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

## 🚫 Forbidden

- ❌ Change `src/auth/`
- ❌ Change `src/services/main-server-client.service.ts`
- ❌ Change `src/config/jwt.config.ts`
- ❌ Use `HttpService` directly for main server calls
- ❌ Use `HttpService` directly for n8n calls
- ❌ Remove `@UseGuards(JwtAuthGuard)`
- ❌ Bypass authentication
- ❌ Change response format `{ status, data, message }`

## ✅ Allowed

- ✅ Create new modules in `src/modules/`
- ✅ Create new services for business logic
- ✅ Create new controllers with `JwtAuthGuard`
- ✅ Add new endpoints
- ✅ Modify n8n webhook endpoints (via env vars)
- ✅ Change business logic in modules
- ✅ Use `UserContextService` to get `userLogin`
- ✅ Use `N8NWebhookService` for n8n calls
- ✅ Use `MainServerClientService` for main server calls

## 📚 Full Documentation

- **AI_AGENT_GUIDE_EN.md** - Full guide (English)
- **AI_AGENT_GUIDE.md** - Full guide (Ukrainian)
