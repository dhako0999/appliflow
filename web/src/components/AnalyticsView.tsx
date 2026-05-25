import { ResponsiveContainer, CartesianGrid, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, } from "recharts";


type Job = {
    id: string;
    title: string;
    company: string;
    status: string;
    created_at?: string;
}

function AnalyticsView({ jobs, statusCounts, applicationsOverTime, range, setRange, }: { jobs: Job[]; statusCounts: { status: string; count: number; }[]; applicationsOverTime: { date: string; count: number; }[]; range: string; setRange: React.Dispatch<React.SetStateAction<string>>; }) {

    const filteredJobs = jobs.filter((job) => {
        if (range === "all") return true;
        if (!job.created_at) return false;

        const days = Number(range);
        const createdTime = new Date(job.created_at).getTime();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

        return createdTime >= cutoff;
    });

    const hasAnalyticsData = filteredJobs.length > 0;

    const recentJobs = [...filteredJobs].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;

        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

        return bTime - aTime;
    }).slice(0, 5);

    const total = filteredJobs.length;

    const interviewRate = total ? Math.round((filteredJobs.filter((job) => job.status === "Interview").length / total) * 100) : 0;

    const offerRate = total ? Math.round((filteredJobs.filter((job) => job.status === "Offer").length / total) * 100) : 0;

    const rejectionRate = total ? Math.round((filteredJobs.filter((job) => job.status === "Rejected").length / total) * 100) : 0;

    const chartData = [
        {
            status: "Applied",
            count: statusCounts.find((item) => item.status === "Applied")?.count || 0,
        },
        {
            status: "Interview",
            count: statusCounts.find((item) => item.status === "Interview")?.count || 0,
        },
        {
            status: "Offer",
            count: statusCounts.find((item) => item.status === "Offer")?.count || 0,
        },
        {
            status: "Rejected",
            count: statusCounts.find((item) => item.status === "Rejected")?.count || 0,
        },
    ];

   /* const chartData = [
        {
            status: "Applied",
            count: filteredJobs.filter((job) => job.status === "Applied").length,
        },
        {
            status: "Interview",
            count: filteredJobs.filter((job) => job.status === "Interview").length,
        },
        {
            status: "Offer",
            count: filteredJobs.filter((job) => job.status === "Offer").length,
        },
        {
            status: "Rejected",
            count: filteredJobs.filter((job) => job.status === "Rejected").length,
        },
    ];*/

    /*const applicationsOverTime = jobs.reduce((acc: {date: string, count: number}[], job) => {

        if(!job.created_at) return acc;

        const date = new Date(job.created_at).toLocaleDateString();

        const existingDate = acc.find((item) => item.date === date);

        if(existingDate) {
            existingDate.count += 1;
        } else {
            acc.push({ date, count: 1});
        }

        return acc;

    }, []);

    applicationsOverTime.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );*/

    /*const applicationsOverTime = Object.values(
        filteredJobs.reduce(( acc: Record<string, { date: string; count: number; timestamp: number; }>, job) => {
               
                if(!job.created_at) return acc;

                const dateObj = new Date(job.created_at);

                const dateKey = dateObj.toISOString().split("T")[0];

                if(!acc[dateKey]) {
                    acc[dateKey] = {
                        date: dateKey,
                        count: 0,
                        timestamp: dateObj.getTime(),
                    };
                } 

                acc[dateKey].count += 1;

                return acc;
            },
            {}
        )
    ).sort((a, b) => a.timestamp - b.timestamp);*/


    return (
        <>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="h-4 w-4"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 19v-6m4 6V5m4 14v-9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight text-slate-800">Analytics</h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Review your job search performance.
                            </p>
                        </div>
                    </div>

                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="all">All time</option>
                    </select>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {/* Interview Rate */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Interview Rate
                            </p>
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800 tabular-nums">
                            {interviewRate}%
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, interviewRate)}%` }}
                            />
                        </div>
                    </div>

                    {/* Offer Rate */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Offer Rate
                            </p>
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                        </div>
                        <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 tabular-nums">
                            {offerRate}%
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${Math.min(100, offerRate)}%` }}
                            />
                        </div>
                    </div>

                    {/* Rejection Rate */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Rejection Rate
                            </p>
                            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-600">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-700 tabular-nums">
                            {rejectionRate}%
                        </p>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full bg-slate-400 transition-all duration-300"
                                style={{ width: `${Math.min(100, rejectionRate)}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {!hasAnalyticsData && (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                        <svg
                            xmlns="http://www.w3.ord/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="h-6 w-6"
                        >
                            <path
                                 strokeLinecap="round"
                                 strokeLinejoin="round"
                                 d="M9 19v-6m4 6V5m4 14v-9M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                        </svg>
                    </div>
                    <p className="mt-4 text-sm font-medium text-slate-700">No analytics data yet.</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Add applications or choose a wider date range to see analytics.
                    </p>

                </div>
            )}

            {hasAnalyticsData && (
                <>
                   <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                       <div>
                           <h3 className="text-base font-semibold tracking-tight text-slate-800">
                                Applications by Status
                           </h3>

                           <p className="mt-0.5 text-sm text-slate-500">
                                Breakdown of where your applications stand.
                           </p>

                       </div>

                       <div className="mt-6 h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0}}>
                                <defs>
                                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#6366f1" />

                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                     dataKey="status"
                                     tick={{ fill: "#64748B", fontSize: 12 }}
                                     axisLine={{ stroke: "#e2e8f0" }}
                                     tickLine={false}
                                />
                                <YAxis
                                     allowDecimals={false}
                                     tick={{ fill: "#64748B", fontSize: 12 }}     
                                     axisLine={false}
                                     tickLine={false}
                                />

                                <Tooltip
                                     cursor={{ fill: "#F1F5F9" }}
                                     contentStyle={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "0.75rem",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                                        fontSize: "12px",
                                     }}
                                     labelStyle={{ color: "#334155", fontWeight: 600 }}
                                />
                                <Bar dataKey="count" fill="url(#barFill)" radius={[8, 8, 0, 0]} />

                                

                            </BarChart>
                          </ResponsiveContainer>
                       </div>

                   </div>

                   <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                       <div>
                            <h3 className="text-base font-semibold tracking-tight text-slate-800">
                                Applications Over Time
                            </h3>

                            <p className="mt-0.5 text-sm text-slate-500">
                                Daily volume across the selected range.
                            </p>
  
                       </div>

                       <div className="mt-6 h-72">
                       <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={applicationsOverTime} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: "#64748b", fontSize: 12 }}
                                    axisLine={{ stroke: "#e2e8f0" }}
                                    tickLine={false}
                                    tickFormatter={(value) =>
                                        new Date(value).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }
                                    minTickGap={24}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fill: "#64748b", fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                                    contentStyle={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "0.75rem",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                                        fontSize: "12px",
                                    }}
                                    labelStyle={{ color: "#334155", fontWeight: 600 }}
                                    labelFormatter={(value) =>
                                        new Date(value).toLocaleDateString(undefined, {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                                    activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>

                        
                       </div>

                       {/* Recent Activity */}
                       <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div>
                                <h3 className="text-base font-semibold tracking-tight text-slate-800">
                                    Recent Activity
                                </h3>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Your latest applications.
                                </p>
                            </div>

                            <div className="mt-5 space-y-2">
                                {recentJobs.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                                         <p className="text-sm text-slate-500">No recent activity to show.</p>
                                    </div>

                                ) : (
                                    recentJobs.map((job) => {

                                        const initials = (job.company || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

                                        return (
                                            <div
                                                key={job.id}
                                                className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            {job.title}
                                                        </p>
                                                        <p className="truncate text-xs text-slate-500">
                                                            {job.company}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-3">
                                                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                                        {job.status}
                                                    </span>
                                                    <p className="hidden text-xs text-slate-500 tabular-nums sm:block">
                                                        {job.created_at
                                                            ? new Date(job.created_at).toLocaleDateString(undefined, {
                                                                month: "short",
                                                                day: "numeric",
                                                            })
                                                            : "Unknown"}
                                                    </p>
                                                </div>
                                            </div>  

                                        )
                                    })

                                )}
                            </div>
                        </div>    

                       

                   </div>
                </>
            )}

            

            
        </>
        
    );
}



export default AnalyticsView;