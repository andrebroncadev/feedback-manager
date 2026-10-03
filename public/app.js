const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const form = $("#feedbackForm");
const ownerSelect = $("#ownerSelect");
const address = $("#address");
const date = $("#date");
const status = $("#saveStatus");

let properties = [];
let actionOptions = [
"Panfletagem estratégica / impressão e distribuição",
"Manutenção da divulgação nas plataformas imobiliárias",
"Divulgação nas redes sociais",
"Divulgação no grupo interno de especialistas RE/MAX",
"Show de Captações",
"Placa no imóvel",
"Revisão do anúncio",
"Home staging",
"Plano de marketing",
"Vistoria completa",
"Visitas técnicas",
"Prospecção de investidores / construtores",
"Monitoramento dos indicadores de desempenho",
"Acompanhamento da procura pela região",
"Análise do posicionamento do imóvel pela equipe de marketing"
];

const defaults = {
 message1:"Com o aumento das visitas e indicações, somado à movimentação recente na região, o cenário é positivo para a continuidade da divulgação. Seguiremos acompanhando a evolução desses indicadores e trabalhando para transformar esse aumento de interesse em visitas e, posteriormente, em uma negociação.",
 message2:"Seguimos acompanhando o desempenho de forma contínua, com foco em preservar a boa performance já alcançada e sustentar a atratividade do anúncio. O objetivo é manter a comunicação alinhada ao comportamento do mercado, garantindo que o imóvel continue se destacando dentro do cenário atual.",
 message3:"Nesta última semana, o imóvel apresentou aumento nos acessos e também passou a ser mais indicado, ampliando sua presença entre potenciais compradores e dentro da rede de divulgação. Esse movimento é importante porque demonstra que a oportunidade continua despertando interesse e ganhando circulação no mercado."
};

function today(){ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
date.value=today();
Object.entries(defaults).forEach(([k,v])=>$("#"+k).value=v);

function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function getStates(){
  return {
    done: JSON.parse(localStorage.getItem("feedbackDoneActions")||"[]"),
    todo: JSON.parse(localStorage.getItem("feedbackTodoActions")||"[]")
  };
}
function saveStates(done,todo){
  localStorage.setItem("feedbackDoneActions",JSON.stringify(done));
  localStorage.setItem("feedbackTodoActions",JSON.stringify(todo));
}
function renderActions(){
  const {done,todo}=getStates();
  $("#actions").innerHTML=actionOptions.map((a,i)=>`<div class="action-row">
    <span>${esc(a)}</span>
    <label><input type="checkbox" data-kind="done" data-action="${esc(a)}" ${done.includes(a)?"checked":""}> Feita</label>
    <label><input type="checkbox" data-kind="todo" data-action="${esc(a)}" ${todo.includes(a)?"checked":""}> À fazer</label>
  </div>`).join("");
  $$("#actions input").forEach(x=>x.addEventListener("change",()=>{
    const done=$$("#actions input[data-kind=done]:checked").map(x=>x.dataset.action);
    const todo=$$("#actions input[data-kind=todo]:checked").map(x=>x.dataset.action);
    saveStates(done,todo);
  }));
}
renderActions();

$("#addAction").onclick=()=>{
  const v=$("#customAction").value.trim();
  if(!v || actionOptions.includes(v)) return;
  actionOptions.push(v); $("#customAction").value=""; renderActions();
};

async function loadProperties(){
  try{
    const r=await fetch("/data/properties.json");
    if(r.ok) properties=await r.json();
  }catch{}
  const saved=JSON.parse(localStorage.getItem("feedbackProperties")||"[]");
  properties=[...properties,...saved];
  ownerSelect.innerHTML='<option value="">Selecione...</option>'+properties.map(p=>`<option value="${esc(p.id)}">${esc(p.owner)}</option>`).join("");
  if(properties.length) ownerSelect.value=properties[0].id;
  ownerSelect.dispatchEvent(new Event("change"));
}
ownerSelect.onchange=()=>{
  const p=properties.find(x=>String(x.id)===String(ownerSelect.value));
  address.value=p?.address||"";
};
loadProperties();

function readFile(input){
  return new Promise(resolve=>{
    const f=input.files?.[0]; if(!f) return resolve("");
    const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.readAsDataURL(f);
  });
}
function data(){
  const {done,todo}=getStates();
  const p=properties.find(x=>String(x.id)===String(ownerSelect.value));
  return {
    owner:ownerSelect.options[ownerSelect.selectedIndex]?.text||"",
    address:address.value,date:date.value,
    brokerName:$("#brokerName").value,brokerPhone:$("#brokerPhone").value,brokerEmail:$("#brokerEmail").value,
    creci:$("#creci").value,office:$("#office").value,
    views:$("#views").value,accesses:$("#accesses").value,virtualVisits:$("#virtualVisits").value,
    exposure:$("#exposure").value,exposurePct:$("#exposurePct").value,viewsPct:$("#viewsPct").value,
    message1:$("#message1").value,message2:$("#message2").value,message3:$("#message3").value,
    doneActions:done,todoActions:todo,photoUrl:p?.photoUrl||""
  };
}
async function buildData(){
  const d=data();
  d.propertyPhoto=await readFile($("#propertyPhoto"));
  d.brokerPhoto=await readFile($("#brokerPhoto"));
  d.statsPhoto=await readFile($("#statsPhoto"));
  return d;
}
["propertyPhoto","brokerPhoto","statsPhoto"].forEach(id=>$("#"+id).onchange=e=>{
  const f=e.target.files?.[0]; const map={propertyPhoto:"propertyName",brokerPhoto:"brokerPhotoName",statsPhoto:"statsName"};
  $("#"+map[id]).textContent=f?f.name:"Nenhuma imagem";
});

async function openPreview(){
  status.textContent="Montando...";
  const d=await buildData();
  sessionStorage.setItem("feedbackPreview",JSON.stringify(d));
  window.open("/preview","_blank");
  status.textContent="Pronto";
}
$("#previewButton").onclick=openPreview;

form.onsubmit=async e=>{
  e.preventDefault(); status.textContent="Gerando PDF...";
  try{
    const d=await buildData();
    const r=await fetch("/api/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});
    if(!r.ok) throw new Error("Falha");
    const blob=await r.blob(), url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="relatorio-atividades.pdf"; a.click(); URL.revokeObjectURL(url);
    status.textContent="PDF pronto";
  }catch(err){console.error(err);status.textContent="Erro ao gerar PDF";}
};