import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2, User, Check } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';

const PRESET_AVATARS = [
  { id: 'a1', emoji: '👨‍💻', bg: '#3B82F6', animation: 'animate-bounce' },
  { id: 'a2', emoji: '👩‍💻', bg: '#8B5CF6', animation: 'animate-pulse' },
  { id: 'a3', emoji: '🧑‍🚀', bg: '#0EA5E9', animation: 'animate-spin-slow' },
  { id: 'a4', emoji: '👨‍🎨', bg: '#F59E0B', animation: 'animate-wiggle' },
  { id: 'a5', emoji: '👩‍🔬', bg: '#10B981', animation: 'animate-float' },
  { id: 'a6', emoji: '🧑‍💼', bg: '#6366F1', animation: 'animate-bounce' },
  { id: 'a7', emoji: '👨‍🏫', bg: '#EC4899', animation: 'animate-pulse' },
  { id: 'a8', emoji: '👩‍⚕️', bg: '#14B8A6', animation: 'animate-wiggle' },
  { id: 'a9', emoji: '🦊', bg: '#F97316', animation: 'animate-float' },
  { id: 'a10', emoji: '🐺', bg: '#64748B', animation: 'animate-spin-slow' },
  { id: 'a11', emoji: '🦁', bg: '#D97706', animation: 'animate-wiggle' },
  { id: 'a12', emoji: '🐧', bg: '#1E293B', animation: 'animate-bounce' },
  { id: 'a13', emoji: '🦅', bg: '#7C3AED', animation: 'animate-float' },
  { id: 'a14', emoji: '🐉', bg: '#DC2626', animation: 'animate-pulse' },
  { id: 'a15', emoji: '🦄', bg: '#A855F7', animation: 'animate-wiggle' },
];

export const getPresetAvatarData = (url: string | null) => {
  if (!url?.startsWith('preset:')) return null;
  const id = url.replace('preset:', '');
  return PRESET_AVATARS.find(p => p.id === id) || null;
};

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  fullName: string | null;
  onAvatarUpdate: (url: string) => void;
}

export const AvatarUpload = ({ userId, currentAvatarUrl, fullName, onAvatarUpdate }: AvatarUploadProps) => {
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const txt = {
    en: { uploadPhoto: 'Upload Photo', changePhoto: 'Change Photo', uploading: 'Uploading...', orChoose: 'Or choose an avatar', presets: 'Choose Avatar', hidePresets: 'Hide Avatars' },
    tr: { uploadPhoto: 'Fotoğraf Yükle', changePhoto: 'Fotoğrafı Değiştir', uploading: 'Yükleniyor...', orChoose: 'Veya bir avatar seç', presets: 'Avatar Seç', hidePresets: 'Avatarları Gizle' },
  };
  const t = txt[language] || txt.en;

  const getInitials = (name: string | null) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const presetData = getPresetAvatarData(currentAvatarUrl);

  const handlePresetSelect = async (preset: typeof PRESET_AVATARS[0]) => {
    const presetUrl = `preset:${preset.id}`;
    try {
      const { error } = await supabase.from('profiles').update({ avatar_url: presetUrl }).eq('user_id', userId);
      if (error) throw error;
      onAvatarUpdate(presetUrl);
      toast.success(language === 'tr' ? 'Avatar güncellendi!' : 'Avatar updated!');
    } catch (error) {
      console.error('Avatar update error:', error);
      toast.error(language === 'tr' ? 'Avatar güncellenemedi' : 'Failed to update avatar');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be smaller than 2MB'); return; }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: urlWithCacheBust }).eq('user_id', userId);
      if (updateError) throw updateError;
      onAvatarUpdate(urlWithCacheBust);
      toast.success(language === 'tr' ? 'Profil fotoğrafı güncellendi!' : 'Profile photo updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current Avatar */}
      <div className="relative group">
        {presetData ? (
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl border-4 border-primary/20 ${presetData.animation}`}
            style={{ backgroundColor: presetData.bg }}
          >
            {presetData.emoji}
          </div>
        ) : (
          <Avatar className="w-24 h-24 border-4 border-primary/20">
            <AvatarImage src={currentAvatarUrl || undefined} alt={fullName || 'Profile'} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {getInitials(fullName) || <User className="w-8 h-8" />}
            </AvatarFallback>
          </Avatar>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t.uploading}</>) : (<><Camera className="w-4 h-4 mr-2" />{currentAvatarUrl ? t.changePhoto : t.uploadPhoto}</>)}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowPresets(!showPresets)}>
          {showPresets ? t.hidePresets : t.presets}
        </Button>
      </div>

      {/* Animated Preset Avatar Grid */}
      {showPresets && (
        <div className="w-full max-w-md animate-fade-in">
          <p className="text-xs text-muted-foreground text-center mb-3">{t.orChoose}</p>
          <div className="grid grid-cols-5 gap-3">
            {PRESET_AVATARS.map((preset) => {
              const isSelected = currentAvatarUrl === `preset:${preset.id}`;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-125 ${preset.animation} ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                  }`}
                  style={{ backgroundColor: preset.bg }}
                >
                  {preset.emoji}
                  {isSelected && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
