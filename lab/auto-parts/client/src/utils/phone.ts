/** '+79001234567' или '79001234567' → '+7 (900) 123-45-67' */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  if (local.length !== 10) return phone;
  return `+7 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 8)}-${local.slice(8, 10)}`;
}

/** Маска по мере ввода: превращает вводимые цифры в '+7 (900) 123-45-67' */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  const d = local.slice(0, 10);
  if (d.length === 0) return '';
  let r = `+7 (${d.slice(0, Math.min(3, d.length))}`;
  if (d.length <= 3) return r;
  r += `) ${d.slice(3, Math.min(6, d.length))}`;
  if (d.length <= 6) return r;
  r += `-${d.slice(6, Math.min(8, d.length))}`;
  if (d.length <= 8) return r;
  return r + `-${d.slice(8, 10)}`;
}

/** Снимает маску перед отправкой на сервер: '+7 (900) 123-45-67' → '+79001234567' */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  return `+7${local}`;
}
