import React from 'react';
import { FiFilter } from 'react-icons/fi';
import './FilterBar.css';

const FilterBar = ({ filters = [], onFilterChange }) => {
  if (!filters || filters.length === 0) return null;
  
  return (
    <div className="filter-bar">
      <FiFilter className="filter-icon" />
      <div className="filter-items">
        {filters.map((filter, index) => (
          <select
            key={index}
            value={filter.value || ''}
            onChange={(e) => onFilterChange(filter.key, e.target.value)}
            className="filter-select"
          >
            <option value="">All {filter.label}</option>
            {filter.options && filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
};

export default FilterBar;
