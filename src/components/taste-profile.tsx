import type { CatalogProduct, ProductSensoryDimension } from '@/lib/catalog/model';

export function TasteProfile({ product }: { product: CatalogProduct }) {
  if (product.sensoryProfile.length === 0) {
    return (
      <div className="taste-profile">
        <p className="empty-copy">Für diese Kategorie ist noch kein Geschmacksraster hinterlegt.</p>
      </div>
    );
  }

  return (
    <div className="taste-profile" aria-describedby="taste-profile-note">
      <ul className="taste-profile__list">
        {product.sensoryProfile.map((dimension) => (
          <DimensionRow dimension={dimension} key={dimension.code} />
        ))}
      </ul>
      <p id="taste-profile-note" className="taste-profile__note">
        Leere Balken sind noch unbewertet. Werte erscheinen nur bei dokumentierten Messungen.
      </p>
    </div>
  );
}

function DimensionRow({ dimension }: { dimension: ProductSensoryDimension }) {
  const hasIntensity = dimension.intensity !== null;
  return (
    <li className="taste-profile__row">
      <div className="taste-profile__heading">
        <span className="taste-profile__name">{dimension.label}</span>
        {hasIntensity ? (
          <meter
            className="taste-profile__track taste-profile__track--rated"
            min={0}
            max={10}
            value={dimension.intensity ?? 0}
            aria-label={`${dimension.label}: ${dimension.intensity} von 10`}
          />
        ) : (
          <div className="taste-profile__track taste-profile__track--unrated" aria-hidden="true" />
        )}
        <span className="taste-profile__value">
          {hasIntensity ? `${dimension.intensity}/10` : 'Unbewertet'}
        </span>
      </div>
      {dimension.descriptors.length > 0 ? (
        <ul className="taste-profile__tags" aria-label={`Belegte Merkmale für ${dimension.label}`}>
          {dimension.descriptors.map((descriptor) => (
            <li key={`${descriptor.code}-${descriptor.stage}-${descriptor.sourceName}`}>
              <span>{descriptor.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
