const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const generateSvgImage = (text, bg = '#6C5CE7', fg = '#FFFFFF') => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bg}"/>
    <circle cx="200" cy="160" r="60" fill="${fg}" opacity="0.8"/>
    <path d="M100,320 C100,240 140,220 200,220 C260,220 300,240 300,320 Z" fill="${fg}" opacity="0.8"/>
    <text x="50%" y="370" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="${fg}" text-anchor="middle">${text}</text>
  </svg>`;
};

const images = [
  { name: 'default_avatar.jpg', label: 'User Profile', bg: '#6C5CE7' },
  { name: 'rohan.jpg', label: 'Rohan Mehta', bg: '#0984E3' },
  { name: 'neha.jpg', label: 'Neha Kapoor', bg: '#E84393' },
  { name: 'aarav.jpg', label: 'Aarav Sharma', bg: '#00B894' },
  { name: 'trek.jpg', label: 'Weekend Trekking', bg: '#2ED573' },
  { name: 'games.jpg', label: 'Board Game Night', bg: '#FFA502' },
  { name: 'badminton.jpg', label: 'Badminton Club', bg: '#FF4757' },
  { name: 'mock_aadhaar_front.jpg', label: 'Aadhaar Card Front', bg: '#3742FA' },
  { name: 'mock_aadhaar_back.jpg', label: 'Aadhaar Card Back', bg: '#57606F' },
  { name: 'user101.jpg', label: 'Sara Khan', bg: '#FD79A8' },
  { name: 'user102.jpg', label: 'Rohan Verma', bg: '#74B9FF' },
  { name: 'priya.jpg', label: 'Priya Sharma', bg: '#A29BFE' },
  { name: 'ananya.jpg', label: 'Ananya Verma', bg: '#FF7675' },
  { name: 'live1.jpg', label: 'Live Stream', bg: '#D63031' },
  { name: 'profile.jpg', label: 'Profile Photo', bg: '#00CEC9' },
  { name: 'default_uploaded_photo.jpg', label: 'Uploaded Photo', bg: '#6C5CE7' }
];

images.forEach(img => {
  const svgContent = generateSvgImage(img.label, img.bg);
  fs.writeFileSync(path.join(uploadsDir, img.name), svgContent);
});

console.log('Successfully generated all 16 placeholder sample images in uploads/!');
