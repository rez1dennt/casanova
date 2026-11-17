export function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '');
  if ((digits.length > 10 && /^[78]/.test(digits)) || /^\s*\+7/.test(value)) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function formatPhone(digits = '') {
  const n = digits.replace(/\D/g, '').slice(0, 10);
  if (!n) return '';
  let value = '+7 (' + n.slice(0, 3);
  if (n.length >= 3) value += ')';
  if (n.length > 3) value += ' ' + n.slice(3, 6);
  if (n.length > 6) value += '-' + n.slice(6, 8);
  if (n.length > 8) value += '-' + n.slice(8);
  return value;
}

export function editPhone(value, start, end, inputType, data = '') {
  if (inputType === 'insertText' && /^[78]$/.test(data) && (!value || (start === 0 && end === value.length))) {
    return { value: '+7 (', caret: 4 };
  }
  const digits = normalizePhone(value);
  const count = index => (value.slice(4, Math.max(4, index)).match(/\d/g) || []).length;
  let from = count(start), to = count(end);
  const deleting = inputType.startsWith('delete');
  if (start === end && deleting) {
    if (inputType.includes('Backward')) from = Math.max(0, from - 1);
    else to = Math.min(digits.length, to + 1);
  }
  const fullReplacement = start === 0 && end === value.length;
  const insertion = deleting ? '' : fullReplacement || !value ? normalizePhone(data) : String(data).replace(/\D/g, '');
  const result = formatPhone((digits.slice(0, from) + insertion + digits.slice(to)).slice(0, 10));
  const target = from + insertion.length;
  let caret = result.length, seen = 0;
  for (let i = 4; i < result.length; i++) {
    if (/\d/.test(result[i])) seen++;
    if (seen === target) { caret = i + 1; break; }
  }
  if (target === 0) caret = result ? 4 : 0;
  if (target >= normalizePhone(result).length) caret = result.length;
  return { value: result, caret };
}

export function validateContact({ name = '', phone = '', consent = false }) {
  const errors = {};
  if (name.trim().length < 2 || name.trim().length > 80) errors.name = 'Укажите имя — от 2 до 80 символов.';
  if (normalizePhone(phone).length !== 10) errors.phone = 'Введите номер телефона полностью.';
  if (!consent) errors.consent = 'Подтвердите согласие на обработку данных.';
  return errors;
}
