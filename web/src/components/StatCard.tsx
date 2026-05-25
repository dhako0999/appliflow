function StatCard({ label, value, }: { label: string; value: number; }) {
    return (
      <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-800 tabular-nums">
            {value.toLocaleString()}
          </p>
      </div>
    );
  }
  
  export default StatCard;