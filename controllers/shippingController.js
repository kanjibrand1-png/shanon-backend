const Shipping = require('../models/Shipping');

// Get all shipping fees
const getAllShippingFees = async (req, res) => {
  try {
    const shippingFees = await Shipping.find().sort({ country: 1 });
    res.json(shippingFees);
  } catch (error) {
    console.error('Error fetching shipping fees:', error);
    res.status(500).json({ error: 'Failed to fetch shipping fees' });
  }
};

// Get active shipping countries for dropdown
const getActiveShippingCountries = async (req, res) => {
  try {
    const countries = await Shipping.find({ isActive: true })
      .select('country shippingFee currency')
      .sort({ country: 1 });
    res.json(countries);
  } catch (error) {
    console.error('Error fetching active shipping countries:', error);
    res.status(500).json({ error: 'Failed to fetch shipping countries' });
  }
};

// Get shipping fee by ID
const getShippingFeeById = async (req, res) => {
  try {
    const shippingFee = await Shipping.findById(req.params.id);
    if (!shippingFee) {
      return res.status(404).json({ error: 'Shipping fee not found' });
    }
    res.json(shippingFee);
  } catch (error) {
    console.error('Error fetching shipping fee:', error);
    res.status(500).json({ error: 'Failed to fetch shipping fee' });
  }
};

// Create new shipping fee
const createShippingFee = async (req, res) => {
  try {
    console.log('Creating shipping fee with data:', req.body);
    console.log('User info:', req.user);
    
    const { country, shippingFee, currency, isActive } = req.body;
    
    // Validate required fields
    if (!country || !shippingFee) {
      return res.status(400).json({ error: 'Country and shipping fee are required' });
    }

    // Check if shipping fee already exists for this country
    const existingFee = await Shipping.findOne({ country: country.trim() });
    if (existingFee) {
      return res.status(400).json({ error: 'Shipping fee already exists for this country' });
    }

    const newShippingFee = new Shipping({
      country: country.trim(),
      shippingFee: parseFloat(shippingFee),
      currency: currency || 'EUR',
      isActive: isActive === true || isActive === 'true' || isActive === 'Activ', // Handle string values
      createdBy: req.user.id || req.user._id, // Handle both id and _id
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    });

    await newShippingFee.save();
    res.status(201).json(newShippingFee);
  } catch (error) {
    console.error('Error creating shipping fee:', error);
    res.status(500).json({ error: 'Failed to create shipping fee' });
  }
};

// Update shipping fee
const updateShippingFee = async (req, res) => {
  try {
    const { country, shippingFee, currency, isActive } = req.body;
    
    // Validate required fields
    if (!country || !shippingFee) {
      return res.status(400).json({ error: 'Country and shipping fee are required' });
    }

    const shippingFeeDoc = await Shipping.findById(req.params.id);
    if (!shippingFeeDoc) {
      return res.status(404).json({ error: 'Shipping fee not found' });
    }

    // Check if another shipping fee exists with the same country (excluding current one)
    const existingFee = await Shipping.findOne({ 
      country: country.trim(), 
      _id: { $ne: req.params.id } 
    });
    if (existingFee) {
      return res.status(400).json({ error: 'Shipping fee already exists for this country' });
    }

    shippingFeeDoc.country = country.trim();
    shippingFeeDoc.shippingFee = parseFloat(shippingFee);
    shippingFeeDoc.currency = currency || 'EUR';
    shippingFeeDoc.isActive = isActive === true || isActive === 'true' || isActive === 'Activ';

    await shippingFeeDoc.save();
    res.json(shippingFeeDoc);
  } catch (error) {
    console.error('Error updating shipping fee:', error);
    res.status(500).json({ error: 'Failed to update shipping fee' });
  }
};

// Delete shipping fee
const deleteShippingFee = async (req, res) => {
  try {
    const shippingFee = await Shipping.findByIdAndDelete(req.params.id);
    if (!shippingFee) {
      return res.status(404).json({ error: 'Shipping fee not found' });
    }
    res.json({ message: 'Shipping fee deleted successfully' });
  } catch (error) {
    console.error('Error deleting shipping fee:', error);
    res.status(500).json({ error: 'Failed to delete shipping fee' });
  }
};

// Get shipping fee by country
const getShippingFeeByCountry = async (req, res) => {
  try {
    const { country } = req.params;
    const shippingFee = await Shipping.findOne({ 
      country: country,
      isActive: true 
    });
    
    if (!shippingFee) {
      return res.status(404).json({ error: 'Shipping fee not found for this country' });
    }
    
    res.json(shippingFee);
  } catch (error) {
    console.error('Error fetching shipping fee by country:', error);
    res.status(500).json({ error: 'Failed to fetch shipping fee' });
  }
};

module.exports = {
  getAllShippingFees,
  getActiveShippingCountries,
  getShippingFeeById,
  createShippingFee,
  updateShippingFee,
  deleteShippingFee,
  getShippingFeeByCountry
};
