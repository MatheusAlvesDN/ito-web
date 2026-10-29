import { useState, useEffect, useRef } from "react";
import { shuffle } from "../../utils/secureRandom";
import { Info } from "lucide-react";
import { Card, Screen } from "../../ui";
import { LANGUAGES, type DifficultySettings, type TranslationStep } from "./data";
import { censorIdenticalWords, obfuscateProperNouns, shiftPronouns } from "./textFilters";
import { translateText } from "./translationService";
import TextInputCard from "./components/TextInputCard";
import DifficultySettingsCard from "./components/DifficultySettingsCard";
import ChainPresetsCard from "./components/ChainPresetsCard";
import ChainBuilder from "./components/ChainBuilder";
import TranslationResults from "./components/TranslationResults";

interface TranslatorPageProps {
  /** Só para o App.tsx antigo; nas rotas novas o voltar vai para "/". */
  onBack?: () => void;
}

// Tradutor maluco: traduz um texto em inglês por uma cadeia de idiomas até voltar ao português.
export default function TranslatorPage({ onBack }: TranslatorPageProps) {
  // Estados principais
  const [inputText, setInputText] = useState("");
  const [intermediateCodes, setIntermediateCodes] = useState<string[]>(['de', 'es', 'fr']);
  const [isPlayingAudioStep, setIsPlayingAudioStep] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [steps, setSteps] = useState<TranslationStep[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [fidelityScore, setFidelityScore] = useState<number | null>(null);
  const [difficultySettings, setDifficultySettings] = useState<DifficultySettings>({
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
    const shuffled = shuffle(pool);
    setIntermediateCodes(shuffled.slice(0, len).map(l => l.code));
  };

  // Embaralhar cadeia atual
  const shuffleIntermediate = () => {
    if (isTranslating) return;
    const shuffled = shuffle(intermediateCodes);
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

      } catch (err: unknown) {
        if ((err as { name?: string } | null)?.name === 'AbortError') {
          console.log('Tradução abortada');
          return;
        }

        console.error(`Erro no passo ${i}:`, err);
        setSteps(prev => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: 'error',
            error: (err instanceof Error && err.message) || String(err)
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
      // Abortar requisições de tradução em andamento ao sair da tela
      abortControllerRef.current?.abort();
    };
  }, []);

  const rawFinalTranslation = steps[steps.length - 1]?.status === 'success' ? steps[steps.length - 1].outputText : "";
  const finalTranslation = (difficultySettings.censorMatches && rawFinalTranslation)
    ? censorIdenticalWords(inputText, rawFinalTranslation)
    : rawFinalTranslation;

  return (
    <Screen title="Tradutor maluco" subtitle='O "telefone sem fio" entre idiomas' back={onBack ?? "/"} width="wide">
      <div className="space-y-6">
        <Card tone="brand" as="section" aria-labelledby="tr-how">
          <div className="flex gap-3">
            <Info aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-strong" />
            <div className="space-y-1">
              <h2 id="tr-how" className="font-display text-base font-bold">Como funciona?</h2>
              <p className="text-sm leading-relaxed text-muted">
                Digite um texto em <strong className="text-ink">inglês</strong>. Ele é traduzido em série pelos idiomas intermediários
                que você escolher (alemão, japonês, turco…) e, no fim, volta para o <strong className="text-ink">português</strong>. Veja o
                sentido se perder a cada passo!
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <TextInputCard inputText={inputText} isTranslating={isTranslating} onInputChange={setInputText} />
            <DifficultySettingsCard
              settings={difficultySettings}
              isTranslating={isTranslating}
              onToggle={(key, checked) => setDifficultySettings(prev => ({ ...prev, [key]: checked }))}
            />
            <ChainPresetsCard intermediateCodes={intermediateCodes} isTranslating={isTranslating} onApplyPreset={applyPreset} />
          </div>

          <div className="space-y-6 lg:col-span-7">
            <ChainBuilder
              intermediateCodes={intermediateCodes}
              isTranslating={isTranslating}
              canStart={!!inputText.trim()}
              currentStepIndex={currentStepIndex}
              totalSteps={steps.length}
              onRandomChain={applyRandomChain}
              onShuffle={shuffleIntermediate}
              onClear={() => setIntermediateCodes([])}
              onChange={changeIntermediate}
              onMove={moveIntermediate}
              onAdd={addIntermediate}
              onRemove={removeIntermediate}
              onStart={startChainTranslation}
              onCancel={cancelTranslation}
            />
            {steps.length > 0 && (
              <TranslationResults
                steps={steps}
                fidelityScore={fidelityScore}
                finalTranslation={finalTranslation}
                isPlayingAudioStep={isPlayingAudioStep}
                copiedText={copiedText}
                onTTS={handleTTS}
                onCopy={copyToClipboard}
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
