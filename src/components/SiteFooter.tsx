import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../lib/useSettings';

export default function SiteFooter() {
  const { settings, texts } = useSiteSettings();

  return (
    <footer className="mt-auto bg-[linear-gradient(180deg,#2a211c_0%,#1c1410_100%)] text-[#d9c8b6]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-display text-white text-xl font-bold mb-3 tracking-wide">{settings.storeName}</h3>
            <p className="text-sm text-[#b8a48f] leading-relaxed">{settings.footerText || settings.storeDescription}</p>
          </div>
          <div>
            <h4 className="font-display text-[#f0d2b0] text-sm font-bold mb-4 tracking-wider">{texts.footerContact}</h4>
            <div className="space-y-3 text-sm">
              {settings.storePhone && (
                <p className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-[var(--color-ember)]" />{settings.storePhone}</p>
              )}
              {settings.storeAddress && (
                <p className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-[var(--color-ember)]" />{settings.storeAddress}</p>
              )}
              {settings.lineUrl && (
                <a href={settings.lineUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[#e8c49a] hover:text-white font-medium transition-colors">
                  <MessageCircle className="w-4 h-4" /> LINE：{settings.lineId || '聯絡我們'}
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-display text-[#f0d2b0] text-sm font-bold mb-4 tracking-wider">{texts.footerBusiness}</h4>
            <p className="text-sm text-[#b8a48f] leading-relaxed">{texts.footerBusinessDesc1}</p>
            <p className="text-sm text-[#b8a48f] mt-2">{texts.footerBusinessDesc2}</p>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-[#8a7766] tracking-wide">
          © {new Date().getFullYear()} {settings.storeName} · 用心熬煮每一份溫度
        </div>
      </div>
    </footer>
  );
}
