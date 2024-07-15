const Product = require('../model/productModel');
const ProductOffer = require('../model/productOfferModel');
const renderProductOffer = async (req, res) => {
    try {
        const productOffers = await ProductOffer.find()
            .populate('product')
            .sort({ createdAt: -1 }); // Sort by createdAt in descending order
        res.render('productOffers', { productOffers });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


const addProductOffer = async (req, res) => {
    try {
        const products = await Product.find();
        res.render('addProductOffer', { products, errors: null, formData: null });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};
const editProductOffer = async (req, res) => {
    try {
        const productOfferId = req.params.id;
        let productOffer = await ProductOffer.findById(productOfferId).populate('product');
        const products = await Product.find();
        
        if (!productOffer) {
            return res.status(404).send('Product Offer not found');
        }
        
        // Ensure dates are Date objects
        productOffer = productOffer.toObject(); // Convert to a plain JavaScript object
        productOffer.startDate = productOffer.startDate ? new Date(productOffer.startDate) : null;
        productOffer.endDate = productOffer.endDate ? new Date(productOffer.endDate) : null;

        console.log('Product Offer:', productOffer);
        console.log('Products:', products);

        res.render('editProductOffer', { 
            productOffer, 
            products, 
            errors: null  // Add this line
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
const saveProductOffer = async (req, res) => {
    try {
        const { product, discountPercentage, startDate, endDate } = req.body;
        const errors = {};

        // Check for active offer
        const existingOffer = await ProductOffer.findOne({
            product,
            endDate: { $gte: new Date() }
        });

        if (existingOffer) {
            errors.product = 'An active offer already exists for this product.';
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 99) {
            errors.discountPercentage = 'Discount percentage must be between 1 and 99.';
        }

        // Validate dates
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (parsedStartDate < currentDate) {
            errors.startDate = 'Start date must be equal to or greater than the current date.';
        }

        if (parsedEndDate <= parsedStartDate) {
            errors.endDate = 'End date must be greater than the start date.';
        }

        if (Object.keys(errors).length > 0) {
            const products = await Product.find();
            return res.render('addProductOffer', { products, errors, formData: req.body });
        }

        const newOffer = new ProductOffer({
            product,
            discountPercentage,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            createdAt: new Date()
        });

        await newOffer.save();
        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

const updateProductOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { product, discountPercentage, startDate, endDate } = req.body;
        const errors = {};

        // Check for active offer
        const existingOffer = await ProductOffer.findOne({
            product,
            endDate: { $gte: new Date() },
            _id: { $ne: id }
        });

        if (existingOffer) {
            errors.product = 'An active offer already exists for this product.';
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 99) {
            errors.discountPercentage = 'Discount percentage must be between 1 and 99.';
        }

        // Validate dates
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (parsedStartDate < currentDate) {
            errors.startDate = 'Start date must be equal to or greater than the current date.';
        }

        if (parsedEndDate <= parsedStartDate) {
            errors.endDate = 'End date must be greater than the start date.';
        }

        if (Object.keys(errors).length > 0) {
            const products = await Product.find();
            return res.render('editProductOffer', { 
                productOffer: { _id: id, ...req.body }, 
                products, 
                errors 
            });
        }

        const updatedOffer = await ProductOffer.findByIdAndUpdate(id, {
            product,
            discountPercentage,
            startDate: parsedStartDate,
            endDate: parsedEndDate
        });

        if (!updatedOffer) {
            return res.status(404).send('Product offer not found');
        }

        res.redirect('/admin/productOffers');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


const deleteProductOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedOffer = await ProductOffer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: 'Product offer not found' });
        }

        res.json({ success: true, message: 'Product offer deleted successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    renderProductOffer,
    addProductOffer,
    saveProductOffer,
    editProductOffer,
    updateProductOffer,
    deleteProductOffer
};