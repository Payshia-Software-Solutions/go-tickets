
'use server';
/**
 * @fileOverview An AI flow to suggest image search keywords based on event details.
 *
 * - suggestImageKeywords - A function that suggests keywords for image search.
 * - SuggestImageKeywordsInput - The input type for the suggestImageKeywords function.
 * - SuggestImageKeywordsOutput - The return type for the suggestImageKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestImageKeywordsInputSchema = z.object({
  eventName: z.string().describe('The name of the event.'),
  eventDescription: z.string().optional().describe('A short description of the event.'),
});
export type SuggestImageKeywordsInput = z.infer<typeof SuggestImageKeywordsInputSchema>;

const SuggestImageKeywordsOutputSchema = z.object({
  keywords: z.array(z.string()).describe('An array of 2-3 short keyword phrases suitable for image search engines like Unsplash.'),
});
export type SuggestImageKeywordsOutput = z.infer<typeof SuggestImageKeywordsOutputSchema>;

export async function suggestImageKeywords(input: SuggestImageKeywordsInput): Promise<SuggestImageKeywordsOutput> {
  return suggestImageKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestImageKeywordsPrompt',
  input: {schema: SuggestImageKeywordsInputSchema},
  output: {schema: SuggestImageKeywordsOutputSchema},
  prompt: `Given the following event details, suggest 2-3 short (1-3 words) keyword phrases that would be effective for searching for relevant images on a stock photo website like Unsplash. Focus on visual elements.

Event Name: {{{eventName}}}
{{#if eventDescription}}
Event Description: {{{eventDescription}}}
{{/if}}

Return only the keywords. For example, if the event is "Summer Music Festival" about electronic music, good keywords might be "music festival lights", "DJ concert crowd", "outdoor summer event".
`,
});

const suggestImageKeywordsFlow = ai.defineFlow(
  {
    name: 'suggestImageKeywordsFlow',
    inputSchema: SuggestImageKeywordsInputSchema,
    outputSchema: SuggestImageKeywordsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (output && output.keywords && Array.isArray(output.keywords)) {
        // Ensure keywords are reasonable length and not too many
        return {
            keywords: output.keywords.map(kw => kw.trim()).filter(kw => kw.length > 0 && kw.length < 50).slice(0, 3)
        };
    }
    // Fallback if LLM doesn't provide good output
    return { keywords: [input.eventName.toLowerCase().replace(/\s+/g, ' ').trim()] };
  }
);

