import type { APIContext } from 'astro';

import { createRequestSupabase } from './supabase';

export type CustomerProfile = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  version: number;
};

export type CustomerAddress = {
  id: string;
  label: string;
  recipient_name: string;
  line_1: string;
  line_2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  country_code: string;
  is_default: boolean;
  version: number;
};

export type OrderItem = {
  id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  unit_amount: number;
  quantity: number;
  line_total: number;
};

export type CustomerOrder = {
  id: string;
  status: 'paid' | 'processing' | 'shipped' | 'cancelled' | 'refunded';
  currency: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_amount: number;
  tax_amount: number;
  total_amount: number;
  customer_email: string;
  shipping_address: Record<string, unknown>;
  receipt_url: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
  order_items: OrderItem[];
};

export async function getCustomerProfile(context: Pick<APIContext, 'cookies' | 'request'>) {
  const supabase = createRequestSupabase(context);
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id,first_name,last_name,phone,version')
    .maybeSingle();

  if (error) throw new Error('Unable to load your profile.');
  return data as CustomerProfile | null;
}

export async function getCustomerAddresses(context: Pick<APIContext, 'cookies' | 'request'>) {
  const supabase = createRequestSupabase(context);
  const { data, error } = await supabase
    .from('addresses')
    .select('id,label,recipient_name,line_1,line_2,city,county,postcode,country_code,is_default,version')
    .order('is_default', { ascending: false })
    .order('created_at');

  if (error) throw new Error('Unable to load your delivery addresses.');
  return (data ?? []) as CustomerAddress[];
}

export async function getCustomerOrders(context: Pick<APIContext, 'cookies' | 'request'>, limit?: number) {
  const supabase = createRequestSupabase(context);
  let query = supabase
    .from('orders')
    .select('id,status,currency,total_amount,tracking_number,created_at,order_items(id,product_name,quantity)')
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error('Unable to load your orders.');

  return (data ?? []) as Array<
    Pick<CustomerOrder, 'id' | 'status' | 'currency' | 'total_amount' | 'tracking_number' | 'created_at'> & {
      order_items: Array<Pick<OrderItem, 'id' | 'product_name' | 'quantity'>>;
    }
  >;
}

export async function getCustomerOrder(context: Pick<APIContext, 'cookies' | 'request'>, orderId: string) {
  const supabase = createRequestSupabase(context);
  const { data, error } = await supabase
    .from('orders')
    .select('*,order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error('Unable to load that order.');
  return data as CustomerOrder | null;
}

export async function getAccountOverview(context: Pick<APIContext, 'cookies' | 'request'>) {
  const [profile, addresses, orders] = await Promise.all([
    getCustomerProfile(context),
    getCustomerAddresses(context),
    getCustomerOrders(context, 3),
  ]);

  return { profile, addresses, orders };
}
