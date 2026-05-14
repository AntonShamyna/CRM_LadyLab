import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import argon2 from 'argon2';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (existing) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    return this.prisma.user.create({
      data: {
        login: dto.login,
        passwordHash: await argon2.hash(dto.password),
        role: dto.role,
      },
      select: {
        id: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        login: dto.login,
        role: dto.role,
        isActive: dto.isActive,
        passwordHash: dto.password ? await argon2.hash(dto.password) : undefined,
      },
      select: {
        id: true,
        login: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deactivate(id: string) {
    await this.ensureExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, refreshTokenHash: null },
      select: { id: true, login: true, role: true, isActive: true },
    });
  }

  private async ensureExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
  }
}
