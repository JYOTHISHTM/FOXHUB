const Order = require('../model/orderModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');

const renderSalesReport = async (req, res) => {
  try {
    const { sortBy, sortOrder } = req.query;
    let sortOptions = {};

    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const orders = await Order.find()
      .populate('items.productId')
      .populate('user')
      .sort(sortOptions);

    const productOffers = await ProductOffer.find().lean();
    const categoryOffers = await CategoryOffer.find().lean();

    // Calculate discounts
    orders.forEach(order => {
      let totalDiscount = 0;
      order.items.forEach(item => {
        // Find product offer
        const productOffer = productOffers.find(offer => offer.product.toString() === item.productId._id.toString());
        const categoryOffer = categoryOffers.find(offer => offer.category.toString() === item.productId.category.toString());

        // Calculate discounts
        if (productOffer) {
          const productDiscount = item.quantity * (item.productPrice * (productOffer.discountPercentage / 100));
          item.discount = productDiscount;
          totalDiscount += productDiscount;
        }
        if (categoryOffer) {
          const categoryDiscount = item.quantity * (item.productPrice * (categoryOffer.discountPercentage / 100));
          item.discount = (item.discount || 0) + categoryDiscount;
          totalDiscount += categoryDiscount;
        }

        // Assign final price to the item
        item.finalPrice = item.productPrice - (item.discount || 0);
      });

      // Assign total discount to the order
      order.totalDiscount = totalDiscount;
    });

    // Function to calculate total amount (sum of final prices)
    const calculateTotalAmount = (orders) => {
      return orders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => itemSum + item.finalPrice, 0);
      }, 0);
    };

    // Function to calculate total discount
    const calculateTotalDiscount = (orders) => {
      return orders.reduce((sum, order) => sum + order.totalDiscount, 0);
    };

    res.render('salesReport', {
      orders,
      productOffers,
      categoryOffers,
      calculateTotalAmount,
      calculateTotalDiscount,
      currentSortBy: sortBy,
      currentSortOrder: sortOrder,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Internal Server Error');
  }
};


module.exports = {
  renderSalesReport
};
