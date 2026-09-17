import { useEffect, useState } from 'react';

const TAGS = ['내 행동', '타인의 도움', '상황/운'];
const blankItems = () => Array.from({ length: 3 }, () => ({ event: '', reason: '', tags: [] }));

function reflectionFromEntry(entry) {
  return entry?.reflection?.items?.length === 3 ? entry.reflection.items : blankItems();
}

export default function ReflectionForm({ entry, onSave }) {
  const [items, setItems] = useState(() => reflectionFromEntry(entry));
  const [message, setMessage] = useState('');

  useEffect(() => {
    setItems(reflectionFromEntry(entry));
    setMessage('');
  }, [entry]);

  function updateItem(index, field, value) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function toggleTag(index, tag) {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const tags = item.tags.includes(tag) ? item.tags.filter((value) => value !== tag) : [...item.tags, tag];
      return { ...item, tags };
    }));
  }

  function saveReflection(event) {
    event.preventDefault();
    const completedItems = items.filter((item) => item.event.trim().length >= 10 && item.reason.trim().length > 0);
    if (completedItems.length < 2) {
      setMessage('두 개 이상의 항목에 10자 이상의 사건과 이유를 적어 주세요. 오늘 기록을 쉬고 싶다면 건너뛰기를 선택할 수 있습니다.');
      return;
    }
    onSave({ reflection: { items }, eveningStatus: 'completed', reflectionCompletedAt: new Date().toISOString() });
    setMessage('저녁 회고를 이 기기에 저장했습니다.');
  }

  function skipReflection() {
    onSave({ eveningStatus: 'skipped', skippedAt: new Date().toISOString() });
    setMessage('오늘의 회고를 건너뛰었습니다. 기록하지 않아도 괜찮습니다.');
  }

  return (
    <section className="panel" aria-labelledby="reflection-title">
      <div className="panel-heading">
        <p className="eyebrow">01 · 저녁 회고</p>
        <h2 id="reflection-title">오늘 잘된 일과 그 이유를 돌아봐요</h2>
        <p>좋았던 일 또는 감사했던 일을 세 가지 적고, 무엇이 가능하게 했는지 함께 남겨 보세요.</p>
      </div>
      <form onSubmit={saveReflection} noValidate>
        <div className="reflection-list">
          {items.map((item, index) => (
            <fieldset className="reflection-item" key={index}>
              <legend>기록 {index + 1}</legend>
              <label>
                오늘 잘된 일 또는 감사했던 일
                <textarea value={item.event} onChange={(event) => updateItem(index, 'event', event.target.value)} placeholder="예: 팀원에게 먼저 질문해 막힌 과제를 함께 해결했다." rows="3" />
              </label>
              <label>
                이 일이 가능했던 이유
                <input value={item.reason} onChange={(event) => updateItem(index, 'reason', event.target.value)} placeholder="예: 질문할 내용을 미리 정리했고 동료가 확인해 주었다." />
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
        <div className="form-actions">
          <button className="button primary" type="submit">저녁 회고 저장</button>
          <button className="button text" type="button" onClick={skipReflection}>오늘은 건너뛰기</button>
        </div>
        {message && <p className="form-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
