export const PROVINCES = [
  'Islamabad Capital Territory',
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Azad Kashmir',
  'Gilgit-Baltistan',
];

export const CITIES_BY_PROVINCE = {
  'Islamabad Capital Territory': ['Islamabad'],
  'Punjab': [
    'Lahore', 'Faisalabad', 'Rawalpindi', 'Gujranwala', 'Multan',
    'Sialkot', 'Bahawalpur', 'Sargodha', 'Sheikhupura', 'Jhang',
    'Rahim Yar Khan', 'Gujrat', 'Kasur', 'Okara', 'Sahiwal',
    'Wah Cantonment', 'Dera Ghazi Khan', 'Chiniot', 'Narowal', 'Mandi Bahauddin',
  ],
  'Sindh': [
    'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Mirpur Khas',
    'Nawabshah', 'Khairpur', 'Jacobabad', 'Shikarpur', 'Dadu',
    'Thatta', 'Badin',
  ],
  'Khyber Pakhtunkhwa': [
    'Peshawar', 'Mardan', 'Abbottabad', 'Mingora', 'Kohat',
    'Swat', 'Nowshera', 'Haripur', 'Mansehra', 'Dera Ismail Khan',
    'Charsadda', 'Bannu',
  ],
  'Balochistan': [
    'Quetta', 'Turbat', 'Khuzdar', 'Hub', 'Gwadar',
    'Chaman', 'Sibi', 'Zhob',
  ],
  'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Rawalakot', 'Kotli'],
  'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza', 'Chilas'],
};

// Flat sorted list — used when no province is selected yet
export const ALL_CITIES = Object.values(CITIES_BY_PROVINCE)
  .flat()
  .sort((a, b) => a.localeCompare(b));

export const ADDRESS_LABELS = ['Home', 'Office', 'Other'];
