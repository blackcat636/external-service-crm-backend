import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAuthorDto {
  @ApiProperty({
    description: 'Author ID',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  id: number;
}
