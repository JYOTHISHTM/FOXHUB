const Order = require('../model/orderModel');
const moment = require('moment');
const ProductOffer = require('../model/productOfferModel');
const CategoryOffer = require('../model/categoryOfferModel');

const Coupon= require('../model/couponModel');
const User = require('../model/userModel');




const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');



const renderSalesReport = async (req, res) => {
  try {
    let { filter, startDate, endDate, page } = req.query;
    filter = filter || 'day';
    page = parseInt(page) || 1;
    const limit = 3;

    let start;
    let end = moment().endOf('day');

    if (filter === 'custom' && startDate && endDate) {
      start = moment(startDate).startOf('day');
      end = moment(endDate).endOf('day');
    } else {
      switch (filter) {
        case 'week':
          start = moment().startOf('week');
          break;
        case 'month':
          start = moment().startOf('month');
          break;
        case 'day':
        default:
          start = moment().startOf('day');
          break;
      }
    }

    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      status: { $nin: ['Cancelled', 'Returned', 'Payment Failed', 'Pending'] }
    });

    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find({
      createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      status: { $nin: ['Cancelled', 'Returned', 'Payment Failed', 'Pending'] }
    })
      .populate('items.productId')
      .populate('user')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    if (totalOrders === 0) {
      return res.render('salesReport', {
        reportData: [],
        overallSalesCount: 0,
        overallAmount: 0,
        overallDiscount: 0,
        overallProfit: 0,
        filter,
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        currentPage: page,
        totalPages: totalPages
      });
    }

    const reportData = await Promise.all(orders.map(async (order) => {
      let totalDiscount = 0;
      let finalPrice = 0;
      let orderAmount = 0;

      for (const item of order.items) {
        const product = item.productId;
        const productOffer = await ProductOffer.findOne({ product: product._id });
        const categoryOffer = await CategoryOffer.findOne({ category: product.category });

        console.log('Product:', product.name, 'Price:', product.price);
        console.log('Product Offer:', productOffer);
        console.log('Category Offer:', categoryOffer);

        let itemDiscount = 0;
        let itemPrice = product.price * item.quantity;

        if (productOffer) {
          itemDiscount = Math.max(itemDiscount, product.price * (productOffer.discountPercentage / 100));
        }

        if (categoryOffer) {
          itemDiscount = Math.max(itemDiscount, product.price * (categoryOffer.discountPercentage / 100));
        }

        console.log('Item Discount:', itemDiscount);

        totalDiscount += itemDiscount * item.quantity;
        finalPrice += (product.price - itemDiscount) * item.quantity;
        orderAmount += itemPrice;
      }

      if (order.coupon) {
        console.log('Order Coupon:', order.coupon);

        const coupon = await Coupon.findOne({ code: order.coupon });
        let couponDiscount = 0;

        if (coupon && coupon.discountPercentage) {
          couponDiscount = (orderAmount * coupon.discountPercentage) / 100;
        } else {
          couponDiscount = 0;
        }

        console.log('Coupon Discount:', couponDiscount);

        totalDiscount += couponDiscount;
        finalPrice -= couponDiscount;
      }

      return {
        number: order._id,
        name: order.user.name,
        product: order.items.map(item => item.productId.name).join(', '),
        amount: orderAmount,
        discount: parseFloat(totalDiscount.toFixed(2)),
        paymentMethod: order.paymentMethod,
        finalPrice: parseFloat(finalPrice.toFixed(2)),
        status: order.status
      };
    }));

    const allOrders = await Order.find({
      createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      status: { $nin: ['Cancelled', 'Returned', 'Payment Failed', 'Pending'] }
    }).populate('items.productId');

    const overallSalesCount = allOrders.length;
    let overallAmount = 0;
    let overallDiscount = 0;
    let overallProfit = 0;

    for (const order of allOrders) {
      let orderAmount = 0;
      let orderDiscount = 0;

      for (const item of order.items) {
        const product = item.productId;
        const productOffer = await ProductOffer.findOne({ product: product._id });
        const categoryOffer = await CategoryOffer.findOne({ category: product.category });

        let itemPrice = product.price * item.quantity;
        let itemDiscount = 0;

        if (productOffer) {
          itemDiscount = Math.max(itemDiscount, product.price * (productOffer.discountPercentage / 100));
        }

        if (categoryOffer) {
          itemDiscount = Math.max(itemDiscount, product.price * (categoryOffer.discountPercentage / 100));
        }

        orderAmount += itemPrice;
        orderDiscount += itemDiscount * item.quantity;
      }

      if (order.coupon) {
        const coupon = await Coupon.findOne({ code: order.coupon });
        let couponDiscount = 0;

        if (coupon && coupon.discountPercentage) {
          couponDiscount = (orderAmount * coupon.discountPercentage) / 100;
        } else {
          couponDiscount = 0;
        }

        orderDiscount += couponDiscount;
      }

      overallAmount += orderAmount;
      overallDiscount += orderDiscount;
    }

    overallProfit = overallAmount - overallDiscount;

    res.render('salesReport', {
      reportData,
      overallSalesCount,
      overallAmount: parseFloat(overallAmount.toFixed(2)),
      overallDiscount: parseFloat(overallDiscount.toFixed(2)),
      overallProfit: parseFloat(overallProfit.toFixed(2)),
      filter,
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      currentPage: page,
      totalPages: totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

















const filterSalesReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.body;
    let query = `/admin/salesReport?filter=${filter}&page=1`;
    if (filter === 'custom') {
      query += `&startDate=${startDate}&endDate=${endDate}`;
    }
    res.redirect(query);
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};




const downloadSalesReportPDF = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    const orders = await getFilteredOrders(filter, startDate, endDate);
    const reportData = await generateReportData(orders);

    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

    doc.pipe(res);

    // Add title
    doc.fontSize(18).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Table headers
    const headers = ['Number', 'Name', 'Product', 'Amount', 'Discount', 'Payment', 'Final Price', 'Status'];
    const columnWidth = 70;
    
    let yPosition = 100;

    // Draw table headers
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
      doc.rect(30 + (i * columnWidth), yPosition, columnWidth, 20).stroke();
      doc.text(header, 35 + (i * columnWidth), yPosition + 5, { width: columnWidth - 10, align: 'left' });
    });

    // Draw table rows
    doc.font('Helvetica').fontSize(8);
    reportData.forEach((row, rowIndex) => {
      yPosition = 120 + (rowIndex * 20);
      
      if (yPosition > 700) {  // Start a new page if we're near the bottom
        doc.addPage();
        yPosition = 50;
        
        // Redraw headers on new page
        doc.font('Helvetica-Bold').fontSize(10);
        headers.forEach((header, i) => {
          doc.rect(30 + (i * columnWidth), yPosition, columnWidth, 20).stroke();
          doc.text(header, 35 + (i * columnWidth), yPosition + 5, { width: columnWidth - 10, align: 'left' });
        });
        yPosition += 20;
        doc.font('Helvetica').fontSize(8);
      }

      headers.forEach((_, i) => {
        doc.rect(30 + (i * columnWidth), yPosition, columnWidth, 20).stroke();
      });

      doc.text(row.number.toString(), 35, yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.name, 35 + columnWidth, yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.product, 35 + (columnWidth * 2), yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.amount.toString(), 35 + (columnWidth * 3), yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.discount.toString(), 35 + (columnWidth * 4), yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.paymentMethod, 35 + (columnWidth * 5), yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.finalPrice.toString(), 35 + (columnWidth * 6), yPosition + 5, { width: columnWidth - 10, align: 'left' });
      doc.text(row.status, 35 + (columnWidth * 7), yPosition + 5, { width: columnWidth - 10, align: 'left' });
    });

    // Calculate overall summary
    const overallSalesCount = reportData.length;
    const overallAmount = reportData.reduce((sum, row) => sum + row.amount, 0);
    const overallDiscount = reportData.reduce((sum, row) => sum + row.discount, 0);
    const overallProfit = reportData.reduce((sum, row) => sum + row.finalPrice, 0);

    // Add overall summary
    yPosition += 40;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Overall Sales Summary', 30, yPosition);
    yPosition += 20;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Overall Sales Count: ${overallSalesCount}`, 30, yPosition);
    yPosition += 15;
    doc.text(`Overall Amount: ${overallAmount.toFixed(2)}`, 30, yPosition);
    yPosition += 15;
    doc.text(`Overall Discount: ${overallDiscount.toFixed(2)}`, 30, yPosition);
    yPosition += 15;
    doc.text(`Overall Profit: ${overallProfit.toFixed(2)}`, 30, yPosition);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};



const downloadSalesReportExcel = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    const orders = await getFilteredOrders(filter, startDate, endDate);
    const reportData = await generateReportData(orders);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add title and info
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'Sales Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Mail: foxhub@gmail.com`;
    worksheet.getCell('A2').alignment = { horizontal: 'right' };

    worksheet.mergeCells('A3:H3');
    worksheet.getCell('A3').value = `Date: ${new Date().toLocaleDateString()}`;
    worksheet.getCell('A3').alignment = { horizontal: 'right' };

    // Add headers
    const headers = ['Number', 'Name', 'Product', 'Amount', 'Discount', 'Payment Method', 'Final Price', 'Status'];
    const headerRow = worksheet.addRow(headers);
    
    // Style the header row
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' }
      };
      cell.border = {
        top: {style:'thin'},
        left: {style:'thin'},
        bottom: {style:'thin'},
        right: {style:'thin'}
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });

    // Add data
    reportData.forEach((item, index) => {
      const row = worksheet.addRow([
        item.number,
        item.name,
        item.product,
        item.amount,
        item.discount,
        item.paymentMethod,
        item.finalPrice,
        item.status
      ]);

      // Style data rows
      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });

      // Alternate row colors for better readability
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        });
      }
    });

    // Adjust column widths
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    // Calculate overall summary
    const overallSalesCount = reportData.length;
    const overallAmount = reportData.reduce((sum, row) => sum + row.amount, 0);
    const overallDiscount = reportData.reduce((sum, row) => sum + row.discount, 0);
    const overallProfit = reportData.reduce((sum, row) => sum + row.finalPrice, 0);

    // Add overall summary
    const summaryStartRow = reportData.length + 7;
    worksheet.mergeCells(`A${summaryStartRow}:H${summaryStartRow}`);
    worksheet.getCell(`A${summaryStartRow}`).value = 'Overall Sales Summary';
    worksheet.getCell(`A${summaryStartRow}`).font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell(`A${summaryStartRow}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066CC' }
    };
    worksheet.getCell(`A${summaryStartRow}`).alignment = { horizontal: 'center' };

    const summaryData = [
      ['Overall Sales Count', overallSalesCount],
      ['Overall Amount', `${overallAmount.toFixed(2)}`],
      ['Overall Discount', `${overallDiscount.toFixed(2)}`],
      ['Overall Profit', `${overallProfit.toFixed(2)}`]
    ];

    summaryData.forEach((data, index) => {
      const row = worksheet.addRow(data);
      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin'},
          left: {style:'thin'},
          bottom: {style:'thin'},
          right: {style:'thin'}
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' }
          };
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

// Helper functions

async function getFilteredOrders(filter, startDate, endDate) {
  let start;
  let end = moment().endOf('day');

  if (filter === 'custom' && startDate && endDate) {
    start = moment(startDate).startOf('day');
    end = moment(endDate).endOf('day');
  } else {
    switch (filter) {
      case 'week':
        start = moment().startOf('week');
        break;
      case 'month':
        start = moment().startOf('month');
        break;
      case 'day':
      default:
        start = moment().startOf('day');
        break;
    }
  }

  return await Order.find({
    createdAt: { $gte: start.toDate(), $lte: end.toDate() },
    status: { $nin: ['Cancelled', 'Returned', 'Payment Failed', 'Pending'] }
  }).populate('items.productId').populate('user').sort({ createdAt: -1 });
}

async function generateReportData(orders) {
  return await Promise.all(orders.map(async (order) => {
    let totalDiscount = 0;
    let finalPrice = 0;

    for (const item of order.items) {
      const product = item.productId;
      const productOffer = await ProductOffer.findOne({ product: product._id });
      const categoryOffer = await CategoryOffer.findOne({ category: product.category });

      let itemDiscount = 0;
      let itemPrice = product.price * item.quantity;

      if (productOffer) {
        itemDiscount = Math.max(itemDiscount, itemPrice * (productOffer.discountPercentage / 100));
      }

      if (categoryOffer) {
        itemDiscount = Math.max(itemDiscount, itemPrice * (categoryOffer.discountPercentage / 100));
      }

      totalDiscount += itemDiscount;
      finalPrice += itemPrice - itemDiscount;
    }

    if (order.coupon) {
      totalDiscount += order.coupon.discountAmount;
      finalPrice -= order.coupon.discountAmount;
    }

    return {
      number: order._id,
      name: order.user.name,
      product: order.items.map(item => item.productId.name).join(', '),
      amount: order.totalAmount,
      discount: parseFloat(totalDiscount.toFixed(2)),
      paymentMethod: order.paymentMethod,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      status: order.status
    };
  }));
}

module.exports = {
  renderSalesReport,
  filterSalesReport,
  downloadSalesReportPDF,
  downloadSalesReportExcel
};
