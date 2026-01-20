import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartVideoGenerationDto {
  @ApiProperty({
    description: 'Video generation type',
    enum: ['veo3', 'sora', 'avatar'],
    example: 'veo3',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['veo3', 'sora', 'avatar'])
  type: 'veo3' | 'sora' | 'avatar';

  @ApiProperty({
    description: 'Video ID',
    example: '123',
  })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({
    description: 'Text/script for video generation',
    example: 'Video script text...',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Video orientation',
    enum: ['vertical', 'horizontal'],
    example: 'vertical',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['vertical', 'horizontal'])
  orientation: 'vertical' | 'horizontal';
}
