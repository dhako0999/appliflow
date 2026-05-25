export type Interview = {
    id: string;
    user_id: string;
    job_id: string;
    interview_date?: string;
    interview_type?: string;
    stage?: string;
    meeting_url?: string;
    prep_notes?: string;
    outcome?: string;
    created_at?: string;
    prep_checklist: {
        text: string;
        completed: boolean;
    }[];
    ai_prep_summary: string | null;
    ai_questions: string[];
    follow_up_email_subject: string | null;
    follow_up_email_body: string | null;
    recruiter_id: string | null;
    duration_minutes: number | null;
};