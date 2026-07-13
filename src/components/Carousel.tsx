import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CarouselSlide } from '../types';

export default function Carousel({ slides, storeName }: { slides: CarouselSlide[]; storeName: string }) {
  const [idx, setIdx] = useState(0);
  const items = slides?.length
    ? slides
    : [{ image: '', title: '', subtitle: '' }];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);

  const slide = items[idx];
  const hasImage = Boolean(slide.image);
  const title = slide.title?.trim() || '';
  const subtitle = slide.subtitle?.trim() || '';
  const showText = Boolean(title || subtitle);
  // 無圖且無文字時，才用店名當後備，避免空白輪播
  const fallbackTitle = !hasImage && !showText ? storeName : '';

  return (
    <section className="relative -mx-4 md:mx-0 mb-10 overflow-hidden md:rounded-3xl min-h-[52vh] md:min-h-[360px] text-white">
      {!hasImage && (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#1c1410_0%,#3a2418_42%,#8f4e28_78%,#b56a3a_100%)]" />
      )}
      {hasImage && (
        <img
          src={slide.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(1.12) contrast(1.04)' }}
        />
      )}
      {/* 有文字才加淡陰影，純照片不加遮罩 */}
      {hasImage && (showText || fallbackTitle) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent md:from-black/30 md:via-transparent md:to-transparent pointer-events-none" />
      )}

      {(showText || fallbackTitle) && (
        <div className="relative z-10 px-6 py-12 md:px-14 md:py-16 flex flex-col justify-end md:justify-center min-h-[52vh] md:min-h-[360px]">
          {(title || fallbackTitle) && (
            <h1
              className="font-display text-4xl md:text-5xl font-bold leading-tight mb-3 max-w-xl fade-up"
              style={{ textShadow: '0 3px 18px rgba(0,0,0,0.55)' }}
            >
              {title || fallbackTitle}
            </h1>
          )}
          {subtitle && (
            <p
              className="text-white text-sm md:text-base max-w-md leading-relaxed fade-up-delay"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* 純圖片時撐高度 */}
      {hasImage && !showText && !fallbackTitle && (
        <div className="min-h-[52vh] md:min-h-[360px]" aria-hidden />
      )}

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 p-2.5 rounded-xl backdrop-blur-sm transition-colors"
            aria-label="上一張"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % items.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 p-2.5 rounded-xl backdrop-blur-sm transition-colors"
            aria-label="下一張"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-sm transition-all ${i === idx ? 'bg-white w-7' : 'bg-white/50 w-2.5'}`}
                aria-label={`第 ${i + 1} 頁`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
