/**
 * Visuels des associations partenaires embarqués dans l'application.
 * La clé correspond au champ `mediaKey` renvoyé par l'API. À terme, les associations
 * téléverseront elles-mêmes leur logo et leur bannière.
 */
export const ASSOCIATION_MEDIA: Record<
  string,
  { logo: number; banner: number; bannerAlt: string }
> = {
  remu: {
    logo: require('@/assets/associations/remu-logo.jpg'),
    banner: require('@/assets/associations/remu-banner.jpg'),
    bannerAlt: "Membres de l'association ReMU réunis avec l'équipe HURDEN",
  },
};
