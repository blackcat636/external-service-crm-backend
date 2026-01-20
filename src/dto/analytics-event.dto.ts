import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsEventDto {
  @ApiProperty({
    description: 'Event type',
    example: 'payment.processed',
  })
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiProperty({
    description: 'Event data',
    example: { amount: 100, currency: 'USD' },
  })
  @IsObject()
  @IsNotEmpty()
  data: any;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { source: 'external-service' },
  })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class AnalyticsBatchDto {
  @ApiProperty({
    description: 'Array of events',
    type: [AnalyticsEventDto],
  })
  @IsNotEmpty()
  events: AnalyticsEventDto[];
}
