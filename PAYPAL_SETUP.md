# PayPal Integration Setup Guide

## Overview
PayPal has been integrated across the site as a temporary solution before switching to VIPPS. The integration uses PayPal's JavaScript SDK for seamless checkout.

## Setup Instructions

### 1. Get PayPal Credentials

1. **Create/Login to PayPal Developer Account**
   - Go to [https://developer.paypal.com/dashboard/](https://developer.paypal.com/dashboard/)
   - Sign up or log in with your PayPal account

2. **Create a Sandbox App** (for testing)
   - Navigate to "Apps & Credentials"
   - Click "Create App"
   - Choose "Sandbox" environment
   - Give it a name (e.g., "Munken Theatre Test")
   - Copy your **Client ID** and **Secret**

3. **For Production** (when going live)
   - Switch to "Live" environment
   - Create a new app or use existing
   - Copy **Live Client ID** and **Secret**

### 2. Update Environment Variables

Update your `.env` file with your PayPal credentials:

```env
# PayPal Configuration
# For testing, use Sandbox credentials
# For production, use Live credentials
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_CLIENT_ID_HERE
PAYPAL_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

**Important:**
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is exposed to the client (prefix with `NEXT_PUBLIC_`)
- `PAYPAL_CLIENT_SECRET` should remain server-side only
- Use Sandbox credentials for development/testing
- Switch to Live credentials when deploying to production

### 3. Testing Payments

#### Sandbox Test Accounts
PayPal provides test accounts for development:

1. Go to [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. You'll see pre-created test buyer and seller accounts
3. Use test buyer credentials to make payments
4. Default test credentials:
   - Email: usually ends with `@personal.example.com`
   - Password: provided in dashboard

#### Test Cards (if using cards in sandbox)
- Visa: 4032039961566428
- MasterCard: 5425233430109903
- Discover: 6011000991366044
- AmEx: 378282246310005

### 4. Currency Support

Currently configured for **NOK (Norwegian Krone)**.

To change currency:
```typescript
<PayPalButton
  amount={amount}
  currency="NOK" // Change to USD, EUR, etc.
  ...
/>
```

Supported currencies: USD, EUR, GBP, CAD, AUD, NOK, SEK, DKK, etc.

## Integration Points

PayPal has been integrated into:

### ✅ 1. Ensemble Membership Payments
- **File:** `/app/ensemble/[slug]/bestill/page.tsx`
- **Component:** `PayPalButton`
- **Features:**
  - Discount code support
  - Real-time price calculation
  - Payment confirmation
  - Database updates on success

### 🔄 2. Show Ticket Bookings (TODO)
- **File:** `/app/bestill/[showId]/page.tsx`
- **Status:** Needs integration

### 🔄 3. Recording Purchases (TODO)
- **Component:** `RecordingCheckout`
- **Status:** Needs integration

## Component Usage

The `PayPalButton` component is reusable:

```typescript
import { PayPalButton } from "@/components/payment/paypal-button"

<PayPalButton
  amount={100} // Amount in NOK
  currency="NOK"
  description="Product description"
  onSuccess={async (details) => {
    // Handle successful payment
    console.log("Payment successful:", details)
    // Update database, redirect, etc.
  }}
  onError={(error) => {
    // Handle payment error
    console.error("Payment failed:", error)
  }}
  onCancel={() => {
    // Handle user cancellation
    console.log("Payment cancelled")
  }}
/>
```

## Important Notes

### Security
- ✅ Client ID is public (safe to expose)
- ❌ Secret key must remain server-side only
- ✅ PayPal handles all sensitive payment data
- ✅ PCI compliance handled by PayPal

### Transaction Flow
1. User clicks "Betal medlemskap" button
2. PayPal SDK loads and renders button
3. User clicks PayPal button
4. PayPal popup opens for payment
5. User completes payment
6. `onSuccess` callback fires
7. Database updated with payment info
8. User redirected to confirmation

### Webhook Integration (Optional)
For production, consider setting up PayPal webhooks:
1. Go to PayPal Developer Dashboard
2. Navigate to Webhooks
3. Add webhook URL (e.g., `https://yourdomain.com/api/paypal/webhook`)
4. Select events to listen for
5. Verify webhook signatures in your API

## Migration to VIPPS

When ready to switch to VIPPS:

1. **Replace PayPal Component**
   - Create `/components/payment/vipps-button.tsx`
   - Follow similar structure as `PayPalButton`

2. **Update Integration Points**
   - Replace `<PayPalButton />` with `<VippsButton />`
   - Update environment variables
   - Test thoroughly

3. **Keep PayPal as Fallback**
   - Optionally offer both payment methods
   - Let users choose preferred method

## Troubleshooting

### PayPal Button Not Showing
- Check console for errors
- Verify `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set
- Ensure environment variable starts with `NEXT_PUBLIC_`
- Clear cache and restart dev server

### Payment Fails
- Check sandbox account balance
- Verify amount is greater than 0
- Check currency code is valid
- Review PayPal dashboard logs

### Database Not Updating
- Check `onSuccess` callback fires
- Verify database permissions
- Check Supabase connection
- Review browser console logs

## Support Resources

- [PayPal Developer Docs](https://developer.paypal.com/docs/)
- [JavaScript SDK Reference](https://developer.paypal.com/sdk/js/reference/)
- [Sandbox Testing Guide](https://developer.paypal.com/docs/api-basics/sandbox/)
- [Currency Codes](https://developer.paypal.com/docs/reports/reference/paypal-supported-currencies/)

## Next Steps

1. ✅ Set up PayPal Developer account
2. ✅ Get Sandbox credentials
3. ✅ Update `.env` file
4. ✅ Test ensemble membership payment
5. ⏳ Integrate into ticket booking flow
6. ⏳ Integrate into recording purchase flow
7. ⏳ Set up webhooks (optional)
8. ⏳ Switch to Live credentials for production
9. ⏳ Plan VIPPS migration
