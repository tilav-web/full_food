import { Request } from 'express';
import { TelegramInitDataValidationResult } from '../auth.service';
import { PublicUser } from '../../users/users.service';

export interface TelegramRequest extends Request {
  telegramAuth?: TelegramInitDataValidationResult;
  authUser?: PublicUser | null;
}
