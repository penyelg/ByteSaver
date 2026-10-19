import React from 'react';
import { CircuitBoard, Cpu, HardDrive, Keyboard, LayoutGrid, MemoryStick, Monitor, Package, Zap } from 'lucide-react';

const categoryIcons = {
  "All hardware": LayoutGrid,
  CPU: Cpu,
  GPU: CircuitBoard,
  RAM: MemoryStick,
  Motherboard: CircuitBoard,
  Storage: HardDrive,
  "Power Supply": Zap,
  Monitor,
  Peripherals: Keyboard,
};

function CategoryIcon({ category }) {
  const Icon = categoryIcons[category] || Package;
  return <Icon aria-hidden="true" strokeWidth={1.8} />;
}

export default function MarketplaceFilters({ categoryNames, activeCategory, setActiveCategory, selectedConditions, toggleCondition, maxPrice, setMaxPrice, resetFilters }) {
  return (
    <aside className="category-rail">
      <div className="filter-heading">
        <span>☷ &nbsp; FILTER HARDWARE</span>
        <button type="button" onClick={resetFilters}>
          RESET ALL
        </button>
      </div>
      <span className="rail-label">CATEGORIES</span>
      <div className="category-list">
        {categoryNames.map((category) => (
          <button
            key={category}
            className={activeCategory === category ? "active" : ""}
            onClick={() => setActiveCategory(category)}
          >
            <CategoryIcon category={category} />
            <span>{category}</span>
          </button>
        ))}
      </div>
      <div className="filter-group">
        <span className="rail-label">CONDITION GRADE</span>
        <label>
          <input
            type="checkbox"
            checked={selectedConditions.includes("like new")}
            onChange={() => toggleCondition("like new")}
          />{" "}
          Like new
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedConditions.includes("excellent")}
            onChange={() => toggleCondition("excellent")}
          />{" "}
          Excellent
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedConditions.includes("good")}
            onChange={() => toggleCondition("good")}
          />{" "}
          Good
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedConditions.includes("fair")}
            onChange={() => toggleCondition("fair")}
          />{" "}
          Fair
        </label>
      </div>
      <div className="filter-group price-filter">
        <span className="rail-label">MAX PRICE</span>
        <strong>₱{maxPrice.toLocaleString()}</strong>
        <input
          type="range"
          min="1000"
          max="150000"
          step="1000"
          value={maxPrice}
          onChange={(event) => setMaxPrice(Number(event.target.value))}
        />
        <div>
          <small>₱1,000</small>
          <small>₱150,000+</small>
        </div>
      </div>
    </aside>
  );
}
