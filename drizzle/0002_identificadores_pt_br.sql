ALTER TYPE "checklist_field_type" RENAME TO "tipo_campo_lista_verificacao";
ALTER TYPE "checklist_status" RENAME TO "status_lista_verificacao";
ALTER TYPE "sync_status" RENAME TO "status_sincronizacao";

ALTER TABLE "users" RENAME TO "usuarios";
ALTER TABLE "sessions" RENAME TO "sessoes";
ALTER TABLE "sync_runs" RENAME TO "execucoes_sincronizacao";
ALTER TABLE "synced_sources" RENAME TO "fontes_sincronizadas";
ALTER TABLE "synced_records" RENAME TO "registros_sincronizados";
ALTER TABLE "checklists" RENAME TO "listas_verificacao";
ALTER TABLE "checklist_fields" RENAME TO "campos_lista_verificacao";
ALTER TABLE "checklist_field_options" RENAME TO "opcoes_campo_lista_verificacao";
ALTER TABLE "checklist_responses" RENAME TO "respostas_lista_verificacao";

ALTER TABLE "usuarios" RENAME COLUMN "branch_id" TO "id_filial";
ALTER TABLE "usuarios" RENAME COLUMN "category" TO "categoria";
ALTER TABLE "usuarios" RENAME COLUMN "employee_id" TO "id_funcionario";
ALTER TABLE "usuarios" RENAME COLUMN "employee_name" TO "nome_funcionario";
ALTER TABLE "usuarios" RENAME COLUMN "password_hash" TO "hash_senha";
ALTER TABLE "usuarios" RENAME COLUMN "active" TO "ativo";
ALTER TABLE "usuarios" RENAME COLUMN "is_admin" TO "administrador";
ALTER TABLE "usuarios" RENAME COLUMN "source_updated_at" TO "atualizado_origem_em";
ALTER TABLE "usuarios" RENAME COLUMN "last_synced_at" TO "ultima_sincronizacao_em";
ALTER TABLE "usuarios" RENAME COLUMN "created_at" TO "criado_em";
ALTER TABLE "usuarios" RENAME COLUMN "updated_at" TO "atualizado_em";

ALTER TABLE "sessoes" RENAME COLUMN "token_hash" TO "hash_token";
ALTER TABLE "sessoes" RENAME COLUMN "user_id" TO "id_usuario";
ALTER TABLE "sessoes" RENAME COLUMN "expires_at" TO "expira_em";
ALTER TABLE "sessoes" RENAME COLUMN "created_at" TO "criado_em";
ALTER TABLE "sessoes" RENAME COLUMN "last_seen_at" TO "ultimo_acesso_em";

ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "source" TO "origem";
ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "received_count" TO "quantidade_recebida";
ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "processed_count" TO "quantidade_processada";
ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "error_message" TO "mensagem_erro";
ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "started_at" TO "iniciado_em";
ALTER TABLE "execucoes_sincronizacao" RENAME COLUMN "completed_at" TO "concluido_em";

ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "key" TO "chave";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "label" TO "rotulo";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "description" TO "descricao";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "active" TO "ativo";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "schema" TO "esquema";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "last_synced_at" TO "ultima_sincronizacao_em";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "created_at" TO "criado_em";
ALTER TABLE "fontes_sincronizadas" RENAME COLUMN "updated_at" TO "atualizado_em";

ALTER TABLE "registros_sincronizados" RENAME COLUMN "source_key" TO "chave_fonte";
ALTER TABLE "registros_sincronizados" RENAME COLUMN "external_id" TO "id_externo";
ALTER TABLE "registros_sincronizados" RENAME COLUMN "label" TO "rotulo";
ALTER TABLE "registros_sincronizados" RENAME COLUMN "data" TO "dados";
ALTER TABLE "registros_sincronizados" RENAME COLUMN "active" TO "ativo";
ALTER TABLE "registros_sincronizados" RENAME COLUMN "last_synced_at" TO "ultima_sincronizacao_em";

ALTER TABLE "listas_verificacao" RENAME COLUMN "title" TO "titulo";
ALTER TABLE "listas_verificacao" RENAME COLUMN "description" TO "descricao";
ALTER TABLE "listas_verificacao" RENAME COLUMN "created_by" TO "criado_por";
ALTER TABLE "listas_verificacao" RENAME COLUMN "created_at" TO "criado_em";
ALTER TABLE "listas_verificacao" RENAME COLUMN "updated_at" TO "atualizado_em";

ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "checklist_id" TO "id_lista_verificacao";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "label" TO "rotulo";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "description" TO "descricao";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "type" TO "tipo";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "required" TO "obrigatorio";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "position" TO "posicao";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "source_key" TO "chave_fonte";
ALTER TABLE "campos_lista_verificacao" RENAME COLUMN "configuration" TO "configuracao";

ALTER TABLE "opcoes_campo_lista_verificacao" RENAME COLUMN "field_id" TO "id_campo";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME COLUMN "value" TO "valor";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME COLUMN "label" TO "rotulo";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME COLUMN "position" TO "posicao";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME COLUMN "active" TO "ativo";

ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "checklist_id" TO "id_lista_verificacao";
ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "user_id" TO "id_usuario";
ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "answers" TO "respostas";
ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "submitted_at" TO "enviado_em";
ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "created_at" TO "criado_em";
ALTER TABLE "respostas_lista_verificacao" RENAME COLUMN "updated_at" TO "atualizado_em";

ALTER TABLE "usuarios" RENAME CONSTRAINT "users_pkey" TO "usuarios_pkey";
ALTER TABLE "sessoes" RENAME CONSTRAINT "sessions_pkey" TO "sessoes_pkey";
ALTER TABLE "sessoes" RENAME CONSTRAINT "sessions_user_id_fkey" TO "sessoes_id_usuario_fkey";
ALTER TABLE "execucoes_sincronizacao" RENAME CONSTRAINT "sync_runs_pkey" TO "execucoes_sincronizacao_pkey";
ALTER TABLE "fontes_sincronizadas" RENAME CONSTRAINT "synced_sources_pkey" TO "fontes_sincronizadas_pkey";
ALTER TABLE "registros_sincronizados" RENAME CONSTRAINT "synced_records_source_key_external_id_pk" TO "registros_sincronizados_chave_fonte_id_externo_pk";
ALTER TABLE "registros_sincronizados" RENAME CONSTRAINT "synced_records_source_key_fkey" TO "registros_sincronizados_chave_fonte_fkey";
ALTER TABLE "listas_verificacao" RENAME CONSTRAINT "checklists_pkey" TO "listas_verificacao_pkey";
ALTER TABLE "listas_verificacao" RENAME CONSTRAINT "checklists_created_by_fkey" TO "listas_verificacao_criado_por_fkey";
ALTER TABLE "campos_lista_verificacao" RENAME CONSTRAINT "checklist_fields_pkey" TO "campos_lista_verificacao_pkey";
ALTER TABLE "campos_lista_verificacao" RENAME CONSTRAINT "checklist_fields_checklist_id_fkey" TO "campos_lista_verificacao_lista_fkey";
ALTER TABLE "campos_lista_verificacao" RENAME CONSTRAINT "checklist_fields_source_key_fkey" TO "campos_lista_verificacao_fonte_fkey";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME CONSTRAINT "checklist_field_options_pkey" TO "opcoes_campo_lista_verificacao_pkey";
ALTER TABLE "opcoes_campo_lista_verificacao" RENAME CONSTRAINT "checklist_field_options_field_id_fkey" TO "opcoes_campo_lista_verificacao_campo_fkey";
ALTER TABLE "respostas_lista_verificacao" RENAME CONSTRAINT "checklist_responses_pkey" TO "respostas_lista_verificacao_pkey";
ALTER TABLE "respostas_lista_verificacao" RENAME CONSTRAINT "checklist_responses_checklist_id_fkey" TO "respostas_lista_verificacao_lista_fkey";
ALTER TABLE "respostas_lista_verificacao" RENAME CONSTRAINT "checklist_responses_user_id_fkey" TO "respostas_lista_verificacao_usuario_fkey";

ALTER INDEX "users_employee_id_idx" RENAME TO "usuarios_id_funcionario_idx";
ALTER INDEX "users_login_lower_idx" RENAME TO "usuarios_login_idx";
ALTER INDEX "users_active_idx" RENAME TO "usuarios_ativo_idx";
ALTER INDEX "sessions_token_hash_idx" RENAME TO "sessoes_hash_token_idx";
ALTER INDEX "sessions_user_id_idx" RENAME TO "sessoes_id_usuario_idx";
ALTER INDEX "synced_records_source_active_idx" RENAME TO "registros_sincronizados_fonte_ativo_idx";
ALTER INDEX "checklist_fields_order_idx" RENAME TO "campos_lista_verificacao_ordem_idx";
ALTER INDEX "checklist_options_order_idx" RENAME TO "opcoes_campo_lista_verificacao_ordem_idx";
