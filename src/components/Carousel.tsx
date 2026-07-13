import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselSlide } from '../types';

const GRADIENTS = [
  'from-amber-600 via-orange-600 to-red-700',
  'from-emerald-600 via-teal-600 to-cyan-700',
  'from-rose-600 via-pink-600 to-purple-700',
];

export default function Carousel({ slides, storeName }: { slides: CarouselSlide[]; storeName: string }) {
  const [idx, setIdx] = useState(0);
  const items = slides?.length ? slides : [{ image: '', title: storeName, subtitle: '精選美食，線上訂購' }];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);

  const slide = items[idx];

  return (
    <section className={`relative rounded-3xl overflow-hidden mb-8 bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]} text-white min-h-[200px] md:min-h-[280px]`}>
      {slide.image && <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
      <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center h-full min-h-[200px] md:min-h-[280px]">
        <p className="text-white/70 text-xs font-bold mb-2">🔥 線上訂購</p>
        <h1 className="text-3xl md:text-5xl font-black mb-2 drop-shadow">{slide.title || storeName}</h1>
        <p className="text-white/90 text-sm md:text-base max-w-lg">{slide.subtitle}</p>
      </div>
      {items.length > 1 && (
        <>
          <button onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 p-2 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setIdx((i) => (i + 1) % items.length)} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 p-2 rounded-full">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {items.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-white w-6' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
