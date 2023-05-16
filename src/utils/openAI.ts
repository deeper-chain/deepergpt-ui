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
  /*
  body: JSON.stringify({
    model,
    messages,
    temperature: 0.6,
    stream: true,
  }),*/
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
      // Iterate through the response body stream
      for await (const chunk of rawResponse.body as any) {
        const decodedChunk = textDecoder.decode(chunk);

        // Check if there are multiple JSON objects in the chunk
        if (decodedChunk.lastIndexOf("}{") !== -1) {
          const jsonTokens = decodedChunk
            .split('text-davinci-003"}')
            .map((token) => token.trim())
            .filter(Boolean)
            .map((token) => {
              return `${token} text-davinci-003"}`;
            });

          // Enqueue the text from each JSON object to the parsed stream
          for (const jsonToken of jsonTokens) {
            controller.enqueue(textEncoder.encode(JSON.parse(jsonToken).choices[0].text));
          }
        } else {
          // Enqueue the text from the JSON object to the parsed stream
          controller.enqueue(textEncoder.encode(JSON.parse(decodedChunk).choices[0].text));
        }
      }
      controller.close();
    },
  });

  // Return the parsed stream as a new response
  return new Response(parsedStream);
};
