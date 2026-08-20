import { useTheme } from '@/hooks/useTheme';
import { findAppLogo } from '@/mocks/appLogos';

interface AppLogoImageProps {
  appName?: string;
  appCode?: string;
  sizeClass?: string;
  roundedClass?: string;
  icon?: string;
  color?: string;
  textSizeClass?: string;
  className?: string;
}

const fallbackColorMap: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  cyan: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  violet: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  indigo: { bg: 'bg-primary-500/10', text: 'text-primary-400', border: 'border-primary-500/20' },
  slate: { bg: 'bg-secondary-500/10', text: 'text-secondary-400', border: 'border-secondary-500/20' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export default function AppLogoImage({
  appName,
  appCode,
  sizeClass = 'w-9 h-9',
  roundedClass = 'rounded-lg',
  icon = 'ri-apps-line',
  color = 'emerald',
  textSizeClass = 'text-base',
  className = '',
}: AppLogoImageProps) {
  const { resolvedTheme } = useTheme();
  const logo = findAppLogo(appName, appCode);

  if (!logo) {
    const colors = fallbackColorMap[color] || fallbackColorMap.emerald;
    return (
      <div className={`${sizeClass} ${roundedClass} ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0 ${className}`}>
        <i className={`${icon} ${colors.text} ${textSizeClass}`}></i>
      </div>
    );
  }

  return (
    <div className={`${sizeClass} ${roundedClass} overflow-hidden flex items-center justify-center bg-background-100 border border-secondary-500/20 shrink-0 ${className} transition-all duration-300`}>
      <div className="relative w-full h-full">
        <img
          src={logo.light}
          alt={appName || 'App'}
          className={`absolute inset-0 w-full h-full object-contain p-0.5 transition-opacity duration-300 ${resolvedTheme === 'dark' ? 'opacity-0' : 'opacity-100'}`}
        />
        <img
          src={logo.dark}
          alt={appName || 'App'}
          className={`absolute inset-0 w-full h-full object-contain p-0.5 transition-opacity duration-300 ${resolvedTheme === 'dark' ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}