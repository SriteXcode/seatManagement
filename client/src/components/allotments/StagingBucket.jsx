import React from "react";

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
          className="fixed bottom-6 right-6 z-40 bg-red-700 hover:bg-red-800 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer group"
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
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
        className={`fixed top-0 right-0 h-screen z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-all duration-300 transform w-full max-w-[20rem] sm:max-w-md ${
          showBucketSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/50 bg-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-red-50 text-red-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Staging Bucket</h3>
              <p className="text-[10px] text-gray-500 font-semibold">{bucket.length} students stored</p>
            </div>
          </div>
          <button 
            onClick={() => setShowBucketSidebar(false)}
            aria-label="Close Staging Bucket"
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
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
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 animate-fadeIn space-y-2">
            <div className="flex gap-2">
              {/* Dropdown 1: Filter Criteria Key */}
              <select
                value={bucketFilterKey}
                onChange={(e) => setBucketFilterKey(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold cursor-pointer"
              >
                <option value="all">Search All Fields</option>
                <option value="dept">{getFieldLabel('constraint_1')}</option>
                <option value="sem">{getFieldLabel('constraint_2')}</option>
                <option value="subject">Subject</option>
              </select>

              {/* Dropdown 2: Value Selector */}
              {bucketFilterKey !== "all" && (
                <select
                  value={bucketFilterVal}
                  onChange={(e) => setBucketFilterVal(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold animate-fadeIn cursor-pointer"
                >
                  <option value="">
                    All {bucketFilterKey === "dept" ? getFieldLabel('constraint_1') : bucketFilterKey === "sem" ? getFieldLabel('constraint_2') : "Subject"}s
                  </option>
                  {uniqueBucketValues.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Optional search query input */}
            <input
              type="text"
              placeholder="Filter by name or roll..."
              value={bucketFilter}
              onChange={(e) => setBucketFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
            />
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
                      className={`p-3 bg-white border border-gray-150 rounded-xl shadow-xs transition-all flex items-center justify-between select-none cursor-pointer ${
                        userRole === "admin"
                          ? isSelected
                            ? "ring-2 ring-red-500 bg-red-50/20 scale-[1.01]"
                            : "hover:bg-gray-50 hover:scale-[1.01] active:scale-95"
                          : ""
                      }`}
                    >
                      <div className="select-none">
                        <div className="font-bold text-gray-800 text-xs select-none">{student.roll}</div>
                        <div className="text-[10px] text-gray-500 font-semibold mt-0.5 select-none">{student.name}</div>
                        <div className="text-[9px] font-bold text-red-700 bg-red-50/50 border border-red-100 rounded-md px-1.5 py-0.5 inline-block mt-1 uppercase tracking-wider select-none">
                          {student.dept} | {getFieldLabel('constraint_2')}: {student.sem}
                        </div>
                      </div>
                      {userRole === "admin" && (
                        <div className="text-[9px] text-gray-450 font-bold uppercase tracking-wider select-none">
                          {isSelected ? "Selected" : "Drag"}
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
