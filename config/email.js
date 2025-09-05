const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials not configured. Please set EMAIL_FROM and EMAIL_PASSWORD in your environment variables.');
  }

  // Use LWS SMTP settings
  const config = {
    host: 'mail.shanon-technologies.com', // LWS mail server
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📧 Creating email transporter with LWS SMTP');
  return nodemailer.createTransport(config);
};

// Check if email is configured
const isEmailConfigured = () => {
  return !!(process.env.EMAIL_FROM && process.env.EMAIL_PASSWORD);
};

// Generate HTML table for order items (mobile responsive)
const generateOrderTableHTML = (items, currency) => {
  let tableHTML = `
    <div style="margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 14px; min-width: 100%;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px 4px; text-align: left; font-weight: bold; font-size: 12px; word-wrap: break-word;">Produit</th>
            <th style="border: 1px solid #ddd; padding: 8px 4px; text-align: center; font-weight: bold; font-size: 12px;">Taille</th>
            <th style="border: 1px solid #ddd; padding: 8px 4px; text-align: center; font-weight: bold; font-size: 12px;">Qté</th>
            <th style="border: 1px solid #ddd; padding: 8px 4px; text-align: right; font-weight: bold; font-size: 12px;">Prix</th>
            <th style="border: 1px solid #ddd; padding: 8px 4px; text-align: right; font-weight: bold; font-size: 12px;">Total</th>
          </tr>
        </thead>
        <tbody>
  `;

  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : 'TND';
    
    tableHTML += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px 4px; font-size: 12px; word-wrap: break-word; max-width: 120px;">${item.title}</td>
        <td style="border: 1px solid #ddd; padding: 8px 4px; text-align: center; font-size: 12px;">${item.size || item.variant || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px 4px; text-align: center; font-size: 12px;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px 4px; text-align: right; font-size: 12px;">${currencySymbol}${item.price.toFixed(2)}</td>
        <td style="border: 1px solid #ddd; padding: 8px 4px; text-align: right; font-size: 12px;">${currencySymbol}${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  tableHTML += `
      </tbody>
    </table>
  </div>
  `;

  return tableHTML;
};

// Generate complete email HTML
const generateOrderEmailHTML = (orderData, isClientEmail = true) => {
  const currencySymbol = orderData.currency === 'EUR' ? '€' : orderData.currency === 'USD' ? '$' : 'TND';
  const orderTableHTML = generateOrderTableHTML(orderData.items, orderData.currency);
  
  // Calculate subtotal
  const subtotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = orderData.shippingFee || 0;
  const total = subtotal + shippingFee;

  const emailTitle = isClientEmail 
    ? 'Confirmation de votre commande - Shanon Technologies'
    : 'Nouvelle commande reçue - Détails de la commande';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailTitle}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 10px; }
        .header { background-color: #1a365d; color: white; padding: 15px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 15px; background-color: #f9f9f9; }
        .customer-info { background-color: white; padding: 12px; margin: 15px 0; border-radius: 5px; }
        .order-summary { background-color: white; padding: 12px; margin: 15px 0; border-radius: 5px; }
        .order-info { background-color: white; padding: 12px; margin: 15px 0; border-radius: 5px; }
        .client-message, .team-message { background-color: white; padding: 12px; margin: 15px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 11px; }
        .total-row { font-weight: bold; background-color: #f8f9fa; }
        .shipping-row { background-color: #f8f9fa; }
        
        /* Mobile responsiveness */
        @media only screen and (max-width: 600px) {
          .container { padding: 5px; }
          .header { padding: 10px; }
          .header h1 { font-size: 20px; }
          .content { padding: 10px; }
          .customer-info, .order-summary, .order-info, .client-message, .team-message { 
            padding: 10px; 
            margin: 10px 0; 
          }
          .footer { padding: 10px; font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isClientEmail ? 'Shanon Technologies' : 'Shanon Technologies - Nouvelle Commande Reçue'}</h1>
        </div>
        
        <div class="content">
          <h2>${emailTitle}</h2>
          
          <div class="customer-info">
            <h3>Informations client :</h3>
            <p><strong>Client :</strong> ${orderData.customer.firstName} ${orderData.customer.lastName}</p>
            <p><strong>Email :</strong> ${orderData.customer.email || 'Non fourni'}</p>
            <p><strong>Téléphone :</strong> ${orderData.customer.phone || 'Non fourni'}</p>
            <p><strong>Adresse :</strong> ${orderData.shippingAddress.address || 'Non fournie'}</p>
            <p><strong>Ville :</strong> ${orderData.shippingAddress.city || 'Non fournie'}</p>
            <p><strong>Pays :</strong> ${orderData.shippingAddress.country || 'Non fourni'}</p>
          </div>

          <div class="order-summary">
            <h3>Détails de la commande :</h3>
            ${orderTableHTML}
            
            <div style="text-align: right; margin-top: 20px;">
              <p style="margin: 5px 0;"><strong>Sous-total :</strong> ${currencySymbol}${subtotal.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Livraison :</strong> ${currencySymbol}${shippingFee.toFixed(2)}</p>
              <p style="font-size: 18px; font-weight: bold; color: #1a365d; margin: 10px 0;">Total payé : ${currencySymbol}${total.toFixed(2)}</p>
            </div>
          </div>

          <div class="order-info">
            <p><strong>Numéro de commande :</strong> ${orderData.orderNumber || orderData._id}</p>
            <p><strong>Date de commande :</strong> ${new Date(orderData.createdAt).toLocaleString('fr-FR')}</p>
            <p><strong>Méthode de paiement :</strong> ${orderData.paymentMethod === 'delivery' ? 'Paiement à la livraison' : 'Paiement en ligne'}</p>
            <p><strong>Statut :</strong> ${orderData.status === 'pending' ? 'En cours' : orderData.status}</p>
          </div>

          ${isClientEmail ? `
            <div class="client-message">
              <p>Merci pour votre commande !</p>
              <p>Quelqu'un de l'équipe de livraison vous contactera bientôt sur ce téléphone. Restez à proximité !</p>
            </div>
          ` : `
            <div class="team-message">
              <p>Une nouvelle commande a été reçue et nécessite votre attention.</p>
            </div>
          `}
        </div>
        
        <div class="footer">
          <p>© 2025 Shanon Technologies. Tous droits réservés.</p>
          <p>Pour toute question, contactez-nous à ${process.env.TEAM_EMAIL || 'support@shanon-technologies.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send order confirmation email to client
const sendOrderConfirmationToClient = async (orderData) => {
  try {
    // If client email not provided, skip sending to client gracefully
    if (!orderData?.customer?.email) {
      console.log('ℹ️ Skipping client confirmation email: no customer email provided');
      return { skipped: true };
    }

    console.log('📧 Sending order confirmation email to client:', orderData.customer.email);
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: orderData.customer.email,
      subject: 'Confirmation de votre commande - Shanon Technologies',
      html: generateOrderEmailHTML(orderData, true)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent to client:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending order confirmation email to client:', error.message);
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Check your email credentials.');
    }
    throw error;
  }
};

// Send order notification email to team
const sendOrderNotificationToTeam = async (orderData) => {
  try {
    const teamEmail = process.env.TEAM_EMAIL || process.env.EMAIL_FROM;
    console.log('📧 Sending order notification email to team:', teamEmail);
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: teamEmail,
      subject: 'Nouvelle commande reçue - Détails de la commande',
      html: generateOrderEmailHTML(orderData, false)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Order notification email sent to team:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending order notification email to team:', error.message);
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Check your email credentials.');
    }
    throw error;
  }
};

// Send both emails for a new order
const sendOrderEmails = async (orderData) => {
  try {
    // Send email to client (may be skipped if no email)
    try {
      await sendOrderConfirmationToClient(orderData);
    } catch (clientErr) {
      // Don't fail overall if client email fails; log and continue
      console.error('Warning: client confirmation email failed:', clientErr.message);
    }

    // Send email to team
    await sendOrderNotificationToTeam(orderData);

    console.log('All order emails processed');
    return true;
  } catch (error) {
    console.error('Error sending order emails:', error);
    throw error;
  }
};

// Generate restock notification email HTML
const generateRestockEmailHTML = (notification, product) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Produit de nouveau en stock - Shanon Technologies</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 10px; }
        .header { background-color: #1a365d; color: white; padding: 15px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 15px; background-color: #f9f9f9; }
        .product-info { background-color: white; padding: 12px; margin: 15px 0; border-radius: 5px; text-align: center; }
        .cta-button { display: inline-block; background-color: #ffd700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 11px; }
        
        @media only screen and (max-width: 600px) {
          .container { padding: 5px; }
          .header { padding: 10px; }
          .header h1 { font-size: 20px; }
          .content { padding: 10px; }
          .product-info { padding: 10px; margin: 10px 0; }
          .footer { padding: 10px; font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Shanon Technologies</h1>
        </div>
        
        <div class="content">
          <h2>🎉 Bonne nouvelle !</h2>
          
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>est de nouveau en stock !</p>
            <p>Ne manquez pas cette occasion de l'ajouter à votre collection.</p>
            
            <a href="${process.env.FRONT_URL || 'http://localhost:3000'}/shop" class="cta-button">
              Acheter maintenant
            </a>
          </div>

          <p>Vous avez reçu cet email car vous vous êtes inscrit aux notifications de stock pour ce produit.</p>
          
          <p>Merci de votre intérêt pour Shanon Technologies !</p>
        </div>
        
        <div class="footer">
          <p>© 2025 Shanon Technologies. Tous droits réservés.</p>
          <p>Pour toute question, contactez-nous à ${process.env.TEAM_EMAIL || 'support@shanon-technologies.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send restock notification email
const sendRestockNotification = async (notification, product) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: notification.email,
      subject: `${product.name} est de nouveau en stock ! - Shanon Technologies`,
      html: generateRestockEmailHTML(notification, product)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Restock notification email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending restock notification email:', error);
    throw error;
  }
};

// Generate newsletter email HTML
const generateNewsletterEmailHTML = (subject, content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 10px; }
        .header { background-color: #1a365d; color: white; padding: 15px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 15px; background-color: #f9f9f9; }
        .newsletter-content { background-color: white; padding: 20px; margin: 15px 0; border-radius: 5px; }
        .unsubscribe-section { background-color: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; text-align: center; }
        .unsubscribe-link { color: #666; text-decoration: none; font-size: 12px; }
        .footer { text-align: center; padding: 15px; color: #666; font-size: 11px; }
        
        @media only screen and (max-width: 600px) {
          .container { padding: 5px; }
          .header { padding: 10px; }
          .header h1 { font-size: 20px; }
          .content { padding: 10px; }
          .newsletter-content, .unsubscribe-section { padding: 15px; margin: 10px 0; }
          .footer { padding: 10px; font-size: 10px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Shanon Technologies</h1>
        </div>
        
        <div class="content">
          <div class="newsletter-content">
            ${content}
          </div>

          <div class="unsubscribe-section">
            <p style="margin-bottom: 10px; color: #666; font-size: 12px;">
              Vous pouvez vous désinscrire à tout moment en cliquant sur le lien ci-dessous :
            </p>
            <a href="${process.env.FRONT_URL || 'http://localhost:3000'}/unsubscribe" class="unsubscribe-link">
              Se désinscrire de la newsletter
            </a>
          </div>
        </div>
        
        <div class="footer">
          <p>© 2025 Shanon Technologies. Tous droits réservés.</p>
          <p>Pour toute question, contactez-nous à ${process.env.TEAM_EMAIL || 'support@shanon-technologies.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send newsletter to a single subscriber
const sendNewsletterEmail = async (email, subject, content) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: subject,
      html: generateNewsletterEmailHTML(subject, content)
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Newsletter email sent to ${email}:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`Error sending newsletter email to ${email}:`, error);
    throw error;
  }
};

// Send email to subscribers
const sendEmailToSubscribers = async (subscribers, subject, content) => {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping newsletter send');
    return { success: false, message: 'Email not configured' };
  }

  const transporter = createTransporter();
  const results = [];

  for (const subscriber of subscribers) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: subscriber.email,
        subject: subject,
        html: generateNewsletterEmailHTML(subject, content)
      };

      const result = await transporter.sendMail(mailOptions);
      results.push({
        email: subscriber.email,
        success: true,
        messageId: result.messageId
      });
    } catch (error) {
      console.error(`Failed to send email to ${subscriber.email}:`, error);
      results.push({
        email: subscriber.email,
        success: false,
        error: error.message
      });
    }
  }

  return {
    success: true,
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results
  };
};

// Generic email sending function
const sendEmail = async (to, subject, html) => {
  if (!isEmailConfigured()) {
    throw new Error('Email not configured');
  }

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: to,
    subject: subject,
    html: html
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = {
  createTransporter,
  isEmailConfigured,
  sendOrderConfirmationToClient,
  sendOrderNotificationToTeam,
  sendOrderEmails,
  sendRestockNotification,
  sendNewsletterEmail,
  sendEmailToSubscribers,
  sendEmail,
  generateOrderEmailHTML,
  generateRestockEmailHTML,
  generateNewsletterEmailHTML
};
