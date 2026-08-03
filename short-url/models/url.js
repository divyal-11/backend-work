const mongoose = require("mongoose")

const urlSchema = new mongoose.Schema({
    shortUrl: { type: String, required: true, unique: true },
    redirectedUrl: { type: String, required: true },
    visitHistory: [{ timestamp: { type: Number }, userAgent: { type: String } }]
    }, 
    { timestamps: true }
)

const URL = mongoose.model("URL", urlSchema)
module.exports=URL
