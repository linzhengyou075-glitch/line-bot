function getLevel(exp=0){ return Math.max(0, Math.min(100, Math.floor(exp/100))); }
function nextExp(level){ return Math.min(100, level+1)*100; }
function title(level){
 const titles=['初生蕉芽','新手蕉友','香蕉旅人','彩虹學徒','星光冒險家','黃金守護者','鑽石蕉友','彩虹騎士','星河旅者','創世傳說','至尊蕉王'];
 return titles[Math.min(10, Math.floor(level/10))];
}
function badgeUrl(level, db){
 const custom = db.settings && db.settings.badges && db.settings.badges[level];
 return custom || db.settings.defaultBadgeUrl || 'https://dummyimage.com/1024x1024/f7d54a/333.png&text=Lv.'+level;
}
module.exports={getLevel,nextExp,title,badgeUrl};
