// Comprehensive Banglish to Bengali converter
// Maps English phonetics to Bengali Unicode characters

interface ConversionMap {
  [key: string]: string;
}

// Consonants mapping
const consonants: ConversionMap = {
  'kh': 'খ', 'gh': 'ঘ', 'ng': 'ং', 'ch': 'চ', 'chh': 'ছ',
  'jh': 'ঝ', 'nh': 'ঞ', 'th': 'থ', 'dh': 'ধ', 'ph': 'ফ',
  'bh': 'ভ', 'sh': 'শ', 'Sh': 'ষ', 'rh': 'ঢ়', 'Rh': 'ঢ়',
  'k': 'ক', 'g': 'গ', 'c': 'চ', 'j': 'জ', 't': 'ত',
  'd': 'দ', 'n': 'ন', 'p': 'প', 'b': 'ব', 'm': 'ম',
  'y': 'য', 'r': 'র', 'l': 'ল', 'w': 'ও', 'v': 'ভ',
  's': 'স', 'h': 'হ', 'R': 'ড়', 'Y': 'য়', 'q': 'ক',
  'f': 'ফ', 'z': 'য', 'x': 'ক্স', 'T': 'ট', 'D': 'ড',
  'N': 'ণ'
};

// Vowels mapping
const vowels: ConversionMap = {
  'a': 'া', 'aa': 'া', 'i': 'ি', 'ii': 'ী', 'u': 'ু',
  'uu': 'ূ', 'e': 'ে', 'ee': 'ী', 'oi': 'ৈ', 'o': 'ো',
  'oo': 'ু', 'ou': 'ৌ', 'A': 'া'
};

// Independent vowels (when at start or standalone)
const independentVowels: ConversionMap = {
  'a': 'অ', 'aa': 'আ', 'i': 'ই', 'ii': 'ঈ', 'u': 'উ',
  'uu': 'ঊ', 'e': 'এ', 'oi': 'ঐ', 'o': 'ও', 'ou': 'ঔ',
  'ri': 'ঋ', 'A': 'আ'
};

// Kar symbols (vowel diacritics)
const kars = new Set(['া', 'ি', 'ী', 'ু', 'ূ', 'ৃ', 'ে', 'ৈ', 'ো', 'ৌ']);

// Numbers
const numbers: ConversionMap = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

// Common word mappings for better accuracy
const commonWords: ConversionMap = {
  'ami': 'আমি',
  'tumi': 'তুমি',
  'apni': 'আপনি',
  'tini': 'তিনি',
  'amra': 'আমরা',
  'tomra': 'তোমরা',
  'apnara': 'আপনারা',
  'tara': 'তারা',
  'ki': 'কি',
  'keno': 'কেন',
  'kothai': 'কোথায়',
  'kokhon': 'কখন',
  'kibhabe': 'কিভাবে',
  'eto': 'এত',
  'oto': 'ওত',
  'ei': 'এই',
  'oi': 'ওই',
  'hae': 'হ্যাঁ',
  'na': 'না',
  'nai': 'নাই',
  'ache': 'আছে',
  'chhilo': 'ছিল',
  'hobe': 'হবে',
  'kora': 'করা',
  'kore': 'করে',
  'korechhi': 'করেছি',
  'korbo': 'করব',
  'ekta': 'একটা',
  'ekti': 'একটি',
  'khaoa': 'খাওয়া',
  'ghum': 'ঘুম',
  'bhat': 'ভাত',
  'pani': 'পানি',
  'jol': 'জল',
  'dhonnobad': 'ধন্যবাদ',
  'shukriya': 'শুক্রিয়া',
  'valo': 'ভালো',
  'bhalo': 'ভালো',
  'kharap': 'খারাপ',
  'sundor': 'সুন্দর',
  'amar': 'আমার',
  'tomar': 'তোমার',
  'tar': 'তার',
  'jodi': 'যদি',
  'tahole': 'তাহলে',
  'kintu': 'কিন্তু',
  'ebong': 'এবং',
  'ba': 'বা',
  'theke': 'থেকে'
};

export function convertBanglishToBengali(text: string): string {
  if (!text) return '';
  
  // Split by spaces to process word by word
  const words = text.split(' ');
  const convertedWords = words.map(word => {
    // Check if it's a common word first
    const lowerWord = word.toLowerCase();
    if (commonWords[lowerWord]) {
      return commonWords[lowerWord];
    }
    
    return convertWord(word);
  });
  
  return convertedWords.join(' ');
}

function convertWord(word: string): string {
  if (!word) return '';
  
  let result = '';
  let i = 0;
  
  while (i < word.length) {
    // Try to match longer patterns first
    let matched = false;
    
    // Try 3-character combinations first
    if (i + 2 < word.length) {
      const three = word.substring(i, i + 3);
      if (consonants[three]) {
        result += consonants[three];
        i += 3;
        matched = true;
        continue;
      }
    }
    
    // Try 2-character combinations
    if (i + 1 < word.length && !matched) {
      const two = word.substring(i, i + 2);
      
      // Check for consonant combinations
      if (consonants[two]) {
        result += consonants[two];
        i += 2;
        matched = true;
        continue;
      }
      
      // Check for vowel combinations
      if (vowels[two]) {
        if (result === '' || i === 0) {
          // Independent vowel at start
          result += independentVowels[two] || independentVowels[two.charAt(0)] || two;
        } else {
          // Vowel kar after consonant
          result += vowels[two];
        }
        i += 2;
        matched = true;
        continue;
      }
    }
    
    // Try single character
    if (!matched) {
      const single = word.charAt(i);
      
      // Check if it's a number
      if (numbers[single]) {
        result += numbers[single];
        i++;
        continue;
      }
      
      // Check if it's a consonant
      if (consonants[single]) {
        result += consonants[single];
        i++;
        continue;
      }
      
      // Check if it's a vowel
      if (vowels[single]) {
        if (result === '' || i === 0) {
          // Independent vowel at start
          result += independentVowels[single] || single;
        } else {
          // Check if previous character is a consonant
          const lastChar = result.charAt(result.length - 1);
          if (!kars.has(lastChar)) {
            result += vowels[single];
          } else {
            result += single;
          }
        }
        i++;
        continue;
      }
      
      // If no match found, keep the original character
      result += single;
      i++;
    }
  }
  
  return result;
}

// Real-time converter with debounce support
export function createRealtimeConverter(
  callback: (bengali: string) => void,
  debounceMs: number = 100
) {
  let timeoutId: NodeJS.Timeout;
  
  return (banglish: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const bengali = convertBanglishToBengali(banglish);
      callback(bengali);
    }, debounceMs);
  };
}
