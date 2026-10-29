import { useState } from 'react';
import { dateKey, formatDate, isDateKey, pairFor, recentDays } from '../lib/dates';

const eveningLabel = (entry) => entry?.eveningStatus === 'completed' ? '✓ 회고 완료' : entry?.eveningStatus === 'skipped' ? '— 건너뜀' : '○ 미입력';

export default function WeeklyReview({ entries, onEdit, onDelete, today = dateKey() }) {
  const [end, setEnd] = useState(today);
  const [selected, setSelected] = useState(today);
  const [query, setQuery] = useState('');
  const days = recentDays(end);
  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const points = days.map((date, index) => ({ date, morning: byDate.get(date)?.morning, x: 44 + index * 44 }));
  const pair = pairFor(entries, selected);
  const selectedEntry = byDate.get(selected);
  const results = query.trim() ? [...entries].filter((entry) => [entry.date, entry.morning?.task, ...(entry.reflection?.items ?? []).flatMap((item) => [item.event, item.reason])].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <section className="panel review-panel" aria-labelledby="review-title">
      <div className="panel-heading">
        <p className="eyebrow">14 DAYS OF REFLECTION</p>
        <h1 id="review-title" className="page-title">기록을 따라, 나를 돌아봐요</h1>
        <p>그래프는 아침 날짜 기준의 입력값입니다. 날짜를 누르면 그날 저녁과 다음 날 아침을 함께 볼 수 있어요.</p>
      </div>
      <label>조회 기간 마지막 날짜<input type="date" value={end} max={today} onChange={(event) => { if (isDateKey(event.target.value) && event.target.value <= today) { setEnd(event.target.value); setSelected(event.target.value); } }} /></label>
      <p>{formatDate(days[0])} ~ {formatDate(end)} · 비어 있는 날도 표시합니다.</p>
      {!entries.length && <p className="empty-state">아직 저장된 기록이 없습니다. 첫 기록을 남기면 점과 날짜별 내용이 여기에 표시됩니다.</p>}
      <figure className="trend-figure">
        <figcaption><strong>아침의 시작 자신감</strong><span>0–10점 · ● 현재 문항 / ◇ 이전 문항</span></figcaption>
        <div className="chart-scroll" tabIndex="0" role="region" aria-label="14일 자신감 그래프, 좁은 화면에서 가로 스크롤 가능">
          <svg viewBox="0 0 660 240" role="img" aria-labelledby="trend-title trend-description">
            <title id="trend-title">아침 자신감의 14일 추이</title><desc id="trend-description">미입력은 점을 그리지 않으며 선으로 연결하지 않습니다. 아래 표에서 모든 값을 읽을 수 있습니다.</desc>
            {[0, 5, 10].map((score) => <g key={score}><line x1="34" x2="635" y1={195 - score * 16} y2={195 - score * 16} stroke="#ccd5ca" /><text x="24" y={200 - score * 16} textAnchor="end">{score}</text></g>)}
            {points.map((point, index) => {
              const previous = points[index - 1];
              const currentVersion = point.morning?.questionVersion === 'initiation-v2';
              const y = point.morning ? 195 - point.morning.efficacy * 16 : 0;
              return <g key={point.date}>
                {point.morning && previous?.morning && previous.morning.questionVersion === point.morning.questionVersion && <line x1={previous.x} y1={195 - previous.morning.efficacy * 16} x2={point.x} y2={y} stroke={currentVersion ? '#245f48' : '#80612d'} strokeWidth="2" strokeDasharray={currentVersion ? undefined : '4 4'} />}
                {point.morning && (currentVersion ? <circle cx={point.x} cy={y} r="5" fill="#245f48"><title>{point.date}: {point.morning.efficacy}점</title></circle> : <path d={`M ${point.x} ${y - 6} l 6 6 l -6 6 l -6 -6 Z`} fill="#fffefa" stroke="#80612d" strokeWidth="2"><title>{point.date}: {point.morning.efficacy}점, 이전 문항</title></path>)}
                <text x={point.x} y="224" textAnchor="middle">{point.date.slice(5).replace('-', '/')}</text>
              </g>;
            })}
          </svg>
        </div>
        <p className="muted">빈 날짜는 0점으로 계산하지 않습니다. 이전 문항은 ‘시작하고 노력을 계속할 자신’으로, 현재 문항과 직접 비교하지 않습니다.</p>
        <details><summary>그래프를 표로 읽기</summary><div className="table-scroll"><table><thead><tr><th>아침 날짜</th><th>자신감</th><th>문항</th></tr></thead><tbody>{points.map(({ date, morning }) => <tr key={date}><th scope="row">{date}</th><td>{morning ? `${morning.efficacy} / 10` : '미입력'}</td><td>{morning ? morning.questionVersion === 'initiation-v2' ? '첫 행동 시작' : '이전 문항' : '—'}</td></tr>)}</tbody></table></div></details>
      </figure>
      <h2>14일 기록 달력</h2>
      <div className="calendar-grid">
        {days.map((date) => <button type="button" key={date} className="calendar-day" aria-pressed={selected === date} onClick={() => setSelected(date)}><strong>{formatDate(date)}</strong><span>{eveningLabel(byDate.get(date))}</span><small>{byDate.get(date)?.morning ? `아침 ${byDate.get(date).morning.efficacy}점` : '아침 미입력'}</small></button>)}
      </div>
      <section className="day-detail" aria-label="선택한 날짜 상세">
        <h2>{formatDate(selected)}의 기록</h2>
        <p className="status-pill">{eveningLabel(selectedEntry)} → {formatDate(pair.morningDate)} 아침 {pair.morning ? `${pair.morning.efficacy}점` : pair.morningDate > today ? '예정' : '미입력'}</p>
        {selectedEntry?.reflection?.items?.some((item) => item.event) && <><h3>{selectedEntry.eveningStatus === 'skipped' ? '건너뛰기 전에 저장했던 내용' : '저녁 회고 내용'}</h3><ol className="detail-items">{selectedEntry.reflection.items.filter((item) => item.event).map((item, index) => <li key={index}><strong>{item.event}</strong><p>{item.reason}</p><small>{item.tags.join(' · ')}</small></li>)}</ol></>}
        {selectedEntry?.morning && <div className="task-recap"><h3>이날 아침에 정한 과제</h3><p>{selectedEntry.morning.task}</p><p>시작 자신감 {selectedEntry.morning.efficacy}/10 · {selectedEntry.morning.questionVersion === 'initiation-v2' ? '현재 문항' : '이전 문항'}</p><p>실제 시작 여부: {selectedEntry.taskStarted === 'yes' ? '시작함' : selectedEntry.taskStarted === 'no' ? '아직 시작하지 못함' : '미입력'}</p></div>}
        {pair.morning && <p>다음 날 과제: {pair.morning.task} · {pair.morning.questionVersion === 'initiation-v2' ? '첫 행동 시작 자신감' : '이전 문항의 자신감'}</p>}
        <div className="form-actions"><button className="button primary" onClick={() => onEdit('reflection', selected)}>이날 저녁 기록하기</button><button className="button text" onClick={() => onEdit('morning', selected)}>이날 아침 기록하기</button><button className="button danger" disabled={!selectedEntry} onClick={() => onDelete(selected)}>이 날짜 기록 삭제</button></div>
      </section>
      <div className="history-search">
        <label>전체 기록 검색<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="날짜, 과제, 사건 또는 이유" /></label>
        {query.trim() && <><p role="status">검색 결과 {results.length}개</p><ul className="search-results">{results.map((entry) => <li key={entry.date}><button className="button text" onClick={() => { setSelected(entry.date); setEnd(entry.date); }}>{entry.date} · {entry.morning?.task || entry.reflection?.items?.find((item) => item.event)?.event || '건너뛴 기록'}</button></li>)}</ul></>}
      </div>
      <p className="muted">관찰 기록만 보여 주며, 회고가 기분이나 건강을 개선했다고 판단하지 않습니다.</p>
    </section>
  );
}
