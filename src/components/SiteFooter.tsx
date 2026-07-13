import { Phone, MapPin, MessageCircle } from 'lucide-react';
import { useSiteSettings } from '../lib/useSettings';

export default function SiteFooter() {
  const { settings, texts } = useSiteSettings();

  return (
    <footer className="bg-stone-900 text-stone-300 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-black text-lg mb-2">{settings.storeName}</h3>
            <p className="text-sm text-stone-400 leading-relaxed">{settings.footerText || settings.storeDescription}</p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">{texts.footerContact}</h4>
            <div className="space-y-2 text-sm">
              {settings.storePhone && (
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-amber-500" />{settings.storePhone}</p>
              )}
              {settings.storeAddress && (
                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-500" />{settings.storeAddress}</p>
              )}
              {settings.lineUrl && (
                <a href={settings.lineUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold">
                  <MessageCircle className="w-4 h-4" /> LINE：{settings.lineId || '聯絡我們'}
                </a>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">{texts.footerBusiness}</h4>
            <p className="text-sm text-stone-400">{texts.footerBusinessDesc1}</p>
            <p className="text-sm text-stone-400 mt-1">{texts.footerBusinessDesc2}</p>
          </div>
        </div>
        <div className="border-t border-stone-800 mt-8 pt-6 text-center text-xs text-stone-500">
          © {new Date().getFullYear()} {settings.storeName} · 版權所有
        </div>
      </div>
    </footer>
  );
}
