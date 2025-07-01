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
});
export type CreateTasksInput = z.infer<typeof CreateTasksInputSchema>;

const TaskSchema = z.object({
  text: z
    .string()
    .describe('A concise action item. Rephrase the user\'s request into a clear to-do item. For example, "the ABC report is due from Ravi" should become "Follow up - need ABC report".'),
  category: z
    .enum(['daily', 'weekly', 'sprint', 'misc'])
    .describe("The checklist this task belongs to. 'daily' for tasks due today. 'weekly' for tasks due this week. 'sprint' for development sprint tasks. 'misc' for others."),
  owner: z
    .string()
    .describe("The person responsible for the task. Use the name from the request or the contacts list. Default to 'Kushal' if not mentioned."),
});

const CreateTasksOutputSchema = z.object({
  tasks: z
    .array(TaskSchema)
    .describe('A list of structured task objects parsed from the query. If the user provides a complex goal, this should be a list of broken-down sub-tasks.'),
  originalTask: TaskSchema.nullable().describe(
    "If the user's request was a complex goal that you broke down, this field should contain a single task representing the original high-level goal. Otherwise, this should be null."
  ),
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
  const { query, contacts } = input;
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';

  if (!model) {
    throw new Error("LLM_MODEL_NAME environment variable not set.");
  }
  
  const prompt = `You are "Jarvis", an intelligent task creation assistant for the ActionFlow app.
Your goal is to parse a user's request and convert it into a structured list of tasks.

You must identify three key pieces of information for each task:
1.  **text**: A concise action item. Rephrase the user's request into a clear to-do item. For example, "the ABC report is due from Ravi" should become "Follow up - need ABC report".
2.  **category**: The checklist this task belongs to. You MUST choose one of these four options: 'daily', 'weekly', 'sprint', or 'misc'.
    - 'daily': For tasks due today, or that are urgent and immediate. Keywords: "today", "by end of day", "ASAP".
    - 'weekly': For tasks to be done this week. Keywords: "by Friday".
    - 'sprint': For tasks related to the current software development sprint. Keywords: "sprint", "feature", "bug", "ticket".
    - 'misc': For tasks that don't fit the other categories or have no clear deadline.
3.  **owner**: The person responsible for the task. Use the name provided in the user's request. Refer to the provided contact list to ensure correct spelling if possible, but you can also use names not on the list. If no owner is mentioned, assign it to 'Kushal'.

**Task Breakdown Rules:**
- If the user's request is a single, simple task, create one task object in the 'tasks' array. The 'originalTask' field should be null.
- If the user's request is a large, complex goal (e.g., "Organize the quarterly team offsite", "plan my marketing campaign"), your primary job is to break it down into a logical sequence of smaller, actionable sub-tasks.
- When you perform a breakdown, you MUST ALSO create a single, high-level summary task representing the original goal and place it in the 'originalTask' field. The 'tasks' array should contain the detailed sub-tasks.

Here is the list of known contacts to help with owner names:
${contacts}

Here is the user's request:
"${query}"

If the user's request does not seem to be about creating tasks (e.g., it's a greeting or a general question), it is CRUCIAL that you respond with an empty "tasks" array, a null "originalTask", and a null "clarification".
If the request is too ambiguous to create tasks, use the 'clarification' field to ask a clarifying question.

IMPORTANT: Respond ONLY with a JSON object that strictly follows the output schema. Do not add any extra text, conversation, or explanations. The required JSON schema has a 'tasks' array, an 'originalTask' object (which can be null), and a 'clarification' string (which can be null).`;

  try {
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
    const jsonContent = JSON.parse(data.message.content);
    
    // Validate the response against the Zod schema
    const parsedOutput = CreateTasksOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in createTasksFromText:', error);
    // Rethrow a more descriptive error to the client
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process task creation request. Please ensure your local AI model is running and configured correctly. Details: ${message}`);
  }
}
