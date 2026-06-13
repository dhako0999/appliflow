import { useState, useEffect } from "react";

import type { Article } from "../types/news";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL;

const newsCategories = [
    { label: "All", value: "all" },
    { label: "Job Market", value: "job-market" },
    { label: "Interview Prep", value: "interview-prep" },
    { label: "Resume Prep", value: "resume-prep" },
    { label: "Tech Careers", value: "tech-careers" },
    { label: "Salary", value: "salary" },
];


export default function NewsView() {

    const [newsArticles, setNewsArticles] = useState<Article[]>([]);
    const [loadingNewsArticles, setLoadingNewsArticles] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        fetchNewsArticles();
    }, [selectedCategory]);

    async function fetchNewsArticles() {

        setLoadingNewsArticles(true);

        try {

            const { 
                data: { session },
            } = await supabase.auth.getSession();

            const token = session?.access_token;

            if(!token) {
                console.error("User is not authorized");
                return;
            }

            const res = await fetch(`${API_URL}/news?category=${selectedCategory}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
            });

            const data = await res.json();

            if(!res.ok) {
                throw new Error(data.error || "Error fetching articles")
            }

            setNewsArticles(data.articles || []);

        } catch (error) {
            console.error("Error fetching news articles: ", error);

        } finally {
            setLoadingNewsArticles(false);
        }
    }


     

    return (
        <section className="mt-6 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <h1 className="text-3xl font-bold text-slate-900">
                    News & Resources
                </h1>

                <p className="mt-2 text-slate-600">
                    Stay updated with career advice, job market trends, and interview preparation resources.
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {newsCategories.map((category) => (
                        <button
                               key={category.value}
                               onClick={(e) => setSelectedCategory(category.value)}
                               className={`rounded-full px-4 py-2 text-sm font-medium transition ${selectedCategory === category.value ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                            {category.label}

                        </button>
                    ))}
                </div>

            </div>

            {loadingNewsArticles ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Loading new articles...
                    </p>

                </div>

            ) : newsArticles.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                       <p className="text-sm text-slate-500">
                           No new articles found...
                       </p>
                </div>

            ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {newsArticles.map((article) => (
                        <div
                            key={article.uuid}
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            {article.image_url && (
                                <img
                                    src={article.image_url}
                                    alt={article.title}
                                    className="mb-4 h-40 w-full rounded-xl object-cover"
                                    />
                            )}

                            <p className="text-xs font-smeibold uppercase tracking-wide text-blue-600">
                                {article.source}
                            </p>

                            <p className="mt-2 text-lg font-bold text-slae-900">
                                {article.title}
                            </p>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                                {article.description ||
                                    article.snippet ||
                                    "No description available."
                                }
                            </p>

                            <a 
                               href={article.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                               >Read Article →
                            </a>
                         </div>  
                    ))}
                </div>
            )}
        </section>

    )
}