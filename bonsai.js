(function() {
  const W = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--w'))|0;
  const H = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--h'))|0;
  const screen = document.getElementById('screen');

  const DIRS = [
    {dr:-1, dc:-1, glyph:'\\'},
    {dr:-1, dc: 0, glyph:'|'},
    {dr:-1, dc:+1, glyph:'/'}
  ];

  const choice = arr => arr[Math.random() * arr.length | 0];
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const randInt = (a,b)=> (Math.random()*(b-a+1)+a)|0;

  function makeGrid() {
    return new Array(H).fill().map(() => new Array(W).fill(null));
  }
  function safePut(grid,r,c,ch,cls) {
    if(r<0||r>=H||c<0||c>=W) return;
    grid[r][c] = {ch,cls};
  }
  function gridToHTML(grid) {
    let out="";
    for(let r=0;r<H;r++) {
      let line="";
      for(let c=0;c<W;c++) {
        const cell=grid[r][c];
        if(cell) line+=`<span class="${cell.cls}">${cell.ch}</span>`;
        else line+=" ";
      }
      out+=line+"\n";
    }
    return out;
  }

  function drawPot(grid) {
    const baseRow=H-1, topRow=H-3, cx=(W/2)|0, potW=Math.min(W-8,46);
    const half=potW>>1;
    let s="".padStart(potW,"-");
    for(let i=0;i<s.length;i++) safePut(grid,topRow,cx-half+i,s[i],'p');
    safePut(grid,baseRow,cx-half-3,'[','p');
    safePut(grid,baseRow,cx+half+3,']','p');
  }

  class Branch {
    constructor(r,c,dir,depth) {
      this.r=r; this.c=c; this.dir=dir; this.depth=depth;
      this.life=randInt(6,14-depth*3);
      this.finished=false;
    }
    step(grid, tips, history) {
      if(this.life<=0||this.r<=2) {
        this.finished=true;
        tips.push({r:this.r,c:this.c});
        return;
      }
      let options=[];
      for(const d of DIRS) {
        let w=1.0;
        if(d===this.dir) w+=2.5;
        if(this.depth>0 && d.dc!==0) w*=0.9;
        options.push({d,w});
      }
      let total=options.reduce((s,o)=>s+o.w,0);
      let r=Math.random()*total;
      let dirChoice=options[0].d;
      for(const o of options){ if((r-=o.w)<=0){ dirChoice=o.d; break; } }
      const nr=this.r+dirChoice.dr;
      const nc=clamp(this.c+dirChoice.dc,1,W-2);
      safePut(grid,nr,nc,dirChoice.glyph,'t');
      history.push({r:nr,c:nc});
      if(Math.random()< (this.depth<3?0.18:0.06)) {
        const sd=choice(DIRS.filter(d=>d!==dirChoice));
        branches.push(new Branch(nr,nc,sd,this.depth+1));
      }
      this.r=nr; this.c=nc; this.dir=dirChoice; this.life--;
    }
  }

  let grid, branches, tips, history, phase, pauseTimer;

  function reset() {
    grid=makeGrid();
    branches=[]; tips=[]; history=[];
    drawPot(grid);
    const rootR=H-4, rootC=(W/2)|0;
    safePut(grid,rootR,rootC,'|','t');
    history.push({r:rootR,c:rootC});
    branches.push(new Branch(rootR,rootC,DIRS[1],0));
    phase="growing";
  }

  function addLeavesOneByOne() {
    if(!tips.length){ phase="pause"; return; }
    const tip=tips.shift();
    const count=randInt(8,15); // more leaves
    for(let i=0;i<count;i++){
      const rr=clamp(tip.r - randInt(0,3),0,H-1);
      const cc=clamp(tip.c + randInt(-3,3),0,W-1);
      if(!grid[rr][cc]){
        const glyph=choice(['&','$','%','@']);
        safePut(grid,rr,cc,glyph,'l');
        history.push({r:rr,c:cc});
      }
    }
  }

  function deconstructStep() {
    if(!history.length) { reset(); return; }
    const {r,c}=history.pop();
    grid[r][c]=null;
  }

  function tick() {
    if(phase==="growing"){
      if(branches.length){
        const b=branches.shift();
        b.step(grid,tips,history);
        if(!b.finished) branches.push(b);
      } else {
        phase="leafing";
      }
    } else if(phase==="leafing") {
      addLeavesOneByOne();
      if(!tips.length) {
        phase="pause";
        pauseTimer=480; // ~8 seconds at 60fps
      }
    } else if(phase==="pause") {
      if(pauseTimer>0) pauseTimer--;
      else phase="deconstruct";
    } else if(phase==="deconstruct") {
      deconstructStep();
    }
    screen.innerHTML=gridToHTML(grid);
    requestAnimationFrame(tick);
  }

  reset();
  tick();
})();
