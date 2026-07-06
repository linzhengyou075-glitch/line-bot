const express = require("express");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

app.get("/", (req, res) => {
  res.status(200).send("LINE Bot is running");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  res.status(200).end();

  const events = req.body.events || [];
  for (const event of events) {
    handleEvent(event).catch((err) => console.error(err));
  }
});

async function handleEvent(event) {
  if (event.type === "follow") {
    return reply(event.replyToken, "歡迎加入〔蕉〕個朋友吧！🍌\n輸入「測試」可以測試 Bot。\n輸入「簽到」可以每日簽到。");
  }

  if (event.type !== "message" || event.message.type !== "text") {
    return;
  }

  const text = event.message.text.trim();

  if (text === "測試") {
    return reply(event.replyToken, "蕉個朋友 Bot 測試成功 🍌");
  }

  if (text === "簽到") {
    return reply(event.replyToken, "簽到成功！今日獲得 10 EXP 🍌\n目前版本：測試版");
  }

  if (text === "排行榜") {
    return reply(event.replyToken, "🏆 排行榜功能準備中\n下一版會接 Google 試算表紀錄簽到資料。");
  }

  if (text === "群規") {
    return reply(event.replyToken, "🍌〔蕉〕個朋友吧！群規\n1. 尊重彼此\n2. 禁止騷擾與洗版\n3. 不任意叫出他人名片\n4. 開心交朋友");
  }
}

function reply(replyToken, text) {
  return client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot running on port ${port}`);
});
