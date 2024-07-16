const Order = require('../model/orderModel');
const Coupon = require('../model/couponModel')
const Product = require('../model/productModel');
const User = require('../model/userModel'); // Add this line to import the User model
const Wallet = require('../model/walletModel'); // Add this line to import the Wallet model
const crypto = require('crypto');

const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
// userOrdercontroller

const Razorpay = require('razorpay');

require('dotenv').config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const renderOrderdetails = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const loggedIn = userId ? true : false;

    if (!userId) {
      return res.redirect('/login');
    }

    const orderId = req.params.orderId;
    const productId = req.params.productId;

    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      return res.status(404).send("Order not found");
    }

    const selectedItem = order.items.find(item => item.productId._id.toString() === productId);
    if (!selectedItem) {
      return res.status(404).send("Product not found in this order");
    }

    const selectedAddress = order.address;

    // Calculate final price considering offers
    let finalPrice = selectedItem.productId.price;
    
    const productOffer = await ProductOffer.findOne({ product: selectedItem.productId._id });
    const categoryOffer = await CategoryOffer.findOne({ category: selectedItem.productId.category });

    if (productOffer) {
      finalPrice = selectedItem.productId.price - (selectedItem.productId.price * (productOffer.discountPercentage / 100));
    }

    if (categoryOffer) {
      const categoryDiscount = selectedItem.productId.price * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, selectedItem.productId.price - categoryDiscount);
    }

    selectedItem.finalPrice = parseFloat(finalPrice.toFixed(2));

    res.render('orderDetails', { order, selectedItem, selectedAddress, loggedIn, currentUrl: req.path });
  } catch (error) {
    console.error('Error rendering order details page:', error);
    res.status(500).send('Internal Server Error');
  }
};


const returnItem = async (req, res) => {
  try {
    console.log("Return item request received");
    const { orderId, itemId, productId, reason } = req.body;
    let order = await Order.findById(orderId).populate('items.productId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.find(item => item._id.toString() === itemId && item.productId._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    if (item.status !== 'Delivered') {
      return res.status(400).json({ success: false, message: 'Only delivered items can be returned' });
    }

    // Calculate final price considering offers
    let finalPrice = item.productId.price;
    const productOffer = await ProductOffer.findOne({ product: item.productId._id });
    const categoryOffer = await CategoryOffer.findOne({ category: item.productId.category });

    if (productOffer) {
      finalPrice = item.productId.price - (item.productId.price * (productOffer.discountPercentage / 100));
    }

    if (categoryOffer) {
      const categoryDiscount = item.productId.price * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, item.productId.price - categoryDiscount);
    }

    item.finalPrice = parseFloat(finalPrice.toFixed(2));

    item.status = 'Pending Return';
    item.returnReason = reason;
    order.hasRequest = true;
    await order.save();

    res.json({ success: true, message: 'Item return request submitted successfully' });
  } catch (err) {
    console.error('Error returning item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const cancelItem = async (req, res) => {
  try {
    console.log("Cancel item request received");
    const { orderId, itemId, productId, reason } = req.body;
    let order = await Order.findById(orderId).populate('items.productId').populate('user');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const item = order.items.find(item => item._id.toString() === itemId && item.productId._id.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    if (item.status !== 'Shipped' && item.status !== 'Processing') {
      return res.status(400).json({ success: false, message: 'Item cannot be cancelled at this stage' });
    }

    // Calculate final price considering offers
    let finalPrice = item.productId.price;
    const productOffer = await ProductOffer.findOne({ product: item.productId._id });
    const categoryOffer = await CategoryOffer.findOne({ category: item.productId.category });

    if (productOffer) {
      finalPrice = item.productId.price - (item.productId.price * (productOffer.discountPercentage / 100));
    }

    if (categoryOffer) {
      const categoryDiscount = item.productId.price * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, item.productId.price - categoryDiscount);
    }

    item.finalPrice = parseFloat(finalPrice.toFixed(2));

    // Change status directly to 'Cancelled'
    item.status = 'Cancelled';
    item.cancelReason = reason;

    // Check if all items are cancelled, if so, update the order status
    const allCancelled = order.items.every(item => item.status === 'Cancelled');
    if (allCancelled) {
      order.status = 'Cancelled';
    } else {
      order.hasRequest = true;
    }

    await order.save();

    // Find the product and increase its quantity
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += item.quantity; // Increase the product quantity
      await product.save(); // Save the updated product
    }

    // Credit the amount back to user's wallet
    const amountToCredit = item.finalPrice * item.quantity; // Calculate the amount to credit
    const wallet = await Wallet.findOne({ userId: order.user._id });

    if (wallet) {
      wallet.balance += amountToCredit; // Update the wallet balance
      wallet.transactions.push({
        amount: amountToCredit,
        transactionMethod: "Refund",
        date: new Date()
      });
      await wallet.save(); // Save the updated wallet
    } else {
      // If the wallet doesn't exist, create a new one
      const newWallet = new Wallet({
        userId: order.user._id,
        balance: amountToCredit,
        transactions: [{
          amount: amountToCredit,
          transactionMethod: "Credit",
          date: new Date()
        }]
      });
      await newWallet.save();
    }

    // Update the JSON response
    res.json({ 
      success: true, 
      message: 'Item cancelled successfully and amount credited to wallet',
      newStatus: 'Cancelled',
      orderStatus: order.status
    });

  } catch (err) {
    console.error('Error cancelling item:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const renderUserorder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const loggedIn = Boolean(userId);

    if (!userId) {
      return res.redirect('/login');
    }

    // Fetch and sort orders by createdAt in descending order
    const orders = await Order.find({ user: userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });

    // Process orders to calculate final prices and apply coupon discounts
    const ordersWithFinalPrice = await Promise.all(
      orders.map(async (order) => {
        const coupon = order.couponCode ? await Coupon.findOne({ code: order.couponCode }) : null;

        const items = await Promise.all(
          order.items.map(async (item) => {
            const product = item.productId;
            let finalPrice = item.productPrice;

            // Check if there's a product offer for the product
            const productOffer = await ProductOffer.findOne({ product: product._id });
            if (productOffer) {
              finalPrice -= finalPrice * (productOffer.discountPercentage / 100);
            }

            // Check if there's a category offer for the product's category
            const categoryOffer = await CategoryOffer.findOne({ category: product.category });
            if (categoryOffer) {
              const categoryDiscount = finalPrice * (categoryOffer.discountPercentage / 100);
              finalPrice = Math.min(finalPrice, finalPrice - categoryDiscount);
            }

            return {
              ...item._doc,
              productId: product,
              finalPrice,
              finalPriceForTotalQuantity: finalPrice * item.quantity,
              status: item.status || order.status,
            };
          })
        );

        // Calculate the total discount from the coupon
        let couponDiscount = 0;
        let discountedItems = items;

        if (coupon) {
          const orderTotal = items.reduce((sum, item) => sum + item.finalPriceForTotalQuantity, 0);
          if (
            orderTotal >= parseFloat(coupon.priceRange.split(' - ')[0]) &&
            orderTotal <= parseFloat(coupon.priceRange.split(' - ')[1])
          ) {
            couponDiscount = orderTotal * (coupon.discountPercentage / 100);

            // Distribute the coupon discount proportionally to each item
            const totalFinalPrice = items.reduce((sum, item) => sum + item.finalPriceForTotalQuantity, 0);
            discountedItems = items.map((item) => {
              const discountShare = (item.finalPriceForTotalQuantity / totalFinalPrice) * couponDiscount;
              return {
                ...item,
                finalPriceAfterCoupon: item.finalPriceForTotalQuantity - discountShare,
              };
            });
          }
        } else {
          discountedItems = items.map((item) => ({
            ...item,
            finalPriceAfterCoupon: item.finalPriceForTotalQuantity,
          }));
        }

        const orderTotal = discountedItems.reduce((sum, item) => sum + item.finalPriceAfterCoupon, 0);

        return {
          ...order._doc,
          items: discountedItems,
          createdAt: order.createdAt,
          couponDiscount: couponDiscount.toFixed(2),
          orderTotal: orderTotal.toFixed(2),
          discountedTotal: orderTotal.toFixed(2),
          status: order.status,
        };
      })
    );

    res.render('userOrders', { orders: ordersWithFinalPrice, loggedIn, currentUrl: req.path });
  } catch (error) {
    console.error('Error rendering user orders page:', error);
    res.status(500).send('Internal Server Error');
  }
};


const createRazorpayOrder = async (req, res) => {
  const { amount, orderId } = req.body;

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: orderId,
    });

    res.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

  try {
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                                    .update(body.toString())
                                    .digest('hex');

    if (expectedSignature === razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, { status: 'Paid', paymentId: razorpay_payment_id });
      res.json({ status: 'success' });
    } else {
      res.json({ status: 'failure', message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ error: 'Failed to verify Razorpay payment' });
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;

  try {
    const updatedOrder = await Order.findByIdAndUpdate(orderId, 
      { status: status, 'items.$[].status': status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
};

module.exports = {
  renderUserorder,
  renderOrderdetails,
  cancelItem,
  returnItem,
  createRazorpayOrder,
  verifyRazorpayPayment,
  updateOrderStatus



};
