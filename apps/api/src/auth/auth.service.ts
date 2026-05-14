import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(login: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { login } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const tokens = await this.issueTokens(user.id, user.login, user.role);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        login: user.login,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive || !user.refreshTokenHash) {
        throw new UnauthorizedException('Сессия недействительна');
      }

      const isValid = await argon2.verify(user.refreshTokenHash, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Сессия недействительна');
      }

      const tokens = await this.issueTokens(user.id, user.login, user.role);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: await argon2.hash(tokens.refreshToken) },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Сессия недействительна');
    }
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { ok: true };
  }

  private async issueTokens(id: string, login: string, role: string) {
    const payload = { sub: id, login, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') ?? 'dev-refresh-secret',
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '30d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
