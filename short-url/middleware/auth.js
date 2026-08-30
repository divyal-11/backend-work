const {getUser}=require("../service/auth")

async function restrictToLoggedinUserOnly(req,res,next){
    const userToken=req.cookies?.token;
    
    if(!userToken)return res.redirect("/login")

    const user = getUser(userToken)

    if(!user)return res.redirect("/login")

    req.user=user;
    next();
}   

async function checkAuth(req,res,next){
    const userUid=req.cookies?.token;

    const user = getUser(userUid)


    req.user=user;
    next();
}

module.exports={restrictToLoggedinUserOnly,checkAuth}