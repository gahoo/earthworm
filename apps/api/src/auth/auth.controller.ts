import { Body, Controller, Post } from "@nestjs/common";
import { UncheckAuth } from "../guards/auth.guard";
import { AuthLoginDto, AuthRegisterDto } from "./auth.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UncheckAuth()
  @Post("login")
  async login(@Body() dto: AuthLoginDto) {
    return this.authService.login(dto);
  }

  @UncheckAuth()
  @Post("register")
  async register(@Body() dto: AuthRegisterDto) {
    return this.authService.register(dto);
  }
}
