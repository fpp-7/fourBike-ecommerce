export const store = Object.freeze({
  name: 'Four Bike',
  whatsappNumber: '5519997229581',
  instagramUrl: 'https://www.instagram.com/four.bike/',
  address: 'Avenida da Saudade, 225',
  city: 'Leme',
  state: 'SP'
});

export function whatsappUrl(message) {
  return `https://wa.me/${store.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
