import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUzbekPhoneNumber, safeTelegramName } from './phone.util';

export type TelegramRegistrationInput = {
  telegramId: string;
  telegramUsername?: string;
  phone: string;
  firstName?: string;
  lastName?: string;
};

export type PublicUser = {
  id: string;
  telegramId: string | null;
  telegramUsername: string | null;
  phone: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phone },
    });
  }

  async registerTelegramUser(
    input: TelegramRegistrationInput,
  ): Promise<PublicUser> {
    const telegramId = input.telegramId.trim();

    if (!telegramId) {
      throw new BadRequestException('Telegram ID topilmadi.');
    }

    let normalizedPhone: string;

    try {
      normalizedPhone = normalizeUzbekPhoneNumber(input.phone);
    } catch {
      throw new BadRequestException(
        "Telefon raqami 9 xonali formatda bo'lishi kerak.",
      );
    }

    const firstName = safeTelegramName(input.firstName);
    const lastName = safeTelegramName(input.lastName);
    const telegramUsername = input.telegramUsername?.trim() || null;

    const user = await this.prisma.$transaction(async (tx) => {
      const [userByPhone, userByTelegramId] = await Promise.all([
        tx.user.findUnique({
          where: { phone: normalizedPhone },
        }),
        tx.user.findUnique({
          where: { telegramId },
        }),
      ]);

      if (
        userByPhone &&
        userByPhone.telegramId &&
        userByPhone.telegramId !== telegramId
      ) {
        throw new ConflictException(
          'Bu telefon raqami boshqa Telegram akkauntiga biriktirilgan.',
        );
      }

      if (userByTelegramId && userByTelegramId.phone !== normalizedPhone) {
        throw new ConflictException(
          "Siz allaqachon boshqa telefon raqam bilan ro'yxatdan o'tgansiz.",
        );
      }

      const targetUser = userByPhone ?? userByTelegramId;

      if (targetUser) {
        const updateData: Prisma.UserUpdateInput = {
          phone: normalizedPhone,
          telegramId,
          firstName:
            targetUser.firstName === '-' ? firstName : targetUser.firstName,
          lastName:
            targetUser.lastName === '-' ? lastName : targetUser.lastName,
        };

        if (telegramUsername !== null) {
          updateData.telegramUsername = telegramUsername;
        }

        return tx.user.update({
          where: { id: targetUser.id },
          data: updateData,
        });
      }

      return tx.user.create({
        data: {
          phone: normalizedPhone,
          telegramId,
          telegramUsername,
          firstName,
          lastName,
          role: Role.USER,
        },
      });
    });

    return this.toPublicUser(user);
  }

  async findPublicByTelegramId(telegramId: string): Promise<PublicUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    return user ? this.toPublicUser(user) : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await this.findById(id);

    return user ? this.toPublicUser(user) : null;
  }

  async updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
      },
    });
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
