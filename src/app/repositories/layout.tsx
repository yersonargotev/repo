import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyzed Repositories - GitHub Analyzer',
  description:
    'Explore all GitHub repositories we have analyzed with AI to find alternatives and gain insights.',
  openGraph: {
    title: 'Analyzed Repositories - GitHub Analyzer',
    description:
      'Explore all GitHub repositories we have analyzed with AI to find alternatives and gain insights.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Analyzed Repositories - GitHub Analyzer',
    description:
      'Explore all GitHub repositories we have analyzed with AI to find alternatives and gain insights.',
  },
};

export default function RepositoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
