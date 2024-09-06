"use client";
import { useState } from "react";
import { Box, Stack, Button } from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let result = "";
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  return (
    <div className="container">
      <div className="chat-main">
        <h1>Rate My Prof</h1>

        <Stack
          direction={"column"}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          className="chats"
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
              display="flex"
            >
              <Box
                bgcolor={message.role === "assistant" ? "#697565" : "#ECDFCC"}
                color={message.role === "assistant" ? "white" : "#697565"}
                borderRadius={2.5}
                p={2}
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>

        <div className="text">
          <input
            type="text"
            placeholder="Enter Your Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></input>
          <button onClick={sendMessage}>Send</button>
        </div>
        </div>
      </div>
  );
}
