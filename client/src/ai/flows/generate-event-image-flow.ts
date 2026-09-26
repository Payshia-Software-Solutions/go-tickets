
'use server';
/**
 * @fileOverview An AI flow to generate an image for an event.
 *
 * - generateEventImage - A function that generates an image based on event details.
 * - GenerateEventImageInput - The input type for the generateEventImage function.
 * - GenerateEventImageOutput - The return type for the generateEventImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateEventImageInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the event, e.g., event name or short description.'),
});
export type GenerateEventImageInput = z.infer<typeof GenerateEventImageInputSchema>;

const GenerateEventImageOutputSchema = z.object({
  imageUrl: z.string().url().describe('The data URI of the generated image.'),
});
export type GenerateEventImageOutput = z.infer<typeof GenerateEventImageOutputSchema>;

export async function generateEventImage(input: GenerateEventImageInput): Promise<GenerateEventImageOutput> {
  return generateEventImageFlow(input);
}

const generateEventImageFlow = ai.defineFlow(
  {
    name: 'generateEventImageFlow',
    inputSchema: GenerateEventImageInputSchema,
    outputSchema: GenerateEventImageOutputSchema,
  },
  async (input) => {
    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // IMPORTANT: Use the experimental model for image generation
        prompt: `Generate a vibrant and exciting event poster or promotional image for an event described as: "${input.prompt}". The image should be suitable for a website. Focus on conveying energy and appeal.`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
        },
      });

      if (media && media.url) {
        return { imageUrl: media.url };
      } else {
        throw new Error('Image generation did not return a valid media URL.');
      }
    } catch (error) {
        console.error('Error generating event image:', error);
        // Fallback or re-throw: For now, re-throwing to let the caller handle.
        // Consider returning a default placeholder URL if preferred:
        // return { imageUrl: 'https://placehold.co/600x400.png?text=Error+Generating+Image' };
        throw error;
    }
  }
);
