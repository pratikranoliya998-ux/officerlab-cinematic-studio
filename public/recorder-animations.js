/* OfficerLab recorder animation modules */
(()=>{'use strict';
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,Number(n)||0));
const easing=Object.freeze({
 linear:t=>clamp(t),
 easeOutCubic:t=>1-Math.pow(1-clamp(t),3),
 easeInOutCubic:t=>{const p=clamp(t);return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;},
 easeOutQuart:t=>1-Math.pow(1-clamp(t),4),
 easeOutBack:t=>{const p=clamp(t),c1=1.70158,c3=c1+1;return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2);}
});
class AnimationScheduler{
 constructor(){this.active=new Map();this.values=new Map();this.time=0;this.frame=0;this.destroyed=false;}
 start(id,{duration=500,from=0,to=1,easing:curve='linear',delay=0,onUpdate,onComplete,startedAt}={}){
  if(this.destroyed||!id)return false;
  const fn=typeof curve==='function'?curve:(easing[curve]||easing.linear);
  const item={id,duration:Math.max(1,Number(duration)||1),from,to,fn,delay:Math.max(0,Number(delay)||0),startedAt:Number.isFinite(startedAt)?startedAt:(this.time||performance.now()),onUpdate,onComplete,pausedAt:null};
  this.active.set(id,item);this.values.set(id,from);if(typeof onUpdate==='function')onUpdate(from,0,item.startedAt);return true;
 }
 tick(now=performance.now()){
  if(this.destroyed)return;this.time=Number.isFinite(now)?now:performance.now();this.frame++;
  for(const [id,a] of this.active){
   if(a.pausedAt!==null)continue;
   const raw=clamp((this.time-a.startedAt-a.delay)/a.duration),value=a.from+(a.to-a.from)*a.fn(raw);
   this.values.set(id,value);if(typeof a.onUpdate==='function')a.onUpdate(value,raw,this.time);
   if(raw>=1){this.active.delete(id);this.values.set(id,a.to);if(typeof a.onComplete==='function')a.onComplete(a.to,this.time);}
  }
 }
 value(id,fallback=0){return this.values.has(id)?this.values.get(id):fallback;}
 isActive(id){return this.active.has(id);}
 pause(id){const a=this.active.get(id);if(!a||a.pausedAt!==null)return false;a.pausedAt=this.time;return true;}
 resume(id){const a=this.active.get(id);if(!a||a.pausedAt===null)return false;a.startedAt+=Math.max(0,this.time-a.pausedAt);a.pausedAt=null;return true;}
 cancel(id,keepValue=false){this.active.delete(id);if(!keepValue)this.values.delete(id);}
 clear(){this.active.clear();this.values.clear();}
 destroy(){this.clear();this.destroyed=true;}
}
const KenBurns=Object.freeze({
 presets:Object.freeze([
  Object.freeze({zoomFrom:1,zoomTo:1.08,panXFrom:-.02,panXTo:.02,panYFrom:-.01,panYTo:.01}),
  Object.freeze({zoomFrom:1.08,zoomTo:1,panXFrom:.02,panXTo:-.02,panYFrom:.01,panYTo:-.01}),
  Object.freeze({zoomFrom:1,zoomTo:1.10,panXFrom:0,panXTo:0,panYFrom:.02,panYTo:-.02}),
  Object.freeze({zoomFrom:1.05,zoomTo:1,panXFrom:0,panXTo:0,panYFrom:-.02,panYTo:.02})
 ]),
 sample(index,progress,reduced=false){
  if(reduced)return{zoom:1,panX:0,panY:0};
  const p=this.presets[Math.abs(Number(index)||0)%this.presets.length],t=clamp(progress);
  return{zoom:p.zoomFrom+(p.zoomTo-p.zoomFrom)*t,panX:p.panXFrom+(p.panXTo-p.panXFrom)*t,panY:p.panYFrom+(p.panYTo-p.panYFrom)*t};
 }
});
const Transitions=Object.freeze({
 presets:Object.freeze({
  crossfade:Object.freeze({duration:500,easing:easing.easeInOutCubic}),
  'slide-left':Object.freeze({duration:450,easing:easing.easeOutCubic}),
  'push-left':Object.freeze({duration:550,easing:easing.easeInOutCubic}),
  wipe:Object.freeze({duration:400,easing:easing.easeOutCubic}),
  zoom:Object.freeze({duration:600,easing:easing.easeInOutCubic})
 }),
 sample(type,progress,reduced=false){
  const key=reduced?'crossfade':(this.presets[type]?type:'crossfade'),raw=clamp(progress),preset=this.presets[key];
  return{type:key,raw,eased:(reduced?easing.easeInOutCubic:preset.easing)(raw),duration:reduced?200:preset.duration,done:raw>=1};
 }
});
const LowerThird=Object.freeze({
 enter(elapsed,position,width,reduced=false){
  const d=Math.max(26,width*.11),t=clamp((Number(elapsed)||0)/(reduced?250:650)),e=reduced?t:easing.easeOutCubic(t);
  return{visible:true,alpha:e,dx:position==='lower-centre'?0:(position==='top-right'?d:-d)*(1-e),dy:position==='lower-centre'?d*(1-e):0};
 },
 recording(elapsed,position,width,reduced=false){
  const t=Number(elapsed),inMs=reduced?250:600,hold=3500,outMs=reduced?250:500,total=inMs+hold+outMs,d=Math.max(26,width*.11);
  if(!Number.isFinite(t)||t<0||t>=total)return{visible:false,alpha:0,dx:0,dy:0};
  if(t<inMs){const raw=clamp(t/inMs),e=reduced?raw:easing.easeOutBack(raw),o=d*(1-e);return{visible:true,alpha:clamp(e),dx:position==='lower-centre'?0:(position==='top-right'?o:-o),dy:position==='lower-centre'?o:0};}
  if(t>=inMs+hold){const fade=easing.easeOutCubic(clamp((t-inMs-hold)/outMs)),o=d*.12*fade;return{visible:true,alpha:1-fade,dx:position==='lower-centre'?0:(position==='top-right'?o:-o),dy:position==='lower-centre'?-o:0};}
  return{visible:true,alpha:1,dx:0,dy:0};
 }
});
const ProgressBar=Object.freeze({
 draw(ctx,o={}){
  const m=Number(o.minutes);if(!o.recording||!o.enabled||!Number.isFinite(m)||m<1||m>360)return;
  const W=o.width||ctx.canvas.width,H=o.height||ctx.canvas.height,p=clamp((Number(o.elapsedMs)||0)/(m*60000)),h=Math.max(4,Math.round(H/270));
  ctx.save();ctx.globalAlpha=.96;ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(0,H-h,W,h);ctx.fillStyle=o.accent||'#55a3ff';ctx.fillRect(0,H-h,W*p,h);ctx.restore();
 }
});
const seg=(p,a,b)=>easing.easeOutCubic(clamp((p-a)/Math.max(.001,b-a)));
function drawCard(ctx,o={}){
 const intro=o.kind!=='outro',W=ctx.canvas.width,H=ctx.canvas.height,scale=Math.min(W/1920,H/1080),p=clamp((Number(o.elapsedMs)||0)/Math.max(1,Number(o.durationMs)||(intro?1800:2300))),reduced=!!o.reducedMotion;
 const accent=o.accent||'#55a3ff',panel=o.panel||'#050c18',font=o.fontStack||'system-ui,sans-serif',logo=o.logo,hasLogo=!!(logo&&logo.complete&&logo.naturalWidth);
 const title=String(o.title||(intro?'OfficerLab':'Thank you for watching')),subtitle=String(o.subtitle||'');
 const titleA=seg(p,0,reduced?1:(intro?.5:.4)),lineP=seg(p,reduced?0:(intro?.3:.2),reduced?1:(intro?.7:.6)),subA=seg(p,reduced?0:(intro?.6:.5),1),logoA=seg(p,reduced?0:(intro?.7:.4),1);
 ctx.save();const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,panel);g.addColorStop(1,'#05080d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(W*.5,H*.42,0,W*.5,H*.42,Math.max(W,H)*.72);glow.addColorStop(0,accent+'35');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=.22;ctx.strokeStyle=accent;ctx.lineWidth=Math.max(2,scale*3);ctx.beginPath();ctx.arc(W*.5,H*.42,Math.min(W,H)*.34,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(W*.5,H*.42,Math.min(W,H)*.41,0,Math.PI*2);ctx.stroke();
 const logoSize=Math.min(Math.round(Math.min(W,H)*.18),Math.round(W*.15));
 if(hasLogo&&logoA>0){const size=logoSize*(reduced?1:.96+.04*logoA),x=(W-size)/2,y=H*.17+(logoSize-size)/2;ctx.save();ctx.globalAlpha=logoA;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,size,size,Math.max(8,size*.12));else ctx.rect(x,y,size,size);ctx.clip();ctx.drawImage(logo,x,y,size,size);ctx.restore();}
 else if(!hasLogo&&logoA>0){ctx.globalAlpha=logoA;ctx.fillStyle=accent;ctx.font='850 '+Math.max(16,Math.round(W*.018))+'px '+font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('OFFICERLAB',W/2,H*.29,W*.7);}
 const titleY=H*(hasLogo?.53:.44)+(reduced?0:(1-titleA)*H*.035);ctx.globalAlpha=titleA;ctx.fillStyle='#fff';ctx.font='850 '+Math.max(30,Math.round(Math.min(W*.066,H*.105)))+'px '+font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(title,W/2,titleY,W*.82);
 const lineW=W*.18*lineP;if(lineW>.5){ctx.globalAlpha=lineP;ctx.fillStyle=accent;ctx.fillRect((W-lineW)/2,titleY+H*.075,lineW,Math.max(3,Math.round(H*.004)));}
 if(subtitle&&subA>0){ctx.globalAlpha=subA;ctx.fillStyle=accent;ctx.font='550 '+Math.max(17,Math.round(Math.min(W*.027,H*.043)))+'px '+font;ctx.fillText(subtitle,W/2,titleY+Math.max(50,H*.09),W*.78);}
 ctx.globalAlpha=seg(p,reduced?0:(intro?.7:.4),1)*.52;ctx.fillStyle='#fff';ctx.font='650 '+Math.max(11,Math.round(W*.012))+'px system-ui,sans-serif';ctx.fillText(intro?'LEARN  •  PREPARE  •  LEAD':'OFFICERLAB  •  LECTURE STUDIO',W/2,H*.88,W*.7);ctx.restore();
}
const IntroCard=Object.freeze({draw:(ctx,o)=>drawCard(ctx,{...o,kind:'intro'})});
const OutroCard=Object.freeze({draw:(ctx,o)=>drawCard(ctx,{...o,kind:'outro'})});
Object.defineProperty(window,'OfficerLabAnimations',{value:Object.freeze({AnimationScheduler,easing,KenBurns,Transitions,LowerThird,ProgressBar,IntroCard,OutroCard}),configurable:false,writable:false});
})();
