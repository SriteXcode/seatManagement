import React from "react";
import CustomSelect from "../common/CustomSelect";

export default function StagingBucket({
  isLoggedIn,
  showBucketSidebar,
  setShowBucketSidebar,
  bucket,
  searchRoll,
  setSearchRoll,
  handleSearchStudent,
  isSearching,
  bucketFilterKey,
  setBucketFilterKey,
  bucketFilterVal,
  setBucketFilterVal,
  uniqueBucketValues,
  bucketFilter,
  setBucketFilter,
  dragOverBucket,
  setDragOverBucket,
  handleDragStartBucket,
  setIsDraggingStudent,
  handleDropOnBucket,
  userRole,
  getFieldLabel,
  selectedStudentForMove,
  handleTapStudent,
  handleTapBucket,
  handleAssignClick,
  handleClearBucket,
}) {
  if (!isLoggedIn) return null;

  return (
    <>
      {/* Floating Staging Bucket Toggle Button */}
      {!showBucketSidebar && (
        <button
          onClick={() => setShowBucketSidebar(true)}
          title="Open Staging Bucket"
          aria-label="Open Staging Bucket"
          aria-expanded={false}
          className="fixed bottom-6 right-6 md:right-[18.5rem] z-50 bg-red-700 hover:bg-red-800 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer group"
        >
          <div className="relative flex items-center justify-center">
            <img 
              src="https://img.icons8.com/?size=50&id=Anr2RtO0yx8e&format=png&color=FFFFFF" 
              alt="Staging Bucket" 
              className="w-6 h-6 object-contain" 
            />
            {bucket.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-red-700">
                {bucket.length}
              </span>
            )}
          </div>
        </button>
      )}

      {/* Right Slide-over Staging Bucket Sidebar */}
      <div 
        className={`fixed top-0 right-0 h-screen z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-all duration-300 transform w-full sm:max-w-md ${
          showBucketSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/50 bg-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-50 rounded-lg flex items-center justify-center w-8 h-8">
              <img 
                src="https://img.icons8.com/?size=50&id=Anr2RtO0yx8e&format=png&color=B91C1C" 
                alt="Bucket Icon" 
                className="w-5 h-5 object-contain" 
              />
            </span>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Staging Bucket</h3>
              <p className="text-[10px] text-gray-500 font-semibold">{bucket.length} students stored</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bucket.length > 0 && userRole === "admin" && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all students from the staging bucket? This will delete all unallotted student records for this slot.")) {
                    handleClearBucket();
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-650 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center border border-red-200"
                title="Clear Staging Bucket"
              >
                Clear Bucket
              </button>
            )}
            <button 
              onClick={() => setShowBucketSidebar(false)}
              aria-label="Close Staging Bucket"
              className="text-gray-400 hover:text-red-700 hover:bg-red-55 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
            >
              <i className="las la-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Search & Add within Sidebar */}
        <div className="px-4 py-3 border-b border-gray-150 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search & Add Roll No..."
              value={searchRoll}
              onChange={(e) => setSearchRoll(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchStudent();
              }}
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
            />
            <button
              onClick={handleSearchStudent}
              disabled={isSearching}
              className="bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
            >
              {isSearching ? "..." : "Add"}
            </button>
          </div>
        </div>

        {/* Filter students in bucket */}
        {bucket.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-150 bg-gray-50/60 space-y-3">
            <div className="flex gap-2">
              {/* Dropdown 1: Filter Criteria Key */}
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Search By</label>
                <CustomSelect
                  value={bucketFilterKey}
                  onChange={setBucketFilterKey}
                  options={[
                    { value: "all", label: "Search All Fields" },
                    { value: "dept", label: getFieldLabel('constraint_1') },
                    { value: "sem", label: getFieldLabel('constraint_2') },
                    { value: "subject", label: "Subject" }
                  ]}
                  className="w-full z-50"
                />
              </div>

              {/* Dropdown 2: Value Selector */}
              {bucketFilterKey !== "all" && (
                <div className="flex-1 min-w-0 animate-fadeIn">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1 z-50">Select Value</label>
                  <CustomSelect
                    value={bucketFilterVal}
                    onChange={setBucketFilterVal}
                    options={[
                      { value: "", label: `All ${bucketFilterKey === "dept" ? getFieldLabel('constraint_1') : bucketFilterKey === "sem" ? getFieldLabel('constraint_2') : "Subject"}s` },
                      ...uniqueBucketValues.map(val => ({ value: val, label: val }))
                    ]}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Optional search query input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="las la-search text-gray-400 text-sm"></i>
              </span>
              <input
                type="text"
                placeholder="Type name, roll, dept..."
                value={bucketFilter}
                onChange={(e) => setBucketFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs bg-white text-black focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-semibold shadow-2xs placeholder-gray-400"
              />
            </div>
          </div>
        )}

        <div 
          className={`flex-1 overflow-y-auto p-4 transition-colors duration-205 select-none ${
            dragOverBucket ? 'bg-red-50/10 border-2 border-dashed border-red-500 m-2 rounded-xl' : ''
          } ${
            selectedStudentForMove && selectedStudentForMove.source === "seat"
              ? "cursor-pointer bg-red-50/30 border-2 border-dashed border-red-400 m-2 rounded-xl animate-pulse"
              : ""
          }`}
          onDragOver={(e) => {
            if (userRole === "admin") e.preventDefault();
          }}
          onDragEnter={() => {
            if (userRole === "admin") setDragOverBucket(true);
          }}
          onDragLeave={() => {
            if (userRole === "admin") setDragOverBucket(false);
          }}
          onDrop={(e) => {
            if (userRole === "admin") {
              setDragOverBucket(false);
              handleDropOnBucket(e);
            }
          }}
          onClick={() => {
            if (userRole === "admin" && selectedStudentForMove && selectedStudentForMove.source === "seat") {
              handleTapBucket();
            }
          }}
        >
          {(() => {
            const filteredBucket = bucket.filter(student => {
              // Apply dropdown criteria filters first
              if (bucketFilterKey !== "all" && bucketFilterVal) {
                if (bucketFilterKey === "dept") {
                  if (student.dept !== bucketFilterVal) return false;
                } else if (bucketFilterKey === "sem") {
                  if (String(student.sem) !== bucketFilterVal) return false;
                } else if (bucketFilterKey === "subject") {
                  let matchesSub = false;
                  if (Array.isArray(student.subject)) {
                    matchesSub = student.subject.includes(bucketFilterVal);
                  } else if (typeof student.subject === 'string') {
                    matchesSub = student.subject === bucketFilterVal;
                  }
                  if (!matchesSub) return false;
                }
              }

              const term = bucketFilter.toLowerCase().trim();
              if (!term) return true;
              
              const rollMatch = student.roll && student.roll.toLowerCase().includes(term);
              const nameMatch = student.name && student.name.toLowerCase().includes(term);
              const deptMatch = student.dept && student.dept.toLowerCase().includes(term);
              const semMatch = student.sem && student.sem.toString().toLowerCase().includes(term);
              
              let subjectMatch = false;
              if (Array.isArray(student.subject)) {
                subjectMatch = student.subject.some(sub => sub && sub.toLowerCase().includes(term));
              } else if (typeof student.subject === 'string') {
                subjectMatch = student.subject.toLowerCase().includes(term);
              }
              
              const metadataMatch = Object.values(student.metadata || {}).some(val => 
                val && String(val).toLowerCase().includes(term)
              );
              
              return rollMatch || nameMatch || deptMatch || semMatch || subjectMatch || metadataMatch;
            });

            if (bucket.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6 select-none animate-fadeIn">
                  <svg className="w-12 h-12 text-gray-300 mb-3 select-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <p className="text-xs font-semibold text-gray-655 select-none">Staging bucket is empty</p>
                  <p className="text-[10px] text-gray-500 mt-1 select-none">Drag placed students here from the room grids or search roll numbers to unallot them.</p>
                </div>
              );
            }

            if (filteredBucket.length === 0) {
              return (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6 select-none animate-fadeIn">
                  <svg className="w-8 h-8 text-gray-300 mb-2 select-none animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-semibold text-gray-655 select-none">No matching students found</p>
                  <p className="text-[10px] text-gray-400 mt-1 select-none">Try filtering by a different roll number or name.</p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5 animate-fadeIn select-none">
                {filteredBucket.map(student => {
                  const isSelected = selectedStudentForMove && selectedStudentForMove.studentId === student._id;
                  const prevSeat = student.previousSeat || (student.metadata && student.metadata.previousRoomName ? {
                    roomName: student.metadata.previousRoomName,
                    seatLabel: student.metadata.previousSeatLabel,
                    date: student.metadata.previousDate,
                    shift: student.metadata.previousShift
                  } : null);
                  return (
                    <div
                      key={student._id}
                      draggable={userRole === "admin"}
                      onDragStart={(e) => handleDragStartBucket(e, student)}
                      onDragEnd={() => setIsDraggingStudent(false)}
                      onClick={(e) => {
                        if (userRole === "admin") {
                          e.stopPropagation();
                          handleTapStudent(student, 'bucket');
                        }
                      }}
                      className={`p-3 bg-white border border-gray-150 rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-start sm:justify-between select-none cursor-pointer ${
                        userRole === "admin"
                          ? isSelected
                            ? "ring-2 ring-red-500 bg-red-50/20 scale-[1.01]"
                            : "hover:bg-gray-50 hover:scale-[1.01] active:scale-95"
                          : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0 select-none space-y-1.5 w-full">
                        <div>
                          <div className="font-bold text-gray-800 text-xs sm:text-sm select-none">{student.roll}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500 font-semibold mt-0.5 select-none">{student.name}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 select-none w-full">
                          <div className="text-[10px] font-bold text-red-700 bg-red-50/50 border border-red-100 rounded-md px-2 py-0.5 uppercase tracking-wider select-none max-w-full whitespace-normal break-all shrink-0">
                            {student.dept} | {getFieldLabel('constraint_2')}: {student.sem}
                          </div>
                          {prevSeat && (
                            <>
                              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-0.5 uppercase tracking-wider select-none max-w-full whitespace-normal break-all shrink-0" title={`Previously allotted to Room ${prevSeat.roomName}`}>
                                Class Name: {prevSeat.roomName}
                              </div>
                              <div className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-2 py-0.5 uppercase tracking-wider select-none max-w-full whitespace-normal break-all shrink-0" title={`Previous Seat: ${prevSeat.seatLabel}`}>
                                Previous Seat: {prevSeat.seatLabel}
                              </div>
                              <div className="text-[10px] font-bold text-blue-700 bg-blue-50/50 border border-blue-100 rounded-md px-2 py-0.5 uppercase tracking-wider select-none max-w-full whitespace-normal break-all shrink-0" title={`Previous schedule: ${prevSeat.date} (Shift ${prevSeat.shift})`}>
                                Schedule: {prevSeat.date} (S{prevSeat.shift})
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {userRole === "admin" && (
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-gray-100 pt-2.5 sm:pt-0 mt-2.5 sm:mt-0 select-none">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignClick(student);
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs border border-red-200 hover:scale-105 active:scale-95 flex-1 sm:flex-none text-center min-h-[30px]"
               title="Assign to classroom"
                          >
                            <i className="las la-user-plus text-xs"></i>
                            Assign
                          </button>
                          <div className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">
                            {isSelected ? "Selected" : "Drag"}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
