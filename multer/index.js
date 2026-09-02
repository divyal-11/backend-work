const express = require('express')
const path = require('path')
const multer = require("multer")
const app = express()
const port = 3000

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        return cb(null,"./uploads")
    },
    filename: function(req,file,cb){
        return cb(null,`${Date.now()}-${file.originalname}`)
    }
})

const upload = multer({storage:storage})


app.set("view engine",'ejs');
app.set("views",path.resolve("./views"))

app.use(express.urlencoded({extended:false}));

app.get("/",(req,res) => {
    res.render("homepage")
})

app.post("/upload",upload.fields([{name:"avatar"},{name:"coverimg"}]), (req,res)=>{
    console.log(req.file)
    console.log(req.body)

    res.redirect("/")
})

app.listen(port,()=>{
    console.log(`server started at ${port}`)
})