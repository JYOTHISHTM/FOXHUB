const express = require('express')
const adminRoute = express()
const bodyparser = require('body-parser')
const multer = require('multer')
const categoryModel = require('../model/categoryModel');
const adminOrdersController = require('../controllers/adminOrdersController')
const Order=require('../model/orderModel')
const adminSalesControllers=require('../controllers/adminSalesControllers')
const adminCouponController=require('../controllers/adminCouponController')

const adminProductOffercontroller= require('../controllers/adminProductOffercontroller')
const adminCategoryOffercontroller= require('../controllers/adminCategoryOffercontroller')

const chartController= require('../controllers/chartController')


adminRoute.use(bodyparser.json())
adminRoute.use(bodyparser.urlencoded({ extended: true }))


adminRoute.set('view engine', 'ejs')
adminRoute.set('views', './views/admin')

const adminController = require('../controllers/adminController')

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

var upload = multer({
    storage: storage,
}).single('image')

var upload = multer({ storage: storage }).single('image');



var storage1 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/productImage");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

var productImages = multer({
    storage: storage1,
}).fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 },
    { name: 'image5', maxCount: 1 }
]);



adminRoute.post('/add-product', productImages, adminController.addProduct);


adminRoute.get('/productAdd', adminController.renderproductAdd)
adminRoute.get('/editProduct', adminController.editProduct);
adminRoute.post('/add', upload, adminController.addCategory)
adminRoute.get('/editCategory', adminController.editCategory);
adminRoute.post('/dashboard', adminController.verifyAdmin)



adminRoute.post('/update', upload, adminController.updateCategory);
adminRoute.get('/categories', adminController.renderCategories)
adminRoute.post('/updateProduct', productImages, adminController.updateProduct);

adminRoute.get('/products', adminController.renderProuducts)
adminRoute.get('/', adminController.loadLogin);
adminRoute.get('/adminLogout', adminController.adminLogout)
adminRoute.get('/customers', adminController.renderCustomers)
adminRoute.get('/return', adminController.renderReturn)
adminRoute.get('/categoryAdd', adminController.renderCategoryAdd)
adminRoute.post('/block', adminController.blockUser)
adminRoute.post('/unblock', adminController.unblockUser)
adminRoute.post('/cblock', adminController.blockCategory);
adminRoute.post('/cunblock', adminController.unblockCategory);
adminRoute.post('/productBlock', adminController.blockProduct)
adminRoute.post('/productUnblock', adminController.unblockProduct)
adminRoute.get('/orders', adminOrdersController.renderOrders);

adminRoute.post('/orders/:orderId/status', async (req, res) => {
  try {
      const { orderId } = req.params;
      const { status } = req.body;
      await Order.findByIdAndUpdate(orderId, { status });
      res.sendStatus(200);
  } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).send('Internal Server Error');
  }
});























// admin orders
adminRoute.get('/adminOrderDetails/:orderId/:productId', adminOrdersController.renderOrderDetails);
adminRoute.get('/admin/orders', adminOrdersController.renderOrders);



adminRoute.get('/admin/orders/:orderId', adminOrdersController.renderOrderDetails);
adminRoute.post('/approve-return', adminOrdersController.approveReturn);

adminRoute.post('/update-order-status',adminOrdersController. updateOrderStatus);














// admin coupon 

adminRoute.get('/coupons', adminCouponController.renderCoupons);
adminRoute.get('/addCoupon', adminCouponController.renderAddCoupons);
adminRoute.post('/addCoupon', adminCouponController.addCoupon);
adminRoute.get('/deleteCoupon/:id', adminCouponController.deleteCoupon);



adminRoute.get('/checkDuplicateTitle',adminCouponController. checkDuplicateTitle);
adminRoute.get('/checkDuplicateCode',adminCouponController. checkDuplicateCode);

// admin product  offer

adminRoute.get('/productOffers', adminProductOffercontroller.renderProductOffer);
adminRoute.get('/addProductOffer', adminProductOffercontroller.addProductOffer);
adminRoute.post('/addProductOffer', adminProductOffercontroller.saveProductOffer);
adminRoute.get('/editProductOffer/:id', adminProductOffercontroller.editProductOffer);
adminRoute.post('/editProductOffer/:id', adminProductOffercontroller.updateProductOffer);
adminRoute.delete('/deleteProductOffer/:id', adminProductOffercontroller.deleteProductOffer);







// admin category offer


///////////////////

adminRoute.get('/categoryOffer',adminCategoryOffercontroller.renderCategoryOffer)
adminRoute.get('/addCategoryOffer',adminCategoryOffercontroller.addCategoryOffer)
adminRoute.post('/addCategoryOffer', adminCategoryOffercontroller.saveCategoryOffer);
adminRoute.get('/editCategoryOffer/:id', adminCategoryOffercontroller.editCategoryOffer);
adminRoute.post('/editCategoryOffer/:id', adminCategoryOffercontroller.updateCategoryOffer);
adminRoute.delete('/deleteCategoryOffer/:id', adminCategoryOffercontroller.deleteCategoryOffer);


///////////////////



adminRoute.get('/salesReport', adminSalesControllers.renderSalesReport);



adminRoute.get('/dashboard', chartController.renderDashboard)

adminRoute.get('/sales-data', async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: 'items.productId',
                populate: { path: 'category' } // Ensure category is populated
            })
            .populate('user');
        const timeframe = req.query.timeframe || 'day'; // Default to 'day'
        const salesData = processSalesData(orders, timeframe);
        res.json(salesData);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
});


function processSalesData(orders, timeframe) {
    const data = {
        labels: [],
        sales: [],
        returns: [],
        cancellations: [],
        categories: {},
        products: {}
    };

    orders.forEach(order => {
        const date = new Date(order.createdAt);
        let label;
        switch (timeframe) {
            case 'day':
                label = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
                break;
            case 'week':
                const startOfWeek = new Date(date.setDate(date.getDate() - date.getDay()));
                label = `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}-${startOfWeek.getDate()}`;
                break;
            case 'month':
                label = `${date.getFullYear()}-${date.getMonth() + 1}`;
                break;
            case 'year':
                label = date.getFullYear();
                break;
        }

        const index = data.labels.indexOf(label);
        if (index === -1) {
            data.labels.push(label);
            data.sales.push(0);
            data.returns.push(0);
            data.cancellations.push(0);
        }

        order.items.forEach(item => {
            if (index !== -1) {
                if (item.status === 'Cancelled') {
                    data.cancellations[index] += item.quantity;
                } else if (item.status === 'Returned') {
                    data.returns[index] += item.quantity;
                } else {
                    data.sales[index] += item.quantity;
                }
            }

            const categoryName = item.productId.category.name; // Access category name
            const productName = item.productId.name;

            if (!data.categories[categoryName]) {
                data.categories[categoryName] = 0;
            }
            data.categories[categoryName] += item.quantity;

            if (!data.products[item.productId._id]) {
                data.products[item.productId._id] = {
                    name: productName,
                    sales: 0
                };
            }
            data.products[item.productId._id].sales += item.quantity;
        });
    });

    data.topCategories = Object.entries(data.categories)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    data.topProducts = Object.entries(data.products)
        .map(([id, { name, sales }]) => ({ id, name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

    return data;
}

module.exports = adminRoute
