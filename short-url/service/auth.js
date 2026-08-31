const jwt = require('jsonwebtoken')
const SECRET_KEY = "secretkey123"

function setUser(user){
    return jwt.sign({
        _id:user._id,
        email:user.email,
        role:user.role
    },SECRET_KEY)
}

function getUser(token){
    if(!token) return null;
    try{
        return jwt.verify(token ,SECRET_KEY )
    }catch (error){
        return null
    }
}
module.exports= {
    setUser,
    getUser,
}