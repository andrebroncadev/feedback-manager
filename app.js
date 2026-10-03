const KEY='feedback-manager-v1';
const owners={
 'Carmita':{xx:6529,yy:66},
 'Marcelo':{xx:5394,yy:229},
 'Luíz':{xx:2411,yy:52},
 'Maria Eliza e Rubens':{xx:3231,yy:50}
};
const actions={
 'Panfletagem estratégica':['Criar o design com a equipe de marketing e publicidade.','Imprimir, organizar, dobrar e proteger os flyers em saquinhos transparentes.','Definir a área geográfica com maior potencial de aderência.','Prospectar de forma inteligente, entregar o material e filtrar os leads.'],
 'Tráfego pago':['Definir o público e as cidades prioritárias.','Configurar a campanha e direcionar o anúncio.','Acompanhar a resposta e filtrar os contatos.'],
 'Redes sociais':['Adaptar o imóvel ao formato de cada rede.','Publicar e reforçar os principais atributos.','Acompanhar alcance e interações.'],
 'Grupo interno RE/MAX':['Compartilhar o imóvel com a rede de especialistas.','Destacar os atributos e o perfil de comprador.','Registrar oportunidades e retornos.'],
 'Show de Captações':['Apresentar o imóvel à rede.','Destacar diferenciais e potencial.','Registrar contatos interessados.'],
 'Prospecção de investidores':['Identificar investidores compatíveis.','Apresentar potencial, contexto e oportunidade.','Filtrar contatos com aderência.'],
 'Prospecção de construtores':['Identificar construtores com potencial.','Apresentar potencial construtivo e oportunidade.','Filtrar contatos interessados.'],
 'Visitas técnicas':['Selecionar pontos e públicos estratégicos.','Realizar a visita e apresentar o imóvel.','Registrar retorno e oportunidade.'],
 'Placa':['Produzir e instalar a placa.','Garantir boa visibilidade.','Monitorar contatos gerados.'],
 'Revisão do anúncio':['Revisar foto de capa, título e descrição.','Reorganizar a apresentação do imóvel.','Reforçar valor percebido antes de sugerir ajustes de preço.'],
 'Home staging':['Avaliar a apresentação do imóvel.','Organizar ambientes e imagens.','Atualizar a apresentação para o público.'],
 'Estudo de posicionamento':['Analisar concorrentes e imóveis comparáveis.','Revisar posicionamento e comunicação.','Definir próximos ajustes.']
};
const ownerEl=document.querySelector('#owner'),xxEl=document.querySelector('#xx'),yyEl=document.querySelector('#yy'),dateEl=document.querySelector('#date');
Object.keys(owners).forEach(o=>ownerEl.add(new Option(o,o)));
dateEl.value=new Date().toISOString().slice(0,10);
const actionsEl=document.querySelector('#actions');Object.entries(actions).forEach(([name])=>{const l=document.createElement('label');l.className='action';l.innerHTML=`<input type="checkbox" value="${name}"> ${name}`;actionsEl.appendChild(l)});
let imageData='';
document.querySelector('#image').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{imageData=r.result;const p=document.querySelector('#preview');p.src=imageData;p.style.display='block';render()};r.readAsDataURL(f)});
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
function save(data){localStorage.setItem(KEY,JSON.stringify(data))}
function totals(){const data=load();const o=ownerEl.value;let xx=owners[o].xx,yy=owners[o].yy;(data[o]?.weeks||[]).forEach(w=>{xx+=Number(w.xx)||0;yy+=Number(w.yy)||0});return {xx,yy}}
function esc(s=''){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function render(){const t=totals(),xx=Number(xxEl.value)||0,yy=Number(yyEl.value)||0;const selected=[...document.querySelectorAll('.action input:checked')].map(x=>x.value);const html=`<div class="doc-title">Prezado ${esc(ownerEl.value)},</div><div class="doc-intro">${esc(document.querySelector('#intro').value)||'<span class="empty">Texto inicial...</span>'}</div><div class="stats"><div class="stat"><div class="stat-label">VISUALIZAÇÕES ONLINE</div><div class="stat-value">${xx}</div></div><div class="stat"><div class="stat-label">PESQUISAS DA REDE REMAX</div><div class="stat-value">${yy}</div></div></div><div class="photo">${imageData?`<img src="${imageData}">`:'<span class="empty">Imagem da estatística</span>'}</div><div class="acc"><div class="acc-title">Número total de visualizações</div><div class="acc-value">${t.xx}</div></div><div class="acc"><div class="acc-title">Número total de acessos</div><div class="acc-value">${t.yy}</div></div><div class="section-title">AÇÕES DE MARKETING</div>${selected.map(a=>`<div class="marketing"><strong>${esc(a)}</strong><ul>${actions[a].map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div>`).join('')||'<div class="empty">Nenhuma ação selecionada.</div>'}<div class="fixed-note">As ações são estruturadas para ampliar a exposição qualificada, melhorar a apresentação do imóvel e transformar visibilidade em oportunidades de contato, mantendo o posicionamento coerente com o mercado.</div>${document.querySelector('#todo').value.trim()?`<div class="section-title todo">A FAZER</div><div>${esc(document.querySelector('#todo').value)}</div>`:''}<div class="section-title">ANÁLISE DA SEMANA</div><div>${esc(document.querySelector('#analysis').value)||'<span class="empty">Análise...</span>'}</div><div class="footer-note">Feedback semanal • ${new Date(dateEl.value+'T12:00:00').toLocaleDateString('pt-BR')}</div>`;document.querySelector('#document').innerHTML=html}
['input','change'].forEach(ev=>document.addEventListener(ev,e=>{if(e.target.closest('.controls'))render()}));document.querySelector('#generate').onclick=render;
document.querySelector('#saveProject').onclick=()=>{const data=load(),o=ownerEl.value;data[o]??={weeks:[]};data[o].weeks.push({date:dateEl.value,xx:Number(xxEl.value)||0,yy:Number(yyEl.value)||0,intro:document.querySelector('#intro').value,analysis:document.querySelector('#analysis').value,todo:document.querySelector('#todo').value,actions:[...document.querySelectorAll('.action input:checked')].map(x=>x.value)});save(data);render();alert('Semana salva e acumulada.')};
document.querySelector('#savePdf').onclick=async()=>{render();const c=await html2canvas(document.querySelector('#document'),{scale:2,useCORS:true,backgroundColor:'#fff'});const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,595.28,841.89);pdf.save(`feedback-${ownerEl.value.replace(/\s+/g,'-')}.pdf`)};
document.querySelector('#saveDocx').onclick=()=>{const text=document.querySelector('#document').innerText;const blob=new Blob([`<!doctype html><html><head><meta charset="utf-8"></head><body>${document.querySelector('#document').outerHTML}</body></html>`],{type:'application/msword'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`feedback-${ownerEl.value.replace(/\s+/g,'-')}.doc`;a.click();URL.revokeObjectURL(a.href)};
render();