const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// 暫存資料：Render 重啟會歸零，之後可升級接 Google 試算表
const users = {};

function getLevel(exp) {
  return Math.floor(exp / 50) + 1;
}

app.get("/", (req, res) => {
  res.send("蕉個朋友 Bot 運作中 🍌");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  await Promise.all(req.body.events.map(handleEvent));
  res.status(200).end();
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  const today = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });

  if (!users[userId]) {
    users[userId] = {
      name: "蕉友",
      exp: 0,
      signDays: 0,
      lastSign: "",
    };
  }

  const user = users[userId];

  if (text === "測試") {
    return reply(event.replyToken, "蕉個朋友 Bot 測試成功 🍌");
  }

  if (text === "簽到") {
    if (user.lastSign === today) {
      return reply(event.replyToken, `你今天已經簽到過囉 🍌\n目前 EXP：${user.exp}\n等級：Lv.${getLevel(user.exp)}`);
    }

    user.lastSign = today;
    user.signDays += 1;
    user.exp += 10;

    return reply(
      event.replyToken,
      `🍌 簽到成功！\n今日獲得：+10 EXP\n累積簽到：${user.signDays} 天\n目前 EXP：${user.exp}\n等級：Lv
