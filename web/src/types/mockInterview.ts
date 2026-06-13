export type MockInterviewSession = {
    id: string;
    user_id: string;
    job_id: string | null;
    interview_type: string;
    status: string;
    created_at: string;
    completed_at: string | null;
}

export type MockInterviewQuestion = {
    id: string;
    session_id: string;
    user_id: string;
    question_text: string;
    question_type: string | null;
    created_at: string;
}


export type MockInterviewResponse = {
    id: string;
    question_id: string;
    user_id: string;
    video_path: string | null;
    transcript: string | null;
    ai_feedback: string | null;
    score: number | null;
    created_at: string;

}

export type MockInterviewFeedback = {
    score: number;
    strengths: string[];
    improvements: string[];
    suggestedAnswer: string;
    nextPracticeTip: string;
};


export type MockInterviewHistoryItem = {
    id: string;
    question_id: string;
    user_id: string;
    video_path: string | null;
    videoUrl: string | null;
    transcript: string | null;
    ai_feedback: string | null;
    score: number | null;
    created_at: string;
    mock_interview_questions: {
        id: string;
        session_id: string;
        question_text: string;
        question_type: string | null;
        mock_interview_sessions: {
            id: string;
            job_id: string | null;
            interview_type: string;
            status: string;
            created_at: string;
            jobs: {
                id: string;
                title: string;
                company: string;
            } | null;
        } | null;
    } | null;
};


