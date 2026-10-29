// Filtros de texto do "Modo Caos e Dificuldade"

export function obfuscateProperNouns(text: string): string {
  let result = text;
  
  result = result.replace(/\bRocky\b/gi, 'a fighter');
  result = result.replace(/\bBalboa\b/gi, '');
  result = result.replace(/\bSávio\b/gi, 'a researcher');
  result = result.replace(/\bJoseilson\b/gi, 'a person');
  result = result.replace(/\bTyger\b/gi, 'a creature');
  
  const words = result.split(/(\s+)/);
  let isSentenceStart = true;
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i].trim();
    if (w === '') continue;
    
    if (/[.!?]$/.test(w)) {
      isSentenceStart = true;
      continue;
    }
    
    if (!isSentenceStart && /^[A-Z][a-zA-Zà-úÀ-Ú]*/.test(w) && w !== 'I' && w.length > 1) {
      words[i] = 'someone';
    }
    
    isSentenceStart = false;
  }
  
  return words.join('');
}

export function shiftPronouns(text: string): string {
  let result = text;
  
  const pronounMap = [
    { regex: /\bI am\b/g, repl: 'they are' },
    { regex: /\bI was\b/g, repl: 'they were' },
    { regex: /\bI have\b/g, repl: 'they have' },
    { regex: /\bI had\b/g, repl: 'they had' },
    { regex: /\bI\b/g, repl: 'they' },
    { regex: /\bmy\b/gi, repl: 'their' },
    { regex: /\bme\b/gi, repl: 'them' },
    { regex: /\bmyself\b/gi, repl: 'themselves' },
    { regex: /\byou are\b/gi, repl: 'he is' },
    { regex: /\byou was\b/gi, repl: 'he was' },
    { regex: /\byou\b/gi, repl: 'he' },
    { regex: /\byour\b/gi, repl: 'his' },
  ];
  
  for (const item of pronounMap) {
    result = result.replace(item.regex, item.repl);
  }
  
  return result;
}

export function censorIdenticalWords(original: string, translated: string): string {
  const originalWords = new Set(
    (original.toLowerCase().match(/[a-zA-Zà-úÀ-Ú\d]{4,}/g) || [])
  );

  let placeholderIndex = 0;
  const placeholders = ['[X]', '[Y]', '[Z]', '[W]', '[K]', '[A]', '[B]', '[C]', '[D]'];

  return translated.replace(/[a-zA-Zà-úÀ-Ú\d]{4,}/g, (match) => {
    const lowerMatch = match.toLowerCase();
    if (originalWords.has(lowerMatch)) {
      const ph = placeholders[placeholderIndex % placeholders.length];
      placeholderIndex++;
      return ph;
    }
    return match;
  });
}
