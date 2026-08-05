const express = require("express")
const mongoose = require("mongoose")
const connectDB = require("./connect")
const URL = require("./models/url")
const urlRoute = require("./routes/url")
const path=require("path")
const staticRoute = require("./routes/staticRouter")

const app = express()


connectDB("mongodb://localhost:27017/short-url").then(() => {
    console.log("MongoDB connected")
}).catch((err) => {
    console.log(err)
})

app.set("view engine", "ejs")
app.set("views", path.resolve("./views"))

app.use(express.json())
app.use(express.urlencoded({extended:false}))

app.use("/url", urlRoute)
app.use("/", staticRoute)

app.get('/url/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl
    const entry = await URL.findOneAndUpdate({
        shortUrl
    }, { $push: { visitHistory: { timestamp: Date.now() } } }
    )
    res.redirect(entry.redirectedUrl)
})
const port = 3000



app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})