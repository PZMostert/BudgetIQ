// PayFast Sandbox configuration
const PAYFAST_MERCHANT_ID = '10049362';
const PAYFAST_MERCHANT_KEY = '01o3dsnctud33';
const PAYFAST_SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process';

// Swap to https://www.payfast.co.za/eng/process for production

export function launchPayFastCheckout(userEmail: string, userId: string) {
  const params: Record<string, string> = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: `${window.location.origin}/payment-success`,
    cancel_url: `${window.location.origin}/dashboard`,
    notify_url: `https://eeuscsetaywjbqnjubvv.supabase.co/functions/v1/payfast-webhook`,
    email_address: userEmail,
    m_payment_id: userId,
    amount: '79.00',
    item_name: 'BudgetIQ Pro',
    item_description: 'Monthly Pro subscription',
    subscription_type: '1',
    billing_date: new Date().toISOString().split('T')[0],
    recurring_amount: '79.00',
    frequency: '3',
    cycles: '0',
  };

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYFAST_SANDBOX_URL;

  Object.entries(params).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}