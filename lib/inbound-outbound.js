/**
 * Config for the Inbound/Outbound use case (/dashboard/inbound-outbound).
 *
 * The workbook it embeds is the one behind INBOUND_OUTBOUND_SIGMA_BASE_URL: a
 * customer table plus a text control whose Control ID is `customer-id`, and a
 * select-on-Customer-ID action that fires the `open_customer` iframe event.
 */

// Control ID of the workbook's customer text control — the key for both the
// embed URL param and the `workbook:variables:update` inbound event.
export const CONTROL_ID = 'customer-id';

// Outbound event name the workbook's "Generate iframe event" action sends.
export const OUTBOUND_EVENT = 'open_customer';

// Customer IDs are digits in the sample data; allow the wider safe charset so
// the shape check isn't tied to one dataset. Convenience filter only — this is
// not row-level security.
export const SAFE_CONTROL_VALUE = /^[A-Za-z0-9_-]{1,64}$/;

// Real CUST_KEY values from sigma_sample_data.examples__plugs_electronics
// (queried, not invented). Two customers can share a name, so the ID is the key.
export const SAMPLE_CUSTOMERS = [
  { id: '658', name: 'Valerie Jackson' },
  { id: '4390', name: 'Jenna Cameron' },
  { id: '4402', name: 'Elisabeth Parker' },
];
