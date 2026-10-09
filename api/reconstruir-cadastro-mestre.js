/* Node/Vercel: credenciais e SQL administrativo nunca são enviados ao browser. */
import { criarCadastroMestreWebHandler } from '../scripts/lib/cadastro-mestre-web.mjs';

export const config = { maxDuration: 300 };
export default criarCadastroMestreWebHandler();
