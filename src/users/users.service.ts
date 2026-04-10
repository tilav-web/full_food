import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeUzbekPhoneNumber, safeTelegramName } from './phone.util';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

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
  isBotActive: boolean;
  phone: string;
  firstName: string;
  lastName: string;
  role: Role;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedUsersResponse = {
  data: PublicUser[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
          isBotActive: true,
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
          isBotActive: true,
          firstName,
          lastName,
          role: Role.USER,
        },
      });
    });

    return this.toPublicUser(user);
  }

  async listUsers(query: ListUsersQueryDto): Promise<PaginatedUsersResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      role: query.role,
      isBotActive: query.isBotActive,
      telegramId:
        query.hasTelegramId === undefined
          ? undefined
          : query.hasTelegramId
            ? { not: null }
            : null,
      OR: search
        ? [
            {
              phone: {
                contains: search,
              },
            },
            {
              firstName: {
                contains: search,
              },
            },
            {
              lastName: {
                contains: search,
              },
            },
            {
              telegramUsername: {
                contains: search,
              },
            },
            {
              telegramId: {
                contains: search,
              },
            },
          ]
        : undefined,
    };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: users.map((user) => this.toPublicUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
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

  async findPublicByIdOrThrow(id: string): Promise<PublicUser> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }

    return this.toPublicUser(user);
  }

  async updateUserRole(
    id: string,
    dto: UpdateUserRoleDto,
  ): Promise<PublicUser> {
    await this.ensureUserExists(id);
    await this.ensureSuperAdminGuardrails(id, dto.role);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        role: dto.role,
      },
    });

    return this.toPublicUser(user);
  }

  async updateUserPassword(
    id: string,
    dto: UpdateUserPasswordDto,
  ): Promise<PublicUser> {
    await this.ensureUserExists(id);

    const hashedPassword = await hash(dto.password, 10);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    return this.toPublicUser(user);
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

  async updateBotActiveStatusByTelegramId(
    telegramId: string,
    isBotActive: boolean,
  ): Promise<void> {
    const normalizedTelegramId = telegramId.trim();

    if (!normalizedTelegramId) {
      return;
    }

    await this.prisma.user.updateMany({
      where: {
        telegramId: normalizedTelegramId,
      },
      data: {
        isBotActive,
      },
    });
  }

  async listActiveBotRecipients(options?: {
    role?: Role;
  }): Promise<Array<{ id: string; telegramId: string }>> {
    const users = await this.prisma.user.findMany({
      where: {
        telegramId: {
          not: null,
        },
        isBotActive: true,
        role: options?.role,
      },
      select: {
        id: true,
        telegramId: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return users
      .filter((user) => user.telegramId !== null)
      .map((user) => ({
        id: user.id,
        telegramId: user.telegramId as string,
      }));
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      isBotActive: user.isBotActive,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      hasPassword: user.password !== null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async ensureUserExists(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi.');
    }

    return user;
  }

  private async ensureSuperAdminGuardrails(
    id: string,
    nextRole: Role,
  ): Promise<void> {
    const targetUser = await this.ensureUserExists(id);

    if (targetUser.role !== Role.SUPER_ADMIN || nextRole === Role.SUPER_ADMIN) {
      return;
    }

    const totalSuperAdmins = await this.prisma.user.count({
      where: {
        role: Role.SUPER_ADMIN,
      },
    });

    if (totalSuperAdmins <= 1) {
      throw new BadRequestException(
        'Oxirgi SUPER_ADMIN rolini o`zgartirib bo`lmaydi.',
      );
    }
  }
}
