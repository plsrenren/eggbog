// Computer-vs-computer simulations for Eggbog.
// usage: node sim.js <normal|crazy> <levelA> <levelB> <games> <offset>   (run from anywhere; reads ../eggbog.html)
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','eggbog.html'),'utf8');
const m=html.match(/\/\/ ==ENGINE==([\s\S]*?)\/\/ ==END ENGINE==/);
const mod={exports:{}};new Function('module',m[1]+'\nmodule.exports={newGame,act,actor,cpuChoose};')(mod);
const {newGame,act,actor,cpuChoose}=mod.exports;
const [mode,A,B,N,OFF]=[process.argv[2],process.argv[3],process.argv[4],+process.argv[5],+(process.argv[6]||0)];
const out={mode,A,B,games:0,winsA:0,stuck:0,byCards:0,byRounds:0,rounds:0,
  concedes:{[A]:0,[B]:0},concedeGames:0,shuffles:0,shuffleGames:0,
  fullBurns:{A:0,B:0},fullBurnEvents:0,fullBurnGames:0,steps:0,
  fx:{},dm:0,concByRound:{1:0,2:0,3:0}};   // fx[effect] = {plays, gamesPlayed, gamesWon}  (per player-game)
for(let g=0;g<N;g++){
  const aSeat=(g+OFF)%2;   // alternate seats
  const lv=i=>i===aSeat?A:B;
  const s=newGame(null,{crazy:mode==='crazy'});
  const played=[{},{}];let steps=0,conc=0,fbg=0;
  while(s.phase!=='over'&&steps<5000){
    steps++;
    const w=actor(s),a=cpuChoose(s,w,lv(w));
    let eff=null;
    if(a.t==='play'){const c=s.p[w].hand.find(x=>x.id===a.id)||s.startCards[w];if(c)eff=c.f||'plain';}
    const ln=s.logN||0,rnd=s.round;
    const e=act(s,w,a);if(e)throw new Error('illegal: '+e);
    if(eff)played[w][eff]=(played[w][eff]||0)+1;
    if(a.t==='concede'){out.concedes[lv(w)]++;conc++;out.concByRound[rnd]=(out.concByRound[rnd]||0)+1;}
    const fresh=s.log.slice(-Math.min(s.log.length,(s.logN||0)-ln));
    let ev=0;for(const x of fresh)if(/has a full hand/.test(x.m)){out.fullBurns[x.p===aSeat?'A':'B']++;ev=1;}
    out.fullBurnEvents+=ev;fbg+=ev;
  }
  if(s.phase!=='over'){out.stuck++;continue;}
  out.games++;out.steps+=steps;
  if(s.winner===aSeat)out.winsA++;
  if(s.over==='cards')out.byCards++;else out.byRounds++;
  out.rounds+=s.round;if(s.round>=3)out.dm++;
  if(conc)out.concedeGames++;
  out.shuffles+=s.reshuffles||0;if(s.reshuffles)out.shuffleGames++;
  if(fbg)out.fullBurnGames++;
  for(const i of [0,1])for(const [f,n] of Object.entries(played[i])){
    const r=out.fx[f]||(out.fx[f]={plays:0,games:0,won:0});r.plays+=n;r.games++;if(s.winner===i)r.won++;
  }
}
console.log(JSON.stringify(out));
