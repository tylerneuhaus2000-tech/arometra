import type { ProductSensoryDimension } from './model';
import { navigationTaxonomy } from './taxonomy';

// Category labels mirror the visible dimensions seeded by the sensory-profile migration.
// They describe the scale only; they do not assign product scores or tasting claims.
const dimensionsByCategory: Record<string, Array<[string, string, string]>> = {
  baijiu: [
    ['ba_grain', 'Getreide & Fermentation', 'grain'],
    ['ba_fruit', 'Fruchtige Ester', 'esters'],
    ['ba_floral', 'Florale Noten', 'floral'],
    ['ba_savory', 'Herzhafte / Umami-Noten', 'savory'],
    ['ba_spice', 'Gewürze', 'spice'],
    ['ba_texture', 'Körper & Mundgefühl', 'texture'],
  ],
  cognac: [
    ['co_fruit', 'Frische Früchte', 'fruit'],
    ['co_dried', 'Trockenfrüchte', 'dried_fruit'],
    ['co_floral', 'Florale Aromen', 'floral'],
    ['co_wood', 'Eiche & Holz', 'wood'],
    ['co_vanilla', 'Vanille & Süßnoten', 'sweet'],
    ['co_spice', 'Gewürze', 'spice'],
    ['co_rancio', 'Rancio / Reifekomplexität', 'rancio'],
    ['co_texture', 'Mundgefühl', 'texture'],
  ],
  gin: [
    ['gi_juniper', 'Wacholder', 'juniper'],
    ['gi_citrus', 'Zitrus', 'citrus'],
    ['gi_herbal', 'Kräuter', 'herbal'],
    ['gi_floral', 'Blüten', 'floral'],
    ['gi_spice', 'Gewürz-Botanicals', 'spice'],
    ['gi_earth', 'Wurzeln & erdige Noten', 'earth'],
    ['gi_fruit', 'Frucht', 'fruit'],
  ],
  grappa: [
    ['gr_grape', 'Trester-/Traubencharakter', 'grape'],
    ['gr_fruit', 'Frucht', 'fruit'],
    ['gr_floral', 'Blüten', 'floral'],
    ['gr_herbal', 'Kräuter & Würze', 'herbal'],
    ['gr_oak', 'Eiche (falls gereift)', 'wood'],
    ['gr_texture', 'Mundgefühl', 'texture'],
  ],
  likoere: [
    ['li_sweet', 'Wahrgenommene Süße', 'sweet'],
    ['li_main', 'Hauptaromatik', 'primary_aroma'],
    ['li_fruit', 'Frucht', 'fruit'],
    ['li_cocoa', 'Schokolade & Kakao', 'cocoa'],
    ['li_coffee', 'Kaffee & Röstnoten', 'coffee'],
    ['li_cream', 'Cremigkeit & Textur', 'texture'],
    ['li_herbal', 'Kräuter & Gewürze', 'herbal'],
  ],
  mezcal: [
    ['me_agave', 'Agave', 'agave'],
    ['me_smoke', 'Rauch', 'smoke'],
    ['me_earth', 'Erdige Noten', 'earth'],
    ['me_fruit', 'Frucht & Zitrus', 'fruit'],
    ['me_spice', 'Würze', 'spice'],
    ['me_mineral', 'Mineralität', 'mineral'],
  ],
  pisco: [
    ['pi_grape', 'Traube', 'grape'],
    ['pi_fruit', 'Frucht', 'fruit'],
    ['pi_floral', 'Blüten', 'floral'],
    ['pi_herbal', 'Kräuter & Würze', 'herbal'],
    ['pi_texture', 'Mundgefühl', 'texture'],
  ],
  rum: [
    ['ru_cane', 'Zuckerrohr & Melasse', 'cane'],
    ['ru_caramel', 'Karamell & Toffee', 'sweet'],
    ['ru_tropical', 'Tropische Früchte', 'fruit'],
    ['ru_spice', 'Würze', 'spice'],
    ['ru_oak', 'Eiche & Holz', 'wood'],
    ['ru_vanilla', 'Vanille', 'vanilla'],
    ['ru_esters', 'Fruchtige Fermentationsnoten', 'esters'],
    ['ru_floral', 'Blüten & Nussnoten', 'floral'],
  ],
  soju: [
    ['so_grain', 'Rohstoff / Getreide', 'grain'],
    ['so_clean', 'Neutralität', 'neutrality'],
    ['so_fruit', 'Fruchtige Noten', 'fruit'],
    ['so_sweet', 'Wahrgenommene Süße', 'sweet'],
    ['so_texture', 'Mundgefühl', 'texture'],
    ['so_finish', 'Abgang', 'finish'],
  ],
  tequila: [
    ['te_agave', 'Agave', 'agave'],
    ['te_vegetal', 'Pflanzlich & kräutrig', 'herbal'],
    ['te_citrus', 'Zitrus & Frucht', 'fruit'],
    ['te_pepper', 'Pfeffer & Gewürze', 'spice'],
    ['te_mineral', 'Mineralität', 'mineral'],
    ['te_oak', 'Holz & Vanille (bei Reifung)', 'wood'],
    ['te_texture', 'Mundgefühl', 'texture'],
  ],
  whisky: [
    ['wh_smoke', 'Rauch & Torf', 'smoke'],
    ['wh_grain', 'Malz & Getreide', 'grain'],
    ['wh_oak', 'Eiche & Holz', 'wood'],
    ['wh_sweet', 'Vanille, Honig & Karamell', 'sweet'],
    ['wh_fruit', 'Frucht & Zitrus', 'fruit'],
    ['wh_spice', 'Würze & Kräuter', 'spice'],
    ['wh_coastal', 'Maritime Noten', 'coastal'],
    ['wh_roast', 'Röst- & Nussnoten', 'roast'],
  ],
  wodka: [
    ['vo_grain', 'Getreide & Rohstoff', 'grain'],
    ['vo_neutral', 'Neutralität & Klarheit', 'neutrality'],
    ['vo_fruit', 'Subtile Frucht', 'fruit'],
    ['vo_spice', 'Würze', 'spice'],
    ['vo_texture', 'Mundgefühl', 'texture'],
    ['vo_finish', 'Abgang', 'finish'],
  ],
};

export function getCategorySensoryDimensions(categorySlug: string): ProductSensoryDimension[] {
  const category = navigationTaxonomy.find((item) => item.slug === categorySlug);
  const profileCategory = dimensionsByCategory[categorySlug]
    ? categorySlug
    : category?.parentSlug ?? categorySlug;
  const definitions = dimensionsByCategory[profileCategory];

  return (definitions ?? []).map(([code, label, semanticFamily], index) => ({
    code,
    label,
    semanticFamily,
    displayOrder: index + 1,
    descriptors: [],
    intensity: null,
    measurementMethod: null,
    measurementEvidenceType: null,
    measurementSourceName: null,
    measurementSourceUrl: null,
    measurementVerifiedAt: null,
  }));
}
