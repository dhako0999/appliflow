import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import ReactMarkdown from "react-markdown";

import type { MockInterviewQuestion, MockInterviewHistoryItem, MockInterviewFeedback, MockInterviewSession } from "../types/mockInterview";


const API_URL = import.meta.env.VITE_API_URL;

type JobOption = {
  id: string;
  title: string;
  company: string;
  status: string;
  interview_notes: string | null;
}



export default function MockInterviewView() {

    const [question, setQuestion] = useState<MockInterviewQuestion | null>(null);
    const [feedback, setFeedback] = useState<MockInterviewFeedback | null>(null);
    const [loadingQuestion, setLoadingQuestion] = useState(false);

    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState("");

    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [loadingFeedback, setLoadingFeedback] = useState(false);

    const [jobs, setJobs] = useState<JobOption[]>([]);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [interviewType, setInterviewType] = useState("Technical Interview");

    const [history, setHistory] = useState<MockInterviewHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    
    const [completedSession, setCompletedSession] = useState<MockInterviewSession | null>(null);

    const [completedSummary, setCompletedSummary] = useState<{
      questionsAnswered: number;
      averageScore: string;
    } | null>(null);


    useEffect(() => {
      async function fetchJobs() {
        try {

          const {
            data: { session },
          } = await supabase.auth.getSession();

          const token = session?.access_token;

          if(!token) {
            console.log("User is not authorized");
            return;
          }

          const res = await fetch(`${API_URL}/jobs`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();

          if(!res.ok) {
            throw new Error(data.error || "Failed to fetch jobs");
          }

          setJobs(data);

        } catch (error) {
          console.error("Error fetching jobs:", error);
        }
      }

      fetchJobs();
    }, []);

    useEffect(() => {
      fetchMockInterviewHistory();
    }, []);


    async function generateQuestion() {
        
        setLoadingQuestion(true);
        setQuestion(null);
        setFeedback(null);
        setVideoUrl("");

        try {

            const {
                data: { session }
            } = await supabase.auth.getSession();

            const token = session?.access_token;

            if(!token) {
                console.log("User is unauthorized");
                return;
            }

            const res = await fetch(`${API_URL}/mock-interviews/question`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    interviewType,
                    jobId: selectedJobId || null,
                    sessionId: currentSessionId,

                }),
            });

            const data = await res.json();

            if(!res.ok) {
                throw new Error(data.error || "Error in fetching question");
            }

            console.log("Question route session:", data.session.id);
            console.log("Question row session:", data.question.session_id);

            setCurrentSessionId(data.session.id);
            setQuestion(data.question);
            

        } catch (error) {
            console.error("Error generating question: ", error);
        } finally {
            setLoadingQuestion(false);
        }
    }

    async function startRecording() {
        try {

            setVideoUrl("");
            setVideoBlob(null);
            setFeedback(null);
            recordedChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });

            if(videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }

            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if(event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const videoBlob = new Blob(recordedChunksRef.current, {
                    type: "video/webm",
                });

                setVideoBlob(videoBlob);

                const url = URL.createObjectURL(videoBlob);
                setVideoUrl(url);

                stream.getTracks().forEach((track) => track.stop());
                
                if(videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = null;
                }
            };

            mediaRecorder.start();
            setRecording(true);



        } catch (error) {
            console.error("Error starting recording: ", error);
        }
    }

    function stopRecording() {
        mediaRecorderRef.current?.stop();
        setRecording(false);

    }

    async function submitVideoForFeedback() {
      if (!videoBlob || !question) return;
    
      if (videoBlob.size > 50 * 1024 * 1024) {
        alert("Video exceeds the 50 MB limit.");
        return;
      }
    
      setLoadingFeedback(true);
      setFeedback(null);
    
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
    
        const token = session?.access_token;
    
        if (!token) {
          console.log("User is unauthorized");
          return;
        }
    
        const formData = new FormData();
        formData.append("questionId", question.id);
        formData.append("questionText", question.question_text);
        formData.append("interviewType", interviewType);
        formData.append("video", videoBlob, "mock-interview.webm");
    
        const res = await fetch(`${API_URL}/mock-interviews/submit-video`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
    
        const data = await res.json();
    
        if (!res.ok) {
          throw new Error(data.error || "Failed to analyze recording");
        }
    
        setFeedback(data.feedback);
        fetchMockInterviewHistory();
      } catch (error) {
        console.error("Error submitting video:", error);
      } finally {
        setLoadingFeedback(false);
      }
    }
    

    async function fetchMockInterviewHistory() {

      setLoadingHistory(true);

      try {


        const {
           data: { session } 
        } = await supabase.auth.getSession();

        const token = session?.access_token;

        if(!token) {
           console.error("User is not authorized");
           return;
        }

        const res = await fetch(`${API_URL}/mock-interviews/history`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
            
        });

        const data = await res.json();

        if(!res.ok) {
           throw new Error(data.error || "Failed to fetch mock interview history");
        }

        const historyData = Array.isArray(data.history) ? data.history : [];

        console.log("History data being saved:", historyData);
        
        setHistory(historyData);



      } catch (error) {
        console.error("Error in fetching mock interview history: ", error);
      } finally {
        setLoadingHistory(false);
      }
    }

    function parseFeedback(value: string | null): MockInterviewFeedback | null {
      if(!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return null;
      }

    }

    const averageScore = history.length > 0 ? (history.reduce((sum, item) => sum + (item.score ?? 0), 0) / (history.length)).toFixed(1) : "0.0";

    function startNewSession() {
      setCurrentSessionId(null);
      setQuestion(null);
      setFeedback(null);
      setVideoUrl("");
      setVideoBlob(null);
      setCurrentSessionId(null);
      setCompletedSession(null);
      setCompletedSummary(null);
    }

    async function completeInterviewSession() {
      if (!currentSessionId) return;
    
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
    
        const token = session?.access_token;
    
        if (!token) {
          console.error("User unauthorized");
          return;
        }
    
        const res = await fetch(
          `${API_URL}/mock-interviews/sessions/${currentSessionId}/complete`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
    
        const data = await res.json();
    
        if (!res.ok) {
          throw new Error(data.error || "Error completing session");
        }
    
        console.log("Completed session:", data.session.id);
        setCompletedSession(data.session);
        setCompletedSummary(data.summary);
    
        await fetchMockInterviewHistory();
      } catch (error) {
        console.error("Error completing session:", error);
      }
    }

    const totalQuestionsAnswered = history.length;

    const scoredHistory = history.filter((item) => item.score !== null);

    const overallAverageScore = scoredHistory.length > 0 ? (scoredHistory.reduce((sum, item) => sum + (item.score ?? 0), 0) / scoredHistory.length).toFixed(1) : "N/A";

    const bestScore = scoredHistory.length > 0 ? Math.max(...scoredHistory.map((item) => item.score ?? 0)) : "N/A";

    const uniqueSessionIds = new Set(history.map((item) => item.mock_interview_questions?.session_id).filter(Boolean));

    const totalSessions = uniqueSessionIds.size;

    return (
        <section className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">
              Mock Interviews
            </h1>
            <p className="mt-2 text-slate-600">
              Practice interview questions by recording yourself and reviewing your response.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Select Job:
                  </label>

                  <select
                        value={selectedJobId}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">General Interview</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.company} - {job.title}</option>
                    ))}

                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    Interview Type:
                  </label>

                  <select
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focs:ring-blue-500/20"
                  >
                    <option>Technical Interview</option>
                    <option>Behavioral Interview</option>
                    <option>System Design Interview</option>
                    <option>Recruiter Screen</option>
                    <option>Leadership Interview</option>

                  </select>
                </div>

              </div>

          </div>
          
    
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Buttons row */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateQuestion}
                  disabled={loadingQuestion || recording}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingQuestion
                    ? "Generating..."
                    : currentSessionId
                      ? "Next Question"
                      : "Generate Question"}
                </button>

                {currentSessionId && (
                  <>
                    <button
                      onClick={startNewSession}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Start New Session
                    </button>

                    <button
                      onClick={completeInterviewSession}
                      disabled={recording || loadingQuestion || loadingFeedback}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Complete Session
                    </button>
                  </>
                )}
              </div>

              {/* Summary section */}
              {completedSession && completedSummary && (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                  <h3 className="text-lg font-semibold text-emerald-900">
                    Session Completed
                  </h3>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Questions Answered
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-950">
                        {completedSummary?.questionsAnswered ?? 0}
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Average Score
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-950">
                        {completedSummary?.averageScore ?? "N/A"}/10
                      </p>
                    </div>

                    <div className="rounded-lg bg-white/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Completed
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-950">
                        {completedSession.completed_at
                          ? new Date(completedSession.completed_at).toLocaleDateString()
                          : "Just now"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            
            
           
    
            {question && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Interview Question
                </h2>

                <p className="mt-2 text-lg font-medium text-slate-900">
                  {question.question_text}
                </p>
              </div>
            )}
          </div>
    
          {question && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Record Your Answer
              </h2>
    
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full"
                />
              </div>
    
              <div className="mt-4 flex gap-3">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Stop Recording
                  </button>

                )}
              </div>
            </div>
          )}
    
          {videoUrl && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">
                Recorded Response
              </h2>
    
              <video
                src={videoUrl}
                controls
                className="mt-4 w-full rounded-2xl border border-slate-200"
              />

              <button
                 onClick={submitVideoForFeedback}
                 className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"

              >
                {loadingFeedback ? "Analyzing..." : "Analyze Recording"}
              </button>
    
              <p className="mt-3 text-sm text-slate-500">
                Next step: upload this recording to Supabase Storage, then generate a transcript and AI feedback.
              </p>
            </div>
          )}
    
          {feedback && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">AI Feedback</h2>
                  <p className="text-sm text-slate-500">
                    Strucuted coaching based on your transcript.
                  </p>
                </div>

                <div className="rounded-full border border-slate-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                  Score: {feedback.score} / 10
                </div>
              </div>    

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-800">Strengths</h3>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-emerald-900">
                    {feedback.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-semibold text-amber-800">Areas to Improve</h3>
                  <ul className="mt-3 list-disc space-y-3 pl-5 text-sm text-amber-900">
                      {feedback.improvements.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                  </ul>
                </div>


                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">Suggested Better Answer</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {feedback.suggestedAnswer}
                  </p>

                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-indigo-50 p-4">
                   <h3 className="font-semibold text-indigo-800">Next Practice Tip</h3>
                   <p className="mt-2 text-sm leading-6 text-slate-900">
                      {feedback.nextPracticeTip}
                   </p>
                </div>

                <button
                       onClick={generateQuestion}
                       disabled={loadingQuestion || recording}
                       className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {loadingQuestion ? "Generating..." : "Next Question" }

                </button>


              </div>

            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Total Sessions</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {totalSessions}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Average Score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {overallAverageScore === "N/A" ? "N/A" : `${overallAverageScore}/10`}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Questions Answered</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                 {totalQuestionsAnswered}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
               <p className="text-sm font-medium text-slate-500">Best Score</p>
               <p className="mt-2 text-3xl font-semibold text-slate-900">
                {bestScore}
               </p>
            </div>



          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Mock Interview History
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Review previous interview attempts, recordings, transcripts, and AI
                  coaching feedback.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Attempts
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {history.length}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Avg Score
                  </p>
                  <p className="text-lg font-bold text-blue-700">
                    {averageScore}/10
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {/* history list goes here */}
              {loadingHistory ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-slate-500">No mock interview responses yet.</p>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => {
                    const question = item.mock_interview_questions;
                    const session = question?.mock_interview_sessions;
                    const job = session?.jobs;

                    const isExpanded = expandedHistoryId === item.id;

                    const parsedFeedback = parseFeedback(item.ai_feedback);

                    console.log(typeof item.ai_feedback);
                    console.log(item.ai_feedback);

                    return (
                      <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        {/*Header*/}
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                              <p className="font-semibold text-slate-900">
                                {job ? `${job.company} - ${job.title}` : "General Interview"}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {session?.interview_type ?? question?.question_type ?? "Interview"}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                          </div>  

                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-slate-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                                  Score: {item.score ?? "N/A"}/10
                            </span>

                            <button
                              onClick={() =>
                                setExpandedHistoryId(
                                  isExpanded ? null : item.id
                                )
                              }
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              {isExpanded
                                ? "Hide Details"
                                : "View Details"}
                            </button>
                          </div>  
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="mt-5 space-y-5 border-t border-slate-200 pt-5">
                            {/* Question */}
                            <div>
                              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                Question
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-slate-800">
                                {question?.question_text}
                              </p>
                            </div>

                            {/* Video */}
                            {item.videoUrl && (
                              <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                  Recording
                                </h3>

                                <video
                                  src={item.videoUrl}
                                  controls
                                  className="mt-2 aspect-video w-full rounded-xl border border-slate-200 bg-black"
                                />
                              </div>
                            )}

                            {/* Transcript */}
                            {item.transcript && (
                              <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                  Transcript
                                </h3>

                                <p className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                                  {item.transcript}
                                </p>
                              </div>
                            )}

                            {/* AI Feedback */}
                            {item.ai_feedback && (
                              <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                  AI Feedback
                                </h3>

                                {parsedFeedback ? (
                                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-semibold text-slate-900">
                                        Interview Evaluation
                                      </h4>

                                      <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                                        {parsedFeedback.score}/10
                                      </span>
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                                      {/* Strengths */}
                                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                        <h5 className="font-semibold text-emerald-800">
                                          Strengths
                                        </h5>

                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                                          {parsedFeedback.strengths.map((strength, index) => (
                                            <li key={index}>{strength}</li>
                                          ))}
                                        </ul>
                                      </div>

                                      {/* Improvements */}
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                                        <h5 className="font-semibold text-amber-800">
                                          Areas to Improve
                                        </h5>

                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                                          {parsedFeedback.improvements.map(
                                            (improvement, index) => (
                                              <li key={index}>{improvement}</li>
                                            )
                                          )}
                                        </ul>
                                      </div>
                                    </div>

                                    {/* Suggested Answer */}
                                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                                      <h5 className="font-semibold text-slate-900">
                                        Suggested Better Answer
                                      </h5>

                                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                        {parsedFeedback.suggestedAnswer}
                                      </p>
                                    </div>

                                    {/* Practice Tip */}
                                    <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                                      <h5 className="font-semibold text-indigo-800">
                                        Next Practice Tip
                                      </h5>

                                      <p className="mt-2 text-sm leading-6 text-indigo-900">
                                        {parsedFeedback.nextPracticeTip}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="prose prose-sm max-w-none prose-slate">
                                      <ReactMarkdown>
                                        {item.ai_feedback}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}


                      </div>  

                    )
                  })}
                </div>  
              )}
            </div>
          </div>
        </section>
      );
    
}