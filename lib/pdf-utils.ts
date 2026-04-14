import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- Colors ---

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// --- Formatting ---

export function formatCurrency(amount: number | undefined | null, currency: string = 'AED'): string {
  const val = amount || 0;
  const decimals = currency === 'AED' || currency === 'OMR' || currency === 'KWD' || currency === 'BHD' ? 3 : 2;
  
  const formattedNumber = val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${currency} ${formattedNumber}`;
}

export function formatCurrencyRaw(amount: number | undefined | null, currency: string = 'AED'): string {
  const val = amount || 0;
  const decimals = currency === 'AED' || currency === 'OMR' || currency === 'KWD' || currency === 'BHD' ? 3 : 2;
  
  // No commas, just fixed decimals
  return val.toFixed(decimals);
}

export function getCurrentRunTimestamp(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  
  return `${day}/${month}/${year} ${strTime}`;
}

// --- Images ---

export const logoToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // If it's already a data URL, return it immediately
        if (url.startsWith('data:')) {
            resolve(url);
            return;
        }

        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } else {
                reject(new Error('Failed to get canvas context'));
            }
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

// --- Number to Words ---

export function amountInWords(amount: number | undefined | null, currency: string = 'AED'): string {
  const num = amount || 0;
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertMillions = (num: number): string => {
      if (num >= 1000000) {
          return convertMillions(Math.floor(num / 1000000)) + ' Million ' + convertThousands(num % 1000000);
      } else {
          return convertThousands(num);
      }
  };

  const convertThousands = (num: number): string => {
      if (num >= 1000) {
          return convertHundreds(Math.floor(num / 1000)) + ' Thousand ' + convertHundreds(num % 1000);
      } else {
          return convertHundreds(num);
      }
  };

  const convertHundreds = (num: number): string => {
      if (num >= 100) {
          return ones[Math.floor(num / 100)] + ' Hundred ' + convertTens(num % 100);
      } else {
          return convertTens(num);
      }
  };

  const convertTens = (num: number): string => {
      if (num < 10) {
          return ones[num];
      } else if (num >= 10 && num < 20) {
          return teens[num - 10];
      } else {
          return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
      }
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100); // Treating as 2 decimal places for cents/fils logic generally

  let words = integerPart === 0 ? 'Zero' : convertMillions(integerPart);
  
  // Cleanup spaces
  words = words.replace(/\s+/g, ' ').trim();

  // Currency specific labels
  let currencyName = currency;
  let decimalName = 'Cents';

  if (currency === 'AED') {
      currencyName = 'Dirham'; // or Dirhams
      decimalName = 'Fils';
  } else if (currency === 'USD') {
      currencyName = 'Dollar'; // or Dollars
      decimalName = 'Cents';
  } else if (currency === 'EUR') {
      currencyName = 'Euro'; // or Euros
      decimalName = 'Cents';
  } else if (currency === 'INR') {
      currencyName = 'Rupee'; // or Rupees
      decimalName = 'Paisa';
  }

  // Pluralization (simple)
  // Often in formal docs "Dirham" is used singular or plural, but let's stick to the example "Dirham"
  // Example: "One Hundred... Dirham and ... Fils"
  
  let result = `${words} ${currencyName}`;

  if (decimalPart > 0) {
      const decimalWords = convertTens(decimalPart).replace(/\s+/g, ' ').trim();
      result += ` and ${decimalWords} ${decimalName}`;
  }
  
  return result + ' Only';
}
