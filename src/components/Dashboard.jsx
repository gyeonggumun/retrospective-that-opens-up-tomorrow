import { eveningDate, formatDate, pairFor, recentDays, shiftDate } from '../lib/dates';

export default function Dashboard({ entries, today, now, onRecord, onReview }) {
  const evening = eveningDate(now);
  const eveningEntry = entries.find((entry) => entry.date === evening);
  const morning = entries.find((entry) => entry.date === today)?.morning;
  const days = recentDays(today);
  const count = days.filter((date) => entries.find((entry) => entry.date === date)?.eveningStatus === 'completed').length;
  const pairs = recentDays(shiftDate(today, -1)).filter((date) => {
    const pair = pairFor(entries, date);
    return pair.evening?.eveningStatus === 'completed' && pair.morning;
  }).length;
  return (
    <>
      <section className="hero" aria-labelledby="app-title">
        <p className="eyebrow">{formatDate(today)} · 나를 위한 짧은 기록</p>
        <h1 id="app-title">오늘의 작은 발견이<br />내일의 시작으로.</h1>
        <p className="hero-copy">하루의 잘된 일과 그 이유를 돌아보고, 다음 날 과제의 첫 행동을 시작할 자신을 기록해 보세요.</p>
        <div className="hero-notes"><span>저녁 회고</span><span>다음 날 아침 체크인</span><span>14일 돌아보기</span></div>
      </section>
      <div className="dashboard-grid">
        <section className="panel action-card">
          <p className="eyebrow">아침 · 오늘의 시작</p>
          <h2>어떤 일을 시작할까요?</h2>
          <p>{morning ? morning.task : '가장 중요한 과제 한 가지와 시작할 자신감을 남겨 주세요.'}</p>
          <p className="status-pill">{morning ? `✓ 저장됨 · 자신감 ${morning.efficacy}/10` : '○ 아직 체크인하지 않았어요'}</p>
          <button className="button primary" onClick={() => onRecord('morning', today)}>{morning ? '아침 기록 다시 보기' : '아침 체크인 시작'}</button>
        </section>
        <section className="panel action-card">
          <p className="eyebrow">저녁 · {formatDate(evening)}</p>
          <h2>오늘 잘된 일은 무엇인가요?</h2>
          <p>작은 성공과 도움받은 순간도 좋아요. 힘든 날에는 쉬어 가도 괜찮습니다.</p>
          <p className="status-pill">{eveningEntry?.eveningStatus === 'completed' ? '✓ 회고를 저장했어요' : eveningEntry?.eveningStatus === 'skipped' ? '— 쉬어 간 날이에요' : '○ 아직 기록하지 않았어요'}</p>
          <button className="button primary" onClick={() => onRecord('reflection', evening)}>{eveningEntry?.eveningStatus ? '저녁 기록 다시 보기' : '저녁 회고 시작'}</button>
        </section>
      </div>
      <section className="panel summary-panel" aria-label="최근 14일 요약">
        <div><p className="eyebrow">최근 14일의 발자국</p><h2>나의 속도로 쌓아 가요</h2><p>빈 날짜는 실패가 아닙니다. 남긴 기록만 돌아보세요.</p></div>
        <div className="summary-number"><strong>{count}</strong><span>저녁 회고</span></div>
        <div className="summary-number"><strong>{pairs}</strong><span>저녁 → 다음 아침 연결</span></div>
        <button className="button secondary" onClick={onReview}>기록 돌아보기</button>
      </section>
      <aside className="research-note">
        <strong>논문에서 일상으로</strong>
        <p>「긍정적 회고와 다음 날 자기효능감」의 기록 방법을 바탕으로 만들었습니다. 점수는 개인의 관찰값이며 회고의 효과를 증명하지 않습니다.</p>
        <a href="https://positive-reflection-research-paper.vercel.app/" target="_blank" rel="noreferrer">연구 배경 읽기 ↗</a>
      </aside>
    </>
  );
}
