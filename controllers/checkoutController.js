const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../model/orderModel');
const Wallet = require('../model/walletModel');
const Cart = require('../model/cartModel');
const Product = require('../model/productModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
const Profile = require('../model/profileModel');
const mongoose = require('mongoose');
require('dotenv').config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});


const renderCheckout = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res.redirect('/login');
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.render('checkout', { cart: [], selectedAddress: null, discountedAmount: 0 });
    }

    const profile = await Profile.findOne({ userId });
    const addresses = profile ? profile.addresses : [];

    const selectedAddressIndex = req.query.selectedAddress;
    let selectedAddress = null;

    if (selectedAddressIndex !== undefined && addresses.length > 0) {
      selectedAddress = addresses[selectedAddressIndex];
    } else {
      console.error('No valid selected address found.');
    }

    let discountedAmount = 0;
    const cartItems = await Promise.all(cart.items.map(async (item) => {
      const { productId, quantity } = item;
      const product = await Product.findById(productId);
      let finalPrice = product.price;

      const offer = await ProductOffer.findOne({ product: productId });
      const categoryOffers = await CategoryOffer.find({ category: product.category });

      let categoryOffer = null;
      if (categoryOffers.length > 0) {
        categoryOffer = categoryOffers.reduce((prev, current) => prev.discountPercentage > current.discountPercentage ? prev : current);
      }

      if (offer) {
        finalPrice = product.price - (product.price * (offer.discountPercentage / 100));
      }

      if (categoryOffer) {
        const categoryDiscount = product.price * (categoryOffer.discountPercentage / 100);
        finalPrice = Math.min(finalPrice, product.price - categoryDiscount);
      }

      const itemTotal = quantity * finalPrice;
      discountedAmount += itemTotal;

      return {
        ...item._doc,
        productId: product._id,
        productName: product.name,
        productPrice: finalPrice,
        itemTotal
      };
    }));

    console.log('Selected Address:', selectedAddress); // Debug log

    res.render('checkout', { cart: { items: cartItems }, selectedAddress, discountedAmount: discountedAmount.toFixed(2) });

  } catch (error) {
    console.error('Error rendering checkout page:', error);
    res.status(500).send('Internal Server Error');
  }
};


const handleWalletPayment = async (userId, finalPrice) => {
  try {
    const wallet = await Wallet.findOne({ userId });
    
    const deductionAmount = parseFloat(finalPrice);
    console.log(`Attempting to deduct ${deductionAmount} from wallet`);

    if (!wallet || wallet.balance < deductionAmount) {
      return { success: false, message: 'Insufficient balance in your wallet. Please choose another payment method.' };
    }

    // Deduct the amount from the wallet
    wallet.balance -= deductionAmount;
    await wallet.save();

    console.log(`Successfully deducted ${deductionAmount} from wallet. New balance: ${wallet.balance}`);

    return { success: true, message: 'Payment successful', newBalance: wallet.balance };
  } catch (error) {
    console.error('Error handling wallet payment:', error);
    return { success: false, message: 'An error occurred while processing your payment. Please try again later.' };
  }
};
/// checkout controller


const placeOrder = async (req, res) => {
  console.log("placeOrder called");
  try {
    const userId = req.session.user_id;
    const { state, address, city, postalCode, paymentMethod, couponCode } = req.body;

    console.log("Place order request received with:", req.body);

    if (!state || !address || !city || !postalCode) {
      console.log("Address validation failed");
      return res.render('checkout', {
        errorMessage: 'Please fill out or select your address details before placing an order.',
        addressError: true,
        paymentMethodError: false
      });
    }

    if (!paymentMethod) {
      console.log("Payment method validation failed");
      return res.render('checkout', {
        errorMessage: 'Please select a payment method.',
        addressError: false,
        paymentMethodError: true
      });
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      console.log("Empty cart");
      return res.redirect('/cart');
    }

    const validItems = cart.items.filter(item => item.productId !== null && item.productId !== undefined);
    let totalAmount = validItems.reduce((total, item) => total + item.quantity * item.productId.price, 0);
    let discountedAmount = totalAmount;

    console.log("Total amount calculated:", totalAmount);

    if (couponCode) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const response = await fetch(`${baseUrl}/apply-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ couponCode, orderTotal: totalAmount })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to apply coupon:", errorText);
        return res.render('checkout', {
          errorMessage: 'Invalid coupon code. Please try again.',
          addressError: false,
          paymentMethodError: false
        });
      }

      const data = await response.json();
      console.log("Coupon apply response:", data);

      if (data.success) {
        discountedAmount = data.discountedAmount;
      } else {
        console.log("Coupon code invalid or not applicable");
        return res.render('checkout', {
          errorMessage: 'Invalid coupon code. Please try again.',
          addressError: false,
          paymentMethodError: false
        });
      }
    }

    let orderStatus = 'Processing';
    if (paymentMethod === 'Razorpay') {
      const options = {
        amount: discountedAmount * 100,
        currency: 'INR',
        receipt: `receipt_order_${new Date().getTime()}`,
        payment_capture: 1
      };

      const razorpayResponse = await razorpay.orders.create(options);
      console.log("Razorpay response:", razorpayResponse);

      const order = new Order({
        user: userId,
        items: validItems,
        totalAmount: discountedAmount,
        address: { state, address, city, postalCode },
        paymentMethod,
        razorpayOrderId: razorpayResponse.id,
        status: 'Pending',
        coupon: couponCode
      });

      await order.save();
      console.log('Razorpay order saved:', order);
      await new Promise(resolve => setTimeout(resolve, 2000));

      for (let item of validItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          const newQuantity = product.quantity - item.quantity;
          if (newQuantity < 0) {
            newQuantity = 0;
          }
          product.quantity = newQuantity;
          await product.save();
        }
      }

      return res.redirect(`/thankyou/${order._id}`);
    } else if (paymentMethod === 'Cash on Delivery') {
      const order = new Order({
        user: userId,
        items: validItems,
        totalAmount: discountedAmount,
        address: { state, address, city, postalCode },
        paymentMethod,
        status: 'Processing',
        coupon: couponCode
      });

      await order.save();
      await Cart.findOneAndUpdate({ userId }, { items: [] });
      for (let item of validItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          const newQuantity = product.quantity - item.quantity;
          if (newQuantity < 0) {
            newQuantity = 0;
          }
          product.quantity = newQuantity;
          await product.save();
        }
      }
      return res.render('thankyou', { order, amount: discountedAmount, coupon: couponCode });
    } else if (paymentMethod === 'Wallet') {
      const walletPaymentResult = await handleWalletPayment(userId, totalAmount, discountedAmount);
      if (!walletPaymentResult.success) {
        console.log("Wallet payment failed");
        return res.render('checkout', {
          errorMessage: walletPaymentResult.message || 'Error processing wallet payment. Please try again.',
          addressError: false,
          paymentMethodError: true
        });
      }

      const order = new Order({
        user: userId,
        items: validItems,
        totalAmount: discountedAmount,
        address: { state, address, city, postalCode },
        paymentMethod,
        status: 'Processing',
        coupon: couponCode
      });

      await order.save();
      await Cart.findOneAndUpdate({ userId }, { items: [] });
      for (let item of validItems) {
        const product = await Product.findById(item.productId);
        if (product) {
          const newQuantity = product.quantity - item.quantity;
          if (newQuantity < 0) {
            newQuantity = 0;
          }
          product.quantity = newQuantity;
          await product.save();
        }
      }
      return res.redirect(`/thankyou/${order._id}`);
    } else {
      console.log("Invalid payment method selected");
      return res.render('checkout', {
        errorMessage: 'Invalid payment method selected.',
        addressError: false,
        paymentMethodError: true
      });
    }
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).send('Internal Server Error');
  }
};






const createPayment = async (req, res) => {
  try {
    let { amount } = req.body;

    // Validate amount
    amount = parseFloat(amount);
    if (!amount || isNaN(amount) || amount < 1) {
      throw new Error('Invalid amount. Amount must be at least 1 (representing 1 paise).');
    }

    // Convert amount to paise
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise, // Amount in paise
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
      payment_capture: 1 // Auto capture payment
    };

    const response = await razorpay.orders.create(options);
    console.log('Razorpay order created:', response);

    res.json({ ...response, key: process.env.RAZORPAY_KEY_ID }); // Include the key in the response
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).send('Internal Server Error');
  }
};


// Function to verify Razorpay payment signature
const verifyPayment = async (req, res) => {
  try {
    const { order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log(order_id + "order_id");
    console.log(razorpay_payment_id + "razorpay_payment_id");
    console.log(razorpay_signature + "razorpay_signature");

    const text = `${order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET) // Corrected this line
      .update(text)
      .digest('hex');

    console.log('expectedSignature:', expectedSignature);

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findOneAndUpdate(
        { razorpayOrderId: order_id },
        { status: 'Paid' },
        { new: true }
      );
      return res.json({ status: 'success', message: 'Payment verified successfully', order });
    } else {
      return res.status(400).json({ status: 'error', message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: error.message });
  }
};


const orderFailure = async (req, res) => {
  try {
    const orderId = req.query.id;
    console.log(orderId+'orderFailure - orderId');
    if (orderId) {
      const userId = req.session.user_id;
      const order = await Order.findOne({ razorpayOrderId: orderId, user: userId });
      console.log(order+" order ");
      if (order) {
        // Update order status to 'Pending' instead of 'Failed'
        order.status = 'Pending';
        order.items.forEach(item => {
          item.status = 'Pending';
        });
        await order.save();

        res.status(200).json({ 
          message: 'Payment failed. Order status set to pending.',
          redirect: '/userOrders'
        });
      } else {
        res.status(404).json({ error: 'Order not found' });
      }
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (error) {
    console.error('Error handling order failure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const handleFailedRazorpayPayment = async (req, res) => {
  try {
    const userId = req.session.user_id;
    console.log("Request body:", req.body);
    const { orderId, state, address, city, postalCode, paymentMethod, couponCode, validItems, discountedAmount } = req.body;
    console.log("OrderId received:", orderId);

    let order = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!order && attempts < maxAttempts) {
      order = await Order.findOne({ razorpayOrderId: orderId });
      if (!order) {
        console.log(`Attempt ${attempts + 1}: No order found, retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    console.log("Order found:", order);

    if (order) {
      order.status = 'Payment Failed';
      order.items.forEach(item => {
        item.status = 'Payment Failed';
      });
      await order.save();

      res.json({ success: true, message: 'Order status updated to Payment Failed' });
    } else {
      console.log(`No order found with razorpayOrderId: ${orderId} after ${maxAttempts} attempts`);
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        console.log("Empty cart");
        return res.redirect('/cart');
      }
  
      const validItems = cart.items.filter(item => item.productId !== null && item.productId !== undefined);
      let totalAmount = validItems.reduce((total, item) => total + item.quantity * item.productId.price, 0);
      let discountedAmount = totalAmount;
  
    
      const newOrder = new Order({
        user: userId,
        items: validItems,
        totalAmount: discountedAmount,
        address: { state, address, city, postalCode },
        paymentMethod,
        status: 'Payment Failed',
        coupon: couponCode,
        razorpayOrderId: orderId,
        orderDate: new Date(),
      });

      await newOrder.save();
      newOrder.status = 'Payment Failed';
      newOrder.items.forEach(item => {
        item.status = 'Payment Failed';
      });
      await newOrder.save();
      res.json({ success: true, message: 'New order created and status set to Payment Failed' });
    }
  } catch (error) {
    console.error('Error handling failed Razorpay payment:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Add this route

module.exports = {
  renderCheckout,
  placeOrder,
  createPayment,
  verifyPayment,
  handleWalletPayment,
  orderFailure,
  handleFailedRazorpayPayment

};