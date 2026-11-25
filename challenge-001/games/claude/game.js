const cv=document.getElementById('c'),g=cv.getContext('2d');
let AC=null,master=null,musicOn=true,musicTimer=null,step=0,nextT=0,playing=false;
window.sfxLog=[];
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=0.5;master.connect(AC.destination)}catch(e){AC=null}}
function tone(f,t,d,type,v,f2){if(!AC)return;const o=AC.createOscillator(),a=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);a.gain.setValueAtTime(v,t);a.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(a);a.connect(master);o.start(t);o.stop(t+d+0.02)}
function noise(t,d,v){if(!AC)return;const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;const s=AC.createBufferSource(),a=AC.createGain();s.buffer=b;a.gain.setValueAtTime(v,t);a.gain.exponentialRampToValueAtTime(0.001,t+d);s.connect(a);a.connect(master);s.start(t)}
function sfx(n){window.sfxLog.push(n);if(!AC)return;const t=AC.currentTime;
if(n=='jump')tone(260,t,.15,'square',.12,720);
else if(n=='coin'){tone(988,t,.07,'square',.1);tone(1319,t+.07,.18,'square',.1)}
else if(n=='hurt'){tone(300,t,.3,'sawtooth',.15,60);noise(t,.2,.1)}
else if(n=='life'){[400,330,262,196].forEach((f,i)=>tone(f,t+i*.15,.2,'triangle',.2))}
else if(n=='level'){[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.1,.15,'square',.1))}
else if(n=='win'){[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,t+i*.13,.2,'square',.1))}}
const MEL=[69,0,72,0,76,0,72,0,74,0,72,0,69,0,67,0,69,0,72,0,76,0,79,0,76,0,74,72,74,0,0,0];
const BAS=[45,45,52,45,43,43,50,43,41,41,48,41,43,43,50,43];
const mf=m=>440*Math.pow(2,(m-69)/12);
function sched(){if(!AC||!musicOn||!playing)return;const sd=.14;
while(nextT<AC.currentTime+.4){const s=step%32,t=nextT;
if(MEL[s])tone(mf(MEL[s]),t,sd*1.6,'square',.07);
if(s%2==0)tone(mf(BAS[s>>1]-12+12),t,sd*1.8,'triangle',.2);
if(s%4==2)noise(t,.05,.06);if(s%8==0)tone(120,t,.1,'sine',.25,40);
step++;nextT+=sd}}
function startMusic(){stopMusic();if(!AC||!musicOn)return;playing=true;step=0;nextT=AC.currentTime+.05;musicTimer=setInterval(sched,100);sched()}
function stopMusic(){playing=false;if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
const LV=[
{w:1500,bg:'#5ec8f2',P:[[0,320,500],[570,320,500],[1140,320,400],[250,250,100],[700,240,120],[900,200,100]],
C:[[290,220],[740,210],[940,170],[400,290],[1300,290],[1000,290]],E:[[380,296,300,480],[800,296,600,1050],[1250,296,1160,1400]],S:[],G:[1460,320]},
{w:1800,bg:'#f2a65e',P:[[0,320,400],[480,320,300],[860,320,300],[1240,320,560],[400,250,80],[780,250,80],[1160,250,80],[560,230,100]],
C:[[420,220],[800,220],[1180,220],[590,200],[1400,290],[1600,290]],E:[[200,296,60,380],[600,296,490,760],[950,296,870,1140],[1450,296,1250,1700]],S:[[690,308,24],[1000,308,24]],G:[1760,320]},
{w:2000,bg:'#2a1a4a',P:[[0,320,300],[380,280,100],[540,240,100],[700,280,100],[860,240,120],[1040,280,100],[1200,240,100],[1360,320,640]],
C:[[410,250],[570,210],[730,250],[900,210],[1070,250],[1230,210],[1600,290]],E:[[1500,296,1380,1900],[1700,296,1380,1900],[150,296,20,280]],S:[[1800,308,24]],F:[[620,180,100],[960,160,100]],G:[1960,320]}];
let st='title',lvl=0,score=0,lives=3,L,pl,cam=0,coins,ens,t0=0,msg='',msgT=0;
const keys={};
function load(i){lvl=i;const d=LV[i];L=d;coins=d.C.map(c=>({x:c[0],y:c[1],got:false}));
ens=d.E.map(e=>({x:e[0],y:e[1],a:e[2],b:e[3],dir:1,dead:false,fly:false}));
(d.F||[]).forEach(f=>ens.push({x:f[0],y:f[1],y0:f[1],a:f[0]-100,b:f[0]+100,dir:1,dead:false,fly:true,amp:f[2]}));
pl={x:40,y:280,vx:0,vy:0,on:false,inv:0,face:1};cam=0}
function newGame(){initAudio();if(AC&&AC.state=='suspended')AC.resume();score=0;lives=3;load(0);st='play';startMusic()}
function hurt(){if(pl.inv>0)return;lives--;pl.inv=90;sfx('hurt');
if(lives<=0){st='over';stopMusic();sfx('life');return}
pl.x=Math.max(40,pl.x-0);if(pl.y>360){pl.x=40;pl.y=280;pl.vy=0}else{pl.vy=-7;pl.vx=-pl.face*4}}
function update(){t0++;if(pl.inv>0)pl.inv--;
const l=keys.ArrowLeft||keys.KeyA,r=keys.ArrowRight||keys.KeyD;
pl.vx=(r?1:0)*3-(l?1:0)*3;if(pl.vx)pl.face=Math.sign(pl.vx);
if(keys.Space&&pl.on){pl.vy=-11;pl.on=false;sfx('jump')}
if(!keys.Space&&pl.vy<-4)pl.vy=-4;
pl.vy=Math.min(pl.vy+.55,12);
pl.x+=pl.vx;pl.x=Math.max(0,Math.min(L.w-20,pl.x));
for(const p of L.P)if(pl.x+20>p[0]&&pl.x<p[0]+p[2]&&pl.y+28>p[1]&&pl.y<p[1]+16){pl.vx>0||pl.face>0&&pl.vx>0?pl.x=p[0]-20:pl.x=p[0]+p[2]}
pl.y+=pl.vy;pl.on=false;
for(const p of L.P)if(pl.x+20>p[0]&&pl.x<p[0]+p[2]&&pl.y+28>p[1]&&pl.y+28-pl.vy<=p[1]+2&&pl.vy>=0){pl.y=p[1]-28;pl.vy=0;pl.on=true}
else if(pl.x+20>p[0]&&pl.x<p[0]+p[2]&&pl.y<p[1]+16&&pl.y-pl.vy>=p[1]+16&&pl.vy<0){pl.y=p[1]+16;pl.vy=0}
if(pl.y>400){hurt();if(st=='play'){pl.x=Math.max(40,pl.x-0);pl.x=40;pl.y=280;pl.vy=0}}
for(const c of coins)if(!c.got&&Math.abs(pl.x+10-c.x)<16&&Math.abs(pl.y+14-c.y)<20){c.got=true;score+=100;sfx('coin')}
for(const e of ens){if(e.dead)continue;
if(e.fly){e.x+=e.dir*1.5;if(e.x>e.b||e.x<e.a)e.dir*=-1;e.y=e.y0+Math.sin(t0/20)*(e.amp?30:30)}
else{e.x+=e.dir*1.2;if(e.x>e.b||e.x<e.a)e.dir*=-1}
if(pl.x+20>e.x&&pl.x<e.x+24&&pl.y+28>e.y&&pl.y<e.y+24){
if(!e.fly&&pl.vy>0&&pl.y+28<e.y+16){e.dead=true;pl.vy=-8;score+=200;sfx('coin')}else hurt()}}
for(const s of L.S)if(pl.x+20>s[0]&&pl.x<s[0]+s[2]&&pl.y+28>s[1])hurt();
if(st=='play'&&pl.x+20>L.G[0]-10){score+=500;if(lvl<2){sfx('level');st='next';stopMusic()}else{sfx('win');st='win';stopMusic()}}
cam=Math.max(0,Math.min(L.w-640,pl.x-300))}
function txt(s,x,y,sz,col){g.fillStyle=col||'#fff';g.font='bold '+sz+'px monospace';g.textAlign='center';g.fillText(s,x,y)}
function draw(){g.fillStyle=L&&st!='title'?L.bg:'#1b2a5a';g.fillRect(0,0,640,360);
if(st=='title'){txt('PIXEL HOPPER',320,140,52,'#ffd23f');txt('Reach the flag in 3 worlds!',320,190,20);txt('Press Enter or Start Game',320,240,18,'#8f8');
g.fillStyle='#e33';g.fillRect(300,270,20,28);return}
g.save();g.translate(-cam,0);
for(let i=0;i<L.w;i+=160){g.fillStyle='rgba(255,255,255,.15)';g.fillRect(i+20,60+(i/160%3)*25,70,16)}
for(const p of L.P){g.fillStyle='#6b4423';g.fillRect(p[0],p[1],p[2],16);g.fillStyle='#4c4';g.fillRect(p[0],p[1],p[2],5)}
for(const f of []){}
g.fillStyle='#ddd';for(const s of L.S)for(let i=0;i<s[2];i+=8){g.beginPath();g.moveTo(s[0]+i,s[1]+12);g.lineTo(s[0]+i+4,s[1]-4);g.lineTo(s[0]+i+8,s[1]+12);g.fill()}
for(const c of coins)if(!c.got){g.fillStyle='#fd0';const w=Math.abs(Math.cos(t0/10))*6+2;g.fillRect(c.x-w,c.y-7,w*2,14)}
for(const e of ens)if(!e.dead){g.fillStyle=e.fly?'#c3f':'#a33';g.fillRect(e.x,e.y,24,24);g.fillStyle='#fff';g.fillRect(e.x+5,e.y+6,5,5);g.fillRect(e.x+14,e.y+6,5,5)}
g.fillStyle='#fff';g.fillRect(L.G[0],L.G[1]-70,4,70);g.fillStyle='#f33';g.fillRect(L.G[0]+4,L.G[1]-70,26,16);
if(!(pl.inv>0&&t0%6<3)){g.fillStyle='#e33';g.fillRect(pl.x,pl.y,20,28);g.fillStyle='#fcb';g.fillRect(pl.x+4,pl.y+4,12,9);g.fillStyle='#000';g.fillRect(pl.x+(pl.face>0?11:5),pl.y+6,3,3);
g.fillStyle='#24c';g.fillRect(pl.x,pl.y+20,20,8)}
g.restore();
g.textAlign='left';g.fillStyle='#fff';g.font='bold 16px monospace';g.fillText('Score '+score+'  Lives '+'♥'.repeat(Math.max(0,lives))+'  World '+(lvl+1)+'/3',10,20);
if(st=='next')txt('Level Complete! Press Enter',320,180,26,'#ff0');
if(st=='over'){g.fillStyle='rgba(0,0,0,.7)';g.fillRect(0,0,640,360);txt('GAME OVER',320,160,48,'#f55');txt('Score '+score+' - Enter to restart',320,210,20)}
if(st=='win'){g.fillStyle='rgba(0,0,40,.8)';g.fillRect(0,0,640,360);txt('YOU WIN!',320,150,52,'#ffd23f');txt('Final score '+score+' - Enter to play again',320,210,20)}}
function enter(){if(st=='title'||st=='over'||st=='win')newGame();else if(st=='next'){load(lvl+1);st='play';startMusic()}}
addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code=='Enter')enter()});
addEventListener('keyup',e=>keys[e.code]=false);
document.getElementById('start').onclick=e=>{e.target.blur();newGame()};
const mb=document.getElementById('mus');
mb.onclick=e=>{e.target.blur();initAudio();musicOn=!musicOn;mb.textContent='Music: '+(musicOn?'ON':'OFF');if(musicOn){if(st=='play')startMusic()}else stopMusic()};
function loop(){if(st=='play')update();draw();requestAnimationFrame(loop)}
loop();
