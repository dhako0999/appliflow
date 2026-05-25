import { useState, useEffect } from "react";

type Job = {
  id: string;
  title: string;
  company: string;
  status: string;
};

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetch("http://localhost:3001/jobs")
    .then((res) => res.json())
    .then((data) => setJobs(data))
    .catch((err) => console.error("Error fetching jobs:", err));
  }, []);

  async function addJob() {
       if(!title.trim() || !company.trim()) return;

       const response = await fetch("http://localhost:3001/jobs", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({ title, company }),
       });

       const newJob = await response.json();

       setJobs((currentJobs) => [...currentJobs, newJob]);
       setTitle("");
       setCompany("");
  }

  async function deleteJob(id: string) {

    const response = await fetch(`http://localhost:3001/jobs/${id}`, {
      method: "DELETE",
    });

    if(!response.ok) {
      console.error("Failed to delete job");
      return;
    }

    setJobs((currentJobs) => 
      currentJobs.filter((job) => job.id !== id)
    );



  }


  async function updateStatus(id: string, status:string) {

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3001/jobs/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id, status })
      });
  
      if(!response.ok) {
        console.error("Failed to update status");
        return;
      }
  
      const updatedJob = await response.json();
  
      setJobs((currentJobs) => 
        currentJobs.map((job) => 
          job.id !== id ? job : updatedJob
        )
      );

    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false)
    }
    
  }

  const statusColor = (status: string) => {
    switch(status) {
      case "Applied":
        return "bg-blue-100 text-blue-700";
      case "Interview":
        return "bg-yellow-100 text-yellow-700";
      case "Offer":
        return "bg-green-100 text-green-700";
      case "Rejected":
        return "bg-red-100 text-red-700";
      default:
        return "";        
    }
  };

  return (
     <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">AppliedAI Job Tracker</h1>

        {loading && <p className="text-blue-500 mb-2">Updating...</p>}

        {/* Form */}

        <div className="flex gap-2 mb-4">
          <input 
                className="border p-2 rounded w-full"
                placeholder="Job title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                />

          <input
                className="border p-2 rounded w-full"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}     
                />

          <button
                onClick={addJob}
                className="bg-black text-white px-4 rounded"
                >
                  Add
          </button>       
        </div>

        {/* Jobs */}

        <div className="space-y-3">
          {jobs.map((job) => (
            <div 
                key={job.id}
                className="flex justify-between items-center border p-3 rounded"
                >
                  <div>
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-gray-500">{job.company}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                        value={job.status}
                        onChange={(e) => 
                          updateStatus(job.id, e.target.value)
                        }
                        className={`px-2 py-1 rounded ${statusColor(job.status)}`}
                        >
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                    </select>
                  </div>
            </div>

          ))}
        </div>
      </div>
     </div>
  );
}

export default App;