const Category = require('../model/categoryModel');
const CategoryOffer = require('../model/categoryOfferModel');

const renderCategoryOffer = async (req, res) => {
    try {
        const categoryOffers = await CategoryOffer.find()
            .populate('category')
            .sort({ createdAt: -1 });
        res.render('categoryOffer', { categoryOffers });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

const addCategoryOffer = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('addCategoryOffer', { categories, errors: null, formData: null });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};
const saveCategoryOffer = async (req, res) => {
    try {
        const { category, discountPercentage, startDate, endDate } = req.body;
        const errors = {};

        // Check for active offer
        const existingOffer = await CategoryOffer.findOne({
            category,
            endDate: { $gte: new Date() }
        });

        if (existingOffer) {
            errors.category = 'An active offer already exists for this category.';
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 99) { // Adjusted to 99 for the range 1 to 99
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
            const categories = await Category.find();
            return res.render('addCategoryOffer', { categories, errors, formData: req.body });
        }

        const newOffer = new CategoryOffer({
            category,
            discountPercentage,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            createdAt: new Date()
        });

        await newOffer.save();
        res.redirect('/admin/categoryOffer');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


const editCategoryOffer = async (req, res) => {
    try {
        const categoryOfferId = req.params.id;
        let categoryOffer = await CategoryOffer.findById(categoryOfferId).populate('category');
        const categories = await Category.find();
        
        if (!categoryOffer) {
            return res.status(404).send('Category Offer not found');
        }
        
        categoryOffer = categoryOffer.toObject();
        categoryOffer.startDate = categoryOffer.startDate ? new Date(categoryOffer.startDate) : null;
        categoryOffer.endDate = categoryOffer.endDate ? new Date(categoryOffer.endDate) : null;

        res.render('editCategoryOffer', { 
            categoryOffer, 
            categories, 
            errors: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
const updateCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, discountPercentage, startDate, endDate } = req.body;
        const errors = {};

        // Check for active offer
        const existingOffer = await CategoryOffer.findOne({
            category,
            endDate: { $gte: new Date() },
            _id: { $ne: id }
        });

        if (existingOffer) {
            errors.category = 'An active offer already exists for this category.';
        }

        // Validate discount percentage
        if (discountPercentage < 1 || discountPercentage > 99) { // Adjusted to 99 for the range 1 to 99
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
            const categories = await Category.find();
            return res.render('editCategoryOffer', { 
                categoryOffer: { _id: id, ...req.body }, 
                categories, 
                errors 
            });
        }

        const updatedOffer = await CategoryOffer.findByIdAndUpdate(id, {
            category,
            discountPercentage,
            startDate: parsedStartDate,
            endDate: parsedEndDate
        });

        if (!updatedOffer) {
            return res.status(404).send('Category offer not found');
        }

        res.redirect('/admin/categoryOffer');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


const deleteCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedOffer = await CategoryOffer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ success: false, message: 'Category offer not found' });
        }

        res.json({ success: true, message: 'Category offer deleted successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    renderCategoryOffer,
    addCategoryOffer,
    saveCategoryOffer,
    editCategoryOffer,
    updateCategoryOffer,
    deleteCategoryOffer
};