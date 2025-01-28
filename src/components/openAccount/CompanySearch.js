import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const CompanySearch = ({ companies, onSelect, selectedCompany }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const dropdownRef = useRef(null);

  // Filter companies based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCompanies([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = companies
      .filter(company => 
        company.name.toLowerCase().includes(searchLower)
      )
      .slice(0, 10); // Limit to 10 results
    
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle company selection
  const handleSelect = (company) => {
    onSelect(company._id);
    setSearchTerm(company.name);
    setShowDropdown(false);
  };

  // Clear selection
  const handleClear = () => {
    onSelect('');
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder="Search company..."
          className="w-full p-2 border rounded-lg pr-8"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && filteredCompanies.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredCompanies.map(company => (
            <button
              key={company._id}
              onClick={() => handleSelect(company)}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
            >
              {company.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompanySearch;