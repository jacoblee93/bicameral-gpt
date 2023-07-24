import "dotenv/config";

import { NotionAPILoader } from "langchain/document_loaders/web/notionapi"
import { ChatOpenAI } from "langchain/chat_models/openai"
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { TimeWeightedVectorStoreRetriever } from "langchain/retrievers/time_weighted";
import {
  GenerativeAgentMemory,
  GenerativeAgent,
} from "langchain/experimental/generative_agents";
import { Document } from "langchain/document";
import { ChatAnthropic } from "langchain/chat_models/anthropic";

import { createClient } from "@supabase/supabase-js";

const personName = process.env.AGENT_NAME;
// Replace with your own core memories
const CORE_MEMORIES = [
  // `${personName} feels joy and a sense of adventure from playing video games like the Legend of Zelda`,
  // `${personName} spent the last 6 years working hard at a startup and felt frustrated by the outcome`,
  // `${personName} spent a few months starting a contracting business and making money on his own before joining LangChain`,
  // `${personName} is eager to prove himself in his new role after his past failures`,
  // `${personName} is very excited about meeting his new team at LangChain`,
  // `${personName} is very much looking forward to his upcoming wedding to his fiancee, Lena`,
];

const IMPORTANT_MEMORY_SOURCES = [
  "core",
  "daily_log",
]

const getNotionLogDocumentDate = (doc) => {
  return isNaN(Date.parse(doc.metadata.properties.title)) ? new Date(doc.metadata.created_time) : new Date(doc.metadata.properties.title);
};

const filterAndClearNonLogRecords = async (loadedRecords, vectorStore) => {
  const unimportantMemoryRecordIds = loadedRecords
    .filter((log) => !IMPORTANT_MEMORY_SOURCES.includes(log.metadata.source))
    .map((record) => record.id);
  console.log(`Clearing ${unimportantMemoryRecordIds.length} non-essential memories from conversations and reactions...`);
  await vectorStore.delete({ ids: unimportantMemoryRecordIds });
  return loadedRecords.filter((log) => IMPORTANT_MEMORY_SOURCES.includes(log.metadata.source));
};

const SUPABASE_TABLE_NAME = process.env.SUPABASE_TABLE_NAME ?? "documents";

const ingest = async () => {
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PRIVATE_KEY, {
    auth: {
      persistSession: false
    }
  });
  const vectorStore = new SupabaseVectorStore(new OpenAIEmbeddings(), {
    client,
    tableName: SUPABASE_TABLE_NAME,
  });
  const retriever = new TimeWeightedVectorStoreRetriever({
    vectorStore,
    otherScoreKeys: ["importance"],
    k: 15,
  });

  const allLoadedRecordsResponse = await client.from(SUPABASE_TABLE_NAME).select("id,content,metadata");
  // By default, we clear out all memories created from conversations and generated reactions
  // rather than loaded from Notion when ingesting new memories.
  //
  // You may disable this if you"d like your agent to preserve formed memories based on chat interactions
  // or reactions.
  const importantExistingMemoryRecords = await filterAndClearNonLogRecords(allLoadedRecordsResponse.data, vectorStore);
  // const importantExistingMemoryRecords = allLoadedRecordsResponse.data;

  retriever.setMemoryStream(importantExistingMemoryRecords.map((record) => {
    return new Document({
      pageContent: record.content,
      metadata: record.metadata
    });
  }));

  // Loading a page (including child pages all as separate documents)
  const pageLoader = new NotionAPILoader({
    clientOptions: {
      auth: process.env.NOTION_INTEGRATION_TOKEN,
    },
    id: process.env.NOTION_PAGE_ID,
    type: "page",
  });

  const logEntries = (await pageLoader.loadAndSplit()).sort((a, b) => {
    if (getNotionLogDocumentDate(a) < getNotionLogDocumentDate(b)) {
      return -1;
    } else {
      return 1;
    }
  });

  const llm = new ChatOpenAI({
    temperature: 0.9,
    modelName: "gpt-4"
  });
  // Anthropic works well here too!
  // const llm = new ChatAnthropic({
  //   temperature: 0.9,
  //   modelName: "claude-2"
  // });

  const agentMemory: GenerativeAgentMemory = new GenerativeAgentMemory(
    llm,
    retriever,
    { reflectionThreshold: 8 }
  );

  const agent: GenerativeAgent = new GenerativeAgent(llm, agentMemory, {
    name: personName,
    age: 30,
    traits: process.env.AGENT_TRAITS,
    status: process.env.AGENT_STATUS,
  });

  for (const memory of CORE_MEMORIES) {
    const duplicateMemory = importantExistingMemoryRecords.find((existingMemoryRecord) => {
      return existingMemoryRecord.content === memory;
    });
    if (!duplicateMemory) {
      console.log("Adding core memory:\n", memory);
      await agent.addMemory(memory, new Date(), {
        source: "core"
      });
    }
  }

  for (const logEntry of logEntries) {
    const duplicateMemory = importantExistingMemoryRecords.find((existingMemoryRecord) => {
      return existingMemoryRecord.metadata.notionId === logEntry.metadata.notionId;
    });
    if (!duplicateMemory) {
      console.log("Adding daily log memory:\n", logEntry.pageContent, logEntry.metadata);
      await agent.addMemory(logEntry.pageContent, getNotionLogDocumentDate(logEntry), {
        source: "daily_log",
        ...logEntry.metadata
      });
    }
  }
  console.log(`After upserting all memories, ${personName}'s summary is:\n${await agent.getSummary({
    forceRefresh: true,
  })}`)
  console.log("Setup complete!");
}

ingest();