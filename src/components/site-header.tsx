import Link from 'next/link';
import { headers } from 'next/headers';
import { SearchForm } from '@/components/search-form';
import { isLocalUiPreviewEnabled } from '@/lib/ui-preview/fixtures';

export async function SiteHeader({
  searchTerm = '',
  searchCategory = '',
  searchAction = '/entdecken',
}: {
  searchTerm?: string;
  searchCategory?: string;
  searchAction?: string;
}) {
  const requestHeaders = await headers();
  const showLocalPreview = isLocalUiPreviewEnabled(requestHeaders.get('host'));

  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="AROMETRA Startseite">
        AROMETRA
      </Link>
      <SearchForm q={searchTerm} category={searchCategory} action={searchAction} />
      {showLocalPreview && (
        <Link className="preview-shortcut" href="/ui-preview">
          UI-Vorschau <span aria-hidden="true">↗</span>
        </Link>
      )}
    </header>
  );
}
