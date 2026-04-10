import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { Bot, Keyboard } from 'grammy';
import { UsersService } from '../users/users.service';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot?: Bot;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN topilmadi. Bot ishga tushirilmadi.');
      return;
    }

    this.bot = new Bot(botToken);
    this.registerHandlers();

    if (!this.isPollingEnabled()) {
      this.logger.log('BOT_POLLING_ENABLED=false. Polling yoqilmadi.');
      return;
    }

    void this.bot
      .start({
        drop_pending_updates: true,
        onStart: (botInfo) => {
          this.logger.log(
            `Bot @${botInfo.username} polling yordamida ishga tushdi.`,
          );
        },
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Bot polling ishga tushmadi: ${message}`);
      });
  }

  onModuleDestroy() {
    void this.bot?.stop();
  }

  async broadcastMessage(dto: BroadcastMessageDto): Promise<{
    totalRecipients: number;
    successCount: number;
    failedCount: number;
    deactivatedCount: number;
  }> {
    if (!this.bot) {
      throw new InternalServerErrorException('Bot ishga tushmagan.');
    }

    const recipients = await this.usersService.listActiveBotRecipients({
      role: dto.role,
    });

    let successCount = 0;
    let failedCount = 0;
    let deactivatedCount = 0;

    for (const recipient of recipients) {
      try {
        await this.bot.api.sendMessage(
          Number(recipient.telegramId),
          dto.message,
        );
        successCount += 1;
      } catch (error) {
        failedCount += 1;

        if (this.isChatUnavailableError(error)) {
          deactivatedCount += 1;
          await this.usersService.updateBotActiveStatusByTelegramId(
            recipient.telegramId,
            false,
          );
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Telegram user ${recipient.telegramId} ga broadcast yuborilmadi: ${message}`,
        );
      }
    }

    return {
      totalRecipients: recipients.length,
      successCount,
      failedCount,
      deactivatedCount,
    };
  }

  async sendOrderNotification(payload: {
    orderNumber: string;
    source: string;
    customerName: string;
    customerPhone: string;
    addressLine: string;
    entrance: string | null;
    floor: string | null;
    apartment: string | null;
    totalPrice: number;
    itemsCount: number;
  }): Promise<void> {
    if (!this.bot) {
      return;
    }

    const channelId = this.configService.get<string>(
      'TELEGRAM_ORDERS_CHANNEL_ID',
    );

    if (!channelId) {
      return;
    }

    const addressParts = [
      payload.addressLine,
      payload.entrance ? `Kirish: ${payload.entrance}` : null,
      payload.floor ? `Qavat: ${payload.floor}` : null,
      payload.apartment ? `Xonadon: ${payload.apartment}` : null,
    ].filter((part) => part !== null);

    const message = [
      `Yangi buyurtma: ${payload.orderNumber}`,
      `Manba: ${payload.source}`,
      `Mijoz: ${payload.customerName}`,
      `Telefon: ${payload.customerPhone}`,
      `Manzil: ${addressParts.join(', ')}`,
      `Mahsulotlar: ${payload.itemsCount} ta`,
      `Jami: ${payload.totalPrice}`,
    ].join('\n');

    try {
      await this.bot.api.sendMessage(channelId, message);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Order xabari Telegram kanalga yuborilmadi: ${messageText}`,
      );
    }
  }

  private registerHandlers() {
    if (!this.bot) {
      return;
    }

    this.bot.on('my_chat_member', async (ctx) => {
      const update = ctx.update.my_chat_member;

      if (!update || update.chat.type !== 'private') {
        return;
      }

      const status = update.new_chat_member.status;
      const isBotActive = !['left', 'kicked'].includes(status);

      await this.usersService.updateBotActiveStatusByTelegramId(
        String(update.chat.id),
        isBotActive,
      );
    });

    this.bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

      if (telegramId) {
        await this.usersService.updateBotActiveStatusByTelegramId(
          telegramId,
          true,
        );

        const existingUser =
          await this.usersService.findPublicByTelegramId(telegramId);

        if (existingUser) {
          await ctx.reply(
            `Siz allaqachon ro'yxatdan o'tgansiz. Sizning rolingiz: ${this.formatRole(
              existingUser.role,
            )}.`,
            {
              reply_markup: { remove_keyboard: true },
            },
          );
          return;
        }
      }

      await ctx.reply(
        "Ro'yxatdan o'tish uchun pastdagi tugma orqali telefon raqamingizni yuboring.",
        {
          reply_markup: this.createPhoneKeyboard(),
        },
      );
    });

    this.bot.on('message:contact', async (ctx) => {
      if (!ctx.from) {
        return;
      }

      const contact = ctx.message.contact;

      if (contact.user_id && contact.user_id !== ctx.from.id) {
        await ctx.reply(
          "Iltimos, faqat o'zingizga tegishli telefon raqamini yuboring.",
          {
            reply_markup: this.createPhoneKeyboard(),
          },
        );
        return;
      }

      try {
        const user = await this.usersService.registerTelegramUser({
          telegramId: String(ctx.from.id),
          telegramUsername: ctx.from.username,
          phone: contact.phone_number,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
        });

        await ctx.reply(
          `Ro'yxatdan o'tish yakunlandi. Sizning rolingiz: ${this.formatRole(
            user.role,
          )}.`,
          {
            reply_markup: { remove_keyboard: true },
          },
        );
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException
        ) {
          await ctx.reply(error.message, {
            reply_markup: this.createPhoneKeyboard(),
          });
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Telegram user ${ctx.from.id} ni ro'yxatdan o'tkazishda xatolik: ${message}`,
        );
        await ctx.reply(
          "Ro'yxatdan o'tkazishda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
          {
            reply_markup: this.createPhoneKeyboard(),
          },
        );
      }
    });

    this.bot.on('message:text', async (ctx) => {
      if (ctx.from?.id) {
        await this.usersService.updateBotActiveStatusByTelegramId(
          String(ctx.from.id),
          true,
        );
      }

      if (ctx.message.text.startsWith('/start')) {
        return;
      }

      await ctx.reply(
        'Telefon raqamingizni yuborish uchun pastdagi tugmadan foydalaning.',
        {
          reply_markup: this.createPhoneKeyboard(),
        },
      );
    });
  }

  private createPhoneKeyboard() {
    return new Keyboard()
      .requestContact('Telefon raqamni yuborish')
      .resized()
      .oneTime();
  }

  private isPollingEnabled(): boolean {
    const rawValue =
      this.configService.get<string>('BOT_POLLING_ENABLED') ?? 'true';

    return !['false', '0', 'no', 'off'].includes(rawValue.toLowerCase());
  }

  private isChatUnavailableError(error: unknown): boolean {
    const errorObject = error as {
      error_code?: number;
      description?: string;
      message?: string;
    };
    const description = (
      errorObject.description ??
      errorObject.message ??
      ''
    ).toLowerCase();

    return (
      errorObject.error_code === 403 ||
      description.includes('bot was blocked by the user') ||
      description.includes('chat not found') ||
      description.includes('user is deactivated') ||
      description.includes('bot was kicked')
    );
  }

  private formatRole(role: Role): string {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'super admin';
      case Role.CASHIER:
        return 'kassir';
      case Role.USER:
      default:
        return 'oddiy user';
    }
  }
}
