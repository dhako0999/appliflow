return (
    <div
        key={interview.id}
        className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Interview
          </p>

          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            {interviewJob
              ? `${interviewJob.title} at ${interviewJob.company}`
              : "Job not found"}
          </h3>

          {interviewRecruiter && (
            <p className="mt-1 text-sm text-slate-500">
                Recruiter: {interviewRecruiter.name}
            </p>
          )}

          <p className="mt-1 text-sm text-slate-500">
            {interview.interview_date
              ? new Date(interview.interview_date).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "No date set"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
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
            className="rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
            onClick={() => deleteInterview(interview.id)}
          >
            Delete
          </button>

          <button
            type="button"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700"
            onClick={() => generateInterviewPrep(interview)}
            >
              {generatingInterviewPrepId === interview.id ? "Generating..." : interview.ai_prep_summary || interview.ai_questions?.length > 0 ? "Regenerate AI Prep" : "Generate AI Prep"}

            </button>

          {(interview.ai_prep_summary && interview.ai_questions?.length > 0) && (
            <button 
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={() => clearInterviewPrep(interview.id)}
                  >
                    Clear AI Prep
            </button>
          )}

          <button
              type="button"
              disabled={generatingFollowUpId === interview.id}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => generateFollowUpEmail(interview)}
          >
            {generatingFollowUpId === interview.id ? "Generating..." : interview.follow_up_email_body ? "Regenerate Follow-Up" : "Generate Follow-Up"}

          </button>


        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {interview.stage || "No stage"}
        </span>

        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          {interview.interview_type || "General"}
        </span>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {interview.outcome || "Pending"}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Interview Readiness
          </p>  

          <p className="text-sm font-semibold text-slate-700">
            {readinessScore}%
          </p>
        </div>  

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
              className={`h-full rounded-full transition-all ${readinessScore >= 80 ? "bg-emerald-500" : readinessScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              style={{width: `${readinessScore}%`}}
          >
          </div>
        </div>
      </div>  

      {(interview.meeting_url || interview.prep_notes) && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          {interview.meeting_url && (
            <a
              href={interview.meeting_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Open meeting link
            </a>
          )}

          {interview.prep_notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Prep notes
              </p>

              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">
                {interview.prep_notes}
              </p>
            </div>
          )}

          {(interview.ai_prep_summary || interview.ai_questions?.length > 0 || interview.prep_checklist?.length > 0) && (
              <div className="mt-4 rounded-xl bg-indigo-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      AI Prep
                  </p>

                  {interview.ai_prep_summary && (
                      <p className="mt-2 text-sm text-slate-700">
                          {interview.ai_prep_summary}
                      </p>
                  )}


                  {interview.ai_questions?.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
                          {interview.ai_questions.map((question, index) => (
                              <li key={index}>{question}</li>
                          ))}

                      </ul>
                  )}

                  {interview.prep_checklist?.length > 0 && (
                    <div className="mt-4 border-t border-indigo-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Preparation checklist
                      </p>

                      <div className="mt-2 space-y-2">
                        {interview.prep_checklist.map((item, index) => (
                            <label
                                key={index}
                                className="flex items-start gap-3 rounded-xl bg-white p-3"
                                >
                                  <input
                                      type="checkbox"
                                      checked={item.completed}
                                      onChange={() => toggleChecklistItem(interview.id, index)}
                                      className="mt-0.5 h-4 w-4"
                                      />

                                  <span
                                      className={`text-sm leading-5 ${
                                          item.completed 
                                          ? "text-slate-400 line-through"
                                          : "text-slate-700"
                                      }`} >
                                        {item.text}
                                  </span>    

                            </label>
                        ))}
                      </div>
                    </div>  
                  )}
              </div>    
          )}

          
        </div>
      )}
    </div>
  );

  {interviewView === "calendar" && (
    <div className="mt-4 rounded-x2l border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
            <button
                 type="button"
                 onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}
                 className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                Previous
            </button>

            <h2 className="text-lg font-semibold text-slate-900">
                {calendarDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                })}
            </h2>

            <button
                type="button"
                onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                Next
            </button>
        </div>    

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
            ))}
        </div>   

        <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
                const currentDate = day ? new Date(calendarYear, calendarMonth, day) : null;

                const dayInterviews = currentDate ? filteredAndSortedInterviews.filter(
                    (interview) => interview.interview_date && new Date(interview.interview_date).toDateString() === currentDate.toDateString()
                ) : [];


                const isToday = currentDate && currentDate.toDateString() === new Date().toDateString();
                
                return (
                    <div
                      key={index}
                      className={`min-h-32 rounded-xl border p-2 ${isToday ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                    >
                      {day && (
                        <>
                          <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-700">
                                    {day}
                                </p>

                                {dayInterviews.length > 0 && (
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{dayInterviews.length}</span>
                                )}

                          </div>
                          
          
                          <div className="mt-2 space-y-1">
                            {dayInterviews.map((interview) => {
                              const interviewJob = jobs.find(
                                (job) => job.id === interview.job_id
                              );

                              const checklistCompleted = interview.prep_checklist?.filter((item) => item.completed).length || 0;

                              const checklistTotal = interview.prep_checklist?.length || 0;

                              const checklistScore = checklistTotal > 0 ? Math.round(checklistCompleted / checklistTotal) * 100 : 0;

                              const noteScore = interview.prep_notes ? 15 : 0;

                              const aiScore = interview.ai_prep_summary ? 15 : 0;

                              const readinessScore = Math.round((checklistScore * 0.70) + noteScore + aiScore);

          
                              return (
                                <div key={interview.id} className="group relative">
                                    <button
                                        type="button"
                                        className={`block w-full rounded-lg px-2 py-1 text-left text-xs font-medium 
                                            ${interview.stage === "Final Round" ? "bg-purple-50 text-purple-700" : 
                                                interview.stage === "Technical" ? "bg-amber-50 text-amber-700" : 
                                                interview.stage === "Offer" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}
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
                                        <span className="block truncate">
                                            {interviewJob?.company || "Interview"} - {readinessScore}%
                                        </span>
                                        <span className="block truncate text-[11px] text-blue-500">
                                            {formatDuration(interview.duration_minutes)}
                                        </span>
                                        <span className="block truncate text-[11px] text-blue-500">
                                            {interview.stage || "No stage"}
                                        </span>
                                    </button>

                                    <div className="pointer-events-none absolute top-full left-0 z-50 mt-2 hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 group-hover:block">
                                        <p className="text-sm font-medium font-semibold text-slate-900">
                                             {interviewJob.title || "Interview"}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {interviewJob?.company}
                                        </p>

                                        <div className="mt-3 space-y-1 text-xs text-slate-600">

                                            <p>
                                                <span className="font-medium text-slate-700">Stage:</span>{" "}{interview.stage || "No stage"}
                                            </p>
                                            <p>
                                                <span className="font-medium text-slate-700">Type:</span>{" "}{interview.interview_type || "General"}
                                            </p>
                                            <p>
                                                <span className="font-medium text-slate-700">Duration:</span>{" "}{formatDuration(interview.duration_minutes)}
                                            </p>
                                            <p>
                                                <span className="font-medium text-slate-700">Readines:</span>{" "}{readinessScore}%
                                            </p>

                                            {interview.interview_date && (
                                                <p>
                                                    <span className="font-medium text-slate-700">Date:</span>{" "}{new Date(interview.interview_date).toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        {interview.prep_notes && (
                                            <div className="mt-3 border-t border-slate-100 pt-3">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                    Prep Notes
                                                </p>

                                                <p className="mt-1 line-clamp-4 text-xs text-slate-600">
                                                    {interview.prep_notes}
                                                </p>
                                            </div>    

                                        )}
                                    </div>
                                </div>    
                                
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
            })}
        </div>
    </div>    
)}