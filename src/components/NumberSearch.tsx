"use client";

import React, { useState } from "react";

export default function NumberSearch() {
  const [searchType, setSearchType] = useState("local");
  const [areaCode, setAreaCode] = useState("");
  const [country, setCountry] = useState("US");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{
    phoneNumber: string;
    friendlyName: string;
    capabilities: string[];
    region: string;
    price: string;
  }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const availableCapabilities = ["voice", "sms", "mms", "fax"];

  const toggleCapability = (capability: string) => {
    setCapabilities(prev => 
      prev.includes(capability) 
        ? prev.filter(c => c !== capability)
        : [...prev, capability]
    );
  };

  const handleSearch = async () => {
    setIsSearching(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResults = [
        {
          phoneNumber: "+1 (555) 111-2233",
          friendlyName: "Local Number - NY",
          region: "New York, NY",
          price: "$1.00",
          capabilities: ["voice", "sms"],
        },
        {
          phoneNumber: "+1 (555) 444-5566",
          friendlyName: "Local Number - LA",
          region: "Los Angeles, CA",
          price: "$1.00",
          capabilities: ["voice"],
        },
        {
          phoneNumber: "+1 (800) 777-8888",
          friendlyName: "Toll-Free Number",
          region: "US - National",
          price: "$2.50",
          capabilities: ["voice", "sms"],
        },
        {
          phoneNumber: "+1 (555) 999-0000",
          friendlyName: "Local Number - Chicago",
          region: "Chicago, IL",
          price: "$1.00",
          capabilities: ["voice", "sms", "mms"],
        },
      ];
      
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 2000);
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Search Available Numbers
        </h2>
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Search service operational
          </span>
        </div>
      </div>

      {/* Search Form */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number Type
          </label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="local">Local</option>
            <option value="toll-free">Toll-Free</option>
            <option value="mobile">Mobile</option>
            <option value="international">International</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Area Code (Optional)
          </label>
          <input
            type="text"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            placeholder="e.g., 212, 415"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="GB">United Kingdom</option>
            <option value="AU">Australia</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSearching ? "Searching..." : "Search Numbers"}
          </button>
        </div>
      </div>

      {/* Capabilities Filter */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Required Capabilities
        </label>
        <div className="flex flex-wrap gap-2">
          {availableCapabilities.map((capability) => (
            <button
              key={capability}
              onClick={() => toggleCapability(capability)}
              className={`rounded-lg px-3 py-1 text-sm ${
                capabilities.includes(capability)
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {capability.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 font-medium text-gray-900 dark:text-white">
            Available Numbers ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center dark:bg-green-900">
                    <span className="text-green-600 font-semibold dark:text-green-300">
                      📞
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.phoneNumber}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {result.region} • {result.friendlyName}
                    </div>
                    <div className="mt-1 flex items-center space-x-2">
                      {result.capabilities.map((cap: string) => (
                        <span
                          key={cap}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {cap.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.price}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      per month
                    </div>
                  </div>
                  <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700">
                    Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchResults.length === 0 && !isSearching && (
        <div className="mt-8 text-center py-8">
          <div className="text-gray-500 dark:text-gray-400">
            No search performed yet. Use the form above to find available numbers.
          </div>
        </div>
      )}

      {/* Search Tips */}
      <div className="mt-8 rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Search Tips
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Leave area code blank to search all available codes</li>
          <li>• Toll-free numbers are available nationwide</li>
          <li>• Local numbers are tied to specific geographic areas</li>
          <li>• Mobile numbers support SMS and MMS capabilities</li>
        </ul>
      </div>
    </div>
  );
}
