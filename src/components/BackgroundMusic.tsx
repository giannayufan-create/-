import { useEffect, useRef, useState } from 'react';
import { Music, Volume2, VolumeX } from 'lucide-react';
import { useSiteSettings } from '../lib/useSettings';

export default function BackgroundMusic() {
  const { settings } = useSiteSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const url = settings.bgMusicUrl?.trim();
  const enabled = settings.bgMusicEnabled === true && !!url;
  const volume = Math.min(1, Math.max(0, (settings.bgMusicVolume ?? 40) / 100));

  useEffect(() => {
    if (!enabled || !url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url, enabled]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (playing) {
        audio.pause();
        setPlaying(false);
      } else {
        await audio.play();
        setPlaying(true);
      }
    } catch {
      /* 瀏覽器可能阻擋自動播放，需使用者點擊 */
    }
  };

  if (!enabled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-40 flex items-center gap-1">
      <button
        onClick={togglePlay}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          playing ? 'bg-amber-600 text-white' : 'bg-white text-stone-700 border border-stone-200'
        }`}
        title={playing ? '暫停音樂' : '播放音樂'}
      >
        <Music className="w-5 h-5" />
      </button>
      <button
        onClick={() => setMuted(!muted)}
        className="w-9 h-9 rounded-full bg-white border border-stone-200 shadow flex items-center justify-center text-stone-600"
        title={muted ? '開啟音量' : '靜音'}
      >
        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
    </div>
  );
}
