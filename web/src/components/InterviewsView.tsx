
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

import type { Interview } from "../types/interview";
import type { Job } from "../types/job";
import type { Recruiter } from "../types/recruiter";
import type { AppNotification } from "../types/notification";

import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;


function InterviewsView({ jobs, appNotifications, setAppNotifications, session } : { jobs: Job[]; appNotifications: AppNotification[]; setAppNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>; session: Session | null; }) {

    const [interviews, setInterviews] = useState<Interview[]>([]);

    const [selectedJobId, setSelectedJobId] = useState("");
    const [interviewDate, setInterviewDate] = useState("");
    const [interviewType, setInterviewType] = useState("");
    const [stage, setStage] = useState("Phone Screen");
    const [meetingUrl, setMeetingUrl] = useState("");
    const [prepNotes, setPrepNotes] = useState("");

    const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);

    const [editInterviewDate, setEditInterviewDate] = useState("");
    const [editInterviewType, setEditInterviewType] = useState("");
    const [editStage, setEditStage] = useState("");
    const [editMeetingUrl, setEditMeetingUrl] = useState("");
    const [editPrepNotes, setEditPrepNotes] = useState("");
    const [editOutcome, setEditOutcome] = useState("Pending");

    const [interviewSearch, setInterviewSearch] = useState("");
    const [stageFilter, setStageFilter] = useState("All");
    const [outcomeFilter, setOutcomeFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All");
    const [sortBy, setSortBy] = useState("nearet");

    const [generatingInterviewPrepId, setGeneratingInterviewPrepId] = useState<string | null>(null);

  
    const [generatingFollowUpId, setGeneratingFollowUpId] = useState<string | null>(null);
    const [selectedFollowUpInterview, setSelectedFollowUpInterview] = useState<Interview | null>(null);

    const [editableFollowUpSubject, setEditableFollowUpSubject] = useState("");
    const [editableFollowUpBody, setEditableFollowUpBody] = useState("");

    const [interviewView, setInterviewView] = useState<"list" | "timeline" | "calendar">("list");

    const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
    const [selectedRecruiterId, setSelectedRecruiterId] = useState("");

    const [calendarDate, setCalendarDate] = useState(new Date());

    const [durationMinutes, setDurationMinutes] = useState<number>(30);
    const [editDurationMinutes, setEditDurationMinutes] = useState<number>(30);



    /*async function fetchInterviews() {

        const res = await fetch(`${API_URL}/interviews`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        const data = await res.json();

        if(!res.ok) {
            console.error("Error fetching interview data: ", data);
            return;
        }

        setInterviews(data);
    }*/

    async function fetchInterviews() {
        try {

            const { 
                data: { session },
            } = await supabase.auth.getSession();

            const token = session?.access_token;

            if(!token) {
                console.error("No auth token found");
                return;
            }

            const response = await fetch(`${API_URL}/interviews`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });

            const data = await response.json();

            if(!response.ok) {
                console.error("Error fetching interview data", data);
                return;
            }

            setInterviews(data);
        } catch (error) {
            console.error("Error fetching interview data: ", error);
        }
    }    

    async function fetchRecruiters() {
       

       try {

          const {
            data: { session },
          } = await supabase.auth.getSession();

          const token = session?.access_token;

          if(!token) {
              console.error("No auth token found");
              return;
          }


          const res = await fetch(`${API_URL}/recruiters`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });

          const data = await res.json();

          if(!res.ok) {
             console.error(`Error fetching recruiters:`, data);
             return;
          }

          setRecruiters(data);


       } catch (error) {
          console.error("Error fetching recruiters: ", error);
         
       }
    }

    useEffect(() => {
        if(!session) return;
        fetchRecruiters();
        fetchInterviews();
    }, [session]);


    async function addInterview() {

        try {

            if (!session) return;

            if(!selectedJobId) {
                console.error("Please select a job");
                return;
            }

            const res = await fetch(`${API_URL}/interviews`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    job_id: selectedJobId,
                    interview_date: interviewDate || null,
                    interview_type: interviewType,
                    stage: stage,
                    meeting_url: meetingUrl,
                    prep_notes: prepNotes,
                    outcome: "Pending",
                    recruiter_id: selectedRecruiterId,
                    duration_minutes: durationMinutes,
                })
            });

            const data = await res.json();

            if(!res.ok) {
                console.error("Error adding interview", data);
                return;
            }

            setInterviews((prevs) => [...prevs, data.interview]);

            if(data.notification) {
               setAppNotifications((prevs) => [...prevs, data.notification]);
            }

            setSelectedJobId("");
            setInterviewDate("");
            setInterviewType("");
            setStage("Phone Screen");
            setMeetingUrl("");
            setPrepNotes("");
            

        } catch (error) {

            console.error("Error adding new interview: ", error);


        }
    }

    async function deleteInterview(id: string) {

        if(!session) return;

        try {

            const res = await fetch(`${API_URL}/interviews/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                },
            });

            const deletedInterview = await res.json();

            if(!res.ok) {
                console.error("Error deleting interview: ", deletedInterview);
                return;
            }

            setInterviews((prevs) => 
                prevs.filter((interview) => interview.id !== id)
            );

        } catch (error) {
            console.error(`Error deleting interview`, error);
        }
    }

    async function updateInterview() {
        if (!session || !selectedInterview) return;
      
        try {
          const res = await fetch(`${API_URL}/interviews/${selectedInterview.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              interview_date: editInterviewDate || null,
              interview_type: editInterviewType,
              stage: editStage,
              meeting_url: editMeetingUrl,
              prep_notes: editPrepNotes,
              outcome: editOutcome,
              duration_minutes: editDurationMinutes,
            }),
          });
      
          const updatedInterview = await res.json();
      
          if (!res.ok) {
            console.error("Error updating interview:", updatedInterview);
            return;
          }
      
          setInterviews((prev) =>
            prev.map((interview) =>
              interview.id === updatedInterview.id ? updatedInterview : interview
            )
          );
      
          setSelectedInterview(null);
        } catch (error) {
          console.error("Error updating interview:", error);
        }
    }


    const filteredAndSortedInterviews = interviews
  .filter((interview) => {
    const interviewJob = jobs.find((job) => job.id === interview.job_id);

    const searchText = `
      ${interview.stage || ""}
      ${interview.interview_type || ""}
      ${interview.outcome || ""}
      ${interview.prep_notes || ""}
      ${interviewJob?.title || ""}
      ${interviewJob?.company || ""}
    `.toLowerCase();

    const matchesSearch = searchText.includes(interviewSearch.toLowerCase());

    const matchesStage =
      stageFilter === "All" || interview.stage === stageFilter;

    const matchesOutcome =
      outcomeFilter === "All" || interview.outcome === outcomeFilter;

    const interviewDate = interview.interview_date
      ? new Date(interview.interview_date)
      : null;

    const now = new Date();

    const matchesDate =
      dateFilter === "All" ||
      (dateFilter === "Upcoming" && interviewDate && interviewDate >= now) ||
      (dateFilter === "Past" && interviewDate && interviewDate < now) ||
      (dateFilter === "No Date" && !interviewDate);

    return matchesSearch && matchesStage && matchesOutcome && matchesDate;
  })
  .sort((a, b) => {
    const dateA = a.interview_date
      ? new Date(a.interview_date!).getTime()
      : Infinity;

    const dateB = b.interview_date
      ? new Date(b.interview_date!).getTime()
      : Infinity;

    if (sortBy === "nearest") {
      return dateA - dateB;
    }

    if (sortBy === "latest") {
      return dateB - dateA;
    }

    if (sortBy === "stage") {
      return (a.stage || "").localeCompare(b.stage || "");
    }

    if (sortBy === "outcome") {
      return (a.outcome || "").localeCompare(b.outcome || "");
    }

    return 0;
  });


    const now = new Date();

    const upcomingInterviews = interviews.filter((interview) => interview.interview_date && new Date(interview.interview_date) >= now);
    const pastInterviews = interviews.filter((interview) => interview.interview_date && new Date(interview.interview_date) < now);
    const pendingOutcomes = interviews.filter((interview) => interview.outcome === "Pending");
    const technicalInterviews = interviews.filter((interview) => interview.interview_type === "Technical");
    const nextInterview = [...upcomingInterviews].sort((a, b) =>
          new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime()
    )[0];

    async function generateInterviewPrep(interview: Interview) {
        if(!session) return;

        setGeneratingInterviewPrepId(interview.id);

        try {
            const interviewJob = jobs.find((job) =>
                job.id === interview.job_id

            );

            const res = await fetch(`${API_URL}/interviews/${interview.id}/generate-prep`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    jobTitle: interviewJob?.title,
                    company: interviewJob?.company,
                    stage: interview.stage,
                    interviewType: interview.interview_type,
                    prepNotes: interview.prep_notes,
                    jobDescription: interviewJob?.job_description,
                }),

            });

            const data = await res.json();

            if(!res.ok) {
                console.error("AI generation of interview prep failed: ", data);
                return;
            }

            setInterviews((prevs) => (
                prevs.map((item) => item.id === interview.id ? data : item)
            ));

        } catch (error) {
            console.error("AI prep error:", error);
        } finally {
            setGeneratingInterviewPrepId(null);
        }
    }

    async function clearInterviewPrep(interviewId: string) {

       if(!session) return;

       try {
           
           const res = await fetch(`${API_URL}/interviews/${interviewId}/clear-prep`, {
             method: "PATCH",
             headers: {
                Authorization: `Bearer ${session.access_token}`,
             },
           });

           const data = await res.json();

           if(!res.ok) {
              console.error("Error clearing interview prep", data);
              return;
           }

           setInterviews((prevs) => (
               prevs.map((interview) => interview.id === interviewId ? data : interview)
           ));
       } catch (error) {
          console.error("Clear prep error ", error);
       }
    }


    async function toggleChecklistItem(interviewId: string, itemIndex: number) {

       if(!session) return;

       const interview = interviews.find((interview) => interview.id === interviewId);

       if(!interview) return;

       const updatedChecklist = interview.prep_checklist.map((item, index) =>
          index === itemIndex ? {
            ...item,
            completed: !item.completed
          } : item
       );

       try {
          
           const res = await fetch(`${API_URL}/interviews/${interviewId}/checklist`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prep_checklist: updatedChecklist,
              }),

           });

           const data = await res.json();

           if(!res.ok) {
             console.error("Failed to update interview checklist ", data);
             return;
           }

           setInterviews((prevs) => 
              prevs.map((item) => item.id === interviewId ? data : item)
           );

       } catch (error) {
          console.error("Checklist update error: ", error);
       }

    }


    async function generateFollowUpEmail(interview: Interview) {
      if (!session) return;
    
      setGeneratingFollowUpId(interview.id);
    
      try {
        const interviewJob = jobs.find((job) => job.id === interview.job_id);
    
        const res = await fetch(`${API_URL}/interviews/${interview.id}/generate-follow-up`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            jobTitle: interviewJob?.title,
            company: interviewJob?.company,
            stage: interview.stage,
            interviewType: interview.interview_type,
            outcome: interview.outcome,
            prepNotes: interview.prep_notes,
          }),
        });
    
        const data = await res.json();
    
        if (!res.ok) {
          console.error("Follow-up email generation failed:", data);
          return;
        }
    
        setInterviews((prevs) =>
          prevs.map((item) =>
            item.id === interview.id ? data : item
          )
        );
    
        setSelectedFollowUpInterview(data);
        setEditableFollowUpSubject(data.follow_up_email_subject || "");
        setEditableFollowUpBody(data.follow_up_email_body || "");
      } catch (error) {
        console.error("Follow-up email error:", error);
      } finally {
        setGeneratingFollowUpId(null);
      }
    }


    async function saveFollowUpEmail(interviewId: string) {

       if(!session) return;
       
       try {
          
          
          const res = await fetch(`${API_URL}/interviews/${interviewId}/follow-up`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
               follow_up_email_subject: editableFollowUpSubject,
               follow_up_email_body: editableFollowUpBody,
            })
          });

          const data = await res.json();

          if(!res.ok) {
            console.error("Failed to save follow-up", data);
            return;
          }

          setInterviews((prevs) => prevs.map((item) => item.id === interviewId ? data : item));

          setSelectedFollowUpInterview(data);

       } catch (error) {
          console.error("Error saving follow up email: ", error);
       }
        
    }

    const timelineInterviews = [...filteredAndSortedInterviews]
    .filter((interview) => interview.interview_date)
    .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());


    const upcomingInterviewsList = [...interviews].filter((interview) => {
      if(!interview.interview_date) return false;

      return (
        new Date(interview.interview_date).getTime() > Date.now()
      )
    }).sort((a, b) => new Date(b.interview_date!).getTime() - new Date(a.interview_date!).getTime()).slice(0, 5);


    async function createInterviewReminder(interview: Interview) {
       
       try {
         if(!session) return;

         const interviewJob = jobs.find((job) => job.id === interview.job_id);

         const res = await fetch(`${API_URL}/notifications/interview-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            interview_id: interview.id,
            title: "Interview Reminder",
            message: `${interviewJob?.title || "Interview"} starts within 24 hours`,
          }),
         });

         const data = await res.json();

         if(!res.ok) {
            console.error("Error in creating interview reminder: ", data);
            return;
         }

         setAppNotifications((prevs) => [...prevs, data]);

       } catch (error) {
          console.error("Reminder error:", error);
       }
    }

    useEffect(() => {
      const now  = Date.now();

      interviews.forEach((interview) => {
         if(!interview.interview_date) return;

         const interviewTime = new Date(interview.interview_date).getTime();

         const hoursUntilInterview = (interviewTime - now) / (1000 * 60 * 60);

         const alreadyExists = appNotifications.some((notification) => notification.related_interview_id === interview.id && notification.type === "interview_reminder_24h");

         if (hoursUntilInterview > 0 && hoursUntilInterview < 24 && !alreadyExists) {
            createInterviewReminder(interview);
         }
      })
    }, [interviews])

    const calendarYear = calendarDate.getFullYear();
    const calendarMonth = calendarDate.getMonth();

    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayIndex = firstDayOfMonth.getDay();

    const calendarDays = [
        ...Array(startingDayIndex).fill(null),
        ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];

    function formatDuration(minutes?: number | null) {
        if(!minutes) return;

        if(minutes < 60) {
            return `${minutes} min`;
        }

        if(minutes === 60) {
            return `1 hr`;
        } 

        return `${minutes / 60} hrs`;
    }


    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {/* Page header */}
            <div className="mt-6 flex items-start gap-4">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-800">Interviews</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Track upcoming interviews, prep notes, meeting links, and outcomes.
                    </p>
                </div>
            </div>

            {/* Empty state */}
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <p className="text-sm font-medium text-slate-600">Interview tracker coming next.</p>
                <p className="mt-1 text-xs text-slate-500">Add your first interview below to start tracking.</p>
            </div>

            {/* Add Interview form */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-800">Add Interview</h3>
                    <p className="mt-1 text-sm text-slate-500">Log the details of an upcoming or recent interview.</p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Job</label>
                        <select
                            value={selectedJobId}
                            onChange={(e) => setSelectedJobId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">Select job...</option>
                            {jobs.map((job) => (
                                <option key={job.id} value={job.id}>
                                    {job.title} — {job.company}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Recruiter</label>
                        <select
                            value={selectedRecruiterId}
                            onChange={(e) => setSelectedRecruiterId(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">No recruiter linked</option>
                            {recruiters.map((recruiter) => (
                                <option key={recruiter.id} value={recruiter.id}>
                                    {recruiter.name}
                                    {recruiter.company ? ` — ${recruiter.company}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Interview Date</label>
                        <input
                            type="datetime-local"
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Type</label>
                        <input
                            type="text"
                            value={interviewType}
                            placeholder="e.g. Technical, Behavioral"
                            onChange={(e) => setInterviewType(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Stage</label>
                        <select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="Phone Screen">Phone Screen</option>
                            <option value="Recruiter Screen">Recruiter Screen</option>
                            <option value="Technical Interview">Technical Interview</option>
                            <option value="System Design">System Design</option>
                            <option value="Final Round">Final Round</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Duration</label>
                        <select
                             value={durationMinutes}
                             onChange={(e) => setDurationMinutes(Number(e.target.value))}
                             className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                           <option value={15}>15 minutes</option>
                           <option value={30}>30 minutes</option>
                           <option value={45}>45 minutes</option>
                           <option value={60}>1 hour</option>
                           <option value={90}>1.5 hours</option>
                        </select>

                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Meeting URL</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={meetingUrl}
                            onChange={(e) => setMeetingUrl(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Prep Notes</label>
                        <textarea
                            value={prepNotes}
                            onChange={(e) => setPrepNotes(e.target.value)}
                            placeholder="What do you want to prepare or research before this interview?"
                            className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
                    <button
                        onClick={addInterview}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                    >
                        Add Interview
                    </button>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-800">Upcoming interviews</h2>
                      <p className="mt-1 text-sm text-slate-500">Your next scheduled conversations.</p>
                  </div>

                  <div className="mt-5 space-y-3">
                      {upcomingInterviewsList.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                              <p className="text-sm font-medium text-slate-600">No upcoming interviews scheduled.</p>
                              <p className="mt-1 text-xs text-slate-500">Add an interview below to see it appear here.</p>
                          </div>
                      ) : (
                          upcomingInterviewsList.map((interview) => {
                              const interviewJob = jobs.find((job) => job.id === interview.job_id);
                              const completed = interview.prep_checklist?.filter((item) => item.completed).length || 0;
                              const total = interview.prep_checklist?.length || 0;
                              const readiness = total > 0 ? Math.round((completed / total) * 100) : 0;

                              const interviewDate = new Date(interview.interview_date!);
                              const dateLabel = interviewDate.toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                              });
                              const timeLabel = interviewDate.toLocaleTimeString(undefined, {
                                  hour: "numeric",
                                  minute: "2-digit",
                              });

                              const readinessColor =
                                  readiness >= 75
                                      ? "text-emerald-600"
                                      : readiness >= 40
                                      ? "text-amber-600"
                                      : "text-slate-400";

                              return (
                                  <div
                                      key={interview.id}
                                      className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                                  >
                                      <div className="flex min-w-0 items-start gap-3">
                                          {/* Date block */}
                                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                                  {interviewDate.toLocaleDateString(undefined, { month: "short" })}
                                              </span>
                                              <span className="text-base font-bold leading-none text-slate-800 tabular-nums">
                                                  {interviewDate.getDate()}
                                              </span>
                                          </div>

                                          <div className="min-w-0">
                                              <h3 className="truncate text-sm font-semibold text-slate-800">
                                                  {interviewJob
                                                      ? `${interviewJob.title} — ${interviewJob.company}`
                                                      : "Unknown Job"}
                                              </h3>
                                              <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                                  {dateLabel} · {timeLabel}
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-1.5">
                                                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                      {interview.stage}
                                                  </span>
                                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                                      {interview.outcome}
                                                  </span>
                                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                                    {formatDuration(interview.duration_minutes)}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Readiness */}
                                      <div className="flex shrink-0 flex-col items-end">
                                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                              Readiness
                                          </p>
                                          <p className={`mt-1 text-xl font-bold tracking-tight tabular-nums ${readinessColor}`}>
                                              {readiness}%
                                          </p>
                                          <div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                              <div
                                                  className={`h-full rounded-full transition-all duration-300 ${
                                                      readiness >= 75
                                                          ? "bg-emerald-500"
                                                          : readiness >= 40
                                                          ? "bg-amber-500"
                                                          : "bg-slate-300"
                                                  }`}
                                                  style={{ width: `${readiness}%` }}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>

            <div className="mt-6 border border-slate-300 rounded-2xl shadow-sm p-4">
                <div className="grid gap-3 md: grid-cols-5">
                    <input
                          value={interviewSearch}
                          onChange={(e) => setInterviewSearch(e.target.value)}
                          placeholder="Search interviews..."
                          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 md:col-span-2"
                          />

                    <select
                          value={stageFilter}
                          onChange={(e) => setStageFilter(e.target.value)}
                          className="rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                    >
                         <option value="All">All stages</option>
                         <option value="Phone Screen">Phone Screen</option>
                         <option value="Recruiter Screen">Recruiter Screen</option>
                         <option value="Technical Interview">Technical Interview</option>
                         <option value="Behavioral Interview">Behavioral Interview</option>
                         <option value="Final Round">Final Round</option>
                         <option value="Offer Discussion">Offer Discussion</option>
                         
                    </select>      

                    <select
                         value={outcomeFilter}
                         onChange={(e) => setOutcomeFilter(e.target.value)}
                         className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
                         >
                         <option value="All">All outcomes</option>
                         <option value="Pending">Pending</option>
                         <option value="Passed">Passed</option>
                         <option value="Rejected">Rejected</option>
                         <option value="No Show">No Show</option>
                         <option value="Rescheduled">Rescheduled</option>

                    </select>

                    <select
                         value={sortBy}
                         onChange={(e) => setSortBy(e.target.value)}
                         className="rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    >
                         <option value="nearest">Nearest date</option>
                         <option value="latest">Latest date</option>
                         <option value="Stage">Stage A-Z</option>
                         <option value="Outcome">Outcome A-Z</option>
                    </select>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {["All", "Upcoming", "Past", "No Date"].map((filter) => (
                        <button
                               key={filter}
                               type="button"
                               onClick={() => setDateFilter(filter)}
                               className={`rounded-full px-3 py-1.5 text-xs font-medium ${dateFilter === filter ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"

                               }`} 
                               >
                                {filter}

                        </button>
                    ))}

                </div>

            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                    Upcoming
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-900">
                    {upcomingInterviews.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                    Pending Outcomes
                    </p>

                    <p className="mt-2 text-3xl font-bold text-amber-600">
                    {pendingOutcomes.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                    Technical Interviews
                    </p>

                    <p className="mt-2 text-3xl font-bold text-amber-600">
                    {technicalInterviews.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                    Completed
                    </p>

                    <p className="mt-2 text-3xl font-bold text-amber-600">
                    {pastInterviews.length}
                    </p>
                </div>

                

            </div>

            {nextInterview && (() => {
                const job = jobs.find((j) => j.id === nextInterview.job_id);
                const date = new Date(nextInterview.interview_date!);

                return (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500">
                                        <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-blue-500 opacity-75" />
                                    </span>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                                        Next Interview
                                    </p>
                                </div>

                                <h3 className="mt-2 text-base font-semibold tracking-tight text-slate-800">
                                    {job?.title || "Untitled role"}
                                </h3>
                                <p className="text-sm text-slate-600">
                                    {job?.company || "Unknown company"}
                                </p>

                                <p className="mt-3 text-sm font-medium text-blue-700 tabular-nums">
                                    {date.toLocaleDateString(undefined, {
                                        weekday: "long",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                    {" · "}
                                    {date.toLocaleTimeString(undefined, {
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            {/* Date block */}
                            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-blue-200 bg-white shadow-sm">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                                    {date.toLocaleDateString(undefined, { month: "short" })}
                                </span>
                                <span className="text-xl font-bold leading-none text-slate-800 tabular-nums">
                                    {date.getDate()}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* View toggle */}
            <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                    type="button"
                    onClick={() => setInterviewView("list")}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                        interviewView === "list"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    List
                </button>

                <button
                    type="button"
                    onClick={() => setInterviewView("timeline")}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                        interviewView === "timeline"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Timeline
                </button>

                <button
                    type="button"
                    onClick={() => setInterviewView("calendar")}
                    className={`rounded px-4 py-1.5 text-sm font-medium transition-colors ${
                        interviewView === "calendar"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"

                    }`}

                >
                    Calendar
                </button>

            </div>

            {interviewView === "list" && (
                 <div className="mt-4 space-y-4">
                        {filteredAndSortedInterviews.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                <p className="text-sm font-medium text-slate-600">No interviews scheduled yet.</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Add an interview to track prep notes, stages, and outcomes.
                                </p>
                            </div>  
                        ) : (
                            filteredAndSortedInterviews.map((interview) => {
                            const interviewJob = jobs.find((j) => j.id === interview.job_id);
                            const interviewRecruiter = recruiters.find((r) => r.id === interview.recruiter_id);
                
                            const checklistCompleted = interview.prep_checklist?.filter((item) => item.completed).length || 0;
                            const checklistTotal = interview.prep_checklist?.length || 0;
                            const checklistScore = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
                            const notesScore = interview.prep_notes ? 15 : 0;
                            const aiScore = interview.ai_prep_summary ? 15 : 0;
                            const readinessScore = Math.min(100, Math.round(checklistScore * 0.7 + notesScore + aiScore));
                
                            const hasAiPrep = interview.ai_prep_summary || interview.ai_questions?.length > 0;
                            const aiButtonLabel =
                                generatingInterviewPrepId === interview.id
                                    ? "Generating..."
                                    : hasAiPrep
                                    ? "Regenerate AI Prep"
                                    : "Generate AI Prep";
                
                            const followUpLabel =
                                generatingFollowUpId === interview.id
                                    ? "Generating..."
                                    : interview.follow_up_email_body
                                    ? "Regenerate Follow-Up"
                                    : "Generate Follow-Up";
                

                            
                                return (
                                <div
                                key={interview.id}
                                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                            >
                                {/* Header row */}
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold tracking-tight text-slate-800">
                                                {interviewJob
                                                    ? `${interviewJob.title} — ${interviewJob.company}`
                                                    : "Job not found"}
                                            </h3>
                
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                                                <span className="tabular-nums">
                                                    {interview.interview_date
                                                        ? new Date(interview.interview_date).toLocaleString([], {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            })
                                                        : "No date set"}
                                                </span>
                                                {interviewRecruiter && (
                                                    <>
                                                        <span className="text-slate-300">·</span>
                                                        <span>via {interviewRecruiter.name}</span>
                                                    </>
                                                )}
                                            </div>
                
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                    {interview.stage || "No stage"}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                                    {interview.interview_type || "General"}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                                    {interview.outcome || "Pending"}
                                                </span>
                                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                                    {formatDuration(interview.duration_minutes)}
                                                </span>
                                            </div>
                                        </div>

                                            {/* Edit / Delete only — secondary actions move below */}
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                                onClick={() => {
                                                    setSelectedInterview(interview);
                                                    setEditInterviewDate(interview.interview_date || "");
                                                    setEditInterviewType(interview.interview_type || "");
                                                    setEditStage(interview.stage || "");
                                                    setEditMeetingUrl(interview.meeting_url || "");
                                                    setEditPrepNotes(interview.prep_notes || "");
                                                    setEditOutcome(interview.outcome || "Pending");
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                                onClick={() => deleteInterview(interview.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                        {/* Readiness */}
                                        <div className="mt-5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    Interview Readiness
                                                </p>
                                                <p
                                                    className={`text-sm font-semibold tabular-nums ${
                                                        readinessScore >= 80
                                                            ? "text-emerald-600"
                                                            : readinessScore >= 50
                                                            ? "text-amber-600"
                                                            : "text-slate-500"
                                                    }`}
                                                >
                                                    {readinessScore}%
                                                </p>
                                            </div>
                                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        readinessScore >= 80
                                                            ? "bg-emerald-500"
                                                            : readinessScore >= 50
                                                            ? "bg-amber-500"
                                                            : "bg-slate-300"
                                                    }`}
                                                    style={{ width: `${readinessScore}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Meeting + Prep notes */}
                                        {(interview.meeting_url || interview.prep_notes) && (
                                            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                                                {interview.meeting_url && (
                                                    <a
                                                        href={interview.meeting_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                                    >
                                                        Open meeting link
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth={2}
                                                            stroke="currentColor"
                                                            className="h-3.5 w-3.5"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                                                            />
                                                        </svg>
                                                    </a>
                                                )}

                                                {interview.prep_notes && (
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                            Prep notes
                                                        </p>
                                                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-700">
                                                            {interview.prep_notes}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {/* AI Prep section */}
                                        {(hasAiPrep || interview.prep_checklist?.length > 0) && (
                                            <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 p-4">
                                                <div className="flex items-center gap-2">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className="h-4 w-4 text-indigo-600"
                                                    >
                                                        <path d="M12 2l2.4 5.4L20 9.27l-4 3.9.94 5.48L12 16.5l-4.94 2.15L8 13.17 4 9.27l5.6-1.87L12 2z" />
                                                    </svg>
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                                                        AI Prep
                                                    </p>
                                                </div>

                                                {interview.ai_prep_summary && (
                                                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                                                        {interview.ai_prep_summary}
                                                    </p>
                                                )}

                                                {interview.ai_questions?.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs font-medium text-slate-600">Likely questions</p>
                                                        <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                                                            {interview.ai_questions.map((question, i) => (
                                                                <li key={i} className="flex gap-2">
                                                                    <span className="text-indigo-400">·</span>
                                                                    <span className="leading-relaxed">{question}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {interview.prep_checklist?.length > 0 && (
                                                    <div className="mt-4 border-t border-indigo-100 pt-3">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-medium text-slate-600">Checklist</p>
                                                            <p className="text-xs text-slate-500 tabular-nums">
                                                                {checklistCompleted} / {checklistTotal}
                                                            </p>
                                                        </div>
                                                        <div className="mt-2 space-y-1.5">
                                                            {interview.prep_checklist.map((item, i) => (
                                                                <label
                                                                    key={i}
                                                                    className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-white px-3 py-2 transition-colors hover:bg-slate-50"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.completed}
                                                                        onChange={() => toggleChecklistItem(interview.id, i)}
                                                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                                                                    />
                                                                    <span
                                                                        className={`text-sm leading-5 ${
                                                                            item.completed
                                                                                ? "text-slate-400 line-through"
                                                                                : "text-slate-700"
                                                                        }`}
                                                                    >
                                                                        {item.text}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}


                                        {/* AI action buttons — moved to footer */}
                                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                                            <button
                                                type="button"
                                                disabled={generatingInterviewPrepId === interview.id}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-blue-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={() => generateInterviewPrep(interview)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                                                    <path d="M12 2l2.4 5.4L20 9.27l-4 3.9.94 5.48L12 16.5l-4.94 2.15L8 13.17 4 9.27l5.6-1.87L12 2z" />
                                                </svg>
                                                {aiButtonLabel}
                                            </button>

                                            {hasAiPrep && (
                                                <button
                                                    type="button"
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                                    onClick={() => clearInterviewPrep(interview.id)}
                                                >
                                                    Clear AI Prep
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                disabled={generatingFollowUpId === interview.id}
                                                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={() => generateFollowUpEmail(interview)}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    strokeWidth={2}
                                                    stroke="currentColor"
                                                    className="h-3.5 w-3.5"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                                                    />
                                                </svg>
                                                {followUpLabel}
                                            </button>
                                        </div>


                                        
                                </div>
                                )
                            })
                        )}

                    </div>

            )}

            {interviewView === "timeline" && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {timelineInterviews.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">
                    No dated interviews to show on the timeline.
                  </p>
                ) : (
                  <div className="space-y-6">
                     {timelineInterviews.map((interview) => {
                      const interviewJob = jobs.find((job) => job.id === interview.job_id)

                      const timelineDotColor = interview.outcome === "Rejected" ? "bg-red-500" : interview.outcome === "Offer" ? "bg-green-500" : interview.stage ? "bg-violet-500" : "bg-blue-600";

                      return (
                          <div key={interview.id} className="relative border-1-2 border-slate-200 pl-5">
                            <div className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${timelineDotColor}`} />

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              { new Date(interview.interview_date!).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit"
                              })}
                            </p>

                            <h3 className="mt-1 font-semibold text-slate-900">
                              {interviewJob ? `${interviewJob.title} at ${interviewJob.company}` : "Job not found"}
                            </h3>

                            <div className="mt-2 flex flex-wrap gap-2">
                               <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                {interview.stage || "No stage"}
                               </span>

                               <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-slate-700">
                                {interview.outcome || "Pending"}
                               </span>
                               <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                                     {formatDuration(interview.duration_minutes)}
                               </span>
                               
                            </div>  
                          </div>
                      )
                     })}
                  </div>  
                )}
              </div>  

            )}

            {interviewView === "calendar" && (() => {
                const today = new Date();
                const monthLabel = calendarDate.toLocaleString("default", { month: "long", year: "numeric" });

                const stageStyles = (stage: string | null | undefined) => {
                    if (!stage) return "bg-slate-100 text-slate-700";
                    if (stage === "Final Round" || stage === "Offer Discussion")
                        return "bg-violet-50 text-violet-700";
                    if (stage.includes("Technical") || stage === "System Design")
                        return "bg-amber-50 text-amber-700";
                    if (stage === "Offer") return "bg-emerald-50 text-emerald-700";
                    return "bg-blue-50 text-blue-700";
                };

                return (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                                    aria-label="Previous month"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                                    aria-label="Next month"
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>
                            </div>

                            <h2 className="text-base font-semibold tracking-tight text-slate-800 sm:text-lg">
                                {monthLabel}
                            </h2>

                            <button
                                type="button"
                                onClick={() => setCalendarDate(new Date())}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            >
                                Today
                            </button>
                        </div>

                        {/* Weekday header */}
                        <div className="grid grid-cols-7 gap-1.5 border-b border-slate-100 pb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day}>{day}</div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="mt-2 grid grid-cols-7 gap-1.5">
                            {calendarDays.map((day, index) => {
                                const currentDate = day ? new Date(calendarYear, calendarMonth, day) : null;

                                const dayInterviews = currentDate
                                    ? filteredAndSortedInterviews.filter(
                                        (interview) =>
                                            interview.interview_date &&
                                            new Date(interview.interview_date).toDateString() === currentDate.toDateString()
                                    )
                                    : [];

                                const isToday = currentDate && currentDate.toDateString() === today.toDateString();
                                const isPast = currentDate && currentDate < today && !isToday;
                                const isWeekend = currentDate && (currentDate.getDay() === 0 || currentDate.getDay() === 6);

                                return (
                                    <div
                                        key={index}
                                        className={`min-h-28 rounded-xl border p-2 transition-colors ${
                                            !day
                                                ? "border-transparent bg-transparent"
                                                : isToday
                                                ? "border-blue-300 bg-blue-50/60"
                                                : isPast
                                                ? "border-slate-100 bg-slate-50/40"
                                                : isWeekend
                                                ? "border-slate-100 bg-slate-50/60"
                                                : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60"
                                        }`}
                                    >
                                        {day && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                                                            isToday
                                                                ? "bg-blue-600 text-white"
                                                                : isPast
                                                                ? "text-slate-400"
                                                                : "text-slate-700"
                                                        }`}
                                                    >
                                                        {day}
                                                    </span>

                                                    {dayInterviews.length > 0 && (
                                                        <span className="rounded-full bg-slate-200/70 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600">
                                                            {dayInterviews.length}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1.5 space-y-1">
                                                    {dayInterviews.slice(0, 3).map((interview) => {
                                                        const interviewJob = jobs.find((j) => j.id === interview.job_id);

                                                        const checklistCompleted = interview.prep_checklist?.filter((item) => item.completed).length || 0;
                                                        const checklistTotal = interview.prep_checklist?.length || 0;
                                                        const checklistScore = checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0;
                                                        const noteScore = interview.prep_notes ? 15 : 0;
                                                        const aiScore = interview.ai_prep_summary ? 15 : 0;
                                                        const readinessScore = Math.min(
                                                            100,
                                                            Math.round(checklistScore * 0.7 + noteScore + aiScore)
                                                        );

                                                        const startTime = interview.interview_date
                                                            ? new Date(interview.interview_date).toLocaleTimeString([], {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            })
                                                            : null;

                                                        return (
                                                            <div key={interview.id} className="group relative">
                                                                <button
                                                                    type="button"
                                                                    className={`block w-full rounded-md px-1.5 py-1 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-90 ${stageStyles(interview.stage)}`}
                                                                    onClick={() => {
                                                                        setSelectedInterview(interview);
                                                                        setEditInterviewDate(interview.interview_date || "");
                                                                        setEditInterviewType(interview.interview_type || "");
                                                                        setEditStage(interview.stage || "");
                                                                        setEditMeetingUrl(interview.meeting_url || "");
                                                                        setEditPrepNotes(interview.prep_notes || "");
                                                                        setEditOutcome(interview.outcome || "Pending");
                                                                    }}
                                                                >
                                                                    {startTime && (
                                                                        <span className="block truncate font-semibold tabular-nums">
                                                                            {startTime}
                                                                        </span>
                                                                    )}
                                                                    <span className="block truncate">
                                                                        {interviewJob?.company || "Interview"}
                                                                    </span>
                                                                </button>

                                                                {/* Hover tooltip */}
                                                                <div className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-lg group-hover:block">
                                                                    <p className="text-sm font-semibold text-slate-800">
                                                                        {interviewJob?.title || "Interview"}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-slate-500">
                                                                        {interviewJob?.company || "Unknown company"}
                                                                    </p>

                                                                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stage</p>
                                                                            <p className="mt-0.5 text-slate-700">{interview.stage || "—"}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Type</p>
                                                                            <p className="mt-0.5 text-slate-700">{interview.interview_type || "General"}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Duration</p>
                                                                            <p className="mt-0.5 text-slate-700">{formatDuration(interview.duration_minutes)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Readiness</p>
                                                                            <p
                                                                                className={`mt-0.5 font-semibold tabular-nums ${
                                                                                    readinessScore >= 80
                                                                                        ? "text-emerald-600"
                                                                                        : readinessScore >= 50
                                                                                        ? "text-amber-600"
                                                                                        : "text-slate-500"
                                                                                }`}
                                                                            >
                                                                                {readinessScore}%
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {interview.interview_date && (
                                                                        <p className="mt-3 text-[11px] text-slate-500 tabular-nums">
                                                                            {new Date(interview.interview_date).toLocaleString(undefined, {
                                                                                weekday: "long",
                                                                                month: "short",
                                                                                day: "numeric",
                                                                                hour: "numeric",
                                                                                minute: "2-digit",
                                                                            })}
                                                                        </p>
                                                                    )}

                                                                    {interview.prep_notes && (
                                                                        <div className="mt-3 border-t border-slate-100 pt-3">
                                                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                                                                Prep Notes
                                                                            </p>
                                                                            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                                                                                {interview.prep_notes}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {dayInterviews.length > 3 && (
                                                        <p className="pl-1 text-[10px] font-medium text-slate-500">
                                                            +{dayInterviews.length - 3} more
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Stage
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <span className="h-2 w-2 rounded-sm bg-blue-300" /> Early
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <span className="h-2 w-2 rounded-sm bg-amber-300" /> Technical
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <span className="h-2 w-2 rounded-sm bg-violet-300" /> Final / Offer
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-600">
                                <span className="h-2 w-2 rounded-sm bg-emerald-300" /> Offer
                            </span>
                        </div>
                    </div>
                );
            })()}



            

            {selectedInterview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setSelectedInterview(null)}>
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                
                        {/* Header */}
                        <div className="rounded-t-2xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-5 text-white">
                            <h3 className="text-xl font-semibold tracking-tight">Manage Interview</h3>
                            <p className="mt-1 text-sm text-blue-100">
                                Edit your interview details
                            </p>
                        </div>
                
                        <div className="grid gap-4 p-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Interview Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={editInterviewDate}
                                    onChange={(e) => setEditInterviewDate(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Interview Type
                                </label>
                                <select
                                    value={editInterviewType}
                                    onChange={(e) => setEditInterviewType(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select type:</option>
                                    <option value="Phone">Phone</option>
                                    <option value="Video">Video</option>
                                    <option value="Onsite">Onsite</option>
                                    <option value="Technical">Technical</option>
                                    <option value="Behavioral">Behavioral</option>
                                </select>
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Stage
                                </label>
                                <select
                                    value={editStage}
                                    onChange={(e) => setEditStage(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="">Select stage:</option>
                                    <option value="Phone Screen">Phone Screen</option>
                                    <option value="Recruiter Screen">Recruiter Screen</option>
                                    <option value="Technical Interview">Technical Interview</option>
                                    <option value="Behavioral Interview">Behavioral Interview</option>
                                    <option value="Final Round">Final Round</option>
                                    <option value="Offer Discussion">Offer Discussion</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">Interview Duration (mins)</label>
                                <select
                                       value={editDurationMinutes}
                                       onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
                                       className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={90}>1.5 hours</option>
                                </select>
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Meeting URL
                                </label>
                                <input
                                    type="text"
                                    value={editMeetingUrl}
                                    onChange={(e) => setEditMeetingUrl(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Outcome
                                </label>
                                <select
                                    value={editOutcome}
                                    onChange={(e) => setEditOutcome(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Passed">Passed</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="No Show">No Show</option>
                                    <option value="Rescheduled">Rescheduled</option>
                                </select>
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Prep Notes
                                </label>
                                <textarea
                                    value={editPrepNotes}
                                    onChange={(e) => setEditPrepNotes(e.target.value)}
                                    rows={5}
                                    className="min-h-[140px] w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                
                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                onClick={() => setSelectedInterview(null)}
                            >
                                Cancel
                            </button>
                
                            <button
                                type="button"
                                onClick={updateInterview}
                                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedFollowUpInterview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setSelectedFollowUpInterview(null)}>
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                
                        {/* Header */}
                        <div className="rounded-t-2xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-5 text-white">
                            <h3 className="text-xl font-semibold tracking-tight">Generated Follow-Up Email</h3>
                            <p className="mt-1 text-sm text-blue-100">
                                Review, copy, and customize before sending
                            </p>
                        </div>
                
                        <div className="space-y-4 p-6">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={editableFollowUpSubject}
                                    onChange={(e) => setEditableFollowUpSubject(e.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Body
                                </label>
                                <textarea
                                    value={editableFollowUpBody}
                                    onChange={(e) => setEditableFollowUpBody(e.target.value)}
                                    rows={12}
                                    className="max-h-[350px] w-full resize-none overflow-y-auto rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                
                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            `Subject: ${editableFollowUpSubject}\n\n${editableFollowUpBody}`
                                        );
                                    }}
                                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                >
                                    Copy
                                </button>
                
                                <button
                                    type="button"
                                    onClick={() => saveFollowUpEmail(selectedFollowUpInterview.id)}
                                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                                >
                                    Save Changes
                                </button>
                            </div>
                
                            <button
                                type="button"
                                onClick={() => setSelectedFollowUpInterview(null)}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>

            )}
        </div>
    )
}

export default InterviewsView;