const CONFIG = window.AROMETRA_PAGES_CONFIG;
const state = { products: [], categories: [], selectedCategory: '', search: '' };
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function api(path, options = {}) {
  const response = await fetch(`${CONFIG.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: CONFIG.publishableKey,
      Authorization: `Bearer ${CONFIG.publishableKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  return response.json();
}

function showError(message) {
  $('#status').hidden = false;
  $('#status').className = 'status error';
  $('#status').textContent = message;
}

function visual(product) {
  if (product.imageUrl) {
    return `<div class="bottle-stage bottle-stage--photo"><img class="product-image" src="${esc(product.imageUrl)}" alt="${esc(product.imageAlt || `Produktfoto ${product.name}`)}" loading="lazy" referrerpolicy="no-referrer"></div>`;
  }
  return '<div class="bottle-stage bottle-stage--empty" role="img" aria-label="Kein freigegebenes Produktfoto vorhanden"><span>Kein Produktfoto</span></div>';
}

function renderCategories() {
  const roots = state.categories.filter((category) => !category.parent_id);
  const children = state.categories.filter((category) => category.parent_id);
  $('#categories').innerHTML = roots.map((root) => {
    const nested = children.filter((child) => child.parent_id === root.id);
    const expanded = state.selectedCategory === root.slug || nested.some((item) => item.slug === state.selectedCategory);
    return `<div class="category-group"><button class="category-button${state.selectedCategory === root.slug ? ' is-active' : ''}" data-category="${esc(root.slug)}" aria-expanded="${expanded}"><span>${esc(root.name_de)}</span><span class="chevron" aria-hidden="true">›</span></button>${nested.length ? `<div class="subcategories" ${expanded ? '' : 'hidden'}>${nested.map((item) => `<button data-category="${esc(item.slug)}" class="${state.selectedCategory === item.slug ? 'is-active' : ''}">${esc(item.name_de)}</button>`).join('')}</div>` : ''}</div>`;
  }).join('');
  document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', (event) => {
    const category = event.currentTarget.dataset.category;
    if (event.currentTarget.classList.contains('category-button') && event.currentTarget.nextElementSibling?.classList.contains('subcategories')) {
      event.currentTarget.setAttribute('aria-expanded', event.currentTarget.getAttribute('aria-expanded') !== 'true');
      event.currentTarget.nextElementSibling.hidden = event.currentTarget.getAttribute('aria-expanded') !== 'true';
    }
    state.selectedCategory = category;
    renderCategories();
    renderCatalog();
  }));
}

function matches(product) {
  const text = `${product.name} ${product.brand_name} ${product.category_name_de} ${product.category_slug} ${(product.sensoryTags || []).map((tag) => tag.tag_label_de).join(' ')}`.toLocaleLowerCase('de');
  const category = state.categories.find((item) => item.slug === state.selectedCategory);
  const parentSlug = category?.parent_id ? state.categories.find((item) => item.id === category.parent_id)?.slug : null;
  return (!state.search || text.includes(state.search.toLocaleLowerCase('de')))
    && (!state.selectedCategory || product.category_slug === state.selectedCategory || product.category_slug === parentSlug || state.categories.find((item) => item.slug === product.category_slug)?.parent_id === category?.id);
}

function flavorTags(product, count = 3) {
  return (product.sensoryTags || []).slice(0, count).map((tag) => `<span class="tag">${esc(tag.tag_label_de)}</span>`).join('');
}

function card(product) {
  const tags = flavorTags(product, 3);
  return `<a class="product-card" href="?produkt=${encodeURIComponent(product.slug)}" aria-label="${esc(product.name)} ansehen">${visual({ ...product, imageAlt: product.imageAlt || `Produktfoto ${product.name}` })}<div class="product-copy"><h2>${esc(product.name)}</h2><p>${esc(product.brand_name)} · ${esc(product.category_name_de)}${product.origin_country_code ? ` · ${esc(product.origin_country_code)}` : ''}</p>${tags ? `<div class="tags">${tags}</div>` : ''}</div></a>`;
}

function renderCatalog() {
  const products = state.products.filter(matches);
  $('#status').hidden = true;
  $('#catalog-view').hidden = false;
  $('#detail-view').hidden = true;
  $('#result-meta').textContent = `${products.length} freigegebene Produkte`;
  $('#product-grid').innerHTML = products.length ? products.map(card).join('') : '<div class="empty">Keine Produkte für diese Suche gefunden.</div>';
}

function recommendationCandidates(product) {
  const tags = new Set((product.sensoryTags || []).map((tag) => tag.tag_code));
  return state.products.filter((item) => item.id !== product.id).map((item) => {
    const shared = (item.sensoryTags || []).filter((tag) => tags.has(tag.tag_code));
    return { product: item, shared };
  }).filter((item) => item.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || Number(b.product.category_slug === product.category_slug) - Number(a.product.category_slug === product.category_slug))
    .slice(0, 3);
}

function detailFacts(product) {
  const facts = [
    ['Marke', product.brand?.name],
    ['Kategorie', product.category?.name_de],
    ['Herkunftsland', product.origin_country_code],
    ['Region', product.origin_region],
    ['Alkoholgehalt', product.abv_percent == null ? null : `${Number(product.abv_percent).toLocaleString('de-DE')} % vol.`],
    ['Alter', product.age_years == null ? null : `${Number(product.age_years)} Jahre`],
  ].filter(([, value]) => value);
  return facts.map(([label, value]) => `<div class="fact"><label>${esc(label)}</label><span>${esc(value)}</span></div>`).join('');
}

function renderProfile(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.tag_code || !row.tag_label_de) continue;
    const group = groups.get(row.dimension_label_de) || [];
    if (!group.some((tag) => tag.tag_code === row.tag_code)) group.push(row);
    groups.set(row.dimension_label_de, group);
  }
  if (!groups.size) return '<p class="empty">Für dieses Produkt sind noch keine geprüften Aroma-Tags hinterlegt.</p>';
  return `<div class="profile-list">${[...groups.entries()].map(([label, tags]) => `<div class="profile-row"><strong>${esc(label)}</strong><div class="tags">${tags.map((tag) => `<span class="tag">${esc(tag.tag_label_de)}</span>`).join('')}</div></div>`).join('')}</div><p class="empty">Es werden nur belegte Begriffe angezeigt; es liegen keine geprüften Zahlen-Skalen vor.</p>`;
}

async function showProduct(slug) {
  $('#catalog-view').hidden = true;
  $('#detail-view').hidden = false;
  $('#status').hidden = false;
  $('#status').className = 'status';
  $('#status').textContent = 'Produkt wird geladen …';
  try {
    const search = await api('products?select=id,slug,name,brand:brands!inner(name,slug),category:categories!products_primary_category_id_fkey!inner(name_de,slug),product_family,origin_country_code,origin_region,age_years,distillation_details,maturation_details,abv_percent&slug=eq.' + encodeURIComponent(slug) + '&limit=1');
    if (!search.length) throw new Error('product_not_found');
    const product = search[0];
    const [profile] = await Promise.all([api('rpc/get_product_sensory_profile', { method: 'POST', body: JSON.stringify({ target_product_id: product.id }) })]);
    const productImage = state.products.find((item) => item.id === product.id);
    product.imageUrl = productImage?.imageUrl || null;
    product.imageAlt = productImage?.imageAlt || `Produktfoto ${product.name}`;
    const recs = recommendationCandidates({ ...product, sensoryTags: (profile || []).filter((row) => row.tag_code).map((row) => ({ tag_code: row.tag_code })) });
    $('#status').hidden = true;
    $('#detail-view').innerHTML = `<article class="detail"><a class="back-link" href="./">← Alle Spirituosen</a><header class="detail-head">${visual(product)}<div><p class="eyebrow">${esc(product.category.name_de)}</p><h1>${esc(product.name)}</h1>${product.product_family ? `<p>${esc(product.product_family)}</p>` : ''}<p>Geprüfte Produktfakten aus dem Katalog.</p></div></header><section class="detail-section"><h2>Steckbrief</h2><div class="facts">${detailFacts(product) || '<p class="empty">Weitere Angaben sind noch nicht belegt.</p>'}</div></section><section class="detail-section"><h2>Geschmack &amp; Aroma</h2>${renderProfile(profile || [])}</section><section class="detail-section"><h2>Herstellung &amp; Herkunft</h2><div class="facts">${product.distillation_details ? `<div class="fact"><label>Herstellung</label><span>${esc(product.distillation_details)}</span></div>` : ''}${product.maturation_details ? `<div class="fact"><label>Reifung</label><span>${esc(product.maturation_details)}</span></div>` : ''}${product.origin_region ? `<div class="fact"><label>Region</label><span>${esc(product.origin_region)}</span></div>` : '<p class="empty">Zusätzliche Angaben sind nicht hinterlegt.</p>'}</div></section><section class="detail-section"><h2>Ähnliche Produkte</h2>${recs.length ? `<div class="detail-recs">${recs.map(({ product: item, shared }) => `<a class="product-card" href="?produkt=${encodeURIComponent(item.slug)}">${visual(item)}<div class="product-copy"><h2>${esc(item.name)}</h2><p>Gemeinsame belegte Merkmale: ${shared.map((tag) => esc(tag.tag_label_de)).join(' · ')}</p></div></a>`).join('')}</div>` : '<p class="empty">Für passende Empfehlungen fehlen noch gemeinsame geprüfte Aroma-Tags.</p>'}</section></article>`;
  } catch (error) {
    showError(error.message === 'product_not_found' ? 'Dieses Produkt wurde nicht im freigegebenen Katalog gefunden.' : 'Produktdaten konnten gerade nicht geladen werden.');
  }
}

async function resolveQr(code) {
  try {
    const rows = await api('rpc/resolve_qr_link', { method: 'POST', body: JSON.stringify({ lookup_code: code }) });
    const resolved = rows?.[0];
    if (resolved?.resolution_status === 'active' && resolved.product_slug) {
      location.replace(`?produkt=${encodeURIComponent(resolved.product_slug)}`);
      return;
    }
    showError(resolved?.resolution_status === 'disabled' ? 'Dieser QR-Code ist deaktiviert.' : 'Zu diesem QR-Code wurde kein aktives Produkt gefunden.');
  } catch { showError('Der QR-Code konnte gerade nicht geprüft werden.'); }
}

async function start() {
  if (!CONFIG?.url || !CONFIG?.publishableKey) return showError('Die öffentliche Supabase-Konfiguration fehlt.');
  try {
    const args = { search_term: null, normalized_term: null, category_slug: null, flavor_code: null, origin_country_code: null, brand_slug: null, page_number: 1, page_size: 500 };
    const [products, categories, images] = await Promise.all([
      api('rpc/search_catalog', { method: 'POST', body: JSON.stringify(args) }),
      api('categories?select=id,parent_id,slug,name_de&active=eq.true&order=sort_order.asc'),
      api('product_images?select=id,product_id,source_url,alt_text,sort_order,source:sources!inner(source_name,canonical_url)&order=sort_order.asc'),
    ]);
    state.products = products || [];
    state.categories = categories || [];
    const imagesByProduct = new Map();
    for (const image of images || []) {
      if (!image.source_url || imagesByProduct.has(image.product_id)) continue;
      imagesByProduct.set(image.product_id, { imageUrl: image.source_url, imageAlt: image.alt_text });
    }
    for (const product of state.products) Object.assign(product, imagesByProduct.get(product.id) || {});
    if (state.products.length) {
      const ids = state.products.map((product) => product.id);
      const tags = await api('rpc/get_public_sensory_tags', { method: 'POST', body: JSON.stringify({ target_product_ids: ids }) });
      const tagsByProduct = new Map();
      for (const tag of tags || []) {
        const group = tagsByProduct.get(tag.product_id) || [];
        group.push(tag);
        tagsByProduct.set(tag.product_id, group);
      }
      for (const product of state.products) product.sensoryTags = tagsByProduct.get(product.id) || [];
    }
    renderCategories();
    const params = new URLSearchParams(location.search);
    const qr = params.get('qr');
    const slug = params.get('produkt');
    if (qr) return resolveQr(qr);
    if (slug) return showProduct(slug);
    renderCatalog();
  } catch { showError('Der Supabase-Katalog konnte nicht geladen werden. Prüfe die öffentliche Datenfreigabe und RLS.'); }
}

$('#catalog-search').addEventListener('input', (event) => { state.search = event.target.value.trim(); renderCatalog(); });
$('#menu-toggle').addEventListener('click', (event) => {
  const sidebar = $('#sidebar');
  const open = sidebar.classList.toggle('is-open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});
start();
