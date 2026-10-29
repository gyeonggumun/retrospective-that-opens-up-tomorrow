import { useState } from 'react';

function morningFromEntry(entry) {
  return entry?.morning ?? { task: '', efficacy: 5, positiveAffect: 5, negativeAffect: 5, difficulty: 5, sleepHours: '' };
}

function ScaleInput({ id, label, value, onChange, help }) {
  return (
    <label className="scale-field" htmlFor={id}>
      <span>{label}</span>
      <div className="scale-row">
        <input id={id} type="range" min="0" max="10" step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <output htmlFor={id}>{value} / 10</output>
      </div>
      {help && <small>{help}</small>}
    </label>
  );
}

export default function MorningCheckIn({ entry, draft, onDraft, onSave }) {
  const [morning, setMorning] = useState(() => draft ?? morningFromEntry(entry));
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [draftStatus, setDraftStatus] = useState(draft ? '작성 중인 내용을 불러왔습니다. 임시 저장은 체크인 완료로 집계하지 않습니다.' : '입력하면 이 기기에 자동으로 임시 저장합니다.');

  function update(field, value) {
    const next = { ...morning, [field]: value };
    setMorning(next);
    setDraftStatus(onDraft(next) ? '작성 중 · 이 기기에 임시 저장됨' : '임시 저장 실패 · 입력 내용을 복사해 보관해 주세요.');
    setMessage('');
  }

  function saveMorning(event) {
    event.preventDefault();
    if (morning.task.trim().length < 2) {
      setInvalid(true);
      setMessage('선택한 날짜의 중요한 과제를 두 글자 이상 적어 주세요.');
      return;
    }
    if (morning.sleepHours !== '' && (!Number.isFinite(Number(morning.sleepHours)) || Number(morning.sleepHours) < 0 || Number(morning.sleepHours) > 24)) {
      setInvalid(true);
      setMessage('수면 시간은 0~24 사이로 입력하거나 비워 주세요.');
      return;
    }
    if (!onSave({ morning: { ...morning, questionVersion: 'initiation-v2' }, morningCompletedAt: new Date().toISOString(), morningTimezoneOffset: new Date().getTimezoneOffset() })) return;
    setInvalid(false);
    setDraftStatus('저장 완료 · 다시 수정하면 임시 저장됩니다.');
    setMessage('아침 체크인을 이 기기에 저장했습니다.');
  }

  return (
    <section className="panel" aria-labelledby="morning-title">
      <div className="panel-heading">
        <p className="eyebrow">02 · 아침 체크인</p>
        <h2 id="morning-title">다음 과제를 시작할 자신감을 점검해요</h2>
        <p>점수는 진단이나 평가가 아닙니다. 오늘의 상태를 기록하는 관찰값입니다.</p>
      </div>
      <form onSubmit={saveMorning} noValidate>
        <p className="draft-status" role="status">{draftStatus}</p>
        <label>
          오늘의 가장 중요한 과제
          <input maxLength="1000" value={morning.task} onChange={(event) => update('task', event.target.value)} placeholder="예: 오전에 프로젝트 발표 자료의 첫 장을 완성하기" />
        </label>
        {entry?.morning && !entry.morning.questionVersion && <p className="research-note">이 기록은 이전 문항(시작하고 노력을 계속할 자신)으로 작성되었습니다. 다시 저장하면 현재 문항으로 갱신됩니다.</p>}
        <ScaleInput id="efficacy" label="이 과제의 첫 행동을 시작할 자신" value={morning.efficacy} onChange={(value) => update('efficacy', value)} help="0은 전혀 없음, 10은 매우 높음" />
        <div className="scale-grid">
          <ScaleInput id="positive-affect" label="현재 긍정 정서" value={morning.positiveAffect} onChange={(value) => update('positiveAffect', value)} />
          <ScaleInput id="negative-affect" label="현재 부정 정서" value={morning.negativeAffect} onChange={(value) => update('negativeAffect', value)} />
          <ScaleInput id="difficulty" label="예상 과제 난이도" value={morning.difficulty} onChange={(value) => update('difficulty', value)} />
          <label>
            지난밤 수면 시간 (선택)
            <input type="number" min="0" max="24" step="0.5" value={morning.sleepHours} onChange={(event) => update('sleepHours', event.target.value)} placeholder="예: 7.5" />
          </label>
        </div>
        <div className="form-actions">
          <button className="button primary" type="submit">아침 체크인 저장</button>
        </div>
        {message && <p className={invalid ? 'error-message' : 'form-message'} role={invalid ? 'alert' : 'status'}>{message}</p>}
      </form>
    </section>
  );
}
