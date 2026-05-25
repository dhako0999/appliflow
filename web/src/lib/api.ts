const API_URL = import.meta.env.VITE_API_URL;

export async function getApplicationsOverTime(
    token: string,
    range: string
): Promise<{ date: string; count: number }[]> {
    const res = await fetch(`${API_URL}/analytics/applications-over-time?range=${range}`, 
    {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    const data = await res.json();

    if(!res.ok) {
        throw new Error(data.error || "Failed to fetch applications over time");
    }


    return data;
}