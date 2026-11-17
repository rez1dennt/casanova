// Manual tabs: no timers, scroll changes or forced focus on pointer activation.
export function initApproach(root = document) {
  root.querySelectorAll('[data-approach]').forEach(section => {
    const tabs = [...section.querySelectorAll('[role="tab"]')];
    const panels = tabs.map(tab => section.querySelector(`#${tab.getAttribute('aria-controls')}`));
    const stage = section.querySelector('.approach-stage');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let selected = 0;
    let request = 0;
    let animations = [];
    const preload = index => {
      const photo = panels[index].querySelector('.approach-photo');
      photo.loading = 'eager';
      return photo.decode().catch(() => {});
    };
    const show = async (index, focus = false) => {
      const currentRequest = ++request;
      if (focus) tabs[index].focus({ preventScroll: true });
      if (index === selected) { stage.removeAttribute('aria-busy'); return; }
      stage.setAttribute('aria-busy', 'true');
      // Keep the current scene visible while a photo is still downloading.
      await preload(index);
      if (currentRequest !== request) return;
      stage.removeAttribute('aria-busy');
      animations.forEach(animation => animation.cancel());
      animations = [];
      const previous = panels[selected];
      const next = panels[index];
      panels.forEach((panel, i) => {
        panel.hidden = i !== index && panel !== previous;
        panel.inert = i !== index;
        panel.setAttribute('aria-hidden', String(i !== index));
        panel.style.zIndex = i === index ? '2' : '1';
      });
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
      });
      selected = index;
      next.hidden = false;
      const complete = () => { if (selected === index) panels.forEach((panel, i) => { panel.hidden = i !== index; }); };
      if (reducedMotion.matches || typeof next.animate !== 'function') { complete(); return; }
      const styles = getComputedStyle(section);
      const duration = parseFloat(styles.getPropertyValue('--transition-slow')) || 650;
      const easing = styles.getPropertyValue('--ease').trim() || 'ease-out';
      const fade = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing });
      animations.push(fade, next.querySelector('.approach-photo').animate(
        [{ transform: 'scale(1.055)' }, { transform: 'scale(1)' }], { duration, easing }
      ));
      fade.finished.then(complete).catch(() => {});
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => show(index));
      tab.addEventListener('pointerenter', () => preload(index), { once: true });
      tab.addEventListener('focus', () => preload(index), { once: true });
      tab.addEventListener('keydown', event => {
        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
          ['ArrowDown', 'ArrowRight'].includes(event.key) ? (index + 1) % tabs.length :
          ['ArrowUp', 'ArrowLeft'].includes(event.key) ? (index - 1 + tabs.length) % tabs.length : null;
        if (nextIndex === null) return;
        event.preventDefault();
        show(nextIndex, true);
      });
    });
  });
}
