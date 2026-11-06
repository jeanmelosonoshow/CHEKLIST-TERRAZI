import { NextResponse } from "next/server";
import { getApiAnyPermission } from "@/lib/api-auth";
import { answerIsEmpty } from "@/lib/checklist-execution";
import { selectNextEdge, validateFlowDefinition, type FlowNodeDefinition } from "@/lib/checklist-flow";
import { executeFlowAutomation, mapAutomationItems, readAutomationField } from "@/lib/flow-automation";
import { getOptionSource, resolveOptionSource } from "@/lib/option-sources";
import { simulateChecklistFlowSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await getApiAnyPermission(["createChecklist", "editChecklist"]);
  if ("error" in auth) return auth.error;
  const limit = await rateLimit("dashboard", auth.user.id);
  if (!limit.success) return NextResponse.json({ error: "Muitas simulações em sequência. Aguarde um minuto." }, { status: 429 });
  const parsed = simulateChecklistFlowSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise o fluxo da simulação." }, { status: 400 });
  const { flow, branchId, saleNumber } = parsed.data;
  const errors = validateFlowDefinition(flow);
  if (errors.length) return NextResponse.json({ error: errors[0], details: errors }, { status: 409 });
  const nodes = new Map(flow.nodes.map((node) => [node.nodeKey, node]));
  let node: FlowNodeDefinition | undefined;
  let value = parsed.data.answer;
  let customerName: string | null = null;
  let saleItems: Array<{ code: string; description: string; quantity: string | number }> = [];
  if (!parsed.data.nodeKey) {
    node = flow.nodes.find((item) => item.type === "start");
    if (!node) return NextResponse.json({ error: "Bloco inicial não encontrado." }, { status: 409 });
    if (node.automationSource) {
      const result = await runAutomation({ automationSource: node.automationSource, querySql: node.querySql || null, resultField: node.resultField || "RESULTADO" }, branchId, saleNumber, auth.user);
      if (result instanceof NextResponse) return result;
      value = result.value;
      if (node.customerResultField) {
        const customerResultField = node.customerResultField;
        const customerRow = result.rows.find((row) => readAutomationField(row, customerResultField) !== null && readAutomationField(row, customerResultField) !== undefined) || result.row;
        const customer = readAutomationField(customerRow, customerResultField);
        customerName = customer === undefined || customer === null ? null : String(customer);
      }
      saleItems = mapAutomationItems(result.rows, node);
    }
  } else {
    node = nodes.get(parsed.data.nodeKey);
    if (!node || node.type === "start" || node.type === "end") return NextResponse.json({ error: "Etapa inválida para simulação." }, { status: 409 });
    if (node.type === "automatic_decision") {
      const result = await runAutomation({ automationSource: node.automationSource || null, querySql: node.querySql || null, resultField: node.resultField || "RESULTADO" }, branchId, saleNumber, auth.user);
      if (result instanceof NextResponse) return result;
      value = result.value;
    }
    if (node.type === "observation") value = parsed.data.observation || "";
    if (node.required && answerIsEmpty(value)) return NextResponse.json({ error: `Preencha: ${node.title}.` }, { status: 409 });
  }
  const outgoing = flow.edges.filter((edge) => edge.sourceKey === node.nodeKey);
  const edge = selectNextEdge(outgoing, value);
  if (!edge) return NextResponse.json({ error: node.type === "start" ? "A validação inicial não aprovou a criação da demanda." : "Nenhuma conexão corresponde à resposta informada." }, { status: 422 });
  const target = nodes.get(edge.targetKey);
  if (!target) return NextResponse.json({ error: "O próximo bloco não existe." }, { status: 409 });
  const options = target.sourceKey ? await resolveOptions(target.sourceKey, auth.user, branchId) : [];
  return NextResponse.json({
    completed: target.type === "end", outcome: target.type === "end" ? target.outcome : null,
    customerName, saleItems, currentNode: target.type === "end" ? null : { ...target, options },
    step: { nodeKey: node.nodeKey, title: node.title, answer: value, automatic: Boolean(node.automationSource) },
  });
}

async function resolveOptions(sourceKey: string, user: Parameters<typeof resolveOptionSource>[1], branchId: string) {
  const source = await getOptionSource(sourceKey);
  return source && source.active ? resolveOptionSource(source, { ...user, branchId }) : [];
}

async function runAutomation(node: Parameters<typeof executeFlowAutomation>[0], branchId: string, saleNumber: string, user: Parameters<typeof executeFlowAutomation>[2]) {
  try { return await executeFlowAutomation(node, { branchId, saleNumber }, user); }
  catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) || 500 : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na decisão automática." }, { status });
  }
}
