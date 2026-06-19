import React, { useState, useEffect } from "react";

export default function FilterControls({ allotments, onFilterChange, getFieldLabel }) {
  const depts = [...new Set(allotments.map(a => a.student.dept))];
  const sems = [...new Set(allotments.map(a => a.student.sem))];
  const [selectedDepts, setSelectedDepts] = useState(depts);
  const [selectedSems, setSelectedSems] = useState(sems);

  useEffect(() => {
    setSelectedDepts(depts);
    setSelectedSems(sems);
  }, [allotments]);

  useEffect(() => {
    onFilterChange({ depts: selectedDepts, sems: selectedSems });
  }, [selectedDepts, selectedSems]);

  const handleDeptChange = (dept) => {
    setSelectedDepts(prev =>
      prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
    );
  };

  const handleSemChange = (sem) => {
    setSelectedSems(prev =>
      prev.includes(sem) ? prev.filter(s => s !== sem) : [...prev, sem]
    );
  };

  return (
    <div className="space-y-2">
      <div>
        <h4 className="font-semibold text-gray-800 text-xs">Filter by {getFieldLabel ? getFieldLabel('constraint_1') : 'Department'}</h4>
        <div className="flex flex-wrap gap-2 mt-1 select-none">
          {depts.map(dept => (
            <label key={dept} className="flex items-center gap-1 text-xs text-gray-650 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDepts.includes(dept)}
                onChange={() => handleDeptChange(dept)}
                className="rounded text-red-700 w-3.5 h-3.5 focus:ring-red-500 cursor-pointer"
              />
              {dept}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 text-xs">Filter by {getFieldLabel ? getFieldLabel('constraint_2') : 'Semester'}</h4>
        <div className="flex flex-wrap gap-2 mt-1 select-none">
          {sems.map(sem => (
            <label key={sem} className="flex items-center gap-1 text-xs text-gray-650 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSems.includes(sem)}
                onChange={() => handleSemChange(sem)}
                className="rounded text-red-700 w-3.5 h-3.5 focus:ring-red-500 cursor-pointer"
              />
              {sem}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
