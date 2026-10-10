import Link from 'next/link';
import { SearchForm } from '@/components/search-form';

export function SiteHeader({ searchTerm = '', searchCategory = '' }: { searchTerm?: string; searchCategory?: string }) {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="AROMETRA Startseite">
        AROMETRA
      </Link>
      <nav aria-label="Hauptnavigation" className="main-navigation">
        <Link href="/entdecken">Entdecken</Link>
      </nav>
      <SearchForm q={searchTerm} category={searchCategory} />
    </header>
  );
}
