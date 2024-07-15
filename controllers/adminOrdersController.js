const User = require('../model/userModel');
const Category = require('../model/categoryModel');
const bcrypt = require('bcrypt');
const Product = require('../model/productModel');
const Order = require('../model/orderModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
const Wallet = require('../model/walletModel'); // Add this line to import the Wallet model

// admin order controller
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

    // Calculate the final price for each item in the orders
    const ordersWithFinalPrice = await Promise.all(orders.map(async (order) => {

      const items = await Promise.all(order.items.map(async (item) => {
        console.log(item+"items");

        const product = item.productId;
        let finalPrice = product.price;

        // Check if there's a product offer for the product
        const productOffer = await ProductOffer.findOne({ product: product._id });
        if (productOffer) {
          finalPrice = product.price - (product.price * (productOffer.discountPercentage / 100));
        }

        // Check if there's a category offer for the product's category
        const categoryOffer = await CategoryOffer.findOne({ category: product.category });
        if (categoryOffer) {
          const categoryDiscount = product.price * (categoryOffer.discountPercentage / 100);
          finalPrice = Math.min(finalPrice, product.price - categoryDiscount);
        }

        return {
          ...item._doc,
          productId: product,
          finalPrice
        };
      }));

      // Determine if the order has any requests
      const hasRequest = order.items.some(item => item.cancelReason || item.returnReason);

      return {
        ...order._doc,
        items,
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

    // Calculate the final price for the specific item, including offers
    let finalPrice = specificItem.productId.price;

    // Check if there's a product offer for the product
    const productOffer = await ProductOffer.findOne({ product: productId });
    if (productOffer) {
      finalPrice = specificItem.productId.price - (specificItem.productId.price * (productOffer.discountPercentage / 100));
    }

    // Check if there's a category offer for the product's category
    const categoryOffer = await CategoryOffer.findOne({ category: specificItem.productId.category });
    if (categoryOffer) {
      const categoryDiscount = specificItem.productId.price * (categoryOffer.discountPercentage / 100);
      finalPrice = Math.min(finalPrice, specificItem.productId.price - categoryDiscount);
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

    // Update the status of the specific item
    item.status = 'Returned';

    // Check if all items are returned, if so, update the order status
    const allReturned = order.items.every(item => item.status === 'Returned');
    if (allReturned) {
      order.status = 'Returned';
    }

    await order.save();

    // Credit the amount back to user's wallet
    const amountToCredit = item.productPrice * item.quantity; // Calculate the amount to credit
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




// Example route setup (using Express.js)

  



  

module.exports = {
    renderOrders,
    renderOrderDetails,
    approveReturn,
    updateOrderStatus,
};



