const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const form = $("#feedbackForm");
const ownerSelect = $("#ownerSelect");
const address = $("#address");
const status = $("#saveStatus");

const params = new URLSearchParams(location.search);
let brokerId = (params.get("corretor") || localStorage.getItem("feedbackActiveBroker") || "erica")
  .toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

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

function profileKey() {
  return `feedbackBrokerProfile:${brokerId}`;
}

function getStates() {
  return {
    done: safeJSON(`${profileKey()}:feedbackDoneActions`, []),
    todo: safeJSON(`${profileKey()}:feedbackTodoActions`, [])
  };
}

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function esc(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[c]));
}

function safeJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function profile() {
  return safeJSON(profileKey(), null);
}

function allProfiles() {
  return safeJSON("feedbackBrokerProfiles", []);
}

function saveStates(done, todo) {
  localStorage.setItem(`${profileKey()}:feedbackDoneActions`, JSON.stringify(done));
  localStorage.setItem(`${profileKey()}:feedbackTodoActions`, JSON.stringify(todo));
}

function ensureDefaultProfile() {
  const profiles = allProfiles();
  const existing = profiles.find(p => p.id === "erica");

  if (!existing) {
    profiles.push(defaultErica);
    localStorage.setItem("feedbackBrokerProfiles", JSON.stringify(profiles));
  }

  if (!profile()) {
    localStorage.setItem("feedbackBrokerProfile:erica", JSON.stringify(defaultErica));
  }
}

async function loadProperties() {
  try {
    const response = await fetch("/data/properties.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Não foi possível carregar os imóveis.");
    const all = await response.json();
    properties = all.filter(p => String(p.brokerId).toLowerCase() === String(brokerId).toLowerCase());

    if (!properties.length && brokerId === "erica") {
      properties = all;
    }

    renderProperties();
  } catch (error) {
    console.error(error);
    properties = [];
    renderProperties();
  }
}

function renderProperties(id) {
  ownerSelect.innerHTML =
    '<option value="">Selecione o imóvel...</option>' +
    properties.map(p =>
      `<option value="${esc(p.id)}">${esc(p.owner)}</option>`
    ).join("");

  if (id != null) ownerSelect.value = String(id);
  else if (properties.length) ownerSelect.value = String(properties[0].id);

  ownerSelect.dispatchEvent(new Event("change"));
}

function renderActions() {
  const { done, todo } = getStates();

  $("#actions").innerHTML = actionOptions.map(action => `
    <div class="action-row">
      <span>${esc(action)}</span>
      <label><input type="checkbox" data-kind="done" data-action="${esc(action)}" ${done.includes(action) ? "checked" : ""}> Feita</label>
      <label><input type="checkbox" data-kind="todo" data-action="${esc(action)}" ${todo.includes(action) ? "checked" : ""}> À fazer</label>
    </div>
  `).join("");

  $$("#actions input").forEach(input => {
    input.onchange = () => saveStates(
      $$("#actions input[data-kind=done]:checked").map(x => x.dataset.action),
      $$("#actions input[data-kind=todo]:checked").map(x => x.dataset.action)
    );
  });
}

function showPage(name) {
  $$(".app-page").forEach(page => page.classList.add("hidden"));
  const page = $("#page" + name[0].toUpperCase() + name.slice(1));

  if (page) page.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "brokers") renderBrokerList();
  if (name === "owners") renderOwnerList();
  if (name === "properties") renderPropertyManager();

  $("#menuPanel").hidden = true;
}

function renderBrokerList() {
  const list = allProfiles();

  $("#brokerList").innerHTML = list.length
    ? list.map(p => `
      <button type="button" class="broker-card ${p.id === brokerId ? "active" : ""}" data-broker="${esc(p.id)}">
        <span class="avatar">${esc((p.name || "?")[0])}</span>
        <span>
          <b>${esc(p.name || p.id)}</b>
          <small>${p.id === brokerId ? "Perfil atual" : "Selecionar perfil"}</small>
        </span>
      </button>
    `).join("")
    : '<div class="empty-state">Nenhum perfil salvo.</div>';

  $(".broker-card").forEach(button => {
    button.onclick = async event => {
      event.preventDefault();
      event.stopPropagation();
      const selectedId = button.dataset.broker;
      const selectedProfile = allProfiles().find(p => p.id === selectedId);
      if (!selectedProfile) return;
      brokerId = selectedId;
      localStorage.setItem("feedbackActiveBroker", brokerId);
      localStorage.setItem(profileKey(), JSON.stringify(selectedProfile));
      await applyProfile(selectedProfile);
      await loadProperties();
      showPage("feedback");
    };
  });
}

function renderOwnerList() {
  const el = $("#ownerList");

  el.innerHTML = properties.length
    ? properties.map(p => `
      <button type="button" class="owner-card" data-p="${esc(p.id)}">
        <b>${esc(p.owner)}</b>
        <span>${esc(p.address)}</span>
      </button>
    `).join("")
    : '<div class="empty-state">Nenhum imóvel cadastrado para este corretor.</div>';

  $$(".owner-card").forEach(button => {
    button.onclick = () => {
      showPage("feedback");
      ownerSelect.value = button.dataset.p;
      ownerSelect.dispatchEvent(new Event("change"));
    };
  });
}

function renderPropertyManager() {
  const p = properties.find(x => String(x.id) === String(ownerSelect.value));
  $("#propertyPageBroker").textContent = profile()?.name || "corretor";
  const el = $("#propertyManager");

  if (!p) {
    el.innerHTML = '<div class="empty-state">Selecione um imóvel no feedback primeiro.</div>';
    return;
  }

  el.innerHTML = `
    <div class="property-manager-head">
      <h2>${esc(p.owner)}</h2>
      <p>${esc(p.address)}</p>
    </div>
    <label class="upload">
      Foto do imóvel
      <input id="managerPropertyPhoto" type="file" accept="image/*">
      <span id="managerPhotoName">Nenhuma foto salva</span>
    </label>
  `;

  $("#managerPropertyPhoto").onchange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    await putPhoto(`property:${brokerId}:${p.id}`, await compressImage(file, 4000, .94));
    $("#managerPhotoName").textContent = file.name + " — salva neste imóvel";
  };

  getPhoto(`property:${brokerId}:${p.id}`).then(blob => {
    if (blob) $("#managerPhotoName").textContent = "Foto salva — escolher outra substitui a anterior";
  });
}

const DB_NAME = "feedback-manager-media";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
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
  if (!key) return null;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", "readonly");
    const request = tx.objectStore("photos").get(key);
    request.onsuccess = () => { const value = request.result; db.close(); resolve(value || null); };
    request.onerror = () => { db.close(); reject(request.error); };
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
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao preparar imagem")), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function applyProfile(p) {
  if (!p) return;

  $("#brokerName").value = p.name || "";
  $("#brokerPhone").value = p.phone || "";
  $("#brokerEmail").value = p.email || "";
  $("#creci").value = p.creci || "";
  $("#office").value = p.office || "";

  brokerPhotoData = await blobToDataURL(await getPhoto(`broker:${brokerId}`));

  $("#profileStatus").textContent = `Perfil: ${p.name || brokerId}`;
  $("#pageDescription").textContent = `Página de ${p.name || brokerId} · imóveis vinculados a este corretor`;
  $("#brokerPhotoName").textContent = brokerPhotoData ? "Foto salva no perfil ✓" : "Nenhuma foto";
}

async function saveBrokerProfile() {
  const id = brokerId;
  const p = {
    id,
    name: $("#brokerName").value.trim(),
    phone: $("#brokerPhone").value.trim(),
    email: $("#brokerEmail").value.trim(),
    creci: $("#creci").value.trim(),
    office: $("#office").value.trim()
  };

  localStorage.setItem(`feedbackBrokerProfile:${id}`, JSON.stringify(p));

  const profiles = allProfiles().filter(item => item.id !== id);
  profiles.push(p);
  localStorage.setItem("feedbackBrokerProfiles", JSON.stringify(profiles));

  await applyProfile(p);
  renderBrokerList();
  status.textContent = "Perfil salvo ✓";
}

function resetBrokerForm() {
  brokerId = "corretor-" + Date.now();
  $("#brokerName").value = "";
  $("#brokerPhone").value = "";
  $("#brokerEmail").value = "";
  $("#creci").value = "";
  $("#office").value = "";
  $("#brokerPhotoName").textContent = "Nenhuma foto";
  brokerPhotoData = "";
}

async function openPreview() {
  status.textContent = "Montando prévia...";

  try {
    const data = await buildData();
    sessionStorage.setItem("feedbackPreview", JSON.stringify(data));
    window.open("/preview", "_blank");
    status.textContent = "Pronto ✓";
  } catch (error) {
    console.error(error);
    status.textContent = "Não foi possível montar a prévia";
    alert("Preencha o perfil e selecione um imóvel antes de visualizar o relatório.");
  }
}

async function readOptionalImage(input) {
  const file = input.files?.[0];
  return file ? blobToDataURL(await compressImage(file, 3000, .9)) : "";
}

async function buildData() {
  const data = await collectData();
  data.statsPhoto = await readOptionalImage($("#statsPhoto"));
  return data;
}

async function collectData() {
  const { done, todo } = getStates();
  const property = properties.find(x => String(x.id) === String(ownerSelect.value));
  const savedProfile = profile();

  if (!savedProfile || !property) throw new Error("Perfil ou imóvel não selecionado.");

  const propertyPhoto = await getPhoto(`property:${brokerId}:${property.id}`);

  return {
    brokerId,
    owner: property.owner,
    address: property.address,
    date: today(),
    brokerName: $("#brokerName").value,
    brokerPhone: $("#brokerPhone").value,
    brokerEmail: $("#brokerEmail").value,
    creci: $("#creci").value,
    office: $("#office").value,
    brokerPhoto: brokerPhotoData || await blobToDataURL(await getPhoto(`broker:${brokerId}`)),
    propertyPhoto: await blobToDataURL(propertyPhoto),
    views: $("#views").value,
    accesses: $("#accesses").value,
    virtualVisits: $("#virtualVisits").value,
    exposure: $("#exposure").value,
    exposurePct: $("#exposurePct").value,
    viewsPct: $("#viewsPct").value,
    message1: $("#message1").value,
    message2: $("#message2").value,
    message3: $("#message3").value,
    doneActions: done,
    todoActions: todo
  };
}

async function migrateOldProfile() {
  const p = profile();
  if (p?.photo?.startsWith("data:")) {
    try {
      const response = await fetch(p.photo);
      await putPhoto(`broker:${brokerId}`, await response.blob());
      delete p.photo;
      localStorage.setItem(profileKey(), JSON.stringify(p));
    } catch {}
  }
}

$("#addAction").onclick = () => {
  const value = $("#customAction").value.trim();
  if (value && !actionOptions.includes(value)) {
    actionOptions.push(value);
    $("#customAction").value = "";
    renderActions();
  }
};

$("#statsPhoto").onchange = event => {
  const file = event.target.files?.[0];
  $("#statsName").textContent = file ? file.name : "Nenhuma imagem";
};

ownerSelect.onchange = async () => {
  const property = properties.find(x => String(x.id) === String(ownerSelect.value));
  address.value = property?.address || "";
};

$("#brokerPhoto").onchange = async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  status.textContent = "Salvando foto do perfil...";

  try {
    const blob = await compressImage(file, 2400, .9);
    await putPhoto(`broker:${brokerId}`, blob);
    brokerPhotoData = await blobToDataURL(blob);
    $("#brokerPhotoName").textContent = file.name + " — salva no perfil";
  } catch (error) {
    console.error(error);
    status.textContent = "Erro ao salvar foto";
    alert("Não foi possível salvar a foto do corretor.");
  }
};

$("#saveBroker").onclick = saveBrokerProfile;
$("#closeBrokerForm").onclick = () => $("#brokerFormPanel").classList.add("hidden");
$("#addBrokerButton").onclick = () => {
  resetBrokerForm();
  $("#brokerFormPanel").classList.remove("hidden");
  $("#brokerName").focus();
};
$("#brokerListButton").onclick = () => {
  $("#brokerFormPanel").classList.add("hidden");
  showPage("brokers");
};

$("[data-page]").forEach(button => {
  button.type = "button";
  button.onclick = event => { event.preventDefault(); showPage(button.dataset.page); };
});

$("#menuButton").onclick = event => {
  event.stopPropagation();
  $("#menuPanel").hidden = !$("#menuPanel").hidden;
};

$("#menuPanel").onclick = event => {
  const button = event.target.closest("button");
  if (!button) return;
  event.preventDefault();
  if (button.dataset.action === "properties") showPage("properties");
  else if (button.dataset.page) showPage(button.dataset.page);
};

$("#previewButton").onclick = openPreview;

document.addEventListener("click", event => {
  if (!event.target.closest("#menuPanel") && !event.target.closest("#menuButton")) {
    $("#menuPanel").hidden = true;
  }
});

form.onsubmit = async event => {
  event.preventDefault();
  status.textContent = "Gerando PDF...";

  try {
    const data = await buildData();
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error(await response.text());

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const owner = (data.owner || "imovel").replace(/[\\/:*?"<>|]/g, "");

    link.href = url;
    link.download = `FEEDBACK_${owner}.pdf`;
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
};

(async () => {
  ensureDefaultProfile();
  await migrateOldProfile();

  if (!profile()) {
    localStorage.setItem(profileKey(), JSON.stringify(defaultErica));
  }

  await applyProfile(profile());
  renderActions();
  await loadProperties();
})();
