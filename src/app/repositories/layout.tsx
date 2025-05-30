import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Repositorios Analizados - GitHub Analyzer',
  description: 'Explora todos los repositorios de GitHub que hemos analizado con IA para encontrar alternativas y obtener insights.',
  openGraph: {
    title: 'Repositorios Analizados - GitHub Analyzer',
    description: 'Explora todos los repositorios de GitHub que hemos analizado con IA para encontrar alternativas y obtener insights.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repositorios Analizados - GitHub Analyzer',
    description: 'Explora todos los repositorios de GitHub que hemos analizado con IA para encontrar alternativas y obtener insights.',
  },
};

export default function RepositoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
