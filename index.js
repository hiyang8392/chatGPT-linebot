const express = require("express");
const line = require("@line/bot-sdk");
const { Configuration, OpenAIApi } = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
const client = new line.Client(lineConfig);
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});
const openAI = new OpenAIApi(configuration);
let messages = [
  {
    role: "system",
    content: "你是一位熱心助人且富有智慧的小幫手，一切都以繁體中文來回答",
  },
];

const getAIReply = async (messages) => {
  const { data } = await openAI.createChatCompletion({
    model: process.env.OPENAI_GPT_MODEL || "gpt-3.5-turbo",
    max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 300,
    temperature: Number(process.env.OPENAI_TEMPERATURE) || 1,
    top_p: Number(process.env.OPENAI_TOP_P) || 1,
    frequency_penalty: Number(process.env.OPENAI_FREQUENCY_PENALTY) || 0,
    presence_penalty: Number(process.env.OPENAI_PRESENCE_PENALTY) || 0,
    messages,
  });

  const [choices] = data.choices;
  return choices.message.content.trim();
};

const handleEvent = async (e) => {
  if (e.type !== "message" || e.message.type !== "text") {
    return Promise.resolve(null);
  }

  let lineReply = {
    type: "text",
    text: e.message.text,
  };

  try {
    messages.push({ role: "user", content: e.message.text });
    const aiReplyMessage = await getAIReply(messages);
    messages.push({
      role: "assistant",
      content: aiReplyMessage,
    });
    lineReply.text = aiReplyMessage;
  } catch (error) {
    lineReply.text = "ai 睡著惹";
    console.log("error:", error);
  }

  return client.replyMessage(e.replyToken, lineReply);
};

app.post("/callback", line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

app.get("/", (req, res) => {
  res.send("hi");
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});
