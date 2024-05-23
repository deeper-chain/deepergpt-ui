import { createParser } from "eventsource-parser";
import type { ParsedEvent, ReconnectInterval } from "eventsource-parser";
import type { ChatMessage } from "@/types";

export const model = import.meta.env.OPENAI_API_MODEL || "gpt-3.5-turbo";

export const generatePayload = (
  apiKey: string,
  messages: ChatMessage[]
): RequestInit & { dispatcher?: any } => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  method: "POST",
  body: JSON.stringify({
    prompt: messages[messages.length - 1].content,
  }),
});

// Function to parse the OpenAI API response stream
export const parseOpenAIStream = (rawResponse: Response) => {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  if (!rawResponse.ok) {
    return new Response(rawResponse.body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
    });
  }

  const parsedStream = new ReadableStream({
    async start(controller) {
      let buffer = "";

      for await (const chunk of rawResponse.body as any) {
        const decodedChunk = textDecoder.decode(chunk, { stream: true });

        const regex = /"content":\s*"(.*?)"/g;
        let match;
        while ((match = regex.exec(decodedChunk)) !== null) {
          let text = match[1];
          text = text.replace(/\\n/g, "\n");
          if (text !== '\0') {
            controller.enqueue(textEncoder.encode(text));
          }
        }
      }
      controller.close();
    },
  });

  return new Response(parsedStream);
};
