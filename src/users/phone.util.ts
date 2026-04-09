const UZBEKISTAN_COUNTRY_CODE = '998';
const LOCAL_PHONE_LENGTH = 9;

export function normalizeUzbekPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  const normalized = digits.startsWith(UZBEKISTAN_COUNTRY_CODE)
    ? digits.slice(UZBEKISTAN_COUNTRY_CODE.length)
    : digits;

  if (!new RegExp(`^\\d{${LOCAL_PHONE_LENGTH}}$`).test(normalized)) {
    throw new Error('Phone number must contain 9 local digits');
  }

  return normalized;
}

export function safeTelegramName(value?: string | null): string {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : '-';
}
