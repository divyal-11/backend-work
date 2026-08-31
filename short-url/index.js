const express = require("express")
const cookieParser=require("cookie-parser")
const mongoose = require("mongoose")
const connectDB = require("./connect")
const {checkForAuthentication,restrictTo}=require("./middleware/auth")
const URL = require("./models/url")
const path=require("path")

const userRoute = require("./routes/user")
const urlRoute = require("./routes/url")
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
app.use(cookieParser())
app.use(checkForAuthentication)

app.get('/url/:shortUrl', async (req, res) => {
    const shortUrl = req.params.shortUrl
    const entry = await URL.findOneAndUpdate({
        shortUrl
    }, { $push: { visitHistory: { timestamp: Date.now() } } }
    )
    if (!entry) {
        return res.status(404).send("URL not found")
    }
    
    const redirectUrl = entry.redirectedUrl.startsWith('http://') || entry.redirectedUrl.startsWith('https://')
        ? entry.redirectedUrl
        : `https://${entry.redirectedUrl}`;

    
    res.redirect(redirectUrl)
})

app.use("/url", restrictTo(["NORMAL","ADMIN"] ),urlRoute)
app.use("/user",userRoute)
app.use("/", staticRoute)



const port = 8000



app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})