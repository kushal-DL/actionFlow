// Author: Kushal Sharma
'use server';
/**
 * @fileOverview A flow for summarizing long texts by chunking, without Genkit.
 *
 * - summarizeText - A function that handles text summarization.
 * - SummarizeTextInput - The input type for the summarizeText function.
 * - SummarizeTextOutput - The return type for the summarizeText function.
 */

import { z } from 'zod';
import 'dotenv/config';

const SummarizeTextInputSchema = z.object({
  textToSummarize: z
    .string()
    .max(500000)
    .describe('The text to be summarized.'),
});
export type SummarizeTextInput = z.infer<typeof SummarizeTextInputSchema>;

const SummarizeTextOutputSchema = z.object({
  summary: z.string().describe('The generated summary of the text.'),
});
export type SummarizeTextOutput = z.infer<typeof SummarizeTextOutputSchema>;


async function callLLM(prompt: string): Promise<string> {
  const model = process.env.LLM_MODEL_NAME;
  const apiUrl = process.env.LLM_API_URL || 'http://127.0.0.1:11434';
  const apiKey = process.env.LLM_API_KEY;

  if (!model) {
    throw new Error('LLM_MODEL_NAME environment variable not set.');
  }

  try {
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
      return data.candidates[0].content.parts[0].text;
    
    } else { // Assume Ollama for any other URL
      const response = await fetch(`${apiUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }
      const data = await response.json();
      return data.response;
    }
  } catch (error) {
    console.error('Error calling LLM:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to get response from AI service. Please ensure your local AI model is running and configured correctly. Details: ${message}`);
  }
}

// The main flow that orchestrates the summarization process.
export async function summarizeText({ textToSummarize }: SummarizeTextInput): Promise<SummarizeTextOutput> {
  // A character limit that is safely within most models' context windows.
  // Using a smaller chunk size is better for quality.
  const CHUNK_SIZE = 15000;
  const OVERLAP_SIZE = 1000; // Overlap to maintain context between chunks.

  // If the text is small enough, summarize it in one go.
  if (textToSummarize.length <= CHUNK_SIZE) {
    const prompt = `Concisely summarize the following text chunk. Focus on the main points and key information.

TEXT CHUNK:
---
${textToSummarize}
---

SUMMARY:`;
    const summary = await callLLM(prompt);
    return { summary: summary.trim() };
  }
  
  // 1. SPLIT: Break the long text into smaller, overlapping chunks.
  const chunks: string[] = [];
  for (let i = 0; i < textToSummarize.length; i += CHUNK_SIZE - OVERLAP_SIZE) {
    chunks.push(textToSummarize.substring(i, i + CHUNK_SIZE));
  }

  // 2. SUMMARIZE CHUNKS: Summarize each chunk in parallel.
  const chunkSummariesPromises = chunks.map(async (chunk) => {
    const prompt = `Concisely summarize the following text chunk. Focus on the main points and key information.

TEXT CHUNK:
---
${chunk}
---

SUMMARY:`;
    const summary = await callLLM(prompt);
    return summary.trim();
  });

  const chunkSummaries = (await Promise.all(chunkSummariesPromises)).filter(s => s.trim() !== '');
  const combinedSummaryText = chunkSummaries.join('\\n\\n---\\n\\n');

  // 3. COMBINE SUMMARIES: Create a final summary from the individual chunk summaries.
  const finalPrompt = `The following text contains several summaries of different parts of a larger document.
Combine these summaries into a single, cohesive, and accurate final summary of the entire document.
Ensure the final summary flows well and captures all critical points from the provided summaries. Do not add any new information.

SUMMARIES TO COMBINE:
---
${combinedSummaryText}
---

FINAL COMBINED SUMMARY:`;

  const finalSummary = await callLLM(finalPrompt);
  
  return { summary: finalSummary.trim() };
}
