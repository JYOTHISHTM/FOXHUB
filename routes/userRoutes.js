const express = require('express');
const bodyparser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const nocache = require("nocache")
const Order = require('../model/orderModel')
const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../config/config.js');
const User = require('../model/userModel');
const userController = require('../controllers/userController');
const userOrderController = require('../controllers/userOrdercontroller.js');
const passwordController = require('../controllers/passwordController.js');

const walletController = require('../controllers/walletController.js');
const checkoutController = require('../controllers/checkoutController.js');

const productSinglecontroller = require('../controllers/productSinglecontroller.js');
const userCouponController = require('../controllers/userCouponController.js');

const Product = require('../model/productModel.js')
const auth = require('../middleware/auth');


const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });


const userRoute = express();

// Middleware setup
userRoute.use(bodyparser.json());
userRoute.use(bodyparser.urlencoded({ extended: true }));

userRoute.use(session({
    secret: config.sessionsecret,
    resave: false,
    saveUninitialized: true,
}));

userRoute.use(nocache())
userRoute.use(passport.initialize());
userRoute.use(passport.session());

// View engine setup
userRoute.set('view engine', 'ejs');
userRoute.set('views', './views/users');

// Passport configuration
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            user.googleId = profile.id;
            user.name = profile.displayName;
            user.avatar = profile.photos[0].value;
            await user.save();
        } else {
            user = new User({
                googleId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value,
                avatar: profile.photos[0].value,
            });
            await user.save();
        }

        return done(null, user);
    } catch (error) {
        return done(error, null);
    }
}));

// Auth routes
userRoute.get('/auth', passport.authenticate('google', { scope: ['email', 'profile'] }));
userRoute.get('/auth/callback', passport.authenticate('google', {
    successRedirect: '/auth/callback/success',
    failureRedirect: '/auth/callback/failure'
}));
userRoute.get('/auth/callback/success', async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect('/auth/callback/failure');
        }

        req.session.user_id = req.user.id;
        res.redirect('/home');
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});
userRoute.get('/auth/callback/failure', (req, res) => {
    res.send("Error");
});



// User routes
userRoute.get('/', userController.renderIndex);
userRoute.get('/home', auth.isLogin, userController.renderIndex);
userRoute.get('/logout', auth.isLogin, userController.loadLogout);

userRoute.post('/register', auth.isLogout, userController.insertUser);

userRoute.post('/login', userController.verifyUser);
userRoute.get('/login', auth.isLogout, userController.loadLogin);
userRoute.get('/signUp', userController.rendersignUp);
userRoute.get('/otpVerify', userController.renderOtpverify)
userRoute.post('/verifyOtp', userController.verifyOtp);
userRoute.post('/verify-otp', userController.verifyOtpForPasswordReset);
userRoute.get('/reset-password', userController.renderResetPassword);
userRoute.get('/forgot-password', userController.renderForgotPassword);
userRoute.post('/forgot-password', userController.sendForgotPasswordEmail);


// about
userRoute.get('/about', userController.renderAbout);


// shop
userRoute.get('/shop', userController.renderShop);


// thankyou
userRoute.get('/thankyou/:orderId', userController.renderThankyou);



// orders
userRoute.get('/userOrders', userOrderController.renderUserorder);
userRoute.get('/orderDetails/:orderId/:productId', userOrderController.renderOrderdetails);

userRoute.post('/orders/cancelItem', userOrderController.cancelItem);
userRoute.post('/orders/returnItem', userOrderController.returnItem);


// profile routes
userRoute.post('/updateAddress', userController.updateAddress);
userRoute.get('/deleteAddress/:id', userController.deleteAddress);
userRoute.get('/editAddress/:id', userController.editAddress);
userRoute.post('/addingAddress', userController.addAddress);
userRoute.get('/userProfile', auth.isLogin, userController.renderuserProfile);
userRoute.get('/editProfile', userController.renderEditprofile);
userRoute.post('/updateProfile/:id', userController.updateProfile);
userRoute.get('/userAddress', userController.renderAddress);
userRoute.get('/addAddress', userController.renderAddaddress);

// change password
userRoute.post('/change-password', passwordController.changePassword);
userRoute.get('/change-password', passwordController.renderChangePassword);

// wishlist 
userRoute.get('/wishlist', userController.renderWishlist);
userRoute.post('/add-to-wishlist', userController.addTowishlist);
userRoute.post('/remove-from-wishlist', userController.removeFromWishlist);
userRoute.post('/add-to-cart-from-wishlist', userController.addToCartFromWishlist);

// cart 
userRoute.get('/cart', userController.renderCart);
userRoute.post('/add-to-cart', userController.addToCart);
userRoute.post('/cart/remove', userController.removeFromCart);
userRoute.post('/user/cart/update-quantity', userController.updateQuantity);


// Product routes

userRoute.get('/productSingle/:productId', productSinglecontroller.productSingle);
userRoute.post('/add-to-cart-fromps', productSinglecontroller.addToCartFromPS);
userRoute.post('/add-to-wishlist-fromps', productSinglecontroller.addToWishlistFromPS);


// Checkout routes
userRoute.get('/checkout', checkoutController.renderCheckout);
userRoute.post('/placeOrder', checkoutController.placeOrder);
userRoute.post('/create-payment', checkoutController.createPayment);
userRoute.post('/verify-payment', checkoutController.verifyPayment);
userRoute.get("/order-failure", checkoutController.orderFailure);
userRoute.post('/handle-failed-razorpay-payment',checkoutController. handleFailedRazorpayPayment);


// Wallet routes
userRoute.post('/addMoney', walletController.addMoney);
userRoute.post('/check-wallet-balance', walletController.checkWalletBalance);
userRoute.post('/deduct-from-wallet', walletController.deductFromWallet);
userRoute.get('/userWallet', walletController.renderWallet);

// user coupon 
userRoute.get('/available-coupons', userCouponController.getAvailableCoupons);
userRoute.get('/userCoupon', userCouponController.renderUserCoupon);
userRoute.post('/apply-coupon', userCouponController.applyCoupon);
userRoute.get('/referal', userController.renderRefferal);

// retry payment

userRoute.post('/create-razorpay-order', userOrderController.createRazorpayOrder);
userRoute.post('/verify-razorpay-payment', userOrderController.verifyRazorpayPayment);
userRoute.post('/update-order-status', userOrderController.updateOrderStatus);




module.exports = userRoute;






