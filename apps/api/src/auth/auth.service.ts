import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";
import { users } from "@earthworm/schema";
import { DB, DbType } from "../global/providers/db.provider";
import { AuthLoginDto, AuthRegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: DbType,
    private jwtService: JwtService,
  ) {}

  async login(dto: AuthLoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.username, dto.username),
    });

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    if (user.passwordHash && dto.password) {
      const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
      if (!isPasswordValid) {
        throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
      }
    } else if (user.passwordHash && !dto.password) {
      throw new HttpException("Password required", HttpStatus.BAD_REQUEST);
    } else if (!user.passwordHash && dto.password) {
      // User registered without password, but trying to login with one
      throw new HttpException("Invalid credentials", HttpStatus.UNAUTHORIZED);
    }

    const payload = { sub: user.id, username: user.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async register(dto: AuthRegisterDto) {
    const existingUser = await this.db.query.users.findFirst({
      where: eq(users.username, dto.username),
    });

    if (existingUser) {
      throw new HttpException("Username already taken", HttpStatus.CONFLICT);
    }

    let passwordHash = null;
    if (dto.password) {
      passwordHash = await argon2.hash(dto.password);
    }

    const [newUser] = await this.db
      .insert(users)
      .values({
        username: dto.username,
        passwordHash,
      })
      .returning();

    const payload = { sub: newUser.id, username: newUser.username };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
