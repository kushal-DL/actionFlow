// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A task assistant AI agent, without Genkit.
 *
 * - askTaskAssistant - A function that handles querying the task assistant.
 * - TaskAssistantInput - The input type for the askTaskAssistant function.
 * - TaskAssistantOutput - The return type for the askTaskAssistant function.
 */

import { z } from "zod";
import 'dotenv/config';

const TaskAssistantInputSchema = z.object({
  query: z.string().describe("The user's question about their tasks."),
  allTasks: z
    .string()
    .describe("A JSON string representing all of the user's tasks."),
  currentDate: z.string().describe("The current date in YYYY-MM-DD format."),
  startOfWeek: z.string().describe("The date of the first day of the current week (Sunday) in YYYY-MM-DD format."),
  endOfWeek: z.string().describe("The date of the last day of the current week (Saturday) in YYYY-MM-DD format."),
});
export type TaskAssistantInput = z.infer<typeof TaskAssistantInputSchema>;

const TaskAssistantOutputSchema = z.object({
  answer: z
    .string()
    .describe("The AI-generated answer to the user's question."),
});
export type TaskAssistantOutput = z.infer<typeof TaskAssistantOutputSchema>;

export async function askTaskAssistant(
  input: TaskAssistantInput
): Promise<TaskAssistantOutput> {
  const { query, allTasks, currentDate, startOfWeek, endOfWeek } = input;
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';

  if (!model) {
    throw new Error("LLM_MODEL_NAME environment variable not set.");
  }
  
  const prompt = `You are "Jarvis," a helpful and friendly AI assistant for the ActionFlow app.
Your personality is professional yet approachable.

Your primary purpose is to help the user with their tasks. However, you are also capable of general conversation.

Analyze the user's query and follow these rules:
1.  **If the query is about tasks** (e.g., "what do I have to do today?", "show me sprint tasks", "who is working on the report?"), answer the question using ONLY the provided task data below.
    - Use the provided dates to understand terms like "today" or "this week".
    - When listing tasks, format them as a clean, natural language list. NEVER return raw JSON in your answer. Example: "You have 3 tasks for today: 1. Do the thing. 2. Follow up on the other thing. 3. Finalize the report."
    - If the answer to a task-related question isn't in the data, state that clearly. For example: "I don't have any information about a 'deployment plan' in your task lists."

2.  **If the query is NOT about tasks** (e.g., a greeting, a request for a joke, a general knowledge question), then answer it conversationally as a general-purpose AI assistant. Do not mention the task data at all.

HERE IS THE CURRENT DATE AND TIME CONTEXT:
- Today's Date: ${currentDate}
- The current week starts on: ${startOfWeek} (Sunday)
- The current week ends on: ${endOfWeek} (Saturday)

HERE IS ALL THE CURRENT TASK DATA (for task-related queries only):
${allTasks}

USER'S QUERY:
"${query}"

Respond ONLY with a JSON object with a single key "answer" containing your text response. For example: {"answer": "Your answer here."}`;

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
    const parsedOutput = TaskAssistantOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in askTaskAssistant:', error);
    // Rethrow a more descriptive error to the client
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get answer from assistant. Please ensure your local AI model is running and configured correctly. Details: ${message}`);
  }
}
