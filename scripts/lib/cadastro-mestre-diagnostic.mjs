/* Catálogo fechado: nunca encaminhar message/detail/hint/stack/cause de SDK/driver. */
const erros = {
  SELF_SIGNED_CERT_IN_CHAIN: ['tls', 'Certificado autoassinado na cadeia TLS.'],
  DEPTH_ZERO_SELF_SIGNED_CERT: ['tls', 'Certificado TLS autoassinado.'],
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: ['tls', 'Não foi possível validar a assinatura do certificado TLS.'],
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: ['tls', 'Autoridade certificadora TLS não reconhecida.'],
  CERT_HAS_EXPIRED: ['tls', 'Certificado TLS expirado.'],
  ERR_TLS_CERT_ALTNAME_INVALID: ['tls', 'Nome do certificado TLS incompatível com o destino.'],
  ERR_SSL_WRONG_VERSION_NUMBER: ['tls', 'Versão ou protocolo TLS incompatível.'],
  ERR_OSSL_PEM_NO_START_LINE: ['tls', 'Certificado CA em formato PEM inválido.'],
  ENOTFOUND: [null, 'Destino não resolvido por DNS.'],
  EAI_AGAIN: [null, 'Falha temporária de resolução DNS.'],
  ENETUNREACH: [null, 'Rede de destino inacessível.'],
  EHOSTUNREACH: [null, 'Host de destino inacessível.'],
  ECONNREFUSED: [null, 'Conexão recusada.'],
  ECONNRESET: [null, 'Conexão encerrada pelo destino.'],
  ETIMEDOUT: [null, 'Tempo limite de conexão excedido.'],
  PG_CONNECTION_TIMEOUT: [null, 'Tempo limite de conexão PostgreSQL excedido.'],
  ERR_INVALID_URL: [null, 'Formato de URL inválido.'],
  NoSuchBucket: [null, 'Bucket de Storage inexistente ou inacessível.'],
  AccessDenied: [null, 'Acesso ao Storage recusado.'],
  InvalidJWT: [null, 'Credencial de Storage inválida.'],
  '28P01': [null, 'Autenticação PostgreSQL recusada.'],
  '28000': [null, 'Autorização PostgreSQL recusada.'],
  '42501': [null, 'Privilégio PostgreSQL insuficiente.'],
  '3D000': [null, 'Banco PostgreSQL inexistente.'],
  '42P01': [null, 'Relação PostgreSQL requerida inexistente.'],
  '42703': [null, 'Coluna PostgreSQL requerida inexistente.'],
  '53300': [null, 'Limite de conexões PostgreSQL atingido.'],
  '57P03': [null, 'PostgreSQL não aceita conexões neste momento.'],
  '57014': [null, 'Consulta PostgreSQL cancelada.']
};
const mensagens = {
  configuracao: 'Configuração administrativa ausente ou inválida.',
  origem: 'Origem da requisição recusada.',
  autenticacao: 'Sessão ausente, inválida ou serviço de autenticação inacessível.',
  autorizacao: 'UUID autenticado fora da autorização administrativa.',
  conexao_postgresql: 'Falha ao estabelecer conexão PostgreSQL.',
  tls: 'Falha na validação TLS da conexão PostgreSQL.',
  storage: 'Credencial ou acesso ao Storage recusado.',
  bucket: 'Bucket ausente, inacessível ou não privado.',
  leitura_postgresql: 'Falha na leitura administrativa PostgreSQL.',
  dependencias: 'Dependências do executor impedem a operação.',
  permissoes: 'Permissões administrativas insuficientes.',
  policies: 'Policies de Storage exigem revisão.'
};

export function criarDiagnosticoCadastroMestre() {
  const etapas = Object.fromEntries(Object.keys(mensagens).map(etapa => [etapa, 'NAO_VERIFICADO']));
  let atual = 'configuracao';
  return {
    iniciar(etapa) { atual = etapa; etapas[etapa] = 'EM_VALIDACAO'; },
    concluir(etapa = atual) { etapas[etapa] = 'OK'; },
    resultado(error) {
      if (!error) return { etapa: 'concluido', codigo: 'DIAGNOSTICO_OK', etapas: { ...etapas }, execucao_realizada: false };
      // Código original somente se conhecido. Nem código arbitrário pode transportar segredo.
      const codigoOriginal = [error.code, error.cause?.code].find(code =>
        typeof code === 'string' && Object.hasOwn(erros, code)) ||
        (atual === 'conexao_postgresql' && ['timeout expired', 'Connection terminated due to connection timeout'].includes(error.message) ? 'PG_CONNECTION_TIMEOUT' : null);
      const conhecido = codigoOriginal ? erros[codigoOriginal] : null;
      const etapa = atual === 'conexao_postgresql' && conhecido?.[0] === 'tls' ? 'tls' : atual;
      if (etapa !== atual) etapas[atual] = 'NAO_CONCLUIDO';
      etapas[etapa] = 'FALHOU';
      // HTTP de Storage também é metadado fixo, nunca a mensagem recebida do serviço.
      const httpStorage = error.status ?? error.statusCode;
      const statusStorage = ['storage', 'bucket'].includes(atual) && [400, 401, 403, 404].includes(Number(httpStorage)) ? Number(httpStorage) : null;
      return { etapa, codigo: `DIAGNOSTICO_${etapa.toUpperCase()}_FALHOU`,
        codigo_original: codigoOriginal || (statusStorage ? `STORAGE_HTTP_${statusStorage}` : 'NAO_CLASSIFICADO'),
        mensagem: conhecido?.[1] || mensagens[etapa], etapas: { ...etapas }, execucao_realizada: false };
    }
  };
}
