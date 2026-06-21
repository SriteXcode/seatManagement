import React from "react";
import { decodeToken } from "../../utils/helpers";

export default function ProfileTab({
  token,
  userRole,
  logout,
  pendingStaff,
  approveStaffMember,
  library,
  setDate,
  setShift,
  setTime,
  setSubject,
  setSelectedExamType,
  setActiveTab,
  deleteFromLibrary,
  updateLibraryItem,
  setDeptSemCombinations,
  showToast,
}) {
  const decoded = decodeToken(token);

  const [editingItem, setEditingItem] = React.useState(null);
  const [editDate, setEditDate] = React.useState("");
  const [editShift, setEditShift] = React.useState(1);
  const [editTime, setEditTime] = React.useState("");
  const [editExamType, setEditExamType] = React.useState("");
  const [editSubject, setEditSubject] = React.useState("");
  const [editCombinations, setEditCombinations] = React.useState([]);

  const startEdit = (item) => {
    setEditingItem(item._id);
    setEditDate(item.date || "");
    setEditShift(item.shift || 1);
    setEditTime(item.time || "");
    setEditExamType(item.examType || "");
    setEditSubject(item.subject || "");
    setEditCombinations(item.combinations ? JSON.parse(JSON.stringify(item.combinations)) : []);
  };

  const handleAddCombination = () => {
    setEditCombinations([...editCombinations, { dept: "", sem: "", subject: "" }]);
  };

  const handleRemoveCombination = (index) => {
    setEditCombinations(editCombinations.filter((_, idx) => idx !== index));
  };

  const handleCombinationChange = (index, field, value) => {
    const updated = editCombinations.map((c, idx) => {
      if (idx === index) {
        return { ...c, [field]: value };
      }
      return c;
    });
    setEditCombinations(updated);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editDate || !editShift) {
      if (showToast) showToast("Date and Shift are required.", "error");
      return;
    }
    const filteredCombinations = editCombinations.filter(c => c.dept.trim() || c.sem.trim() || c.subject.trim());
    
    await updateLibraryItem(editingItem, {
      date: editDate,
      shift: Number(editShift),
      time: editTime,
      examType: editExamType,
      subject: editSubject,
      combinations: filteredCombinations
    });
    setEditingItem(null);
  };

  return (
    <div id="Profile">
      <div className="max-w-4xl mx-auto space-y-6 text-left">
        {/* Header / Info card */}
        <section className="bg-white shadow rounded-lg p-6 border border-gray-150">
          <div className="flex flex-wrap items-center justify-between gap-4 select-none">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-2xl font-extrabold shadow-sm border border-red-200">
                {decoded?.username ? decoded.username[0].toUpperCase() : "A"}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {decoded?.username || "Admin User"}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {userRole === "admin" ? "Administrator Profile" : "Staff Profile"}
                </p>
                {decoded?.adminCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-red-750 uppercase tracking-wider">Unique Org Code (Invite):</span>
                    <span className="text-xs bg-red-50 text-red-750 font-bold px-2.5 py-1 rounded-lg border border-red-100 font-mono tracking-wider">
                      {decoded.adminCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl text-sm transition-all duration-200 flex items-center gap-1.5 shadow-sm cursor-pointer animate-fadeIn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1" />
              </svg>
              Logout
            </button>
          </div>
        </section>

        {/* Staff Registration Requests */}
        {userRole === "admin" && (
          <section className="bg-white shadow rounded-lg p-6 border border-gray-150 animate-fadeIn">
            <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4 select-none">
              <svg className="w-5 h-5 text-red-750" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Staff Registration Requests
            </h3>

            {pendingStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 select-none">
                <p className="text-xs font-semibold text-gray-500">No pending staff registration requests.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStaff.map((staff) => (
                  <div key={staff._id} className="p-4 border border-gray-200 bg-white rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{staff.name} (@{staff.username})</h4>
                      <div className="text-xs text-gray-650 space-y-0.5 mt-1 leading-relaxed">
                        <div><strong>Email:</strong> {staff.email} | <strong>Phone:</strong> {staff.phone}</div>
                        <div><strong>Address:</strong> {staff.address}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => approveStaffMember(staff._id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all cursor-pointer text-center"
                    >
                      Approve Staff
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Saved Library Schedules list */}
        <section className="bg-white shadow rounded-lg p-6 border border-gray-150">
          <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4 select-none">
            <svg className="w-5 h-5 text-red-750" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Saved Arrangements Library
          </h3>
          
          {library.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 select-none animate-fadeIn">
              <svg className="w-12 h-12 text-gray-305 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <p className="text-sm font-semibold text-gray-500">Your library is empty.</p>
              <p className="text-xs text-gray-400 mt-1">Schedules saved to your library will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {library.map((item) => (
                <div key={item._id} className="p-4 border border-gray-200 bg-white rounded-xl shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 select-none">
                      <span className="font-bold text-xs text-gray-800">{item.date}</span>
                      <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        {item.examType || "College"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-700 select-none">
                      Shift {item.shift} {item.time ? `(${item.time})` : ''}
                    </div>
                    {item.subject && (
                      <div className="text-[11px] font-semibold text-gray-600 mt-1 truncate select-none">
                        Subject: {item.subject}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-505 mt-2.5 pt-2 border-t border-gray-100 leading-normal space-y-1">
                      <span className="font-bold block text-gray-600 mb-1 select-none">Combinations:</span>
                      {item.combinations && item.combinations.length > 0 ? (
                        item.combinations.map((c, idx) => (
                          <div key={idx} className="truncate font-semibold text-gray-700 text-[10px]">
                            • {c.dept} Sem {c.sem} {c.subject ? `(${c.subject})` : ''}
                          </div>
                        ))
                      ) : (
                        <span className="italic select-none">No combinations.</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-gray-100 pt-3 select-none">
                    <button
                      onClick={() => {
                        setDate(item.date);
                        setShift(item.shift);
                        if (item.time) setTime(item.time);
                        if (item.subject) setSubject(item.subject);
                        if (item.examType) {
                          setSelectedExamType(item.examType);
                          localStorage.setItem("selectedExamType", item.examType);
                        }
                        if (item.combinations && setDeptSemCombinations) {
                          setDeptSemCombinations(item.combinations);
                        }
                        setActiveTab("Allotment");
                        if (showToast) showToast(`Loaded layout for ${item.date} Shift ${item.shift}`, "success");
                      }}
                      className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex-1 transition-all cursor-pointer text-center animate-fadeIn"
                    >
                      Load Layout
                    </button>
                    {userRole === "admin" && (
                      <>
                        <button
                          onClick={() => startEdit(item)}
                          className="border border-gray-200 hover:bg-gray-50 text-gray-650 font-bold py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center"
                          title="Edit schedule"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to remove this schedule from your library?")) {
                              deleteFromLibrary(item._id);
                            }
                          }}
                          className="border border-red-200 hover:bg-red-50 text-red-650 font-bold py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center"
                          title="Remove from library"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Edit saved schedule modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn select-none">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-2xl w-full max-h-[90vh] flex flex-col text-left">
            <div className="p-6 border-b border-gray-150 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Saved Arrangement Schedule
              </h3>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-650 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-650 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Shift *</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-medium"
                  >
                    <option value={1}>Shift 1</option>
                    <option value={2}>Shift 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00-13:00"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Exam Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm, Practical"
                    value={editExamType}
                    onChange={(e) => setEditExamType(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science Theory"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 font-medium"
                />
              </div>

              <div className="border-t border-gray-150 pt-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-700">Combinations</h4>
                  <button
                    type="button"
                    onClick={handleAddCombination}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1 px-3 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Combination
                  </button>
                </div>

                {editCombinations.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">No combinations added yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {editCombinations.map((comb, index) => (
                      <div key={index} className="flex gap-2 items-center bg-gray-50/50 p-2.5 rounded-xl border border-gray-200 animate-fadeIn">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Dept (e.g. CSE)"
                            value={comb.dept}
                            onChange={(e) => handleCombinationChange(index, "dept", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Sem (e.g. 5)"
                            value={comb.sem}
                            onChange={(e) => handleCombinationChange(index, "sem", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Subject (Optional)"
                            value={comb.subject}
                            onChange={(e) => handleCombinationChange(index, "subject", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2.5 py-1 text-xs focus:outline-hidden focus:ring-1 focus:ring-red-500 font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCombination(index)}
                          className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove combination"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end border-t border-gray-150 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-xl text-sm transition-all cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
