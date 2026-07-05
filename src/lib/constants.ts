export const COUNTRIES = [
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴' },
  { code: 'MZ', name: 'Moçambique', flag: '🇲🇿' },
  { code: 'GW', name: 'Guiné-Bissau', flag: '🇬🇼' },
  { code: 'ST', name: 'São Tomé e Príncipe', flag: '🇸🇹' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'FR', name: 'França', flag: '🇫🇷' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
];

export const LANGUAGES = [
  { code: 'pt', name: 'Português' },
  { code: 'kea', name: 'Crioulo (Kabuverdianu)' },
  { code: 'en', name: 'Inglês' },
  { code: 'fr', name: 'Francês' },
  { code: 'es', name: 'Espanhol' },
];

export const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '👏', '😮', '🎉', '🙏'];

export function countryFlag(code: string | null | undefined): string {
  if (!code) return '🌍';
  return COUNTRIES.find((c) => c.code === code)?.flag ?? '🌍';
}
