import { authHeader } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API || "http://localhost:4000";

// Original fetch interceptor for dispatching unauthorized-access event
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

async function request(url, options = {}, token = "") {
  const headers = {
    "Content-Type": "application/json",
    ...authHeader(token),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! Status: ${response.status}`);
    }
    return data;
  } else {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.text();
  }
}

export const api = {
  // Auth
  login: (username, password) => 
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  register: (userData) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  // Schedules
  getSchedules: (token) => request("/schedules", {}, token),
  saveSchedule: (scheduleData, token) =>
    request("/schedules", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    }, token),
  regenerateSchedule: (payload, token) =>
    request("/schedules/regenerate", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  // Rooms
  getRooms: (token) => request("/rooms", {}, token),
  getRoomSchedules: (token) => request("/rooms/schedules", {}, token),
  createRoom: (roomData, token) =>
    request("/rooms", {
      method: "POST",
      body: JSON.stringify(roomData),
    }, token),
  updateRoom: (id, roomData, token) =>
    request(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(roomData),
    }, token),
  deleteRoom: (id, token) =>
    request(`/rooms/${id}`, {
      method: "DELETE",
    }, token),

  // Students
  getStudents: (token) => request("/students", {}, token),
  getStudentsMeta: (examType, dept = "", sem = "", token) => {
    let url = `/students/meta?examType=${encodeURIComponent(examType)}`;
    if (dept) url += `&dept=${encodeURIComponent(dept)}`;
    if (sem) url += `&sem=${encodeURIComponent(sem)}`;
    return request(url, {}, token);
  },
  queryStudents: (deptSemCombinations, examType, token) =>
    request("/students/query", {
      method: "POST",
      body: JSON.stringify({ deptSemCombinations, examType }),
    }, token),
  findStudent: (roll, token) =>
    request(`/students/find?roll=${encodeURIComponent(roll)}`, {}, token),
  importStudentsCSV: (csv, examType, cleanImport, token) =>
    request("/students/import-csv", {
      method: "POST",
      body: JSON.stringify({ csv, examType, cleanImport }),
    }, token),
  createStudent: (studentData, token) =>
    request("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    }, token),
  updateStudent: (id, studentData, token) =>
    request(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    }, token),
  deleteStudent: (id, token) =>
    request(`/students/${id}`, {
      method: "DELETE",
    }, token),

  // Allotments
  getAllotments: (shift, date, token) =>
    request(`/allotments?shift=${shift}&date=${date}`, {}, token),
  saveManualAllotments: (payload, token) =>
    request("/allotments/save-manual", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),

  // Invigilators / Staff
  getInvigilators: (token) => request("/staff/invigilators", {}, token),
  createInvigilator: (invigilatorData, token) =>
    request("/staff/invigilators", {
      method: "POST",
      body: JSON.stringify(invigilatorData),
    }, token),
  assignStaff: (payload, token) =>
    request("/staff/assign", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token),
  getStaffAssignments: (shift, date, token) =>
    request(`/staff/assignments?shift=${shift}&date=${date}`, {}, token),
  getPendingStaff: (token) => request("/staff/pending", {}, token),
  approveStaff: (id, token) =>
    request(`/staff/approve/${id}`, {
      method: "POST",
    }, token),

  // Comments
  getComments: (date, shift, token) =>
    request(`/comments?date=${date}&shift=${shift}`, {}, token),
  createComment: (commentData, token) =>
    request("/comments", {
      method: "POST",
      body: JSON.stringify(commentData),
    }, token),

  // Library
  getLibrary: (token) => request("/library", {}, token),
  saveToLibrary: (libraryData, token) =>
    request("/library", {
      method: "POST",
      body: JSON.stringify(libraryData),
    }, token),
  deleteFromLibrary: (id, token) =>
    request(`/library/${id}`, {
      method: "DELETE",
    }, token),

  // Exam Configs
  getExamConfigs: (token) => request("/exam-configs", {}, token),
  saveExamConfigs: (configs, token) =>
    request("/exam-configs", {
      method: "POST",
      body: JSON.stringify({ configs }),
    }, token),
  deleteExamConfig: (id, token) =>
    request(`/exam-configs/${id}`, {
      method: "DELETE",
    }, token),

  // Form Configs & Public Registration
  listFormConfigs: (token) =>
    request("/form-configs", {}, token),
  saveFormConfigById: (configData, token) =>
    request("/form-configs/save", {
      method: "POST",
      body: JSON.stringify(configData)
    }, token),
  deleteFormConfigById: (id, token) =>
    request(`/form-configs/${id}`, {
      method: "DELETE"
    }, token),
  getPublicFormConfigById: (orgCode, id) =>
    request(`/form-configs/public/by-id/${encodeURIComponent(orgCode)}/${encodeURIComponent(id)}`),
  registerStudentPublicById: (orgCode, id, studentData) =>
    request(`/form-configs/public/register/by-id/${encodeURIComponent(orgCode)}/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(studentData)
    }),
  submitInquiry: (inquiryData) =>
    request("/superadmin/public/inquiry", {
      method: "POST",
      body: JSON.stringify(inquiryData)
    }),
  getSuperadminStats: (token) =>
    request("/superadmin/stats", {}, token),
  listOrganisations: (token) =>
    request("/superadmin/organisations", {}, token),
  listInquiries: (token) =>
    request("/superadmin/inquiries", {}, token),
  toggleResolveInquiry: (id, token) =>
    request(`/superadmin/inquiries/${encodeURIComponent(id)}/resolve`, {
      method: "PUT"
    }, token),
  deleteInquiry: (id, token) =>
    request(`/superadmin/inquiries/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }, token),
  getFormConfig: (examType, token) => 
    request(`/form-configs/${encodeURIComponent(examType)}`, {}, token),
  saveFormConfig: (examType, configData, token) => 
    request(`/form-configs/${encodeURIComponent(examType)}`, {
      method: "POST",
      body: JSON.stringify(configData)
    }, token),
  getPublicFormConfig: (orgCode, examType) => 
    request(`/form-configs/public/${encodeURIComponent(orgCode)}/${encodeURIComponent(examType)}`),
  registerStudentPublic: (orgCode, examType, studentData) => 
    request(`/form-configs/public/register/${encodeURIComponent(orgCode)}/${encodeURIComponent(examType)}`, {
      method: "POST",
      body: JSON.stringify(studentData)
    }),

  // Downloads / External File APIs (return absolute URLs for iframe / download)
  getDownloadCSVUrl: (shift, date) => `${API_BASE}/export/csv?shift=${shift}&date=${date}`,
  getRoomGridCsvUrl: (roomId, shift, date) => `${API_BASE}/export/room-grid?roomId=${roomId}&shift=${shift}&date=${date}&format=csv`,
  getRoomGridJsonUrl: (roomId, shift, date) => `${API_BASE}/export/room-grid?roomId=${roomId}&shift=${shift}&date=${date}&format=json`,
};
