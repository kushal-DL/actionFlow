// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A flow for identifying tasks to delete from natural language.
 *
 * - deleteTasksFromText - A function that handles parsing text to identify tasks for deletion.
 * - DeleteTasksInput - The input type for the deleteTasksFromText function.
 * - DeleteTasksOutput - The return type for the deleteTasksFromText function.
 */

import { z } from 'zod';
import 'dotenv/config';

// Input schema
const DeleteTasksInputSchema = z.object({
  query: z.string().describe("The user's command to delete tasks."),
  allTasks: z.string().describe("A JSON string of all the user's tasks, grouped by category."),
});
export type DeleteTasksInput = z.infer<typeof DeleteTasksInputSchema>;

// Output schema
const IdentifiedTaskSchema = z.object({
    id: z.string().describe("The unique identifier of the task."),
    text: z.string().describe("The text content of the task."),
    category: z.enum(['daily', 'weekly', 'sprint', 'misc']).describe("The category the task belongs to."),
});
export type IdentifiedTask = z.infer<typeof IdentifiedTaskSchema>;

const DeleteTasksOutputSchema = z.object({
  tasksToDelete: z
    .array(IdentifiedTaskSchema)
    .describe('A list of task objects that match the user\'s query to be deleted.'),
  clarification: z
    .string()
    .nullable()
    .describe(
      "If the request is too ambiguous to identify tasks, provide a question to the user here. Otherwise, this should be null."
    ),
});
export type DeleteTasksOutput = z.infer<typeof DeleteTasksOutputSchema>;

async function callLLM(prompt: string): Promise<any> {
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';
  const apiKey = process.env.LLM_API_KEY;

  if (!model) {
    throw new Error('LLM_MODEL_NAME environment variable not set.');
  }

  try {
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
            temperature: 0.1
          },
        }),
      });

      if (!response.ok) throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error("Received an invalid response structure from the Gemini API.");
      return JSON.parse(data.candidates[0].content.parts[0].text);
    
    } else {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], format: 'json', stream: false }),
      });

      if (!response.ok) throw new Error(`Ollama API error (${response.status}): ${await response.text()}`);
      const data = await response.json();
      return JSON.parse(data.message.content);
    }
  } catch (error) {
    console.error('Error calling LLM:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get response from AI service. Details: ${message}`);
  }
}

export async function deleteTasksFromText(
  input: DeleteTasksInput
): Promise<DeleteTasksOutput> {
  const { query, allTasks } = input;
  
  const prompt = `You are "Jarvis", an expert task management assistant. Your goal is to identify which tasks the user wants to DELETE based on their request.
You are given the user's request and a JSON string of all their current tasks.
You MUST analyze the user's request and identify all matching tasks from the provided list.

**Instructions:**
1.  **Analyze the Query:** Understand the user's intent to delete. They might refer to tasks by name, owner, or category ('daily' refers to the "Today" list, 'weekly' to the "This Week" list). Keywords: "delete", "remove", "get rid of".
2.  **Match Tasks:** Carefully match the query against the provided task list.
    - "delete the report task" -> Find tasks with "report" in the text.
    - "remove all tasks for Kushal" -> Find all tasks where the owner is "Kushal".
    - "delete all today's tasks" -> Find all tasks in the 'daily' category (Today list).
    - "get rid of this week's tasks" -> Find all tasks in the 'weekly' category (This Week list).
    - "remove all sprint tasks" -> Find all tasks in the 'sprint' category.
    - "delete all my misc tasks" -> Find all tasks in the 'misc' category.
3.  **Return Structure:** You MUST respond with a valid JSON object that strictly follows the output schema. The schema has a 'tasksToDelete' array and a 'clarification' field.
4.  **Accuracy:** Return the original 'id', 'text', and 'category' for each task you identify. Do not guess or hallucinate tasks. If no tasks match, return an empty 'tasksToDelete' array and a null 'clarification'.
5.  **Ambiguity:** If the user's request is too vague (e.g., "delete the task"), respond with an empty 'tasksToDelete' array and set the 'clarification' field to ask for more details (e.g., "Which task are you referring to?").

**Context:**
- All Tasks: \`\`\`json
${allTasks}
\`\`\`
- User's Request: "${query}"

Respond ONLY with the JSON object.`;

  try {
    const jsonContent = await callLLM(prompt);
    const parsedOutput = DeleteTasksOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in deleteTasksFromText:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process task deletion request. Details: ${message}`);
  }
}
