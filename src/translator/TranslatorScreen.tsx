import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Square,
  Plus,
  Trash2,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Settings,
  Layers,
  ArrowLeft,
  ChevronRight,
  FileText
} from "lucide-react";

interface Language {
  code: string;
  name: string;
  flag: string;
  locale: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'Inglês', flag: '🇺🇸', locale: 'en-US' },
  { code: 'de', name: 'Alemão', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'es', name: 'Espanhol', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'fr', name: 'Francês', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'ja', name: 'Japonês', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'zh-CN', name: 'Chinês (Simplificado)', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'zh-TW', name: 'Chinês (Tradicional)', flag: '🇭🇰', locale: 'zh-TW' },
  { code: 'ru', name: 'Russo', flag: '🇷🇺', locale: 'ru-RU' },
  { code: 'ko', name: 'Coreano', flag: '🇰🇷', locale: 'ko-KR' },
  { code: 'ar', name: 'Árabe', flag: '🇸🇦', locale: 'ar-SA' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'tr', name: 'Turco', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'nl', name: 'Holandês', flag: '🇳🇱', locale: 'nl-NL' },
  { code: 'pl', name: 'Polonês', flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'sv', name: 'Sueco', flag: '🇸🇪', locale: 'sv-SE' },
  { code: 'da', name: 'Dinamarquês', flag: '🇩🇰', locale: 'da-DK' },
  { code: 'no', name: 'Norueguês', flag: '🇳🇴', locale: 'nb-NO' },
  { code: 'fi', name: 'Finlandês', flag: '🇫🇮', locale: 'fi-FI' },
  { code: 'el', name: 'Grego', flag: '🇬🇷', locale: 'el-GR' },
  { code: 'cs', name: 'Tcheco', flag: '🇨🇿', locale: 'cs-CZ' },
  { code: 'ro', name: 'Romeno', flag: '🇷🇴', locale: 'ro-RO' },
  { code: 'hu', name: 'Húngaro', flag: '🇭🇺', locale: 'hu-HU' },
  { code: 'vi', name: 'Vietnamita', flag: '🇻🇳', locale: 'vi-VN' },
  { code: 'id', name: 'Indonésio', flag: '🇮🇩', locale: 'id-ID' },
  { code: 'th', name: 'Tailandês', flag: '🇹🇭', locale: 'th-TH' },
  { code: 'he', name: 'Hebraico', flag: '🇮🇱', locale: 'he-IL' },
  { code: 'uk', name: 'Ucraniano', flag: '🇺🇦', locale: 'uk-UA' },
  { code: 'bn', name: 'Bengali', flag: '🇧🇩', locale: 'bn-IN' },
  { code: 'ms', name: 'Malaio', flag: '🇲🇾', locale: 'ms-MY' },
  { code: 'fa', name: 'Persa', flag: '🇮🇷', locale: 'fa-IR' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭', locale: 'tl-PH' },
  { code: 'ga', name: 'Irlandês', flag: '🇮🇪', locale: 'ga-IE' },
  { code: 'la', name: 'Latim', flag: '🏛️', locale: 'la' },
  { code: 'sw', name: 'Suaíli', flag: '🇰🇪', locale: 'sw-KE' },
  { code: 'is', name: 'Islandês', flag: '🇮🇸', locale: 'is-IS' },
  { code: 'eo', name: 'Esperanto', flag: '🟢', locale: 'eo' },
  { code: 'cy', name: 'Galês', flag: '🏴', locale: 'cy-GB' },
  { code: 'eu', name: 'Basco', flag: '🇪🇸', locale: 'eu-ES' },
  { code: 'et', name: 'Estoniano', flag: '🇪🇪', locale: 'et-EE' },
  { code: 'lt', name: 'Lituano', flag: '🇱🇹', locale: 'lt-LT' },
  { code: 'ka', name: 'Georgiano', flag: '🇬🇪', locale: 'ka-GE' },
  { code: 'mt', name: 'Maltês', flag: '🇲🇹', locale: 'mt-MT' },
  { code: 'sq', name: 'Albanês', flag: '🇦🇱', locale: 'sq-AL' },
  { code: 'hy', name: 'Armênio', flag: '🇦🇲', locale: 'hy-AM' },
  { code: 'ta', name: 'Tâmil', flag: '🇮🇳', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳', locale: 'te-IN' },
  { code: 'kn', name: 'Canarim', flag: '🇮🇳', locale: 'kn-IN' },
  { code: 'km', name: 'Khmer', flag: '🇰🇭', locale: 'km-KH' },
  { code: 'lo', name: 'Lao', flag: '🇱🇦', locale: 'lo-LA' },
  { code: 'my', name: 'Birmanês', flag: '🇲🇲', locale: 'my-MM' },
  { code: 'so', name: 'Somali', flag: '🇸🇴', locale: 'so-SO' },
  { code: 'mi', name: 'Maori', flag: '🇳🇿', locale: 'mi-NZ' },
  { code: 'am', name: 'Amárico', flag: '🇪🇹', locale: 'am-ET' },
  { code: 'mn', name: 'Mongol', flag: '🇲🇳', locale: 'mn-MN' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', locale: 'pt-BR' },
];

const PRESETS = [
  { id: 'babel', name: 'Babel Clássica', description: 'Giro clássico pela Europa, Ásia e Oriente Médio', chain: ['de', 'ru', 'zh-CN', 'ar', 'fr'] },
  { id: 'asia', name: 'Loop Asiático', description: 'Traduções em cadeia por potências asiáticas', chain: ['zh-CN', 'ja', 'ko', 'vi', 'th'] },
  { id: 'nordic', name: 'Rota Nórdica', description: 'Cadeia de dialetos do norte europeu', chain: ['sv', 'no', 'da', 'fi'] },
  { id: 'short', name: 'Cadeia Curta', description: 'Tradução rápida com poucos intermediários', chain: ['es', 'fr'] },
  { id: 'world', name: 'Volta ao Mundo', description: 'Longa jornada por alfabetos diversos', chain: ['ja', 'ru', 'el', 'he', 'hi', 'it', 'es'] },
  { id: 'all', name: 'Maratona Global 🌍', description: 'Cadeia gigante passando por todos os 54 idiomas intermediários!', chain: ['de', 'es', 'fr', 'it', 'ja', 'zh-CN', 'zh-TW', 'ru', 'ko', 'ar', 'hi', 'tr', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'el', 'cs', 'ro', 'hu', 'vi', 'id', 'th', 'he', 'uk', 'bn', 'ms', 'fa', 'tl', 'ga', 'la', 'sw', 'is', 'eo', 'cy', 'eu', 'et', 'lt', 'ka', 'mt', 'sq', 'hy', 'ta', 'te', 'kn', 'km', 'lo', 'my', 'so', 'mi', 'am', 'mn'] },
];

const TEXT_EXAMPLES = [
  {
    title: "Poesia Clássica",
    text: "Tyger Tyger, burning bright, In the forests of the night; What immortal hand or eye, Could frame thy fearful symmetry?"
  },
  {
    title: "Sávio",
    text: "O monitoramento físico-químico de meios líquidos é uma demanda constante em diversos setores, como o controle de processos industriais, a segurança alimentar e a análise ambiental. Métodos analíticos convencionais, como a cromatografia e a espectroscopia de absorção atômica, embora exatos, exigem infraestrutura laboratorial especializada, coleta e preparo de amostras e um tempo de processamento que limitam sua aplicação em cenários de monitoramento contínuo ou em campo (HAQ et al., 2023)."
      + "Nesse contexto, as técnicas de sensoriamento por micro-ondas aparecem como uma alternativa viável, proporcionando medições não invasivas, rápidas e sensíveis a variações na permissividade complexa dos fluidos analisados (RAHMAN et al., 2025)."
      + "Este trabalho explora o uso de ressonadores dielétricos operando na faixa de micro-ondas para a detecção de variáveis físico-químicas em meios líquidos. A metodologia envolve a fabricação de um ressonador coplanar de micro-ondas (CPW) e a inserção do meio líquido em uma região de campo elétrico intenso, geralmente nas fendas ou gaps do ressonador. A alteração das propriedades elétricas do meio, como a constante dielétrica (εr) e o fator de perda (tan δ), afeta diretamente a frequência de ressonância e o fator de qualidade (Q) do circuito."
      + "Os resultados experimentais demonstram que as mudanças observadas nessas grandezas espectroscópicas são correlacionadas com a concentração de solutos ou com parâmetros do processo. Adicionalmente, é apresentada uma análise de sensibilidade e incerteza, comparando o desempenho do dispositivo com métodos convencionais. Os autores concluuem que o sensoriamento baseado em ressonadores de micro-ondas apresenta grande potencial para o desenvolvimento de ferramentas de baixo custo e alta portabilidade, aplicáveis em sistemas de monitoramento em tempo real e in-situ."
  },
  {
    title: "Joseilson",
    text: " Você não vai acreditar nisso... mas você cabia bem aqui. (Rocky levanta a mão direita) Eu te segurava e dizia à sua mãe, esse garoto vai ser o melhor garoto do mundo. Esse garoto vai ser melhor do que qualquer um que eu já conheci... e você cresceu bem e maravilhoso, foi incrível só te ver todo dia, era como um privilégio. Então chegou a hora de você ser seu próprio homem e enfrentar o mundo, e você fez... Mas em algum momento você mudou... você parou de ser você mesmo... você deixou as pessoas colocarem o dedo na sua cara e dizerem que você não é bom... e quando as coisas ficaram difíceis você começou a procurar algo para culpar... como uma grande sombra. Deixa eu te dizer uma coisa que você já sabe. O mundo não é só sol e arco-íris, é um lugar muito cruel e desagradável e não importa o quão forte você seja, ele vai te derrubar e te manter lá embaixo permanentemente se você deixar. Você, eu, ninguém vai bater tão forte quanto a vida! Mas não se trata de quão forte você pode bater, se trata de quão forte você pode apanhar e continuar seguindo em frente, o quanto você pode aguentar... e continuar seguindo em frente. É assim que se ganha! Agora, se você sabe o que vale, então saia e busque o que você vale! Mas você tem que estar disposto a levar as pancadas e não ficar apontando dedos dizendo que não está onde quer estar por causa dele, dela ou de qualquer um! Covardes fazem isso e isso não é você! Você é melhor que isso! ... ... Eu sempre vou te amar, não importa o que aconteça... não importa o que acontecer... você é meu filho, você é meu sangue... você é a melhor coisa da minha vida. Mas até você começar a acreditar em si mesmo, você não vai ter uma vida. ... Não esqueça de visitar sua mãe."
  },
  {
    title: "Ficção Científica",
    text: "All those moments will be lost in time, like tears in rain. Time to die. The stars look very different today."
  }
];

interface TranslationStep {
  fromLang: Language;
  toLang: Language;
  inputText: string;
  outputText: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

function obfuscateProperNouns(text: string): string {
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

function shiftPronouns(text: string): string {
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

function censorIdenticalWords(original: string, translated: string): string {
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

// Client-side translation caller that runs entirely in the browser
const translateText = async (text: string, from: string, to: string, signal?: AbortSignal) => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error();
    const data = await response.json();
    return data[0].map((x: any) => x[0]).join('');
  } catch (err) {
    // Fallback to local server proxy endpoint if available
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }),
      signal
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro na tradução');
    }
    const data = await response.json();
    return data.translatedText;
  }
};

interface TranslatorScreenProps {
  onBack: () => void;
}

export default function TradutorCadeia({ onBack }: TranslatorScreenProps) {
  // Estados principais
  const [inputText, setInputText] = useState("");
  const [intermediateCodes, setIntermediateCodes] = useState<string[]>(['de', 'es', 'fr']);
  const [isPlayingAudioStep, setIsPlayingAudioStep] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [steps, setSteps] = useState<TranslationStep[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [fidelityScore, setFidelityScore] = useState<number | null>(null);
  const [difficultySettings, setDifficultySettings] = useState({
    obfuscateNames: false,
    doubleBounce: false,
    shiftPronouns: false,
    censorMatches: false
  });

  // Abort controller para cancelar tradução
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selecionar preset
  const applyPreset = (chain: string[]) => {
    if (isTranslating) return;
    setIntermediateCodes([...chain]);
  };

  // Cadeia aleatória
  const applyRandomChain = () => {
    if (isTranslating) return;
    const len = Math.floor(Math.random() * 4) + 4; // 4 a 7 idiomas
    const pool = LANGUAGES.filter(l => l.code !== 'en' && l.code !== 'pt');
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setIntermediateCodes(shuffled.slice(0, len).map(l => l.code));
  };

  // Embaralhar cadeia atual
  const shuffleIntermediate = () => {
    if (isTranslating) return;
    const shuffled = [...intermediateCodes].sort(() => 0.5 - Math.random());
    setIntermediateCodes(shuffled);
  };

  // Gerenciar passos da cadeia
  const addIntermediate = (code: string, index?: number) => {
    if (isTranslating) return;
    if (intermediateCodes.length >= 100) return; // Limite razoável

    if (index !== undefined) {
      const next = [...intermediateCodes];
      next.splice(index + 1, 0, code);
      setIntermediateCodes(next);
    } else {
      setIntermediateCodes([...intermediateCodes, code]);
    }
  };

  const removeIntermediate = (index: number) => {
    if (isTranslating) return;
    const next = [...intermediateCodes];
    next.splice(index, 1);
    setIntermediateCodes(next);
  };

  const changeIntermediate = (index: number, code: string) => {
    if (isTranslating) return;
    const next = [...intermediateCodes];
    next[index] = code;
    setIntermediateCodes(next);
  };

  const moveIntermediate = (index: number, direction: 'left' | 'right') => {
    if (isTranslating) return;
    if (direction === 'left' && index === 0) return;
    if (direction === 'right' && index === intermediateCodes.length - 1) return;

    const next = [...intermediateCodes];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setIntermediateCodes(next);
  };

  // Interromper a tradução
  const cancelTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsTranslating(false);
    setCurrentStepIndex(-1);
    setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error', error: 'Cancelado pelo usuário' } : s));
  };

  // Função para executar a tradução em série
  const startChainTranslation = async () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setFidelityScore(null);

    // Montar a cadeia inteira
    // Começa em 'en' -> intermediários -> termina em 'pt'
    const fullChainCodes = ['en', ...intermediateCodes, 'pt'];

    // Preparar lista de passos
    const initialSteps: TranslationStep[] = [];
    for (let i = 0; i < fullChainCodes.length - 1; i++) {
      const fromLang = LANGUAGES.find(l => l.code === fullChainCodes[i])!;
      const toLang = LANGUAGES.find(l => l.code === fullChainCodes[i + 1])!;
      initialSteps.push({
        fromLang,
        toLang,
        inputText: '',
        outputText: '',
        status: 'pending'
      });
    }

    setSteps(initialSteps);
    abortControllerRef.current = new AbortController();

    let currentText = inputText;
    if (difficultySettings.shiftPronouns) {
      currentText = shiftPronouns(currentText);
    }
    if (difficultySettings.obfuscateNames) {
      currentText = obfuscateProperNouns(currentText);
    }

    for (let i = 0; i < initialSteps.length; i++) {
      setCurrentStepIndex(i);

      // Atualizar status do passo atual para rodando e definir texto de entrada
      setSteps(prev => {
        const next = [...prev];
        next[i] = {
          ...next[i],
          status: 'running',
          inputText: currentText
        };
        return next;
      });

      try {
        let stepText = "";

        // Se o modo ricochete estiver ativado e for uma etapa intermediária
        const isIntermediate = i > 0 && i < initialSteps.length - 1;
        if (difficultySettings.doubleBounce && isIntermediate) {
          const bounceLang = i % 2 === 0 ? "zh-CN" : "ar";

          // 1. Traduz do idioma de origem para o idioma de ricochete (Chinês/Árabe)
          const dataBounceText = await translateText(currentText, initialSteps[i].fromLang.code, bounceLang, abortControllerRef.current?.signal);

          // 2. Traduz do idioma de ricochete para o idioma final da etapa
          stepText = await translateText(dataBounceText, bounceLang, initialSteps[i].toLang.code, abortControllerRef.current?.signal);
        } else {
          // Tradução normal direta
          stepText = await translateText(currentText, initialSteps[i].fromLang.code, initialSteps[i].toLang.code, abortControllerRef.current?.signal);
        }

        currentText = stepText;

        // Atualizar status do passo concluído
        setSteps(prev => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'success',
            outputText: stepText
          };
          return next;
        });

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Tradução abortada');
          return;
        }

        console.error(`Erro no passo ${i}:`, err);
        setSteps(prev => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'error',
            error: err.message || String(err)
          };
          return next;
        });

        setIsTranslating(false);
        setCurrentStepIndex(-1);
        return;
      }
    }

    // Sucesso completo! Calcular pontuação divertida de fidelidade
    setIsTranslating(false);
    setCurrentStepIndex(-1);

    // Calcular drift heurístico
    calculateFidelity(inputText, currentText, intermediateCodes.length);
  };

  // Calcular fidelidade semântica heurística divertida
  const calculateFidelity = (orig: string, trans: string, chainLength: number) => {
    const origLen = orig.length;
    const transLen = trans.length;
    const lenRatio = Math.min(origLen, transLen) / Math.max(origLen, transLen);

    // Simulação de erosão baseada no tamanho da cadeia
    const baseDrift = 1 - (chainLength * 0.055);
    const randomVariation = 0.85 + Math.random() * 0.2; // 0.85 a 1.05

    let score = Math.round(lenRatio * baseDrift * randomVariation * 100);

    if (score > 99) score = 99;
    if (score < 2) score = 2;

    setFidelityScore(score);
  };

  const getFidelityStatus = (score: number) => {
    if (score >= 90) return {
      title: "Fidelidade Quase Perfeita",
      desc: "O significado atravessou todos os idiomas sem perdas notáveis. Incrível!",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
    };
    if (score >= 75) return {
      title: "Leve Desvio Semântico",
      desc: "Algumas palavras mudaram e houve pequenas alterações de tom, mas a mensagem ainda está bem próxima da original.",
      color: "text-sky-400 border-sky-500/30 bg-sky-500/5"
    };
    if (score >= 50) return {
      title: "Efeito Telefone Sem Fio",
      desc: "O sentido original pegou atalhos e caminhos alternativos. O significado foi parcialmente redefinido no meio do caminho.",
      color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5"
    };
    if (score >= 25) return {
      title: "Mensagem Distorcida",
      desc: "O texto traduzido virou uma caricatura confusa da ideia original. Apenas fragmentos restaram.",
      color: "text-orange-400 border-orange-500/30 bg-orange-500/5"
    };
    return {
      title: "Torre de Babel / Caos Absoluto",
      desc: "A mensagem foi completamente engolida pelas pontes idiomáticas! O sentido final não tem qualquer relação com o início.",
      color: "text-red-400 border-red-500/30 bg-red-500/5"
    };
  };

  // Copiar para área de transferência
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Text-To-Speech
  const handleTTS = (text: string, locale: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlayingAudioStep === index) {
      window.speechSynthesis.cancel();
      setIsPlayingAudioStep(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(locale));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      setIsPlayingAudioStep(null);
    };
    utterance.onerror = () => {
      setIsPlayingAudioStep(null);
    };

    setIsPlayingAudioStep(index);
    window.speechSynthesis.speak(utterance);
  };

  // Garantir que as vozes do SpeechSynthesis sejam carregadas
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const rawFinalTranslation = steps[steps.length - 1]?.status === 'success' ? steps[steps.length - 1].outputText : "";
  const finalTranslation = (difficultySettings.censorMatches && rawFinalTranslation)
    ? censorIdenticalWords(inputText, rawFinalTranslation)
    : rawFinalTranslation;

  return (
    <div 
      className="min-h-screen bg-[#F5F7FB] text-slate-800 flex flex-col antialiased selection:bg-indigo-500/20 selection:text-indigo-600 w-full overflow-y-auto"
      style={{ paddingBottom: 'max(4rem, calc(2rem + env(safe-area-inset-bottom, 0px)))' }}
    >
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-[#F5F7FB]/90 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" style={{ animationDuration: '3.5s' }} />
              Lab de Tradução em Cadeia
            </h1>
            <p className="text-xs text-slate-500 font-medium">O experimento do "Telefone Sem Fio" linguístico</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Google Translate Ativo
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10 font-sans">

        {/* Intro Banner */}
        <section className="bg-slate-900/40 backdrop-blur border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-indigo-500/10 pointer-events-none">
            <Sparkles className="w-40 h-40" />
          </div>
          <div className="space-y-3 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Sparkles className="w-3 h-3" /> Novo Recurso
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Como funciona?</h2>
            <p className="text-slate-400 text-sm md:text-base max-w-3xl leading-relaxed">
              Digite um texto em <strong>inglês</strong>. O sistema irá traduzi-lo sucessivamente através de múltiplos idiomas intermediários selecionados por você (como Alemão, Japonês, Turco, etc.) em série, até a etapa final, que reverte a tradução de volta para o <strong>português</strong>. Veja o texto degradar e reinterpretar o significado a cada passo da jornada!
            </p>
          </div>
        </section>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Text Input & Presets */}
          <div className="lg:col-span-5 space-y-6">

            {/* Input Card */}
            <div className="bg-slate-900/30 backdrop-blur border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span className="text-lg">🇺🇸</span> Texto em Inglês (Input)
                </span>
                <span className="text-xs text-slate-500">
                  {inputText.length} / 5000 caract.
                </span>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, 5000))}
                placeholder="Insira o texto original em inglês aqui..."
                rows={7}
                disabled={isTranslating}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm md:text-base leading-relaxed"
              />

              {/* Text Presets */}
              <div className="space-y-2">
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Exemplos rápidos para testar:
                </span>
                <div className="flex flex-wrap gap-2">
                  {TEXT_EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(ex.text)}
                      disabled={isTranslating}
                      className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {ex.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Difficulty / Chaos Filters Card */}
            <div className="bg-slate-900/30 backdrop-blur border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-lg">
              <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-400" /> Modo Caos e Dificuldade ⚙️
              </span>
              <p className="text-[11px] text-slate-500">
                Ative estes filtros para dificultar que os jogadores identifiquem a origem do texto ou os personagens originais.
              </p>

              <div className="space-y-3 pt-2">
                {/* 1. Obfuscate Proper Nouns */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={difficultySettings.obfuscateNames}
                    onChange={(e) => setDifficultySettings(prev => ({ ...prev, obfuscateNames: e.target.checked }))}
                    disabled={isTranslating}
                    className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      Ofuscar Nomes Próprios
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Substitui automaticamente nomes específicos (ex: Rocky, Joseilson, Sávio) e palavras capitalizadas no meio de frases por termos genéricos para apagar pistas óbvias.
                    </span>
                  </div>
                </label>

                {/* 2. Double-Bounce */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={difficultySettings.doubleBounce}
                    onChange={(e) => setDifficultySettings(prev => ({ ...prev, doubleBounce: e.target.checked }))}
                    disabled={isTranslating}
                    className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      Modo Ricochete (Double-Bounce)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Traduz de ida e volta por idiomas distantes (como Chinês Simplificado e Árabe) a cada etapa intermediária, alterando drasticamente a estrutura sintática.
                    </span>
                  </div>
                </label>

                {/* 3. Shift Pronouns */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={difficultySettings.shiftPronouns}
                    onChange={(e) => setDifficultySettings(prev => ({ ...prev, shiftPronouns: e.target.checked }))}
                    disabled={isTranslating}
                    className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      Alterar Pronomes (Ponto de Vista)
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Muda as pessoas gramaticais (ex: de "Eu" para "Eles") em inglês para mascarar a assinatura pessoal de fala do autor da frase.
                    </span>
                  </div>
                </label>

                {/* 4. Censor Matches */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={difficultySettings.censorMatches}
                    onChange={(e) => setDifficultySettings(prev => ({ ...prev, censorMatches: e.target.checked }))}
                    disabled={isTranslating}
                    className="mt-1 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      Modo Censura (X, Y, Z) 🚫
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                      Substitui palavras da tradução final que permaneceram idênticas ao inglês original por símbolos de censura (ex: [X], [Y]) para apagar pistas óbvias.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Config Presets */}
            <div className="bg-slate-900/30 backdrop-blur border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-lg">
              <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" /> Presets de Cadeias
              </span>
              <div className="grid grid-cols-1 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.chain)}
                    disabled={isTranslating}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left w-full overflow-hidden ${JSON.stringify(intermediateCodes) === JSON.stringify(preset.chain)
                      ? "bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/15"
                      : "bg-slate-950/40 border-slate-900 hover:border-slate-800 hover:bg-slate-900/30"
                      }`}
                  >
                    <div className="flex flex-col w-full overflow-hidden">
                      <span className="text-xs font-bold text-slate-200">{preset.name}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">{preset.description}</span>
                      <div className="flex flex-wrap items-center gap-1 mt-2.5 text-[10px]">
                        <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-mono text-[9px]">EN</span>
                        {preset.chain.length <= 6 ? (
                          preset.chain.map((c, i) => (
                            <React.Fragment key={i}>
                              <ChevronRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                              <span className="bg-indigo-950/50 text-indigo-300 px-1 py-0.5 rounded flex items-center gap-1 border border-indigo-900/30 text-[9px] flex-shrink-0">
                                <span>{LANGUAGES.find(l => l.code === c)?.flag}</span>
                                <span className="font-mono uppercase text-[9px]">{c}</span>
                              </span>
                            </React.Fragment>
                          ))
                        ) : (
                          <>
                            {preset.chain.slice(0, 4).map((c, i) => (
                              <React.Fragment key={i}>
                                <ChevronRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                                <span className="bg-indigo-950/50 text-indigo-300 px-1 py-0.5 rounded flex items-center gap-1 border border-indigo-900/30 text-[9px] flex-shrink-0">
                                  <span>{LANGUAGES.find(l => l.code === c)?.flag}</span>
                                  <span className="font-mono uppercase text-[9px]">{c}</span>
                                </span>
                              </React.Fragment>
                            ))}
                            <ChevronRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                            <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-semibold text-[9px] flex-shrink-0">
                              + {preset.chain.length - 4} outros
                            </span>
                          </>
                        )}
                        <ChevronRight className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                        <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-400 font-mono text-[9px]">PT</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Chain Builder & Execution */}
          <div className="lg:col-span-7 space-y-6">

            {/* The Chain Builder Workspace */}
            <div className="bg-slate-900/30 backdrop-blur border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-lg relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" /> Fluxo da Cadeia Linguística
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={applyRandomChain}
                    disabled={isTranslating}
                    className="text-xs font-semibold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Cadeia Aleatória 🎲
                  </button>
                  <button
                    onClick={shuffleIntermediate}
                    disabled={isTranslating || intermediateCodes.length <= 1}
                    className="text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    Embaralhar 🔀
                  </button>
                  <button
                    onClick={() => setIntermediateCodes([])}
                    disabled={isTranslating}
                    className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              {/* Chain Nodes Map */}
              <div className="flex flex-col gap-4 relative">

                {/* Node: START - English */}
                <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-sm text-slate-400 font-outfit">
                    Ini
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇺🇸</span>
                      <span className="text-xs font-bold text-slate-300 font-outfit">Inglês</span>
                      <span className="text-[10px] bg-slate-900 text-slate-500 px-1 py-0.5 rounded font-mono uppercase">en</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Ponto de partida da mensagem original</span>
                  </div>
                  <div className="text-slate-600">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Nodes: Intermediate list */}
                {intermediateCodes.map((code, idx) => {
                  const currentLang = LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

                  return (
                    <div
                      key={idx}
                      className="group flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800/60 hover:border-slate-700/80 transition-all animate-fade-in"
                    >
                      {/* Left: Index */}
                      <div className="w-8 h-8 rounded-full bg-indigo-950/30 text-indigo-400 border border-indigo-900/30 flex items-center justify-center font-bold text-xs font-outfit">
                        #{idx + 1}
                      </div>

                      {/* Middle: Selector dropdown */}
                      <div className="flex-1 relative flex items-center gap-2">
                        <span className="text-base">{currentLang.flag}</span>
                        <div className="relative">
                          <select
                            value={code}
                            disabled={isTranslating}
                            onChange={(e) => changeIntermediate(idx, e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-5 py-0.5 appearance-none font-outfit"
                          >
                            {LANGUAGES.filter(l => l.code !== 'en' && l.code !== 'pt').map((l) => (
                              <option key={l.code} value={l.code} className="bg-slate-950 text-slate-300">
                                {l.flag} {l.name} ({l.code.toUpperCase()})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-slate-500 absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none" />
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5">

                        {/* Order controls */}
                        <button
                          onClick={() => moveIntermediate(idx, 'left')}
                          disabled={idx === 0 || isTranslating}
                          className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Mover para cima"
                        >
                          <ChevronDown className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => moveIntermediate(idx, 'right')}
                          disabled={idx === intermediateCodes.length - 1 || isTranslating}
                          className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Mover para baixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Insert Button */}
                        <button
                          onClick={() => addIntermediate('de', idx)}
                          disabled={isTranslating || intermediateCodes.length >= 100}
                          className="p-1 hover:bg-indigo-950 rounded text-indigo-400 hover:text-indigo-300"
                          title="Inserir idioma abaixo"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => removeIntermediate(idx)}
                          disabled={isTranslating}
                          className="p-1 hover:bg-red-950 rounded text-slate-500 hover:text-red-400"
                          title="Remover idioma"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State Intermediate warning */}
                {intermediateCodes.length === 0 && (
                  <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 animate-fade-in">
                    <p className="text-xs text-slate-500 font-medium">A cadeia está vazia. O texto irá traduzir diretamente de Inglês para Português.</p>
                    <button
                      onClick={() => addIntermediate('de')}
                      className="mt-2.5 text-[11px] bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Idioma Intermediário
                    </button>
                  </div>
                )}

                {/* Node: END - Portuguese */}
                <div className="flex items-center gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-sm text-slate-400 font-outfit">
                    Fim
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🇧🇷</span>
                      <span className="text-xs font-bold text-slate-300 font-outfit">Português</span>
                      <span className="text-[10px] bg-slate-900 text-slate-500 px-1 py-0.5 rounded font-mono uppercase">pt</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Destino final da mensagem re-traduzida</span>
                  </div>
                </div>

              </div>

              {/* Action trigger button */}
              <div className="pt-2 flex items-center gap-3">
                {isTranslating ? (
                  <button
                    onClick={cancelTranslation}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/20 animate-pulse font-outfit"
                  >
                    <Square className="w-5 h-5 fill-white" />
                    Cancelar Tradução (Passo {currentStepIndex + 1}/{steps.length})
                  </button>
                ) : (
                  <button
                    onClick={startChainTranslation}
                    disabled={isTranslating || !inputText.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed font-outfit"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    Iniciar Tradução em Cadeia
                  </button>
                )}
              </div>
            </div>

            {/* Results & Progress Details */}
            {(steps.length > 0) && (
              <div className="bg-slate-900/30 backdrop-blur border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-lg animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                  <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-yellow-400 animate-pulse" /> Resultado da Tradução
                  </span>
                  {fidelityScore !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Fidelidade Semântica:</span>
                      <span className={`text-sm font-black px-2.5 py-0.5 rounded-full border ${getFidelityStatus(fidelityScore).color} font-outfit`}>
                        {fidelityScore}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Final translation display */}
                {steps[steps.length - 1]?.status === 'success' && (
                  <div className="space-y-4">
                    {fidelityScore !== null && (
                      <div className={`p-4 rounded-xl border border-slate-850 space-y-1 ${getFidelityStatus(fidelityScore).color}`}>
                        <h4 className="text-xs font-bold flex items-center gap-1.5 font-outfit">
                          {getFidelityStatus(fidelityScore).title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          {getFidelityStatus(fidelityScore).desc}
                        </p>
                      </div>
                    )}

                    <div className="relative bg-slate-950/60 border border-slate-900 rounded-xl p-4 min-h-[100px]">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                          <span>🇧🇷</span> Tradução Final (Português)
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTTS(finalTranslation, 'pt-BR', -2)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            title="Ouvir Tradução"
                          >
                            {isPlayingAudioStep === -2 ? (
                              <VolumeX className="w-4 h-4 text-pink-400 animate-pulse" />
                            ) : (
                              <Volume2 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(finalTranslation)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                            title="Copiar Texto"
                          >
                            {copiedText === finalTranslation ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm md:text-base leading-relaxed text-slate-100 whitespace-pre-line font-medium">
                        {finalTranslation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Translation journey steps list */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-outfit">Histórico de Passos da Cadeia</span>
                  <div className="space-y-3">
                    {steps.map((step, idx) => {
                      const isRunning = step.status === 'running';
                      const isSuccess = step.status === 'success';
                      const isError = step.status === 'error';
                      const isPending = step.status === 'pending';

                      return (
                        <div
                          key={idx}
                          className={`border rounded-xl p-4 transition-colors ${
                            isRunning
                              ? "bg-indigo-500/5 border-indigo-500/30"
                              : isSuccess
                              ? "bg-slate-950/20 border-slate-900"
                              : isError
                              ? "bg-red-500/5 border-red-500/20"
                              : "bg-slate-950/5 border-slate-950"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                              <span className="bg-slate-850 px-1.5 py-0.5 rounded text-slate-400 font-mono text-[10px]">Passo #{idx + 1}</span>
                              <span className="flex items-center gap-1 font-medium">
                                <span>{step.fromLang.flag}</span>
                                <span className="uppercase text-[10px] font-mono text-slate-400">{step.fromLang.code}</span>
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                              <span className="flex items-center gap-1 font-medium">
                                <span>{step.toLang.flag}</span>
                                <span className="uppercase text-[10px] font-mono text-slate-400">{step.toLang.code}</span>
                              </span>
                            </div>

                            {/* Status badge */}
                            <div className="flex items-center gap-2">
                              {isRunning && (
                                <span className="flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-semibold animate-pulse">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Traduzindo...
                                </span>
                              )}
                              {isSuccess && (
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                                  Sucesso
                                </span>
                              )}
                              {isError && (
                                <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-semibold">
                                  Falha
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800 font-medium">
                                  Aguardando
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Step content */}
                          {(isSuccess || isRunning) && (
                            <div className="space-y-3 pt-3 border-t border-slate-900">
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                  <span>Entrada ({step.fromLang.name})</span>
                                  <button
                                    onClick={() => handleTTS(step.inputText, step.fromLang.locale, idx * 2)}
                                    className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-300"
                                  >
                                    {isPlayingAudioStep === idx * 2 ? (
                                      <VolumeX className="w-3 h-3 text-pink-400 animate-pulse" />
                                    ) : (
                                      <Volume2 className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/40 p-2 rounded border border-slate-900/50">
                                  {step.inputText}
                                </p>
                              </div>

                              {isSuccess && (
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                                    <span>Saída ({step.toLang.name})</span>
                                    <button
                                      onClick={() => handleTTS(step.outputText, step.toLang.locale, idx * 2 + 1)}
                                      className="p-1 hover:bg-slate-900 rounded text-slate-500 hover:text-slate-300"
                                    >
                                      {isPlayingAudioStep === idx * 2 + 1 ? (
                                        <VolumeX className="w-3 h-3 text-pink-400 animate-pulse" />
                                      ) : (
                                        <Volume2 className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-xs text-slate-200 leading-relaxed font-mono bg-slate-950/40 p-2 rounded border border-slate-900/50">
                                    {step.outputText}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {isError && (
                            <div className="pt-2 border-t border-slate-900 text-xs text-red-400 leading-relaxed">
                              {step.error || 'Ocorreu um erro ao processar este passo da tradução.'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </main>

    </div>
  );
}
