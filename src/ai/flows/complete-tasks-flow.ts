// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A flow for identifying tasks to mark as complete from natural language.
 *
 * - completeTasksFromText - A function that handles parsing text to identify tasks for completion.
 * - CompleteTasksInput - The input type for the completeTasksFromText function.
 * - CompleteTasksOutput - The return type for the completeTasksFromText function.
 */

import { z } from 'zod';
import 'dotenv/config';

// Input schema
const CompleteTasksInputSchema = z.object({
  query: z.string().describe("The user's command to complete tasks."),
  allTasks: z.string().describe("A JSON string of all the user's open (not completed) tasks, grouped by category."),
});
export type CompleteTasksInput = z.infer<typeof CompleteTasksInputSchema>;

// Output schema
const IdentifiedTaskSchema = z.object({
    id: z.string().describe("The unique identifier of the task."),
    text: z.string().describe("The text content of the task."),
    category: z.enum(['daily', 'weekly', 'sprint', 'misc']).describe("The category the task belongs to."),
});
export type IdentifiedTask = z.infer<typeof IdentifiedTaskSchema>;

const CompleteTasksOutputSchema = z.object({
  tasksToComplete: z
    .array(IdentifiedTaskSchema)
    .describe('A list of task objects that match the user\'s query to be marked as complete.'),
  clarification: z
    .string()
    .nullable()
    .describe(
      "If the request is too ambiguous to identify tasks, provide a question to the user here. Otherwise, this should be null."
    ),
});
export type CompleteTasksOutput = z.infer<typeof CompleteTasksOutputSchema>;

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

export async function completeTasksFromText(
  input: CompleteTasksInput
): Promise<CompleteTasksOutput> {
  const { query, allTasks } = input;
  
  const prompt = `You are "Jarvis", an expert task management assistant. Your goal is to identify which tasks the user wants to mark as complete based on their request.
You are given the user's request and a JSON string of all their currently open (not completed) tasks.
You MUST analyze the user's request and identify all matching tasks from the provided list.

**Instructions:**
1.  **Analyze the Query:** Understand the user's intent. They might refer to tasks by name, owner, or category ('daily' refers to the "Today" list, 'weekly' to the "This Week" list).
2.  **Match Tasks:** Carefully match the query against the provided task list.
    - "close the report task" -> Find tasks with "report" in the text.
    - "complete all tasks for Kushal" -> Find all tasks where the owner is "Kushal".
    - "mark all today's tasks done" -> Find all tasks in the 'daily' category (Today list).
    - "finish this week's tasks" -> Find all tasks in the 'weekly' category (This Week list).
    - "close out the sprint" -> Find all tasks in the 'sprint' category.
    - "close all my misc tasks" -> Find all tasks in the 'misc' category.
3.  **Return Structure:** You MUST respond with a valid JSON object that strictly follows the output schema. The schema has a 'tasksToComplete' array and a 'clarification' field.
4.  **Accuracy:** Return the original 'id', 'text', and 'category' for each task you identify. Do not guess or hallucinate tasks. If no tasks match, return an empty 'tasksToComplete' array and a null 'clarification'.
5.  **Ambiguity:** If the user's request is too vague (e.g., "close the task"), respond with an empty 'tasksToComplete' array and set the 'clarification' field to ask for more details (e.g., "Which task are you referring to?").

**Context:**
- All Open Tasks: \`\`\`json
${allTasks}
\`\`\`
- User's Request: "${query}"

Respond ONLY with the JSON object.`;

  try {
    const jsonContent = await callLLM(prompt);
    const parsedOutput = CompleteTasksOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in completeTasksFromText:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process task completion request. Details: ${message}`);
  }
}
