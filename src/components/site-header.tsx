import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="AROMETRA Startseite">
        AROMETRA
      </Link>
      <nav aria-label="Hauptnavigation" className="main-navigation">
        <Link href="/entdecken">Entdecken</Link>
        <Link href="/#ablauf">Ablauf</Link>
      </nav>
      <Link className="header-search-link" href="/entdecken" aria-label="Produktsuche öffnen">
        <span aria-hidden="true">⌕</span>
        <span className="visually-hidden">Suche</span>
      </Link>
    </header>
  );
}
