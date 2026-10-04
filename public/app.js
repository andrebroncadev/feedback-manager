const $ = id => document.getElementById(id);
const all = selector => Array.from(document.querySelectorAll(selector));

const form = $("feedbackForm");
const ownerSelect = $("ownerSelect");
const address = $("address");
const status = $("saveStatus");

let properties = [];
let brokerPhotoData = "";

const defaultErica = {
  id: "erica",
  name: "Érica Bronca",
  phone: "(12) 98123-5534",
  email: "ericabronca@remax.com.br",
  creci: "CRECI 199167",
  office: "324 Rua Claudio Izidoro do Espírito Santo, Juquehy — São Sebastião"
};

const actionOptions = [
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

let brokerId = "erica";

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[char]));
}

function safeJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function profileKey() { return `feedbackBrokerProfile:${brokerId}`; }
function profile() { return safeJSON(profileKey(), null); }
function allProfiles() { return safeJSON("feedbackBrokerProfiles", []); }

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function getStates() {
  return {
    done: safeJSON(`${profileKey()}:feedbackDoneActions`, []),
    todo: safeJSON(`${profileKey()}:feedbackTodoActions`, [])
  };
}

function saveStates(done, todo) {
  localStorage.setItem(`${profileKey()}:feedbackDoneActions`, JSON.stringify(done));
  localStorage.setItem(`${profileKey()}:feedbackTodoActions`, JSON.stringify(todo));
}

function ensureDefaultProfile() {
  let profiles = allProfiles();
  if (!profiles.some(p => p.id === "erica")) {
    profiles.push(defaultErica);
    localStorage.setItem("feedbackBrokerProfiles", JSON.stringify(profiles));
  }

  const savedId = localStorage.getItem("feedbackActiveBroker");
  brokerId = savedId && profiles.some(p => p.id === savedId) ? savedId : "erica";
  localStorage.setItem("feedbackActiveBroker", brokerId);

  if (!profile()) localStorage.setItem(profileKey(), JSON.stringify(profiles.find(p => p.id === brokerId)));
}

async function loadProperties(selectedId = null) {
  try {
    const response = await fetch("/data/properties.json?ts=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("properties.json não carregou");
    const data = await response.json();
    properties = data.filter(p => String(p.brokerId).toLowerCase() === String(brokerId).toLowerCase());
    renderProperties(selectedId);
  } catch (error) {
    console.error("Falha ao carregar imóveis:", error);
    properties = [];
    renderProperties(selectedId);
  }
}

function renderProperties(selectedId = null) {
  ownerSelect.innerHTML = '<option value="">Selecione o imóvel...</option>' + properties.map(p =>
    `<option value="${esc(p.id)}">${esc(p.owner)}</option>`
  ).join("");

  if (selectedId != null && properties.some(p => String(p.id) === String(selectedId))) {
    ownerSelect.value = String(selectedId);
  }
  updateOwnerFields();
}

function updateOwnerFields() {
  const property = properties.find(p => String(p.id) === String(ownerSelect.value));
  address.value = property?.address || "";
}

function renderActions() {
  const { done, todo } = getStates();
  const box = $("actions");
  if (!box) return;

  box.innerHTML = actionOptions.map(action => `
    <div class="action-row">
      <span>${esc(action)}</span>
      <label><input type="checkbox" data-kind="done" data-action="${esc(action)}" ${done.includes(action) ? "checked" : ""}> Feita</label>
      <label><input type="checkbox" data-kind="todo" data-action="${esc(action)}" ${todo.includes(action) ? "checked" : ""}> À fazer</label>
    </div>
  `).join("");

  all("#actions input").forEach(input => {
    input.onchange = () => {
      saveStates(
        all("#actions input[data-kind='done']:checked").map(x => x.dataset.action),
        all("#actions input[data-kind='todo']:checked").map(x => x.dataset.action)
      );
    };
  });
}

function showPage(name) {
  all(".app-page").forEach(page => page.classList.add("hidden"));
  const target = $("page" + name.charAt(0).toUpperCase() + name.slice(1));
  if (target) target.classList.remove("hidden");

  if (name === "brokers") renderBrokerList();
  if (name === "owners") renderOwnerList();
  if (name === "properties") renderPropertyManager();

  const menu = $("menuPanel");
  if (menu) menu.hidden = true;
  window.scrollTo(0, 0);
}

function renderBrokerList() {
  const box = $("brokerList");
  if (!box) return;
  const list = allProfiles();

  box.innerHTML = list.length ? list.map(p => `
    <button type="button" class="broker-card ${p.id === brokerId ? "active" : ""}" data-broker="${esc(p.id)}">
      <span class="avatar">${esc((p.name || "?").charAt(0))}</span>
      <span><b>${esc(p.name || p.id)}</b><small>${p.id === brokerId ? "Perfil atual" : "Selecionar perfil"}</small></span>
    </button>
  `).join("") : '<div class="empty-state">Nenhum perfil salvo.</div>';

  all(".broker-card").forEach(button => {
    button.onclick = async event => {
      event.preventDefault();
      const selectedId = button.dataset.broker;
      const selected = allProfiles().find(p => p.id === selectedId);
      if (!selected) return;
      brokerId = selected.id;
      localStorage.setItem("feedbackActiveBroker", brokerId);
      localStorage.setItem(profileKey(), JSON.stringify(selected));
      await applyProfile(selected);
      await loadProperties();
      renderActions();
      showPage("feedback");
    };
  });
}

function renderOwnerList() {
  const box = $("ownerList");
  if (!box) return;
  box.innerHTML = properties.length ? properties.map(p => `
    <button type="button" class="owner-card" data-p="${esc(p.id)}">
      <b>${esc(p.owner)}</b><span>${esc(p.address)}</span>
    </button>
  `).join("") : '<div class="empty-state">Nenhum imóvel cadastrado para este corretor.</div>';

  all(".owner-card").forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      showPage("feedback");
      ownerSelect.value = button.dataset.p;
      updateOwnerFields();
    };
  });
}

function renderPropertyManager() {
  const box = $("propertyManager");
  if (!box) return;
  const property = properties.find(p => String(p.id) === String(ownerSelect.value));
  $("propertyPageBroker").textContent = profile()?.name || "corretor";

  if (!property) {
    box.innerHTML = '<div class="empty-state">Selecione um imóvel no feedback primeiro.</div>';
    return;
  }

  box.innerHTML = `<div class="property-manager-head"><h2>${esc(property.owner)}</h2><p>${esc(property.address)}</p></div>
    <label class="upload">Foto do imóvel<input id="managerPropertyPhoto" type="file" accept="image/*"><span id="managerPhotoName">Nenhuma foto salva</span></label>`;

  $("managerPropertyPhoto").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    await putPhoto(`property:${brokerId}:${property.id}`, await compressImage(file, 4000, .94));
    $("managerPhotoName").textContent = file.name + " — salva neste imóvel";
  };
}

const DB_NAME = "feedback-manager-media";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("photos")) request.result.createObjectStore("photos");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putPhoto(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readwrite");
    tx.objectStore("photos").put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getPhoto(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("photos", "readonly").objectStore("photos").get(key);
    req.onsuccess = () => { const value = req.result || null; db.close(); resolve(value); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    if (!blob) return resolve("");
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function compressImage(file, max = 2400, quality = .9) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao preparar imagem")), "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function applyProfile(p) {
  if (!p) return;
  $("brokerName").value = p.name || "";
  $("brokerPhone").value = p.phone || "";
  $("brokerEmail").value = p.email || "";
  $("creci").value = p.creci || "";
  $("office").value = p.office || "";
  brokerPhotoData = await blobToDataURL(await getPhoto(`broker:${brokerId}`));
  $("profileStatus").textContent = `Perfil: ${p.name || brokerId}`;
  $("pageDescription").textContent = `Página de ${p.name || brokerId} · imóveis vinculados a este corretor`;
  $("brokerPhotoName").textContent = brokerPhotoData ? "Foto salva no perfil ✓" : "Nenhuma foto";
}

async function saveBrokerProfile() {
  const p = {
    id: brokerId,
    name: $("brokerName").value.trim(),
    phone: $("brokerPhone").value.trim(),
    email: $("brokerEmail").value.trim(),
    creci: $("creci").value.trim(),
    office: $("office").value.trim()
  };
  localStorage.setItem(profileKey(), JSON.stringify(p));
  const profiles = allProfiles().filter(item => item.id !== brokerId);
  profiles.push(p);
  localStorage.setItem("feedbackBrokerProfiles", JSON.stringify(profiles));
  localStorage.setItem("feedbackActiveBroker", brokerId);
  await applyProfile(p);
  renderBrokerList();
  status.textContent = "Perfil salvo ✓";
}

function resetBrokerForm() {
  brokerId = "corretor-" + Date.now();
  ["brokerName", "brokerPhone", "brokerEmail", "creci", "office"].forEach(id => $(id).value = "");
  $("brokerPhotoName").textContent = "Nenhuma foto";
  brokerPhotoData = "";
}

async function collectData() {
  const property = properties.find(p => String(p.id) === String(ownerSelect.value));
  const savedProfile = profile();
  if (!savedProfile || !property) throw new Error("Perfil ou imóvel não selecionado.");
  const { done, todo } = getStates();
  return {
    brokerId, owner: property.owner, address: property.address, date: today(),
    brokerName: $("brokerName").value, brokerPhone: $("brokerPhone").value, brokerEmail: $("brokerEmail").value,
    creci: $("creci").value, office: $("office").value,
    brokerPhoto: brokerPhotoData || await blobToDataURL(await getPhoto(`broker:${brokerId}`)),
    propertyPhoto: await blobToDataURL(await getPhoto(`property:${brokerId}:${property.id}`)),
    views: $("views").value, accesses: $("accesses").value, virtualVisits: $("virtualVisits").value,
    exposure: $("exposure").value, exposurePct: $("exposurePct").value, viewsPct: $("viewsPct").value,
    message1: $("message1").value, message2: $("message2").value, message3: $("message3").value,
    doneActions: done, todoActions: todo
  };
}

async function buildData() {
  const data = await collectData();
  const statsFile = $("statsPhoto").files?.[0];
  data.statsPhoto = statsFile ? await blobToDataURL(await compressImage(statsFile, 3000, .9)) : "";
  return data;
}

async function openPreview() {
  try {
    const data = await buildData();
    sessionStorage.setItem("feedbackPreview", JSON.stringify(data));
    window.open("/preview", "_blank");
  } catch (error) {
    console.error(error);
    alert("Preencha o perfil e selecione um imóvel antes de visualizar o relatório.");
  }
}

async function generatePDF(event) {
  event.preventDefault();
  status.textContent = "Gerando PDF...";
  try {
    const data = await buildData();
    const response = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(await response.text());
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FEEDBACK_${(data.owner || "imovel").replace(/[\\/:*?\"<>|]/g, "")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    status.textContent = "PDF pronto ✓";
  } catch (error) {
    console.error(error);
    status.textContent = "Erro ao gerar PDF";
    alert("Não foi possível gerar o PDF. Confira o perfil e o imóvel selecionado.");
  }
}

function setupNavigation() {
  $("menuButton").addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    $("menuPanel").hidden = !$("menuPanel").hidden;
  });

  all(".nav-links button[data-page]").forEach(button => {
    button.type = "button";
    button.addEventListener("click", event => {
      event.preventDefault();
      showPage(button.dataset.page);
    });
  });

  all("#menuPanel button").forEach(button => {
    button.type = "button";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.action === "properties") showPage("properties");
      else if (button.dataset.page) showPage(button.dataset.page);
    });
  });

  document.addEventListener("click", event => {
    const menu = $("menuPanel");
    if (!event.target.closest("#menuPanel") && !event.target.closest("#menuButton")) menu.hidden = true;
  });
}

$("addAction").addEventListener("click", event => {
  event.preventDefault();
  const value = $("customAction").value.trim();
  if (value && !actionOptions.includes(value)) actionOptions.push(value);
  $("customAction").value = "";
  renderActions();
});

$("statsPhoto").addEventListener("change", event => {
  $("statsName").textContent = event.target.files?.[0]?.name || "Nenhuma imagem selecionada";
});

ownerSelect.addEventListener("change", updateOwnerFields);

$("brokerPhoto").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const blob = await compressImage(file, 2400, .9);
    await putPhoto(`broker:${brokerId}`, blob);
    brokerPhotoData = await blobToDataURL(blob);
    $("brokerPhotoName").textContent = file.name + " — salva no perfil";
  } catch (error) { console.error(error); }
});

$("saveBroker").addEventListener("click", saveBrokerProfile);
$("closeBrokerForm").addEventListener("click", () => $("brokerFormPanel").classList.add("hidden"));
$("addBrokerButton").addEventListener("click", () => {
  resetBrokerForm();
  $("brokerFormPanel").classList.remove("hidden");
  $("brokerName").focus();
});
$("brokerListButton").addEventListener("click", () => {
  $("brokerFormPanel").classList.add("hidden");
  showPage("brokers");
});
$("previewButton").addEventListener("click", openPreview);
form.addEventListener("submit", generatePDF);

(async function init() {
  ensureDefaultProfile();
  await applyProfile(profile());
  renderActions();
  await loadProperties();
  setupNavigation();
})();
