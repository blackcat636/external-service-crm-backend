import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteChannelDto {
  @ApiProperty({
    description: 'Channel ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
