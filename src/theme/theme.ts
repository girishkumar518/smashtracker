export const tokens = {
  colors: {
    gray900: '#171923',
    gray800: '#2D3748',
    gray700: '#4A5568',
    gray500: '#718096',
    gray200: '#E2E8F0',
    gray100: '#EDF2F7',
    gray50: '#F7FAFC',
    
    teal900: '#134E4A',
    teal800: '#115E59',
    teal700: '#0F766E',
    teal600: '#0D9488',
    teal500: '#14B8A6',
    teal100: '#CCFBF1',
    
    white: '#FFFFFF',
    black: '#000000',
    
    red500: '#E53E3E',
    
    gold500: '#D69E2E',
  }
};

export const lightTheme = {
  type: 'light' as const,
  colors: {
    background: tokens.colors.gray50,
    surface: tokens.colors.white,
    surfaceHighlight: tokens.colors.gray100,
    
    textPrimary: tokens.colors.gray900,
    textSecondary: tokens.colors.gray500,
    textInverse: tokens.colors.white,
    
    primary: tokens.colors.teal600,
    primaryLight: tokens.colors.teal100,
    secondary: tokens.colors.gold500,
    
    border: tokens.colors.gray200,
    error: tokens.colors.red500,
    
    court: {
      background: tokens.colors.teal600,
      lines: tokens.colors.white,
    }
  }
};

export const darkTheme = {
  type: 'dark' as const,
  colors: {
    background: tokens.colors.gray900,
    surface: tokens.colors.gray800,
    surfaceHighlight: tokens.colors.gray700,
    
    textPrimary: tokens.colors.white,
    textSecondary: tokens.colors.gray500, // Adjusted for readability in dark mode? Maybe gray200/gray500. Let's make it gray400/500 equivalent.
    textInverse: tokens.colors.gray900,
    
    primary: tokens.colors.teal700,
    primaryLight: tokens.colors.teal900,
    secondary: tokens.colors.gold500,
    
    border: tokens.colors.gray700,
    error: tokens.colors.red500,
    
    court: {
      background: tokens.colors.teal700,
      lines: tokens.colors.gray500,
    }
  }
};

// Fix textSecondary for Dark Mode to be lighter
darkTheme.colors.textSecondary = tokens.colors.gray500; // Actually simpler to use a lighter gray for secondary text on dark bg.
darkTheme.colors.textSecondary = '#A0AEC0'; // Gray 400

export type Theme = typeof lightTheme;
