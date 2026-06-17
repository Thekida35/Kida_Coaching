import OpenAI from "openai";

/**
 * Client IA partagé — branché sur GEMINI via sa couche compatible OpenAI.
 * On garde la librairie OpenAI : seules l'adresse, la clé et le modèle changent.
 * Doc : https://ai.google.dev/gemini-api/docs/openai
 *
 * Pour repasser à OpenAI plus tard : mets OPENAI_API_KEY, enlève le baseURL,
 * et change AI_MODEL pour un modèle OpenAI.
 */
export const AI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function aiClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
}
