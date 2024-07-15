const Coupon = require('../model/couponModel');
const Order = require('../model/orderModel');

const getAvailableCoupons = async (req, res) => {
  console.log("getAvailableCoupons called");
  try {
    const coupons = await Coupon.find();
    res.render('availableCoupons', { coupons });
  } catch (error) {
    console.error('Error retrieving available coupons:', error);
    res.status(500).send('Internal Server Error');
  }
};

const renderUserCoupon = async (req, res) => {
  console.log("renderUserCoupon called");
  try {
    const userId = req.session.user_id;
    console.log('User ID:', userId);

    const allCoupons = await Coupon.find();
    console.log('All coupons:', allCoupons);

    const appliedCoupons = await Order.find({
      user: userId,
      'coupon.code': { $exists: true, $ne: null }
    }).distinct('coupon.code');
    console.log('Applied coupons:', appliedCoupons);

    const availableCoupons = allCoupons.filter(coupon => !appliedCoupons.includes(coupon.code));
    console.log('Available coupons:', availableCoupons);

    res.render('userCoupon', { coupons: availableCoupons });
  } catch (error) {
    console.error('Error in renderUserCoupon:', error);
    res.status(500).render('error', { message: 'An error occurred while fetching coupons.' });
  }
};
const applyCoupon = async (req, res) => {
  console.log("applyCoupon called");
  try {
    console.log("Received coupon request:", req.body);
    const { couponCode, orderTotal } = req.body;

    if (!couponCode || orderTotal === undefined) {
      console.log("Missing coupon code or order total");
      return res.status(400).json({ success: false, message: 'Coupon code and order total are required.' });
    }

    const parsedOrderTotal = parseFloat(orderTotal);
    if (isNaN(parsedOrderTotal) || parsedOrderTotal <= 0) {
      console.log("Invalid order total:", orderTotal);
      return res.status(400).json({ success: false, message: 'Invalid order total.' });
    }

    // Trim the coupon code on the server-side as well
    const trimmedCouponCode = couponCode.trim();

    const coupon = await Coupon.findOne({ code: trimmedCouponCode });
    console.log("Found coupon:", coupon);

    if (!coupon) {
      console.log("Invalid coupon code:", trimmedCouponCode);
      return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
    }

    const [priceRangeFrom, priceRangeTo] = coupon.priceRange.split(' - ').map(parseFloat);
    console.log("Order total:", parsedOrderTotal);
    console.log("Coupon price range:", priceRangeFrom, "-", priceRangeTo);

    if (parsedOrderTotal < priceRangeFrom || parsedOrderTotal > priceRangeTo) {
      console.log("Order total out of range");
      return res.status(400).json({
        success: false,
        message: `Order total must be between ${priceRangeFrom} and ${priceRangeTo} to apply this coupon.`
      });
    }

    const discountAmount = parsedOrderTotal * (coupon.discountPercentage / 100);
    const discountedTotal = parsedOrderTotal - discountAmount;
    console.log("Discount amount:", discountAmount);
    console.log("Calculated discounted total:", discountedTotal);

    return res.status(200).json({
      success: true,
      discountedAmount: discountedTotal.toFixed(2),
      message: 'Coupon applied successfully.'
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({ success: false, message: 'An error occurred while applying the coupon. Please try again later.' });
  }
};


module.exports = {
  getAvailableCoupons,
  renderUserCoupon,
  applyCoupon,
};
