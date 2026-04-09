import { Request } from 'express';
import { TelegramInitDataValidationResult } from '../auth.service';

export interface TelegramRequest extends Request {
  telegramAuth?: TelegramInitDataValidationResult;
}
