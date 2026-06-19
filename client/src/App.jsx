import React, { useEffect, useState, useRef, useMemo } from "react";

import { useAuth } from "./context/AuthContext";
import { api } from "./services/api";
import { 
  getSeatLabel, 
  decodeToken, 
  getDeptColor, 
  prettySeatLabel,
  authHeader
} from "./utils/helpers";

import Layout from "./components/Layout";
const Invigilators = React.lazy(() => import("./components/Invigilators"));
const DutyChart = React.lazy(() => import("./components/DutyChart"));

const StudentsTab = React.lazy(() => import("./components/students/StudentsTab"));
const StudentModal = React.lazy(() => import("./components/students/StudentModal"));
const RoomsTab = React.lazy(() => import("./components/rooms/RoomsTab"));
const AllotmentTab = React.lazy(() => import("./components/allotments/AllotmentTab"));
const StagingBucket = React.lazy(() => import("./components/allotments/StagingBucket"));
const DistancingModal = React.lazy(() => import("./components/allotments/DistancingModal"));
const ProfileTab = React.lazy(() => import("./components/profile/ProfileTab"));
import LandingPage from "./components/landing/LandingPage";

import ToastContainer from "./components/common/ToastContainer";
import CustomDialog from "./components/common/CustomDialog";
import CursorFollower from "./components/common/CursorFollower";

export default function App() {
  const { token, login, logout, userRole, decoded, isLoggedIn } = useAuth();
  
  // View mode: "dashboard" or "landing"
  const [viewMode, setViewMode] = useState("dashboard");

  useEffect(() => {
    if (!isLoggedIn) {
      setViewMode("dashboard");
    }
  }, [isLoggedIn]);

  // Login & Registration state
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [showRegister, setShowRegister] = useState(false);
  
  // Tab control
  const [activeTab, setActiveTab] = useState("Students");

  // Touch selection / Tap-to-move state
  const [selectedStudentForMove, setSelectedStudentForMove] = useState(null);

  // Core Data States
  const [rooms, setRooms] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [roomSchedules, setRoomSchedules] = useState({});
  const [library, setLibrary] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [examConfigs, setExamConfigs] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [invigilators, setInvigilators] = useState([]);
  const [invigAssignments, setInvigAssignments] = useState([]);
  const [distributors, setDistributors] = useState([]);

  // Generate / Filter Slots States
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState("10:00");
  const [subject, setSubject] = useState("");
  const [shift, setShift] = useState(1);
  const [seed, setSeed] = useState(1);
  const [meta, setMeta] = useState({ depts: [], sems: [], subjects: [] });
  const [selectedExamType, setSelectedExamType] = useState("College");

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedComboSubject, setSelectedComboSubject] = useState('');
  const [deptSemCombinations, setDeptSemCombinations] = useState([]);

  // Distancing Layout configurations
  const [useDistancing, setUseDistancing] = useState(false);
  const [showDistancingModal, setShowDistancingModal] = useState(false);
  const [isLayoutSettingsLocked, setIsLayoutSettingsLocked] = useState(true);
  const [rowGrouping, setRowGrouping] = useState(0);
  const [colGrouping, setColGrouping] = useState(2);
  const [previewRoomId, setPreviewRoomId] = useState("");
  const [gapType, setGapType] = useState("empty-seat");
  const [gapAction, setGapAction] = useState("remove-seats");

  // Visual filters & previews
  const [filters, setFilters] = useState(null);
  const [movieRoomPreview, setMovieRoomPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Student directory states
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({ roll: "", name: "", dept: "", sem: "", subject: "", examType: "College" });
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentFilterDept, setStudentFilterDept] = useState("");
  const [studentFilterSem, setStudentFilterSem] = useState("");
  const [studentFilterExamType, setStudentFilterExamType] = useState("");
  const [studentFilterSubject, setStudentFilterSubject] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  // Drag and Drop & manual paste
  const [csvText, setCsvText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedCount, setParsedCount] = useState(0);
  const [parsedCsvText, setParsedCsvText] = useState("");
  const [showManualPaste, setShowManualPaste] = useState(false);
  const fileInputRef = useRef(null);

  // Staging bucket & rearrangement
  const [bucket, setBucket] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchRoll, setSearchRoll] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [dragOverBucket, setDragOverBucket] = useState(false);
  const [dragOverSeatKey, setDragOverSeatKey] = useState(null);
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const [showBucketSidebar, setShowBucketSidebar] = useState(false);
  const [bucketFilter, setBucketFilter] = useState("");
  const [bucketFilterKey, setBucketFilterKey] = useState("all");
  const [bucketFilterVal, setBucketFilterVal] = useState("");

  // Feedback notifications & dialogs
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState({
    isOpen: false,
    type: "confirm", 
    title: "",
    message: "",
    placeholder: "",
    defaultValue: "",
    onConfirm: () => {},
    onCancel: () => {}
  });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
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

  const showToast = (message, type = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

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

  // FETCH METHODS USING CENTRAL API SERVICE
  async function fetchMeta() {
    try {
      const data = await api.getStudentsMeta(selectedExamType, "", "", token);
      if (data.depts) {
        setMeta(data);
      } else if (data.error) {
        showToast(`Meta fetch error: ${data.error}`, "error");
      }
    } catch (e) {
      console.error(e);
      showToast(`Meta fetch failed: ${e.message}`, "error");
    }
  }

  useEffect(() => {
    if (token) fetchMeta();
  }, [token, selectedExamType]);

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
          const data = await api.getStudentsMeta(selectedExamType, selectedDept, selectedSem, token);
          if (data.subjects) {
            setMeta(prev => ({ ...prev, subjects: data.subjects }));
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
      const data = await api.getSchedules(token);
      if (Array.isArray(data)) setSchedules(data);
    } catch (e) { 
      console.error(e); 
    }
  }

  async function fetchRoomSchedules() {
    try {
      const data = await api.getRoomSchedules(token);
      if (data && !data.error) setRoomSchedules(data);
    } catch (e) { 
      console.error(e); 
    }
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

  async function fetchInvigilators() {
    try {
      const data = await api.getInvigilators(token);
      setInvigilators(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function addInvigilator(invigilator) {
    try {
      const data = await api.createInvigilator(invigilator, token);
      if (data._id) {
        showToast("Invigilator added successfully.", "success");
        fetchInvigilators();
      } else {
        showToast(data.error || "Error adding invigilator", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  }

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
              errors.push(`${sched.date} (Shift ${sched.shift}): No rooms selected.`);
              continue;
            }

            const currentAllotments = await api.getAllotments(sched.shift, sched.date, token);
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

            const result = await api.assignStaff({
              shift: sched.shift,
              date: sched.date,
              time: sched.time || time,
              assignments,
              distributors: assignedDistributors.map(d => d._id)
            }, token);

            if (result.ok) {
              totalAssigned += result.assigned;
            } else {
              errors.push(`${sched.date} (Shift ${sched.shift}): ${result.error}`);
            }
          } catch (e) {
            console.error(e);
            errors.push(`${sched.date} (Shift ${sched.shift}): ${e.message}`);
          }
        }
        
        setLoading(false);
        let msg = `Total Assignments Created: ${totalAssigned}`;
        if (errors.length > 0) {
          msg += `\n\nErrors encountered:\n${errors.join('\n')}`;
        }
        triggerAlert("Assignment Process Completed", msg);
        fetchInvigAssignments();
      }
    );
  }

  async function fetchInvigAssignments() {
    try {
      const data = await api.getStaffAssignments(shift, date, token);
      if (Array.isArray(data)) {
        setInvigAssignments(data.filter(a => a.role !== 'distributor'));
        setDistributors(data.filter(a => a.role === 'distributor').map(a => a.invigilator));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchLibrary() {
    try {
      const data = await api.getLibrary(token);
      if (Array.isArray(data)) setLibrary(data);
    } catch (e) {
      console.error("Error fetching library:", e);
    }
  }

  async function saveToLibrary(s) {
    if (!s) return;
    try {
      const result = await api.saveToLibrary({
        date: s.date,
        shift: s.shift,
        time: s.time,
        examType: s.examType,
        subject: s.subject,
        combinations: s.combinations || []
      }, token);

      if (result.ok) {
        showToast("Arrangement schedule successfully saved to library!", "success");
        fetchLibrary();
      } else {
        showToast("Failed to save to library.", "error");
      }
    } catch (e) {
      showToast("Error saving: " + e.message, "error");
    }
  }

  async function deleteFromLibrary(id) {
    try {
      const result = await api.deleteFromLibrary(id, token);
      if (result.ok) {
        showToast("Schedule removed from library.", "success");
        fetchLibrary();
      } else {
        showToast("Failed to remove from library.", "error");
      }
    } catch (e) {
      showToast("Error removing: " + e.message, "error");
    }
  }

  async function fetchPendingStaff() {
    try {
      const data = await api.getPendingStaff(token);
      if (Array.isArray(data)) setPendingStaff(data);
    } catch (e) {
      console.error("Error fetching pending staff:", e);
    }
  }

  async function approveStaffMember(id) {
    try {
      const result = await api.approveStaff(id, token);
      if (result.ok) {
        showToast("Staff approved successfully!", "success");
        fetchPendingStaff();
      } else {
        showToast("Failed to approve staff.", "error");
      }
    } catch (e) {
      showToast("Error approving staff: " + e.message, "error");
    }
  }

  async function fetchComments() {
    if (!date || !shift) return;
    try {
      const data = await api.getComments(date, shift, token);
      if (Array.isArray(data)) setComments(data);
    } catch (e) {
      console.error("Error fetching comments:", e);
    }
  }

  async function addComment() {
    if (!newCommentText.trim() || !date || !shift) return;
    try {
      const result = await api.createComment({
        date,
        shift,
        text: newCommentText.trim()
      }, token);

      if (result.ok) {
        setNewCommentText("");
        fetchComments();
        showToast("Comment added!", "success");
      } else {
        showToast("Failed to add comment.", "error");
      }
    } catch (e) {
      showToast("Error adding comment: " + e.message, "error");
    }
  }

  async function fetchRooms() {
    try {
      const data = await api.getRooms(token);
      if (Array.isArray(data)) setRooms(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAllotments() {
    try {
      const data = await api.getAllotments(shift, date, token);
      if (Array.isArray(data)) {
        setAllotments(data);
        fetchStagingBucket(data);
        
        if (data.length > 0) {
          const first = data[0];
          if (first.useDistancing !== undefined) setUseDistancing(first.useDistancing);
          if (first.rowGrouping !== undefined) setRowGrouping(first.rowGrouping);
          if (first.colGrouping !== undefined) setColGrouping(first.colGrouping);
          if (first.gapType !== undefined) setGapType(first.gapType);
          if (first.gapAction !== undefined) setGapAction(first.gapAction);
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
      const students = await api.queryStudents(combos, selectedExamType, token);
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
      const data = await api.saveManualAllotments({
        shift,
        date,
        allotments: updatedAllotments,
        useDistancing,
        rowGrouping,
        colGrouping,
        gapType,
        gapAction
      }, token);

      if (!data.ok) {
        showToast(data.error || "Failed to save manual rearrangement", "error");
      }
    } catch (e) {
      showToast("Error saving: " + e.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSearchStudent() {
    if (!searchRoll.trim()) return;
    setIsSearching(true);
    try {
      const student = await api.findStudent(searchRoll.trim(), token);
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
      showToast("Student not found.", "error");
    } finally {
      setIsSearching(false);
    }
  }

  async function doLogin() {
    try {
      const data = await api.login(loginForm.username, loginForm.password);
      if (data.token) {
        login(data.token);
        showToast("Logged in successfully.", "success");
      } else {
        showToast(data.error || "Login failed", "error");
      }
    } catch (e) {
      showToast("Login error: " + e.message, "error");
    }
  }

  async function doRegister(formData) {
    try {
      const result = await api.register(formData);
      if (result.ok) {
        showToast(result.message || "Registration successful! Please login.", "success");
        setShowRegister(false);
      } else {
        showToast(result.error || "Registration failed", "error");
      }
    } catch (e) {
      showToast("Registration error: " + e.message, "error");
    }
  }

  async function fetchAllStudents() {
    if (!token) return;
    try {
      const data = await api.getStudents(token);
      if (Array.isArray(data)) setAllStudents(data);
    } catch (e) {
      console.error("Error fetching students:", e);
    }
  }

  async function fetchExamConfigs() {
    try {
      const data = await api.getExamConfigs(token);
      if (Array.isArray(data)) {
        setExamConfigs(data);
        const savedType = localStorage.getItem("selectedExamType");
        if (savedType && data.some(c => c.examType === savedType)) {
          setSelectedExamType(savedType);
        } else if (data.length > 0) {
          setSelectedExamType(data[0].examType);
        }
      }
    } catch (e) {
      console.error("Error fetching configs:", e);
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
      fetchInvigilators();
      
      const dec = decodeToken(token);
      if (dec && dec.role === "admin") {
        fetchPendingStaff();
      }
    }
  }, [token, shift, date]);

  // COMBINATION MANAGEMENT
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
      
      const isDuplicate = deptSemCombinations.some(c => 
        c.dept === newCombination.dept && 
        c.sem === newCombination.sem
      );

      if (!isDuplicate) {
        setDeptSemCombinations((prev) => [...prev, newCombination]);
        setSelectedDept(''); 
        setSelectedSem('');
        setSelectedComboSubject('');
      } else {
        showToast(`This class already has a subject scheduled in this list.`, 'error');
      }
    }
  };

  const removeDeptSemCombination = (index) => {
    setDeptSemCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  // DRAG AND DROP & TOUCH TAP-TO-MOVE OPERATIONS
  const executeMove = async (source, studentId, sourceRoomId, sourceRow, sourceCol, targetRoom, targetRow, targetCol) => {
    try {
      const targetSeatCode = getSeatLabel(targetRow - 1, targetCol);
      const targetIndex = allotments.findIndex(
        a => String(a.room._id || a.room) === String(targetRoom._id) && a.row === targetRow && a.col === targetCol
      );
      const targetAllotment = targetIndex > -1 ? allotments[targetIndex] : null;

      if (targetAllotment && filters) {
        const isTargetVisible = filters.depts.includes(targetAllotment.student.dept) && 
                                filters.sems.includes(targetAllotment.student.sem);
        if (!isTargetVisible) {
          showToast("Cannot place student here: occupied by filtered student", "warning");
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

        if (filters) {
          const isSourceVisible = filters.depts.includes(sourceAllotment.student.dept) && 
                                  filters.sems.includes(sourceAllotment.student.sem);
          if (!isSourceVisible) {
            showToast("Cannot move: source student is filtered out", "warning");
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
          showToast(`Placed ${student.roll} and moved ${targetStudent.roll} to bucket`, "success");
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
      showToast("Error processing move: " + err.message, "error");
    }
  };

  const executeUnallot = async (sourceRoomId, sourceRow, sourceCol) => {
    try {
      const sourceIndex = allotments.findIndex(
        a => String(a.room._id || a.room) === String(sourceRoomId) && a.row === sourceRow && a.col === sourceCol
      );
      if (sourceIndex === -1) return;
      
      const sourceAllotment = allotments[sourceIndex];
      const student = sourceAllotment.student;

      if (filters) {
        const isSourceVisible = filters.depts.includes(student.dept) && 
                                filters.sems.includes(student.sem);
        if (!isSourceVisible) {
          showToast("Cannot unallot: student is filtered out", "warning");
          return;
        }
      }

      const updatedAllotments = allotments.filter((_, idx) => idx !== sourceIndex);
      setAllotments(updatedAllotments);
      setBucket(prev => [...prev, student]);
      showToast(`Unallotted ${student.roll} to bucket`, "success");
      saveManualAllotments(updatedAllotments);
    } catch (err) {
      console.error(err);
      showToast("Error unallotting: " + err.message, "error");
    }
  };

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
        return;
      }
      
      if (!dragData || typeof dragData !== "object") return;
      const { source, studentId, roomId: sourceRoomId, row: sourceRow, col: sourceCol } = dragData;
      if (!source) return;
      
      executeMove(source, studentId, sourceRoomId, sourceRow, sourceCol, targetRoom, targetRow, targetCol);
    } catch (err) {
      console.error(err);
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
        return;
      }
      
      if (!dragData || typeof dragData !== "object") return;
      const { source, roomId: sourceRoomId, row: sourceRow, col: sourceCol } = dragData;
      if (source !== "seat") return;

      executeUnallot(sourceRoomId, sourceRow, sourceCol);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTapStudent = (student, source, roomId = null, row = null, col = null) => {
    if (userRole !== "admin") return;
    if (selectedStudentForMove && selectedStudentForMove.studentId === student._id) {
      setSelectedStudentForMove(null);
      showToast("Deselected student", "info");
    } else {
      setSelectedStudentForMove({
        source,
        studentId: student._id,
        roomId,
        row,
        col,
        roll: student.roll
      });
      showToast(`Selected ${student.roll}. Tap an empty seat or the bucket to move them.`, "info");
    }
  };

  const handleTapEmptySeat = (room, row, col) => {
    if (userRole !== "admin") return;
    if (!selectedStudentForMove) return;
    
    executeMove(
      selectedStudentForMove.source,
      selectedStudentForMove.studentId,
      selectedStudentForMove.roomId,
      selectedStudentForMove.row,
      selectedStudentForMove.col,
      room,
      row,
      col
    );
    setSelectedStudentForMove(null);
  };

  const handleTapBucket = () => {
    if (userRole !== "admin") return;
    if (!selectedStudentForMove) return;
    if (selectedStudentForMove.source !== "seat") {
      setSelectedStudentForMove(null);
      return;
    }
    
    executeUnallot(
      selectedStudentForMove.roomId,
      selectedStudentForMove.row,
      selectedStudentForMove.col
    );
    setSelectedStudentForMove(null);
  };

  // STUDENT IMPORT PARSERS
  const getRollsFromRawCsv = async (csv) => {
    if (!csv || !csv.trim()) return [];
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(csv, { type: "string" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (sheetRows.length === 0) return [];
      
      const firstRow = sheetRows[0] || [];
      const cleanHeaders = firstRow.map(h => (h || "").toString().trim().toLowerCase());
      const hasHeader = cleanHeaders.includes("roll");
      const rollIdx = hasHeader ? cleanHeaders.indexOf("roll") : 0;
      
      const dataRows = hasHeader ? sheetRows.slice(1) : sheetRows;
      return dataRows
        .map(row => {
          if (!row) return "";
          return (row[rollIdx] !== undefined && row[rollIdx] !== null) ? row[rollIdx].toString().trim() : "";
        })
        .filter(Boolean);
    } catch (err) {
      console.error("XLSX parsing failed, using manual parse:", err);
      const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return [];
      
      const firstLine = lines[0];
      const headers = firstLine.split(",").map(h => h.trim().toLowerCase());
      const hasHeader = headers.includes("roll");
      const rollIdx = hasHeader ? headers.indexOf("roll") : 0;
      
      const dataLines = hasHeader ? lines.slice(1) : lines;
      return dataLines.map(line => {
        const columns = line.split(",").map(c => {
          let cleaned = c.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1).trim();
          }
          return cleaned;
        });
        return columns[rollIdx] || "";
      }).filter(Boolean);
    }
  };

  const executeImportCSV = async (csvData, cleanImport) => {
    setLoading(true);
    try {
      const data = await api.importStudentsCSV(csvData, selectedExamType, cleanImport, token);
      if (data.ok) {
        showToast("CSV imported successfully.", "success");
        setCsvText("");
        fetchAllotments();
        fetchAllStudents();
        fetchMeta();
      } else {
        showToast(data.error || "Import error", "error");
      }
    } catch (e) {
      showToast("Import failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  async function importCSV() {
    const labelsStr = activeConfig.fields.map(f => f.label.toLowerCase()).join(", ");
    if (!csvText.trim()) return showToast(`Paste CSV first (${labelsStr})`, "warning");
    
    const uploadedRolls = await getRollsFromRawCsv(csvText);
    const existingRolls = allStudents
      .filter(s => s.examType === selectedExamType)
      .map(s => (s.roll || "").toString().trim())
      .filter(Boolean);
      
    const duplicates = uploadedRolls.filter(roll => existingRolls.includes(roll));
    
    if (duplicates.length > 0) {
      setDialog({
        isOpen: true,
        type: "import-conflict",
        title: "Import Conflict Resolution",
        onConfirm: async (cleanImport) => {
          closeDialog();
          await executeImportCSV(csvText, cleanImport);
        },
        onCancel: closeDialog
      });
    } else {
      await executeImportCSV(csvText, false);
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
      const bodyPayload = {
        roll: studentForm.roll.trim(),
        name: studentForm.name.trim(),
        dept: studentForm.dept.trim(),
        sem: studentForm.sem.trim(),
        subject: studentForm.subject ? studentForm.subject.split(",").map(s => s.trim()).filter(Boolean) : [],
        examType: studentForm.examType
      };

      if (editingStudent) {
        await api.updateStudent(editingStudent._id, bodyPayload, token);
        showToast("Student updated successfully!", "success");
      } else {
        await api.createStudent(bodyPayload, token);
        showToast("Student added successfully!", "success");
      }

      setShowStudentModal(false);
      fetchAllStudents();
      fetchMeta();
      fetchAllotments();
    } catch (err) {
      showToast("Error saving student: " + err.message, "error");
    }
  };

  const handleDeleteStudent = async (studentId) => {
    triggerConfirm(
      "Delete Student",
      "Are you sure you want to delete this student? This will also remove seating allotments.",
      async () => {
        try {
          const result = await api.deleteStudent(studentId, token);
          if (result.ok) {
            showToast("Student deleted successfully!", "success");
            fetchAllStudents();
            fetchAllotments();
          } else {
            showToast("Failed to delete student", "error");
          }
        } catch (err) {
          showToast("Error deleting: " + err.message, "error");
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
    a.download = `student_roster_${selectedExamType.toLowerCase()}.csv`;
    a.click();
    showToast("Student roster exported successfully.", "success");
  };

  // EXCEL & DRAG AND DROP UTILS
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
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const activeConfig = useMemo(() => {
    const found = examConfigs.find(c => c.examType === selectedExamType);
    if (found) return found;

    if (selectedExamType === "School") {
      return {
        examType: "School",
        fields: [
          { key: "roll", label: "Roll No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Section", type: "constraint_1", required: true },
          { key: "sem", label: "Class", type: "constraint_2", required: true },
          { key: "subject", label: "Subject", type: "subject", required: true }
        ]
      };
    }
    if (selectedExamType === "Competitive") {
      return {
        examType: "Competitive",
        fields: [
          { key: "roll", label: "Registration No", type: "identifier", required: true },
          { key: "name", label: "Student Name", type: "name", required: true },
          { key: "dept", label: "Stream", type: "constraint_1", required: true },
          { key: "sem", label: "Subject", type: "constraint_2", required: true }
        ]
      };
    }
    return {
      examType: "College",
      fields: [
        { key: "roll", label: "Roll No", type: "identifier", required: true },
        { key: "name", label: "Student Name", type: "name", required: true },
        { key: "dept", label: "Department", type: "constraint_1", required: true },
        { key: "sem", label: "Semester", type: "constraint_2", required: true },
        { key: "subject", label: "Subject", type: "subject", required: true }
      ]
    };
  }, [examConfigs, selectedExamType]);

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

  const processFile = (file) => {
    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      showToast("Unsupported format! Upload CSV or Excel.", "error");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();

    if (fileExtension === ".csv") {
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
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
          showToast("Failed to parse CSV file.", "error");
          setDialog({
            isOpen: true,
            type: "alert",
            title: "File Parsing Error",
            message: `Failed to read or parse the CSV file: ${error.message}.\n\nPlease check if the file is corrupted and ensure it aligns with the expected formatting. We suggest downloading the sample template using the button on the student roster page to compare.`,
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
          clearSelectedFile();
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
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
          showToast("Failed to parse Excel file.", "error");
          setDialog({
            isOpen: true,
            type: "alert",
            title: "File Parsing Error",
            message: `Failed to read or parse the Excel file: ${error.message}.\n\nPlease check if the file is corrupted and ensure it aligns with the expected formatting. We suggest downloading the sample template using the button on the student roster page to compare.`,
            onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
          });
          clearSelectedFile();
        }
      };
      reader.readAsArrayBuffer(file);
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
      showToast(`Missing required columns: ${missingRequired.map(f => `"${f.label}"`).join(", ")}`, "error");
      
      const allConfigs = [...examConfigs];
      ["School", "College", "Competitive"].forEach(type => {
        if (!allConfigs.some(c => c.examType === type)) {
          if (type === "School") {
            allConfigs.push({
              examType: "School",
              fields: [
                { key: "roll", label: "Roll No", required: true },
                { key: "name", label: "Student Name", required: true },
                { key: "dept", label: "Section", required: true },
                { key: "sem", label: "Class", required: true },
                { key: "subject", label: "Subject", required: true }
              ]
            });
          } else if (type === "Competitive") {
            allConfigs.push({
              examType: "Competitive",
              fields: [
                { key: "roll", label: "Registration No", required: true },
                { key: "name", label: "Student Name", required: true },
                { key: "dept", label: "Stream", required: true },
                { key: "sem", label: "Subject", required: true }
              ]
            });
          } else {
            allConfigs.push({
              examType: "College",
              fields: [
                { key: "roll", label: "Roll No", required: true },
                { key: "name", label: "Student Name", required: true },
                { key: "dept", label: "Department", required: true },
                { key: "sem", label: "Semester", required: true },
                { key: "subject", label: "Subject", required: true }
              ]
            });
          }
        }
      });

      const suggestions = [];
      allConfigs.forEach(conf => {
        if (conf.examType === selectedExamType) return;
        const otherMissing = conf.fields.filter(f => f.required && !uploadedHeaders.includes(f.label.trim().toLowerCase()));
        if (otherMissing.length === 0) {
          suggestions.push(conf.examType);
        }
      });

      const suggestionMsg = suggestions.length > 0
        ? `\n\n💡 Match Suggestion:\nYour uploaded file's headers match the required columns for the "${suggestions.join('" or "')}" format. Consider switching your Exam Type selection to that format.`
        : "";

      setDialog({
        isOpen: true,
        type: "alert",
        title: "Missing Required Columns",
        message: `The uploaded template is missing one or more required column headers for your selected format: "${selectedExamType}".\n\nExpected Required Columns for "${selectedExamType}":\n${missingRequired.map(f => `• ${f.label} (system type: ${f.key})`).join("\n")}\n\nHeaders Found in Your Upload:\n${uploadedHeaders.length > 0 ? uploadedHeaders.map(h => `• ${h}`).join("\n") : "• (No headers found)"}${suggestionMsg}\n\nPlease check your file headers or download the correct template using the buttons below.`,
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
      return null;
    }
    
    const customFields = fieldMappings.filter(f => f.type === 'custom' && f.index !== -1);
    const subjectField = fieldMappings.find(f => f.type === 'subject');
    const hasSubjectField = !!subjectField && subjectField.index !== -1;
    
    const outputHeaders = ["roll", "name", "dept", "sem"];
    if (hasSubjectField) outputHeaders.push("subject");
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
      if (hasSubjectField) values.push(`"${subjectVal}"`);
      values.push(...customFields.map(f => `"${getVal(f)}"`));
      mappedRows.push(values.join(","));
    }
    return mappedRows.join("\n");
  };

  const executeImportParsedData = async (cleanImport) => {
    setLoading(true);
    try {
      const data = await api.importStudentsCSV(parsedCsvText, selectedExamType, cleanImport, token);
      if (data.ok) {
        const totalSaved = (data.upserted || 0) + (data.matched || 0);
        showToast(`Roster upload processed.`, "success");
        setDialog({
          isOpen: true,
          type: "alert",
          title: "Import Roster Summary",
          message: `Roster upload complete!\n\n• Total Rows Uploaded: ${parsedCount}\n• New Students Added: ${data.upserted || 0}\n• Existing Students Updated: ${data.matched || 0}\n• Total Saved/Updated in DB: ${totalSaved}\n\n${
            totalSaved < parsedCount
              ? `⚠️ Note: Only ${totalSaved} out of ${parsedCount} rows were saved in the database. This occurs because:\n1. There are duplicate roll numbers in the spreadsheet (which overwrite previous entries)\n2. Some rows are missing required fields (like roll number or class) and were skipped.`
              : `All ${parsedCount} student entries were successfully saved.`
          }\n\n${
            cleanImport ? "All existing students of this exam type and their allotments were cleared before importing." : ""
          }`,
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
        clearSelectedFile();
        fetchAllotments();
        fetchAllStudents();
        fetchMeta();
      } else {
        showToast(data.error || "Import error", "error");
        setDialog({
          isOpen: true,
          type: "alert",
          title: "Import Failed",
          message: `Roster import failed: ${data.error || "Unknown server error"}.\n\nPlease ensure your spreadsheet layout matches the expected format. You can download a matching template using the download buttons on the student roster page to compare.`,
          onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
        });
      }
    } catch (e) {
      showToast("Import failed: " + e.message, "error");
      setDialog({
        isOpen: true,
        type: "alert",
        title: "Import Error",
        message: `Roster upload encountered an error: ${e.message}.\n\nPlease ensure your spreadsheet layout matches the expected format. You can download a matching template using the download buttons on the student roster page to compare.`,
        onConfirm: () => setDialog(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setLoading(false);
    }
  };

  const importParsedData = async () => {
    if (!parsedCsvText.trim()) return showToast("No parsed data found.", "error");
    
    const uploadedRolls = getRollsFromRawCsv(parsedCsvText);
    const existingRolls = allStudents
      .filter(s => s.examType === selectedExamType)
      .map(s => (s.roll || "").toString().trim())
      .filter(Boolean);
      
    const duplicates = uploadedRolls.filter(roll => existingRolls.includes(roll));
    
    if (duplicates.length > 0) {
      setDialog({
        isOpen: true,
        type: "import-conflict",
        title: "Import Conflict Resolution",
        onConfirm: async (cleanImport) => {
          closeDialog();
          await executeImportParsedData(cleanImport);
        },
        onCancel: closeDialog
      });
    } else {
      await executeImportParsedData(false);
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

  const downloadTemplate = async (format = "xlsx") => {
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
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${selectedExamType.toLowerCase()}_template.xlsx`);
    }
  };

  // ROOM ACTIONS
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
      const room = await api.createRoom({ name, rows, cols }, token);
      if (room._id) {
        setRooms((r) => [...r, room]);
        showToast(`Room "${name}" added successfully.`, "success");
      } else {
        showToast("Error adding room", "error");
      }
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
      const room = await api.updateRoom(id, { name, rows, cols }, token);
      if (room._id) {
        setRooms((prev) => prev.map(r => r._id === id ? room : r));
        showToast(`Room "${name}" updated successfully.`, "success");
        fetchAllotments();
      } else {
        showToast("Error updating room", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const deleteRoom = (room) => {
    triggerConfirm(
      "Delete Exam Hall",
      `Are you sure you want to delete room "${room.name}"? This deletes all seating/invigilation allotments.`,
      () => deleteRoomFromBackend(room._id, room.name)
    );
  };

  async function deleteRoomFromBackend(id, name) {
    try {
      const result = await api.deleteRoom(id, token);
      if (result.ok) {
        setRooms((prev) => prev.filter(r => r._id !== id));
        showToast(`Room "${name}" deleted successfully.`, "success");
        fetchAllotments();
      } else {
        showToast("Error deleting room", "error");
      }
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // EXAM FIELD CONFIG & EXAM TYPE EDITORS
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
      const data = await api.saveExamConfigs(currentConfig, token);
      if (data._id) {
        showToast("Configuration saved successfully.", "success");
        fetchExamConfigs();
      } else {
        showToast("Save configuration failed.", "error");
      }
    } catch (e) {
      showToast("Save failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const createNewExamType = () => {
    triggerPromptExamType();
  };

  const deleteActiveExamType = () => {
    triggerConfirm(
      "Delete Exam Type",
      `Are you sure you want to delete the exam type "${selectedExamType}"?`,
      async () => {
        try {
          await api.deleteExamConfig(selectedExamType, token);
          showToast("Exam type deleted successfully.", "success");
          setExamConfigs(prev => prev.filter(c => c.examType !== selectedExamType));
          setSelectedExamType("College");
          localStorage.setItem("selectedExamType", "College");
        } catch (e) {
          showToast("Delete failed: " + e.message, "error");
        }
      }
    );
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
      message: "Enter custom field name and sample value for templates:",
      onConfirm: (labelVal, sampleVal) => {
        if (!labelVal || !labelVal.trim()) return;
        const labelClean = labelVal.trim();
        const sampleClean = sampleVal ? sampleVal.trim() : "";
        
        setExamConfigs(prev => prev.map(c => {
          if (c.examType === selectedExamType) {
            const key = `custom_${Math.random().toString(36).substring(2, 7)}`;
            if (c.fields.some(f => f.label.toLowerCase() === labelClean.toLowerCase())) {
              showToast("Field already exists.", "error");
              return c;
            }
            showToast(`Field "${labelClean}" added. Save configuration to persist.`, "success");
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

  // CAPACITY ALLOTMENT GENERATION & PDF DOWNLOADS
  async function generate() {
    if (deptSemCombinations.length === 0) {
      showToast("Select at least one combination first.", "warning");
      return;
    }
    
    const countRes = await fetch(`${api.getDownloadCSVUrl(shift, date)}`, { method: "HEAD", headers: { ...authHeader(token) } });
    const hasPrevious = countRes.ok;

    const action = async (includeBucket = true) => {
      setLoading(true);
      try {
        const res = await api.saveSchedule({
          date,
          time,
          shift: Number(shift),
          seed: Number(seed),
          combinations: deptSemCombinations,
          useDistancing,
          rowGrouping,
          colGrouping,
          gapType,
          gapAction,
          includeBucket,
          examType: selectedExamType
        }, token);

        if (res.ok) {
          showToast("Allotment generated successfully!", "success");
          setDeptSemCombinations([]);
          fetchAllotments();
          fetchSchedules();
        } else {
          showToast(res.error || "Generation error", "error");
        }
      } catch (e) {
        showToast("Generation failed: " + e.message, "error");
      } finally {
        setLoading(false);
      }
    };

    if (hasPrevious) {
      triggerConfirm(
        "Overwrite Allotment?",
        "An allotment already exists for this slot. Overwrite it?",
        () => {
          if (bucket.length > 0) {
            triggerGenerationConfirm(
              "Staging Bucket Students Available",
              `You have ${bucket.length} students in the staging bucket. Generate layout including these unallotted students?`,
              (includeBucket) => action(includeBucket)
            );
          } else {
            action(true);
          }
        }
      );
    } else {
      if (bucket.length > 0) {
        triggerGenerationConfirm(
          "Staging Bucket Students Available",
          `You have ${bucket.length} students in the staging bucket. Generate layout including these unallotted students?`,
          (includeBucket) => action(includeBucket)
        );
      } else {
        action(true);
      }
    }
  }

  async function regenerateSchedule() {
    setLoading(true);
    try {
      const res = await api.regenerateSchedule({
        date,
        shift: Number(shift),
        seed: Number(seed),
        useDistancing,
        rowGrouping,
        colGrouping,
        gapType,
        gapAction,
      }, token);

      if (res.ok) {
        showToast("Arrangement successfully regenerated!", "success");
        fetchAllotments();
      } else {
        showToast(res.error || "Regeneration failed.", "error");
      }
    } catch (e) {
      showToast("Regeneration failed: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function gridForRoom(room) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const map = {};
    allotments.filter(a => String(a.room._id || a.room) === String(room._id)).forEach(a => {
      map[`${a.row},${a.col}`] = a;
    });
    return { rows, cols, map };
  }

  async function downloadCSV() {
    window.open(api.getDownloadCSVUrl(shift, date), "_blank");
  }

  async function downloadRoomGrid(roomId, format = "csv") {
    if (!roomId) return showToast("No rooms found.", "error");
    const url = format === "csv" 
      ? api.getRoomGridCsvUrl(roomId, shift, date) 
      : api.getRoomGridJsonUrl(roomId, shift, date);
    window.open(url, "_blank");
  }

  function openMoviePreview(room) {
    setMovieRoomPreview(room);
  }

  function getStudentCounts(room, allotments) {
    const counts = {};
    allotments.filter(a => String(a.room._id || a.room) === String(room._id)).forEach(a => {
      if (a.student) {
        const key = `${a.student.dept} - ${a.student.sem}`;
        counts[key] = (counts[key] || 0) + 1;
      }
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
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Error downloading PDF:", error);
      showToast("Error downloading PDF.", "error");
    }
  }

  const selectedScheduleCombos = useMemo(() => {
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

  // DERIVED DATA FOR FILTERING STUDENT ROSTER
  const uniqueDepts = useMemo(() => {
    const s = new Set();
    if (meta && Array.isArray(meta.depts)) {
      meta.depts.forEach(d => d && s.add(d));
    }
    allStudents.forEach(st => st.dept && s.add(st.dept));
    return Array.from(s).sort();
  }, [allStudents, meta]);

  const uniqueSems = useMemo(() => {
    const s = new Set();
    if (meta && Array.isArray(meta.sems)) {
      meta.sems.forEach(sem => sem !== undefined && sem !== null && s.add(String(sem)));
    }
    allStudents.forEach(st => st.sem !== undefined && st.sem !== null && s.add(String(st.sem)));
    return Array.from(s).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allStudents, meta]);

  const uniqueExamTypes = useMemo(() => {
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

  const uniqueSubjects = useMemo(() => {
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

  const filteredStudents = useMemo(() => {
    return allStudents.filter(st => {
      if (studentSearchQuery.trim()) {
        const query = studentSearchQuery.toLowerCase();
        const rollMatch = st.roll && st.roll.toLowerCase().includes(query);
        const nameMatch = st.name && st.name.toLowerCase().includes(query);
        if (!rollMatch && !nameMatch) return false;
      }
      if (studentFilterDept && st.dept !== studentFilterDept) return false;
      if (studentFilterSem && String(st.sem) !== studentFilterSem) return false;
      if (studentFilterExamType && st.examType !== studentFilterExamType) return false;
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

  const uniqueBucketValues = useMemo(() => {
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

  const authHeaderHeader = useMemo(() => {
    return authHeader(token);
  }, [token]);

  // AUTH STATE RENDERING OVERRIDES
  if (!isLoggedIn) {
    return (
      <>
        <LandingPage
          isLoggedIn={false}
          doLogin={doLogin}
          doRegister={doRegister}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          showRegister={showRegister}
          setShowRegister={setShowRegister}
          showToast={showToast}
          showInstallButton={Boolean(deferredPrompt)}
          onInstall={handleInstallClick}
        />
        {/* Global Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 backdrop-blur-xs select-none pointer-events-auto animate-fadeIn">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xl flex items-center gap-4 animate-scaleIn max-w-xs mx-4">
              <div className="relative w-8 h-8 shrink-0">
                <div className="absolute inset-0 rounded-full border-3 border-red-100 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-red-700 animate-spin"></div>
              </div>
              <div>
                <div className="text-xs font-bold text-gray-805">Processing Request</div>
                <div className="text-[9px] font-semibold text-gray-400">Please wait a moment...</div>
              </div>
            </div>
          </div>
        )}
        {/* PWA Install Promotion Banner */}
        {showInstallBanner && (
          <div className="fixed bottom-6 right-6 z-[160] max-w-sm w-full bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-5 animate-slideInRight mx-4 sm:mx-0 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-55 border border-red-150 flex items-center justify-center text-red-700 shrink-0 shadow-xs">
                <img src="/icon-192.jpg" alt="App Icon" className="w-10 h-10 rounded-lg object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-800">Install Web App</h4>
                <p className="text-[10px] text-gray-450 font-semibold leading-relaxed">
                  Add ExamSeat Allotment to your home screen for quick offline access and native app-like experience.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-750 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer bg-transparent"
              >
                Maybe Later
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-red-750 hover:bg-red-800 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1 hover:scale-[1.02] active:scale-98"
              >
                <i className="las la-download text-xs animate-bounce"></i>
                Install Now
              </button>
            </div>
          </div>
        )}
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  if (viewMode === "landing") {
    return (
      <>
        <LandingPage
          isLoggedIn={true}
          onViewDashboard={() => setViewMode("dashboard")}
          doLogin={doLogin}
          doRegister={doRegister}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          showRegister={showRegister}
          setShowRegister={setShowRegister}
          showToast={showToast}
          showInstallButton={Boolean(deferredPrompt)}
          onInstall={handleInstallClick}
        />
        {/* PWA Install Promotion Banner */}
        {showInstallBanner && (
          <div className="fixed bottom-6 right-6 z-[160] max-w-sm w-full bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-5 animate-slideInRight mx-4 sm:mx-0 text-left">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-55 border border-red-150 flex items-center justify-center text-red-700 shrink-0 shadow-xs">
                <img src="/icon-192.jpg" alt="App Icon" className="w-10 h-10 rounded-lg object-cover" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-805">Install Web App</h4>
                <p className="text-[10px] text-gray-450 font-semibold leading-relaxed">
                  Add ExamSeat Allotment to your home screen for quick offline access and native app-like experience.
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-[10px] font-bold text-gray-500 hover:text-gray-750 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer bg-transparent"
              >
                Maybe Later
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-red-750 hover:bg-red-800 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1 hover:scale-[1.02] active:scale-98"
              >
                <i className="las la-download text-xs animate-bounce"></i>
                Install Now
              </button>
            </div>
          </div>
        )}
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // RENDER APP IN ROOT LAYOUT
  return (
    <>
      <Layout 
        logout={logout} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onViewLanding={() => setViewMode("landing")}
      >
        {/* TAB 1: STUDENTS */}
        <div id="Students">
          <StudentsTab
            userRole={userRole}
            selectedExamType={selectedExamType}
            setSelectedExamType={setSelectedExamType}
            uniqueExamTypes={uniqueExamTypes}
            activeConfig={activeConfig}
            updateFieldLabel={updateFieldLabel}
            updateFieldSampleValue={updateFieldSampleValue}
            removeCustomField={removeCustomField}
            addCustomField={addCustomField}
            createNewExamType={createNewExamType}
            deleteActiveExamType={deleteActiveExamType}
            saveExamConfig={saveExamConfig}
            downloadTemplate={downloadTemplate}
            csvText={csvText}
            setCsvText={setCsvText}
            importCSV={importCSV}
            selectedFile={selectedFile}
            isDragging={isDragging}
            parsedCount={parsedCount}
            parsedCsvText={parsedCsvText}
            clearSelectedFile={clearSelectedFile}
            importParsedData={importParsedData}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
            fileInputRef={fileInputRef}
            showManualPaste={showManualPaste}
            setShowManualPaste={setShowManualPaste}
            getPreviewRows={getPreviewRows}
            studentSearchQuery={studentSearchQuery}
            setStudentSearchQuery={setStudentSearchQuery}
            studentFilterDept={studentFilterDept}
            setStudentFilterDept={setStudentFilterDept}
            studentFilterSem={studentFilterSem}
            setStudentFilterSem={setStudentFilterSem}
            studentFilterExamType={studentFilterExamType}
            setStudentFilterExamType={setStudentFilterExamType}
            studentFilterSubject={studentFilterSubject}
            setStudentFilterSubject={setStudentFilterSubject}
            uniqueDepts={uniqueDepts}
            uniqueSems={uniqueSems}
            uniqueSubjects={uniqueSubjects}
            filteredStudents={filteredStudents}
            studentPage={studentPage}
            setStudentPage={setStudentPage}
            openStudentModal={openStudentModal}
            handleDeleteStudent={handleDeleteStudent}
            handleExportStudentsCSV={handleExportStudentsCSV}
            getFieldLabel={getFieldLabel}
            getHeaderLabel={getHeaderLabel}
            loading={loading}
          />
        </div>

        {/* TAB 2: ROOMS */}
        <div id="Rooms">
          <RoomsTab
            userRole={userRole}
            rooms={rooms}
            invigAssignments={invigAssignments}
            movieRoomPreview={movieRoomPreview}
            setMovieRoomPreview={setMovieRoomPreview}
            openMoviePreview={openMoviePreview}
            downloadRoomPDF={downloadRoomPDF}
            roomSchedules={roomSchedules}
            setDate={setDate}
            setShift={setShift}
            schedules={schedules}
            setTime={setTime}
            setSubject={setSubject}
            setSelectedExamType={setSelectedExamType}
            uniqueExamTypes={uniqueExamTypes}
            editRoom={editRoom}
            deleteRoom={deleteRoom}
            addRoom={triggerAddRoomModal}
            date={date}
            shift={shift}
            time={time}
            subject={subject}
            selectedExamType={selectedExamType}
            allotments={allotments}
            getStudentCounts={getStudentCounts}
            getFieldLabel={getFieldLabel}
            useDistancing={useDistancing}
            rowGrouping={rowGrouping}
            colGrouping={colGrouping}
            gapType={gapType}
            gapAction={gapAction}
            handleDragStartSeat={handleDragStartSeat}
            handleDropOnSeat={handleDropOnSeat}
          />
        </div>

        {/* TAB 3: STAFF & INVIGILATORS */}
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
            <section className="bg-white shadow rounded-lg p-6 mt-6 border border-gray-150 animate-fadeIn">
              <h3 className="text-md font-semibold text-red-700">Distributors</h3>
              <ul className="list-disc pl-5 mt-2 text-xs font-semibold text-gray-700">
                {distributors.map((distributor) => (
                  <li key={distributor._id} className="mb-1">
                    {distributor.name} ({distributor.empId})
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="bg-white shadow rounded-lg p-6 mt-6 border border-gray-150 animate-fadeIn">
            <h3 className="text-md font-semibold text-red-700">Duty Chart</h3>
            <div className="mt-3">
              <DutyChart token={token} />
            </div>
          </section>
        </div>

        {/* TAB 4: ALLOTMENTS */}
        <div id="Allotment">
          <AllotmentTab
            userRole={userRole}
            selectedExamType={selectedExamType}
            setSelectedExamType={setSelectedExamType}
            uniqueExamTypes={uniqueExamTypes}
            date={date}
            setDate={setDate}
            time={time}
            setTime={setTime}
            shift={shift}
            setShift={setShift}
            seed={seed}
            setSeed={setSeed}
            useDistancing={useDistancing}
            setUseDistancing={setUseDistancing}
            isLayoutSettingsLocked={isLayoutSettingsLocked}
            setIsLayoutSettingsLocked={setIsLayoutSettingsLocked}
            setShowDistancingModal={setShowDistancingModal}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            selectedSem={selectedSem}
            setSelectedSem={setSelectedSem}
            selectedComboSubject={selectedComboSubject}
            setSelectedComboSubject={setSelectedComboSubject}
            meta={meta}
            addDeptSemCombination={addDeptSemCombination}
            removeDeptSemCombination={removeDeptSemCombination}
            deptSemCombinations={deptSemCombinations}
            generate={generate}
            downloadCSV={downloadCSV}
            downloadRoomGrid={downloadRoomGrid}
            schedules={schedules}
            examConfigs={examConfigs}
            activeConfig={activeConfig}
            selectedScheduleCombos={selectedScheduleCombos}
            saveToLibrary={saveToLibrary}
            regenerateSchedule={regenerateSchedule}
            comments={comments}
            newCommentText={newCommentText}
            setNewCommentText={setNewCommentText}
            addComment={addComment}
            isSaving={isSaving}
            showBucketSidebar={showBucketSidebar}
            setShowBucketSidebar={setShowBucketSidebar}
            bucket={bucket}
            filters={filters}
            setFilters={setFilters}
            rooms={rooms}
            allotments={allotments}
            invigAssignments={invigAssignments}
            gridForRoom={gridForRoom}
            getFieldLabel={getFieldLabel}
            isDraggingStudent={isDraggingStudent}
            dragOverSeatKey={dragOverSeatKey}
            setDragOverSeatKey={setDragOverSeatKey}
            handleDragStartSeat={handleDragStartSeat}
            handleDropOnSeat={handleDropOnSeat}
            token={token}
            rowGrouping={rowGrouping}
            colGrouping={colGrouping}
            gapType={gapType}
            gapAction={gapAction}
            showToast={showToast}
            selectedStudentForMove={selectedStudentForMove}
            handleTapStudent={handleTapStudent}
            handleTapEmptySeat={handleTapEmptySeat}
          />
        </div>

        {/* TAB 5: PROFILE & STAFF APPROVALS */}
        <div id="Profile">
          <ProfileTab
            token={token}
            userRole={userRole}
            logout={logout}
            pendingStaff={pendingStaff}
            approveStaffMember={approveStaffMember}
            library={library}
            setDate={setDate}
            setShift={setShift}
            setTime={setTime}
            setSubject={setSubject}
            setSelectedExamType={setSelectedExamType}
            setActiveTab={setActiveTab}
            deleteFromLibrary={deleteFromLibrary}
            showToast={showToast}
          />
        </div>
      </Layout>

      {/* Floating Staging Bucket Sidebar */}
      <React.Suspense fallback={null}>
        <StagingBucket
          isLoggedIn={isLoggedIn && activeTab === "Allotments"}
          showBucketSidebar={showBucketSidebar}
          setShowBucketSidebar={setShowBucketSidebar}
          bucket={bucket}
          searchRoll={searchRoll}
          setSearchRoll={setSearchRoll}
          handleSearchStudent={handleSearchStudent}
          isSearching={isSearching}
          bucketFilterKey={bucketFilterKey}
          setBucketFilterKey={setBucketFilterKey}
          bucketFilterVal={bucketFilterVal}
          setBucketFilterVal={setBucketFilterVal}
          uniqueBucketValues={uniqueBucketValues}
          bucketFilter={bucketFilter}
          setBucketFilter={setBucketFilter}
          dragOverBucket={dragOverBucket}
          setDragOverBucket={setDragOverBucket}
          handleDragStartBucket={handleDragStartBucket}
          setIsDraggingStudent={setIsDraggingStudent}
          handleDropOnBucket={handleDropOnBucket}
          userRole={userRole}
          getFieldLabel={getFieldLabel}
          selectedStudentForMove={selectedStudentForMove}
          handleTapStudent={handleTapStudent}
          handleTapBucket={handleTapBucket}
        />

        {/* Spacing Layout Settings Dialog */}
        <DistancingModal
          show={showDistancingModal}
          setShow={setShowDistancingModal}
          isLayoutSettingsLocked={isLayoutSettingsLocked}
          allotments={allotments}
          colGrouping={colGrouping}
          setColGrouping={setColGrouping}
          rowGrouping={rowGrouping}
          setRowGrouping={setRowGrouping}
          gapType={gapType}
          setGapType={setGapType}
          gapAction={gapAction}
          setGapAction={setGapAction}
          previewRoomId={previewRoomId}
          setPreviewRoomId={setPreviewRoomId}
          rooms={rooms}
        />

        {/* Student Form Modal */}
        <StudentModal
          show={showStudentModal}
          editingStudent={editingStudent}
          studentForm={studentForm}
          setStudentForm={setStudentForm}
          uniqueExamTypes={uniqueExamTypes}
          getFieldLabel={getFieldLabel}
          onClose={() => setShowStudentModal(false)}
          onSubmit={handleSaveStudent}
        />
      </React.Suspense>

      {/* General Prompt and Custom Confirm Dialog Modal */}
      <CustomDialog
        dialog={dialog}
        bucketLength={bucket.length}
        onClose={closeDialog}
      />

      {/* Global Toast Alerts */}
      <ToastContainer toasts={toasts} />

      {/* PWA Install Promotion Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-6 right-6 z-[160] max-w-sm w-full bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-5 animate-slideInRight mx-4 sm:mx-0 text-left">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-55 border border-red-150 flex items-center justify-center text-red-700 shrink-0 shadow-xs">
              <img src="/icon-192.jpg" alt="App Icon" className="w-10 h-10 rounded-lg object-cover" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-gray-800">Install Web App</h4>
              <p className="text-[10px] text-gray-450 font-semibold leading-relaxed">
                Add ExamSeat Allotment to your home screen for quick offline access and native app-like experience.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-[10px] font-bold text-gray-500 hover:text-gray-750 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors cursor-pointer bg-transparent"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstallClick}
              className="bg-red-750 hover:bg-red-800 text-white text-[10px] font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center gap-1 hover:scale-[1.02] active:scale-98"
            >
              <i className="las la-download text-xs animate-bounce"></i>
              Install Now
            </button>
          </div>
        </div>
      )}

      {/* Global Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 backdrop-blur-xs select-none pointer-events-auto animate-fadeIn">
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xl flex items-center gap-4 animate-scaleIn max-w-xs mx-4">
            <div className="relative w-8 h-8 shrink-0">
              <div className="absolute inset-0 rounded-full border-3 border-red-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-red-700 animate-spin"></div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-805">Processing Request</div>
              <div className="text-[9px] font-semibold text-gray-400">Please wait a moment...</div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Cursor Interaction Follower */}
      <CursorFollower />
    </>
  );
}
