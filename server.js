import express from "express";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
const app=express(), PORT=process.env.PORT||3000;
app.use(express.json({limit:"30mb"}));
app.use(express.static("public"));
app.use("/data",express.static("data"));
app.get("/preview",(_req,res)=>res.sendFile(path.resolve("public/preview.html")));
app.post("/api/pdf",async(req,res)=>{
 const data=req.body;
 if(!data||typeof data!=="object") return res.status(400).json({error:"Dados inválidos."});
 let browser;
 try{
  browser=await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
  const page=await browser.newPage();
  await page.setViewport({width:794,height:1123,deviceScaleFactor:1});
  await page.goto(`${req.protocol}://${req.get("host")}/preview`,{waitUntil:"networkidle0"});
  await page.evaluate(d=>window.renderFeedback(d),data);
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready});
  const pdf=await page.pdf({printBackground:true,width:"210mm",height:"297mm",margin:{top:"0",right:"0",bottom:"0",left:"0"},preferCSSPageSize:false});
  const safe=String(data.owner||"imovel").replace(/[^a-z0-9À-ÿ _-]/gi,"").trim().replace(/\s+/g,"-").toLowerCase();
  res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",`attachment; filename="relatorio-${safe||"imovel"}.pdf"`);res.send(pdf);
 }catch(e){console.error(e);res.status(500).json({error:"Não foi possível gerar o PDF."})}finally{if(browser)await browser.close()}
});
app.listen(PORT,()=>console.log(`feedback-manager na porta ${PORT}`));