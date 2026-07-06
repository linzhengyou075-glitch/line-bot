const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const users = {};

function today() {
  return new Date().toLocaleDateString("zh-TW", {
    timeZone: "Asia/Taipei",
  });
}

function getLevel(exp) {
  return Math.floor(exp / 50) + 1;
}

function getUser(userId) {
  if (!users[userId]) {
    users[userId] = {
      name: "蕉友",
      exp: 0,
      signDays: 0,
      lastSign: "",
    };
  }
  return users[userId];
}

function reply(token, text) {
  return client.replyMessage(token, {
    type: "text",
    text,
  });
}

app.get("/", (req, res) => {
  res.status(200).send("蕉個朋友 Bot 運作中 🍌");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).
