const photoPath = (folder, number) => `/assets/images/projects/${folder}/${String(number).padStart(2, '0')}.webp`;

export const projects = [
  {
    id: 'locker-room',
    title: 'Раздевалка спортивной команды',
    text: 'Работы выполнены под ключ.',
    cover: photoPath('locker-room', 2),
    photos: [2, 1, 3, 4, 5, 6, 7].map(number => ({
      src: photoPath('locker-room', number),
      thumb: photoPath('locker-room', number).replace('.webp', '-thumb.webp'),
      alt: number <= 2 ? 'Раздевалка спортивной команды: шкафчики, скамьи и освещение' : number <= 5 ? 'Душевая зона раздевалки спортивной команды' : 'Санузел раздевалки спортивной команды',
      number
    }))
  },
  {
    id: 'residence-engineering',
    title: 'Монтаж инженерных систем в частной резиденции',
    text: '',
    cover: photoPath('residence-engineering', 29),
    photos: [29, 4, 3, 30, 26, 27, 34, 28, 25, ...Array.from({ length: 34 }, (_, i) => i + 1).filter(i => ![29, 4, 3, 30, 26, 27, 34, 28, 25].includes(i))].map(number => ({
      src: photoPath('residence-engineering', number),
      thumb: photoPath('residence-engineering', number).replace('.webp', '-thumb.webp'),
      alt: number <= 4 || number >= 25 ? 'Инженерные системы частной резиденции: оборудование и трубопроводы' : 'Монтаж инженерных систем частной резиденции: тёплый пол и разводка труб',
      number
    }))
  }
];
