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
  showToast,
}) {
  const decoded = decodeToken(token);

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
                        setActiveTab("Allotment");
                        if (showToast) showToast(`Loaded layout for ${item.date} Shift ${item.shift}`, "success");
                      }}
                      className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex-1 transition-all cursor-pointer text-center animate-fadeIn"
                    >
                      Load Layout
                    </button>
                    <button
                      onClick={() => deleteFromLibrary(item._id)}
                      className="border border-red-200 hover:bg-red-50 text-red-650 font-bold py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center"
                      title="Remove from library"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
