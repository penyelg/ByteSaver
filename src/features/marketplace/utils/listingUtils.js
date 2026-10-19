export const fallbackCategories = [
  "All hardware",
  "CPU",
  "GPU",
  "RAM",
  "Motherboard",
  "Storage",
  "Power Supply",
  "Monitor",
  "Peripherals",
];

export function firstValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== "")
      return row[key];
  }
  return fallback;
}

export function filterListings(listings, { query, activeCategory, selectedConditions, maxPrice, benchmarkedOnly }) {
  return listings.filter((listing) => {
    const title = firstValue(
      listing,
      ["title", "name", "listing_title"],
      "Untitled listing",
    );

    const description = firstValue(listing, ["description", "details"], "");

    const category = firstValue(
      listing,
      ["category_name", "category", "category_title"],
      "",
    );

    const searchable = `${title} ${description} ${category}`.toLowerCase();
    const matchesQuery = searchable.includes(query.toLowerCase());
    const matchesCategory =
      activeCategory === "All hardware" ||
      category.toLowerCase() === activeCategory.toLowerCase();
    const price = Number(
      firstValue(listing, ["price", "asking_price", "amount"], 0),
    );
    const condition = firstValue(
      listing,
      ["condition", "item_condition"],
      "",
    ).toLowerCase();
    const matchesCondition =
      selectedConditions.length === 0 ||
      selectedConditions.some((selected) =>
        condition.includes(selected.toLowerCase()),
      );
    const matchesPrice = price <= maxPrice;
    const matchesBenchmark =
      !benchmarkedOnly ||
      listing.benchmarked === true ||
      listing.is_benchmarked === true;
    return (
      matchesQuery &&
      matchesCategory &&
      matchesCondition &&
      matchesPrice &&
      matchesBenchmark
    );
  });
}

export function sortListings(filteredListings, sortBy) {
  const sorted = [...filteredListings];
  if (sortBy === "price-low")
    sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sortBy === "price-high")
    sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sortBy === "recent")
    sorted.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    );
  return sorted;
}
