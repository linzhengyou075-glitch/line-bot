const {getLevel,nextExp,title,badgeUrl}=require('./levels');
function profileFlex(user, db){
 const lv=getLevel(user.exp); const img=badgeUrl(lv, db);
 return {type:'flex',altText:`Lv.${lv} 會員名片`,contents:{type:'bubble',hero:{type:'image',url:img,size:'full',aspectRatio:'1:1',aspectMode:'cover'},body:{type:'box',layout:'vertical',contents:[
  {type:'text',text:'🍌〔蕉〕個朋友吧！',weight:'bold',size:'lg'},
  {type:'text',text:`👤 ${user.name||'蕉友'}`,margin:'md'},
  {type:'text',text:`🏅 Lv.${lv}｜${user.title||title(lv)}`,weight:'bold',size:'xl',margin:'md'},
  {type:'text',text:`⭐ EXP：${user.exp||0} / ${nextExp(lv)}`,margin:'sm'},
  {type:'text',text:`🍌 香蕉幣：${user.coins||0}`,margin:'sm'},
  {type:'text',text:`✅ 簽到：${user.signDays||0} 天｜🔥 連續：${user.streak||0} 天`,margin:'sm'},
  {type:'text',text:`💬 聊天：${user.chatCount||0} 則`,margin:'sm'},
  {type:'separator',margin:'md'},
  {type:'text',text:`🎮 ${user.pokemonCode||'尚未設定 Pokémon GO 好友碼'}`,wrap:true,margin:'md'},
  {type:'text',text:`💬 ${user.bio||'尚未設定自介'}`,wrap:true,margin:'sm'}
 ]}}};
}
function helpFlex(){return {type:'flex',altText:'指令教學',contents:{type:'bubble',body:{type:'box',layout:'vertical',contents:[
 {type:'text',text:'📖 指令教學',weight:'bold',size:'xl'},
 {type:'text',text:'👤 個人：簽到、我的資料、名片、我的背包、修改名片 欄位 內容',wrap:true,margin:'md'},
 {type:'text',text:'🏆 排行：排行榜、聊天排行、香蕉幣排行',wrap:true,margin:'sm'},
 {type:'text',text:'🎁 商店：商店、購買 商品名稱、我的背包',wrap:true,margin:'sm'},
 {type:'text',text:'🎮 Pokémon GO：社群日、團體戰、兌換碼、好友碼 你的代碼',wrap:true,margin:'sm'},
 {type:'text',text:'📜 群組：群規、公告',wrap:true,margin:'sm'},
 {type:'text',text:'🛡 管理員：我的ID、綁定管理員 驗證碼、/公告、/黑名單、/禁言、/關鍵字',wrap:true,margin:'sm'}
]}}};}
module.exports={profileFlex,helpFlex};
