import React, { useState, useEffect } from "react";
import { api } from "../../services/api";

export default function SuperadminDashboard({ token, onLogout, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState("overview"); // "overview" or "inbox"
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalStaff: 0,
    totalStudents: 0,
    totalRooms: 0,
    totalInquiries: 0,
    pendingInquiries: 0,
    resolvedInquiries: 0
  });
  const [orgs, setOrgs] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [inquiryFilter, setInquiryFilter] = useState(""); // "" (All), "Bug Report", "Feature Request", "Contact Query"
  const [searchTerm, setSearchTerm] = useState("");
  const [processingInquiryId, setProcessingInquiryId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, orgsData, inquiriesData] = await Promise.all([
        api.getSuperadminStats(token),
        api.listOrganisations(token),
        api.listInquiries(token)
      ]);
      setStats(statsData);
      setOrgs(orgsData);
      setInquiries(inquiriesData);
    } catch (err) {
      showToast(err.message || "Failed to load superadmin data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleToggleResolve = async (id) => {
    setProcessingInquiryId(id);
    try {
      const updated = await api.toggleResolveInquiry(id, token);
      setInquiries(prev => prev.map(inq => inq._id === id ? { ...inq, isResolved: updated.isResolved } : inq));
      
      // Update local stats counters
      setStats(prev => ({
        ...prev,
        pendingInquiries: updated.isResolved ? prev.pendingInquiries - 1 : prev.pendingInquiries + 1,
        resolvedInquiries: updated.isResolved ? prev.resolvedInquiries + 1 : prev.resolvedInquiries - 1
      }));
      showToast(`Inquiry marked as ${updated.isResolved ? 'Resolved' : 'Pending'}!`, "success");
    } catch (err) {
      showToast(err.message || "Failed to update inquiry status", "error");
    } finally {
      setProcessingInquiryId(null);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this query?")) return;
    setProcessingInquiryId(id);
    try {
      await api.deleteInquiry(id, token);
      setInquiries(prev => prev.filter(inq => inq._id !== id));
      
      // Recalculate stats counters
      const target = inquiries.find(i => i._id === id);
      setStats(prev => ({
        ...prev,
        totalInquiries: prev.totalInquiries - 1,
        pendingInquiries: target && !target.isResolved ? prev.pendingInquiries - 1 : prev.pendingInquiries,
        resolvedInquiries: target && target.isResolved ? prev.resolvedInquiries - 1 : prev.resolvedInquiries
      }));
      showToast("Inquiry deleted successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to delete inquiry", "error");
    } finally {
      setProcessingInquiryId(null);
    }
  };

  // Filtered queries list
  const filteredInquiries = inquiries.filter(inq => {
    const matchesType = inquiryFilter === "" || inq.type === inquiryFilter;
    const matchesSearch = inq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inq.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inq.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Filtered organisations list
  const filteredOrgs = orgs.filter(org => {
    return org.orgName.toLowerCase().includes(searchTerm.toLowerCase()) || 
           org.adminCode.toLowerCase().includes(searchTerm.toLowerCase()) || 
           org.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
           org.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none">
      
      {/* 1. Superadmin Header Bar */}
      <header className="bg-red-750 text-white shadow-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-red-750 font-extrabold shadow-sm">
            S
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">Superadmin Portal</h1>
            <p className="text-[10px] text-red-100 font-semibold mt-0.5">Platform Owner Overview & Central Inbox</p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="border border-white/30 hover:bg-white/10 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
        >
          Logout
        </button>
      </header>

      {/* 2. Top Stats Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 space-y-4 bg-white border border-gray-100 rounded-2xl shadow-3xs min-h-[50vh]">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-pulse"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-red-700 animate-spin"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xs font-bold text-gray-800">Fetching System Logs</h3>
              <p className="text-[10px] font-semibold text-gray-400">Loading live organization counts & support logs...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Card 1: Total Orgs */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="p-3 bg-red-50 text-red-700 rounded-xl shrink-0">
                  <i className="las la-university text-2xl"></i>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registered Orgs</span>
                  <span className="text-lg font-black text-gray-800 mt-0.5 block">{stats.totalOrgs}</span>
                </div>
              </div>

              {/* Card 2: Total Students */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <i className="las la-user-graduate text-2xl"></i>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Students</span>
                  <span className="text-lg font-black text-gray-800 mt-0.5 block">{stats.totalStudents}</span>
                </div>
              </div>

              {/* Card 3: Pending Inbox */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0 relative">
                  <i className="las la-envelope-open text-2xl animate-pulse"></i>
                  {stats.pendingInquiries > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-650 animate-ping"></span>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending Queries</span>
                  <span className="text-lg font-black text-gray-800 mt-0.5 block">{stats.pendingInquiries}</span>
                </div>
              </div>

              {/* Card 4: System Rooms */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-3xs flex items-center gap-4 hover:shadow-xs transition-shadow">
                <div className="p-3 bg-green-50 text-green-700 rounded-xl shrink-0">
                  <i className="las la-door-open text-2xl"></i>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">System Rooms</span>
                  <span className="text-lg font-black text-gray-800 mt-0.5 block">{stats.totalRooms}</span>
                </div>
              </div>

            </div>

            {/* 3. Sub-Tab Selector Navigation */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => {
                  setActiveSubTab("overview");
                  setSearchTerm("");
                }}
                className={`py-3 px-6 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  activeSubTab === "overview"
                    ? "border-red-750 text-red-700 font-extrabold bg-red-50/10"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/40"
                }`}
              >
                <i className="las la-server"></i> Registered Organisations ({orgs.length})
              </button>
              <button 
                onClick={() => {
                  setActiveSubTab("inbox");
                  setSearchTerm("");
                }}
                className={`py-3 px-6 font-bold text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer relative ${
                  activeSubTab === "inbox"
                    ? "border-red-750 text-red-700 font-extrabold bg-red-50/10"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50/40"
                }`}
              >
                <i className="las la-inbox"></i> Platform Support Inbox ({inquiries.length})
                {stats.pendingInquiries > 0 && (
                  <span className="bg-red-700 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                    {stats.pendingInquiries} New
                  </span>
                )}
              </button>
            </div>

            {/* 4. Tab Contents */}
            {activeSubTab === "overview" ? (
              <section className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Organisations Log</h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Logs of active universities, colleges and school administrators on the platform.</p>
                  </div>
                  
                  {/* Search input */}
                  <input
                    type="text"
                    placeholder="Search name, adminCode, email or orgName..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500 max-w-xs w-full text-black font-semibold"
                  />
                </div>

                <div className="overflow-x-auto border border-gray-150 rounded-xl">
                  <table className="min-w-full divide-y divide-gray-150 text-xs">
                    <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-xs text-left">
                      <tr>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Organisation / Owner</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Admin Code</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Contact Details</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider">Date Joined</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-center">Forms</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-center">Students</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-center">Rooms</th>
                        <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-wider text-center">Staff Approved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {filteredOrgs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-12 text-center text-gray-400 italic">
                            No organisations matching criteria found on the platform.
                          </td>
                        </tr>
                      ) : (
                        filteredOrgs.map((org) => (
                          <tr key={org._id} className="hover:bg-gray-50/30">
                            <td className="px-4 py-3">
                              <div className="font-extrabold text-gray-900">{org.orgName}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{org.name}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 border rounded-lg font-bold">
                                {org.adminCode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 leading-relaxed font-semibold">
                              <div>{org.email}</div>
                              <div className="text-[10px] text-gray-400">{org.phone}</div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-500">
                              {new Date(org.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-center font-extrabold text-red-700">{org.formCount}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{org.studentCount}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{org.roomCount}</td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">{org.staffCount}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <section className="bg-white border border-gray-100 rounded-2xl shadow-3xs p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-gray-805 uppercase tracking-wider">Inquiries Inbox</h3>
                    <p className="text-[10px] text-gray-400 font-semibold">Read and manage inquiries, support tickets, and bug reports sent by users.</p>
                  </div>
                  
                  {/* Filters row */}
                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                    <select
                      value={inquiryFilter}
                      onChange={(e) => setInquiryFilter(e.target.value)}
                      className="border border-gray-250 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg px-2.5 py-1.5 text-xs bg-white font-semibold text-black cursor-pointer shadow-3xs"
                    >
                      <option value="">All Inquiry Types</option>
                      <option value="Bug Report">Bug Reports</option>
                      <option value="Feature Request">Feature Requests</option>
                      <option value="Contact Query">Contact Queries</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Search inbox..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-red-500 max-w-[200px] w-full text-black font-semibold"
                    />
                  </div>
                </div>

                {/* Inquiries list */}
                <div className="space-y-4">
                  {filteredInquiries.length === 0 ? (
                    <div className="text-center py-16 px-4 bg-gray-50/30 border border-dashed border-gray-200 rounded-2xl">
                      <p className="text-xs text-gray-400 italic">No inquiries match the selected criteria.</p>
                    </div>
                  ) : (
                    filteredInquiries.map((inq) => {
                      const typeBadgeColor = inq.type === "Bug Report" 
                        ? "bg-red-50 text-red-700 border-red-100" 
                        : inq.type === "Feature Request"
                        ? "bg-blue-50 text-blue-750 border-blue-100"
                        : "bg-amber-50 text-amber-705 border-amber-100";

                      return (
                        <div key={inq._id} className={`p-5 border rounded-2xl hover:shadow-2xs transition-shadow bg-white ${
                          inq.isResolved ? "border-gray-200 bg-gray-50/20" : "border-red-200 ring-1 ring-red-500/5 animate-fadeIn"
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-50 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 border rounded-full ${typeBadgeColor}`}>
                                {inq.type}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                inq.isResolved 
                                  ? "bg-green-50 text-green-700 border border-green-100" 
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}>
                                {inq.isResolved ? "Resolved" : "Pending"}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-400">
                              Submitted: {new Date(inq.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1 border-r border-gray-100 pr-3 space-y-1.5 text-xs font-semibold">
                              <div>
                                <span className="block text-[9px] text-gray-400 uppercase">From</span>
                                <span className="font-extrabold text-gray-800">{inq.name}</span>
                              </div>
                              <div>
                                <span className="block text-[9px] text-gray-400 uppercase">Email</span>
                                <span className="text-gray-600 select-all block break-all">{inq.email}</span>
                              </div>
                            </div>
                            
                            <div className="md:col-span-2 text-xs text-gray-700 font-medium leading-relaxed bg-gray-50/30 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap select-text">
                              {inq.message}
                            </div>

                            <div className="md:col-span-1 flex items-center justify-end gap-2 shrink-0 select-none">
                              <button
                                disabled={processingInquiryId === inq._id}
                                onClick={() => handleToggleResolve(inq._id)}
                                className={`text-[10px] font-extrabold px-3 py-1.5 border rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                                  inq.isResolved
                                    ? "bg-white hover:bg-gray-50 text-gray-600 border-gray-300"
                                    : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                }`}
                              >
                                {processingInquiryId === inq._id ? (
                                  <>
                                    <i className="las la-spinner animate-spin"></i> Processing
                                  </>
                                ) : (
                                  inq.isResolved ? "Mark Pending" : "Resolve Query"
                                )}
                              </button>
                              <button
                                disabled={processingInquiryId === inq._id}
                                onClick={() => handleDeleteInquiry(inq._id)}
                                className="text-[10px] font-extrabold bg-white hover:bg-red-50 text-red-650 border border-gray-250 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {processingInquiryId === inq._id ? (
                                  <>
                                    <i className="las la-spinner animate-spin"></i> Deleting
                                  </>
                                ) : (
                                  "Delete"
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>

    </div>
  );
}
