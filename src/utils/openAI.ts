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

export const parseOpenAIStream = (rawResponse: Response) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  if (!rawResponse.ok) {
    return new Response(rawResponse.body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of rawResponse.body as any) {
        const s = decoder.decode(chunk);
        if (s.lastIndexOf("}{") !== -1) {
          const jsons = s.split("}{").map((token) => {
            if (token[token.length - 1] == "}") {
              return `{${token}`;
            } else {
              return `${token}}`;
            }
          });

          for (const j of jsons) {
            controller.enqueue(encoder.encode(JSON.parse(j).choices[0].text));
          }
        } else {
          controller.enqueue(encoder.encode(JSON.parse(s).choices[0].text));
        }
      }
      controller.close();
    },
  });

  return new Response(stream);
};
