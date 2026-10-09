import { describe, expect, it } from 'vitest';
import { X509Certificate, createHash } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { inspecionarTlsCadastroMestre } from '../scripts/lib/cadastro-mestre-diagnostic.mjs';

const ca = rootCertificates[0]; // CA pública do Node, sem credenciais ou rede.
const fingerprint = pem => createHash('sha256').update(new X509Certificate(pem).raw).digest('hex');
const parametros = { host: 'db.teste.supabase.co', port: 5432, database: 'postgres', user: 'postgres', ssl: { ca, rejectUnauthorized: true } };

describe('Metadados TLS sanitizados, sem rede', () => {
  it('calcula fingerprint DER independentemente de CRLF e espaços', () => {
    for (const pem of [ca, `\n${ca.replace(/\n/g, '\r\n')}\n`]) {
      const resultado = inspecionarTlsCadastroMestre(pem, { ...parametros, ssl: { ca: pem, rejectUnauthorized: true } });
      expect(resultado).toMatchObject({ ca_presente: true, ca_tamanho: Buffer.byteLength(pem), ca_tamanho_caracteres: pem.length,
        ca_contem_begin_certificate: true, ca_contem_end_certificate: true, ca_pem_formato: true, ca_x509_valido: true,
        ca_fingerprint_sha256: fingerprint(ca), ca_certificados_quantidade: 1, postgres_ssl_ca_configurado: true,
        postgres_ssl_ca_corresponde_variavel: true });
      expect(JSON.stringify(resultado)).not.toContain('BEGIN CERTIFICATE');
    }
  });
  it.each([undefined, '', 'CA inválida ç', '-----BEGIN CERTIFICATE-----', '-----END CERTIFICATE-----',
    ca.replace(/\n/g, '\\n'), `"${ca}"`, '-----BEGIN CERTIFICATE-----\nINVALIDO\n-----END CERTIFICATE-----'])('informa CA ausente/inválida sem corrigir o valor (%#)', pem => {
    const resultado = inspecionarTlsCadastroMestre(pem, {});
    expect(resultado.ca_x509_valido).toBe(false);
    expect(resultado.ca_fingerprint_sha256).toBeNull();
    expect(resultado.ca_presente).toBe(!!pem);
    expect(resultado.ca_tamanho).toBe(Buffer.byteLength(pem || ''));
    expect(resultado.ca_tamanho_caracteres).toBe((pem || '').length);
    expect(resultado.ca_mensagem_sanitizada).toContain(pem ? 'CA inválida' : 'CA ausente');
  });
  it('valida todos os certificados de uma cadeia; não aceita cadeia parcialmente inválida', () => {
    const bundle = `${ca}\n${rootCertificates[1]}`;
    expect(inspecionarTlsCadastroMestre(bundle, parametros)).toMatchObject({ ca_x509_valido: true,
      ca_fingerprints_sha256: [fingerprint(ca), fingerprint(rootCertificates[1])], ca_certificados_quantidade: 2 });
    expect(inspecionarTlsCadastroMestre(`${bundle}\n-----BEGIN CERTIFICATE-----\nINVALIDO\n-----END CERTIFICATE-----`, parametros))
      .toMatchObject({ ca_x509_valido: false, ca_fingerprint_sha256: null, ca_fingerprints_sha256: [] });
  });
  it('mascara parâmetros arbitrários e não serializa objetos/credenciais do driver', () => {
    const segredo = 'SEGREDO_NAO_PODE_SAIR';
    const resultado = inspecionarTlsCadastroMestre(ca, { host: segredo, user: segredo, database: segredo,
      password: segredo, port: segredo, connectionString: segredo, ssl: { ca, key: segredo } });
    expect(resultado).toMatchObject({ postgres_host: '[HOST_NAO_EXIBIDO]', postgres_user_sanitizado: '[USUARIO_NAO_EXIBIDO]',
      postgres_database: '[BANCO_NAO_EXIBIDO]', postgres_port: null });
    expect(JSON.stringify(resultado)).not.toContain(segredo);
    expect(JSON.stringify(resultado)).not.toContain(ca);
  });
  it('registra ssl.ca efetivo ausente/diferente sem afirmar configuração da variável', () => {
    expect(inspecionarTlsCadastroMestre(ca, { ...parametros, ssl: true })).toMatchObject({ postgres_ssl_ca_configurado: false, postgres_ssl_ca_corresponde_variavel: false });
    expect(inspecionarTlsCadastroMestre(ca, { ...parametros, ssl: { ca: rootCertificates[1] } })).toMatchObject({ postgres_ssl_ca_configurado: true, postgres_ssl_ca_corresponde_variavel: false });
  });
});
