import { describe, expect, it } from 'vitest';
import { getCategorySensoryDimensions } from '@/lib/catalog/sensory-taxonomy';

describe('category sensory scale templates', () => {
  it('uses distinct dimensions for whisky and gin without assigning product ratings', () => {
    const whisky = getCategorySensoryDimensions('whisky-scotch');
    const gin = getCategorySensoryDimensions('gin-london-dry');

    expect(whisky.map((dimension) => dimension.code)).toContain('wh_smoke');
    expect(gin.map((dimension) => dimension.code)).toContain('gi_juniper');
    expect(gin.map((dimension) => dimension.code)).not.toContain('wh_smoke');
    expect([...whisky, ...gin].every((dimension) => dimension.intensity === null)).toBe(true);
    expect([...whisky, ...gin].every((dimension) => dimension.descriptors.length === 0)).toBe(true);
  });

  it('keeps unknown category schemas empty rather than guessing dimensions', () => {
    expect(getCategorySensoryDimensions('aquavit')).toEqual([]);
  });
});
