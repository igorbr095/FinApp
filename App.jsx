import { useState, useEffect, useCallback } from "react";

const pad = (n) => String(n).padStart(2, "0");
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const mesAtual = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
const fmtBRL = (v) => "R$\u00a0" + Number(v).toLocaleString("pt-BR", { minimumFractionDigits:2, maximumFractionDigits:2 });
const fmtBRLShort = (v) => { const n=Math.abs(v); const s=v<0?"-":""; if(n>=1000) return s+"R$\u00a0"+(n/1000).toFixed(1).replace(".",",")+"k"; return s+fmtBRL(v); };
const fmtData = (s) => { if(!s) return ""; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const fmtMes = (s) => { if(!s||!s.includes("-")) return ""; const [y,m]=s.split("-").map(Number); return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][m-1]+"/"+String(y).slice(2); };
const fmtMesLong = (s) => { if(!s||!s.includes("-")) return ""; const [y,m]=s.split("-").map(Number); return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][m-1]+" "+y; };
const mesOffset = (inicio,n) => { if(!inicio||!inicio.includes("-")) return mesAtual(); const [y,m]=inicio.split("-").map(Number); const t=m-1+n; return `${y+Math.floor(t/12)}-${pad((t%12)+1)}`; };
const prevMeses = (mes,n) => { const base=mes&&mes.includes("-")?mes:mesAtual(); return Array.from({length:n},(_,i)=>mesOffset(base,-(n-1-i))); };

const TIPOS_FLEX = {
  uber:   { label:"🚗 Uber / App",  custos:["⛽ Combustível","🛣️ Pedágio","🍔 Alimentação","🔧 Manutenção","📦 Outro"], km:true },
  freela: { label:"💡 Freela",      custos:["🚌 Transporte","🍔 Alimentação","🛠️ Ferramentas","📦 Outro"], km:false },
  outro:  { label:"📦 Outro",       custos:["🚌 Transporte","🍔 Alimentação","📦 Outro"], km:false },
};
const CATS_FIXAS = { salario:"💼 Salário", aluguel:"🏠 Aluguel", pensao:"👨‍👩‍👧 Pensão", dividendo:"📈 Dividendo", outro:"📦 Outro" };
const CATS_FIXOS = { moradia:"🏠 Moradia", transporte:"🚗 Transporte", cartao:"💳 Cartão", saude:"❤️ Saúde", educacao:"📚 Educação", assinatura:"📱 Assinatura", outro:"📦 Outro" };

const parcelaMes = (p,mes) => { const [yi,mi]=p.inicio.split("-").map(Number); const [yr,mr]=mes.split("-").map(Number); const diff=(yr-yi)*12+(mr-mi); if(diff<0||diff>=p.parcelas) return 0; return p.valorTotal/p.parcelas; };
const idxParcelaAtual = (p,mes) => { const [yi,mi]=p.inicio.split("-").map(Number); const [yr,mr]=mes.split("-").map(Number); return (yr-yi)*12+(mr-mi); };
const diasRestantes = (cfg) => { const d=new Date(); const [y,m]=cfg.mes.split("-").map(Number); if(y!==d.getFullYear()||m!==d.getMonth()+1) return cfg.dias||16; return Math.max(1,Math.round((cfg.dias||16)*(1-d.getDate()/new Date(y,m,0).getDate()))); };

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
const SB_URL = "https://znvdplshycsmojvjicdu.supabase.co";
const SB_KEY = "sb_publishable_AeYEh0kid1FiXXY3KnJEHQ_bBQzdBeT";
const USER_ID = "user_default"; // fixo por enquanto, vira dinâmico com login

async function sGet(key) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/fin_dados?user_id=eq.${USER_ID}&chave=eq.${key}&select=valor`, {
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }
    });
    const data = await res.json();
    return data && data.length > 0 ? data[0].valor : null;
  } catch(e) {
    try { return localStorage.getItem(key); } catch(e2) { return null; }
  }
}

async function sSet(key, val) {
  try {
    await fetch(`${SB_URL}/rest/v1/fin_dados`, {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({ user_id: USER_ID, chave: key, valor: val, updated_at: new Date().toISOString() })
    });
  } catch(e) {
    try { localStorage.setItem(key, val); } catch(e2) {}
  }
}

// ── NEON PALETTE ──────────────────────────────────────────────────────────────
const C = {
  green:  "#00ff88",
  blue:   "#00cfff",
  red:    "#ff4466",
  amber:  "#ffaa00",
  purple: "#bf5fff",
  teal:   "#00e5cc",
  bg:     "#080c10",
  bg2:    "#0d1219",
  bg3:    "#121a24",
  border: "rgba(0,207,255,0.12)",
  border2:"rgba(0,255,136,0.15)",
  text:   "#e8f4ff",
  text2:  "#5a7a99",
  text3:  "#2a4055",
};

const glow = (color, size=8) => `0 0 ${size}px ${color}40, 0 0 ${size*2}px ${color}20`;
const glowStrong = (color) => `0 0 12px ${color}80, 0 0 24px ${color}40, 0 0 40px ${color}20`;

// ── Estilos base ──────────────────────────────────────────────────────────────
const inp = {width:"100%",height:44,background:C.bg3,border:`0.5px solid ${C.border}`,borderRadius:10,padding:"0 14px",fontSize:15,color:C.text,fontFamily:"inherit",outline:"none",boxSizing:"border-box"};
const sel = {...inp,appearance:"none"};
const sec = {background:C.bg2,border:`0.5px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:14};
const sttl= {fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:14};
const card= {background:C.bg2,border:`0.5px solid ${C.border}`,borderRadius:14,padding:"14px 12px"};
const clbl= {fontSize:10,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8};
const cval= {fontSize:17,fontWeight:700,fontFamily:"'DM Mono',monospace",letterSpacing:-0.5};
const btn = (bg,fg="#080c10",gColor)=>({width:"100%",height:48,background:bg,color:fg,border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4,fontFamily:"inherit",boxShadow:gColor?glow(gColor,10):"none",transition:"all 0.2s"});
const fg_ = {marginBottom:12};
const fl_ = {fontSize:12,color:C.text2,marginBottom:6,display:"block"};
const cfgI= {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`0.5px solid ${C.border}`};
const cfgInp={width:110,height:36,background:C.bg3,border:`0.5px solid ${C.border}`,borderRadius:10,padding:"0 10px",fontSize:14,color:C.text,fontFamily:"'DM Mono',monospace",textAlign:"right",outline:"none"};
const divid={height:"0.5px",background:C.border,margin:"12px 0"};
const inpRow={display:"grid",gridTemplateColumns:"1fr 1fr",gap:10};

// ── Componentes ───────────────────────────────────────────────────────────────
function ProgBar({pct,color}) {
  const col=color||C.green;
  return <div style={{background:C.bg3,borderRadius:4,height:4,overflow:"hidden",marginBottom:6}}>
    <div style={{height:"100%",borderRadius:4,width:`${Math.min(100,pct)}%`,background:col,boxShadow:glow(col,4),transition:"width 0.5s"}}/>
  </div>;
}

function NeonCard({label,value,color,size=17}) {
  return <div style={{...card,border:`0.5px solid ${color}30`}}>
    <div style={clbl}>{label}</div>
    <div style={{...cval,fontSize:size,color,textShadow:glow(color,6)}}>{value}</div>
  </div>;
}

function HI({left,sub,right,color,onDel}) {
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`0.5px solid ${C.border}`}}>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:14,fontWeight:500,color:C.text}}>{left}</div>
      {sub&&<div style={{fontSize:11,color:C.text2,marginTop:3}}>{sub}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
      <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:600,color,textShadow:glow(color,4)}}>{right}</span>
      {onDel&&<button onClick={onDel} style={{background:"none",border:"none",color:C.text3,fontSize:15,cursor:"pointer",padding:4}}>🗑</button>}
    </div>
  </div>;
}

function Modal({item,onConfirm,onCancel}) {
  if(!item) return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:999,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onCancel}>
    <div style={{background:C.bg2,border:`0.5px solid ${C.border}`,borderRadius:"18px 18px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:17,fontWeight:700,marginBottom:8,color:C.text}}>Remover item?</div>
      <div style={{fontSize:14,color:C.text2,marginBottom:24}}>{item.nome}</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onCancel} style={{flex:1,height:48,background:C.bg3,color:C.text,border:`0.5px solid ${C.border}`,borderRadius:12,fontSize:15,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Cancelar</button>
        <button onClick={onConfirm} style={{flex:1,height:48,background:C.red,color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:glow(C.red)}}>Remover</button>
      </div>
    </div>
  </div>;
}

function MiniChart({meses,data,color,gradId,mesAtualIdx,label}) {
  const W=320,H=110,PX=28,PY=16;
  const vals=data.filter(v=>v!=null&&v>0);
  const maxV=vals.length?Math.max(...vals)*1.25:1000;
  const toX=(i)=>PX+(i/(meses.length-1))*(W-PX*2);
  const toY=(v)=>H-PY-(v/maxV)*(H-PY*2);
  const pts=data.map((v,i)=>v!=null&&v>0?[toX(i),toY(v)]:null);
  const valid=pts.filter(Boolean);
  const buildPath=(filled)=>{
    if(valid.length<1) return null;
    if(valid.length===1) return filled?null:`M${valid[0][0]},${valid[0][1]}`;
    let d=`M${valid[0][0]},${valid[0][1]}`;
    for(let i=1;i<valid.length;i++){const mx=(valid[i][0]+valid[i-1][0])/2;d+=` C${mx},${valid[i-1][1]},${mx},${valid[i][1]},${valid[i][0]},${valid[i][1]}`;}
    if(filled) d+=` L${valid[valid.length-1][0]},${H-PY} L${valid[0][0]},${H-PY} Z`;
    return d;
  };
  return <div style={{marginBottom:4}}>
    <div style={{fontSize:11,fontWeight:700,color,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8,textShadow:glow(color,4)}}>{label}</div>
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",overflow:"visible"}}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
        <filter id={`glow_${gradId}`}><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.33,0.66,1].map(f=><line key={f} x1={PX} y1={H-PY-(f*(H-PY*2))} x2={W-PX} y2={H-PY-(f*(H-PY*2))} stroke={`${color}15`} strokeWidth="1"/>)}
      {buildPath(true)&&<path d={buildPath(true)} fill={`url(#${gradId})`}/>}
      {buildPath(false)&&<path d={buildPath(false)} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow_${gradId})`}/>}
      {meses.map((mes,i)=>{
        const isAtual=i===mesAtualIdx; const p=pts[i];
        return <g key={mes}>
          {isAtual&&<rect x={toX(i)-22} y={PY-8} width={44} height={H-PY*2+16} rx={8} fill={`${color}08`} stroke={`${color}40`} strokeWidth="1"/>}
          {p&&<circle cx={p[0]} cy={p[1]} r={isAtual?5:3} fill={isAtual?C.bg:color} stroke={color} strokeWidth={isAtual?2:0} filter={`url(#glow_${gradId})`}/>}
          {isAtual&&p&&<text x={p[0]} y={p[1]-11} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{fmtBRLShort(data[i])}</text>}
          <text x={toX(i)} y={H-2} textAnchor="middle" fontSize="8.5" fill={isAtual?C.blue:C.text3}>{fmtMes(mes)}</text>
        </g>;
      })}
    </svg>
  </div>;
}

// ── Calculadora de combustível ────────────────────────────────────────────────
function CalcCombustivel({onUsar}) {
  const [abast,setAbast]   = useState("");
  const [km,setKm]         = useState("");
  const [media,setMedia]   = useState("10");
  const [open,setOpen]     = useState(false);
  const [preco,setPreco]   = useState("");
  const res = (() => {
    const a=parseFloat(abast), k=parseFloat(km), m=parseFloat(media), p=parseFloat(preco);
    if(!k||!m||m<=0) return null;
    if(p>0) {
      // método 1: com preço por litro
      const litrosUsados = k/m;
      const custo = litrosUsados*p;
      return {custo, litrosPorKm:(1/m), custoPorKm:p/m, metodo:"com preço/litro"};
    }
    if(a>0) {
      // método 2: sem preço, usa preço médio gasolina BR ~R$5.80
      const precoEstimado = 5.80;
      const litrosUsados = k/m;
      const custo = litrosUsados*precoEstimado;
      return {custo, litrosPorKm:(1/m), custoPorKm:precoEstimado/m, metodo:"estimado (R$5,80/L)"};
    }
    return null;
  })();

  if(!open) return (
    <button onClick={()=>setOpen(true)} style={{background:"none",border:`0.5px dashed ${C.blue}50`,borderRadius:10,padding:"10px 14px",fontSize:13,color:C.blue,cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:12,textAlign:"left"}}>
      ⛽ Não sabe o custo de combustível? Calcular aqui →
    </button>
  );

  return (
    <div style={{background:`${C.blue}08`,border:`0.5px solid ${C.blue}30`,borderRadius:12,padding:16,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,color:C.blue,textShadow:glow(C.blue,4)}}>⛽ Calculadora de combustível</div>
        <button onClick={()=>setOpen(false)} style={{background:"none",border:"none",color:C.text2,cursor:"pointer",fontSize:13}}>✕</button>
      </div>
      <div style={inpRow}>
        <div style={fg_}><label style={{...fl_,color:C.blue}}>Km rodados</label>
          <input style={inp} type="number" placeholder="Ex: 120" inputMode="decimal" value={km} onChange={e=>setKm(e.target.value)}/></div>
        <div style={fg_}><label style={{...fl_,color:C.blue}}>Média (km/L)</label>
          <input style={inp} type="number" placeholder="Ex: 10" inputMode="decimal" value={media} onChange={e=>setMedia(e.target.value)}/></div>
      </div>
      <div style={inpRow}>
        <div style={fg_}><label style={{...fl_,color:C.blue}}>Preço/litro (R$)</label>
          <input style={inp} type="number" placeholder="Ex: 5.89" inputMode="decimal" value={preco} onChange={e=>setPreco(e.target.value)}/></div>
        <div style={fg_}><label style={{...fl_,color:C.text3}}>Valor abastecido (R$)</label>
          <input style={{...inp,opacity:0.6}} type="number" placeholder="Opcional" inputMode="decimal" value={abast} onChange={e=>setAbast(e.target.value)}/></div>
      </div>
      {res&&<>
        <div style={{background:C.bg3,borderRadius:10,padding:"12px 14px",marginBottom:12,border:`0.5px solid ${C.blue}30`}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
            <span style={{color:C.text2}}>Litros usados</span>
            <span style={{fontFamily:"'DM Mono',monospace",color:C.text}}>{(parseFloat(km)/parseFloat(media)).toFixed(2)} L</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
            <span style={{color:C.text2}}>Custo/km</span>
            <span style={{fontFamily:"'DM Mono',monospace",color:C.text}}>{fmtBRL(res.custoPorKm)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:10}}>
            <span style={{color:C.text2}}>Método</span>
            <span style={{fontSize:11,color:C.text3}}>{res.metodo}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700}}>
            <span>Custo estimado</span>
            <span style={{fontFamily:"'DM Mono',monospace",color:C.blue,textShadow:glow(C.blue,6)}}>{fmtBRL(res.custo)}</span>
          </div>
        </div>
        <button onClick={()=>{onUsar(res.custo.toFixed(2));setOpen(false);}} style={{...btn(C.blue,"#080c10",C.blue),height:40,fontSize:13}}>
          ✓ Usar este valor como custo de combustível
        </button>
      </>}
      {!res&&km&&media&&<div style={{fontSize:12,color:C.text3,marginTop:4}}>Informe o preço por litro para calcular o custo.</div>}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]         = useState("dashboard");
  const [menuOpen,setMenuOpen] = useState(false);
  const [ready,setReady]       = useState(false);
  const [modal,setModal]       = useState(null);

  const [config,setConfig]       = useState({dias:16,mes:mesAtual()});
  const [recFixas,setRecFixas]   = useState([]);
  const [rendas,setRendas]       = useState([]);
  const [pessoais,setPessoais]   = useState([]);
  const [fixos,setFixos]         = useState([]);
  const [historico,setHistorico] = useState({});

  // forms receitas fixas
  const [fRfCat,setFRfCat]   = useState("salario");
  const [fRfDesc,setFRfDesc] = useState("");
  const [fRfVal,setFRfVal]   = useState("");
  const [fRfData,setFRfData] = useState(hoje());

  // forms renda flexível
  const [fFlTipo,setFFlTipo]     = useState("uber");
  const [fFlDesc,setFFlDesc]     = useState("");
  const [fFlBruto,setFFlBruto]   = useState("");
  const [fFlKm,setFFlKm]         = useState("");
  const [fFlCustos,setFFlCustos] = useState([{desc:"",valor:""}]);

  // forms fixos
  const [fFxNome,setFFxNome]   = useState("");
  const [fFxValor,setFFxValor] = useState("");
  const [fFxCat,setFFxCat]     = useState("moradia");

  // forms parcelados
  const [fPpNome,setFPpNome]     = useState("");
  const [fPpValor,setFPpValor]   = useState("");
  const [fPpParc,setFPpParc]     = useState("1");
  const [fPpInicio,setFPpInicio] = useState(mesAtual());

  // config
  const [cfgDias,setCfgDias] = useState("16");
  const [cfgMes,setCfgMes]   = useState(mesAtual());

  // IA
  const [iaAnalise,setIaAnalise]   = useState(null);
  const [iaLoading,setIaLoading]   = useState(false);
  const [iaMensagem,setIaMensagem] = useState("");
  const [iaChat,setIaChat]         = useState([]);

  useEffect(()=>{
    (async()=>{
      let cfg={dias:16,mes:mesAtual()};
      try{const r=await sGet("fin4_config");if(r)cfg={...cfg,...JSON.parse(r)};}catch(e){}
      setConfig(cfg); setCfgDias(String(cfg.dias)); setCfgMes(cfg.mes); setFPpInicio(cfg.mes);
      try{const r=await sGet("fin4_rf_"+cfg.mes);if(r)setRecFixas(JSON.parse(r));}catch(e){}
      try{const r=await sGet("fin4_fl_"+cfg.mes);if(r)setRendas(JSON.parse(r));}catch(e){}
      try{const r=await sGet("fin4_pes");if(r)setPessoais(JSON.parse(r));}catch(e){}
      try{const r=await sGet("fin4_fix_"+cfg.mes);if(r)setFixos(JSON.parse(r));}catch(e){}
      try{const r=await sGet("fin4_hist");if(r)setHistorico(JSON.parse(r));}catch(e){}
      setReady(true);
    })();
  },[]);

  const saveRf  = useCallback(async(d)=>await sSet("fin4_rf_"+config.mes,JSON.stringify(d)),[config.mes]);
  const saveFl  = useCallback(async(d)=>await sSet("fin4_fl_"+config.mes,JSON.stringify(d)),[config.mes]);
  const savePes = useCallback(async(d)=>await sSet("fin4_pes",JSON.stringify(d)),[]);
  const saveFix = useCallback(async(d)=>await sSet("fin4_fix_"+config.mes,JSON.stringify(d)),[config.mes]);
  const saveHist= useCallback(async(d)=>await sSet("fin4_hist",JSON.stringify(d)),[]);

  const totalRecFixas  = recFixas.reduce((s,r)=>s+r.valor,0);
  const rendasComLiq   = rendas.map(r=>({...r, totalCustos:(r.custos||[]).reduce((s,c)=>s+(parseFloat(c.valor)||0),0), liquido:r.bruto-(r.custos||[]).reduce((s,c)=>s+(parseFloat(c.valor)||0),0)}));
  const totalBrutoFlex = rendas.reduce((s,r)=>s+r.bruto,0);
  const totalCustosFlex= rendasComLiq.reduce((s,r)=>s+r.totalCustos,0);
  const totalLiqFlex   = rendasComLiq.reduce((s,r)=>s+r.liquido,0);
  const totalRec       = totalRecFixas+totalLiqFlex;
  const totalPess      = pessoais.reduce((s,p)=>s+parcelaMes(p,config.mes),0);
  const totalFixos     = fixos.reduce((s,f)=>s+f.valor,0);
  const totalSaidas    = totalFixos+totalPess;
  const saldo          = totalRec-totalSaidas;
  const dr             = diasRestantes(config);
  const parcsAtivas    = pessoais.filter(p=>parcelaMes(p,config.mes)>0).length;

  const atualizarHist = useCallback(async(nRf,nFl,nFix,nPes)=>{
    const rec=(nRf||recFixas).reduce((s,x)=>s+x.valor,0)+(nFl||rendas).reduce((s,r)=>s+(r.liquido||(r.bruto-(r.custos||[]).reduce((s2,c)=>s2+(parseFloat(c.valor)||0),0))),0);
    const gas=(nFix||fixos).reduce((s,x)=>s+x.valor,0)+(nPes||pessoais).reduce((s,p)=>s+parcelaMes(p,config.mes),0);
    const h={...historico,[config.mes]:{rec,gas}};
    setHistorico(h); await saveHist(h);
  },[historico,recFixas,rendas,fixos,pessoais,config.mes,saveHist]);

  async function addRecFixa(){const v=parseFloat(fRfVal);if(!v||v<=0)return;const n=[...recFixas,{id:Date.now(),cat:fRfCat,desc:fRfDesc,valor:v,data:fRfData||hoje()}];setRecFixas(n);await saveRf(n);await atualizarHist(n);setFRfVal("");setFRfDesc("");navigate("dashboard");}
  function delRf(r){setModal({nome:`${CATS_FIXAS[r.cat]} — ${fmtBRL(r.valor)}`,onConfirm:async()=>{const n=recFixas.filter(x=>x.id!==r.id);setRecFixas(n);await saveRf(n);await atualizarHist(n);setModal(null);}});}

  async function addRenda(){
    const bruto=parseFloat(fFlBruto);if(!bruto||bruto<=0)return;
    const custosV=fFlCustos.filter(c=>c.desc&&parseFloat(c.valor)>0).map(c=>({desc:c.desc,valor:parseFloat(c.valor)}));
    const totalC=custosV.reduce((s,c)=>s+c.valor,0);
    const r={id:Date.now(),tipo:fFlTipo,desc:fFlDesc,bruto,custos:custosV,km:parseFloat(fFlKm)||0,liquido:bruto-totalC};
    const n=[...rendas,r];
    setRendas(n);await saveFl(n);await atualizarHist(null,n);
    setFFlBruto("");setFFlDesc("");setFFlKm("");setFFlCustos([{desc:"",valor:""}]);
    navigate("dashboard");
  }
  function delRenda(r){setModal({nome:`${TIPOS_FLEX[r.tipo]?.label} — ${fmtBRL(r.bruto)}`,onConfirm:async()=>{const n=rendas.filter(x=>x.id!==r.id);setRendas(n);await saveFl(n);await atualizarHist(null,n);setModal(null);}});}
  const addCusto=()=>setFFlCustos([...fFlCustos,{desc:"",valor:""}]);
  const setCusto=(i,campo,val)=>setFFlCustos(fFlCustos.map((c,idx)=>idx===i?{...c,[campo]:val}:c));
  const delCusto=(i)=>setFFlCustos(fFlCustos.filter((_,idx)=>idx!==i));
  const usarCustoCombustivel=(val)=>{
    const idx=fFlCustos.findIndex(c=>c.desc.includes("Combustível")||c.desc==="");
    if(idx>=0) setCusto(idx,"desc","⛽ Combustível");
    const newCustos=fFlCustos.map((c,i)=>i===(idx>=0?idx:0)?{desc:"⛽ Combustível",valor:val}:c);
    if(idx<0) setFFlCustos([...fFlCustos,{desc:"⛽ Combustível",valor:val}]);
    else setFFlCustos(newCustos);
  };

  async function addFixo(){const nome=fFxNome.trim(),valor=parseFloat(fFxValor);if(!nome||!valor||valor<=0)return;const n=[...fixos,{id:Date.now(),nome,valor,cat:fFxCat}];setFixos(n);await saveFix(n);await atualizarHist(null,null,n);setFFxNome("");setFFxValor("");}
  function delFixo(f){setModal({nome:`${f.nome} — ${fmtBRL(f.valor)}`,onConfirm:async()=>{const n=fixos.filter(x=>x.id!==f.id);setFixos(n);await saveFix(n);await atualizarHist(null,null,n);setModal(null);}});}
  async function editFixoValor(id,val){const n=fixos.map(f=>f.id===id?{...f,valor:parseFloat(val)||0}:f);setFixos(n);await saveFix(n);}

  async function addPessoal(){const nome=fPpNome.trim(),valor=parseFloat(fPpValor),parcelas=parseInt(fPpParc)||1;if(!nome||!valor||valor<=0)return;const n=[...pessoais,{id:Date.now(),nome,valorTotal:valor,parcelas,inicio:fPpInicio||config.mes,pagas:[]}];setPessoais(n);await savePes(n);await atualizarHist(null,null,null,n);setFPpNome("");setFPpValor("");setFPpParc("1");}
  function delPes(p){setModal({nome:p.nome,onConfirm:async()=>{const n=pessoais.filter(x=>x.id!==p.id);setPessoais(n);await savePes(n);await atualizarHist(null,null,null,n);setModal(null);}});}
  async function toggleParcela(pid,idx){const n=pessoais.map(p=>{if(p.id!==pid)return p;const pg=p.pagas||[];const pos=pg.indexOf(idx);return{...p,pagas:pos>=0?pg.filter((_,i)=>i!==pos):[...pg,idx]};});setPessoais(n);await savePes(n);}

  async function saveConfig(){
    const nm=cfgMes||mesAtual();
    const cfg2={dias:parseInt(cfgDias)||16,mes:nm};
    setConfig(cfg2);await sSet("fin4_config",JSON.stringify(cfg2));
    if(nm!==config.mes){
      try{const r=await sGet("fin4_rf_"+nm);setRecFixas(r?JSON.parse(r):[]);}catch(e){setRecFixas([]);}
      try{const r=await sGet("fin4_fl_"+nm);setRendas(r?JSON.parse(r):[]);}catch(e){setRendas([]);}
      try{const r=await sGet("fin4_fix_"+nm);setFixos(r?JSON.parse(r):[]);}catch(e){setFixos([]);}
      setFPpInicio(nm);
    }
    navigate("dashboard");
  }
  function resetMes(){setModal({nome:"todos os dados do mês",onConfirm:async()=>{setRecFixas([]);setRendas([]);setFixos([]);await saveRf([]);await saveFl([]);await saveFix([]);setModal(null);}});}

  function gerarAnalise(){
    setIaLoading(true);setIaChat([]);
    setTimeout(()=>{
      const linhas=[];
      if(totalRec===0&&totalSaidas===0){linhas.push("📊 Nenhum dado registrado. Cadastre receitas e gastos para ver a análise!");setIaAnalise(linhas.join("\n\n"));setIaChat([{role:"assistant",content:linhas.join("\n\n")}]);setIaLoading(false);return;}
      const cobertura=totalSaidas>0?(totalRec/totalSaidas*100):100;
      const pctParc=totalSaidas>0?(totalPess/totalSaidas*100):0;
      const margemFlex=totalBrutoFlex>0?(totalLiqFlex/totalBrutoFlex*100):0;
      if(saldo>=0) linhas.push(`✅ Saldo positivo de ${fmtBRL(saldo)} em ${fmtMesLong(config.mes)}. ${cobertura>=120?"Suas receitas cobrem folgadamente as saídas!":"Você está no azul, mas com margem pequena."}`);
      else linhas.push(`🔴 Deficit de ${fmtBRL(Math.abs(saldo))} — suas saídas superam as receitas em ${fmtMesLong(config.mes)}.`);
      const alertas=[];
      if(saldo<0) alertas.push(`⚠️ Deficit de ${fmtBRL(Math.abs(saldo))} — revise gastos ou aumente rendas flexíveis.`);
      if(margemFlex<50&&totalBrutoFlex>0) alertas.push(`⚠️ Margem nas rendas flexíveis de apenas ${margemFlex.toFixed(0)}% — você está gastando muito para gerar essa renda.`);
      if(pctParc>40) alertas.push(`⚠️ Parcelamentos comprometem ${pctParc.toFixed(0)}% das saídas (${fmtBRL(totalPess)}/mês). Evite novos parcelamentos.`);
      if(totalRecFixas===0) alertas.push(`⚠️ Sem receitas fixas cadastradas. Depender só de renda flexível exige reserva de emergência maior.`);
      if(alertas.length>0) linhas.push(alertas.slice(0,3).join("\n\n"));
      const sugestoes=[];
      if(saldo>0){
        const sobra=saldo;
        if(sobra>=1000) sugestoes.push(`💡 ${fmtBRL(sobra)} de sobra — considere 50% em Tesouro Selic + 50% em CDB liquidez diária. Rendimento superior à poupança com segurança.`);
        else if(sobra>=300) sugestoes.push(`💡 Sobrou ${fmtBRL(sobra)} — guarde em conta remunerada 100% CDI (Nubank, Inter). Com constância vira sua reserva de emergência.`);
        else sugestoes.push(`💡 Sobrou ${fmtBRL(sobra)} — guarde em conta remunerada. Todo real conta.`);
        if(totalRecFixas===0&&sobra>=500) sugestoes.push(`💡 Priorize reserva de emergência de ${fmtBRL(totalSaidas*4)} (4 meses de gastos) antes de outros investimentos.`);
      }
      if(sugestoes.length>0) linhas.push(sugestoes.slice(0,2).join("\n\n"));
      linhas.push(saldo>=0&&cobertura>=120?"🎯 Continue assim! Consistência é o caminho para a liberdade financeira.":saldo>=0?"🎯 Saldo positivo é ótimo começo. Foque em ampliar a margem mês a mês.":"🎯 Encarar os números é o primeiro passo. Você está no controle — comece pelo maior gasto desnecessário.");
      const texto=linhas.join("\n\n");
      setIaAnalise(texto);setIaChat([{role:"assistant",content:texto}]);setIaLoading(false);
    },900);
  }

  function responderLocal(pergunta){
    const p=pergunta.toLowerCase();const sobra=saldo;
    const margemFlex=totalBrutoFlex>0?(totalLiqFlex/totalBrutoFlex*100):0;
    if(p.includes("invest")||p.includes("aplicar")||p.includes("guardar")){if(sobra<=0)return`Saldo negativo (${fmtBRL(sobra)}). Foque em equilibrar receitas e saídas antes de investir.`;if(sobra<300)return`Com ${fmtBRL(sobra)}: guarde em conta remunerada 100% CDI (Nubank, Inter, PicPay).`;if(sobra<2000)return`Com ${fmtBRL(sobra)}: 60% Tesouro Selic + 40% CDB liquidez diária. Meta: reserva de ${fmtBRL(totalSaidas*3)}.`;return`Com ${fmtBRL(sobra)}: complete reserva (${fmtBRL(totalSaidas*3)}), depois Tesouro Selic médio prazo e CDB acima de 110% CDI.`;}
    if(p.includes("margem")||p.includes("lucro")||p.includes("líquido")){if(totalBrutoFlex===0)return"Nenhuma renda flexível registrada ainda.";return`Rendas flexíveis: bruto ${fmtBRL(totalBrutoFlex)}, custos ${fmtBRL(totalCustosFlex)}, líquido ${fmtBRL(totalLiqFlex)} (margem ${margemFlex.toFixed(0)}%).`;}
    if(p.includes("combustível")||p.includes("gasolina")){return"Para calcular o custo de combustível, vá em Rendas Flexíveis → registre uma renda Uber e use a calculadora ⛽ integrada no formulário.";}
    if(p.includes("reserva")||p.includes("emergência")){return`Reserva ideal: 3-6 meses de gastos = ${fmtBRL(totalSaidas*3)} a ${fmtBRL(totalSaidas*6)}. Guarde a sobra mensal em conta com liquidez diária.`;}
    if(p.includes("parcel")||p.includes("dívida")){if(totalPess===0)return"Sem parcelamentos ativos este mês. Ótimo!";return`Parcelamentos: ${fmtBRL(totalPess)}/mês. ${totalPess/totalSaidas>0.4?"Acima do recomendado (máx. 30%). Evite novos.":"Dentro do limite saudável."}`;}
    if(p.includes("saldo")||p.includes("situação")){return`Saldo: ${fmtBRL(saldo)} (receitas ${fmtBRL(totalRec)} − saídas ${fmtBRL(totalSaidas)}). ${saldo>=0?"✅ Positivo!":"⚠️ Negativo."}`;}
    return`Dados: receita líquida ${fmtBRL(totalRec)}, saídas ${fmtBRL(totalSaidas)}, saldo ${fmtBRL(saldo)}. Pergunte sobre: investimentos, margem das rendas, reserva de emergência ou parcelamentos.`;
  }

  function enviarMensagem(){if(!iaMensagem.trim()||iaLoading)return;const msg=iaMensagem;const novoChat=[...iaChat,{role:"user",content:msg}];setIaChat(novoChat);setIaMensagem("");setIaLoading(true);setTimeout(()=>{const r=responderLocal(msg);setIaChat([...novoChat,{role:"assistant",content:r}]);setIaLoading(false);},600);}

  const navigate=(p)=>{setPage(p);setMenuOpen(false);window.scrollTo(0,0);};

  const ultMeses=prevMeses(config.mes,6);
  const mesAtualIdx=ultMeses.indexOf(config.mes);
  const dataRec=ultMeses.map(m=>m===config.mes?totalRec||null:historico[m]?.rec||null);
  const dataGas=ultMeses.map(m=>m===config.mes?totalSaidas||null:historico[m]?.gas||null);

  if(!ready) return <div style={{background:C.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.text2,fontFamily:"sans-serif",fontSize:14}}>Carregando...</div>;

  const MENU=[
    {id:"dashboard", icon:"📊", label:"Dashboard"},
    {id:"ia",        icon:"🤖", label:"Análise IA"},
    {id:"rec-fixas", icon:"💼", label:"Receitas Fixas"},
    {id:"flex",      icon:"⚡", label:"Rendas Flexíveis"},
    {id:"fixos",     icon:"🏠", label:"Gastos Fixos"},
    {id:"pessoais",  icon:"💳", label:"Parcelados"},
    {id:"config",    icon:"⚙️", label:"Configurações"},
  ];

  const tagStyle=(c)=>({display:"inline-block",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,marginLeft:6,
    background:c==="ok"?`${C.green}20`:c==="amber"?`${C.amber}20`:c==="purple"?`${C.purple}20`:`${C.text3}20`,
    color:c==="ok"?C.green:c==="amber"?C.amber:c==="purple"?C.purple:C.text3,
    boxShadow:c==="ok"?glow(C.green,3):c==="amber"?glow(C.amber,3):"none"});

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* MENU LATERAL */}
      {menuOpen&&<div style={{position:"fixed",inset:0,zIndex:200,display:"flex"}}>
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.8)",backdropFilter:"blur(8px)"}} onClick={()=>setMenuOpen(false)}/>
        <div style={{position:"relative",width:270,background:C.bg2,borderRight:`0.5px solid ${C.border}`,height:"100%",display:"flex",flexDirection:"column",zIndex:1,paddingTop:52}}>
          <div style={{padding:"20px 20px 16px",borderBottom:`0.5px solid ${C.border}`}}>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:-1}}>
              <span style={{color:C.green,textShadow:glowStrong(C.green)}}>Fin</span>
              <span style={{color:C.blue,textShadow:glowStrong(C.blue)}}>App</span>
            </div>
            <div style={{fontSize:12,color:C.text2,marginTop:4}}>{fmtMesLong(config.mes)}</div>
          </div>
          <div style={{padding:"14px 20px",borderBottom:`0.5px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Saldo do mês</div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:"'DM Mono',monospace",color:saldo>=0?C.green:C.red,textShadow:saldo>=0?glowStrong(C.green):glowStrong(C.red)}}>{fmtBRL(saldo)}</div>
            <div style={{display:"flex",gap:20,marginTop:10}}>
              <div><div style={{fontSize:10,color:C.text3}}>Receitas</div><div style={{fontSize:13,fontWeight:600,color:C.green,fontFamily:"'DM Mono',monospace",textShadow:glow(C.green)}}>{fmtBRLShort(totalRec)}</div></div>
              <div><div style={{fontSize:10,color:C.text3}}>Saídas</div><div style={{fontSize:13,fontWeight:600,color:C.red,fontFamily:"'DM Mono',monospace",textShadow:glow(C.red)}}>{fmtBRLShort(totalSaidas)}</div></div>
            </div>
          </div>
          <div style={{flex:1,padding:"10px 8px",overflowY:"auto"}}>
            {MENU.map(({id,icon,label})=>(
              <button key={id} onClick={()=>navigate(id)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"11px 12px",borderRadius:10,border:"none",background:page===id?`${C.green}10`:"transparent",color:page===id?C.green:C.text2,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:page===id?600:400,marginBottom:2,textAlign:"left",boxShadow:page===id?`inset 0 0 20px ${C.green}08`:"none",transition:"all 0.15s"}}>
                <span style={{fontSize:18}}>{icon}</span>{label}
                {page===id&&<div style={{marginLeft:"auto",width:2,height:18,background:C.green,borderRadius:2,boxShadow:glow(C.green)}}/>}
              </button>))}
          </div>
          <div style={{padding:"12px 20px 32px",borderTop:`0.5px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.text3}}>FinApp · Gestão financeira</div>
          </div>
        </div>
      </div>}

      {/* TOPBAR */}
      <div style={{position:"sticky",top:0,zIndex:100,background:`${C.bg}f0`,borderBottom:`0.5px solid ${C.border}`,padding:"14px 20px",display:"flex",alignItems:"center",gap:14,backdropFilter:"blur(20px)"}}>
        <button onClick={()=>setMenuOpen(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4,display:"flex",flexDirection:"column",gap:4.5}}>
          {[0,1,2].map(i=><div key={i} style={{width:20,height:1.5,background:C.text2,borderRadius:2}}/>)}
        </button>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:-0.5}}>
          <span style={{color:C.green,textShadow:glow(C.green,8)}}>Fin</span>
          <span style={{color:C.blue,textShadow:glow(C.blue,8)}}>App</span>
        </div>
        <div style={{marginLeft:"auto",fontSize:11,color:C.text2,background:C.bg3,border:`0.5px solid ${C.border}`,borderRadius:20,padding:"4px 11px"}}>{fmtMesLong(config.mes)}</div>
      </div>

      <div style={{padding:20,paddingBottom:40}}>

        {/* DASHBOARD */}
        {page==="dashboard"&&<>
          <div style={{...card,marginBottom:14,background:saldo>=0?`${C.green}0a`:`${C.red}0a`,border:`0.5px solid ${saldo>=0?C.green:C.red}40`,boxShadow:saldo>=0?glow(C.green,6):glow(C.red,6)}}>
            <div style={{...clbl,color:saldo>=0?C.green:C.red}}>Saldo do mês</div>
            <div style={{fontSize:34,fontWeight:800,fontFamily:"'DM Mono',monospace",color:saldo>=0?C.green:C.red,textShadow:saldo>=0?glowStrong(C.green):glowStrong(C.red),letterSpacing:-1}}>{fmtBRL(saldo)}</div>
            <div style={{fontSize:12,color:C.text2,marginTop:6}}>{saldo>=0?"✅ Receitas cobrem todos os gastos":"⚠️ Gastos superam as receitas"}</div>
          </div>

          <div style={{...sec,marginBottom:14}}>
            <div style={sttl}>Evolução 6 meses</div>
            <MiniChart meses={ultMeses} data={dataRec} color={C.green} gradId="gRec" mesAtualIdx={mesAtualIdx} label="📈 Receitas líquidas"/>
            <div style={{height:"0.5px",background:C.border,margin:"16px 0"}}/>
            <MiniChart meses={ultMeses} data={dataGas} color={C.red} gradId="gGas" mesAtualIdx={mesAtualIdx} label="📉 Saídas"/>
          </div>

          <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:10}}>💰 Receitas do mês</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <NeonCard label="Fixas" value={fmtBRLShort(totalRecFixas)} color={C.green}/>
            <NeonCard label="Flex líquido" value={fmtBRLShort(totalLiqFlex)} color={C.teal}/>
          </div>
          {totalBrutoFlex>0&&<div style={{...sec,marginBottom:14,border:`0.5px solid ${C.teal}25`}}>
            {[["Bruto flexível",fmtBRL(totalBrutoFlex),C.text],["Custos para gerar","-"+fmtBRL(totalCustosFlex),C.red],].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 0",borderBottom:`0.5px solid ${C.border}`}}>
                <span style={{color:C.text2}}>{l}</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:c}}>{v}</span>
              </div>))}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700,padding:"8px 0"}}>
              <span>Líquido flexível</span><span style={{fontFamily:"'DM Mono',monospace",color:C.teal,textShadow:glow(C.teal,4)}}>{fmtBRL(totalLiqFlex)}</span>
            </div>
            <ProgBar pct={totalBrutoFlex>0?(totalLiqFlex/totalBrutoFlex*100):0} color={C.teal}/>
            <div style={{fontSize:11,color:C.text3,marginTop:4}}>Margem: {totalBrutoFlex>0?(totalLiqFlex/totalBrutoFlex*100).toFixed(0):0}% do bruto fica no bolso</div>
          </div>}

          <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:10,marginTop:6}}>📤 Saídas do mês</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <NeonCard label="Fixos" value={fmtBRLShort(totalFixos)} color={C.blue}/>
            <NeonCard label="Parcelados" value={fmtBRLShort(totalPess)} color={C.purple}/>
          </div>
          <div style={sec}>
            {totalSaidas===0?<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"16px 0"}}>Nenhuma saída registrada</div>:<>
              {[[`🏠 Fixos`,fmtBRL(totalFixos),C.blue,totalFixos],[`💳 Parcelados`,fmtBRL(totalPess),C.purple,totalPess]].map(([l,v,c,val])=>(
                val>0&&<div key={l} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}><span style={{color:C.text2}}>{l}</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:c,textShadow:glow(c,3)}}>{v}</span></div>
                  <ProgBar pct={totalSaidas>0?(val/totalSaidas*100):0} color={c}/>
                </div>))}
              <div style={divid}/><div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700}}><span>Total saídas</span><span style={{fontFamily:"'DM Mono',monospace",color:C.red,textShadow:glow(C.red,4)}}>{fmtBRL(totalSaidas)}</span></div>
            </>}
          </div>
        </>}

        {/* IA */}
        {page==="ia"&&<>
          <div style={{...sec,background:`linear-gradient(135deg,${C.green}08,${C.blue}08)`,border:`0.5px solid ${C.green}30`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:28}}>🤖</span>
              <div><div style={{fontSize:16,fontWeight:700,color:C.text}}>Assistente FinApp</div><div style={{fontSize:12,color:C.text2}}>Análise inteligente dos seus dados</div></div>
            </div>
            <button onClick={gerarAnalise} disabled={iaLoading} style={{...btn(iaLoading?C.bg3:C.green,"#080c10",C.green),opacity:iaLoading?0.6:1}}>
              {iaLoading?"⏳ Analisando...":"✨ Gerar análise do mês"}
            </button>
          </div>
          {!iaAnalise&&!iaLoading&&<div style={{textAlign:"center",padding:"32px 20px",color:C.text3,fontSize:13,lineHeight:2}}>Clique em <strong style={{color:C.green}}>Gerar análise</strong> para ver insights personalizados.</div>}
          {iaAnalise&&<div style={{...sec,border:`0.5px solid ${C.green}20`}}><div style={sttl}>📋 Análise do mês</div><div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{iaAnalise}</div></div>}
          {iaAnalise&&<div style={sec}>
            <div style={sttl}>💬 Pergunte sobre suas finanças</div>
            <div style={{marginBottom:12,maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:10}}>
              {iaChat.map((m,i)=>(m.role==="user"
                ?<div key={i} style={{alignSelf:"flex-end",background:`${C.green}12`,border:`0.5px solid ${C.green}30`,borderRadius:"12px 12px 2px 12px",padding:"10px 14px",fontSize:13,color:C.text,maxWidth:"85%",lineHeight:1.6}}>{m.content}</div>
                :<div key={i} style={{alignSelf:"flex-start",background:C.bg3,border:`0.5px solid ${C.border}`,borderRadius:"12px 12px 12px 2px",padding:"10px 14px",fontSize:13,color:C.text,maxWidth:"90%",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{m.content}</div>))}
              {iaLoading&&<div style={{alignSelf:"flex-start",background:C.bg3,borderRadius:"12px 12px 12px 2px",padding:"10px 14px",fontSize:13,color:C.text3}}>⏳ Pensando...</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <input style={{...inp,flex:1}} type="text" placeholder="Ex: Como investir minha sobra?" value={iaMensagem} onChange={e=>setIaMensagem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&enviarMensagem()}/>
              <button onClick={enviarMensagem} disabled={iaLoading||!iaMensagem.trim()} style={{height:44,padding:"0 16px",background:C.green,color:C.bg,border:"none",borderRadius:10,fontSize:18,cursor:"pointer",boxShadow:glow(C.green),opacity:(iaLoading||!iaMensagem.trim())?0.4:1}}>➤</button>
            </div>
          </div>}
        </>}

        {/* RECEITAS FIXAS */}
        {page==="rec-fixas"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <NeonCard label="Total fixas" value={fmtBRL(totalRecFixas)} color={C.green}/>
            <NeonCard label="Registros" value={recFixas.length} color={C.blue}/>
          </div>
          <div style={sec}>
            <div style={sttl}>Adicionar receita fixa</div>
            <div style={fg_}><label style={fl_}>Categoria</label><select style={sel} value={fRfCat} onChange={e=>setFRfCat(e.target.value)}>{Object.entries(CATS_FIXAS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            <div style={fg_}><label style={fl_}>Descrição (opcional)</label><input style={inp} type="text" placeholder="Ex: Salário empresa X..." value={fRfDesc} onChange={e=>setFRfDesc(e.target.value)}/></div>
            <div style={inpRow}>
              <div style={fg_}><label style={fl_}>Valor (R$)</label><input style={inp} type="number" placeholder="0.00" inputMode="decimal" value={fRfVal} onChange={e=>setFRfVal(e.target.value)}/></div>
              <div style={fg_}><label style={fl_}>Data</label><input style={inp} type="date" value={fRfData} onChange={e=>setFRfData(e.target.value)}/></div>
            </div>
            <button style={btn(C.green,C.bg,C.green)} onClick={addRecFixa}>+ Adicionar receita fixa</button>
          </div>
          <div style={sec}>
            <div style={sttl}>Histórico</div>
            {recFixas.length===0?<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"16px 0"}}>Nenhuma receita fixa registrada</div>
              :[...recFixas].sort((a,b)=>(b.data||"").localeCompare(a.data||"")).map(r=><HI key={r.id} left={r.desc||CATS_FIXAS[r.cat]} sub={`${CATS_FIXAS[r.cat]} · ${fmtData(r.data)}`} right={`+${fmtBRL(r.valor)}`} color={C.green} onDel={()=>delRf(r)}/>)}
            {recFixas.length>0&&<><div style={divid}/><div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700}}><span>Total</span><span style={{fontFamily:"'DM Mono',monospace",color:C.green,textShadow:glow(C.green)}}>{fmtBRL(totalRecFixas)}</span></div></>}
          </div>
        </>}

        {/* RENDAS FLEXÍVEIS */}
        {page==="flex"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
            <NeonCard label="Bruto" value={fmtBRLShort(totalBrutoFlex)} color={C.text} size={14}/>
            <NeonCard label="Custos" value={"-"+fmtBRLShort(totalCustosFlex)} color={C.red} size={14}/>
            <NeonCard label="Líquido" value={fmtBRLShort(totalLiqFlex)} color={C.teal} size={14}/>
          </div>
          <div style={sec}>
            <div style={sttl}>Registrar renda flexível</div>
            <div style={fg_}><label style={fl_}>Tipo de renda</label>
              <select style={sel} value={fFlTipo} onChange={e=>{setFFlTipo(e.target.value);setFFlCustos([{desc:"",valor:""}]);}}>
                {Object.entries(TIPOS_FLEX).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div style={fg_}><label style={fl_}>Descrição (opcional)</label>
              <input style={inp} type="text" placeholder={fFlTipo==="uber"?"Ex: Semana 1 mai...":fFlTipo==="freela"?"Ex: Site cliente X...":"Ex: Venda..."} value={fFlDesc} onChange={e=>setFFlDesc(e.target.value)}/></div>
            <div style={inpRow}>
              <div style={fg_}><label style={fl_}>Valor bruto (R$)</label><input style={inp} type="number" placeholder="0.00" inputMode="decimal" value={fFlBruto} onChange={e=>setFFlBruto(e.target.value)}/></div>
              {TIPOS_FLEX[fFlTipo]?.km&&<div style={fg_}><label style={fl_}>Km rodados</label><input style={inp} type="number" placeholder="0" inputMode="decimal" value={fFlKm} onChange={e=>setFFlKm(e.target.value)}/></div>}
            </div>

            {/* calculadora combustível só pra uber */}
            {fFlTipo==="uber"&&<CalcCombustivel onUsar={usarCustoCombustivel}/>}

            <div style={{...fg_,marginTop:4}}>
              <label style={{...fl_,color:C.amber}}>Custos para gerar essa renda</label>
              {fFlCustos.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                  <select style={{...sel,flex:1.5,height:40,fontSize:13}} value={c.desc} onChange={e=>setCusto(i,"desc",e.target.value)}>
                    <option value="">Selecione...</option>
                    {TIPOS_FLEX[fFlTipo]?.custos.map(op=><option key={op} value={op}>{op}</option>)}
                  </select>
                  <input style={{...inp,flex:1,height:40,fontSize:13}} type="number" placeholder="R$" inputMode="decimal" value={c.valor} onChange={e=>setCusto(i,"valor",e.target.value)}/>
                  {fFlCustos.length>1&&<button onClick={()=>delCusto(i)} style={{background:"none",border:"none",color:C.text3,fontSize:16,cursor:"pointer",padding:"0 4px"}}>✕</button>}
                </div>))}
              <button onClick={addCusto} style={{background:"none",border:`0.5px solid ${C.border}`,borderRadius:8,padding:"6px 14px",fontSize:12,color:C.text2,cursor:"pointer",fontFamily:"inherit"}}>+ Adicionar custo</button>
            </div>

            {fFlBruto&&<div style={{background:C.bg3,borderRadius:10,padding:"12px 14px",marginBottom:12,border:`0.5px solid ${C.teal}25`}}>
              {(()=>{const bruto=parseFloat(fFlBruto)||0;const custos=fFlCustos.reduce((s,c)=>s+(parseFloat(c.valor)||0),0);const liq=bruto-custos;const margem=bruto>0?(liq/bruto*100):0;return<>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}><span style={{color:C.text2}}>Bruto</span><span style={{fontFamily:"'DM Mono',monospace"}}>{fmtBRL(bruto)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}><span style={{color:C.text2}}>Custos</span><span style={{fontFamily:"'DM Mono',monospace",color:C.red}}>-{fmtBRL(custos)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:15,fontWeight:700}}><span>Líquido</span><span style={{fontFamily:"'DM Mono',monospace",color:liq>=0?C.teal:C.red,textShadow:glow(liq>=0?C.teal:C.red,6)}}>{fmtBRL(liq)} <span style={{fontSize:11,fontWeight:400,color:C.text3}}>({margem.toFixed(0)}%)</span></span></div>
              </>;})()} 
            </div>}
            <button style={btn(C.teal,C.bg,C.teal)} onClick={addRenda}>+ Registrar renda</button>
          </div>

          <div style={sec}>
            <div style={sttl}>Histórico de rendas</div>
            {rendas.length===0?<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"16px 0"}}>Nenhuma renda flexível registrada</div>
              :rendas.map(r=>{const rc=rendasComLiq.find(x=>x.id===r.id)||r;return<div key={r.id} style={{padding:"12px 0",borderBottom:`0.5px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600}}>{TIPOS_FLEX[r.tipo]?.label||r.tipo}{r.desc&&<span style={{fontSize:12,color:C.text2,fontWeight:400}}> · {r.desc}</span>}</div>
                    <div style={{fontSize:12,color:C.text2,marginTop:3}}>Bruto {fmtBRL(r.bruto)} · Custos {fmtBRL(rc.totalCustos||0)} · <span style={{color:C.teal}}>Líq. {fmtBRL(rc.liquido||0)}</span>{r.km>0&&` · ${r.km}km`}</div>
                    {(r.custos||[]).length>0&&<div style={{fontSize:11,color:C.text3,marginTop:3}}>{r.custos.map(c=>`${c.desc}: ${fmtBRL(c.valor)}`).join(" · ")}</div>}
                  </div>
                  <button onClick={()=>delRenda(r)} style={{background:"none",border:"none",color:C.text3,fontSize:15,cursor:"pointer",padding:4}}>🗑</button>
                </div>
              </div>;})}
            {rendas.length>0&&<>
              <div style={divid}/>
              {[["Total bruto",fmtBRL(totalBrutoFlex),C.text],["Total custos","-"+fmtBRL(totalCustosFlex),C.red],["Total líquido",fmtBRL(totalLiqFlex),C.teal]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:l.includes("líquido")?14:13,fontWeight:l.includes("líquido")?700:400,marginBottom:4}}>
                  <span style={{color:l.includes("líquido")?C.text:C.text2}}>{l}</span><span style={{fontFamily:"'DM Mono',monospace",color:c,textShadow:l.includes("líquido")?glow(c,4):"none"}}>{v}</span>
                </div>))}
            </>}
          </div>
        </>}

        {/* GASTOS FIXOS */}
        {page==="fixos"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <NeonCard label="Total fixos" value={fmtBRL(totalFixos)} color={C.blue}/>
            <NeonCard label="Itens" value={fixos.length} color={C.amber}/>
          </div>
          <div style={sec}>
            <div style={sttl}>Adicionar gasto fixo</div>
            <div style={fg_}><label style={fl_}>Nome</label><input style={inp} type="text" placeholder="Ex: Condomínio, Financiamento..." value={fFxNome} onChange={e=>setFFxNome(e.target.value)}/></div>
            <div style={fg_}><label style={fl_}>Categoria</label><select style={sel} value={fFxCat} onChange={e=>setFFxCat(e.target.value)}>{Object.entries(CATS_FIXOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            <div style={fg_}><label style={fl_}>Valor deste mês (R$)</label><input style={inp} type="number" placeholder="Ex: 1500.00" inputMode="decimal" value={fFxValor} onChange={e=>setFFxValor(e.target.value)}/></div>
            <button style={btn(C.blue,"#fff",C.blue)} onClick={addFixo}>+ Adicionar gasto fixo</button>
          </div>
          <div style={sec}>
            <div style={sttl}>Gastos fixos do mês</div>
            {fixos.length===0?<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"16px 0"}}>Nenhum gasto fixo</div>:(() => {
              const bycat={};fixos.forEach(f=>{if(!bycat[f.cat])bycat[f.cat]=[];bycat[f.cat].push(f);});
              return<>{Object.entries(bycat).map(([cat,items])=>(
                <div key={cat} style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text3,marginBottom:8}}>{CATS_FIXOS[cat]||cat}</div>
                  {items.map(f=><div key={f.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`0.5px solid ${C.border}`}}>
                    <div style={{fontSize:14,fontWeight:500}}>{f.nome}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input style={{...cfgInp,width:100}} type="number" value={f.valor} onChange={e=>editFixoValor(f.id,e.target.value)}/>
                      <button onClick={()=>delFixo(f)} style={{background:"none",border:"none",color:C.text3,fontSize:15,cursor:"pointer",padding:4}}>🗑</button>
                    </div>
                  </div>)}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.text2,padding:"6px 0"}}><span>Subtotal</span><span style={{fontFamily:"'DM Mono',monospace",color:C.blue}}>{fmtBRL(items.reduce((s,f)=>s+f.valor,0))}</span></div>
                </div>))}
              <div style={divid}/><div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700}}><span>Total</span><span style={{fontFamily:"'DM Mono',monospace",color:C.blue,textShadow:glow(C.blue)}}>{fmtBRL(totalFixos)}</span></div>
              </>;})()}
          </div>
        </>}

        {/* PARCELADOS */}
        {page==="pessoais"&&<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <NeonCard label="Total mensal" value={fmtBRL(totalPess)} color={C.purple}/>
            <NeonCard label="Ativas" value={parcsAtivas} color={C.amber}/>
          </div>
          <div style={sec}>
            <div style={sttl}>Adicionar parcelado</div>
            <div style={fg_}><label style={fl_}>Nome</label><input style={inp} type="text" placeholder="Ex: iPhone, Notebook..." value={fPpNome} onChange={e=>setFPpNome(e.target.value)}/></div>
            <div style={inpRow}>
              <div style={fg_}><label style={fl_}>Valor total (R$)</label><input style={inp} type="number" placeholder="0.00" inputMode="decimal" value={fPpValor} onChange={e=>setFPpValor(e.target.value)}/></div>
              <div style={fg_}><label style={fl_}>Parcelas</label><input style={inp} type="number" placeholder="1" min="1" max="120" value={fPpParc} onChange={e=>setFPpParc(e.target.value)}/></div>
            </div>
            <div style={fg_}><label style={fl_}>Mês de início</label><input style={inp} type="month" value={fPpInicio} onChange={e=>setFPpInicio(e.target.value)}/></div>
            <button style={btn(C.purple,"#fff",C.purple)} onClick={addPessoal}>+ Adicionar parcelado</button>
          </div>
          <div style={sec}>
            <div style={sttl}>Meus parcelados</div>
            {pessoais.length===0?<div style={{fontSize:13,color:C.text3,textAlign:"center",padding:"16px 0"}}>Nenhum parcelado</div>:pessoais.map(p=>{
              const valParc=p.valorTotal/p.parcelas,pagas=p.pagas||[],pctP=p.parcelas>1?(pagas.length/p.parcelas*100):100;
              const idxAtual=idxParcelaAtual(p,config.mes),ativa=parcelaMes(p,config.mes)>0,quitada=pagas.length>=p.parcelas;
              return<div key={p.id} style={{background:C.bg3,border:`0.5px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div><span style={{fontSize:15,fontWeight:700}}>{p.nome}</span><span style={tagStyle(quitada?"ok":ativa?"amber":"gray")}>{quitada?"Quitada ✓":ativa?"Ativa":"Fora do mês"}</span></div>
                  <button style={{background:"none",border:`0.5px solid ${C.red}40`,borderRadius:20,padding:"3px 9px",fontSize:11,color:C.red,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>delPes(p)}>Remover</button>
                </div>
                <div style={{fontSize:12,color:C.text2,marginBottom:10,lineHeight:1.7}}>
                  {p.parcelas>1?`${fmtBRL(valParc)}/mês · ${p.parcelas}x · Total ${fmtBRL(p.valorTotal)}\n${fmtMes(p.inicio)} → ${fmtMes(mesOffset(p.inicio,p.parcelas-1))}`:`À vista · ${fmtBRL(p.valorTotal)} · ${fmtMes(p.inicio)}`}
                </div>
                {p.parcelas>1&&<>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.text2,marginBottom:4}}><span>{pagas.length}/{p.parcelas} pagas</span><span>{pctP.toFixed(0)}%</span></div>
                  <ProgBar pct={pctP} color={C.purple}/>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10}}>
                    {Array.from({length:p.parcelas},(_,i)=>{const pg=pagas.includes(i),at=i===idxAtual&&ativa&&!pg;return<div key={i} style={{width:11,height:11,borderRadius:"50%",flexShrink:0,cursor:"pointer",background:pg?C.green:at?C.amber:"transparent",border:(!pg&&!at)?`1.5px solid ${C.text3}`:"none",boxShadow:pg?glow(C.green,3):at?glow(C.amber,3):"none"}} onClick={()=>toggleParcela(p.id,i)}/>;})}</div>
                  <div style={{fontSize:10,color:C.text3,marginTop:6}}>● verde = paga &nbsp;● laranja = este mês &nbsp;○ = pendente</div>
                </>}
              </div>;})}
          </div>
        </>}

        {/* CONFIG */}
        {page==="config"&&<>
          <div style={sec}>
            <div style={sttl}>Geral</div>
            <div style={cfgI}><span style={{fontSize:14,color:C.text2}}>Dias de trabalho flex</span><input style={cfgInp} type="number" value={cfgDias} onChange={e=>setCfgDias(e.target.value)}/></div>
            <div style={cfgI}><span style={{fontSize:14,color:C.text2}}>Mês de referência</span><input style={{...cfgInp,width:130}} type="month" value={cfgMes} onChange={e=>setCfgMes(e.target.value)}/></div>
            <button style={{...btn(C.green,C.bg,C.green),marginTop:14}} onClick={saveConfig}>Salvar configurações</button>
            <button style={{width:"100%",height:44,background:"transparent",color:C.red,border:`0.5px solid ${C.red}40`,borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer",marginTop:8,fontFamily:"inherit"}} onClick={resetMes}>Resetar dados do mês</button>
          </div>
        </>}
      </div>
      <Modal item={modal} onConfirm={modal?.onConfirm} onCancel={()=>setModal(null)}/>
    </div>
  );
}
