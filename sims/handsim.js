// usage: node handsim.js <normal|crazy> <level> <games>  -> one JSON line per game
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','eggbog.html'),'utf8');
const m=html.match(/\/\/ ==ENGINE==([\s\S]*?)\/\/ ==END ENGINE==/);
const mod={exports:{}};new Function('module',m[1]+'\nmodule.exports={newGame,act,actor,cpuChoose,cardVal,F};')(mod);
const {newGame,act,actor,cpuChoose,cardVal,F}=mod.exports;
const [mode,L,N]=[process.argv[2],process.argv[3],+process.argv[4]];
const sum=h=>h.reduce((n,c)=>n+cardVal(c),0);
for(let g=0;g<N;g++){
  const s=newGame(null,{crazy:mode==='crazy'});
  const dealt=[sum(s.p[0].hand),sum(s.p[1].hand)];
  const jk=[s.p[0].hand.filter(c=>c.r==='JK').length,s.p[1].hand.filter(c=>c.r==='JK').length];
  let steps=0,first=null;
  while(s.phase!=='over'&&steps<5000){steps++;const w=actor(s);
    if(first===null&&s.turn!==null&&s.turn!==undefined&&s.phase!=='start'&&s.phase!=='mulligan')first=s.turn;
    const e=act(s,w,cpuChoose(s,w,L));if(e)throw new Error(e);}
  if(s.phase!=='over')continue;
  const st=s.stats.start;
  console.log(JSON.stringify({dealt,kept:[sum(st[0]),sum(st[1])],n:[st[0].length,st[1].length],jk,first,w:s.winner,r:s.round}));
}
