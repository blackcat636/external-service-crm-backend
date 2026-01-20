import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAuthorDto {
  @ApiProperty({
    description: 'Instagram profile URL',
    example: 'https://www.instagram.com/username/',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
