import { useState, useEffect } from "react";

import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

type Insights = {
    followUpJobsCount: number;
    recruitersToContactCount: number;
    upcomingInterviewsCount: number;
    activeOffersCount: number;
}

export default function CareerInsights() {
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<Insights | null>(null);

    useEffect(() => {
        async function fetchInsights() {
    
            try {

                const {
                    data: { session },
                } = await supabase.auth.getSession();

                const token = session?.access_token;

                //Alternative method
                //const result = await supabase.auth.getSession();
                //const session = result.data.session;

                if(!token) {
                    console.error("Unauthorized");
                    return;
                }

                const res = await fetch(`${API_URL}/ai/insights`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                const data = await res.json();

                if(!res.ok) {
                    throw new Error("Error fetching career insights: ", data.error);
                }    
                
                setInsights(data);

            } catch (error) {
                console.error("Error in fetching insights:", error);

            } finally {
                setLoading(false);
            }

        }

        fetchInsights();

    }, [])


    if(loading) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-600">Loading career insights...</p>

            </div>
        );
    }

    if(!insights) return null;

    const cards = [
        {
            title: "Applications needing follow-up",
            value: insights.followUpJobsCount,
            description: "Active applications older than 7 days",
        },
        {
            title: "Recruiters to contact",
            value: insights.recruitersToContactCount,
            description: "Recruiters that need to be contacted for follow-ups"
        },
        {
            title: "Upcoming interviews",
            value: insights.upcomingInterviewsCount,
            description: "Interview appointments that are coming up on the calendar"
        },
        {
            title: "Active Offers",
            value: insights.activeOffersCount,
            description: "Offers that will need a decision"
        },
    ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Career Insights</h2>
                <p className="text-sm text-slate-900">
                    AI-ready signals based on your current job search data
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div
                         key={card.title}
                         className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                        <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-800">
                            {card.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            {card.description}
                        </p>
                    </div>    
                ))}
            </div>

        </section>
    )


}