import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditWithAIDto {
  @ApiProperty({
    description: 'Text to edit',
    example: 'Original text content...',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'AI editing prompt/instructions',
    example: 'Make this text more engaging and professional',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
