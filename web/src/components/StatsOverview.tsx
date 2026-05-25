import StatCard from "./StatCard";

function StatsOverview({ stats }: { stats: {
    total: number; 
    applied: number; 
    interviews: number; 
    offers: number;
}}) {
    return (
        <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Total Jobs" value={stats.total} />
            <StatCard label="Applied" value={stats.applied} />
            <StatCard label="Interviews" value={stats.interviews} />
            <StatCard label="Offers" value={stats.offers} />
        </div>
    )
}

export default StatsOverview;