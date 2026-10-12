// usage: node firstsim.js <normal|crazy> <level> <games> <variant>
// variants: base | plus1_r1 | plus1_all | free_all
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','eggbog.html'),'utf8');
const html2=process.argv[5]==='high_first'?html.replace('starter=lower(c0,c1)?0:1','starter=lower(c0,c1)?1:0'):html;
const m=html2.match(/\/\/ ==ENGINE==([\s\S]*?)\/\/ ==END ENGINE==/);
const mod={exports:{}};new Function('module',m[1]+'\nmodule.exports={newGame,act,actor,cpuChoose,drawTo,draw,settle,fillDeck};')(mod);
const {newGame,act,actor,cpuChoose,drawTo,draw,settle,fillDeck}=mod.exports;
const [mode,L,N,V]=[process.argv[2],process.argv[3],+process.argv[4],process.argv[5]];
let fw=0,games=0,startWins=0,starts=0,rounds=0;
for(let g=0;g<N;g++){
  const FX=process.argv[6]; const s=newGame(null,{crazy:mode==='crazy',fx:FX===undefined?undefined:(FX==='none'?[]:FX.split(','))});
  let steps=0,done={},first=null,roundStarter={};
  while(s.phase!=='over'&&steps<5000){steps++;const w=actor(s);
    const e=act(s,w,cpuChoose(s,w,L));if(e)throw new Error(e);
    if(s.phase==='play'&&s.turn!=null&&!done[s.round]&&!s.startCards[0]&&!s.startCards[1]){
      done[s.round]=1;const st=s.turn;roundStarter[s.round]=st;if(first===null)first=st;
      const apply=V==='plus1_all'||(V==='plus1_r1'&&s.round===1);
      if(apply){if(!s.deck.length)fillDeck(s);drawTo(s,st,1);}
      if(V.startsWith('egghand')&&s.round===1){const ev=+(V.slice(7)||1);s.p[st].hand.push({id:'EGG',r:'A',s:'CSHD'[Math.floor(Math.random()*4)],f:'',v:ev});}
      if(V.startsWith('token')&&s.round===1){const v=+V.slice(5);s.p[st].field.push({id:'TOK',r:'T',s:'C',f:'',v});settle(s);}
      if(V==='free_all'||(V==='free_r1'&&s.round===1)){if(!s.deck.length)fillDeck(s);const c=draw(s);if(c){c.f='';s.p[st].field.push(c);settle(s);}}
    }
  }
  if(s.phase!=='over')continue;
  games++;if(s.winner===first)fw++;
}
console.log(JSON.stringify({mode,L,V,fx:process.argv[6]||'default',games,firstWin:(100*fw/games).toFixed(1)}));
