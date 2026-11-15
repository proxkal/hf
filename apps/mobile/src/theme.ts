/**
 * Charte graphique HURDEN : noir, blanc, gris clair, bleu.
 * Typographie d'interface : Inter, grotesque géométrique dans l'esprit d'Uber Move
 * (titres serrés et gras, libellés en capitales espacées). Playfair Display italique
 * reste réservée aux accroches de marque (« Agir pour Réussir ! »).
 */
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
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  title: 'Inter_800ExtraBold',
  brandItalic: 'PlayfairDisplay_400Regular_Italic',
} as const;

/** Échelle typographique : titres serrés (lettrage négatif), petits libellés espacés. */
export const typeScale = {
  display: { fontFamily: fonts.title, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const maxWidth = 720;
