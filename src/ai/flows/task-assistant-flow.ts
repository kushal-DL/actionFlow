// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A task assistant AI agent that acts as a router for user intent.
 *
 * - taskAssistantRouter - A function that directs user queries to the right action.
 * - TaskAssistantInput - The input type for the taskAssistantRouter function.
 * - TaskAssistantOutput - The return type for the taskAssistant-flow function.
 */

import { z } from "zod";
import 'dotenv/config';

const TaskAssistantInputSchema = z.object({
  query: z.string().describe("The user's question or command."),
  allTasks: z
    .string()
    .describe("A JSON string representing all of the user's tasks."),
  currentDate: z.string().describe("The current date in YYYY-MM-DD format."),
  startOfWeek: z.string().describe("The date of the first day of the current week (Sunday) in YYYY-MM-DD format."),
  endOfWeek: z.string().describe("The date of the last day of the current week (Saturday) in YYYY-MM-DD format."),
});
export type TaskAssistantInput = z.infer<typeof TaskAssistantInputSchema>;

const TaskAssistantOutputSchema = z.object({
  intent: z
    .enum(['answer_question', 'create_tasks', 'greeting', 'clarification'])
    .describe("The user's primary intent."),
  answer: z
    .string()
    .nullable()
    .describe("The AI-generated answer if the intent is 'answer_question', 'greeting', or 'clarification'. Null if 'create_tasks'."),
});
export type TaskAssistantOutput = z.infer<typeof TaskAssistantOutputSchema>;

export async function taskAssistantRouter(
  input: TaskAssistantInput
): Promise<TaskAssistantOutput> {
  const { query, allTasks, currentDate, startOfWeek, endOfWeek } = input;
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';
  const apiKey = process.env.LLM_API_KEY;

  if (!model) {
    throw new Error("LLM_MODEL_NAME environment variable not set.");
  }
  
  const prompt = `You are "Jarvis," the intelligent and helpful AI assistant for the ActionFlow application. Your purpose is to make task management seamless and efficient. When a user asks who you are, respond in a friendly, conversational way that reflects this purpose. Avoid technical jargon like "intent-detection AI".

Your primary job is to analyze the user's query and determine their true intent.

**Step 1: Analyze the Query and Determine Intent**
Classify the user's query into ONE of the following intents:

1.  **'create_tasks'**: The user wants to create one or more tasks. This is for any command or statement that implies a new to-do item.
    - Examples: "remind me to follow up with accounting tomorrow", "add a task to fix the login bug for the sprint", "send the weekly report".
    - If the intent is 'create_tasks', your 'answer' field MUST be null.

2.  **'answer_question'**: The user is asking a question about their existing tasks, about you, or for general knowledge.
    - Look for interrogative words like "what", "who", "when", "show me", "do I have".
    - Examples: "what do I have to do today?", "who is working on the report?", "who are you?".
    - For this intent, you must generate a helpful response in the 'answer' field.

3.  **'greeting'**: The user is making simple small talk.
    - Examples: "hello", "how are you?", "good morning", "thanks".
    - For this intent, provide a friendly, conversational response in the 'answer' field.
    
4.  **'clarification'**: The query is too ambiguous to fit into the other categories.
    - Example: "the report". This is too vague.
    - For this intent, ask a clarifying question in the 'answer' field. Example: "Are you asking about a report or do you want to create a task for one?"

**Step 2: Generate Your Response**
- If intent is **'create_tasks'**: Set 'intent' to 'create_tasks' and 'answer' to null. This is critical.
- If intent is **'answer_question'**: Set 'intent' to 'answer_question' and generate a helpful answer using the provided context.
- If intent is **'greeting'**: Set 'intent' to 'greeting' and provide a short, friendly response.
- If intent is **'clarification'**: Set 'intent' to 'clarification' and ask a clarifying question.

**CONTEXT FOR ANSWERING QUESTIONS:**
- Today's Date: ${currentDate}
- Current Week: ${startOfWeek} to ${endOfWeek}
- All Task Data: ${allTasks}

**USER'S QUERY:**
"${query}"

Respond ONLY with a valid JSON object that follows the specified schema with 'intent' and 'answer' keys.`;

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
    const parsedOutput = TaskAssistantOutputSchema.parse(jsonContent);
    return parsedOutput;

  } catch (error) {
    console.error('Error in taskAssistantRouter:', error);
    // Rethrow a more descriptive error to the client
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get answer from assistant. Please ensure your local AI model is running and configured correctly. Details: ${message}`);
  }
}
