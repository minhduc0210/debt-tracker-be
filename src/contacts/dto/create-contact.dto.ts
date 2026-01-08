import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ContactRole } from 'generated/prisma/enums';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(ContactRole)
  @IsOptional()
  role?: ContactRole;
}
