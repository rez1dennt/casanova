const stages = [
  {
    title: 'Задача и пространство', label: 'Понимаем задачу', image: 'materials',
    heading: 'Сначала — понять главное.',
    text: 'Назначение пространства, пожелания к отделке и особенности объекта. С этого начинается работа над будущим результатом.',
    tags: ['Задача', 'Объект', 'Материалы'],
    alt: 'Архитектурная иллюстрация: образцы бетона, камня и дерева'
  },
  {
    title: 'Подготовка и основа', label: 'Закладываем основу', image: 'construction',
    heading: 'Качество начинается с основы.',
    text: 'Подготовка объекта, организация работ и устройство оснований. То, что останется за чистовой отделкой, заслуживает такого же внимания.',
    tags: ['Подготовка', 'Организация', 'Основание'],
    alt: 'Архитектурная иллюстрация: подготовка бетонного пола в просторном помещении'
  },
  {
    title: 'Работа в каждом слое', label: 'Работаем с деталями', image: 'plaster',
    heading: 'Точность, слой за слоем.',
    text: 'Стяжка, штукатурка, гидроизоляция и малярные работы. Каждый следующий этап опирается на качество предыдущего.',
    tags: ['Стяжка', 'Штукатурка', 'Гидроизоляция'],
    alt: 'Иллюстрация отделочных работ: мастер выравнивает стену шпателем'
  },
  {
    title: 'Готовое пространство', label: 'Собираем результат', image: 'office',
    heading: 'Детали становятся целым.',
    text: 'Фактуры, свет и чистовая отделка складываются в пространство для работы и бизнеса. От основания до последнего штриха.',
    tags: ['Чистовая отделка', 'Фактуры', 'Детали'],
    alt: 'Архитектурная иллюстрация: готовый офис со стеклянными перегородками'
  }
];

export function approachSection(arrow) {
  return `<section class="approach-section" id="approach" data-approach aria-labelledby="approach-title">
    <div class="approach-heading"><div><span class="eyebrow">Как мы работаем</span><h2 id="approach-title">От первого разговора<br> <em>до готового пространства.</em></h2></div><p>Один проект.<br>Четыре этапа.<br><span>Внимание к каждой детали.</span></p></div>
    <div class="approach-workbench">
      <div class="approach-navigation"><span class="approach-overline">Путь к результату</span><div class="approach-tabs" role="tablist" aria-label="Этапы работы" aria-orientation="vertical">${stages.map((stage, i) => `<button class="approach-tab" id="approach-tab-${i}" type="button" role="tab" aria-controls="approach-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="approach-tab-number">0${i + 1}</span><span class="approach-tab-name">${stage.title}</span><span class="approach-tab-arrow" aria-hidden="true">${arrow}</span></button>`).join('')}</div><a class="approach-contact" href="#contact"><span>Начнём с вашего объекта</span>${arrow}</a></div>
      <div class="approach-stage">${stages.map((stage, i) => `<article class="approach-panel" id="approach-panel-${i}" role="tabpanel" aria-labelledby="approach-tab-${i}" tabindex="0" ${i === 0 ? '' : 'hidden'}><img class="approach-photo" src="/assets/images/${stage.image}.webp" alt="${stage.alt}" width="1536" height="1024" loading="lazy" decoding="async"><div class="approach-image-top" aria-hidden="true"><span>${stage.label}</span><span>0${i + 1}<i> / 04</i></span></div><div class="approach-caption"><div class="approach-tags">${stage.tags.map(tag => `<span>${tag}</span>`).join('')}</div><h3>${stage.heading}</h3><p>${stage.text}</p></div></article>`).join('')}</div>
    </div><p class="approach-footnote"><span>Casa Nova · От основания до чистовой отделки</span><span>Иллюстрации этапов</span></p>
    <noscript><div class="approach-fallback">${stages.slice(1).map(stage => `<article><h3>${stage.title}</h3><p>${stage.text}</p></article>`).join('')}</div></noscript>
  </section>`;
}
