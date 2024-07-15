const User = require ('../model/userModel')

const isLogin = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const userData = await User.findOne({ _id: req.session.user_id });
            if (userData.is_blocked) {
                req.session.destroy();
                return res.redirect('/login');
            } else {

                return next();
            }
        } else {
            return res.redirect('/login');
        }
    } catch (error) {
        console.log('Error in isLogin middleware:', error);
    }
};

const isLogout = async (req,res,next) => {
    try {
        if(req.session.user_id){
            const userData = await User.findById(req.session.user_id)
            if(userData.is_blocked==false){
              return res.redirect("/")
            }else{
                return res.redirect('/login')
            }        
        }else{
            return next()
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    isLogin,
    isLogout
}