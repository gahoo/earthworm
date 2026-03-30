import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

export const UncheckAuth = () => SetMetadata("uncheck", true);
// Deprecated permissions check since we no longer use Logto scopes
export const Permissions = (...permissions: string[]) => SetMetadata("permissions", permissions);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    const uncheck = Reflect.getMetadata("uncheck", context.getHandler());

    if (!token && uncheck) {
      request["userId"] = null;
      return true;
    } else if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || "earthworm-secret-key",
      });
      request["userId"] = payload.sub;
    } catch (e) {
      if (!uncheck) {
        throw new UnauthorizedException();
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
