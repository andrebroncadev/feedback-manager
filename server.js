import express from "express";
import puppeteer from "puppeteer";
import path from "path";
const app=express(), PORT=process.env.PORT||3000;
app.use(express.json({limit:"60mb"}));
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
  await page.setViewport({width:612,height:792,deviceScaleFactor:1});
  await page.goto(`${req.protocol}://${req.get("host")}/preview`,{waitUntil:"domcontentloaded",timeout:30000});
  await page.evaluate(d=>window.renderFeedback(d),data);
  await page.evaluate(async()=>{
    if(document.fonts?.ready) await document.fonts.ready;
    const imgs=[...document.images].filter(img=>img.src);
    await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=img.onerror=resolve})));
  });
  const pdf=await page.pdf({width:"612pt",height:"792pt",printBackground:true,margin:{top:"0",right:"0",bottom:"0",left:"0"},preferCSSPageSize:true});
  const safe=String(data.owner||"imovel").replace(/[\\/:*?"<>|]/g,"").trim()||"imovel";
  const filename=`FEEDBACK_${safe}.pdf`;
  res.setHeader("Content-Type","application/pdf");
  res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(pdf);
 }catch(e){console.error("PDF ERROR:",e);res.status(500).json({error:"Não foi possível gerar o PDF."})}finally{if(browser)await browser.close()}
});
app.listen(PORT,()=>console.log(`feedback-manager na porta ${PORT}`));
