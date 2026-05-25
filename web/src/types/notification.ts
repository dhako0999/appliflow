export type AppNotification = {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    related_recruiter_id: string | null;
    related_interview_id: string | null;
    is_read: boolean;
    created_at: string;
}