import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { authenticateUser, AuthenticatedRequest, } from "./middleware/auth.js";
import OpenAI from "openai";
import { convertProcessSignalToExitCode } from "node:util";


import multer from "multer";
import { toFile } from "openai/uploads";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

dotenv.config();

const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type MockInterviewFeedback = {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestedAnswer: string;
  nextPracticeTip: string;
};


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

app.post("/ai/chat", authenticateUser, async (req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;

    if(!userId) {
       return res.status(401).json({ error: "User not authorized"});
    }

    const { message, messages } = req.body;

    
    if(!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required"});
    }

    const chatHistory = Array.isArray(messages) ? messages : [];

    const conversationHistory = chatHistory.slice(-10)
    .filter((msg: { role: string; content: string; }) => typeof msg.role === "string" && typeof msg.content === "string")
    .map((msg: { role: string; content: string; }) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join("\n\n");


    const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, company, status, created_at, interview_notes")
    .eq("user_id", userId);

    if(jobsError) {
       console.error("Jobs fetch error: ", jobsError);
       return res.status(500).json({ error: "Failed to fetch jobs" });
    }

    const { data: recruiters, error: recruitersError } = await supabase
    .from("recruiters")
    .select("id, name, company, email, linkedin_url, relationship_status, notes, last_contacted_at, created_at")
    .eq("user_id", userId);

    if(recruitersError) {
       console.error("Recruiters fetch error: ", recruitersError);
       return res.status(500).json({ error: "Failed to fetch recruiters" });
    }

    const { data: interviews, error: interviewsError } = await supabase
    .from("interviews")
    .select("id, job_id, interview_date, interview_type, stage, prep_notes, created_at")
    .eq("user_id", userId);

    if(interviewsError) {
      console.error("Interviews fetch error: ", interviewsError);
      return res.status(500).json({ error: "Failed to fetch interviews" });
    }

    const safeJobs = jobs ?? [];
    const safeRecruiters = recruiters ?? [];
    const safeInterviews = interviews ?? [];

    const now = new Date();

    const upcomingInterviews = safeInterviews.filter((interview) => {
      if (!interview.interview_date) return false;
      return new Date(interview.interview_date) >= now;
    });

    const pastInterviews = safeInterviews.filter((interview) => {
      if (!interview.interview_date) return false;
      return new Date(interview.interview_date) < now;
    });

    const totalApplications = safeJobs.length;

    const activeApplications = safeJobs.filter(
      (job) => job.status !== "Rejected" && job.status !== "Offer"
    ).length;

    const rejectedApplications = safeJobs.filter(
      (job) => job.status === "Rejected"
    ).length;

    const offers = safeJobs.filter((job) => job.status === "Offer").length;

    const prompt = `
        You are an AI Career Copilot inside a job search management app.

        Current date:
        ${new Date().toISOString()}

        Rules:
        - Answer using only the user's provided job search data and conversation history.
        - Be concise, practical, and human-friendly.
        - Use clear line breaks.
        - Use short headings.
        - Use numbered lists for priorities.
        - Use bullet points for supporting details.
        - Do not mention past interviews as upcoming.
        - Only discuss past interviews if the user asks about history, previous interviews, performance, or follow-up.
        - If there are no upcoming interviews, clearly say there are no upcoming interviews.
        - Do not overwhelm the user with every record. Prioritize what matters most.
        - If the user asks for counts or statistics, calculate from the provided data.
        - If the user asks for advice, give specific next steps.
        - If the user asks a follow-up question, use the conversation history to understand context.

        User statistics:
        - Total applications: ${totalApplications}
        - Active applications: ${activeApplications}
        - Rejected applications: ${rejectedApplications}
        - Offers: ${offers}
        - Recruiters: ${safeRecruiters.length}
        - Upcoming interviews: ${upcomingInterviews.length}
        - Past interviews: ${pastInterviews.length}

        Applications:
        ${JSON.stringify(safeJobs, null, 2)}

        Recruiters:
        ${JSON.stringify(safeRecruiters, null, 2)}

        Upcoming Interviews:
        ${JSON.stringify(upcomingInterviews, null, 2)}

        Past Interviews:
        ${JSON.stringify(pastInterviews, null, 2)}

        Previous conversation:
        ${conversationHistory || "No previous conversation yet."}

        Response format:
        Start with a short 1-2 sentence summary.

        Then use this structure when helpful:

        Top Priorities:
        1. ...
        2. ...
        3. ...

        Recommended Actions:
        - ...
        - ...
        - ...

        Important Notes:
        - ...

        Latest user question:
        ${message}
        `;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return res.json({
      reply: response.output_text,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    return res.status(500).json({
      error: "Failed to process AI chat message",
    });
  }
});


app.get("/ai/insights", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;

    if(!userId) {
       return res.status(401).json({ error: "User not authorized" });
    }

    const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, title, company, status, created_at")
    .eq("user_id", userId);

    if(jobsError) {
       return res.status(500).json({ error: "Failed to fetch jobs" });
    }

    const { data: recruiters, error: recruitersError } = await supabase
    .from("recruiters")
    .select("id, name, company, relationship_status, last_contacted_at, created_at")
    .eq("user_id", userId);

    if(recruitersError) {
      return res.status(500).json({ error: "Failed to fetch recruiters" });
    }

    const { data: interviews, error: interviewsError } = await supabase
    .from("interviews")
    .select("id, interview_date, interview_type, stage")
    .eq("user_id", userId);

    if(interviewsError) {
      return res.status(500).json({ error: "Failed to fetch interviews" });
    }

    const safeJobs = jobs ?? [];
    const safeRecruiters = recruiters ?? [];
    const safeInterviews = interviews ?? [];

    const now = new Date();

    const followUpJobs = safeJobs.filter((job) => {
      if(job.status === "Rejected" || job.status === "Offer") return false;

      const createdAt = new Date(job.created_at);
      const daysOld = (now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000);

      return daysOld >= 7
    });

    const recruitersToContact = safeRecruiters.filter((recruiter) => {
      if(!recruiter.last_contacted_at) return;

      const lastContactedAt = new Date(recruiter.last_contacted_at);

      const daysAgo = (now.getTime() - lastContactedAt.getTime()) / (24 * 60 * 60 * 1000);

      return daysAgo >= 12;
    });

    const upcomingInterviews = safeInterviews.filter((interview) => {
      if(!interview.interview_date) return;

      const interviewDate = new Date(interview.interview_date);

      return interviewDate >= now;
    });

    const activeOffers = safeJobs.filter((job) => job.status === "Offer");

    return res.json({
      followUpJobsCount: followUpJobs.length,
      recruitersToContactCount: recruitersToContact.length,
      upcomingInterviewsCount: upcomingInterviews.length,
      activeOffersCount: activeOffers.length,

      followUpJobs,
      recruitersToContact,
      upcomingInterviews,
      activeOffers,

    });

  
  } catch (error) {
    console.error("AI insights error: ", error);

    return res.status(500).json({ error: "Failed to generate insights" });
  }
});

app.post("/mock-interviews/question", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {

    const userId = req.user?.sub;

    if(!userId) {
       return res.status(401).json({ error: "User not authorized" });
    }

    const { interviewType, jobId, sessionId } = req.body;

    let session = null;

    if(sessionId) {
      const { data, error } = await supabase
      .from("mock_interview_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

      if(error) {
        return res.status(500).json({ error: "Session not found" });
      }

      session = data;
    } else {
      const { data, error } = await supabase
      .from("mock_interview_sessions")
      .insert({
         user_id: userId,
         job_id: jobId || null,
         interview_type: interviewType || "Technical Interview",
         status: "active"
      })
      .select()
      .single();

      if(error) {
        return res.status(500).json({ error: "Failed to create session" });
      }

      session = data;
    }


    

    let selectedJob = null;

    if(jobId) {
       const { data: job, error: jobError } = await supabase
       .from("jobs")
       .select("id, title, company, status, interview_notes")
       .eq("id", jobId)
       .eq("user_id", userId)
       .single();

       if(jobError) {
         console.error("Job fetch error: ", jobError);
         return res.status(500).json({ error: "Selected job not found" });
       }

       selectedJob = job;
    }


    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Generate one realistic interview question:

Interview type: ${interviewType} || "Technical Interview"}

Job context:
${
  selectedJob 
  ? `
     Company: ${selectedJob.company}
     Role: ${selectedJob.title}
     Application Status: ${selectedJob.status}
     Interview Notes: ${selectedJob.interview_notes || "No interview notes provided"}

  `
  : "No specific job selected. Generate a general interview question."
}

Rules:
- Return only the question.
- Do not include explanations.
- Make it realisitic for a job interview
      
      `,


    });

    const questionText = response.output_text;

    const questionInsert = await supabase
    .from("mock_interview_questions")
    .insert({
      user_id: userId,
      session_id: session.id,
      question_text: questionText,
      question_type: interviewType || "Technical Interview",
    })
    .select()
    .single();

    if(questionInsert.error) {
       console.error("Error inserting mock interview question: ", questionInsert.error);
       return res.status(500).json({ error: "Error inserting mock interview question"});
    }

    return res.json({
      session,
      question: questionInsert.data,
    });


  } catch(error) {
     console.error("Mock interview question error: ", error);
     return res.status(500).json({
        error: "Failed to generate mock interview question",
     });

  }
});



app.post("/mock-interviews/submit-video", authenticateUser, upload.single("video"), async (req: AuthenticatedRequest, res) => {
  
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: "User not authorized" });
      }

      const { questionId, questionText } = req.body;

      if (!questionId || typeof questionId !== "string") {
        return res.status(400).json({ error: "Question is required" });
      }

      if(!questionText || typeof questionText !== "string") {
        return res.status(400).json({ error: "Question text is required" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Video file is required" });
      }

      const allowedMimeTypes = ["video/webm", "video/mp4", "video/quicktime"];

      if(!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          error: "Only WEBM, MP4, and MOV videos are supported",
        });
      }


      const fileName = `${userId}/${Date.now()}-${req.file.originalname || "mock-interview.webm"}`;

      const { error: uploadError } = await supabase.storage
        .from("mock-interview-videos")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype || "video/webm",
          upsert: false,
        });

      if (uploadError) {
        console.error("Video upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload video" });
      }

      const openAIFile = await toFile(
        req.file.buffer,
        req.file.originalname || "mock-interview.webm",
        {
          type: req.file.mimetype || "video/webm",
        }
      );

      const transcription = await openai.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe",
        file: openAIFile,
      });

      const transcript = transcription.text;

      const feedbackResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: `
You are an expert interview coach.

Interview Question:
${questionText}

User Transcript:
${transcript}

Evaluate the user's interview response.

Return ONLY valide JSON. Do not include markdown. Do not include code fences.

The JSON must match this shape:

{
    "score": 7,
    "strengths": [
         "Clear explanation of the problem",
         "Good use of a concret example",
    ],
    "improvements": [
         "Add more measurable impact",
         "Structure the answer more clearly"
    ],
    "suggestedAnswer": "A strong version of this answer...",
    "nextPracticeTip": "One focused practice tip..."
}


...
`,
      });

      const aiFeedbackText = feedbackResponse.output_text;

      let parsedFeedback: MockInterviewFeedback | null = null;

      try {
        parsedFeedback = JSON.parse(aiFeedbackText);
      } catch (error) {
        console.error("Failed to parse AI feedback JSON:", error);
      }

      const score = typeof parsedFeedback?.score === "number" ? parsedFeedback.score : null;

      const aiFeedback = parsedFeedback ? JSON.stringify(parsedFeedback) : aiFeedbackText;

      const responseInsert = await supabase
        .from("mock_interview_responses")
        .insert({
          user_id: userId,
          question_id: questionId,
          video_path: fileName,
          transcript,
          ai_feedback: aiFeedback,
          score,
        })
        .select()
        .single();

      if (responseInsert.error) {
        console.error("Response insert error:", responseInsert.error);
        return res.status(500).json({ error: "Failed to save mock interview response" });
      }

      return res.json({
        response: responseInsert.data,
        transcript,
        feedback: parsedFeedback,
        rawFeedback: aiFeedback,
        score,
      });
    } catch (error) {
      console.error("Submit mock interview video error:", error);
      return res.status(500).json({
        error: "Failed to process mock interview video",
      });
    }
  }
);

app.get("/mock-interviews/history", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: "User not authorized" });
      }

      const { data, error } = await supabase
        .from("mock_interview_responses")
        .select(`
          id,
          question_id,
          user_id,
          video_path,
          transcript,
          ai_feedback,
          score,
          created_at,
          mock_interview_questions (
            id,
            question_text,
            question_type,
            session_id,
            mock_interview_sessions (
              id,
              job_id,
              interview_type,
              status,
              created_at,
              jobs (
                id,
                title,
                company
              )
            )
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Mock interview history error:", error);
        return res.status(500).json({
          error: "Failed to fetch mock interview history",
        });
      }

      const history = await Promise.all(
        (data ?? []).map(async (item) => {
          let videoUrl: string | null = null;

          if (item.video_path) {
            const { data: signedUrlData, error: signedUrlError } =
              await supabase.storage
                .from("mock-interview-videos")
                .createSignedUrl(item.video_path, 60 * 60);

            if (!signedUrlError) {
              videoUrl = signedUrlData.signedUrl;
            }
          }

          return {
            ...item,
            videoUrl,
          };
        })
      );

      return res.json({ history });
    } catch (error) {
      console.error("Mock interview history server error:", error);
      return res.status(500).json({
        error: "Failed to fetch mock interview history",
      });
    }
});


app.patch("/mock-interviews/sessions/:sessionId/complete", authenticateUser, async(req: AuthenticatedRequest, res) => {

  try {

    const userId = req.user?.sub;

    if(!userId) {
      return res.status(401).json({ error: "User is not authorized" });
    }

    const { sessionId } = req.params;

    const completedAt = new Date().toISOString();

    const { data: session, error: sessionError } = await supabase
    .from("mock_interview_sessions").
    update({
      status: "completed",
      completed_at: completedAt,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select()
    .single();

    if(sessionError) {
      console.error("Complete session error: ", sessionError);
      return res.status(500).json({ error: "Error in setting session as completed"});
    }

    const { data: questions, error: questionsError } = await supabase
      .from("mock_interview_questions")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (questionsError) {
      console.error("Session questions error:", questionsError);
      return res.status(500).json({ error: "Failed to fetch session questions" });
    }

    const questionIds = (questions ?? []).map((question) => question.id);

    if (questionIds.length === 0) {
      return res.json({
        session,
        summary: {
          questionsAnswered: 0,
          averageScore: "N/A",
        },
      });
    }

    console.log("Completed sessionId:", sessionId);
    console.log("Questions found for session:", questions);

    const { data: responses, error: responsesError } = await supabase
      .from("mock_interview_responses")
      .select("id, score")
      .eq("user_id", userId)
      .in("question_id", questionIds);

    if (responsesError) {
      console.error("Session summary error:", responsesError);
      return res.status(500).json({ error: "Failed to calculate summary" });
    }

    const safeResponses = responses ?? [];

    const scoredResponses = safeResponses.filter(
      (response) => response.score !== null
    );

    const averageScore =
      scoredResponses.length > 0
        ? (
            scoredResponses.reduce(
              (sum, response) => sum + (response.score ?? 0),
              0
            ) / scoredResponses.length
          ).toFixed(1)
        : "N/A";
    

        return res.json({
          session,
          summary: {
            questionsAnswered: safeResponses.length,
            averageScore,
          },
        });    


  } catch (error) {
    console.error("Error in setting status as completed: ", error);
    return res.status(500).json({ error: "Failed to complete session" });

  }
});

app.get("/news", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.sub;

    const category = req.query.category as string | undefined;

    const searchByCategory: Record<string, string> = {
      all: "technology hiring jobs careers",
      "job-market": "job market hiring layoffs employment",
      "interview-prep": "interview tips jobs interview preparation",
      "resume-tips": "resume advice CV cover letter job application",
      "tech-careers": "software engineering technology careers AI jobs",
      salary: "salary negotiation compensation job offer"

    }

    const searchQuery = searchByCategory[category || "all"] || searchByCategory["all"];

    if (!userId) {
      return res.status(401).json({ error: "User not authorized" });
    }

    const apiKey = process.env.THE_NEWS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "News API key is missing" });
    }

    const url = new URL("https://api.thenewsapi.com/v1/news/all");

    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("search", searchQuery);
    url.searchParams.set("language", "en");
    url.searchParams.set("limit", "12");
    url.searchParams.set("sort", "published_at");

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log("TheNewsAPI response:", data);
    console.log("Articles returned:", data.data?.length);

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Failed to fetch news",
      });
    }

    return res.json({
      articles: data.data ?? [],
    });
  } catch (error) {
    console.error("Error fetching news articles:", error);
    return res.status(500).json({ error: "Failed to fetch news" });
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