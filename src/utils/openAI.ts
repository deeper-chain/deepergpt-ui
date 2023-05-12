import { createParser } from 'eventsource-parser'
import type { ParsedEvent, ReconnectInterval } from 'eventsource-parser'
import type { ChatMessage } from '@/types'

export const model = import.meta.env.OPENAI_API_MODEL || 'gpt-3.5-turbo'

export const generatePayload = (apiKey: string, messages: ChatMessage[]): RequestInit & { dispatcher?: any } => ({
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  method: 'POST',
  /*
  body: JSON.stringify({
    model,
    messages,
    temperature: 0.6,
    stream: true,
  }),*/
  body: JSON.stringify({
    prompt: messages[messages.length-1].content
  }),
})

export const parseOpenAIStream = (rawResponse: Response) => {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  if (!rawResponse.ok) {
    return new Response(rawResponse.body, {
      status: rawResponse.status,
      statusText: rawResponse.statusText,
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const jsonRegex = /{.*?}/g;

      for await (const chunk of rawResponse.body as any) {
        const decodedChunk = decoder.decode(chunk);
        const jsonStrings = decodedChunk.match(jsonRegex);

        if (jsonStrings) {
          for (const jsonString of jsonStrings) {
            const jsonObject = JSON.parse(jsonString);
            if (jsonObject.choices && jsonObject.choices[0] && jsonObject.choices[0].text) {
              controller.enqueue(encoder.encode(jsonObject.choices[0].text));
            }
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream)
}
