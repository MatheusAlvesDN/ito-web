// View do modo `whoami` (Quem Sou Eu). Regras e visibilidade: backend/app/games/whoami.py.
// Fases: reveal (só local) → playing → match_ended → (overall). Online começa em playing.
// Local: o aparelho mostra a carta de qualquer jogador quando pedirem ("Ver carta").
// Online: você vê a personalidade dos outros, nunca a sua (o servidor manda `null`) até o fim da partida.
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../ui';
import { SecretCardDistribution } from '../components';
import type { GameViewProps } from '../types';
import { PlayingStep } from './PlayingStep';
import { MatchEndedStep, OverallStep } from './ResultsSteps';

export type WhoAmIProps = GameViewProps<'whoami'>;

export default function WhoAmIView(props: WhoAmIProps) {
  const { game } = props;
  if (game.phase === 'reveal') return <RevealStep {...props} />;
  if (game.phase === 'match_ended') return <MatchEndedStep key={game.phaseSeq} {...props} />;
  if (game.phase === 'overall') return <OverallStep key={game.phaseSeq} {...props} />;
  return <PlayingStep key={game.phaseSeq} {...props} />;
}

// ------------------------------------------------------------------ reveal (Pass and Play)

function RevealStep({ game, seatsById, send }: WhoAmIProps) {
  if (!game.distribution) return null;
  return (
    <SecretCardDistribution
      distribution={game.distribution}
      card={game.card}
      seatsById={seatsById}
      send={send}
      title={`Partida ${game.matchNumber} · Personalidades`}
      hint="Revele a carta sem olhar e segure o celular na testa: os outros leem quem você é. Se alguém não conhecer a personalidade, troque."
      revealLabel={(seat) => `Mostrar a carta de ${seat.name} (sem olhar!)`}
      openHint="Quem está com o celular na testa não pode olhar. Os outros memorizam e o grupo segue."
      renderCard={(c) => (
        <>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Personalidade</p>
          <p key={c.personality} className="mt-1 animate-fade-in font-display text-3xl font-extrabold leading-tight text-brand-strong">
            {c.personality}
          </p>
        </>
      )}
      cardActions={(c) => (
        <Button
          fullWidth
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => send({ type: 'REROLL', seatId: c.seatId }, c.seatId)}
        >
          Trocar personalidade
        </Button>
      )}
      lastLabel="Começar a partida"
    />
  );
}
