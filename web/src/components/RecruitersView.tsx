import { useState, useEffect } from "react";

import type { Recruiter } from "../types/recruiter";
import type { Interview } from "../types/interview";
import type { Job } from "../types/job";
import type { Session } from "@supabase/supabase-js";

const API_URL = import.meta.env.VITE_API_URL;

function RecruitersView({ jobs, session, }: { jobs: Job[]; session: Session | null; }) {

  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);  
  
    /*Variables for Recruiter Data */
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterCompany, setRecruiterCompany] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [recruiterLinkedinUrl, setRecruiterLinkedinUrl] = useState("");
  const [recruiterPhone, setRecruiterPhone] = useState("");
  const [recruiterRelationshipStatus, setRecruiterRelationshipStatus] = useState("New");
  const [recruiterNotes, setRecruiterNotes] = useState("");

  //Delete Recruiter Modal variable and state
  const [recruiterToDelete, setRecruiterToDelete] = useState<Recruiter | null>(null);

  const [editingRecruiter, setEditingRecruiter] = useState<Recruiter | null>(null);

  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLinkedinUrl, setEditLinkedinUrl] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelationshipStatus, setEditRelationshipStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLastContactedAt, setEditLastContactedAt] = useState("");

  const [recruiterSearch, setRecruiterSearch] = useState("");
  const [recruiterStatusFilter, setRecruiterStatusFilter] = useState("All");

  const [recruiterSort, setRecruiterSort] = useState("newest");

  const [interviews] = useState<Interview[]>([]);

  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);

  const filteredRecruiters = recruiters.filter((recruiter) => {
    const searchText = recruiterSearch.toLowerCase();

    const matchesSearch = recruiter.name.toLowerCase().includes(searchText) ||
                          recruiter.company?.toLowerCase().includes(searchText) ||
                          recruiter.email?.toLowerCase().includes(searchText);

    const matchesStatus = recruiterStatusFilter === "All" || recruiterStatusFilter === recruiter.relationship_status;
    
    return matchesStatus && matchesSearch;
  });

  const sortedRecruiters = [...filteredRecruiters].sort((a, b) => {
    if(recruiterSort === "newest") {
        return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
    }

    if(recruiterSort === "oldest") {
        return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
    }

    if(recruiterSort === "name-az") {
        return a.name.localeCompare(b.name);
    }

    if(recruiterSort === "last-contacted") {
        return (
            new Date(b.last_contacted_at || "").getTime() - new Date(a.last_contacted_at || "").getTime()
        );
    }

    return 0;

  });

  async function fetchRecruiters() {
    if(!session) return;

    const res = await fetch(`${API_URL}/recruiters`, {
       method: "GET",
       headers: {
          Authorization: `Bearer ${session.access_token}`
       },
    });

    const data = await res.json();

    if(!res.ok) {
      console.error("Fetch recruiters failed:", data);
      return;
    }

    setRecruiters(data);
  }

  useEffect(() => {
    if(!session) return;

    fetchRecruiters();

  }, [session]);


  async function addRecruiter() {

    try {

      if(!session) return;

      const res = await fetch(`${API_URL}/recruiters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",   
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: recruiterName,
          company: recruiterCompany,
          email: recruiterEmail,
          linkedin_url: recruiterLinkedinUrl,
          phone: recruiterPhone,
          relationship_status: recruiterRelationshipStatus,
          notes: recruiterNotes,
        })
      });

      const newRecruiter = await res.json();

      if(!res.ok) {
        console.error("Erroring adding recruiter: ", newRecruiter);
        return;
      }

      setRecruiters((prevRecruiters) => [...prevRecruiters, newRecruiter]);

      setRecruiterName("");
      setRecruiterCompany("");
      setRecruiterEmail("");
      setRecruiterLinkedinUrl("");
      setRecruiterPhone("");
      setRecruiterRelationshipStatus("New");
      setRecruiterNotes("");

    } catch (err) {
      console.error("Error adding recruiter: ", err);

    }


  }

  async function updateRecruiter() {

    if(!session || !editingRecruiter) return;
     
    try {

        const res = await fetch(`${API_URL}/recruiters/${editingRecruiter.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                 Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                name: editName,
                company: editCompany,
                email: editEmail,
                linkedin_url: editLinkedinUrl,
                phone: editPhone,
                relationship_status: editRelationshipStatus,
                notes: editNotes,
                last_contacted_at: editLastContactedAt || null,
            }),
        });

        const updatedRecruiter = await res.json();

        if(!res.ok) {
            console.error("Error updating recruiter", updatedRecruiter);
            return;
        }

        setRecruiters((prevRecruiters) => 
            prevRecruiters.map((recruiter) => recruiter.id === updatedRecruiter.id ? updatedRecruiter: recruiter)
        );

        setEditingRecruiter(null);

    } catch (error) {
        console.error("Error updating recruiter", error);
    }
  }


  function getRelationshipStatusStyles(status: string) {
    switch(status) {
        case "New":
            return "bg-slate-100 text-slate-700";
        case "Reached Out":
            return "bg-blue-100 text-slate-700";
        case "Replied":
            return "bg-green-100 text-green-700";
        case "Interview Scheduled":
            return "bg-purple-100 text-purple-700";
        case "Follow Up Needed":
            return "bg-yellow-100 text-yellow-700";
        default:
            return "bg-slate-100 text-slate-700";                
    }
  }

  async function deleteRecruiter(id: string) {
    try {

        if(!session) return;

        const res = await fetch(`${API_URL}/recruiters/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ id })
        });

        const data = await res.json();

        if(!res.ok) {
            console.error("Deleting recruiter failed: ", data);
            return;
        }

        setRecruiters((prevRecruiters) => prevRecruiters.filter((recruiter) => recruiter.id !== id));

    } catch (error) {
        console.error("Error fetching data on deleting recruiter ", error);
    }
  }

  function getFollowUpLabel(lastContactedAt?: string) {
    if(!lastContactedAt) {
        return {
            label: "No contact logged",
            className: "bg-slate-100 text-slate-700"
        }
    }

    const numDays = Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (24 * 60 * 60 * 1000));

    if (numDays >= 14) {
        return {
            label: `Follow up overdue: ${numDays} days`,
            className: "bg-red-100 text-slate-100",
        }
    }

    if (numDays >= 7) {
        return {
            label: `Follow up soon: ${numDays} days`,
            className: "bg-yellow-100 text-white-100",
        }
    }

    return {
        label: `Recently contacted ${numDays} days`,
        className: "bg-green-100 text-white-100",
    };
  }

  const followUpRecruiters = recruiters.filter((recruiter) => {

    if(!recruiter.last_contacted_at) return false;

    const daysSince = Math.floor((Date.now() - new Date(recruiter.last_contacted_at).getTime()) / 24 * 60 * 60 * 1000);

    return daysSince >= 7;
  });


  async function markRecruiterContactedToday(id: string) {

     if(!session) return;

     try {

        const today = new Date().toISOString();

        const res = await fetch(`${API_URL}/recruiters/${id}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                last_contacted_at: today
            }),

        });


        const updatedRecruiter = await res.json();

        if(!res.ok) {
            console.error("Mark contacted today failed: ", updatedRecruiter);
            return;
        }

        setRecruiters((prevRecruiters) => (
            prevRecruiters.map((recruiter) => 
                recruiter.id === updatedRecruiter.id ? updatedRecruiter : recruiter  
            ))
        )


     } catch (error) {
        console.error("Error marking recruiter as contacted today: ", error);
     }
  }
  


    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-start gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/20">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-5 w-5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-800">Recruiters</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Track recruiters who contacted you or recruiters you want to reach out to.
                    </p>
                </div>
            </div>

            <div className="border-t border-slate-200 p-6">
                <h3 className="text-lg font-semibold tracking-tight text-slate-800">Add Recruiter</h3>
                <p className="mt-1 text-sm text-slate-500">Record contact details and relationship status.</p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                        <input
                            type="text"
                            placeholder="Jane Doe"
                            value={recruiterName}
                            onChange={(e) => setRecruiterName(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Company</label>
                        <input
                            type="text"
                            placeholder="Acme Inc."
                            value={recruiterCompany}
                            onChange={(e) => setRecruiterCompany(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            placeholder="jane@acme.com"
                            value={recruiterEmail}
                            onChange={(e) => setRecruiterEmail(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">LinkedIn URL</label>
                        <input
                            type="url"
                            placeholder="https://linkedin.com/in/..."
                            value={recruiterLinkedinUrl}
                            onChange={(e) => setRecruiterLinkedinUrl(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                        <input
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={recruiterPhone}
                            onChange={(e) => setRecruiterPhone(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Relationship Status</label>
                        <select
                            value={recruiterRelationshipStatus}
                            onChange={(e) => setRecruiterRelationshipStatus(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="New">New</option>
                            <option value="Reached Out">Reached Out</option>
                            <option value="Replied">Replied</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Follow Up Needed">Follow Up Needed</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                        <textarea
                            placeholder="Add any relevant context about this recruiter..."
                            value={recruiterNotes}
                            onChange={(e) => setRecruiterNotes(e.target.value)}
                            className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                    <button
                        onClick={addRecruiter}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                    >
                        Add Recruiter
                    </button>
                </div>

                    {/* Filter toolbar */}
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <svg
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search recruiters..."
                            value={recruiterSearch}
                            onChange={(e) => setRecruiterSearch(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <select
                        value={recruiterStatusFilter}
                        onChange={(e) => setRecruiterStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:w-48"
                    >
                        <option value="All">All Statuses</option>
                        <option value="New">New</option>
                        <option value="Reached Out">Reached Out</option>
                        <option value="Replied">Replied</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                        <option value="Follow Up Needed">Follow Up Needed</option>
                    </select>

                    <select
                        value={recruiterSort}
                        onChange={(e) => setRecruiterSort(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 md:w-44"
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="name-az">Name A-Z</option>
                        <option value="last-contacted">Last contacted</option>
                    </select>
                </div>


                {followUpRecruiters.length > 0 && (
                        <div className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold tracking-tight text-amber-900">
                                        Follow-Up Queue
                                    </h3>
                                    <p className="mt-0.5 text-sm text-amber-700/90">
                                        Recruiters you want to follow up with.
                                    </p>
                                </div>
                            </div>
                        
                            <div className="mt-4 space-y-2">
                                {followUpRecruiters.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 p-6 text-center">
                                        <p className="text-sm font-medium text-amber-800">You're all caught up.</p>
                                        <p className="mt-1 text-xs text-amber-700/80">
                                            No recruiters need a follow-up right now.
                                        </p>
                                    </div>
                                ) : (
                                    followUpRecruiters.map((recruiter) => {
                                        const initials = (recruiter.name || "?")
                                            .split(" ")
                                            .map((n) => n[0])
                                            .slice(0, 2)
                                            .join("")
                                            .toUpperCase();
                        
                                        return (
                                            <div
                                                key={recruiter.id}
                                                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white">
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            {recruiter.name}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {recruiter.company || "No company"}
                                                        </p>
                                                    </div>
                                                </div>
                        
                                                <div className="flex shrink-0 gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingRecruiter(recruiter);
                                                            setEditName(recruiter.name || "");
                                                            setEditCompany(recruiter.company || "");
                                                            setEditEmail(recruiter.email || "");
                                                            setEditLinkedinUrl(recruiter.linkedin_url || "");
                                                            setEditPhone(recruiter.phone || "");
                                                            setEditRelationshipStatus(recruiter.relationship_status || "New");
                                                            setEditNotes(recruiter.notes || "");
                                                            setEditLastContactedAt(
                                                                recruiter.last_contacted_at
                                                                    ? recruiter.last_contacted_at.split("T")[0]
                                                                    : ""
                                                            );
                                                        }}
                                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                                    >
                                                        Update
                                                    </button>
                        
                                                    <button
                                                        onClick={() => markRecruiterContactedToday(recruiter.id)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-emerald-500/20 transition-opacity hover:opacity-90"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth={2.5}
                                                            stroke="currentColor"
                                                            className="h-3.5 w-3.5"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                        </svg>
                                                        Mark Contacted
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div> 
                )}


{sortedRecruiters.length === 0 ? (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                        <p className="text-sm font-medium text-slate-600">No recruiters added yet.</p>
                        <p className="mt-1 text-xs text-slate-500">Add a recruiter to start tracking your conversations.</p>
                    </div>
                ) : (
                    <div className="mt-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold tracking-tight text-slate-800">My Recruiters</h3>
                                <p className="text-sm text-slate-500">
                                    {sortedRecruiters.length} recruiter{sortedRecruiters.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
 
                        <div className="mt-4 space-y-3">
                            {sortedRecruiters.map((recruiter) => {
                                
                                const followUp = getFollowUpLabel(recruiter.last_contacted_at);

                                const recruiterInterviews = interviews.filter((interview) => interview.recruiter_id === recruiter.id);

                                const totalInterviews = recruiterInterviews.length;

                                const offers = recruiterInterviews.filter((interview) => interview.outcome === "Offer").length;

                                const activePipelines = recruiterInterviews.filter((interview) => interview.outcome !== "Rejected" && interview.outcome !== "Offer").length;

                                const latestInterview = recruiterInterviews.filter((interview) => interview.interview_date).sort((a, b) => (
                                    new Date(b.interview_date!).getTime() - new Date(a.interview_date!).getTime()
                                ))[0];

                                const initials = (recruiter.name || "").split(" ").map((n) => n[0]).slice(0, 2).join().toUpperCase();



                                return (
                                    <div
                                        key={recruiter.id}
                                        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                                    >
                                        {/* Top row: identity + status badges + actions */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white shadow-sm shadow-blue-500/20">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-semibold text-slate-800">
                                                        {recruiter.name}
                                                    </p>
                                                    <p className="truncate text-sm text-slate-500">
                                                        {recruiter.company}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRelationshipStatusStyles(recruiter.relationship_status || "New")}`}>
                                                            {recruiter.relationship_status}
                                                        </span>
                                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${followUp.className}`}>
                                                            {followUp.label}
                                                        </span>
                                                        <span className="text-sm text-slate-500">
                                                              Latest Interview: {" "} {latestInterview ? new Date(latestInterview.interview_date!).toLocaleDateString() : "None"}
                                                        </span>
                                                        
                                                    </div>
                                                    
                                                </div>
                                            </div>
                
                                            <div className="flex shrink-0 items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingRecruiter(recruiter);
                                                        setEditName(recruiter.name || "");
                                                        setEditCompany(recruiter.company || "");
                                                        setEditEmail(recruiter.email || "");
                                                        setEditLinkedinUrl(recruiter.linkedin_url || "");
                                                        setEditPhone(recruiter.phone || "");
                                                        setEditRelationshipStatus(recruiter.relationship_status || "New");
                                                        setEditNotes(recruiter.notes || "");
                                                        setEditLastContactedAt(
                                                            recruiter.last_contacted_at
                                                                ? recruiter.last_contacted_at.split("T")[0]
                                                                : ""
                                                        );
                                                    }}
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setRecruiterToDelete(recruiter)}
                                                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRecruiter(recruiter)}
                                                    className="rounded-xl border border-blue-200 px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                                                    >
                                                        View interviews

                                                </button>
                                            </div>
                                        </div>
                
                                        {/* Stats row */}
                                        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
                                            <div className="text-center">
                                                <p className="text-lg font-semibold tracking-tight text-slate-800 tabular-nums">
                                                    {totalInterviews}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                                                    Interviews
                                                </p>
                                            </div>
                                            <div className="border-x border-slate-200 text-center">
                                                <p className="text-lg font-semibold tracking-tight text-slate-800 tabular-nums">
                                                    {offers}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                                                    Offers
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-semibold tracking-tight text-slate-800 tabular-nums">
                                                    {activePipelines}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                                                    Active
                                                </p>
                                            </div>
                                        </div>

                
                                        {/* Contact + notes */}
                                        {(recruiter.email || recruiter.linkedin_url || recruiter.notes) && (
                                            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                                                {recruiter.email && (
                                                    <a
                                                        href={`mailto:${recruiter.email}`}
                                                        className="block truncate text-sm text-slate-600 hover:text-blue-600"
                                                    >
                                                        {recruiter.email}
                                                    </a>
                                                )}
                                                {recruiter.linkedin_url && (
                                                    <a
                                                        href={recruiter.linkedin_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                    >
                                                        LinkedIn Profile →
                                                    </a>
                                                )}
                                                {recruiter.notes && (
                                                    <p className="text-sm leading-relaxed text-slate-600">
                                                        {recruiter.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        
                                    </div>
                                );
                            })}

                        </div>  
                        
                    </div>
                )}

            </div>

            {recruiterToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRecruiterToDelete(null)}>
                        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-semibold tracking-tight text-slate-800">
                                            Delete recruiter?
                                        </h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            Are you sure you want to delete{" "}
                                            <span className="font-semibold text-slate-800">
                                                {recruiterToDelete.name}
                                            </span>
                                            ? This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                    
                            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                                <button
                                    onClick={() => setRecruiterToDelete(null)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                    Cancel
                                </button>
                    
                                <button
                                    onClick={() => {
                                        deleteRecruiter(recruiterToDelete.id);
                                        setRecruiterToDelete(null);
                                    }}
                                    className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-rose-500/25 transition-opacity hover:opacity-90"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
            )}

                {editingRecruiter && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setEditingRecruiter(null)}>
                        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                    
                            {/* Header */}
                            <div className="rounded-t-2xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-5 text-white">
                                <h3 className="text-xl font-semibold tracking-tight">Edit Recruiter</h3>
                                <p className="mt-1 text-sm text-blue-100">
                                    Update contact details and relationship status.
                                </p>
                            </div>
                    
                            <div className="p-6">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Name</label>
                                        <input
                                            type="text"
                                            placeholder="Jane Doe"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Company</label>
                                        <input
                                            type="text"
                                            placeholder="Acme Inc."
                                            value={editCompany}
                                            onChange={(e) => setEditCompany(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                                        <input
                                            type="email"
                                            placeholder="jane@acme.com"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://linkedin.com/in/..."
                                            value={editLinkedinUrl}
                                            onChange={(e) => setEditLinkedinUrl(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                                        <input
                                            type="tel"
                                            placeholder="(555) 123-4567"
                                            value={editPhone}
                                            onChange={(e) => setEditPhone(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Relationship Status</label>
                                        <select
                                            value={editRelationshipStatus}
                                            onChange={(e) => setEditRelationshipStatus(e.target.value)}
                                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        >
                                            <option value="New">New</option>
                                            <option value="Reached Out">Reached Out</option>
                                            <option value="Replied">Replied</option>
                                            <option value="Interview Scheduled">Interview Scheduled</option>
                                            <option value="Follow Up Needed">Follow Up Needed</option>
                                        </select>
                                    </div>
                    
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
                                        <textarea
                                            placeholder="Add any relevant context about this recruiter..."
                                            value={editNotes}
                                            onChange={(e) => setEditNotes(e.target.value)}
                                            className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                    
                                    <div className="md:col-span-2">
                                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Last Contacted</label>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <input
                                                type="date"
                                                value={editLastContactedAt}
                                                onChange={(e) => setEditLastContactedAt(e.target.value)}
                                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:flex-1"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditLastContactedAt(new Date().toISOString().split("T")[0])}
                                                className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                            >
                                                Today
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    
                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                                <button
                                    onClick={() => setEditingRecruiter(null)}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                    Cancel
                                </button>
                    
                                <button
                                    onClick={updateRecruiter}
                                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                                >
                                    Save changes
                                </button>
                            </div>
                        </div>
                    </div>   
                )}


                {(selectedRecruiter) && (() => {

                    const recruiterInterviews = interviews.filter((interview) => interview.recruiter_id === selectedRecruiter.id)

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedRecruiter(null)}>
                        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                          <div className="-m-6 mb-6 rounded-t-2xl bg-blue-600 px-6 py-5 text-white">
                            <h3 className="text-xl font-semibold">
                              {selectedRecruiter.name}
                            </h3>
                
                            <p className="mt-1 text-sm text-blue-100">
                              Recruiter Interview Pipeline
                            </p>
                          </div>
                
                          <div className="space-y-4">
                            {recruiterInterviews.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                No linked interviews.
                              </p>
                            ) : (
                              recruiterInterviews.map((interview) => {
                                const interviewJob = jobs.find(
                                  (job) => job.id === interview.job_id
                                );
                
                                return (
                                  <div
                                    key={interview.id}
                                    className="rounded-xl border border-slate-200 p-4"
                                  >
                                    <h4 className="font-semibold text-slate-900">
                                      {interviewJob
                                        ? `${interviewJob.title} — ${interviewJob.company}`
                                        : "Unknown Job"}
                                    </h4>
                
                                    <p className="mt-2 text-sm text-slate-500">
                                      {interview.interview_date
                                        ? new Date(interview.interview_date).toLocaleString()
                                        : "No date set"}
                                    </p>
                
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                        {interview.stage || "No stage"}
                                      </span>
                
                                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                        {interview.outcome || "Pending"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                
                          <div className="mt-6 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedRecruiter(null)}
                              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )

                })()}



            




            
        </div>
    );
}

export default RecruitersView;