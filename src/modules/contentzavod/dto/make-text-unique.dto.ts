import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MakeTextUniqueDto {
  @ApiProperty({
    description: 'Text to make unique',
    example: 'Original text content...',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
