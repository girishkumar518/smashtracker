export const COMMON_CODES = [
  { code: '+1', country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
  { code: '+7', country: 'Russia', flag: '🇷🇺' },
  { code: '+39', country: 'Italy', flag: '🇮🇹' },
  { code: '+82', country: 'South Korea', flag: '🇰🇷' },
  { code: '+34', country: 'Spain', flag: '🇪🇸' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
];

export const parsePhoneNumber = (fullPhone: string | undefined | null) => {
    if (!fullPhone) return { code: '+1', number: '' };
    
    // Find the longest matching code
    const sortedCodes = [...COMMON_CODES].sort((a, b) => b.code.length - a.code.length);
    const match = sortedCodes.find(c => fullPhone.startsWith(c.code));
    
    if (match) {
        return { code: match.code, number: fullPhone.slice(match.code.length) };
    }
    
    // Fallback if no code matches (assume it is the full number or default to +1)
    if (fullPhone.startsWith('+')) {
       // It has some code we don't know, treat whole thing or try to guess?
       // Let's just return +1 and the full string if we fail, or keep custom code?
       // For this UI, preserving the code in the 'number' field might be weird if we force a dropdown.
       return { code: '+1', number: fullPhone.replace('+', '') };
    }

    return { code: '+1', number: fullPhone };
};
