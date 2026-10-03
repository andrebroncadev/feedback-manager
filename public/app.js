const form = document.querySelector("#feedbackForm");
const frame = document.querySelector("iframe");
const pdfButton = document.querySelector("#pdfButton");

function getData() {
  const data = Object.fromEntries(new FormData(form).entries());
  data.channels = [...form.querySelectorAll('input[name="channels"]:checked')].map((input) => input.value);
  return data;
}

function updatePreview() {
  frame.contentWindow?.renderFeedback?.(getData());
}

form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
frame.addEventListener("load", updatePreview);

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
    link.download = "feedback.pdf";
    link.click();
    URL.revokeObjectURL(url);
  } catch {
    alert("Não foi possível gerar o PDF. Tente novamente.");
  } finally {
    pdfButton.disabled = false;
    pdfButton.textContent = "Salvar PDF";
  }
});
