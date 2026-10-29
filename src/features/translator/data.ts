// Dados estáticos e tipos do Lab de Tradução em Cadeia

export interface Language {
  code: string;
  name: string;
  flag: string;
  locale: string;
}

export interface TranslationStep {
  fromLang: Language;
  toLang: Language;
  inputText: string;
  outputText: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  chain: string[];
}

export interface TextExample {
  title: string;
  text: string;
}

export interface DifficultySettings {
  obfuscateNames: boolean;
  doubleBounce: boolean;
  shiftPronouns: boolean;
  censorMatches: boolean;
}

export interface FidelityStatus {
  title: string;
  desc: string;
  /** Classes Tailwind (texto/borda/fundo) com tokens do tema. */
  color: string;
}

export const LANGUAGES: Language[] = [
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

export const PRESETS: Preset[] = [
  { id: 'babel', name: 'Babel Clássica', description: 'Giro clássico pela Europa, Ásia e Oriente Médio', chain: ['de', 'ru', 'zh-CN', 'ar', 'fr'] },
  { id: 'asia', name: 'Loop Asiático', description: 'Traduções em cadeia por potências asiáticas', chain: ['zh-CN', 'ja', 'ko', 'vi', 'th'] },
  { id: 'nordic', name: 'Rota Nórdica', description: 'Cadeia de dialetos do norte europeu', chain: ['sv', 'no', 'da', 'fi'] },
  { id: 'short', name: 'Cadeia Curta', description: 'Tradução rápida com poucos intermediários', chain: ['es', 'fr'] },
  { id: 'world', name: 'Volta ao Mundo', description: 'Longa jornada por alfabetos diversos', chain: ['ja', 'ru', 'el', 'he', 'hi', 'it', 'es'] },
  { id: 'all', name: 'Maratona Global 🌍', description: 'Cadeia gigante passando por todos os 54 idiomas intermediários!', chain: ['de', 'es', 'fr', 'it', 'ja', 'zh-CN', 'zh-TW', 'ru', 'ko', 'ar', 'hi', 'tr', 'nl', 'pl', 'sv', 'da', 'no', 'fi', 'el', 'cs', 'ro', 'hu', 'vi', 'id', 'th', 'he', 'uk', 'bn', 'ms', 'fa', 'tl', 'ga', 'la', 'sw', 'is', 'eo', 'cy', 'eu', 'et', 'lt', 'ka', 'mt', 'sq', 'hy', 'ta', 'te', 'kn', 'km', 'lo', 'my', 'so', 'mi', 'am', 'mn'] },
];

export const TEXT_EXAMPLES: TextExample[] = [
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

export const getFidelityStatus = (score: number): FidelityStatus => {
  if (score >= 90) return {
    title: "Fidelidade Quase Perfeita",
    desc: "O significado atravessou todos os idiomas sem perdas notáveis. Incrível!",
    color: "text-success border-success/30 bg-success/5"
  };
  if (score >= 75) return {
    title: "Leve Desvio Semântico",
    desc: "Algumas palavras mudaram e houve pequenas alterações de tom, mas a mensagem ainda está bem próxima da original.",
    color: "text-wood border-wood/30 bg-wood/5"
  };
  if (score >= 50) return {
    title: "Efeito Telefone Sem Fio",
    desc: "O sentido original pegou atalhos e caminhos alternativos. O significado foi parcialmente redefinido no meio do caminho.",
    color: "text-warning border-warning/30 bg-warning/5"
  };
  if (score >= 25) return {
    title: "Mensagem Distorcida",
    desc: "O texto traduzido virou uma caricatura confusa da ideia original. Apenas fragmentos restaram.",
    color: "text-brand-strong border-brand/30 bg-brand/5"
  };
  return {
    title: "Torre de Babel / Caos Absoluto",
    desc: "A mensagem foi completamente engolida pelas pontes idiomáticas! O sentido final não tem qualquer relação com o início.",
    color: "text-danger border-danger/30 bg-danger/5"
  };
};
