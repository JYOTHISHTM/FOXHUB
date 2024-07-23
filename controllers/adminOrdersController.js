const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const bcrypt = require('bcrypt');
const Product = require('../model/productModel');
const Order = require('../model/orderModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
const Wallet = require('../model/walletModel'); 
const Coupon = require('../model/couponModel');


const renderOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of orders per page
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .populate('items.productId')
      .populate('user')
      .sort({ orderDate: -1, createdAt: -1 }) // Sort by orderDate, then by createdAt
      .skip(skip)
      .limit(limit);

    // Calculate the price and total for each item in the orders
    const ordersWithFinalPrice = await Promise.all(orders.map(async (order) => {
      let totalDiscount = 0;

      const items = await Promise.all(order.items.map(async (item) => {
        const product = item.productId;
        let basePrice = product.price;
        let discountedPrice = basePrice;

        // Check if there's a product offer for the product
        const productOffer = await ProductOffer.findOne({ product: product._id });
        if (productOffer) {
          discountedPrice = basePrice - (basePrice * (productOffer.discountPercentage / 100));
        }

        // Check if there's a category offer for the product's category
        const categoryOffer = await CategoryOffer.findOne({ category: product.category });
        if (categoryOffer) {
          const categoryDiscount = basePrice * (categoryOffer.discountPercentage / 100);
          discountedPrice = Math.min(discountedPrice, basePrice - categoryDiscount);
        }

        // Apply coupon if available
        if (order.coupon) {
          const coupon = await Coupon.findOne({ code: order.coupon });
          if (coupon) {
            const couponDiscountedPrice = basePrice - (basePrice * (coupon.discountPercentage / 100));
            discountedPrice = Math.min(discountedPrice, couponDiscountedPrice);
            totalDiscount += (basePrice - discountedPrice) * item.quantity;
          }
        }

        // Calculate item total with quantity
        let itemTotal = discountedPrice * item.quantity;

        return {
          ...item._doc,
          productId: product,
          price: discountedPrice,  // Adjusted price after offers and coupon discount
          itemTotal                // Total price after offers and coupon discount
        };
      }));

      // Determine if the order has any requests
      const hasRequest = order.items.some(item => item.cancelReason || item.returnReason);

      // Calculate total amount after discounts
      const totalAmount = items.reduce((acc, item) => acc + item.itemTotal, 0);

      return {
        ...order._doc,
        items,
        totalAmount,
        totalDiscount,
        hasRequest
      };
    }));

    const totalPages = Math.ceil(totalOrders / limit);

    res.render('orders', {
      orders: ordersWithFinalPrice,
      currentUrl: req.path,
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error('Error rendering admin orders page:', error);
    res.status(500).send('Internal Server Error');
  }
};

const renderOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.params.productId;

    const order = await Order.findById(orderId)
                            .populate('items.productId')
                            .populate('user');

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Find the specific item in the order
    const specificItem = order.items.find(item => item.productId._id.toString() === productId);

    if (!specificItem) {
      return res.status(404).send("Product not found in this order");
    }

    let basePrice = specificItem.productId.price;
    let finalPrice = basePrice;

    // Check if there's a product offer for the product
    const productOffer = await ProductOffer.findOne({ product: productId });
    if (productOffer) {
      finalPrice = basePrice - (basePrice * (productOffer.discountPercentage / 100));
    }

    // Check if there's a category offer for the product's category
    const categoryOffer = await CategoryOffer.findOne({ category: specificItem.productId.category });
    if (categoryOffer) {
      const categoryDiscount = basePrice * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, basePrice - categoryDiscount);
    }

    // Apply coupon if available
    if (order.coupon) {
      const coupon = await Coupon.findOne({ code: order.coupon });
      if (coupon) {
        finalPrice = basePrice - (basePrice * (coupon.discountPercentage / 100));
      }
    }

    const itemWithFinalPrice = {
      ...specificItem.toObject(),
      finalPrice
    };

    res.render('adminOrderDetails', {
      order: order,
      specificItem: itemWithFinalPrice
    });

  } catch (error) {
    console.error('Error rendering order details page:', error);
    res.status(500).send('Internal Server Error');
  }
};



const approveReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    const order = await Order.findById(orderId).populate('items.productId').populate('user');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the specific item in the order
    const item = order.items.find(item => item.productId._id.toString() === productId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in the order' });
    }

    if (item.status !== 'Pending Return') {
      return res.status(400).json({ success: false, message: 'Item is not in return pending status' });
    }

    // Calculate the final price for this item
    let basePrice = item.productId.price;
    let finalPrice = basePrice;

    // Check for product offer
    const productOffer = await ProductOffer.findOne({ product: productId });
    if (productOffer) {
      finalPrice = basePrice - (basePrice * (productOffer.discountPercentage / 100));
    }

    // Check for category offer
    const categoryOffer = await CategoryOffer.findOne({ category: item.productId.category });
    if (categoryOffer) {
      const categoryDiscount = basePrice * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, basePrice - categoryDiscount);
    }

    // Apply coupon if available
    if (order.coupon) {
      const coupon = await Coupon.findOne({ code: order.coupon });
      if (coupon) {
        finalPrice = finalPrice - (finalPrice * (coupon.discountPercentage / 100));
      }
    }

    // Calculate the total amount to refund for this item
    const amountToCredit = finalPrice * item.quantity;

    // Update the status of the specific item
    item.status = 'Returned';

    // Check if all items are returned, if so, update the order status
    const allReturned = order.items.every(item => item.status === 'Returned');
    if (allReturned) {
      order.status = 'Returned';
    }

    await order.save();

    // Credit the amount back to user's wallet
    const wallet = await Wallet.findOne({ userId: order.user._id });

    if (wallet) {
      wallet.balance += amountToCredit;
      wallet.transactions.push({
        amount: amountToCredit,
        transactionMethod: "Refund",
        date: new Date()
      });
      await wallet.save();
    } else {
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

    // Increase the product quantity in the database
    const product = await Product.findById(productId);
    if (product) {
      product.quantity += item.quantity;
      await product.save();
    } else {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, message: 'Item return approved successfully, amount credited to wallet, and product quantity updated' });
  } catch (err) {
    console.error('Error approving return:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Backend controller function for updating order status

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, productId, status } = req.body;

    // Find the order by orderId
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find the specific orderItemSchema in the items array by productId
    const orderItem = order.items.find(item => item.productId.toString() === productId);

    if (!orderItem) {
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    // Update the status of the orderItemSchema
    orderItem.status = status;

    // Save the updated order
    await order.save();

    res.json({ success: true, message: 'Order item status updated successfully' });
  } catch (error) {
    console.error('Error updating order item status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


module.exports = {
    renderOrders,
    renderOrderDetails,
    approveReturn,
    updateOrderStatus,
};



