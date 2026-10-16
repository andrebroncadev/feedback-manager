const $ = id => document.getElementById(id);
const all = selector => Array.from(document.querySelectorAll(selector));

const API_URL = "/api/feedback-data";
const form = $("feedbackForm");
const ownerSelect = $("ownerSelect");
const address = $("address");
const status = $("saveStatus");

let brokers = [];
let properties = [];
let brokerId = "erica";
let editingBrokerId = null;
let editingPropertyId = null;
let brokerPhotoData = "";
let propertyPhotoData = "";
let statsPhotoData = "";

const ACTION_CATALOG = [
  ["Planejamento de marketing do imóvel","Define público-alvo, diferenciais, canais, cronograma e objetivos da divulgação."],
  ["Fotografia profissional","Produz fotos bem iluminadas e organizadas para apresentar os ambientes e os diferenciais reais do imóvel."],
  ["Vídeo de apresentação","Apresenta o imóvel em vídeo para aumentar o interesse e facilitar a primeira avaliação do comprador."],
  ["Tour virtual / visita virtual","Permite conhecer o imóvel remotamente, útil para interessados que estão longe ou querem uma primeira triagem."],
  ["Imagens aéreas com drone","Mostra terreno, implantação, entorno e proximidade de referências quando permitido e relevante."],
  ["Preparação visual do imóvel (home staging)","Sugere ajustes de organização, iluminação e composição para melhorar a apresentação sem ocultar características."],
  ["Revisão do anúncio","Confere título, descrição, informações, diferenciais e clareza antes de publicar ou atualizar."],
  ["Publicação em portais imobiliários","Coloca o anúncio nos portais escolhidos para ampliar o alcance entre pessoas que já procuram imóveis."],
  ["Manutenção dos anúncios nas plataformas imobiliárias","Mantém preço, disponibilidade, fotos e descrição atualizados nos canais onde o imóvel está anunciado."],
  ["Divulgação nas redes sociais","Publica conteúdo nos perfis sociais adequados ao público e ao posicionamento do imóvel."],
  ["Campanha de tráfego pago","Distribui anúncios patrocinados para públicos e regiões definidos, acompanhando investimento e resultados."],
  ["Distribuição do material a corretores parceiros","Compartilha ficha, fotos e informações com profissionais que possam ter clientes compatíveis."],
  ["Divulgação no grupo interno de especialistas RE/MAX","Apresenta o imóvel à rede interna para estimular indicações e colaboração entre corretores."],
  ["Show de Captações","Apresenta o imóvel aos corretores da equipe para que conheçam seus diferenciais e possam indicá-lo."],
  ["Panfletagem direcionada","Imprime e distribui material em locais escolhidos conforme o perfil do imóvel e do público."],
  ["Placa de divulgação no imóvel","Instala placa quando autorizada e adequada, facilitando o reconhecimento por pessoas que circulam na região."],
  ["Open house / visita coletiva","Organiza um período de visitação para interessados, quando apropriado e aprovado pelo proprietário."],
  ["Agendamento e acompanhamento de visitas","Coordena visitas presenciais, confirma presença e registra impressões relevantes dos interessados."],
  ["Prospecção ativa de compradores","Busca potenciais compradores em canais e bases de relacionamento, respeitando consentimento e pertinência."],
  ["Prospecção de investidores e construtores","Apresenta o imóvel a investidores ou construtores quando o perfil e o potencial da propriedade forem compatíveis."],
  ["Contato com a carteira de clientes","Cruza características do imóvel com necessidades já identificadas de clientes da imobiliária."],
  ["Parcerias com imobiliárias e corretores externos","Amplia a distribuição por meio de profissionais de outras redes, compartilhando informações corretas e autorizadas."],
  ["Estudo de preço e imóveis concorrentes","Compara ofertas semelhantes para contextualizar o posicionamento, sem confundir preço anunciado com valor de venda."],
  ["Acompanhamento da procura na região","Observa interesse, oferta concorrente e mudanças relevantes no mercado local."],
  ["Monitoramento dos indicadores de desempenho","Acompanha visualizações, contatos, visitas e outros indicadores disponíveis para avaliar a divulgação."],
  ["Relatório de retorno das visitas","Organiza comentários dos visitantes para identificar objeções recorrentes e pontos de melhoria."],
  ["Revisão estratégica do anúncio","Reavalia foto de capa, título, descrição e ordem das informações com base na resposta do mercado."],
  ["Atualização do material de divulgação","Renova fotos, vídeos, ficha e peças quando houver informação nova ou oportunidade de melhorar a apresentação."],
  ["Contato com empresas e relocação corporativa","Verifica oportunidades junto a empresas ou profissionais que busquem imóveis para funcionários, quando aplicável."],
  ["Acompanhamento de leads e retornos","Registra interessados, próximos contatos e respostas para reduzir perdas por falta de acompanhamento."],
  ["Avaliação de desempenho com a equipe de marketing","Solicita análise especializada da apresentação, do posicionamento e dos canais de divulgação."],
  ["Revisão periódica do plano de marketing","Revisa ações e prioridades conforme os dados, o feedback recebido e o tempo de exposição no mercado."]
];
const DEFAULT_ACTIONS = ACTION_CATALOG.map(([name]) => name);
const ACTION_DESCRIPTIONS = Object.fromEntries(ACTION_CATALOG);
let actionOptions = [...DEFAULT_ACTIONS];

function esc(value) { return String(value ?? "").replace(/[&<>\"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[char])); }
function today() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function formatNumber(value) { return Number(value || 0).toLocaleString("pt-BR"); }
function authHeaders() { const token = window.feedbackSession?.access_token; if (!token) throw new Error("Entre no Feedback Maker para continuar."); return { Authorization: `Bearer ${token}` }; }

async function sb(table, options = {}) {
  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json", ...authHeaders() },
      body: JSON.stringify({ table, ...options })
    });
  } catch (error) {
    throw new Error(`Não foi possível conectar ao servidor do Feedback Maker (${table}). Verifique a conexão e tente novamente. Detalhe: ${error?.message || error}`);
  }
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : []; }
  catch { payload = { error: text || "Resposta vazia ou inválida do servidor." }; }
  if (!response.ok) {
    const detail = typeof payload === "object" ? (payload.message || payload.error || JSON.stringify(payload)) : String(payload);
    throw new Error(`Falha ao consultar ${table} (HTTP ${response.status}): ${detail}`);
  }
  if (payload && !Array.isArray(payload) && payload.error) {
    throw new Error(`Falha ao consultar ${table}: ${payload.error}`);
  }
  return payload;
}

async function loadBrokers() {
  brokers = await sb("feedback_brokers", { query: "select=*&ativo=eq.true&order=nome.asc" });
  if (!brokers.length) brokers = await sb("feedback_brokers", { method: "POST", body: { id:"erica", nome:"Érica Bronca", telefone:"(12) 98123-5534", email:"ericabronca@remax.com.br", creci:"CRECI 199167", endereco_escritorio:"324 Rua Claudio Izidoro do Espírito Santo, Juquehy — São Sebastião", ativo:true } });
  const saved = localStorage.getItem("feedbackActiveBroker");
  brokerId = saved && brokers.some(b => b.id === saved) ? saved : brokers[0].id;
  localStorage.setItem("feedbackActiveBroker", brokerId);
}

async function loadProperties() {
  properties = await sb("feedback_properties", { query:`select=*&broker_id=eq.${encodeURIComponent(brokerId)}&ativo=eq.true&order=proprietario_nome.asc` });
  renderProperties(); renderPropertyManager();
}
function currentBroker() { return brokers.find(b => b.id === brokerId) || null; }
function currentProperty() { return properties.find(p => String(p.id) === String(ownerSelect.value)) || null; }

function renderProperties(selectedId = null) {
  ownerSelect.innerHTML = '<option value="">Selecione o imóvel...</option>' + properties.map(p => `<option value="${esc(p.id)}">${esc(p.proprietario_nome || "Sem proprietário")}</option>`).join("");
  if (selectedId != null && properties.some(p => String(p.id) === String(selectedId))) ownerSelect.value = String(selectedId);
  updateOwnerFields();
}
function updateOwnerFields() { address.value = currentProperty()?.endereco || ""; updateLiveTotals(); }

function applyPierreDraft(presetActions = true) {
  const property = currentProperty();
  if (String(property?.proprietario_nome || "").trim().toLowerCase() !== "pierre") return;

  const done = [
    "Vídeo de apresentação",
    "Fotografia profissional",
    "Tour virtual / visita virtual",
    "Imagens aéreas com drone",
    "Manutenção dos anúncios nas plataformas imobiliárias",
    "Divulgação nas redes sociais",
    "Divulgação no grupo interno de especialistas RE/MAX",
    "Show de Captações",
    "Prospecção de investidores e construtores",
    "Campanha de tráfego pago",
    "Monitoramento dos indicadores de desempenho"
  ];
  const todo = [
    "Placa de divulgação no imóvel",
    "Publicação em portais imobiliários",
    "Distribuição do material a corretores parceiros",
    "Revisão estratégica do anúncio"
  ];
  for (const action of [...done, ...todo]) if (!actionOptions.includes(action)) actionOptions.push(action);
  ACTION_DESCRIPTIONS["Prospecção de investidores e construtores"]="Contato direcionado a investidores e construtores potencialmente compatíveis.";

  $("views").value = "0";
  $("virtualVisits").value = "0";
  $("message1").value = "Seja muito bem-vindo a esta nova etapa conosco! É um prazer iniciar o trabalho de divulgação e gestão do seu imóvel. Nosso objetivo é apresentar a propriedade da melhor forma possível, conectando-a a potenciais interessados e trabalhando para alcançar um excelente resultado.";
  $("message2").value = "O vídeo publicado no Instagram ultrapassou 5,5 mil visualizações, ampliando a exposição do imóvel. As estatísticas específicas de visualizações e acessos ao anúncio imobiliário ainda não estão disponíveis; por isso, as visualizações do vídeo não foram somadas aos indicadores do anúncio.";
  $("message3").value = "A próxima etapa é revisar estrategicamente a foto de capa, o título, a descrição e a apresentação do terreno, destacando primeiro o valor e o potencial da área antes de qualquer sugestão de ajuste. Também vamos instalar a placa, concluir a publicação nos canais e disponibilizar o material para corretores parceiros da RE/MAX e de outras redes.";
  renderActions(presetActions ? done : [], presetActions ? todo : []);
  all(".char-counter").forEach(counter => {
    const input = $(counter.dataset.for);
    if (input) counter.textContent = `${input.value.length}/${input.maxLength}`;
  });
  updateLiveTotals();
  status.textContent = "Dados do feedback do Pierre carregados — revise antes de gerar o PDF.";
}
function updateLiveTotals() {
  const p=currentProperty(), baseViews=Number(p?.acumulado_visualizacoes||0), baseVirtual=Number(p?.acumulado_visitas_virtuais||0), views=Number($("views").value||0), virtual=Number($("virtualVisits").value||0);
  $("liveTotalViews").textContent=formatNumber(baseViews+views); $("liveTotalVirtual").textContent=formatNumber(baseVirtual+virtual);
  $("previousTotalViews").textContent=`Acumulado anterior: ${formatNumber(baseViews)}`; $("previousTotalVirtual").textContent=`Acumulado anterior: ${formatNumber(baseVirtual)}`;
}

function renderActions(done=[],todo=[]) {
  const box=$("actions"); if(!box)return;
  box.innerHTML=actionOptions.map(action=>{
    const description=ACTION_DESCRIPTIONS[action]||"Registre esta ação quando ela fizer parte do plano de divulgação do imóvel.";
    return `<div class="action-row"><div class="action-label-wrap"><span>${esc(action)}</span><button type="button" class="action-help" aria-label="Explicação: ${esc(action)}" aria-expanded="false" title="Ver explicação">i</button><span class="action-description" hidden>${esc(description)}</span></div><label><input type="checkbox" data-kind="done" data-action="${esc(action)}" ${done.includes(action)?"checked":""}> Feita</label><label><input type="checkbox" data-kind="todo" data-action="${esc(action)}" ${todo.includes(action)?"checked":""}> À fazer</label></div>`;
  }).join("");
  all(".action-help").forEach(button=>button.addEventListener("click",()=>{
    const description=button.parentElement.querySelector(".action-description");
    const opening=description.hidden;
    description.hidden=!opening;
    button.setAttribute("aria-expanded",String(opening));
  }));
}
function selectedActions(){return{done:all("#actions input[data-kind='done']:checked").map(x=>x.dataset.action),todo:all("#actions input[data-kind='todo']:checked").map(x=>x.dataset.action)}}

function showPage(name){
  all(".app-page").forEach(page=>page.classList.add("hidden"));
  const target=$("page"+name.charAt(0).toUpperCase()+name.slice(1)); if(target)target.classList.remove("hidden");
  if(name==="brokers")renderBrokerList(); if(name==="properties")renderPropertyManager();
  const menu=$("menuPanel"); if(menu)menu.hidden=true; window.scrollTo(0,0);
}

function renderBrokerList(){
  const box=$("brokerList"); if(!box)return;
  box.innerHTML=brokers.length?brokers.map(b=>`<article class="broker-card ${b.id===brokerId?"active":""}"><button type="button" class="broker-select" data-broker="${esc(b.id)}">${b.foto_data?`<img src="${b.foto_data}" alt="">`:`<span class="avatar">${esc((b.nome||"?").charAt(0))}</span>`}<span><b>${esc(b.nome)}</b><small>${esc(b.creci||"CRECI não informado")} · ${b.id===brokerId?"Perfil atual":"Selecionar"}</small></span></button><div class="card-actions"><button type="button" class="secondary-button small" data-edit-broker="${esc(b.id)}">Editar</button><button type="button" class="danger-button small" data-delete-broker="${esc(b.id)}">Excluir</button></div></article>`).join(""):'<div class="empty-state">Nenhum corretor cadastrado.</div>';
  all("[data-broker]").forEach(button=>button.onclick=async()=>{brokerId=button.dataset.broker;localStorage.setItem("feedbackActiveBroker",brokerId);await applyBroker(currentBroker());await loadProperties();showPage("feedback")});
  all("[data-edit-broker]").forEach(button=>button.onclick=()=>openBrokerForm(button.dataset.editBroker));
  all("[data-delete-broker]").forEach(button=>button.onclick=()=>deleteBroker(button.dataset.deleteBroker));
}

function openBrokerForm(id=null){
  editingBrokerId=id; const b=id?brokers.find(x=>x.id===id):null; $("brokerFormPanel").classList.remove("hidden");
  $("brokerName").value=b?.nome||""; $("brokerPhone").value=b?.telefone||""; $("brokerEmail").value=b?.email||""; $("creci").value=b?.creci||""; $("office").value=b?.endereco_escritorio||"";
  brokerPhotoData=b?.foto_data||""; $("brokerPhotoName").textContent=brokerPhotoData?"Foto salva ✓":"Nenhuma foto"; $("brokerFormTitle").textContent=b?"Editar corretor":"Adicionar corretor"; $("brokerName").focus();
}
async function saveBrokerProfile(){
  const name=$("brokerName").value.trim(), id=editingBrokerId||`corretor-${Date.now()}`; if(!name)return alert("Informe o nome do corretor.");
  status.textContent="Salvando corretor...";
  const payload={id,nome:name,telefone:$("brokerPhone").value.trim(),email:$("brokerEmail").value.trim(),creci:$("creci").value.trim(),endereco_escritorio:$("office").value.trim(),foto_data:brokerPhotoData||null,ativo:true};
  if(editingBrokerId)await sb("feedback_brokers",{method:"PATCH",query:`id=eq.${encodeURIComponent(id)}`,body:payload});else await sb("feedback_brokers",{method:"POST",body:payload});
  await loadBrokers(); brokerId=id; localStorage.setItem("feedbackActiveBroker",brokerId); await applyBroker(currentBroker()); await loadProperties(); $("brokerFormPanel").classList.add("hidden"); renderBrokerList(); status.textContent="Corretor salvo ✓";
}
async function deleteBroker(id){if(!confirm("Excluir este corretor? Os imóveis vinculados deixarão de aparecer para ele."))return;status.textContent="Excluindo corretor...";await sb("feedback_brokers",{method:"PATCH",query:`id=eq.${encodeURIComponent(id)}`,body:{ativo:false}});await loadBrokers();if(!brokers.some(b=>b.id===brokerId))brokerId=brokers[0]?.id||"";localStorage.setItem("feedbackActiveBroker",brokerId);if(brokerId){await applyBroker(currentBroker());await loadProperties()}renderBrokerList();status.textContent="Corretor excluído ✓"}
async function applyBroker(b){if(!b)return;$("brokerName").value=b.nome||"";$("brokerPhone").value=b.telefone||"";$("brokerEmail").value=b.email||"";$("creci").value=b.creci||"";$("office").value=b.endereco_escritorio||"";brokerPhotoData=b.foto_data||"";$("profileStatus").textContent=`Perfil: ${b.nome}`;$("pageDescription").textContent=`Página de ${b.nome} · imóveis vinculados a este corretor`}

function renderPropertyManager(){
  const box=$("propertyManager");if(!box)return;$("propertyPageBroker").textContent=currentBroker()?.nome||"corretor";
  box.innerHTML=`<div class="manager-toolbar"><div><h2>Imóveis cadastrados</h2><p>${properties.length} imóvel(is) vinculado(s) a ${esc(currentBroker()?.nome||"este corretor")}.</p></div><button type="button" class="primary-button" id="addPropertyButton">+ Adicionar imóvel</button></div><div class="property-list">${properties.length?properties.map(p=>`<article class="property-card">${p.foto_data?`<img src="${p.foto_data}" alt="">`:`<div class="property-placeholder">IMÓVEL</div>`}<div class="property-card-body"><b>${esc(p.proprietario_nome||"Sem proprietário")}</b><span>${esc(p.endereco||"Endereço não informado")}</span>${p.codigo_remax?`<small>RE/MAX ${esc(p.codigo_remax)}</small>`:""}</div><div class="card-actions"><button type="button" class="secondary-button small" data-edit-property="${esc(p.id)}">Editar</button><button type="button" class="danger-button small" data-delete-property="${esc(p.id)}">Excluir</button></div></article>`).join(""):'<div class="empty-state">Nenhum imóvel cadastrado para este corretor.</div>'}</div><div class="panel property-form-panel hidden" id="propertyFormPanel"></div>`;
  $("addPropertyButton").onclick=()=>openPropertyForm();all("[data-edit-property]").forEach(btn=>btn.onclick=()=>openPropertyForm(btn.dataset.editProperty));all("[data-delete-property]").forEach(btn=>btn.onclick=()=>deleteProperty(btn.dataset.deleteProperty));
}
function openPropertyForm(id=null){
  editingPropertyId=id;const p=id?properties.find(x=>String(x.id)===String(id)):null;const panel=$("propertyFormPanel");panel.classList.remove("hidden");
  panel.innerHTML=`<div class="panel-head"><div><h2>${p?"Editar imóvel":"Adicionar imóvel"}</h2><span class="hint">O imóvel ficará vinculado ao corretor selecionado.</span></div><button type="button" class="secondary-button" id="closePropertyForm">Fechar</button></div><div class="fields property-crud-fields"><label>Corretor responsável<select id="propertyBroker">${brokers.map(b=>`<option value="${esc(b.id)}" ${b.id===(p?.broker_id||brokerId)?"selected":""}>${esc(b.nome)}</option>`).join("")}</select></label><label>Proprietário / destinatário<input id="propertyOwner" maxlength="120" value="${esc(p?.proprietario_nome||"")}" placeholder="Nome do proprietário"></label><label>Endereço do imóvel<input id="propertyAddress" maxlength="220" value="${esc(p?.endereco||"")}" placeholder="Endereço completo do imóvel"></label><label>Código RE/MAX<input id="propertyCode" maxlength="40" value="${esc(p?.codigo_remax||"")}" placeholder="Código do anúncio"></label><label class="span-2 upload">Foto do imóvel<input id="propertyPhoto" type="file" accept="image/*"><span id="propertyPhotoName">${p?.foto_data?"Foto salva ✓":"Nenhuma foto"}</span></label></div><div class="panel-footer"><span class="save-note">Este cadastro é compartilhado entre os usuários do sistema.</span><button type="button" class="primary-button" id="saveProperty">Salvar imóvel</button></div>`;
  propertyPhotoData=p?.foto_data||"";$("closePropertyForm").onclick=()=>panel.classList.add("hidden");$("propertyPhoto").onchange=async event=>{const file=event.target.files?.[0];if(!file)return;propertyPhotoData=await fileToDataURL(file,2400,.9);$("propertyPhotoName").textContent=`${file.name} — preparada`};$("saveProperty").onclick=saveProperty;
}
async function saveProperty(){
  const owner=$("propertyOwner").value.trim(),endereco=$("propertyAddress").value.trim();if(!owner||!endereco)return alert("Informe o proprietário e o endereço do imóvel.");const id=editingPropertyId||`imovel-${Date.now()}`,old=editingPropertyId?properties.find(p=>String(p.id)===String(editingPropertyId)):null;
  status.textContent="Salvando imóvel...";
  const selectedBroker=$("propertyBroker").value||brokerId; const payload={id,broker_id:selectedBroker,proprietario_nome:owner,endereco,codigo_remax:$("propertyCode").value.trim(),foto_data:propertyPhotoData||null,ativo:true,acumulado_visualizacoes:old?.acumulado_visualizacoes||0,acumulado_visitas_virtuais:old?.acumulado_visitas_virtuais||0};
  if(editingPropertyId)await sb("feedback_properties",{method:"PATCH",query:`id=eq.${encodeURIComponent(id)}`,body:payload});else await sb("feedback_properties",{method:"POST",body:payload});brokerId=selectedBroker; localStorage.setItem("feedbackActiveBroker",brokerId); await applyBroker(currentBroker()); await loadProperties(); renderPropertyManager(); status.textContent="Imóvel salvo ✓";
}
async function deleteProperty(id){if(!confirm("Excluir este imóvel?"))return;status.textContent="Excluindo imóvel...";await sb("feedback_properties",{method:"PATCH",query:`id=eq.${encodeURIComponent(id)}`,body:{ativo:false}});await loadProperties();renderPropertyManager();status.textContent="Imóvel excluído ✓"}

function fileToDataURL(file,max=2400,quality=.9){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{if(!blob)return reject(new Error("Falha ao preparar imagem"));const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)},"image/jpeg",quality)};img.src=reader.result};reader.readAsDataURL(file)})}

async function collectData(){
  const property=currentProperty(),broker=currentBroker();if(!broker||!property)throw new Error("Perfil ou imóvel não selecionado.");const actions=selectedActions(),weeklyViews=Number($("views").value||0),weeklyVirtual=Number($("virtualVisits").value||0);
  return{brokerId:broker.id,owner:property.proprietario_nome,address:property.endereco,date:today(),brokerName:broker.nome,brokerPhone:broker.telefone||"",brokerEmail:broker.email||"",creci:broker.creci||"",office:broker.endereco_escritorio||"",brokerPhoto:broker.foto_data||"",propertyPhoto:property.foto_data||"",views:weeklyViews,virtualVisits:weeklyVirtual,message1:$("message1").value,message2:$("message2").value,message3:$("message3").value,doneActions:actions.done,todoActions:actions.todo,actionDescriptions:ACTION_DESCRIPTIONS,cumulativeViews:Number(property.acumulado_visualizacoes||0)+weeklyViews,cumulativeVirtualVisits:Number(property.acumulado_visitas_virtuais||0)+weeklyVirtual,statsPhoto:statsPhotoData};
}
async function saveWeeklyFeedback(data){
  const property=currentProperty();if(!property)return;
  await sb("feedback_properties",{method:"PATCH",query:`id=eq.${encodeURIComponent(property.id)}`,body:{acumulado_visualizacoes:data.cumulativeViews,acumulado_visitas_virtuais:data.cumulativeVirtualVisits}});
  property.acumulado_visualizacoes=data.cumulativeViews;property.acumulado_visitas_virtuais=data.cumulativeVirtualVisits;
}
async function buildData(){const data=await collectData(),statsFile=$("statsPhoto").files?.[0];if(statsFile){statsPhotoData=await fileToDataURL(statsFile,3000,.9);data.statsPhoto=statsPhotoData}return data}
async function openPreview(){const previewWindow=window.open("about:blank","_blank");if(!previewWindow){alert("Permita a abertura de uma nova janela para visualizar o relatório.");return}status.textContent="Preparando prévia...";try{const data=await buildData();const onPreviewMessage=event=>{if(event.origin!==location.origin||event.source!==previewWindow)return;if(event.data?.type==="feedbackPreviewReady"){previewWindow.postMessage({type:"feedbackPreviewData",data},location.origin);status.textContent="Prévia atualizada ✓";window.removeEventListener("message",onPreviewMessage)}else if(event.data?.type==="feedbackPreviewError"){status.textContent="Não foi possível montar a prévia";window.removeEventListener("message",onPreviewMessage)}};window.addEventListener("message",onPreviewMessage);previewWindow.location.href="/preview?preview="+Date.now()}catch(error){console.error(error);previewWindow.close();status.textContent="Erro ao preparar prévia";alert(error.message||"Não foi possível abrir a visualização.")}}
async function generatePDF(event){event.preventDefault();status.textContent="Gerando PDF...";try{const data=await buildData(),response=await fetch("/api/pdf",{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},body:JSON.stringify(data)});if(!response.ok)throw new Error(await response.text());const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`FEEDBACK_${(data.owner||"imovel").replace(/[\\/:*?\"<>|]/g,"")}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);await saveWeeklyFeedback(data);status.textContent="PDF pronto ✓"}catch(error){console.error(error);status.textContent="Erro ao gerar PDF";alert(error.message||"Não foi possível gerar o PDF.")}}

function setupNavigation(){const menuButton=$("menuButton"),menuPanel=$("menuPanel");if(menuButton&&menuPanel)menuButton.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();menuPanel.hidden=!menuPanel.hidden});all("[data-page]").forEach(button=>{button.type="button";button.addEventListener("click",event=>{event.preventDefault();showPage(button.dataset.page)})});document.addEventListener("click",event=>{const menu=$("menuPanel");if(menu&&!event.target.closest("#menuPanel")&&!event.target.closest("#menuButton"))menu.hidden=true})}
function setupCounters(){all(".char-counter").forEach(counter=>{const input=$(counter.dataset.for);if(!input)return;const update=()=>{counter.textContent=`${input.value.length}/${input.maxLength}`;counter.classList.toggle("near-limit",input.value.length>=input.maxLength*0.85)};input.addEventListener("input",update);update()})} setupCounters();
$("addAction").addEventListener("click",event=>{event.preventDefault();const value=$("customAction").value.trim();if(value&&!actionOptions.includes(value))actionOptions.push(value);$("customAction").value="";renderActions();setupCounters()});
$("statsPhoto").addEventListener("change",async event=>{const file=event.target.files?.[0];if(!file)return;statsPhotoData=await fileToDataURL(file,3000,.9);$("statsName").textContent=`${file.name} — preparada`;const preview=$("statsPhotoPreview");if(preview){preview.src=statsPhotoData;preview.classList.remove("hidden")}});
ownerSelect.addEventListener("change",()=>{updateOwnerFields();renderActions();applyPierreDraft(false)});$("views").addEventListener("input",updateLiveTotals);$("virtualVisits").addEventListener("input",updateLiveTotals);
$("brokerPhoto").addEventListener("change",async event=>{const file=event.target.files?.[0];if(!file)return;brokerPhotoData=await fileToDataURL(file,1600,.9);$("brokerPhotoName").textContent=`${file.name} — preparada`});
$("saveBroker").addEventListener("click",saveBrokerProfile);$("closeBrokerForm").addEventListener("click",()=>$("brokerFormPanel").classList.add("hidden"));$("addBrokerButton").addEventListener("click",()=>openBrokerForm());$("brokerListButton").addEventListener("click",()=>{$("brokerFormPanel").classList.add("hidden");renderBrokerList()});$("previewButton").addEventListener("click",openPreview);$("downloadButton").addEventListener("click",()=>generatePDF({preventDefault(){}}));

(async function init(){
  try {
    await window.feedbackAuthReady;
    await loadBrokers();
    await applyBroker(currentBroker());
    renderActions();
    await loadProperties();
    updateLiveTotals();
    setupNavigation();
    status.textContent = `${brokers.length} corretor(es) e ${properties.length} imóvel(is) carregados ✓`;
  } catch (error) {
    console.error("Falha ao carregar a base do Feedback Maker:", error);
    status.textContent = "Erro ao carregar base";
    alert(`Não foi possível carregar a base de corretores e imóveis.\\n\\n${error?.message || "Erro desconhecido"}`);
  }
})();
