'use client'

import { useChat } from 'ai/react'
import { useState } from 'react';

export default function Chat() {

  const [interactionType, setInteractionType] = useState("say");
  const [speaker, setSpeaker] = useState("Interviewer");

  const { messages, input, setInput, handleInputChange, handleSubmit, isLoading } = useChat({
    body: {
      interaction_type: interactionType ?? "say",
      speaker
    }
  });

  const changeInteractionType = (e) => {
    if (e.target.value === "current_status") {
      setInput("Analysis.");
    }
    setInteractionType(e.target.value);
  };

  const handleSubmitWrapper = (e) => {
    e.preventDefault();
    if (isLoading) {
      return;
    }
    if (interactionType === "current_status") {
      setInteractionType("say");
    }
    handleSubmit(e);
  }

  return (
    <div className="mx-auto w-full px-48 py-24 flex flex-col stretch">
      {messages.map(m => (
        <div key={m.id}>
          {m.role === 'user' ? 'User: ' : ''}
          {m.content}
        </div>
      ))}

      <form className="flex flex-col" onSubmit={handleSubmitWrapper}>
        <div className="flex items-center my-8">
          <select className="mr-4" onChange={changeInteractionType} value={interactionType}>
            <option value="current_status">Current status</option>
            <option value="react">React to</option>
            <option value="say">Say</option>
          </select>
          <label className={interactionType === "say" ? "" : "hidden"}>
            <input
              className="w-full max-w-md bottom-0 border border-gray-300 rounded shadow-xl p-2"
              value={speaker}
              onChange={(e) => setSpeaker(e.target.value)}
            />
          </label>
        </div>
        <div className="flex items-center">
          <label className="mr-4 grow">
            <input
              className="w-full bottom-0 border border-gray-300 rounded shadow-xl p-2"
              value={input}
              onChange={handleInputChange}
              placeholder={interactionType === "say" ? "How do you feel about..." : "You receive a call from an unknown number saying you've won the lottery. The caller is asking for your bank account number."}
            />
          </label>
          <div role="status" className={isLoading ? "" : "hidden"}>
            <svg aria-hidden="true" className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
          <button className={(isLoading ? "hidden " : "") + "border-gray-300 bg-gray-500 padding px-4 py-2 rounded"} type="submit">Send</button>
        </div>
      </form>
    </div>
  )
}