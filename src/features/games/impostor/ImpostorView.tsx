// View do modo `impostor` (Impostor). Regras no servidor (backend/app/games/impostor.py).
// Fases: distribution → discussion → reveal (→ JUDGE, reenviável) → NEW_ROUND.
// Segredos: local só em `game.card` (via SecretCardDistribution); online só em `game.you`.
// Impostor e as duas perguntas só chegam em `game.reveal` (fase reveal).
import { useState, type ReactNode } from 'react';
import { Check, Eye, EyeOff, History, Hourglass, MessageCircle, RefreshCw, ShieldCheck, Users, VenetianMask } from 'lucide-react';
import { Badge, Button, Card, PlayerAvatar, cx, focusRing } from '../../../ui';
import { ActionBar, OnlineSecretCard, SecretCardDistribution, SeatLabel, TimerPanel, WaitingForHost } from '../components';
import { seatOf } from '../seats';
import type { GameViewProps } from '../types';

type Props = GameViewProps<'impostor'>;
type Game = Props['game'];
type Outcome = NonNullable<Game['reveal']>['outcome'];

export default function ImpostorView(props: Props) {
  const { game } = props;
  if (game.phase === 'reveal') return <RevealStep key={game.phaseSeq} {...props} />;
  if (game.phase === 'discussion') return <DiscussionStep key={game.phaseSeq} {...props} />;
  return <DistributionStep key={game.phaseSeq} {...props} />;
}

// ------------------------------------------------------------------ carta (papel + pergunta)

/** Conteúdo da carta secreta: deixa claríssimo para quem segura o celular se é honesto ou impostor. */
function RoleCard({ question, isImpostor }: { question: string; isImpostor: boolean }) {
  const Icon = isImpostor ? VenetianMask : ShieldCheck;
  return (
    <div className="space-y-4 text-center">
      <div
        className={cx(
          'mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 font-display text-sm font-bold uppercase tracking-wider',
          isImpostor ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success',
        )}
      >
        <Icon aria-hidden className="h-4 w-4" />
        {isImpostor ? 'Você é o impostor' : 'Você é do grupo'}
      </div>
      <p className="font-display text-2xl font-bold leading-snug text-ink">{question}</p>
      <p className="text-sm leading-relaxed text-muted">
        {isImpostor
          ? 'Sua pergunta é diferente da do grupo. Responda, disfarce e tente descobrir qual é a pergunta deles.'
          : 'Todos do grupo têm esta mesma pergunta — menos o impostor. Responda e descubra quem destoa.'}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ distribution

function DistributionStep({ game, seatsById, isHost, local, mySeatId, send }: Props) {
  if (local) {
    return (
      <div className="space-y-4">
        {game.distribution ? (
          <SecretCardDistribution
            distribution={game.distribution}
            card={game.card}
            seatsById={seatsById}
            send={send}
            title={`Rodada ${game.round} · cartas`}
            renderCard={(c) => <RoleCard question={c.question} isImpostor={c.isImpostor} />}
            lastLabel="Começar a discussão"
            hint="Só essa pessoa deve olhar a tela. Um de vocês é o impostor e recebe uma pergunta diferente."
          />
        ) : (
          <Card className="text-center text-muted">Preparando as cartas…</Card>
        )}
        <HistoryList game={game} seatsById={seatsById} local />
      </div>
    );
  }

  const total = game.roundSeatIds.length;
  const viewed = new Set(game.viewed);
  const allViewed = total > 0 && viewed.size >= total;
  const acknowledged = mySeatId != null && viewed.has(mySeatId);

  return (
    <div className="space-y-4">
      {game.you ? (
        <OnlineSecretCard
          title={`Sua carta · rodada ${game.round}`}
          acknowledged={acknowledged}
          onAck={() => send({ type: 'ACK_CARD' })}
          viewedCount={viewed.size}
          total={total}
        >
          <RoleCard question={game.you.question} isImpostor={game.you.isImpostor} />
        </OnlineSecretCard>
      ) : (
        <Card tone="sunken" className="text-center text-sm text-muted">
          Você entrou no meio da rodada — vai jogar a partir da próxima. Acompanhe a discussão!
        </Card>
      )}

      <section aria-label="Quem já viu a carta">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Quem já viu</h3>
        <ul className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {game.roundSeatIds.map((id) => {
            const seat = seatOf(seatsById, id);
            const seen = viewed.has(id);
            return (
              <li
                key={id}
                className={cx('flex items-center gap-2 rounded-2xl border p-2 pr-3', seen ? 'border-success/30 bg-success/10' : 'border-line bg-surface')}
              >
                <SeatLabel
                  seat={seat}
                  size="xs"
                  showYou
                  className="flex-1 text-sm"
                  trailing={
                    seen ? (
                      <Check aria-label="já viu" className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Hourglass aria-label="ainda não viu" className="h-4 w-4 shrink-0 text-muted" />
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      <HistoryList game={game} seatsById={seatsById} local={false} />

      <ActionBar hint={isHost && !allViewed ? `${viewed.size} de ${total} já viram a carta.` : undefined}>
        {isHost ? (
          <Button
            fullWidth
            size="lg"
            variant={allViewed ? 'primary' : 'secondary'}
            rightIcon={<MessageCircle className="h-5 w-5" />}
            onClick={() => send({ type: 'START_DISCUSSION' })}
          >
            {allViewed ? 'Começar a discussão' : 'Começar mesmo assim'}
          </Button>
        ) : (
          <WaitingForHost>
            {allViewed ? 'Todos viram. Aguardando o líder começar a discussão…' : 'Aguardando o líder… veja sua carta e confirme.'}
          </WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ discussion

function DiscussionStep({ game, seatsById, isHost, local, send }: Props) {
  const [showMine, setShowMine] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand-strong">
          <MessageCircle className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">Hora da discussão</h2>
          <p className="text-sm text-muted">Cada um responde à sua pergunta. Quem está destoando?</p>
        </div>
      </div>

      {game.timer && <TimerPanel timer={game.timer} canControl={isHost} send={send} label="Discussão" />}

      {!local && game.you && (
        <Card tone="sunken" padding="sm" className="space-y-3">
          <button
            type="button"
            aria-expanded={showMine}
            onClick={() => setShowMine((s) => !s)}
            className={cx('flex w-full items-center justify-between gap-2 rounded-xl text-left text-sm font-semibold', focusRing)}
          >
            <span>Rever minha carta</span>
            {showMine ? <EyeOff aria-hidden className="h-4 w-4 text-muted" /> : <Eye aria-hidden className="h-4 w-4 text-muted" />}
          </button>
          {showMine && (
            <div className="animate-fade-in rounded-2xl border border-line bg-surface p-4">
              <RoleCard question={game.you.question} isImpostor={game.you.isImpostor} />
            </div>
          )}
        </Card>
      )}

      <Card tone="sunken" padding="sm" className="space-y-1.5 text-sm leading-relaxed text-muted">
        <p>
          <strong className="text-ink">Grupo:</strong> façam perguntas sobre as respostas e encontrem quem tem a pergunta diferente.
        </p>
        <p>
          <strong className="text-ink">Impostor:</strong> disfarce e tente descobrir a pergunta do grupo.
        </p>
      </Card>

      <section aria-label="Jogadores da rodada">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <Users aria-hidden className="h-3.5 w-3.5" />
          Na rodada
        </h3>
        <ul className="flex flex-wrap gap-2">
          {game.roundSeatIds.map((id) => {
            const seat = seatOf(seatsById, id);
            return (
              <li key={id} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-sm">
                <PlayerAvatar name={seat.name} avatar={seat.avatar} size="xs" decorative className={cx(!seat.connected && 'opacity-50')} />
                <span className="max-w-[8rem] truncate">{seat.name}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <HistoryList game={game} seatsById={seatsById} local={local} />

      <ActionBar>
        {isHost ? (
          <Button fullWidth size="lg" leftIcon={<VenetianMask className="h-5 w-5" />} onClick={() => send({ type: 'REVEAL' })}>
            Revelar o impostor
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder revelar o impostor…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

// ------------------------------------------------------------------ reveal

function RevealStep({ game, seatsById, isHost, local, mySeatId, send }: Props) {
  const reveal = game.reveal;
  if (!reveal) return <Card className="text-center text-muted">Revelando…</Card>;

  const impostor = seatOf(seatsById, reveal.impostorId);
  const youWereImpostor = !local && mySeatId != null && mySeatId === reveal.impostorId;
  const outcome = reveal.outcome;

  return (
    <div className="space-y-4">
      <Card padding="lg" className="flex animate-fade-in-scale flex-col items-center gap-3 text-center" aria-live="polite">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-danger">
          <VenetianMask aria-hidden className="h-4 w-4" />O impostor era
        </p>
        <PlayerAvatar name={impostor.name} avatar={impostor.avatar} size="xl" highlight decorative />
        <p className="font-display text-3xl font-extrabold">{youWereImpostor ? 'Você!' : impostor.name}</p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card tone="sunken" padding="sm" className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
            Pergunta do grupo
          </p>
          <p className="font-display text-lg font-bold leading-snug">{reveal.honestQuestion}</p>
        </Card>
        <Card tone="sunken" padding="sm" className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-danger">
            <VenetianMask aria-hidden className="h-3.5 w-3.5" />
            Pergunta do impostor
          </p>
          <p className="font-display text-lg font-bold leading-snug">{reveal.impostorQuestion}</p>
        </Card>
      </div>

      <Card tone="brand" className="space-y-3">
        <div>
          <h2 className="font-display text-base font-bold">Chute de redenção</h2>
          <p className="text-sm text-muted">
            {impostor.name} tem uma chance de adivinhar a pergunta do grupo. Acertou? O impostor vence; errou? Vitória do grupo.
          </p>
        </div>
        {isHost ? (
          <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2" role="group" aria-label="O impostor acertou a pergunta do grupo?">
            <JudgeButton
              selected={outcome === 'impostor_won'}
              icon={<VenetianMask className="h-5 w-5" />}
              label="Acertou"
              sub="Impostor vence"
              onClick={() => send({ type: 'JUDGE', impostorGuessed: true })}
            />
            <JudgeButton
              selected={outcome === 'group_won'}
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Errou"
              sub="Grupo vence"
              onClick={() => send({ type: 'JUDGE', impostorGuessed: false })}
            />
          </div>
        ) : outcome === 'pending' ? (
          <WaitingForHost>Aguardando o líder registrar o chute…</WaitingForHost>
        ) : null}
        {outcome !== 'pending' && <OutcomeBanner outcome={outcome} />}
      </Card>

      <HistoryList game={game} seatsById={seatsById} local={local} />

      <ActionBar hint={isHost && outcome === 'pending' ? 'Registre o chute para a rodada entrar no histórico.' : undefined}>
        {isHost ? (
          <Button
            fullWidth
            size="lg"
            variant={outcome === 'pending' ? 'secondary' : 'primary'}
            leftIcon={<RefreshCw className="h-5 w-5" />}
            onClick={() => send({ type: 'NEW_ROUND' })}
          >
            Nova rodada
          </Button>
        ) : (
          <WaitingForHost>Aguardando o líder iniciar a próxima rodada…</WaitingForHost>
        )}
      </ActionBar>
    </div>
  );
}

function JudgeButton({ selected, icon, label, sub, onClick }: { selected: boolean; icon: ReactNode; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
        selected ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink hover:bg-surface-2',
        focusRing,
      )}
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold">{label}</span>
        <span className={cx('block text-xs', selected ? 'text-brand-ink' : 'text-muted')}>{sub}</span>
      </span>
      {selected && <Check aria-hidden className="ml-auto h-5 w-5 shrink-0" strokeWidth={3} />}
    </button>
  );
}

function OutcomeBanner({ outcome }: { outcome: Exclude<Outcome, 'pending'> }) {
  const impostorWon = outcome === 'impostor_won';
  return (
    <p
      role="status"
      className={cx(
        'flex animate-fade-in items-center justify-center gap-2 rounded-2xl border p-3 font-display text-lg font-bold',
        impostorWon ? 'border-danger/30 bg-danger/10 text-danger' : 'border-success/30 bg-success/10 text-success',
      )}
    >
      {impostorWon ? <VenetianMask aria-hidden className="h-5 w-5" /> : <ShieldCheck aria-hidden className="h-5 w-5" />}
      {impostorWon ? 'O impostor venceu!' : 'O grupo venceu!'}
    </p>
  );
}

// ------------------------------------------------------------------ histórico público

function HistoryList({ game, seatsById, local }: { game: Game; seatsById: Props['seatsById']; local: boolean }) {
  if (game.history.length === 0) return null;
  const rows = [...game.history].sort((a, b) => b.round - a.round);
  const groupWins = rows.filter((h) => h.outcome === 'group_won').length;
  const impostorWins = rows.filter((h) => h.outcome === 'impostor_won').length;

  return (
    <section aria-label="Histórico de rodadas">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <History aria-hidden className="h-3.5 w-3.5" />
          Impostores
        </h3>
        <span className="flex gap-1.5">
          <Badge tone="success" icon={<ShieldCheck />}>
            Grupo {groupWins}
          </Badge>
          <Badge tone="danger" icon={<VenetianMask />}>
            Impostor {impostorWins}
          </Badge>
        </span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((h) => {
          const seat = seatOf(seatsById, h.impostorId);
          const impostorWon = h.outcome === 'impostor_won';
          return (
            <li
              key={h.round}
              aria-label={`Rodada ${h.round}: impostor ${seat.name}, ${impostorWon ? 'impostor venceu' : 'grupo venceu'}`}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2 pr-3 text-sm"
            >
              <span className="w-9 shrink-0 text-center text-xs font-semibold text-muted">R{h.round}</span>
              <SeatLabel seat={seat} size="xs" showYou={!local} className="flex-1" />
              <span className="sr-only">era o impostor</span>
              <span className={cx('flex shrink-0 items-center gap-1 text-xs font-semibold', impostorWon ? 'text-danger' : 'text-success')}>
                {impostorWon ? <VenetianMask aria-hidden className="h-3.5 w-3.5" /> : <ShieldCheck aria-hidden className="h-3.5 w-3.5" />}
                {impostorWon ? 'Impostor venceu' : 'Grupo venceu'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
