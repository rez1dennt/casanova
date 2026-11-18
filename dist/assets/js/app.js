import config from './config.js';
import { normalizePhone, formatPhone, editPhone, validateContact } from './form-utils.js';
import { initGalleries } from './gallery.js';
import { initExperience } from './experience.js';
import { initApproach } from './approach.js';

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileMenu = $('#mobile-menu');
const menuToggle = $('.menu-toggle');
let savedScroll = 0;
let closing = null;
let menuFrame = 0;

function openMenu() {
  if (mobileMenu.open || closing) return;
  savedScroll = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedScroll}px`, left: '0', right: '0' });
  mobileMenu.showModal();
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Закрыть меню');
  $('.site-header').classList.add('menu-active');
  // Flush the closed frame before starting the opening transition.
  getComputedStyle(mobileMenu).opacity;
  menuFrame = requestAnimationFrame(() => mobileMenu.classList.add('is-open'));
}
function closeMenu() {
  if (closing) return closing;
  if (!mobileMenu.open) return Promise.resolve();
  cancelAnimationFrame(menuFrame);
  mobileMenu.classList.add('is-closing');
  mobileMenu.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
  // Await the actual transitions; there is no extra timer blocking the page.
  const animations = reducedMotion.matches ? [] : mobileMenu.getAnimations();
  closing = Promise.all(animations.map(animation => animation.finished.catch(() => {}))).then(() => {
    mobileMenu.close();
    mobileMenu.classList.remove('is-closing');
    for (const property of ['position', 'top', 'left', 'right']) document.body.style[property] = '';
    window.scrollTo({ top: savedScroll, behavior: 'instant' });
    $('.site-header').classList.remove('menu-active');
    menuToggle.focus({ preventScroll: true });
    closing = null;
  });
  return closing;
}
const menuHeader = document.createElement('div');
menuHeader.className = 'menu-dialog-header';
menuHeader.innerHTML = `${$('.logo').outerHTML}<button class="menu-toggle menu-close" aria-label="Закрыть меню" aria-expanded="true"><span></span><span></span><span></span></button>`;
mobileMenu.prepend(menuHeader);
$('.menu-close', mobileMenu).addEventListener('click', closeMenu);
menuToggle.addEventListener('click', openMenu);
mobileMenu.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
mobileMenu.addEventListener('click', async event => {
  const link = event.target.closest('a');
  if (!link) return;
  if (link.target === '_blank' || link.protocol === 'tel:') { closeMenu(); return; }
  event.preventDefault();
  await closeMenu();
  window.location.assign(link.href);
});
matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
initGalleries();
initExperience();
initApproach();

function initContactForm() {

const form = $('.contact-form');
if (!form) return;
const phone = $('[name=phone]', form);
function performPhoneEdit(inputType, data = '') {
  const result = editPhone(phone.value, phone.selectionStart ?? 0, phone.selectionEnd ?? 0, inputType, data);
  phone.value = result.value;
  phone.setSelectionRange(result.caret, result.caret);
  phone.dispatchEvent(new Event('input', { bubbles: true }));
}
phone.addEventListener('beforeinput', event => {
  if (!event.cancelable || event.isComposing) return;
  if (event.inputType.startsWith('delete') || event.inputType === 'insertText' || event.inputType === 'insertReplacementText') {
    event.preventDefault();
    performPhoneEdit(event.inputType, event.data || '');
  }
});
phone.addEventListener('paste', event => {
  event.preventDefault();
  performPhoneEdit('insertFromPaste', event.clipboardData.getData('text'));
});
phone.addEventListener('input', () => {
  if (phone.value === '+7 (') return;
  const formatted = formatPhone(normalizePhone(phone.value));
  if (phone.value !== formatted) phone.value = formatted;
});
phone.addEventListener('blur', () => { if (!normalizePhone(phone.value)) phone.value = ''; });
form.addEventListener('input', event => {
  const name = event.target.name;
  if (!name) return;
  event.target.removeAttribute('aria-invalid');
  const error = $(`#${name}-error`, form);
  if (error) error.textContent = '';
  $('.form-status', form).textContent = '';
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = { name: form.elements.name.value.trim(), phone: phone.value, consent: form.elements.consent.checked };
  const errors = validateContact(values);
  for (const name of ['name', 'phone', 'consent']) {
    $(`#${name}-error`, form).textContent = errors[name] || '';
    form.elements[name].setAttribute('aria-invalid', String(Boolean(errors[name])));
  }
  if (Object.keys(errors).length) { form.elements[Object.keys(errors)[0]].focus(); return; }
  const status = $('.form-status', form);
  if (!config.formEndpoint) {
    status.textContent = 'Форма временно недоступна. Свяжитесь с нами в мессенджере или по телефону.';
    return;
  }
  const submit = $('.submit-button', form);
  const initialSubmitMarkup = submit.innerHTML;
  submit.disabled = true;
  submit.setAttribute('aria-busy', 'true');
  submit.textContent = 'Отправляем…';
  try {
    const response = await fetch(config.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.name, phone: '+7' + normalizePhone(values.phone), consent: values.consent }), signal: AbortSignal.timeout(15000) });
    if (!response.ok || (await response.json()).success !== true) throw new Error('Заявка не подтверждена сервером');
    status.textContent = 'Заявка отправлена. Мы свяжемся с вами для обсуждения объекта.';
    form.reset();
  } catch { status.textContent = `Не удалось отправить заявку. Позвоните ${config.phoneDisplay} или напишите в мессенджер.`; }
  finally { submit.disabled = false; submit.removeAttribute('aria-busy'); submit.innerHTML = initialSubmitMarkup; }
});


}
initContactForm();
