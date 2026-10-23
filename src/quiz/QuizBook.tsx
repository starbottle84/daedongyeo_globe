import { useId } from 'react';
import { QUIZ_COUNTRIES, REGIONS, REGION_NAMES } from '../content/capitals';
import type { QuizMode, QuizRecord } from '../progress/types';
import { Flag } from '../ui/Flag';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { isMastered } from './pickQuiz';
import '../passport/passport.css';
import './quiz.css';

interface QuizBookProps {
  open: boolean;
  mode: QuizMode;
  records: Record<string, QuizRecord>;
  onClose: () => void;
}

// 나라 도감: 대륙마다 한 쪽, 나라마다 국기 칸. 두 번 맞힌 나라는 국기가 또렷하게 붙고(수도 도감은 수도 이름도),
// 아직인 나라는 흐린 국기에 수도 자리가 '?'다. 여권 책과 같은 가죽 머리·종이 쪽 모양을 쓴다.
// 열려 있을 때만 내용을 그린다 — 닫힌 도감의 국기 그림 191개가 숨어 있지 않게
export function QuizBook({ open, mode, records, onClose }: QuizBookProps) {
  const titleId = useId();
  return (
    <Modal open={open} size="full" labelledBy={titleId} onClose={onClose}>
      {open && <QuizBookBody titleId={titleId} mode={mode} records={records} onClose={onClose} />}
    </Modal>
  );
}

function QuizBookBody({ titleId, mode, records, onClose }: Omit<QuizBookProps, 'open'> & { titleId: string }) {
  const got = QUIZ_COUNTRIES.filter((c) => isMastered(records[c.code])).length;
  return (
    <>
      <header className="pb-cover">
        <div className="pb-cover__words">
          <p className="pb-cover__en" aria-hidden="true"><svg><use href="#emblem" /></svg>{mode === 'flag' ? 'FLAG BOOK' : 'CAPITAL BOOK'}</p>
          <h2 id={titleId} className="pb-cover__title ko">{mode === 'flag' ? '국기 도감' : '수도 도감'}</h2>
          <p className="pb-cover__tier">스티커 {got} / {QUIZ_COUNTRIES.length}</p>
        </div>
        <button type="button" className="close" aria-label="닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>
      {REGIONS.map((region) => {
        const list = QUIZ_COUNTRIES.filter((c) => c.region === region).sort((a, b) => a.country.localeCompare(b.country, 'ko'));
        const done = list.filter((c) => isMastered(records[c.code])).length;
        return (
          <section key={region} className="pb-page" aria-labelledby={`${titleId}-${region}`}>
            <svg className="rosette" aria-hidden="true"><use href="#rosette" /></svg>
            <h3 id={`${titleId}-${region}`} className="stage">
              <svg aria-hidden="true"><use href="#spark" /></svg>
              {REGION_NAMES[region]}
              <span className="stage__count" aria-hidden="true">스티커 {done}/{list.length}</span>
              <span className="visually-hidden">, {list.length}개 나라 중 스티커 {done}개</span>
            </h3>
            <ul className="qb-grid" role="list">
              {list.map((c) => {
                const ok = isMastered(records[c.code]);
                return (
                  <li key={c.code} className={`qb-cell${ok ? ' qb-cell--got' : ''}`}>
                    <Flag code={c.code} className="qb-cell__flag" />
                    <span className="qb-cell__country">{c.country}</span>
                    {mode === 'capital' && (
                      <span className="qb-cell__capital">
                        {ok ? c.capital : '?'}
                        <span className="visually-hidden">{ok ? ', 스티커 받음' : ', 아직'}</span>
                      </span>
                    )}
                    {mode === 'flag' && <span className="visually-hidden">{ok ? ', 스티커 받음' : ', 아직'}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
