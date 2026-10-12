// Totals results/*.json into results.md
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'results');
const R=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>fs.readFileSync(path.join(dir,f),'utf8').trim()).filter(Boolean).map(JSON.parse);
const L=['easy','normal','hard','expert'],NAME={easy:'Easy',normal:'Normal',hard:'Hard',expert:'Expert'};
const FXN={A:'Draw',2:'Deathrattle',3:'Discover',4:'Sturdy',5:'Swap',J:'Cleave',Q:'Purge',K:'Wipe',M:'Mirror',T:'Steal',L:'Last stand',G:'Greed',X:'Joker',plain:'No effect'};
const pct=x=>(100*x).toFixed(0)+'%',f1=x=>x.toFixed(2);
let md='# Eggbog simulation results\n\nComputer vs computer, using the game engine as of '+new Date().toISOString().slice(0,10)+'. Seats alternate every game. Expert uses its normal in-game thinking time.\n\n';
const MODES=(process.argv[2]||'normal,crazy').split(',');
for(const mode of MODES){
  const rs=R.filter(r=>r.mode===mode);
  // merge by pair
  const pair={};
  for(const r of rs){const k=r.A+'|'+r.B;const p=pair[k]||(pair[k]={A:r.A,B:r.B,games:0,winsA:0});p.games+=r.games;p.winsA+=r.winsA;}
  const get=(a,b)=>{if(a===b)return null;const p=pair[a+'|'+b];if(p)return {w:p.winsA,n:p.games};const q=pair[b+'|'+a];if(q)return {w:q.games-q.winsA,n:q.games};return null;};
  md+=`## ${mode==='normal'?'Normal mode':'Crazy mode'}\n\n### Win rate of the row level against the column level\n\n| | ${L.map(l=>NAME[l]).join(' | ')} |\n|---|${L.map(()=>'---').join('|')}|\n`;
  for(const a of L){md+=`| **${NAME[a]}** | `+L.map(b=>{if(a===b){const p=pair[a+'|'+a];return p?`(${p.games} mirror games)`:'–';}const g=get(a,b);if(!g)return '–';const p=g.w/g.n,ci=1.96*Math.sqrt(p*(1-p)/g.n);return `${pct(p)} ±${(100*ci).toFixed(0)} (${g.n})`;}).join(' | ')+' |\n';}
  md+='\nEach cell: win rate, 95% margin, (games played).\n\n';
  const T=rs.reduce((t,r)=>{t.games+=r.games;t.rounds+=r.rounds;t.byCards+=r.byCards;t.byRounds+=r.byRounds;t.cg+=r.concedeGames;t.sh+=r.shuffles;t.shg+=r.shuffleGames;t.fb+=r.fullBurns.A+r.fullBurns.B;t.fbe+=r.fullBurnEvents;t.fbg+=r.fullBurnGames;t.stuck+=r.stuck;t.steps+=r.steps;t.dm+=r.dm||0;for(const [k,n] of Object.entries(r.concByRound||{}))t.cbr[k]=(t.cbr[k]||0)+n;
    for(const [l,n] of Object.entries(r.concedes)){t.conc[l]=(t.conc[l]||0)+n;}
    t.lg[r.A]=(t.lg[r.A]||0)+r.games;t.lg[r.B]=(t.lg[r.B]||0)+r.games;return t;},{games:0,rounds:0,byCards:0,byRounds:0,cg:0,sh:0,shg:0,fb:0,fbe:0,fbg:0,stuck:0,steps:0,conc:{},lg:{},dm:0,cbr:{}});
  const conc=Object.values(T.conc).reduce((a,b)=>a+b,0);
  md+=`### How games go (all ${T.games} games)\n\n`+
  `- Games end by a player running out of cards: ${pct(T.byCards/T.games)}. By winning 2 rounds: ${pct(T.byRounds/T.games)}.\n`+
  `- Games that reached round 3 (the death match): ${pct(T.dm/T.games)}.\n`+
  `- Concedes by round: `+[1,2,3].map(k=>`round ${k}: ${T.cbr[k]||0}`).join(', ')+'.\n'+
  `- Average rounds per game: ${f1(T.rounds/T.games)}. Average moves per game: ${(T.steps/T.games).toFixed(0)}.\n`+
  `- Concedes: ${f1(conc/T.games)} per game; at least one in ${pct(T.cg/T.games)} of games.\n`+
  `- Concedes per game by level (a level counted once per game it played in): `+L.filter(l=>T.lg[l]).map(l=>`${NAME[l]} ${f1((T.conc[l]||0)/T.lg[l])}`).join(', ')+'.\n'+
  `- Deck reshuffles: ${f1(T.sh/T.games)} per game; in ${pct(T.shg/T.games)} of games.\n`+
  `- Full-hand burns: ${f1(T.fb/T.games)} cards per game; at least one in ${pct(T.fbg/T.games)} of games.\n`+
  (T.stuck?`- ${T.stuck} games did not finish within 5000 moves and are left out.\n`:'')+'\n';
  // effects, same-level games only
  const fx={};let mg=0;
  for(const r of rs.filter(r=>r.A===r.B)){mg+=r.games;for(const [k,v] of Object.entries(r.fx)){const o=fx[k]||(fx[k]={plays:0,games:0,won:0});o.plays+=v.plays;o.games+=v.games;o.won+=v.won;}}
  md+=`### Effects (from the ${mg} games where both sides were the same level)\n\n| Effect | Plays per game | Games a player used it | Win rate of that player |\n|---|---|---|---|\n`;
  for(const [k,v] of Object.entries(fx).sort((a,b)=>b[1].won/b[1].games-a[1].won/a[1].games))
    md+=`| ${FXN[k]||k} | ${f1(v.plays/mg)} | ${pct(v.games/(2*mg))} | ${pct(v.won/v.games)} |\n`;
  md+='\n';
}
md+='Win rate for an effect is how often a player who played that effect at least once went on to win. It shows association, not cause: effects that are played late or by the player who is behind can look weaker than they are.\n';
fs.writeFileSync(path.join(__dirname,'results.md'),md);console.log(md);
