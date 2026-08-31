const {getUser}=require("../service/auth")

function checkForAuthentication(req, res, next) {
    // 1. Try Authorization header first (for API clients like Postman)
    const authorizationHeaderValue = req.headers['authorization'];
    req.user = null;

    let token;

    if (authorizationHeaderValue && authorizationHeaderValue.startsWith('Bearer')) {
        token = authorizationHeaderValue.split('Bearer ')[1];
    } else if (req.cookies?.token) {
        // 2. Fallback to cookie (for browser-based forms)
        token = req.cookies.token;
    }

    if (!token) return next();

    const user = getUser(token);
    req.user = user;
    next();
}


function restrictTo(roles){
    return function (req,res,next){
        if(!req.user)return res.redirect("/login")
        if(!roles.includes(req.user.role)) return res.end("You are not authorized")
        next()
    }
}

module.exports={checkForAuthentication,restrictTo}