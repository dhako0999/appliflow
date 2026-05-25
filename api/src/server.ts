import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, AuthenticatedRequest, } from "./middleware/auth.js";
import OpenAI from "openai";
import { convertProcessSignalToExitCode } from "node:util";

dotenv.config();

const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})


//app.use(cors());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://appliflow-delta.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

/*app.get("/jobs", async (req, res) => {

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});*/

app.get("/jobs", authenticateUser, async(req: AuthenticatedRequest, res) => {
    
    const userId = req.user?.sub;

    const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });


    if(error) {
       return res.status(500).json({ error: error.message });
    }

    res.json(data);

});


/*
app.post("/jobs", async (req, res) => {
  const { title, company } = req.body;

  const { data, error } = await supabase
    .from("jobs")
    .insert([{ title, company }])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
});
*/

app.post("/jobs", authenticateUser, async (req: AuthenticatedRequest, res) => {
    
   const userId = req.user?.sub;

   const { title, company } = req.body;

   if(!title.trim() || !company.trim()) {
     return res.status(400).json({ error: "Title and company are required." });
   }

   const { data, error } = await supabase
   .from("jobs")
   .insert([{ title, company, user_id: userId }])
   .select();

   if(error) {
     return res.status(500).json({ error: error.message });
   }

   res.status(201).json(data[0]);
 

});

/*app.delete("/jobs/:id", async(req, res) => {
    const { id } = req.params;

    const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id);

    if(error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });

});*/

app.delete("/jobs/:id", authenticateUser, async(req: AuthenticatedRequest, res) => {
    
    const userId = req.user?.sub;

    const { id } = req.params;

    const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

    if(error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
});

/*app.put("/jobs/:id", async(req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const { data, error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", id)
    .select();

    if(error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data[0]);
});*/

/*
app.put("/jobs/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.sub;
  const { id } = req.params;
  const { status } = req.body;


  const { data, error } = await supabase
  .from("jobs")
  .update({ status })
  .eq("id", id)
  .eq("user_id", userId)
  .select();

  if(error) {
    return res.status(500).json({ error: error.message });
  }

  if(!data || data.length === 0) {
    return res.status(404).json({ error: "Job not found or not owned by user." })
  }

  res.json(data[0]);


});*/


app.put("/jobs/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.sub;
  const { id } = req.params;

  const { status, job_description, application_url, interview_notes, deadline, salary_range, location, resume_file_path, cover_letter_file_path } = req.body;

  const updateData: Record<string, unknown> = {};

  if (status !== undefined) updateData.status = status;
  if (job_description !== undefined) updateData.job_description = job_description;
  if (application_url !== undefined) updateData.application_url = application_url;
  if (interview_notes !== undefined) updateData.interview_notes = interview_notes;
  if (deadline !== undefined) updateData.deadline = deadline;
  if (salary_range !== undefined) updateData.salary_range = salary_range;
  if (location !== undefined) updateData.location = location;
  if (resume_file_path !== undefined) updateData.resume_file_path = resume_file_path;
  if (cover_letter_file_path !== undefined) updateData.cover_letter_file_path = cover_letter_file_path;

  if(Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: "No valid fields provided. "});
  }


  const { data, error } = await supabase
  .from("jobs")
  .update(updateData)
  .eq("id", id)
  .eq("user_id", userId)
  .select();

  if(error) {
    return res.status(500).json({ error: error.message });
  }

  if(!data || data.length === 0) {
    return res.status(404).json({ error: "Job not found or not owned by user." })
  }

  res.json(data[0]);


});

app.post("/jobs/:id/resume-match", authenticateUser, async (req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;

    const { id }= req.params;

    if(!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      resumeText,
      jobDescription,

    } = req.body;

    if(!resumeText || !jobDescription) {
      return res.status(400).json({
        error: "Resume textand job description are required"
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `
      
           You are an expert technical recruiter and resume reviewer.

           Return only valid JSON in this exact shape:

          
           {
              "matchScore": 0,
              "summary": "string",
              "missingSkills": ["string"]
           }

           Rules:
           - matchScore must be an integer from 0 to 100
           - summary must be concise and specific
           - missingSkills should include import gaps only
           - do not inlcude markdown
           - do not include extra commentary
      `,
      input: `
         Compare this resume against the job description.

         Resume: ${resumeText}

         Job description: ${jobDescription}

         Evaluate:
         - technical skill match
         - domain/industry match
         - seniority match
         - project relevance
         - missing or weak requirements
      
      `,
    });

    const aiData = await JSON.parse(response.output_text);

    const { data, error } = await supabase
    .from("jobs")
    .update({
      resume_match_score: aiData.matchScore,
      resume_match_summary: aiData.summary,
      resume_missing_skills: aiData.missingSkills,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

    if(error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);

  } catch (error) {
    console.error("Resume match error: ", error);

    return res.status(500).json({
      error: "Failed to analyze resume match",
    });
  } 
});

app.get("/analytics/status-counts", async (req, res) => {

    try {

        const token = req.headers.authorization?.replace(
           "Bearer ",
           ""
        );

        if(!token) {
          return res.status(401).json({
            error: "Missing token",
          });
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser(token);

        if(userError || !user) {
          return res.status(401).json({
            error: "Invalid token",
          });
        }
        
        const range = (req.query.range as string) || "30";
 
        let query = supabase
        .from("jobs")
        .select("status, created_at")
        .eq("user_id", user.id);

        if (range !== "all") {
          const days = Number(range);

          const cutoff = new Date(
            Date.now() - days * 24 * 60 * 60 * 1000
          ).toISOString();

          query = query.gte("created_at", cutoff);
        }

        const { data, error } = await query;

        if(error) throw error;

        const counts: Record<string, number> = {};

        data?.forEach((job) => {

          counts[job.status] = (counts[job.status] || 0) + 1;
        });

        const result = Object.entries(counts).map(([status, count]) => ({ status, count, }));

        res.json(result);

    } catch (error) {
        console.error("Analytics status counts error: ", error);
        res.status(500).json({ error: "Failed to fetch status counts" });
    }
  
  
});

app.get("/analytics/applications-over-time", async (req, res) => {
  try {

    const token = req.headers.authorization?.replace(
         "Bearer ", 
         ""
    );

    if (!token) {
      return res.status(401).json({
        error: "Missing token"
      })
    }

    const { data: { user }, error: userError, } = await supabase.auth.getUser(token);

    if(userError || !user) {
      return res.status(401).json({
         error: "Invalid token",
      });
    }
 
    const range = (req.query.range as string) || "30";

    let query = supabase
    .from("jobs")
    .select("created_at")
    .eq("user_id", user.id);

    if(range !== "all") {
      const days = Number(range);
       
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      query = query.gte("created_at", cutoff);
    }

    const { data, error } = await query;

    if(error) throw error;

    const counts: Record<string, number> = {};

    data?.forEach((job) => {
       if(!job.created_at) return;

       const objDate = new Date(job.created_at);

       const date = objDate.toISOString().split("T")[0];

       counts[date] = (counts[date] || 0) + 1;

    });

    const result = Object.entries(counts).map(([date, count]) => ({ date, count, })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json(result);

  } catch (error) {
    console.error("Error fetching applications over time", error);

    res.status(500).json({ error: "Failed to fetch applications over time."})
  }
});


app.get("/recruiters", async (req, res) => {

  try {

    const token = req.headers.authorization?.replace("Bearer ", "");

    if(!token) {
      return res.status(401).json({ error: "Missing token"});
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if(userError || !user) {
       return res.status(401).json({ error: "Invalid token" });
    }

    const { data, error } = await supabase
    .from("recruiters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

    if(error) throw error;

    res.json(data);

  } catch (err) {
     console.error("Fetching recruiters error: ", err);
     return res.status(500).json({ error: "Failed to fetch recruiters "});
  }

});


app.post("/recruiters", async (req, res) => {

  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const {
      name,
      company,
      email,
      linkedin_url,
      phone,
      relationship_status,
      notes,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Recruiter name is required" });
    }

    const { data, error } = await supabase
      .from("recruiters")
      .insert({
        user_id: user.id,
        name: name.trim(),
        company,
        email,
        linkedin_url,
        phone,
        relationship_status: relationship_status || "New",
        notes,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (err) {
    console.error("Error creating recruiter", err);
    return res.status(500).json({ error: "Failed to create recruiter" });
  }
})

app.delete("/recruiters/:id", async (req, res) => {
  try {

    const token = req.headers.authorization?.replace("Bearer ", "");

    if(!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if(!user || userError) {
      return res.status(401).json({ error: "Invalid token" })
    }

    const recruiterId = req.params.id;

    const { error } = await supabase
    .from("recruiters")
    .delete()
    .eq("id", recruiterId)
    .eq("user_id", user.id)

    if(error) throw error;

    return res.json({ success: true });

  } catch (err) {
    
    console.error("Delete recruiter error: ", err);
    return res.status(500).json({ error: "Error deleting recruiter" })
  }
})

app.put("/recruiters/:id", async (req, res) => {

  try {

    const token = req.headers.authorization?.replace("Bearer ", "");

    if(!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);


    if(!user || userError) {
      return res.status(401).json({ error: "Invalid token"});
    }

    const recruiterId = req.params.id;

    const {
      name, 
      company, 
      email,
      linkedin_url,
      phone,
      relationship_status,
      notes,
      last_contacted_at
    } = req.body;

    const { data, error } = await supabase
    .from("recruiters")
    .update({
      name,
      company,
      email,
      linkedin_url,
      phone,
      relationship_status,
      notes,
      last_contacted_at
    })
    .eq("user_id", user.id)
    .eq("id", recruiterId)
    .select()
    .single();


    if(error) throw error;

    return res.json(data);

  } catch (err) {
    console.error("Error updating recruiter: ", err);
    return res.status(500).json({ error: "Failed to updating recruiter"})
  }
})

/*Interviews Code */

app.get("/interviews", authenticateUser, async(req: AuthenticatedRequest, res) => {



  try {

    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    /*const token = req.headers.authorization?.replace(`Bearer `, "");

    if(!token) {
         return res.status(400).json({ error: "missing token"});
    }

    const { 
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if(userError || !user) {
      return res.status(401).json({ error: "Invalid token" })
    }*/

    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("user_id", userId)
      .order("interview_date", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);

  } catch (error) {
    console.error("Failed to fetch interview data:", error);

    return res.status(500).json({
      error: "Failed to fetch interview data",
    });
  }
})

app.post("/interviews", authenticateUser, async(req: AuthenticatedRequest, res) => {
  try {

    const userId = req.user?.sub;

    if(!userId) {
       return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      job_id,
      interview_date,
      interview_type,
      stage,
      meeting_url,
      prep_notes,
      outcome,
      recruiter_id,
      duration_minutes,
    } = req.body;

    if(!job_id) {
      return res.status(400).json({ error: "Job is required" });
    }

    const { data, error } = await supabase
    .from("interviews")
    .insert({
      user_id: userId,
      job_id,
      interview_date: interview_date || null,
      interview_type,
      stage: stage || "Phone Screen",
      meeting_url,
      prep_notes,
      outcome: outcome || "Pending",
      recruiter_id: recruiter_id || null,
      duration_minutes
    })
    .select()
    .single();

    if(error) {
      return res.status(500).json({ error: error.message });
    }

    let notificationData = null;

    if(data.interview_date) {

      /*const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userId,
        type: "interview_scheduled",
        title: "Interview scheduled",
        message: `You have an interview scheduled for ${new Date(data.interview_date).toLocaleString()}.`,
        related_interview_id: data.id,
      });*/

      const { data: createdNotification, error: notificationError } = await supabase
        .from("notifications")
        .insert({
        user_id: userId,
        type: "interview_scheduled",
        title: "Interview scheduled",
        message: `You have an interview scheduled for ${new Date(data.interview_date).toLocaleString()}.`,
        related_interview_id: data.id,
      })
      .select()
      .single();

      if(notificationError) {
        console.error("Error creating notification:", notificationError);
      } else {
        notificationData = createdNotification;
      }
    }

    

    return res.status(201).json({
       notification: notificationData,
       interview: data,
    });

  } catch (error) {
    console.error("Error inserting interview data", error);
    return res.status(500).json({
      error: "Error creating interview"
    });

  }
});

app.patch("/interviews/:id", authenticateUser, async(req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;
    const { id } = req.params;

    if(!userId) {
       return res.status(400).json({ error: "Missing token" })
    }

    const {
      job_id,
      interview_date,
      interview_type,
      stage,
      meeting_url,
      prep_notes,
      outcome,
      prep_checklist,
      ai_prep_summary,
      ai_questions,
      duration_minutes,
    } = req.body;

    const { data, error } = await supabase
    .from("interviews")
    .update({
      job_id,
      interview_date,
      interview_type,
      stage,
      meeting_url,
      prep_notes,
      outcome,
      prep_checklist,
      ai_prep_summary,
      ai_questions,
      duration_minutes,
    })
    .eq("user_id", userId)
    .eq("id", id)
    .select()
    .single();

    if(error) {
      return res.status(500).json({ error: error.message });
    }


    return res.json(data);



  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/interviews/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
   
   try {

      const userId = req.user?.sub;

      const { id } = req.params;

      if(!userId) {
        return res.status(400).json({ error: "Missing token"})
      }

      const { data, error } = await supabase
      .from("interviews")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

      if(error) {
        return res.status(500).json({ error: `Error deleting interview: ${error.message}` })
      }

      return res.json(data);
 

   } catch (error) {
    console.error(`Server error (delete interview): ${error}`)
      
   }

});


app.post("/interviews/:id/generate-prep", authenticateUser, async (req: AuthenticatedRequest, res) => {

  try {
    const userId = req.user?.sub;

    const { id } = req.params;

    if(!userId) {
      return res.status(401).json({ error: "Unauthorized"})
    }

    const { jobTitle, company, stage, interviewType, prepNotes, jobDescription, } = req.body;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `
      
          You are an expert software engineering interview coach.

          Return only valid JSON in this exact shape:
          {
              "summary": "string",
              "questions": ["string"],
              "checklist": ["string"]
          }

          Do not include markdown
          Do not include extra text
      `,
      input: `
          Create interview preparataion guidance.

          Job title: ${jobTitle || "Unknown"} 
          Company: ${company || "Unknown"}
          Interview stage: ${stage || "Unknown"}
          Interview type: ${interviewType || "Unknown"}
          User prep notes: ${prepNotes || "Unknown"}
          Job description: ${jobDescription || "Not provided"}

          Generate:
          - 1 concise prep summary
          - 5 likely interview questions
          - 5 preparation checklist items
      
      `,
    });

    const aiText = response.output_text;
    const aiData = JSON.parse(aiText);

    const checklistWithCompletion = aiData.checklist.map((item: string) => ({
      text: item,
      completed: false,
    }));

    const { data, error } = await supabase
    .from("interviews")
    .update({
      ai_prep_summary: aiData.summary,
      ai_questions: aiData.questions,
      prep_checklist: checklistWithCompletion,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

    if(error) {
      return res.status(500).json({ error: `Error in updating ai data for interview ${error.message}`})
    }

    return res.json(data);

  } catch (error) {
    console.error("AI prep generation error: ", error);
    return res.status(500).json({
      error: "Failed to generate AI prep error"
    });

  }

});

app.patch("/interviews/:id/clear-prep", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("interviews")
      .update({
        ai_prep_summary: null,
        ai_questions: [],
        prep_checklist: [],
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error clearing interview prep: ", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error clearing interview prep: ", error);
    return res.status(500).json({ error: "Error clearing prep" });
  }
});

app.patch("/interviews/:id/checklist", authenticateUser, async (req: AuthenticatedRequest, res) => {
   
   try {

      const userId = req.user?.sub;

      if(!userId) {
        return res.status(401).json({ error: "User unauthorized"});
      }

      const { id } = req.params;

      const { prep_checklist } = req.body;

      const { data, error } = await supabase
      .from("interviews")
      .update({
         prep_checklist,
      })
      .eq("user_id", userId)
      .eq("id", id)
      .select()
      .single();


      if(error) {
         return res.status(500).json({ error: error.message, });
      }

      return res.json(data);

   } catch (error) {
      console.error("Error updating interview checklist: ", error);

      return res.status(500).json({
        error: "Failed to update checklist"
      });
      
   }

});

app.post("/interviews/:id/generate-follow-up", authenticateUser, async(req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;
    const { id } = req.params;

    if(!userId) {
      return res.status(400).json({ error: "Unauthorized" })
    }

    const { jobTitle, company, stage, interviewType, outcome, prepNotes } = req.body;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `
         You are a professional job-search communication assistant.

        Return ONLY valid JSON in this exact format:

        {
          "subject": "SHORT EMAIL SUBJECT LINE ONLY",
          "body": "FULL EMAIL BODY ONLY"
        }

        Rules:
        - subject must be under 12 words
        - body must be a complete professional email
        - do not swap the fields
        - do not include markdown
        - do not include explanations
        - do not include code fences

      `,
      input: `
            Write a professional follow-up email after an interview.

            Job title: ${jobTitle || "Unknown"}
            Company: ${company || "Unknown"}
            Interview stage: ${stage || "Unknown"}
            Interview type: ${interviewType || "Unknown"}
            Outcome/status: ${outcome || "Pending"}
            User notes: ${prepNotes || "None"}

            The "subject" field should contain ONLY the email title.

            The "body" field should contain ONLY the email message.
      `,
    });

    const aiData = JSON.parse(response.output_text);

    const { data, error } = await supabase
    .from("interviews")
    .update({
      follow_up_email_subject: aiData.subject,
      follow_up_email_body: aiData.body
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

    if(error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);


  } catch (error) {
    console.error("Email follow-up generation error: ", error);
    return res.status(500).json({ error: "Failed to generate follow-up email"});
  }
});


app.patch("/interviews/:id/follow-up", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;
    const { follow_up_email_subject, follow_up_email_body } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("interviews")
      .update({
        follow_up_email_subject,
        follow_up_email_body,
      })
      .eq("user_id", userId)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: `Error saving email follow-up: ${error.message}`,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Follow up save error: ", error);

    return res.status(500).json({
      error: "Failed to save follow-up email",
    });
  }
});

app.get("/notifications", authenticateUser, async(req: AuthenticatedRequest, res) => {

   try {

     const userId = req.user?.sub;

     if(!userId) {
        return res.status(401).json({ error: "Unauthorized"});
     }

     const { data, error } = await supabase
     .from("notifications")
     .select("*")
     .eq("user_id", userId)
     .order("created_at", { ascending: false })
     .limit(50);


     if(error) {
        
        return res.status(500).json({ error: `Error fetching notifications ${error.message}`})
     }

     return res.status(200).json(data);

   } catch (error) {
       console.error("Error fetching notifications", error);
       return res.status(500).json({ error: "Failed to fetch notifications" });

   }
});

app.patch("/notifications/:id/read", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: `Failed to mark notification as seen: ${error.message}`,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Error in updating notification", error);

    return res.status(500).json({
      error: "Failed to mark notification as seen",
    });
  }
});


app.post("/notifications/interview-reminder", authenticateUser, async (req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;

    if(!userId) {
       return res.status(401).json({ error: "Unauthorized"})

    }

    const { interview_id, title, message } = req.body;

    const { data, error } = await supabase
    .from("notifications")
    .insert({
       user_id: userId,
       type: "interview_reminder_24h",
       title,
       message,
       related_interview_id: interview_id
    })
    .select()
    .single();

    if(error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json(data);

  } catch (error) {
    console.error("Failed to create reminder: ", error);
    return res.status(500).json({ error: "Failed to create reminder",})
  }
  
});



/*app.get("/analytics/applications-over-time", async (req, res) => {
   try {

     const { data, error } = await supabase
     .from("jobs")
     .select("created_at");

     if(error) throw error;

     const counts: Record<string, number> = {};

     data.forEach((job) => {
        if(!job.created_at) return;

        const dateObj = new Date(job.created_at);

        const dateKey = dateObj.toISOString().split("T")[0];
       
        counts[dateKey] = (counts[dateKey] || 0) + 1;
     });

     const result = Object.entries(counts).map(([date, count]) => ({ date, count })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

     res.json(result);

   } catch (error) {
     console.error("Applications over time error: ", error);
     res.status(500).json({ error: "Failed to fetech applications over time "});
   }
});*/

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});











/*import express from "express";

import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ message: "App is running" });
});

app.get("/jobs", (_req, res) => {
    res.json([
        {
            id: "1",
            title: "Frontend Engineer",
            company: "Google",
            status: "Applied"

        },
        {
            id: "2",
            title: "Backend Engineer",
            company: "Amazon",
            status: "Interview"
        }
    ]);
});

const PORT = 3001;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});*/