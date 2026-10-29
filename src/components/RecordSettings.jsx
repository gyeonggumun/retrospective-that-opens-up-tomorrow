import { useState } from 'react';
import { backupJson, downloadCsv, downloadRaw, downloadText, mergeBackup, parseBackup } from '../lib/storage';
import { dateKey } from '../lib/dates';

export default function RecordSettings({ store, onRestore, onClear }) {
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  function report(text, failure = false) { setMessage(text); setFailed(failure); }
  async function chooseBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPending(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { report('5MB 이하의 JSON 백업 파일을 선택해 주세요.', true); return; }
    try {
      const backup = parseBackup(await file.text());
      setPending({ ...backup, name: file.name });
      report('파일을 확인했습니다. 아래 내용을 확인한 후 복원해 주세요.');
    } catch { report('파일을 읽지 못했습니다. 이 앱에서 만든 JSON 백업인지 확인해 주세요. 현재 기록은 유지됩니다.', true); }
  }
  function restore() {
    const merged = mergeBackup(store, pending);
    if (!onRestore(merged)) return;
    report(`복원했습니다. 같은 날짜 ${merged.conflicts}개의 기존 내용은 우선 보존했습니다.`);
    setPending(null);
  }
  return <section className="panel" aria-labelledby="settings-title">
    <p className="eyebrow">MY DATA</p><h1 className="page-title" id="settings-title">나의 기록 관리</h1>
    <p>기록은 이 브라우저에만 저장됩니다. 다른 기기에서는 JSON 파일로 옮길 수 있어요.</p>
    <div className="settings-block"><h2>백업과 내보내기</h2><p>JSON은 작성 중인 내용까지 보관하고, CSV는 저장을 마친 기록을 표로 내보냅니다.</p>
      <div className="form-actions"><button className="button primary" disabled={!!store.error || (!store.entries.length && !Object.keys(store.drafts).length)} onClick={() => { downloadText(backupJson(store), `reflection-backup-${dateKey()}.json`); report('JSON 백업 다운로드를 요청했습니다. 다운로드 폴더를 확인해 주세요.'); }}>JSON 백업</button><button className="button secondary" disabled={!!store.error || !store.entries.length} onClick={() => { downloadCsv(store.entries); report('CSV 다운로드를 요청했습니다. 다운로드 폴더를 확인해 주세요.'); }}>CSV 내보내기</button></div>
    </div>
    <div className="settings-block"><h2>백업에서 복원</h2><p>현재 기록과 합칩니다. 같은 날짜에 이미 저장된 아침·저녁 내용과 임시 저장은 현재 내용을 우선합니다.</p>
      <label>JSON 백업 파일 선택<input type="file" accept=".json,application/json" disabled={!!store.error} onChange={chooseBackup} /></label>
      {pending && <div className="research-note"><strong>{pending.name}</strong><p>날짜별 기록 {pending.entries.length}개 · 임시 저장 {Object.keys(pending.drafts).length}개</p><div className="form-actions"><button className="button primary" onClick={restore}>확인한 백업 복원</button><button className="button text" onClick={() => { setPending(null); report('복원을 취소했습니다.'); }}>취소</button></div></div>}
    </div>
    {store.error && <div className="settings-block"><h2>원본 데이터 보관</h2><p>읽지 못한 원본을 파일로 보관할 수 있습니다. 자동으로 덮어쓰지 않습니다.</p><button className="button secondary" onClick={() => { try { downloadRaw(); } catch { report('브라우저가 저장소 접근을 막았습니다. 브라우저의 저장소 권한을 확인해 주세요.', true); } }}>원본 데이터 다운로드</button></div>}
    <div className="settings-block"><h2>기록 삭제</h2><p>저장된 기록과 작성 중인 내용이 함께 삭제됩니다. 필요한 기록을 먼저 백업해 주세요.</p><button className="button danger" onClick={onClear} disabled={!store.error && !store.entries.length && !Object.keys(store.drafts).length}>이 기기의 기록 모두 삭제</button></div>
    {message && <p className={failed ? 'error-message' : 'form-message'} role={failed ? 'alert' : 'status'}>{message}</p>}
    <aside className="research-note"><strong>사용과 해석 안내</strong><p>이 앱은 의료적 진단·치료·위기 대응 서비스가 아닙니다. 백업 파일에는 직접 작성한 내용이 들어가므로 본인이 관리해 주세요. 브라우저 데이터 삭제·시크릿 창 종료 시 기록을 잃을 수 있습니다.</p><a href="https://positive-reflection-research-paper.vercel.app/" target="_blank" rel="noreferrer">함께 작성한 연구 논문 읽기 ↗</a></aside>
  </section>;
}
