import React, { useEffect, useState, useRef } from "react";

const API = import.meta.env.VITE_API || "http://localhost:4000";

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DutyChart({ token, trigger }) {
  const [schedules, setSchedules] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [localAssignmentsMap, setLocalAssignmentsMap] = useState({});
  const [originalAssignmentsMap, setOriginalAssignmentsMap] = useState({});
  const [activeRoomsMap, setActiveRoomsMap] = useState({});
  const [dirtyKeys, setDirtyKeys] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, trigger]);

  async function loadData() {
    setLoading(true);
    try {
      // 1. Fetch Schedules
      const schedRes = await fetch(`${API}/schedules`, { headers: authHeader(token) });
      const schedData = await schedRes.json();
      
      // 2. Fetch Invigilators
      const invRes = await fetch(`${API}/staff/invigilators`, { headers: authHeader(token) });
      const invData = await invRes.json();

      setSchedules(schedData);
      setInvigilators(invData);

      // 3. Fetch Allotments for each schedule to know active rooms
      const allotmentsRequests = schedData.map(s =>
        fetch(`${API}/allotments?shift=${s.shift}&date=${s.date}`, { headers: authHeader(token) })
          .then(r => r.json())
          .then(allotments => ({ schedule: s, allotments }))
      );
      const allotmentsResults = await Promise.all(allotmentsRequests);
      
      const newActiveRoomsMap = {};
      allotmentsResults.forEach(({ schedule, allotments }) => {
        const key = `${schedule.date}_${schedule.shift}`;
        const distinctRooms = {};
        if (Array.isArray(allotments)) {
          allotments.forEach(a => {
            if (a.room) {
              const rId = a.room._id || a.room;
              const rName = a.room.name || "Unknown";
              distinctRooms[rId] = rName;
            }
          });
        }
        newActiveRoomsMap[key] = Object.entries(distinctRooms).map(([_id, name]) => ({ _id, name }));
      });
      setActiveRoomsMap(newActiveRoomsMap);

      // 4. Fetch Assignments for each schedule
      const newMap = {}; // { [date_shift]: { [invId]: { role, roomId, roomName } } }

      const requests = schedData.map(s => 
        fetch(`${API}/staff/assignments?date=${s.date}&shift=${s.shift}`, { headers: authHeader(token) })
          .then(r => r.json())
          .then(assignments => ({ schedule: s, assignments }))
      );

      const results = await Promise.all(requests);

      results.forEach(({ schedule, assignments }) => {
        const key = `${schedule.date}_${schedule.shift}`;
        newMap[key] = {};

        // Pre-populate all invigilators with 'none'
        invData.forEach(inv => {
          newMap[key][inv._id] = { role: 'none', roomId: null, roomName: '-' };
        });

        if (Array.isArray(assignments)) {
          assignments.forEach(a => {
            if (a.invigilator) {
              const invId = a.invigilator._id || a.invigilator;
              const role = a.role || 'room';
              const roomId = a.room ? (a.room._id || a.room) : null;
              const roomName = role === 'distributor' ? 'Distributor' : (a.room ? (a.room.name || 'Unknown') : '-');
              newMap[key][invId] = { role, roomId, roomName };
            }
          });
        }
      });

      setLocalAssignmentsMap(newMap);
      setOriginalAssignmentsMap(JSON.parse(JSON.stringify(newMap)));
      setDirtyKeys(new Set());

    } catch (e) {
      console.error("Error loading duty chart:", e);
    } finally {
      setLoading(false);
    }
  }

  const downloadPDF = async () => {
    const element = chartRef.current;
    const opt = {
      margin: 0.2,
      filename: 'invigilation_duty_chart.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' }
    };
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf().set(opt).from(element).save();
  };

  const toggleEditMode = () => {
    if (isEditMode && dirtyKeys.size > 0) {
      const confirmDiscard = window.confirm("You have unsaved changes. Discard them and exit edit mode?");
      if (confirmDiscard) {
        handleDiscard();
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(!isEditMode);
    }
  };

  const handleDiscard = () => {
    setLocalAssignmentsMap(JSON.parse(JSON.stringify(originalAssignmentsMap)));
    setDirtyKeys(new Set());
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const keysToSave = Array.from(dirtyKeys);
      for (const key of keysToSave) {
        const [date, shiftStr] = key.split('_');
        const shift = Number(shiftStr);
        
        const matchingSchedule = schedules.find(s => s.date === date && s.shift === shift);
        const timeVal = matchingSchedule ? matchingSchedule.time : "10:00 AM";

        const roomMap = {};
        const distributors = [];

        const keyAssignments = localAssignmentsMap[key] || {};
        Object.entries(keyAssignments).forEach(([invId, entry]) => {
          if (entry.role === 'room' && entry.roomId) {
            if (!roomMap[entry.roomId]) roomMap[entry.roomId] = [];
            roomMap[entry.roomId].push(invId);
          } else if (entry.role === 'distributor') {
            distributors.push(invId);
          }
        });

        const assignmentsPayload = Object.entries(roomMap).map(([roomId, invigilatorIds]) => ({
          room: roomId,
          invigilators: invigilatorIds
        }));

        const res = await fetch(`${API}/staff/assign`, {
          method: "POST",
          headers: {
            ...authHeader(token),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            date,
            shift,
            time: timeVal,
            assignments: assignmentsPayload,
            distributors
          })
        });

        const result = await res.json();
        if (!res.ok || !result.ok) {
          throw new Error(result.error || "Failed to save duty modifications.");
        }
      }

      setOriginalAssignmentsMap(JSON.parse(JSON.stringify(localAssignmentsMap)));
      setDirtyKeys(new Set());
      alert("Duty chart changes saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving duty chart modifications: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e, invId, key, assignment) => {
    if (!isEditMode) return;
    e.dataTransfer.setData("text/plain", JSON.stringify({ invId, key, assignment }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, targetKey) => {
    if (!isEditMode) return;
    e.preventDefault();
  };

  const handleDrop = (e, targetInvId, targetKey) => {
    if (!isEditMode) return;
    e.preventDefault();

    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      const { invId: sourceInvId, key: sourceKey, assignment: sourceAssignment } = JSON.parse(dataStr);

      if (sourceKey !== targetKey) {
        alert("Reassignments can only be done within the same date and shift.");
        return;
      }

      if (sourceInvId === targetInvId) return;

      const sourceVal = localAssignmentsMap[sourceKey]?.[sourceInvId] || { role: 'none', roomId: null, roomName: '-' };
      const targetVal = localAssignmentsMap[sourceKey]?.[targetInvId] || { role: 'none', roomId: null, roomName: '-' };

      setLocalAssignmentsMap(prev => {
        const next = { ...prev };
        next[sourceKey] = {
          ...next[sourceKey],
          [sourceInvId]: targetVal,
          [targetInvId]: sourceVal
        };
        return next;
      });

      setDirtyKeys(prev => {
        const next = new Set(prev);
        next.add(sourceKey);
        return next;
      });

    } catch (err) {
      console.error("Error during drop:", err);
    }
  };

  const handleSelectChange = (invId, key, val) => {
    setLocalAssignmentsMap(prev => {
      const next = { ...prev };
      const nextKeyData = { ...next[key] };

      let updatedVal;
      if (val === 'none') {
        updatedVal = { role: 'none', roomId: null, roomName: '-' };
      } else if (val === 'distributor') {
        updatedVal = { role: 'distributor', roomId: null, roomName: 'Distributor' };
      } else {
        const rooms = activeRoomsMap[key] || [];
        const room = rooms.find(r => r._id === val);
        updatedVal = { role: 'room', roomId: val, roomName: room ? room.name : 'Unknown' };
      }

      nextKeyData[invId] = updatedVal;
      next[key] = nextKeyData;
      return next;
    });

    setDirtyKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const renderCell = (inv, key, val) => {
    const activeRooms = activeRoomsMap[key] || [];

    const getCellClass = (valName) => {
      if (valName === 'Distributor') return 'text-purple-700 font-extrabold bg-purple-50';
      if (valName && valName !== '-' && valName !== undefined) return 'text-red-700 font-bold';
      return 'text-gray-300';
    };

    if (!isEditMode) {
      return (
        <td className={`border border-gray-300 px-2 py-2 text-center ${getCellClass(val.roomName)}`}>
          {val.roomName || "-"}
        </td>
      );
    }

    return (
      <td
        className="border border-gray-300 p-1 text-center bg-gray-50/50 hover:bg-gray-100/80 transition-colors"
        draggable={true}
        onDragStart={(e) => handleDragStart(e, inv._id, key, val)}
        onDragOver={(e) => handleDragOver(e, key)}
        onDrop={(e) => handleDrop(e, inv._id, key)}
      >
        <div className="flex items-center gap-1 justify-center">
          <div className="text-gray-400 hover:text-gray-600 transition-colors py-1 cursor-grab active:cursor-grabbing shrink-0 select-none">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          
          <select
            value={val.role === 'room' ? (val.roomId || '') : val.role}
            onChange={(e) => handleSelectChange(inv._id, key, e.target.value)}
            className="bg-white border border-gray-250 rounded-lg py-1 px-1 text-[11px] font-bold text-gray-700 shadow-4xs focus:outline-none focus:ring-1 focus:ring-red-500/20 focus:border-red-500 min-w-[90px] max-w-[130px] cursor-pointer"
          >
            <option value="none">- (None)</option>
            <option value="distributor">Distributor</option>
            {activeRooms.map(room => (
              <option key={room._id} value={room._id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      </td>
    );
  };

  // Group schedules by date
  const dates = {};
  schedules.forEach(s => {
    if (!dates[s.date]) dates[s.date] = [];
    if (!dates[s.date].includes(s.shift)) dates[s.date].push(s.shift);
  });
  
  Object.keys(dates).forEach(d => dates[d].sort());
  const sortedDates = Object.keys(dates).sort();

  if (loading) return <div className="p-4 text-gray-600">Loading Duty Chart...</div>;
  if (!schedules.length) return <div className="p-4 text-gray-600">No schedules generated yet.</div>;

  return (
    <div>
      {/* Alert for unsaved changes */}
      {dirtyKeys.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>You have unsaved changes in {dirtyKeys.size} exam session(s).</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={saving}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
                  Saving...
                </>
              ) : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex justify-end gap-3">
        {/* Toggle Edit Mode */}
        <button
          onClick={toggleEditMode}
          className={`font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs transition-colors cursor-pointer ${
            isEditMode
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEditMode ? "M6 18L18 6M6 6l12 12" : "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"} />
          </svg>
          {isEditMode ? "Exit Edit Mode" : "Edit Duty Chart"}
        </button>

        <button 
          onClick={downloadPDF} 
          disabled={isEditMode}
          className={`text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs ${
            isEditMode
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
          title={isEditMode ? "Exit Edit Mode to download PDF" : "Download PDF Report"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download PDF
        </button>
      </div>
      
      <div ref={chartRef} className="overflow-x-auto p-4 bg-white rounded shadow-sm">
        <h2 className="text-3xl font-extrabold text-center mb-6 text-red-800 tracking-tight uppercase">Invigilation Duty Chart</h2>
        
        <table className="min-w-full border-collapse text-sm border-2 border-red-800">
          <thead>
            <tr className="bg-red-800 text-white">
              <th className="border border-red-600 px-4 py-3 text-left font-bold sticky left-0 z-20 shadow-md bg-red-800 w-64" rowSpan={2}>
                Invigilator Name
              </th>
              {sortedDates.map(date => (
                <th key={date} className="border border-red-600 px-4 py-2 text-center font-bold text-lg" colSpan={2}>
                   {(() => {
                      try {
                        return new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      } catch {
                        return date;
                      }
                   })()}
                </th>
              ))}
            </tr>
            <tr className="bg-red-100 text-red-900">
              {sortedDates.map(date => (
                <React.Fragment key={date}>
                  <th className="border border-red-300 px-2 py-1 text-center font-semibold w-24">Shift 1</th>
                  <th className="border border-red-300 px-2 py-1 text-center font-semibold w-24">Shift 2</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {invigilators.map((inv, idx) => (
              <tr key={inv._id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-red-50'} hover:bg-yellow-50 transition-colors`}>
                <td className={`border border-gray-300 px-4 py-2 font-medium sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50'} text-gray-800 shadow-sm border-r-2 border-r-red-200`}>
                  {inv.name}
                </td>
                {sortedDates.map(date => {
                  const key1 = `${date}_1`;
                  const key2 = `${date}_2`;
                  const val1 = localAssignmentsMap[key1]?.[inv._id] || { role: 'none', roomId: null, roomName: '-' };
                  const val2 = localAssignmentsMap[key2]?.[inv._id] || { role: 'none', roomId: null, roomName: '-' };
                  
                  return (
                    <React.Fragment key={date}>
                      {renderCell(inv, key1, val1)}
                      {renderCell(inv, key2, val2)}
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-4 text-xs text-gray-500 text-right italic">
          Generated on {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}