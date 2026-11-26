import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Box,
  Club,
  Crown,
  Dice5,
  Flame,
  Gamepad2,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import { GameThumbnail } from './GameArtwork';
import { GreedyProGame } from './GreedyProGame';
import { OchkuzSandiqGame } from './OchkuzSandiqGame';
import { FootballKungGame } from './FootballKungGame';
import { RakitaGame } from './RakitaGame';
import { TexasKovboyGame } from './TexasKovboyGame';
import { OltinOmadGame } from './OltinOmadGame';
import { OmadliMevaGame } from './OmadliMevaGame';
import { JekpotGame } from './JekpotGame';
import { YoshPattiGame } from './YoshPattiGame';
import { JackpotSlotGame } from './JackpotSlotGame';
import type { GameDefinition, UserProfile } from '../types/turon';

interface GamePlayArenaProps {
  game: GameDefinition;
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

export const GamePlayArena: React.FC<GamePlayArenaProps> = (props) => {
  const renderGameBody = () => {
    if (props.game.mechanic === 'greedy_pro') {
      return (
        <GreedyProGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.mechanic === 'box') {
      return (
        <OchkuzSandiqGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.mechanic === 'football') {
      return (
        <FootballKungGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.mechanic === 'rocket') {
      return (
        <RakitaGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'texas-kovboy') {
      return (
        <TexasKovboyGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'oltin-omad') {
      return (
        <OltinOmadGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'omadli-meva') {
      return (
        <OmadliMevaGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'jekpot') {
      return (
        <JekpotGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'yosh-patti') {
      return (
        <YoshPattiGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    if (props.game.id === 'jackpot-slot') {
      return (
        <JackpotSlotGame
          currentUser={props.currentUser}
          onBack={props.onBack}
          onUserUpdated={props.onUserUpdated}
          onShareResultInRoom={props.onShareResultInRoom}
        />
      );
    }
    return (
      <div className="w-full max-w-3xl mx-auto p-3 sm:p-6">
        <StandardGamePlayArena {...props} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#060312] overflow-y-auto overflow-x-hidden flex flex-col">
      <div className="w-full min-h-[100dvh] flex-1 flex flex-col sm:justify-center sm:p-4">
        {renderGameBody()}
      </div>
    </div>
  );
};

const StandardGamePlayArena: React.FC<GamePlayArenaProps> = ({
  game,
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [statusText, setStatusText] = useState('O‘yin boshlashga tayyor');
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function recordResult(deltaPoints: number, outcome: string, isWin: boolean) {
    setLastDelta(deltaPoints);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: game.id,
          gameTitle: game.title,
          category: game.category,
          deltaPoints,
          outcome,
          isWin,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore
    }
  }

  // --------------------------------------------------------------------------
  // 1. LUDO / LYUDO JAMOASI / JACKAROO (Board Track Engine)
  // --------------------------------------------------------------------------
  const [playerPos, setPlayerPos] = useState(0);
  const [partnerPos, setPartnerPos] = useState(0);
  const [botPos, setBotPos] = useState(0);
  const [diceVal, setDiceVal] = useState<number | null>(null);
  const trackMax = game.mechanic === 'jackaroo' ? 24 : 20;

  function rollBoardTurn() {
    if (busy || playerPos >= trackMax || botPos >= trackMax) return;
    setBusy(true);
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceVal(roll);
    const nextP = Math.min(trackMax, playerPos + roll);
    setPlayerPos(nextP);

    if (game.mechanic === 'ludo_team') {
      const partnerRoll = Math.floor(Math.random() * 4) + 1;
      setPartnerPos((prev) => Math.min(trackMax, prev + partnerRoll));
    }

    if (nextP >= trackMax) {
      const pts = game.mechanic === 'ludo_team' ? 250 : 200;
      setStatusText(`Tabriklaymiz! ${game.title} marrasiga birinchi bo‘lib yetdingiz!`);
      recordResult(pts, 'Marraga birinchi yetdingiz!', true);
      setBusy(false);
      return;
    }

    setStatusText(`Sizga ${roll} tushdi (${nextP}/${trackMax}). Raqib yurmoqda...`);
    setTimeout(() => {
      const bRoll = Math.floor(Math.random() * 6) + 1;
      const nextB = Math.min(trackMax, botPos + bRoll);
      setBotPos(nextB);
      if (nextB >= trackMax) {
        setStatusText(`Raqib ${bRoll} tashlab marraga yetdi. Keyingi safar omad!`);
        recordResult(-40, 'Raqib marraga birinchi yetdi', false);
      } else {
        setStatusText(`Raqib ${bRoll} tashladi (${nextB}/${trackMax}). Navbat sizda!`);
      }
      setBusy(false);
    }, 550);
  }

  function resetBoard() {
    setPlayerPos(0);
    setPartnerPos(0);
    setBotPos(0);
    setDiceVal(null);
    setLastDelta(null);
    setStatusText('Yangi partiya boshlandi. Tosh tashlang!');
  }

  // --------------------------------------------------------------------------
  // 2. CARROM STRIKER MINI-GAME
  // --------------------------------------------------------------------------
  const [carromPower, setCarromPower] = useState(65);
  const [carromAngle, setCarromAngle] = useState(0);
  const [carromPockets, setCarromPockets] = useState(0);
  const [carromShots, setCarromShots] = useState(5);

  function shootCarrom() {
    if (busy || carromShots <= 0) return;
    setBusy(true);
    const accuracy = 100 - Math.abs(carromAngle) * 1.4 - Math.abs(carromPower - 70) * 0.7;
    const hit = accuracy + Math.random() * 35 > 55;
    const nextShots = carromShots - 1;
    setCarromShots(nextShots);

    setTimeout(() => {
      const nextPockets = hit ? carromPockets + 1 : carromPockets;
      if (hit) setCarromPockets(nextPockets);
      if (nextShots === 0) {
        const won = nextPockets >= 2;
        const delta = won ? nextPockets * 60 : -25;
        setStatusText(
          won
            ? `Carrom tugadi! ${nextPockets} ta tosh tushirildi (+${delta} ball)`
            : `Carrom tugadi. Atigi ${nextPockets} ta tosh tushdi (${delta} ball)`
        );
        recordResult(
          delta,
          won ? `${nextPockets} ta tosh tushirildi` : 'Yetarli tosh tushirilmadi',
          won
        );
      } else {
        setStatusText(
          hit
            ? `Ajoyib zarba! Tosh teshikka tushdi (${carromShots - 1} zarba qoldi)`
            : `Biroz chetga ketdi. Burchak va kuchni sozlab qayta urining (${carromShots - 1} qoldi)`
        );
      }
      setBusy(false);
    }, 350);
  }

  // --------------------------------------------------------------------------
  // 3. UMO CARD SHEDDING & DOMINO TILE MATCHING
  // --------------------------------------------------------------------------
  const COLORS = ['Ko‘k', 'Binafsha', 'Oltin', 'Yashil'] as const;
  type UmoCard = { id: string; color: string; num: number };
  const [umoTop, setUmoTop] = useState<UmoCard>({ id: 'top', color: 'Ko‘k', num: 4 });
  const [umoHand, setUmoHand] = useState<UmoCard[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `c-${i}-${Math.random()}`,
      color: COLORS[i % 4],
      num: ((i * 2 + 3) % 9) + 1,
    }))
  );
  const [umoBotCount, setUmoBotCount] = useState(5);

  function playUmoCard(card: UmoCard) {
    if (busy || umoHand.length === 0 || umoBotCount === 0) return;
    if (card.color !== umoTop.color && card.num !== umoTop.num) {
      setStatusText('Bu karta mos emas — rangi yoki raqami ustki kartaga mos bo‘lishi kerak.');
      return;
    }
    const nextHand = umoHand.filter((c) => c.id !== card.id);
    setUmoHand(nextHand);
    setUmoTop(card);
    if (nextHand.length === 0) {
      setStatusText('UMO! Siz barcha kartalardan birinchi bo‘lib qutuldingiz!');
      recordResult(180, 'UMO G‘alaba!', true);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const botCanPlay = Math.random() > 0.35;
      if (botCanPlay) {
        const nextBot = umoBotCount - 1;
        setUmoBotCount(nextBot);
        const nextCol = COLORS[Math.floor(Math.random() * 4)];
        const nextNum = Math.floor(Math.random() * 9) + 1;
        setUmoTop({ id: `b-${Date.now()}`, color: nextCol, num: nextNum });
        if (nextBot === 0) {
          setStatusText('Bot barcha kartasini tugatdi. Qayta o‘ynang!');
          recordResult(-40, 'Bot barcha kartalarni tugatdi', false);
        } else {
          setStatusText(`Bot karta tashladi (${nextBot} ta qoldi). Navbat sizda!`);
        }
      } else {
        setUmoBotCount((c) => c + 1);
        setStatusText('Bot mos karta topolmadi va 1 ta karta oldi. Navbat sizda!');
      }
      setBusy(false);
    }, 450);
  }

  function drawUmoCard() {
    if (busy) return;
    const newCard: UmoCard = {
      id: `d-${Date.now()}`,
      color: COLORS[Math.floor(Math.random() * 4)],
      num: Math.floor(Math.random() * 9) + 1,
    };
    setUmoHand((prev) => [...prev, newCard]);
    setStatusText(`Yangi karta olindi: ${newCard.color} ${newCard.num}`);
  }

  // Domino State
  type DominoTile = { id: string; a: number; b: number };
  const [dominoEnds, setDominoEnds] = useState<[number, number]>([3, 5]);
  const [dominoHand, setDominoHand] = useState<DominoTile[]>([
    { id: 'd1', a: 5, b: 6 },
    { id: 'd2', a: 3, b: 2 },
    { id: 'd3', a: 6, b: 1 },
    { id: 'd4', a: 2, b: 4 },
  ]);
  const [dominoBotLeft, setDominoBotLeft] = useState(4);

  function playDomino(tile: DominoTile) {
    if (busy || dominoHand.length === 0 || dominoBotLeft === 0) return;
    const [left, right] = dominoEnds;
    let nextEnds: [number, number] | null = null;
    if (tile.a === left) nextEnds = [tile.b, right];
    else if (tile.b === left) nextEnds = [tile.a, right];
    else if (tile.a === right) nextEnds = [left, tile.b];
    else if (tile.b === right) nextEnds = [left, tile.a];

    if (!nextEnds) {
      setStatusText(`Bu tosh [${tile.a}|${tile.b}] zanjir uchlariga (${left} yoki ${right}) mos emas.`);
      return;
    }

    const nextHand = dominoHand.filter((t) => t.id !== tile.id);
    setDominoHand(nextHand);
    setDominoEnds(nextEnds);
    if (nextHand.length === 0) {
      setStatusText('Domino! Barcha toshlaringizni qo‘yib g‘alaba qozondingiz!');
      recordResult(190, 'Domino G‘alaba!', true);
      return;
    }
    setBusy(true);
    setTimeout(() => {
      if (Math.random() > 0.25) {
        const nb = dominoBotLeft - 1;
        setDominoBotLeft(nb);
        setDominoEnds(([l, r]) => [l, Math.floor(Math.random() * 6) + 1]);
        if (nb === 0) {
          setStatusText('Raqib barcha domino toshlarini tugatdi.');
          recordResult(-40, 'Raqib domino toshlarini tugatdi', false);
        } else {
          setStatusText(`Raqib tosh qo‘ydi (${nb} ta qoldi). Navbat sizda!`);
        }
      } else {
        setDominoBotLeft((c) => c + 1);
        setStatusText('Raqib bozordan tosh oldi. Navbat sizda!');
      }
      setBusy(false);
    }, 450);
  }

  // --------------------------------------------------------------------------
  // 4. LUCKY ENTERTAINMENT ENGINES (Wheel / Slot / Fruit / Box / Card / Pyramid / Football / Rocket)
  // --------------------------------------------------------------------------
  const [wheelAngle, setWheelAngle] = useState(0);
  const [slotReels, setSlotReels] = useState(['★', '◆', '♛']);
  const [selectedFruit, setSelectedFruit] = useState('Anor');
  const [openedBoxes, setOpenedBoxes] = useState<number[]>([]);
  const [cardDuel, setCardDuel] = useState<{ p: number; b: number } | null>(null);
  const [pyramidRow, setPyramidRow] = useState(0);
  const [rocketMult, setRocketMult] = useState(1.0);
  const [rocketFlying, setRocketFlying] = useState(false);
  const rocketTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (rocketTimerRef.current) clearInterval(rocketTimerRef.current);
    };
  }, []);

  function spinWheel() {
    if (busy) return;
    setBusy(true);
    const sectors = [100, -30, 200, -50, 300, 0, 150, 500];
    const idx = Math.floor(Math.random() * sectors.length);
    const reward = sectors[idx];
    const won = reward > 0;
    setWheelAngle((prev) => prev + 720 + idx * 45);
    setTimeout(() => {
      setStatusText(
        won
          ? `${game.title}: Charxpalak +${reward} bepul o‘yin ballida to‘xtadi!`
          : `${game.title}: Bu safar omad kelmadi (${reward} ball). Qayta aylantiring!`
      );
      recordResult(
        reward,
        won ? `Charxpalakdan +${reward} ball yutildi` : 'Omadli sektor tushmadi',
        won
      );
      setBusy(false);
    }, 700);
  }

  function spinSlots() {
    if (busy) return;
    setBusy(true);
    const icons = ['★', '◆', '♛', '☀', '✦'];
    setTimeout(() => {
      const r1 = icons[Math.floor(Math.random() * icons.length)];
      const r2 = icons[Math.floor(Math.random() * icons.length)];
      const r3 = icons[Math.floor(Math.random() * icons.length)];
      setSlotReels([r1, r2, r3]);
      const threeMatch = r1 === r2 && r2 === r3;
      const twoMatch = r1 === r2 || r2 === r3 || r1 === r3;
      const won = threeMatch || twoMatch;
      const pts = threeMatch ? 400 : twoMatch ? 120 : -30;
      setStatusText(
        threeMatch
          ? `Uchta bir xil ramz! +${pts} ball qo‘shildi`
          : twoMatch
          ? `Ikki ramz mos keldi! +${pts} ball`
          : `Ramzlar mos kelmadi (${pts} ball)`
      );
      recordResult(
        pts,
        won ? `Kombinatsiya: ${r1} ${r2} ${r3}` : `Mos kelmadi: ${r1} ${r2} ${r3}`,
        won
      );
      setBusy(false);
    }, 450);
  }

  function playFruit() {
    if (busy) return;
    setBusy(true);
    const fruits = ['Anor', 'Uzum', 'Olma', 'Gilos', 'Qovun', 'Shaftoli', 'Limon', 'Xurmo'];
    setTimeout(() => {
      const winner = fruits[Math.floor(Math.random() * fruits.length)];
      const matched = winner === selectedFruit;
      const pts = matched ? 350 : -30;
      setStatusText(
        matched
          ? `Omadli meva "${winner}" chiqdi! +${pts} ball`
          : `Bu safar "${winner}" chiqdi (siz "${selectedFruit}" tanladingiz). ${pts} ball`
      );
      recordResult(
        pts,
        matched ? `"${winner}" mevasi mos keldi!` : `Bu safar "${winner}" chiqdi`,
        matched
      );
      setBusy(false);
    }, 450);
  }

  function openMysteryBox(idx: number) {
    if (busy || openedBoxes.includes(idx)) return;
    const rewards = [120, -40, 220, 0, 300, -25, 150, 450, -30];
    const pts = rewards[(idx + Math.floor(Math.random() * 9)) % rewards.length];
    const won = pts > 0;
    setOpenedBoxes((prev) => [...prev, idx]);
    setStatusText(
      won
        ? `${idx + 1}-qutidan +${pts} o‘yin balli chiqdi!`
        : `${idx + 1}-quti bo‘sh chiqdi (${pts} ball).`
    );
    recordResult(
      pts,
      won ? `${idx + 1}-qutidan xazina topildi` : `${idx + 1}-quti bo‘sh chiqdi`,
      won
    );
  }

  function playCardCompare() {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      const p = Math.floor(Math.random() * 13) + 2;
      const b = Math.floor(Math.random() * 13) + 2;
      setCardDuel({ p, b });
      const won = p >= b;
      const pts = p > b ? 220 : p === b ? 50 : -40;
      setStatusText(
        p > b
          ? `Sizning kartangiz (${p}) raqibnikidan (${b}) yuqori! +${pts} ball`
          : p === b
          ? `Durang (${p} = ${b})! +${pts} ball`
          : `Raqib kartasi (${b}) baland chiqdi (${p}). ${pts} ball`
      );
      recordResult(
        pts,
        p > b
          ? `Kuchli karta (${p} vs ${b})`
          : p === b
          ? `Durang (${p} = ${b})`
          : `Raqib kartasi baland (${p} vs ${b})`,
        won
      );
      setBusy(false);
    }, 400);
  }

  function pickPyramidTile(col: number) {
    if (busy) return;
    const safe = Math.random() > 0.28 || col === 0;
    if (safe) {
      const nextRow = pyramidRow + 1;
      if (nextRow >= 5) {
        setPyramidRow(0);
        setStatusText('Piramida cho‘qqisiga chiqdingiz! +400 ball');
        recordResult(400, 'Piramida cho‘qqisi zabt etildi!', true);
      } else {
        setPyramidRow(nextRow);
        setStatusText(`${nextRow}-qavatdan muvaffaqiyatli o‘tdingiz! (+80 ball)`);
        recordResult(80, `${nextRow}-qavat xavfsiz o‘tildi`, true);
      }
    } else {
      setPyramidRow(0);
      setStatusText('Tosh quladi — pastdan qayta boshlang (-35 ball).');
      recordResult(-35, 'Piramida toshi quladi', false);
    }
  }

  function shootFootball(dir: 'Chap' | 'Markaz' | 'O‘ng') {
    if (busy) return;
    setBusy(true);
    const dirs = ['Chap', 'Markaz', 'O‘ng'] as const;
    setTimeout(() => {
      const keeper = dirs[Math.floor(Math.random() * 3)];
      const goal = keeper !== dir;
      const pts = goal ? 240 : -30;
      setStatusText(
        goal
          ? `GOOOL! Siz ${dir} burchakka urdingiz, darvozabon ${keeper} ga sakradi (+${pts} ball)`
          : `Darvozabon ${keeper} tomondan to‘pni qaytardi (${pts} ball)`
      );
      recordResult(
        pts,
        goal ? `GOOOL! (${dir} burchak)` : `Darvozabon ${keeper} tomondan qaytardi`,
        goal
      );
      setBusy(false);
    }, 450);
  }

  function startRocket() {
    if (rocketFlying) return;
    setRocketFlying(true);
    setRocketMult(1.0);
    setStatusText('Raketa parvozda! Turbulentlikdan oldin ballni saqlang.');
    const crashAt = 1.4 + Math.random() * 3.2;

    rocketTimerRef.current = setInterval(() => {
      setRocketMult((prev) => {
        const next = Number((prev + 0.15).toFixed(2));
        if (next >= crashAt) {
          if (rocketTimerRef.current) clearInterval(rocketTimerRef.current);
          setRocketFlying(false);
          setStatusText(`Raketa ${next}× da turbulentlikka uchradi (-45 ball).`);
          recordResult(-45, `${next}× da turbulentlikka uchradi`, false);
          return next;
        }
        return next;
      });
    }, 250);
  }

  function landRocketSafe() {
    if (!rocketFlying) return;
    if (rocketTimerRef.current) clearInterval(rocketTimerRef.current);
    setRocketFlying(false);
    const pts = Math.round(rocketMult * 100);
    setStatusText(`Ajoyib qo‘nish! ${rocketMult}× koeffitsiyent bilan +${pts} ball saqlandi.`);
    recordResult(pts, `${rocketMult}× xavfsiz qo‘nish!`, true);
  }

  const cardLabels = (v: number) =>
    v === 14 ? 'A' : v === 13 ? 'K' : v === 12 ? 'Q' : v === 11 ? 'J' : String(v);

  return (
    <div className="space-y-5 pb-24 lg:pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#0F1524] border border-white/10 flex items-center justify-center text-white hover:bg-white/5"
            aria-label="Orqaga"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <GameThumbnail
            gameId={game.id}
            title={game.title}
            variant="square"
            className="w-11 h-11 rounded-xl border border-white/15"
          />
          <div>
            <h2 className="font-display text-xl font-bold text-white">{game.title}</h2>
            <p className="text-xs text-slate-400">{game.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-[#0F1524] border border-[#E5B84B]/30 flex items-center gap-2 text-xs font-mono tabular-nums text-[#E5B84B]">
            <Award className="w-4 h-4" />
            <span>{formatCoins(currentUser.gamePoints)} ball</span>
          </div>
          {onShareResultInRoom && lastDelta !== null && lastDelta > 0 && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `${currentUser.nickname} "${game.title}" o‘yinida +${lastDelta} o‘yin balli to‘pladi!`
                )
              }
              className="min-h-[40px] px-3 rounded-xl bg-blue-600 text-white text-xs font-medium"
            >
              Xonaga ulashish
            </button>
          )}
        </div>
      </div>

      {/* Play Area */}
      <div className="p-6 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-6">
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#080B14] border border-white/[0.06]">
          <span className="text-sm text-slate-200">{statusText}</span>
          {lastDelta !== null && (
            <span
              className={`font-mono tabular-nums text-sm font-bold shrink-0 ${
                lastDelta > 0
                  ? 'text-emerald-400'
                  : lastDelta < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {lastDelta > 0 ? `+${lastDelta}` : lastDelta} ball
            </span>
          )}
        </div>

        {/* Mechanic: Ludo / Lyudo Jamoasi / Jackaroo */}
        {(game.mechanic === 'ludo' ||
          game.mechanic === 'ludo_team' ||
          game.mechanic === 'jackaroo') && (
          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400 font-medium">Siz ({playerPos}/{trackMax})</span>
                  <span className="font-mono text-slate-400">Marra: {trackMax}</span>
                </div>
                <div className="h-3 rounded-full bg-[#080B14] overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(playerPos / trackMax) * 100}%` }}
                  />
                </div>
              </div>

              {game.mechanic === 'ludo_team' && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-medium">
                      Hamkoringiz ({partnerPos}/{trackMax})
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-[#080B14] overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${(partnerPos / trackMax) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-400 font-medium">Raqib ({botPos}/{trackMax})</span>
                </div>
                <div className="h-3 rounded-full bg-[#080B14] overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${(botPos / trackMax) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={busy || playerPos >= trackMax || botPos >= trackMax}
                onClick={rollBoardTurn}
                className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Dice5 className="w-5 h-5" />
                <span>{diceVal ? `Tosh tashlash (Oxirgi: ${diceVal})` : 'Tosh tashlash'}</span>
              </button>
              <button
                type="button"
                onClick={resetBoard}
                className="min-h-[48px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Qayta</span>
              </button>
            </div>
          </div>
        )}

        {/* Mechanic: Carrom */}
        {game.mechanic === 'carrom' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#080B14] border border-white/[0.06]">
                <div className="text-xs text-slate-400 mb-2">
                  Nishon burchagi: <span className="font-mono text-white">{carromAngle}°</span>
                </div>
                <input
                  type="range"
                  min={-45}
                  max={45}
                  value={carromAngle}
                  onChange={(e) => setCarromAngle(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div className="p-4 rounded-xl bg-[#080B14] border border-white/[0.06]">
                <div className="text-xs text-slate-400 mb-2">
                  Zarba kuchi: <span className="font-mono text-[#E5B84B]">{carromPower}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={carromPower}
                  onChange={(e) => setCarromPower(Number(e.target.value))}
                  className="w-full accent-[#E5B84B]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300 font-mono">
                Tushirilgan: {carromPockets} · Qolgan zarba: {carromShots}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || carromShots <= 0}
                  onClick={shootCarrom}
                  className="min-h-[44px] px-5 rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Target className="w-4 h-4" />
                  <span>Zarba berish</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCarromPockets(0);
                    setCarromShots(5);
                    setStatusText('Yangi Carrom raundi tayyor!');
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-white/5 text-slate-300 text-sm"
                >
                  Qayta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mechanic: UMO */}
        {game.mechanic === 'umo' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="p-4 rounded-xl bg-[#080B14] border border-[#E5B84B]/40 text-center min-w-[120px]">
                <div className="text-xs text-slate-400">Ustki karta</div>
                <div className="text-lg font-bold text-white mt-1">
                  {umoTop.color} {umoTop.num}
                </div>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Bot qo‘lidagi kartalar: {umoBotCount}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {umoHand.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => playUmoCard(card)}
                  className="min-h-[64px] min-w-[82px] px-3 rounded-xl bg-[#080B14] border border-white/15 hover:border-blue-400 flex flex-col items-center justify-center"
                >
                  <span className="text-xs text-slate-400">{card.color}</span>
                  <span className="font-mono text-lg font-bold text-white">{card.num}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={drawUmoCard}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-medium"
              >
                Karta olish (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUmoBotCount(5);
                  setUmoHand(
                    Array.from({ length: 5 }, (_, i) => ({
                      id: `r-${i}-${Date.now()}`,
                      color: COLORS[Math.floor(Math.random() * 4)],
                      num: Math.floor(Math.random() * 9) + 1,
                    }))
                  );
                  setStatusText('Yangi UMO partiyasi boshlandi!');
                }}
                className="min-h-[44px] px-4 rounded-xl bg-white/5 text-slate-300 text-sm"
              >
                Qayta
              </button>
            </div>
          </div>
        )}

        {/* Mechanic: Domino */}
        {game.mechanic === 'domino' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#080B14] border border-white/10">
              <div className="text-sm text-white">
                Zanjir uchlari:{' '}
                <span className="font-mono text-lg font-bold text-[#E5B84B]">
                  [{dominoEnds[0]}] ··· [{dominoEnds[1]}]
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">Raqibda: {dominoBotLeft} ta</div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {dominoHand.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => playDomino(t)}
                  className="min-h-[56px] px-4 rounded-xl bg-[#080B14] border border-white/15 hover:border-blue-400 font-mono text-base font-bold text-white"
                >
                  [{t.a} | {t.b}]
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setDominoEnds([3, 5]);
                setDominoBotLeft(4);
                setDominoHand([
                  { id: `d1-${Date.now()}`, a: 5, b: 6 },
                  { id: `d2-${Date.now()}`, a: 3, b: 2 },
                  { id: `d3-${Date.now()}`, a: 6, b: 1 },
                  { id: `d4-${Date.now()}`, a: 2, b: 4 },
                ]);
                setStatusText('Yangi Domino partiyasi boshlandi!');
              }}
              className="min-h-[44px] px-4 rounded-xl bg-white/5 text-slate-300 text-sm"
            >
              Yangi partiya
            </button>
          </div>
        )}

        {/* Mechanic: Wheel (Oltin omad, Ruletka) */}
        {game.mechanic === 'wheel' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div
              className="w-40 h-40 rounded-full border-4 border-[#E5B84B] bg-gradient-to-tr from-blue-900 via-purple-900 to-amber-700 flex items-center justify-center transition-transform duration-700"
              style={{ transform: `rotate(${wheelAngle}deg)` }}
            >
              <Crown className="w-12 h-12 text-[#E5B84B]" />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={spinWheel}
              className="min-h-[48px] px-6 rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm disabled:opacity-50"
            >
              {busy ? 'Aylanmoqda...' : 'Charxpalakni aylantirish'}
            </button>
          </div>
        )}

        {/* Mechanic: Slot (Omadli Pro, Jekpot, Jackpot slot) */}
        {game.mechanic === 'slot' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="flex items-center gap-3">
              {slotReels.map((sym, i) => (
                <div
                  key={i}
                  className="w-20 h-20 rounded-2xl bg-[#080B14] border border-[#E5B84B]/40 flex items-center justify-center text-3xl text-[#E5B84B]"
                >
                  {sym}
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={spinSlots}
              className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{busy ? 'Aylanmoqda...' : 'Aylantirish (Bepul)'}</span>
            </button>
          </div>
        )}

        {/* Mechanic: Fruit (Omadli meva, Greedy Pro) */}
        {game.mechanic === 'fruit' && (
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-2.5">
              {['Anor', 'Uzum', 'Olma', 'Gilos', 'Qovun', 'Shaftoli', 'Limon', 'Xurmo'].map(
                (fruit) => (
                  <button
                    key={fruit}
                    type="button"
                    onClick={() => setSelectedFruit(fruit)}
                    className={`min-h-[48px] rounded-xl border text-xs font-medium ${
                      selectedFruit === fruit
                        ? 'bg-emerald-600/25 border-emerald-400 text-white'
                        : 'bg-[#080B14] border-white/10 text-slate-300'
                    }`}
                  >
                    {fruit}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={playFruit}
              className="min-h-[48px] px-6 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? 'Tanlanmoqda...' : `"${selectedFruit}" bilan boshlash`}
            </button>
          </div>
        )}

        {/* Mechanic: Mystery Box (Ochko'z quti) */}
        {game.mechanic === 'box' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 max-w-sm">
              {Array.from({ length: 9 }, (_, i) => {
                const opened = openedBoxes.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={opened}
                    onClick={() => openMysteryBox(i)}
                    className={`min-h-[72px] rounded-xl border flex flex-col items-center justify-center gap-1 ${
                      opened
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-[#080B14] border-white/10 hover:border-[#E5B84B] text-[#E5B84B]'
                    }`}
                  >
                    <Box className="w-5 h-5" />
                    <span className="text-xs font-mono">{opened ? 'Ochildi' : `${i + 1}-quti`}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpenedBoxes([]);
                setStatusText('Barcha sandiqlar yangilandi!');
              }}
              className="min-h-[40px] px-4 rounded-xl bg-white/5 text-slate-300 text-xs"
            >
              Qutilarni yangilash
            </button>
          </div>
        )}

        {/* Mechanic: Card Compare (Yosh Patti, Dragon Tiger Slot, Texas Kovboy) */}
        {game.mechanic === 'card_compare' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div className="p-5 rounded-xl bg-[#080B14] border border-blue-500/30 text-center">
                <div className="text-xs text-blue-400">Sizning kartangiz</div>
                <div className="font-mono text-3xl font-bold text-white mt-2 flex items-center justify-center gap-1">
                  <Club className="w-5 h-5 text-blue-400" />
                  <span>{cardDuel ? cardLabels(cardDuel.p) : '?'}</span>
                </div>
              </div>
              <div className="p-5 rounded-xl bg-[#080B14] border border-purple-500/30 text-center">
                <div className="text-xs text-purple-300">Raqib kartasi</div>
                <div className="font-mono text-3xl font-bold text-white mt-2 flex items-center justify-center gap-1">
                  <Flame className="w-5 h-5 text-purple-400" />
                  <span>{cardDuel ? cardLabels(cardDuel.b) : '?'}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={playCardCompare}
              className="min-h-[48px] px-6 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-50"
            >
              Kartalarni ochish
            </button>
          </div>
        )}

        {/* Mechanic: Pyramid (Piramida uyalari) */}
        {game.mechanic === 'pyramid' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Joriy bosqich: <span className="font-mono text-[#E5B84B]">{pyramidRow}/5</span>
            </div>
            <div className="grid grid-cols-4 gap-2.5 max-w-md">
              {[0, 1, 2, 3].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => pickPyramidTile(col)}
                  className="min-h-[60px] rounded-xl bg-[#080B14] border border-[#E5B84B]/35 hover:bg-[#E5B84B]/10 text-sm font-medium text-white"
                >
                  Uya {col + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mechanic: Football King */}
        {game.mechanic === 'football' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">Zarba yo‘nalishini tanlang:</div>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['Chap', 'Markaz', 'O‘ng'] as const).map((dir) => (
                <button
                  key={dir}
                  type="button"
                  disabled={busy}
                  onClick={() => shootFootball(dir)}
                  className="min-h-[56px] rounded-xl bg-[#080B14] border border-emerald-500/35 hover:bg-emerald-600/20 text-sm font-semibold text-white flex items-center justify-center gap-1.5"
                >
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  <span>{dir}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mechanic: Rocket (Raketa to'qnashuvi) */}
        {game.mechanic === 'rocket' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="flex items-center gap-3">
              <Rocket
                className={`w-10 h-10 ${
                  rocketFlying ? 'text-[#E5B84B] -translate-y-1 transition-transform' : 'text-blue-400'
                }`}
              />
              <span className="font-mono tabular-nums text-4xl font-bold text-white">
                {rocketMult.toFixed(2)}×
              </span>
            </div>
            <div className="flex gap-3">
              {!rocketFlying ? (
                <button
                  type="button"
                  onClick={startRocket}
                  className="min-h-[48px] px-6 rounded-xl bg-purple-600 text-white font-semibold text-sm"
                >
                  Raketani uchirish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={landRocketSafe}
                  className="min-h-[48px] px-6 rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm"
                >
                  Ballni saqlash ({Math.round(rocketMult * 100)} ball)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-[#0F1524] border border-white/[0.06] flex items-center gap-3 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Barcha o‘yinlar faqat bepul o‘yin ballari bilan ishlaydi. Haqiqiy pul tikish, qimor yoki naqd mukofotlar mavjud emas.
        </span>
      </div>
    </div>
  );
};
