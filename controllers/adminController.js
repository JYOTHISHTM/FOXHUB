
const User = require('../model/userModel')
const Category = require('../model/categoryModel')
const bcrypt = require('bcrypt');
const categoryModel = require('../model/categoryModel');
const Product = require('../model/productModel');
const productModel = require('../model/productModel');
const Order = require('../model/orderModel');


const loadLogin = async (req, res) => {
    try {
        res.render('adminLogin')
    } catch (error) {
        console.log(error);
    }
}


const verifyAdmin = async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password

        const adminData = await User.findOne({ email: email })
        if (adminData) {

            const passswordMatch = await bcrypt.compare(password, adminData.password)
            if (passswordMatch) {
                if (adminData.is_admin === false) {
                    res.render('adminLogin', { message: "email and password are incorrect" })

                } else {
                    res.redirect('/admin/dashboard')
                }
            } else {
                res.render('adminLogin', { message: "email and password are incorrect" })

            }

        } else {
            res.render('adminLogin', { message: "email and password are incorrect" })
        }

    } catch (error) {
        console.log(error.message);
    }
}




const blockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: { is_blocked: true } }, { new: true });
        console.log(updatedUser);
        return res.status(200).send({ message: "User blocked successfully", redirect: "/admin/customers" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
};

const unblockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const updatedUser = await User.findByIdAndUpdate(userId, { $set: { is_blocked: false } }, { new: true });
        return res.status(200).send({ message: "User unblocked successfully", redirect: "/admin/customers" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
}


const blockCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, { is_blocked: true }, { new: true });
        if (!updatedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }
        return res.status(200).json({ message: "Category blocked successfully", category: updatedCategory });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const unblockCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, { is_blocked: false }, { new: true });
        if (!updatedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }
        return res.status(200).json({ message: "Category unblocked successfully", category: updatedCategory });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Internal server error" });
    }
};

const blockProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        console.log(productId);
        const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: { is_blocked: true } }, { new: true });
        return res.status(200).send({ message: "Product blocked successfully", redirect: "/admin/products" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
};

const unblockProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(productId, { $set: { is_blocked: false } }, { new: true });
        return res.status(200).send({ message: "Product unblocked successfully", redirect: "/admin/products" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: "Internal server error" });
    }
};




const adminLogout = async (req, res) => {
    try {

        res.render('adminLogout')
    } catch (error) {
        console.log(error.message);
    }
}



const renderCustomers = async (req, res) => {
    try {
        const users = await User.find({ is_admin: 0 })
        res.render('customers', { users })
    }
    catch (error) {
        console.log(error.message);
    }
}



const renderCategories = async (req, res) => {
    try {
        const categories = await categoryModel.find({})
        res.render('categories', {
            categories
        })
    }
    catch (error) {
        console.log(error.message);
    }
}

const renderReturn = async (req, res) => {
    try {
        res.render('return')
    }
    catch (error) {
        console.log(error.message);
    }
}


const renderCategoryAdd = async (req, res) => {
    try {
        res.render('categoryAdd')
    }
    catch (error) {
        console.log(error.message);
    }
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////



const addCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const image = req.file.filename;

        // Check for existing category
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.render('categoryAdd', { message: "Category already exists" });
        }

        // Create new category
        const category = new Category({ name, image });
        await category.save();

        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error.message);
        res.render('categoryAdd', { message: "An error occurred while adding the category" });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { name, id } = req.body;
        const image = req.file ? req.file.filename : null;

        // Check for existing category with the same name
        const existingCategory = await Category.findOne({ name });
        if (existingCategory && existingCategory._id.toString() !== id) {
            return res.render('editCategory', {
                message: "Category already exists",
                categoryData: { _id: id, name, image: existingCategory.image }
            });
        }

        // Update category data
        const updateData = { name };
        if (image) updateData.image = image;

        const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedCategory) {
            return res.render('editCategory', {
                message: "Invalid category ID",
                categoryData: { _id: id, name, image }
            });
        }

        res.redirect('/admin/categories');
    } catch (error) {
        console.error(error.message);
        res.render('editCategory', {
            message: "An error occurred while updating the category",
            categoryData: { _id: req.body.id, name: req.body.name, image: req.file ? req.file.filename : null }
        });
    }
};

const editCategory = async (req, res) => {
    try {
        const id = req.query.id;
        const categoryData = await Category.findById(id);
        if (!categoryData) {
            return res.status(404).send('Category not found');
        }
        res.render('editCategory', { categoryData });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const updateProduct = async (req, res) => {
    try {
        const { name, price, quantity, id, category } = req.body;

        // Validate the id
        if (!id) {
            return res.status(400).json({ success: false, message: 'Product id is required' });
        }

        // Fetch current product data
        const productData = await Product.findById(id);
        if (!productData) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Validate name (no leading white spaces)
        const namePattern = /^[^\s]+[\s\S]*$/;
        if (!name || !namePattern.test(name)) {
            return res.status(400).json({ success: false, message: 'Product name is required and cannot start with white spaces' });
        }

        // Validate price
        if (!price || isNaN(price) || price <= 0) {
            return res.status(400).json({ success: false, message: 'Valid price is required' });
        }

        // Validate quantity (cannot be negative)
        if (!quantity || isNaN(quantity) || quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Valid quantity is required and cannot be negative' });
        }

        // Validate category
        if (!category) {
            return res.status(400).json({ success: false, message: 'Category is required' });
        }

        // Handle image uploads
        const images = [];
        for (let i = 1; i <= 5; i++) {
            if (req.files && req.files[`image${i}`]) {
                const file = req.files[`image${i}`][0];
                if (file && file.mimetype.startsWith('image/')) {
                    images.push(file.filename);
                } else {
                    return res.status(400).json({ success: false, message: 'Only image files are allowed' });
                }
            } else {
                // If no new file is uploaded, retain the existing image path
                images.push(productData.images[i - 1]);
            }
        }

        // Update product in database with new data including images
        const updatedProduct = await Product.findByIdAndUpdate(id, {
            name,
            price,
            quantity,
            images,
            category  // Ensure the category is updated
        }, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.redirect(`/admin/products?category=${category}`);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
};


const editProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const productData = await Product.findById(id);
        const categoryData = await Category.find({ is_blocked: false });
        const selectedCategory = productData.category; // Assuming category is a property in productData

        res.render('editProduct', { productData, categoryData, selectedCategory });
    }
    catch (error) {
        console.log(error.message);
    }
};







const addProduct = async (req, res) => {
    try {
        const { name, price, quantity, category } = req.body;
        const images = [];

        if (req.files) {
            for (let i = 1; i <= 5; i++) {
                if (req.files[`image${i}`]) {
                    images.push(req.files[`image${i}`][0].filename);
                }
            }
        }

        const categoryData = await Category.find({ is_blocked: false });
        const existingProduct = await Product.findOne({ name });

        if (existingProduct) {
            return res.render('productAdd', { categoryData, message: "Product already exists" });
        }

        const product = new Product({
            name,
            price,
            quantity,
            category,
            images,
        });

        await product.save();
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


//////////////////////////



const renderProuducts = async (req, res) => {
    try {
        const Products = await productModel.find({}).populate('category');


        res.render('products', {
            Products
        })
    }
    catch (error) {
        console.log(error.message);
    }
}

const renderproductAdd = async (req, res) => {
    try {
        const categoryData = await Category.find({ is_blocked: false });
        res.render('productAdd', { categoryData });
    } catch (error) {
        console.log(error.message);
    }
}






module.exports = {
    loadLogin,
    adminLogout,
    renderCustomers,
    renderProuducts,
    renderCategories,
    renderReturn,
    renderCategoryAdd,
    addCategory,
    renderproductAdd,
    addProduct,
    verifyAdmin,
    unblockUser,
    blockUser,
    unblockCategory,
    blockCategory,
    blockProduct,
    unblockProduct,
    editCategory,
    updateCategory,
    editProduct,
    updateProduct,

    






}