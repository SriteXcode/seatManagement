import React from "react";

export default function FieldsConfig({
  selectedExamType,
  setSelectedExamType,
  uniqueExamTypes,
  activeConfig,
  updateFieldLabel,
  updateFieldSampleValue,
  removeCustomField,
  addCustomField,
  createNewExamType,
  deleteActiveExamType,
  saveExamConfig,
  userRole,
}) {
  if (userRole !== "admin") return null;

  const [showLayoutConfig, setShowLayoutConfig] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="mb-6 p-5 border border-gray-200 bg-gray-50/30 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-gray-800">Exam Type & Fields Configuration</h4>
          <p className="text-[11px] text-gray-500">Configure custom column fields, labels, and templates for this exam format.</p>
        </div>
        
        {/* Dropdown with Action Buttons parallel below it */}
        <div className="flex flex-col gap-2 select-none shrink-0 min-w-[12rem] relative">
          
          {/* Custom Styled Dropdown Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Select Exam Type"
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between border border-gray-250 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-black cursor-pointer h-8 shadow-2xs"
            >
              <span>{selectedExamType}</span>
              <i className={`las la-angle-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isOpen && (
              <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-30 p-1 animate-scaleIn select-none">
                {uniqueExamTypes.map(et => (
                  <button
                    key={et}
                    onClick={() => {
                      setSelectedExamType(et);
                      localStorage.setItem("selectedExamType", et);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-all font-semibold cursor-pointer ${
                      et === selectedExamType
                        ? "bg-red-50 text-red-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-black"
                    }`}
                  >
                    {et}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons Parallel Below Dropdown */}
          <div className="flex items-center gap-2">
            <button
              onClick={createNewExamType}
              title="New Exam Type"
              aria-label="Create New Exam Type"
              className="bg-red-700 hover:bg-red-800 text-white p-1.5 rounded-lg transition-colors shadow shrink-0 cursor-pointer flex items-center justify-center flex-1 h-8"
            >
              <i className="las la-plus text-sm mr-1"></i>
              <span className="text-[10px] font-bold">New Type</span>
            </button>
            {selectedExamType !== "College" && selectedExamType !== "School" && selectedExamType !== "Competitive" && (
              <button
                onClick={deleteActiveExamType}
                title="Delete Exam Type"
                aria-label="Delete Selected Exam Type"
                className="border border-red-200 hover:bg-red-50 text-red-700 p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center w-8 h-8"
              >
                <i className="las la-trash text-sm"></i>
              </button>
            )}
            <button
              onClick={() => setShowLayoutConfig(prev => !prev)}
              title="Update Layout Settings"
              aria-label="Update Layout Settings"
              aria-expanded={showLayoutConfig}
              className={`flex items-center justify-center p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer shadow-xs w-8 h-8 ${
                showLayoutConfig 
                  ? "bg-red-700 hover:bg-red-800 text-white border-red-700" 
                  : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
              }`}
            >
              <i className={`las la-cog text-sm transition-transform ${showLayoutConfig ? 'rotate-90' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Fields configuration editor */}
      {showLayoutConfig && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4 animate-fadeIn">
          <h5 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider mb-3">Configure Fields for "{selectedExamType}"</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeConfig.fields.map((field) => (
              <div key={field.key} className="flex items-center gap-3 p-3 border border-gray-100 bg-gray-50/50 rounded-lg">
                <div className="flex-1">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">
                    {field.type === 'identifier' && 'Unique ID Field (System)'}
                    {field.type === 'name' && 'Student Name Field (System)'}
                    {field.type === 'constraint_1' && 'Primary Seating Constraint (Dept/Sec/Stream)'}
                    {field.type === 'constraint_2' && 'Secondary Seating Constraint (Sem/Class/Sub)'}
                    {field.type === 'subject' && 'Subject Field'}
                    {field.type === 'custom' && 'Additional Custom Field'}
                  </span>
                  <div className="flex gap-2 mt-1">
                    <div className="flex-[2]">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                        placeholder="Field Label"
                        className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white font-medium text-black"
                      />
                    </div>
                    {(field.type === 'custom' || (field.type === 'subject' && selectedExamType !== "School")) && (
                      <div className="flex-[1]">
                        <input
                          type="text"
                          value={field.sampleValue || ""}
                          onChange={(e) => updateFieldSampleValue(field.key, e.target.value)}
                          placeholder="Sample Value"
                          title="Sample value for templates"
                          className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white font-medium text-black"
                        />
                      </div>
                    )}
                  </div>
                </div>
                {field.type === 'custom' && (
                  <button
                    onClick={() => removeCustomField(field.key)}
                    className="text-red-500 hover:text-red-700 p-1 mt-4 cursor-pointer"
                    title="Remove Field"
                    aria-label={`Remove custom field ${field.label || "untitled"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={addCustomField}
              className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              + Add Field
            </button>
            <button
              onClick={saveExamConfig}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all shadow cursor-pointer"
            >
              Save Template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
