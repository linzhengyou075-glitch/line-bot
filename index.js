const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

if (!config.channelAccessToken) throw new Error("Missing CHANNEL_ACCESS_TOKEN");
if (!config.channelSecret) throw new Error("Missing CHANNEL_SECRET");

const client = new line.Client(config);

// 注意：這版資料存在 Render 記憶體，重啟會歸零。穩定後再接 Google 試算表永久保存。
const users = {};
const cooldown = {};

const TITLES = [
  "香蕉新手", "蕉友見習生", "活躍蕉友", "聊天小達人", "彩虹冒險家",
  "星光蕉友", "群組守護者", "蕉圈名人", "永恆彩虹守護者", "蕉個傳說"
];

function taipeiDate() {
  return new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
}

function nowMs() {
  return Date.now();
}

function levelFromExp(exp) {
  return Math.min(100, Math.floor(exp / 50) + 1);
}

function nextLevelExp(exp) {
  const lv = levelFromExp(exp);
  return lv * 50;
}

function titleFromLevel(level) {
  const index = Math.min(TITLES.length - 1, Math.floor((level - 1) / 10));
  return TITLES[index];
}

function getUser(id) {
  if (!users[id]) {
    users[id] = {
      id,
      name: "蕉友",
      exp: 0,
      coins: 0,
      signDays: 0,
      streak: 0,
      lastSign: "",
      chatCount: 0,
      imageCount: 0,
      stickerCount: 0,
      lastText: "",
    };
  }
  return users[id];
}

async function getDisplayName(event) {
  try {
    if (event.source.type === "user") {
      const profile = await client.getProfile(event.source.userId);
      return profile.displayName || "蕉友";
    }
    if (event.source.type === "group") {
      const profile = await client.getGroupMemberProfile(event.source.groupId, event.source.userId);
      return profile.displayName || "蕉友";
    }
  } catch (e) {}
  return "蕉友";
}

function addExp(user, amount) {
  const oldLevel = levelFromExp(user.exp);
  user.exp += amount;
  const newLevel = levelFromExp(user.exp);
  return newLevel > oldLevel ? newLevel : 0;
}

function canGain(userId, type, seconds) {
  const key = `${userId}:${type}`;
  const last = cooldown[key] || 0;
  if (nowMs() - last < seconds * 1000) return false;
  cooldown[key] = nowMs();
  return true;
}

function reply(token, text) {
  return client.replyMessage(token, { type: "text", text });
}

function rankingBy(field, title) {
  const rows = Object.values(users)
    .sort((a, b) => b[field] - a[field])
    .slice(0, 10)
    .map((u, i) => `${i + 1}. ${u.name}｜Lv.${levelFromExp(u.exp)}｜${field === "coins" ? u.coins + " 幣" : u.exp + " EXP"}`)
    .join("\n");
  return rows ? `${title}\n\n${rows}` : "目前還沒有排行榜資料 🍌";
}

function profileText(user) {
  const lv = levelFromExp(user.exp);
  return `🍌〔蕉〕個朋友吧！\n\n👤 暱稱：${user.name}\n👑 Lv.${lv}「${titleFromLevel(lv)}」\n⭐ EXP：${user.exp} / ${nextLevelExp(user.exp)}\n💬 聊天：${user.chatCount} 則\n🍌 總簽到：${user.signDays} 天\n🔥 連續簽到：${user.streak} 天\n💰 香蕉幣：${user.coins}`;
}

app.get("/", (req, res) => {
  res.status(200).send("🍌〔蕉〕個朋友吧！Bot v2 運作中");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(200).end();
  }
});

async function handleEvent(event) {
  if (event.type === "follow") {
    return reply(event.replyToken, "歡迎加入〔蕉〕個朋友吧！🍌\n輸入「指令」查看功能。");
  }

  if (event.type === "join") {
    return reply(event.replyToken, "大家好～我是〔蕉〕個朋友吧！Bot 🍌\n輸入「指令」查看功能。");
  }

  if (event.type !== "message") return;

  const userId = event.source.userId || "unknown";
  const user = getUser(userId);
  user.name = await getDisplayName(event);

  const msg = event.message;

  if (msg.type === "sticker") {
    if (canGain(userId, "sticker", 30)) {
      user.stickerCount += 1;
      user.coins += 1;
      addExp(user, 2);
    }
    return;
  }

  if (msg.type === "image") {
    if (canGain(userId, "image", 30)) {
      user.imageCount += 1;
      user.coins += 2;
      addExp(user, 3);
    }
    return;
  }

  if (msg.type !== "text") return;

  const text = msg.text.trim();

  if (text === "指令") {
    return reply(event.replyToken, "🍌 可用指令\n\n簽到\n我的資料\n排行榜\n聊天排行\n香蕉幣排行\n測試");
  }

  if (text === "測試") {
    return reply(event.replyToken, "蕉個朋友 Bot 測試成功 🍌");
  }

  if (text === "簽到") {
    const today = taipeiDate();

    if (user.lastSign === today) {
      return reply(event.replyToken, `你今天已經簽到過囉 🍌\n\n${profileText(user)}`);
    }

    user.lastSign = today;
    user.signDays += 1;
    user.streak += 1;
    user.coins += 20;

    const levelUp = addExp(user, 10 + 5);
    let textReply = `🍌 簽到成功！\n\n今日獲得：+15 EXP\n💰 香蕉幣：+20\n🔥 連續簽到：${user.streak} 天\n\n${profileText(user)}`;

    if (levelUp) {
      textReply += `\n\n🎉 恭喜升到 Lv.${levelUp}「${titleFromLevel(levelUp)}」！`;
    }

    return reply(event.replyToken, textReply);
  }

  if (text === "我的資料" || text === "我的等級") {
    return reply(event.replyToken, profileText(user));
  }

  if (text === "排行榜") {
    return reply(event.replyToken, rankingBy("exp", "🏆 EXP 排行榜"));
  }

  if (text === "聊天排行") {
    const rows = Object.values(users)
      .sort((a, b) => b.chatCount - a.chatCount)
      .slice(0, 10)
      .map((u, i) => `${i + 1}. ${u.name}｜${u.chatCount} 則`)
      .join("\n");
    return reply(event.replyToken, rows ? `💬 聊天排行榜\n\n${rows}` : "目前還沒有聊天排行資料 🍌");
  }

  if (text === "香蕉幣排行") {
    return reply(event.replyToken, rankingBy("coins", "💰 香蕉幣排行榜"));
  }

  // 一般聊天加 EXP，防洗頻：30 秒一次，相同內容不加分
  if (text !== user.lastText && canGain(userId, "chat", 30)) {
    user.chatCount += 1;
    user.coins += 1;
    const levelUp = addExp(user, 2);
    user.lastText = text;

    if (levelUp) {
      return reply(event.replyToken, `🎉 恭喜 ${user.name} 升到 Lv.${levelUp}「${titleFromLevel(levelUp)}」！🌈🍌`);
    }
  }
}

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`蕉個朋友 Bot v2 running on port ${port}`);
});
