// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A flow for creating tasks from natural language without Genkit.
 *
 * - createTasksFromText - A function that handles parsing text to create tasks.
 * - CreateTasksInput - The input type for the createTasksFromText function.
 * - CreateTasksOutput - The return type for the createTasksFromText function.
 */

import { z } from 'zod';
import 'dotenv/config';

const CreateTasksInputSchema = z.object({
  query: z.string().describe('The natural language query from the user.'),
  contacts: z
    .string()
    .describe("A JSON string representing all of the user's contacts."),
  defaultOwnerName: z.string().describe("The name of the user who should be the default owner if none is specified.")
});
export type CreateTasksInput = z.infer<typeof CreateTasksInputSchema>;

const TaskSchema = z.object({
  text: z
    .string()
    .describe('A concise action item. Extract the core to-do item from the user\'s request. For example, "remind me to send the TPS report" should become "Send the TPS report".'),
  category: z
    .enum(['daily', 'weekly', 'sprint', 'misc'])
    .describe("The checklist this task belongs to. 'daily' for tasks in the 'Today' view. 'weekly' for tasks in the 'This Week' view. 'sprint' for development sprint tasks. 'misc' for others."),
  owner: z
    .string()
    .describe("The person responsible for the task. This field is mandatory. If no person is named in the query, you MUST use the provided default owner's name."),
});

const CreateTasksOutputSchema = z.object({
  tasks: z
    .array(TaskSchema)
    .describe('A list of structured task objects parsed from the query.'),
  clarification: z
    .string()
    .nullable()
    .describe(
      "If the request is too ambiguous to create tasks, provide a question to the user here. Otherwise, this should be null."
    ),
});
export type CreateTasksOutput = z.infer<typeof CreateTasksOutputSchema>;
export type CreatedTask = z.infer<typeof TaskSchema>;


export async function createTasksFromText(
  input: CreateTasksInput
): Promise<CreateTasksOutput> {
  const { query, contacts, defaultOwnerName } = input;
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';
  const apiKey = process.env.LLM_API_KEY;

  if (!model) {
    throw new Error("LLM_MODEL_NAME environment variable not set.");
  }
  
  const prompt = `You are "Jarvis", an expert task parsing assistant for the ActionFlow app.
Your only goal is to accurately parse a user's request and convert it into a structured list of tasks. You must follow these instructions precisely.

**Core Task Parsing Rules:**
1.  **Extract the Action (text)**: The 'text' field should contain only the core action item.
    - User Request: "remind me to send the TPS report to Bill" -> text: "Send the TPS report to Bill"
    - User Request: "add a task to fix the login bug" -> text: "Fix the login bug"
    - CRITICAL: Strip away phrases like "add a task to", "remind me to", "can you create a task for".

2.  **Determine the Category (category)**: You MUST choose one of these four options: 'daily', 'weekly', 'sprint', or 'misc'.
    - 'daily': For tasks due today (part of the "Today" list) or with daily frequency. Keywords: "today", "daily", "by end of day".
    - 'weekly': For tasks due this week (part of the "This Week" list) or with weekly frequency. Keywords: "this week", "weekly", "by Friday".
    - 'sprint': For tasks related to the current software development sprint. Keywords: "sprint", "feature", "bug", "ticket".
    - 'misc': A fallback for tasks that don't fit other categories or have no clear deadline.
    - For requests like "send report A daily and report B weekly", create two tasks and assign the correct respective categories.

3.  **Assign the Owner (owner)**: This is your most important instruction. The 'owner' field is MANDATORY for every task.
    - The value for 'owner' MUST be a STRING containing the person's name. Example: "Kushal S.".
    - **CRITICAL: NEVER use an object for the owner field. It must be a plain string.**
    - If a name is mentioned in the query (e.g., "remind Ravi to..."), use that name as the owner.
    - If NO owner is mentioned, you MUST assign the task to the default owner. The default owner's name is: '${defaultOwnerName}'.
    - Do NOT invent an owner. Do NOT leave the owner field empty.

**Context & User Request:**
- Known contacts: ${contacts}
- User's request: "${query}"

**Response Requirements:**
- If the user's request is not about creating tasks (e.g., a greeting), you MUST respond with an empty "tasks" array and a null "clarification".
- If the request is too ambiguous to create tasks, respond with an empty "tasks" array and use the 'clarification' field to ask for more details.
- Respond ONLY with a valid JSON object that strictly follows the output schema. Do not add any other text or explanations. The schema has a 'tasks' array and a 'clarification' string (which can be null).`;

  try {
    let jsonContent;

    // Use Gemini if the URL points to Google's API
    if (apiUrl.includes('googleapis.com')) {
      if (!apiKey) throw new Error("LLM_API_KEY environment variable is required for Gemini.");
      
      const geminiUrl = `${apiUrl}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.2
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Invalid Gemini response structure:", JSON.stringify(data, null, 2));
        throw new Error("Received an invalid response structure from the Gemini API.");
      }
      jsonContent = JSON.parse(data.candidates[0].content.parts[0].text);
    
    } else { // Assume Ollama for any other URL
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          format: 'json',
          stream: false,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      jsonContent = JSON.parse(data.message.content);
    }
    
    // Validate the response against the Zod schema
    const parsedOutput = CreateTasksOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in createTasksFromText:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process task creation request. Please ensure your local AI model is running and configured correctly. Details: ${message}`);
  }
}
