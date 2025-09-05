const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const SuperAdmin = require('./models/SuperAdmin');
const Product = require('./models/Product');
require('dotenv').config();

const migrateImageFields = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Migrate Admin records
    console.log('\n--- Migrating Admin records ---');
    const adminResult = await Admin.updateMany(
      { image: '' },
      { $set: { image: null } }
    );
    console.log(`Updated ${adminResult.modifiedCount} Admin records`);

    // Migrate SuperAdmin records
    console.log('\n--- Migrating SuperAdmin records ---');
    const superAdminResult = await SuperAdmin.updateMany(
      { image: '' },
      { $set: { image: null } }
    );
    console.log(`Updated ${superAdminResult.modifiedCount} SuperAdmin records`);

    // Migrate Product hoverImage records
    console.log('\n--- Migrating Product hoverImage records ---');
    const productResult = await Product.updateMany(
      { hoverImage: '' },
      { $set: { hoverImage: null } }
    );
    console.log(`Updated ${productResult.modifiedCount} Product records`);

    // Verify the changes
    console.log('\n--- Verification ---');
    
    const adminWithEmptyImages = await Admin.countDocuments({ image: '' });
    const superAdminWithEmptyImages = await SuperAdmin.countDocuments({ image: '' });
    const productsWithEmptyHoverImages = await Product.countDocuments({ hoverImage: '' });
    
    console.log(`Admins with empty image strings: ${adminWithEmptyImages}`);
    console.log(`SuperAdmins with empty image strings: ${superAdminWithEmptyImages}`);
    console.log(`Products with empty hoverImage strings: ${productsWithEmptyHoverImages}`);

    const adminWithNullImages = await Admin.countDocuments({ image: null });
    const superAdminWithNullImages = await SuperAdmin.countDocuments({ image: null });
    const productsWithNullHoverImages = await Product.countDocuments({ hoverImage: null });
    
    console.log(`Admins with null image values: ${adminWithNullImages}`);
    console.log(`SuperAdmins with null image values: ${superAdminWithNullImages}`);
    console.log(`Products with null hoverImage values: ${productsWithNullHoverImages}`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateImageFields();
