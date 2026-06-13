import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Auth from "./Auth";

import { DndContext, useDraggable, useDroppable, type DragEndEvent, } from "@dnd-kit/core";

import { CSS } from "@dnd-kit/utilities";

import StatsOverview from "./components/StatsOverview";
import AnalyticsView from "./components/AnalyticsView";
import RecruitersView from "./components/RecruitersView";
import ApplicationsView from "./components/ApplicationsView";
import InterviewsView from "./components/InterviewsView";
import AIChatbotView from "./components/AIChatbotView";
import MockInterviewView from "./components/MockInterviewView";
import NewsView from "./components/NewsView";

import { getApplicationsOverTime } from "./lib/api";

import type { Job } from "./types/job";
import type { AppNotification } from "./types/notification";


type JobStatus = "Applied" | "Interview" | "Offer" | "Rejected";

const columns: JobStatus[] = ["Applied", "Interview", "Offer", "Rejected"];

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [activeView, setActiveView] = useState("Dashboard");
  const [statusCounts, setStatusCounts] = useState<{ status: string, count: number}[]>([]);
  const [applicationsOverTime, setApplicationsOverTime] = useState<{ date: string, count: number }[]>([]);

  const [range, setRange] = useState("30");

  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  

  const firstName = session?.user?.user_metadata?.first_name || "";
  const lastName = session?.user?.user_metadata?.last_name || "";

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  /*useEffect(() => {
    fetch(`${API_URL}/jobs`)
      .then((res) => res.json())
      .then(setJobs);

  }, []);*/

  useEffect(() => {
    if (!session) return;
  
    fetch(`${API_URL}/jobs`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json();
  
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch jobs");
        }
  
        return data;
      })
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Fetch jobs error:", err);
        setJobs([]);
      });
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);



  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
  
      const matchesSearch =
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.company.toLowerCase().includes(search.toLowerCase());
  
      return matchesStatus && matchesSearch;
    });
  }, [jobs, statusFilter, search]);

  async function fetchStatusCounts() {
    const res = await fetch(`${API_URL}/analytics/status-counts?range=${range}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Fetch status counts failed", errorData);
      return;
    }

    const data = await res.json();

    console.log("Status counts from backend:", data);

    setStatusCounts(data);
  }

  useEffect(() => {
    if(!session) return;

    fetchStatusCounts();

  }, [session, range]);

  /*async function fetchApplicationsOverTime() {
    const res = await fetch(`${API_URL}/analytics/applications-over-time?range=${range}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
    });

    if(!res.ok) {
      const errorData = await res.json();
      console.error("Fetch applications over time failed: ", errorData);
      return;
    }

    const data = await res.json();

    console.log("Applications over time from backend: ", data);

    setApplicationsOverTime(data);
  }*/


  async function fetchApplicationsOverTime() {

    if(!session) return;

    try {

      const data = await getApplicationsOverTime(
        session.access_token,
        range
      );

      console.log("Applications over time from backend: ", data);

      setApplicationsOverTime(data);

    } catch (err) {
      console.error("Failed to fetch applications over time: ", err);
    }
  }  

  useEffect(() => {
     if(!session) return;

     fetchApplicationsOverTime();
  }, [session, range]);

  const jobsByStatus = {
    Applied: filteredJobs.filter((job) => job.status === "Applied"),
    Interview: filteredJobs.filter((job) => job.status === "Interview"),
    Offer: filteredJobs.filter((job) => job.status === "Offer"),
    Rejected: filteredJobs.filter((job) => job.status === "Rejected"),
  };

  const stats = {
    total: jobs.length,
    applied: jobs.filter((job) => job.status === "Applied").length,
    interviews: jobs.filter((job) => job.status === "Interview").length,
    offers: jobs.filter((job) => job.status === "Offer").length,
  };

  /*async function addJob() {
    if (!title.trim() || !company.trim()) return;

    const res = await fetch(`${API_URL}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, company }),
    });

    const newJob = await res.json();
    setJobs((prev) => [newJob, ...prev]);
    setTitle("");
    setCompany("");
  }*/

  async function addJob() {

    if(!title.trim() || !company.trim()) return;
    
    const res = await fetch(`${API_URL}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ title, company }),
    });

    if(!res.ok) {
      const errorData = await res.json();
      console.error("Add job failed", errorData);
      return;
    }

    const newJob = await res.json();

    setJobs(prevJobs => [...prevJobs, newJob]);

    setTitle("");
    setCompany("");


  }  

  /*async function deleteJob(id: string) {
    
    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) return;

    setJobs((prev) => prev.filter((job) => job.id !== id));
  }*/

  async function deleteJob(id: string) {

    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if(!res.ok) return;

    setJobs(prevJobs => prevJobs.filter((job) => job.id !== id));
    

  }

  /*async function updateStatus(id: string, status: string) {
    setLoading(true);

    const res = await fetch(`${API_URL}/jobs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const updatedJob = await res.json();

    setJobs((prev) =>
      prev.map((job) => (job.id === id ? updatedJob : job))
    );

    setLoading(false);
  }*/

    async function handleLogout() {
      await supabase.auth.signOut();
    }


    async function updateStatus(id: string, status: string) {
      setLoading(true);

      const res = await fetch(`${API_URL}/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if(!res.ok) {
        const errorData = await res.json();
        console.error("Update failed: ", errorData);
        setLoading(false);
        return;
      }

      const updatedJob = await res.json();

      setJobs((prevJobs) => 
        prevJobs.map((job) => job.id === id ? updatedJob: job)
      );

      setLoading(false);
    }


  
    

    function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
    
      if (!over) return;
    
      const jobId = String(active.id);
      const newStatus = String(over.id) as JobStatus;
    
      const job = jobs.find((job) => job.id === jobId);
    
      if (!job) return;
      if (job.status === newStatus) return;
    
      updateStatus(jobId, newStatus);
    }

  const statusClass = (status: string) => {
    switch (status) {
      case "Applied":
        return "bg-blue-50 text-blue-700 ring-blue-200";
      case "Interview":
        return "bg-amber-50 text-amber-700 ring-amber-200";
      case "Offer":
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
      case "Rejected":
        return "bg-red-50 text-red-700 ring-red-200";
      default:
        return "bg-gray-50 text-gray-700 ring-gray-200";
    }
  };

  async function fetchNotifications() {
    if(!session) return;

    try {

       const res = await fetch(`${API_URL}/notifications`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`
            },
       });

       const data = await res.json();

       if(!res.ok) {
          console.error("Error fetching notifications", data);
          return;
       }

       setAppNotifications(data);

    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }

  useEffect(() => {
     if (session) {
        fetchNotifications();
     }
  }, [session]);

  const unreadCount = appNotifications.filter((n) => !n.is_read).length;


  async function markNotificationAsRead(id: string) {

    try {

      if(!session) return;

      const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if(!res.ok) {
        console.error("Failed to mark notification as read:", data);
        return;
      }

      setAppNotifications((prevs) => prevs.map((item) => item.id === id ? data : item));



    } catch (error) {
      console.error("Error marking notification as read: ", error);
    }
     
   
  }


  if(!session) {
    return <Auth onAuthSuccess={() => {}} />;
  }


  const navItems = [
    {
      label: "Dashboard",
      path: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    },
    {
      label: "Applications",
      path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      label: "Interviews",
      path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      label: "Recruiters",
      path: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      label: "Analytics",
      path: "M9 19v-6m4 6V5m4 14v-9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z",
    },
    {
      label: "AI Chatbot",
      path: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.83L3 20l.93-3.72A7.7 7.7 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    },
    {
      label: "Mock Interviews",
      path: "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.25 0A2.25 2.25 0 0121.75 12.75v6A2.25 2.25 0 0119.5 21H4.5A2.25 2.25 0 012.25 18.75v-6A2.25 2.25 0 014.5 10.5h15z",

    },
    {
      label: "News",
      path: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25v-4.5z",
    }
  ];



  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800" style={{ backgroundColor: "#f8fafc" }}>
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
              AI
            </div>

            <div>
              <div className="text-base font-semibold text-slate-800">
                AppliFlow
              </div>
              <p className="text-xs text-slate-500">AI-powered job search</p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 transition hover:bg-slate-100"
          >
            ☰
          </button>
        </header>
      <div className="flex min-h-screen">
      

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-slate-200 bg-white p-6 shadow-2xl">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
                    AI
                  </div>

                  <div>
                    <div className="text-lg font-semibold text-slate-800">
                      AppliFlow
                    </div>
                    <p className="text-sm text-slate-600">
                      Job search management
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map(({ label, path }) => {
                  const isActive = activeView === label;

                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setActiveView(label);
                        setMobileMenuOpen(false);
                      }}
                      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.8}
                        stroke="currentColor"
                        className={`h-5 w-5 shrink-0 ${
                          isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d={path}
                        />
                      </svg>

                      {label}
                    </button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}
        {/* Desktop Sidebar */}
        <aside className="hidden w-96 flex-col border-r border-slate-200 bg-gradient-to-b from-white via-blue-50/60 to-blue-100/70 p-6 lg:flex">
          {/* Brand */}
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
              AI
            </div>

            <div>
              <div className="text-lg font-semibold tracking-tight text-slate-800">
                AppliFlow
              </div>
              <p className="text-sm text-slate-500">
                Your AI-powered job search management
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            <p className="mb-3 px-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Menu
            </p>

            {navItems.map(({ label, path }) => {
              const isActive = activeView === label;

              return (
                <button
                  key={label}
                  onClick={() => setActiveView(label)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm"
                      : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                  )}

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      isActive
                        ? "text-blue-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>

                  {label}
                </button>
              );
            })}
          </nav>
        </aside>


        {/* Main */}
        <main className="flex-1">
          {/* Top nav */}
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                    Dashboard
                </h1>
                <p className="text-sm text-slate-500">
                    Organize your entire job search in one place.
                </p>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                {loading && (
                  <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
                    Updating...
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
                  {initials || "U"}
                </div>
                <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowNotifications(!showNotifications)}
                          className="relative rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Notifications

                          {unreadCount > 0 && (
                            <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                              {unreadCount}
                            </span>
                          )}
                        </button>

                        {showNotifications && (
                          <div className="absolute right-0 top-14 z-50 w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-slate-900">
                                Notifications
                              </h3>

                              <button
                                type="button"
                                onClick={() => setShowNotifications(false)}
                                className="text-sm text-slate-500 hover:text-slate-700"
                              >
                                Close
                              </button>
                            </div>

                            <div className="mt-4 space-y-3">
                              {appNotifications.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No notifications yet.
                                </p>
                              ) : (
                                appNotifications.map((notification) => (
                                  <div
                                    key={notification.id}
                                    onClick={() => {
                                      if(!notification.is_read) {
                                        markNotificationAsRead(notification.id)
                                      }
                                      
                                    }}
                                    className={`rounded-xl border p-3 transition ${
                                      notification.is_read
                                        ? "border-slate-200 bg-slate-50"
                                        : "border-blue-100 bg-blue-50"
                                    }`}
                                  >
                                    <p className="text-sm font-semibold text-slate-900">
                                      {notification.title}
                                    </p>

                                    <p className="mt-1 text-sm text-slate-600">
                                      {notification.message}
                                    </p>

                                    <p className="mt-2 text-xs text-slate-400">
                                      {new Date(
                                        notification.created_at
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                <button
                    onClick={handleLogout}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                    Logout 
                </button>
              </div>
            </div>
          </header>

          <section className="p-6">
            {/* Stats */}
            <StatsOverview stats={stats} />

            {activeView === "Dashboard" && (
              <>
                
                {/* Add job */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">Add new application</h2>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                      placeholder="Job title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />

                    <input
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                      placeholder="Company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />

                    <button
                         type="button"
                         className="rounded-xl border border-slate-300 px-3 py-3 bg-slate-700 text-sm font-medium text-white"
                         onClick={addJob}
                    >
                      Add

                    </button>

                    
                  </div>
                </div>


                {/* Jobs panel */}
                <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Applications</h2>
                        <p className="text-sm text-slate-500">
                          Manage your active job pipeline.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <input
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-900"
                          placeholder="Search jobs..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                          className="rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-900"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option>All</option>
                          <option>Applied</option>
                          <option>Interview</option>
                          <option>Offer</option>
                          <option>Rejected</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <DndContext onDragEnd={handleDragEnd}>
                      <div className="grid gap-4 lg:grid-cols-4 p-3">
                        {columns.map((column) => (
                          <KanbanColumn
                            key={column}
                            column={column}
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <h3 className="font-semibold text-slate-900">
                                {column}
                              </h3>

                              <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                                {jobsByStatus[column as keyof typeof jobsByStatus].length}
                              </span>
                            </div>

                            <div className="space-y-3">
                              {jobsByStatus[column as keyof typeof jobsByStatus].map((job) => (
                                <DraggableJobCard
                                    key={job.id}
                                    job={job}
                                    deleteJob={deleteJob}
                                    updateStatus={updateStatus}
                                    statusClass={statusClass}
                                />
                              ))}
                            </div>
                          </KanbanColumn>
                        ))}
                      </div>
                  </DndContext>
                  

                
                </div>
              </>
            )}


            {activeView === "Applications" && (
              <>
               <ApplicationsView jobs={jobs} setJobs={setJobs} session={session}/>  
              </>
            )}

            {activeView === "Interviews" && (
              <>
                 <InterviewsView jobs={jobs} appNotifications={appNotifications} setAppNotifications={setAppNotifications} session={session}/>
              </>
            )}

            {activeView === "Recruiters" && (
              <>
                <RecruitersView jobs={jobs} session={session}/>
              </>
            )}

            {activeView === "Analytics" && (
              <>
                <AnalyticsView jobs={jobs} statusCounts={statusCounts} applicationsOverTime={applicationsOverTime} range={range} setRange={setRange}/>
              </>
            )}

            {activeView === "AI Chatbot" && (
              <>
                <AIChatbotView/>
              </>
            )}

            {activeView === "Mock Interviews" && (
              <>
                <MockInterviewView/>
              </>
            )}

            {activeView === "News" && (
              <>
                <NewsView />
              </>

            )}
            

            

          </section>
        </main>
      </div>
    </div>
  );
}


/*

        <div className="divide-y divide-slate-100">
            {filteredJobs.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No applications found.
              </div>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {job.title}
                    </p>
                    <p className="text-sm text-slate-500">{job.company}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>

                    <select
                      value={job.status}
                      onChange={(e) =>
                        updateStatus(job.id, e.target.value)
                      }
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                    >
                      <option>Applied</option>
                      <option>Interview</option>
                      <option>Offer</option>
                      <option>Rejected</option>
                    </select>

                    <button
                      onClick={() => deleteJob(job.id)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

*/

function KanbanColumn({
  column,
  children,
}: {
  column: JobStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border border-slate-200 p-4 transition ${
        isOver ? "bg-slate-200" : "bg-slate-50"
      }`}
    >
      {children}
    </div>
  );
}

function DraggableJobCard({
  job,
  deleteJob,
  updateStatus,
  statusClass,
}: {
  job: Job;
  deleteJob: (id: string) => void;
  updateStatus: (id: string, status: string) => void;
  statusClass: (status: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: job.id,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="mb-3 cursor-grab rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 active:cursor-grabbing"
      >
        Click here to drag...
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">{job.title}</p>
          <p className="mt-1 text-sm text-slate-500">{job.company}</p>
        </div>

        <button
          onClick={() => deleteJob(job.id)}
          className="text-sm font-semibold text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>

      <div className="mt-4">
        <select
          value={job.status}
          onChange={(e) => updateStatus(job.id, e.target.value)}
          className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 ${statusClass(
            job.status
          )}`}
        >
          <option>Applied</option>
          <option>Interview</option>
          <option>Offer</option>
          <option>Rejected</option>
        </select>
      </div>
    </div>
  );
}

export default App;