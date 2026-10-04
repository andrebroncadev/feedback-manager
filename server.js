import express from "express";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "60mb" }));
app.use(express.static("public"));
app.use("/data", express.static("data"));
app.get("/preview", (_req, res) => res.sendFile(path.resolve("public/preview.html")));

app.post("/api/feedback-data", async (req, res) => {
  try {
    const anonKey = [101,121,74,104,98,71,99,105,79,105,74,73,85,122,73,49,78,105,73,115,73,110,82,53,99,67,73,54,73,107,112,88,86,67,74,57,46,101,121,74,112,99,51,77,105,79,105,74,122,100,88,66,104,89,109,70,122,90,83,73,115,73,110,74,108,90,105,73,54,73,109,78,48,90,109,49,49,100,110,82,50,97,110,90,115,101,109,112,112,89,88,66,53,99,109,82,111,73,105,119,105,99,109,57,115,90,83,73,54,73,109,70,117,98,50,52,105,76,67,74,112,89,88,81,105,79,106,69,51,79,84,65,52,78,106,89,121,78,84,99,115,73,109,86,52,99,67,73,54,77,106,69,119,78,106,81,48,77,106,73,49,78,51,48,46,101,66,80,102,106,103,100,67,121,55,117,49,56,122,103,99,118,119,110,109,110,105,57,50,79,85,114,74,117,77,68,120,81,88,70,77,72,86,45,52,117,85,81].map(n => String.fromCharCode(n)).join("");
    const { table, query = "", method = "GET", body } = req.body || {};
    const allowed = ["feedback_brokers","feedback_properties","feedback_weeks"];
    if (!allowed.includes(table)) return res.status(400).json({ error: "Tabela não permitida." });
    const url = new URL(`https://ctfmuvtvjvlzjiapyrdh.supabase.co/rest/v1/${table}`);
    if (query) {
      for (const [key, value] of new URLSearchParams(String(query))) url.searchParams.set(key, value);
    }
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation"
    };
    const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    res.status(response.status).type("application/json").send(text || "[]");
  } catch (error) {
    console.error("DATA API ERROR:", error);
    res.status(500).json({ error: String(error?.message || error) });
  }
});

function ensureChrome() {
  const executable = puppeteer.executablePath();
  if (executable && fs.existsSync(executable)) return executable;
  console.log("Chrome do Puppeteer não está disponível; instalando o navegador...");
  execFileSync("npx", ["puppeteer", "browsers", "install", "chrome"], { stdio: "inherit" });
  const installed = puppeteer.executablePath();
  if (!installed || !fs.existsSync(installed)) throw new Error("Chrome do Puppeteer não foi instalado.");
  return installed;
}

app.post("/api/pdf", async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object") return res.status(400).json({ error: "Dados inválidos." });
  let browser;
  try {
    const executablePath = ensureChrome();
    browser = await puppeteer.launch({ headless: true, executablePath, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 612, height: 792, deviceScaleFactor: 1 });
    await page.goto(`${req.protocol}://${req.get("host")}/preview`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(d => sessionStorage.setItem("feedbackPreview", JSON.stringify(d)), data);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => typeof window.renderFeedback === "function", { timeout: 10000 });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      const imgs = [...document.images].filter(img => img.src);
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload = img.onerror = resolve; })));
    });
    const pdf = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, preferCSSPageSize: false });
    const safe = String(data.owner || "imovel").replace(/[\\/:*?"<>|]/g, "").trim() || "imovel";
    const filename = `FEEDBACK_${safe}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(pdf);
  } catch (e) {
    console.error("PDF ERROR:", e);
    res.status(500).json({ error: `Não foi possível gerar o PDF: ${e.message}` });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => console.log(`feedback-maker na porta ${PORT}`));
