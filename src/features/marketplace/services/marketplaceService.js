export const BROWSE_PAGE_SIZE = 10;

// Quote PostgREST values separately from escaping SQL LIKE wildcards.
function containsPattern(value) {
  const pattern = `%${value.replace(/[\\%_]/g, '\\$&')}%`;
  return `"${pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function fetchMarketplacePage(client, { page, query, activeCategory, sortBy, selectedConditions, maxPrice }, signal) {
  // Preserve the RPC's approval, reservation visibility, and caller RLS checks.
  let request = client.rpc('browse_marketplace_listings', {}, { count: 'exact' }).lte('price', maxPrice);
  if (activeCategory !== 'All hardware') request = request.eq('category', activeCategory);
  // Words can match separate fields, e.g. "MSI B550".
  for (const term of query.trim().split(/\s+/).filter(Boolean)) {
    const pattern = containsPattern(term);
    request = request.or(['brand', 'model', 'description', 'category'].map((field) => `${field}.ilike.${pattern}`).join(','));
  }
  if (selectedConditions.length) request = request.or(selectedConditions.map((condition) => `condition.ilike.${containsPattern(condition)}`).join(','));
  if (sortBy === 'price-low' || sortBy === 'price-high') request = request.order('price', { ascending: sortBy === 'price-low' });
  // Unique tie-breaker keeps tied dates/prices stable across pages.
  request = request.order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false })
    .range((page - 1) * BROWSE_PAGE_SIZE, page * BROWSE_PAGE_SIZE - 1);
  return signal ? request.abortSignal(signal) : request;
}
