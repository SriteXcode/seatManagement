import React, { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";
import Invigilators from "./components/Invigilators";
import Layout from "./components/Layout";
import Register from "./components/Register";
import RoomPreview from "./components/RoomPreview";
import DutyChart from "./components/DutyChart";

const API = import.meta.env.VITE_API || "http://localhost:4000";

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function prettySeatLabel(roomName, seatCode, roll) {
  return `${roomName}.-${seatCode}-StudentRollno(${roll})`;
}
// Prefix with underscore to satisfy the eslint unused variable rule since it is defined but not used.
const _unusedPrettySeatLabel = prettySeatLabel;

function getSeatLabel(rowIndex, colIndex) {
  let n = rowIndex + 1; // 1-based row
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${colIndex}`;
}

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    let isLoginRequest = false;
    try {
      const url = args[0];
      const urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : (url ? String(url) : ""));
      if (urlStr && urlStr.includes('/auth/login')) {
        isLoginRequest = true;
      }
    } catch {
      // ignore
    }
    if (!isLoginRequest) {
      window.dispatchEvent(new CustomEvent("unauthorized-access"));
    }
  }
  return response;
};

function useAuth() {
  const [token, setToken] = useState(() => {
    const t = localStorage.getItem("token");
    if (isTokenExpired(t)) {
      localStorage.removeItem("token");
      return "";
    }
    return t;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken("");
    };
    window.addEventListener("unauthorized-access", handleUnauthorized);
    return () => {
      window.removeEventListener("unauthorized-access", handleUnauthorized);
    };
  }, []);

  const login = (t) => {
    if (isTokenExpired(t)) {
      setToken("");
    } else {
      setToken(t);
    }
  };
  const logout = () => setToken("");
  return { token, login, logout };
}

function getDeptColor(dept, sem) {
  const colors = [
    "bg-red-200", "bg-yellow-200", "bg-green-200", "bg-blue-200",
    "bg-indigo-200", "bg-purple-200", "bg-pink-200", "bg-red-300",
    "bg-yellow-300", "bg-green-300", "bg-blue-300", "bg-indigo-300",
    "bg-purple-300", "bg-pink-300",
  ];
  if (!dept || !sem) return "";
  const str = `${dept}-${sem}`;
  const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function FilterControls({ allotments, onFilterChange, getFieldLabel }) {
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
        <div className="flex flex-wrap gap-2 mt-1">
          {depts.map(dept => (
            <label key={dept} className="flex items-center gap-1 text-xs text-gray-650 font-medium">
              <input
                type="checkbox"
                checked={selectedDepts.includes(dept)}
                onChange={() => handleDeptChange(dept)}
                className="rounded text-red-700 w-3.5 h-3.5 focus:ring-red-500"
              />
              {dept}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-gray-800 text-xs">Filter by {getFieldLabel ? getFieldLabel('constraint_2') : 'Semester'}</h4>
        <div className="flex flex-wrap gap-2 mt-1">
          {sems.map(sem => (
            <label key={sem} className="flex items-center gap-1 text-xs text-gray-650 font-medium">
              <input
                type="checkbox"
                checked={selectedSems.includes(sem)}
                onChange={() => handleSemChange(sem)}
                className="rounded text-red-700 w-3.5 h-3.5 focus:ring-red-500"
              />
              {sem}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function CheckboxGroup({ options, selected, onChange, label }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(o => o !== opt));
    else onChange([...selected, opt]);
  };
  const selectAll = () => onChange(options);
  const selectNone = () => onChange([]);
  
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs space-x-1">
          <button onClick={selectAll} className="text-blue-600 hover:underline">All</button>
          <button onClick={selectNone} className="text-blue-600 hover:underline">None</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto border p-2 rounded bg-gray-50">
        {options.map(o => (
          <label key={o} className="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { token, login, logout } = useAuth();
  const decoded = decodeToken(token);
  const userRole = decoded?.role || "admin";
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showRegister, setShowRegister] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [rooms, setRooms] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [shift, setShift] = useState(1);
  const [seed, setSeed] = useState(1);
  const [useDistancing, setUseDistancing] = useState(false);
  const [showDistancingModal, setShowDistancingModal] = useState(false);
  const [isLayoutSettingsLocked, setIsLayoutSettingsLocked] = useState(true);
  const [rowGrouping, setRowGrouping] = useState(0);
  const [colGrouping, setColGrouping] = useState(2);
  const [previewRoomId, setPreviewRoomId] = useState("");
  const [gapType, setGapType] = useState("empty-seat");
  
  // NEW STATE (Restored)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("10:00");
  const [subject, setSubject] = useState("");
  const [meta, setMeta] = useState({ depts: [], sems: [], subjects: [] });

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedComboSubject, setSelectedComboSubject] = useState('');
  const [deptSemCombinations, setDeptSemCombinations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [library, setLibrary] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [roomSchedules, setRoomSchedules] = useState({});

  const [loading, setLoading] = useState(false);
  const [movieRoomPreview, setMovieRoomPreview] = useState(null);
  const [filters, setFilters] = useState(null);
  const [invigAssignments, setInvigAssignments] = useState([]);
  const [distributors, setDistributors] = useState([]);

  // Drag and drop / Excel parsing state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [parsedCsvText, setParsedCsvText] = useState("");
  const [showManualPaste, setShowManualPaste] = useState(false);
  const fileInputRef = useRef(null);

  // Staging bucket and drag-drop rearrangement states
  const [bucket, setBucket] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchRoll, setSearchRoll] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dragOverBucket, setDragOverBucket] = useState(false);
  const [dragOverSeatKey, setDragOverSeatKey] = useState(null);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const [gapAction, setGapAction] = useState("remove-seats"); // "remove-seats" or "bring-together"
  const [showBucketSidebar, setShowBucketSidebar] = useState(false);
  const [bucketFilter, setBucketFilter] = useState("");
  const [bucketFilterKey, setBucketFilterKey] = useState("all");
  const [bucketFilterVal, setBucketFilterVal] = useState("");

  // Exam Configs and Dynamic Custom Fields State
  const [examConfigs, setExamConfigs] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState("College");

  // Student directory states
  const [allStudents, setAllStudents] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ roll: "", name: "", dept: "", sem: "", subject: "", examType: "College" });
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentFilterDept, setStudentFilterDept] = useState("");
  const [studentFilterSem, setStudentFilterSem] = useState("");
  const [studentFilterExamType, setStudentFilterExamType] = useState("");
  const [studentFilterSubject, setStudentFilterSubject] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearchQuery, studentFilterDept, studentFilterSem, studentFilterExamType, studentFilterSubject]);

  const uniqueDepts = React.useMemo(() => {
    const s = new Set();
    if (meta && Array.isArray(meta.depts)) {
      meta.depts.forEach(d => d && s.add(d));
    }
    allStudents.forEach(st => st.dept && s.add(st.dept));
    return Array.from(s).sort();
  }, [allStudents, meta]);

  const uniqueSems = React.useMemo(() => {
    const s = new Set();
    if (meta && Array.isArray(meta.sems)) {
      meta.sems.forEach(sem => sem !== undefined && sem !== null && s.add(String(sem)));
    }
    allStudents.forEach(st => st.sem !== undefined && st.sem !== null && s.add(String(st.sem)));
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents, meta]);

  const uniqueExamTypes = React.useMemo(() => {
    const s = new Set();
    if (Array.isArray(examConfigs)) {
      examConfigs.forEach(c => c.examType && s.add(c.examType));
    }
    allStudents.forEach(st => st.examType && s.add(st.examType));
    if (s.size === 0) {
      s.add("College");
      s.add("School");
      s.add("Competitive");
    }
    return Array.from(s).sort();
  }, [allStudents, examConfigs]);

  const uniqueSubjects = React.useMemo(() => {
    const s = new Set();
    if (meta && Array.isArray(meta.subjects)) {
      meta.subjects.forEach(sub => sub && s.add(sub));
    }
    allStudents.forEach(st => {
      if (Array.isArray(st.subject)) {
        st.subject.forEach(sub => sub && s.add(sub));
      } else if (typeof st.subject === 'string' && st.subject) {
        s.add(st.subject);
      }
    });
    return Array.from(s).sort();
  }, [allStudents, meta]);

  const filteredStudents = React.useMemo(() => {
    return allStudents.filter(st => {
      if (studentSearchQuery.trim()) {
        const query = studentSearchQuery.toLowerCase();
        const rollMatch = st.roll && st.roll.toLowerCase().includes(query);
        const nameMatch = st.name && st.name.toLowerCase().includes(query);
        if (!rollMatch && !nameMatch) return false;
      }
      if (studentFilterDept && st.dept !== studentFilterDept) {
        return false;
      }
      if (studentFilterSem && String(st.sem) !== studentFilterSem) {
        return false;
      }
      if (studentFilterExamType && st.examType !== studentFilterExamType) {
        return false;
      }
      if (studentFilterSubject) {
        if (Array.isArray(st.subject)) {
          if (!st.subject.includes(studentFilterSubject)) return false;
        } else if (typeof st.subject === 'string') {
          if (st.subject !== studentFilterSubject) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [allStudents, studentSearchQuery, studentFilterDept, studentFilterSem, studentFilterExamType, studentFilterSubject]);
  
  const uniqueBucketValues = React.useMemo(() => {
    if (bucketFilterKey === "all") return [];
    
    const vals = new Set();
    bucket.forEach(student => {
      if (bucketFilterKey === "dept" && student.dept) {
        vals.add(student.dept);
      } else if (bucketFilterKey === "sem" && student.sem !== undefined && student.sem !== null) {
        vals.add(String(student.sem));
      } else if (bucketFilterKey === "subject") {
        if (Array.isArray(student.subject)) {
          student.subject.forEach(sub => sub && vals.add(sub));
        } else if (typeof student.subject === 'string' && student.subject) {
          vals.add(student.subject);
        }
      }
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [bucket, bucketFilterKey]);

  useEffect(() => {
    setBucketFilterVal("");
  }, [bucketFilterKey]);

  const [activeTab, setActiveTab] = useState("Students");



  // Toast notifications state
  const [toasts, setToasts] = useState([]);

  const getCombinedGapVal = () => {
    if (gapType === 'empty-seat') return 'empty-seat';
    if (gapType === 'physical-gap' && gapAction === 'bring-together') return 'physical-gap-together';
    return 'physical-gap-remove';
  };

  const handleCombinedGapChange = (val) => {
    if (val === 'empty-seat') {
      setGapType('empty-seat');
      setGapAction('remove-seats');
    } else if (val === 'physical-gap-together') {
      setGapType('physical-gap');
      setGapAction('bring-together');
    } else {
      setGapType('physical-gap');
      setGapAction('remove-seats');
    }
  };

  const showToast = (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Custom modal dialog state
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: "confirm", // confirm, alert, prompt-exam, prompt-field, add-room
    title: "",
    message: "",
    placeholder: "",
    defaultValue: "",
    onConfirm: () => {},
    onCancel: () => {}
  });

  const closeDialog = () => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const triggerConfirm = (title, message, onConfirm) => {
    setDialog({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm: () => {
        onConfirm();
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  const triggerGenerationConfirm = (title, message, onConfirm) => {
    setDialog({
      isOpen: true,
      type: "confirm-generation",
      title,
      message,
      onConfirm: (includeBucket) => {
        onConfirm(includeBucket);
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  const triggerAlert = (title, message, onConfirm) => {
    setDialog({
      isOpen: true,
      type: "alert",
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  // Global window.alert override
  useEffect(() => {
    window.alert = (msg) => {
      let type = "info";
      const lower = msg.toLowerCase();
      if (lower.includes("success") || lower.includes("imported") || lower.includes("completed") || lower.includes("saved") || lower.includes("successful") || lower.includes("ok")) {
        type = "success";
      } else if (lower.includes("error") || lower.includes("failed") || lower.includes("invalid") || lower.includes("shortage") || lower.includes("required")) {
        type = "error";
      }
      if (msg.includes('\n') || msg.length > 80) {
        triggerAlert(type === 'success' ? 'Success' : (type === 'error' ? 'Error' : 'Notification'), msg);
      } else {
        showToast(msg, type);
      }
    };
  }, []);

  async function fetchMeta() {
    try {
      const r = await fetch(`${API}/students/meta?examType=${encodeURIComponent(selectedExamType)}`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      console.log(`fetchMeta results for "${selectedExamType}":`, j);
      if (j.depts) {
        setMeta(j);
      } else if (j.error) {
        showToast(`Meta fetch error: ${j.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast(`Meta fetch failed: ${e.message}`, "error");
    }
  }
  useEffect(() => { if (token) fetchMeta(); }, [token, selectedExamType]);

  useEffect(() => {
    setDeptSemCombinations([]);
    setSelectedDept("");
    setSelectedSem("");
  }, [selectedExamType]);

  useEffect(() => {
    setSelectedComboSubject("");
  }, [selectedDept, selectedSem]);

  useEffect(() => {
    if (token) {
      const fetchFilteredSubjects = async () => {
        try {
          const deptPart = selectedDept ? `&dept=${encodeURIComponent(selectedDept)}` : "";
          const semPart = selectedSem ? `&sem=${encodeURIComponent(selectedSem)}` : "";
          const r = await fetch(`${API}/students/meta?examType=${encodeURIComponent(selectedExamType)}${deptPart}${semPart}`, { headers: { ...authHeader(token) } });
          const j = await r.json();
          if (j.subjects) {
            setMeta(prev => ({ ...prev, subjects: j.subjects }));
          }
        } catch (e) {
          console.error("Failed to fetch filtered subjects:", e);
        }
      };
      fetchFilteredSubjects();
    }
  }, [token, selectedExamType, selectedDept, selectedSem]);

  async function fetchSchedules() {
    try {
      const r = await fetch(`${API}/schedules`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (Array.isArray(j)) setSchedules(j);
    } catch (e) { console.error(e); }
  }

  async function fetchRoomSchedules() {
    try {
      const r = await fetch(`${API}/rooms/schedules`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (j && !j.error) setRoomSchedules(j);
    } catch (e) { console.error(e); }
  }

  useEffect(() => { 
    if (token) {
      fetchSchedules(); 
      fetchRoomSchedules();
    } 
  }, [token]);

  useEffect(() => {
    if (activeTab !== "Allotment") {
      setShowBucketSidebar(false);
    }
  }, [activeTab]);
  
  // New functions for combination management
  const addDeptSemCombination = () => {
    const isSubjectCompulsory = selectedExamType === "College" || selectedExamType === "School";
    if (isSubjectCompulsory && !selectedComboSubject) {
      showToast("Subject is required to add this combination.", "error");
      return;
    }
    if (selectedDept && selectedSem) {
      const newCombination = { 
        dept: selectedDept, 
        sem: String(selectedSem),
        subject: isSubjectCompulsory ? selectedComboSubject : ""
      };
      // Prevent duplicate class (dept + sem) overlaps in the schedule list
      const isDuplicate = deptSemCombinations.some(c => 
        c.dept === newCombination.dept && 
        c.sem === newCombination.sem
      );
      if (!isDuplicate) {
        setDeptSemCombinations((prev) => [...prev, newCombination]);
        setSelectedDept(''); // Reset dropdowns after adding
        setSelectedSem('');
        setSelectedComboSubject('');
      } else {
        showToast(`This class (${getFieldLabel('constraint_1')} & ${getFieldLabel('constraint_2')}) already has a subject scheduled in this list.`, 'error');
      }
    }
  };

  const removeDeptSemCombination = (index) => {
    setDeptSemCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  // fetch invigilators
  const [invigilators, setInvigilators] = useState([]);
  async function fetchInvigilators() {
    const r = await fetch(`${API}/invigilators`, { headers: { ...authHeader(token) } });
    const j = await r.json();
    setInvigilators(j || []);
  }
  useEffect(() => { if (token) fetchInvigilators(); }, [token]);

  // add invigilator
  async function addInvigilator(invigilator) {
    const res = await fetch(`${API}/invigilators`, { method: "POST", headers: { ...authHeader(token), "Content-Type": "application/json" }, body: JSON.stringify(invigilator) });
    const j = await res.json();
    if (j._id) {
      showToast("Invigilator added successfully.", "success");
      fetchInvigilators();
    } else {
      showToast(j.error || "Error adding invigilator", "error");
    }
  }

  // assign invigilators
  async function assignInvigilators(invigilatorsPerRoom, distributorsCount, targetSchedules) {
    if (targetSchedules.length === 0) {
      showToast("No schedules provided for assignment.", "error");
      return;
    }

    triggerConfirm(
      "Assign Invigilators",
      `Assign invigilators for ${targetSchedules.length} schedules?`,
      async () => {
        let totalAssigned = 0;
        let errors = [];

        setLoading(true);
        
        for (const sched of targetSchedules) {
          try {
            const roomsToAssign = rooms.filter(r => sched.roomIds.includes(r._id));
            
            if (roomsToAssign.length === 0) {
                errors.push(`${sched.date} (Shift ${sched.shift}): No rooms selected for this schedule.`);
                continue;
            }

            const allotRes = await fetch(`${API}/allotments?shift=${sched.shift}&date=${sched.date}`, { headers: { ...authHeader(token) } });
            const allotData = await allotRes.json();
            const currentAllotments = Array.isArray(allotData) ? allotData : [];

            const shuffledInvigilators = [...invigilators].sort(() => 0.5 - Math.random());
            const assignments = [];
            let invigilatorIndex = 0;

            for (const room of roomsToAssign) {
              const studentCount = currentAllotments.filter(a => String(a.room._id || a.room) === String(room._id)).length;
              
              let targetCount = 0;
              if (studentCount > 0) {
                  targetCount = (studentCount < 20) ? 1 : invigilatorsPerRoom;
              }

              const roomInvigilators = [];
              for (let i = 0; i < targetCount; i++) {
                if (invigilatorIndex < shuffledInvigilators.length) {
                  roomInvigilators.push(shuffledInvigilators[invigilatorIndex]);
                  invigilatorIndex++;
                }
              }
              assignments.push({ room: room._id, invigilators: roomInvigilators.map(inv => inv._id) });
            }

            const assignedDistributors = shuffledInvigilators.slice(invigilatorIndex, invigilatorIndex + distributorsCount);

            const res = await fetch(`${API}/assign-invigilators`, {
              method: "POST",
              headers: { ...authHeader(token), "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  shift: sched.shift, 
                  date: sched.date, 
                  time: sched.time || time,
                  assignments, 
                  distributors: assignedDistributors.map(d => d._id) 
              }),
            });

            const j = await res.json();
            if (j.ok) {
                totalAssigned += j.assigned;
            } else {
                errors.push(`${sched.date} (Shift ${sched.shift}): ${j.error}`);
            }
          } catch (e) {
            console.error(e);
            errors.push(`${sched.date} (Shift ${sched.shift}): ${e.message}`);
          }
        }
        
        setLoading(false);

        let msg = `Total Assignments Created: ${totalAssigned}`;
        if (errors.length > 0) {
            msg += `\n\nErrors encountered for some schedules:\n${errors.join('\n')}`;
        }
        triggerAlert("Assignment Process Completed", msg);
        
        fetchInvigAssignments();
      }
    );
  }


  async function fetchInvigAssignments() {
    try {
      const r = await fetch(`${API}/invigilator-assignments?shift=${shift}&date=${date}`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (Array.isArray(j)) {
        setInvigAssignments(j.filter(a => a.role !== 'distributor'));
        setDistributors(j.filter(a => a.role === 'distributor').map(a => a.invigilator));
      }
    } catch (e) {
      console.error(e);
    }
  }


  useEffect(() => {
    if (token) {
      fetchRooms();
      fetchAllotments();
      fetchInvigAssignments();
      fetchExamConfigs();
      fetchLibrary();
      fetchComments();
      fetchAllStudents();
      
      const decoded = decodeToken(token);
      if (decoded && decoded.role === "admin") {
        fetchPendingStaff();
      }
    }
  }, [token, shift, date]);

  async function doLogin() {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const j = await res.json();
      if (j.token) {
        login(j.token);
        showToast("Logged in successfully.", "success");
      } else {
        showToast(j.error || "Login failed", "error");
      }
    } catch (e) {
      showToast("Login error: " + e.message, "error");
    }
  }

  async function doRegister(formData) {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const j = await res.json();
      if (j.ok) {
        showToast(j.message || "Registration successful! Please login.", "success");
        setShowRegister(false);
      } else {
        showToast(j.error || "Registration failed", "error");
      }
    } catch (e) {
      showToast("Registration error: " + e.message, "error");
    }
  }

  async function fetchLibrary() {
    try {
      const res = await fetch(`${API}/library`, {
        headers: { ...authHeader(token) }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLibrary(data);
      }
    } catch (e) {
      console.error("Error fetching library:", e);
    }
  }

  async function saveToLibrary(s) {
    if (!s) return;
    try {
      const res = await fetch(`${API}/library`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: s.date,
          shift: s.shift,
          time: s.time,
          examType: s.examType,
          subject: s.subject,
          combinations: s.combinations || []
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Arrangement schedule successfully saved to your library!", "success");
        fetchLibrary();
      } else {
        showToast(data.error || "Failed to save to library.", "error");
      }
    } catch (e) {
      showToast("Error saving to library: " + e.message, "error");
    }
  }

  async function deleteFromLibrary(id) {
    try {
      const res = await fetch(`${API}/library/${id}`, {
        method: "DELETE",
        headers: { ...authHeader(token) }
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Schedule removed from library.", "success");
        fetchLibrary();
      } else {
        showToast(data.error || "Failed to remove from library.", "error");
      }
    } catch (e) {
      showToast("Error removing from library: " + e.message, "error");
    }
  }

  async function fetchPendingStaff() {
    try {
      const res = await fetch(`${API}/staff/pending`, {
        headers: { ...authHeader(token) }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPendingStaff(data);
        }
      }
    } catch (e) {
      console.error("Error fetching pending staff:", e);
    }
  }

  async function approveStaffMember(id) {
    try {
      const res = await fetch(`${API}/staff/approve/${id}`, {
        method: "POST",
        headers: { ...authHeader(token) }
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast("Staff approved successfully!", "success");
        fetchPendingStaff();
      } else {
        showToast(data.error || "Failed to approve staff.", "error");
      }
    } catch (e) {
      showToast("Error approving staff: " + e.message, "error");
    }
  }

  async function fetchComments() {
    if (!date || !shift) return;
    try {
      const res = await fetch(`${API}/comments?date=${date}&shift=${shift}`, {
        headers: { ...authHeader(token) }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setComments(data);
      }
    } catch (e) {
      console.error("Error fetching comments:", e);
    }
  }

  async function addComment() {
    if (!newCommentText.trim() || !date || !shift) return;
    try {
      const res = await fetch(`${API}/comments`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date,
          shift,
          text: newCommentText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewCommentText("");
        fetchComments();
        showToast("Comment added!", "success");
      } else {
        showToast(data.error || "Failed to add comment.", "error");
      }
    } catch (e) {
      showToast("Error adding comment: " + e.message, "error");
    }
  }

  async function fetchRooms() {
    try {
      const r = await fetch(`${API}/rooms`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (Array.isArray(j)) setRooms(j);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAllotments() {
    try {
      const r = await fetch(`${API}/allotments?shift=${shift}&date=${date}`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (Array.isArray(j)) {
        setAllotments(j);
        fetchStagingBucket(j);
        
        // Restore distancing parameters if they are stored in the fetched allotments
        if (j.length > 0) {
          const first = j[0];
          if (first.useDistancing !== undefined) {
            setUseDistancing(first.useDistancing);
          }
          if (first.rowGrouping !== undefined) {
            setRowGrouping(first.rowGrouping);
          }
          if (first.colGrouping !== undefined) {
            setColGrouping(first.colGrouping);
          }
          if (first.gapType !== undefined) {
            setGapType(first.gapType);
          }
          if (first.gapAction !== undefined) {
            setGapAction(first.gapAction);
          }
          setIsLayoutSettingsLocked(true);
        } else {
          setIsLayoutSettingsLocked(false);
        }
      } else {
        setBucket([]);
        setIsLayoutSettingsLocked(false);
      }
      fetchRoomSchedules();
    } catch (e) {
      console.error(e);
      setBucket([]);
    }
  }

  async function fetchStagingBucket(currentAllotments) {
    // Find unique combinations of dept and sem in these allotments or form selection
    const combos = [];
    const keys = new Set();
    if (currentAllotments && currentAllotments.length > 0) {
      currentAllotments.forEach(a => {
        if (a.student) {
          const key = `${a.student.dept}-${a.student.sem}`;
          if (!keys.has(key)) {
            keys.add(key);
            combos.push({ dept: a.student.dept, sem: String(a.student.sem) });
          }
        }
      });
    } else if (deptSemCombinations && deptSemCombinations.length > 0) {
      deptSemCombinations.forEach(c => {
        const key = `${c.dept}-${c.sem}`;
        if (!keys.has(key)) {
          keys.add(key);
          combos.push({ dept: c.dept, sem: String(c.sem) });
        }
      });
    }

    const placedStudentIds = new Set((currentAllotments || []).map(a => a.student?._id).filter(Boolean));

    if (combos.length === 0) {
      setBucket(prev => prev.filter(s => !placedStudentIds.has(s._id)));
      return;
    }

    try {
      const res = await fetch(`${API}/students/query`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deptSemCombinations: combos,
          examType: selectedExamType
        })
      });
      const students = await res.json();
      if (Array.isArray(students)) {
        setBucket(prev => {
          const keptFromBucket = prev.filter(s => !placedStudentIds.has(s._id));
          const keptIds = new Set(keptFromBucket.map(s => s._id));
          const newUnplaced = students.filter(s => !placedStudentIds.has(s._id) && !keptIds.has(s._id));
          return [...keptFromBucket, ...newUnplaced];
        });
      }
    } catch (e) {
      console.error("Error fetching staging bucket students:", e);
    }
  }

  async function saveManualAllotments(updatedAllotments) {
    setIsSaving(true);
    try {
      const res = await fetch(`${API}/allotments/save-manual`, {
        method: "POST",
        headers: {
          ...authHeader(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          shift,
          date,
          allotments: updatedAllotments,
          useDistancing,
          rowGrouping,
          colGrouping,
          gapType,
          gapAction
        })
      });
      const j = await res.json();
      if (!j.ok) {
        showToast(j.error || "Failed to save manual rearrangement", "error");
      }
    } catch (e) {
      showToast("Error saving manual rearrangement: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSearchStudent() {
    if (!searchRoll.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API}/students/find?roll=${encodeURIComponent(searchRoll.trim())}`, {
        headers: { ...authHeader(token) }
      });
      if (res.status === 404) {
        showToast("Student not found", "error");
        return;
      }
      const student = await res.json();
      if (!student) {
        showToast("Student not found", "error");
        return;
      }

      if (bucket.some(s => s._id === student._id)) {
        showToast("Student is already in the staging bucket", "warning");
        return;
      }

      const existingAllotment = allotments.find(a => a.student && a.student._id === student._id);
      if (existingAllotment) {
        const updatedAllotments = allotments.filter(a => a.student && a.student._id !== student._id);
        setAllotments(updatedAllotments);
        setBucket(prev => [...prev, student]);
        showToast(`Student ${student.roll} moved from ${existingAllotment.room.name || 'seat'} to bucket.`, "info");
        saveManualAllotments(updatedAllotments);
      } else {
        setBucket(prev => [...prev, student]);
        showToast(`Student ${student.roll} added to bucket.`, "success");
      }
      setSearchRoll("");
    } catch (e) {
      showToast("Error searching student: " + e.message, "error");
    } finally {
      setIsSearching(false);
    }
  }

  const handleDragStartSeat = (e, student, room, row, col) => {
    setIsDraggingStudent(true);
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({
      source: "seat",
      studentId: student._id,
      roomId: room._id,
      row,
      col
    }));
  };

  const handleDragStartBucket = (e, student) => {
    setIsDraggingStudent(true);
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({
      source: "bucket",
      studentId: student._id
    }));
  };

  const handleDropOnSeat = async (e, targetRoom, targetRow, targetCol) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      
      let dragData;
      try {
        dragData = JSON.parse(dataStr);
      } catch (parseErr) {
        // Safe to ignore: user might have dragged raw text selection from browser
        return;
      }
      
      if (!dragData || typeof dragData !== "object") return;
      
      const { source, studentId, roomId: sourceRoomId, row: sourceRow, col: sourceCol } = dragData;
      if (!source) return;
      
      const targetSeatCode = getSeatLabel(targetRow - 1, targetCol);

      const targetIndex = allotments.findIndex(
        a => String(a.room._id || a.room) === String(targetRoom._id) && a.row === targetRow && a.col === targetCol
      );
      const targetAllotment = targetIndex > -1 ? allotments[targetIndex] : null;

      // Prevent dropping on a seat that has a student filtered out (who is invisible in UI)
      if (targetAllotment && filters) {
        const isTargetVisible = filters.depts.includes(targetAllotment.student.dept) && 
                                filters.sems.includes(targetAllotment.student.sem);
        if (!isTargetVisible) {
          showToast("Cannot place student here: seat is occupied by a filtered-out student", "warning");
          return;
        }
      }

      let updatedAllotments = [...allotments];

      if (source === "seat") {
        if (String(sourceRoomId) === String(targetRoom._id) && sourceRow === targetRow && sourceCol === targetCol) {
          return;
        }

        const sourceIndex = allotments.findIndex(
          a => String(a.room._id || a.room) === String(sourceRoomId) && a.row === sourceRow && a.col === sourceCol
        );
        if (sourceIndex === -1) return;
        const sourceAllotment = allotments[sourceIndex];

        // Ensure source student is also currently visible to be rearranged
        if (filters) {
          const isSourceVisible = filters.depts.includes(sourceAllotment.student.dept) && 
                                  filters.sems.includes(sourceAllotment.student.sem);
          if (!isSourceVisible) {
            showToast("Cannot move: source student is currently filtered out", "warning");
            return;
          }
        }

        if (targetAllotment) {
          const sourceStudent = sourceAllotment.student;
          const targetStudent = targetAllotment.student;
          const sourceSubject = sourceAllotment.subject;
          const targetSubject = targetAllotment.subject;

          const updatedSource = {
            ...sourceAllotment,
            student: targetStudent,
            subject: targetSubject,
            seatLabel: `${sourceAllotment.room.name || 'Room'}.-${sourceAllotment.seatCode}-StudentRollno(${targetStudent.roll})`
          };

          const updatedTarget = {
            ...targetAllotment,
            student: sourceStudent,
            subject: sourceSubject,
            seatLabel: `${targetRoom.name}.-${targetAllotment.seatCode}-StudentRollno(${sourceStudent.roll})`
          };

          updatedAllotments[sourceIndex] = updatedSource;
          updatedAllotments[targetIndex] = updatedTarget;
          
          showToast(`Swapped ${sourceStudent.roll} and ${targetStudent.roll}`, "success");
        } else {
          const updatedSource = {
            ...sourceAllotment,
            room: targetRoom,
            row: targetRow,
            col: targetCol,
            seatCode: targetSeatCode,
            seatLabel: `${targetRoom.name}.-${targetSeatCode}-StudentRollno(${sourceAllotment.student.roll})`
          };
          updatedAllotments[sourceIndex] = updatedSource;
          showToast(`Moved ${sourceAllotment.student.roll} to ${targetRoom.name} Seat ${targetSeatCode}`, "success");
        }
      } else if (source === "bucket") {
        const student = bucket.find(s => s._id === studentId);
        if (!student) return;

        if (targetAllotment) {
          const targetStudent = targetAllotment.student;
          
          const updatedTarget = {
            ...targetAllotment,
            student,
            subject: student.subject?.[0] || subject || "",
            seatLabel: `${targetRoom.name}.-${targetAllotment.seatCode}-StudentRollno(${student.roll})`
          };

          updatedAllotments[targetIndex] = updatedTarget;

          setBucket(prev => [...prev.filter(s => s._id !== studentId), targetStudent]);
          showToast(`Placed ${student.roll} at seat and moved ${targetStudent.roll} to bucket`, "success");
        } else {
          const newAllotment = {
            student,
            room: targetRoom,
            row: targetRow,
            col: targetCol,
            seatCode: targetSeatCode,
            shift: Number(shift),
            date,
            time: time || "",
            subject: student.subject?.[0] || subject || "",
            seatLabel: `${targetRoom.name}.-${targetSeatCode}-StudentRollno(${student.roll})`
          };

          updatedAllotments.push(newAllotment);
          setBucket(prev => prev.filter(s => s._id !== studentId));
          showToast(`Allotted ${student.roll} to ${targetRoom.name} Seat ${targetSeatCode}`, "success");
        }
      }

      setAllotments(updatedAllotments);
      saveManualAllotments(updatedAllotments);
    } catch (err) {
      console.error(err);
      showToast("Error processing drop: " + err.message, "error");
    }
  };

  const handleDropOnBucket = async (e) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      
      let dragData;
      try {
        dragData = JSON.parse(dataStr);
      } catch (parseErr) {
        // Safe to ignore invalid text/selections dropped on bucket
        return;
      }
      
      if (!dragData || typeof dragData !== "object") return;
      
      const { source, roomId: sourceRoomId, row: sourceRow, col: sourceCol } = dragData;
      
      if (source !== "seat") return;

      const sourceIndex = allotments.findIndex(
        a => String(a.room._id || a.room) === String(sourceRoomId) && a.row === sourceRow && a.col === sourceCol
      );
      if (sourceIndex === -1) return;
      
      const sourceAllotment = allotments[sourceIndex];
      const student = sourceAllotment.student;

      // Ensure source student is visible before unallotting
      if (filters) {
        const isSourceVisible = filters.depts.includes(student.dept) && 
                                filters.sems.includes(student.sem);
        if (!isSourceVisible) {
          showToast("Cannot unallot: student is currently filtered out", "warning");
          return;
        }
      }

      const updatedAllotments = allotments.filter((_, idx) => idx !== sourceIndex);
      
      setAllotments(updatedAllotments);
      setBucket(prev => [...prev, student]);
      showToast(`Unallotted ${student.roll} and moved to bucket`, "success");
      
      saveManualAllotments(updatedAllotments);
    } catch (err) {
      console.error(err);
      showToast("Error moving student to bucket: " + err.message, "error");
    }
  };

  async function importCSV() {
    const labelsStr = activeConfig.fields.map(f => f.label.toLowerCase()).join(", ");
    if (!csvText.trim()) return showToast(`Paste CSV in the box first (${labelsStr} per line)`, "warning");
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/import-csv`, {
        method: "POST",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, examType: selectedExamType }),
      });
      const j = await res.json();
      if (j.ok) {
        showToast("CSV imported successfully.", "success");
        setCsvText("");
        fetchAllotments();
        fetchAllStudents();
        fetchMeta(); // Update meta in case of new depts/sems
      } else {
        showToast(j.error || "Import error", "error");
      }
    } catch (e) {
      showToast("Import failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllStudents() {
    if (!token) return;
    try {
      const res = await fetch(`${API}/students`, {
        headers: { ...authHeader(token) }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllStudents(data);
        }
      }
    } catch (e) {
      console.error("Error fetching students:", e);
    }
  }

  const openStudentModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({
        roll: student.roll || "",
        name: student.name || "",
        dept: student.dept || "",
        sem: student.sem || "",
        subject: Array.isArray(student.subject) ? student.subject.join(", ") : (student.subject || ""),
        examType: student.examType || "College"
      });
    } else {
      setEditingStudent(null);
      setStudentForm({
        roll: "",
        name: "",
        dept: "",
        sem: "",
        subject: "",
        examType: selectedExamType || "College"
      });
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudent ? `${API}/students/${editingStudent._id}` : `${API}/students`;
      const method = editingStudent ? "PUT" : "POST";
      const bodyPayload = {
        roll: studentForm.roll.trim(),
        name: studentForm.name.trim(),
        dept: studentForm.dept.trim(),
        sem: studentForm.sem.trim(),
        subject: studentForm.subject ? studentForm.subject.split(",").map(s => s.trim()).filter(Boolean) : [],
        examType: studentForm.examType
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeader(token)
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast(editingStudent ? "Student updated successfully!" : "Student added successfully!", "success");
        setShowStudentModal(false);
        fetchAllStudents();
        fetchMeta();
        fetchAllotments();
      } else {
        showToast(data.error || "Failed to save student details", "error");
      }
    } catch (err) {
      showToast("Error saving student: " + err.message, "error");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    triggerConfirm(
      "Delete Student",
      "Are you sure you want to delete this student? This will also remove any existing seating allotments for this student.",
      async () => {
        try {
          const res = await fetch(`${API}/students/${studentId}`, {
            method: "DELETE",
            headers: { ...authHeader(token) }
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            showToast("Student deleted successfully!", "success");
            fetchAllStudents();
            fetchAllotments();
          } else {
            showToast(data.error || "Failed to delete student", "error");
          }
        } catch (err) {
          showToast("Error deleting student: " + err.message, "error");
        }
      }
    );
  };

  const handleExportStudentsCSV = () => {
    const headers = [
      "Roll No",
      "Name",
      "Exam Type",
      getFieldLabel('constraint_1') || "Dept/Sec/Stream",
      getFieldLabel('constraint_2') || "Sem/Class",
      "Subjects"
    ];

    const rows = filteredStudents.map(s => [
      s.roll,
      s.name || "",
      s.examType || "College",
      s.dept || "",
      s.sem || "",
      Array.isArray(s.subject) ? s.subject.join("; ") : (s.subject || "")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student_roster_${studentForm.examType.toLowerCase() || 'export'}.csv`;
    a.click();
    showToast("Student roster exported successfully.", "success");
  };

  // File Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  // Helper to get labels dynamically
  const activeConfig = examConfigs.find(c => c.examType === selectedExamType) || {
    examType: "College",
    fields: [
      { key: "roll", label: "Roll No", type: "identifier", required: true },
      { key: "name", label: "Student Name", type: "name", required: true },
      { key: "dept", label: "Department", type: "constraint_1", required: true },
      { key: "sem", label: "Semester", type: "constraint_2", required: true }
    ]
  };

  const getFieldLabel = (type) => {
    const field = activeConfig.fields.find(f => f.type === type);
    return field ? field.label : type;
  };

  const getHeaderLabel = (headerKey) => {
    if (headerKey === "roll") return getFieldLabel("identifier") || "Roll No";
    if (headerKey === "name") return getFieldLabel("name") || "Student Name";
    if (headerKey === "dept") return getFieldLabel("constraint_1") || "Department";
    if (headerKey === "sem") return getFieldLabel("constraint_2") || "Semester";
    if (headerKey === "subject") return getFieldLabel("subject") || "Subject";
    return headerKey;
  };

  const getPreviewRows = () => {
    if (!parsedCsvText) return { headers: [], rows: [] };
    const lines = parsedCsvText.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      if (line.startsWith('"') && line.endsWith('"')) {
        return line.slice(1, -1).split('","');
      }
      return line.split(",");
    });
    
    return { headers, rows };
  };

  async function fetchExamConfigs() {
    try {
      const r = await fetch(`${API}/exam-configs`, { headers: { ...authHeader(token) } });
      const j = await r.json();
      if (Array.isArray(j)) {
        setExamConfigs(j);
        const savedType = localStorage.getItem("selectedExamType");
        if (savedType && j.some(c => c.examType === savedType)) {
          setSelectedExamType(savedType);
        } else if (j.length > 0) {
          setSelectedExamType(j[0].examType);
        }
      }
    } catch (e) {
      console.error("Error fetching configs:", e);
    }
  }

  const createNewExamType = () => {
    triggerPromptExamType();
  };

  const deleteActiveExamType = () => {
    triggerConfirm(
      "Delete Exam Type",
      `Are you sure you want to delete the exam type "${selectedExamType}"?`,
      async () => {
        try {
          const res = await fetch(`${API}/exam-configs/${encodeURIComponent(selectedExamType)}`, {
            method: "DELETE",
            headers: { ...authHeader(token) }
          });
          if (res.ok) {
            showToast("Exam type deleted successfully.", "success");
            setExamConfigs(prev => prev.filter(c => c.examType !== selectedExamType));
            setSelectedExamType("College");
            localStorage.setItem("selectedExamType", "College");
          }
        } catch (e) {
          showToast("Delete failed: " + e.message, "error");
        }
      }
    );
  };

  const updateFieldLabel = (fieldKey, newLabel) => {
    setExamConfigs(prev => prev.map(c => {
      if (c.examType === selectedExamType) {
        return {
          ...c,
          fields: c.fields.map(f => f.key === fieldKey ? { ...f, label: newLabel } : f)
        };
      }
      return c;
    }));
  };

  const updateFieldSampleValue = (fieldKey, newSampleValue) => {
    setExamConfigs(prev => prev.map(c => {
      if (c.examType === selectedExamType) {
        return {
          ...c,
          fields: c.fields.map(f => f.key === fieldKey ? { ...f, sampleValue: newSampleValue } : f)
        };
      }
      return c;
    }));
  };

  const addCustomField = () => {
    triggerPromptCustomField();
  };

  const triggerPromptExamType = () => {
    setDialog({
      isOpen: true,
      type: "prompt-exam",
      title: "New Exam Type",
      message: "Enter the name of the new exam type (e.g. Board, Certification):",
      placeholder: "Exam Type Name",
      defaultValue: "",
      onConfirm: (val) => {
        if (!val || !val.trim()) return;
        const nameClean = val.trim();
        if (examConfigs.some(c => c.examType.toLowerCase() === nameClean.toLowerCase())) {
          showToast("Exam type already exists.", "error");
          return;
        }
        const newConfig = {
          examType: nameClean,
          fields: [
            { key: "roll", label: "Roll No / ID", type: "identifier", required: true },
            { key: "name", label: "Student Name", type: "name", required: true },
            { key: "dept", label: "Section / Stream", type: "constraint_1", required: true },
            { key: "sem", label: "Class / Semester", type: "constraint_2", required: true }
          ]
        };
        setExamConfigs(prev => [...prev, newConfig]);
        setSelectedExamType(nameClean);
        localStorage.setItem("selectedExamType", nameClean);
        showToast(`Exam type "${nameClean}" created. Remember to save layout.`, "success");
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  const triggerPromptCustomField = () => {
    setDialog({
      isOpen: true,
      type: "prompt-field",
      title: "Add Custom Field",
      message: "Enter custom field name and its sample value for template generation:",
      onConfirm: (labelVal, sampleVal) => {
        if (!labelVal || !labelVal.trim()) return;
        const labelClean = labelVal.trim();
        const sampleClean = sampleVal ? sampleVal.trim() : "";
        
        setExamConfigs(prev => prev.map(c => {
          if (c.examType === selectedExamType) {
            const key = `custom_${Math.random().toString(36).substring(2, 7)}`;
            if (c.fields.some(f => f.label.toLowerCase() === labelClean.toLowerCase())) {
              showToast("A field with this name already exists.", "error");
              return c;
            }
            showToast(`Field "${labelClean}" added. Save to persist.`, "success");
            return {
              ...c,
              fields: [...c.fields, { key, label: labelClean, type: "custom", required: false, sampleValue: sampleClean }]
            };
          }
          return c;
        }));
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  const triggerAddRoomModal = () => {
    setDialog({
      isOpen: true,
      type: "add-room",
      title: "Add New Exam Hall",
      fields: { name: "", rows: "10", cols: "10" },
      onConfirm: (fields) => {
        const { name, rows, cols } = fields;
        if (!name || !name.trim()) {
          showToast("Room name is required.", "error");
          return;
        }
        const r = Number(rows);
        const c = Number(cols);
        if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) {
          showToast("Rows and columns must be positive numbers.", "error");
          return;
        }
        saveRoomToBackend(name.trim(), r, c);
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  async function saveRoomToBackend(name, rows, cols) {
    try {
      const res = await fetch(`${API}/rooms`, {
        method: "POST",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name, rows, cols }),
      });
      const j = await res.json();
      if (j._id) {
        setRooms((r) => [...r, j]);
        showToast(`Room "${name}" added successfully.`, "success");
      } else showToast(j.error || "Error adding room", "error");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const editRoom = (room) => {
    setDialog({
      isOpen: true,
      type: "edit-room",
      title: `Edit Exam Hall: ${room.name}`,
      fields: { name: room.name, rows: String(room.rows), cols: String(room.cols) },
      onConfirm: (fields) => {
        const { name, rows, cols } = fields;
        if (!name || !name.trim()) {
          showToast("Room name is required.", "error");
          return;
        }
        const r = Number(rows);
        const c = Number(cols);
        if (isNaN(r) || isNaN(c) || r <= 0 || c <= 0) {
          showToast("Rows and columns must be positive numbers.", "error");
          return;
        }
        updateRoomInBackend(room._id, name.trim(), r, c);
        closeDialog();
      },
      onCancel: closeDialog
    });
  };

  async function updateRoomInBackend(id, name, rows, cols) {
    try {
      const res = await fetch(`${API}/rooms/${id}`, {
        method: "PUT",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ name, rows, cols }),
      });
      const j = await res.json();
      if (j._id) {
        setRooms((prev) => prev.map(r => r._id === id ? j : r));
        showToast(`Room "${name}" updated successfully.`, "success");
        fetchAllotments();
      } else showToast(j.error || "Error updating room", "error");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const deleteRoom = (room) => {
    triggerConfirm(
      "Delete Exam Hall",
      `Are you sure you want to delete room "${room.name}"? This will also delete any allotments and invigilator assignments in this room.`,
      () => deleteRoomFromBackend(room._id, room.name)
    );
  };

  async function deleteRoomFromBackend(id, name) {
    try {
      const res = await fetch(`${API}/rooms/${id}`, {
        method: "DELETE",
        headers: { ...authHeader(token) }
      });
      const j = await res.json();
      if (j.ok) {
        setRooms((prev) => prev.filter(r => r._id !== id));
        showToast(`Room "${name}" deleted successfully.`, "success");
        fetchAllotments();
      } else showToast(j.error || "Error deleting room", "error");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const removeCustomField = (fieldKey) => {
    setExamConfigs(prev => prev.map(c => {
      if (c.examType === selectedExamType) {
        return {
          ...c,
          fields: c.fields.filter(f => f.key !== fieldKey)
        };
      }
      return c;
    }));
  };

  const saveExamConfig = async () => {
    const currentConfig = examConfigs.find(c => c.examType === selectedExamType);
    if (!currentConfig) return;
    if (currentConfig.fields.some(f => !f.label.trim())) {
      return showToast("Field labels cannot be empty.", "error");
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/exam-configs`, {
        method: "POST",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify(currentConfig)
      });
      const j = await res.json();
      if (j._id) {
        showToast("Configuration saved successfully.", "success");
        fetchExamConfigs();
      } else {
        showToast(j.error || "Save configuration failed.", "error");
      }
    } catch (e) {
      showToast("Save failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (format = "xlsx") => {
    const headers = activeConfig.fields.map(f => f.label);
    const sampleRow = {};
    activeConfig.fields.forEach(f => {
      if (f.type === "identifier") {
        sampleRow[f.label] = "233001";
      } else if (f.type === "name") {
        sampleRow[f.label] = "Student Name 01";
      } else if (f.type === "constraint_1") {
        sampleRow[f.label] = selectedExamType === "School" ? "A" : (selectedExamType === "Competitive" ? "General" : "CS");
      } else if (f.type === "constraint_2") {
        sampleRow[f.label] = selectedExamType === "School" ? "10" : (selectedExamType === "Competitive" ? "Physics" : "5");
      } else if (f.type === "subject") {
        sampleRow[f.label] = f.sampleValue || "Mathematics";
      } else {
        sampleRow[f.label] = f.sampleValue || "Sample Value";
      }
    });

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        headers.map(h => `"${sampleRow[h]}"`).join(",")
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedExamType.toLowerCase()}_template.csv`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${selectedExamType.toLowerCase()}_template.xlsx`);
    }
  };

  const mapColumnsToGeneric = (sheetRows) => {
    if (sheetRows.length === 0) return "";
    
    const uploadedHeaders = sheetRows[0].map(h => (h || "").toString().trim().toLowerCase());
    const mappedRows = [];
    
    const fieldMappings = activeConfig.fields.map(field => {
      const index = uploadedHeaders.findIndex(h => h === field.label.trim().toLowerCase());
      return { ...field, index };
    });
    
    const missingRequired = fieldMappings.filter(f => f.required && f.index === -1);
    if (missingRequired.length > 0) {
      showToast(`The uploaded file is missing required columns: ${missingRequired.map(f => `"${f.label}"`).join(", ")}`, "error");
      return null;
    }
    
    const customFields = fieldMappings.filter(f => f.type === 'custom' && f.index !== -1);
    const subjectField = fieldMappings.find(f => f.type === 'subject');
    const hasSubjectField = !!subjectField && subjectField.index !== -1;
    
    const outputHeaders = ["roll", "name", "dept", "sem"];
    if (hasSubjectField) {
      outputHeaders.push("subject");
    }
    outputHeaders.push(...customFields.map(f => f.label));
    
    mappedRows.push(outputHeaders.join(","));
    
    for (let r = 1; r < sheetRows.length; r++) {
      const row = sheetRows[r];
      if (row.length === 0 || (row.length === 1 && !row[0])) continue;
      
      const getVal = (field) => {
        if (!field || field.index === -1) return "";
        return row[field.index] !== undefined ? row[field.index].toString().replace(/"/g, '""').trim() : "";
      };
      
      const roll = getVal(fieldMappings.find(f => f.type === 'identifier'));
      const name = getVal(fieldMappings.find(f => f.type === 'name'));
      const dept = getVal(fieldMappings.find(f => f.type === 'constraint_1'));
      const sem = getVal(fieldMappings.find(f => f.type === 'constraint_2'));
      const subjectVal = hasSubjectField ? getVal(subjectField) : "";
      
      const values = [
        `"${roll}"`,
        `"${name}"`,
        `"${dept}"`,
        `"${sem}"`
      ];
      if (hasSubjectField) {
        values.push(`"${subjectVal}"`);
      }
      values.push(...customFields.map(f => `"${getVal(f)}"`));
      
      mappedRows.push(values.join(","));
    }
    
    return mappedRows.join("\n");
  };

  const processFile = (file) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showToast("Unsupported file format! Please upload a CSV or Excel (.xlsx, .xls) file.", "error");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();

    if (fileExtension === ".csv") {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const workbook = XLSX.read(text, { type: "string" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const mappedCsv = mapColumnsToGeneric(sheetRows);
          if (mappedCsv === null) {
            clearSelectedFile();
            return;
          }
          
          setParsedCount(Math.max(0, sheetRows.length - 1));
          setParsedCsvText(mappedCsv);
        } catch (error) {
          console.error("Error reading CSV file:", error);
          showToast("Failed to parse CSV file.", "error");
          clearSelectedFile();
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          const mappedCsv = mapColumnsToGeneric(sheetRows);
          if (mappedCsv === null) {
            clearSelectedFile();
            return;
          }
          
          setParsedCount(Math.max(0, sheetRows.length - 1));
          setParsedCsvText(mappedCsv);
        } catch (error) {
          console.error("Error reading Excel file:", error);
          showToast("Failed to parse Excel file. Make sure it is not corrupted.", "error");
          clearSelectedFile();
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const importParsedData = async () => {
    if (!parsedCsvText.trim()) return showToast("No parsed data found.", "error");
    setLoading(true);
    try {
      const res = await fetch(`${API}/students/import-csv`, {
        method: "POST",
        headers: { ...authHeader(token), "Content-Type": "application/json" },
        body: JSON.stringify({ csv: parsedCsvText, examType: selectedExamType }),
      });
      const j = await res.json();
      if (j.ok) {
        showToast(`Successfully imported/updated ${parsedCount} student records.`, "success");
        clearSelectedFile();
        fetchAllotments();
        fetchAllStudents();
        fetchMeta();
      } else {
        showToast(j.error || "Import error", "error");
      }
    } catch (e) {
      showToast("Import failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setParsedCount(0);
    setParsedCsvText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  function addRoom() {
    triggerAddRoomModal();
  }

  function generate() {
    if (!deptSemCombinations || deptSemCombinations.length === 0) {
      showToast("At least one combination is required.", "error");
      return;
    }
    if ((selectedExamType === "College" || selectedExamType === "School")) {
      const missingSubject = deptSemCombinations.some(c => !c.subject || !c.subject.trim());
      if (missingSubject) {
        showToast("Subject is required for all combinations in College and School exams.", "error");
        return;
      }
    }
    let existingExamType = null;
    for (const a of allotments) {
      if (a.student && a.student.examType) {
        existingExamType = a.student.examType;
        break;
      }
    }
    if (existingExamType && existingExamType !== selectedExamType) {
      showToast(`Cannot generate. The existing arrangement for this slot is of type '${existingExamType}', but you selected '${selectedExamType}'. Please switch to '${existingExamType}' or clear the current allotments first.`, "error");
      return;
    }
    triggerGenerationConfirm(
      "Generate Allotments",
      `Generate allotments for ${date} Shift ${shift}? This will replace previous allotments for this slot.`,
      async (includeBucket) => {
        setLoading(true);
        try {
          const excludeStudentIds = !includeBucket ? bucket.map(s => s._id) : [];
          const res = await fetch(`${API}/generate`, {
            method: "POST",
            headers: { ...authHeader(token), "Content-Type": "application/json" },
            body: JSON.stringify({ 
              shift, 
              seed, 
              date, 
              time, 
              subject, 
              examType: selectedExamType, 
              deptSemCombinations,
              useDistancing,
              rowGrouping,
              colGrouping,
              gapType,
              gapAction,
              excludeStudentIds
            }),
          });
          const j = await res.json();
          if (j.ok) {
            triggerAlert("Generation Success", `Generated ${j.count} assignments. Not placed: ${j.notPlaced?.length || 0}`);
            fetchAllotments();
            fetchSchedules();
          } else showToast(j.error || "Generate failed", "error");
        } catch (e) {
          showToast(e.message, "error");
        } finally { setLoading(false); }
      }
    );
  }

  async function regenerateSchedule() {
    // Extract combinations from active allotments
    const combos = [];
    const keys = new Set();
    let computedExamType = "College";
    
    for (const a of allotments) {
      if (!a.student) continue;
      const classKey = `${a.student.dept}-${a.student.sem}-${a.subject || ""}`;
      if (!keys.has(classKey)) {
        keys.add(classKey);
        combos.push({
          dept: a.student.dept,
          sem: String(a.student.sem),
          subject: a.subject || ""
        });
      }
      if (a.student.examType) {
        computedExamType = a.student.examType;
      }
    }

    if (combos.length === 0) {
      showToast("No active combinations found in the selected schedule to regenerate.", "error");
      return;
    }

    triggerGenerationConfirm(
      "Regenerate Arrangement",
      `Regenerate arrangement for ${date} Shift ${shift} using Seed ${seed}? This will replace the current allotments for this slot.`,
      async (includeBucket) => {
        setLoading(true);
        try {
          const excludeStudentIds = !includeBucket ? bucket.map(s => s._id) : [];
          const res = await fetch(`${API}/generate`, {
            method: "POST",
            headers: { ...authHeader(token), "Content-Type": "application/json" },
            body: JSON.stringify({ 
              shift, 
              seed, 
              date, 
              time, 
              examType: computedExamType, 
              deptSemCombinations: combos,
              useDistancing,
              rowGrouping,
              colGrouping,
              gapType,
              gapAction,
              excludeStudentIds
            }),
          });
          const j = await res.json();
          if (j.ok) {
            triggerAlert("Regeneration Success", `Successfully regenerated ${j.count} assignments with Seed ${seed}. Not placed: ${j.notPlaced?.length || 0}`);
            fetchAllotments();
            fetchSchedules();
          } else {
            showToast(j.error || "Regeneration failed", "error");
          }
        } catch (e) {
          showToast(e.message, "error");
        } finally {
          setLoading(false);
        }
      }
    );
  }

  function gridForRoom(room) {
    const map = {};
    allotments.filter(a => String(a.room._id) === String(room._id)).forEach(a => {
      map[`${a.row},${a.col}`] = a;
    });
    return { rows: room.rows, cols: room.cols, map };
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`${API}/export/csv?shift=${shift}&date=${date}`, { headers: { ...authHeader(token) } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `allot_shift${shift}.csv`; a.click();
    } catch (e) { showToast(e.message, "error"); }
  }

  async function downloadRoomGrid(roomId, format = "csv") {
    try {
      const invigilatorName = invigAssignments.find(a => a.room._id === roomId)?.invigilator.name || "Not Assigned";
      const res = await fetch(`${API}/allotments?shift=${shift}&roomId=${roomId}&date=${date}`, { headers: { ...authHeader(token) } });
      const data = await res.json();
      const a = document.createElement("a");
      if (format === "json") {
        const dataWithInvigilator = {
          invigilator: invigilatorName,
          allotments: data
        };
        const blob = new Blob([JSON.stringify(dataWithInvigilator, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        a.href = url; a.download = `room_${roomId}_shift${shift}.json`; a.click();
        return;
      }
      const rows = [["roll", "name", "dept", "sem", "room", "row", "col", "seatCode", "seatLabel", "invigilator"]];
      data.forEach(d => {
        rows.push([d.student.roll, d.student.name, d.student.dept, d.student.sem, d.room.name, d.row, d.col, d.seatCode, d.seatLabel, invigilatorName]);
      });
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = `room_${roomId}_shift${shift}.csv`; a.click();
    } catch (e) {
      showToast("Download failed: " + e.message, "error");
    }
  }

  function buildSeatMap(room) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const map = {};
    allotments.filter(a => String(a.room._id) === String(room._id)).forEach(a => {
      map[`${a.row},${a.col}`] = a;
    });
    return { rows, cols, map };
  }

  function openMoviePreview(room) {
    setMovieRoomPreview(room);
  }

  function getStudentCounts(room, allotments) {
    const counts = {};
    allotments.filter(a => String(a.room._id) === String(room._id)).forEach(a => {
      const key = `${a.student.dept} - ${a.student.sem}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  async function downloadRoomPDF(room) {
    const element = document.createElement('div');
    const invigilatorName = invigAssignments.find(a => a.room._id === room._id)?.invigilator.name || "Not Assigned";
    
    const map = gridForRoom(room);
    const counts = getStudentCounts(room, allotments);
    const roomAllotments = allotments.filter(a => String(a.room._id) === String(room._id));
    const roomSubject = roomAllotments[0]?.subject || "";
    
    let gridHtml = '';
    Array.from({ length: map.rows }).flatMap((_, ri) =>
      Array.from({ length: map.cols }).map((__, ci) => {
        const r = ri + 1; const c = ci + 1; const key = `${r},${c}`;
        const a = map.map[key];
        const seatCode = a?.seatCode || getSeatLabel(ri, c);
        const roll = a?.student?.roll;
        const deptColorClass = a ? getDeptColor(a.student.dept, a.student.sem) : 'bg-gray-50';
        
        const bgColor = deptColorClass.replace('bg-red-200', '#fecaca')
                                      .replace('bg-yellow-200', '#fef08a')
                                      .replace('bg-green-200', '#d9f991')
                                      .replace('bg-blue-200', '#bfdbfe')
                                      .replace('bg-indigo-200', '#c7d2fe')
                                      .replace('bg-purple-200', '#e9d5ff')
                                      .replace('bg-pink-200', '#fbcfe8')
                                      .replace('bg-red-300', '#fca5a5')
                                      .replace('bg-yellow-300', '#fde047')
                                      .replace('bg-green-300', '#a3e635')
                                      .replace('bg-blue-300', '#93c5fd')
                                      .replace('bg-indigo-300', '#a5b4fc')
                                      .replace('bg-purple-300', '#d8b4fe')
                                      .replace('bg-pink-300', '#f9a8d4')
                                      .replace('bg-gray-50', '#f9fafb');

        const isRowGap = useDistancing && rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
        const isColGap = useDistancing && colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
        const isLayoutGap = isRowGap || isColGap;
        const isHidden = isLayoutGap && gapType === 'physical-gap' && !a;

        const style = isHidden 
          ? `width: 72px; height: 54px; border: none; background-color: transparent; opacity: 0; pointer-events: none;`
          : `width: 72px; height: 54px; border: 1px solid #374151; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; text-align: center; padding: 2px; background-color: ${bgColor};`;

        gridHtml += `
          <div style="${style}">
            ${isHidden ? '' : `
              <div style="font-weight: 600; color: #dc2626; font-size: 10px;">${seatCode}</div>
              <div style="font-size: 8px;">${roll ? `(${roll})` : '-'}</div>
              ${a ? `
                <div style="font-size: 6px; line-height: 1;">
                  <div>${a.student.name}</div>
                  <div>${a.student.dept} - ${a.student.sem}</div>
                </div>
              ` : ''}
            `}
          </div>
        `;
      })
    );
    
    let countsHtml = '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
    for (const [key, value] of Object.entries(counts)) {
      const [dept, sem] = key.split(' - ');
      const deptColorClass = getDeptColor(dept, sem);
      const bgColor = deptColorClass.replace('bg-red-200', '#fecaca')
                                      .replace('bg-yellow-200', '#fef08a')
                                      .replace('bg-green-200', '#d9f991')
                                      .replace('bg-blue-200', '#bfdbfe')
                                      .replace('bg-indigo-200', '#c7d2fe')
                                      .replace('bg-purple-200', '#e9d5ff')
                                      .replace('bg-pink-200', '#fbcfe8')
                                      .replace('bg-red-300', '#fca5a5')
                                      .replace('bg-yellow-300', '#fde047')
                                      .replace('bg-green-300', '#a3e635')
                                      .replace('bg-blue-300', '#93c5fd')
                                      .replace('bg-indigo-300', '#a5b4fc')
                                      .replace('bg-purple-300', '#d8b4fe')
                                      .replace('bg-pink-300', '#f9a8d4')
                                      .replace('bg-gray-50', '#f9fafb');
      countsHtml += `<div style="display: flex; align-items: center; font-size: 10px; padding: 4px; border-radius: 4px; background-color: ${bgColor};">${key}: ${value}</div>`;
    }
    countsHtml += '</div>';

    element.innerHTML = `
      <div style="background-color: white; padding: 16px; border-radius: 8px; max-width: 100%; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: bold;">${room.name} — ${shift === 1 ? '10:00-13:00' : '14:00-17:00'}</h3>
          ${roomSubject ? `<span style="font-size: 12px; font-weight: 600; background-color: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 9999px;">${roomSubject}</span>` : ''}
        </div>
        <div style="margin-top: 12px; background-color: #fee2e2; padding: 12px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <div style="font-size: 12px; font-weight: bold; color: #dc2626;">EXAM HALL</div>
              <div style="font-size: 10px; color: #4b5563;">${room.name}</div>
              <div style="font-size: 10px; color: #4b5563;">Invigilator: ${invigilatorName}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; font-weight: 600;">${shift === 1 ? '10:00 - 13:00' : '14:00 - 17:00'}</div>
              <div style="font-size: 10px; color: black;">Shift</div>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <h4 style="font-size: 12px; font-weight: bold; margin-bottom: 4px;">Student Counts</h4>
            ${countsHtml}
          </div>

          <div style="overflow: auto;">
            <div style="display: grid; margin: 0 auto; grid-template-columns: repeat(${map.cols}, 72px); column-gap: 8px; row-gap: 8px;">
              ${gridHtml}
            </div>
          </div>

          <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 10px; color: #4b5563;">Format: Roomno.-A1-StudentRollno(xxxxxx)</div>
          </div>
        </div>
      </div>
    `;

    try {
      const opt = {
        margin: 0.5,
        filename: `room_${room.name}_shift${shift}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5 },
        jsPDF: { unit: 'in', format: 'a3', orientation: 'landscape' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showToast("Error downloading PDF. Please check the console for details.", "error");
    }
  }

  useEffect(() => {
    if (token) {
      fetchRooms();
      fetchAllotments();
      fetchInvigAssignments();
      fetchExamConfigs();
    }
  }, [token, shift, date]);

  const selectedScheduleCombos = React.useMemo(() => {
    const seen = new Set();
    const list = [];
    
    const activeSavedSchedule = schedules.find(s => s.date === date && s.shift === shift);
    const activeSavedConfig = activeSavedSchedule 
      ? (examConfigs.find(c => c.examType === (activeSavedSchedule.examType || 'College')) || activeConfig)
      : activeConfig;
      
    const label2 = activeSavedConfig?.fields.find(f => f.type === 'constraint_2')?.label || 'Sem';

    allotments.forEach(a => {
      if (a.student) {
        const key = `${a.student.dept} ${label2} ${a.student.sem}${a.subject ? ` (${a.subject})` : ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(key);
        }
      }
    });
    return list;
  }, [allotments, schedules, date, shift, examConfigs, activeConfig]);

  const isLoggedIn = Boolean(token);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center relative">
        <main className="max-w-xl mx-auto">
          {showRegister ? (
            <Register onRegister={doRegister} onToggle={() => setShowRegister(false)} showToast={showToast} />
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4 text-black">Admin Login</h2>
              <div className="flex gap-3">
                <input className="flex-1 border rounded px-3 py-2 text-black" placeholder="username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
                <input className="flex-1 border rounded px-3 py-2 text-black" placeholder="password" type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
                <button onClick={doLogin} className="bg-red-700 text-white px-4 py-2 rounded">Login</button>
              </div>
              <p className="text-sm text-center mt-4 text-black">
                Don't have an account?{' '}
                <button onClick={() => setShowRegister(true)} className="text-red-700 hover:underline">
                  Register
                </button>
              </p>
            </div>
          )}
        </main>

        {/* Toast Notifications Container for Login/Register */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`p-4 rounded-xl shadow-lg border text-white font-medium flex items-center gap-3 animate-slideIn transition-all duration-300 pointer-events-auto ${
                t.type === 'success' ? 'bg-green-600 border-green-500' :
                t.type === 'error' ? 'bg-red-600 border-red-500' :
                t.type === 'warning' ? 'bg-amber-600 border-amber-500' :
                'bg-blue-600 border-blue-500'
              }`}
            >
              {t.type === 'success' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {t.type === 'error' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {t.type === 'warning' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {t.type === 'info' && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="text-xs">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout logout={logout} activeTab={activeTab} setActiveTab={setActiveTab}>
        <div id="Students">
          <section className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-semibold text-red-700 mb-2">1) Import Students</h3>
          
          {userRole === "admin" ? (
            <>
              {/* Exam Configuration & Settings */}
              <div className="mb-6 p-5 border border-gray-200 bg-gray-50/30 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Exam Type & Fields Configuration</h4>
                    <p className="text-[11px] text-gray-500">Configure custom column fields, labels, and templates for this exam format.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={selectedExamType}
                      onChange={(e) => {
                        setSelectedExamType(e.target.value);
                        localStorage.setItem("selectedExamType", e.target.value);
                      }}
                      className="border rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-semibold"
                    >
                      {uniqueExamTypes.map(et => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                    <button
                      onClick={createNewExamType}
                      className="bg-red-700 hover:bg-red-800 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer"
                    >
                      + New Exam Type
                    </button>
                    {selectedExamType !== "College" && selectedExamType !== "School" && selectedExamType !== "Competitive" && (
                      <button
                        onClick={deleteActiveExamType}
                        className="border border-red-200 hover:bg-red-50 text-red-600 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Delete Type
                      </button>
                    )}
                  </div>
                </div>

                {/* Fields configuration editor */}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
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
                            {field.type === 'custom' && 'Additional Custom Field'}
                          </span>
                          <div className="flex gap-2 mt-1">
                            <div className="flex-[2]">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                                placeholder="Field Label"
                                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white font-medium"
                              />
                            </div>
                            {field.type === 'custom' && (
                              <div className="flex-[1]">
                                <input
                                  type="text"
                                  value={field.sampleValue || ""}
                                  onChange={(e) => updateFieldSampleValue(field.key, e.target.value)}
                                  placeholder="Sample Value"
                                  title="Sample value for templates"
                                  className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1 text-xs bg-white font-medium"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {field.type === 'custom' && (
                          <button
                            onClick={() => removeCustomField(field.key)}
                            className="text-red-500 hover:text-red-700 p-1 mt-4"
                            title="Remove Field"
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
                      + Add Custom Field
                    </button>
                    <button
                      onClick={saveExamConfig}
                      className="bg-green-700 hover:bg-green-800 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors shadow cursor-pointer"
                    >
                      Save Fields Layout
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <p className="text-xs text-gray-600">
                  Drag and drop your roster file, or download templates configured for your active fields:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadTemplate("xlsx")}
                    className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    Download Excel Template
                  </button>
                  <button
                    onClick={() => downloadTemplate("csv")}
                    className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    Download CSV Template
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? "border-red-600 bg-red-50/50 scale-[0.99] shadow-inner"
                    : "border-gray-300 hover:border-red-500 hover:bg-gray-50/50"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={`p-4 rounded-full bg-red-50 text-red-700 transition-transform duration-300 ${isDragging ? 'scale-110' : 'hover:scale-110'}`}>
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">Click to upload</span> or drag and drop
                  </div>
                  <div className="text-xs text-gray-500 max-w-lg mx-auto">
                    Expected Columns: <span className="font-mono text-red-700 font-semibold">{activeConfig.fields.map(f => f.label).join(", ")}</span>
                  </div>
                </div>
              </div>

              {/* Selected File Details & Preview */}
              {selectedFile && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 border border-green-200 bg-green-50/50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-800 rounded-lg">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{selectedFile.name}</div>
                        <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB • {parsedCount} students detected</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={importParsedData}
                        className="bg-green-700 hover:bg-green-800 text-white font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors shadow cursor-pointer"
                      >
                        Import {parsedCount} Students
                      </button>
                      <button
                        onClick={clearSelectedFile}
                        className="border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium py-1.5 px-3 rounded-lg text-sm transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Roster Preview Data Table */}
                  {parsedCsvText && (() => {
                    const { headers, rows } = getPreviewRows();
                    if (headers.length === 0) return null;
                    const previewRows = rows.slice(0, 5);
                    const remainingCount = rows.length - previewRows.length;
                    return (
                      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden animate-fadeIn">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-150 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Roster File Preview</h4>
                            <p className="text-[10px] text-gray-500 mt-0.5">Verify that columns map correctly to your active fields before uploading.</p>
                          </div>
                          <span className="text-[10px] bg-red-55 text-red-700 px-2.5 py-0.5 rounded-md font-bold border border-red-100">
                            {selectedExamType} Layout
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                {headers.map((h, i) => (
                                  <th key={i} className="px-4 py-2.5 font-bold">{getHeaderLabel(h)}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium text-gray-750">
                              {previewRows.map((row, ri) => (
                                <tr key={ri} className="hover:bg-gray-50/50">
                                  {headers.map((h, ci) => (
                                    <td key={ci} className="px-4 py-2.5 font-mono text-[11px] text-gray-800">
                                      {row[ci] || <span className="text-gray-400 italic">empty</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {remainingCount > 0 && (
                          <div className="px-4 py-2 bg-gray-50 text-[10px] font-semibold text-gray-500 border-t border-gray-100 text-center">
                            ... and {remainingCount} more student record{remainingCount > 1 ? 's' : ''} inside this file
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Manual paste accordion */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowManualPaste(!showManualPaste)}
                  className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-700 hover:text-red-700 transition-colors"
                >
                  <span>Or paste CSV text manually</span>
                  <svg
                    className={`w-4 h-4 transform transition-transform duration-200 ${showManualPaste ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showManualPaste && (
                  <div className="mt-3 animate-fadeIn">
                    <p className="text-[11px] text-gray-500 mb-2">Paste raw CSV matching standard headers: <span className="font-mono text-red-700 font-semibold">{activeConfig.fields.map(f => f.label).join(",")}</span></p>
                    <textarea
                      className="w-full h-40 border rounded-xl p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50/30"
                      value={csvText}
                      onChange={e => setCsvText(e.target.value)}
                      placeholder={activeConfig.fields.map(f => f.label).join(",") + "\n" + activeConfig.fields.map(f => f.type === 'identifier' ? '233001' : (f.type === 'name' ? 'Jane Doe' : 'Sample')).join(",")}
                    />
                    <div className="mt-3 flex gap-2">
                      <button onClick={importCSV} className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors text-sm cursor-pointer">
                        Import CSV Text
                      </button>
                      <button onClick={() => setCsvText("")} className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer">
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center animate-fadeIn select-none">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h4 className="text-sm font-bold text-gray-800">Roster Administration Restricted</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-md">
                Staff members have read-only access. Importing new student rosters, configuring exam types, and defining custom fields can only be performed by the Administrator.
              </p>
            </div>
          )}
        </section>

        {/* 2) Student Roster Directory */}
        <section className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-md font-semibold text-red-700">2) Student Roster Directory</h3>
              <p className="text-[11px] text-gray-500">View, search, filter, and manage all students enrolled in this organization.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportStudentsCSV}
                className="text-xs border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
              {userRole === "admin" && (
                <button
                  onClick={() => openStudentModal()}
                  className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Student
                </button>
              )}
            </div>
          </div>

          {/* Filtering Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search Name/Roll</label>
              <div className="relative">
                <input
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg pl-8 pr-3 py-1.5 text-xs bg-white font-medium"
                />
                <span className="absolute left-2.5 top-2 text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{getFieldLabel('constraint_1') || "Dept/Sec/Stream"}</label>
              <select
                value={studentFilterDept}
                onChange={(e) => setStudentFilterDept(e.target.value)}
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="">All Departments</option>
                {uniqueDepts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{getFieldLabel('constraint_2') || "Sem/Class"}</label>
              <select
                value={studentFilterSem}
                onChange={(e) => setStudentFilterSem(e.target.value)}
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="">All Semesters</option>
                {uniqueSems.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Exam Type</label>
              <select
                value={studentFilterExamType}
                onChange={(e) => setStudentFilterExamType(e.target.value)}
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="">All Exam Types</option>
                {uniqueExamTypes.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject</label>
              <select
                value={studentFilterSubject}
                onChange={(e) => setStudentFilterSubject(e.target.value)}
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium"
              >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {(studentFilterDept || studentFilterSem || studentFilterExamType || studentFilterSubject || studentSearchQuery) && (
            <div className="flex items-center justify-between text-xs bg-gray-50 border border-gray-150 px-3 py-2 rounded-xl mb-4">
              <span className="text-gray-600 font-medium">
                Active filters. Showing <strong className="text-gray-800">{filteredStudents.length}</strong> of {allStudents.length} total students.
              </span>
              <button
                onClick={() => {
                  setStudentSearchQuery("");
                  setStudentFilterDept("");
                  setStudentFilterSem("");
                  setStudentFilterExamType("");
                  setStudentFilterSubject("");
                }}
                className="text-red-700 hover:text-red-800 font-bold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Student Roster Table */}
          <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-150 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3 font-bold">{getFieldLabel('identifier') || "Roll No"}</th>
                    <th className="px-4 py-3 font-bold">{getFieldLabel('name') || "Student Name"}</th>
                    <th className="px-4 py-3 font-bold">Exam Type</th>
                    <th className="px-4 py-3 font-bold">{getFieldLabel('constraint_1') || "Dept"}</th>
                    <th className="px-4 py-3 font-bold">{getFieldLabel('constraint_2') || "Sem"}</th>
                    <th className="px-4 py-3 font-bold">Subjects</th>
                    {userRole === "admin" && <th className="px-4 py-3 font-bold text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-750">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={userRole === "admin" ? 7 : 6} className="px-4 py-8 text-center text-gray-500 italic">
                        No students found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const itemsPerPage = 15;
                      const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
                      const activePage = Math.min(studentPage, totalPages || 1);
                      const startIndex = (activePage - 1) * itemsPerPage;
                      const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

                      return (
                        <>
                          {paginatedStudents.map((st) => (
                            <tr key={st._id} className="hover:bg-gray-50/50">
                              <td className="px-4 py-2.5 font-mono text-[11px] text-gray-800 font-bold">{st.roll}</td>
                              <td className="px-4 py-2.5 text-gray-800">{st.name || <span className="text-gray-400 italic">No name</span>}</td>
                              <td className="px-4 py-2.5 text-gray-500 font-semibold">{st.examType || "College"}</td>
                              <td className="px-4 py-2.5 text-gray-600 font-semibold">{st.dept || <span className="text-gray-400 italic">-</span>}</td>
                              <td className="px-4 py-2.5 text-gray-600 font-semibold">{st.sem}</td>
                              <td className="px-4 py-2.5 text-gray-600">
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(st.subject) && st.subject.length > 0 ? (
                                    st.subject.map((sub, i) => (
                                      <span key={i} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-semibold animate-fadeIn">
                                        {sub}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 italic">-</span>
                                  )}
                                </div>
                              </td>
                              {userRole === "admin" && (
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <div className="inline-flex gap-2.5">
                                    <button
                                      onClick={() => openStudentModal(st)}
                                      className="text-blue-600 hover:text-blue-800 font-bold text-xs cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                      onClick={() => handleDeleteStudent(st._id)}
                                      className="text-red-600 hover:text-red-800 font-bold text-xs cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}

                          {totalPages > 1 && (
                            <tr>
                              <td colSpan={userRole === "admin" ? 7 : 6} className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Showing page {activePage} of {totalPages} ({filteredStudents.length} total students)
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      disabled={activePage === 1}
                                      onClick={() => setStudentPage(activePage - 1)}
                                      className={`px-3 py-1 rounded-lg border text-xs font-semibold select-none cursor-pointer transition-all ${
                                        activePage === 1
                                          ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-100"
                                          : "text-gray-700 border-gray-300 hover:bg-gray-100 bg-white"
                                      }`}
                                    >
                                      Previous
                                    </button>
                                    <button
                                      disabled={activePage === totalPages}
                                      onClick={() => setStudentPage(activePage + 1)}
                                      className={`px-3 py-1 rounded-lg border text-xs font-semibold select-none cursor-pointer transition-all ${
                                        activePage === totalPages
                                          ? "text-gray-400 border-gray-200 cursor-not-allowed bg-gray-100"
                                          : "text-gray-700 border-gray-300 hover:bg-gray-100 bg-white"
                                      }`}
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
      <div id="Rooms" className="space-y-6">
        {/* Rooms Listing */}
        <section className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between border-b border-gray-150 pb-2 mb-3">
            <h3 className="text-md font-semibold text-red-700">2) Rooms</h3>
            {userRole === "admin" && (
              <button onClick={addRoom} className="bg-red-700 hover:bg-red-800 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors shadow cursor-pointer">+ Add Room</button>
            )}
          </div>
          <div className="mt-3 flex flex-row flex-nowrap overflow-x-auto gap-4 pb-4 select-none">
            {rooms.map(r => {
                  const assignment = invigAssignments.find(a => a.room._id === r._id);
                  const invigilatorName = assignment ? assignment.invigilator.name : "Not Assigned";
                  const isActivePreview = movieRoomPreview && movieRoomPreview._id === r._id;
                  return (
                    <div key={r._id} className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all shrink-0 w-80 ${isActivePreview ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/10' : 'border-gray-200 bg-white'}`}>
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{r.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{r.rows} rows × {r.cols} cols</div>
                            <div className="text-xs text-gray-500">Invigilator: {invigilatorName}</div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => {
                              if (isActivePreview) {
                                setMovieRoomPreview(null);
                              } else {
                                openMoviePreview(r);
                              }
                            }} className={`text-xs border rounded-lg px-2.5 py-1 transition-colors text-center font-semibold cursor-pointer ${isActivePreview ? 'bg-red-700 text-white border-red-700 hover:bg-red-800' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-255'}`}>{isActivePreview ? 'Close Preview' : 'Preview'}</button>
                            <button onClick={() => downloadRoomPDF(r)} className="text-xs border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 rounded-lg px-2.5 py-1 transition-colors text-center font-semibold cursor-pointer">Download PDF</button>
                          </div>
                        </div>
                                            {roomSchedules[r._id] && roomSchedules[r._id].length > 0 ? (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 max-h-32 overflow-y-auto">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Allocated Schedules (Click to Preview):</div>
                            {roomSchedules[r._id].map((sch, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  openMoviePreview(r);
                                  setDate(sch.date);
                                  setShift(Number(sch.shift));
                                  const matchedSched = schedules.find(s => s.date === sch.date && Number(s.shift) === Number(sch.shift));
                                  if (matchedSched) {
                                    if (matchedSched.time) setTime(matchedSched.time);
                                    if (matchedSched.subject) setSubject(matchedSched.subject);
                                    if (matchedSched.examType) {
                                      setSelectedExamType(matchedSched.examType);
                                      localStorage.setItem("selectedExamType", matchedSched.examType);
                                    }
                                  }
                                }}
                                className="text-[10px] text-gray-700 bg-gray-50/50 hover:bg-red-50 hover:border-red-200 p-2 rounded-lg border border-gray-100/70 flex items-center justify-between cursor-pointer transition-all select-none"
                                title="Click to view preview for this schedule"
                              >
                                <div className="truncate pr-1">
                                  <span className="font-bold text-gray-800">{sch.date}</span> <span className="text-gray-500 font-semibold">(S{sch.shift})</span>
                                  {sch.subjects.length > 0 && <span className="text-[9px] text-gray-550 ml-1 block truncate">[{sch.subjects.join(', ')}]</span>}
                                </div>
                                <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold shrink-0">{sch.studentCount} seats</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-400 italic mt-3 pt-3 border-t border-gray-100">No schedules allocated.</div>
                        )}
                      </div>
                      
                      {userRole === "admin" && (
                        <div className="flex gap-1.5 mt-3 pt-2.5 border-t border-gray-100">
                          <button onClick={() => editRoom(r)} className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-2.5 py-1.5 flex-1 font-bold text-center transition-colors shadow-xs cursor-pointer">Edit</button>
                          <button onClick={() => deleteRoom(r)} className="text-[10px] bg-red-600 hover:bg-red-700 text-white rounded-lg px-2.5 py-1.5 flex-1 font-bold text-center transition-colors shadow-xs cursor-pointer">Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

          {/* Right panel: Active Room Preview Visualizer */}
          {movieRoomPreview && (
            <div className="w-full">
              <section className="bg-white shadow rounded-lg p-6 animate-fadeIn relative">
                {/* Close Button in header */}
                <button
                  onClick={() => setMovieRoomPreview(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 border border-gray-150 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-150 select-none pr-8">
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm">Previewing Room: {movieRoomPreview.name}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">Select a schedule slot or adjust date/shift directly to preview active arrangements.</p>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Quick Select Slot</label>
                      <select
                        value={`${date}_${shift}`}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          const [newDate, newShift] = e.target.value.split("_");
                          const s = schedules.find(sched => sched.date === newDate && Number(sched.shift) === Number(newShift));
                          if (s) {
                            setDate(s.date);
                            setShift(Number(s.shift));
                            if (s.time) setTime(s.time);
                            if (s.subject) setSubject(s.subject);
                            if (s.examType) {
                              setSelectedExamType(s.examType);
                              localStorage.setItem("selectedExamType", s.examType);
                            }
                          }
                        }}
                        className="border border-gray-250 rounded-lg px-2.5 py-1 text-xs bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm transition-all cursor-pointer w-44"
                      >
                        <option value="">Select a slot...</option>
                        {(() => {
                          const roomAllocated = roomSchedules[movieRoomPreview._id] || [];
                          const allocatedKeys = new Set(roomAllocated.map(sch => `${sch.date}_${sch.shift}`));
                          
                          const otherSchedules = schedules.filter(s => !allocatedKeys.has(`${s.date}_${s.shift}`));

                          return (
                            <>
                              {roomAllocated.length > 0 && (
                                <optgroup label="Allocated in this Room">
                                  {roomAllocated.map((sch, idx) => (
                                    <option key={`alloc-${idx}`} value={`${sch.date}_${sch.shift}`}>
                                      {sch.date} — Shift {sch.shift} ({sch.subjects.join(', ') || 'No subject'})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {otherSchedules.length > 0 && (
                                <optgroup label="Other Saved Slots">
                                  {otherSchedules.map((sch, idx) => (
                                    <option key={`other-${idx}`} value={`${sch.date}_${sch.shift}`}>
                                      {sch.date} — Shift {sch.shift} ({sch.subject || 'No subject'})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </>
                          );
                        })()}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Date</label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-gray-250 rounded-lg px-2.5 py-1 text-xs bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm w-32"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Shift</label>
                      <select
                        value={shift}
                        onChange={(e) => setShift(Number(e.target.value))}
                        className="border border-gray-250 rounded-lg px-2.5 py-1 text-xs bg-white text-black font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm cursor-pointer w-20"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <RoomPreview
                  room={movieRoomPreview}
                  allotments={allotments}
                  invigilatorName={invigAssignments.find(a => a.room._id === movieRoomPreview._id)?.invigilator.name || "Not Assigned"}
                  shift={shift}
                  date={date}
                  getStudentCounts={getStudentCounts}
                  getFieldLabel={getFieldLabel}
                  useDistancing={useDistancing}
                  rowGrouping={rowGrouping}
                  colGrouping={colGrouping}
                  gapType={gapType}
                  gapAction={gapAction}
                />
              </section>
            </div>
          )}
      </div>
      <div id="Invigilators">
        <Invigilators
          token={token}
          invigilators={invigilators}
          onAdd={addInvigilator}
          onAssign={assignInvigilators}
          onRefresh={fetchInvigilators}
          triggerConfirm={triggerConfirm}
          showToast={showToast}
          userRole={userRole}
        />
        {distributors.length > 0 && (
          <section className="bg-white shadow rounded-lg p-6 mt-6">
            <h3 className="text-md font-semibold text-red-700">Distributors</h3>
            <ul className="list-disc pl-5 mt-2">
              {distributors.map((distributor) => (
                <li key={distributor._id} className="mb-1">
                  {distributor.name} ({distributor.empId})
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="bg-white shadow rounded-lg p-6 mt-6">
          <h3 className="text-md font-semibold text-red-700">Duty Chart</h3>
          <div className="mt-3">
             <DutyChart token={token} />
          </div>
        </section>
      </div>
      <div id="Allotment">
        <section className="bg-white shadow rounded-lg p-6">
          <h3 className="text-md font-semibold text-red-700">3) Generate</h3>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-0.5">Exam Type</label>
                    <select
                      value={selectedExamType}
                      onChange={(e) => {
                        setSelectedExamType(e.target.value);
                        localStorage.setItem("selectedExamType", e.target.value);
                      }}
                      className="border border-red-300 rounded px-2 py-1 text-xs font-bold text-red-800 bg-red-50/50 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                    >
                      {uniqueExamTypes.map(et => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded px-2 py-1" />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Time</label>
                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border rounded px-2 py-1" />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Shift</label>
                    <select value={shift} onChange={e => setShift(Number(e.target.value))} className="border rounded px-2 py-1">
                    <option value={1}>1 — 10:00–13:00</option>
                    <option value={2}>2 — 14:00–17:00</option>
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-600">Seed</label>
                    <input value={seed} onChange={e => setSeed(Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                </div>
            </div>

            {/* Single Class Distancing Layout Settings */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="useDistancing" 
                    checked={useDistancing} 
                    disabled={isLayoutSettingsLocked && allotments.length > 0}
                    onChange={e => {
                      const checked = e.target.checked;
                      setUseDistancing(checked);
                      if (checked) {
                        if (rooms.length > 0 && !previewRoomId) {
                          setPreviewRoomId(rooms[0]._id);
                        }
                        setShowDistancingModal(true);
                      }
                    }} 
                    className={`rounded text-red-700 w-4 h-4 ${isLayoutSettingsLocked && allotments.length > 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  />
                  <label htmlFor="useDistancing" className={`text-sm font-semibold text-gray-700 ${isLayoutSettingsLocked && allotments.length > 0 ? 'cursor-not-allowed text-gray-550' : 'cursor-pointer'}`}>
                    Single Class Distancing Layout (Empty seats/gaps between columns/rows) {isLayoutSettingsLocked && allotments.length > 0 && <span className="text-xs text-red-700 font-bold ml-1.5">(Locked)</span>}
                  </label>
                </div>
                {useDistancing && (
                  <button
                    type="button"
                    onClick={() => setShowDistancingModal(true)}
                    className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                  >
                    Configure & Preview Layout
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-4 border-t pt-3">
                 <div className="w-full">
                     <h4 className="font-semibold text-sm">Select {getFieldLabel('constraint_1')}-{getFieldLabel('constraint_2')} Combinations</h4>
                     <div className="flex gap-2 mt-2">
                         <select
                             value={selectedDept}
                             onChange={(e) => setSelectedDept(e.target.value)}
                             className="border rounded px-2 py-1 flex-1 text-xs"
                         >
                             <option value="">Select {getFieldLabel('constraint_1')}</option>
                             {meta.depts.map((d) => (
                                 <option key={d} value={d}>{d}</option>
                             ))}
                         </select>
                         <select
                             value={selectedSem}
                             onChange={(e) => setSelectedSem(e.target.value)}
                             className="border rounded px-2 py-1 flex-1 text-xs"
                         >
                             <option value="">Select {getFieldLabel('constraint_2')}</option>
                             {meta.sems.map((s) => (
                                 <option key={s} value={s}>{s}</option>
                             ))}
                         </select>
                         {(selectedExamType === "College" || selectedExamType === "School") && (
                           <select
                             value={selectedComboSubject}
                             onChange={(e) => setSelectedComboSubject(e.target.value)}
                             className="border rounded px-2 py-1 flex-1 text-xs bg-white"
                           >
                             <option value="">Select Subject</option>
                             {meta.subjects?.map((sub) => (
                               <option key={sub} value={sub}>{sub}</option>
                             ))}
                           </select>
                         )}
                         {userRole === "admin" && (
                            <button
                                onClick={addDeptSemCombination}
                                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-xs"
                                disabled={!selectedDept || !selectedSem || ((selectedExamType === "College" || selectedExamType === "School") && !selectedComboSubject)}
                            >
                                Add
                            </button>
                          )}
                     </div>
                     <div className="mt-3 max-h-40 overflow-y-auto border p-2 rounded bg-gray-50">
                         {deptSemCombinations.length === 0 ? (
                             <p className="text-gray-500 text-sm">No combinations added yet.</p>
                         ) : (
                             <ul className="space-y-1">
                                  {deptSemCombinations.map((combo, index) => (
                                      <li key={`${combo.dept}-${combo.sem}-${index}`} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-xs">
                                          <span>
                                            {getFieldLabel('constraint_1')}: {combo.dept} — {getFieldLabel('constraint_2')}: {combo.sem}
                                            {combo.subject && ` — Subject: ${combo.subject}`}
                                          </span>
                                          {userRole === "admin" && (
                                            <button
                                                onClick={() => removeDeptSemCombination(index)}
                                                className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded cursor-pointer"
                                            >
                                                Remove
                                            </button>
                                          )}
                                      </li>
                                  ))}
                             </ul>
                         )}
                     </div>
                 </div>
            </div>

            <div className="mt-3 flex gap-3">
                {userRole === "admin" && <button onClick={generate} className="bg-red-700 text-white px-4 py-2 rounded">Generate Allotment</button>}
                <button onClick={downloadCSV} className="border px-3 py-2 rounded">Download CSV</button>
                <button onClick={() => downloadRoomGrid(rooms[0]?._id, 'csv')} className="text-sm border rounded px-2 py-1">Grid CSV</button>
                <button onClick={() => downloadRoomGrid(rooms[0]?._id, 'json')} className="text-sm border rounded px-2 py-1">Grid JSON</button>
            </div>
          </div>
        </section>

        {schedules.length > 0 && (
          <section className="bg-white shadow rounded-lg p-6 mt-6">
            <h3 className="text-md font-semibold text-red-700">Saved Schedules</h3>
            <div className="flex flex-row overflow-x-auto gap-3 mt-3 pb-2.5 scrollbar-thin">
              {schedules.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { 
                    setDate(s.date); 
                    setShift(s.shift); 
                    if (s.time) setTime(s.time); 
                    if (s.subject) setSubject(s.subject); 
                    if (s.examType) {
                      setSelectedExamType(s.examType);
                      localStorage.setItem("selectedExamType", s.examType);
                    }
                    setIsLayoutSettingsLocked(true);
                  }}
                  className={`p-4 rounded-xl border text-left text-sm transition-all duration-200 hover:shadow-md max-w-xs w-full flex flex-col justify-between cursor-pointer shrink-0 ${
                    date === s.date && shift === s.shift 
                      ? 'bg-red-50/50 border-red-500 ring-2 ring-red-500/10' 
                      : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm'
                  }`}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="font-bold text-gray-800 text-xs shrink-0">{s.date}</span>
                      <span className="text-[9px] bg-red-550/10 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-100 shrink-0">
                        {s.examType || 'College'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-gray-700">
                      Shift {s.shift} {s.time ? `(${s.time})` : ''}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-2 space-y-1 border-t border-gray-100 pt-2 w-full text-left select-none">
                      {(() => {
                        const cardConfig = examConfigs.find(c => c.examType === (s.examType || 'College'));
                        const label1 = cardConfig?.fields.find(f => f.type === 'constraint_1')?.label || 'Dept';
                        const label2 = cardConfig?.fields.find(f => f.type === 'constraint_2')?.label || 'Sem';
                        
                        if (s.combinations && s.combinations.length > 0) {
                          const formattedCombos = s.combinations.map(combo => {
                            const parts = [];
                            if (combo.dept) {
                              parts.push(`${label1} ${combo.dept}`);
                            }
                            if (combo.sem) {
                              parts.push(`${label2} ${combo.sem}`);
                            }
                            const mainText = parts.join(" ");
                            return combo.subject ? `${mainText} (${combo.subject})` : mainText;
                          });

                          return (
                            <div className="space-y-1 mt-1">
                              {formattedCombos.map((comboText, idx) => (
                                <div key={idx} className="text-gray-700 font-semibold truncate block w-full text-left select-none" title={comboText}>
                                  • {comboText}
                                </div>
                              ))}
                            </div>
                          );
                        }

                        // Fallback for older schedules
                        const plural = (word) => {
                          const wl = word.toLowerCase();
                          if (wl === 'class') return 'Classes';
                          if (wl === 'sem') return 'Sems';
                          if (wl === 'semester') return 'Semesters';
                          if (wl === 'dept') return 'Depts';
                          if (wl === 'department') return 'Departments';
                          if (wl === 'section') return 'Sections';
                          if (wl === 'stream') return 'Streams';
                          if (wl === 'subject') return 'Subjects';
                          return `${word}s`;
                        };

                        return (
                          <>
                            {s.depts && s.depts.length > 0 && (
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-gray-600 shrink-0">{plural(label1)}:</span> 
                                <span className="text-gray-800 truncate block w-full text-left" title={s.depts.join(', ')}>{s.depts.join(', ')}</span>
                              </div>
                            )}
                            {s.sems && s.sems.length > 0 && (
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-gray-600 shrink-0">{plural(label2)}:</span> 
                                <span className="text-gray-800 text-left">{s.sems.join(', ')}</span>
                              </div>
                            )}
                            {s.sections && s.sections.length > 0 && s.examType !== "School" && (
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-gray-600 shrink-0">Sec:</span> 
                                <span className="text-gray-800 truncate block w-full text-left" title={s.sections.join(', ')}>{s.sections.join(', ')}</span>
                              </div>
                            )}
                            {s.subjects && s.subjects.length > 0 && (
                              <div className="flex items-start gap-1">
                                <span className="font-bold text-gray-600 shrink-0">Subs:</span> 
                                <span className="text-gray-800 truncate block w-full text-left" title={s.subjects.join(', ')}>{s.subjects.join(', ')}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Saved Schedule Details */}
            {schedules.some(s => s.date === date && s.shift === shift) && (() => {
              const activeSavedSchedule = schedules.find(s => s.date === date && s.shift === shift);
              const activeSavedConfig = activeSavedSchedule 
                ? (examConfigs.find(c => c.examType === (activeSavedSchedule.examType || 'College')) || activeConfig)
                : activeConfig;
                
              const label1 = activeSavedConfig?.fields.find(f => f.type === 'constraint_1')?.label || 'Dept';
              const decoded = decodeToken(token);
              const userRole = decoded?.role || "admin";
              
              const plural = (word) => {
                const wl = (word || "").toLowerCase();
                if (wl === 'class') return 'Classes';
                if (wl === 'sem') return 'Sems';
                if (wl === 'semester') return 'Semesters';
                if (wl === 'dept') return 'Depts';
                if (wl === 'department') return 'Departments';
                if (wl === 'section') return 'Sections';
                if (wl === 'stream') return 'Streams';
                if (wl === 'subject') return 'Subjects';
                return `${word}s`;
              };

              return (
                <div className="mt-5 p-4 border border-red-200 bg-red-50/10 rounded-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-red-700 text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                        Selected saved arrangement details
                      </h4>
                      <div className="text-xs text-black mt-1.5 space-y-1">
                        <div>
                          <strong className="text-gray-600">Date:</strong> {date} &nbsp;|&nbsp; 
                          <strong className="text-gray-600">Shift:</strong> {shift} {time ? `(${time})` : ''} &nbsp;|&nbsp;
                          <strong className="text-gray-600">Type:</strong> <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase text-[9px]">{activeSavedSchedule?.examType || 'College'}</span>
                        </div>
                        <div>
                          <strong className="text-gray-600">{plural(label1)}:</strong>{' '}
                          {selectedScheduleCombos.length > 0 ? (
                            <span className="text-black font-medium">{selectedScheduleCombos.join(', ')}</span>
                          ) : (
                            <span className="text-gray-400 italic">No allotments found for this slot.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        onClick={() => saveToLibrary(activeSavedSchedule)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5 animate-fadeIn"
                        title="Save this arrangement to your library"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Save to Library
                      </button>
                      
                      {userRole === "admin" && (
                        <>
                          {isLayoutSettingsLocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setIsLayoutSettingsLocked(false);
                                showToast("Spacing settings unlocked for editing.", "success");
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                              Unlock Spacing Settings
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsLayoutSettingsLocked(true);
                                showToast("Spacing settings locked.", "info");
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer h-[38px] flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Lock Spacing Settings
                            </button>
                          )}
                        </>
                      )}

                      <div className="flex flex-col">
                        <label className="text-xs font-semibold text-gray-600 mb-1">Regeneration Seed</label>
                        <input
                          type="number"
                          value={seed}
                          disabled={userRole !== "admin"}
                          onChange={e => setSeed(Number(e.target.value))}
                          className={`border rounded px-3 py-1.5 w-24 text-sm font-semibold ${userRole !== "admin" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white text-black"}`}
                          placeholder="Seed"
                        />
                      </div>

                      {userRole === "admin" && (
                        <button
                          onClick={regenerateSchedule}
                          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-sm font-semibold transition-all shadow-sm h-[38px] cursor-pointer"
                        >
                          Regenerate Arrangement
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comments/Discussion Section */}
                  <div className="mt-5 border-t border-red-200/40 pt-4 text-left animate-fadeIn">
                    <h5 className="font-bold text-gray-700 text-xs flex items-center gap-1.5 mb-3">
                      <svg className="w-4 h-4 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Discussion & Comments
                    </h5>
                    
                    {comments.length === 0 ? (
                      <p className="text-xs italic text-gray-500 mb-4 pl-1">No comments on this arrangement yet. Feel free to start the discussion!</p>
                    ) : (
                      <div className="space-y-2.5 mb-4 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {comments.map((comment) => (
                          <div key={comment._id} className="p-3 bg-white border border-gray-150 rounded-xl text-xs shadow-2xs hover:shadow-xs transition-shadow">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-bold text-gray-800 flex items-center gap-1">
                                {comment.user?.name || comment.user?.username || "Staff User"}
                                <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                                  comment.user?.role === "admin" 
                                    ? "bg-red-50 border-red-100 text-red-700" 
                                    : "bg-blue-50 border-blue-100 text-blue-700"
                                }`}>
                                  {comment.user?.role || "Staff"}
                                </span>
                              </span>
                              <span className="text-[9px] text-gray-400 font-medium">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 font-medium leading-relaxed">{comment.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        placeholder="Add a comment or note about this arrangement..."
                        className="flex-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-xl px-3 py-1.5 text-xs bg-white text-black font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addComment();
                          }
                        }}
                      />
                      <button
                        onClick={addComment}
                        disabled={!newCommentText.trim()}
                        className="bg-red-700 hover:bg-red-800 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Comment
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}



        <section className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="flex flex-wrap items-center justify-between border-b border-gray-100 pb-3 mb-3 gap-2">
            <h3 className="text-md font-semibold text-red-700">4) View rooms (grid)</h3>
            <div className="flex items-center gap-3">
              {isSaving && (
                <div className="text-xs text-red-600 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
                  Saving changes...
                </div>
              )}
              {isLoggedIn && (
                <button
                  onClick={() => setShowBucketSidebar(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-xs animate-fadeIn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {showBucketSidebar ? 'Hide Staging Bucket' : `Show Staging Bucket (${bucket.length})`}
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <FilterControls allotments={allotments} onFilterChange={setFilters} getFieldLabel={getFieldLabel} />
          </div>
          <div className="mt-3 space-y-6">
            {rooms.map(room => {
              const g = gridForRoom(room);
              const roomAllotments = allotments.filter(a => String(a.room._id) === String(room._id));
              const roomSubject = roomAllotments[0]?.subject || "";

              const isBringTogether = useDistancing && gapType === 'physical-gap' && gapAction === 'bring-together';

              const colTracks = [];
              for (let c = 1; c <= g.cols; c++) {
                colTracks.push({ type: 'seat', originalCol: c });
                if (isBringTogether && colGrouping > 0 && c % colGrouping === 0 && c !== g.cols) {
                  colTracks.push({ type: 'spacer' });
                }
              }

              const rowTracks = [];
              for (let r = 1; r <= g.rows; r++) {
                rowTracks.push({ type: 'seat', originalRow: r });
                if (isBringTogether && rowGrouping > 0 && r % rowGrouping === 0 && r !== g.rows) {
                  rowTracks.push({ type: 'spacer' });
                }
              }

              const gridColsTemplate = isBringTogether
                ? colTracks.map(t => t.type === 'seat' ? '64px' : '16px').join(' ')
                : `repeat(${g.cols}, max-content)`;

              const gridRowsTemplate = isBringTogether
                ? rowTracks.map(t => t.type === 'seat' ? '56px' : '16px').join(' ')
                : undefined;

              return (
                <div key={room._id} className="">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold">
                      {room.name} — {room.rows}×{room.cols}
                      {roomSubject && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold ml-2">{roomSubject}</span>}
                      <span className="font-normal text-sm text-gray-600 ml-2">
                        ({invigAssignments.find(a => a.room._id === room._id)?.invigilator.name || "Not Assigned"})
                      </span>
                    </h4>
                    <div className="text-sm text-black">Hover a seat for details</div>
                  </div>
                  <div className="overflow-auto border rounded p-2 select-none">
                    <div 
                      className="inline-grid select-none" 
                      style={{ 
                        gridTemplateColumns: gridColsTemplate,
                        gridTemplateRows: gridRowsTemplate,
                        gap: 8 
                      }}
                    >
                      {rowTracks.flatMap((rTrack, ri) =>
                        colTracks.map((cTrack, ci) => {
                          if (rTrack.type === 'spacer' || cTrack.type === 'spacer') {
                            return (
                              <div 
                                key={`spacer-${room._id}-${ri}-${ci}`} 
                                className="w-full h-full bg-transparent pointer-events-none select-none" 
                              />
                            );
                          }

                          const row = rTrack.originalRow;
                          const col = cTrack.originalCol;
                          const key = `${row},${col}`;
                          const entry = g.map[key];
                          const roll = entry?.student?.roll;
                          const seatCode = entry?.seatCode || getSeatLabel(row - 1, col);
                          const isVisible = !filters || (entry && filters.depts.includes(entry.student.dept) && filters.sems.includes(entry.student.sem));
                          
                          const isRowGap = useDistancing && gapAction !== 'bring-together' && rowGrouping > 0 && ((row - 1) % (rowGrouping + 1)) === rowGrouping;
                          const isColGap = useDistancing && gapAction !== 'bring-together' && colGrouping > 0 && ((col - 1) % (colGrouping + 1)) === colGrouping;
                          const isLayoutGap = isRowGap || isColGap;
                          const isHidden = !isDraggingStudent && isLayoutGap && gapType === 'physical-gap' && !entry;

                          const isSeatDragOver = dragOverSeatKey === `${room._id}-${row}-${col}`;

                          return (
                            <div
                              key={key}
                              onDragOver={(e) => {
                                if (userRole === "admin" && !isHidden) e.preventDefault();
                              }}
                              onDragEnter={() => {
                                if (userRole === "admin" && !isHidden) setDragOverSeatKey(`${room._id}-${row}-${col}`);
                              }}
                              onDragLeave={() => {
                                if (userRole === "admin") setDragOverSeatKey(null);
                              }}
                              onDrop={(e) => {
                                if (userRole === "admin") {
                                  setDragOverSeatKey(null);
                                  if (!isHidden) handleDropOnSeat(e, room, row, col);
                                }
                              }}
                              className={`w-16 h-14 flex items-center justify-center text-xs text-center p-1 transition-all rounded-lg border select-none ${
                                isHidden
                                  ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                                  : entry && isVisible
                                    ? `${getDeptColor(entry.student.dept, entry.student.sem)} border-gray-400 shadow-sm`
                                    : isLayoutGap
                                      ? 'border-2 border-dashed border-gray-300 bg-gray-100/70 text-gray-500'
                                      : 'border-gray-250 bg-white hover:bg-gray-50/50'
                                } ${
                                  isSeatDragOver ? 'border-2 border-dashed border-red-500 scale-105 bg-red-50/40 z-10' : ''
                                }`}
                              title={entry ? [
                                `Name: ${entry.student.name}`,
                                `${getFieldLabel('constraint_1')}: ${entry.student.dept}`,
                                `${getFieldLabel('constraint_2')}: ${entry.student.sem}`,
                                entry.student.metadata ? Object.entries(entry.student.metadata).map(([k, v]) => `${k}: ${v}`).join('\n') : ''
                              ].filter(Boolean).join('\n') : isHidden ? '' : isLayoutGap ? 'Distancing Layout Gap' : 'Empty Seat'}
                            >
                              {isVisible && entry ? (
                                <div
                                  draggable={userRole === "admin"}
                                  onDragStart={(e) => handleDragStartSeat(e, entry.student, room, row, col)}
                                  onDragEnd={() => setIsDraggingStudent(false)}
                                  className={`w-full h-full flex flex-col justify-center select-none transition-transform ${userRole === "admin" ? "cursor-grab active:cursor-grabbing hover:scale-[1.03] active:scale-95" : ""}`}
                                >
                                  <div className="font-bold text-gray-900 text-xs tracking-tight select-none">{roll ? roll : '-'}</div>
                                  <div className="text-[9px] font-bold text-gray-600 mt-0.5 select-none">{roll ? seatCode : ''}</div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex flex-col justify-center text-gray-400 select-none">
                                  {isHidden ? '' : (
                                    <>
                                      <span className="text-[10px] font-bold text-gray-400 select-none">{seatCode}</span>
                                      {isLayoutGap && <span className="text-[8px] text-gray-400 font-extrabold uppercase tracking-wider mt-0.5 select-none">GAP</span>}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>
        <div id="Profile">
          <div className="max-w-4xl mx-auto space-y-6 text-left">
            {/* Header / Info card */}
            <section className="bg-white shadow rounded-lg p-6 border border-gray-150">
              <div className="flex flex-wrap items-center justify-between gap-4">
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
                        <span className="text-xs bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-lg border border-red-100 font-mono tracking-wider">
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
                <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-red-750" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Staff Registration Requests
                </h3>

                {pendingStaff.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
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
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-red-750" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Saved Arrangements Library
              </h3>
              
              {library.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                  <svg className="w-12 h-12 text-gray-300 mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-bold text-xs text-gray-800">{item.date}</span>
                          <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                            {item.examType || "College"}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-gray-700">
                          Shift {item.shift} {item.time ? `(${item.time})` : ''}
                        </div>
                        {item.subject && (
                          <div className="text-[11px] font-semibold text-gray-600 mt-1 truncate">
                            Subject: {item.subject}
                          </div>
                        )}
                        <div className="text-[11px] text-gray-500 mt-2.5 pt-2 border-t border-gray-100 leading-normal space-y-1">
                          <span className="font-bold block text-gray-600 mb-1">Combinations:</span>
                          {item.combinations && item.combinations.length > 0 ? (
                            item.combinations.map((c, idx) => (
                              <div key={idx} className="truncate font-semibold text-gray-700 text-[10px]">
                                • {c.dept} Sem {c.sem} {c.subject ? `(${c.subject})` : ''}
                              </div>
                            ))
                          ) : (
                            <span className="italic">No combinations.</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 border-t border-gray-100 pt-3">
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
                            showToast(`Loaded layout for ${item.date} Shift ${item.shift}`, "success");
                          }}
                          className="bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex-1 transition-all cursor-pointer text-center"
                        >
                          Load Layout
                        </button>
                        <button
                          onClick={() => deleteFromLibrary(item._id)}
                          className="border border-red-200 hover:bg-red-50 text-red-600 font-bold py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center"
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
      </Layout>

    {/* Floating Staging Bucket Toggle Button */}
    {isLoggedIn && !showBucketSidebar && activeTab === "Allotment" && (
      <button
        onClick={() => setShowBucketSidebar(true)}
        className="fixed bottom-6 right-6 z-40 bg-red-700 hover:bg-red-800 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer group"
        title="Open Staging Bucket"
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
    {isLoggedIn && (
      <div 
        className={`fixed top-0 right-0 h-screen z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col transition-all duration-300 transform w-80 md:w-96 ${
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
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500"
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
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold"
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
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white text-black focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold animate-fadeIn"
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
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6 select-none">
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
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6 select-none">
                  <svg className="w-8 h-8 text-gray-300 mb-2 animate-bounce select-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs font-semibold text-gray-600 select-none">No matching students found</p>
                  <p className="text-[10px] text-gray-400 mt-1 select-none">Try filtering by a different roll number or name.</p>
                </div>
              );
            }

            return (
              <div className="space-y-2.5 animate-fadeIn select-none">
                {filteredBucket.map(student => (
                  <div
                    key={student._id}
                    draggable={userRole === "admin"}
                    onDragStart={(e) => handleDragStartBucket(e, student)}
                    onDragEnd={() => setIsDraggingStudent(false)}
                    className={`p-3 bg-white border border-gray-150 rounded-xl shadow-xs transition-all flex items-center justify-between select-none ${userRole === "admin" ? "hover:bg-gray-50 cursor-grab active:cursor-grabbing hover:scale-[1.01]" : ""}`}
                  >
                    <div className="select-none">
                      <div className="font-bold text-gray-800 text-xs select-none">{student.roll}</div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-0.5 select-none">{student.name}</div>
                      <div className="text-[9px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-md px-1.5 py-0.5 inline-block mt-1 uppercase tracking-wider select-none">
                        {student.dept} | {getFieldLabel('constraint_2')}: {student.sem}
                      </div>
                    </div>
                    {userRole === "admin" && (
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider select-none">
                        Drag
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    )}

  {/* Toast Notifications Container */}
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-xl shadow-lg border text-white font-medium flex items-center gap-3 animate-slideIn transition-all duration-300 pointer-events-auto ${
            t.type === 'success' ? 'bg-green-600 border-green-500' :
            t.type === 'error' ? 'bg-red-600 border-red-500' :
            t.type === 'warning' ? 'bg-amber-600 border-amber-500' :
            'bg-blue-600 border-blue-500'
          }`}
        >
          {t.type === 'success' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {t.type === 'error' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {t.type === 'info' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="text-xs">{t.message}</span>
        </div>
      ))}
    </div>



    {/* Distancing Config Modal */}
    {showDistancingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-6xl w-full p-6 animate-scaleIn mx-4 max-h-[90vh] flex flex-col text-left">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-red-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Class Distancing Layout Settings & Preview
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Configure row/column spacing and view live room capacity updates.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDistancingModal(false)}
              className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-all focus:outline-none cursor-pointer"
              title="Close settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Parallel layout body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
            {/* Left Column - Options */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Layout Configuration</h4>
                
                {isLayoutSettingsLocked && allotments.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-250 text-yellow-800 p-3 rounded-xl text-[11px] flex items-start gap-2 font-semibold leading-normal animate-fadeIn">
                    <svg className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Spacing settings are currently locked for this saved arrangement. Use the Unlock button in the details panel to edit.</span>
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">
                    Column Grouping (Consecutive occupied columns)
                  </label>
                  <input 
                    type="number" 
                    value={colGrouping} 
                    disabled={isLayoutSettingsLocked && allotments.length > 0}
                    onChange={e => setColGrouping(Number(e.target.value))} 
                    className={`border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-sm font-semibold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                    min="1"
                  />
                  <span className="text-[10px] text-gray-450 mt-1 font-medium">e.g. 2 columns together then a gap column</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">
                    Row Grouping (Consecutive occupied rows)
                  </label>
                  <input 
                    type="number" 
                    value={rowGrouping} 
                    disabled={isLayoutSettingsLocked && allotments.length > 0}
                    onChange={e => setRowGrouping(Number(e.target.value))} 
                    className={`border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-sm font-semibold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black'}`}
                    min="0"
                  />
                  <span className="text-[10px] text-gray-450 mt-1 font-medium">0 or empty for no row gap</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">
                    Gap Layout Representation
                  </label>
                  <select
                    value={getCombinedGapVal()}
                    disabled={isLayoutSettingsLocked && allotments.length > 0}
                    onChange={e => handleCombinedGapChange(e.target.value)}
                    className={`border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs font-bold ${isLayoutSettingsLocked && allotments.length > 0 ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-black cursor-pointer'}`}
                  >
                    <option value="empty-seat">Empty Seat Box</option>
                    <option value="physical-gap-remove">Blank Gap Space (Remove Seats)</option>
                    <option value="physical-gap-together">Blank Gap Space (Bring Seats Together)</option>
                  </select>
                  <span className="text-[10px] text-gray-450 mt-1 font-medium">Choose how empty spacing looks in the grid</span>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-gray-700 mb-1">Select Room to Visualize</label>
                  <select
                    value={previewRoomId}
                    onChange={e => setPreviewRoomId(e.target.value)}
                    className="border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-1.5 w-full text-xs bg-white text-black font-bold cursor-pointer"
                  >
                    <option value="">Select a Room</option>
                    {rooms.map(r => (
                      <option key={r._id} value={r._id}>{r.name} ({r.rows}x{r.cols})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-450 mt-1 font-medium">Choose which room layout to preview on the right</span>
                </div>
              </div>

              <div className="w-full text-xs text-gray-650 bg-yellow-50/50 p-3.5 rounded-xl border border-yellow-100 leading-relaxed font-medium">
                <strong>Layout Guide:</strong> For a 10x8 room, setting Column Grouping to 2 results in 2 adjacent active columns followed by a gap column (e.g. 10 x 2*4 format). Setting Row Grouping to 2 results in pairs of active rows with a gap row (e.g. 2*5 x 2*4 format).
              </div>
            </div>

            {/* Right Column - Live Visualizer Preview */}
            <div className="lg:col-span-7 flex flex-col min-h-0 bg-gray-50 border border-gray-150 rounded-2xl p-4">
              {(() => {
                const selectedRoom = rooms.find(r => r._id === previewRoomId);
                if (!selectedRoom) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-sm font-semibold text-gray-500">Please select a room to see the layout preview</p>
                    </div>
                  );
                }

                const rCount = Number(selectedRoom.rows);
                const cCount = Number(selectedRoom.cols);
                
                let totalSeats = rCount * cCount;
                let activeSeats = 0;
                const isSkippingGaps = gapType === 'empty-seat' || (gapType === 'physical-gap' && gapAction === 'remove-seats');
                
                for (let r = 1; r <= rCount; r++) {
                  const isRowGap = rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
                  if (isRowGap && isSkippingGaps) continue;
                  for (let c = 1; c <= cCount; c++) {
                    const isColGap = colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
                    if (isColGap && isSkippingGaps) continue;
                    activeSeats++;
                  }
                }
                const utilPercent = ((activeSeats / totalSeats) * 100).toFixed(1);

                return (
                  <div className="flex-1 flex flex-col min-h-0 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">
                        Live Seating Preview — {selectedRoom.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-semibold uppercase bg-gray-200 px-2 py-0.5 rounded">
                        {selectedRoom.rows} Rows x {selectedRoom.cols} Cols
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 text-left">
                      <div className="bg-red-50 text-red-700 p-2.5 rounded-xl border border-red-100">
                        <span className="text-[9px] font-bold text-red-800 uppercase block tracking-wider">Active Capacity</span>
                        <span className="text-xs font-extrabold">{activeSeats} / {totalSeats} seats</span>
                      </div>
                      <div className="bg-blue-50 text-blue-700 p-2.5 rounded-xl border border-blue-100">
                        <span className="text-[9px] font-bold text-blue-800 uppercase block tracking-wider">Seating Rate</span>
                        <span className="text-xs font-extrabold">{utilPercent}%</span>
                      </div>
                      <div className="bg-gray-150 text-gray-700 p-2.5 rounded-xl border border-gray-200">
                        <span className="text-[9px] font-bold text-gray-650 uppercase block tracking-wider">Gap Seats</span>
                        <span className="text-xs font-extrabold">{totalSeats - activeSeats} seats</span>
                      </div>
                    </div>

                    {/* Room Grid Preview Container */}
                    <div className="flex-1 border border-gray-200 rounded-xl p-3 bg-white overflow-auto flex items-center justify-center min-h-[220px]">
                      {(() => {
                        const isBringTogether = gapType === 'physical-gap' && gapAction === 'bring-together';

                        const colTracks = [];
                        for (let c = 1; c <= cCount; c++) {
                          colTracks.push({ type: 'seat', originalCol: c });
                          if (isBringTogether && colGrouping > 0 && c % colGrouping === 0 && c !== cCount) {
                            colTracks.push({ type: 'spacer' });
                          }
                        }

                        const rowTracks = [];
                        for (let r = 1; r <= rCount; r++) {
                          rowTracks.push({ type: 'seat', originalRow: r });
                          if (isBringTogether && rowGrouping > 0 && r % rowGrouping === 0 && r !== rCount) {
                            rowTracks.push({ type: 'spacer' });
                          }
                        }

                        const gridColsTemplate = isBringTogether
                          ? colTracks.map(t => t.type === 'seat' ? '36px' : '10px').join(' ')
                          : `repeat(${cCount}, minmax(36px, 1fr))`;

                        const gridRowsTemplate = isBringTogether
                          ? rowTracks.map(t => t.type === 'seat' ? '36px' : '10px').join(' ')
                          : undefined;

                        return (
                          <div 
                            className="inline-grid gap-1.5 border p-2 bg-white rounded-lg shadow-sm"
                            style={{ 
                              gridTemplateColumns: gridColsTemplate,
                              gridTemplateRows: gridRowsTemplate
                            }}
                          >
                            {rowTracks.flatMap((rTrack, ri) =>
                              colTracks.map((cTrack, ci) => {
                                if (rTrack.type === 'spacer' || cTrack.type === 'spacer') {
                                  return (
                                    <div 
                                      key={`spacer-preview-${ri}-${ci}`} 
                                      className="w-full h-full bg-transparent pointer-events-none" 
                                    />
                                  );
                                }

                                const r = rTrack.originalRow;
                                const c = cTrack.originalCol;
                                const isRowGap = rowGrouping > 0 && ((r - 1) % (rowGrouping + 1)) === rowGrouping;
                                const isColGap = colGrouping > 0 && ((c - 1) % (colGrouping + 1)) === colGrouping;
                                const isActive = !isRowGap && !isColGap;
                                const isHidden = !isActive && gapType === 'physical-gap';

                                return (
                                  <div
                                    key={`${r}-${c}`}
                                    className={`w-9 h-9 rounded text-[9px] font-bold flex flex-col items-center justify-center transition-all ${
                                      (isActive || isBringTogether) 
                                        ? 'bg-red-50 border border-red-200 text-red-700' 
                                        : isHidden
                                          ? 'border-none bg-transparent opacity-0 text-transparent pointer-events-none'
                                          : 'bg-gray-50 border border-gray-150 border-dashed text-gray-400'
                                    }`}
                                    title={(isActive || isBringTogether) ? `Seat ${r}-${c} (Active)` : `Seat ${r}-${c} (Empty Gap)`}
                                  >
                                    {isHidden && !isBringTogether ? '' : (
                                      <>
                                        <span>{String.fromCharCode(65 + (r - 1) % 26)}{c}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 text-[10px] border-t border-gray-200 pt-2 font-medium text-gray-500 shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
                        <span>Active Seat</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-50 border border-gray-150 border-dashed rounded"></div>
                        <span>Empty Gap</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-150 pt-3 mt-4 shrink-0">
            <button
              type="button"
              onClick={() => setShowDistancingModal(false)}
              className="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Student Add/Edit Modal */}
    {showStudentModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-scaleIn mx-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
            {editingStudent ? "Edit Student Details" : "Add New Student"}
          </h3>
          
          <form onSubmit={handleSaveStudent} className="space-y-4 mt-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                {getFieldLabel('identifier') || "Roll No"} *
              </label>
              <input
                type="text"
                required
                value={studentForm.roll}
                onChange={e => setStudentForm({ ...studentForm, roll: e.target.value })}
                placeholder="e.g. 233001"
                className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                {getFieldLabel('name') || "Student Name"}
              </label>
              <input
                type="text"
                value={studentForm.name}
                onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  {getFieldLabel('constraint_1') || "Dept/Sec/Stream"}
                </label>
                <input
                  type="text"
                  value={studentForm.dept}
                  onChange={e => setStudentForm({ ...studentForm, dept: e.target.value })}
                  placeholder="e.g. CSE"
                  className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  {getFieldLabel('constraint_2') || "Sem/Class"} *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.sem}
                  onChange={e => setStudentForm({ ...studentForm, sem: e.target.value })}
                  placeholder="e.g. 5"
                  className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                Exam Type *
              </label>
              <select
                required
                value={studentForm.examType}
                onChange={e => setStudentForm({ ...studentForm, examType: e.target.value })}
                className="w-full mt-1 border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
              >
                {uniqueExamTypes.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">
                Subjects (comma separated)
              </label>
              <input
                type="text"
                value={studentForm.subject}
                onChange={e => setStudentForm({ ...studentForm, subject: e.target.value })}
                placeholder="e.g. Mathematics, Physics, Chemistry"
                className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs font-medium bg-white"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow cursor-pointer"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Custom Dialog Modal */}
    {dialog.isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 animate-scaleIn mx-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">{dialog.title}</h3>
          
          <div className="mt-4">
            {dialog.message && <p className="text-xs text-gray-600 mb-4 whitespace-pre-line leading-relaxed">{dialog.message}</p>}
            
            {dialog.type === 'confirm-generation' && bucket.length > 0 && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-gray-50 border border-gray-150 rounded-xl">
                <input
                  type="checkbox"
                  id="dialog-include-bucket-checkbox"
                  defaultChecked={true}
                  className="rounded text-red-700 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <label 
                  htmlFor="dialog-include-bucket-checkbox" 
                  className="text-xs font-semibold text-gray-700 cursor-pointer select-none"
                >
                  Include staging bucket students ({bucket.length} students)
                </label>
              </div>
            )}

            {/* Inputs for Prompt/Text Input dialogs */}
            {dialog.type === 'prompt-exam' && (
              <input
                type="text"
                placeholder={dialog.placeholder}
                defaultValue={dialog.defaultValue}
                id="dialog-input-val"
                autoFocus
                className="w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-sm bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dialog.onConfirm(e.target.value);
                  }
                }}
              />
            )}
            {dialog.type === 'prompt-field' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Field Label Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Contact No"
                    id="dialog-input-label"
                    autoFocus
                    className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const labelEl = document.getElementById("dialog-input-label");
                        const sampleEl = document.getElementById("dialog-input-sample");
                        dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Sample Value (for Excel/CSV Template)</label>
                  <input
                    type="text"
                    placeholder="e.g. +1234567890"
                    id="dialog-input-sample"
                    className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs bg-white font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const labelEl = document.getElementById("dialog-input-label");
                        const sampleEl = document.getElementById("dialog-input-sample");
                        dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Input fields for Add/Edit Room modal */}
            {(dialog.type === 'add-room' || dialog.type === 'edit-room') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Room Name (e.g. A1)</label>
                  <input
                    type="text"
                    id="room-name-input"
                    placeholder="e.g. A1"
                    defaultValue={dialog.fields?.name || ""}
                    autoFocus
                    className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Rows</label>
                    <input
                      type="number"
                      id="room-rows-input"
                      defaultValue={dialog.fields?.rows || "10"}
                      min="1"
                      className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Columns</label>
                    <input
                      type="number"
                      id="room-cols-input"
                      defaultValue={dialog.fields?.cols || "10"}
                      min="1"
                      className="w-full mt-1 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
            {dialog.type !== 'alert' && (
              <button
                onClick={dialog.onCancel}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                if (dialog.type === 'prompt-exam') {
                  const el = document.getElementById("dialog-input-val");
                  dialog.onConfirm(el ? el.value : "");
                } else if (dialog.type === 'prompt-field') {
                  const labelEl = document.getElementById("dialog-input-label");
                  const sampleEl = document.getElementById("dialog-input-sample");
                  dialog.onConfirm(labelEl ? labelEl.value : "", sampleEl ? sampleEl.value : "");
                } else if (dialog.type === 'add-room' || dialog.type === 'edit-room') {
                  const name = document.getElementById("room-name-input")?.value || "";
                  const rows = document.getElementById("room-rows-input")?.value || "10";
                  const cols = document.getElementById("room-cols-input")?.value || "10";
                  dialog.onConfirm({ name, rows, cols });
                } else if (dialog.type === 'confirm-generation') {
                  const checkboxEl = document.getElementById("dialog-include-bucket-checkbox");
                  const includeBucket = checkboxEl ? checkboxEl.checked : true;
                  dialog.onConfirm(includeBucket);
                } else {
                  dialog.onConfirm();
                }
              }}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors shadow cursor-pointer"
            >
              {dialog.type === 'alert' ? 'OK' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
}
