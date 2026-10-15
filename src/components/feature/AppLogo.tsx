import { useTheme } from '@/hooks/useTheme';

interface AppLogoProps {
  showText?: boolean;
  direction?: 'row' | 'col';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const logoMap: Record<string, string> = {
  light: 'https://storage.helloreaddy.io/project_files/437d9be5-f316-4ce4-bdea-9d5839ae0518/5520f4d9-f8b9-4e54-9dec-a285b2e89404_compressed_logo-en-negro.webp',
  dark: 'https://storage.helloreaddy.io/project_files/437d9be5-f316-4ce4-bdea-9d5839ae0518/0d944fec-4296-4ee5-9ad5-4b7f684c4adc_compressed_logo-en-blanco.webp',
};

const sizeMap = {
  sm: { logo: 'w-8 h-8', text: 'text-sm' },
  md: { logo: 'w-10 h-10', text: 'text-base' },
  lg: { logo: 'w-12 h-12', text: 'text-lg' },
  xl: { logo: 'w-14 h-14', text: 'text-xl' },
};

export default function AppLogo({ showText = true, direction = 'col', size = 'md', className = '' }: AppLogoProps) {
  const { resolvedTheme } = useTheme();
  const logoUrl = logoMap[resolvedTheme] || logoMap.dark;
  const { logo: logoSize, text: textSize } = sizeMap[size];

  if (!showText) {
    return (
      <img
        src={logoUrl}
        alt="OLO Site Logo"
        className={`${logoSize} object-contain shrink-0 ${className}`}
      />
    );
  }

  if (direction === 'row') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <img src={logoUrl} alt="OLO Site Logo" className={`${logoSize} object-contain shrink-0`} />
        <div className="whitespace-nowrap">
          <span className={`text-primary-500 font-bold ${textSize} tracking-tight`}>OLO</span>{' '}
          <span className={`text-foreground-100 font-bold ${textSize} tracking-tight`}>Site</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img src={logoUrl} alt="OLO Site Logo" className={`${logoSize} object-contain`} />
      <div className="whitespace-nowrap mt-1">
        <span className={`text-primary-500 font-bold ${textSize} tracking-tight`}>OLO</span>{' '}
        <span className={`text-foreground-100 font-bold ${textSize} tracking-tight`}>Site</span>
      </div>
    </div>
  );
}