function formatDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T00:00:00`));
}

export default function WeeklyReview({ entries, onExport, onClear }) {
  const recentEntries = [...entries].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 7);

  return (
    <section className="panel review-panel" aria-labelledby="review-title">
      <div className="panel-heading">
        <p className="eyebrow">03 · 기록 확인</p>
        <h2 id="review-title">관찰값을 그대로 확인해요</h2>
        <p>그래프와 목록은 기록 여부와 입력값만 보여 줍니다. 이 앱이 기분이나 건강을 개선했다고 판단하지 않습니다.</p>
      </div>
      {recentEntries.length === 0 ? (
        <p className="empty-state">아직 저장된 기록이 없습니다. 저녁 회고 또는 아침 체크인을 남기면 이곳에서 확인할 수 있어요.</p>
      ) : (
        <ol className="record-list">
          {recentEntries.map((entry) => (
            <li key={entry.date}>
              <div>
                <strong>{formatDate(entry.date)}</strong>
                <span>{entry.eveningStatus === 'completed' ? '저녁 회고 완료' : entry.eveningStatus === 'skipped' ? '저녁 회고 건너뜀' : '저녁 회고 없음'}</span>
              </div>
              <div className="score">
                {entry.morning ? <><span>자신감</span><strong>{entry.morning.efficacy}</strong><span>/ 10</span></> : <span>아침 체크인 없음</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="form-actions">
        <button className="button secondary" type="button" onClick={onExport} disabled={entries.length === 0}>CSV 내보내기</button>
        <button className="button danger" type="button" onClick={onClear} disabled={entries.length === 0}>이 기기의 기록 모두 삭제</button>
      </div>
    </section>
  );
}
