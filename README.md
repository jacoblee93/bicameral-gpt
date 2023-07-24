# Bicameral-GPT: A TypeScript generative agent trained on your journal!

Bicameral-GPT is an experimental, personalized [generative agent](https://arxiv.org/abs/2304.03442) trained on your journal entries.

![Demo gif of a chat message](/public/bicameral-gpt.gif)

Bicameral-GPT ingests a set of "core memories" and journal entries to get a sense of your day to day life and how you are affected by events in it.
You can then prompt Bicameral-GPT with questions (e.g. `Are you a fan of Westworld?`) and stimuli (e.g.
`Your cute neighbor from down the hall invites you to dinner`), and Bicameral-GPT will draw on the ingested memories to create responses.
It will weigh more recent and impactful experiences more heavily when coming up with responses - after all, what you had for breakfast
three weeks ago shouldn't have as much of an impact on your mental state as finding a new job!

Bicameral-GPT can also "summarize" your current traits and status based on your entries, providing a
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
![Example Notion page](/public/notion-log.png)
If the title of a subpage is not a parseable date, Bicameral-GPT will fall back to using the date the subpage was created, which may not align with the journal entry's true date. Populate the `NOTION_PAGE_ID` variable in your `.env` file with your journal page.
3. Create a new Supabase instance and [follow these instructions](https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/supabase) to set up a table for your stored documents. Populate the `SUPABASE_PRIVATE_KEY` and `SUPABASE_URL` variables in your `.env` file appropriately.
4. Fill in the `OPENAI_API_KEY` variable with your OpenAI key.
5. Populate the remaining environment variables for `AGENT_CORE_TRAITS`, `AGENT_NAME`, `AGENT_STATUS`, and optionally `AGENT_AGE`.
6. Open `scripts/ingest.ts` and replace `CORE_MEMORIES` at the top with some personalized core memories and traits you'd like your agent to have.
7. Run `yarn install` to install the required dependencies.
8. Run `yarn ingest` to load your your core memories and journal entries from Notion. When this is complete, you'll see your agent's current status.
9. Run `yarn dev` to start the NextJS app.
10. Go to `localhost:3000` to start asking your agent questions and prodding it with stimuli!

At present, your agent will respond best to standalone questions and isn't the best at conversations.

Latency with GPT-4 is presently around 20-30 seconds per question depending on how many memories your agent has.
You can experiment with faster, cheaper models as well.

## Ingesting new memories

`yarn ingest` is idempotent based on the text of your core memories and the Notion page id of your journal entries,
so to keep your agent up to date, you can simply rerun the command.

Generative agents can "form" new memories and even acquire new traits based on the conversations you have with it and the stimuli you prod it with. However, by default, ingesting new memories will clear these generated memories, leaving your agent only with state from your journal entries and core memories.
This is mainly for consistency, to keep introspection more accurate, and to keep focus on the most relevant memories.
If you would like to change this behavior, you can comment out the applicable lines in `scripts/ingest.ts`.

## Clearing your agent

The only state required for your agent to run is in your created Supabase table. If you'd like to reset your agent, you can clear the table from your Supabase console, or run `yarn wipe` as a shortcut.

## How does it work?

### Adding memories

The core of your agent's state is a vector store that stores individual memories.
The agent assigns ingested memories a normalized importance score via LLM,
and also keeps track of when each memory was added and last accessed.

Here's an example trace of what this looks like:

https://smith.langchain.com/public/7eeed3e6-9c1c-41c1-a5bf-90ac63050671/r

On certain thresholds, the agent will also reflect on its memories, extracting the most important themes and attempting to draw insights from its experiences.
It will then add these synthesized insights as new memories, reinforcing the agent's most important traits.
This attempts to simulate the similar human subconscious process.

Here's an example trace of adding a memory that triggers a reflection step:

https://smith.langchain.com/public/67516985-b2e2-47ba-a3e2-e585f49be50e/r

### Generating responses

When responding to inputs, your agent performs a few tasks. Roughly, it:
1. Creates an overview of its current state based on its most relevant memories and recent observations (or uses a cached value).
2. Extracts the most relevant entity from the input.
3. Extracts the relevant action the entity is doing.
4. Attempts to determine the relationship between the agent's persona and the entity.
5. Uses the current state and the retrieved information to formulate a response.

Here's an example trace of what this looks like:

https://smith.langchain.com/public/fb33a0eb-34a0-49c0-b55c-726068f55fb1/r

The agent will also store inputs and the generated responses as memories which can be referenced later.
For example, asking the agent to react to `News that a hostile alien invasion is approaching Earth` may make the agent more stressed or worried in
its future responses.

## Other tips

Try to keep individual journal entries relatively brief and limit them to the most impactful moments. Include your reactions to them and how they made you feel.
