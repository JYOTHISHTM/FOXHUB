const mongoose = require('mongoose');
const Product = require('../model/productModel');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');
const Cart = require('../model/cartModel');
const Wishlist = require('../model/wishlistModel');





const productSingle = async (req, res) => {
    try {
        const productId = req.params.productId;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).send('Invalid Product ID');
        }

        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Calculate final price based on product and offers
        let finalPrice = product.price;

        // Apply product-specific offer if available
        const productOffer = await ProductOffer.findOne({ product: productId });
        if (productOffer) {
            finalPrice -= (product.price * (productOffer.discountPercentage / 100));
        }

        // Apply category-wide offer if available
        const currentDate = new Date();
        const categoryOfferQuery = {
            category: product.category._id,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate }
        };
        const categoryOffer = await CategoryOffer.findOne(categoryOfferQuery);
        if (categoryOffer) {
            const categoryDiscountPrice = product.price - (product.price * (categoryOffer.discountPercentage / 100));
            finalPrice = Math.min(finalPrice, categoryDiscountPrice);
        }

        // Store finalPrice in session
        req.session.finalPrice = finalPrice;

        // Render the product single page with the final price
        res.render('productSingle', {
            product,
            finalPrice: finalPrice.toFixed(2),
            message: req.session.message || null
        });
        req.session.message = null;
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Internal Server Error');
    }
};






const addToCartFromPS = async (req, res) => {
    const productId = req.body.productId;
    const finalPrice = req.session.finalPrice; // Retrieve finalPrice from session

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId: req.session.user_id });
        if (!cart) {
            cart = new Cart({ userId: req.session.user_id, items: [] });
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if (existingItemIndex !== -1) {
            if (cart.items[existingItemIndex].quantity >= product.quantityAvailable) {
                return res.json({ success: false, error: 'quantity_exceeded', message: 'Cannot add more than available quantity' });
            }
            return res.json({ success: false, error: 'already_in_cart', message: 'Product already in cart' });
        } else {
            let productImage = product.images && product.images.length > 0 ? product.images[0] : '';
            cart.items.push({
                productId: product._id,
                productName: product.name,
                productPrice: finalPrice, // Use the finalPrice from session
                productImage: productImage,
                quantity: 1
            });
        }

        await cart.save();

        res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
        console.error('Failed to add product to cart:', error);
        res.status(500).json({ success: false, message: 'Failed to add product to cart' });
    }
};








const addToWishlistFromPS = async (req, res) => {
    const productId = req.body.productId;
    const userId = req.session.user_id;

    try {
        let wishlist = await Wishlist.findOne({ userId });
        if (!wishlist) {
            wishlist = new Wishlist({ userId, items: [] });
        }

        if (wishlist.items.includes(productId)) {
            return res.json({ success: false, error: 'already_in_wishlist', message: 'Product already in wishlist' });
        } else {
            wishlist.items.push(productId);
            await wishlist.save();
            res.json({ success: true, message: 'Product added to wishlist' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to add product to wishlist' });
    }
};


module.exports = {
    productSingle,
    addToWishlistFromPS,
    addToCartFromPS,
};