import React, { useEffect, useState, useRef } from "react";

const API = import.meta.env.VITE_API || "http://localhost:4000";

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function DutyChart({ token, trigger }) {
  const [schedules, setSchedules] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [assignmentsMap, setAssignmentsMap] = useState({});
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
      // 1. Fetch Schedules (Dates/Shifts)
      const schedRes = await fetch(`${API}/schedules`, { headers: authHeader(token) });
      const schedData = await schedRes.json();
      
      // 2. Fetch Invigilators
      const invRes = await fetch(`${API}/staff/invigilators`, { headers: authHeader(token) });
      const invData = await invRes.json();

      setSchedules(schedData);
      setInvigilators(invData);

      // 3. Fetch Assignments for each schedule
      const newMap = {}; // { invigilatorId: { date_shift: roomName } }

      const requests = schedData.map(s => 
        fetch(`${API}/staff/assignments?date=${s.date}&shift=${s.shift}`, { headers: authHeader(token) })
          .then(r => r.json())
          .then(assignments => ({ schedule: s, assignments }))
      );

      const results = await Promise.all(requests);

      results.forEach(({ schedule, assignments }) => {
        if (Array.isArray(assignments)) {
          assignments.forEach(a => {
            const invId = a.invigilator._id;
            const key = `${schedule.date}_${schedule.shift}`;
            
            if (!newMap[invId]) newMap[invId] = {};
            
            // If role is distributor, mark as Distributor, else Room Name
            const val = a.role === 'distributor' ? 'Distributor' : (a.room ? a.room.name : '-');
            newMap[invId][key] = val;
          });
        }
      });

      setAssignmentsMap(newMap);

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
      <div className="mb-4 flex justify-end">
        <button 
          onClick={downloadPDF} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2"
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
                   {/* Attempt to format date, fallback to raw string if invalid */}
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
                  const val1 = assignmentsMap[inv._id]?.[`${date}_1`];
                  const val2 = assignmentsMap[inv._id]?.[`${date}_2`];
                  
                  const getCellClass = (val) => {
                    if (val === 'Distributor') return 'text-purple-700 font-extrabold bg-purple-50';
                    if (val && val !== '-' && val !== undefined) return 'text-red-700 font-bold';
                    return 'text-gray-300';
                  };

                  return (
                    <React.Fragment key={date}>
                      <td className={`border border-gray-300 px-2 py-2 text-center ${getCellClass(val1)}`}>
                        {val1 || "-"}
                      </td>
                      <td className={`border border-gray-300 px-2 py-2 text-center ${getCellClass(val2)}`}>
                        {val2 || "-"}
                      </td>
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