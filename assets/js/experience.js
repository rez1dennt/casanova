const COOKIE_KEY = 'cn-cookie-choice:v1';
const COOKIE_TTL = 365 * 24 * 60 * 60 * 1000;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export function readCookieChoice(storage, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(COOKIE_KEY) || 'null');
    return value?.version === 1 && value.mode === 'essential' && value.expiresAt > now ? value : null;
  } catch { return null; }
}

export async function initExperience() {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  let introRun = 0;
  const finishIntro = () => {
    root.classList.remove('intro-pending', 'intro-leaving');
    root.classList.add('intro-ready');
    clearTimeout(window.__cnIntroFailsafe);
  };
  const runIntro = async (restart = false) => {
    const run = ++introRun;
    if (location.pathname !== '/' || matchMedia('(prefers-reduced-motion: reduce)').matches) { finishIntro(); return; }
    if (restart) {
      clearTimeout(window.__cnIntroFailsafe);
      root.classList.remove('intro-ready', 'intro-leaving');
      root.classList.add('intro-pending');
      window.__cnIntroStarted = performance.now();
      window.__cnIntroFailsafe = setTimeout(finishIntro, 1200);
    }
    if (!root.classList.contains('intro-pending')) { root.classList.add('intro-ready'); return; }
    let skipped = false;
    const skip = event => { if (event.key === 'Escape') { skipped = true; finishIntro(); } };
    addEventListener('keydown', skip);
    try {
      const style = getComputedStyle(root);
      const hold = parseFloat(style.getPropertyValue('--intro-hold')) || 180;
      const wait = parseFloat(style.getPropertyValue('--intro-wait')) || 400;
      const exit = parseFloat(style.getPropertyValue('--intro-exit')) || 240;
      const hero = document.querySelector('img[fetchpriority=high]');
      const readiness = Promise.all([document.fonts.ready, hero?.decode().catch(() => {})]);
      await Promise.race([readiness, pause(wait)]);
      const elapsed = performance.now() - (window.__cnIntroStarted || 0);
      if (!skipped) await pause(Math.max(0, hold - elapsed));
      if (run !== introRun || skipped || !root.classList.contains('intro-pending')) return;
      root.classList.add('intro-leaving', 'intro-ready');
      await pause(exit);
      if (run === introRun) finishIntro();
    } finally {
      removeEventListener('keydown', skip);
    }
  };
  // A page restored from the back/forward cache does not rerun the head script.
  addEventListener('pageshow', event => { if (event.persisted) runIntro(true); });
  await runIntro();

  const banner = document.querySelector('.cookie-banner');
  if (banner) {
    let closing = false;
    let returnTo = null;
    const show = origin => {
      closing = false;
      returnTo = origin || null;
      banner.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('is-visible')));
    };
    const hide = async () => {
      if (closing) return;
      closing = true;
      try { localStorage.setItem(COOKIE_KEY, JSON.stringify({ version: 1, mode: 'essential', expiresAt: Date.now() + COOKIE_TTL })); } catch {}
      banner.classList.remove('is-visible');
      await pause(reduce ? 0 : 250);
      if (closing) {
        banner.hidden = true;
        returnTo?.focus({ preventScroll: true });
        returnTo = null;
      }
    };
    document.querySelectorAll('[data-cookie-open]').forEach(button => button.addEventListener('click', () => { show(button); banner.querySelector('[data-cookie-accept]').focus({ preventScroll: true }); }));
    banner.querySelector('[data-cookie-accept]').addEventListener('click', hide);
    banner.querySelector('[data-cookie-close]').addEventListener('click', hide);
    let saved = null;
    try { saved = readCookieChoice(localStorage); } catch {}
    if (!saved) show();
  }

  if (!reduce && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.animate([{ opacity: .4, transform: 'translateY(16px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
      observer.unobserve(entry.target);
    }), { threshold: .12 });
    document.querySelectorAll('.section-heading,.service-row,.project-story-heading,.resource-grid,.company-section').forEach(element => {
      if (element.getBoundingClientRect().top > innerHeight * .9) observer.observe(element);
    });
  }
}
