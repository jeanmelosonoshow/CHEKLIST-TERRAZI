import { z } from "zod";
import { queryFirebirdGateway, type FirebirdParameter } from "./firebird-gateway";

const gatewayUserSchema = z.object({
  branchId: z.union([z.string(), z.number()]).transform(String),
  category: z.string().nullable().optional(),
  employeeId: z.coerce.number().int().positive(),
  employeeName: z.string().trim().min(1),
  login: z.string().trim().min(1).transform((value) => value.toLowerCase()),
});

export type FirebirdUser = z.infer<typeof gatewayUserSchema>;
type QueryFunction = <T extends Record<string, unknown>>(sql: string, params?: FirebirdParameter[]) => Promise<T[]>;

const AUTHENTICATE_USER_SQL = `
SELECT FIRST 1
  IDFILIAL,
  CATEGORIA,
  IDFUNCIONARIO,
  NOMEFUNCIONARIO,
  LOGIN
FROM FUNCIONARIO
WHERE STATUS = 'A'
  AND UPPER(LOGIN) = UPPER(?)
  AND SENHAWEB = ?
`;

function field(row: Record<string, unknown>, name: string) {
  const key = Object.keys(row).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? row[key] : undefined;
}

export async function authenticateFirebirdUser(
  login: string,
  passwordHash: string,
  query: QueryFunction = queryFirebirdGateway,
): Promise<FirebirdUser | null> {
  const [row] = await query<Record<string, unknown>>(AUTHENTICATE_USER_SQL, [login, passwordHash]);
  if (!row) return null;

  return gatewayUserSchema.parse({
    branchId: field(row, "IDFILIAL"),
    category: field(row, "CATEGORIA") ?? null,
    employeeId: field(row, "IDFUNCIONARIO"),
    employeeName: field(row, "NOMEFUNCIONARIO"),
    login: field(row, "LOGIN"),
  });
}
