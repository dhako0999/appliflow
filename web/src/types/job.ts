export type Job = {
    id: string;
    title: string;
    company: string;
    status: string;
    created_at?: string;
    job_description?: string;
    resume_file_path?: string;
    cover_letter_file_path?: string;
    application_url?: string;
    deadline?: string;
    salary_range?: string;
    location?: string;
    interview_notes?: string;
    resume_match_score: number | null;
    resume_match_summary: number | null;
    resume_missing_skills: string[];
};