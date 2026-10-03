const form = document.querySelector("#feedbackForm");
const frame = document.querySelector("iframe");
const pdfButton = document.querySelector("#pdfButton");
const ownerSelect = document.querySelector("#ownerSelect");
const addressInput = document.querySelector("#address");
const dateInput = document.querySelector("#date");

const owners = [
  { name: "Carmita", address: "" },
  { name: "Marcelo", address: "" },
  { name: "Luíz", address: "" },
  { name: "Maria Eliza e Rubens", address: "" },
  { name: "Milena", address: "" },
  { name: "Augusto", address: "" }
];

const actionOptions = [
  "Panfletagem estratégica / impressão e distribuição",
  "Tráfego pago / anúncios segmentados",
  "Redes sociais e portais imobiliários",
  "Divulgação no grupo interno de especialistas RE/MAX",
  "Show de Captações",
  "Placa no imóvel",
  "Revisão do anúncio",
  "Home staging",
  "Plano de marketing",
  "Vistoria completa",
  "Visitas técnicas",
  "Prospecção de investidores / construtores",
  "Filtragem e acompanhamento de leads"
];

function today() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function loadOwners() {
  const saved = JSON.parse(localStorage.getItem("feedbackOwners") || "null");
  const list = Array.isArray(saved) ? saved : owners;
  ownerSelect.innerHTML = list.map((owner) =>
    `<option value="${escapeHtml(owner.name)}" data-address="${escapeHtml(owner.address || "")}">${escapeHtml(owner.name)}</option>`
  ).join("");
  updateAddress();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function updateAddress() {
  addressInput.value = ownerSelect.selectedOptions[0]?.dataset.address || "";
}

function renderActions() {
  const selected = JSON.parse(localStorage.getItem("feedbackSelectedActions") || "null") || actionOptions.slice(0, 4);
  document.querySelector("#actions").innerHTML = actionOptions.map((action, i) => `
    <label class="action-check">
      <input type="checkbox" name="actions" value="${escapeHtml(action)}" ${selected.includes(action) ? "checked" : ""}>
      <span>${escapeHtml(action)}</span>
    </label>
  `).join("");
}

function getData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.actions = [...form.querySelectorAll('input[name="actions"]:checked')].map((input) => input.value);
  data.coverImage = document.querySelector("#coverImage").dataset.data || "";
  data.statsImage = document.querySelector("#statsImage").dataset.data || "";
  return data;
}

function updatePreview() {
  frame.contentWindow?.renderFeedback?.(getData());
}

async function readImage(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    alert("Essa imagem é muito grande. Escolha uma imagem de até 8 MB.");
    input.value = "";
    return;
  }
  input.dataset.data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  updatePreview();
}

ownerSelect.addEventListener("change", updateAddress);
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
frame.addEventListener("load", updatePreview);
document.querySelector("#coverImage").addEventListener("change", (e) => readImage(e.target));
document.querySelector("#statsImage").addEventListener("change", (e) => readImage(e.target));

document.querySelector("#customAction").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const value = event.currentTarget.value.trim();
  if (!value) return;
  if (!actionOptions.includes(value)) actionOptions.push(value);
  event.currentTarget.value = "";
  renderActions();
  updatePreview();
});

pdfButton.addEventListener("click", async () => {
  pdfButton.disabled = true;
  pdfButton.textContent = "Gerando PDF…";
  try {
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getData())
    });
    if (!response.ok) throw new Error("PDF");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `feedback-${getData().owner || "imovel"}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    alert("Não foi possível gerar o PDF. Tente novamente.");
  } finally {
    pdfButton.disabled = false;
    pdfButton.textContent = "Salvar PDF";
  }
});

dateInput.value = today();
loadOwners();
renderActions();
