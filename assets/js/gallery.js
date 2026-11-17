export function initGalleries() {
  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const stage = gallery.querySelector('.gallery-stage');
    const image = gallery.querySelector('.gallery-main');
    const counter = gallery.querySelector('.gallery-counter');
    const thumbs = [...gallery.querySelectorAll('.gallery-thumb')];
    let current = 0;
    let pointerStart = null;

    function select(index) {
      current = (index + thumbs.length) % thumbs.length;
      const selected = thumbs[current];
      image.src = selected.dataset.src;
      image.alt = selected.dataset.alt;
      counter.textContent = `${current + 1} / ${thumbs.length}`;
      thumbs.forEach((thumb, i) => thumb.setAttribute('aria-pressed', String(i === current)));
      const strip = gallery.querySelector('.gallery-thumbs');
      const left = selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.clientWidth) / 2;
      strip.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
    thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => select(index)));
    gallery.querySelector('.gallery-prev').addEventListener('click', () => select(current - 1));
    gallery.querySelector('.gallery-next').addEventListener('click', () => select(current + 1));
    stage.addEventListener('keydown', event => {
      const positions = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: thumbs.length - 1 };
      if (!(event.key in positions)) return;
      event.preventDefault();
      select(positions[event.key]);
    });
    stage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') pointerStart = { x: event.clientX, y: event.clientY };
    });
    stage.addEventListener('pointerup', event => {
      if (!pointerStart) return;
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', () => { pointerStart = null; });
  });
}
