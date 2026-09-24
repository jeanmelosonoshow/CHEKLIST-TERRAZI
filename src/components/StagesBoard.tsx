import { stageDefinitions, stageStatuses, type StageProcessRow, type StageStatus } from "@/lib/stages";

function StageStatusBadge({ status }: { status: StageStatus }) {
  const definition = stageStatuses[status];
  return <span className={`stageStatus stageStatus-${definition.tone}`}><span aria-hidden="true" className="stageStatusDot" />{definition.label}</span>;
}

export function StagesBoard({ rows }: { rows: StageProcessRow[] }) {
  return <>
    <div className="stageLegend" aria-label="Legenda dos status">
      {Object.entries(stageStatuses).map(([status, definition]) => <StageStatusBadge status={status as StageStatus} key={definition.label} />)}
    </div>

    {rows.length ? <div className="tableWrap responsiveTable stagesTable">
      <table>
        <thead><tr><th>Filial · Venda · Cliente</th>{stageDefinitions.map((stage) => <th key={stage.key}>{stage.label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id}>
          <td data-label="Venda"><strong>Filial {row.branch} · Venda {row.sale}</strong><small>{row.customerName}</small></td>
          {stageDefinitions.map((stage) => <td data-label={stage.label} key={stage.key}><StageStatusBadge status={row.stages[stage.key]} /></td>)}
        </tr>)}</tbody>
      </table>
    </div> : <div className="stagesEmpty">
      <div><p className="eyebrow">MOLDE INICIAL</p><h2>Etapas do processo</h2><p className="muted">A estrutura está pronta para receber uma linha por filial, venda e cliente quando a origem e o salvamento dos dados forem definidos.</p></div>
      <ol className="stageTemplate">{stageDefinitions.map((stage, index) => <li key={stage.key}><span>{index + 1}</span><strong>{stage.label}</strong></li>)}</ol>
    </div>}
  </>;
}
