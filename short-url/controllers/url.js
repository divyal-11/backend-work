const { nanoid } = require("nanoid")
const URL=require("../models/url")

async function handleGenerateNewShortUrl(req,res){
    const body = req.body

    if(!body.url)return res.status(400).json({error:"url is required"})
    
    const shortId=nanoid(8)

    await URL.create({
        redirectedUrl:body.url,
        shortUrl:shortId,
        visitHistory:[]
    })
    return res.render("home",{
        id:shortId,
    })
}

async function handleGetAnalytics(req,res){
    const shortUrl = req.params.shortUrl
    
    const entry = await URL.findOne({ shortUrl })
    return res.json({totalClicks:entry.visitHistory.length,analytics:entry.visitHistory})
}

module.exports={handleGenerateNewShortUrl,handleGetAnalytics}