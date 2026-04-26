import React, { useState } from 'react';

/* ──────────────────────────────────────────────────────────────────────────
   SourceViewer — modal that shows annotated GLSL / JS excerpts from the
   scene code. Opened via the Terminal section's "View Source" button.
   ────────────────────────────────────────────────────────────────────────── */

function syntaxHighlight(code, lang) {
  const keywords = lang === 'glsl'
    ? ['uniform','varying','void','float','vec2','vec3','vec4','mat4','int','sampler2D','in','out','main','return','if','for','mix','length','normalize','dot','cross','pow','sin','cos','smoothstep','clamp','abs']
    : ['const','let','var','function','return','if','else','for','while','new','class','import','export','async','await','true','false','null'];
  return code
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\/\/.*/g, m=>`<span style="color:#6b7a99">${m}</span>`)
    .replace(/\/\*[\s\S]*?\*\//g, m=>`<span style="color:#6b7a99">${m}</span>`)
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, m=>`<span style="color:#00ff88">${m}</span>`)
    .replace(/\b(\d+\.?\d*)\b/g,`<span style="color:#ffcc00">$1</span>`)
    .replace(new RegExp(`\\b(${keywords.join('|')})\\b`,'g'),m=>`<span style="color:#00ffff">${m}</span>`);
}

const SOURCE_TABS = [
  { id:'sun', label:'sun.glsl', lang:'glsl', code:`// Sun Surface Shader — FBM granulation + plasma channels
uniform float uTime;
varying float vDisp; varying vec3 vPos;
float fbm(vec3 p){ float v=0.0, a=0.5;
  for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.07; a*=0.5; } return v; }
float ridged(vec3 p){ return 1.0 - abs(fbm(p)*2.0 - 1.0); }
void main(){
  float gran = fbm(vPos*7.0 + uTime*0.3);
  float chan = ridged(vPos*1.6 - uTime*0.15);
  float h = smoothstep(0.30, 0.95, vDisp*0.6 + gran*0.5 + chan*0.35);
  vec3 col = mix(cCool, cMid, smoothstep(0.15, 0.55, h));
  col = mix(col, cHot, smoothstep(0.55, 0.80, h));
  float fres = pow(1.0 - clamp(dot(vViewNormal, vec3(0,0,1)), 0.0, 1.0), 3.0);
  col += fres * vec3(1.0, 0.65, 0.25) * 1.5;
  gl_FragColor = vec4(col, 1.0);
}` },
  { id:'orbital', label:'orbital.js', lang:'js', code:`// Ecliptic orbital mechanics — Kepler's 3rd law
// yf = sin(60°) = 0.866, zf = cos(60°) = 0.5
// orbit is a TRUE CIRCLE in a tilted 3D plane
const ECL_YF = 0.866, ECL_ZF = 0.5;
orbs.forEach((p, i) => {
  const u = p.userData;
  const a = t * u.speed + u.phase; // angular position
  p.position.x = cx + Math.cos(a) * u.radius;
  p.position.y = cy + Math.sin(a) * u.radius * u.yf;
  p.position.z = cz + Math.sin(a) * u.radius * u.zf;
  p.rotation.y += u.spin;
  p.material.uniforms.uSunPos.value.copy(sunWorldPos);
});` },
  { id:'dof', label:'dof.js', lang:'js', code:`// Depth of Field — focal pull during planet fly-in
if (dofEffect) {
  const flyProg = threeRef.current.fly?.prog ?? 0;
  const targetFocusDistance = flyProg > 0.1 ? flyProg * 0.22 : 0.0;
  dofEffect.cocMaterial.uniforms.focusDistance.value +=
    (targetFocusDistance - dofEffect.cocMaterial.uniforms.focusDistance.value) * 0.05;
}
// FOV breathing — pulls wide on zoom, narrows at rest
camera.fov = 38 + Math.sin(t * 0.17) * 0.6 + flyProg * 2.5;
camera.updateProjectionMatrix();` },
  { id:'sss', label:'sss.glsl', lang:'glsl', code:`// E4: Subsurface Scattering — terminator glow + backscatter
uniform vec3 uSSSColor; uniform float uSSSIntensity;
// thickness: thin at limb (where light can scatter through)
float sssThick = pow(1.0 - abs(NdotV), 2.5);
// backscatter: light coming from behind the planet
float backScatter = pow(max(0.0, dot(-L, V)), 3.0) * 0.4;
// strongest at terminator (day/night boundary)
float sssTerminator = smoothstep(-0.15, 0.15, rawNL);
float sssStrength = (1.0 - sssTerminator) * sssThick * 0.6
                  + backScatter * sssThick;
lit += uSSSColor * sssStrength * uRimStrength * 0.3 * uSSSIntensity;` },
  { id:'wormhole', label:'wormhole.glsl', lang:'glsl', code:`// E1: Ray-marched wormhole tunnel — FBM noise + radial color
vec3 tunnelColor(vec3 rd) {
  float t = 0.0;
  for(int i = 0; i < 80; i++) {
    vec3 p = rd * t;
    float r = length(p.xy);
    // FBM-displaced tunnel wall
    float tunnel = r - 1.0 + fbm(vec3(p.xy*0.5, p.z*0.3 - uTime*0.8)) * 0.4;
    if(tunnel < 0.01) {
      float angle = atan(p.y, p.x);
      float stripe = sin(angle*8.0 + p.z*2.0 - uTime*3.0);
      vec3 col = mix(vec3(0,0.8,1), vec3(0.8,0,1), fbm(p*0.8+uTime*0.2));
      col += vec3(stripe*0.3) * (sin(p.z*0.5 - uTime*2.0)*0.5+0.5);
      return col;
    }
    t += max(tunnel * 0.5, 0.02);
  }
  return vec3(0);
}` },
];

export function SourceViewer({ onClose, onHoverBtn, onUnhover }) {
  const [tab, setTab] = useState('sun');
  const [copied, setCopied] = useState(false);
  const current = SOURCE_TABS.find(t => t.id === tab) ?? SOURCE_TABS[0];

  const handleCopy = () => {
    navigator.clipboard?.writeText(current.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      fontFamily:'var(--font-mono)',
    }} onClick={onClose}>
      <div style={{
        width:'min(860px,95vw)', maxHeight:'80vh',
        border:'1px solid rgba(0,255,200,0.2)', borderRadius:12,
        background:'rgba(5,10,20,0.95)', display:'flex', flexDirection:'column',
        overflow:'hidden',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid rgba(0,255,200,0.1)'}}>
          <span style={{color:'rgba(0,255,200,0.6)',fontSize:11,letterSpacing:'0.15em'}}>// VIEW SOURCE</span>
          <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={onClose}
            style={{background:'transparent',border:0,color:'rgba(0,255,200,0.5)',cursor:'none',fontSize:16}}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',gap:0,borderBottom:'1px solid rgba(0,255,200,0.1)',overflowX:'auto'}}>
          {SOURCE_TABS.map(t => (
            <button key={t.id} onMouseEnter={onHoverBtn} onMouseLeave={onUnhover}
              onClick={() => setTab(t.id)}
              style={{
                padding:'10px 18px', background:'transparent', border:0,
                borderBottom: t.id === tab ? '2px solid #00ffcc' : '2px solid transparent',
                color: t.id === tab ? '#00ffcc' : 'rgba(0,255,200,0.4)',
                cursor:'none', fontSize:12, whiteSpace:'nowrap', letterSpacing:'0.05em',
              }}>{t.label}</button>
          ))}
          <button onMouseEnter={onHoverBtn} onMouseLeave={onUnhover} onClick={handleCopy}
            style={{marginLeft:'auto',padding:'10px 18px',background:'transparent',border:0,
              color: copied ? '#00ff88' : 'rgba(0,255,200,0.4)', cursor:'none', fontSize:12,whiteSpace:'nowrap'}}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        {/* Code */}
        <div style={{overflow:'auto',flex:1,padding:'20px'}}>
          <pre style={{margin:0,display:'flex',gap:0}}>
            <div style={{color:'rgba(100,120,140,0.5)',userSelect:'none',paddingRight:20,textAlign:'right',minWidth:36,fontSize:12,lineHeight:1.7}}>
              {current.code.split('\n').map((_,i) => <div key={i}>{i+1}</div>)}
            </div>
            <code style={{fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',wordBreak:'break-word'}}
              dangerouslySetInnerHTML={{__html: syntaxHighlight(current.code, current.lang)}}/>
          </pre>
        </div>
        <div style={{padding:'10px 20px',borderTop:'1px solid rgba(0,255,200,0.1)',color:'rgba(0,255,200,0.3)',fontSize:10}}>
          Press Esc or click outside to close
        </div>
      </div>
    </div>
  );
}
