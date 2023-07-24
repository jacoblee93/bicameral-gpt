# Bicameral-GPT: A TypeScript generative agent trained on your journal!

Bicameral-GPT is an experimental, personalized [generative agent](https://arxiv.org/abs/2304.03442) trained on journal entries.

Bicameral-GPT will answer questions and simulate reactions to events based on the life experiences
and core memories you give it, with more recent and impactful experiences weighted more heavily.
It can also "summarize" your current traits and status based on your entries, providing a
way to gain insight and introspection into your own mental state and character.

## What you'll need

- A Notion account
- A Supabase account
- An access key for OpenAI, Anthropic, or other [LangChainJS-supported LLM provider](https://js.langchain.com/docs/modules/model_io/models/).

## Quickstart

Bicameral-GPT uses the [LangChainJS](https://js.langchain.com/docs/get_started/introduction/) implementation of generative agents, as well as the Notion document loader and Supabase vector store.

0. Copy the `.env.example` file into a `.env` file.
1. [Follow these instructions](https://js.langchain.com/docs/modules/data_connection/document_loaders/integrations/web_loaders/notionapi) and create a Notion integration with access to a page in your workspace. The required peer dependencies are already required in this repo, so you can skip that step. Populate your `.env` file's `NOTION_INTEGRATION_TOKEN` with your integration token.
2. Populate a Notion page with a few journal entries. We recommend you use a structure where each new entry is a subpage within the main page, and the title is the day in parseable format:
![]()
If the title of a subpage is not a parseable date, Bicameral-GPT will fall back to using the date the subpage was created, which may not align with the journal entry's true date. Populate the `NOTION_PAGE_ID` variable in your `.env` file with your journal page.
3. Create a new Supabase instance and [follow these instructions](https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/supabase) to set up a table for your stored documents. Populate the `SUPABASE_PRIVATE_KEY` and `SUPABASE_URL` variables in your `.env` file appropriately.
4. Fill in the `OPENAI_API_KEY` variable with your OpenAI key.
5. Populate the remaining environment variables for `AGENT_CORE_TRAITS`, `AGENT_NAME`, and `AGENT_STATUS`.
6. Open `scripts/ingest.ts` and replace `CORE_MEMORIES` at the top with some personalized core memories and traits you'd like your agent to have.
7. Run `yarn install` to install the required dependencies.
8. Run `yarn ingest` to load your your core memories and journal entries from Notion. When this is complete, you'll see your agent's current status.
9. Run `yarn dev` to start the NextJS app.
10. Go to `localhost:3000` to start asking your agent questions and prodding it with stimuli!

At present, your agent will respond best to standalone questions rather than full on conversations.

## Ingesting new memories

`yarn ingest` is idempotent based on the text of your core memories and the page id of your journal entries, so to keep your agent up to date, you can simply
rerun it.

Generative agents can form new memories and even acquire new traits based on the conversations you have with it and the stimuli you prod it with. However, by default, ingesting new memories will clear these generated memories, leaving your agent only with state from your journal entries and core memories.
If you would like to change this behavior, you can comment out the applicable lines in `scripts/ingest.ts`.

## Clearing your agent

The only state required for your agent to run is in your created Supabase table. If you'd like to reset your agent, you can clear the table from your Supabase console, or run `yarn wipe` as a shortcut.

## How does it work?


