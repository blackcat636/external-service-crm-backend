import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TranscribeVideoDto {
  @ApiProperty({
    description: 'Video URL to transcribe',
    example: 'https://example.com/video.mp4',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  videoUrl: string;
}
