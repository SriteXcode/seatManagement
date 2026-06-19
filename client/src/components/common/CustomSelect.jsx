import React, { useState, useRef, useEffect } from "react";

export default function CustomSelect({
  value,
  onChange,
  options, // Array of strings, or array of { value, label }
  placeholder = "Select Option",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const parsedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return opt;
    }
    return { value: opt, label: opt };
  });

  const selectedOption = parsedOptions.find(opt => String(opt.value) === String(value));

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-200 hover:border-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/15 rounded-lg px-3 py-1.5 text-xs bg-white text-black font-semibold cursor-pointer flex items-center justify-between gap-2 shadow-2xs min-h-[32px] transition-all"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <i className={`las la-angle-down text-red-600 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}></i>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 bg-white border border-gray-150 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-scaleIn select-none w-full min-w-[160px]">
          <ul className="py-1">
            {parsedOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 italic">No options available</li>
            ) : (
              parsedOptions.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-red-50 hover:text-red-750 transition-colors flex items-center justify-between cursor-pointer ${
                      String(opt.value) === String(value) ? 'bg-red-50/70 text-red-750 font-bold' : 'text-gray-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && <i className="las la-check text-red-600"></i>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
