# Швидкий довідник для AI Агента - CRM External Service Backend

> Коротка інструкція для швидкого початку роботи з бекендом

## 🎯 Головне правило

**Бекенд може бути клонований і адаптований (нові модулі, ендпоінти, бізнес-логіка), але механізм SSO авторизації має залишатися незмінним!**

## 🚀 Швидкий старт

### Основні правила

1. **НЕ змінюйте** `src/auth/`, `src/services/main-server-client.service.ts`, `src/config/jwt.config.ts`
2. **Використовуйте `JwtAuthGuard`** для всіх захищених маршрутів
3. **Використовуйте `UserContextService`** для отримання `userLogin` з токену
4. **Використовуйте `N8NWebhookService`** для n8n webhook викликів
5. **Використовуйте `MainServerClientService`** для спілкування з основним сервером
6. **Повертайте послідовний формат** `{ status, data, message }`

## 🔐 Авторизація

### Шаблон захищеного маршруту

```typescript
import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RequestWithToken } from '../../auth/interfaces/request-with-token.interface';
import { requireServiceToken } from '../../auth/utils/extract-token.util';

@ApiTags('MyModule')
@Controller('operations/my-module')
@UseGuards(JwtAuthGuard)  // ✅ ОБОВ'ЯЗКОВО
@ApiBearerAuth()           // ✅ ОБОВ'ЯЗКОВО
export class MyController {
  @Get('data')
  @ApiOperation({ summary: 'Get data' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getData(@Req() req: RequestWithToken, @Res() res: Response) {
    const userId = req.user?.sub;      // User ID з токену
    const email = req.user?.email;     // Email з токену
    
    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'User ID not found in token',
      });
    }

    // Витягнути service токен з заголовка Authorization
    const serviceToken = requireServiceToken(req);

    // Ваша логіка тут - передайте serviceToken в сервіси
    
    return res.status(200).json({
      status: 200,
      data: { /* ваші дані */ },
    });
  }
}
```

### Витягування Service Token

**Helper функції** для витягування service токену з запиту:

```typescript
import { extractServiceToken, requireServiceToken } from '../../auth/utils/extract-token.util';

// Опціональний токен (повертає null якщо не знайдено)
const serviceToken = extractServiceToken(req);
if (serviceToken) {
  // Використати токен
}

// Обов'язковий токен (викидає HttpException якщо не знайдено)
const serviceToken = requireServiceToken(req);
// Використати токен - гарантовано присутній
```

## 🔌 Спілкування з основним сервером

### ⚠️ ВАЖЛИВО: Завжди використовуйте MainServerClientService з service токеном!

```typescript
import { MainServerClientService } from '../../services/main-server-client.service';
import { requireServiceToken } from '../../auth/utils/extract-token.util';

constructor(
  private readonly mainServerClient: MainServerClientService,
) {}

// В методі контролера
async getProfile(@Req() req: RequestWithToken, @Res() res: Response) {
  // Витягнути service токен з заголовка Authorization
  const serviceToken = requireServiceToken(req);
  
  // Отримати профіль користувача (serviceToken є першим параметром)
  const result = await this.mainServerClient.getUserProfile(serviceToken);
  
  // Отримати баланси
  const balances = await this.mainServerClient.getUserBalances(serviceToken);
  
  // Списати з балансу
  const chargeResult = await this.mainServerClient.chargeBalance(serviceToken, {
    amount: 100,
    currencyCode: 'USD',
    referenceId: 'REF123',
    referenceType: 'service',
    description: 'Payment',
  });
  
  // Генеральний запит
  const data = await this.mainServerClient.genericRequest('GET', '/endpoint', serviceToken);
}
```

### ❌ НЕ використовуйте HttpService напряму!

```typescript
// ❌ НЕПРАВИЛЬНО
const response = await firstValueFrom(
  this.httpService.get(`${MAIN_SERVER_URL}/users/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  }),
);
```

### ⚠️ ВАЖЛИВО: Управління Service Token

**Service токени більше НЕ зберігаються глобально!** Кожен запит повинен витягувати токен з заголовка `Authorization`:

```typescript
import { requireServiceToken } from '../../auth/utils/extract-token.util';

// В контролері
async getData(@Req() req: RequestWithToken, @Res() res: Response) {
  // Витягнути токен з запиту
  const serviceToken = requireServiceToken(req);
  
  // Передати токен в методи сервісів
  const result = await this.mainServerClient.getUserProfile(serviceToken);
}
```

## 🔗 n8n Інтеграція

### ⚠️ ВАЖЛИВО: Завжди використовуйте N8NWebhookService!

```typescript
import { N8NWebhookService } from '../contentzavod/services/n8n-webhook.service';
import { UserContextService } from '../contentzavod/services/user-context.service';

constructor(
  private readonly n8nWebhook: N8NWebhookService,
  private readonly userContext: UserContextService,
  private readonly configService: ConfigService,
) {}

async getData(serviceToken: string, userId: number, email?: string) {
  // 1. Отримати userLogin (ОБОВ'ЯЗКОВО) - serviceToken є першим параметром
  const userLogin = await this.userContext.getUserLoginFromToken(serviceToken, userId, email);
  if (!userLogin) {
    throw new HttpException(
      'Unable to determine user login',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // 2. Отримати webhook ендпоінт з конфігурації
  const webhookEndpoint =
    this.configService.get<string>('N8N_MY_WEBHOOK') || '/webhook/my-endpoint';

  // 3. Викликати webhook
  const data = await this.n8nWebhook.callWebhook<any[]>({
    endpoint: webhookEndpoint,
    method: 'POST',
    userLogin,  // Автоматично додається
  });

  return {
    status: 200,
    data: data,
  };
}
```

### GET запит з Telegram Username

```typescript
const channels = await this.n8nWebhook.callWebhook<any[]>({
  endpoint: '/webhook/get-groups-telegram',
  method: 'GET',
  userLogin,
  telegramUsername: 'username',  // Додається до query параметрів
});
```

### POST запит з body

```typescript
const result = await this.n8nWebhook.callWebhook<any>({
  endpoint: '/webhook/add-item',
  method: 'POST',
  body: {
    name: 'Item Name',
    description: 'Description',
  },
  userLogin,  // Автоматично додається до body
});
```

## 📤 Формат відповіді

### Стандартна відповідь

```typescript
// Успіх
{
  status: 200,
  data: { /* ваші дані */ }
}

// Створення
{
  status: 201,
  data: { /* створений ресурс */ },
  message: 'Resource created successfully'
}

// Помилка
{
  status: 400,
  message: 'Invalid input data'
}
```

### Патерн відповіді в контролері

```typescript
async getData(@Req() req: RequestWithToken, @Res() res: Response) {
  const result = await this.service.getData(req.user.sub);
  return res.status(result.status).json(result);
}
```

## 🧩 Шаблон сервісу

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

## 📝 Шаблон DTO

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

## 🚫 Заборонено

- ❌ Змінювати `src/auth/`
- ❌ Змінювати `src/services/main-server-client.service.ts`
- ❌ Змінювати `src/config/jwt.config.ts`
- ❌ Використовувати `HttpService` напряму для викликів основного сервера
- ❌ Використовувати `HttpService` напряму для викликів n8n
- ❌ Видаляти `@UseGuards(JwtAuthGuard)`
- ❌ Обходити авторизацію
- ❌ Змінювати формат відповіді `{ status, data, message }`

## ✅ Дозволено

- ✅ Створювати нові модулі в `src/modules/`
- ✅ Створювати нові сервіси для бізнес-логіки
- ✅ Створювати нові контролери з `JwtAuthGuard`
- ✅ Додавати нові ендпоінти
- ✅ Модифікувати n8n webhook ендпоінти (через env vars)
- ✅ Змінювати бізнес-логіку в модулях
- ✅ Використовувати `requireServiceToken()` або `extractServiceToken()` для витягування токенів
- ✅ Використовувати `UserContextService.getUserLoginFromToken(serviceToken, userId, email)` для отримання `userLogin`
- ✅ Використовувати `N8NWebhookService` для n8n викликів
- ✅ Використовувати методи `MainServerClientService` з параметром `serviceToken` для викликів основного сервера

## 📚 Повна документація

- **AI_AGENT_GUIDE.md** - Повна інструкція (Ukrainian)
- **AI_AGENT_GUIDE_EN.md** - Full guide (English)
