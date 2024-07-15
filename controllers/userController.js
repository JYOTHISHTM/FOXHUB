const User = require('../model/userModel');
const bcrypt = require('bcrypt');
const Profile = require('../model/profileModel');
const Product = require('../model/productModel')
const Cart = require('../model/cartModel')
const mongoose = require('mongoose');
const Wishlist = require('../model/wishlistModel'); 
const Order= require('../model/orderModel')

const Wallet = require('../model/walletModel')

const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel')


const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');

const crypto = require('crypto');
const categoryModel = require('../model/categoryModel');


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jothishjo2023@gmail.com',
    pass: 'tvzv yhgq rlix pski'
  }
});

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: 'jothishjo2023@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your OTP is ${otp}`
  };

  return transporter.sendMail(mailOptions);
};

const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};






const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.render('otpVerify', { userId, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.render('login', { message: 'Account verified successfully', messageType: 'success' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).send('Internal Server Error');
  }
};


const renderOtpverify = async (req, res) => {
  try {
    const userId = req.query.userId || ''; // Adjust this as necessary to get the userId
    const message = req.query.message || ''; // Adjust this as necessary to get the message
    res.render('otpVerify', { userId, message });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};



const renderLogin = async (req, res) => {
  try {
    res.render('login')
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const rendersignUp = async (req, res) => {
  try {

    res.render('signUp')
  } catch (error) {
    console.log(error.message);
  }
}


const renderAddaddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const profile = await Profile.findOne({ userId: userId });
    const addresses = profile ? profile.addresses : [];

    res.render('addAddress', { user, addresses });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
}





const renderAbout = async (req, res) => {
  try {
    res.render('about')
  } catch (error) {
    console.log(error.message);
  }
}


const renderuserProfile = async (req, res) => {
  try {
    const userData = req.session.user_id;
    if (!userData) {
      return res.redirect('/login');
    }
    const userD = await User.findById(userData);
    if (!userD) {
      return res.status(404).send('User not found');
    }
    res.render('userProfile', { user: userD ,currentUrl: req.path });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
}




const renderEditprofile = async (req, res) => {
  try {
    const userData = req.session.user_id
    const userD = await User.findById(userData)

    res.render('editProfile', { user: userD })
  } catch (error) {
    console.log(error.message);
  }
}


const loadLogin = async (req, res) => {
  try {
    res.render('login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const securePassword = async (password) => {
  const passwordHash = await bcrypt.hash(password, 10);
  return passwordHash
}






const updateProfile = async (req, res) => {
  try {
    const id = req.params.id
    console.log(id)
    const { name, email, mobile } = req.body;
    await User.findByIdAndUpdate(id, { name, email, mobile }, { new: true });

    res.redirect('/userProfile');
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Error updating profile");
  }
}

const renderAddress = async (req, res) => {
  try {
    let userId = req.session.user_id;
    if (!userId) {
      return res.redirect('/login');
    }

    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    let profile = await Profile.findOne({ userId: user._id });
    const addresses = profile ? profile.addresses : [];

    res.render('userAddress', { user, addresses, currentUrl: req.path  });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const addAddress = async (req, res) => {
  try {
    let { postalCode, address, city, state } = req.body;
    let userId = req.session.user_id;

    if (!userId) {
      return res.redirect('/login');
    }

    let profile = await Profile.findOne({ userId: userId });

    const newAddress = {
      address: address,
      state: state,
      city: city,
      postalCode: postalCode
    };

    if (profile) {
      profile.addresses.push(newAddress);
    } else {

      profile = new Profile({
        userId: userId,
        addresses: [newAddress]
      });
    }

    await profile.save();
    res.redirect('/userAddress');
  } catch (error) {
    console.error(error.message);
    res.status(500).send("An error occurred while saving the address.");
  }
};

const editAddress = async (req, res) => {
  const addressId = req.params.id;
  try {
    const profile = await Profile.findOne({ 'addresses._id': addressId });
    if (profile) {
      const address = profile.addresses.id(addressId);
      if (address) {
        res.render('editAddress', { address });
      } else {
        res.status(404).send('Address not found');
      }
    } else {
      res.status(404).send('Profile not found');
    }
  } catch (error) {
    res.status(500).send('Server error');
  }
};

const updateAddress = async (req, res) => {
  const { id, state, address, city, postalCode } = req.body;
  try {
    const profile = await Profile.findOneAndUpdate(
      { 'addresses._id': id },
      {
        $set: {
          'addresses.$.state': state,
          'addresses.$.address': address,
          'addresses.$.city': city,
          'addresses.$.postalCode': postalCode
        }
      },
      { new: true }
    );

    if (profile) {
      res.redirect('/userAddress');
    } else {
      res.status(404).send('Address not found');
    }
  } catch (error) {
    res.status(500).send('Server error');
  }
};


const deleteAddress = async (req, res) => {
  const addressId = req.params.id;

  try {
    console.log('Deleting address with ID:', addressId);

    const profile = await Profile.findOne({ 'addresses._id': addressId });

    if (!profile) {
      return res.status(404).send('Profile not found');
    }

    profile.addresses = profile.addresses.filter(address => address._id.toString() !== addressId);

    await profile.save();

    console.log('Address deleted successfully');
    res.redirect('/userAddress');
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).send('Internal Server Error');
  }
}


const renderForgotPassword = async (req, res) => {
  try {
    res.render('forgotPassword');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const sendForgotPasswordEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).send('Email is required');
    }

    const otp = generateOtp();
    const otpExpires = Date.now() + 3600000;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.otp = otp;
    user.otp_expires = otpExpires;
    await user.save();

    console.log(`OTP for ${email} is ${otp}`);

    await sendOtpEmail(email, otp);

    return res.render('verifyOtp', { email, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Error sending forgot password email:', error);
    return res.status(500).send('Internal Server Error');
  }
};

const renderResetPassword = (req, res) => {
  const { email } = req.query;
  res.render('resetPassword', { email });
};

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.redirect('/login?resetSuccess=true');

  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).send('Internal Server Error');
  }
};
const verifyOtpForPasswordReset = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log(`Entered OTP: ${otp}`);

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.render('verifyOtp', { email, message: 'Email not found' });
    }


    if (user.otp !== otp || user.otp_expires < Date.now()) {
      console.log('Invalid or expired OTP');
      return res.render('verifyOtp', { email, message: 'Invalid or expired OTP' });
    }

    user.otp = undefined;
    user.otp_expires = undefined;
    await user.save();

    return res.render('resetPassword', { email });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).send('Internal Server Error');
  }
};
////////////////////////////////////////////////////////







const renderShop = async (req, res) => {
  try {
    const sortOption = req.query.sort || '';
    const categoryId = req.query.category || 'all';
    const priceFrom = parseFloat(req.query.priceFrom) || 0;
    const priceTo = parseFloat(req.query.priceTo) || Number.MAX_VALUE;
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    let query = {
      price: { $gte: priceFrom, $lte: priceTo },
      is_blocked: { $ne: true }
    };

    if (categoryId !== 'all') {
      query.category = categoryId;
    } else {
      const blockedCategories = await categoryModel.find({ is_blocked: true }).select('_id');
      query.category = { $nin: blockedCategories.map(cat => cat._id) };
    }

    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' };
    }

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query).populate('category').skip(skip).limit(limit);
    const productIds = products.map(product => product._id);
    const offers = await ProductOffer.find({ product: { $in: productIds } });
    const categoryOffers = await CategoryOffer.find();

    const productMap = products.map(product => {
      const offer = offers.find(offer => offer.product.equals(product._id));
      const categoryOffer = categoryOffers.find(offer => offer.category.equals(product.category._id));
      
      let finalPrice = product.price;

      if (offer) {
        finalPrice = product.price - (product.price * (offer.discountPercentage / 100));
      }

      if (categoryOffer) {
        const categoryDiscount = product.price * (categoryOffer.discountPercentage / 100);
        finalPrice = Math.min(finalPrice, product.price - categoryDiscount);
      }

      return {
        ...product._doc,
        finalPrice: parseFloat(finalPrice.toFixed(2))
      };
    });

    let sortCriteria;
    switch (sortOption) {
      case 'az':
        sortCriteria = (a, b) => a.name.localeCompare(b.name);
        break;
      case 'za':
        sortCriteria = (a, b) => b.name.localeCompare(a.name);
        break;
      case 'priceLowHigh':
        sortCriteria = (a, b) => a.finalPrice - b.finalPrice;
        break;
      case 'priceHighLow':
        sortCriteria = (a, b) => b.finalPrice - a.finalPrice;
        break;
      default:
        sortCriteria = () => 0;
    }

    productMap.sort(sortCriteria);

    const categories = await categoryModel.find({ is_blocked: false });

    const categoryOffersMap = categoryOffers.reduce((acc, offer) => {
      acc[offer.category.toString()] = offer.discountPercentage;
      return acc;
    }, {});

    const message = req.session.message;
    delete req.session.message;

    let errorMessage = null;
    if (productMap.length === 0) {
      errorMessage = `No products available in this category.`;
    }

    const userId = req.session.userId;
    const user = await User.findById(userId);

    res.render('shop', {
      products: productMap,
      categories,
      categoryOffersMap,
      message,
      priceFrom,
      priceTo,
      sortOption,
      category: categoryId,
      searchQuery,
      errorMessage,
      user,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit)
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};



const addTowishlist = async (req, res) => {
  try {
    const  { productId } = req.body;
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, items: [] });
    }

    const product = await Product.findById(productId);
    if (product) {
      if (!wishlist.items.includes(product._id)) {
        wishlist.items.push(product._id);
        await wishlist.save();
        req.session.message = 'Product added to wishlist';
      } else {
        req.session.message = 'Product already in wishlist';
      }
    } else {
      req.session.message = 'Product not found';
    }

    res.redirect('/shop');
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};



const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId, productQuantity = 1 } = req.body;

    // Find the product by its ID
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Find the user's cart or create a new one if it doesn't exist
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Check if the product is already in the cart
    const existingItem = cart.items.find(item => item.productId.toString() === productId);

    if (existingItem) {
      // If the product exists in the cart, return an error message
      req.session.message = 'Product is already in the cart!';
      return res.redirect('/shop');
    } else {
      // If the product doesn't exist in the cart, add it as a new item
      cart.items.push({
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.images[0], // Assuming product.images[0] is the URL of the product image
        quantity: parseInt(productQuantity, 10)
      });
    }

    await cart.save();

    req.session.cart = cart.items;
    req.session.message = 'Product added to cart successfully!';
    res.redirect('/shop'); // Redirect to shop page after adding to cart
  } catch (error) {
    console.error('Error adding product to cart:', error);
    req.session.message = 'Error adding product to cart';
    res.redirect('/shop'); // Redirect to shop page in case of error
  }
};
 
















///////////////////////////////////////////////








const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId; 
    if (!userId) {
      return res.status(400).json({ error: 'User not logged in' });
    }

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId } } },
      { new: true }
    );

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Send a success response
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    console.error('Error removing product from cart:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};





const renderCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart) {
      return res.render('cart', { cart: [], userId });
    }

    const updatedCartItems = await Promise.all(cart.items.map(async item => {
      let finalPrice = item.productPrice;

      // Check for product-specific offer
      const productOffer = await ProductOffer.findOne({ product: item.productId._id });

      // Check for category-wide offer
      const categoryOffer = await CategoryOffer.findOne({ category: item.productId.category });

      if (productOffer) {
        finalPrice = item.productPrice - ((productOffer.discountPercentage / 100) * item.productPrice);
      } else if (categoryOffer) {
        finalPrice = item.productPrice - ((categoryOffer.discountPercentage / 100) * item.productPrice);
      }

      return {
        ...item._doc,
        finalPrice,
        productName: item.productId.name,
        productImage: item.productId.images[0] || ''
      };
    }));

    res.render('cart', { cart: updatedCartItems, userId });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const updateQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user_id;

  try {
    const cart = await Cart.findOne({ userId });

    if (cart) {
      const item = cart.items.find(item => item.productId.toString() === productId);
      if (item) {
        item.quantity = quantity;
      }

      await cart.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: 'Cart not found' });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};








const renderThankyou = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Assuming coupon is available in your order object or passed separately
    const coupon = order.coupon; // Adjust this according to how coupon is stored

    res.render('thankyou', { order, coupon }); // Pass coupon to the template
  } catch (error) {
    console.error('Error rendering thank you page:', error);
    res.status(500).send('Internal Server Error');
  }
};




const renderWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { success, removed } = req.query;

    if (!userId) {
      return res.redirect('/login');
    }

    const wishlist = await Wishlist.findOne({ userId }).populate('items');

    if (!wishlist || wishlist.items.length === 0) {
      return res.render('wishlist', { wishlist: [], userId, removedMessage: '', successMessage: '' });
    }

    const productIds = wishlist.items.map(item => item._id);
    const products = await Product.find({ _id: { $in: productIds } }).populate('category');
    const offers = await ProductOffer.find({ product: { $in: productIds } });
    const categoryOffers = await CategoryOffer.find({ category: { $in: products.map(p => p.category) } });

    const productMap = products.map(product => {
      const offer = offers.find(offer => offer.product.equals(product._id));
      const categoryOffer = categoryOffers.find(offer => offer.category.equals(product.category._id));
      
      let finalPrice = product.price;

      if (offer) {
        finalPrice = product.price - (product.price * (offer.discountPercentage / 100));
      }

      if (categoryOffer) {
        const categoryDiscount = product.price * (categoryOffer.discountPercentage / 100);
        finalPrice = Math.min(finalPrice, product.price - categoryDiscount);
      }

      return {
        ...product._doc,
        finalPrice: parseFloat(finalPrice.toFixed(2))
      };
    });

    const wishlistWithFinalPrices = wishlist.items.map(item => {
      const product = productMap.find(p => p._id.equals(item._id));
      return {
        ...item.toObject(),
        finalPrice: product.finalPrice
      };
    });

    let removedMessage = '';
    let successMessage = '';

    if (success === 'true') {
      successMessage = 'Product added to cart successfully.';
    }
    if (removed === 'true') {
      removedMessage = 'Product removed from wishlist successfully.';
    }

    res.render('wishlist', { wishlist: wishlistWithFinalPrices, userId, removedMessage, successMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { productId, productName, productImage } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(item => String(item.productId) === productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.items.push({
        productId,
        productName,
        productPrice: product.price,
        productImage,
        quantity: 1
      });
    }

    await cart.save();

    await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: productId } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};






const removeFromWishlist = async (req, res) => {
  try {
    const { productId, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      wishlist.items = wishlist.items.filter(item => item.toString() !== productId);
      await wishlist.save();

      return res.redirect('/wishlist?removed=true');
    } else {
      res.status(404).json({ error: 'Wishlist not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};





const renderUserorders= async(req,res)=>{
 try{
  res.render('userOrders')
 }catch(error){
  console.error(error)
  res.status(500).json({error:"internal server error"})
 }
}


const updatedQuantity= async (req, res) => {
  const { productId, quantity } = req.body;
  const userId = req.session.user_id; // Assuming you have user authentication and can get the user ID

  try {
    // Find the cart for the user
    const cart = await Cart.findOne({ userId: userId });

    if (cart) {
      // Find the item in the cart
      const item = cart.items.find(item => item.productId.toString() === productId);

      if (item) {
        // Update the quantity
        item.quantity = quantity;
        await cart.save();
        res.json({ success: true });
      } else {
        res.json({ success: false, message: 'Item not found in cart' });
      }
    } else {
      res.json({ success: false, message: 'Cart not found' });
    }
  } catch (error) {
    console.error('Error updating cart quantity:', error);
    res.json({ success: false, message: 'Internal server error' });
  }
};


const renderRR= async(req,res)=>{
  try{
   res.render('rr')
  }catch(error){
   console.error(error)
   res.status(500).json({error:"internal server error"})
  }
 }



const renderIndex = async (req, res) => {
  try {
      const userId = req.session.user_id;

      if (!userId) {
          return res.redirect('/login');
      }

      const user = await User.findById(userId);

      if (user?.is_blocked) {
          req.session.destroy();
          return res.redirect('/login');
      }

      res.render('home');
  } catch (error) {
      console.error('Error rendering index page:', error);
      res.status(500).send('Internal Server Error');
  }
};


const loadLogout = async (req, res) => {
  try {
      if (req.session && req.session.user_id) {
          req.session.destroy((err) => {
              if (err) {
                  console.error('Error during session destruction:', err);
                  return res.status(500).send('Internal Server Error');
              }
              res.redirect('/login');
          });
      } else {
          res.redirect('/login');
      }
  } catch (error) {
      console.error('Error in logout middleware:', error);
      res.status(500).send('Internal Server Error');
  }
};




const verifyUser = async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.render('login', { message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
          return res.render('login', { message: 'Invalid email or password' });
      }

      if (user.is_blocked) {
          return res.render('login', { message: "You can't log in, Admin blocked you" });
      }

      req.session.user_id = user._id;
      res.redirect('/home');
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
};



function generateReferralCode(length = 8) {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // Convert to hexadecimal format
    .slice(0, length); // Return the required number of characters
}


const insertUser = async (req, res) => {
  try {
    const { name, email, password, mobile, password2, referred_code } = req.body;

    console.log(referred_code);

    // Validate required fields
    if (!name || !email || !password || !mobile || !password2) {
      return res.status(400).json({ errors: { general: 'All fields are required' } });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ errors: { email: 'Email already exists' } });
    }

    // Validate password match
    if (password !== password2) {
      return res.status(400).json({ errors: { confirmPassword: 'Passwords do not match' } });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate new referral code
    const newReferralCode = generateReferralCode();

    // Check referred code if provided
    let referredUser = null;
    if (referred_code) {
      referredUser = await User.findOne({ referral_code: referred_code });
      if (!referredUser) {
        return res.status(400).json({ errors: { referred_code: 'Invalid referral code' } });
      }
      if (referred_code === newReferralCode) {
        return res.status(400).json({ errors: { referred_code: 'You cannot use your own referral code' } });
      }
    }

    console.log(referred_code + 'is the reffered code ');

    // Generate OTP
    const otp = generateOtp();
    console.log(otp);
    const otpExpires = Date.now() + 3600000; // OTP expires in 1 hour

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      mobile,
      otp,
      otpExpires,
      referral_code: newReferralCode,
      referred_code: referred_code || null,
      referral_bonus_given: false,
    });

    await user.save();

    // Create wallet for the new user
    const initialBalance = referred_code ? 50 : 0;
    const newWallet = new Wallet({
      userId: user._id,
      balance: initialBalance,
      transactions: referred_code ? [{
        amount: 50,
        transactionMethod: 'Credit',
        description: 'Referral bonus',
        date: new Date()
      }] : []
    });
    await newWallet.save();

    // Process referral bonus if applicable
    if (referredUser) {
      const referrerWallet = await Wallet.findOne({ userId: referredUser._id });
      if (referrerWallet) {
        referrerWallet.balance += 50;
        referrerWallet.transactions.push({
          amount: 50,
          transactionMethod: 'Credit',
          description: 'Referral bonus',
          date: new Date()
        });
        await referrerWallet.save();
      }
      referredUser.referral_bonus_given = true;
      await referredUser.save();
    }

    // Send OTP email
    await sendOtpEmail(email, otp);

    // Return success response
    return res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      userId: user._id 
    });

  } catch (error) {
    console.error('Error inserting user:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const renderRefferal = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log('Session userId:', userId);

    if (!userId) {
      console.log('User ID not found in session');
      return res.redirect('/login');
    }

    const userData = await User.findById(userId);
    console.log('User data:', userData);

    if (!userData) {
      console.log('User data is null');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Referral code:', userData.referral_code);
    res.render('referal', { userData });
  } catch (error) {
    console.error('Error in renderRefferal:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


module.exports = {
  loadLogin,
  insertUser,
  verifyUser,
  loadLogout,
  rendersignUp,
  renderShop,
  renderCart,
  renderAbout,
  renderIndex,
  renderLogin,
  renderuserProfile,
  renderEditprofile,
  updateProfile,
  renderAddress,
  renderAddaddress,
  addAddress,
  editAddress,
  updateAddress,
  deleteAddress,
  verifyOtp,
  loadLogin,
  insertUser,
  resetPassword,
  renderResetPassword,
  sendForgotPasswordEmail,
  renderForgotPassword,
  verifyOtpForPasswordReset,
  addToCart,
  removeFromCart,
  updateQuantity,
  renderThankyou,
  renderWishlist,
  addTowishlist,
  removeFromWishlist,
  addToCartFromWishlist,
  renderUserorders,
  updatedQuantity,
  renderRR,
  renderOtpverify,
  renderRefferal


};