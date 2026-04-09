import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { Bot, Keyboard } from 'grammy';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot?: Bot;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
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

  private registerHandlers() {
    if (!this.bot) {
      return;
    }

    this.bot.command('start', async (ctx) => {
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

    this.bot.on('message:location', async (ctx) => {
      if (!ctx.from) {
        return;
      }

      try {
        const result =
          await this.ordersService.finalizeDraftFromTelegramLocation(
            String(ctx.from.id),
            {
              latitude: ctx.message.location.latitude,
              longitude: ctx.message.location.longitude,
            },
          );

        if (result.type === 'not_found') {
          await ctx.reply(
            'Hozircha location kutayotgan aktiv buyurtma topilmadi.',
            {
              reply_markup: { remove_keyboard: true },
            },
          );
          return;
        }

        if (result.type === 'processing') {
          await ctx.reply(
            'Lokatsiya qabul qilindi. Buyurtma hozir qayta ishlanmoqda.',
            {
              reply_markup: { remove_keyboard: true },
            },
          );
          return;
        }

        await ctx.reply(
          `Lokatsiya qabul qilindi. Buyurtmangiz yaratildi: ${result.order.orderNumber}.`,
          {
            reply_markup: { remove_keyboard: true },
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Telegram user ${ctx.from.id} location bo'yicha order finalize qilishda xatolik: ${message}`,
        );
        await ctx.reply(
          "Lokatsiyani qayta ishlashda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
          {
            reply_markup: this.createLocationKeyboard(),
          },
        );
      }
    });

    this.bot.on('message:text', async (ctx) => {
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

  async sendOrderLocationRequest(
    telegramId: string,
    payload: {
      addressLine: string;
      expiresAt: Date;
      totalPrice: number;
    },
  ): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn(
        `Bot ishga tushmagan. Telegram user ${telegramId} uchun location so'rovi yuborilmadi.`,
      );
      return false;
    }

    try {
      const minutesLeft = Math.max(
        1,
        Math.ceil((payload.expiresAt.getTime() - Date.now()) / 60000),
      );

      await this.bot.api.sendMessage(
        Number(telegramId),
        [
          'Buyurtmani yakunlash uchun lokatsiyani yuboring.',
          `Manzil: ${payload.addressLine}`,
          `Jami summa: ${payload.totalPrice}`,
          `Lokatsiyani ${minutesLeft} daqiqa ichida yuboring.`,
        ].join('\n'),
        {
          reply_markup: this.createLocationKeyboard(),
        },
      );

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Telegram user ${telegramId} uchun location so'rovini yuborishda xatolik: ${message}`,
      );
      return false;
    }
  }

  private isPollingEnabled(): boolean {
    const rawValue =
      this.configService.get<string>('BOT_POLLING_ENABLED') ?? 'true';

    return !['false', '0', 'no', 'off'].includes(rawValue.toLowerCase());
  }

  private createLocationKeyboard() {
    return new Keyboard()
      .requestLocation('Lokatsiyani yuborish')
      .resized()
      .oneTime();
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
