import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));

app.post("/api/pdf", async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object") return res.status(400).json({ error: "Dados inválidos." });

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
    const origin = `${req.protocol}://${req.get("host")}`;
    await page.goto(`${origin}/preview`, { waitUntil: "networkidle0" });
    await page.evaluate((payload) => window.renderFeedback(payload), data);
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    const pdf = await page.pdf({
      printBackground: true,
      landscape: true,
      width: "1600px",
      height: "900px",
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" }
    });
    const safeName = String(data.owner || "feedback").replace(/[^a-z0-9À-ÿ _-]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="feedback-${safeName || "imovel"}.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Não foi possível gerar o PDF." });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/preview", (_req, res) => res.sendFile(process.cwd() + "/public/preview.html"));
app.listen(PORT, () => console.log(`feedback-manager rodando na porta ${PORT}`));
