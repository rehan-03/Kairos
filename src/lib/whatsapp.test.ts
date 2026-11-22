import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink } from './whatsapp';

describe('buildWhatsAppLink', () => {
  const SAMPLE_MESSAGE = 'Hello, your payment of ₹5,000 is due.\nPlease pay via UPI.';

  it('correctly encodes rupee symbol (₹) and newlines in message text', () => {
    const link = buildWhatsAppLink(SAMPLE_MESSAGE, '9822015367');
    expect(link).toContain('https://wa.me/919822015367?text=');
    // encodeURIComponent encodes ₹ as %E2%82%B9 and newline as %0A
    expect(link).toContain('%E2%82%B95%2C000');
    expect(link).toContain('%0A');
    expect(link).toBe(
      `https://wa.me/919822015367?text=${encodeURIComponent(SAMPLE_MESSAGE)}`,
    );
  });

  it('handles a phone number with a leading +91, spaces and dashes', () => {
    const link = buildWhatsAppLink('Reminder', '+91 98220-15367');
    expect(link).toBe('https://wa.me/919822015367?text=Reminder');
  });

  it('handles a phone number with a leading 0', () => {
    const link = buildWhatsAppLink('Reminder', '09822015367');
    expect(link).toBe('https://wa.me/919822015367?text=Reminder');
  });

  it('returns no-recipient link (https://wa.me/?text=...) for an invalid phone number', () => {
    // Too short
    expect(buildWhatsAppLink('Reminder', '12345')).toBe('https://wa.me/?text=Reminder');
    // Non-digits / letters
    expect(buildWhatsAppLink('Reminder', 'abcdefghij')).toBe('https://wa.me/?text=Reminder');
    // Invalid starting digit (Indian mobile numbers start with 6-9)
    expect(buildWhatsAppLink('Reminder', '1234567890')).toBe('https://wa.me/?text=Reminder');
    // Too long
    expect(buildWhatsAppLink('Reminder', '9822015367999')).toBe('https://wa.me/?text=Reminder');
  });

  it('returns no-recipient link (https://wa.me/?text=...) for an empty or missing phone', () => {
    expect(buildWhatsAppLink('Reminder', '')).toBe('https://wa.me/?text=Reminder');
    expect(buildWhatsAppLink('Reminder', '   ')).toBe('https://wa.me/?text=Reminder');
    expect(buildWhatsAppLink('Reminder')).toBe('https://wa.me/?text=Reminder');
    expect(buildWhatsAppLink('Reminder', null)).toBe('https://wa.me/?text=Reminder');
    expect(buildWhatsAppLink('Reminder', undefined)).toBe('https://wa.me/?text=Reminder');
  });

  it('preserves exact amount and due date formatted in WhatsApp URL', () => {
    const text = 'Hi, tuition fee of ₹4,500 was due on 12 Nov 2026. Please pay to tutor@upi.';
    const demoSafeUrl = buildWhatsAppLink(text, null);
    expect(demoSafeUrl).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    expect(decodeURIComponent(demoSafeUrl)).toContain('₹4,500');
    expect(decodeURIComponent(demoSafeUrl)).toContain('12 Nov 2026');

    const customerUrl = buildWhatsAppLink(text, '+91 98220 15367');
    expect(customerUrl).toBe(`https://wa.me/919822015367?text=${encodeURIComponent(text)}`);
    expect(decodeURIComponent(customerUrl)).toContain('₹4,500');
    expect(decodeURIComponent(customerUrl)).toContain('12 Nov 2026');
  });
});
