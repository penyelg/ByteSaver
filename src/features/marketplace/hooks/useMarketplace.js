import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { fetchMarketplacePage } from '../services/marketplaceService';

export default function useMarketplace(options) {
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ key: null, listings: [], total: 0, error: '', loading: true });
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify(options);
  const previousFilters = useRef('');

  // Fetch the category menu once, independently of the current result page.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const controller = new AbortController();
    supabase.from('categories').select('id, name').eq('is_active', true).order('name').abortSignal(controller.signal)
      .then(({ data, error }) => { if (active && !error) setCategories(data || []); })
      .catch(() => { /* The page supplies fallback categories. */ });
    return () => { active = false; controller.abort(); };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const current = JSON.parse(requestKey);
    const filterKey = JSON.stringify([current.query, current.maxPrice]);
    const delay = previousFilters.current && previousFilters.current !== filterKey ? 250 : 0;
    previousFilters.current = filterKey;
    setResult((previous) => ({ ...previous, loading: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        if (!supabase) throw new Error('Supabase is not configured.');
        const { data, count, error } = await fetchMarketplacePage(supabase, current, controller.signal);
        if (!active) return;
        // Recover if a deletion/moderation decision removed the last page.
        if (error?.code === 'PGRST103') {
          setResult({ key: requestKey, listings: [], total: 0, loading: false, error: '' });
          return;
        }
        if (error) throw error;
        setResult({ key: requestKey, listings: data || [], total: count ?? 0, loading: false, error: '' });
      } catch {
        if (active) setResult({ key: requestKey, listings: [], total: 0, loading: false, error: 'Unable to load listings. Please try again.' });
      }
    }, delay);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [requestKey, retry]);
  return { ...result, categories, loading: result.loading || result.key !== requestKey, reload: () => setRetry((value) => value + 1) };
}
