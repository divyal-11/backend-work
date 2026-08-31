const User = require("../models/user")

const {setUser}=require("../service/auth")


async function handleUserSignUp(req, res) {
    const { name, email, password } = req.body;
    
    // 1. Create the user
    const user = await User.create({
        name,
        email,
        password
    });

    // 2. Automatically log them in (create session + cookie)
    
    const token = setUser(user);
    res.cookie("token", token);

    // 3. Now redirect to / (they are authenticated!)
    return res.redirect('/');
}


async function handleUserLogin(req,res){
    const {email, password} = req.body
    const user = await User.findOne({email,password})
    
    if(!user) return res.render('login',{error:"Invalid Creds"})
    
    const token = setUser(user);
    res.cookie("token",token)

    return res.redirect('/')
}

module.exports = { handleUserSignUp ,handleUserLogin}