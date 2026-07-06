const express = require('express');
const line = require('@line/bot-sdk');

const app = express();
const config = { channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN, channelSecret: process.env.CHANNEL_SECRET };
const client = new line.Client(config);

// ====== 簡易資料庫：Render 重啟會歸零。正式版可再接 Google Sheets / DB ======
const users = {};      // userId -> data
const cards = {};      // userId -> card text
const keywords = {};   // keyword -> reply
const shop = {
  '彩虹稱號': { cost: 100, type: 'title', value: '🌈 彩虹蕉友' },
  '寶可夢訓練家': { cost: 120, type: 'title', value: '🎮 寶可夢訓練家' },
  '蕉王徽章': { cost: 200, type: 'badge', value: '👑 蕉王徽章' }
};
const dailyTask = '今日任務：聊天 5 次 + 簽到 1 次 🍌';
const bannedWords = ['詐騙', '外掛交易'];
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);

function isAdmin(event){ return ADMIN_IDS.includes(event.source.userId); }
function nowDate(){ return new Date().toLocaleDateString('zh-TW', {timeZone:'Asia/Taipei'}); }
function level(exp){ return Math.floor(exp / 100) + 1; }
function needExp(exp){ return level(exp) * 100; }
function titleOf(lv){
  const titles = ['新手蕉友','活躍蕉友','星光蕉友','彩虹冒險家','群組守護者','永恆彩虹守護者'];
  return titles[Math.min(Math.floor((lv-1)/10), titles.length-1)];
}
function getUser(id){
  if(!users[id]) users[id] = {name:'蕉友', exp:0, coins:0, signDays:0, streak:0, lastSign:'', lastChatAt:0, lastText:'', chatCount:0, imageCount:0, stickerCount:0, title:'新手蕉友', badges:[]};
  return users[id];
}
async function reply(token, text){ return client.replyMessage(token, {type:'text', text: String(text).slice(0,4900)}); }
async function push(to, text){ return client.pushMessage(to, {type:'text', text: String(text).slice(0,4900)}); }
function rankBy(field){
  return Object.entries(users).sort((a,b)=>b[1][field]-a[1][field]).slice(0,10).map(([,u],i)=>`${i+1}. ${u.name}｜Lv.${level(u.exp)}｜${field==='coins'?u.coins+' 幣':u.exp+' EXP'}`).join('\n') || '目前沒有資料 🍌';
}
function addExp(user, amount){ const before = level(user.exp); user.exp += amount; user.title = titleOf(level(user.exp)); return level(user.exp) > before; }

app.get('/', (req,res)=>res.send('🍌〔蕉〕個朋友吧！Bot Full running'));
app.post('/webhook', line.middleware(config), async (req,res)=>{
  res.status(200).end();
  for(const ev of req.body.events || []) handleEvent(ev).catch(console.error);
});

async function handleEvent(event){
  if(event.type === 'follow') return reply(event.replyToken, '歡迎加入〔蕉〕個朋友吧！🍌\n輸入「指令」查看功能。');
  if(event.type === 'join') return reply(event.replyToken, '大家好，我是〔蕉〕個朋友吧！Bot 🍌\n輸入「指令」查看功能。');
  if(event.type !== 'message') return;

  const id = event.source.userId || event.source.groupId || 'unknown';
  const user = getUser(id);
  const msg = event.message;
  const text = msg.type === 'text' ? msg.text.trim() : '';

  // 非文字經驗
  if(msg.type === 'image') { user.imageCount++; addExp(user,3); user.coins+=1; return; }
  if(msg.type === 'sticker') { user.stickerCount++; addExp(user,2); return; }
  if(msg.type === 'location') { addExp(user,5); user.coins+=2; return; }

  // 禁詞提醒
  if(text && bannedWords.some(w => text.includes(w))) return reply(event.replyToken, '⚠️ 請注意群組規範，避免敏感或違規內容。');

  // 關鍵字自動回覆
  if(keywords[text]) return reply(event.replyToken, keywords[text]);

  // 聊天 EXP：30秒冷卻 + 重複內容不加
  const ts = Date.now();
  if(text && !text.startsWith('/') && text !== user.lastText && ts - user.lastChatAt > 30000){
    user.chatCount++; user.lastChatAt = ts; user.lastText = text; user.coins += (user.chatCount % 10 === 0 ? 5 : 0);
    const up = addExp(user, 2);
    if(up && event.source.groupId) await push(event.source.groupId, `🎉 恭喜 ${user.name} 升到 Lv.${level(user.exp)}「${user.title}」！🍌`);
  }

  if(text === '指令') return reply(event.replyToken, `🍌 指令列表\n簽到｜我的資料｜排行榜｜聊天排行｜香蕉幣排行\n名片｜設定名片 內容｜群規｜今日任務｜商店｜兌換 商品名\n抽獎 文字｜Pokemon Go｜社群日｜團體戰\n管理員：/公告 內容｜/加EXP 數字｜/送幣 數字｜/關鍵字 關鍵字=回覆`);
  if(text === '測試') return reply(event.replyToken, '蕉個朋友 Bot 測試成功 🍌');
  if(text === '群規') return reply(event.replyToken, '📜 群規\n1. 尊重彼此\n2. 禁止騷擾與洗頻\n3. 不任意叫他人名片\n4. Pokémon GO 活動請依規定報名\n5. 違規者管理員可處理');
  if(text === '今日任務') return reply(event.replyToken, dailyTask);

  if(text === '簽到'){
    const d = nowDate();
    if(user.lastSign === d) return reply(event.replyToken, `你今天已經簽到過囉 🍌\nLv.${level(user.exp)}｜EXP ${user.exp}/${needExp(user.exp)}｜香蕉幣 ${user.coins}`);
    user.lastSign = d; user.signDays++; user.streak++; user.coins += 20;
    const bonus = user.streak >= 3 ? 5 : 0;
    const up = addExp(user, 10 + bonus);
    return reply(event.replyToken, `🍌 簽到成功！\nEXP +${10+bonus}\n🔥 連續簽到：${user.streak} 天\n💰 香蕉幣 +20\n👑 Lv.${level(user.exp)}「${user.title}」${up?'\n🎉 升級了！':''}`);
  }

  if(['我的資料','等級','我的等級'].includes(text)) return reply(event.replyToken, `🍌 我的資料\n👤 ${user.name}\n👑 Lv.${level(user.exp)}「${user.title}」\n⭐ EXP：${user.exp}/${needExp(user.exp)}\n💬 聊天：${user.chatCount}\n🍌 簽到：${user.signDays} 天\n🔥 連續：${user.streak} 天\n💰 香蕉幣：${user.coins}\n🏅 徽章：${user.badges.join('、') || '無'}`);
  if(text === '排行榜') return reply(event.replyToken, `🏆 EXP 排行榜\n${rankBy('exp')}`);
  if(text === '聊天排行') return reply(event.replyToken, `💬 聊天排行榜\n${Object.entries(users).sort((a,b)=>b[1].chatCount-a[1].chatCount).slice(0,10).map(([,u],i)=>`${i+1}. ${u.name}｜${u.chatCount} 則`).join('\n') || '目前沒有資料'}`);
  if(text === '香蕉幣排行') return reply(event.replyToken, `💰 香蕉幣排行榜\n${rankBy('coins')}`);

  if(text === '名片') return reply(event.replyToken, cards[id] || '你還沒有名片，輸入：設定名片 你的內容');
  if(text.startsWith('設定名片 ')){ cards[id] = text.replace('設定名片 ','').slice(0,500); return reply(event.replyToken, '✅ 名片設定完成'); }

  if(text === '商店') return reply(event.replyToken, '🛒 香蕉幣商店\n' + Object.entries(shop).map(([k,v])=>`${k}｜${v.cost} 幣`).join('\n') + '\n輸入：兌換 商品名');
  if(text.startsWith('兌換 ')){
    const item = text.replace('兌換 ','').trim(); const p = shop[item];
    if(!p) return reply(event.replyToken, '找不到這個商品，輸入「商店」查看。');
    if(user.coins < p.cost) return reply(event.replyToken, `香蕉幣不足，需要 ${p.cost}，你目前 ${user.coins}。`);
    user.coins -= p.cost;
    if(p.type==='title') user.title = p.value; else user.badges.push(p.value);
    return reply(event.replyToken, `✅ 兌換成功：${item}\n剩餘香蕉幣：${user.coins}`);
  }

  if(text === 'Pokemon Go' || text === 'Pokémon GO') return reply(event.replyToken, '🎮 Pokémon GO 專區\n可輸入：社群日｜團體戰｜活動｜極巨');
  if(text === '社群日') return reply(event.replyToken, '📢 社群日資訊可由管理員用 /公告 更新。');
  if(text === '團體戰') return reply(event.replyToken, '⚔️ 團體戰集合：請管理員發布時間與地點。');
  if(text === '極巨') return reply(event.replyToken, '🌟 極巨戰資訊：請留意群公告。');
  if(text === '活動') return reply(event.replyToken, '🎉 近期活動請看群公告，或輸入 Pokémon GO。');

  // 管理員
  if(text.startsWith('/')){
    if(!isAdmin(event)) return reply(event.replyToken, '此指令限管理員使用。');
    if(text.startsWith('/公告 ')) return reply(event.replyToken, `📢 群組公告\n${text.replace('/公告 ','')}`);
    if(text.startsWith('/加EXP ')){ const n = parseInt(text.replace('/加EXP ',''),10)||0; addExp(user,n); return reply(event.replyToken, `已加 EXP：${n}`); }
    if(text.startsWith('/送幣 ')){ const n = parseInt(text.replace('/送幣 ',''),10)||0; user.coins += n; return reply(event.replyToken, `已送香蕉幣：${n}`); }
    if(text.startsWith('/關鍵字 ')){ const body=text.replace('/關鍵字 ',''); const [k,...rest]=body.split('='); keywords[k.trim()] = rest.join('=').trim(); return reply(event.replyToken, `✅ 關鍵字已新增：${k.trim()}`); }
  }
}

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`蕉個朋友 Bot full running on port ${port}`));
