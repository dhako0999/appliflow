import { useState } from "react";

import { supabase } from "../lib/supabase";

import CareerInsights from "./CareerInsights";


import ReactMarkdown from "react-markdown";


const API_URL = import.meta.env.VITE_API_URL;

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
}

export default function AIChatbotView() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hi! I can help you review your job search, prepare for interviews, and decide what to focus on next.",
        },
    ]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    const suggestedPrompts = [
        "What should I focus on today?",
        "Summarize my job search pipeline.",
        "Which recruiters should I contact?",
        "What applications should I prepare for?",
        "Which interviews should I prepare for?",
        "How am I doing overall?",
    ];

    async function handleSuggestedPrompt(prompt: string) {
        try {

            if(loading) return;

            setInput("");
            await handleSendMessage(prompt);

        } catch (error) {
            console.log("Error in inputting suggested prompt: ", error);
        }
    }

  

    async function handleSendMessage(promptText?: string) {

        const messageText = input.trim() || (promptText?.trim() ?? "");
        
        if(!messageText || loading) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: messageText,

        }

        setMessages((prevs) => [...prevs, userMessage]);
        setInput("");
        setLoading(true);

        try {

            /*const assistantMessage: ChatMessage = {
                role: "assistant",
                content: "Backend connection coming next."
            }

            setMessages((prevs) => [...prevs, assistantMessage]);*/

            const {
                data: { session }
            } = await supabase.auth.getSession();

            const token = session?.access_token;

            if(!token) {
                setMessages((prevs) => [
                    ...prevs,
                    {
                        role: "assistant",
                        content: "You must be logged in to use the AI chatbot.",
                    },
                ]);
                return;
            }

            const res = await fetch(`${API_URL}/ai/chat`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: messageText,
                    messages,
                }),
            });

            const data = await res.json();


            if(!res.ok) {
                console.error("Error in inserting chat message: ", data);
                return;
            }

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.reply,
            }

            setMessages((prevs) => [...prevs, assistantMessage]);

        } catch (error) {
            console.error("Error sending chat message", error);
            
            setMessages((prevs) => [...prevs, 
                {
                    role: "assistant",
                    content: "Sorry, something went wrong. Please try again.",
                },
            ]);

        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="mt-6 space-y-6">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">AI ChatBot</h1>
                    <p className="mt-2 text-slate-600">
                        Ask questions about your applications, recruiters, itnerviews, and job search strategy.
                    </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => handleSuggestedPrompt(prompt)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                        {prompt}
                        </button>

                    ))}
                </div>
            </div>

            <CareerInsights/>

            <div className="flex h-[70vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    {messages.map((message, index) => (
                        <div
                        key={index}
                        className={`flex ${
                            message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                        >
                           <div
                            className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-6 ${
                                message.role === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-800"
                            }`}
                            >
                                {message.role === "assistant" ? (
                                    <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    message.content
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t border-slate-200 p-4">
                    <div className="flex gap-3">
                        <input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={(e) => {
                                if(e.key === "Enter") {
                                    handleSendMessage();
                                }
                              }}
                              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="Enter a message..."

                        />

                        <button
                              onClick={() => handleSendMessage()}
                              disabled={loading || !input.trim()}
                              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? "Thinking...": "Send"}
                        </button>
                    </div>
                </div>

            </div>

        </section>
    )


}