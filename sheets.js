// sheets.js atualizado
const { google } = require('googleapis');

const SPREADSHEET_ID = '1-u-WSLEpz7_537FytU_gK3bm3sKm-8Rkw2Fn3MFvRJ4';

// A lógica de autenticação foi melhorada
async function autenticar() {
  // Prioriza as credenciais via variável de ambiente (mais seguro para produção)
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return google.auth.fromJSON(credentials, {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  // Se a variável de ambiente não existir, tenta usar o arquivo local (bom para desenvolvimento)
  const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || 'credentials.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return await auth.getClient();
}

async function adicionarNoticias(noticias, sheetName) {
  try {
    const authClient = await autenticar();
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const valores = Array.isArray(noticias[0])
      ? noticias
      : noticias.map(n => [
          n.dataAttr || new Date().toLocaleDateString('pt-BR'),
          n.conteudo || n.resumo || '',
          n.titulo || '',
          n.link || ''
        ]);

    if (valores.length === 0) {
      // Evita logar "dados para inserir" se não houver nada
      return;
    }

    console.log(`Inserindo ${valores.length} registro(s) na aba "${sheetName}"...`);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: valores },
    });
  } catch (error) {
    // Fornece um erro mais detalhado
    console.error(`❌ Erro ao adicionar notícias na aba "${sheetName}":`, error.message);
    // Propaga o erro para que o fluxo principal possa, se necessário, saber que falhou
    throw error;
  }
}

module.exports = { adicionarNoticias };