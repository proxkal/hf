/** Charte graphique HURDEN : noir, blanc, gris clair, bleu ; Arsenal + Playfair. */
export const colors = {
  black: '#000000',
  white: '#ffffff',
  grey: '#e9e8e8',
  blue: '#000aff',
  muted: '#5c5c5c',
  border: '#d6d5d5',
  danger: '#b00020',
  success: '#0a7a3b',
} as const;

export const fonts = {
  body: 'Arsenal_400Regular',
  bodyBold: 'Arsenal_700Bold',
  title: 'PlayfairDisplay_700Bold',
  titleItalic: 'PlayfairDisplay_400Regular_Italic',
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
export const radius = { sm: 8, md: 14, pill: 999 } as const;
export const maxWidth = 720;
