import type { Job } from "../types/job";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

import { useRef } from "react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_URL = import.meta.env.VITE_API_URL;

function ApplicationsView({ jobs, setJobs, session, }: { jobs: Job[], setJobs: React.Dispatch<React.SetStateAction<Job[]>>, session: Session | null }) {

    const [selectedJob, setSelectedJob] = useState<Job | null>(null);
    const [editJobDescription, setEditJobDescription] = useState("");
    const [editApplicationUrl, setEditApplicationUrl] = useState(""); 
    const [editInterviewNotes, setEditInterviewNotes] = useState("");
    const [editDeadline, setEditDeadline] = useState("");
    const [editSalaryRange, setEditSalaryRange] = useState("");
    const [editLocation, setEditLocation] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null);

    //View/Download variables for uploaded files
    const [resumeUrl, setResumeUrl] = useState("");
    const [coverLetterUrl, setCoverLetterUrl] = useState("");

    const jobDescriptionFileInputRef = useRef<HTMLInputElement | null>(null);

    const [resumeTextForMatch, setResumeTextForMatch] = useState("");
    const [matchingJobId, setMatchingJobId] = useState<string | null>(null);



    async function saveApplicationDetails(id: string) {

        if(!session) return;

        try {

            let resumePath = selectedJob?.resume_file_path || null;
            let coverLetterPath = selectedJob?.cover_letter_file_path || null;

            if(resumeFile && selectedJob) {
                resumePath = await uploadApplicationFile(
                    "resumes",
                    resumeFile,
                    session.user.id,
                    selectedJob.id
                );
            }


            if(coverLetterFile && selectedJob) {
                coverLetterPath = await uploadApplicationFile(
                    "cover-letters",
                    coverLetterFile,
                    session.user.id,
                    selectedJob.id
                )
            }

            const res = await fetch(`${API_URL}/jobs/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    job_description: editJobDescription,
                    application_url: editApplicationUrl,
                    interview_notes: editInterviewNotes,
                    deadline: editDeadline || null,
                    salary_range: editSalaryRange,
                    location: editLocation,
                    resume_file_path: resumePath,
                    cover_letter_file_path: coverLetterPath,
                }),
            });

            const updatedJob = await res.json();

            if(!res.ok) {
                console.error("Save application details error: ", updatedJob);
                return;
            }

            if(jobDescriptionFileInputRef.current) {
                jobDescriptionFileInputRef.current.value = "";
            }

            setJobs((prevJobs) =>
                prevJobs.map((job) => job.id === updatedJob.id ? updatedJob : job)
            );

            console.log("Resume path: ", updatedJob.resume_file_path);
            console.log("Cover letter path: ", updatedJob.cover_letter_file_path);

            
            if (updatedJob.resume_file_path) {
                const resumeSignedUrl = await createdSignedFileUrl(
                  "resumes",
                  updatedJob.resume_file_path
                );
              
                setResumeUrl(resumeSignedUrl);
              }
              
            if (updatedJob.cover_letter_file_path) {
                const coverLetterSignedUrl = await createdSignedFileUrl(
                "cover-letters",
                updatedJob.cover_letter_file_path
                );
            
                setCoverLetterUrl(coverLetterSignedUrl);
            }

            setSelectedJob(updatedJob);
            
            setResumeFile(null);
            setCoverLetterFile(null);

            



        } catch (error) {
            console.error("Error in saving application details", error);
        }

    }


    async function uploadApplicationFile(
        bucket: string,
        file: File,
        userId: string,
        jobId: string, 
    ) {
        const filePath = `${userId}/${jobId}/${Date.now()}-${file.name}`;

        console.log("Uploadind to: ", bucket);
        console.log("File path: ", filePath);
        console.log("User ID", userId);

        const { data } = await supabase.auth.getUser();
        console.log("Supabase storage auth user:", data.user?.id);

        const { error } = await supabase.storage.from(bucket).upload(filePath, file);

        /*, */

        if(error) throw error;

        return filePath;
    }


    async function createdSignedFileUrl(bucket: string, path: string) {
        console.log("Creating signed URL:");
        console.log("Bucket:", bucket);
        console.log("Path:", path);
      
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 10);
      
        console.log("Signed URL response:", data);
        console.log("Signed URL error:", error);
      
        if (error) throw error;
      
        return data.signedUrl;
      }

      async function removeApplicationFile(
        bucket: string,
        path: string,
        fieldName: "resume_file_path" | "cover_letter_file_path"
      ) {

        if(!session || !selectedJob) return;

        const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

        if (error) {
            console.error("Remove file error: ", error);
            return;
        }

        const res = await fetch(`${API_URL}/jobs/${selectedJob.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
                [fieldName]: null,
            }),
        });

        const updatedJob = await res.json();

        if(!res.ok) {
           console.error("Clear file path error: ", updatedJob);
           return;
        }

        setJobs((prevJobs) => (
            prevJobs.map((job) => 
                job.id === updatedJob.id ? updatedJob : job
            )
        ));

        setSelectedJob(updatedJob);

        if (fieldName === "resume_file_path") {
            setResumeUrl("");
            setResumeFile(null);
        }

        if (fieldName === "cover_letter_file_path") {
            setCoverLetterUrl("");
            setCoverLetterFile(null);
        }


      }

      async function handleJobDescriptionPdfUpload(
        e: React.ChangeEvent<HTMLInputElement>
      ) {

         const file = e.target.files?.[0];

         if(!file) return;

         if(file.type !== "application/pdf") {
            console.error("Please upload a PDF file");
            return;
         }

         try {

            const arrayBuffer = await file.arrayBuffer();

            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,

            }).promise;

            let extractedText = "";

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await pdf.getPage(pageNumber);
                const textContent = await page.getTextContent();

                const pageText = textContent.items.map((item: any) => item.str).join(" ");

                extractedText += pageText + "\n\n";
            }

            setEditJobDescription(extractedText.trim());


         } catch (error) {

            console.error("Error extracting PDF text:", error);

         }
      }

      async function handleResumeMatchPdfUpload(e: React.ChangeEvent<HTMLInputElement>) {

        const file = e.target.files?.[0];

        if(!file) return;

        if(file.type !== "application/pdf") {
            console.error("Please upload a PDF resume");
            return;
        }

        const arrayBuffer = await file.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        let extractedText = "";

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();

            const pageText = textContent.items.map((item: any) => item.str).join(" ");

            extractedText += pageText + "\n\n";
        }

        setResumeTextForMatch(extractedText.trim());


        
      }

      async function generateResumeMatch(jobId: string) {

        if(!session) return;

        setMatchingJobId(jobId);

        try {
            const res = await fetch(`${API_URL}/jobs/${jobId}/resume-match`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    resumeText: resumeTextForMatch,
                    jobDescription: editJobDescription,
                })
            });

            const data = await res.json();

            if(!res.ok) {
                console.error("Resume match failed: ", data);
                return;
            }

            setJobs((prevs) => prevs.map((job) => job.id === jobId ? data : job));

            setSelectedJob(data);
        } catch (error) {
            console.error("Resume match error: ", error);
        } finally {
            setMatchingJobId(null);
        }
      }


    return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Applications</h2>

            <div className="mt-4 space-y-3">
                {jobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <p className="text-base font-semibold text-slate-800">No applications yet</p>
                        <p className="mt-2 text-sm text-slate-500">
                            Add your first application from the dashboard to start tracking your progress.
                        </p>
                    </div>    
                ) : (
                   
                    jobs.map((job) => (
                        <div key={job.id} className="flex justify-between rounded-xl border border-slate-200 p-2">
                            <div>
                                <p className="font-semibold">{job.title}</p>
                                <p className="text-sm text-slate-500">{job.company}</p>
                                <p className="mt-2 text-sm">Status: {job.status}</p>
                            </div>
                            <div>
                                <button 
                                    onClick={async () => {
                                            setSelectedJob(job);
                                            setEditJobDescription(job.job_description || "");
                                            setEditApplicationUrl(job.application_url || "");
                                            setEditInterviewNotes(job.interview_notes || "");
                                            setEditDeadline(job.deadline || "");
                                            setEditSalaryRange(job.salary_range || "");
                                            setEditLocation(job.location || "");
                                            setResumeUrl("");
                                            setCoverLetterUrl("");
    
                                            if (job.resume_file_path) {
                                                const resumeSignedUrl = await createdSignedFileUrl(
                                                "resumes",
                                                job.resume_file_path
                                                );
                                            
                                                setResumeUrl(resumeSignedUrl);
                                            }
                                            
                                            if (job.cover_letter_file_path) {
                                                const coverLetterSignedUrl = await createdSignedFileUrl(
                                                "cover-letters",
                                                job.cover_letter_file_path
                                                );
                                            
                                                setCoverLetterUrl(coverLetterSignedUrl);
                                            }
    
                                    }}
    
                                    className="rounded-xl border border-slate-300 px-4 py-2 font-sm text-slate-700 hover:bg-slate-700 hover:text-white"
                                    >
                                        Manage Details
                                    </button>
                            </div>
                            
                        </div>  
                        
                        
                        
                    ))
                  
                )}
                
            </div>

            {selectedJob && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            
                    {/* Header */}
                    <div className="rounded-t-2xl bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-5 text-white">
                        <h3 className="text-xl font-semibold tracking-tight">
                            Manage application
                        </h3>
                        <p className="mt-1 text-sm text-blue-100">
                            {selectedJob.title} at {selectedJob.company}
                        </p>
                    </div>
            
                    <div className="max-h-[70vh] overflow-y-auto p-6">
                    <div className="grid gap-4">
                        {/* Application URL */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Application URL</label>
                            <input
                                type="text"
                                placeholder="https://..."
                                value={editApplicationUrl}
                                onChange={(e) => setEditApplicationUrl(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Job Description with Import from PDF */}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-700">Job Description</label>
                                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-blue-600 transition-colors hover:text-blue-700">
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
                                            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                                        />
                                    </svg>
                                    Import from PDF
                                    <input
                                        ref={jobDescriptionFileInputRef}
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleJobDescriptionPdfUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <textarea
                                placeholder="Paste the job description, or import from a PDF..."
                                value={editJobDescription}
                                onChange={(e) => setEditJobDescription(e.target.value)}
                                className="min-h-[140px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* AI Resume Match */}
                        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-blue-50/60 p-4">
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
                                    AI Resume Match
                                </p>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-600">
                                Upload a resume to compare it against this job description.
                            </p>

                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleResumeMatchPdfUpload}
                                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                            />

                            <button
                                type="button"
                                disabled={
                                    !resumeTextForMatch || !editJobDescription || matchingJobId === selectedJob?.id
                                }
                                onClick={() => generateResumeMatch(selectedJob!.id)}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-500/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:opacity-60"
                            >
                                {matchingJobId === selectedJob?.id ? (
                                    <>
                                        <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                        Analyzing...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                                            <path d="M12 2l2.4 5.4L20 9.27l-4 3.9.94 5.48L12 16.5l-4.94 2.15L8 13.17 4 9.27l5.6-1.87L12 2z" />
                                        </svg>
                                        Analyze Resume Match
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Resume Match Results */}
                        {selectedJob?.resume_match_score != null && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Resume Match
                                        </p>
                                        <p
                                            className={`mt-1 text-3xl font-bold tracking-tight tabular-nums ${
                                                selectedJob.resume_match_score >= 80
                                                    ? "text-emerald-600"
                                                    : selectedJob.resume_match_score >= 60
                                                    ? "text-amber-600"
                                                    : "text-rose-600"
                                            }`}
                                        >
                                            {selectedJob.resume_match_score}%
                                        </p>
                                    </div>
                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                            selectedJob.resume_match_score >= 80
                                                ? "bg-emerald-50 text-emerald-700"
                                                : selectedJob.resume_match_score >= 60
                                                ? "bg-amber-50 text-amber-700"
                                                : "bg-rose-50 text-rose-700"
                                        }`}
                                    >
                                        {selectedJob.resume_match_score >= 80
                                            ? "Strong Match"
                                            : selectedJob.resume_match_score >= 60
                                            ? "Moderate Match"
                                            : "Weak Match"}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            selectedJob.resume_match_score >= 80
                                                ? "bg-emerald-500"
                                                : selectedJob.resume_match_score >= 60
                                                ? "bg-amber-500"
                                                : "bg-rose-500"
                                        }`}
                                        style={{ width: `${selectedJob.resume_match_score}%` }}
                                    />
                                </div>

                                {selectedJob.resume_match_summary && (
                                    <p className="mt-4 text-sm leading-relaxed text-slate-700">
                                        {selectedJob.resume_match_summary}
                                    </p>
                                )}

                                {selectedJob.resume_missing_skills?.length > 0 && (
                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Missing Skills
                                        </p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {selectedJob.resume_missing_skills.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Interview Notes */}
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Interview Notes</label>
                            <textarea
                                placeholder="Notes from interviews or recruiter calls..."
                                value={editInterviewNotes}
                                onChange={(e) => setEditInterviewNotes(e.target.value)}
                                className="min-h-[120px] w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
            
                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <input
                                type="text"
                                placeholder="Location"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
            
                            <input
                                type="text"
                                placeholder="Salary range"
                                value={editSalaryRange}
                                onChange={(e) => setEditSalaryRange(e.target.value)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
            
                            <input
                                type="date"
                                value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
            
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="font-medium text-slate-800">Documents</p>
            
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="mb-2 text-sm font-medium text-slate-700">Resume</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                                    />
            
                                    <p className="mt-2 text-xs text-slate-500">
                                        {selectedJob.resume_file_path ? "Current resume uploaded" : "No resume uploaded"}
                                    </p>
            
                                    <div className="mt-2 flex items-center gap-4">
                                        {resumeUrl && (
                                            <a href={resumeUrl} target="_blank" rel="noreferrer"
                                                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                View / Download Resume
                                            </a>
                                        )}
            
                                        {selectedJob.resume_file_path && (
                                            <button
                                                onClick={() =>
                                                    removeApplicationFile(
                                                        "resumes",
                                                        selectedJob.resume_file_path!,
                                                        "resume_file_path"
                                                    )
                                                }
                                                className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
            
                                    {resumeUrl && selectedJob.resume_file_path?.toLowerCase().endsWith(".pdf") && (
                                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                                                Resume Preview
                                            </div>
                                            <iframe
                                                src={resumeUrl}
                                                title="Resume preview"
                                                className="h-96 w-full"
                                            />
                                        </div>
                                    )}
                                </div>
            
                                <div>
                                    <p className="mb-2 text-sm font-medium text-slate-700">Cover Letter</p>
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => setCoverLetterFile(e.target.files?.[0] || null)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                                    />
            
                                    <p className="mt-2 text-xs text-slate-500">
                                        {selectedJob.cover_letter_file_path ? "Current cover letter uploaded" : "No cover letter uploaded"}
                                    </p>
            
                                    <div className="mt-2 flex items-center gap-4">
                                        {coverLetterUrl && (
                                            <a href={coverLetterUrl} target="_blank" rel="noreferrer"
                                                className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                View / Download Cover Letter
                                            </a>
                                        )}
            
                                        {selectedJob.cover_letter_file_path && (
                                            <button
                                                onClick={() =>
                                                    removeApplicationFile(
                                                        "cover-letters",
                                                        selectedJob.cover_letter_file_path!,
                                                        "cover_letter_file_path"
                                                    )
                                                }
                                                className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
            
                                    {coverLetterUrl && selectedJob.cover_letter_file_path?.toLowerCase().endsWith(".pdf") && (
                                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                                                Cover Letter Preview
                                            </div>
                                            <iframe
                                                src={coverLetterUrl}
                                                title="Cover Letter Preview"
                                                className="h-96 w-full"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
            
                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                        <button
                            onClick={() => setSelectedJob(null)}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                        >
                            Cancel
                        </button>
            
                        <button
                            onClick={() => saveApplicationDetails(selectedJob.id)}
                            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                        >
                            Save Details
                        </button>
                    </div>
                </div>
            </div>

            )}
        </div>
    );
}


export default ApplicationsView;