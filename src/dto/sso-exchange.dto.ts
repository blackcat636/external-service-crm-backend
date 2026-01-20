import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Expose } from 'class-transformer';

export class SsoExchangeDto {
  @ApiProperty({
    description: 'SSO code received from callback',
    example: '64-character-hex-code',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Redirect URI that was used in initiate request (accepts both redirect_uri and redirectUri)',
    example: 'https://external-service.com/callback',
  })
  @Transform(({ obj }) => {
    // Support both snake_case (redirect_uri) and camelCase (redirectUri) formats
    return obj.redirect_uri || obj.redirectUri;
  })
  @Expose({ name: 'redirect_uri', toClassOnly: true })
  @IsString({ message: 'redirectUri must be a string' })
  @IsNotEmpty({ message: 'redirectUri should not be empty' })
  redirectUri: string;
}
