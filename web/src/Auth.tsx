import { useState } from "react";
import { supabase } from "./lib/supabase";

type AuthProps = {
    onAuthSuccess: () => void;
};


export default function Auth({ onAuthSuccess }: AuthProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

    async function signUp() {

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                },
            },
        });

        if(error) {
            alert(error.message);
            return;
        }

        alert("Account created. Check your email if confirmation is enabled.");
        onAuthSuccess();
    }

    async function signIn() {
        const { error } = await supabase.auth.signInWithPassword({
             email,
             password,
        });

        if(error) {
            alert(error.message);
            return;
        }

        onAuthSuccess();
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/40 p-4">
            <div className="w-full max-w-md">
                {/* Brand */}
                <div className="mb-6 flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white shadow-lg shadow-blue-500/25">
                        AI
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-600">AppliFlow</p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
                            {authMode === "signin" ? "Welcome back" : "Create your account"}
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            {authMode === "signin"
                                ? "Sign in to continue your job search."
                                : "Start tracking your applications in minutes."}
                        </p>
                    </div>

                    <div className="mt-6 space-y-3">
                        {authMode === "signup" && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        First name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Jane"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Last name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Doe"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                            <input
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                            <input
                                type="password"
                                autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <button
                        onClick={authMode === "signin" ? signIn : signUp}
                        className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-opacity hover:opacity-90"
                    >
                        {authMode === "signin" ? "Sign in" : "Create account"}
                    </button>

                    <div className="mt-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                        type="button"
                        onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                        className="mt-5 w-full text-center text-sm text-slate-600 transition-colors hover:text-slate-900"
                    >
                        {authMode === "signin" ? (
                            <>
                                Don't have an account?{" "}
                                <span className="font-semibold text-blue-600 hover:text-blue-700">Sign up</span>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <span className="font-semibold text-blue-600 hover:text-blue-700">Sign in</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-500">
                    By {authMode === "signin" ? "signing in" : "creating an account"}, you agree to our terms and privacy policy.
                </p>
            </div>
        </div>
    );
}