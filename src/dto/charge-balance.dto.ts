import { IsNumber, IsString, IsNotEmpty, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChargeBalanceDto {
  @ApiProperty({
    description: 'Amount to charge',
    example: 100.50,
    minimum: 0.01,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  currencyCode: string;

  @ApiProperty({
    description: 'Reference ID for the transaction',
    example: 'SERVICE_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @ApiProperty({
    description: 'Reference type',
    example: 'external-service',
  })
  @IsString()
  @IsNotEmpty()
  referenceType: string;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Payment for service',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
