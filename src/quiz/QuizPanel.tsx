import { useCallback, useEffect, useRef, useState } from 'react';
import { QUIZ_COUNTRIES, REGIONS, REGION_NAMES } from '../content/capitals';
import type { Tier } from '../content/types';
import type { GlobeHandle } from '../globe/globeHandle';
import { recordQuiz, useSave } from '../progress/store';
import type { QuizMode, QuizRecord } from '../progress/types';
import { CharacterBubble } from '../trip/CharacterBubble';
import { MissionView } from '../trip/missions/MissionView';
import type { MissionResult } from '../trip/tripReducer';
import { Dongle } from '../ui/Dongle';
import { Flag } from '../ui/Flag';
import { Icon } from '../ui/Icon';
import { useMoreBelow } from '../ui/useMoreBelow';
import { COMMON_VOICE } from '../voice/lines';
import { buildQuestions, copula, isMastered, MASTERED, pickCountries, type QuizQuestion, type QuizRegion } from './pickQuiz';
import { QuizBook } from './QuizBook';
import '../trip/trip.css';
import './quiz.css';

interface Answer {
  code: string;
  correct: boolean;
}

type Phase =
  | { step: 'pick' }
  | { step: 'play'; region: QuizRegion; questions: QuizQuestion[]; index: number; answers: Answer[] }
  | { step: 'result'; region: QuizRegion; answers: Answer[]; newly: string[] };

interface QuizPanelProps {
  tier: Tier;
  /** 기록을 남길 아이. null이면 저장하지 않는다 */
  profileId: string | null;
  globe: GlobeHandle;
  onExit: () => void;
}

const EMPTY: Record<string, QuizRecord> = {};
/** 지도에서 땅이 거의 안 보이는 작은 나라(남서~북동 거리, km) — 반짝이 원으로 자리를 알린다 */
const TINY_KM = 160;
// 지도 데이터가 따로 그린 곳도 국제적으로 인정된 그 나라 땅이면 함께 칠한다 (소말릴란드 → 소말리아, 북키프로스 → 키프로스)
const FOCUS_WITH: Record<string, string[]> = { SOM: ['SOL'], CYP: ['CYN'] };
const focusIds = (iso3: string) => [iso3, ...(FOCUS_WITH[iso3] ?? [])];
const regionPool = (region: QuizRegion) => (region === 'all' ? QUIZ_COUNTRIES : QUIZ_COUNTRIES.filter((c) => c.region === region));
const regionName = (region: QuizRegion) => (region === 'all' ? '전체 섞기' : REGION_NAMES[region]);
// 처음 고른 답으로 맞힌 것만 맞힌 것으로 센다 — 유아는 틀려도 반짝이를 보고 다시 골라 결국 맞히고, 저·고학년도 두 번째에 맞힐 수 있다.
// 위치 찍기는 한 번만 찍으니 별 2개 이상이면 맞힌 것이다
const scored = (r: MissionResult) => r.correct && r.attempts <= 1;
const sizeKm = ([[w, s], [e, n]]: [[number, number], [number, number]]) => Math.hypot((e - w) * 111 * Math.cos((((s + n) / 2) * Math.PI) / 180), (n - s) * 111);

// 나라 퀴즈 (계획 8): 대륙을 고르고 → 한 판(유아 5·저·고학년 10문제) → 결과와 새 스티커. 여행 카드와 같은 자리·모양을 쓴다.
// 저·고학년은 수도 퀴즈, 유아는 지구본에 칠한 나라의 국기를 그림으로 고르는 국기 퀴즈다
export function QuizPanel({ tier, profileId, globe, onExit }: QuizPanelProps) {
  const mode: QuizMode = tier === 'preschool' ? 'flag' : 'capital';
  const save = useSave();
  const records = (profileId && save.progress[profileId]?.quiz[mode]) || EMPTY;
  const [phase, setPhase] = useState<Phase>({ step: 'pick' });
  const [bookOpen, setBookOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const moreBelow = useMoreBelow(bodyRef, contentRef);
  const title = mode === 'flag' ? '국기 퀴즈' : '수도 퀴즈';
  const question = phase.step === 'play' ? phase.questions[phase.index] : null;
  // 답했지만 아직 '다음'을 누르지 않은 문제 — 그 사이에 나가도 기록한다
  const pending = useRef<Answer | null>(null);

  // 유아는 길을 잃지 않게 손 조작을 잠근다(누르기는 된다). 퀴즈를 마치면 지구본을 평소대로 되돌린다
  useEffect(() => {
    globe.setInteractive(tier !== 'preschool');
    return () => globe.restore();
  }, [globe, tier]);

  // 대륙 고르기·결과 화면: 칠한 나라·표시를 지우고 지명을 모두 보여 준다. 고르기 화면은 지구본 전체를 본다
  useEffect(() => {
    if (phase.step === 'play') return;
    globe.clearMarkers();
    globe.focusCountry(null);
    globe.setCapitalLabelsVisible(true);
    globe.setLabelsVisible(true);
    if (phase.step === 'pick') globe.frameHome(true);
  }, [globe, phase.step]);

  // 문제마다: 그 나라로 날아가 땅을 칠하고, 문제를 푸는 동안 수도 이름표를 숨긴다.
  // 거꾸로 묻기는 지명을 모두 숨기고 수도 자리만 보여 준다(나라 이름이 보이면 답이 된다). 위치 찍기는 미션이 화면과 지명을 맡는다
  useEffect(() => {
    if (!question) return;
    const { country, kind, view } = question;
    globe.clearMarkers();
    globe.setCapitalLabelsVisible(false);
    if (kind === 'country') {
      globe.focusCountry(null);
      globe.setLabelsVisible(false);
      globe.showMarker('to', country.capitalAt, country.capital);
      globe.flyTo(view.center, view.zoom);
      return;
    }
    globe.focusCountry(focusIds(country.iso3));
    // 위치 찍기는 미션이 지명을 숨긴다 — 자식 효과가 이 효과보다 먼저 돌므로 여기서 지명을 다시 켜면 안 된다
    if (kind === 'pin') return;
    globe.setLabelsVisible(true);
    globe.flyTo(view.center, view.zoom);
    if (sizeKm(country.focus) < TINY_KM) globe.showMarker('hint', country.capitalAt);
  }, [globe, question]);

  // 답한 순간 지도에 정답 수도 자리를 퀴즈와 같은 이름으로 보여 준다. 거꾸로 묻기는 지명과 그 나라 땅까지.
  // 지도의 수도 이름표는 다음 문제까지 숨긴 채 둔다 — 지도 이름표는 퀴즈 표기와 다른 곳(서울특별시·누르술탄 등)이 있고,
  // 몇 나라는 지도의 수도 별이 다른 도시(베냉 코토누 등)에 찍혀 있어 헷갈린다
  const handleAnswered = useCallback((result: MissionResult) => {
    if (!question) return;
    const { country, kind } = question;
    pending.current = { code: country.code, correct: scored(result) };
    if (kind === 'flag' || kind === 'pin') return;
    globe.clearMarkers();
    if (kind === 'country') {
      // 거꾸로 묻기는 질문에서 이미 수도 이름을 보였으니, 정답 자리는 이름표 없이 핀만 — 이름표가 되살아난 나라 이름을 덮지 않게
      globe.setLabelsVisible(true);
      globe.focusCountry(focusIds(country.iso3));
      globe.showMarker('answer', country.capitalAt);
      return;
    }
    globe.showMarker('answer', country.capitalAt, country.capital);
  }, [globe, question]);

  // 단계나 문제가 바뀌면 패널로 초점을 옮기고 본문 스크롤을 맨 위로 (여행 카드와 같다)
  const step = phase.step;
  const index = phase.step === 'play' ? phase.index : -1;
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    panelRef.current?.focus({ preventScroll: true });
  }, [step, index]);

  const start = (region: QuizRegion) => {
    const picked = pickCountries(regionPool(region), records, tier, Math.random);
    setPhase({ step: 'play', region, questions: buildQuestions(picked, QUIZ_COUNTRIES, tier, Math.random), index: 0, answers: [] });
  };

  // 판을 마치면 한 번에 저장한다. 이번 판 전에는 스티커가 없었는데 이번에 맞힌 횟수를 더하면 MASTERED를 넘는 나라가 새 스티커다
  const finish = (region: QuizRegion, answers: Answer[]) => {
    if (profileId) recordQuiz(profileId, mode, answers);
    const gained = new Map<string, number>();
    for (const a of answers) if (a.correct) gained.set(a.code, (gained.get(a.code) ?? 0) + 1);
    const newly = [...gained]
      .filter(([code, n]) => !isMastered(records[code]) && (records[code]?.right ?? 0) + n >= MASTERED)
      .map(([code]) => code);
    setPhase({ step: 'result', region, answers, newly });
  };

  const handleDone = (result: MissionResult) => {
    if (phase.step !== 'play' || !question) return;
    pending.current = null;
    const answers = [...phase.answers, { code: question.country.code, correct: scored(result) }];
    if (phase.index + 1 < phase.questions.length) setPhase({ ...phase, index: phase.index + 1, answers });
    else finish(phase.region, answers);
  };

  // 판 도중에 나가도 푼 문제까지는 기록한다 (답하고 '다음'을 누르기 전인 문제까지)
  const requestExit = () => {
    if (phase.step === 'play' && profileId) {
      const answers = pending.current ? [...phase.answers, pending.current] : phase.answers;
      if (answers.length) recordQuiz(profileId, mode, answers);
    }
    onExit();
  };

  const total = QUIZ_COUNTRIES.length;
  const mastered = QUIZ_COUNTRIES.filter((c) => isMastered(records[c.code])).length;
  const compact = question?.kind === 'pin';

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      className={`passport trip-panel trip-panel--${tier} quiz-panel${question ? ' trip-panel--mission' : ''}${compact ? ' trip-panel--compact' : ''}`}
      aria-label={title}
    >
      <div className="page page--ticket">
        <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
        <header className="pass-head">
          <span className="pass-head__tag" aria-hidden="true"><Icon name="globe" /></span>
          <h2 className="pass-head__title">{title}{phase.step !== 'pick' ? ` · ${regionName(phase.region)}` : ''}</h2>
          <button type="button" className="close" onClick={requestExit} aria-label="퀴즈 그만하기">
            <Icon name="close" />
          </button>
        </header>
        <div className="tear" aria-hidden="true" />

        <div className={`pass-body${moreBelow ? ' pass-body--more' : ''}`} ref={bodyRef}>
          <div ref={contentRef}>
            {phase.step === 'pick' && (
              <>
                <CharacterBubble text={mode === 'flag' ? '어느 대륙 국기를 찾아볼까?' : '어느 대륙 수도에 도전해 볼까?'} />
                <div className="quiz-regions">
                  {[...REGIONS, 'all' as const].map((region) => {
                    const pool = regionPool(region);
                    const got = pool.filter((c) => isMastered(records[c.code])).length;
                    // 대륙 단추의 작은 국기 셋: 그 대륙에서 누구나 아는 나라 (전체 섞기는 대륙마다 하나씩)
                    const samples = (region === 'all' ? REGIONS.map((r) => regionPool(r).find((c) => c.level === 1)) : pool.filter((c) => c.level === 1))
                      .filter((c) => c !== undefined)
                      .slice(0, 3);
                    return (
                      <button
                        key={region}
                        type="button"
                        className={`quiz-region${region === 'all' ? ' quiz-region--all' : ''}`}
                        aria-label={`${regionName(region)}, ${pool.length}개 나라 중 스티커 ${got}개`}
                        onClick={() => start(region)}
                      >
                        <span className="quiz-region__flags" aria-hidden="true">
                          {samples.map((c) => <Flag key={c.code} code={c.code} />)}
                        </span>
                        <span className="quiz-region__line">
                          <span className="quiz-region__name">{regionName(region)}</span>
                          <span className="quiz-region__count" aria-hidden="true">{got}/{pool.length}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="memo-btn quiz-book-btn" onClick={() => setBookOpen(true)}>
                  <Icon name="read" className="memo-btn__icon" />
                  <span>{mode === 'flag' ? '국기 도감' : '수도 도감'} 보기</span>
                  <span className="quiz-book-btn__count">{mastered}/{total}</span>
                </button>
              </>
            )}

            {phase.step === 'play' && question && (
              <>
                <div className="progress">
                  <span className="progress__label">문제 {phase.index + 1} / {phase.questions.length}</span>
                  <span className="pips" aria-hidden="true">
                    {phase.questions.map((_, i) => (
                      <i key={i} className={`${i <= phase.index ? 'on' : ''}${i === phase.index ? ' now' : ''}`} />
                    ))}
                  </span>
                </div>
                {/* 유아 국기 문제는 지구본에서 반짝이는 나라를 눈으로 보고 푼다 — 화면 읽기에는 그 나라 이름을 알려 준다 */}
                {question.kind === 'flag' && <p className="visually-hidden">{`지구본에서 반짝이는 나라는 ${question.country.country}${copula(question.country.country)}.`}</p>}
                <MissionView
                  key={phase.index}
                  mission={question.mission}
                  tier={tier}
                  globe={globe}
                  placeView={question.view}
                  voice={mode === 'flag' ? { prompt: COMMON_VOICE.quizFlag, explain: null } : null}
                  onDone={handleDone}
                  onAnswered={handleAnswered}
                  firstTryOnly
                />
              </>
            )}

            {phase.step === 'result' && (
              <QuizResult
                mode={mode}
                answers={phase.answers}
                newly={phase.newly}
                onAgain={() => start(phase.region)}
                onPick={() => setPhase({ step: 'pick' })}
              />
            )}
          </div>
        </div>
        {moreBelow && <span className="pass-more" aria-hidden="true" />}
      </div>
      <QuizBook open={bookOpen} mode={mode} records={records} onClose={() => setBookOpen(false)} />
    </section>
  );
}

interface QuizResultProps {
  mode: QuizMode;
  answers: Answer[];
  newly: string[];
  onAgain: () => void;
  onPick: () => void;
}

// 한 판 결과: 맞힌 수, 이번에 도감에 새로 붙은 국기 스티커, 한 판 더 / 다른 대륙
function QuizResult({ mode, answers, newly, onAgain, onPick }: QuizResultProps) {
  const right = answers.filter((a) => a.correct).length;
  const byCode = new Map(QUIZ_COUNTRIES.map((c) => [c.code, c]));
  return (
    <div className="quiz-result">
      <div className="quiz-result__head">
        <Dongle mood={right * 2 >= answers.length ? 'happy' : 'comfort'} size="md" decorative />
        <p className="quiz-result__score ko" role="status">
          {answers.length}문제 중 <b>{right}개</b> 맞혔어요!
        </p>
      </div>
      {/* 이번 판에 맞힌 나라 국기. 두 번 맞혀 도감에 새로 붙은 나라는 'NEW' — 첫판에는 스티커가 없어도 맞힌 것이 눈에 보이게 */}
      {right > 0 && (
        <>
          <p className="quiz-result__label">
            {newly.length > 0 ? `${mode === 'flag' ? '국기 도감' : '수도 도감'}에 새 스티커 ${newly.length}장!` : '맞힌 나라'}
            {newly.length < right && <span className="quiz-result__hint"> · 두 번 맞히면 도감에 붙어요</span>}
          </p>
          <ul className="quiz-stickers" role="list">
            {[...new Set(answers.filter((a) => a.correct).map((a) => a.code))].map((code) => (
              <li key={code} className={`quiz-sticker${newly.includes(code) ? ' quiz-sticker--new' : ''}`}>
                <Flag code={code} />
                <span className="quiz-sticker__name">
                  {byCode.get(code)?.country}
                  {newly.includes(code) && <span className="visually-hidden">, 도감에 새로 붙음</span>}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="talk__actions">
        <button type="button" className="btn btn--paper" onClick={onPick}>다른 대륙</button>
        <button type="button" className="btn" onClick={onAgain}>한 판 더</button>
      </div>
    </div>
  );
}
