import { IsOptional, IsString } from "class-validator";

export class AuthLoginDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class AuthRegisterDto {
  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  password?: string;
}
