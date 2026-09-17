import { useEffect, useState } from 'react';

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

export default function MorningCheckIn({ entry, onSave }) {
  const [morning, setMorning] = useState(() => morningFromEntry(entry));
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMorning(morningFromEntry(entry));
    setMessage('');
  }, [entry]);

  function update(field, value) {
    setMorning((current) => ({ ...current, [field]: value }));
  }

  function saveMorning(event) {
    event.preventDefault();
    if (morning.task.trim().length < 2) {
      setMessage('내일 또는 오늘의 중요한 과제를 짧게 적어 주세요.');
      return;
    }
    onSave({ morning, morningCompletedAt: new Date().toISOString() });
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
        <label>
          오늘의 가장 중요한 과제
          <input value={morning.task} onChange={(event) => update('task', event.target.value)} placeholder="예: 오전에 프로젝트 발표 자료의 첫 장을 완성하기" />
        </label>
        <ScaleInput id="efficacy" label="이 과제를 시작하고 필요한 노력을 계속할 자신" value={morning.efficacy} onChange={(value) => update('efficacy', value)} help="0은 전혀 없음, 10은 매우 높음" />
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
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
