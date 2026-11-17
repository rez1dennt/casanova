import { test } from 'node:test';
import assert from 'node:assert/strict';
let phone = {};
try { phone = await import('../assets/js/form-utils.js'); } catch {}

test('нормализует российские номера с 8, +7 и без префикса', () => {
  assert.equal(typeof phone.normalizePhone, 'function');
  for (const value of ['8 (991) 923-99-12', '+7 991 923 99 12', '9919239912']) {
    assert.equal(phone.normalizePhone(value), '9919239912');
  }
});
test('форматирует полный и неполный номер без символов-заглушек', () => {
  assert.equal(typeof phone.formatPhone, 'function');
  assert.equal(phone.formatPhone('9919239912'), '+7 (991) 923-99-12');
  assert.equal(phone.formatPhone('99'), '+7 (99');
  assert.equal(phone.formatPhone(''), '');
});
test('Backspace после закрывающей скобки удаляет цифру', () => {
  assert.equal(typeof phone.editPhone, 'function');
  assert.equal(phone.editPhone('+7 (991)', 8, 8, 'deleteContentBackward').value, '+7 (99');
});
test('Backspace после дефиса удаляет предыдущую цифру', () => {
  assert.equal(typeof phone.editPhone, 'function');
  assert.equal(phone.editPhone('+7 (991) 923-99-12', 13, 13, 'deleteContentBackward').value, '+7 (991) 929-91-2');
});
test('Delete перед скобкой удаляет следующую цифру', () => {
  assert.equal(typeof phone.editPhone, 'function');
  assert.equal(phone.editPhone('+7 (991) 923', 7, 7, 'deleteContentForward').value, '+7 (991) 23');
});
test('вставка полного номера заменяет выделение', () => {
  assert.equal(typeof phone.editPhone, 'function');
  const result = phone.editPhone('+7 (991)', 0, 8, 'insertFromPaste', '8 (999) 123-45-67');
  assert.equal(result.value, '+7 (999) 123-45-67');
  assert.equal(result.caret, result.value.length);
});
test('номер можно полностью стереть', () => {
  assert.equal(typeof phone.editPhone, 'function');
  assert.equal(phone.editPhone('+7 (9', 5, 5, 'deleteContentBackward').value, '');
});
test('начальные 8 и 7 при наборе распознаются как код страны', () => {
  for (const digit of ['8', '7']) {
    const prefix = phone.editPhone('', 0, 0, 'insertText', digit);
    assert.equal(prefix.value, '+7 (');
    assert.equal(phone.editPhone(prefix.value, 4, 4, 'insertText', '9').value, '+7 (9');
  }
});
test('проверяет имя, телефон и обязательное согласие', () => {
  assert.equal(typeof phone.validateContact, 'function');
  assert.deepEqual(phone.validateContact({ name: 'Анна', phone: '+7 (991) 923-99-12', consent: true }), {});
  const errors = phone.validateContact({ name: '', phone: '123', consent: false });
  assert.ok(errors.name && errors.phone && errors.consent);
});
