import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function useMarketplace() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // use for fetching the data from Supabase
  useEffect(() => {
    let mounted = true;

    const loadMarketplace = async () => {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      const [listingResult, categoryResult] = await Promise.all([
        supabase.rpc("browse_marketplace_listings"),
        supabase.from("categories").select("*"),
      ]);

      if (!mounted) return;
      if (listingResult.error) setError("Unable to load marketplace listings.");
      else setListings(listingResult.data || []);
      if (!categoryResult.error) setCategories(categoryResult.data || []);
      setLoading(false);
    };

    loadMarketplace();
    return () => {
      mounted = false;
    };
  }, []);

  return { listings, categories, loading, error };
}
