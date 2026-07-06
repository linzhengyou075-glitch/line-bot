const line=require('@line/bot-sdk');
const {load,save,log}=require('./store');
const {getLevel,title}=require('./levels');
const {profileFlex,helpFlex}=require('./flex');
const config={channelAccessToken:process.env.CHANNEL_ACCESS_TOKEN,channelSecret:process.env.CHANNEL_SECRET};
const client=new line.Client(config);
function today(){return new Date().toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'});}
function now(){return Date.now();}
function uid(event){return event.source.userId || event.source.groupId || 'unknown';}
function getUser(db,id){if(!db.users[id]) db.users[id]={id,name:'蕉友',exp:0,coins:0,signDays:0,streak:0,lastSign:'',chatCount:0,inventory:[],bio:'',photoUrl:'',pokemonCode:'',lastChatAt:0,lastText:''}; return db.users[id];}
function isAdmin(db,id){return db.admins.some(a=>a.id===id);}
function reply(token,msg){return client.replyMessage(token, typeof msg==='string'?{type:'text',text:msg}:msg);}
function addExp(user,exp,coins){const old=getLevel(user.exp||0); user.exp=(user.exp||0)+exp; user.coins=(user.coins||0)+coins; const lv=getLevel(user.exp); user.title=user.title||title(lv); return {old,lv};}
async function handleEvent(event){const db=load();
 if(event.type==='follow'){return reply(event.replyToken, db.settings.welcome);}
 if(event.type!=='message') return;
 const id=uid(event); const user=getUser(db,id);
 if(db.blacklist[id]) return;
 if(db.muted[id] && db.muted[id]>Date.now()) return;
 const type=event.message.type; let text= type==='text' ? event.message.text.trim() : '';
 if(type==='text' && db.keywords[text]) return reply(event.replyToken, db.keywords[text]);
 if(type==='text' && /(https?:\/\/|line\.me|discord\.gg|t\.me)/i.test(text) && !isAdmin(db,id)){log(db,'ad_block',{id,text}); save(db); return reply(event.replyToken,'⚠️ 偵測到疑似廣告連結，已記錄。');}
 if(type!=='text') { const cd=(db.settings.chatCooldownSec||30)*1000; if(now()-user.lastChatAt>cd){addExp(user, type==='image'?3:2, 1); user.lastChatAt=now(); save(db);} return; }
 const parts=text.split(/\s+/);
 if(text==='我的ID') return reply(event.replyToken,`你的 User ID：\n${id}`);
 if(text.startsWith('綁定管理員')){ if(parts[1]===process.env.ADMIN_BIND_CODE || parts[1]===db.settings.adminBindCode){ if(!isAdmin(db,id)) db.admins.push({id,role:'super',createdAt:new Date().toISOString()}); save(db); return reply(event.replyToken,'✅ 已綁定為超級管理員'); } return reply(event.replyToken,'❌ 驗證碼錯誤'); }
 if(text==='指令'||text==='教學'||text==='幫助') return reply(event.replyToken,helpFlex());
 if(text==='群規') return reply(event.replyToken,db.settings.groupRules);
 if(text==='公告') return reply(event.replyToken,db.notices[0]?.text || '目前沒有公告');
 if(text==='我的資料'||text==='名片') return reply(event.replyToken,profileFlex(user,db));
 if(text.startsWith('修改名片 ')){ const field=parts[1]; const val=text.split(/\s+/).slice(2).join(' '); const map={暱稱:'name',自介:'bio',照片:'photoUrl',好友碼:'pokemonCode',Pokemon:'pokemonCode'}; if(!map[field]) return reply(event.replyToken,'可修改：暱稱、自介、照片、好友碼'); user[map[field]]=val; save(db); return reply(event.replyToken,'✅ 名片已更新');}
 if(text==='好友碼') return reply(event.replyToken,user.pokemonCode?`🎮 Pokémon GO 好友碼：${user.pokemonCode}`:'尚未設定，輸入：好友碼 0000 0000 0000');
 if(text.startsWith('好友碼 ')){user.pokemonCode=text.slice(4).trim(); save(db); return reply(event.replyToken,'✅ 好友碼已設定');}
 if(text==='簽到'){ const d=today(); if(user.lastSign===d) return reply(event.replyToken,`今天已簽到 🍌\nEXP：${user.exp}\n香蕉幣：${user.coins}`); user.lastSign=d; user.signDays++; user.streak++; const r=addExp(user,Number(db.settings.dailyExp)||10,Number(db.settings.dailyCoins)||20); save(db); let msg=`🍌 簽到成功！\n+${db.settings.dailyExp} EXP｜+${db.settings.dailyCoins} 香蕉幣\n累積：${user.signDays} 天\nLv.${getLevel(user.exp)}｜${user.exp} EXP`; if(r.lv>r.old) msg+=`\n🎉 升級！Lv.${r.old} ➜ Lv.${r.lv}`; return reply(event.replyToken,msg);}
 if(text==='排行榜'||text==='等級排行'){const rows=Object.values(db.users).sort((a,b)=>b.exp-a.exp).slice(0,10).map((u,i)=>`${i+1}. ${u.name||'蕉友'}｜Lv.${getLevel(u.exp)}｜${u.exp} EXP`).join('\n'); return reply(event.replyToken,rows?`🏆 等級排行榜\n${rows}`:'目前沒有資料');}
 if(text==='聊天排行'){const rows=Object.values(db.users).sort((a,b)=>(b.chatCount||0)-(a.chatCount||0)).slice(0,10).map((u,i)=>`${i+1}. ${u.name||'蕉友'}｜${u.chatCount||0} 則`).join('\n'); return reply(event.replyToken,rows?`💬 聊天排行\n${rows}`:'目前沒有資料');}
 if(text==='香蕉幣排行'){const rows=Object.values(db.users).sort((a,b)=>(b.coins||0)-(a.coins||0)).slice(0,10).map((u,i)=>`${i+1}. ${u.name||'蕉友'}｜${u.coins||0} 幣`).join('\n'); return reply(event.replyToken,rows?`🍌 香蕉幣排行\n${rows}`:'目前沒有資料');}
 if(text==='商店'){ const rows=db.shop.length?db.shop.filter(i=>i.enabled!==false).map((i,n)=>`${n+1}. [${i.category}] ${i.name}｜${i.price} 幣`).join('\n'):'補簽卡｜100 幣\n彩虹稱號｜300 幣\nVIP 7天｜1500 幣\n遠距團戰券｜300 幣'; return reply(event.replyToken,`🎁 香蕉幣商店\n${rows}\n\n輸入：購買 商品名稱`);}
 if(text.startsWith('購買 ')){const name=text.slice(3).trim(); let item=db.shop.find(i=>i.name===name&&i.enabled!==false); if(!item){const defaults={'補簽卡':100,'彩虹稱號':300,'VIP 7天':1500,'遠距團戰券':300}; if(defaults[name]) item={name,price:defaults[name],category:'預設'};} if(!item) return reply(event.replyToken,'找不到商品'); if((user.coins||0)<item.price) return reply(event.replyToken,'香蕉幣不足'); user.coins-=item.price; user.inventory.push({name:item.name,time:new Date().toISOString()}); save(db); return reply(event.replyToken,`✅ 已購買 ${item.name}`);}
 if(text==='我的背包'){return reply(event.replyToken,user.inventory.length?`🎒 我的背包\n${user.inventory.map((i,n)=>`${n+1}. ${i.name}`).join('\n')}`:'背包是空的');}
 if(text==='社群日') return reply(event.replyToken,`🎮 社群日\n${db.pokemon.communityDay}`);
 if(text==='團體戰') return reply(event.replyToken,`⚔️ 團體戰\n${db.pokemon.raids}`);
 if(text==='兌換碼'||text==='最新兌換碼') return reply(event.replyToken,`🎟️ 兌換碼\n${db.pokemon.codes}`);
 if(text.startsWith('/')){ if(!isAdmin(db,id)) return reply(event.replyToken,'❌ 你不是管理員');
  if(text.startsWith('/公告 ')){db.notices.unshift({text:text.slice(4),time:new Date().toISOString()}); save(db); return reply(event.replyToken,'✅ 公告已發布');}
  if(text.startsWith('/群規 ')){db.settings.groupRules=text.slice(4); save(db); return reply(event.replyToken,'✅ 群規已更新');}
  if(text.startsWith('/黑名單 ')){db.blacklist[parts[1]]={reason:parts.slice(2).join(' ')||'未填寫',time:new Date().toISOString()}; save(db); return reply(event.replyToken,'✅ 已加入黑名單');}
  if(text.startsWith('/解除黑名單 ')){delete db.blacklist[parts[1]]; save(db); return reply(event.replyToken,'✅ 已解除黑名單');}
  if(text.startsWith('/禁言 ')){const mins=Number(parts[2])||60; db.muted[parts[1]]=Date.now()+mins*60000; save(db); return reply(event.replyToken,`✅ 已 Bot 層級禁言 ${mins} 分鐘`);}
  if(text.startsWith('/新增管理員 ')){if(!db.admins.some(a=>a.id===parts[1])) db.admins.push({id:parts[1],role:parts[2]||'admin'}); save(db); return reply(event.replyToken,'✅ 已新增管理員');}
  if(text.startsWith('/移除管理員 ')){db.admins=db.admins.filter(a=>a.id!==parts[1]); save(db); return reply(event.replyToken,'✅ 已移除管理員');}
  if(text.startsWith('/關鍵字 ')){ const m=text.match(/^\/關鍵字\s+(\S+)\s+([\s\S]+)/); if(!m) return reply(event.replyToken,'格式：/關鍵字 關鍵字 回覆內容'); db.keywords[m[1]]=m[2]; save(db); return reply(event.replyToken,'✅ 關鍵字已設定');}
 }
 const cd=(db.settings.chatCooldownSec||30)*1000; if(now()-user.lastChatAt>cd && user.lastText!==text){ user.chatCount++; user.lastChatAt=now(); user.lastText=text; addExp(user,Number(db.settings.chatExp)||2,Number(db.settings.chatCoins)||1); save(db); }
}
module.exports={config,handleEvent,client};
