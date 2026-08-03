const express = require("express")
const mongoose = require("mongoose")
const connectDB = require("./connect")
const URL = require("./models/url")
const app = express()
app.use(express.json())
const urlRoute = require("./routes/url")


app.use("/url", urlRoute)

app.get('/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl
    const entry=await URL.findOneAndUpdate({
        shortUrl
    }, { $push: { visitHistory: { $createdAt: Date.now() } } }
    )
    res.redirect(entry.redirectedUrl)
})
const port = 3000

connectDB("mongodb://localhost:27017/short-url").then(() => {
    console.log("MongoDB connected")
}).catch((err) => {
    console.log(err)
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})