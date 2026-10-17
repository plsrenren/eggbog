const fs=require('fs');
const html=fs.readFileSync('eggbog.html','utf8');
const m=html.match(/\/\/ ==ENGINE==([\s\S]*?)\/\/ ==END ENGINE==/);
const src=m[1]+'\nmodule.exports={newGame,act,viewFor,actor,total,cardVal,mkDeck,startRound,settle,cpuChoose,fillDeck,F,resolveStart};';
const mod={exports:{}};new Function('module',src)(mod);
const {newGame,act,viewFor,actor,total,cardVal,mkDeck}=mod.exports;
const assert=require('assert');
let n=0;const t=(name,fn)=>{fn();n++;console.log('ok -',name);};
const C=(r,s)=>({id:r+s,r,s});

function drawFor(s,who){const e=act(s,who,{t:'draw'});assert.equal(e,null,'draw failed: '+e);}
function setup(p0hand,p1hand,f0,f1,deck){
  const s=newGame();
  s.phase='play';s.turn=0;s.first=false;s.pending=null;
  s.p[0].hand=p0hand;s.p[1].hand=p1hand;s.p[0].field=f0||[];s.p[1].field=f1||[];
  s.deck=deck||[C('9','D'),C('8','D'),C('7','D'),C('6','D')];s.discard=[];
  return s;
}

t('values',()=>{assert.equal(cardVal(C('A','S')),1);assert.equal(cardVal(C('10','S')),10);
  for(const r of ['J','Q','K'])assert.equal(cardVal(C(r,'H')),1);});

t('turn ends when strictly greater; tie keeps playing',()=>{
  const s=setup([C('6','C'),C('7','C')],[C('8','S')],[],[C('6','H')]);
  assert.equal(act(s,0,{t:'play',id:'6C'}),null);
  assert.equal(s.turn,0,'tie -> must keep playing');
  assert.equal(act(s,0,{t:'play',id:'7C'}),null);
  assert.equal(s.turn,1);
});

t('cannot play out of turn',()=>{
  const s=setup([C('5','C')],[C('3','S')]);
  assert.ok(act(s,1,{t:'play',id:'3S'}));
});

t('out of cards and not ahead ends game',()=>{
  const s=setup([C('2','C')],[C('3','S')],[],[C('9','H')]);
  act(s,0,{t:'play',id:'2C'});
  assert.equal(s.phase,'over');assert.equal(s.winner,1);assert.equal(s.over,'cards');
});

t('ace draws',()=>{
  const s=setup([C('A','C')],[C('3','S')],[],[C('9','H')]);
  act(s,0,{t:'play',id:'AC'});
  assert.equal(s.p[0].hand.length,0,'not drawn until the player takes it');
  assert.equal(s.drawQ.length,1);assert.ok(act(s,1,{t:'draw'}),'opponent cannot take it');
  assert.ok(act(s,0,{t:'concede'}),'cannot act while a draw is owed');
  drawFor(s,0);
  assert.equal(s.p[0].hand.length,1);assert.equal(s.p[0].hand[0].id,'6D');
});

t('Jack cleaves: top card of its suit and of the other suit of the same colour',()=>{
  const s=setup([C('J','H')],[C('3','S')],[],[C('2','H'),C('6','H'),C('7','D'),C('9','D'),C('8','S'),C('5','C')]);
  act(s,0,{t:'play',id:'JH'});
  const ids=s.p[1].field.map(c=>c.id).sort().join();
  assert.equal(ids,['2H','7D','8S','5C'].sort().join(),'top heart and top diamond removed, black cards untouched');
  const s2=setup([C('J','C')],[C('3','S')],[],[C('2','C'),C('8','S'),C('6','S'),C('9','H')]);
  act(s2,0,{t:'play',id:'JC'});
  assert.equal(s2.p[1].field.map(c=>c.id).sort().join(),['8S','9H'].sort().join(),'the club and the top spade (6S) are gone');
});
t('deathrattle on removal by Jack',()=>{
  const s=setup([C('J','S')],[C('3','S')],[],[C('2','S'),C('9','H')]);
  act(s,0,{t:'play',id:'JS'});
  assert.equal(s.p[1].field.some(c=>c.id==='2S'),false);
  assert.equal(s.drawQ.length,1);assert.equal(s.drawQ[0].who,1);drawFor(s,1);
  assert.equal(s.p[1].hand.length,2,'owner drew');
});

t('jack removes the top card of the suit; a Sturdy 4 on top blocks it',()=>{
  const s=setup([C('J','S')],[],[],[C('2','S'),C('7','S'),C('4','S')]);
  assert.equal(act(s,0,{t:'play',id:'JS'}),null);
  assert.equal(s.pending,null);
  assert.deepEqual(s.p[1].field.map(c=>c.id),['2S','7S','4S'],'the Sturdy 4 on top blocks the Cleave for spades');
  const s2=setup([C('J','S')],[],[],[C('2','S'),C('4','S'),C('7','S')]);
  act(s2,0,{t:'play',id:'JS'});
  assert.deepEqual(s2.p[1].field.map(c=>c.id),['2S','4S'],'a Sturdy 4 under the top card does not block it');
});

t('queen purges all of suit but not 4',()=>{
  const s=setup([C('Q','H')],[],[],[C('2','H'),C('7','H'),C('4','H'),C('9','S')]);
  act(s,0,{t:'play',id:'QH'});
  assert.deepEqual(s.p[1].field.map(c=>c.id).sort(),['4H','9S']);
  drawFor(s,1);assert.equal(s.p[1].hand.length,1,'deathrattle drew');
});

t('king wipes both sides except king and 4s',()=>{
  const s=setup([C('K','C'),C('5','D')],[],[C('2','C'),C('8','C')],[C('4','D'),C('9','S'),C('2','H')]);
  act(s,0,{t:'play',id:'KC'});
  assert.deepEqual(s.p[0].field.map(c=>c.id),['KC']);
  assert.deepEqual(s.p[1].field.map(c=>c.id),['4D']);
  assert.equal(s.drawQ.length,2);drawFor(s,0);drawFor(s,1);
  assert.equal(s.p[0].hand.length,2,'my 2 deathrattled (5D + draw)');
  assert.equal(s.p[1].hand.length,1);
});

t('sturdy 4 survives purge/removal',()=>{
  const s=setup([C('Q','S')],[],[],[C('4','S')]);
  act(s,0,{t:'play',id:'QS'});
  assert.equal(s.p[1].field.length,1);
});

t('swap with matching suit exchanges most recent of that suit',()=>{
  const s=setup([C('5','H'),C('9','C')],[],[],[C('3','H'),C('8','H'),C('9','S')]);
  act(s,0,{t:'play',id:'5H'});
  assert.ok(s.p[0].field.some(c=>c.id==='8H'));assert.ok(!s.p[1].field.some(c=>c.id==='8H'));
  assert.ok(s.p[1].field.some(c=>c.id==='5H'));assert.ok(!s.p[0].field.some(c=>c.id==='5H'));
});

t('swap with no match gifts the 5',()=>{
  const s=setup([C('5','H'),C('9','C')],[],[],[C('9','S')]);
  act(s,0,{t:'play',id:'5H'});
  assert.equal(s.p[0].field.length,0);assert.equal(s.p[1].field.length,2);
});

t('discover: you keep one, a random other goes to the opponent, the last burns',()=>{
  for(let g=0;g<30;g++){
    const s=setup([C('3','C')],[C('2','S')],[],[C('9','H')]);
    act(s,0,{t:'play',id:'3C'});
    assert.equal(s.pending.t,'discover');assert.equal(s.pending.chooser,0,'the player who played it chooses');
    assert.ok(act(s,0,{t:'pick',id:'6D'}),'cannot pick before opening');
    assert.ok(act(s,1,{t:'draw'}),'the opponent cannot open it');
    drawFor(s,0);assert.equal(s.pending.opts.length,3,'all three turn up at once');
    assert.ok(act(s,0,{t:'draw'}),'only once');
    assert.equal(viewFor(s,1).pending.opts,undefined,'the opponent cannot see the options');
    assert.equal(viewFor(s,0).pending.opts.length,3);
    assert.ok(act(s,1,{t:'pick',id:'6D'}),'only the chooser picks');
    const ids=s.pending.opts.map(c=>c.id),keep=ids[g%3];
    assert.equal(act(s,0,{t:'pick',id:keep}),null);
    assert.equal(s.p[0].hand.some(c=>c.id===keep),true,'kept card is mine');
    assert.equal(s.p[0].hand.length,1,'3C played, one kept');
    assert.equal(s.p[1].hand.length,2,'the opponent received one');
    const gift=s.p[1].hand.find(c=>ids.includes(c.id));assert.ok(gift&&gift.id!==keep,'the gift is one of the other two');
    assert.equal(s.discard.length,1);assert.ok(ids.includes(s.discard[0].id)&&s.discard[0].id!==keep&&s.discard[0].id!==gift.id,'the last one burned');
    assert.equal(viewFor(s,1).discover.kept,null,'the opponent does not see what was kept');
    assert.equal(viewFor(s,0).discover.kept.id,keep);assert.equal(viewFor(s,1).discover.gift.id,gift.id);
  }
});

t('empty deck: draw does nothing',()=>{
  const s=setup([C('A','C')],[C('3','S')],[],[C('9','H')],[]);
  act(s,0,{t:'play',id:'AC'});
  assert.equal(s.p[0].hand.length,0);
});

t('concede -> loser chooses starter; fields cleared; only one concede per player',()=>{
  const s=setup([C('2','C'),C('3','C')],[C('3','S'),C('4','S')],[C('5','C')],[C('9','H')]);
  assert.equal(act(s,0,{t:'concede'}),null);
  assert.equal(s.p[1].wins,1);assert.equal(s.phase,'choose');assert.equal(s.chooser,0);
  assert.equal(s.p[0].field.length+s.p[1].field.length,0);
  drawFor(s,1);
  assert.equal(act(s,0,{t:'choose',who:1}),null);assert.equal(s.turn,1);assert.equal(s.phase,'play');
  s.p[1].hand.push(C('7','S'));
  assert.equal(act(s,1,{t:'play',id:'7S'}),null);
  assert.ok(act(s,0,{t:'concede'}),'a second concede is refused');
  assert.equal(s.phase,'play');assert.equal(s.p[1].wins,1);
  assert.equal(viewFor(s,0).me.conceded,true);assert.equal(viewFor(s,1).me.conceded,false);
  for(const lvl of ['easy','normal','hard','expert'])for(let k=0;k<30;k++)assert.notEqual(mod.exports.cpuChoose(s,0,lvl).t,'concede',lvl+' conceded twice');
});

t('mulligan then round 1 start: lowest card decides who goes first, and both cards go to hand',()=>{
  const s=newGame();
  assert.equal(s.p[0].hand.length,10);
  act(s,0,{t:'mulligan',ids:s.p[0].hand.slice(0,5).map(c=>c.id)});
  assert.ok(act(s,0,{t:'mulligan',ids:[]}),'cannot mulligan twice');
  assert.equal(s.p[0].hand.length,10);
  act(s,1,{t:'mulligan',ids:[]});
  assert.equal(s.phase,'start');assert.equal(s.drawQ.length,2);
  assert.ok(act(s,0,{t:'play',id:s.p[0].hand[0].id}));
  drawFor(s,0);assert.equal(s.phase,'start');assert.ok(viewFor(s,0).startMe);assert.equal(viewFor(s,1).startMe,null);
  drawFor(s,1);
  assert.equal(s.phase,'play');
  assert.equal(s.startCards[0]||s.startCards[1],null,'start cards resolved');
  assert.equal(s.p[0].field.length+s.p[1].field.length,0,'nothing is auto-played');
  const st=s.turn;assert.ok(st===0||st===1);assert.equal(s.startReveal.starter,st);
  assert.equal(s.p[st].hand.length,12,'starter: drawn card + the Egg');assert.equal(s.p[1-st].hand.length,11,'both drawn cards went to hand');
  const egg=s.p[st].hand.find(c=>c.r==='EG');assert.ok(egg,'starter gets the Egg');assert.equal(cardVal(egg),5,'Normal-mode Egg is worth 5');
  assert.ok(!s.p[1-st].hand.some(c=>c.r==='EG'),'only the starter gets an Egg');
});

t('mulligan max 5',()=>{
  const s=newGame();assert.ok(act(s,0,{t:'mulligan',ids:s.p[0].hand.slice(0,6).map(c=>c.id)}));
});

// random full-game simulations
function zones(s){
  const ids=[];
  s.deck.forEach(c=>ids.push(c.id));s.discard.forEach(c=>ids.push(c.id));
  for(const p of s.p){p.hand.forEach(c=>ids.push(c.id));p.field.forEach(c=>ids.push(c.id));}
  if(s.pending&&s.pending.t==='discover')s.pending.opts.forEach(c=>ids.push(c.id));
  s.startCards.forEach(c=>{if(c)ids.push(c.id);});
  (s.jokerQ||[]).forEach(e=>ids.push(e.c.id));
  (s.gone||[]).forEach(c=>ids.push(c.id));   // a Joker with nothing to draw leaves the game
  return ids.filter(id=>id!=='EGG');   // the Egg is an extra card outside the deck
}
t('2000 random games: terminate, conserve 52 unique cards',()=>{
  let over=0,byCards=0,byRounds=0;
  for(let g=0;g<2000;g++){
    const s=newGame();let steps=0;
    while(s.phase!=='over'){
      if(++steps>4000)throw new Error('did not terminate');
      const who=actor(s);let a;
      if(s.phase==='mulligan'){const h=s.p[who].hand;const k=Math.floor(Math.random()*6);a={t:'mulligan',ids:h.slice(0,k).map(c=>c.id)};}
      else if(s.drawQ.length||(s.pending&&s.pending.t==='discover'&&!s.pending.opts.length&&s.deck.length))a={t:'draw'};
      else if(s.phase==='choose')a={t:'choose',who:Math.random()<.5?0:1};
      else if(s.pending&&s.pending.jk)a={t:'jkpick'};
      else if(s.pending){const o=s.pending.opts;const x=o[Math.floor(Math.random()*o.length)];a={t:'pick',id:typeof x==='string'?x:x.id};}
      else{const h=s.p[who].hand;if(s.round<3&&!s.p[who].conceded&&!s.firstTurn&&(h.length===0||Math.random()<.04))a={t:'concede'};else{const c=h[Math.floor(Math.random()*h.length)];a={t:'play',id:c.id};if(c.r==='EG')a.suit='CSHD'[Math.floor(Math.random()*4)];}}
      const err=act(s,who,a);
      if(err)throw new Error('unexpected error '+err+' '+JSON.stringify(a)+' phase '+s.phase);
      const ids=zones(s);
      if(ids.length!==52||new Set(ids).size!==52)throw new Error('card conservation broken: '+ids.length);
    }
    over++;if(s.over==='cards')byCards++;else byRounds++;
  }
  console.log('   finished',over,'games; ended by cards:',byCards,'by rounds:',byRounds);
});
t('2000 computer-vs-computer games (all three levels): policy never makes an illegal move',()=>{
  const {cpuChoose}=mod.exports;let over=0;
  for(let g=0;g<2000;g++){
    const s=newGame();let steps=0;
    while(s.phase!=='over'){
      if(++steps>4000)throw new Error('did not terminate');
      const who=actor(s);
      // the CPU needs to act whenever the engine is waiting on this seat (mulligan is simultaneous)
      const err=act(s,who,cpuChoose(s,who,['easy','normal','hard'][g%3]));
      if(err)throw new Error('CPU illegal move: '+err+' phase '+s.phase+' level '+['easy','normal','hard'][g%3]);
    }
    over++;
  }
  console.log('   finished',over,'CPU games');
});
t('Expert computer: 25 full games, never an illegal move (fast settings)',()=>{
  const {cpuChoose}=mod.exports;
  for(let g=0;g<25;g++){
    const s=newGame();let steps=0;
    while(s.phase!=='over'){
      if(++steps>4000)throw new Error('did not terminate');
      const who=actor(s);
      const err=act(s,who,cpuChoose(s,who,g%2?'expert':'hard'));
      if(err)throw new Error('expert illegal: '+err+' phase '+s.phase);
    }
  }
});
t('Crazy mode: every rank has an effect, and the deck reshuffles discards when drawn out',()=>{
  const {cpuChoose}=mod.exports;
  let reshuf=0,seenKinds=new Set();
  for(let g=0;g<600;g++){
    const s=newGame(null,{crazy:true});
    const all0=s.deck.concat(s.p[0].hand,s.p[1].hand);
    if(new Set(all0.map(c=>c.f)).size<5)throw new Error('effects not random enough');
    const aces=new Set(all0.filter(c=>c.r==='A').map(c=>c.f));if(g===0)seenKinds.add(aces.size);
    if(s.deck.some(c=>!c.f))throw new Error('card without an effect');
    const v=viewFor(s,0);if(!v.crazy)throw new Error('view lacks crazy info');
    let steps=0;const total0=54;
    while(s.phase!=='over'){
      if(++steps>6000)throw new Error('crazy game did not terminate');
      const who=actor(s);
      const err=act(s,who,cpuChoose(s,who,['easy','normal','hard'][g%3]));
      if(err)throw new Error('crazy illegal: '+err+' '+s.phase);
      const all=s.deck.length+s.discard.length+s.p[0].hand.length+s.p[1].hand.length+s.p[0].field.length+s.p[1].field.length+s.drawQ.length*0+((s.pending&&s.pending.opts)?s.pending.opts.length:0)+(s.startCards[0]?1:0)+(s.startCards[1]?1:0);
      if(all>total0+1)throw new Error('cards duplicated: '+all);   // +1: the Egg
    }
    reshuf+=s.reshuffles;
  }
  let varied=0;for(let g=0;g<200;g++){const s=newGame(null,{crazy:true});if(new Set(s.deck.concat(s.p[0].hand,s.p[1].hand).filter(c=>c.r==='A').map(c=>c.f)).size>1)varied++;}
  if(varied<190)throw new Error('aces do not differ between cards');
  if(!reshuf)throw new Error('deck never reshuffled in 600 crazy games');
  console.log('   reshuffles seen:',reshuf);
});
t('Normal mode never reshuffles and keeps the standard effects',()=>{
  const s=newGame();if(s.crazy||s.fm)throw new Error('should not be crazy');
  const m={};for(const c of s.deck.concat(s.p[0].hand,s.p[1].hand))m[c.r]=c.f;
  if(m['7']!==''||m.K!=='K'||m['4']!=='4'||s.fm)throw new Error('wrong default effects');
});
const X=(r,s,f)=>({id:r+s,r,s,f});
t('Mimic copies the previous card\'s effect (Removal, then Draw), and nothing when there is none',()=>{
  // Jack-effect card played first, then a Mirror of the same suit removes the next same-suit card
  const s=setup([X('7','S','J'),X('9','S','M')],[C('3','C')],[],[C('5','S'),C('6','S'),C('10','H'),C('10','D')]);
  s.crazy=true;
  act(s,0,{t:'play',id:'7S'});assert.equal(s.p[1].field.length,3,'first removal');
  act(s,0,{t:'play',id:'9S'});assert.equal(s.p[1].field.length,2,'mirror removed the next card');
  const s2=setup([X('9','S','M')],[C('3','C')],[],[C('5','S')]);
  act(s2,0,{t:'play',id:'9S'});assert.equal(s2.p[1].field.length,1,'nothing to copy');
  const s3=setup([X('4','H','A'),X('9','S','M')],[C('3','C')],[],[C('9','D')]);
  act(s3,0,{t:'play',id:'4H'});drawFor(s3,0);
  act(s3,0,{t:'play',id:'9S'});assert.equal(s3.drawQ.length,1,'mirror copied Draw');
});
t('Steal: the opponent chooses which card to give',()=>{
  const s=setup([X('4','S','T')],[C('2','C'),C('9','H')],[],[C('8','D')]);
  act(s,0,{t:'play',id:'4S'});
  assert.equal(s.pending.t,'steal');assert.equal(actor(s),1);
  assert.ok(act(s,0,{t:'pick',id:'2C'}),'the thief cannot choose');
  assert.ok(act(s,1,{t:'pick',id:'NOPE'}),'must be a card in hand');
  const v1=viewFor(s,1);assert.equal(v1.pending.opts.length,2);
  assert.equal(act(s,1,{t:'pick',id:'9H'}),null);
  assert.equal(s.p[0].hand.some(c=>c.id==='9H'),true);assert.equal(s.p[1].hand.length,1);assert.equal(s.pending,null);
  const s2=setup([X('4','S','T')],[],[],[C('8','D')]);
  act(s2,0,{t:'play',id:'4S'});assert.equal(s2.pending,null,'no cards to steal');
});
t('Steal: a last card is safe',()=>{
  const s=setup([X('4','S','T'),C('2','C')],[C('9','H')],[],[C('8','D')]);
  act(s,0,{t:'play',id:'4S'});
  assert.equal(s.pending,null,'nothing to choose');assert.equal(s.p[1].hand.length,1,'the last card stays');assert.equal(s.p[0].hand.length,1,'nothing burned');
  assert.equal(s.stealSafe.who,1);
});
t('Rune: each one on the field draws two cards on concede',()=>{
  const s=setup([C('2','C')],[C('3','S')],[X('5','H','L'),X('6','D','L')],[C('9','H')],[C('9','H'),C('8','H'),C('7','H'),C('6','H'),C('5','H')]);
  s.crazy=true;
  assert.equal(act(s,0,{t:'concede'}),null);
  assert.equal(s.drawQ.length,5);assert.equal(s.drawQ.filter(e=>e.who===0&&e.reason==='laststand').length,4);assert.equal(s.drawQ[4].who,1);assert.equal(s.drawQ[4].reason,'concede');
  assert.ok(act(s,0,{t:'choose',who:0}),'must draw before choosing');
  drawFor(s,0);drawFor(s,0);drawFor(s,0);drawFor(s,0);assert.equal(s.p[0].hand.length,5);drawFor(s,1);
  const s1=setup([C('2','C')],[C('3','S')],[X('5','H','L'),X('6','D','L')],[C('9','H')],[C('7','H')]);
  s1.crazy=true;act(s1,0,{t:'concede'});assert.equal(s1.drawQ.length,1,'deck of one card: only one draw queued');assert.equal(s1.drawQ[0].reason,'laststand');
  assert.equal(act(s,0,{t:'choose',who:1}),null);
  const s2=setup([C('2','C')],[C('3','S')],[C('5','H')],[C('9','H')]);
  act(s2,0,{t:'concede'});assert.equal(s2.drawQ.filter(e=>e.reason==='laststand').length,0,'no Rune, no Rune draw');
});
t('Greed: while on your field, draw a card whenever the turn passes to you',()=>{
  const s=setup([C('6','C')],[C('10','S'),C('3','H')],[X('4','S','G')],[C('2','D')],[C('9','D'),C('8','D'),C('7','D'),C('6','D'),C('5','D')]);
  assert.equal(act(s,0,{t:'play',id:'6C'}),null);
  assert.equal(s.turn,1);assert.equal(s.drawQ.length,0,'the turn passed to the opponent, who has no Greed');
  assert.equal(act(s,1,{t:'play',id:'10S'}),null);
  assert.equal(s.turn,0);assert.equal(s.drawQ.length,1);assert.ok(s.drawQ.every(e=>e.who===0&&e.reason==='greedturn'));
  const h0=s.p[0].hand.length;assert.equal(act(s,0,{t:'draw'}),null);
  assert.equal(s.p[0].hand.length,h0+1,'drew exactly one card, no burn');assert.equal(s.discard.length,0);
});
t('Greed: nothing on play, two Greeds draw two, none once removed',()=>{
  const s=setup([X('4','S','G'),C('2','C')],[C('2','D')],[],[C('8','D')],[C('9','D'),C('8','D'),C('7','D'),C('6','D'),C('5','D')]);
  act(s,0,{t:'play',id:'4S'});assert.equal(s.drawQ.length,0,'playing Greed draws nothing');
  const g=setup([C('6','C')],[C('10','S')],[X('2','S','G'),X('3','H','G')],[C('2','D')],[C('9','D'),C('8','D'),C('7','D'),C('6','D'),C('5','D')]);
  act(g,0,{t:'play',id:'6C'});act(g,1,{t:'play',id:'10S'});
  assert.equal(g.drawQ.filter(e=>e.who===0).length,2,'each Greed on the field draws');
  const r=setup([C('6','C')],[C('10','S')],[],[C('2','D')],[C('9','D'),C('8','D')]);
  act(r,0,{t:'play',id:'6C'});act(r,1,{t:'play',id:'10S'});assert.equal(r.drawQ.length,0,'no Greed on the field, no draw');
});
t('the four extra effects exist only in Crazy mode',()=>{
  const n=newGame();const kinds=new Set(n.deck.concat(n.p[0].hand,n.p[1].hand).map(c=>c.f));
  for(const k of ['M','T','L','G'])assert.ok(!kinds.has(k),k+' in a normal game');
  const seen=new Set();for(let g=0;g<40;g++){const c=newGame(null,{crazy:true});c.deck.concat(c.p[0].hand,c.p[1].hand).forEach(x=>seen.add(x.f));}
  for(const k of ['M','T','L','G'])assert.ok(seen.has(k),k+' never appears in crazy games');
});
t('Mimic becomes the copied effect on the field (passives too) and turns back when it leaves',()=>{
  // copy Sturdy: cannot be removed by a Jack afterwards
  const s=setup([X('9','S','4'),X('7','H','M')],[X('3','H','J'),C('2','D')],[],[C('10','D'),C('10','C'),C('10','S')]);
  s.turn=0;act(s,0,{t:'play',id:'9S'});act(s,0,{t:'play',id:'7H'});
  const m=s.p[0].field.find(c=>c.id==='7H');assert.equal(m.f,'4','mirror became Sturdy');assert.equal(m.was,'M');
  s.turn=1;s.p[1].field=[C('8','D')];s.p[0].field=s.p[0].field.concat([C('9','D'),C('9','C')]);act(s,1,{t:'play',id:'3H'});
  assert.ok(s.p[0].field.some(c=>c.id==='7H'),'a Sturdy mirror survives a Jack of its suit');
  // copy Deathrattle: owner draws when it is removed; it is a Mirror again in the discard pile
  const s2=setup([X('4','H','2'),X('6','S','M'),C('2','C')],[X('3','S','J')],[],[C('10','D'),C('10','C'),C('10','H')]);
  act(s2,0,{t:'play',id:'4H'});act(s2,0,{t:'play',id:'6S'});
  assert.equal(s2.p[0].field.find(c=>c.id==='6S').f,'2');
  s2.turn=1;act(s2,1,{t:'play',id:'3S'});
  assert.equal(s2.drawQ.length,1,'deathrattle from a mirrored card');assert.equal(s2.drawQ[0].who,0);
  const d=s2.discard.find(c=>c.id==='6S');assert.equal(d.f,'M');assert.equal(d.was,undefined);
  // round end also resets
  const s3=setup([X('4','H','L'),X('6','S','M'),C('2','C')],[C('3','S')],[],[C('10','D'),C('10','C'),C('10','H')]);
  act(s3,0,{t:'play',id:'4H'});act(s3,0,{t:'play',id:'6S'});act(s3,0,{t:'concede'});
  assert.equal(s3.discard.find(c=>c.id==='6S').f,'M');
});
t('Effect settings: switched-off effects disappear in both modes',()=>{
  const s=newGame(null,{crazy:false,fx:['A','3','5','Q','K','2','4']});   // Jack off
  const all=s.deck.concat(s.p[0].hand,s.p[1].hand);
  assert.ok(all.filter(c=>c.r==='J').every(c=>c.f===''),'jacks are plain');
  assert.ok(all.filter(c=>c.r==='K').every(c=>c.f==='K'),'kings keep their effect');
  const j=setup([X('J','S',''),C('3','C')],[C('3','S')],[],[C('2','S'),C('9','H')]);
  act(j,0,{t:'play',id:'JS'});assert.ok(j.p[1].field.some(c=>c.id==='2S'),'a plain Jack removes nothing');
  const c=newGame(null,{crazy:true,fx:['A','G']});
  const ca=c.deck.concat(c.p[0].hand,c.p[1].hand).filter(x=>x.r!=='JK');
  assert.ok(ca.every(x=>x.f==='A'||x.f==='G'),'only enabled crazy effects');
  assert.ok(ca.some(x=>x.f==='A')&&ca.some(x=>x.f==='G'));
  assert.deepEqual(viewFor(c,0).fxOn,['A','G']);
  const d=newGame(null,{crazy:true,fx:['Z']});assert.ok(d.deck.every(x=>x.f),'bad settings fall back to a full pool');
  const n0=newGame(null,{});assert.equal(n0.deck.concat(n0.p[0].hand,n0.p[1].hand).filter(x=>x.f).length,32);
  // rematch-style: settings travel with the state
  assert.deepEqual(newGame(null,{crazy:false,fx:c.fx}).fx,c.fx.filter(k=>['A','2','3','4','5','J','Q','K'].includes(k)));
});

const J=id=>({id,r:'JK',s:'*',f:'X'});
t('Joker: crazy only, 2 in the deck, worth 1, needs a suit',()=>{
  const n=newGame();assert.equal(n.deck.concat(n.p[0].hand,n.p[1].hand).length,52);
  const c=newGame(null,{crazy:true}),all=c.deck.concat(c.p[0].hand,c.p[1].hand);
  assert.equal(all.length,54);assert.equal(all.filter(x=>x.r==='JK').length,2);
  assert.equal(cardVal({r:'JK',s:'*'}),1);
  const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[X('2','H','')]);
  assert.ok(act(s,0,{t:'play',id:'JK1'}),'needs a suit');assert.ok(act(s,0,{t:'play',id:'JK1',suit:'Z'}));
});
t('Joker: draws 5, 3 highest to the player, 2 lowest to the opponent',()=>{
  const deck=[X('2','C',''),X('5','H',''),X('3','S',''),X('8','S',''),X('7','C',''),X('9','D','')];   // pop order from the end
  const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],deck);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'JK1',suit:'H'}),null);
  const mine=s.p[0].field.map(c=>c.id),theirs=s.p[1].field.map(c=>c.id);
  assert.deepEqual(mine.filter(i=>i!=='JK1').sort(),['7C','8S','9D'].sort(),'highest three');
  assert.deepEqual(theirs.sort(),['3S','5H'].sort(),'lowest two');
  assert.ok(!s.p[0].field.some(c=>c.id==='JK1'),'the Joker burns up');assert.ok((s.gone||[]).some(c=>c.id==='JK1'),'a played Joker leaves the game');assert.ok(!s.discard.concat(s.deck).some(c=>c.id==='JK1'));
  assert.equal(total(s,0),7+8+9);assert.equal(total(s,1),3+5);
  assert.equal(s.turn,1,'turn passes once ahead');
  const v=viewFor(s,1);assert.equal(v.joker.hi.length,3);assert.equal(v.joker.lo.length,2);
  assert.notEqual(s.lastFx,'X','Joker is not copied by Mirror');
});
t('Joker: fewer than five cards, shuffle in discards, other joker is shuffled back into the deck',()=>{
  const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],[X('9','D',''),X('4','C','')]);s.crazy=true;
  act(s,0,{t:'play',id:'JK1',suit:'C'});
  assert.ok(s.p[0].field.some(c=>c.id==='9D')&&s.p[0].field.length===2&&s.p[1].field.length===0,'only two cards: both to the player');
  const s2=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],[X('9','D',''),X('2','C',''),X('5','H',''),X('3','S',''),X('8','S',''),X('7','C',''),X('6','D',''),J('JK2')]);s2.crazy=true;
  act(s2,0,{t:'play',id:'JK1',suit:'S'});
  assert.ok(!s2.p[0].hand.some(c=>c.id==='JK2'),'second joker does not go to the hand');
  assert.ok(s2.deck.some(c=>c.id==='JK2'&&c.s==='*'),'second joker is shuffled back into the deck');
  assert.equal(s2.p[0].field.length+s2.p[1].field.length,5,'the other joker does not count toward the five');
  assert.ok(!s2.p[0].field.concat(s2.p[1].field).some(c=>c.r==='JK'));
  const s3=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],[]);s3.crazy=true;s3.discard=[Object.assign(J('JK2'),{s:'D'}),X('9','D',''),X('2','C',''),X('5','H',''),X('3','S',''),X('8','S',''),X('7','C','')];
  act(s3,0,{t:'play',id:'JK1',suit:'S'});
  assert.ok(s3.reshuffles>=1);assert.ok(s3.p[0].hand.concat(s3.deck).find(c=>c.id==='JK2').s==='*','joker suit reset after reshuffle');
});
t('Joker: 400 random crazy games conserve 54 cards (players choose a suit)',()=>{
  for(let g=0;g<400;g++){
    const s=newGame(null,{crazy:true});let steps=0;
    while(s.phase!=='over'){
      if(++steps>6000)throw new Error('did not terminate');
      const who=actor(s);let a;
      if(s.phase==='mulligan')a={t:'mulligan',ids:Math.random()<.5?s.p[who].hand.map(c=>c.id):[]};
      else if(s.drawQ.length||(s.pending&&s.pending.t==='discover'&&!s.pending.opts.length&&s.deck.length))a={t:'draw'};
      else if(s.phase==='choose')a={t:'choose',who:Math.random()<.5?0:1};
      else if(s.pending&&s.pending.jk)a={t:'jkpick'};
      else if(s.pending){const o=s.pending.t==='steal'?s.p[who].hand:s.pending.opts;const x=o[Math.floor(Math.random()*o.length)];a={t:'pick',id:typeof x==='string'?x:x.id};}
      else{const h=s.p[who].hand;if(s.round<3&&!s.p[who].conceded&&!s.firstTurn&&(h.length===0||Math.random()<.04))a={t:'concede'};else{const c=h[Math.floor(Math.random()*h.length)];a={t:'play',id:c.id};if(c.r==='JK'||c.r==='EG')a.suit='CSHD'[Math.floor(Math.random()*4)];}}
      const err=act(s,who,a);
      if(err)throw new Error('unexpected error '+err+' '+JSON.stringify(a));
      const ids=zones(s);
      if(ids.length!==54||new Set(ids).size!==54)throw new Error('conservation broken: '+ids.length);
    }
  }
});

t('Joker: cards are played one at a time and their effects trigger',()=>{
  const mk=paced=>{const deck=[X('2','C',''),X('5','H',''),X('3','S',''),X('8','S',''),X('7','C',''),X('6','D',''),X('4','D',''),X('9','D','A')];
    const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],deck);s.crazy=true;s.paced=paced;return s;};
  // paced: nothing happens until the client steps
  const s=mk(true);act(s,0,{t:'play',id:'JK1',suit:'H'});
  assert.equal(s.jokerQ.length,5);assert.equal(s.p[0].field.length,0);assert.ok(act(s,0,{t:'concede'}),'busy while the Jokers play out');
  assert.equal(act(s,0,{t:'jstep'}),null);assert.equal(s.p[0].field.length,1);assert.equal(s.jokerQ.length,4);
  assert.equal(s.drawQ.length,1,'Draw from the first card (a 9 with Draw)');
  assert.ok(act(s,0,{t:'jstep'}),'cannot step while a draw is owed');
  const before=s.deck.length;act(s,0,{t:'draw'});assert.equal(s.deck.length,before-1);
  while(s.jokerQ.length)assert.equal(act(s,0,{t:'jstep'}),null);
  assert.equal(s.p[0].field.length+s.p[1].field.length,5);
  // unpaced: the same thing runs straight through (after the draw is taken)
  const u=mk(false);act(u,0,{t:'play',id:'JK1',suit:'H'});
  assert.equal(u.jokerQ.length,4,'stops at the Draw');act(u,0,{t:'draw'});
  assert.equal(u.jokerQ.length,0);assert.equal(u.p[0].field.length+u.p[1].field.length,5);
  // a King among the cards wipes what was played before it
  const k=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],[X('2','D',''),X('3','D',''),X('4','D',''),X('2','C',''),X('3','C',''),X('9','S','K')]);k.crazy=true;
  act(k,0,{t:'play',id:'JK1',suit:'D'});
  assert.deepEqual(k.p[0].field.map(c=>c.id),['9S','4D','3D'],'King played first; the later cards land after it');
});

t('Joker: its cards\' Steal and Scry are chosen by the Joker, shown first, then made',()=>{
  const deck=[X('5','C',''),X('6','C',''),X('10','C',''),X('2','C',''),X('3','S',''),X('4','H',''),X('7','C',''),X('8','S','3'),X('9','D','T')];
  const s=setup([J('JK1'),X('3','C','')],[X('2','S',''),X('4','S','')],[],[],deck);s.crazy=true;s.paced=true;
  act(s,0,{t:'play',id:'JK1',suit:'H'});
  act(s,0,{t:'jstep'});   // 9D Steal for the owner: the opponent would give a card, but the Joker picks it
  assert.equal(s.pending.t,'steal');assert.ok(s.pending.jk);
  assert.ok(act(s,1,{t:'pick',id:'2S'}),'the player cannot make the Joker\'s choice');
  assert.deepEqual(mod.exports.cpuChoose(s,1,'hard'),{t:'jkpick'},'the computer leaves it to the Joker');
  assert.equal(act(s,0,{t:'jkpick'}),null);
  const id=s.pending.jkId;assert.ok(['2S','4S'].includes(id),'the pick is shown before it is made');
  assert.equal(viewFor(s,1).pending.jkId,id);assert.ok(viewFor(s,0).pending.jkSet);assert.equal(viewFor(s,0).pending.jkId,undefined);
  assert.equal(act(s,1,{t:'jkpick'}),null);
  assert.equal(s.pending,null);assert.ok(s.p[0].hand.some(c=>c.id===id),'the Joker\'s pick was given');
  act(s,0,{t:'jstep'});   // 3S plain for the opponent
  act(s,0,{t:'jstep'});   // 8S Scry for the owner
  assert.equal(s.pending.t,'discover');assert.ok(s.pending.jk);
  assert.ok(act(s,0,{t:'jkpick'}),'the three cards are turned up first');
  act(s,0,{t:'draw'});assert.equal(s.pending.opts.length,3);
  act(s,0,{t:'jkpick'});const k=s.pending.jkId;assert.ok(s.pending.opts.some(c=>c.id===k));
  assert.ok(act(s,0,{t:'pick',id:k}),'the player cannot pick for the Joker');
  assert.equal(act(s,0,{t:'jkpick'}),null);assert.equal(s.pending,null);assert.equal(s.discFx.kept.id,k);
  // a Steal the player plays from their own hand is still chosen by the player
  const h=setup([X('4','S','T')],[C('2','C'),C('9','D')],[],[C('8','D')]);
  act(h,0,{t:'play',id:'4S'});assert.ok(!h.pending.jk);assert.equal(act(h,1,{t:'pick',id:'2C'}),null);
});
t('Steal: the thief burns a random card from their own hand (never the stolen one)',()=>{
  for(let g=0;g<60;g++){
    const s=setup([X('4','S','T'),C('2','H'),C('3','H'),C('5','H')],[C('2','C'),C('9','D')],[],[C('8','D')]);
    act(s,0,{t:'play',id:'4S'});
    assert.equal(act(s,1,{t:'pick',id:'9D'}),null);
    assert.equal(s.p[0].hand.length,3,'+1 stolen, -1 burned');
    assert.ok(s.p[0].hand.some(c=>c.id==='9D'),'the stolen card is kept');
    assert.equal(s.discard.length,1);assert.ok(['2H','3H','5H'].includes(s.discard[0].id));
    assert.equal(s.burn.who,0);assert.equal(s.burn.cards.length,1);
  }
  const s2=setup([X('4','S','T')],[C('2','C'),C('9','D')],[],[C('8','D')]);
  act(s2,0,{t:'play',id:'4S'});act(s2,1,{t:'pick',id:'2C'});
  assert.equal(s2.p[0].hand.length,1,'with nothing else in hand there is nothing to burn');
});
t('Joker: cards are played in turns, starting with the Joker owner (highest cards for the owner)',()=>{
  const deck=[X('2','C',''),X('3','S',''),X('4','H',''),X('7','C',''),X('8','S',''),X('9','D','')];
  const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[],[],deck);s.crazy=true;s.paced=true;
  act(s,0,{t:'play',id:'JK1',suit:'H'});
  assert.deepEqual(s.jokerQ.map(e=>e.who),[0,1,0,1,0],'alternating, owner first (3 for the owner, 2 for the opponent)');
  assert.deepEqual(s.jokerQ.filter(e=>e.who===0).map(e=>e.c.id),['9D','8S','7C'],'the owner gets the highest three');
  assert.deepEqual(s.jokerQ.filter(e=>e.who===1).map(e=>e.c.id).sort(),['3S','4H']);
  act(s,0,{t:'jstep'});assert.equal(s.p[0].field.length,1);assert.equal(s.p[1].field.length,0);
  act(s,0,{t:'jstep'});assert.equal(s.p[1].field.length,1);
  const o=setup([X('3','C','')],[J('JK2'),X('3','S','')],[],[],[X('2','C',''),X('3','S',''),X('4','H',''),X('7','C',''),X('8','S',''),X('9','D','')]);o.crazy=true;o.paced=true;o.turn=1;
  act(o,1,{t:'play',id:'JK2',suit:'S'});assert.equal(o.jokerQ[0].who,1,'the opponent as Joker owner goes first');
});

t('concede: the other player draws a card (burned if their hand is full)',()=>{
  const s=setup([C('2','C')],[C('3','S')],[C('5','C')],[C('9','H')]);
  assert.equal(act(s,0,{t:'concede'}),null);
  assert.equal(s.drawQ.length,1);assert.equal(s.drawQ[0].who,1);assert.equal(s.drawQ[0].reason,'concede');
  assert.ok(act(s,0,{t:'choose',who:0}),'the draw comes before choosing');
  drawFor(s,1);assert.equal(s.p[1].hand.length,2);
  const f=setup([C('2','C')],Array.from({length:10},(_,k)=>C(String(k+1),'S')),[C('5','C')],[C('9','H')]);
  act(f,0,{t:'concede'});drawFor(f,1);assert.equal(f.p[1].hand.length,10,'full hand: the card burns');assert.equal(f.discard.filter(c=>c.id==='6D').length,1);
  const e=setup([C('2','C')],[C('3','S')],[C('5','C')],[C('9','H')],[]);
  act(e,0,{t:'concede'});assert.equal(e.drawQ.length,0,'empty deck: no draw');assert.equal(e.phase,'choose');
});
t('concede is not allowed on the very first turn',()=>{
  const s=newGame();
  for(const i of [0,1])assert.equal(act(s,i,{t:'mulligan',ids:[]}),null);
  while(s.phase==='start'){const w=s.drawQ[0].who;drawFor(s,w);}
  const st=s.turn;assert.equal(s.phase,'play');assert.equal(s.firstTurn,true);
  assert.ok(act(s,st,{t:'concede'}),'refused on the first turn');
  assert.equal(viewFor(s,st).me.firstTurn,true);
  for(const lvl of ['easy','normal','hard','expert'])for(let k=0;k<20;k++)assert.notEqual(mod.exports.cpuChoose(s,st,lvl).t,'concede',lvl+' conceded on the first turn');
  let g=0;while(s.turn===st&&s.phase==='play'&&g++<50){const a=mod.exports.cpuChoose(s,st,'hard');assert.equal(act(s,st,a),null);while(s.drawQ.length)drawFor(s,s.drawQ[0].who);}
  assert.equal(s.firstTurn,false,'lock ends when the turn passes');
});
t('Rune also works when the opponent concedes',()=>{
  const mk=()=>{const s=setup([C('2','C')],[C('3','S')],[X('5','H','L')],[C('9','H')],[C('9','H'),C('8','H'),C('7','H')]);s.crazy=true;s.turn=1;return s;};
  const s=mk();assert.equal(act(s,1,{t:'concede'}),null);
  assert.equal(s.drawQ.length,3);assert.equal(s.drawQ[0].who,0);assert.equal(s.drawQ[0].reason,'laststand');assert.equal(s.drawQ[2].reason,'concede');
  assert.equal(s.p[0].wins,1);
  const b=setup([C('2','C')],[C('3','S')],[X('5','H','L')],[X('6','D','L'),X('7','C','L')],[C('9','H'),C('8','H'),C('7','H'),C('6','H'),C('5','H'),C('4','H'),C('3','H'),C('2','H')]);b.crazy=true;b.turn=1;
  act(b,1,{t:'concede'});
  assert.equal(b.drawQ.filter(e=>e.who===1).length,4,'the conceder draws two for each of theirs');assert.equal(b.drawQ.filter(e=>e.who===0&&e.reason==='laststand').length,2,'the winner draws for theirs too');
  const g=setup([C('2','C')],[C('3','S')],[X('5','H','L')],[C('9','H')],[C('9','H'),C('8','H')]);g.crazy=true;g.turn=1;g.p[0].wins=1;
  act(g,1,{t:'concede'});assert.equal(g.phase,'over');assert.equal(g.drawQ.length,0,'no draws once the game is over');
});
t('Crazy mode: J/Q/K are worth 10, normal mode 1',()=>{
  const cd=mkDeck(true,Math.random),nd=mkDeck(false);
  for(const c of cd){if('JQK'.includes(c.r)&&c.r!=='JK')assert.equal(cardVal(c),10);else if(c.r==='A')assert.equal(cardVal(c),1);else if(c.r==='JK')assert.equal(cardVal(c),1);}
  for(const c of nd)if('JQK'.includes(c.r))assert.equal(cardVal(c),1);
  const s=newGame(null,{crazy:true});const all=[].concat(s.deck,s.p[0].hand,s.p[1].hand);
  assert.ok(all.filter(c=>c.r==='K').every(c=>cardVal(c)===10),'survives cp/newGame');
  const j=JSON.parse(JSON.stringify(s));assert.ok([].concat(j.deck,j.p[0].hand).filter(c=>c.r==='Q').every(c=>cardVal(c)===10));
});
t('Greed + Joker: no extra draws while the Joker cards play out; at most one per Greed when the turn passes',()=>{
  for(const paced of [true,false]){
    for(let g=0;g<30;g++){
      const deck=[];for(const [r,f] of [['2',''],['5',''],['3',''],['8',''],['7',''],['6',''],['4',''],['9','']])deck.push(X(r,['C','H','S','D'][g%4],f));
      const s=setup([J('JK1'),X('3','C','')],[X('3','S','')],[X('2','H','G'),X('2','S','G')],[X('2','D','G')],deck.concat([X('10','C',''),X('10','H',''),X('10','S',''),X('10','D','')]));
      s.crazy=true;s.paced=paced;s.p[0].field[0].v=undefined;
      let greedDraws=0,lastLen=0;
      const seen=()=>{for(const e of s.drawQ)if(e.reason==='greedturn')greedDraws++;};
      act(s,0,{t:'play',id:'JK1',suit:'H'});
      let steps=0;
      while(s.jokerQ.length&&steps++<20){
        assert.equal(s.drawQ.filter(e=>e.reason==='greedturn').length,0,'no Greed draw while the Joker queue is playing');
        if(s.drawQ.length){act(s,s.drawQ[0].who,{t:'draw'});continue;}
        if(s.pending)break;
        if(paced)assert.equal(act(s,0,{t:'jstep'}),null);else break;
      }
      assert.ok(s.log.filter(l=>/Greed: draws/.test(typeof l==='string'?l:(l.m||l.t||JSON.stringify(l)))).length<=1,'only one Greed trigger for the whole Joker play');
      const q=s.drawQ.filter(e=>e.reason==='greedturn');
      assert.ok(q.length<=2,'at most one draw per Greed on the new turn player field, got '+q.length);
    }
  }
});

// ---- hand limit: at most 10 cards in hand; a card drawn into a full hand is shown and burned ----
const {cpuChoose:cpuPick}=mod.exports;
const fill=n=>['2','3','4','5','6','7','8','9','10','J','Q','K'].flatMap(r=>[C(r,'S'),C(r,'C')]).filter(c=>!/^(A|3)C$/.test(c.id)).slice(0,n);
t('hand limit: a card drawn into a full hand burns and is shown to its owner only',()=>{
  const s=setup([C('A','C'),...fill(10)],[C('3','S')],[],[C('9','H')]);
  s.stats={played:[0,0],cards:[0,0],lostN:[0,0],lostV:[0,0],rounds:[],mull:[[],[]],start:[[],[]],drawn:[[],[]],burned:[[],[]],unused:[[],[]]};
  assert.equal(act(s,0,{t:'play',id:'AC'}),null);
  assert.equal(s.p[0].hand.length,10);
  drawFor(s,0);
  assert.equal(s.p[0].hand.length,10,'still 10');
  assert.equal(s.discard.map(c=>c.id).join(),'6D','the drawn card burned');
  assert.equal(s.burn.full,true);assert.equal(s.burn.who,0);assert.equal(s.burn.cards[0].id,'6D');
  assert.equal(viewFor(s,0).burn.cards[0].id,'6D','the owner sees it');
  assert.equal(viewFor(s,1).burn.cards[0],null,'the opponent does not');
  assert.equal(s.stats.burned[0].length,1);assert.equal(s.stats.drawn[0].length,0,'not counted as drawn');
});
t('hand limit: a draw with room is kept as before',()=>{
  const s=setup([C('A','C'),...fill(9)],[C('3','S')],[],[C('9','H')]);
  act(s,0,{t:'play',id:'AC'});drawFor(s,0);
  assert.equal(s.p[0].hand.length,10);assert.equal(s.discard.length,0);
});
t('hand limit: a Greed booster into a hand of 9 keeps one and burns two, shown together',()=>{
  const s=setup([C('A','C'),...fill(8)],[C('3','S')],[],[C('9','H')]);
  s.drawQ=[{who:0,reason:'greed'}];
  drawFor(s,0);
  assert.equal(s.p[0].hand.length,10);
  assert.equal(s.burn.cards.length,2,'both burns in one event');assert.equal(s.discard.length,2);
});
t('hand limit: Scry gift to a full hand burns',()=>{
  const s=setup([C('3','C')],fill(10),[],[C('9','H')]);
  act(s,0,{t:'play',id:'3C'});drawFor(s,0);
  const keep=s.pending.opts[0].id;
  assert.equal(act(s,0,{t:'pick',id:keep}),null);
  assert.equal(s.p[0].hand.length,1);assert.equal(s.p[1].hand.length,10,'opponent stays at 10');
  assert.equal(s.discard.length,2,'the last one and the gift burned');
  assert.equal(s.burn.who,1);assert.equal(s.burn.full,true);
});
t('hand limit: random games never hold more than 10 cards after round 1 starts (except the opening card)',()=>{
  for(let g=0;g<300;g++){
    const s=newGame(null,{crazy:g%2===1});let steps=0;
    while(s.phase!=='over'&&steps++<3000){
      const before=[s.p[0].hand.length,s.p[1].hand.length],phase0=s.phase;
      const w=actor(s),a0=cpuPick(s,w,g%3?'hard':'easy');const e=act(s,w,a0);if(e)throw new Error(e);
      for(const i of [0,1])if(s.p[i].hand.length>10)assert.ok(s.p[i].hand.length<=before[i]||(phase0==='start'&&s.phase!=='start'),'hand grew past 10 ('+phase0+' '+JSON.stringify(a0)+'): '+before[i]+' -> '+s.p[i].hand.length);
    }
  }
});

t('Joker: when only the other Joker is left to draw, it goes back in the deck (no endless Joker swap)',()=>{
  const s=setup([C('2','C')],[C('Q','S'),C('7','D'),{id:'JK1',r:'JK',s:'*',f:'X'}],[C('9','H')],[C('3','D')],[{id:'JK2',r:'JK',s:'*',f:'X'}]);
  s.crazy=true;s.turn=1;
  assert.equal(act(s,1,{t:'play',id:'JK1',suit:'C'}),null);
  assert.ok(!s.p[1].hand.some(c=>c.r==='JK'),'the drawn Joker did not go to the hand');
  assert.equal(s.p[1].hand.length,2);
  // the other Joker is back in the deck; the played one found nothing to draw, so it left the game (no endless Joker swap)
  assert.ok(s.deck.some(c=>c.id==='JK2'));assert.ok((s.gone||[]).some(c=>c.id==='JK1'));assert.ok(!s.discard.some(c=>c.id==='JK1'));
});
t('Morph: the top card of its suit on the opponent\'s side becomes a 1-point Egg, and turns back when it leaves',()=>{
  const s=setup([X('3','H','O'),X('2','C','')],[X('5','S','')],[],[X('4','H',''),X('9','H','G'),X('8','S','')]);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'3H'}),null);
  const t9=s.p[1].field.find(c=>c.id==='9H');
  assert.equal(t9.r,'EG');assert.equal(cardVal(t9),1);assert.equal(mod.exports.F(t9),'','the Morphed card loses its effect (Greed)');
  assert.equal(s.p[1].field.find(c=>c.id==='4H').r,'4','only the top card of the suit');assert.equal(s.p[1].field.find(c=>c.id==='8S').r,'8');
  assert.equal(s.morph.id,'9H');
  // removed by a Bolt: it goes to the discard pile as the 9 of hearts again
  s.turn=0;s.p[0].hand.push(X('Q','H','Q'));assert.equal(act(s,0,{t:'play',id:'QH'}),null);
  const d=s.discard.find(c=>c.id==='9H');assert.ok(d,'removed');assert.equal(d.r,'9');assert.equal(d.f,'G');assert.ok(!d.mo);assert.equal(cardVal(d),9);
});
t('Morph: hits a Sturdy card, not an Egg on top; a Morphed card turns back at the end of a round',()=>{
  const s=setup([X('3','H','O'),X('2','C','')],[X('5','S','')],[],[X('9','H','4')]);s.crazy=true;
  act(s,0,{t:'play',id:'3H'});assert.equal(s.p[1].field[0].r,'EG','Morph hits Sturdy');assert.equal(mod.exports.F(s.p[1].field[0]),'','no longer Sturdy');
  s.turn=0;s.p[0].hand.push(X('Q','H','Q'));act(s,0,{t:'play',id:'QH'});const n9=s.discard.find(c=>c.id==='9H');assert.ok(n9,'a Morphed Sturdy card can be removed');assert.equal(n9.f,'4','Sturdy again in the discard pile');
  const s2=setup([X('3','D','O'),X('2','D','O'),X('2','C','')],[X('5','S','')],[],[X('10','D','')]);s2.crazy=true;
  act(s2,0,{t:'play',id:'3D'});assert.equal(s2.p[1].field[0].r,'EG');
  s2.turn=0;act(s2,0,{t:'play',id:'2D'});assert.equal(s2.morph.n,1,'an Egg on top is not Morphed again');
  s2.p[1].hand=[];s2.p[1].wins=0;s2.turn=1;act(s2,1,{t:'concede'});
  const all=s2.deck.concat(s2.discard,s2.p[0].hand,s2.p[1].hand,s2.p[0].field,s2.p[1].field);
  const ten=all.find(c=>c.id==='10D');assert.ok(ten);assert.equal(ten.r,'10','back to a 10 after the round');
});
t('Hush: the opponent\'s cards lose their effects for good, but later cards are not silenced',()=>{
  const {F}=mod.exports;
  // player 0 gets ahead with Hush, so the turn passes: the silenced Greed does not draw
  const s=setup([X('3','H','U'),X('2','C','')],[X('5','S',''),X('10','C','')],[X('10','D',''),X('8','D','')],[X('9','H','4'),X('4','C','G'),X('2','S','2')]);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'3H'}),null);
  assert.ok(s.p[1].field.every(c=>F(c)===''),'all silenced');assert.equal(s.hush.ids.length,3);
  assert.equal(s.turn,1);assert.ok(!s.drawQ.some(e=>e.reason==='greedturn'),'silenced Greed does not draw');
  assert.equal(act(s,1,{t:'play',id:'5S'}),null);assert.equal(s.turn,1);assert.ok(s.p[1].field.some(c=>c.hu),'still silenced during their turn');
  assert.ok(F(s.p[1].field.find(c=>c.id==='5S'))!==undefined&&!s.p[1].field.find(c=>c.id==='5S').hu,'a card played after Hush is not silenced');
  assert.equal(act(s,1,{t:'play',id:'10C'}),null);assert.equal(s.turn,0);
  assert.ok(s.p[1].field.find(c=>c.id==='9H').hu,'Hush stays after the caster\'s turn comes back');assert.equal(F(s.p[1].field.find(c=>c.id==='9H')),'');
});
t('Hush: Morphing a silenced card clears its silence, and it stays clear after it turns back',()=>{
  const s=setup([X('3','H','U'),X('5','H','O'),X('2','C','')],[X('5','S','')],[],[X('9','H','4'),X('2','S','2')]);s.crazy=true;
  act(s,0,{t:'play',id:'3H'});assert.equal(s.turn,0);assert.ok(s.p[1].field.every(c=>c.hu));
  act(s,0,{t:'play',id:'5H'});const eg=s.p[1].field.find(c=>c.id==='9H');
  assert.equal(eg.r,'EG');assert.ok(!eg.hu,'the Morphed card is no longer silenced');assert.ok(s.p[1].field.find(c=>c.id==='2S').hu,'others stay silenced');
});
t('Hush: a silenced Sturdy card can be removed, and a silenced Deathrattle does not draw',()=>{
  const s=setup([X('3','H','U'),X('Q','H','Q'),X('K','C','K'),X('2','C','')],[X('5','S','')],[],[X('9','H','4'),X('2','S','2'),X('10','D','')]);s.crazy=true;
  act(s,0,{t:'play',id:'3H'});assert.equal(s.turn,0);
  act(s,0,{t:'play',id:'QH'});assert.ok(!s.p[1].field.some(c=>c.id==='9H'),'Bolt removed the silenced Sturdy card');
  const d=s.discard.find(c=>c.id==='9H');assert.ok(d&&!d.hu,'not silenced in the discard pile');
  act(s,0,{t:'play',id:'KC'});assert.equal(s.p[1].field.length,0);assert.ok(!s.drawQ.some(e=>e.reason==='deathrattle'),'no Deathrattle draw');
});
t('no conceding in round 3, and the computer never tries',()=>{
  const s=setup([C('2','C'),C('3','C')],[C('9','S'),C('8','S')],[],[C('8','H')]);
  s.round=3;s.p[0].wins=1;s.p[1].wins=1;
  assert.ok(act(s,0,{t:'concede'}),'concede is refused in round 3');
  assert.equal(s.phase,'play');
  for(const lvl of ['easy','normal','hard','expert'])for(let k=0;k<30;k++)assert.notEqual(mod.exports.cpuChoose(s,0,lvl).t,'concede',lvl+' conceded in round 3');
  s.round=2;s.p[1].wins=0;
  assert.equal(act(s,0,{t:'concede'}),null,'round 2 concede still works');
});
t('Crazy: the starter gets a 1-point Egg, and it is never shuffled back into the deck',()=>{
  const {cpuChoose,fillDeck}=mod.exports;
  const s=newGame(null,{crazy:true});
  while(s.phase!=='play'){const w=actor(s);assert.equal(act(s,w,cpuChoose(s,w,'normal')),null);}
  const st=s.startReveal.starter,egg=s.p[st].hand.find(c=>c.r==='EG');
  assert.ok(egg);assert.equal(cardVal(egg),1);assert.equal(s.startReveal.egg.id,'EGG');assert.equal(egg.s,'*','the Egg has no suit until played');
  s.p[st].hand.splice(s.p[st].hand.indexOf(egg),1);s.discard.push(egg,{id:'9C',r:'9',s:'C',f:''});s.deck=[];
  fillDeck(s);
  assert.equal(s.deck.length,1);assert.ok(!s.deck.some(c=>c.r==='EG'),'the Egg left the game');
});

t('who goes first: a Surge counts as higher than every other card',()=>{
  const {resolveStart}=mod.exports;
  const go=(c0,c1)=>{const s=newGame(null,{crazy:true});s.phase='start';s.startCards=[c0,c1];resolveStart(s);return s.startReveal.starter;};
  const sg=id=>({id,r:'JK',s:'*',f:'X'});
  assert.equal(go(sg('JK1'),C('K','D')),1,'Surge vs King: the King goes first');
  assert.equal(go(C('A','C'),sg('JK2')),0,'Ace vs Surge: the Ace goes first');
  assert.equal(go(C('10','D'),C('A','C')),1,'plain cards still compare by value');
});

t('Out of cards with a Rune and a concede left: may concede instead of losing',()=>{
  const {cpuChoose}=mod.exports;
  const mk=()=>{const s=setup([C('2','C')],[C('3','S')],[X('5','H','L')],[C('9','H')],[C('9','D'),C('8','D'),C('7','D')]);s.crazy=true;return s;};
  const s=mk();
  assert.equal(act(s,0,{t:'play',id:'2C'}),null);
  assert.equal(s.phase,'play','not over yet');assert.equal(s.turn,0);assert.ok(viewFor(s,0).me.stuck);
  assert.ok(act(s,0,{t:'play',id:'3S'}),'nothing to play');
  assert.equal(act(s,0,{t:'concede'}),null);
  assert.equal(s.p[1].wins,1);assert.equal(s.drawQ.filter(e=>e.reason==='laststand').length,2,'the Rune draws two');
  const g=mk();act(g,0,{t:'play',id:'2C'});
  assert.equal(act(g,0,{t:'giveup'}),null);assert.equal(g.phase,'over');assert.equal(g.winner,1);assert.equal(g.over,'cards');
  assert.ok(act(mk(),0,{t:'giveup'}),'cannot give up with cards in hand');
  for(const lvl of ['easy','normal','hard','expert']){const c=mk();act(c,0,{t:'play',id:'2C'});assert.equal(cpuChoose(c,0,lvl).t,'concede',lvl+' should concede');}
  // no Rune, already conceded, round 3, or a silenced Rune: the game ends as before
  const tweaks=[s=>{s.p[0].field=[C('5','H')];},s=>{s.p[0].conceded=true;},s=>{s.round=3;},s=>{s.p[0].field[0].hu=true;}];
  for(const tw of tweaks){const o=mk();tw(o);act(o,0,{t:'play',id:'2C'});assert.equal(o.phase,'over');assert.equal(o.winner,1);}
});

t('Draft: both players draw one; the caster draws one more only with a smaller hand',()=>{
  // smaller hand: after playing the Draft, player 0 holds 1 card against 3
  const s=setup([X('3','H','W'),X('2','C','')],[X('5','S',''),X('10','C',''),X('4','D','')],[],[X('9','H','')],[C('9','D'),C('8','D'),C('7','D'),C('6','D')]);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'3H'}),null);
  assert.deepEqual(s.drawQ.map(e=>e.who),[0,1,0]);
  drawFor(s,1);drawFor(s,0);drawFor(s,0);
  assert.equal(s.p[0].hand.length,3);assert.equal(s.p[1].hand.length,4);assert.equal(s.drawQ.length,0);
  // equal (or bigger) hand: just one each
  const e=setup([X('3','H','W'),X('2','C','')],[X('5','S','')],[],[X('9','H','')]);e.crazy=true;
  act(e,0,{t:'play',id:'3H'});assert.deepEqual(e.drawQ.map(x=>x.who),[0,1]);
  // a full hand burns its draw
  const f=setup([X('3','H','W'),X('2','C','')],Array.from({length:10},(_,k)=>X(String(k+1==1?'A':k+1>10?'K':k+1),'S','')),[],[X('9','H','')]);f.crazy=true;
  act(f,0,{t:'play',id:'3H'});drawFor(f,1);assert.equal(f.p[1].hand.length,10);assert.ok(f.burn&&f.burn.who===1);
});

t('Rewind: your other cards of its suit go back to your hand, as they were; the Rewind stays',()=>{
  const morphed={id:'7H',r:'EG',s:'H',f:'',v:1,mo:{r:'7',f:'Q'}};
  const f0=[X('5','H','2'),morphed,X('9','C',''),{id:'EGG',r:'EG',s:'H',f:'',v:1},Object.assign(X('8','H','4'),{hu:2})];
  const s=setup([X('3','H','R'),X('2','C','')],[C('4','S')],f0,[C('10','S'),C('10','D'),C('9','S')]);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'3H'}),null);
  assert.deepEqual(s.p[0].field.map(c=>c.id),['9C','3H'],'only the Rewind and other suits stay');
  assert.deepEqual(s.p[0].hand.map(c=>c.id).sort(),['2C','5H','7H','8H','EGG'].sort());
  const h=id=>s.p[0].hand.find(c=>c.id===id);
  assert.equal(h('7H').r,'7');assert.equal(h('7H').f,'Q');assert.ok(!h('7H').mo,'a Morphed card is itself again');
  assert.equal(h('EGG').s,'*','the Egg loses its suit');assert.ok(!h('8H').hu,'no longer silenced');
  assert.equal(s.drawQ.length,0,'a Soul taken back does not draw');assert.equal(s.turn,0,'still behind: keep playing');
  assert.equal(viewFor(s,0).rewind.ids.length,4);
  // nothing to take back
  const e=setup([X('3','H','R'),X('2','C','')],[C('4','S')],[X('9','C','')],[C('10','S')]);e.crazy=true;
  act(e,0,{t:'play',id:'3H'});assert.equal(e.p[0].hand.length,1);assert.equal(e.rewind.ids.length,0);
  // other Rewinds (a Mimic copying one too) stay, so they can't bounce each other forever; a silenced one comes back
  const r=setup([X('3','H','R'),X('2','C','')],[C('4','S')],[X('4','H','R'),Object.assign(X('6','H','R'),{f:'R',was:'M'}),Object.assign(X('7','H','R'),{hu:2}),X('8','H','')],[C('10','S'),C('10','D'),C('9','S')]);r.crazy=true;
  act(r,0,{t:'play',id:'3H'});
  assert.deepEqual(r.p[0].field.map(c=>c.id),['4H','6H','3H']);assert.deepEqual(r.p[0].hand.map(c=>c.id).sort(),['2C','7H','8H']);
  // a full hand burns the rest
  const full=Array.from({length:9},(_,k)=>X(String(k+2),'S',''));
  const b=setup([X('3','H','R')].concat(full),[C('4','S')],[X('5','H',''),X('6','H','')],[C('10','S'),C('10','D')]);b.crazy=true;
  act(b,0,{t:'play',id:'3H'});
  assert.equal(b.p[0].hand.length,10);assert.ok(b.p[0].hand.some(c=>c.id==='6H'),'newest first');assert.ok(b.discard.some(c=>c.id==='5H'));assert.ok(b.burn&&b.burn.who===0);
});

t('Mimic preview (client efx): a Mimic back in hand previews the current last effect, not what it copied before',()=>{
  const src=html.match(/function efx\(c,v\)\{[\s\S]*?\n\}/)[0];const efx=new Function(src+'\nreturn efx;')();
  const m={id:'7D',r:'7',s:'D',f:'M'};
  // it copied Draft earlier, then Rewind brought it back to the hand; the last card played since was a Bolt
  const v={me:{hand:[m],field:[]},opp:{field:[]},mirror:{n:1,id:'7D',fx:'W'},lastFx:'Q'};
  assert.equal(efx(m,v),'Q');
  v.lastFx=null;assert.equal(efx(m,v),null,'nothing played yet: nothing to copy');
  // on the table a Mimic still showing its Mimic face copied nothing
  v.lastFx='Q';v.me.field=[m];v.me.hand=[];assert.equal(efx(m,v),null);
});

t('Bolt with nothing to hit holds a charge; it strikes after the opponent\'s next card of that suit',()=>{
  const s=setup([X('9','S','Q'),X('2','C','')],[X('3','S','A'),X('4','S','')],[C('5','C')],[C('10','H')]);s.crazy=true;
  assert.equal(act(s,0,{t:'play',id:'9S'}),null);
  assert.equal(s.p[0].field.find(c=>c.id==='9S').ch,1,'charged');assert.equal(s.turn,1);assert.equal(viewFor(s,1).boltCharge.id,'9S');
  assert.equal(act(s,1,{t:'play',id:'3S'}),null);
  assert.ok(!s.p[1].field.some(c=>c.id==='3S'),'the new card is struck');assert.ok(s.discard.some(c=>c.id==='3S'));
  assert.equal(s.drawQ.length,1,'its own effect (Draw) still happened');
  assert.ok(!s.p[0].field.find(c=>c.id==='9S').ch,'the charge is used up');assert.deepEqual(viewFor(s,0).boltZap.ids,['3S']);
  drawFor(s,1);act(s,1,{t:'play',id:'4S'});assert.ok(s.p[1].field.some(c=>c.id==='4S'),'only one strike');
  // a Bolt that hits something does not charge
  const h=setup([X('9','S','Q')],[C('3','C')],[],[C('5','S'),C('10','H')]);h.crazy=true;act(h,0,{t:'play',id:'9S'});
  assert.ok(!h.p[0].field[0].ch);assert.ok(!h.boltCharge);
  // only a Sturdy to hit: it charges, and another Sturdy can't set it off (the charge stays)
  const st=setup([X('9','S','Q'),X('2','C','')],[X('3','S','4')],[C('5','C')],[X('6','S','4')]);st.crazy=true;
  act(st,0,{t:'play',id:'9S'});assert.equal(st.p[0].field.find(c=>c.id==='9S').ch,1);
  act(st,1,{t:'play',id:'3S'});assert.equal(st.p[1].field.length,2);assert.equal(st.p[0].field.find(c=>c.id==='9S').ch,1);
});

t('Charged Bolt: waits for a Steal choice; Hush silences it; a Blaze burns it before it fires',()=>{
  const charged=()=>Object.assign(X('9','S','Q'),{ch:1});
  const s=setup([C('2','C'),C('3','C'),C('4','C')],[X('3','S','T'),C('8','D')],[C('5','C'),charged()],[]);s.crazy=true;s.turn=1;
  assert.equal(act(s,1,{t:'play',id:'3S'}),null);
  assert.equal(s.pending.t,'steal');assert.ok(s.p[1].field.some(c=>c.id==='3S'),'not yet: the Steal choice comes first');
  act(s,0,{t:'pick',id:'2C'});
  assert.ok(!s.p[1].field.some(c=>c.id==='3S'),'struck after the Steal');assert.ok(s.p[1].hand.some(c=>c.id==='2C'));
  const hu=setup([C('2','C')],[X('3','S',''),C('8','D')],[C('5','C'),Object.assign(charged(),{hu:2})],[]);hu.crazy=true;hu.turn=1;
  act(hu,1,{t:'play',id:'3S'});assert.ok(hu.p[1].field.some(c=>c.id==='3S'),'a Hushed Bolt is silent');
  const bl=setup([C('2','C')],[X('3','S','K'),C('8','D')],[C('5','C'),charged()],[]);bl.crazy=true;bl.turn=1;
  act(bl,1,{t:'play',id:'3S'});assert.ok(bl.p[1].field.some(c=>c.id==='3S'));assert.ok(bl.discard.some(c=>c.id==='9S'&&!c.ch),'burned, charge gone');
});

console.log('\n'+n+' checks passed');
