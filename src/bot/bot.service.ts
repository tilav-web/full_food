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
import { LocationsService } from '../locations/locations.service';
import { UsersService } from '../users/users.service';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot?: Bot;

  private pendingLocationLabels = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly locationsService: LocationsService,
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
    latitude: number;
    longitude: number;
    totalPrice: number;
    items: { name: string; quantity: number; lineTotal: number }[];
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

    const locationLink =
      payload.latitude !== 0 || payload.longitude !== 0
        ? `https://maps.google.com/maps?q=${payload.latitude},${payload.longitude}`
        : null;

    const messageParts = [
      `🆕 Yangi buyurtma: ${payload.orderNumber}`,
      `📦 Manba: ${payload.source === 'MINI_APP' ? 'Mini App' : 'Kassir paneli'}`,
      `👤 Mijoz: ${payload.customerName}`,
      `📞 Telefon: ${payload.customerPhone}`,
      `📍 Manzil: ${addressParts.join(', ')}`,
      locationLink ? `🗺 Xarita: ${locationLink}` : null,
      `🍽 Mahsulotlar (${payload.items.length} ta):`,
      ...payload.items.map(
        (item) =>
          `  • ${item.name} × ${item.quantity} — ${item.lineTotal.toLocaleString()} so'm`,
      ),
      `💰 Jami: ${payload.totalPrice.toLocaleString()} so'm`,
    ]
      .filter((part) => part !== null)
      .join('\n');

    try {
      await this.bot.api.sendMessage(channelId, messageParts);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Order xabari Telegram kanalga yuborilmadi: ${messageText}`,
      );
    }
  }

  async sendUserOrderNotification(payload: {
    telegramId: string;
    orderNumber: string;
    message: string;
  }): Promise<void> {
    if (!this.bot) {
      return;
    }

    try {
      await this.bot.api.sendMessage(
        Number(payload.telegramId),
        payload.message,
      );
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `User ${payload.telegramId} ga order ${payload.orderNumber} notification yuborilmadi: ${messageText}`,
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
            'Siz allaqachon ro`yxatdan o`tgansiz. Mini App ni ochish uchun pastdagi tugmani bosing.',
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Mini App ni ochish',
                      web_app: { url: this.getMiniAppUrl() },
                    },
                  ],
                ],
              },
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
          'Ro`yxatdan o`tish yakunlandi! Mini App ni ochish uchun pastdagi tugmani bosing.',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Mini App ni ochish',
                    web_app: { url: this.getMiniAppUrl() },
                  },
                ],
              ],
            },
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

    this.bot.command('location', async (ctx) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

      if (!telegramId) {
        return;
      }

      const user =
        await this.usersService.findPublicByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          'Avval /start buyrug`i orqali ro`yxatdan o`ting.',
        );
        return;
      }

      const label = ctx.match?.trim() || '';

      if (!label) {
        await ctx.reply(
          'Joylashuv nomini kiriting.\n\nMisol: /location Uyim\n\nKeyin pastdagi tugma orqali joylashuvni yuboring.',
          {
            reply_markup: new Keyboard()
              .requestLocation('Joylashuvni yuborish')
              .resized()
              .oneTime(),
          },
        );
        return;
      }

      this.pendingLocationLabels.set(telegramId, label);

      await ctx.reply(
        `"${label}" uchun joylashuvni yuboring.`,
        {
          reply_markup: new Keyboard()
            .requestLocation('Joylashuvni yuborish')
            .resized()
            .oneTime(),
        },
      );
    });

    this.bot.on('message:location', async (ctx) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

      if (!telegramId) {
        return;
      }

      const user =
        await this.usersService.findPublicByTelegramId(telegramId);

      if (!user) {
        await ctx.reply(
          'Avval /start buyrug`i orqali ro`yxatdan o`ting.',
        );
        return;
      }

      const location = ctx.message.location;
      const label =
        this.pendingLocationLabels.get(telegramId) || 'Mening joylashuvim';
      this.pendingLocationLabels.delete(telegramId);

      try {
        const saved = await this.locationsService.createFromBot(
          user.id,
          label,
          location.latitude,
          location.longitude,
        );

        await ctx.reply(
          `Joylashuv saqlandi: "${saved.label}"\n\nEndi Mini App ga qaytib buyurtma berishingiz mumkin.`,
          {
            reply_markup: { remove_keyboard: true },
          },
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Location saqlashda xatolik: ${message}`,
        );
        await ctx.reply(
          'Joylashuvni saqlashda xatolik yuz berdi. Qayta urinib ko`ring.',
          {
            reply_markup: { remove_keyboard: true },
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

  private getMiniAppUrl(): string {
    return (
      this.configService.get<string>('MINI_APP_URL') ??
      'https://fullfood.netlify.app'
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
