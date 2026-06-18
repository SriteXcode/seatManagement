import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API || "http://localhost:4000";

const Invigilators = ({ token, invigilators, onAdd, onAssign, onRefresh, triggerConfirm, showToast, userRole = 'admin' }) => {
  const [newInvigilator, setNewInvigilator] = useState({
    name: '',
    empId: '',
    dept: '',
    phone: '',
    email: '',
  });
  const [invigilatorsPerRoom, setInvigilatorsPerRoom] = useState(1);
  const [distributors, setDistributors] = useState(2);
  
  // Data for the "dropdown" / list
  const [availableOptions, setAvailableOptions] = useState([]); // [{ id, date, shift, roomId, roomName, label }]
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState([]);

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
        // 1. Get Schedules
        const schedRes = await fetch(`${API}/schedules`, { headers: { Authorization: `Bearer ${token}` } });
        const schedules = await schedRes.json();
        
        if (!Array.isArray(schedules)) throw new Error("Failed to load schedules");

        // 2. For each schedule, get allotments to find rooms
        const options = [];
        let optId = 1;

        for (const s of schedules) {
            // Fetch allotments for this date/shift
            const allotRes = await fetch(`${API}/allotments?shift=${s.shift}&date=${s.date}`, { headers: { Authorization: `Bearer ${token}` } });
            const allotments = await allotRes.json();
            
            if (Array.isArray(allotments) && allotments.length > 0) {
                // Extract unique rooms
                const distinctRooms = {};
                allotments.forEach(a => {
                    const rId = a.room._id || a.room; // handle populated or not
                    const rName = a.room.name || "Unknown";
                    distinctRooms[rId] = rName;
                });

                // Create options
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

  // Load options on mount if token exists
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

  const handleAddInvigilator = (e) => {
    e.preventDefault();
    if (newInvigilator.name.trim() && newInvigilator.empId.trim()) {
      onAdd(newInvigilator);
      setNewInvigilator({ name: '', empId: '', dept: '', phone: '', email: '' });
    } else {
      if (showToast) {
        showToast('Name and Employee ID are required.', 'error');
      } else {
        alert('Name and Employee ID are required.');
      }
    }
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

    // Transform selected options into the targetSchedules format:
    // [{ date, shift, roomIds: [id1, id2...] }]
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

    const totalRoomsCount = selectedOptionIds.length; // Each option is one room-slot
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

  return (
    <section id="Invigilators" className="p-4 bg-white text-black rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Invigilators</h2>
      
      {/* Assignment Selection Area */}
      {userRole === "admin" && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-red-800">Select Date/Shift/Room Combinations</h3>
              <button 
                  onClick={loadOptions} 
                  className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50"
              >
                  {loadingOptions ? "Loading..." : "Refresh Options"}
              </button>
          </div>

          {loadingOptions ? (
              <div className="text-center py-4 text-gray-500">Loading available schedule options...</div>
          ) : availableOptions.length === 0 ? (
              <div className="text-center py-4 text-gray-500 italic">
                  No scheduled allotments found. Generate some allotments first.
              </div>
          ) : (
              <div className="bg-white border rounded p-2 max-h-60 overflow-y-auto">
                  <div className="flex justify-end mb-2 border-b pb-1">
                      <button 
                          onClick={toggleAllOptions} 
                          className="text-xs text-blue-600 hover:underline font-medium"
                      >
                          {selectedOptionIds.length === availableOptions.length ? "Deselect All" : "Select All"}
                      </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableOptions.map(opt => (
                          <label key={opt.id} className={`flex items-start gap-2 text-sm p-2 rounded border cursor-pointer hover:bg-red-50 transition-colors ${selectedOptionIds.includes(opt.id) ? 'bg-red-50 border-red-300' : 'border-gray-100'}`}>
                              <input 
                                  type="checkbox" 
                                  checked={selectedOptionIds.includes(opt.id)}
                                  onChange={() => toggleOption(opt.id)}
                                  className="mt-1"
                              />
                              <div className="flex flex-col">
                                  <span className="font-semibold">{opt.date}</span>
                                  <span className="text-xs text-gray-600">Shift {opt.shift} — {opt.roomName}</span>
                              </div>
                          </label>
                      ))}
                  </div>
              </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 justify-end animate-fadeIn">
                 <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={invigilatorsPerRoom}
                    onChange={(e) => setInvigilatorsPerRoom(Number(e.target.value))}
                    className="p-2 border rounded-md w-16"
                    min="1"
                  />
                  <span className="text-sm">Invig./Room</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={distributors}
                    onChange={(e) => setDistributors(Number(e.target.value))}
                    className="p-2 border rounded-md w-16"
                    min="0"
                  />
                  <span className="text-sm">Distributors</span>
                </div>
                <button
                  onClick={handleAssign}
                  disabled={selectedOptionIds.length === 0}
                  className={`font-bold py-2 px-6 rounded shadow cursor-pointer ${selectedOptionIds.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800 text-white'}`}
                >
                  Assign Invigilators
                </button>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
          <button
            onClick={onRefresh}
            className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded"
          >
            Refetch List
          </button>
      </div>

      {userRole === "admin" && (
        <form onSubmit={handleAddInvigilator} className="mb-4 p-4 border rounded-lg bg-white animate-fadeIn">
          <h3 className="text-xl font-semibold mb-4">Add New Invigilator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="name"
              value={newInvigilator.name}
              onChange={handleInputChange}
              placeholder="Name (Required)"
              className="p-2 border rounded-md text-black"
              required
            />
            <input
              type="text"
              name="empId"
              value={newInvigilator.empId}
              onChange={handleInputChange}
              placeholder="Employee ID (Required)"
              className="p-2 border rounded-md text-black"
              required
            />
            <input
              type="text"
              name="dept"
              value={newInvigilator.dept}
              onChange={handleInputChange}
              placeholder="Department"
              className="p-2 border rounded-md text-black"
            />
            <input
              type="text"
              name="phone"
              value={newInvigilator.phone}
              onChange={handleInputChange}
              placeholder="Phone"
              className="p-2 border rounded-md text-black"
            />
            <input
              type="email"
              name="email"
              value={newInvigilator.email}
              onChange={handleInputChange}
              placeholder="Email"
              className="p-2 border rounded-md text-black"
            />
          </div>
          <button
            type="submit"
            className="mt-4 bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-md cursor-pointer"
          >
            Add Invigilator
          </button>
        </form>
      )}
      <div>
        <h3 className="text-xl font-semibold mb-2">Current Invigilators</h3>
        {invigilators.length > 0 ? (
          <ul className="list-disc pl-5">
            {invigilators.map((invigilator) => (
              <li key={invigilator._id} className="mb-1">
                {invigilator.name} ({invigilator.empId})
              </li>
            ))}
          </ul>
        ) : (
          <p>No invigilators found. Add some using the form above.</p>
        )}
      </div>
    </section>
  );
};

export default Invigilators;