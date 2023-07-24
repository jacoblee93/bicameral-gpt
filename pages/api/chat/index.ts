import { NextRequest, NextResponse } from 'next/server';
import { StreamingTextResponse } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatAnthropic } from 'langchain/chat_models/anthropic';
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { TimeWeightedVectorStoreRetriever } from "langchain/retrievers/time_weighted";
import { createClient } from "@supabase/supabase-js";
import {
  GenerativeAgentMemory,
  GenerativeAgent,
} from "langchain/experimental/generative_agents";
import { Document } from "langchain/document";

export const config = {
  'runtime': 'edge'
};

const interviewAgent = async (
  agent: GenerativeAgent,
  speaker: string,
  messageContent: string
): Promise<string> => {
  // Simple wrapper helping the user interact with the agent
  const newMessageContent = `${speaker} says ${messageContent}`;
  const response = await agent.generateDialogueResponse(newMessageContent, new Date());
  return response[1];
};

export default async function handler (req: NextRequest, res: NextResponse) {
  const body = await req.json();
  const messages = body.messages;
  const interactionType = body.interaction_type;
  const messageContent = messages[messages.length - 1].content;
  const speaker = body.speaker ?? "Interviewer";
  if (typeof messageContent !== "string") {
    return new Response(JSON.stringify({
      message: "You must provide a valid array of messages parameter."
    }), {
      status: 400,
      headers: {
        'content-type': 'application/json',
      },
    });
  }
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY, {
    auth: {
      persistSession: false
    }
  });
  const response = await client.from("documents").select("content,metadata");
  const loadedDocs = response.data.map((record) => {
    return new Document({
      pageContent: record.content,
      metadata: record.metadata
    });
  });
  const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client,
    tableName: "documents",
  });
  const retriever = new TimeWeightedVectorStoreRetriever({
    vectorStore,
    otherScoreKeys: ["importance"],
    k: 15,
  });
  retriever.setMemoryStream(loadedDocs);
  const model = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.9,
  });
  // Anthropic will err on the side of not making assumptions and not give responses at times
  // Basically, "that doesn't look like anything to me"
  // const model = new ChatAnthropic({
  //   modelName: "claude-2",
  //   temperature: 0.9,
  // });
  const loadedMemory = new GenerativeAgentMemory(
    model,
    retriever,
    { reflectionThreshold: 8 }
  );
  const agent: GenerativeAgent = new GenerativeAgent(model, loadedMemory, {
    name: process.env.AGENT_NAME,
    age: 30,
    traits: process.env.AGENT_CORE_TRAITS,
    status: process.env.AGENT_STATUS,
  });
  let agentResponse;
  if (interactionType === "say") {
    agentResponse = await interviewAgent(agent, speaker, messageContent);
  } else if (interactionType === "react") {
    [, agentResponse] = await agent.generateReaction(messageContent, new Date());
  } else {
    agentResponse = await agent.getSummary({ forceRefresh: true });
  }
  // "Streaming"
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      for (const char of agentResponse) {
        controller.enqueue(encoder.encode(char));
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      controller.close();
    },
  });

  return new StreamingTextResponse(readableStream);
}
