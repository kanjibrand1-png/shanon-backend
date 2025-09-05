const Order = require('../models/Order');
const Product = require('../models/Product');

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Total orders (all time)
    const totalOrders = await Order.countDocuments({});
    
    // Total revenue (all time) - only paid orders
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$subtotal' } } }
    ]);

    // This month's stats
    const monthOrders = await Order.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    
         const monthRevenue = await Order.aggregate([
       { $match: { 
         createdAt: { $gte: startOfMonth },
         paymentStatus: 'paid'
       } },
       { $group: { _id: null, total: { $sum: '$subtotal' } } }
     ]);

    // This year's stats
    const yearOrders = await Order.countDocuments({
      createdAt: { $gte: startOfYear }
    });
    
         const yearRevenue = await Order.aggregate([
       { $match: { 
         createdAt: { $gte: startOfYear },
         paymentStatus: 'paid'
       } },
       { $group: { _id: null, total: { $sum: '$subtotal' } } }
     ]);

    // Pending orders
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    
    // Low stock products
    const lowStockProducts = await Product.countDocuments({
      stock: { $lt: 10 }
    });

    // Recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber customer total status createdAt');

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.title',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 }
    ]);

         // Sales by country - only paid orders
     const salesByCountry = await Order.aggregate([
       { $match: { paymentStatus: 'paid' } },
       {
         $group: {
           _id: '$shippingCountry',
           orders: { $sum: 1 },
           revenue: { $sum: '$subtotal' }
         }
       },
       { $sort: { revenue: -1 } },
       { $limit: 10 }
     ]);

         // Payment method distribution
     const paymentMethods = await Order.aggregate([
       {
         $group: {
           _id: '$paymentMethod',
           count: { $sum: 1 },
           revenue: { $sum: '$subtotal' }
         }
       }
     ]);

    // Order status distribution
    const orderStatuses = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: {
          orders: totalOrders,
          revenue: totalRevenue[0]?.total || 0
        },
        month: {
          orders: monthOrders,
          revenue: monthRevenue[0]?.total || 0
        },
        year: {
          orders: yearOrders,
          revenue: yearRevenue[0]?.total || 0
        },
        pendingOrders,
        lowStockProducts,
        recentOrders,
        topProducts,
        salesByCountry,
        paymentMethods,
        orderStatuses
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

// Get sales over time
const getSalesOverTime = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let dateFormat;
    let groupId;
    
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupId = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'week':
        dateFormat = '%Y-W%U';
        groupId = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupId = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      default:
        dateFormat = '%Y-%m-%d';
        groupId = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          paymentStatus: 'paid'
        }
      },
             {
         $group: {
           _id: groupId,
           revenue: { $sum: '$subtotal' },
           orders: { $sum: 1 },
           averageOrderValue: { $avg: '$subtotal' }
         }
       },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        salesData,
        dateFormat,
        groupBy
      }
    });
  } catch (error) {
    console.error('Sales over time error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales data' });
  }
};

// Get analytics data
const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Product performance
    const productPerformance = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.title',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          averagePrice: { $avg: '$items.price' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Geographic sales
    const geographicSales = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$shippingCountry',
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Customer analytics
    const customerAnalytics = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$customer.email',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    // Payment method analysis
    const paymentAnalysis = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      }
    ]);

    // Order status analysis
    const statusAnalysis = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      }
    ]);

    // Daily trends
    const dailyTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        productPerformance,
        geographicSales,
        customerAnalytics,
        paymentAnalysis,
        statusAnalysis,
        dailyTrends
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics data' });
  }
};

// Get real-time metrics
const getRealTimeMetrics = async (req, res) => {
  try {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Orders in last hour
    const lastHourOrders = await Order.countDocuments({
      createdAt: { $gte: lastHour }
    });

    // Revenue in last hour
    const lastHourRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: lastHour } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Orders in last 24 hours
    const last24HoursOrders = await Order.countDocuments({
      createdAt: { $gte: last24Hours }
    });

    // Revenue in last 24 hours
    const last24HoursRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: last24Hours } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Pending orders count
    const pendingOrdersCount = await Order.countDocuments({ status: 'pending' });

    // Low stock alerts
    const lowStockCount = await Product.countDocuments({
      stock: { $lt: 10 }
    });

    res.json({
      success: true,
      data: {
        lastHour: {
          orders: lastHourOrders,
          revenue: lastHourRevenue[0]?.total || 0
        },
        last24Hours: {
          orders: last24HoursOrders,
          revenue: last24HoursRevenue[0]?.total || 0
        },
        pendingOrders: pendingOrdersCount,
        lowStockAlerts: lowStockCount
      }
    });
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch real-time metrics' });
  }
};

// Get product performance analytics
const getProductPerformance = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const productPerformance = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.title',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          averagePrice: { $avg: '$items.price' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const summary = {
      totalProducts: productPerformance.length,
      totalRevenue: productPerformance.reduce((sum, product) => sum + product.totalRevenue, 0),
      totalUnitsSold: productPerformance.reduce((sum, product) => sum + product.totalSold, 0),
      averagePrice: productPerformance.reduce((sum, product) => sum + product.averagePrice, 0) / productPerformance.length
    };

    res.json({
      success: true,
      data: {
        products: productPerformance,
        summary
      }
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product performance data' });
  }
};

// Get order analytics
const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Order status distribution
    const orderStatusDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$subtotal' }
        }
      },
      {
        $addFields: {
          status: '$_id',
          percentage: { $multiply: [{ $divide: ['$count', { $sum: '$count' }] }, 100] }
        }
      },
      { $project: { _id: 0 } }
    ]);

    // Payment method distribution
    const paymentMethodDistribution = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$subtotal' }
        }
      },
      {
        $addFields: {
          method: '$_id',
          percentage: { $multiply: [{ $divide: ['$count', { $sum: '$count' }] }, 100] }
        }
      },
      { $project: { _id: 0 } }
    ]);

    // Daily order trends
    const dailyOrderTrends = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$subtotal' },
          averageOrderValue: { $avg: '$subtotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Summary statistics
    const summary = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$subtotal' },
          averageOrderValue: { $avg: '$subtotal' },
          pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orderStatusDistribution,
        paymentMethodDistribution,
        dailyOrderTrends,
        summary: summary[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          pendingOrders: 0,
          paidOrders: 0
        }
      }
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order analytics data' });
  }
};

// Get sales by gender (placeholder - since Shanon doesn't track gender)
const getSalesByGender = async (req, res) => {
  try {
    // Since Shanon doesn't track customer gender, return empty data
    res.json({
      success: true,
      data: {
        genders: [],
        summary: {
          totalSales: 0,
          totalCustomers: 0,
          averageOrderValue: 0
        }
      }
    });
  } catch (error) {
    console.error('Sales by gender error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sales by gender data' });
  }
};

// Get geographic sales
const getGeographicSales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Sales by country
    const countries = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: '$shippingCountry',
          orders: { $sum: 1 },
          revenue: { $sum: '$subtotal' },
          averageOrderValue: { $avg: '$subtotal' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Sales by city
    const cities = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: '$shippingAddress.city',
          orders: { $sum: 1 },
          revenue: { $sum: '$subtotal' },
          averageOrderValue: { $avg: '$subtotal' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 20 }
    ]);

    // Summary
    const summary = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: null,
          totalCountries: { $addToSet: '$shippingCountry' },
          totalCities: { $addToSet: '$shippingAddress.city' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$subtotal' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        countries,
        cities,
        summary: {
          totalCountries: summary[0]?.totalCountries?.length || 0,
          totalCities: summary[0]?.totalCities?.length || 0,
          totalOrders: summary[0]?.totalOrders || 0,
          totalRevenue: summary[0]?.totalRevenue || 0
        }
      }
    });
  } catch (error) {
    console.error('Geographic sales error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch geographic sales data' });
  }
};

// Get customer analytics
const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // Top customers by revenue
    const topCustomers = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: {
            email: '$customer.email',
            firstName: '$customer.firstName',
            lastName: '$customer.lastName'
          },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$subtotal' },
          averageOrderValue: { $avg: '$subtotal' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    // Customer segments
    const customerSegments = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: '$customer.email',
          totalSpent: { $sum: '$subtotal' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $addFields: {
          segment: {
            $switch: {
              branches: [
                { case: { $gte: ['$totalSpent', 1000] }, then: 'VIP' },
                { case: { $gte: ['$totalSpent', 500] }, then: 'Premium' },
                { case: { $gte: ['$totalSpent', 100] }, then: 'Regular' }
              ],
              default: 'New'
            }
          }
        }
      },
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalSpent' },
          averageOrderValue: { $avg: '$totalSpent' }
        }
      }
    ]);

    // Customer retention
    const customerRetention = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: start, $lte: end },
        paymentStatus: 'paid'
      }},
      {
        $group: {
          _id: '$customer.email',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$subtotal' },
          firstOrder: { $min: '$createdAt' },
          lastOrder: { $max: '$createdAt' }
        }
      },
      {
        $addFields: {
          isReturning: { $gt: ['$orderCount', 1] }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          returningCustomers: { $sum: { $cond: ['$isReturning', 1, 0] } },
          newCustomers: { $sum: { $cond: ['$isReturning', 0, 1] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        topCustomers,
        customerSegments,
        customerRetention: customerRetention[0] || {
          totalCustomers: 0,
          returningCustomers: 0,
          newCustomers: 0
        }
      }
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customer analytics data' });
  }
};

module.exports = {
  getDashboardStats,
  getSalesOverTime,
  getAnalytics,
  getRealTimeMetrics,
  getProductPerformance,
  getOrderAnalytics,
  getSalesByGender,
  getGeographicSales,
  getCustomerAnalytics
};

