import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API || "http://localhost:4000";

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const getAvatarBg = (name) => {
  const colors = [
    "bg-red-50 text-red-700 border border-red-200/50",
    "bg-blue-50 text-blue-700 border border-blue-200/50",
    "bg-green-50 text-green-700 border border-green-200/50",
    "bg-yellow-50 text-yellow-700 border border-yellow-200/50",
    "bg-purple-50 text-purple-700 border border-purple-200/50",
    "bg-pink-50 text-pink-700 border border-pink-200/50",
    "bg-indigo-50 text-indigo-700 border border-indigo-200/50"
  ];
  if (!name) return colors[0];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const Invigilators = ({ token, invigilators, onAdd, onEdit, onDelete, onAssign, onRefresh, triggerConfirm, showToast, userRole = 'admin' }) => {
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    empId: '',
    dept: '',
    phone: '',
    email: '',
  });
  const [editingInvigilatorId, setEditingInvigilatorId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAllInvigilators, setShowAllInvigilators] = useState(false);
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [distributors, setDistributors] = useState(2);
  
  const [availableOptions, setAvailableOptions] = useState([]); // [{ id, date, shift, roomId, roomName, label }]
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInvigilator((prev) => ({ ...prev, [name]: value }));
  };

  const loadOptions = async () => {
    if (!token) return;
    setLoadingOptions(true);
    setAvailableOptions([]);
    setSelectedOptionIds([]);
    try {
        const schedRes = await fetch(`${API}/schedules`, { headers: { Authorization: `Bearer ${token}` } });
        const schedules = await schedRes.json();
        
        if (!Array.isArray(schedules)) throw new Error("Failed to load schedules");

        const options = [];
        let optId = 1;

        for (const s of schedules) {
            const allotRes = await fetch(`${API}/allotments?shift=${s.shift}&date=${s.date}`, { headers: { Authorization: `Bearer ${token}` } });
            const allotments = await allotRes.json();
            
            if (Array.isArray(allotments) && allotments.length > 0) {
                const distinctRooms = {};
                allotments.forEach(a => {
                    if (!a.room) return;
                    const rId = a.room._id || a.room;
                    const rName = a.room.name || "Unknown";
                    distinctRooms[rId] = rName;
                });

                for (const [rId, rName] of Object.entries(distinctRooms)) {
                    options.push({
                        id: `opt_${optId++}`,
                        date: s.date,
                        shift: s.shift,
                        roomId: rId,
                        roomName: rName,
                        label: `${s.date} (Shift ${s.shift}) — ${rName}`
                    });
                }
            }
        }
        setAvailableOptions(options);

    } catch (e) {
        console.error(e);
        if (showToast) {
            showToast("Error loading schedule options: " + e.message, "error");
        } else {
            alert("Error loading schedule options: " + e.message);
        }
    } finally {
        setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (token) loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleOption = (optId) => {
    setSelectedOptionIds(prev => 
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
    );
  };

  const toggleAllOptions = () => {
    if (selectedOptionIds.length === availableOptions.length) {
        setSelectedOptionIds([]);
    } else {
        setSelectedOptionIds(availableOptions.map(o => o.id));
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (newInvigilator.name.trim() && newInvigilator.empId.trim()) {
      if (editingInvigilatorId) {
        onEdit(editingInvigilatorId, newInvigilator);
        setEditingInvigilatorId(null);
      } else {
        onAdd(newInvigilator);
      }
      setNewInvigilator({ name: '', empId: '', dept: '', phone: '', email: '' });
    } else {
      if (showToast) {
        showToast('Name and Employee ID are required.', 'error');
      } else {
        alert('Name and Employee ID are required.');
      }
    }
  };

  const startEdit = (inv) => {
    setEditingInvigilatorId(inv._id);
    setNewInvigilator({
      name: inv.name || '',
      empId: inv.empId || '',
      dept: inv.dept || '',
      phone: inv.phone || '',
      email: inv.email || '',
    });
    setShowForm(true);
    setTimeout(() => {
      const formElement = document.getElementById("invigilator-form-card");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const cancelEdit = () => {
    setEditingInvigilatorId(null);
    setNewInvigilator({ name: '', empId: '', dept: '', phone: '', email: '' });
    setShowForm(false);
  };

  const handleAssign = () => {
    if (selectedOptionIds.length === 0) {
        if (showToast) {
            showToast("Please select at least one Room/Schedule combination.", "warning");
        } else {
            alert("Please select at least one Room/Schedule combination.");
        }
        return;
    }

    const grouped = {};

    selectedOptionIds.forEach(optId => {
        const opt = availableOptions.find(o => o.id === optId);
        if (opt) {
            const key = `${opt.date}_${opt.shift}`;
            if (!grouped[key]) {
                grouped[key] = { date: opt.date, shift: opt.shift, roomIds: [] };
            }
            if (!grouped[key].roomIds.includes(opt.roomId)) {
                grouped[key].roomIds.push(opt.roomId);
            }
        }
    });

    const targetSchedules = Object.values(grouped);

    const totalRoomsCount = selectedOptionIds.length;
    const requiredInvigilators = totalRoomsCount * invigilatorsPerRoom + (distributors * targetSchedules.length);
    
    if (invigilators.length < requiredInvigilators) {
      if (triggerConfirm) {
        triggerConfirm(
          "Shortage of Invigilators",
          `Potential shortage of invigilators.\nSelected Combinations: ${totalRoomsCount}\nRequired (approx): ${requiredInvigilators}\nAvailable: ${invigilators.length}\n\nDo you want to proceed anyway?`,
          () => onAssign(invigilatorsPerRoom, distributors, targetSchedules)
        );
      } else {
        if (showToast) {
          showToast(`Cannot proceed: potential shortage of invigilators. Required (approx): ${requiredInvigilators}, Available: ${invigilators.length}`, "error");
        } else {
          alert(`Potential shortage of invigilators. Required (approx): ${requiredInvigilators}, Available: ${invigilators.length}`);
        }
      }
    } else {
      onAssign(invigilatorsPerRoom, distributors, targetSchedules);
    }
  };

  const filteredInvigilators = invigilators.filter(inv => 
    inv.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.empId.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (inv.dept && inv.dept.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <section id="Invigilators" className="space-y-6 animate-fadeIn select-none">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center shrink-0 shadow-3xs">
            <i className="las la-user-tie text-2xl"></i>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-855 tracking-tight leading-tight">Invigilator Staff Management</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              Manage available teachers, configure configurations, and trigger auto-assignments.
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2 transition-colors text-center font-bold shadow-3xs cursor-pointer flex items-center gap-1.5 shrink-0 sm:self-center"
        >
          <i className="las la-sync-alt text-sm"></i> Refetch Staff List
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Section (2 columns if form visible, 3 columns if form hidden) */}
        <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6`}>
          
          {/* Assignment Selection Area */}
          {userRole === "admin" && (
            <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl shadow-3xs">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-extrabold text-red-800 uppercase tracking-wider">Select Date/Shift/Room Combinations</h3>
                  <p className="text-[10px] text-red-700 font-semibold mt-0.5">Choose which active room arrangements require invigilators.</p>
                </div>
                <button 
                  onClick={loadOptions} 
                  className="text-[10px] bg-white border border-red-150 px-3 py-1.5 rounded-xl font-bold text-red-700 hover:bg-red-50/50 shadow-3xs cursor-pointer transition-colors"
                >
                  {loadingOptions ? (
                    <span className="flex items-center gap-1"><i className="las la-spinner animate-spin"></i> Loading...</span>
                  ) : "Refresh Options"}
                </button>
              </div>

              {loadingOptions ? (
                <div className="text-center py-8 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-400 italic">
                  <i className="las la-spinner animate-spin mr-1.5 text-red-700 text-sm"></i> Loading available exam arrangements...
                </div>
              ) : availableOptions.length === 0 ? (
                <div className="text-center py-8 bg-white border border-dashed border-gray-200 rounded-2xl text-xs font-semibold text-gray-400 italic">
                  No scheduled allotments found. Allocate students to rooms inside the Allotment tab first.
                </div>
              ) : (
                <div className="bg-white border border-gray-150 rounded-2xl p-4 shadow-3xs">
                  <div className="flex justify-end mb-3 border-b border-gray-100 pb-2">
                    <button 
                      onClick={toggleAllOptions} 
                      className="text-[10px] text-red-700 hover:underline font-bold"
                    >
                      {selectedOptionIds.length === availableOptions.length ? "Deselect All Rooms" : "Select All Rooms"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                    {availableOptions.map(opt => {
                      const isSelected = selectedOptionIds.includes(opt.id);
                      return (
                        <label 
                          key={opt.id} 
                          className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer select-none transition-all duration-150 ${
                            isSelected 
                              ? 'bg-red-50/60 border-red-500 shadow-3xs ring-1 ring-red-500/20' 
                              : 'bg-white border-gray-150 hover:bg-gray-50/50 shadow-4xs'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleOption(opt.id)}
                            className="mt-0.5 rounded text-red-750 focus:ring-red-500/20 w-4 h-4 cursor-pointer"
                          />
                          <div className="flex flex-col">
                            <span className="font-extrabold text-xs text-gray-855 tracking-tight">{opt.date}</span>
                            <span className="text-[10px] text-gray-500 font-bold mt-0.5">Shift {opt.shift} — {opt.roomName}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignment Controls */}
              <div className="mt-5 flex flex-wrap items-center gap-4 justify-between pt-4 border-t border-red-100/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-white border border-gray-150 rounded-xl px-3 py-1.5 shadow-3xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invigilators / Room</span>
                    <input
                      type="number"
                      value={invigilatorsPerRoom}
                      onChange={(e) => setInvigilatorsPerRoom(Number(e.target.value))}
                      className="p-1 border border-gray-200 focus:outline-none focus:border-red-500 rounded-lg w-12 text-center text-xs font-bold bg-white text-gray-800"
                      min="1"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-gray-150 rounded-xl px-3 py-1.5 shadow-3xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Distributors</span>
                    <input
                      type="number"
                      value={distributors}
                      onChange={(e) => setDistributors(Number(e.target.value))}
                      className="p-1 border border-gray-200 focus:outline-none focus:border-red-500 rounded-lg w-12 text-center text-xs font-bold bg-white text-gray-800"
                      min="0"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={selectedOptionIds.length === 0}
                  className={`font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                    selectedOptionIds.length === 0 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' 
                      : 'bg-red-700 hover:bg-red-800 text-white'
                  }`}
                >
                  <i className="las la-user-cog text-sm"></i> Run Auto-Assignment
                </button>
              </div>
            </div>
          )}

          {/* Current Invigilators Directory Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xs font-extrabold text-gray-855 uppercase tracking-wider">Staff Directory ({filteredInvigilators.length})</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">List of all registered invigilators</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {userRole === "admin" && (
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setTimeout(() => {
                        const formElement = document.getElementById("invigilator-form-card");
                        if (formElement) {
                          formElement.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 100);
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Invigilator
                  </button>
                )}
                <div className="relative w-full md:w-48">
                  <input
                    type="text"
                    placeholder="Search name, ID or dept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/15 focus:border-red-500 rounded-xl px-3 py-1.5 pl-8 text-xs bg-white text-gray-800 font-bold shadow-3xs transition-all"
                  />
                  <i className="las la-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                </div>
              </div>
            </div>

            {filteredInvigilators.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(showAllInvigilators ? filteredInvigilators : filteredInvigilators.slice(0, 4)).map((invigilator) => (
                    <div 
                      key={invigilator._id} 
                      className="flex items-center gap-3.5 p-3.5 bg-white border border-gray-150 rounded-2xl shadow-3xs hover:shadow-xs transition-all animate-fadeIn"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs shadow-3xs ${getAvatarBg(invigilator.name)}`}>
                        {getInitials(invigilator.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-xs text-gray-855 truncate">{invigilator.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 flex items-center gap-1.5">
                          <span>ID: {invigilator.empId}</span>
                          {invigilator.dept && (
                            <>
                              <span className="text-gray-300 font-extrabold">•</span>
                              <span className="text-red-750 font-extrabold">{invigilator.dept}</span>
                            </>
                          )}
                        </div>
                        {(invigilator.phone || invigilator.email) && (
                          <div className="flex flex-col gap-2.5 mt-2">
                            {invigilator.phone && (
                              <a 
                                href={`tel:${invigilator.phone}`} 
                                className="text-[9px] text-gray-550 hover:text-red-700 font-bold flex items-center gap-1 transition-colors"
                                title={`Call ${invigilator.name}`}
                              >
                                <i className="las la-phone text-xs"></i> {invigilator.phone}
                              </a>
                            )}
                            {invigilator.email && (
                              <a 
                                href={`mailto:${invigilator.email}`} 
                                className="text-[9px] text-gray-550 hover:text-red-700 font-bold flex items-center gap-1 transition-colors truncate max-w-[130px]"
                                title={`Email ${invigilator.name}`}
                              >
                                <i className="las la-envelope text-xs"></i> {invigilator.email}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => startEdit(invigilator)}
                            className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-gray-150 cursor-pointer transition-colors"
                            title="Edit staff details"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              triggerConfirm(
                                "Delete Invigilator",
                                `Are you sure you want to delete "${invigilator.name}"? This deletes all their exam assignments.`,
                                () => onDelete(invigilator._id, invigilator.name)
                              );
                            }}
                            className="p-1.5 text-red-650 hover:text-red-700 hover:bg-red-50 rounded-lg border border-gray-150 cursor-pointer transition-colors"
                            title="Delete staff member"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {filteredInvigilators.length > 4 && (
                  <div className="flex justify-center mt-5 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowAllInvigilators(!showAllInvigilators)}
                      className="text-xs border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 font-extrabold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-3xs"
                    >
                      {showAllInvigilators ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-500 transition-transform rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          See Less
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          See More ({filteredInvigilators.length - 4} more)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50/30 border border-dashed border-gray-250 rounded-2xl">
                <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="las la-user-slash text-2xl"></i>
                </div>
                <span className="font-extrabold text-xs text-gray-800 block">No staff members found</span>
                <span className="text-[10px] text-gray-550 mt-1 block font-bold">Try clearing your search query or add a new teacher.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section (1 column): Form Card (Sticky) */}
        {showForm && userRole === "admin" && (
          <div className="lg:sticky lg:top-4 space-y-4">
            <form onSubmit={handleSubmitForm} id="invigilator-form-card" className="bg-white border border-gray-150 rounded-2xl p-5 shadow-3xs animate-fadeIn space-y-4 relative">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  cancelEdit();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-605 p-1 border border-gray-150 rounded-lg hover:bg-gray-55 cursor-pointer"
                title="Close form"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h3 className="text-xs font-extrabold text-gray-855 uppercase tracking-wider">
                  {editingInvigilatorId ? 'Edit Invigilator' : 'Add New Invigilator'}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  {editingInvigilatorId ? 'Modify credentials for this staff member' : 'Enter credentials for a new staff member'}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={newInvigilator.name}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-805 font-bold shadow-3xs transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    name="empId"
                    value={newInvigilator.empId}
                    onChange={handleInputChange}
                    placeholder="e.g. EMP-101"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-805 font-bold shadow-3xs transition-all"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    name="dept"
                    value={newInvigilator.dept}
                    onChange={handleInputChange}
                    placeholder="e.g. Computer Science"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={newInvigilator.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 9876543210"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={newInvigilator.email}
                    onChange={handleInputChange}
                    placeholder="e.g. professor@college.edu"
                    className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 rounded-xl px-3 py-2 text-xs bg-white text-gray-850 font-bold shadow-3xs transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  {editingInvigilatorId ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  ) : (
                    <>
                      <i className="las la-plus-circle text-sm mr-1"></i> Add Invigilator
                    </>
                  )}
                </button>
                {editingInvigilatorId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="w-full bg-white hover:bg-gray-50 border border-gray-250 text-gray-700 font-bold py-2 px-4 rounded-xl shadow-3xs transition-all cursor-pointer text-xs"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};

export default Invigilators;