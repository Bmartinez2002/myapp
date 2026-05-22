import OpenAI from "openai";

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const MODELS = {
  fast:   "gpt-4o-mini",       // briefings, insights, parse
  smart:  "gpt-4o",            // weekly review, simulations
} as const;
