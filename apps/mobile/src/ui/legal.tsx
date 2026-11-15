import { Heading, Notice, P, Screen, Title } from './index';

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

/** Mise en page commune des textes légaux. */
export function LegalPage({
  title,
  updatedAt,
  sections,
}: {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
}) {
  return (
    <Screen>
      <Title>{title}</Title>
      <P>Version du {updatedAt}</P>
      <Notice
        tone="info"
        text="Projet de texte rédigé pour la phase de développement. Il doit être relu et validé par un juriste avant toute mise en ligne publique."
      />
      {sections.map((section) => (
        <LegalBlock key={section.title} section={section} />
      ))}
    </Screen>
  );
}

function LegalBlock({ section }: { section: LegalSection }) {
  return (
    <>
      <Heading>{section.title}</Heading>
      {section.paragraphs.map((paragraph) => (
        <P key={paragraph}>{paragraph}</P>
      ))}
    </>
  );
}
