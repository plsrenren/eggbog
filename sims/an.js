const fs=require('fs');
for(const f of ['crazy-hard','crazy-normal','normal-hard','normal-normal']){
  const G=fs.readFileSync(f+'.jsonl','utf8').trim().split('\n').map(JSON.parse);
  // per-player rows
  const R=[];for(const g of G)for(const i of [0,1])R.push({v:g.kept[i],d:g.kept[i]-g.kept[1-i],dd:g.dealt[i],win:g.w===i?1:0,first:g.first===i,jk:g.jk[i],mull:g.dealt[i]!==g.kept[i]||g.n[i]!==g.n[1-i]});
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const corr=(a,b)=>{const ma=mean(a),mb=mean(b);let n=0,x=0,y=0;for(let k=0;k<a.length;k++){n+=(a[k]-ma)*(b[k]-mb);x+=(a[k]-ma)**2;y+=(b[k]-mb)**2;}return n/Math.sqrt(x*y);};
  const vs=R.map(r=>r.v).sort((a,b)=>a-b),q=p=>vs[Math.floor(p*(vs.length-1))];
  console.log('\n## '+f+'  games '+G.length+'  hand value: min '+vs[0]+' p10 '+q(.1)+' median '+q(.5)+' p90 '+q(.9)+' max '+vs[vs.length-1]+' mean '+mean(vs).toFixed(1));
  console.log('corr(own value,win)='+corr(R.map(r=>r.v),R.map(r=>r.win)).toFixed(3)+' corr(diff,win)='+corr(R.map(r=>r.d),R.map(r=>r.win)).toFixed(3)+' corr(first,win)='+corr(R.map(r=>+r.first),R.map(r=>r.win)).toFixed(3));
  const wr=rs=>rs.length?(100*mean(rs.map(r=>r.win))).toFixed(1)+'% ('+rs.length+')':'-';
  // own value quintiles
  const qs=[0,.2,.4,.6,.8,1].map(q);
  let line='own value quintiles: ';for(let k=0;k<5;k++){const lo=qs[k],hi=qs[k+1];line+=`[${lo}-${hi}] ${wr(R.filter(r=>r.v>=lo&&(k===4?r.v<=hi:r.v<hi)))}  `;}console.log(line);
  // diff buckets
  const B=f.startsWith('crazy')?[-99,-15,-8,-3,3,8,15,99]:[-99,-20,-10,-4,4,10,20,99];
  line='diff buckets: ';for(let k=0;k<B.length-1;k++){const lo=B[k],hi=B[k+1];line+=`[${lo},${hi}) ${wr(R.filter(r=>r.d>=lo&&r.d<hi))}  `;}console.log(line);
  console.log('first player: '+wr(R.filter(r=>r.first))+'  jokers in hand 0/1/2: '+[0,1,2].map(j=>wr(R.filter(r=>r.jk===j))).join(' / '));
  console.log('higher hand wins: '+wr(R.filter(r=>r.d>0))+'  mulligan rate '+(100*mean(R.map(r=>r.dd!==r.v?1:0))).toFixed(0)+'%');
}
