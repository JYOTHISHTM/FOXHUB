const Coupon = require('../model/couponModel');

const renderCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.render('coupons', { coupons });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const renderAddCoupons = async (req, res) => {
  try {
    res.render('addCoupon');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const addCoupon = async (req, res) => {
  try {
    const { couponTitle, couponCode, discountPercentage, priceRangeFrom, priceRangeTo } = req.body;
    const trimmedCouponTitle = couponTitle.trim();
    const trimmedCouponCode = couponCode.trim();

    if (trimmedCouponTitle === '') {
      return res.status(400).json({ field: 'couponTitle', message: 'Coupon title is required.' });
    }

    if (trimmedCouponCode === '') {
      return res.status(400).json({ field: 'couponCode', message: 'Coupon code is required.' });
    }

    if (trimmedCouponCode.length > 6) {
      return res.status(400).json({ field: 'couponCode', message: 'Coupon code must be 6 characters or less.' });
    }

    if (!/^\d+$/.test(trimmedCouponCode)) {
      return res.status(400).json({ field: 'couponCode', message: 'Coupon code must contain only digits.' });
    }

    if (discountPercentage <= 0 || discountPercentage > 99) {
      return res.status(400).json({ field: 'discountPercentage', message: 'Discount percentage must be between 1 and 99.' });
    }

    if (priceRangeTo <= priceRangeFrom) {
      return res.status(400).json({ field: 'priceRangeTo', message: 'Price range to must be larger than price range from.' });
    }

    const existingCoupon = await Coupon.findOne({ $or: [{ title: trimmedCouponTitle }, { code: trimmedCouponCode }] });
    if (existingCoupon) {
      return res.status(400).json({ message: 'A coupon with this title or code already exists.' });
    }

    const coupon = new Coupon({
      title: trimmedCouponTitle,
      code: trimmedCouponCode,
      discountPercentage,
      priceRange: `${priceRangeFrom} - ${priceRangeTo}`
    });
    await coupon.save();
    res.status(200).json({ message: 'Coupon saved successfully' });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;
    await Coupon.findByIdAndDelete(couponId);
    res.redirect('/admin/coupons');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const checkDuplicateTitle = async (req, res) => {
  try {
    const { title } = req.query;
    const existingCoupon = await Coupon.findOne({ title: title });
    res.json(!!existingCoupon);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const checkDuplicateCode = async (req, res) => {
  try {
    const { code } = req.query;
    const existingCoupon = await Coupon.findOne({ code: code });
    res.json(!!existingCoupon);
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  renderCoupons,
  renderAddCoupons,
  addCoupon,
  deleteCoupon,
  checkDuplicateTitle,
  checkDuplicateCode,

};