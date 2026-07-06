const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');
const DEFAULT_DB = {
  users:{}, admins:[], blacklist:{}, muted:{}, logs:[], keywords:{}, shop:[], notices:[], settings:{
    groupRules:'🍌〔蕉〕個朋友吧！群規\n1. 尊重彼此\n2. 禁止廣告與洗版\n3. 不任意叫出他人名片\n4. 請友善互動',
    welcome:'歡迎加入〔蕉〕個朋友吧！🍌\n輸入「指令」查看功能。',
    dailyExp:10, dailyCoins:20, chatExp:2, chatCoins:1, chatCooldownSec:30,
    adminPassword:'banana123', adminBindCode:'banana2026'
  },
  pokemon:{communityDay:'尚未設定社群日資訊', raids:'尚未設定團體戰資訊', codes:'目前沒有兌換碼'},
  commandHelp:null
};
function ensure(){ if(!fs.existsSync(DB_PATH)){ fs.mkdirSync(path.dirname(DB_PATH), {recursive:true}); fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB,null,2)); }}
function load(){ ensure(); return JSON.parse(fs.readFileSync(DB_PATH,'utf8')); }
function save(db){ fs.writeFileSync(DB_PATH, JSON.stringify(db,null,2)); }
function log(db, action, detail){ db.logs.unshift({time:new Date().toISOString(), action, detail}); db.logs=db.logs.slice(0,300); }
module.exports = {load, save, log};
