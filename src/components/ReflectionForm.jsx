import { useState } from 'react';

const TAGS = ['내 행동', '타인의 도움', '상황/운'];
const blankItems = () => Array.from({ length: 3 }, () => ({ event: '', reason: '', tags: [] }));

function reflectionFromEntry(entry) {
  return entry?.reflection?.items?.length === 3 ? entry.reflection.items : blankItems();
}

export default function ReflectionForm({ entry, draft, onDraft, onSave }) {
  const [items, setItems] = useState(() => draft?.items ?? reflectionFromEntry(entry));
  const [taskStarted, setTaskStarted] = useState(() => draft?.taskStarted ?? entry?.taskStarted ?? '');
  const [step, setStep] = useState(() => Number.isInteger(draft?.step) && draft.step >= 0 && draft.step < 3 ? draft.step : 0);
  const [draftStatus, setDraftStatus] = useState(draft ? '작성 중인 내용을 불러왔습니다. 임시 저장은 회고 완료로 집계하지 않습니다.' : '입력하면 이 기기에 자동으로 임시 저장합니다.');
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);

  function persistDraft(nextItems, nextStarted = taskStarted, nextStep = step) {
    setDraftStatus(onDraft({ items: nextItems, taskStarted: nextStarted, step: nextStep }) ? '작성 중 · 이 기기에 임시 저장됨' : '임시 저장 실패 · 입력 내용을 복사해 보관해 주세요.');
    setMessage('');
  }

  function updateItem(index, field, value) {
    const next = items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
    setItems(next);
    persistDraft(next);
  }

  function toggleTag(index, tag) {
    const next = items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const tags = item.tags.includes(tag) ? item.tags.filter((value) => value !== tag) : [...item.tags, tag];
      return { ...item, tags };
    });
    setItems(next);
    persistDraft(next);
  }

  function changeStep(next) {
    setStep(next);
    persistDraft(items, taskStarted, next);
  }

  function saveReflection(event) {
    event.preventDefault();
    const completedItems = items.filter((item) => item.event.trim().length >= 10 && item.reason.trim().length > 0);
    if (completedItems.length < 2) {
      setInvalid(true);
      setMessage('두 개 이상의 항목에 10자 이상의 사건과 이유를 적어 주세요. 오늘 기록을 쉬고 싶다면 건너뛰기를 선택할 수 있습니다.');
      return;
    }
    if (!onSave({ reflection: { items }, eveningStatus: 'completed', taskStarted, reflectionCompletedAt: new Date().toISOString(), reflectionTimezoneOffset: new Date().getTimezoneOffset() })) return;
    setInvalid(false);
    setDraftStatus('저장 완료 · 다시 수정하면 임시 저장됩니다.');
    setMessage('저녁 회고를 이 기기에 저장했습니다.');
  }

  function skipReflection() {
    if (!onSave({ reflection: { items }, taskStarted, eveningStatus: 'skipped', skippedAt: new Date().toISOString(), reflectionTimezoneOffset: new Date().getTimezoneOffset() })) return;
    setInvalid(false);
    setDraftStatus('건너뛰기 저장 완료 · 입력한 내용은 함께 보관했습니다.');
    setMessage('오늘의 회고를 건너뛰었습니다. 기록하지 않아도 괜찮습니다.');
  }

  return (
    <section className="panel" aria-labelledby="reflection-title">
      <div className="panel-heading">
        <p className="eyebrow">01 · 저녁 회고</p>
        <h2 id="reflection-title">오늘 잘된 일과 그 이유를 돌아봐요</h2>
        <p>한 가지씩 천천히 적어 보세요. 사건은 10자 이상, 이유는 한 글자 이상으로 두 항목을 채우면 저장할 수 있습니다. 세 번째는 선택입니다.</p>
      </div>
      <form onSubmit={saveReflection} noValidate>
        {entry?.morning?.task && <div className="task-recap"><h3>아침에 정한 과제를 떠올려요</h3><p>{entry.morning.task}</p><label>실제로 첫 행동을 시작했나요? (선택)<select value={taskStarted} onChange={(event) => { setTaskStarted(event.target.value); persistDraft(items, event.target.value); }}><option value="">아직 기록하지 않음</option><option value="yes">시작했어요</option><option value="no">아직 시작하지 못했어요</option></select></label></div>}
        <p className="draft-status" role="status">{draftStatus}</p>
        <div className="record-tabs" aria-label="회고 항목 선택">{items.map((item, index) => <button key={index} type="button" className="button" aria-pressed={step === index} onClick={() => changeStep(index)}>기록 {index + 1}{item.event.trim().length >= 10 && item.reason.trim() ? ' ✓' : ''}</button>)}</div>
        <div className="reflection-list">
          {items.map((item, index) => (
            <fieldset className="reflection-item" key={index} hidden={step !== index}>
              <legend>기록 {index + 1}</legend>
              <label>
                오늘 잘된 일 또는 감사했던 일
                <textarea maxLength="2000" value={item.event} onChange={(event) => updateItem(index, 'event', event.target.value)} placeholder="예: 팀원에게 먼저 질문해 막힌 과제를 함께 해결했다." rows="3" />
              </label>
              <label>
                이 일이 가능했던 이유
                <input maxLength="1000" value={item.reason} onChange={(event) => updateItem(index, 'reason', event.target.value)} placeholder="예: 질문할 내용을 미리 정리했고 동료가 확인해 주었다." />
              </label>
              <div className="tag-group" aria-label={`기록 ${index + 1}의 이유 태그`}>
                {TAGS.map((tag) => (
                  <label className="tag" key={tag}>
                    <input type="checkbox" checked={item.tags.includes(tag)} onChange={() => toggleTag(index, tag)} />
                    {tag}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="form-actions"><button className="button text" type="button" disabled={step === 0} onClick={() => changeStep(step - 1)}>이전 항목</button><span>{step + 1} / 3</span><button className="button text" type="button" disabled={step === 2} onClick={() => changeStep(step + 1)}>다음 항목</button></div>
        <div className="form-actions">
          <button className="button primary" type="submit">저녁 회고 저장</button>
          <button className="button text" type="button" onClick={skipReflection}>오늘은 건너뛰기</button>
        </div>
        {message && <p className={invalid ? 'error-message' : 'form-message'} role={invalid ? 'alert' : 'status'}>{message}</p>}
      </form>
    </section>
  );
}
