import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard, type JwtPayload } from './jwt.guard';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(10) password!: string;
  @IsString() name!: string;
  @IsString() organizationId!: string;
  @IsString() role?: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /v1/auth/login  { email, password }
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // POST /v1/auth/register  (invitación a una org existente)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  // GET /v1/auth/me
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: JwtPayload }) {
    return req.user;
  }
}
