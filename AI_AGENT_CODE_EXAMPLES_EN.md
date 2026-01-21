# Code Examples for AI Agent - CRM External Service Backend

> Ready-to-use code examples for quick copying and adaptation

## ⚠️ IMPORTANT

**If you are creating new modules or protected routes, MUST integrate existing authentication mechanism!** See section [Authentication Integration](#authentication-integration).

## 📋 Table of Contents

1. [Authentication Integration](#authentication-integration)
2. [Services](#services)
3. [Controllers](#controllers)
4. [DTOs](#dtos)
5. [Modules](#modules)
6. [Main Server Integration](#main-server-integration)
7. [n8n Integration](#n8n-integration)

---

## 🔗 Authentication Integration

### New Protected Controller

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
import { MyModuleService } from '../services/my-module.service';
import { CreateItemDto } from '../dto/create-item.dto';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)  // ✅ REQUIRED for protected routes
@ApiBearerAuth()           // ✅ REQUIRED for Swagger
export class MyModuleController {
  constructor(private readonly myModuleService: MyModuleService) {}

  @Get('items')
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getItems(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;

      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.myModuleService.getItems(userId, email);
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

### Controller with Main Server Integration

```typescript
import {
  Controller,
  Get,
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
import { MainServerClientService } from '../../services/main-server-client.service';

@ApiTags('Profile')
@Controller('operations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get user profile from main server' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Res() res: Response) {
    try {
      // ✅ CORRECT: Use MainServerClientService
      const result = await this.mainServerClient.getUserProfile();
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get profile',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

---

## 🔧 Services

### Service with n8n Integration (GET request)

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';

@Injectable()
export class MyModuleService {
  private readonly logger = new Logger(MyModuleService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getItems(userId: number, email?: string) {
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
      this.configService.get<string>('N8N_GET_ITEMS_WEBHOOK') || '/webhook/get-items';

    try {
      // 3. Call webhook (GET request)
      const items = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
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

### Service with n8n Integration (POST request)

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';
import { CreateItemDto } from '../dto/create-item.dto';

@Injectable()
export class MyModuleService {
  private readonly logger = new Logger(MyModuleService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async createItem(userId: number, dto: CreateItemDto, email?: string) {
    // Validate input
    if (!dto.name || !dto.url) {
      throw new HttpException(
        'Name and URL are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get userLogin
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Get webhook endpoint from config
    const webhookEndpoint =
      this.configService.get<string>('N8N_CREATE_ITEM_WEBHOOK') || '/webhook/create-item';

    try {
      // Call webhook (POST request)
      const item = await this.n8nWebhook.callWebhook<any>({
        endpoint: webhookEndpoint,
        method: 'POST',
        body: {
          name: dto.name,
          url: dto.url,
          description: dto.description,
        },
        userLogin,  // Automatically added to body
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

### Service with Telegram Username

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly n8nWebhook: N8NWebhookService,
    private readonly userContext: UserContextService,
    private readonly configService: ConfigService,
  ) {}

  async getChannels(userId: number, telegramUsername: string, email?: string) {
    // Validate Telegram username
    if (!telegramUsername) {
      throw new HttpException(
        'Telegram username is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Get userLogin
    const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
    if (!userLogin) {
      throw new HttpException(
        'Unable to determine user login',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Get webhook endpoint from config
    const webhookEndpoint =
      this.configService.get<string>('N8N_GET_TELEGRAM_CHANNELS_WEBHOOK') ||
      '/webhook/get-groups-telegram';

    try {
      // Call webhook (GET request with telegramUsername)
      const channels = await this.n8nWebhook.callWebhook<any[]>({
        endpoint: webhookEndpoint,
        method: 'GET',
        userLogin,
        telegramUsername,  // Added to query params automatically
      });

      return {
        status: 200,
        data: channels,
      };
    } catch (error) {
      this.logger.error(`Failed to get Telegram channels: ${error}`);
      throw new HttpException(
        'Failed to fetch Telegram channels',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Service with Main Server Integration

```typescript
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MainServerClientService } from '../../services/main-server-client.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly mainServerClient: MainServerClientService,
  ) {}

  async getUserProfile() {
    try {
      // ✅ CORRECT: Use MainServerClientService
      const result = await this.mainServerClient.getUserProfile();

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
      this.logger.error(`Failed to get user profile: ${error}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to get user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async chargeBalance(data: ChargeBalanceDto) {
    try {
      // Check if user has sufficient funds
      const hasFunds = await this.mainServerClient.getBalanceByCurrency(
        data.currencyCode
      );

      if (!hasFunds.data || hasFunds.data.balance < data.amount) {
        throw new HttpException(
          'Insufficient funds',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Charge balance
      const chargeResult = await this.mainServerClient.chargeBalance({
        amount: data.amount,
        currencyCode: data.currencyCode,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        description: data.description || 'Payment for service',
      });

      if (chargeResult.status !== 200) {
        throw new HttpException(
          chargeResult.message || 'Failed to charge balance',
          chargeResult.status,
        );
      }

      return {
        status: 200,
        data: chargeResult.data,
        message: 'Balance charged successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to charge balance: ${error}`);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error.message || 'Failed to charge balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

---

## 🎮 Controllers

### Complete Controller Example

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';
import { MyModuleService } from '../services/my-module.service';
import { CreateItemDto } from '../dto/create-item.dto';
import { UpdateItemDto } from '../dto/update-item.dto';
import { DeleteItemDto } from '../dto/delete-item.dto';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MyModuleController {
  constructor(private readonly myModuleService: MyModuleService) {}

  @Get('items')
  @ApiOperation({ summary: 'Get all items' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getItems(@Req() req: RequestWithToken, @Res() res: Response) {
    try {
      const userId = req.user?.sub;
      const email = req.user?.email;

      if (!userId) {
        return res.status(401).json({
          status: 401,
          message: 'User ID not found in token',
        });
      }

      const result = await this.myModuleService.getItems(userId, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get items',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiParam({ name: 'id', description: 'Item ID' })
  @ApiResponse({ status: 200, description: 'Item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getItem(
    @Param('id') id: string,
    @Req() req: RequestWithToken,
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

      const result = await this.myModuleService.getItem(userId, +id, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get item',
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

  @Post('items/delete')
  @ApiOperation({ summary: 'Delete item' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async deleteItem(
    @Req() req: RequestWithToken,
    @Body() dto: DeleteItemDto,
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

      const result = await this.myModuleService.deleteItem(userId, dto, email);
      return res.status(result.status).json(result);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete item',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

### Controller with Query Parameters

```typescript
@Get('items')
@ApiOperation({ summary: 'Get items with filters' })
@ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
@ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
async getItems(
  @Query('status') status: string | undefined,
  @Query('limit') limit: string | undefined,
  @Req() req: RequestWithToken,
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

    const result = await this.myModuleService.getItems(
      userId,
      email,
      status,
      limit ? +limit : undefined,
    );
    return res.status(result.status).json(result);
  } catch (error) {
    throw new HttpException(
      error.message || 'Failed to get items',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Controller with Custom Header

```typescript
@Get('telegram/channels')
@ApiOperation({ summary: 'Get Telegram channels' })
@ApiHeader({ name: 'X-Telegram-Username', description: 'Telegram username', required: true })
@ApiResponse({ status: 200, description: 'Channels retrieved successfully' })
@ApiResponse({ status: 400, description: 'Telegram username is required' })
async getTelegramChannels(
  @Req() req: RequestWithToken,
  @Headers('x-telegram-username') telegramUsername: string,
  @Res() res: Response
) {
  try {
    if (!telegramUsername) {
      return res.status(400).json({
        status: 400,
        message: 'Telegram username is required',
      });
    }

    const userId = req.user?.sub;
    const email = req.user?.email;

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    const result = await this.telegramService.getChannels(
      userId,
      telegramUsername,
      email
    );
    return res.status(result.status).json(result);
  } catch (error) {
    throw new HttpException(
      error.message || 'Failed to get Telegram channels',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

## 📝 DTOs

### Create DTO with Validation

```typescript
import { IsString, IsNotEmpty, IsUrl, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'My Item',
    minLength: 3,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Item URL',
    example: 'https://example.com/item',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'Item description',
    required: false,
    example: 'Item description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
```

### Update DTO (Partial)

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateItemDto } from './create-item.dto';

export class UpdateItemDto extends PartialType(CreateItemDto) {}
```

### Delete DTO

```typescript
import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteItemDto {
  @ApiProperty({
    description: 'Item ID',
    example: 1,
  })
  @IsNumber()
  id: number;
}
```

---

## 🧩 Modules

### Complete Module Example

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
    N8NWebhookService,      // Reuse shared service
    UserContextService,      // Reuse shared service
    MainServerClientService, // Reuse shared service
  ],
  exports: [MyModuleService],
})
export class MyModuleModule {}
```

### Registering Module in AppModule

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
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

## 🔌 n8n Integration

### GET Request Example

```typescript
// Service method
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
    // GET request - userLogin added to query params
    const items = await this.n8nWebhook.callWebhook<any[]>({
      endpoint: webhookEndpoint,
      method: 'GET',
      userLogin,  // Added as ?userLogin=xxx
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
```

### POST Request Example

```typescript
// Service method
async createItem(userId: number, dto: CreateItemDto, email?: string) {
  const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
  if (!userLogin) {
    throw new HttpException(
      'Unable to determine user login',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const webhookEndpoint =
    this.configService.get<string>('N8N_CREATE_ITEM_WEBHOOK') || '/webhook/create-item';

  try {
    // POST request - userLogin added to body
    const item = await this.n8nWebhook.callWebhook<any>({
      endpoint: webhookEndpoint,
      method: 'POST',
      body: {
        name: dto.name,
        url: dto.url,
        description: dto.description,
      },
      userLogin,  // Automatically added to body: { userLogin: "xxx", name: "...", ... }
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
```

### GET Request with Telegram Username

```typescript
// Service method
async getTelegramChannels(
  userId: number,
  telegramUsername: string,
  email?: string
) {
  if (!telegramUsername) {
    throw new HttpException(
      'Telegram username is required',
      HttpStatus.BAD_REQUEST,
    );
  }

  const userLogin = await this.userContext.getUserLoginFromToken(userId, email);
  if (!userLogin) {
    throw new HttpException(
      'Unable to determine user login',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  const webhookEndpoint =
    this.configService.get<string>('N8N_GET_TELEGRAM_CHANNELS_WEBHOOK') ||
    '/webhook/get-groups-telegram';

  try {
    // GET request - userLogin and telegramUsername added to query params
    const channels = await this.n8nWebhook.callWebhook<any[]>({
      endpoint: webhookEndpoint,
      method: 'GET',
      userLogin,           // Added as ?userLogin=xxx
      telegramUsername,    // Added as &username=yyy
    });

    return {
      status: 200,
      data: channels,
    };
  } catch (error) {
    this.logger.error(`Failed to get Telegram channels: ${error}`);
    throw new HttpException(
      'Failed to fetch Telegram channels',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

## 🔌 Main Server Integration

### Getting User Profile

```typescript
async getUserProfile() {
  try {
    const result = await this.mainServerClient.getUserProfile();

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
    this.logger.error(`Failed to get user profile: ${error}`);
    
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      error.message || 'Failed to get user profile',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Charging Balance

```typescript
async chargeBalance(data: ChargeBalanceDto) {
  try {
    // Check balance
    const balanceResult = await this.mainServerClient.getBalanceByCurrency(
      data.currencyCode
    );

    if (balanceResult.status !== 200 || !balanceResult.data) {
      throw new HttpException(
        'Failed to check balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const balance = balanceResult.data.balance || 0;
    if (balance < data.amount) {
      throw new HttpException(
        'Insufficient funds',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Charge balance
    const chargeResult = await this.mainServerClient.chargeBalance({
      amount: data.amount,
      currencyCode: data.currencyCode,
      referenceId: data.referenceId,
      referenceType: data.referenceType,
      description: data.description || 'Payment for service',
    });

    if (chargeResult.status !== 200) {
      throw new HttpException(
        chargeResult.message || 'Failed to charge balance',
        chargeResult.status,
      );
    }

    return {
      status: 200,
      data: chargeResult.data,
      message: 'Balance charged successfully',
    };
  } catch (error) {
    this.logger.error(`Failed to charge balance: ${error}`);
    
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      error.message || 'Failed to charge balance',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

### Sending Analytics Event

```typescript
async sendAnalyticsEvent(data: AnalyticsEventDto) {
  try {
    const result = await this.mainServerClient.sendAnalyticsEvent({
      eventType: data.eventType,
      data: data.data,
      metadata: data.metadata,
    });

    return {
      status: result.status || 200,
      message: 'Event sent successfully',
    };
  } catch (error) {
    this.logger.error(`Failed to send analytics event: ${error}`);
    
    // Analytics errors should not fail the main operation
    // Log but don't throw
    return {
      status: 500,
      message: 'Failed to send analytics event',
    };
  }
}
```

### Generic Request Example

```typescript
async customMainServerCall() {
  try {
    // Use genericRequest for custom endpoints
    const result = await this.mainServerClient.genericRequest<any>(
      'GET',
      '/custom/endpoint',
    );

    return {
      status: result.status,
      data: result.data,
    };
  } catch (error) {
    this.logger.error(`Failed to call main server: ${error}`);
    throw new HttpException(
      error.message || 'Failed to call main server',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
```

---

## ❌ Common Mistakes

### ❌ INCORRECT - Direct HTTP calls

```typescript
// ❌ DO NOT DO THIS!
import { HttpService } from '@nestjs/axios';

// Direct call to main server
const response = await firstValueFrom(
  this.httpService.get(`${MAIN_SERVER_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
);

// Direct call to n8n
const response = await firstValueFrom(
  this.httpService.post(`${N8N_BASE_URL}/webhook/endpoint`, {
    userLogin: 'manual',
    field: 'value',
  }),
);
```

### ✅ CORRECT - Using Services

```typescript
// ✅ CORRECT - Main server
const result = await this.mainServerClient.getUserProfile();

// ✅ CORRECT - n8n webhook
const data = await this.n8nWebhook.callWebhook<any[]>({
  endpoint: '/webhook/endpoint',
  method: 'POST',
  body: { field: 'value' },
  userLogin,  // Automatically retrieved from token
});
```

---

## ✅ Best Practices

1. **Always use `UserContextService`** to get `userLogin` from token
2. **Always use `N8NWebhookService`** for n8n webhook calls
3. **Always use `MainServerClientService`** for main server communication
4. **Always use `JwtAuthGuard`** on protected routes
5. **Always use `RequestWithToken`** interface for `@Req()`
6. **Always return consistent format** `{ status, data, message }`
7. **Always handle errors** with try/catch
8. **Always log errors** with `this.logger.error()`
9. **Always use English** for error messages
10. **Always document endpoints** with Swagger decorators

---

**Use these examples as a basis for creating new modules and features!**
