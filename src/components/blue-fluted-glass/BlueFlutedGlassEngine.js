// Native DOM port of the preserved reference HTML. No iframe or runtime eval.
import { createSurface } from "./motion-runtime";
export function mountBlueFlutedGlass(target, options = {}) {
const scope = createSurface(target, {"markup":"\r\n<!-- Design reference: sasha birukoff, https://x.com/sashabirukoff/status/2113002960892649916/video/1\r\n     Independent procedural reconstruction; original source and its license were not supplied.\r\n     The centered LeiBox artwork is the site's existing outlined wordmark. -->\r\n<main class=\"bfg-stage\" tabindex=\"0\" role=\"button\" aria-label=\"Pause background animation\" aria-pressed=\"false\" data-paused=\"false\">\r\n<canvas class=\"bfg-canvas\" aria-hidden=\"true\"></canvas>\r\n\r\n<span class=\"bfg-sr\" aria-live=\"polite\"></span>\r\n</main>\r\n\r\n","css":"\r\n*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:#f4f4f4}\r\n.bfg-stage{position:relative;display:grid;place-items:center;width:100%;height:100vh;min-height:1px;overflow:hidden;isolation:isolate;background:#f4f4f4;outline:none;cursor:default}\r\n.bfg-stage:focus-visible{outline:3px solid #fff;outline-offset:-7px;box-shadow:inset 0 0 0 9px #0b3c69}\r\n.bfg-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;filter:blur(1.25px);transform:scale(1.008)}\r\n.bfg-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}\r\n","width":1200,"height":833,"responsive":false}, options);
const { document, window, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, setInterval, clearInterval, ResizeObserver, IntersectionObserver, matchMedia } = scope;

const stage = document.querySelector('.bfg-stage');
const canvas = document.querySelector('.bfg-canvas');
const status = document.querySelector('.bfg-sr');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let gl = canvas.getContext('webgl', { alpha:false, antialias:false, depth:false, preserveDrawingBuffer:true });
let program, buffer, timeLocation, sizeLocation;
let frame = 0, last = 0, elapsed = 0, paused = false, visible = true, destroyed = false;
const VERTEX = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
const FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform float time;
float blob(vec2 p,vec2 center,vec2 radius,float angle){
  p-=center;float c=cos(angle),s=sin(angle);
  p=mat2(c,-s,s,c)*p/radius;
  return exp(-dot(p,p));
}
vec3 fluid(vec2 p,float t){
  float s=sin(t),c=cos(t);
  p.x+=.025*sin(p.y*7.0+t*2.0);
  float trunk=blob(p,vec2(.52+.15*s-.07*sin(t*2.0),.76),vec2(.235,.46),-.12-.52*s);
  float crown=blob(p,vec2(.77-.55*s,.20-.10*sin(t*2.0)),vec2(.235,.23),-.50+.45*s);
  float baseY=1.045-.17*p.x+.075*sin(p.x*5.0+t*2.0);
  float base=exp(-pow((p.y-baseY)/.092,2.0));
  float hole=blob(p,vec2(.85-.55*s,.59-.13*s),vec2(.19+.025*c,.32),.1+.5*s);
  float density=(trunk+.56*crown+.90*base)*(1.0-.78*hole);
  vec3 color=mix(vec3(.957),vec3(.66,.80,.89),smoothstep(.015,.20,density));
  color=mix(color,vec3(.10,.48,.73),smoothstep(.16,.49,density));
  color=mix(color,vec3(.015,.135,.28),smoothstep(.40,.73,density));
  color=mix(color,vec3(.008,.025,.087),smoothstep(.62,.93,density));
  return color;
}
void main(){
  vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.0-gl_FragCoord.y/resolution.y);
  // The lenses refract the fluid itself; they are not an opacity stripe overlay.
  float rib=fract(uv.x*71.0)-.5;
  vec2 refracted=uv+vec2(rib*.018,(rib*rib-.0833)*.034);
  float t=time*6.28318530718/28.0;
  vec3 color=fluid(refracted,t)*.40;
  color+=fluid(refracted+vec2(0.,.025),t)*.24;
  color+=fluid(refracted-vec2(0.,.025),t)*.24;
  color+=fluid(refracted+vec2(0.,.055),t)*.06;
  color+=fluid(refracted-vec2(0.,.055),t)*.06;
  float edge=pow(abs(rib)*2.0,10.0);
  float blue=(1.0-color.r)*smoothstep(.02,.18,color.b-color.r);
  color+=vec3(.018,.025,.03)*(rib*.65+edge*.24)*blue;
  gl_FragColor=vec4(clamp(color,0.0,1.0),1.0);
}`;
function shader(type, source) {
  const value = gl.createShader(type);
  gl.shaderSource(value, source); gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) { gl.deleteShader(value); return null; }
  return value;
}
function initialize() {
  if (!gl) return false;
  const vertex=shader(gl.VERTEX_SHADER,VERTEX), fragment=shader(gl.FRAGMENT_SHADER,FRAGMENT);
  if (!vertex || !fragment) { if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);return false; }
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
  gl.useProgram(program);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  timeLocation=gl.getUniformLocation(program,'time');sizeLocation=gl.getUniformLocation(program,'resolution');
  return true;
}
if (!initialize()) {
  if(gl){if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
  gl=null;
  const fallback=canvas.cloneNode();canvas.replaceWith(fallback);
  // Keep a working static composition when WebGL is unavailable.
  const ctx=fallback.getContext('2d');fallback.width=960;fallback.height=666;
  ctx.fillStyle='#f4f4f4';ctx.fillRect(0,0,960,666);
  const gradient=ctx.createRadialGradient(525,520,20,525,520,440);
  gradient.addColorStop(0,'#020820');gradient.addColorStop(.45,'#073d69');gradient.addColorStop(.7,'#378fbe');gradient.addColorStop(1,'#f4f4f4');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,960,666);
  stage.dataset.renderer='fallback';
} else stage.dataset.renderer='webgl';
function render() {
  if(!gl||destroyed)return;
  gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(sizeLocation,canvas.width,canvas.height);gl.uniform1f(timeLocation,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);
  stage.dataset.time=elapsed.toFixed(3);
  document.body.dataset.motionReady='true';
}
function reduced(){return typeof scope!=='undefined'?scope.reduced():media.matches;}
function running(){return gl&&!destroyed&&!paused&&!reduced()&&visible&&!document.hidden;}
function tick(now){
  frame=0;
  if(!running()){last=0;stage.dataset.paused=String(paused||reduced());return;}
  if(last)elapsed+=Math.min((now-last)/1000,.05);
  last=now;render();frame=requestAnimationFrame(tick);
}
function sync(){
  cancelAnimationFrame(frame);frame=0;last=0;
  if(!gl){stage.dataset.paused='true';stage.tabIndex=-1;stage.setAttribute('role','img');stage.setAttribute('aria-label','LeiBox on a static blue background');stage.removeAttribute('aria-pressed');return;}
  stage.dataset.paused=String(paused||reduced());
  stage.setAttribute('aria-pressed',String(paused));
  stage.setAttribute('aria-label',paused?'Resume background animation':'Pause background animation');
  render();if(running())frame=requestAnimationFrame(tick);
}
function resize(){
  const bounds=scope.rect(stage),dpr=Math.min(window.devicePixelRatio||1,1.5);
  canvas.width=Math.max(1,Math.round(bounds.width*dpr));canvas.height=Math.max(1,Math.round(bounds.height*dpr));
  sync();
}
function toggle(){paused=!paused;status.textContent=paused?'Animation paused':'Animation playing';sync();}
stage.addEventListener('click',toggle);
function keydown(event){if(event.key===' '||event.key==='Enter'){event.preventDefault();toggle();}}
stage.addEventListener('keydown',keydown);
media.addEventListener('change',sync);
document.addEventListener('visibilitychange',sync);
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});intersection.observe(stage);
// Native package options can change independently of the system media query.
const preferenceObserver=typeof scope!=='undefined'?new MutationObserver(sync):null;
if(preferenceObserver)preferenceObserver.observe(scope.element,{attributes:true,attributeFilter:['data-reduced-motion']});
function dispose(){
  if(destroyed)return;destroyed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();intersection.disconnect();
  preferenceObserver?.disconnect();
  stage.removeEventListener('click',toggle);stage.removeEventListener('keydown',keydown);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',sync);
  if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
window.addEventListener('pagehide',dispose,{once:true});
if(typeof scope!=='undefined')scope.addCleanup(dispose);
resize();
document.body.dataset.motionReady='true';


scope.ready();
return scope.controller;
}
